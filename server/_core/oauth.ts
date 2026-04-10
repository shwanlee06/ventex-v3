import { COOKIE_NAME, SESSION_MAX_AGE_MS } from "@shared/const";
import type { Express, Request, Response } from "express";
import * as db from "../db";
import { getSessionCookieOptions } from "./cookies";
import { sdk } from "./sdk";
import { ENV } from "./env";
import { getDb } from "../db";
import { invitations, users, organizations, teamMembers } from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";

function getQueryParam(req: Request, key: string): string | undefined {
  const value = req.query[key];
  return typeof value === "string" ? value : undefined;
}

/**
 * Accept a pending invitation for a user — updates user record, invitation status,
 * and team member linkage. Reusable for both new and existing users.
 */
async function acceptPendingInvitation(
  database: NonNullable<Awaited<ReturnType<typeof getDb>>>,
  userId: number,
  pendingInvite: {
    id: number;
    organizationId: number;
    role: string;
    teamMemberId: number | null;
  }
) {
  // ATLAS team roles (admin/partner/manager) should NOT be scoped to a client org
  // They need organizationId = null so isAtlasTeam() returns true and they can see all clients
  const isAtlasRole = ["admin", "partner", "manager", "owner"].includes(pendingInvite.role);
  const effectiveOrgId = isAtlasRole ? null : pendingInvite.organizationId;

  // Update user with organization, role, and invitation reference
  await database
    .update(users)
    .set({
      organizationId: effectiveOrgId,
      role: pendingInvite.role as any,
      status: "active",
      invitationId: pendingInvite.id,
    })
    .where(eq(users.id, userId));

  // Mark invitation as accepted
  await database
    .update(invitations)
    .set({ status: "accepted", acceptedAt: new Date() })
    .where(eq(invitations.id, pendingInvite.id));

  // If this invitation is linked to a team member, update their status and link user
  if (pendingInvite.teamMemberId) {
    await database
      .update(teamMembers)
      .set({ invitationStatus: "accepted", userId })
      .where(eq(teamMembers.id, pendingInvite.teamMemberId));
  }
}

export function registerOAuthRoutes(app: Express) {
  app.get("/api/oauth/callback", async (req: Request, res: Response) => {
    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");

    if (!code || !state) {
      console.error("[OAuth] Missing code or state params");
      res.status(400).json({ error: "code and state are required" });
      return;
    }

    try {
      let tokenResponse;
      try {
        tokenResponse = await sdk.exchangeCodeForToken(code, state);
      } catch (tokenError) {
        console.error("[OAuth] Step 1 FAILED: Token exchange error:", tokenError);
        res.redirect(302, "/?error=token_exchange_failed");
        return;
      }

      let userInfo;
      try {
        userInfo = await sdk.getUserInfo(tokenResponse.accessToken);
      } catch (userInfoError) {
        console.error("[OAuth] Step 2 FAILED: getUserInfo error:", userInfoError);
        res.redirect(302, "/?error=user_info_failed");
        return;
      }

      if (!userInfo.openId) {
        console.error("[OAuth] Step 2 FAILED: openId missing from user info");
        res.status(400).json({ error: "openId missing from user info" });
        return;
      }

      const database = await getDb();

      const isOwner = userInfo.openId === ENV.ownerOpenId;

      let existingUser;
      try {
        existingUser = await db.getUserByOpenId(userInfo.openId);
      } catch (lookupError) {
        console.error("[OAuth] Step 5 FAILED: User lookup error:", lookupError);
        res.redirect(302, "/?error=db_lookup_failed");
        return;
      }

      if (existingUser) {
        // Existing user — check if they're blocked or suspended
        if (existingUser.status === "blocked") {
          res.redirect(302, "/?error=blocked");
          return;
        }
        if (existingUser.status === "suspended") {
          res.redirect(302, "/?error=suspended");
          return;
        }

        // Active or pending user — update basic info
        try {
          await db.upsertUser({
            openId: userInfo.openId,
            name: userInfo.name || null,
            email: userInfo.email ?? null,
            loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
            lastSignedIn: new Date(),
          });
        } catch (upsertError) {
          console.error("[OAuth] Step 6 FAILED: Upsert error:", upsertError);
          res.redirect(302, "/?error=db_update_failed");
          return;
        }

        if (!existingUser.organizationId && database) {
          const email = (userInfo.email ?? existingUser.email ?? "").toLowerCase();
          if (email) {
            try {
              const [pendingInvite] = await database
                .select()
                .from(invitations)
                .where(
                  and(
                    eq(invitations.email, email),
                    eq(invitations.status, "pending")
                  )
                )
                .limit(1);

              if (pendingInvite && new Date() <= pendingInvite.expiresAt) {
                await acceptPendingInvitation(database, existingUser.id, pendingInvite);
              }
            } catch (inviteError) {
              // Non-fatal — user can still log in, just won't auto-accept invitation
              console.error("[OAuth] Non-fatal: Invitation check failed:", inviteError);
            }
          }
        }
      } else if (isOwner) {
        // Owner first login — auto-create with admin role
        try {
          await db.upsertUser({
            openId: userInfo.openId,
            name: userInfo.name || null,
            email: userInfo.email ?? null,
            loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
            role: "admin",
            lastSignedIn: new Date(),
          });
        } catch (ownerError) {
          console.error("[OAuth] Step 6 FAILED: Owner creation error:", ownerError);
          res.redirect(302, "/?error=db_create_failed");
          return;
        }
      } else if (database) {
        const email = (userInfo.email ?? "").toLowerCase();

        if (!email) {
          res.redirect(302, "/?error=no_invitation");
          return;
        }

        let pendingInvite;
        try {
          const [invite] = await database
            .select()
            .from(invitations)
            .where(
              and(
                eq(invitations.email, email),
                eq(invitations.status, "pending")
              )
            )
            .limit(1);
          pendingInvite = invite;
        } catch (inviteQueryError) {
          console.error("[OAuth] Step 6 FAILED: Invitation query error:", inviteQueryError);
          res.redirect(302, "/?error=db_query_failed");
          return;
        }

        if (!pendingInvite) {
          res.redirect(302, "/?error=no_invitation");
          return;
        }

        // Check if invitation has expired
        if (new Date() > pendingInvite.expiresAt) {
          await database
            .update(invitations)
            .set({ status: "expired" })
            .where(eq(invitations.id, pendingInvite.id));
          res.redirect(302, "/?error=invitation_expired");
          return;
        }

        try {
          await db.upsertUser({
            openId: userInfo.openId,
            name: userInfo.name || null,
            email: userInfo.email ?? null,
            loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
            role: pendingInvite.role,
            lastSignedIn: new Date(),
          });
        } catch (createError) {
          console.error("[OAuth] Step 6 FAILED: New user creation error:", createError);
          res.redirect(302, "/?error=db_create_failed");
          return;
        }

        // Accept the invitation for the new user
        try {
          const newUser = await db.getUserByOpenId(userInfo.openId);
          if (newUser && database) {
            await acceptPendingInvitation(database, newUser.id, pendingInvite);
          }
        } catch (acceptError) {
          console.error("[OAuth] Non-fatal: Invitation acceptance failed:", acceptError);
        }
      } else {
        // No database — can't verify invitation
        console.error("[OAuth] No database available — denying access");
        res.redirect(302, "/?error=no_invitation");
        return;
      }

      let sessionToken;
      try {
        sessionToken = await sdk.createSessionToken(userInfo.openId, {
          name: userInfo.name || "",
          expiresInMs: SESSION_MAX_AGE_MS,
        });
      } catch (sessionError) {
        console.error("[OAuth] Step 7 FAILED: Session token creation error:", sessionError);
        res.redirect(302, "/?error=session_failed");
        return;
      }

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: SESSION_MAX_AGE_MS });

      // Redirect to dashboard for existing/owner users, or to onboarding for new invited users
      if (existingUser || isOwner) {
        res.redirect(302, "/");
      } else {
        res.redirect(302, "/?welcome=true");
      }
    } catch (error) {
      console.error("[OAuth] Unexpected callback error:", error);
      // Redirect to home with error instead of showing raw 500 JSON
      res.redirect(302, "/?error=unexpected");
    }
  });
}
