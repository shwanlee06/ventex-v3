import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { sdk } from "./_core/sdk";
import { getDb } from "./db";
import { invitations, users, teamMembers, organizations } from "../drizzle/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { Resend } from "resend";
import { randomBytes } from "crypto";
import { aiRouter } from "./routers/ai";
import { venturesRouter } from "./routers/ventures";
import { tasksRouter } from "./routers/tasks";
import { spvsRouter } from "./routers/spvs";
import { teamRouter } from "./routers/team";
import { distributionsRouter } from "./routers/distributions";
import { activityRouter } from "./routers/activity";
import { notificationsRouter } from "./routers/notifications";
import { searchRouter } from "./routers/search";
import { documentIntelligenceRouter } from "./routers/documentIntelligence";
import { intelligenceRouter } from "./routers/intelligence";
import { securityRouter } from "./routers/security";
import { accessRouter } from "./routers/access";
import { settingsRouter } from "./routers/settings";
import { organizationsRouter } from "./routers/organizations";
import { aiTasksRouter } from "./routers/aiTasks";
import { agentsRouter } from "./routers/agents";
import { blueprintsRouter } from "./routers/blueprints";
import { emailRouter } from "./routers/email";
import { onboardingRouter } from "./routers/onboarding";
import { portalRouter } from "./routers/portal";
import { auditRouter } from "./routers/audit";
import { blueprintDiagnosticsRouter } from "./routers/blueprintDiagnostics";
import { passkeysRouter } from "./routers/passkeys";
import { dataLifecycleRouter } from "./routers/dataLifecycle";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),

    /**
     * auth.acceptInvite — Public mutation
     * Validates an invitation token, marks the invitation as accepted,
     * links the user to the organization, and returns session info.
     * Called by the AcceptInvite page after OAuth login completes.
     * Can also be called pre-OAuth to validate + accept in one step for
     * already-authenticated users.
     */
    acceptInvite: publicProcedure
      .input(
        z.object({
          token: z.string().min(1),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) {
          return { success: false, error: "Service unavailable" };
        }

        // Look up the invitation by token
        const [invite] = await db
          .select()
          .from(invitations)
          .where(eq(invitations.token, input.token))
          .limit(1);

        if (!invite) {
          return { success: false, error: "Invalid invitation token" };
        }

        if (invite.status !== "pending") {
          return { success: false, error: `Invitation has already been ${invite.status}` };
        }

        if (new Date() > invite.expiresAt) {
          await db
            .update(invitations)
            .set({ status: "expired" })
            .where(eq(invitations.id, invite.id));
          return { success: false, error: "Invitation has expired" };
        }

        // Look up the organization
        const [org] = await db
          .select()
          .from(organizations)
          .where(eq(organizations.id, invite.organizationId))
          .limit(1);

        // If user is already authenticated, accept the invitation for them
        if (ctx.user) {
          // VENTEX team roles (admin/partner/manager) should NOT be scoped to a client org
          // They need organizationId = null so isVentexTeam() returns true
          const isVentexRole = ["admin", "partner", "manager", "owner"].includes(invite.role);
          const effectiveOrgId = isVentexRole ? null : invite.organizationId;

          // Update user with organization, role, and invitation reference
          await db
            .update(users)
            .set({
              organizationId: effectiveOrgId,
              role: invite.role as any,
              status: "active",
              invitationId: invite.id,
            })
            .where(eq(users.id, ctx.user.id));

          // Mark invitation as accepted
          await db
            .update(invitations)
            .set({ status: "accepted", acceptedAt: new Date() })
            .where(eq(invitations.id, invite.id));

          // If linked to a team member, update their status
          if (invite.teamMemberId) {
            await db
              .update(teamMembers)
              .set({ invitationStatus: "accepted", userId: ctx.user.id })
              .where(eq(teamMembers.id, invite.teamMemberId));
          }

          return {
            success: true,
            organizationName: org?.name ?? "VENTEX",
            organizationSlug: org?.slug ?? "ventex",
            role: invite.role,
            redirectTo: org ? `/clients/${org.slug}` : "/",
          };
        }

        // If not authenticated, just validate and return info
        // (the OAuth callback will handle the actual acceptance)
        const emailParts = invite.email.split("@");
        const maskedEmail =
          emailParts[0].substring(0, 2) + "***@" + (emailParts[1] || "");

        return {
          success: true,
          requiresAuth: true,
          organizationName: org?.name ?? "VENTEX",
          organizationSlug: org?.slug ?? "ventex",
          email: maskedEmail,
          role: invite.role,
          invitedByName: invite.invitedByName,
        };
      }),

    /**
     * auth.forgotPassword — Public mutation
     * Since this app uses Manus OAuth (no passwords), this sends a
     * "magic link" style email that lets the user sign in directly.
     * Accepts an email, generates a one-time login token, and sends
     * it via Resend.
     */
    forgotPassword: publicProcedure
      .input(
        z.object({
          email: z.string().email(),
        })
      )
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) {
          // Always return success to prevent email enumeration
          return { success: true, message: "If an account exists with that email, a login link has been sent." };
        }

        // Check if user exists
        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.email, input.email))
          .limit(1);

        if (!user) {
          // Don't reveal whether the email exists
          return { success: true, message: "If an account exists with that email, a login link has been sent." };
        }

        // Generate a secure one-time token
        const resetToken = randomBytes(32).toString("hex");
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

        // Store the token as a pending invitation (reuse invitation infrastructure)
        await db.insert(invitations).values({
          email: input.email,
          organizationId: user.organizationId || 0,
          role: user.role as any,
          token: `reset_${resetToken}`,
          status: "pending",
          invitedBy: user.id,
          invitedByName: "System",
          expiresAt,
          ventureIds: [],
        });

        // Send the reset email via Resend
        const resendKey = process.env.RESEND_API_KEY;
        if (resendKey) {
          try {
            const resend = new Resend(resendKey);
            const resetUrl = `${process.env.VITE_FRONTEND_FORGE_API_URL ? "" : ""}/?reset_token=reset_${resetToken}`;
            await resend.emails.send({
              from: "VENTEX <contact@aurovia.co>",
              to: input.email,
              subject: "VENTEX — Sign In Link",
              html: `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;">
  <div style="max-width:560px;margin:0 auto;padding:48px 32px;">
    <div style="border-bottom:1px solid #222;padding-bottom:12px;margin-bottom:28px;">
      <span style="color:#fff;font-size:14px;letter-spacing:0.15em;font-weight:600;">A T L A S</span>
    </div>
    <p style="color:#a0a0a0;font-size:13px;line-height:1.7;">A sign-in link was requested for your account.</p>
    <p style="color:#a0a0a0;font-size:13px;line-height:1.7;">Click the button below to access your VENTEX dashboard. This link expires in 1 hour.</p>
    <p style="margin:28px 0;">
      <a href="${resetUrl}" style="display:inline-block;background:#fff;color:#000;padding:12px 28px;font-size:13px;font-weight:600;text-decoration:none;letter-spacing:0.1em;">SIGN IN →</a>
    </p>
    <p style="color:#555;font-size:11px;line-height:1.6;">If you didn't request this, you can safely ignore this email.</p>
    <div style="border-top:1px solid #222;padding-top:16px;margin-top:32px;">
      <p style="color:#333;font-size:10px;letter-spacing:0.08em;">VENTEX · Powered by Aurovia</p>
    </div>
  </div>
</body></html>`,
            });
          } catch (err) {
            console.error("[Auth] Failed to send reset email:", err);
          }
        }

        return { success: true, message: "If an account exists with that email, a login link has been sent." };
      }),

    /**
     * auth.resetPassword — Public mutation
     * Validates a reset token and creates a session for the user.
     * Since we use OAuth, this effectively acts as a "magic link" login.
     */
    resetPassword: publicProcedure
      .input(
        z.object({
          token: z.string().min(1),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) {
          return { success: false, error: "Service unavailable" };
        }

        // Look up the reset token (stored as invitation with reset_ prefix)
        const [resetInvite] = await db
          .select()
          .from(invitations)
          .where(
            and(
              eq(invitations.token, input.token),
              eq(invitations.status, "pending")
            )
          )
          .limit(1);

        if (!resetInvite) {
          return { success: false, error: "Invalid or expired reset link" };
        }

        if (new Date() > resetInvite.expiresAt) {
          await db
            .update(invitations)
            .set({ status: "expired" })
            .where(eq(invitations.id, resetInvite.id));
          return { success: false, error: "Reset link has expired" };
        }

        // Find the user by email
        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.email, resetInvite.email))
          .limit(1);

        if (!user) {
          return { success: false, error: "User not found" };
        }

        // Mark the reset token as used
        await db
          .update(invitations)
          .set({ status: "accepted", acceptedAt: new Date() })
          .where(eq(invitations.id, resetInvite.id));

        // Create a session for the user
        const sessionToken = await sdk.createSessionToken(user.openId, {
          name: user.name || "",
          expiresInMs: ONE_YEAR_MS,
        });

        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

        // Update last signed in
        await db
          .update(users)
          .set({ lastSignedIn: new Date() })
          .where(eq(users.id, user.id));

        return {
          success: true,
          redirectTo: "/",
        };
      }),
  }),
  ai: aiRouter,
  ventures: venturesRouter,
  tasks: tasksRouter,
  spvs: spvsRouter,
  team: teamRouter,
  distributions: distributionsRouter,
  activity: activityRouter,
  notifications: notificationsRouter,
  search: searchRouter,
  docIntel: documentIntelligenceRouter,
  intelligence: intelligenceRouter,
  security: securityRouter,
  access: accessRouter,
  settings: settingsRouter,
  organizations: organizationsRouter,
  aiTasks: aiTasksRouter,
  agents: agentsRouter,
  blueprints: blueprintsRouter,
  email: emailRouter,
  onboarding: onboardingRouter,
  portal: portalRouter,
  audit: auditRouter,
  diagnostics: blueprintDiagnosticsRouter,
  passkeys: passkeysRouter,
  lifecycle: dataLifecycleRouter,
});

export type AppRouter = typeof appRouter;
