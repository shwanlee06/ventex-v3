import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { notifications } from "../../drizzle/schema";
import { eq, desc, and, sql } from "drizzle-orm";

export const notificationsRouter = router({
  list: publicProcedure.input(z.object({ limit: z.number().default(20) })).query(async ({ input }) => {
    const db = await getDb();
    if (!db) return [];
    return db.select().from(notifications).orderBy(desc(notifications.createdAt)).limit(input.limit);
  }),

  unreadCount: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) return 0;
    const result = await db.select({ count: sql<number>`COUNT(*)` }).from(notifications).where(eq(notifications.read, 0));
    return result[0]?.count || 0;
  }),

  markRead: publicProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    await db.update(notifications).set({ read: 1 }).where(eq(notifications.id, input.id));
    return { success: true };
  }),

  markAllRead: publicProcedure.mutation(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    await db.update(notifications).set({ read: 1 }).where(eq(notifications.read, 0));
    return { success: true };
  }),

  create: publicProcedure.input(z.object({
    type: z.string(),
    title: z.string(),
    message: z.string().optional(),
    entityType: z.string().optional(),
    entityId: z.number().optional(),
  })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    await db.insert(notifications).values(input);
    return { success: true };
  }),
});
