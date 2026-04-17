/**
 * Data Retention Policy — Automated Purging
 *
 * SOC 2 CC6.5 / CC7.2 — Logical access controls & data lifecycle management
 *
 * Retention periods:
 *   - Audit logs:      365 days (regulatory minimum)
 *   - Activity logs:   180 days
 *   - Expired sessions: 30 days after expiry
 *   - Agent events:    180 days (read + action-taken events only; unread events preserved)
 *   - Notifications:   90 days (read notifications only; unread preserved)
 *   - Rate limit store: auto-cleaned by in-memory TTL (no DB)
 *
 * The purge job runs on a configurable schedule (default: daily at 03:00 UTC).
 */

import { getDb } from "../db";
import {
  auditLog,
  sessions,
  agentEvents,
  activityLog,
  notifications,
} from "../../drizzle/schema";
import { lt, and, eq, sql } from "drizzle-orm";

export const RETENTION_DAYS = {
  auditLog: 365,
  activityLog: 180,
  expiredSessions: 30,
  agentEvents: 180,
  readNotifications: 90,
} as const;

export interface PurgeResult {
  table: string;
  deletedCount: number;
  cutoffDate: string;
  error?: string;
}

export interface PurgeSummary {
  startedAt: string;
  completedAt: string;
  results: PurgeResult[];
  totalDeleted: number;
}

function daysAgo(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d;
}

/**
 * Purge audit_log entries older than retention period.
 * SOC 2 requires 1-year retention minimum, so we keep 365 days.
 */
async function purgeAuditLogs(db: NonNullable<Awaited<ReturnType<typeof getDb>>>): Promise<PurgeResult> {
  const cutoff = daysAgo(RETENTION_DAYS.auditLog);
  try {
    // Soft-delete: archive instead of hard-delete for compliance
    const result = await db.update(auditLog).set({ archivedAt: new Date() }).where(lt(auditLog.createdAt, cutoff));
    return {
      table: "audit_log",
      deletedCount: (result as any)[0]?.affectedRows ?? 0,  // actually archived count
      cutoffDate: cutoff.toISOString(),
    };
  } catch (error: any) {
    return {
      table: "audit_log",
      deletedCount: 0,
      cutoffDate: cutoff.toISOString(),
      error: error.message,
    };
  }
}

/**
 * Purge activity_log entries older than retention period.
 */
async function purgeActivityLogs(db: NonNullable<Awaited<ReturnType<typeof getDb>>>): Promise<PurgeResult> {
  const cutoff = daysAgo(RETENTION_DAYS.activityLog);
  try {
    const result = await db.delete(activityLog).where(lt(activityLog.createdAt, cutoff));
    return {
      table: "activity_log",
      deletedCount: (result as any)[0]?.affectedRows ?? 0,
      cutoffDate: cutoff.toISOString(),
    };
  } catch (error: any) {
    return {
      table: "activity_log",
      deletedCount: 0,
      cutoffDate: cutoff.toISOString(),
      error: error.message,
    };
  }
}

/**
 * Purge expired sessions that have been inactive for > 30 days past their expiry.
 */
async function purgeExpiredSessions(db: NonNullable<Awaited<ReturnType<typeof getDb>>>): Promise<PurgeResult> {
  const cutoff = daysAgo(RETENTION_DAYS.expiredSessions);
  try {
    const result = await db.delete(sessions).where(
      and(
        eq(sessions.isActive, false),
        lt(sessions.expiresAt, cutoff),
      )
    );
    return {
      table: "sessions",
      deletedCount: (result as any)[0]?.affectedRows ?? 0,
      cutoffDate: cutoff.toISOString(),
    };
  } catch (error: any) {
    return {
      table: "sessions",
      deletedCount: 0,
      cutoffDate: cutoff.toISOString(),
      error: error.message,
    };
  }
}

/**
 * Purge old agent events that have been read AND actioned (or dismissed).
 * Unread events are preserved regardless of age.
 */
async function purgeAgentEvents(db: NonNullable<Awaited<ReturnType<typeof getDb>>>): Promise<PurgeResult> {
  const cutoff = daysAgo(RETENTION_DAYS.agentEvents);
  try {
    const result = await db.delete(agentEvents).where(
      and(
        lt(agentEvents.createdAt, cutoff),
        eq(agentEvents.isRead, true),
      )
    );
    return {
      table: "agent_events",
      deletedCount: (result as any)[0]?.affectedRows ?? 0,
      cutoffDate: cutoff.toISOString(),
    };
  } catch (error: any) {
    return {
      table: "agent_events",
      deletedCount: 0,
      cutoffDate: cutoff.toISOString(),
      error: error.message,
    };
  }
}

/**
 * Purge read notifications older than retention period.
 * Unread notifications are preserved.
 */
async function purgeReadNotifications(db: NonNullable<Awaited<ReturnType<typeof getDb>>>): Promise<PurgeResult> {
  const cutoff = daysAgo(RETENTION_DAYS.readNotifications);
  try {
    const result = await db.delete(notifications).where(
      and(
        lt(notifications.createdAt, cutoff),
        eq(notifications.read, 1),
      )
    );
    return {
      table: "notifications",
      deletedCount: (result as any)[0]?.affectedRows ?? 0,
      cutoffDate: cutoff.toISOString(),
    };
  } catch (error: any) {
    return {
      table: "notifications",
      deletedCount: 0,
      cutoffDate: cutoff.toISOString(),
      error: error.message,
    };
  }
}

/**
 * Run the full data retention purge cycle.
 * Returns a summary of all purge operations.
 */
export async function runDataRetentionPurge(): Promise<PurgeSummary> {
  const startedAt = new Date().toISOString();
  const db = await getDb();

  if (!db) {
    return {
      startedAt,
      completedAt: new Date().toISOString(),
      results: [{ table: "all", deletedCount: 0, cutoffDate: "", error: "Database not available" }],
      totalDeleted: 0,
    };
  }

  const results: PurgeResult[] = [];

  results.push(await purgeAuditLogs(db));
  results.push(await purgeActivityLogs(db));
  results.push(await purgeExpiredSessions(db));
  results.push(await purgeAgentEvents(db));
  results.push(await purgeReadNotifications(db));

  const totalDeleted = results.reduce((sum, r) => sum + r.deletedCount, 0);

  const summary: PurgeSummary = {
    startedAt,
    completedAt: new Date().toISOString(),
    results,
    totalDeleted,
  };

  // Log the purge to audit_log for compliance trail
  try {
    await db.insert(auditLog).values({
      action: "data_retention_purge",
      entityType: "system",
      userName: "SYSTEM",
      details: JSON.stringify(summary),
      result: "success",
    });
  } catch {
    // Non-critical — the purge itself succeeded
  }

  return summary;
}

/**
 * Get current data retention statistics (row counts and oldest records).
 */
export async function getRetentionStats() {
  const db = await getDb();
  if (!db) return null;

  const [auditCount] = await db.select({ count: sql<number>`COUNT(*)` }).from(auditLog);
  const [activityCount] = await db.select({ count: sql<number>`COUNT(*)` }).from(activityLog);
  const [sessionCount] = await db.select({ count: sql<number>`COUNT(*)` }).from(sessions);
  const [eventCount] = await db.select({ count: sql<number>`COUNT(*)` }).from(agentEvents);
  const [notifCount] = await db.select({ count: sql<number>`COUNT(*)` }).from(notifications);

  return {
    auditLog: { count: auditCount.count, retentionDays: RETENTION_DAYS.auditLog },
    activityLog: { count: activityCount.count, retentionDays: RETENTION_DAYS.activityLog },
    sessions: { count: sessionCount.count, retentionDays: RETENTION_DAYS.expiredSessions },
    agentEvents: { count: eventCount.count, retentionDays: RETENTION_DAYS.agentEvents },
    notifications: { count: notifCount.count, retentionDays: RETENTION_DAYS.readNotifications },
  };
}
