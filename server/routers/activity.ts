import { z } from "zod";
import { publicProcedure, protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { activityLog, ventures } from "../../drizzle/schema";
import { desc, eq, and, gte, sql, inArray } from "drizzle-orm";
import { resolveVentureScope } from "../security/rbac";

export const activityRouter = router({
  list: protectedProcedure.input(z.object({
    limit: z.number().default(50),
    offset: z.number().default(0),
    entityType: z.string().optional(),
    organizationId: z.number().optional(),
  })).query(async ({ input, ctx }) => {
    const db = await getDb();
    if (!db) return { items: [], total: 0 };

    // If org-scoped, filter activity by venture entity IDs
    let ventureIds: number[] | null = null;
    if (input.organizationId) {
      ventureIds = await resolveVentureScope(ctx.user, input.organizationId);
    }

    let query = db.select().from(activityLog);

    if (input.entityType) {
      query = query.where(eq(activityLog.entityType, input.entityType)) as typeof query;
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

  recent: publicProcedure.input(z.object({
    limit: z.number().default(10),
    organizationId: z.number().optional(),
  })).query(async ({ input, ctx }) => {
    const db = await getDb();
    if (!db) return [];

    const all = await db.select().from(activityLog).orderBy(desc(activityLog.createdAt)).limit(input.limit * 3);

    if (!input.organizationId) {
      return all.slice(0, input.limit);
    }

    // Org-scoped filtering
    const ventureIds = ctx.user
      ? await resolveVentureScope(ctx.user, input.organizationId)
      : await (await import("../security/rbac")).getVentureIdsForOrg(input.organizationId);
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

  metrics: publicProcedure
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
