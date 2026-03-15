import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { spvs, spvVentures, spvTeam, ventures, teamMembers, ventureFiles, activityLog } from "../../drizzle/schema";
import { eq, desc, and } from "drizzle-orm";
import { nanoid } from "nanoid";
import { storagePut } from "../storage";

function slugify(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export const spvsRouter = router({
  list: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    return db.select().from(spvs).orderBy(desc(spvs.createdAt));
  }),

  getBySlug: publicProcedure.input(z.object({ slug: z.string() })).query(async ({ input }) => {
    const db = await getDb();
    if (!db) return null;
    const rows = await db.select().from(spvs).where(eq(spvs.slug, input.slug)).limit(1);
    return rows[0] || null;
  }),

  getById: publicProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
    const db = await getDb();
    if (!db) return null;
    const rows = await db.select().from(spvs).where(eq(spvs.id, input.id)).limit(1);
    return rows[0] || null;
  }),

  create: publicProcedure.input(z.object({
    name: z.string(),
    sector: z.string().optional(),
    priority: z.string().default("Medium"),
    stage: z.string().default("Active deal"),
    notes: z.string().optional(),
    currentStatus: z.string().optional(),
    nextStep: z.string().optional(),
  })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const slug = slugify(input.name) + "-" + nanoid(4);
    await db.insert(spvs).values({ ...input, slug });
    await db.insert(activityLog).values({
      entityType: "spv", entityName: input.name, action: "SPV Created",
      detail: `New SPV "${input.name}" created`, userName: "System", sector: input.sector,
    });
    const rows = await db.select().from(spvs).where(eq(spvs.slug, slug)).limit(1);
    return rows[0];
  }),

  update: publicProcedure.input(z.object({
    id: z.number(),
    name: z.string().optional(),
    sector: z.string().optional(),
    priority: z.string().optional(),
    stage: z.string().optional(),
    notes: z.string().optional(),
    currentStatus: z.string().optional(),
    nextStep: z.string().optional(),
  })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const { id, ...data } = input;
    await db.update(spvs).set(data).where(eq(spvs.id, id));
    const rows = await db.select().from(spvs).where(eq(spvs.id, id)).limit(1);
    if (rows[0]) {
      await db.insert(activityLog).values({
        entityType: "spv", entityId: id, entityName: rows[0].name,
        action: "SPV Updated", detail: `SPV "${rows[0].name}" updated`, userName: "System", sector: rows[0].sector,
      });
    }
    return rows[0] || null;
  }),

  // Linked ventures
  getLinkedVentures: publicProcedure.input(z.object({ spvId: z.number() })).query(async ({ input }) => {
    const db = await getDb();
    if (!db) return [];
    return db.select({
      id: spvVentures.id,
      ventureId: spvVentures.ventureId,
      ventureName: ventures.name,
      ventureSector: ventures.sector,
      ventureSlug: ventures.slug,
    }).from(spvVentures)
      .innerJoin(ventures, eq(spvVentures.ventureId, ventures.id))
      .where(eq(spvVentures.spvId, input.spvId));
  }),

  linkVenture: publicProcedure.input(z.object({
    spvId: z.number(),
    ventureId: z.number(),
  })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const existing = await db.select().from(spvVentures)
      .where(and(eq(spvVentures.spvId, input.spvId), eq(spvVentures.ventureId, input.ventureId))).limit(1);
    if (existing.length > 0) return { success: true };
    await db.insert(spvVentures).values(input);
    return { success: true };
  }),

  unlinkVenture: publicProcedure.input(z.object({
    spvId: z.number(),
    ventureId: z.number(),
  })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    await db.delete(spvVentures).where(
      and(eq(spvVentures.spvId, input.spvId), eq(spvVentures.ventureId, input.ventureId))
    );
    return { success: true };
  }),

  // Team
  getTeam: publicProcedure.input(z.object({ spvId: z.number() })).query(async ({ input }) => {
    const db = await getDb();
    if (!db) return [];
    return db.select({
      id: spvTeam.id,
      memberId: spvTeam.memberId,
      responsibility: spvTeam.responsibility,
      memberName: teamMembers.name,
      memberRole: teamMembers.role,
      memberSlug: teamMembers.slug,
    }).from(spvTeam)
      .innerJoin(teamMembers, eq(spvTeam.memberId, teamMembers.id))
      .where(eq(spvTeam.spvId, input.spvId));
  }),

  assignTeam: publicProcedure.input(z.object({
    spvId: z.number(),
    memberId: z.number(),
    responsibility: z.string().optional(),
  })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const existing = await db.select().from(spvTeam)
      .where(and(eq(spvTeam.spvId, input.spvId), eq(spvTeam.memberId, input.memberId))).limit(1);
    if (existing.length > 0) return { success: true };
    await db.insert(spvTeam).values(input);
    return { success: true };
  }),

  removeTeam: publicProcedure.input(z.object({
    spvId: z.number(),
    memberId: z.number(),
  })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    await db.delete(spvTeam).where(
      and(eq(spvTeam.spvId, input.spvId), eq(spvTeam.memberId, input.memberId))
    );
    return { success: true };
  }),

  metrics: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) return { total: 0, active: 0, negotiating: 0, closed: 0 };
    const all = await db.select().from(spvs);
    return {
      total: all.length,
      active: all.filter(s => s.stage === "Active deal").length,
      negotiating: all.filter(s => s.stage === "In negotiation").length,
      closed: all.filter(s => s.stage === "Closed deal").length,
    };
  }),
});
