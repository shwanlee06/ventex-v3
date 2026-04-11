// Proactive Task Generator — AI creates next-step tasks for ventures
// This is the engine that makes VENTEX actually MOVE ventures forward.
// It scans each venture, identifies what needs to happen next, and creates

import { getDb } from "../db";
import {
  ventures,
  tasks,
  orgVentureAccess,
  teamMembers,
  ventureTeam,
  agentEvents,
  activityLog,
  auditLog,
} from "../../drizzle/schema";
import { eq, and, inArray, sql, ne, gte, desc } from "drizzle-orm";
import { invokeLLM } from "../_core/llm";

interface GeneratedTask {
  title: string;
  priority: "High" | "Medium" | "Low";
  dueDays: number; // days from now
  description: string;
}

interface ProactiveResult {
  tasksCreated: number;
  venturesProcessed: number;
  eventsLogged: number;
}

/**
 * Run the Proactive Task Generator for a specific organization.
 * Scans ventures with few or no open tasks and generates next-step tasks using LLM.
 */
export async function runProactiveTaskGenerator(
  orgId: number
): Promise<ProactiveResult> {
  const db = await getDb();
  if (!db) return { tasksCreated: 0, venturesProcessed: 0, eventsLogged: 0 };

  let tasksCreated = 0;
  let venturesProcessed = 0;
  let eventsLogged = 0;

  // Get ventures for this org
  const orgVentureIds = await db
    .select({ ventureId: orgVentureAccess.ventureId })
    .from(orgVentureAccess)
    .where(eq(orgVentureAccess.organizationId, orgId));

  const ventureIds = orgVentureIds.map((r) => r.ventureId);
  if (ventureIds.length === 0) return { tasksCreated: 0, venturesProcessed: 0, eventsLogged: 0 };

  // Get ventures that are NOT completed
  const activeVentures = await db
    .select({
      id: ventures.id,
      name: ventures.name,
      stage: ventures.stage,
      sector: ventures.sector,
      status: ventures.status,
      healthScore: ventures.healthScore,
      description: ventures.description,
      nextStep: ventures.nextStep,
      nextMilestone: ventures.nextMilestone,
    })
    .from(ventures)
    .where(
      and(
        inArray(ventures.id, ventureIds),
        ne(ventures.status, "Completed")
      )
    );

  for (const venture of activeVentures) {
    // Count open tasks for this venture
    const [taskCount] = await db
      .select({
        open: sql<number>`SUM(CASE WHEN ${tasks.status} IN ('open', 'overdue') THEN 1 ELSE 0 END)`,
        total: sql<number>`COUNT(*)`,
        complete: sql<number>`SUM(CASE WHEN ${tasks.status} = 'complete' THEN 1 ELSE 0 END)`,
      })
      .from(tasks)
      .where(eq(tasks.ventureId, venture.id));

    const openTasks = Number(taskCount?.open || 0);
    const totalTasks = Number(taskCount?.total || 0);
    const completeTasks = Number(taskCount?.complete || 0);

    // Only generate tasks if venture has fewer than 2 open tasks
    if (openTasks >= 2) continue;

    // Check if we already generated tasks for this venture recently (24h dedup)
    const recentGeneration = await db
      .select({ id: agentEvents.id })
      .from(agentEvents)
      .where(
        and(
          eq(agentEvents.agentName, "Velocity Agent"),
          eq(agentEvents.agentEntityId, String(venture.id)),
          eq(agentEvents.eventType, "recommendation"),
          gte(agentEvents.createdAt, new Date(Date.now() - 24 * 60 * 60 * 1000))
        )
      )
      .limit(1);

    if (recentGeneration.length > 0) continue;

    // Get existing task titles to avoid duplicates
    const existingTasks = await db
      .select({ title: tasks.title, status: tasks.status })
      .from(tasks)
      .where(eq(tasks.ventureId, venture.id))
      .orderBy(desc(tasks.createdAt))
      .limit(10);

    const existingTitles = existingTasks.map((t) => `${t.title} (${t.status})`).join("\n");

    // Get team members for this venture
    const team = await db
      .select({ name: teamMembers.name })
      .from(ventureTeam)
      .innerJoin(teamMembers, eq(ventureTeam.memberId, teamMembers.id))
      .where(eq(ventureTeam.ventureId, venture.id));

    const teamNames = team.map((t) => t.name);
    const assignee = teamNames.length > 0 ? teamNames[0] : "VENTEX Operations";

    const numToGenerate = Math.min(3, 3 - openTasks); // Generate up to 3 tasks

    try {
      const result = await invokeLLM({
        messages: [
          {
            role: "system",
            content: `You are VENTEX, an AI velocity platform for a UHNWI venture holding company. You proactively create the next concrete tasks that will move a venture forward.

Rules:
- Generate exactly ${numToGenerate} tasks
- Tasks must be specific and actionable (not vague like "review progress")
- Each task should directly advance the venture toward its next milestone
- Due dates should be realistic (3-21 days from now)
- Priority should reflect urgency: High for blocking items, Medium for important, Low for nice-to-have
- Consider the venture's current stage, sector, and existing completed tasks
- Do NOT duplicate existing tasks

Return ONLY valid JSON array, no markdown, no explanation:
[{"title": "...", "priority": "High|Medium|Low", "dueDays": 7, "description": "Brief description of what needs to be done"}]`,
          },
          {
            role: "user",
            content: `Venture: "${venture.name}"
Sector: ${venture.sector}
Stage: ${venture.stage}
Health Score: ${venture.healthScore}/100
Description: ${venture.description || "N/A"}
Next Step: ${venture.nextStep || "N/A"}
Next Milestone: ${venture.nextMilestone || "N/A"}
Completed tasks: ${completeTasks}
Open tasks: ${openTasks}
Existing tasks:
${existingTitles || "None"}

Generate ${numToGenerate} next-step tasks to move this venture forward.`,
          },
        ],
        maxTokens: 1024,
      });

      const content = result.choices?.[0]?.message?.content;
      if (!content) continue;

      // Parse the JSON response
      const contentStr = typeof content === "string" ? content : "";
      // Extract JSON from potential markdown code blocks
      const jsonMatch = contentStr.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        console.error(`[ProactiveTaskGen] Failed to parse LLM response for ${venture.name}:`, contentStr.substring(0, 200));
        continue;
      }

      const generatedTasks: GeneratedTask[] = JSON.parse(jsonMatch[0]);

      // Create the tasks
      const now = new Date();
      const createdTaskNames: string[] = [];

      for (const genTask of generatedTasks) {
        const dueDate = new Date(now.getTime() + genTask.dueDays * 86400000);
        const dueDateStr = dueDate.toISOString().split("T")[0];

        // Check for duplicate title
        const isDuplicate = existingTasks.some(
          (t) => t.title.toLowerCase().includes(genTask.title.toLowerCase().substring(0, 30))
        );
        if (isDuplicate) continue;

        await db.insert(tasks).values({
          organizationId: orgId,
          title: genTask.title,
          ventureId: venture.id,
          assigneeNames: [assignee],
          dueDate: dueDateStr,
          priority: genTask.priority,
          status: "open",
          description: genTask.description,
        });

        tasksCreated++;
        createdTaskNames.push(genTask.title);
      }

      if (createdTaskNames.length > 0) {
        // Log agent event
        await db.insert(agentEvents).values({
          organizationId: orgId,
          agentName: "Velocity Agent",
          eventType: "recommendation",
          message: `Created ${createdTaskNames.length} next-step tasks for "${venture.name}": ${createdTaskNames.join("; ")}`,
          severity: "info",
          audience: "client",
          requiresClientAction: false,
          actionType: "notify",
          actionLabel: "View Tasks",
          actionPayload: { ventureId: venture.id, taskCount: createdTaskNames.length },
          entityType: "venture",
          agentEntityId: String(venture.id),
          agentEntityName: venture.name,
          isRead: false,
          actionTaken: false,
        } as any);
        eventsLogged++;

        // Log activity
        await db.insert(activityLog).values({
          entityType: "venture",
          entityId: venture.id,
          entityName: venture.name,
          action: "Task Created",
          detail: `VENTEX AI created ${createdTaskNames.length} tasks: ${createdTaskNames.join(", ")}`,
          userName: "VENTEX Velocity Agent",
          sector: venture.sector,
          activitySource: "system",
          organizationId: orgId,
        });
      }

      venturesProcessed++;
    } catch (err: any) {
      console.error(`[ProactiveTaskGen] Error for venture ${venture.name}:`, err.message);
    }
  }

  // SOC 2 audit trail
  if (tasksCreated > 0) {
    try {
      await db.insert(auditLog).values({
        action: "ai_tasks_generated",
        entityType: "system",
        userName: "SYSTEM:ProactiveTaskGenerator",
        details: JSON.stringify({ orgId, tasksCreated, venturesProcessed }),
        result: "success",
      });
    } catch { /* non-critical */ }
  }

  return { tasksCreated, venturesProcessed, eventsLogged };
}
