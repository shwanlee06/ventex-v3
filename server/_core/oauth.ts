import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
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
  // Update user with organization, role, and invitation reference
  await database
    .update(users)
    .set({
      organizationId: pendingInvite.organizationId,
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
      res.status(400).json({ error: "code and state are required" });
      return;
    }

    try {
      const tokenResponse = await sdk.exchangeCodeForToken(code, state);
      const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);

      if (!userInfo.openId) {
        res.status(400).json({ error: "openId missing from user info" });
        return;
      }

      const database = await getDb();

      // ── Check if this is the owner (always allowed) ──────────────────
      const isOwner = userInfo.openId === ENV.ownerOpenId;

      // ── Check if user already exists and is active ───────────────────
      const existingUser = await db.getUserByOpenId(userInfo.openId);

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
        await db.upsertUser({
          openId: userInfo.openId,
          name: userInfo.name || null,
          email: userInfo.email ?? null,
          loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
          lastSignedIn: new Date(),
        });

        // ── Check if existing user has a pending invitation to accept ──
        // This handles the case where a user logged in before their invitation
        // was created, or the invitation wasn't matched on first login.
        if (!existingUser.organizationId && database) {
          const email = (userInfo.email ?? existingUser.email ?? "").toLowerCase();
          if (email) {
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
              console.log(`[OAuth] Auto-accepted pending invitation for existing user ${existingUser.name} (${email})`);
            }
          }
        }
      } else if (isOwner) {
        // Owner first login — auto-create with admin role
        await db.upsertUser({
          openId: userInfo.openId,
          name: userInfo.name || null,
          email: userInfo.email ?? null,
          loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
          role: "admin",
          lastSignedIn: new Date(),
        });
      } else if (database) {
        // ── New user — check for pending invitation ────────────────────
        const email = (userInfo.email ?? "").toLowerCase();

        if (!email) {
          res.redirect(302, "/?error=no_invitation");
          return;
        }

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

        if (!pendingInvite) {
          // No invitation found — deny access
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

        // ── Valid invitation — create user ──────────────────────────────
        await db.upsertUser({
          openId: userInfo.openId,
          name: userInfo.name || null,
          email: userInfo.email ?? null,
          loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
          role: pendingInvite.role,
          lastSignedIn: new Date(),
        });

        // Accept the invitation for the new user
        const newUser = await db.getUserByOpenId(userInfo.openId);
        if (newUser && database) {
          await acceptPendingInvitation(database, newUser.id, pendingInvite);
        }
      } else {
        // No database — can't verify invitation
        res.redirect(302, "/?error=no_invitation");
        return;
      }

      // ── Create session and set cookie ────────────────────────────────
      const sessionToken = await sdk.createSessionToken(userInfo.openId, {
        name: userInfo.name || "",
        expiresInMs: ONE_YEAR_MS,
      });

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

      // Redirect to dashboard for existing/owner users, or to onboarding for new invited users
      if (existingUser || isOwner) {
        res.redirect(302, "/");
      } else {
        // New invited user — redirect to accept page where they'll see their API key
        res.redirect(302, "/?welcome=true");
      }
    } catch (error) {
      console.error("[OAuth] Callback failed", error);
      res.status(500).json({ error: "OAuth callback failed" });
    }
  });
}
