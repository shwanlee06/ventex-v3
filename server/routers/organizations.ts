import { z } from "zod";
import { eq, and, inArray } from "drizzle-orm";
import { protectedProcedure, adminProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { organizations, orgVentureAccess, ventures } from "../../drizzle/schema";

export const organizationsRouter = router({
  // List all client organizations (admin only)
  list: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];

    const orgs = await db
      .select()
      .from(organizations)
      .where(eq(organizations.type, "client"));

    // Get venture counts per org
    const access = await db.select().from(orgVentureAccess);
    const countMap = new Map<number, number>();
    for (const a of access) {
      countMap.set(a.organizationId, (countMap.get(a.organizationId) || 0) + 1);
    }

    return orgs.map(org => ({
      ...org,
      ventureCount: countMap.get(org.id) || 0,
    }));
  }),

  // Get a single organization by slug
  bySlug: protectedProcedure
    .input(z.object({ slug: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;

      const [org] = await db
        .select()
        .from(organizations)
        .where(eq(organizations.slug, input.slug))
        .limit(1);

      if (!org) return null;

      // Get venture count
      const access = await db
        .select()
        .from(orgVentureAccess)
        .where(eq(orgVentureAccess.organizationId, org.id));

      return { ...org, ventureCount: access.length };
    }),

  // Get ventures for a specific organization
  ventures: protectedProcedure
    .input(z.object({ organizationId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      const access = await db
        .select()
        .from(orgVentureAccess)
        .where(eq(orgVentureAccess.organizationId, input.organizationId));

      if (access.length === 0) return [];

      const ventureIds = access.map(a => a.ventureId);
      const orgVentures = await db
        .select()
        .from(ventures)
        .where(inArray(ventures.id, ventureIds));

      return orgVentures;
    }),

  // Create a new client organization (admin only)
  create: adminProcedure
    .input(
      z.object({
        name: z.string().min(1).max(255),
        slug: z.string().min(1).max(128),
        description: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      await db.insert(organizations).values({
        name: input.name,
        slug: input.slug,
        type: "client",
        description: input.description || null,
      });

      const [created] = await db
        .select()
        .from(organizations)
        .where(eq(organizations.slug, input.slug))
        .limit(1);

      return created;
    }),
});
