import { z } from "zod";
import { publicProcedure, protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { tasks, activityLog, ventures } from "../../drizzle/schema";
import { eq, desc, and, sql, inArray, isNull } from "drizzle-orm";
import { isAtlasTeam, getOrgVentureIds, resolveVentureScope } from "../security/rbac";
import { createNotification, NOTIF_TYPES } from "../notificationHelper";

export const tasksRouter = router({
  // List tasks — scoped by org for clients, optionally scoped for ATLAS admin
  list: protectedProcedure
    .input(z.object({ organizationId: z.number().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return [];

      const ventureIds = await resolveVentureScope(ctx.user, input?.organizationId);

      if (ventureIds === null) {
        return db.select().from(tasks).orderBy(desc(tasks.createdAt));
      }

      if (ventureIds.length === 0) return [];
      return db.select().from(tasks)
        .where(inArray(tasks.ventureId, ventureIds))
        .orderBy(desc(tasks.createdAt));
    }),

  getById: protectedProcedure.input(z.object({ id: z.number() })).query(async ({ input, ctx }) => {
    const db = await getDb();
    if (!db) return null;
    const rows = await db.select().from(tasks).where(eq(tasks.id, input.id)).limit(1);
    if (!rows[0]) return null;

    if (!isAtlasTeam(ctx.user) && rows[0].ventureId) {
      const ventureIds = await getOrgVentureIds(ctx.user);
      if (ventureIds && !ventureIds.includes(rows[0].ventureId)) return null;
    }

    return rows[0];
  }),

  getByVenture: protectedProcedure.input(z.object({ ventureId: z.number() })).query(async ({ input }) => {
    const db = await getDb();
    if (!db) return [];
    return db.select().from(tasks).where(eq(tasks.ventureId, input.ventureId)).orderBy(desc(tasks.createdAt));
  }),

  create: protectedProcedure.input(z.object({
    title: z.string(),
    ventureId: z.number().optional(),
    ventureLink: z.string().optional(),
    assigneeNames: z.array(z.string()).default([]),
    dueDate: z.string().optional(),
    priority: z.string().default("Medium"),
    status: z.string().default("open"),
    description: z.string().optional(),
  })).mutation(async ({ input, ctx }) => {
    if (!isAtlasTeam(ctx.user) && input.ventureId) {
      const ventureIds = await getOrgVentureIds(ctx.user);
      if (ventureIds && !ventureIds.includes(input.ventureId)) {
        throw new Error("You can only create tasks for your assigned ventures");
      }
    }
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    await db.insert(tasks).values({
      ...input,
      assigneeNames: input.assigneeNames,
    });
    await db.insert(activityLog).values({
      entityType: "task", entityName: input.title, action: "Task Created",
      detail: `New task "${input.title}" created`, userName: ctx.user.name || "System",
      activitySource: "client_business",
    });

    await createNotification({
      type: NOTIF_TYPES.TASK_CREATED,
      category: "info",
      title: `New Task: ${input.title}`,
      message: `Task created${input.priority === "High" ? " (High Priority)" : ""}`,
      entityType: "task",
      entityName: input.title,
      actorName: ctx.user.name || "System",
    });

    return { success: true };
  }),

  update: protectedProcedure.input(z.object({
    id: z.number(),
    title: z.string().optional(),
    ventureId: z.number().nullable().optional(),
    ventureLink: z.string().nullable().optional(),
    assigneeNames: z.array(z.string()).optional(),
    dueDate: z.string().optional(),
    priority: z.string().optional(),
    status: z.string().optional(),
    description: z.string().optional(),
  })).mutation(async ({ input, ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const { id, ...data } = input;
    await db.update(tasks).set(data).where(eq(tasks.id, id));
    const rows = await db.select().from(tasks).where(eq(tasks.id, id)).limit(1);
    if (rows[0] && input.status) {
      await db.insert(activityLog).values({
        entityType: "task", entityId: id, entityName: rows[0].title,
        action: input.status === "complete" ? "Task Completed" : "Task Updated",
        detail: `Task "${rows[0].title}" ${input.status === "complete" ? "marked complete" : "updated"}`,
        userName: ctx.user.name || "System",
        activitySource: "client_business",
      });

      if (input.status === "complete") {
        await createNotification({
          type: NOTIF_TYPES.TASK_COMPLETED,
          category: "success",
          title: `Task Completed: ${rows[0].title}`,
          message: `Marked complete by ${ctx.user.name || "System"}`,
          entityType: "task",
          entityId: id,
          entityName: rows[0].title,
          actorName: ctx.user.name || "System",
        });
      }
    }
    return rows[0] || null;
  }),

  delete: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ input, ctx }) => {
    if (!isAtlasTeam(ctx.user)) {
      throw new Error("Only ATLAS team can delete tasks");
    }
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    await db.delete(tasks).where(eq(tasks.id, input.id));
    return { success: true };
  }),

  // Metrics — scoped by org
  metrics: protectedProcedure
    .input(z.object({ organizationId: z.number().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return { total: 0, open: 0, complete: 0, overdue: 0 };

      const ventureIds = await resolveVentureScope(ctx.user, input?.organizationId);

      let all;
      if (ventureIds === null) {
        all = await db.select().from(tasks);
      } else if (ventureIds.length === 0) {
        return { total: 0, open: 0, complete: 0, overdue: 0 };
      } else {
        all = await db.select().from(tasks).where(inArray(tasks.ventureId, ventureIds));
      }

      const now = new Date();
      let open = 0, complete = 0, overdue = 0;
      for (const t of all) {
        if (t.status === "complete") { complete++; continue; }
        if (t.dueDate && new Date(t.dueDate) < now) { overdue++; }
        else { open++; }
      }
      return { total: all.length, open, complete, overdue };
    }),
});
