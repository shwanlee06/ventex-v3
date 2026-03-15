import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { teamMembers, activityLog } from "../../drizzle/schema";
import { eq, desc } from "drizzle-orm";
import { nanoid } from "nanoid";

function slugify(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export const teamRouter = router({
  list: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    return db.select().from(teamMembers).orderBy(desc(teamMembers.createdAt));
  }),

  getBySlug: publicProcedure.input(z.object({ slug: z.string() })).query(async ({ input }) => {
    const db = await getDb();
    if (!db) return null;
    const rows = await db.select().from(teamMembers).where(eq(teamMembers.slug, input.slug)).limit(1);
    return rows[0] || null;
  }),

  getById: publicProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
    const db = await getDb();
    if (!db) return null;
    const rows = await db.select().from(teamMembers).where(eq(teamMembers.id, input.id)).limit(1);
    return rows[0] || null;
  }),

  create: publicProcedure.input(z.object({
    name: z.string(),
    role: z.string().optional(),
    memberFunction: z.string().optional(),
    status: z.string().default("Active"),
    type: z.string().default("Internal"),
    notes: z.string().optional(),
    email: z.string().optional(),
    phone: z.string().optional(),
    telegram: z.string().optional(),
    whatsapp: z.string().optional(),
    linkedin: z.string().optional(),
    location: z.string().optional(),
  })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const slug = slugify(input.name) + "-" + nanoid(4);
    await db.insert(teamMembers).values({ ...input, slug });
    await db.insert(activityLog).values({
      entityType: "team", entityName: input.name, action: "Member Added",
      detail: `${input.name} added as ${input.role || input.type}`, userName: "System",
    });
    return { success: true };
  }),

  update: publicProcedure.input(z.object({
    id: z.number(),
    name: z.string().optional(),
    role: z.string().optional(),
    memberFunction: z.string().optional(),
    status: z.string().optional(),
    type: z.string().optional(),
    notes: z.string().optional(),
    email: z.string().optional(),
    phone: z.string().optional(),
    telegram: z.string().optional(),
    whatsapp: z.string().optional(),
    linkedin: z.string().optional(),
    location: z.string().optional(),
  })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const { id, ...data } = input;
    await db.update(teamMembers).set(data).where(eq(teamMembers.id, id));
    return { success: true };
  }),
});
