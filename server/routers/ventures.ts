import { z } from "zod";
import { publicProcedure, protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { ventures, ventureTeam, teamMembers, tasks, ventureFiles, ventureFolders, activityLog } from "../../drizzle/schema";
import { eq, and, sql, desc, like, inArray } from "drizzle-orm";
import { storagePut } from "../storage";
import { nanoid } from "nanoid";
import { isAtlasTeam, getOrgVentureIds } from "../security/rbac";

function slugify(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export const venturesRouter = router({
  // List ventures — scoped by org for clients, all for ATLAS team
  list: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];

    const ventureIds = await getOrgVentureIds(ctx.user);

    // ATLAS team sees everything
    if (ventureIds === null) {
      return db.select().from(ventures).orderBy(desc(ventures.createdAt));
    }

    // Client sees only their org's ventures
    if (ventureIds.length === 0) return [];
    return db.select().from(ventures)
      .where(inArray(ventures.id, ventureIds))
      .orderBy(desc(ventures.createdAt));
  }),

  // Get single venture by slug — check access
  getBySlug: protectedProcedure.input(z.object({ slug: z.string() })).query(async ({ input, ctx }) => {
    const db = await getDb();
    if (!db) return null;
    const rows = await db.select().from(ventures).where(eq(ventures.slug, input.slug)).limit(1);
    if (!rows[0]) return null;

    // Check org access for non-ATLAS users
    if (!isAtlasTeam(ctx.user)) {
      const ventureIds = await getOrgVentureIds(ctx.user);
      if (ventureIds && !ventureIds.includes(rows[0].id)) return null;
    }

    return rows[0];
  }),

  // Get venture by ID — check access
  getById: protectedProcedure.input(z.object({ id: z.number() })).query(async ({ input, ctx }) => {
    const db = await getDb();
    if (!db) return null;
    const rows = await db.select().from(ventures).where(eq(ventures.id, input.id)).limit(1);
    if (!rows[0]) return null;

    if (!isAtlasTeam(ctx.user)) {
      const ventureIds = await getOrgVentureIds(ctx.user);
      if (ventureIds && !ventureIds.includes(rows[0].id)) return null;
    }

    return rows[0];
  }),

  // Create venture — ATLAS team only
  create: protectedProcedure.input(z.object({
    name: z.string(),
    sector: z.string(),
    location: z.string().default("TBD"),
    stage: z.string().default("In Validation"),
    status: z.string().default("In progress"),
    description: z.string().optional(),
    currentStatus: z.string().optional(),
    nextStep: z.string().optional(),
    nextMilestone: z.string().optional(),
    priority: z.string().default("Medium"),
  })).mutation(async ({ input, ctx }) => {
    if (!isAtlasTeam(ctx.user)) {
      throw new Error("Only ATLAS team can create ventures");
    }
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const slug = slugify(input.name) + "-" + nanoid(4);
    await db.insert(ventures).values({ ...input, slug });
    await db.insert(activityLog).values({
      entityType: "venture", entityName: input.name, action: "Venture Created",
      detail: `New venture "${input.name}" added in ${input.sector}`, userName: ctx.user.name || "System", sector: input.sector,
    });
    const rows = await db.select().from(ventures).where(eq(ventures.slug, slug)).limit(1);
    return rows[0];
  }),

  // Update venture — ATLAS team only
  update: protectedProcedure.input(z.object({
    id: z.number(),
    name: z.string().optional(),
    sector: z.string().optional(),
    location: z.string().optional(),
    stage: z.string().optional(),
    status: z.string().optional(),
    description: z.string().optional(),
    currentStatus: z.string().optional(),
    nextStep: z.string().optional(),
    nextMilestone: z.string().optional(),
    priority: z.string().optional(),
  })).mutation(async ({ input, ctx }) => {
    if (!isAtlasTeam(ctx.user)) {
      throw new Error("Only ATLAS team can update ventures");
    }
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const { id, ...data } = input;
    await db.update(ventures).set(data).where(eq(ventures.id, id));
    const rows = await db.select().from(ventures).where(eq(ventures.id, id)).limit(1);
    if (rows[0]) {
      await db.insert(activityLog).values({
        entityType: "venture", entityId: id, entityName: rows[0].name,
        action: "Venture Updated", detail: `Venture "${rows[0].name}" updated`, userName: ctx.user.name || "System", sector: rows[0].sector,
      });
    }
    return rows[0] || null;
  }),

  // Get team members assigned to a venture
  getTeam: protectedProcedure.input(z.object({ ventureId: z.number() })).query(async ({ input }) => {
    const db = await getDb();
    if (!db) return [];
    const rows = await db.select({
      id: ventureTeam.id,
      memberId: ventureTeam.memberId,
      responsibility: ventureTeam.responsibility,
      memberName: teamMembers.name,
      memberRole: teamMembers.role,
      memberFunction: teamMembers.memberFunction,
      memberType: teamMembers.type,
      memberSlug: teamMembers.slug,
    }).from(ventureTeam)
      .innerJoin(teamMembers, eq(ventureTeam.memberId, teamMembers.id))
      .where(eq(ventureTeam.ventureId, input.ventureId));
    return rows;
  }),

  // Assign team member to venture — ATLAS team only
  assignTeam: protectedProcedure.input(z.object({
    ventureId: z.number(),
    memberId: z.number(),
    responsibility: z.string().optional(),
  })).mutation(async ({ input, ctx }) => {
    if (!isAtlasTeam(ctx.user)) {
      throw new Error("Only ATLAS team can assign team members");
    }
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const existing = await db.select().from(ventureTeam)
      .where(and(eq(ventureTeam.ventureId, input.ventureId), eq(ventureTeam.memberId, input.memberId))).limit(1);
    if (existing.length > 0) return existing[0];
    await db.insert(ventureTeam).values(input);
    const [v] = await db.select().from(ventures).where(eq(ventures.id, input.ventureId)).limit(1);
    const [m] = await db.select().from(teamMembers).where(eq(teamMembers.id, input.memberId)).limit(1);
    if (v && m) {
      await db.insert(activityLog).values({
        entityType: "venture", entityId: input.ventureId, entityName: v.name,
        action: "Team Assigned", detail: `${m.name} assigned to ${v.name}`, userName: ctx.user.name || "System", sector: v.sector,
      });
    }
    return { success: true };
  }),

  // Remove team member from venture — ATLAS team only
  removeTeam: protectedProcedure.input(z.object({
    ventureId: z.number(),
    memberId: z.number(),
  })).mutation(async ({ input, ctx }) => {
    if (!isAtlasTeam(ctx.user)) {
      throw new Error("Only ATLAS team can remove team members");
    }
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    await db.delete(ventureTeam).where(
      and(eq(ventureTeam.ventureId, input.ventureId), eq(ventureTeam.memberId, input.memberId))
    );
    return { success: true };
  }),

  // Get tasks linked to a venture
  getTasks: protectedProcedure.input(z.object({ ventureId: z.number() })).query(async ({ input }) => {
    const db = await getDb();
    if (!db) return [];
    return db.select().from(tasks).where(eq(tasks.ventureId, input.ventureId)).orderBy(desc(tasks.createdAt));
  }),

  // Get files for a venture
  getFiles: protectedProcedure.input(z.object({ ventureId: z.number() })).query(async ({ input }) => {
    const db = await getDb();
    if (!db) return [];
    return db.select().from(ventureFiles).where(eq(ventureFiles.ventureId, input.ventureId)).orderBy(desc(ventureFiles.createdAt));
  }),

  // Upload file to venture
  uploadFile: protectedProcedure.input(z.object({
    ventureId: z.number(),
    filename: z.string(),
    fileType: z.string(),
    fileSize: z.number(),
    fileData: z.string(), // base64
    folderId: z.number().optional(),
  })).mutation(async ({ input, ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const buffer = Buffer.from(input.fileData, "base64");
    const fileKey = `ventures/${input.ventureId}/${nanoid()}-${input.filename}`;
    const { url } = await storagePut(fileKey, buffer, input.fileType);
    await db.insert(ventureFiles).values({
      ventureId: input.ventureId,
      folderId: input.folderId || null,
      filename: input.filename,
      fileType: input.fileType,
      fileSize: input.fileSize,
      fileUrl: url,
      fileKey,
      uploadedBy: ctx.user.name || undefined,
    });
    const [v] = await db.select().from(ventures).where(eq(ventures.id, input.ventureId)).limit(1);
    if (v) {
      await db.insert(activityLog).values({
        entityType: "venture", entityId: input.ventureId, entityName: v.name,
        action: "File Uploaded", detail: `File "${input.filename}" uploaded to ${v.name}`, userName: ctx.user.name || "System", sector: v.sector,
      });
    }
    return { success: true, url };
  }),

  // Delete file — ATLAS team only
  deleteFile: protectedProcedure.input(z.object({ fileId: z.number() })).mutation(async ({ input, ctx }) => {
    if (!isAtlasTeam(ctx.user)) {
      throw new Error("Only ATLAS team can delete files");
    }
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    await db.delete(ventureFiles).where(eq(ventureFiles.id, input.fileId));
    return { success: true };
  }),

  // Move file to folder
  moveFile: protectedProcedure.input(z.object({
    fileId: z.number(),
    folderId: z.number().nullable(),
  })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    await db.update(ventureFiles).set({ folderId: input.folderId }).where(eq(ventureFiles.id, input.fileId));
    return { success: true };
  }),

  // Get folders for a venture
  getFolders: protectedProcedure.input(z.object({ ventureId: z.number() })).query(async ({ input }) => {
    const db = await getDb();
    if (!db) return [];
    return db.select().from(ventureFolders).where(eq(ventureFolders.ventureId, input.ventureId));
  }),

  // Create folder
  createFolder: protectedProcedure.input(z.object({
    ventureId: z.number(),
    name: z.string(),
    color: z.string().default("blue"),
  })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    await db.insert(ventureFolders).values(input);
    return { success: true };
  }),

  // Delete folder — ATLAS team only
  deleteFolder: protectedProcedure.input(z.object({ folderId: z.number() })).mutation(async ({ input, ctx }) => {
    if (!isAtlasTeam(ctx.user)) {
      throw new Error("Only ATLAS team can delete folders");
    }
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    await db.update(ventureFiles).set({ folderId: null }).where(eq(ventureFiles.folderId, input.folderId));
    await db.delete(ventureFolders).where(eq(ventureFolders.id, input.folderId));
    return { success: true };
  }),

  // Rename folder
  renameFolder: protectedProcedure.input(z.object({
    folderId: z.number(),
    name: z.string(),
  })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    await db.update(ventureFolders).set({ name: input.name }).where(eq(ventureFolders.id, input.folderId));
    return { success: true };
  }),

  // Get metrics — scoped by org
  metrics: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return { total: 0, active: 0, bySector: {} as Record<string, { total: number; active: number }> };

    const ventureIds = await getOrgVentureIds(ctx.user);

    let all;
    if (ventureIds === null) {
      all = await db.select().from(ventures);
    } else if (ventureIds.length === 0) {
      return { total: 0, active: 0, bySector: {} as Record<string, { total: number; active: number }> };
    } else {
      all = await db.select().from(ventures).where(inArray(ventures.id, ventureIds));
    }

    const bySector: Record<string, { total: number; active: number }> = {};
    for (const v of all) {
      if (!bySector[v.sector]) bySector[v.sector] = { total: 0, active: 0 };
      bySector[v.sector].total++;
      if (v.status === "In progress") bySector[v.sector].active++;
    }
    return {
      total: all.length,
      active: all.filter(v => v.status === "In progress").length,
      bySector,
    };
  }),
});
