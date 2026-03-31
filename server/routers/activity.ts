import { z } from "zod";
import { publicProcedure, protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { activityLog, ventures } from "../../drizzle/schema";
import { desc, eq, and, gte, sql, inArray, ne } from "drizzle-orm";
import { isAtlasTeam, resolveVentureScope } from "../security/rbac";
import { resolveOrgId } from "../security/orgScope";

export const activityRouter = router({
  list: protectedProcedure.input(z.object({
    limit: z.number().default(50),
    offset: z.number().default(0),
    entityType: z.string().optional(),
    organizationId: z.number().optional(),
    source: z.enum(["all", "atlas_ops", "client_business", "system"]).default("all"),
  })).query(async ({ input, ctx }) => {
    const db = await getDb();
    if (!db) return { items: [], total: 0 };

    // Cross-tenant isolation
    const effectiveOrgId = resolveOrgId(ctx.user, input.organizationId);
    const isAdmin = isAtlasTeam(ctx.user);

    // If org-scoped, filter activity by venture entity IDs
    let ventureIds: number[] | null = null;
    if (effectiveOrgId) {
      ventureIds = await resolveVentureScope(ctx.user, effectiveOrgId);
    }

    const conditions = [];
    if (input.entityType) {
      conditions.push(eq(activityLog.entityType, input.entityType));
    }

    // Non-admin users NEVER see atlas_ops
    if (!isAdmin) {
      conditions.push(ne(activityLog.activitySource, "atlas_ops"));
    } else if (input.source !== "all") {
      conditions.push(eq(activityLog.activitySource, input.source));
    }

    let query = db.select().from(activityLog);
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as typeof query;
    }

    // For org-scoped, filter by entityId matching venture IDs for venture-type activities
    // This is a best-effort filter — activity log doesn't always have entityId
    const items = await query.orderBy(desc(activityLog.createdAt)).limit(input.limit).offset(input.offset);

    // If org-scoped, filter client-side by venture names
    let filteredItems = items;
    if (ventureIds !== null && ventureIds.length > 0) {
      const orgVentures = await db.select({ id: ventures.id, name: ventures.name })
        .from(ventures).where(inArray(ventures.id, ventureIds));
      const ventureNames = new Set(orgVentures.map(v => v.name.toLowerCase()));
      const ventureIdSet = new Set(ventureIds);

      const ventureNamesArr = Array.from(ventureNames);
      filteredItems = items.filter(item => {
        // Match by entityId for venture-type activities
        if (item.entityType === "venture" && item.entityId && ventureIdSet.has(item.entityId)) return true;
        // Match by entityName containing a venture name
        if (item.entityName) {
          const nameLower = item.entityName.toLowerCase();
          for (const vn of ventureNamesArr) {
            if (nameLower.includes(vn)) return true;
          }
        }
        // Match by detail containing a venture name
        if (item.detail) {
          const detailLower = item.detail.toLowerCase();
          for (const vn of ventureNamesArr) {
            if (detailLower.includes(vn)) return true;
          }
        }
        // Include non-venture activities (distributions, system, etc.)
        if (!item.entityType || !["venture", "task", "spv"].includes(item.entityType)) return true;
        return false;
      });
    }

    const countResult = await db.select({ count: sql<number>`COUNT(*)` }).from(activityLog);
    const total = countResult[0]?.count || 0;

    return { items: filteredItems, total };
  }),

  recent: protectedProcedure.input(z.object({
    limit: z.number().default(10),
    organizationId: z.number().optional(),
    source: z.enum(["all", "atlas_ops", "client_business", "system"]).default("all"),
  })).query(async ({ input, ctx }) => {
    const db = await getDb();
    if (!db) return [];

    const isAdmin = isAtlasTeam(ctx.user);
    // Cross-tenant isolation
    const effectiveOrgId = resolveOrgId(ctx.user, input.organizationId);

    // Build base conditions
    const conditions = [];

    // Non-admin users NEVER see atlas_ops
    if (!isAdmin) {
      conditions.push(ne(activityLog.activitySource, "atlas_ops"));
    } else if (input.source !== "all") {
      conditions.push(eq(activityLog.activitySource, input.source));
    }

    let baseQuery = db.select().from(activityLog);
    if (conditions.length > 0) {
      baseQuery = baseQuery.where(and(...conditions)) as typeof baseQuery;
    }
    const all = await baseQuery.orderBy(desc(activityLog.createdAt)).limit(input.limit * 3);

    if (!effectiveOrgId) {
      return all.slice(0, input.limit);
    }

    // Org-scoped filtering
    const ventureIds = await resolveVentureScope(ctx.user, effectiveOrgId);
    if (ventureIds === null) return all.slice(0, input.limit);
    if (ventureIds.length === 0) return [];

    const orgVentures = await db.select({ id: ventures.id, name: ventures.name })
      .from(ventures).where(inArray(ventures.id, ventureIds));
    const ventureNames = new Set(orgVentures.map(v => v.name.toLowerCase()));
    const ventureIdSet = new Set(ventureIds);

    const ventureNamesArr = Array.from(ventureNames);
    const filtered = all.filter(item => {
      if (item.entityType === "venture" && item.entityId && ventureIdSet.has(item.entityId)) return true;
      if (item.entityName) {
        const nameLower = item.entityName.toLowerCase();
        for (const vn of ventureNamesArr) {
          if (nameLower.includes(vn)) return true;
        }
      }
      if (item.detail) {
        const detailLower = item.detail.toLowerCase();
        for (const vn of ventureNamesArr) {
          if (detailLower.includes(vn)) return true;
        }
      }
      if (!item.entityType || !["venture", "task", "spv"].includes(item.entityType)) return true;
      return false;
    });

    return filtered.slice(0, input.limit);
  }),

  metrics: protectedProcedure
    .input(z.object({ organizationId: z.number().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return { today: 0, thisWeek: 0, thisMonth: 0, total: 0 };

      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekStart = new Date(todayStart);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

      const all = await db.select().from(activityLog);

      return {
        today: all.filter(a => a.createdAt >= todayStart).length,
        thisWeek: all.filter(a => a.createdAt >= weekStart).length,
        thisMonth: all.filter(a => a.createdAt >= monthStart).length,
        total: all.length,
      };
    }),
});
