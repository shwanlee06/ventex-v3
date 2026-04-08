// ============================================================================
// Autonomous Task Executor — AI completes tasks and logs what it did
// This is the engine that makes ATLAS actually DO the work.
// It identifies tasks that can be completed autonomously (research, drafts,
// reviews, assessments) and uses LLM to produce the deliverable.
// ============================================================================

import { getDb } from "../db";
import {
  tasks,
  ventures,
  orgVentureAccess,
  agentEvents,
  activityLog,
  ventureVelocity,
  auditLog,
} from "../../drizzle/schema";
import { eq, and, inArray, sql, ne, gte, desc } from "drizzle-orm";
import { invokeLLM } from "../_core/llm";

// Tasks the AI can autonomously complete (keyword-based classification)
const AUTONOMOUS_TASK_PATTERNS = [
  { pattern: /feasibility study/i, type: "research" },
  { pattern: /market (analysis|research|assessment)/i, type: "research" },
  { pattern: /financial (projections|model|forecast)/i, type: "analysis" },
  { pattern: /risk assessment/i, type: "analysis" },
  { pattern: /regulatory (requirements|review|compliance)/i, type: "research" },
  { pattern: /draft.*plan/i, type: "draft" },
  { pattern: /prepare.*report/i, type: "draft" },
  { pattern: /prepare.*presentation/i, type: "draft" },
  { pattern: /prepare.*communication/i, type: "draft" },
  { pattern: /review.*deliverables/i, type: "review" },
  { pattern: /conduct.*assessment/i, type: "analysis" },
  { pattern: /identify.*requirements/i, type: "research" },
  { pattern: /update.*model/i, type: "analysis" },
  { pattern: /submit.*report/i, type: "draft" },
  { pattern: /investor communication/i, type: "draft" },
  { pattern: /site assessment/i, type: "research" },
  { pattern: /due diligence/i, type: "research" },
];

interface ExecutionResult {
  tasksCompleted: number;
  venturesAdvanced: number;
  eventsLogged: number;
}

function classifyTask(title: string): { canAutomate: boolean; type: string } {
  for (const p of AUTONOMOUS_TASK_PATTERNS) {
    if (p.pattern.test(title)) {
      return { canAutomate: true, type: p.type };
    }
  }
  return { canAutomate: false, type: "manual" };
}

/**
 * Run the Autonomous Task Executor for a specific organization.
 * Finds open tasks that can be completed by AI, generates deliverables, and marks them complete.
 */
export async function runAutonomousTaskExecutor(
  orgId: number
): Promise<ExecutionResult> {
  const db = await getDb();
  if (!db) return { tasksCompleted: 0, venturesAdvanced: 0, eventsLogged: 0 };

  let tasksCompleted = 0;
  let venturesAdvanced = 0;
  let eventsLogged = 0;

  // Get ventures for this org
  const orgVentureIds = await db
    .select({ ventureId: orgVentureAccess.ventureId })
    .from(orgVentureAccess)
    .where(eq(orgVentureAccess.organizationId, orgId));

  const ventureIds = orgVentureIds.map((r) => r.ventureId);
  if (ventureIds.length === 0) return { tasksCompleted: 0, venturesAdvanced: 0, eventsLogged: 0 };

  // Get open tasks for these ventures
  const openTasks = await db
    .select({
      id: tasks.id,
      title: tasks.title,
      ventureId: tasks.ventureId,
      status: tasks.status,
      priority: tasks.priority,
      description: tasks.description,
      dueDate: tasks.dueDate,
      assigneeNames: tasks.assigneeNames,
    })
    .from(tasks)
    .where(
      and(
        eq(tasks.organizationId, orgId),
        inArray(tasks.status, ["open", "overdue"]),
        inArray(tasks.ventureId, ventureIds)
      )
    )
    .orderBy(desc(tasks.priority))
    .limit(20);

  // Check dedup: don't execute tasks we already processed recently
  const recentExecutions = await db
    .select({ entityId: agentEvents.agentEntityId })
    .from(agentEvents)
    .where(
      and(
        eq(agentEvents.agentName, "Velocity Agent"),
        eq(agentEvents.eventType, "status_change"),
        eq(agentEvents.organizationId, orgId),
        gte(agentEvents.createdAt, new Date(Date.now() - 12 * 60 * 60 * 1000))
      )
    );
  const recentlyProcessedIds = new Set(recentExecutions.map((r) => r.entityId));

  // Limit to 3 tasks per cycle to avoid LLM overload
  let processedCount = 0;
  const MAX_PER_CYCLE = 3;

  for (const task of openTasks) {
    if (processedCount >= MAX_PER_CYCLE) break;
    if (recentlyProcessedIds.has(String(task.id))) continue;

    const classification = classifyTask(task.title);
    if (!classification.canAutomate) continue;

    // Get venture context
    const [venture] = await db
      .select({
        name: ventures.name,
        stage: ventures.stage,
        sector: ventures.sector,
        description: ventures.description,
      })
      .from(ventures)
      .where(eq(ventures.id, task.ventureId!))
      .limit(1);

    if (!venture) continue;

    try {
      // ── LLM: Execute the task ──────────────────────────────────────
      const result = await invokeLLM({
        messages: [
          {
            role: "system",
            content: `You are ATLAS, an AI velocity platform executing a task for a UHNWI venture holding company. 
You are completing a ${classification.type} task. Produce a concise but substantive deliverable.

For "research" tasks: Provide key findings, data points, and recommendations (5-8 bullet points).
For "analysis" tasks: Provide quantitative analysis, risk factors, and projections (5-8 bullet points).
For "draft" tasks: Provide a structured outline with key sections and content (5-8 bullet points).
For "review" tasks: Provide assessment criteria, findings, and action items (5-8 bullet points).

Be specific to the venture's sector and stage. Use real-world knowledge about the industry.
Format as a brief executive summary (max 200 words).`,
          },
          {
            role: "user",
            content: `Task: "${task.title}"
Task Description: ${task.description || "N/A"}
Venture: "${venture.name}" (${venture.sector})
Stage: ${venture.stage}
Venture Description: ${venture.description || "N/A"}

Execute this task and provide the deliverable.`,
          },
        ],
        maxTokens: 512,
      });

      const deliverable = result.choices?.[0]?.message?.content;
      if (!deliverable || typeof deliverable !== "string") continue;

      // Mark task as complete with the deliverable stored in description
      const completionPrefix = `[ATLAS AI — ${new Date().toISOString().split("T")[0]}]\n`;
      const existingDesc = task.description || "";
      await db
        .update(tasks)
        .set({
          status: "complete",
          description: `${completionPrefix}${deliverable}\n\n---\n${existingDesc}`.substring(0, 4000),
        })
        .where(eq(tasks.id, task.id));

      tasksCompleted++;
      processedCount++;

      // Log agent event
      await db.insert(agentEvents).values({
        organizationId: orgId,
        agentName: "Velocity Agent",
        eventType: "status_change",
        message: `Completed "${task.title}" for ${venture.name}. ${classification.type.charAt(0).toUpperCase() + classification.type.slice(1)} deliverable generated.`,
        severity: "info",
        audience: "client",
        requiresClientAction: false,
        actionType: "notify",
        actionLabel: "View Deliverable",
        actionPayload: { taskId: task.id, ventureId: task.ventureId, type: classification.type },
        entityType: "task",
        agentEntityId: String(task.id),
        agentEntityName: task.title,
        oldStatus: task.status,
        newStatus: "complete",
        isRead: false,
        actionTaken: false,
      } as any);
      eventsLogged++;

      // Log activity
      await db.insert(activityLog).values({
        entityType: "task",
        entityId: task.id,
        entityName: task.title,
        action: "Task Completed",
        detail: `ATLAS AI completed: "${task.title}" for ${venture.name} (${classification.type})`,
        userName: "ATLAS Velocity Agent",
        sector: venture.sector,
        activitySource: "system",
        organizationId: orgId,
      });

      console.log(
        `[TaskExecutor] Completed "${task.title}" for ${venture.name} (${classification.type})`
      );
    } catch (err: any) {
      console.error(`[TaskExecutor] Error executing task ${task.id}:`, err.message);
    }
  }

  // ── Check if any ventures now have all tasks complete → trigger velocity ──
  const ventureTaskCounts = new Map<number, { total: number; complete: number }>();
  for (const task of openTasks) {
    if (!task.ventureId) continue;
    if (!ventureTaskCounts.has(task.ventureId)) {
      const [counts] = await db
        .select({
          total: sql<number>`COUNT(*)`,
          complete: sql<number>`SUM(CASE WHEN ${tasks.status} = 'complete' THEN 1 ELSE 0 END)`,
        })
        .from(tasks)
        .where(eq(tasks.ventureId, task.ventureId));
      ventureTaskCounts.set(task.ventureId, {
        total: Number(counts?.total || 0),
        complete: Number(counts?.complete || 0),
      });
    }
  }

  // Update health scores for affected ventures
  for (const [ventureId, counts] of Array.from(ventureTaskCounts.entries())) {
    if (counts.total === 0) continue;
    const completionRate = counts.complete / counts.total;
    const health = Math.max(10, Math.min(95, Math.round(completionRate * 70 + 30)));
    await db.update(ventures).set({ healthScore: health }).where(eq(ventures.id, ventureId));
  }

  console.log(
    `[TaskExecutor] Org ${orgId}: ${tasksCompleted} tasks completed, ${eventsLogged} events logged`
  );

  // SOC 2 audit trail
  if (tasksCompleted > 0) {
    try {
      await db.insert(auditLog).values({
        action: "ai_tasks_completed",
        entityType: "system",
        userName: "SYSTEM:AutonomousTaskExecutor",
        details: JSON.stringify({ orgId, tasksCompleted, venturesAdvanced }),
        result: "success",
      });
    } catch { /* non-critical */ }
  }

  return { tasksCompleted, venturesAdvanced, eventsLogged };
}
