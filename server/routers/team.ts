import { z } from "zod";
import { publicProcedure, protectedProcedure, router, adminProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { teamMembers, activityLog, ventureTeam, ventures, organizations } from "../../drizzle/schema";
import { eq, desc, inArray, isNull, isNotNull, and } from "drizzle-orm";
import { nanoid } from "nanoid";
import { resolveVentureScope, getVentureIdsForOrg } from "../security/rbac";

function slugify(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export const teamRouter = router({
  /**
   * List all team members — supports org-scoped filtering
   * If organizationId is provided, returns members belonging to that org
   * If no filter, returns all members
   */
  list: publicProcedure
    .input(z.object({ organizationId: z.number().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return [];

      // If org-scoped, return members that belong to that org (by organizationId field)
      // PLUS members assigned to that org's ventures via ventureTeam
      if (input?.organizationId) {
        // Direct org members
        const directMembers = await db.select().from(teamMembers)
          .where(eq(teamMembers.organizationId, input.organizationId))
          .orderBy(desc(teamMembers.createdAt));

        // Also get members assigned to this org's ventures
        const ventureIds = ctx.user
          ? await resolveVentureScope(ctx.user, input.organizationId)
          : await getVentureIdsForOrg(input.organizationId);

        let ventureMembers: typeof directMembers = [];
        if (ventureIds !== null && ventureIds.length > 0) {
          const assignments = await db.select({ memberId: ventureTeam.memberId })
            .from(ventureTeam)
            .where(inArray(ventureTeam.ventureId, ventureIds));
          const memberIds = Array.from(new Set(assignments.map(a => a.memberId)));
          if (memberIds.length > 0) {
            ventureMembers = await db.select().from(teamMembers)
              .where(inArray(teamMembers.id, memberIds))
              .orderBy(desc(teamMembers.createdAt));
          }
        }

        // Merge and deduplicate
        const seen = new Set<number>();
        const merged = [];
        for (const m of [...directMembers, ...ventureMembers]) {
          if (!seen.has(m.id)) {
            seen.add(m.id);
            merged.push(m);
          }
        }
        return merged;
      }

      return db.select().from(teamMembers).orderBy(desc(teamMembers.createdAt));
    }),

  /**
   * List ATLAS/Aurovia internal members only (organizationId IS NULL)
   */
  listInternal: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    return db.select().from(teamMembers)
      .where(isNull(teamMembers.organizationId))
      .orderBy(desc(teamMembers.createdAt));
  }),

  /**
   * List client contacts grouped by organization
   * Returns all members that have an organizationId set
   */
  listByOrganization: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];

    // Get all members with an org
    const members = await db.select({
      id: teamMembers.id,
      name: teamMembers.name,
      role: teamMembers.role,
      memberFunction: teamMembers.memberFunction,
      status: teamMembers.status,
      type: teamMembers.type,
      organizationId: teamMembers.organizationId,
      email: teamMembers.email,
      phone: teamMembers.phone,
      telegram: teamMembers.telegram,
      whatsapp: teamMembers.whatsapp,
      linkedin: teamMembers.linkedin,
      location: teamMembers.location,
      notes: teamMembers.notes,
      slug: teamMembers.slug,
      createdAt: teamMembers.createdAt,
      orgName: organizations.name,
      orgSlug: organizations.slug,
    })
      .from(teamMembers)
      .leftJoin(organizations, eq(teamMembers.organizationId, organizations.id))
      .where(isNotNull(teamMembers.organizationId))
      .orderBy(organizations.name, desc(teamMembers.createdAt));

    return members;
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

  create: adminProcedure.input(z.object({
    name: z.string(),
    role: z.string().optional(),
    memberFunction: z.string().optional(),
    status: z.string().default("Active"),
    type: z.string().default("Internal"),
    organizationId: z.number().nullable().optional(), // null = ATLAS internal
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
    const { organizationId, ...rest } = input;
    await db.insert(teamMembers).values({
      ...rest,
      organizationId: organizationId ?? null,
      slug,
    });
    await db.insert(activityLog).values({
      entityType: "team", entityName: input.name, action: "Member Added",
      detail: `${input.name} added as ${input.role || input.type}${organizationId ? ` (client contact)` : ` (ATLAS internal)`}`,
      userName: "System",
    });
    return { success: true };
  }),

  // Venture team assignments — optionally scoped by org
  ventureAssignments: protectedProcedure
    .input(z.object({ organizationId: z.number().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return [];

      const rows = await db
        .select({
          id: ventureTeam.id,
          ventureId: ventureTeam.ventureId,
          memberId: ventureTeam.memberId,
          responsibility: ventureTeam.responsibility,
          ventureName: ventures.name,
          ventureSector: ventures.sector,
          memberName: teamMembers.name,
          memberRole: teamMembers.role,
          memberFunction: teamMembers.memberFunction,
          memberType: teamMembers.type,
        })
        .from(ventureTeam)
        .leftJoin(ventures, eq(ventureTeam.ventureId, ventures.id))
        .leftJoin(teamMembers, eq(ventureTeam.memberId, teamMembers.id));

      // If org-scoped, filter by venture IDs
      if (input?.organizationId) {
        const ventureIds = await resolveVentureScope(ctx.user, input.organizationId);
        if (ventureIds === null) return rows;
        if (ventureIds.length === 0) return [];
        const ventureIdSet = new Set(ventureIds);
        return rows.filter(r => ventureIdSet.has(r.ventureId));
      }

      return rows;
    }),

  assignToVenture: publicProcedure.input(z.object({
    ventureId: z.number(),
    memberId: z.number(),
    responsibility: z.string().optional(),
  })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    await db.insert(ventureTeam).values({
      ventureId: input.ventureId,
      memberId: input.memberId,
      responsibility: input.responsibility || null,
    });
    return { success: true };
  }),

  removeFromVenture: publicProcedure.input(z.object({
    id: z.number(),
  })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    await db.delete(ventureTeam).where(eq(ventureTeam.id, input.id));
    return { success: true };
  }),

  update: adminProcedure.input(z.object({
    id: z.number(),
    name: z.string().optional(),
    role: z.string().optional(),
    memberFunction: z.string().optional(),
    status: z.string().optional(),
    type: z.string().optional(),
    organizationId: z.number().nullable().optional(),
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
    // Handle explicit null for organizationId (move to ATLAS internal)
    const updateData: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(data)) {
      if (val !== undefined) updateData[key] = val;
    }
    await db.update(teamMembers).set(updateData).where(eq(teamMembers.id, id));
    return { success: true };
  }),

  /** Delete a team member */
  delete: adminProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // Get member info for activity log
    const [member] = await db.select().from(teamMembers).where(eq(teamMembers.id, input.id)).limit(1);
    if (!member) throw new Error("Member not found");

    // Remove venture assignments
    await db.delete(ventureTeam).where(eq(ventureTeam.memberId, input.id));

    // Delete member
    await db.delete(teamMembers).where(eq(teamMembers.id, input.id));

    await db.insert(activityLog).values({
      entityType: "team", entityName: member.name, action: "Member Removed",
      detail: `${member.name} removed from the system`, userName: "System",
    });

    return { success: true, name: member.name };
  }),
});
