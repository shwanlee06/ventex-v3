/**
 * Data Lifecycle Management System
 * 
 * Four integrated systems that keep the platform clean and actionable:
 * 
 * 1. Automated Escalation: Tasks auto-escalate (overdue → stale → archived)
 * 2. AI Health Sweep: Scans for dormant ventures, stale SPVs, generates reports
 * 3. Smart Archiving: Auto-archives completed items after configurable periods
 * 4. Activity-Based Visibility: Scores entities by recency for dashboard prioritization
 * 
 * Runs as part of the cron scheduler (daily at 03:00 UTC).
 */

import { getDb } from "./db";
import {
  tasks,
  ventures,
  spvs,
  activityLog,
  notifications,
  organizations,
} from "../drizzle/schema";
import { eq, and, lt, sql, isNull, ne, inArray } from "drizzle-orm";

// ─── Configuration ──────────────────────────────────────────────────────────

export interface LifecycleConfig {
  // Task escalation thresholds (days)
  taskOverdueDays: number;       // days past due → mark "overdue"
  taskStaleDays: number;         // days past due with no activity → mark "stale"
  taskArchiveDays: number;       // days past due with no activity → auto-archive

  // Venture dormancy
  ventureDormantDays: number;    // days without any activity → flag "dormant"

  // SPV staleness
  spvStaleCheckDays: number;     // days without update → surface "status check needed"

  // Smart archiving
  archiveCompletedAfterDays: number;  // days after completion → auto-archive
  archiveClosedSpvAfterDays: number;  // days after SPV closes → auto-archive

  // Notification preferences
  sendNudgeNotifications: boolean;
  maxNudgesPerDay: number;
}

const DEFAULT_CONFIG: LifecycleConfig = {
  taskOverdueDays: 0,        // immediately when past due date
  taskStaleDays: 14,         // 14 days past due with no activity
  taskArchiveDays: 30,       // 30 days past due → auto-archive
  ventureDormantDays: 60,    // 60 days no activity → dormant
  spvStaleCheckDays: 30,     // 30 days no update → needs attention
  archiveCompletedAfterDays: 90,   // 90 days after completion → archive
  archiveClosedSpvAfterDays: 90,   // 90 days after SPV closes → archive
  sendNudgeNotifications: true,
  maxNudgesPerDay: 10,
};

// ─── System 1: Automated Task Escalation ────────────────────────────────────

export interface EscalationResult {
  tasksMarkedOverdue: number;
  tasksMarkedStale: number;
  tasksAutoArchived: number;
}

/**
 * Scan all tasks and escalate based on due date and activity.
 * - Past due date → status "overdue" (if currently "open" or "in_progress")
 * - Past due + 14 days no activity → status "stale"
 * - Past due + 30 days no activity → status "archived"
 */
export async function runTaskEscalation(
  organizationId: number,
  config: LifecycleConfig = DEFAULT_CONFIG
): Promise<EscalationResult> {
  const db = await getDb();
  if (!db) return { tasksMarkedOverdue: 0, tasksMarkedStale: 0, tasksAutoArchived: 0 };

  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  let tasksMarkedOverdue = 0;
  let tasksMarkedStale = 0;
  let tasksAutoArchived = 0;

  // Fetch all non-complete, non-archived tasks for this org
  const orgTasks = await db
    .select()
    .from(tasks)
    .where(
      and(
        eq(tasks.organizationId, organizationId),
        ne(tasks.status, "complete"),
        ne(tasks.status, "archived")
      )
    );

  for (const task of orgTasks) {
    if (!task.dueDate) continue;

    const dueDate = new Date(task.dueDate);
    if (isNaN(dueDate.getTime())) continue;

    const daysPastDue = Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
    const daysSinceUpdate = Math.floor((now.getTime() - task.updatedAt.getTime()) / (1000 * 60 * 60 * 24));

    if (daysPastDue <= 0) continue; // Not overdue yet

    // Auto-archive: 30+ days past due with no activity
    if (daysPastDue >= config.taskArchiveDays && daysSinceUpdate >= config.taskArchiveDays) {
      if (task.status !== "archived") {
        await db.update(tasks).set({ status: "archived" }).where(eq(tasks.id, task.id));
        tasksAutoArchived++;
        await logLifecycleAction(db, organizationId, "task", task.id, task.title,
          `Auto-archived: ${daysPastDue} days overdue with no activity`);
      }
    }
    // Stale: 14+ days past due with no activity
    else if (daysPastDue >= config.taskStaleDays && daysSinceUpdate >= config.taskStaleDays) {
      if (task.status !== "stale") {
        await db.update(tasks).set({ status: "stale" }).where(eq(tasks.id, task.id));
        tasksMarkedStale++;
        await logLifecycleAction(db, organizationId, "task", task.id, task.title,
          `Marked stale: ${daysPastDue} days overdue, ${daysSinceUpdate} days since last update`);
      }
    }
    // Overdue: past due date
    else if (task.status === "open" || task.status === "in_progress") {
      await db.update(tasks).set({ status: "overdue" }).where(eq(tasks.id, task.id));
      tasksMarkedOverdue++;
    }
  }

  return { tasksMarkedOverdue, tasksMarkedStale, tasksAutoArchived };
}

// ─── System 2: AI Health Sweep ──────────────────────────────────────────────

export interface HealthSweepResult {
  dormantVentures: number;
  staleSpvs: number;
  nudgesSent: number;
  reportGenerated: boolean;
}

/**
 * Scan ventures and SPVs for staleness, generate nudge notifications.
 */
export async function runHealthSweep(
  organizationId: number,
  config: LifecycleConfig = DEFAULT_CONFIG
): Promise<HealthSweepResult> {
  const db = await getDb();
  if (!db) return { dormantVentures: 0, staleSpvs: 0, nudgesSent: 0, reportGenerated: false };

  const now = new Date();
  let dormantVentures = 0;
  let staleSpvs = 0;
  let nudgesSent = 0;

  // ── Venture Dormancy Check ──
  const activeVentures = await db
    .select()
    .from(ventures)
    .where(
      and(
        ne(ventures.status, "Completed"),
        ne(ventures.status, "Archived"),
        ne(ventures.status, "Dormant")
      )
    );

  for (const venture of activeVentures) {
    const daysSinceUpdate = Math.floor(
      (now.getTime() - venture.updatedAt.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysSinceUpdate >= config.ventureDormantDays) {
      // Mark as dormant
      await db.update(ventures).set({ status: "Dormant" }).where(eq(ventures.id, venture.id));
      dormantVentures++;

      // Send nudge notification
      if (config.sendNudgeNotifications && nudgesSent < config.maxNudgesPerDay) {
        await db.insert(notifications).values({
          organizationId,
          type: "lifecycle_dormant",
          category: "warning",
          title: `Venture "${venture.name}" marked dormant`,
          message: `No activity for ${daysSinceUpdate} days. Review and update status or archive.`,
          entityType: "venture",
          entityId: venture.id,
          entityName: venture.name,
          link: `/ventures/${venture.slug}`,
          actorName: "VENTEX Lifecycle Agent",
        });
        nudgesSent++;
      }

      await logLifecycleAction(db, organizationId, "venture", venture.id, venture.name,
        `Marked dormant: ${daysSinceUpdate} days without activity`);
    }
  }

  // ── SPV Staleness Check ──
  const activeSpvs = await db
    .select()
    .from(spvs)
    .where(
      and(
        eq(spvs.organizationId, organizationId),
        ne(spvs.stage, "Closed"),
        ne(spvs.stage, "Archived")
      )
    );

  for (const spv of activeSpvs) {
    const daysSinceUpdate = Math.floor(
      (now.getTime() - spv.updatedAt.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysSinceUpdate >= config.spvStaleCheckDays) {
      staleSpvs++;

      // Send nudge notification
      if (config.sendNudgeNotifications && nudgesSent < config.maxNudgesPerDay) {
        await db.insert(notifications).values({
          organizationId,
          type: "lifecycle_stale_spv",
          category: "warning",
          title: `SPV "${spv.name}" needs status check`,
          message: `No updates for ${daysSinceUpdate} days. Please review current deal status.`,
          entityType: "spv",
          entityId: spv.id,
          entityName: spv.name,
          link: `/spvs/${spv.slug}`,
          actorName: "VENTEX Lifecycle Agent",
        });
        nudgesSent++;
      }

      await logLifecycleAction(db, organizationId, "spv", spv.id, spv.name,
        `Status check needed: ${daysSinceUpdate} days without update`);
    }
  }

  return { dormantVentures, staleSpvs, nudgesSent, reportGenerated: true };
}

// ─── System 3: Smart Archiving ──────────────────────────────────────────────

export interface ArchiveResult {
  venturesArchived: number;
  spvsArchived: number;
  tasksArchived: number;
}

/**
 * Auto-archive completed ventures, closed SPVs, and completed tasks
 * after configurable time periods.
 */
export async function runSmartArchiving(
  organizationId: number,
  config: LifecycleConfig = DEFAULT_CONFIG
): Promise<ArchiveResult> {
  const db = await getDb();
  if (!db) return { venturesArchived: 0, spvsArchived: 0, tasksArchived: 0 };

  const now = new Date();
  let venturesArchived = 0;
  let spvsArchived = 0;
  let tasksArchived = 0;

  // ── Archive completed ventures ──
  const completedVentures = await db
    .select()
    .from(ventures)
    .where(eq(ventures.status, "Completed"));

  for (const venture of completedVentures) {
    const daysSinceCompletion = Math.floor(
      (now.getTime() - venture.updatedAt.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysSinceCompletion >= config.archiveCompletedAfterDays) {
      await db.update(ventures).set({ status: "Archived" }).where(eq(ventures.id, venture.id));
      venturesArchived++;
      await logLifecycleAction(db, organizationId, "venture", venture.id, venture.name,
        `Auto-archived: completed ${daysSinceCompletion} days ago`);
    }
  }

  // ── Archive closed SPVs ──
  const closedSpvs = await db
    .select()
    .from(spvs)
    .where(
      and(
        eq(spvs.organizationId, organizationId),
        eq(spvs.stage, "Closed")
      )
    );

  for (const spv of closedSpvs) {
    const daysSinceClosed = Math.floor(
      (now.getTime() - spv.updatedAt.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysSinceClosed >= config.archiveClosedSpvAfterDays) {
      await db.update(spvs).set({ stage: "Archived" }).where(eq(spvs.id, spv.id));
      spvsArchived++;
      await logLifecycleAction(db, organizationId, "spv", spv.id, spv.name,
        `Auto-archived: closed ${daysSinceClosed} days ago`);
    }
  }

  // ── Archive completed tasks (already handled in escalation, but catch stragglers) ──
  const completedTasks = await db
    .select()
    .from(tasks)
    .where(
      and(
        eq(tasks.organizationId, organizationId),
        eq(tasks.status, "complete")
      )
    );

  for (const task of completedTasks) {
    const daysSinceCompletion = Math.floor(
      (now.getTime() - task.updatedAt.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysSinceCompletion >= config.archiveCompletedAfterDays) {
      await db.update(tasks).set({ status: "archived" }).where(eq(tasks.id, task.id));
      tasksArchived++;
    }
  }

  return { venturesArchived, spvsArchived, tasksArchived };
}

// ─── System 4: Activity-Based Visibility Scoring ────────────────────────────

export interface ActivityScore {
  entityType: "venture" | "spv" | "task";
  entityId: number;
  entityName: string;
  lastActivityAt: Date;
  daysSinceActivity: number;
  activityScore: number;  // 0-100, higher = more recent activity
  visibilityTier: "active" | "fading" | "stale" | "dormant";
}

/**
 * Calculate activity scores for all entities in an organization.
 * Used by the dashboard to prioritize what shows first.
 * 
 * Scoring:
 * - Activity in last 7 days: score 80-100 (tier: "active")
 * - Activity in last 14 days: score 50-79 (tier: "fading")
 * - Activity in last 30 days: score 20-49 (tier: "stale")
 * - No activity in 30+ days: score 0-19 (tier: "dormant")
 */
export async function calculateActivityScores(
  organizationId: number
): Promise<ActivityScore[]> {
  const db = await getDb();
  if (!db) return [];

  const now = new Date();
  const scores: ActivityScore[] = [];

  // ── Score ventures ──
  const orgVentures = await db
    .select()
    .from(ventures)
    .where(
      and(
        ne(ventures.status, "Archived")
      )
    );

  for (const venture of orgVentures) {
    const daysSince = Math.floor(
      (now.getTime() - venture.updatedAt.getTime()) / (1000 * 60 * 60 * 24)
    );
    scores.push({
      entityType: "venture",
      entityId: venture.id,
      entityName: venture.name,
      lastActivityAt: venture.updatedAt,
      daysSinceActivity: daysSince,
      activityScore: computeScore(daysSince),
      visibilityTier: computeTier(daysSince),
    });
  }

  // ── Score SPVs ──
  const orgSpvs = await db
    .select()
    .from(spvs)
    .where(
      and(
        eq(spvs.organizationId, organizationId),
        ne(spvs.stage, "Archived")
      )
    );

  for (const spv of orgSpvs) {
    const daysSince = Math.floor(
      (now.getTime() - spv.updatedAt.getTime()) / (1000 * 60 * 60 * 24)
    );
    scores.push({
      entityType: "spv",
      entityId: spv.id,
      entityName: spv.name,
      lastActivityAt: spv.updatedAt,
      daysSinceActivity: daysSince,
      activityScore: computeScore(daysSince),
      visibilityTier: computeTier(daysSince),
    });
  }

  // ── Score tasks (only open/in-progress) ──
  const orgTasks = await db
    .select()
    .from(tasks)
    .where(
      and(
        eq(tasks.organizationId, organizationId),
        ne(tasks.status, "complete"),
        ne(tasks.status, "archived")
      )
    );

  for (const task of orgTasks) {
    const daysSince = Math.floor(
      (now.getTime() - task.updatedAt.getTime()) / (1000 * 60 * 60 * 24)
    );
    scores.push({
      entityType: "task",
      entityId: task.id,
      entityName: task.title,
      lastActivityAt: task.updatedAt,
      daysSinceActivity: daysSince,
      activityScore: computeScore(daysSince),
      visibilityTier: computeTier(daysSince),
    });
  }

  // Sort by score descending (most active first)
  scores.sort((a, b) => b.activityScore - a.activityScore);

  return scores;
}

/**
 * Get a summary of stale data for the dashboard "Needs Attention" section.
 */
export async function getStaleDataSummary(organizationId: number): Promise<{
  dormantVentures: number;
  staleTasks: number;
  staleSpvs: number;
  totalNeedsAttention: number;
  items: Array<{ type: string; name: string; daysSince: number; link: string }>;
}> {
  const scores = await calculateActivityScores(organizationId);

  const staleItems = scores.filter(s => s.visibilityTier === "stale" || s.visibilityTier === "dormant");
  const dormantVentures = staleItems.filter(s => s.entityType === "venture" && s.visibilityTier === "dormant").length;
  const staleTasks = staleItems.filter(s => s.entityType === "task").length;
  const staleSpvs = staleItems.filter(s => s.entityType === "spv").length;

  const items = staleItems.slice(0, 20).map(s => ({
    type: s.entityType,
    name: s.entityName,
    daysSince: s.daysSinceActivity,
    link: s.entityType === "venture" ? `/ventures/${s.entityId}` :
          s.entityType === "spv" ? `/spvs/${s.entityId}` :
          `/tasks`,
  }));

  return {
    dormantVentures,
    staleTasks,
    staleSpvs,
    totalNeedsAttention: staleItems.length,
    items,
  };
}

// ─── Master Lifecycle Runner ────────────────────────────────────────────────

export interface LifecycleRunResult {
  organizationId: number;
  organizationName: string;
  escalation: EscalationResult;
  healthSweep: HealthSweepResult;
  archiving: ArchiveResult;
  totalActions: number;
  runAt: string;
}

/**
 * Run the full data lifecycle sweep for a single organization.
 * Called by the cron scheduler daily.
 */
export async function runLifecycleSweep(
  organizationId: number,
  orgName: string,
  config: LifecycleConfig = DEFAULT_CONFIG
): Promise<LifecycleRunResult> {
  const runAt = new Date().toISOString();

  const escalation = await runTaskEscalation(organizationId, config);
  const healthSweep = await runHealthSweep(organizationId, config);
  const archiving = await runSmartArchiving(organizationId, config);

  const totalActions =
    escalation.tasksMarkedOverdue + escalation.tasksMarkedStale + escalation.tasksAutoArchived +
    healthSweep.dormantVentures + healthSweep.staleSpvs +
    archiving.venturesArchived + archiving.spvsArchived + archiving.tasksArchived;

  console.log(`[DataLifecycle] Org "${orgName}": ${totalActions} actions (${escalation.tasksMarkedOverdue} overdue, ${escalation.tasksMarkedStale} stale, ${escalation.tasksAutoArchived}+${archiving.tasksArchived} archived tasks, ${healthSweep.dormantVentures} dormant ventures, ${healthSweep.staleSpvs} stale SPVs, ${archiving.venturesArchived} archived ventures, ${archiving.spvsArchived} archived SPVs)`);

  return {
    organizationId,
    organizationName: orgName,
    escalation,
    healthSweep,
    archiving,
    totalActions,
    runAt,
  };
}

/**
 * Run lifecycle sweep for ALL active organizations.
 * Called from the cron scheduler.
 */
export async function runLifecycleSweepAll(): Promise<LifecycleRunResult[]> {
  const db = await getDb();
  if (!db) {
    console.error("[DataLifecycle] Database unavailable, skipping sweep");
    return [];
  }

  const activeOrgs = await db
    .select()
    .from(organizations)
    .where(eq(organizations.status, "active"));

  if (activeOrgs.length === 0) {
    console.log("[DataLifecycle] No active organizations, skipping");
    return [];
  }

  console.log(`[DataLifecycle] Starting sweep for ${activeOrgs.length} organizations...`);

  const results: LifecycleRunResult[] = [];

  for (const org of activeOrgs) {
    try {
      const result = await runLifecycleSweep(org.id, org.name);
      results.push(result);
    } catch (err: any) {
      console.error(`[DataLifecycle] Failed for org "${org.name}":`, err.message);
    }
  }

  const totalActions = results.reduce((sum, r) => sum + r.totalActions, 0);
  console.log(`[DataLifecycle] Sweep complete: ${results.length} orgs processed, ${totalActions} total actions`);

  return results;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function computeScore(daysSinceActivity: number): number {
  if (daysSinceActivity <= 1) return 100;
  if (daysSinceActivity <= 3) return 90;
  if (daysSinceActivity <= 7) return 80;
  if (daysSinceActivity <= 14) return 60;
  if (daysSinceActivity <= 30) return 35;
  if (daysSinceActivity <= 60) return 15;
  return Math.max(0, 10 - Math.floor(daysSinceActivity / 30));
}

function computeTier(daysSinceActivity: number): "active" | "fading" | "stale" | "dormant" {
  if (daysSinceActivity <= 7) return "active";
  if (daysSinceActivity <= 14) return "fading";
  if (daysSinceActivity <= 30) return "stale";
  return "dormant";
}

async function logLifecycleAction(
  db: any,
  organizationId: number,
  entityType: string,
  entityId: number,
  entityName: string,
  detail: string
): Promise<void> {
  try {
    await db.insert(activityLog).values({
      entityType,
      entityId,
      entityName,
      action: "lifecycle_automation",
      detail,
      userName: "VENTEX Lifecycle Agent",
      activitySource: "system",
      organizationId,
    });
  } catch (err) {
    // Non-critical, don't fail the sweep
    console.warn("[DataLifecycle] Failed to log action:", err);
  }
}
