/**
 * onboarding tRPC router
 * Provides `onboarding.complete` as the canonical path for the onboarding
 * wizard's final "Launch" step. Delegates to the same logic as
 * organizations.onboardingComplete.
 */
import { z } from "zod";
import { eq } from "drizzle-orm";
import { adminProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { logAudit } from "../security/rbac";
import {
  organizations,
  orgVentureAccess,
  ventures,
  invitations,
  activityLog,
  clientAgentConfig,
} from "../../drizzle/schema";

export const onboardingRouter = router({
  /**
   * onboarding.complete — Admin mutation
   * Called when the operator clicks "Launch" on onboarding step 5.
   * Creates org in DB, creates ventures, sends team invitations,
   * saves agent config. Returns new org slug for redirect.
   */
  complete: adminProcedure
    .input(
      z.object({
        // Step 1: Organization
        name: z.string().min(1).max(255),
        description: z.string().optional(),
        primaryContactName: z.string().optional(),
        primaryContactEmail: z.string().email().optional(),
        aumRange: z.string().optional(),
        sectors: z.array(z.string()).optional(),
        subscriptionTier: z.enum(["poc", "growth", "enterprise"]).default("poc"),
        // Step 2: Ventures
        ventures: z.array(z.object({
          name: z.string().min(1),
          sector: z.string().optional(),
          location: z.string().optional(),
        })).optional(),
        // Step 3: Invitations
        invites: z.array(z.object({
          name: z.string().min(1),
          email: z.string().email(),
          role: z.enum(["viewer", "client", "user", "partner", "manager", "admin"]).default("client"),
        })).optional(),
        // Step 4: Agent config
        agentConfig: z.object({
          velocityAgentEnabled: z.boolean().default(true),
          complianceAgentEnabled: z.boolean().default(true),
          dealFlowAgentEnabled: z.boolean().default(true),
          orchestratorEnabled: z.boolean().default(true),
          overdueDaysThreshold: z.number().min(1).max(90).default(7),
          distributionWarningDays: z.number().min(1).max(90).default(14),
          healthScoreAlertThreshold: z.number().min(0).max(100).default(30),
          pollingIntervalMinutes: z.number().min(5).max(1440).default(30),
        }).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // 1. Create organization
      const slug = input.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");

      await db.insert(organizations).values({
        name: input.name,
        slug,
        type: "client",
        description: input.description || null,
        primaryContactName: input.primaryContactName || null,
        primaryContactEmail: input.primaryContactEmail || null,
        aumRange: input.aumRange || null,
        sectors: input.sectors || null,
        subscriptionTier: input.subscriptionTier,
      });

      const [org] = await db
        .select()
        .from(organizations)
        .where(eq(organizations.slug, slug))
        .limit(1);
      if (!org) throw new Error("Failed to create organization");

      // 2. Create ventures
      const ventureIds: number[] = [];
      if (input.ventures && input.ventures.length > 0) {
        for (const v of input.ventures) {
          const vSlug = v.name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/(^-|-$)/g, "");
          await db.insert(ventures).values({
            name: v.name,
            slug: vSlug,
            sector: v.sector || "Others",
            location: v.location || "",
            status: "In progress" as any,
          });
          const [row] = await db
            .select({ id: ventures.id })
            .from(ventures)
            .where(eq(ventures.slug, vSlug))
            .limit(1);
          if (row) {
            ventureIds.push(row.id);
            await db.insert(orgVentureAccess).values({
              organizationId: org.id,
              ventureId: row.id,
            });
          }
        }
      }

      // 3. Create invitations
      const sentEmails: string[] = [];
      if (input.invites && input.invites.length > 0) {
        const crypto = await import("crypto");
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        for (const inv of input.invites) {
          const token = crypto.randomBytes(32).toString("hex");
          await db.insert(invitations).values({
            email: inv.email,
            organizationId: org.id,
            role: inv.role,
            token,
            invitedBy: ctx.user.id,
            invitedByName: ctx.user.name || "ATLAS Admin",
            expiresAt,
          });
          sentEmails.push(inv.email);
        }
      }

      // 4. Save agent configuration
      if (input.agentConfig) {
        await db.insert(clientAgentConfig).values({
          organizationId: org.id,
          ...input.agentConfig,
        });
      }

      // 5. Log activity
      await db.insert(activityLog).values({
        entityType: "organization",
        entityName: org.name,
        action: "Client Onboarded",
        detail: `New client "${org.name}" fully onboarded (${input.subscriptionTier} tier, ${ventureIds.length} ventures, ${sentEmails.length} invitations)`,
        userName: ctx.user.name || "ATLAS Admin",
        activitySource: "atlas_ops",
      });

      await logAudit({
        userId: ctx.user.id,
        userName: ctx.user.name || "",
        action: "onboarding.complete",
        entityType: "organization",
        entityId: String(org.id),
        details: `Onboarded ${org.name}: ${ventureIds.length} ventures, ${sentEmails.length} invitations`,
      });

      return {
        organizationId: org.id,
        slug: org.slug,
        venturesCreated: ventureIds.length,
        invitationsSent: sentEmails.length,
      };
    }),
});
