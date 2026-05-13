import { z } from "zod";
import { eq, inArray, desc, and, ne } from "drizzle-orm";
import { protectedProcedure, adminProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { logAudit, isVentexTeam } from "../security/rbac";
import {
  organizations,
  orgVentureAccess,
  ventures,
  tasks,
  spvVentures,
  ventureTeam,
  distributions,
  activityLog,
  invitations,
  apiKeys,
  clientAgentConfig,
  agentEvents,
} from "../../drizzle/schema";
import { createNotification, NOTIF_TYPES } from "../notificationHelper";

/** Safely parse a JSON column that may be a string, array, or null */
function parseJsonArray(val: unknown): string[] {
  if (Array.isArray(val)) return val;
  if (typeof val === "string") {
    try { const parsed = JSON.parse(val); return Array.isArray(parsed) ? parsed : []; } catch { return []; }
  }
  return [];
}

/** Normalize JSON fields on an org record */
function normalizeOrg<T extends { sectors: unknown }>(org: T): T & { sectors: string[] } {
  return { ...org, sectors: parseJsonArray(org.sectors) };
}

export const organizationsRouter = router({
  // Get a single organization by ID (admin only — used by onboarding wizard resume)
  getById: adminProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;
      const [org] = await db.select().from(organizations).where(eq(organizations.id, input.id)).limit(1);
      if (!org) return null;
      return normalizeOrg(org);
    }),

  // List all client organizations — basic list (all Ventex team members can see)
  list: protectedProcedure
    .input(z.object({ includeArchived: z.boolean().optional() }).optional())
    .query(async ({ ctx, input }) => {
      // All Ventex team members can see all clients; client users see only their own org
      if (!isVentexTeam(ctx.user)) {
        // Non-Ventex users: return only their own organization if they have one
        const db = await getDb();
        if (!db || !ctx.user.organizationId) return [];
        const rows = await db.select().from(organizations).where(eq(organizations.id, ctx.user.organizationId));
        return rows.map(org => ({ ...normalizeOrg(org), ventureCount: 0 }));
      }
      const db = await getDb();
      if (!db) return [];

      const includeArchived = input?.includeArchived ?? false;

      let orgs;
      if (includeArchived) {
        orgs = await db
          .select()
          .from(organizations)
          .where(eq(organizations.type, "client"));
      } else {
        orgs = await db
          .select()
          .from(organizations)
          .where(and(eq(organizations.type, "client"), ne(organizations.status, "archived")));
      }

      // Get venture counts per org
      const access = await db.select().from(orgVentureAccess);
      const countMap = new Map<number, number>();
      for (const a of access) {
        countMap.set(a.organizationId, (countMap.get(a.organizationId) || 0) + 1);
      }

      return orgs.map(org => ({
        ...normalizeOrg(org),
        ventureCount: countMap.get(org.id) || 0,
      }));
    }),

  // List all client organizations with aggregate metrics — for VENTEX dashboard
  // By default excludes archived. Pass includeArchived: true to include them.
  listWithMetrics: protectedProcedure
    .input(z.object({ includeArchived: z.boolean().optional() }).optional())
    .query(async ({ ctx, input }) => {
      // All Ventex team members can see all clients; client users see only their own org
      if (!isVentexTeam(ctx.user)) {
        const db = await getDb();
        if (!db || !ctx.user.organizationId) return [];
        const rows = await db.select().from(organizations).where(eq(organizations.id, ctx.user.organizationId));
        return rows.map(org => ({
          id: org.id,
          name: org.name,
          slug: org.slug,
          type: org.type,
          status: org.status,
          description: org.description,
          createdAt: org.createdAt,
          ventureCount: 0,
          sectors: [] as string[],
          avgHealth: 0,
          totalTasks: 0,
          completedTasks: 0,
          openTasks: 0,
          overdueTasks: 0,
          completionRate: 0,
          spvCount: 0,
          teamSize: 0,
          totalDistributions: 0,
          agentCompletedTasks: 0,
          lastActivityAt: null as Date | null,
          lastAgentAction: null as string | null,
          lastAgentName: null as string | null,
          lastAgentActionAt: null as Date | null,
        }));
      }
      const db = await getDb();
      if (!db) return [];

      const includeArchived = input?.includeArchived ?? false;

      let orgs;
      if (includeArchived) {
        orgs = await db
          .select()
          .from(organizations)
          .where(eq(organizations.type, "client"))
          .orderBy(organizations.name);
      } else {
        orgs = await db
          .select()
          .from(organizations)
          .where(and(eq(organizations.type, "client"), ne(organizations.status, "archived")))
          .orderBy(organizations.name);
      }

      if (orgs.length === 0) return [];

      // Get all org-venture access mappings
      const allAccess = await db.select().from(orgVentureAccess);
      const orgVentureMap = new Map<number, number[]>();
      for (const a of allAccess) {
        const arr = orgVentureMap.get(a.organizationId) || [];
        arr.push(a.ventureId);
        orgVentureMap.set(a.organizationId, arr);
      }

      // Get all tasks, ventures, spvVentures, ventureTeam in bulk
      const allVentures = await db.select().from(ventures);
      const allTasks = await db.select().from(tasks);
      const allSpvVentures = await db.select().from(spvVentures);
      const allVentureTeam = await db.select().from(ventureTeam);
      const allDists = await db.select().from(distributions);
      // Agent events — count tasks completed by agents (advance actions)
      const allAgentEvents = await db.select().from(agentEvents);

      // Get recent activity per org (last activity timestamp)
      const recentActivity = await db
        .select()
        .from(activityLog)
        .orderBy(desc(activityLog.createdAt))
        .limit(200);

      const now = new Date();

      return orgs.map(org => {
        const ventureIds = orgVentureMap.get(org.id) || [];
        const ventureIdSet = new Set(ventureIds);

        // Ventures
        const orgVentures = allVentures.filter(v => ventureIdSet.has(v.id));
        const ventureCount = orgVentures.length;

        // Sectors
        const sectors = new Set(orgVentures.map(v => v.sector));

        // Health scores
        const healthScores = orgVentures.map(v => v.healthScore ?? 50);
        const avgHealth = healthScores.length > 0
          ? Math.round(healthScores.reduce((a, b) => a + b, 0) / healthScores.length)
          : 0;

        // Tasks
        const orgTasks = allTasks.filter(t => t.ventureId && ventureIdSet.has(t.ventureId));
        const totalTasks = orgTasks.length;
        const completedTasks = orgTasks.filter(t => t.status === "complete").length;
        const openTasks = totalTasks - completedTasks;
        const overdueTasks = orgTasks.filter(t =>
          t.status !== "complete" && t.dueDate && new Date(t.dueDate) < now
        ).length;
        const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

        // SPVs (via spvVentures junction)
        const spvIds = new Set(
          allSpvVentures.filter(sv => ventureIdSet.has(sv.ventureId)).map(sv => sv.spvId)
        );
        const spvCount = spvIds.size;

        // Team members (via ventureTeam assignments)
        const memberIds = new Set(
          allVentureTeam.filter(vt => ventureIdSet.has(vt.ventureId)).map(vt => vt.memberId)
        );
        const teamSize = memberIds.size;

        // Distributions — scoped per org
        const orgDists = allDists.filter(d => d.organizationId === org.id);
        const totalDistributions = orgDists.reduce((s, d) => s + (d.amount || 0), 0);

        // Agent-completed tasks — count agent events with advance/notify actions for this org
        const orgAgentEvents = allAgentEvents.filter(e =>
          e.organizationId === org.id &&
          (e.actionType === "advance" || e.actionType === "notify")
        );
        const agentCompletedTasks = orgAgentEvents.length;

        // Last activity — find most recent activity mentioning any of this org's ventures
        const ventureNames = new Set(orgVentures.map(v => v.name.toLowerCase()));
        const lastActivity = recentActivity.find(a => {
          if (a.entityName && ventureNames.has(a.entityName.toLowerCase())) return true;
          if (a.entityType === "venture" && a.entityId && ventureIdSet.has(a.entityId)) return true;
          return false;
        });

        return {
          id: org.id,
          name: org.name,
          slug: org.slug,
          type: org.type,
          status: org.status,
          description: org.description,
          createdAt: org.createdAt,
          // Metrics
          ventureCount,
          sectors: Array.from(sectors),
          avgHealth,
          totalTasks,
          completedTasks,
          openTasks,
          overdueTasks,
          completionRate,
          spvCount,
          teamSize,
          totalDistributions,
          agentCompletedTasks,
          lastActivityAt: lastActivity?.createdAt || null,
          lastAgentAction: orgAgentEvents[0]?.message || null,
          lastAgentName: orgAgentEvents[0]?.agentName || null,
          lastAgentActionAt: orgAgentEvents[0]?.createdAt || null,
        };
      });
    }),

  // Get a single organization by slug with full metrics
  bySlug: protectedProcedure
    .input(z.object({ slug: z.string() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return null;

      const [org] = await db
        .select()
        .from(organizations)
        .where(eq(organizations.slug, input.slug))
        .limit(1);

      if (!org) return null;
      // TENANT_PATCHED: Non-VENTEX users can only look up their own org
      if (!isVentexTeam(ctx.user) && ctx.user.organizationId !== org.id) return null;

      // Get venture count
      const access = await db
        .select()
        .from(orgVentureAccess)
        .where(eq(orgVentureAccess.organizationId, org.id));

      return { ...normalizeOrg(org), ventureCount: access.length };
    }),

  // Get ventures for a specific organization
  ventures: protectedProcedure
    .input(z.object({ organizationId: z.number() }))
    .query(async ({ ctx, input }) => {
      // TENANT_PATCHED: Non-VENTEX users can only access their own org's ventures
      if (!isVentexTeam(ctx.user) && ctx.user.organizationId !== input.organizationId) return [];
      const db = await getDb();
      if (!db) return [];

      const access = await db
        .select()
        .from(orgVentureAccess)
        .where(eq(orgVentureAccess.organizationId, input.organizationId));

      if (access.length === 0) return [];

      const ventureIds = access.map(a => a.ventureId);
      const orgVentures = await db
        .select()
        .from(ventures)
        .where(inArray(ventures.id, ventureIds));

      return orgVentures;
    }),

  // Create a new client organization (admin only) — full onboarding
  create: adminProcedure
    .input(
      z.object({
        name: z.string().min(1).max(255),
        slug: z.string().min(1).max(128),
        description: z.string().optional(),
        primaryContactName: z.string().optional(),
        primaryContactEmail: z.string().email().optional(),
        aumRange: z.string().optional(),
        sectors: z.array(z.string()).optional(),
        subscriptionTier: z.enum(["poc", "growth", "enterprise"]).optional(),
        renewalDate: z.string().optional(),
        principalPhone: z.string().optional(),
        timezone: z.string().optional(),
        fiscalYearEnd: z.string().optional(),
        reportingCadence: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      await db.insert(organizations).values({
        name: input.name,
        slug: input.slug,
        type: "client",
        description: input.description || null,
        primaryContactName: input.primaryContactName || null,
        primaryContactEmail: input.primaryContactEmail || null,
        aumRange: input.aumRange || null,
        sectors: input.sectors || null,
        subscriptionTier: input.subscriptionTier || "poc",
        renewalDate: input.renewalDate || null,
        principalPhone: input.principalPhone || null,
        timezone: input.timezone || null,
        fiscalYearEnd: input.fiscalYearEnd || null,
        reportingCadence: (input.reportingCadence as any) || null,
      });

      const [created] = await db
        .select()
        .from(organizations)
        .where(eq(organizations.slug, input.slug))
        .limit(1);

      // Log activity
      await db.insert(activityLog).values({
        entityType: "organization",
        entityName: created.name,
        action: "Client Onboarded",
        detail: `New client "${created.name}" onboarded (${input.subscriptionTier || "poc"} tier)`,
        userName: "VENTEX Admin",
        activitySource: "atlas_ops",
      });

      await logAudit({
        organizationId: created.id,
        action: "create",
        entityType: "organization",
        entityId: String(created.id),
        entityName: created.name,
        details: JSON.stringify({ tier: input.subscriptionTier, sectors: input.sectors }),
      });

      return created;
    }),

  // Update a client organization (admin only)
  update: adminProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().min(1).max(255).optional(),
        description: z.string().optional(),
        status: z.enum(["active", "suspended", "archived"]).optional(),
        primaryContactName: z.string().max(255).optional(),
        primaryContactEmail: z.string().email().optional(),
        aumRange: z.string().max(32).optional(),
        sectors: z.array(z.string()).optional(),
        subscriptionTier: z.enum(["poc", "growth", "enterprise"]).optional(),
        renewalDate: z.string().max(32).optional(),
        principalPhone: z.string().optional(),
        timezone: z.string().optional(),
        fiscalYearEnd: z.string().optional(),
        reportingCadence: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const { id, ...updates } = input;
      const updateObj: Record<string, unknown> = {};
      if (updates.name !== undefined) updateObj.name = updates.name;
      if (updates.description !== undefined) updateObj.description = updates.description;
      if (updates.status !== undefined) updateObj.status = updates.status;
      if (updates.primaryContactName !== undefined) updateObj.primaryContactName = updates.primaryContactName;
      if (updates.primaryContactEmail !== undefined) updateObj.primaryContactEmail = updates.primaryContactEmail;
      if (updates.aumRange !== undefined) updateObj.aumRange = updates.aumRange;
      if (updates.sectors !== undefined) updateObj.sectors = updates.sectors;
      if (updates.subscriptionTier !== undefined) updateObj.subscriptionTier = updates.subscriptionTier;
      if (updates.renewalDate !== undefined) updateObj.renewalDate = updates.renewalDate;
      if (updates.principalPhone !== undefined) updateObj.principalPhone = updates.principalPhone;
      if (updates.timezone !== undefined) updateObj.timezone = updates.timezone;
      if (updates.fiscalYearEnd !== undefined) updateObj.fiscalYearEnd = updates.fiscalYearEnd;
      if (updates.reportingCadence !== undefined) updateObj.reportingCadence = updates.reportingCadence;

      if (Object.keys(updateObj).length > 0) {
        await db.update(organizations).set(updateObj).where(eq(organizations.id, id));
      }

      const [updated] = await db
        .select()
        .from(organizations)
        .where(eq(organizations.id, id))
        .limit(1);

      await logAudit({
        organizationId: id,
        action: "update",
        entityType: "organization",
        entityId: String(id),
        entityName: updated?.name,
        details: JSON.stringify(updates),
      });

      return updated;
    }),

  // Archive a client organization (soft delete — sets status to "archived")
  archive: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const [org] = await db
        .select()
        .from(organizations)
        .where(eq(organizations.id, input.id))
        .limit(1);

      if (!org) throw new Error("Organization not found");
      if (org.type === "core") throw new Error("Cannot archive core organization");
      if (org.status === "archived") throw new Error("Organization is already archived");

      await db
        .update(organizations)
        .set({ status: "archived" })
        .where(eq(organizations.id, input.id));

      await db.insert(activityLog).values({
        entityType: "organization",
        entityName: org.name,
        action: "Client Archived",
        detail: `Client "${org.name}" was archived`,
        userName: "VENTEX Admin",
        activitySource: "atlas_ops",
      });

      await createNotification({
        type: "client_archived",
        category: "warning",
        title: `Client Archived: ${org.name}`,
        message: `${org.name} has been archived`,
        entityType: "organization",
        entityId: input.id,
        entityName: org.name,
        link: "/dashboard",
        actorName: "VENTEX Admin",
      });

      await logAudit({
        organizationId: input.id,
        action: "archive",
        entityType: "organization",
        entityId: String(input.id),
        entityName: org.name,
      });

      return { success: true, name: org.name };
    }),

  // Restore an archived client organization (sets status back to "active")
  restore: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const [org] = await db
        .select()
        .from(organizations)
        .where(eq(organizations.id, input.id))
        .limit(1);

      if (!org) throw new Error("Organization not found");
      if (org.status !== "archived") throw new Error("Organization is not archived");

      await db
        .update(organizations)
        .set({ status: "active" })
        .where(eq(organizations.id, input.id));

      await db.insert(activityLog).values({
        entityType: "organization",
        entityName: org.name,
        action: "Client Restored",
        detail: `Client "${org.name}" was restored from archive`,
        userName: "VENTEX Admin",
        activitySource: "atlas_ops",
      });

      await createNotification({
        type: "client_restored",
        category: "success",
        title: `Client Restored: ${org.name}`,
        message: `${org.name} has been restored from archive`,
        entityType: "organization",
        entityId: input.id,
        entityName: org.name,
        link: "/dashboard",
        actorName: "VENTEX Admin",
      });

      return { success: true, name: org.name };
    }),

  // Permanently delete a client organization (admin only) — cascades related data
  // Should only be used on archived clients as a final step
  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Verify org exists and is a client (don't allow deleting core/partner)
      const [org] = await db
        .select()
        .from(organizations)
        .where(eq(organizations.id, input.id))
        .limit(1);

      if (!org) throw new Error("Organization not found");
      if (org.type === "core") throw new Error("Cannot delete core organization");

      // 1. Delete org_venture_access links
      await db.delete(orgVentureAccess).where(eq(orgVentureAccess.organizationId, input.id));

      // 2. Delete distributions linked to this org
      await db.delete(distributions).where(eq(distributions.organizationId, input.id));

      // 3. Delete invitations for this org
      await db.delete(invitations).where(eq(invitations.organizationId, input.id));

      // 4. Delete API keys for this org
      await db.delete(apiKeys).where(eq(apiKeys.organizationId, input.id));

      // 5. Log the deletion
      await db.insert(activityLog).values({
        entityType: "organization",
        entityName: org.name,
        action: "Client Deleted",
        detail: `Client "${org.name}" was permanently removed from the system`,
        userName: "VENTEX Admin",
        activitySource: "atlas_ops",
      });

      // 6. Delete the organization itself
      await db.delete(organizations).where(eq(organizations.id, input.id));

      return { success: true, name: org.name };
    }),

  addVentures: adminProcedure
    .input(z.object({
      organizationId: z.number(),
      ventures: z.array(z.object({
        name: z.string().min(1),
        sector: z.string().optional(),
        location: z.string().optional(),
        status: z.string().optional(),
        stage: z.string().optional(),
        nextMilestone: z.string().optional(),
        nextMilestoneDate: z.string().optional(),
        legalEntity: z.string().optional(),
        jurisdiction: z.string().optional(),
      })),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const created: number[] = [];
      for (const v of input.ventures) {
        const slug = v.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
        await db.insert(ventures).values({
          name: v.name,
          slug,
          sector: v.sector || "Others",
          location: v.location || "",
          status: (v.status as any) || "In progress",
          stage: v.stage || undefined,
          nextMilestone: v.nextMilestone || undefined,
          nextMilestoneDate: v.nextMilestoneDate || undefined,
          legalEntity: v.legalEntity || undefined,
          jurisdiction: v.jurisdiction || undefined,
          organizationId: input.organizationId,
        });
        const [row] = await db.select({ id: ventures.id }).from(ventures).where(eq(ventures.slug, slug)).limit(1);
        if (row) {
          created.push(row.id);
          // Link to org
          await db.insert(orgVentureAccess).values({
            organizationId: input.organizationId,
            ventureId: row.id,
          });
        }
      }
      return { created: created.length };
    }),

  sendInvitations: adminProcedure
    .input(z.object({
      organizationId: z.number(),
      invites: z.array(z.object({
        name: z.string().min(1),
        email: z.string().email(),
        role: z.enum(["viewer", "client", "user", "partner", "manager", "admin"]).default("client"),
      })),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const crypto = await import("crypto");
      const sent: string[] = [];
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

      for (const inv of input.invites) {
        const token = crypto.randomBytes(32).toString("hex");
        await db.insert(invitations).values({
          email: inv.email,
          organizationId: input.organizationId,
          role: inv.role,
          token,
          invitedBy: ctx.user.id,
          invitedByName: ctx.user.name || "VENTEX Admin",
          expiresAt,
        });
        sent.push(inv.email);
      }

      return { sent: sent.length, emails: sent };
    }),

  configureAgents: adminProcedure
    .input(z.object({
      organizationId: z.number(),
      velocityAgentEnabled: z.boolean().default(true),
      complianceAgentEnabled: z.boolean().default(true),
      dealFlowAgentEnabled: z.boolean().default(true),
      orchestratorEnabled: z.boolean().default(true),
      overdueDaysThreshold: z.number().min(1).max(90).default(7),
      distributionWarningDays: z.number().min(1).max(90).default(14),
      healthScoreAlertThreshold: z.number().min(0).max(100).default(30),
      pollingIntervalMinutes: z.number().min(5).max(1440).default(30),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Upsert: check if config exists
      const [existing] = await db.select().from(clientAgentConfig)
        .where(eq(clientAgentConfig.organizationId, input.organizationId)).limit(1);

      if (existing) {
        await db.update(clientAgentConfig).set({
          velocityAgentEnabled: input.velocityAgentEnabled,
          complianceAgentEnabled: input.complianceAgentEnabled,
          dealFlowAgentEnabled: input.dealFlowAgentEnabled,
          orchestratorEnabled: input.orchestratorEnabled,
          overdueDaysThreshold: input.overdueDaysThreshold,
          distributionWarningDays: input.distributionWarningDays,
          healthScoreAlertThreshold: input.healthScoreAlertThreshold,
          pollingIntervalMinutes: input.pollingIntervalMinutes,
        }).where(eq(clientAgentConfig.id, existing.id));
      } else {
        await db.insert(clientAgentConfig).values(input);
      }

      return { success: true };
    }),

  getAgentConfig: adminProcedure
    .input(z.object({ organizationId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;
      const [config] = await db.select().from(clientAgentConfig)
        .where(eq(clientAgentConfig.organizationId, input.organizationId)).limit(1);
      if (!config) return null;
      return { ...config, autoAdvanceSectors: parseJsonArray(config.autoAdvanceSectors) };
    }),

  updateAgentConfig: adminProcedure
    .input(z.object({
      organizationId: z.number(),
      velocityAgentEnabled: z.boolean().optional(),
      complianceAgentEnabled: z.boolean().optional(),
      dealFlowAgentEnabled: z.boolean().optional(),
      orchestratorEnabled: z.boolean().optional(),
      overdueDaysThreshold: z.number().min(1).max(90).optional(),
      distributionWarningDays: z.number().min(1).max(90).optional(),
      healthScoreAlertThreshold: z.number().min(0).max(100).optional(),
      autoAdvanceEnabled: z.boolean().optional(),
      autoAdvanceSectors: z.array(z.string()).optional(),
      pollingIntervalMinutes: z.number().min(5).max(1440).optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");

      const { organizationId, ...updates } = input;
      const [existing] = await db.select().from(clientAgentConfig)
        .where(eq(clientAgentConfig.organizationId, organizationId)).limit(1);

      if (existing) {
        await db.update(clientAgentConfig)
          .set(updates)
          .where(eq(clientAgentConfig.organizationId, organizationId));
      } else {
        await db.insert(clientAgentConfig).values({ organizationId, ...updates });
      }

      const [updated] = await db.select().from(clientAgentConfig)
        .where(eq(clientAgentConfig.organizationId, organizationId)).limit(1);
      return updated;
    }),

  // Creates org + ventures + invitations + agent config in one call
  onboardingComplete: adminProcedure
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
      const slug = input.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
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
      const [org] = await db.select().from(organizations).where(eq(organizations.slug, slug)).limit(1);
      if (!org) throw new Error("Failed to create organization");

      // 2. Create ventures
      const ventureIds: number[] = [];
      if (input.ventures && input.ventures.length > 0) {
        for (const v of input.ventures) {
          const vSlug = v.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
          await db.insert(ventures).values({
            name: v.name,
            slug: vSlug,
            sector: v.sector || "Others",
            location: v.location || "",
            status: "In progress" as any,
          });
          const [row] = await db.select({ id: ventures.id }).from(ventures).where(eq(ventures.slug, vSlug)).limit(1);
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
            invitedByName: ctx.user.name || "VENTEX Admin",
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
        userName: ctx.user.name || "VENTEX Admin",
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
