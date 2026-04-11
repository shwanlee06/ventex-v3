import { z } from "zod";
import { publicProcedure, protectedProcedure, adminProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { tasks, activityLog, ventures, orgVentureAccess, organizations, ventureTeam, teamMembers } from "../../drizzle/schema";
import { eq, desc, and, sql, inArray, isNull, ne } from "drizzle-orm";
import { isVentexTeam, getOrgVentureIds, resolveVentureScope, logAudit } from "../security/rbac";
import { createNotification, createBulkNotifications, NOTIF_TYPES } from "../notificationHelper";
import { onTaskCompleted, onTaskOverdue } from "../intelligence/realtimeTriggers";

/**
 * Calculate days overdue for a task.
 * Returns 0 if not overdue, positive number = days past due.
 */
export function calculateDaysOverdue(dueDate: string | null, now: Date = new Date()): number {
  if (!dueDate) return 0;
  const due = new Date(dueDate);
  const diffMs = now.getTime() - due.getTime();
  if (diffMs <= 0) return 0;
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Get overdue severity based on days overdue.
 */
export function getOverdueSeverity(daysOverdue: number): "critical" | "warning" | "info" {
  if (daysOverdue >= 14) return "critical";
  if (daysOverdue >= 7) return "warning";
  return "info";
}

export const tasksRouter = router({
  // List tasks — scoped by org for clients, optionally scoped for VENTEX admin
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

    if (!isVentexTeam(ctx.user) && rows[0].ventureId) {
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
    if (!isVentexTeam(ctx.user) && input.ventureId) {
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
    // Resolve org for audit trail
    let taskOrgId: number | null = null;
    if (input.ventureId) {
      const [ova] = await db.select({ organizationId: orgVentureAccess.organizationId })
        .from(orgVentureAccess).where(eq(orgVentureAccess.ventureId, input.ventureId)).limit(1);
      taskOrgId = ova?.organizationId ?? null;
    }
    await db.insert(activityLog).values({
      entityType: "task", entityName: input.title, action: "Task Created",
      detail: `New task "${input.title}" created`, userName: ctx.user.name || "System",
      activitySource: "client_business", organizationId: taskOrgId,
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
    // Resolve org for audit trail
    let updOrgId: number | null = null;
    if (rows[0]?.ventureId) {
      const [ova] = await db.select({ organizationId: orgVentureAccess.organizationId })
        .from(orgVentureAccess).where(eq(orgVentureAccess.ventureId, rows[0].ventureId)).limit(1);
      updOrgId = ova?.organizationId ?? null;
    }
    if (rows[0] && input.status) {
      await db.insert(activityLog).values({
        entityType: "task", entityId: id, entityName: rows[0].title,
        action: input.status === "complete" ? "Task Completed" : "Task Updated",
        detail: `Task "${rows[0].title}" ${input.status === "complete" ? "marked complete" : "updated"}`,
        userName: ctx.user.name || "System",
        activitySource: "client_business", organizationId: updOrgId,
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
        // Fire real-time trigger for velocity flywheel
        if (rows[0].ventureId) {
          const orgAccess = await db.select({ organizationId: orgVentureAccess.organizationId })
            .from(orgVentureAccess)
            .where(eq(orgVentureAccess.ventureId, rows[0].ventureId))
            .limit(1);
          const orgId = orgAccess[0]?.organizationId || 0;
          onTaskCompleted(orgId, rows[0].ventureId, id, rows[0].title).catch(() => {});
        }
      }
    }
    return rows[0] || null;
  }),

  delete: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ input, ctx }) => {
    if (!isVentexTeam(ctx.user)) {
      throw new Error("Only VENTEX team can delete tasks");
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

  /**
   * List all overdue tasks with enriched data (venture name, client name, days overdue).
   * Admin only — returns all overdue tasks across all clients.
   */
  listOverdue: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];

    const now = new Date();
    const allTasks = await db.select().from(tasks);
    const allVentures = await db.select().from(ventures);
    const allAccess = await db.select().from(orgVentureAccess);
    const allOrgs = await db.select().from(organizations);

    // Build lookup maps
    const ventureMap = new Map(allVentures.map(v => [v.id, v]));
    const orgMap = new Map(allOrgs.map(o => [o.id, o]));
    const ventureToOrg = new Map<number, number>();
    for (const a of allAccess) {
      ventureToOrg.set(a.ventureId, a.organizationId);
    }

    // Filter overdue tasks
    const overdueTasks = allTasks
      .filter(t => t.status !== "complete" && t.dueDate && new Date(t.dueDate) < now)
      .map(t => {
        const daysOverdue = calculateDaysOverdue(t.dueDate, now);
        const severity = getOverdueSeverity(daysOverdue);
        const venture = t.ventureId ? ventureMap.get(t.ventureId) : null;
        const orgId = t.ventureId ? ventureToOrg.get(t.ventureId) : null;
        const org = orgId ? orgMap.get(orgId) : null;

        return {
          ...t,
          daysOverdue,
          severity,
          ventureName: venture?.name || null,
          ventureSlug: venture?.slug || null,
          clientName: org?.name || null,
          clientSlug: org?.slug || null,
        };
      })
      .sort((a, b) => b.daysOverdue - a.daysOverdue); // Most overdue first

    return overdueTasks;
  }),

  /**
   * Get overdue task summary grouped by client organization.
   * Admin only — for the VENTEX dashboard overview.
   */
  overdueByClient: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];

    const now = new Date();
    const allTasks = await db.select().from(tasks);
    const allVentures = await db.select().from(ventures);
    const allAccess = await db.select().from(orgVentureAccess);
    const allOrgs = await db.select().from(organizations)
      .where(and(eq(organizations.type, "client"), ne(organizations.status, "archived")));

    // Build venture maps
    const ventureToOrg = new Map<number, number>();
    for (const a of allAccess) {
      ventureToOrg.set(a.ventureId, a.organizationId);
    }
    const ventureMap = new Map(allVentures.map(v => [v.id, v]));

    // Group overdue tasks by org
    const orgOverdue = new Map<number, { count: number; maxDays: number; criticalCount: number; tasks: { id: number; title: string; daysOverdue: number; priority: string | null; severity: string; ventureName: string; sector: string }[] }>();

    for (const t of allTasks) {
      if (t.status === "complete" || !t.dueDate) continue;
      const daysOverdue = calculateDaysOverdue(t.dueDate, now);
      if (daysOverdue <= 0) continue;

      const orgId = t.ventureId ? ventureToOrg.get(t.ventureId) : null;
      if (!orgId) continue;

      const venture = t.ventureId ? ventureMap.get(t.ventureId) : null;
      const severity = getOverdueSeverity(daysOverdue);
      const existing = orgOverdue.get(orgId) || { count: 0, maxDays: 0, criticalCount: 0, tasks: [] };
      existing.count++;
      existing.maxDays = Math.max(existing.maxDays, daysOverdue);
      if (severity === "critical") existing.criticalCount++;
      existing.tasks.push({
        id: t.id,
        title: t.title,
        daysOverdue,
        priority: t.priority,
        severity,
        ventureName: venture?.name || "—",
        sector: venture?.sector || "—",
      });
      orgOverdue.set(orgId, existing);
    }

    return allOrgs.map(org => {
      const data = orgOverdue.get(org.id);
      return {
        orgId: org.id,
        orgName: org.name,
        orgSlug: org.slug,
        overdueCount: data?.count || 0,
        maxDaysOverdue: data?.maxDays || 0,
        criticalCount: data?.criticalCount || 0,
        overdueTasks: data?.tasks?.sort((a, b) => b.daysOverdue - a.daysOverdue).slice(0, 5) || [],
      };
    }).filter(o => o.overdueCount > 0).sort((a, b) => b.maxDaysOverdue - a.maxDaysOverdue);
  }),

  /**
   * Scan for overdue tasks and create notifications for newly overdue ones.
   * Admin only — should be called periodically (e.g., daily) or on-demand.
   * Returns count of new notifications created.
   */
  scanAndNotify: adminProcedure.mutation(async () => {
    const db = await getDb();
    if (!db) return { notified: 0 };

    const now = new Date();
    const allTasks = await db.select().from(tasks);
    const allVentures = await db.select().from(ventures);
    const ventureMap = new Map(allVentures.map(v => [v.id, v]));

    const overdueTasks = allTasks.filter(t =>
      t.status !== "complete" && t.dueDate && new Date(t.dueDate) < now
    );

    if (overdueTasks.length === 0) return { notified: 0 };

    // Create notifications for overdue tasks
    const notifs = overdueTasks.map(t => {
      const daysOverdue = calculateDaysOverdue(t.dueDate, now);
      const severity = getOverdueSeverity(daysOverdue);
      const venture = t.ventureId ? ventureMap.get(t.ventureId) : null;

      return {
        type: NOTIF_TYPES.TASK_OVERDUE,
        category: severity as "info" | "warning" | "critical",
        title: `Overdue: ${t.title}`,
        message: `${daysOverdue} day${daysOverdue !== 1 ? "s" : ""} past due${venture ? ` (${venture.name})` : ""}`,
        entityType: "task" as const,
        entityId: t.id,
        entityName: t.title,
        actorName: "System",
      };
    });

    await createBulkNotifications(notifs);

    return { notified: notifs.length, overdueTasks: overdueTasks.length };
  }),

  /**
   * Get workload summary per team member — tasks assigned, overdue, completion rate.
   * Admin only — for VENTEX Team capacity view.
   */
  workloadSummary: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];

    const now = new Date();
    const allTasks = await db.select().from(tasks);
    const allMembers = await db.select().from(teamMembers);

    // Build a map of member name -> workload stats
    const workload = new Map<string, {
      assigned: number;
      completed: number;
      overdue: number;
      highPriority: number;
    }>();

    for (const t of allTasks) {
      const assignees = t.assigneeNames || [];
      for (const name of assignees) {
        const existing = workload.get(name) || { assigned: 0, completed: 0, overdue: 0, highPriority: 0 };
        existing.assigned++;
        if (t.status === "complete") {
          existing.completed++;
        } else {
          if (t.dueDate && new Date(t.dueDate) < now) existing.overdue++;
          if (t.priority === "High") existing.highPriority++;
        }
        workload.set(name, existing);
      }
    }

    // Merge with team member data
    return allMembers.map(m => {
      const stats = workload.get(m.name) || { assigned: 0, completed: 0, overdue: 0, highPriority: 0 };
      const completionRate = stats.assigned > 0 ? Math.round((stats.completed / stats.assigned) * 100) : 0;

      // Capacity indicator: green (<5 open), amber (5-10), red (>10 or any overdue)
      const openTasks = stats.assigned - stats.completed;
      let capacityStatus: "available" | "busy" | "overloaded" = "available";
      if (stats.overdue > 0 || openTasks > 10) capacityStatus = "overloaded";
      else if (openTasks >= 5) capacityStatus = "busy";

      return {
        memberId: m.id,
        memberName: m.name,
        memberType: m.type,
        memberFunction: m.memberFunction,
        organizationId: m.organizationId,
        assigned: stats.assigned,
        completed: stats.completed,
        overdue: stats.overdue,
        highPriority: stats.highPriority,
        completionRate,
        capacityStatus,
      };
    }).filter(m => m.assigned > 0 || m.memberType === "Internal"); // Show all internal + anyone with tasks
  }),

  /**
   * Sector-level metrics: overdue ventures per sector.
   * Used by the Velocity Intelligence Card for the sector warning line.
   */
  sectorMetrics: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];

    const now = new Date();
    const allVentures = await db.select().from(ventures);
    const allTasks = await db.select().from(tasks);

    // Build venture -> has overdue tasks map
    const ventureOverdue = new Map<number, boolean>();
    for (const t of allTasks) {
      if (t.status === "complete" || !t.dueDate || !t.ventureId) continue;
      const daysOverdue = calculateDaysOverdue(t.dueDate, now);
      if (daysOverdue > 0) {
        ventureOverdue.set(t.ventureId, true);
      }
    }

    // Group ventures by sector
    const sectorMap = new Map<string, { total: number; overdue: number; ventureNames: string[] }>();
    for (const v of allVentures) {
      const sector = v.sector || "Other";
      const existing = sectorMap.get(sector) || { total: 0, overdue: 0, ventureNames: [] };
      existing.total++;
      if (ventureOverdue.has(v.id)) {
        existing.overdue++;
      }
      existing.ventureNames.push(v.name);
      sectorMap.set(sector, existing);
    }

    return Array.from(sectorMap).map(([sector, data]) => ({
      sector,
      totalVentures: data.total,
      overdueVentures: data.overdue,
      overdueRate: data.total > 0 ? Math.round((data.overdue / data.total) * 100) : 0,
    })).sort((a, b) => b.overdueVentures - a.overdueVentures);
  }),
});
