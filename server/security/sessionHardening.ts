/**
 * Session Hardening — Enforces Idle & Absolute Timeouts
 *
 * Per the project knowledge base: "All users, including administrators,
 * should be logged out frequently and required to re-authenticate."
 *
 * This module:
 * - Validates session freshness on every authenticated request
 * - Enforces per-org configurable idle timeouts (default: 30 min)
 * - Enforces absolute session duration limits (default: 8 hours)
 * - Terminates sessions that exceed limits
 * - Logs session termination events for audit
 *
 * SOC 2 Controls: CC6.1, CC6.2, CC6.3
 */

import { getDb } from "../db";
import { sessions, organizations } from "../../drizzle/schema";
import { eq, and, gt, lt } from "drizzle-orm";
import { isSessionExpired, enforceConcurrentSessionLimit } from "./enterpriseControls";
import { logAudit } from "./rbac";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface SessionValidationResult {
  valid: boolean;
  reason?: "idle_timeout" | "absolute_timeout" | "revoked" | "expired" | "not_found";
  shouldRenew?: boolean;
}

// ─── Session Validation ─────────────────────────────────────────────────────

/**
 * Validate a session against timeout policies.
 * Called on every authenticated request via context builder.
 */
export async function validateSession(
  sessionId: number,
  userId: number,
  organizationId?: number
): Promise<SessionValidationResult> {
  const db = await getDb();
  if (!db) return { valid: false, reason: "not_found" };

  // Get the session
  const [session] = await db
    .select()
    .from(sessions)
    .where(eq(sessions.id, sessionId))
    .limit(1);

  if (!session) {
    return { valid: false, reason: "not_found" };
  }

  // Check if session is already expired
  if (session.expiresAt && new Date() > session.expiresAt) {
    return { valid: false, reason: "expired" };
  }

  // Get org-specific timeout settings
  let orgConfig: { idleTimeoutMinutes?: number; absoluteTimeoutHours?: number } | undefined;
  if (organizationId) {
    const [org] = await db
      .select({
        idleTimeout: organizations.sessionIdleTimeoutMinutes,
        absoluteTimeout: organizations.sessionAbsoluteTimeoutHours,
      })
      .from(organizations)
      .where(eq(organizations.id, organizationId))
      .limit(1);

    if (org) {
      orgConfig = {
        idleTimeoutMinutes: org.idleTimeout,
        absoluteTimeoutHours: org.absoluteTimeout,
      };
    }
  }

  // Check idle and absolute timeouts
  const lastActivity = session.lastActivity || session.createdAt;
  const expiry = isSessionExpired(lastActivity, session.createdAt, orgConfig);

  if (expiry.expired) {
    // Terminate the session
    await db
      .update(sessions)
      .set({ expiresAt: new Date() })
      .where(eq(sessions.id, sessionId));

    await logAudit({
      userId,
      action: "session_terminated",
      entityType: "session",
      entityId: String(sessionId),
      details: JSON.stringify({ reason: expiry.reason }),
      result: "success",
    });

    return { valid: false, reason: expiry.reason as any };
  }

  // Update last activity timestamp
  await db
    .update(sessions)
    .set({ lastActivity: new Date() })
    .where(eq(sessions.id, sessionId));

  return { valid: true };
}

/**
 * Terminate all sessions for a user (e.g., after password change, security event).
 */
export async function terminateAllUserSessions(
  userId: number,
  reason: string
): Promise<number> {
  const db = await getDb();
  if (!db) return 0;

  const [result] = await db
    .update(sessions)
    .set({ expiresAt: new Date() })
    .where(and(eq(sessions.userId, userId), gt(sessions.expiresAt, new Date())));

  const terminated = (result as any)?.affectedRows ?? 0;

  if (terminated > 0) {
    await logAudit({
      userId,
      action: "all_sessions_terminated",
      entityType: "session",
      details: JSON.stringify({ reason, count: terminated }),
      result: "success",
    });
  }

  return terminated;
}

/**
 * Get active session count for a user.
 */
export async function getActiveSessionCount(userId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;

  const activeSessions = await db
    .select()
    .from(sessions)
    .where(and(eq(sessions.userId, userId), gt(sessions.expiresAt, new Date())));

  return activeSessions.length;
}

/**
 * Cleanup expired sessions from the database.
 * Should be run periodically (e.g., every hour).
 */
export async function cleanupExpiredSessions(): Promise<number> {
  const db = await getDb();
  if (!db) return 0;

  const [result] = await db
    .delete(sessions)
    .where(lt(sessions.expiresAt, new Date()));

  return (result as any)?.affectedRows ?? 0;
}
