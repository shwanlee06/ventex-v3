// Autonomous Task Executor — AI completes tasks and logs what it did
// This is the engine that makes VENTEX actually DO the work.
// It identifies tasks that can be completed autonomously (research, drafts,

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
// Expanded pattern set for multi-client coverage across all venture sectors
const AUTONOMOUS_TASK_PATTERNS = [
  // Research tasks
  { pattern: /feasibility (study|analysis)/i, type: "research" },
  { pattern: /market (analysis|research|assessment|study|survey|overview)/i, type: "research" },
  { pattern: /regulatory (requirements|review|compliance|landscape|framework)/i, type: "research" },
  { pattern: /site (assessment|evaluation|survey|inspection)/i, type: "research" },
  { pattern: /due diligence/i, type: "research" },
  { pattern: /identify.*requirements/i, type: "research" },
  { pattern: /competitor (analysis|research|review|landscape)/i, type: "research" },
  { pattern: /industry (analysis|research|overview|trends)/i, type: "research" },
  { pattern: /location (analysis|assessment|scouting)/i, type: "research" },
  { pattern: /vendor (evaluation|assessment|selection|comparison)/i, type: "research" },
  { pattern: /supply chain (analysis|review|assessment)/i, type: "research" },
  { pattern: /benchmark(ing)?/i, type: "research" },
  { pattern: /research.*(?:options|alternatives|providers|partners)/i, type: "research" },
  { pattern: /investigate/i, type: "research" },
  { pattern: /survey.*(?:market|industry|landscape)/i, type: "research" },
  { pattern: /environmental (review|assessment|impact)/i, type: "research" },
  { pattern: /zoning (review|analysis|requirements)/i, type: "research" },
  { pattern: /tax (analysis|review|implications|structure)/i, type: "research" },
  { pattern: /legal (review|analysis|requirements|framework)/i, type: "research" },
  { pattern: /insurance (review|analysis|requirements)/i, type: "research" },

  // Analysis tasks
  { pattern: /financial (projections|model|forecast|analysis|review|summary)/i, type: "analysis" },
  { pattern: /risk (assessment|analysis|review|evaluation|matrix)/i, type: "analysis" },
  { pattern: /conduct.*assessment/i, type: "analysis" },
  { pattern: /update.*model/i, type: "analysis" },
  { pattern: /valuation (analysis|model|review)/i, type: "analysis" },
  { pattern: /cost (analysis|estimate|breakdown|projection)/i, type: "analysis" },
  { pattern: /revenue (model|projection|forecast|analysis)/i, type: "analysis" },
  { pattern: /ROI (analysis|calculation|projection)/i, type: "analysis" },
  { pattern: /cash flow (analysis|projection|model)/i, type: "analysis" },
  { pattern: /sensitivity analysis/i, type: "analysis" },
  { pattern: /scenario (analysis|planning|modeling)/i, type: "analysis" },
  { pattern: /portfolio (analysis|review|assessment)/i, type: "analysis" },
  { pattern: /performance (review|analysis|assessment)/i, type: "analysis" },
  { pattern: /impact (analysis|assessment)/i, type: "analysis" },
  { pattern: /SWOT/i, type: "analysis" },
  { pattern: /gap analysis/i, type: "analysis" },
  { pattern: /budget (review|analysis|planning)/i, type: "analysis" },
  { pattern: /profit.*(loss|analysis)/i, type: "analysis" },
  { pattern: /break.?even/i, type: "analysis" },

  // Draft tasks
  { pattern: /draft.*(?:plan|proposal|agreement|memo|brief|strategy|outline)/i, type: "draft" },
  { pattern: /prepare.*(?:report|presentation|communication|summary|brief|document|overview)/i, type: "draft" },
  { pattern: /submit.*report/i, type: "draft" },
  { pattern: /investor (communication|update|memo|letter|report)/i, type: "draft" },
  { pattern: /write.*(?:summary|brief|proposal|report|plan)/i, type: "draft" },
  { pattern: /create.*(?:plan|proposal|strategy|framework|outline|roadmap)/i, type: "draft" },
  { pattern: /develop.*(?:plan|strategy|framework|proposal|roadmap)/i, type: "draft" },
  { pattern: /compile.*(?:report|data|findings|results)/i, type: "draft" },
  { pattern: /outline.*(?:strategy|plan|approach|framework)/i, type: "draft" },
  { pattern: /LP (notice|update|communication|report)/i, type: "draft" },
  { pattern: /stakeholder (update|communication|report)/i, type: "draft" },
  { pattern: /executive (summary|brief|overview)/i, type: "draft" },
  { pattern: /board (report|presentation|update|memo)/i, type: "draft" },
  { pattern: /quarterly (report|update|review)/i, type: "draft" },
  { pattern: /monthly (report|update|review)/i, type: "draft" },
  { pattern: /annual (report|review)/i, type: "draft" },
  { pattern: /term sheet/i, type: "draft" },
  { pattern: /pitch (deck|document|material)/i, type: "draft" },
  { pattern: /teaser/i, type: "draft" },
  { pattern: /information memorandum/i, type: "draft" },

  // Review tasks
  { pattern: /review.*(?:deliverables|documents|contracts|agreements|terms|progress|status)/i, type: "review" },
  { pattern: /evaluate.*(?:proposals|options|candidates|bids)/i, type: "review" },
  { pattern: /assess.*(?:progress|status|performance|quality|readiness)/i, type: "review" },
  { pattern: /audit.*(?:compliance|financial|operational|process)/i, type: "review" },
  { pattern: /quality (check|review|assurance)/i, type: "review" },
  { pattern: /compliance (check|review|audit)/i, type: "review" },
  { pattern: /milestone (review|check|assessment)/i, type: "review" },
  { pattern: /progress (review|check|assessment|update)/i, type: "review" },
  { pattern: /status (review|check|assessment|update)/i, type: "review" },

  // Catch-all patterns for common task verbs
  { pattern: /^analyze /i, type: "analysis" },
  { pattern: /^research /i, type: "research" },
  { pattern: /^draft /i, type: "draft" },
  { pattern: /^review /i, type: "review" },
  { pattern: /^prepare /i, type: "draft" },
  { pattern: /^evaluate /i, type: "review" },
  { pattern: /^assess /i, type: "analysis" },
  { pattern: /^compile /i, type: "draft" },
  { pattern: /^summarize /i, type: "draft" },
  { pattern: /^investigate /i, type: "research" },
  { pattern: /^document /i, type: "draft" },
  { pattern: /^map /i, type: "research" },
  { pattern: /^calculate /i, type: "analysis" },
  { pattern: /^estimate /i, type: "analysis" },
  { pattern: /^forecast /i, type: "analysis" },
  { pattern: /^identify /i, type: "research" },
  { pattern: /^contact /i, type: "draft" },
  { pattern: /^engage /i, type: "draft" },
  { pattern: /^schedule /i, type: "draft" },
  { pattern: /^implement /i, type: "draft" },
  { pattern: /^outline /i, type: "draft" },
  { pattern: /^conduct /i, type: "analysis" },
  { pattern: /^shortlist /i, type: "research" },
  { pattern: /^source /i, type: "research" },
  { pattern: /^negotiate /i, type: "draft" },
  { pattern: /^coordinate /i, type: "draft" },
  { pattern: /^establish /i, type: "draft" },
  { pattern: /^define /i, type: "draft" },
  { pattern: /^design /i, type: "draft" },
  { pattern: /^develop /i, type: "draft" },
  { pattern: /^finalize /i, type: "draft" },
  { pattern: /^secure /i, type: "draft" },
  { pattern: /^optimize /i, type: "analysis" },
  { pattern: /^validate /i, type: "review" },
  { pattern: /^verify /i, type: "review" },
  { pattern: /^monitor /i, type: "review" },
  { pattern: /^track /i, type: "review" },
  { pattern: /^update /i, type: "draft" },
  { pattern: /^complete /i, type: "draft" },
  { pattern: /^deliver /i, type: "draft" },
  { pattern: /^generate /i, type: "draft" },
  { pattern: /^build /i, type: "draft" },
  { pattern: /^launch /i, type: "draft" },
  { pattern: /^plan /i, type: "draft" },
  { pattern: /^structure /i, type: "analysis" },
  { pattern: /^scope /i, type: "research" },
  { pattern: /^survey /i, type: "research" },
  { pattern: /^explore /i, type: "research" },
  { pattern: /^discover /i, type: "research" },
  { pattern: /^determine /i, type: "analysis" },
  { pattern: /^initiate /i, type: "draft" },
  { pattern: /^brainstorm /i, type: "research" },
  { pattern: /^propose /i, type: "draft" },
  { pattern: /^select /i, type: "review" },
  { pattern: /^prioritize /i, type: "analysis" },
  { pattern: /^allocate /i, type: "analysis" },
  { pattern: /^onboard /i, type: "draft" },
  { pattern: /^recruit /i, type: "research" },
  { pattern: /^procure /i, type: "research" },
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

  // Process up to 8 tasks per cycle — balanced between velocity and LLM cost
  let processedCount = 0;
  const MAX_PER_CYCLE = 8;

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
      const result = await invokeLLM({
        messages: [
          {
            role: "system",
            content: `You are VENTEX, an AI velocity platform executing a task for a UHNWI venture holding company. 
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
      const completionPrefix = `[VENTEX AI — ${new Date().toISOString().split("T")[0]}]\n`;
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
        detail: `VENTEX AI completed: "${task.title}" for ${venture.name} (${classification.type})`,
        userName: "VENTEX Velocity Agent",
        sector: venture.sector,
        activitySource: "system",
        organizationId: orgId,
      });
    } catch (err: any) {
      console.error(`[TaskExecutor] Error executing task ${task.id}:`, err.message);
    }
  }

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
