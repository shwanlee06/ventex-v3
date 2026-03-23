import { z } from "zod";
import { eq, inArray, desc } from "drizzle-orm";
import { protectedProcedure, adminProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
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
} from "../../drizzle/schema";

export const organizationsRouter = router({
  // List all client organizations (admin only) — basic list
  list: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];

    const orgs = await db
      .select()
      .from(organizations)
      .where(eq(organizations.type, "client"));

    // Get venture counts per org
    const access = await db.select().from(orgVentureAccess);
    const countMap = new Map<number, number>();
    for (const a of access) {
      countMap.set(a.organizationId, (countMap.get(a.organizationId) || 0) + 1);
    }

    return orgs.map(org => ({
      ...org,
      ventureCount: countMap.get(org.id) || 0,
    }));
  }),

  // List all client organizations with aggregate metrics — for ATLAS admin dashboard
  listWithMetrics: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];

    const orgs = await db
      .select()
      .from(organizations)
      .where(eq(organizations.type, "client"))
      .orderBy(organizations.name);

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
        lastActivityAt: lastActivity?.createdAt || null,
      };
    });
  }),

  // Get a single organization by slug with full metrics
  bySlug: protectedProcedure
    .input(z.object({ slug: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;

      const [org] = await db
        .select()
        .from(organizations)
        .where(eq(organizations.slug, input.slug))
        .limit(1);

      if (!org) return null;

      // Get venture count
      const access = await db
        .select()
        .from(orgVentureAccess)
        .where(eq(orgVentureAccess.organizationId, org.id));

      return { ...org, ventureCount: access.length };
    }),

  // Get ventures for a specific organization
  ventures: protectedProcedure
    .input(z.object({ organizationId: z.number() }))
    .query(async ({ input }) => {
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

  // Create a new client organization (admin only)
  create: adminProcedure
    .input(
      z.object({
        name: z.string().min(1).max(255),
        slug: z.string().min(1).max(128),
        description: z.string().optional(),
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
      });

      const [created] = await db
        .select()
        .from(organizations)
        .where(eq(organizations.slug, input.slug))
        .limit(1);

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

      if (Object.keys(updateObj).length > 0) {
        await db.update(organizations).set(updateObj).where(eq(organizations.id, id));
      }

      const [updated] = await db
        .select()
        .from(organizations)
        .where(eq(organizations.id, id))
        .limit(1);

      return updated;
    }),

  // Delete a client organization (admin only) — cascades related data
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
        detail: `Client "${org.name}" was removed from the system`,
        userName: "ATLAS Admin",
      });

      // 6. Delete the organization itself
      await db.delete(organizations).where(eq(organizations.id, input.id));

      return { success: true, name: org.name };
    }),
});
