import { z } from "zod";
import { publicProcedure, protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { notifications, users } from "../../drizzle/schema";
import { eq, desc, and, sql, ne, isNull, or, gte } from "drizzle-orm";

export const notificationsRouter = router({
  /**
   * List notifications for the current user.
   * Admins see all notifications (global + their own).
   * Non-admins see only notifications scoped to their org or to them personally.
   */
  list: protectedProcedure
    .input(
      z.object({
        limit: z.number().default(30),
        cursor: z.number().optional(), // for pagination: last notification id
        category: z.enum(["info", "warning", "critical", "success"]).optional(),
        unreadOnly: z.boolean().default(false),
      })
    )
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return { items: [], nextCursor: undefined };

      const isAdmin = ctx.user.role === "admin" || ctx.user.role === "owner";
      const conditions: any[] = [];

      // Role-based filtering
      if (!isAdmin) {
        // Non-admins: see notifications targeted to them OR their org OR global (no userId, no orgId)
        conditions.push(
          or(
            eq(notifications.userId, ctx.user.id),
            ctx.user.organizationId
              ? or(
                  eq(notifications.organizationId, ctx.user.organizationId),
                  and(isNull(notifications.userId), isNull(notifications.organizationId))
                )
              : and(isNull(notifications.userId), isNull(notifications.organizationId))
          )!
        );
      }

      if (input.category) {
        conditions.push(eq(notifications.category, input.category));
      }

      if (input.unreadOnly) {
        conditions.push(eq(notifications.read, 0));
      }

      if (input.cursor) {
        conditions.push(sql`${notifications.id} < ${input.cursor}`);
      }

      const where = conditions.length > 0 ? and(...conditions) : undefined;

      const items = await db
        .select()
        .from(notifications)
        .where(where)
        .orderBy(desc(notifications.createdAt))
        .limit(input.limit + 1);

      let nextCursor: number | undefined;
      if (items.length > input.limit) {
        const last = items.pop()!;
        nextCursor = last.id;
      }

      return { items, nextCursor };
    }),

  /**
   * Get unread notification count for the current user.
   * Polls every 30 seconds from the frontend.
   */
  unreadCount: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return 0;

    const isAdmin = ctx.user.role === "admin" || ctx.user.role === "owner";
    let where: any;

    if (!isAdmin) {
      where = and(
        eq(notifications.read, 0),
        or(
          eq(notifications.userId, ctx.user.id),
          ctx.user.organizationId
            ? or(
                eq(notifications.organizationId, ctx.user.organizationId),
                and(isNull(notifications.userId), isNull(notifications.organizationId))
              )
            : and(isNull(notifications.userId), isNull(notifications.organizationId))
        )
      );
    } else {
      where = eq(notifications.read, 0);
    }

    const result = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(notifications)
      .where(where);

    return result[0]?.count || 0;
  }),

  /**
   * Mark a single notification as read.
   */
  markRead: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db.update(notifications).set({ read: 1 }).where(eq(notifications.id, input.id));
      return { success: true };
    }),

  /**
   * Mark all notifications as read for the current user.
   */
  markAllRead: protectedProcedure.mutation(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const isAdmin = ctx.user.role === "admin" || ctx.user.role === "owner";

    if (isAdmin) {
      await db.update(notifications).set({ read: 1 }).where(eq(notifications.read, 0));
    } else {
      // Non-admins: only mark their own or their org's notifications
      const conditions = [
        eq(notifications.read, 0),
        or(
          eq(notifications.userId, ctx.user.id),
          ctx.user.organizationId
            ? or(
                eq(notifications.organizationId, ctx.user.organizationId),
                and(isNull(notifications.userId), isNull(notifications.organizationId))
              )
            : and(isNull(notifications.userId), isNull(notifications.organizationId))
        )!,
      ];
      await db.update(notifications).set({ read: 1 }).where(and(...conditions));
    }

    return { success: true };
  }),

  /**
   * Delete a notification (admin only).
   */
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      if (ctx.user.role !== "admin" && ctx.user.role !== "owner") {
        throw new Error("Only admins can delete notifications");
      }
      await db.delete(notifications).where(eq(notifications.id, input.id));
      return { success: true };
    }),

  /**
   * Clear all read notifications (admin only).
   */
  clearRead: protectedProcedure.mutation(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    if (ctx.user.role !== "admin" && ctx.user.role !== "owner") {
      throw new Error("Only admins can clear notifications");
    }
    await db.delete(notifications).where(eq(notifications.read, 1));
    return { success: true };
  }),
});
