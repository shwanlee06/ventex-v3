// ═══════════════════════════════════════════════════════════════════════════
// ATLAS Real-time Agent Triggers
// Gap 4: Event-driven agent execution — instant response to mutations
// Instead of waiting for 6-hour polling cycles, agents react immediately
// ═══════════════════════════════════════════════════════════════════════════

import { getDb } from "../db";
import { eq, and, desc, sql } from "drizzle-orm";
import { eventTriggerLog, agentEvents, ventures, tasks } from "../../drizzle/schema";
import { invokeLLM } from "../_core/llm";

// ── Trigger Types ───────────────────────────────────────────────────────
type TriggerEvent = {
  type: "task_completed" | "task_overdue" | "stage_advanced" | "distribution_scheduled"
    | "client_action" | "blocker_resolved" | "venture_created" | "document_uploaded"
    | "blueprint_generated" | "task_created" | "client_portal_action";
  organizationId: number;
  userId?: string;
  entityType?: string;
  entityId?: number;
  entityName?: string;
  metadata?: Record<string, unknown>;
};

type TriggerResult = {
  triggered: boolean;
  agentName: string;
  action: string;
  eventCreated?: number;
};

// ── Trigger Registry ────────────────────────────────────────────────────
// Maps mutation types to agent responses
const TRIGGER_RULES: Array<{
  eventTypes: TriggerEvent["type"][];
  agentName: string;
  description: string;
  handler: (event: TriggerEvent) => Promise<TriggerResult>;
}> = [];

// Register all trigger rules
function registerTrigger(
  eventTypes: TriggerEvent["type"][],
  agentName: string,
  description: string,
  handler: (event: TriggerEvent) => Promise<TriggerResult>
) {
  TRIGGER_RULES.push({ eventTypes, agentName, description, handler });
}

// ── Rule: Task Completed → Check if stage can advance ───────────────────
registerTrigger(
  ["task_completed"],
  "velocity",
  "Check if all stage tasks are complete and venture can advance",
  async (event) => {
    const db = await getDb();
    if (!db) return { triggered: false, agentName: "velocity", action: "db_unavailable" };

    const ventureId = event.metadata?.ventureId as number;
    if (!ventureId) return { triggered: false, agentName: "velocity", action: "no_venture_id" };

    // Check remaining open tasks for this venture
    const openTasks = await db
      .select({ id: tasks.id })
      .from(tasks)
      .where(
        and(
          eq(tasks.ventureId, ventureId),
          sql`${tasks.status} != 'complete'`
        )
      );

    if (openTasks.length === 0) {
      // All tasks complete — create velocity event
      const [venture] = await db
        .select()
        .from(ventures)
        .where(eq(ventures.id, ventureId))
        .limit(1);

      if (venture) {
        await db.insert(agentEvents).values({
          organizationId: event.organizationId,
          agentName: "velocity",
          eventType: "stage_ready",
          message: `All tasks complete for "${venture.name}" in stage "${venture.stage}". Ready to advance.`,
          severity: "high",
          actionType: "advance",
          actionLabel: "Advance Stage",
          actionPayload: { ventureId: venture.id, currentStage: venture.stage },
          entityType: "venture",
          agentEntityId: String(venture.id),
          agentEntityName: venture.name,
          audience: "both",
          requiresClientAction: true,
        });

        return { triggered: true, agentName: "velocity", action: "stage_ready_event_created", eventCreated: 1 };
      }
    }

    return { triggered: false, agentName: "velocity", action: "tasks_still_open" };
  }
);

// ── Rule: Task Overdue → Immediate alert ────────────────────────────────
registerTrigger(
  ["task_overdue"],
  "overdue",
  "Create immediate alert when a task becomes overdue",
  async (event) => {
    const db = await getDb();
    if (!db) return { triggered: false, agentName: "overdue", action: "db_unavailable" };

    const taskId = event.entityId;
    const taskName = event.entityName || "Unknown task";

    await db.insert(agentEvents).values({
      organizationId: event.organizationId,
      agentName: "overdue",
      eventType: "task_overdue",
      message: `Task "${taskName}" is now overdue. Immediate attention required.`,
      severity: "high",
      actionType: "notify",
      actionLabel: "Send Reminder",
      actionPayload: { taskId, taskName },
      entityType: "task",
      agentEntityId: taskId ? String(taskId) : null,
      agentEntityName: taskName,
      audience: "both",
      requiresClientAction: true,
    });

    return { triggered: true, agentName: "overdue", action: "overdue_alert_created", eventCreated: 1 };
  }
);

// ── Rule: Client Portal Action → Acknowledge + cascade ──────────────────
registerTrigger(
  ["client_portal_action"],
  "orchestrator",
  "Process client actions from the portal and cascade effects",
  async (event) => {
    const db = await getDb();
    if (!db) return { triggered: false, agentName: "orchestrator", action: "db_unavailable" };

    const actionType = event.metadata?.actionType as string;
    const entityName = event.entityName || "Unknown";

    let message = "";
    let severity: "info" | "low" | "medium" | "high" | "critical" = "info";

    switch (actionType) {
      case "advance_stage":
        message = `Client approved stage advance for "${entityName}". Processing advancement.`;
        severity = "high";
        break;
      case "resolve_blocker":
        message = `Client resolved blocker on "${entityName}". Updating pipeline status.`;
        severity = "medium";
        break;
      case "confirm_distribution":
        message = `Client confirmed distribution for "${entityName}". Initiating payment workflow.`;
        severity = "high";
        break;
      default:
        message = `Client action "${actionType}" on "${entityName}".`;
        severity = "info";
    }

    await db.insert(agentEvents).values({
      organizationId: event.organizationId,
      agentName: "orchestrator",
      eventType: "client_action_processed",
      message,
      severity,
      actionType: "notify",
      actionLabel: "View Details",
      actionPayload: event.metadata || {},
      entityType: event.entityType || "venture",
      agentEntityId: event.entityId ? String(event.entityId) : null,
      agentEntityName: entityName,
      audience: "operator",
      requiresClientAction: false,
    });

    return { triggered: true, agentName: "orchestrator", action: "client_action_processed", eventCreated: 1 };
  }
);

// ── Rule: Blueprint Generated → Auto-create tasks ───────────────────────
registerTrigger(
  ["blueprint_generated"],
  "orchestrator",
  "When a blueprint is generated, notify the team and suggest task creation",
  async (event) => {
    const db = await getDb();
    if (!db) return { triggered: false, agentName: "orchestrator", action: "db_unavailable" };

    const ventureName = event.entityName || "Unknown venture";

    await db.insert(agentEvents).values({
      organizationId: event.organizationId,
      agentName: "orchestrator",
      eventType: "blueprint_ready",
      message: `Blueprint generated for "${ventureName}". Review and confirm process steps to activate velocity tracking.`,
      severity: "medium",
      actionType: "notify",
      actionLabel: "Review Blueprint",
      actionPayload: { ventureId: event.entityId, ventureName },
      entityType: "venture",
      agentEntityId: event.entityId ? String(event.entityId) : null,
      agentEntityName: ventureName,
      audience: "operator",
      requiresClientAction: false,
    });

    return { triggered: true, agentName: "orchestrator", action: "blueprint_notification", eventCreated: 1 };
  }
);

// ── Rule: Stage Advanced → Update forecasts + notify ────────────────────
registerTrigger(
  ["stage_advanced"],
  "velocity",
  "When a venture advances stages, update forecasts and notify stakeholders",
  async (event) => {
    const db = await getDb();
    if (!db) return { triggered: false, agentName: "velocity", action: "db_unavailable" };

    const ventureName = event.entityName || "Unknown";
    const newStage = event.metadata?.newStage as string || "next stage";
    const oldStage = event.metadata?.oldStage as string || "previous stage";

    // Create celebration/progress event for client
    await db.insert(agentEvents).values({
      organizationId: event.organizationId,
      agentName: "velocity",
      eventType: "stage_advanced",
      message: `"${ventureName}" has advanced from "${oldStage}" to "${newStage}". Velocity tracking updated.`,
      severity: "info",
      actionType: null,
      actionLabel: null,
      actionPayload: event.metadata || {},
      entityType: "venture",
      agentEntityId: event.entityId ? String(event.entityId) : null,
      agentEntityName: ventureName,
      oldStatus: oldStage,
      newStatus: newStage,
      audience: "both",
      requiresClientAction: false,
    });

    return { triggered: true, agentName: "velocity", action: "stage_advance_notification", eventCreated: 1 };
  }
);

// ── Rule: Distribution Scheduled → Alert + draft notice ─────────────────
registerTrigger(
  ["distribution_scheduled"],
  "distribution",
  "When a distribution is scheduled, create alert and draft LP notice",
  async (event) => {
    const db = await getDb();
    if (!db) return { triggered: false, agentName: "distribution", action: "db_unavailable" };

    const entityName = event.entityName || "Unknown distribution";
    const amount = event.metadata?.amount as string || "TBD";

    // Generate LP notice draft via LLM
    let draftNotice = "";
    try {
      const response = await invokeLLM({
        messages: [
          {
            role: "system",
            content: "You are ATLAS, drafting a professional LP distribution notice. Keep it formal, concise (3-4 sentences), and include the key details.",
          },
          {
            role: "user",
            content: `Draft an LP distribution notice for: ${entityName}, Amount: ${amount}. Include standard payment processing timeline language.`,
          },
        ],
      });
      draftNotice = response.choices[0].message.content as string || "";
    } catch (e) {
      console.error("[RealtimeTriggers] LP notice draft failed:", e);
    }

    await db.insert(agentEvents).values({
      organizationId: event.organizationId,
      agentName: "distribution",
      eventType: "distribution_notice",
      message: `Distribution scheduled for "${entityName}" (${amount}). LP notice drafted and ready for review.`,
      severity: "high",
      actionType: "draft",
      actionLabel: "Review LP Notice",
      actionPayload: { ...event.metadata, draftNotice },
      entityType: "distribution",
      agentEntityId: event.entityId ? String(event.entityId) : null,
      agentEntityName: entityName,
      audience: "both",
      requiresClientAction: true,
    });

    return { triggered: true, agentName: "distribution", action: "distribution_notice_created", eventCreated: 1 };
  }
);

// ── Main Dispatch Function ──────────────────────────────────────────────
// Called from tRPC mutation middleware or directly from procedures
export async function dispatchTrigger(event: TriggerEvent): Promise<TriggerResult[]> {
  const db = await getDb();
  if (!db) return [];

  const results: TriggerResult[] = [];
  const matchingRules = TRIGGER_RULES.filter((r) => r.eventTypes.includes(event.type));

  for (const rule of matchingRules) {
    try {
      const start = Date.now();
      const result = await rule.handler(event);
      const elapsed = Date.now() - start;

      // Log the trigger execution
      await db.insert(eventTriggerLog).values({
        organizationId: event.organizationId,
        triggerType: event.type,
        triggerSource: "mutation",
        entityType: event.entityType || null,
        entityId: event.entityId || null,
        entityName: event.entityName || null,
        description: `${rule.agentName}: ${result.action}`,
        agentsTriggered: [rule.agentName],
        signalsGenerated: result.eventCreated || 0,
        latencyMs: elapsed,
        processedAt: new Date(),
      });

      results.push(result);
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : String(e);
      console.error(`[RealtimeTriggers] Rule "${rule.description}" failed:`, errorMsg);

      // Log failure
      await db.insert(eventTriggerLog).values({
        organizationId: event.organizationId,
        triggerType: event.type,
        triggerSource: "mutation",
        entityType: event.entityType || null,
        entityId: event.entityId || null,
        entityName: event.entityName || null,
        description: `ERROR: ${rule.agentName} — ${errorMsg}`,
        agentsTriggered: [rule.agentName],
        signalsGenerated: 0,
        latencyMs: 0,
        processedAt: new Date(),
      });

      results.push({ triggered: false, agentName: rule.agentName, action: `error: ${errorMsg}` });
    }
  }

  return results;
}

// ── Convenience Dispatchers ─────────────────────────────────────────────
// Called directly from tRPC procedures for instant response

export async function onTaskCompleted(organizationId: number, ventureId: number, taskId: number, taskName: string) {
  return dispatchTrigger({
    type: "task_completed",
    organizationId,
    entityType: "task",
    entityId: taskId,
    entityName: taskName,
    metadata: { ventureId },
  });
}

export async function onTaskOverdue(organizationId: number, taskId: number, taskName: string) {
  return dispatchTrigger({
    type: "task_overdue",
    organizationId,
    entityType: "task",
    entityId: taskId,
    entityName: taskName,
  });
}

export async function onStageAdvanced(
  organizationId: number, ventureId: number, ventureName: string,
  oldStage: string, newStage: string
) {
  return dispatchTrigger({
    type: "stage_advanced",
    organizationId,
    entityType: "venture",
    entityId: ventureId,
    entityName: ventureName,
    metadata: { oldStage, newStage },
  });
}

export async function onClientPortalAction(
  organizationId: number, actionType: string, entityId: number, entityName: string
) {
  return dispatchTrigger({
    type: "client_portal_action",
    organizationId,
    entityType: "venture",
    entityId,
    entityName,
    metadata: { actionType },
  });
}

export async function onBlueprintGenerated(organizationId: number, ventureId: number, ventureName: string) {
  return dispatchTrigger({
    type: "blueprint_generated",
    organizationId,
    entityType: "venture",
    entityId: ventureId,
    entityName: ventureName,
  });
}

export async function onDistributionScheduled(
  organizationId: number, distributionId: number, name: string, amount: string
) {
  return dispatchTrigger({
    type: "distribution_scheduled",
    organizationId,
    entityType: "distribution",
    entityId: distributionId,
    entityName: name,
    metadata: { amount },
  });
}

// ── Get Trigger Execution History ───────────────────────────────────────
export async function getTriggerHistory(organizationId: number, limit = 50) {
  const db = await getDb();
  if (!db) return [];

  return db
    .select()
    .from(eventTriggerLog)
    .where(eq(eventTriggerLog.organizationId, organizationId))
    .orderBy(desc(eventTriggerLog.createdAt))
    .limit(limit);
}
