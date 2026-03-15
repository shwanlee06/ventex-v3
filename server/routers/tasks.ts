import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { tasks, activityLog, ventures } from "../../drizzle/schema";
import { eq, desc, and, sql } from "drizzle-orm";

export const tasksRouter = router({
  list: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    return db.select().from(tasks).orderBy(desc(tasks.createdAt));
  }),

  getById: publicProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
    const db = await getDb();
    if (!db) return null;
    const rows = await db.select().from(tasks).where(eq(tasks.id, input.id)).limit(1);
    return rows[0] || null;
  }),

  getByVenture: publicProcedure.input(z.object({ ventureId: z.number() })).query(async ({ input }) => {
    const db = await getDb();
    if (!db) return [];
    return db.select().from(tasks).where(eq(tasks.ventureId, input.ventureId)).orderBy(desc(tasks.createdAt));
  }),

  create: publicProcedure.input(z.object({
    title: z.string(),
    ventureId: z.number().optional(),
    ventureLink: z.string().optional(),
    assigneeNames: z.array(z.string()).default([]),
    dueDate: z.string().optional(),
    priority: z.string().default("Medium"),
    status: z.string().default("open"),
    description: z.string().optional(),
  })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    await db.insert(tasks).values({
      ...input,
      assigneeNames: input.assigneeNames,
    });
    await db.insert(activityLog).values({
      entityType: "task", entityName: input.title, action: "Task Created",
      detail: `New task "${input.title}" created`, userName: "System",
    });
    return { success: true };
  }),

  update: publicProcedure.input(z.object({
    id: z.number(),
    title: z.string().optional(),
    ventureId: z.number().nullable().optional(),
    ventureLink: z.string().nullable().optional(),
    assigneeNames: z.array(z.string()).optional(),
    dueDate: z.string().optional(),
    priority: z.string().optional(),
    status: z.string().optional(),
    description: z.string().optional(),
  })).mutation(async ({ input }) => {
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
        userName: "System",
      });
    }
    return rows[0] || null;
  }),

  delete: publicProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    await db.delete(tasks).where(eq(tasks.id, input.id));
    return { success: true };
  }),

  metrics: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) return { total: 0, open: 0, complete: 0, overdue: 0 };
    const all = await db.select().from(tasks);
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
