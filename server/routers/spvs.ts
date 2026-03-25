import { z } from "zod";
import { publicProcedure, protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { spvs, spvVentures, spvTeam, ventures, teamMembers, spvFiles, spvFolders, activityLog } from "../../drizzle/schema";
import { eq, desc, and, inArray } from "drizzle-orm";
import { nanoid } from "nanoid";
import { storagePut } from "../storage";
import { isAtlasTeam, getOrgSpvIds, resolveSpvScope } from "../security/rbac";

function slugify(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export const spvsRouter = router({
  // List SPVs — scoped by org for clients, optionally scoped for ATLAS admin
  list: protectedProcedure
    .input(z.object({ organizationId: z.number().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return [];

      const spvIds = await resolveSpvScope(ctx.user, input?.organizationId);

      if (spvIds === null) {
        return db.select().from(spvs).orderBy(desc(spvs.createdAt));
      }

      if (spvIds.length === 0) return [];
      return db.select().from(spvs)
        .where(inArray(spvs.id, spvIds))
        .orderBy(desc(spvs.createdAt));
    }),

  getBySlug: protectedProcedure.input(z.object({ slug: z.string() })).query(async ({ input, ctx }) => {
    const db = await getDb();
    if (!db) return null;
    const rows = await db.select().from(spvs).where(eq(spvs.slug, input.slug)).limit(1);
    if (!rows[0]) return null;

    if (!isAtlasTeam(ctx.user)) {
      const spvIds = await getOrgSpvIds(ctx.user);
      if (spvIds && !spvIds.includes(rows[0].id)) return null;
    }

    return rows[0];
  }),

  getById: protectedProcedure.input(z.object({ id: z.number() })).query(async ({ input, ctx }) => {
    const db = await getDb();
    if (!db) return null;
    const rows = await db.select().from(spvs).where(eq(spvs.id, input.id)).limit(1);
    if (!rows[0]) return null;

    if (!isAtlasTeam(ctx.user)) {
      const spvIds = await getOrgSpvIds(ctx.user);
      if (spvIds && !spvIds.includes(rows[0].id)) return null;
    }

    return rows[0];
  }),

  create: protectedProcedure.input(z.object({
    name: z.string(),
    sector: z.string().optional(),
    priority: z.string().default("Medium"),
    stage: z.string().default("Active deal"),
    notes: z.string().optional(),
    currentStatus: z.string().optional(),
    nextStep: z.string().optional(),
  })).mutation(async ({ input, ctx }) => {
    if (!isAtlasTeam(ctx.user)) {
      throw new Error("Only ATLAS team can create SPVs");
    }
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const slug = slugify(input.name) + "-" + nanoid(4);
    await db.insert(spvs).values({ ...input, slug });
    await db.insert(activityLog).values({
      entityType: "spv", entityName: input.name, action: "SPV Created",
      detail: `New SPV "${input.name}" created`, userName: ctx.user.name || "System", sector: input.sector,
      activitySource: "client_business",
    });
    const rows = await db.select().from(spvs).where(eq(spvs.slug, slug)).limit(1);
    return rows[0];
  }),

  update: protectedProcedure.input(z.object({
    id: z.number(),
    name: z.string().optional(),
    sector: z.string().optional(),
    priority: z.string().optional(),
    stage: z.string().optional(),
    notes: z.string().optional(),
    currentStatus: z.string().optional(),
    nextStep: z.string().optional(),
  })).mutation(async ({ input, ctx }) => {
    if (!isAtlasTeam(ctx.user)) {
      throw new Error("Only ATLAS team can update SPVs");
    }
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const { id, ...data } = input;
    await db.update(spvs).set(data).where(eq(spvs.id, id));
    const rows = await db.select().from(spvs).where(eq(spvs.id, id)).limit(1);
    if (rows[0]) {
      await db.insert(activityLog).values({
        entityType: "spv", entityId: id, entityName: rows[0].name,
        action: "SPV Updated", detail: `SPV "${rows[0].name}" updated`, userName: ctx.user.name || "System", sector: rows[0].sector,
        activitySource: "client_business",
      });
    }
    return rows[0] || null;
  }),

  getLinkedVentures: protectedProcedure.input(z.object({ spvId: z.number() })).query(async ({ input }) => {
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

  linkVenture: protectedProcedure.input(z.object({
    spvId: z.number(),
    ventureId: z.number(),
  })).mutation(async ({ input, ctx }) => {
    if (!isAtlasTeam(ctx.user)) {
      throw new Error("Only ATLAS team can link ventures");
    }
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const existing = await db.select().from(spvVentures)
      .where(and(eq(spvVentures.spvId, input.spvId), eq(spvVentures.ventureId, input.ventureId))).limit(1);
    if (existing.length > 0) return { success: true };
    await db.insert(spvVentures).values(input);
    return { success: true };
  }),

  unlinkVenture: protectedProcedure.input(z.object({
    spvId: z.number(),
    ventureId: z.number(),
  })).mutation(async ({ input, ctx }) => {
    if (!isAtlasTeam(ctx.user)) {
      throw new Error("Only ATLAS team can unlink ventures");
    }
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    await db.delete(spvVentures).where(
      and(eq(spvVentures.spvId, input.spvId), eq(spvVentures.ventureId, input.ventureId))
    );
    return { success: true };
  }),

  getTeam: protectedProcedure.input(z.object({ spvId: z.number() })).query(async ({ input }) => {
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

  assignTeam: protectedProcedure.input(z.object({
    spvId: z.number(),
    memberId: z.number(),
    responsibility: z.string().optional(),
  })).mutation(async ({ input, ctx }) => {
    if (!isAtlasTeam(ctx.user)) {
      throw new Error("Only ATLAS team can assign team members");
    }
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const existing = await db.select().from(spvTeam)
      .where(and(eq(spvTeam.spvId, input.spvId), eq(spvTeam.memberId, input.memberId))).limit(1);
    if (existing.length > 0) return { success: true };
    await db.insert(spvTeam).values(input);
    return { success: true };
  }),

  removeTeam: protectedProcedure.input(z.object({
    spvId: z.number(),
    memberId: z.number(),
  })).mutation(async ({ input, ctx }) => {
    if (!isAtlasTeam(ctx.user)) {
      throw new Error("Only ATLAS team can remove team members");
    }
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    await db.delete(spvTeam).where(
      and(eq(spvTeam.spvId, input.spvId), eq(spvTeam.memberId, input.memberId))
    );
    return { success: true };
  }),

  getFiles: protectedProcedure.input(z.object({ spvId: z.number() })).query(async ({ input }) => {
    const db = await getDb();
    if (!db) return [];
    return db.select().from(spvFiles).where(eq(spvFiles.spvId, input.spvId)).orderBy(desc(spvFiles.createdAt));
  }),

  uploadFile: protectedProcedure.input(z.object({
    spvId: z.number(),
    filename: z.string(),
    fileType: z.string(),
    fileSize: z.number(),
    fileData: z.string(),
    folderId: z.number().optional(),
  })).mutation(async ({ input, ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const buffer = Buffer.from(input.fileData, "base64");
    const fileKey = `spvs/${input.spvId}/${nanoid()}-${input.filename}`;
    const { url } = await storagePut(fileKey, buffer, input.fileType);
    await db.insert(spvFiles).values({
      spvId: input.spvId,
      folderId: input.folderId || null,
      filename: input.filename,
      fileType: input.fileType,
      fileSize: input.fileSize,
      fileUrl: url,
      fileKey,
      uploadedBy: ctx.user.name || undefined,
    });
    const [s] = await db.select().from(spvs).where(eq(spvs.id, input.spvId)).limit(1);
    if (s) {
      await db.insert(activityLog).values({
        entityType: "spv", entityId: input.spvId, entityName: s.name,
        action: "File Uploaded", detail: `File "${input.filename}" uploaded to ${s.name}`, userName: ctx.user.name || "System", sector: s.sector,
        activitySource: "client_business",
      });
    }
    return { success: true, url };
  }),

  deleteFile: protectedProcedure.input(z.object({ fileId: z.number() })).mutation(async ({ input, ctx }) => {
    if (!isAtlasTeam(ctx.user)) {
      throw new Error("Only ATLAS team can delete files");
    }
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    await db.delete(spvFiles).where(eq(spvFiles.id, input.fileId));
    return { success: true };
  }),

  moveFile: protectedProcedure.input(z.object({
    fileId: z.number(),
    folderId: z.number().nullable(),
  })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    await db.update(spvFiles).set({ folderId: input.folderId }).where(eq(spvFiles.id, input.fileId));
    return { success: true };
  }),

  getFolders: protectedProcedure.input(z.object({ spvId: z.number() })).query(async ({ input }) => {
    const db = await getDb();
    if (!db) return [];
    return db.select().from(spvFolders).where(eq(spvFolders.spvId, input.spvId));
  }),

  createFolder: protectedProcedure.input(z.object({
    spvId: z.number(),
    name: z.string(),
    color: z.string().default("blue"),
  })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    await db.insert(spvFolders).values(input);
    return { success: true };
  }),

  deleteFolder: protectedProcedure.input(z.object({ folderId: z.number() })).mutation(async ({ input, ctx }) => {
    if (!isAtlasTeam(ctx.user)) {
      throw new Error("Only ATLAS team can delete folders");
    }
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    await db.update(spvFiles).set({ folderId: null }).where(eq(spvFiles.folderId, input.folderId));
    await db.delete(spvFolders).where(eq(spvFolders.id, input.folderId));
    return { success: true };
  }),

  renameFolder: protectedProcedure.input(z.object({
    folderId: z.number(),
    name: z.string(),
  })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    await db.update(spvFolders).set({ name: input.name }).where(eq(spvFolders.id, input.folderId));
    return { success: true };
  }),

  // Metrics — scoped by org
  metrics: protectedProcedure
    .input(z.object({ organizationId: z.number().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return { total: 0, active: 0, negotiating: 0, closed: 0 };

      const spvIds = await resolveSpvScope(ctx.user, input?.organizationId);

      let all;
      if (spvIds === null) {
        all = await db.select().from(spvs);
      } else if (spvIds.length === 0) {
        return { total: 0, active: 0, negotiating: 0, closed: 0 };
      } else {
        all = await db.select().from(spvs).where(inArray(spvs.id, spvIds));
      }

      return {
        total: all.length,
        active: all.filter(s => s.stage === "Active deal").length,
        negotiating: all.filter(s => s.stage === "In negotiation").length,
        closed: all.filter(s => s.stage === "Closed deal").length,
      };
    }),
});
