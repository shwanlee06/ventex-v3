import { getDb } from "./db";
import { notifications } from "../drizzle/schema";
import { broadcastSSE } from "./routes/sseEvents";

export interface CreateNotificationParams {
  userId?: number;        // specific user target (null = broadcast to role)
  organizationId?: number; // scope to org
  type: string;           // e.g., "task_overdue", "venture_status_change", "document_uploaded"
  category?: "info" | "warning" | "critical" | "success";
  title: string;
  message?: string;
  entityType?: string;    // "venture", "task", "spv", "distribution", "document"
  entityId?: number;
  entityName?: string;
  link?: string;          // e.g., "/ventures/ssh-maritime"
  actorName?: string;     // who triggered the event
}

/**
 * Create a notification in the database.
 * Called from routers when critical business events happen.
 */
export async function createNotification(params: CreateNotificationParams): Promise<void> {
  try {
    const db = await getDb();
    if (!db) return;

    await db.insert(notifications).values({
      userId: params.userId ?? null,
      organizationId: params.organizationId ?? null,
      type: params.type,
      category: params.category ?? "info",
      title: params.title,
      message: params.message ?? null,
      entityType: params.entityType ?? null,
      entityId: params.entityId ?? null,
      entityName: params.entityName ?? null,
      link: params.link ?? null,
      actorName: params.actorName ?? null,
    });

    // Broadcast SSE event for real-time updates
    broadcastSSE({
      type: "notification",
      data: { title: params.title, category: params.category ?? "info", notifType: params.type },
      userId: params.userId,
      organizationId: params.organizationId,
    });
  } catch (err) {
    // Notifications should never crash the main operation
    console.error("[Notification] Failed to create notification:", err);
  }
}

/**
 * Create multiple notifications at once (e.g., notify all admins).
 */
export async function createBulkNotifications(
  paramsList: CreateNotificationParams[]
): Promise<void> {
  try {
    const db = await getDb();
    if (!db || paramsList.length === 0) return;

    await db.insert(notifications).values(
      paramsList.map((p) => ({
        userId: p.userId ?? null,
        organizationId: p.organizationId ?? null,
        type: p.type,
        category: p.category ?? "info",
        title: p.title,
        message: p.message ?? null,
        entityType: p.entityType ?? null,
        entityId: p.entityId ?? null,
        entityName: p.entityName ?? null,
        link: p.link ?? null,
        actorName: p.actorName ?? null,
      }))
    );

    // Broadcast SSE for each notification
    for (const p of paramsList) {
      broadcastSSE({
        type: "notification",
        data: { title: p.title, category: p.category ?? "info", notifType: p.type },
        userId: p.userId,
        organizationId: p.organizationId,
      });
    }
  } catch (err) {
    console.error("[Notification] Failed to create bulk notifications:", err);
  }
}

/**
 * Notification type constants for consistency.
 */
export const NOTIF_TYPES = {
  // Task events
  TASK_CREATED: "task_created",
  TASK_COMPLETED: "task_completed",
  TASK_OVERDUE: "task_overdue",
  TASK_ASSIGNED: "task_assigned",
  // Venture events
  VENTURE_STATUS_CHANGE: "venture_status_change",
  VENTURE_HEALTH_DROP: "venture_health_drop",
  VENTURE_CREATED: "venture_created",
  // SPV events
  SPV_STAGE_CHANGE: "spv_stage_change",
  SPV_CREATED: "spv_created",
  // Distribution events
  DISTRIBUTION_SCHEDULED: "distribution_scheduled",
  DISTRIBUTION_PAID: "distribution_paid",
  // Document events
  DOCUMENT_UPLOADED: "document_uploaded",
  DOCUMENT_ANALYZED: "document_analyzed",
  DOCUMENT_URGENT: "document_urgent",
  DEADLINE_DETECTED: "deadline_detected",
  // Team events
  TEAM_MEMBER_ADDED: "team_member_added",
  TEAM_MEMBER_REMOVED: "team_member_removed",
  // AI events
  AI_TASKS_GENERATED: "ai_tasks_generated",
  AI_OBSERVATION: "ai_observation",
  DAILY_BRIEF: "daily_brief",
  // System events
  USER_LOGIN: "user_login",
  SMART_ALERT: "smart_alert",
} as const;
