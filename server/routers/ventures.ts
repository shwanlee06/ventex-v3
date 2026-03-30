import { z } from "zod";
import { publicProcedure, protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { ventures, ventureTeam, teamMembers, tasks, ventureFiles, ventureFolders, activityLog, orgVentureAccess, organizations, ventureProcessTracking, processSteps, processTemplates, ventureVelocity, clientVelocityBenchmarks } from "../../drizzle/schema";
import { invokeLLM } from "../_core/llm";
import { eq, and, sql, desc, like, inArray, isNull, gte } from "drizzle-orm";
import { storagePut } from "../storage";
import { nanoid } from "nanoid";
import { isAtlasTeam, getOrgVentureIds, resolveVentureScope, logAudit } from "../security/rbac";
import { createNotification, NOTIF_TYPES } from "../notificationHelper";

function slugify(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export const venturesRouter = router({
  // List all ventures with their org assignments — for ATLAS admin grouped view
  listWithOrgs: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];
    if (!isAtlasTeam(ctx.user)) return []; // admin only

    const allVentures = await db.select().from(ventures).orderBy(desc(ventures.createdAt));
    const allAccess = await db.select().from(orgVentureAccess);
    const allOrgs = await db.select().from(organizations);

    const orgMap = new Map(allOrgs.map(o => [o.id, o]));

    // Build venture -> orgs mapping
    const ventureOrgMap = new Map<number, { orgId: number; orgName: string; orgSlug: string }[]>();
    for (const a of allAccess) {
      const org = orgMap.get(a.organizationId);
      if (!org || org.status === "archived") continue;
      const existing = ventureOrgMap.get(a.ventureId) || [];
      existing.push({ orgId: org.id, orgName: org.name, orgSlug: org.slug });
      ventureOrgMap.set(a.ventureId, existing);
    }

    return allVentures.map(v => ({
      ...v,
      organizations: ventureOrgMap.get(v.id) || [],
    }));
  }),

  // List ventures — scoped by org for clients, optionally scoped for ATLAS admin
  list: protectedProcedure
    .input(z.object({ organizationId: z.number().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return [];

      const ventureIds = await resolveVentureScope(ctx.user, input?.organizationId);

      // No filtering needed (ATLAS admin with no org selected)
      if (ventureIds === null) {
        return db.select().from(ventures).orderBy(desc(ventures.createdAt));
      }

      // Filtered by org
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
    organizationId: z.number().optional(),
  })).mutation(async ({ input, ctx }) => {
    if (!isAtlasTeam(ctx.user)) {
      throw new Error("Only ATLAS team can create ventures");
    }
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const { organizationId, ...ventureData } = input;
    const slug = slugify(ventureData.name) + "-" + nanoid(4);
    await db.insert(ventures).values({ ...ventureData, slug });
    const rows = await db.select().from(ventures).where(eq(ventures.slug, slug)).limit(1);
    const newVenture = rows[0];

    // Auto-link to client org if provided
    if (organizationId && newVenture) {
      await db.insert(orgVentureAccess).values({
        organizationId,
        ventureId: newVenture.id,
        permission: "full",
        grantedBy: ctx.user.id,
      });
    }

    // Get org name for activity log
    let orgName = "";
    if (organizationId) {
      const orgRows = await db.select().from(organizations).where(eq(organizations.id, organizationId)).limit(1);
      orgName = orgRows[0]?.name || "";
    }

    await db.insert(activityLog).values({
      entityType: "venture", entityName: ventureData.name, action: "Venture Created",
      detail: `New venture "${ventureData.name}" added in ${ventureData.sector}${orgName ? ` for ${orgName}` : ""}`,
      userName: ctx.user.name || "System", sector: ventureData.sector,
      activitySource: "client_business", organizationId: organizationId || null,
    });

    // Notification
    await createNotification({
      type: NOTIF_TYPES.VENTURE_CREATED,
      category: "info",
      title: `New Venture: ${ventureData.name}`,
      message: `${ventureData.name} created in ${ventureData.sector}${orgName ? ` for ${orgName}` : ""}`,
      entityType: "venture",
      entityId: newVenture?.id,
      entityName: ventureData.name,
      link: newVenture ? `/ventures/${newVenture.slug}` : undefined,
      actorName: ctx.user.name || "System",
      organizationId: organizationId || undefined,
    });

    await logAudit({
      organizationId: organizationId || null,
      userId: ctx.user.id,
      userName: ctx.user.name,
      action: "create",
      entityType: "venture",
      entityId: String(newVenture?.id),
      entityName: ventureData.name,
      details: JSON.stringify({ sector: ventureData.sector, organizationId }),
    });

    return newVenture;
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
        activitySource: "client_business",
      });

      // Notification for status changes
      if (data.status) {
        await createNotification({
          type: NOTIF_TYPES.VENTURE_STATUS_CHANGE,
          category: data.status === "On hold" || data.status === "Cancelled" ? "warning" : "info",
          title: `Venture Status: ${rows[0].name}`,
          message: `Status changed to "${data.status}"`,
          entityType: "venture",
          entityId: id,
          entityName: rows[0].name,
          link: `/ventures/${rows[0].slug}`,
          actorName: ctx.user.name || "System",
        });
      }
    }
    await logAudit({
      userId: ctx.user.id,
      userName: ctx.user.name,
      action: "update",
      entityType: "venture",
      entityId: String(id),
      entityName: rows[0]?.name,
      details: JSON.stringify(data),
    });

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
        activitySource: "atlas_ops",
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
        activitySource: "client_business",
      });

      await createNotification({
        type: NOTIF_TYPES.DOCUMENT_UPLOADED,
        category: "info",
        title: `File Uploaded: ${input.filename}`,
        message: `New file uploaded to ${v.name}`,
        entityType: "venture",
        entityId: input.ventureId,
        entityName: v.name,
        link: `/ventures/${v.slug}`,
        actorName: ctx.user.name || "System",
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
  metrics: protectedProcedure
    .input(z.object({ organizationId: z.number().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return { total: 0, active: 0, bySector: {} as Record<string, { total: number; active: number }> };

      const ventureIds = await resolveVentureScope(ctx.user, input?.organizationId);

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

  // ── getWithMilestones — venture + blueprint tracking + completion % ──
  getWithMilestones: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;
      const [venture] = await db.select().from(ventures).where(eq(ventures.id, input.id)).limit(1);
      if (!venture) return null;

      const tracking = await db.select().from(ventureProcessTracking)
        .where(eq(ventureProcessTracking.ventureId, input.id))
        .orderBy(ventureProcessTracking.stepOrder);

      const totalSteps = tracking.length;
      const completedSteps = tracking.filter(t => t.status === "complete").length;
      const blockingSteps = tracking.filter(t => t.isBlocking);
      const blockingComplete = blockingSteps.filter(t => t.status === "complete").length;
      const completionPct = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;
      const blockingPct = blockingSteps.length > 0 ? Math.round((blockingComplete / blockingSteps.length) * 100) : 100;

      return {
        ...venture,
        milestones: tracking,
        completionPct,
        blockingPct,
        totalSteps,
        completedSteps,
        blockingTotal: blockingSteps.length,
        blockingComplete,
        readyToAdvance: blockingSteps.length > 0 && blockingComplete === blockingSteps.length,
      };
    }),

  // ── updateMilestone — update a tracking step, check if all blocking complete ──
  updateMilestone: protectedProcedure
    .input(z.object({
      ventureId: z.number(),
      stepId: z.number(),
      status: z.enum(["pending", "in_progress", "complete", "skipped"]),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) return { success: false };

      const now = new Date();
      const updateData: Record<string, any> = { status: input.status, updatedAt: now };
      if (input.notes) updateData.evidence = input.notes;
      if (input.status === "complete") {
        updateData.completedAt = now;
        updateData.completedBy = ctx.user?.name || "system";
      }
      if (input.status === "in_progress" || input.status === "complete") {
        updateData.startedAt = now;
      }

      await db.update(ventureProcessTracking)
        .set(updateData)
        .where(and(
          eq(ventureProcessTracking.ventureId, input.ventureId),
          eq(ventureProcessTracking.stepId, input.stepId)
        ));

      // Check if all blocking steps are now complete
      const allTracking = await db.select().from(ventureProcessTracking)
        .where(eq(ventureProcessTracking.ventureId, input.ventureId));
      const blocking = allTracking.filter(t => t.isBlocking);
      const blockingComplete = blocking.filter(t => t.status === "complete").length;
      const readyToAdvance = blocking.length > 0 && blockingComplete === blocking.length;

      // Auto-recalculate health score for this venture
      const totalSteps = allTracking.length;
      const completedSteps = allTracking.filter(t => t.status === "complete").length;
      const [venture] = await db.select().from(ventures).where(eq(ventures.id, input.ventureId)).limit(1);
      if (venture) {
        const milestoneScore = totalSteps > 0 ? Math.round((blocking.length > 0 ? blockingComplete / blocking.length : completedSteps / totalSteps) * 25) : 12;
        // Quick health update with just milestone component
        const overdueTasks = await db.select().from(tasks)
          .where(and(eq(tasks.ventureId, input.ventureId), eq(tasks.status, "overdue")));
        const taskScore = overdueTasks.length === 0 ? 25 : overdueTasks.length === 1 ? 15 : 0;
        const dataScore = [venture.description, venture.currentStatus, venture.nextStep, venture.nextMilestone, venture.location !== "TBD" ? venture.location : null]
          .filter(Boolean).length * 5;
        const newHealth = Math.min(100, Math.max(0, dataScore + taskScore + milestoneScore + 15)); // 15 = neutral momentum
        await db.update(ventures).set({ healthScore: newHealth }).where(eq(ventures.id, input.ventureId));
      }

      // Get next stage name for UI
      let nextStageName: string | null = null;
      if (readyToAdvance && venture) {
        const STAGE_PIPELINE = ["Discovery", "Due Diligence", "Structuring", "Capital Raise", "Deployment", "Operations", "Monitoring", "Exit"];
        const idx = STAGE_PIPELINE.indexOf(venture.stage);
        if (idx >= 0 && idx < STAGE_PIPELINE.length - 1) nextStageName = STAGE_PIPELINE[idx + 1];
      }

      return { success: true, readyToAdvance, nextStageName, blockingComplete, blockingTotal: blocking.length };
    }),

  // ── populateIntelligence — LLM-fill null fields on all ventures ──
  populateIntelligence: protectedProcedure
    .input(z.object({ organizationId: z.number().optional() }))
    .mutation(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return { updated: 0 };
      if (!isAtlasTeam(ctx.user)) return { updated: 0 };

      // Get all ventures with any null intelligence fields
      const allVentures = await db.select().from(ventures);
      const needsUpdate = allVentures.filter(v =>
        !v.description || !v.currentStatus || !v.nextStep || !v.nextMilestone
      );

      let updated = 0;
      for (const v of needsUpdate) {
        try {
          const resp = await invokeLLM({
            messages: [
              {
                role: "system",
                content: "You are a venture operations analyst for a family office. Return JSON only, no markdown."
              },
              {
                role: "user",
                content: `Venture: ${v.name} · Sector: ${v.sector} · Stage: ${v.stage} · Location: ${v.location || "TBD"}\n\nBased on this venture's sector and stage, generate realistic operational intelligence.\nReturn JSON only:\n{\n  "description": "one sentence what this venture is",\n  "currentStatus": "what is likely happening in this stage for this type of venture",\n  "nextStep": "most important next action",\n  "nextMilestone": "what milestone they're working toward"\n}`
              }
            ],
            response_format: {
              type: "json_schema",
              json_schema: {
                name: "venture_intelligence",
                strict: true,
                schema: {
                  type: "object",
                  properties: {
                    description: { type: "string" },
                    currentStatus: { type: "string" },
                    nextStep: { type: "string" },
                    nextMilestone: { type: "string" }
                  },
                  required: ["description", "currentStatus", "nextStep", "nextMilestone"],
                  additionalProperties: false
                }
              }
            }
          });

          const content = resp?.choices?.[0]?.message?.content;
          if (!content) continue;
          const parsed = JSON.parse(content as string);

          await db.update(ventures).set({
            description: v.description || parsed.description,
            currentStatus: v.currentStatus || parsed.currentStatus,
            nextStep: v.nextStep || parsed.nextStep,
            nextMilestone: v.nextMilestone || parsed.nextMilestone,
          }).where(eq(ventures.id, v.id));
          updated++;
        } catch (e) {
          console.error(`[populateIntelligence] Failed for venture ${v.id}:`, e);
        }
      }

      return { updated, total: needsUpdate.length };
    }),

  // ── recalculateHealth — exact formula from spec ──
  recalculateHealth: protectedProcedure
    .input(z.object({ organizationId: z.number().optional() }))
    .mutation(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return { updated: 0 };
      if (!isAtlasTeam(ctx.user)) return { updated: 0 };

      const allVentures = await db.select().from(ventures);
      const allTasks = await db.select().from(tasks);
      const allTracking = await db.select().from(ventureProcessTracking);
      const allActivity = await db.select().from(activityLog);

      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      let updated = 0;
      for (const v of allVentures) {
        // dataScore (25pts)
        let dataScore = 0;
        if (v.description) dataScore += 5;
        if (v.currentStatus) dataScore += 5;
        if (v.nextStep) dataScore += 5;
        if (v.nextMilestone) dataScore += 5;
        if (v.location && v.location !== "TBD") dataScore += 5;

        // taskScore (25pts)
        const vTasks = allTasks.filter(t => t.ventureId === v.id);
        const overdueTasks = vTasks.filter(t => t.status === "overdue");
        const taskScore = overdueTasks.length === 0 ? 25 : overdueTasks.length === 1 ? 15 : 0;

        // milestoneScore (25pts)
        const vTracking = allTracking.filter(t => t.ventureId === v.id);
        let milestoneScore = 12; // neutral if no template
        if (vTracking.length > 0) {
          const blocking = vTracking.filter(t => t.isBlocking);
          if (blocking.length > 0) {
            const blockingComplete = blocking.filter(t => t.status === "complete").length;
            milestoneScore = Math.round((blockingComplete / blocking.length) * 25);
          } else {
            const completed = vTracking.filter(t => t.status === "complete").length;
            milestoneScore = Math.round((completed / vTracking.length) * 25);
          }
        }

        // momentumScore (25pts)
        const vActivity = allActivity.filter(a => a.entityType === "venture" && a.entityId === v.id);
        let momentumScore = 5; // default: no activity in 30+ days
        if (v.status === "On hold") {
          momentumScore = 0;
        } else {
          const recentWeek = vActivity.some(a => a.createdAt && a.createdAt >= sevenDaysAgo);
          const recentMonth = vActivity.some(a => a.createdAt && a.createdAt >= thirtyDaysAgo);
          if (recentWeek) momentumScore = 25;
          else if (recentMonth) momentumScore = 15;
        }

        const newHealth = Math.min(100, Math.max(0, dataScore + taskScore + milestoneScore + momentumScore));
        await db.update(ventures).set({ healthScore: newHealth }).where(eq(ventures.id, v.id));
        updated++;
      }

      return { updated, total: allVentures.length };
    }),
});
