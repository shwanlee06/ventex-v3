import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { activityLog } from "../../drizzle/schema";
import { desc, eq, and, gte, sql } from "drizzle-orm";

export const activityRouter = router({
  list: publicProcedure.input(z.object({
    limit: z.number().default(50),
    offset: z.number().default(0),
    entityType: z.string().optional(),
  })).query(async ({ input }) => {
    const db = await getDb();
    if (!db) return { items: [], total: 0 };
    
    let query = db.select().from(activityLog);
    
    if (input.entityType) {
      query = query.where(eq(activityLog.entityType, input.entityType)) as typeof query;
    }
    
    const items = await query.orderBy(desc(activityLog.createdAt)).limit(input.limit).offset(input.offset);
    
    // Get total count
    const countResult = await db.select({ count: sql<number>`COUNT(*)` }).from(activityLog);
    const total = countResult[0]?.count || 0;
    
    return { items, total };
  }),

  recent: publicProcedure.input(z.object({ limit: z.number().default(10) })).query(async ({ input }) => {
    const db = await getDb();
    if (!db) return [];
    return db.select().from(activityLog).orderBy(desc(activityLog.createdAt)).limit(input.limit);
  }),

  metrics: publicProcedure.query(async () => {
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
