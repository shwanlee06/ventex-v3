// Escalation Engine — 48-hour auto-escalation with nudge emails
// Scans for unactioned client events, sends nudge emails, creates escalation

import { getDb } from "../db";
import { agentEvents, organizations, tasks, ventures } from "../../drizzle/schema";
import { eq, and, lte, desc, sql } from "drizzle-orm";
import { sendClientNudge, sendOverdueAutoEmail } from "../emailService";
import { createNotification, NOTIF_TYPES } from "../notificationHelper";

const ESCALATION_THRESHOLD_HOURS = 48;
const NUDGE_THRESHOLD_HOURS = 24;
const MAX_NUDGES_PER_SWEEP = 10;

export interface EscalationResult {
  nudgesSent: number;
  escalationsCreated: number;
  overdueTaskAlerts: number;
  errors: string[];
}

/**
 * Run the full escalation sweep for a specific organization.
 * Called from the agent runner during the 6h cycle.
 */
export async function runEscalationSweep(organizationId: number): Promise<EscalationResult> {
  const result: EscalationResult = {
    nudgesSent: 0,
    escalationsCreated: 0,
    overdueTaskAlerts: 0,
    errors: [],
  };

  const db = await getDb();
  if (!db) return result;

  try {
    const nudgeCutoff = new Date(Date.now() - NUDGE_THRESHOLD_HOURS * 60 * 60 * 1000);
    const escalationCutoff = new Date(Date.now() - ESCALATION_THRESHOLD_HOURS * 60 * 60 * 1000);

    const unactionedEvents = await db
      .select()
      .from(agentEvents)
      .where(
        and(
          eq(agentEvents.organizationId, organizationId),
          eq(agentEvents.requiresClientAction, true),
          eq(agentEvents.actionTaken, false),
          eq(agentEvents.clientDismissed, false),
          lte(agentEvents.createdAt, nudgeCutoff),
        )
      )
      .orderBy(desc(agentEvents.createdAt))
      .limit(50);

    const [org] = await db
      .select({
        id: organizations.id,
        name: organizations.name,
        primaryContactEmail: organizations.primaryContactEmail,
        primaryContactName: organizations.primaryContactName,
      })
      .from(organizations)
      .where(eq(organizations.id, organizationId))
      .limit(1);

    if (!org) {
      result.errors.push(`Organization ${organizationId} not found`);
      return result;
    }

    const nudgeItems = unactionedEvents.filter(
      (e) => new Date(e.createdAt) >= escalationCutoff
    );

    if (nudgeItems.length > 0 && org.primaryContactEmail) {
      try {
        const topItems = nudgeItems.slice(0, 5).map((e) => e.message);
        await sendClientNudge({
          to: org.primaryContactEmail,
          clientName: org.name,
          contactName: org.primaryContactName || org.name,
          unactionedCount: nudgeItems.length,
          topItems,
        });
        result.nudgesSent++;
      } catch (err: any) {
        result.errors.push(`Nudge email failed: ${err.message}`);
      }
    }

    const escalationItems = unactionedEvents.filter(
      (e) => new Date(e.createdAt) < escalationCutoff
    );

    for (const event of escalationItems.slice(0, MAX_NUDGES_PER_SWEEP)) {
      try {
        // Create escalation agent event (visible to operators)
        await db.insert(agentEvents).values({
          organizationId,
          agentName: "Escalation Engine",
          eventType: "escalation",
          message: `ESCALATION: "${event.agentEntityName || "Item"}" has been unactioned for 48+ hours. Original: ${event.message}`,
          severity: "critical",
          entityType: event.entityType,
          agentEntityId: event.agentEntityId,
          agentEntityName: event.agentEntityName,
          audience: "operator",
          requiresClientAction: false,
          actionType: "escalate",
          actionLabel: "Review Escalation",
          actionPayload: {
            originalEventId: event.id,
            hoursUnactioned: Math.floor(
              (Date.now() - new Date(event.createdAt).getTime()) / (1000 * 60 * 60)
            ),
            clientName: org.name,
          },
        });

        // Create notification for ATLAS operators
        await createNotification({
          organizationId,
          type: NOTIF_TYPES.SMART_ALERT,
          category: "critical",
          title: `48h Escalation: ${org.name}`,
          message: `"${event.agentEntityName || "Item"}" requires attention — unactioned for 48+ hours.`,
          entityType: event.entityType || undefined,
          entityId: event.agentEntityId ? parseInt(event.agentEntityId) : undefined,
          entityName: event.agentEntityName || undefined,
        });

        result.escalationsCreated++;
      } catch (err: any) {
        result.errors.push(`Escalation failed for event ${event.id}: ${err.message}`);
      }
    }

    const now = new Date();
    const overdueTasks = await db
      .select({
        id: tasks.id,
        title: tasks.title,
        dueDate: tasks.dueDate,
        ventureId: tasks.ventureId,
        assigneeNames: tasks.assigneeNames,
      })
      .from(tasks)
      .where(
        and(
          sql`${tasks.ventureId} IN (
            SELECT ova.ventureId FROM org_venture_access ova 
            WHERE ova.organizationId = ${organizationId}
          )`,
          sql`${tasks.dueDate} <= ${now.toISOString().slice(0, 10)}`,  // dueDate is varchar
          sql`${tasks.status} != 'complete'`,
        )
      )
      .limit(20);

    for (const task of overdueTasks) {
      if (!task.dueDate) continue;
      const daysOverdue = Math.floor(
        (now.getTime() - new Date(task.dueDate).getTime()) / (1000 * 60 * 60 * 24)
      );

      // Only alert on tasks overdue by 2+ days (avoid noise)
      if (daysOverdue < 2) continue;

      // Get venture name
      let ventureName = "Unknown Venture";
      if (task.ventureId) {
        const [v] = await db
          .select({ name: ventures.name })
          .from(ventures)
          .where(eq(ventures.id, task.ventureId))
          .limit(1);
        if (v) ventureName = v.name;
      }

      // Send overdue email to org contact
      if (org.primaryContactEmail) {
        try {
          await sendOverdueAutoEmail({
            to: org.primaryContactEmail,
            assigneeName: (Array.isArray(task.assigneeNames) ? task.assigneeNames[0] : task.assigneeNames) || org.primaryContactName || "Team",
            taskTitle: task.title,
            ventureName,
            stage: "Current",
            daysOverdue,
            deadlineDate: new Date(task.dueDate).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            }),
          });
          result.overdueTaskAlerts++;
        } catch (err: any) {
          result.errors.push(`Overdue email failed for task ${task.id}: ${err.message}`);
        }
      }
    }
  } catch (err: any) {
    result.errors.push(`Sweep failed: ${err.message}`);
    console.error(`[EscalationEngine] Sweep failed for org ${organizationId}:`, err.message);
  }

  return result;
}

/**
 * Get escalation stats for the operator dashboard.
 */
export async function getEscalationStats(organizationId?: number) {
  const db = await getDb();
  if (!db) return { total: 0, critical: 0, pending: 0, resolved: 0 };

  const cutoff48h = new Date(Date.now() - 48 * 60 * 60 * 1000);
  const cutoff24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const conditions = [
    eq(agentEvents.requiresClientAction, true),
    eq(agentEvents.actionTaken, false),
    eq(agentEvents.clientDismissed, false),
  ];
  if (organizationId) {
    conditions.push(eq(agentEvents.organizationId, organizationId));
  }

  const allUnactioned = await db
    .select({
      id: agentEvents.id,
      createdAt: agentEvents.createdAt,
      severity: agentEvents.severity,
    })
    .from(agentEvents)
    .where(and(...conditions))
    .orderBy(desc(agentEvents.createdAt))
    .limit(200);

  const critical = allUnactioned.filter(
    (e) => new Date(e.createdAt) < cutoff48h
  ).length;
  const pending = allUnactioned.filter(
    (e) => new Date(e.createdAt) >= cutoff48h && new Date(e.createdAt) < cutoff24h
  ).length;

  return {
    total: allUnactioned.length,
    critical,
    pending,
    resolved: 0,
  };
}
