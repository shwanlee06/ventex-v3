import { z } from "zod";
import { publicProcedure, protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { distributions, activityLog } from "../../drizzle/schema";
import { eq, desc } from "drizzle-orm";
import { isAtlasTeam } from "../security/rbac";

export const distributionsRouter = router({
  // List distributions — currently all users see all distributions
  // TODO: Add ventureId/orgId to distributions table for proper scoping
  list: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];
    return db.select().from(distributions).orderBy(desc(distributions.createdAt));
  }),

  // Create distribution — ATLAS team only
  create: protectedProcedure.input(z.object({
    name: z.string(),
    fund: z.string().optional(),
    amount: z.number(),
    currency: z.string().default("USD"),
    type: z.string().optional(),
    status: z.string().default("Scheduled"),
    method: z.string().optional(),
    notes: z.string().optional(),
    distributionDate: z.string().optional(),
  })).mutation(async ({ input, ctx }) => {
    if (!isAtlasTeam(ctx.user)) {
      throw new Error("Only ATLAS team can create distributions");
    }
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    await db.insert(distributions).values(input);
    await db.insert(activityLog).values({
      entityType: "distribution", entityName: input.name, action: "Distribution Created",
      detail: `Distribution "${input.name}" — $${input.amount.toLocaleString()} ${input.status}`, userName: ctx.user.name || "System",
    });
    return { success: true };
  }),

  // Update distribution — ATLAS team only
  update: protectedProcedure.input(z.object({
    id: z.number(),
    name: z.string().optional(),
    fund: z.string().optional(),
    amount: z.number().optional(),
    currency: z.string().optional(),
    type: z.string().optional(),
    status: z.string().optional(),
    method: z.string().optional(),
    notes: z.string().optional(),
    distributionDate: z.string().optional(),
  })).mutation(async ({ input, ctx }) => {
    if (!isAtlasTeam(ctx.user)) {
      throw new Error("Only ATLAS team can update distributions");
    }
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const { id, ...data } = input;
    await db.update(distributions).set(data).where(eq(distributions.id, id));
    return { success: true };
  }),

  // Metrics
  metrics: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) return { total: 0, paid: 0, totalAmount: 0, paidAmount: 0 };
    const all = await db.select().from(distributions);
    return {
      total: all.length,
      paid: all.filter(d => d.status === "Paid").length,
      totalAmount: all.reduce((s, d) => s + (d.amount || 0), 0),
      paidAmount: all.filter(d => d.status === "Paid").reduce((s, d) => s + (d.amount || 0), 0),
    };
  }),
});
