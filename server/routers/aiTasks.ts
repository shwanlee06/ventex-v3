import { z } from "zod";
import { adminProcedure, router } from "../_core/trpc";
import { invokeLLM } from "../_core/llm";
import { getDb } from "../db";
import {
  organizations,
  orgVentureAccess,
  ventures,
  tasks,
  spvs,
  spvVentures,
  ventureTeam,
  teamMembers,
  distributions,
  documentIntelligence,
  ventureRisks,
  meetingBriefs,
  aiObservations,
  activityLog,
} from "../../drizzle/schema";
import { eq, inArray, desc, and } from "drizzle-orm";

interface SuggestedTask {
  title: string;
  description: string;
  priority: "High" | "Medium" | "Low";
  dueInDays: number;
  ventureName: string;
  ventureId: number | null;
  category: string;
  reasoning: string;
}

async function exportClientVentureData(organizationId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Get org info
  const [org] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.id, organizationId))
    .limit(1);
  if (!org) throw new Error("Organization not found");

  // Get venture IDs for this org
  const access = await db
    .select()
    .from(orgVentureAccess)
    .where(eq(orgVentureAccess.organizationId, organizationId));
  const ventureIds = access.map((a) => a.ventureId);

  if (ventureIds.length === 0) {
    return { org, ventures: [], tasks: [], spvs: [], team: [], distributions: [], documents: [], risks: [], meetings: [], observations: [] };
  }

  // Get ventures
  const orgVentures = await db
    .select()
    .from(ventures)
    .where(inArray(ventures.id, ventureIds));

  // Get all tasks for these ventures
  const orgTasks = await db
    .select()
    .from(tasks)
    .where(inArray(tasks.ventureId, ventureIds))
    .orderBy(desc(tasks.createdAt));

  // Get SPVs linked to these ventures
  const spvLinks = await db
    .select()
    .from(spvVentures)
    .where(inArray(spvVentures.ventureId, ventureIds));
  const spvIds = Array.from(new Set(spvLinks.map((s) => s.spvId)));
  const orgSpvs = spvIds.length > 0
    ? await db.select().from(spvs).where(inArray(spvs.id, spvIds))
    : [];

  // Get team members assigned to these ventures
  const teamLinks = await db
    .select()
    .from(ventureTeam)
    .where(inArray(ventureTeam.ventureId, ventureIds));
  const memberIds = Array.from(new Set(teamLinks.map((t) => t.memberId)));
  const orgTeam = memberIds.length > 0
    ? await db.select().from(teamMembers).where(inArray(teamMembers.id, memberIds))
    : [];

  // Get distributions for this org
  const orgDists = await db
    .select()
    .from(distributions)
    .where(eq(distributions.organizationId, organizationId));

  // Get document intelligence for these ventures
  const docs = await db
    .select()
    .from(documentIntelligence)
    .where(inArray(documentIntelligence.ventureId, ventureIds));

  // Get risks for these ventures
  const risks = await db
    .select()
    .from(ventureRisks)
    .where(inArray(ventureRisks.ventureId, ventureIds));

  // Get meeting briefs for these ventures
  const meetings = await db
    .select()
    .from(meetingBriefs)
    .where(inArray(meetingBriefs.ventureId, ventureIds));

  // Get AI observations for these ventures
  const observations = await db
    .select()
    .from(aiObservations)
    .where(inArray(aiObservations.ventureId, ventureIds));

  return {
    org,
    ventures: orgVentures,
    tasks: orgTasks,
    spvs: orgSpvs,
    team: orgTeam.map((m) => ({ id: m.id, name: m.name, role: m.role, status: m.status })),
    distributions: orgDists,
    documents: docs.map((d) => ({
      ventureId: d.ventureId,
      documentType: d.documentType,
      summary: d.summary,
      actionItems: d.actionItems,
      deadlines: d.deadlines,
      risksMentioned: d.risksMentioned,
    })),
    risks: risks.map((r) => ({
      ventureId: r.ventureId,
      riskDescription: r.riskDescription,
      status: r.status,
    })),
    meetings: meetings.map((m) => ({
      ventureId: m.ventureId,
      meetingDate: m.meetingDate,
      keyDecisions: m.keyDecisions,
      actionItems: m.actionItems,
      headline: m.headline,
    })),
    observations: observations.filter((o) => !o.dismissed).map((o) => ({
      ventureId: o.ventureId,
      ventureName: o.ventureName,
      observation: o.observation,
      recommendedAction: o.recommendedAction,
      suggestedTaskTitle: o.suggestedTaskTitle,
    })),
  };
}

function buildAnalysisPrompt(data: Awaited<ReturnType<typeof exportClientVentureData>>) {
  const now = new Date();
  const existingTaskTitles = data.tasks.map((t) => t.title.toLowerCase());

  const venturesSummary = data.ventures.map((v) => {
    const vTasks = data.tasks.filter((t) => t.ventureId === v.id);
    const openTasks = vTasks.filter((t) => t.status !== "complete");
    const overdueTasks = vTasks.filter(
      (t) => t.status !== "complete" && t.dueDate && new Date(t.dueDate) < now
    );
    const vRisks = data.risks.filter((r) => r.ventureId === v.id);
    const vDocs = data.documents.filter((d) => d.ventureId === v.id);
    const vMeetings = data.meetings.filter((m) => m.ventureId === v.id);
    const vObs = data.observations.filter((o) => o.ventureId === v.id);

    return `
VENTURE: "${v.name}" (ID: ${v.id})
  Sector: ${v.sector} | Location: ${v.location} | Stage: ${v.stage} | Status: ${v.status}
  Health Score: ${v.healthScore ?? "N/A"}/100 | Priority: ${v.priority}
  Current Status: ${v.currentStatus || "Not set"}
  Next Step: ${v.nextStep || "Not set"}
  Next Milestone: ${v.nextMilestone || "Not set"}
  Description: ${v.description || "None"}
  Open Tasks: ${openTasks.length} | Overdue Tasks: ${overdueTasks.length} | Completed: ${vTasks.length - openTasks.length}
  ${overdueTasks.length > 0 ? `  OVERDUE: ${overdueTasks.map((t) => `"${t.title}" (due ${t.dueDate})`).join(", ")}` : ""}
  ${vRisks.length > 0 ? `  RISKS: ${vRisks.map((r) => `[${r.status}] ${r.riskDescription}`).join("; ")}` : ""}
  ${vDocs.length > 0 ? `  DOCUMENTS: ${vDocs.map((d) => `[${d.documentType}] ${d.summary || "No summary"} ${d.actionItems?.length ? `Action items: ${d.actionItems.join("; ")}` : ""} ${d.deadlines?.length ? `Deadlines: ${d.deadlines.map((dl) => `${dl.description}: ${dl.date}`).join("; ")}` : ""}`).join(" | ")}` : ""}
  ${vMeetings.length > 0 ? `  MEETINGS: ${vMeetings.map((m) => `[${m.meetingDate}] ${m.headline || ""} ${m.actionItems?.length ? `Actions: ${m.actionItems.map((a) => `${a.item} (${a.assignee})`).join("; ")}` : ""}`).join(" | ")}` : ""}
  ${vObs.length > 0 ? `  AI OBSERVATIONS: ${vObs.map((o) => `${o.observation} → ${o.recommendedAction || "No action"}`).join("; ")}` : ""}`;
  }).join("\n");

  const spvSummary = data.spvs.length > 0
    ? `\nSPVs:\n${data.spvs.map((s) => `  "${s.name}" — Stage: ${s.stage} | Priority: ${s.priority} | Status: ${s.currentStatus || "N/A"} | Next: ${s.nextStep || "N/A"}`).join("\n")}`
    : "";

  const distSummary = data.distributions.length > 0
    ? `\nDistributions:\n${data.distributions.map((d) => `  "${d.name}" — $${(d.amount / 100).toLocaleString()} ${d.currency} | Status: ${d.status} | Date: ${d.distributionDate || "TBD"}`).join("\n")}`
    : "";

  const teamSummary = data.team.length > 0
    ? `\nTeam: ${data.team.map((m) => `${m.name} (${m.role})`).join(", ")}`
    : "";

  return `You are an AI venture intelligence agent for ATLAS, a venture holding company. You analyze client venture portfolios and determine what tasks need to be created to move ventures forward.

TODAY'S DATE: ${now.toISOString().split("T")[0]}

CLIENT: "${data.org.name}" (${data.org.slug})
${venturesSummary}
${spvSummary}
${distSummary}
${teamSummary}

EXISTING TASKS (do NOT suggest duplicates of these):
${existingTaskTitles.length > 0 ? existingTaskTitles.map((t) => `  - ${t}`).join("\n") : "  (none)"}

INSTRUCTIONS:
1. Analyze ALL venture data above — status, health scores, overdue items, risks, document action items, meeting action items, AI observations, next steps, milestones.
2. Identify tasks that NEED to be created based on the data. Focus on:
   - Overdue items that need follow-up
   - Risks that need mitigation actions
   - Document action items not yet tracked as tasks
   - Meeting action items not yet tracked as tasks
   - AI observations with recommended actions
   - Next steps and milestones that need task tracking
   - Low health scores that need intervention
   - SPV deals that need progression
   - Distribution follow-ups
3. Do NOT suggest tasks that duplicate existing tasks.
4. Each task should be specific, actionable, and tied to a venture.
5. Assign realistic due dates (in days from now) based on urgency.
6. Categorize each task: "follow-up", "risk-mitigation", "document-action", "meeting-action", "milestone", "health-intervention", "spv-progression", "distribution", "general".

Return ONLY a JSON array of task objects. Each object must have exactly these fields:
- title (string, concise action-oriented title)
- description (string, 1-2 sentences explaining what needs to be done and why)
- priority ("High", "Medium", or "Low")
- dueInDays (number, days from today)
- ventureName (string, the venture this task relates to)
- ventureId (number or null)
- category (string, one of the categories above)
- reasoning (string, brief explanation of why this task is needed based on the data)`;
}

export const aiTasksRouter = router({
  // Generate AI task suggestions for a client organization
  generateSuggestions: adminProcedure
    .input(z.object({ organizationId: z.number() }))
    .mutation(async ({ input }) => {
      const data = await exportClientVentureData(input.organizationId);

      if (data.ventures.length === 0) {
        return { suggestions: [], orgName: data.org.name, ventureCount: 0 };
      }

      const prompt = buildAnalysisPrompt(data);

      const result = await invokeLLM({
        messages: [
          { role: "user", content: prompt },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "task_suggestions",
            strict: true,
            schema: {
              type: "object",
              properties: {
                tasks: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      title: { type: "string" },
                      description: { type: "string" },
                      priority: { type: "string", enum: ["High", "Medium", "Low"] },
                      dueInDays: { type: "integer" },
                      ventureName: { type: "string" },
                      ventureId: { type: ["integer", "null"] },
                      category: { type: "string" },
                      reasoning: { type: "string" },
                    },
                    required: ["title", "description", "priority", "dueInDays", "ventureName", "ventureId", "category", "reasoning"],
                    additionalProperties: false,
                  },
                },
              },
              required: ["tasks"],
              additionalProperties: false,
            },
          },
        },
      });

      const content = result.choices[0]?.message?.content;
      if (!content || typeof content !== "string") {
        return { suggestions: [], orgName: data.org.name, ventureCount: data.ventures.length };
      }

      let parsed: { tasks: SuggestedTask[] };
      try {
        parsed = JSON.parse(content);
      } catch {
        return { suggestions: [], orgName: data.org.name, ventureCount: data.ventures.length };
      }

      // Validate venture IDs — map ventureName to actual ventureId if null
      const ventureNameMap = new Map(data.ventures.map((v) => [v.name.toLowerCase(), v.id]));
      const suggestions = (parsed.tasks || []).map((t) => {
        let ventureId = t.ventureId;
        if (!ventureId && t.ventureName) {
          ventureId = ventureNameMap.get(t.ventureName.toLowerCase()) || null;
        }
        // Compute due date
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + (t.dueInDays || 7));
        return {
          ...t,
          ventureId,
          dueDate: dueDate.toISOString().split("T")[0],
        };
      });

      return {
        suggestions,
        orgName: data.org.name,
        ventureCount: data.ventures.length,
      };
    }),

  // Approve and create selected tasks from AI suggestions
  approveAndCreate: adminProcedure
    .input(z.object({
      organizationId: z.number(),
      tasks: z.array(z.object({
        title: z.string(),
        description: z.string(),
        priority: z.string(),
        ventureId: z.number().nullable(),
        dueDate: z.string(),
        assigneeNames: z.array(z.string()).default([]),
      })),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const created: string[] = [];

      for (const task of input.tasks) {
        await db.insert(tasks).values({
          title: task.title,
          description: task.description,
          priority: task.priority,
          ventureId: task.ventureId,
          dueDate: task.dueDate,
          assigneeNames: task.assigneeNames,
          status: "open",
        });
        created.push(task.title);
      }

      // Get org name for activity log
      const [org] = await db
        .select()
        .from(organizations)
        .where(eq(organizations.id, input.organizationId))
        .limit(1);

      await db.insert(activityLog).values({
        entityType: "task",
        entityName: org?.name || "Unknown Client",
        action: "AI Tasks Generated",
        detail: `${created.length} tasks created by AI analysis for ${org?.name || "client"}: ${created.slice(0, 3).join(", ")}${created.length > 3 ? ` (+${created.length - 3} more)` : ""}`,
        userName: ctx.user.name || "System",
      });

      return { success: true, count: created.length, titles: created };
    }),

  // Get the raw venture data export for a client (for debugging / transparency)
  exportData: adminProcedure
    .input(z.object({ organizationId: z.number() }))
    .query(async ({ input }) => {
      const data = await exportClientVentureData(input.organizationId);
      return {
        orgName: data.org.name,
        ventureCount: data.ventures.length,
        taskCount: data.tasks.length,
        spvCount: data.spvs.length,
        teamSize: data.team.length,
        distributionCount: data.distributions.length,
        documentCount: data.documents.length,
        riskCount: data.risks.length,
        meetingCount: data.meetings.length,
        observationCount: data.observations.length,
      };
    }),
});
