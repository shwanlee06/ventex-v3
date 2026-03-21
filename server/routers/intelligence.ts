import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import {
  dailyBriefs, smartAlerts, aiObservations, ventures, tasks,
  distributions, spvs, activityLog, documentIntelligence,
  ventureRisks, teamMembers, notifications,
} from "../../drizzle/schema";
import { eq, desc, and, sql, gte, lte, ne } from "drizzle-orm";
import { invokeLLM } from "../_core/llm";

// ── Daily Brief Generator ──────────────────────────────────────────────

async function generateDailyBriefContent(db: any): Promise<{
  headline: string;
  priorityItems: { type: string; description: string; venture?: string; action?: string; daysRemaining?: number }[];
  portfolioHealth: string;
  recommendedActions: string[];
  winsThisWeek: string[];
}> {
  // Gather context
  const allVentures = await db.select().from(ventures);
  const allTasks = await db.select().from(tasks);
  const recentActivity = await db.select().from(activityLog).orderBy(desc(activityLog.createdAt)).limit(20);
  const allSpvs = await db.select().from(spvs);
  const allDistributions = await db.select().from(distributions);
  const recentDocs = await db.select().from(documentIntelligence)
    .where(eq(documentIntelligence.processingStatus, "completed"))
    .orderBy(desc(documentIntelligence.processedAt)).limit(10);
  const allRisks = await db.select().from(ventureRisks);

  const overdueTasks = allTasks.filter((t: any) => {
    if (!t.dueDate || t.status === "complete") return false;
    return new Date(t.dueDate) < new Date();
  });

  const activeVentures = allVentures.filter((v: any) => v.status === "In progress");
  const activeSpvs = allSpvs.filter((s: any) => s.stage === "Active deal" || s.stage === "In negotiation");

  const contextSummary = `
Portfolio: ${allVentures.length} ventures (${activeVentures.length} active), ${allSpvs.length} SPVs (${activeSpvs.length} active)
Tasks: ${allTasks.length} total, ${overdueTasks.length} overdue
Risks: ${allRisks.length} identified risks across ventures
Recent documents: ${recentDocs.length} analyzed in last period
Distributions: ${allDistributions.length} total

Active ventures: ${activeVentures.map((v: any) => `${v.name} (${v.sector}, ${v.location})`).join("; ")}
Overdue tasks: ${overdueTasks.map((t: any) => `"${t.title}" due ${t.dueDate}`).join("; ")}
Active SPVs: ${activeSpvs.map((s: any) => `${s.name} (${s.stage}, ${s.priority})`).join("; ")}
Recent risks: ${allRisks.slice(0, 5).map((r: any) => r.riskDescription).join("; ")}
Recent activity: ${recentActivity.slice(0, 5).map((a: any) => `${a.action}: ${a.detail}`).join("; ")}
  `.trim();

  const result = await invokeLLM({
    messages: [
      {
        role: "system",
        content: `You are the AI intelligence officer for Royalton Venture Holding, a multi-sector venture holding company. Generate a concise daily brief for the executive team. Be specific, actionable, and data-driven.`,
      },
      {
        role: "user",
        content: `Generate today's daily brief based on this portfolio data:

${contextSummary}

Return JSON with:
- headline: one-line headline for today (e.g., "3 overdue tasks need attention; Marina Bay SPV entering final negotiation")
- priorityItems: array of {type: "overdue_task"|"risk"|"deadline"|"opportunity"|"milestone", description, venture (name), action (recommended), daysRemaining (if applicable, else 0)}
- portfolioHealth: one of "excellent", "good", "attention_needed", "critical"
- recommendedActions: array of 3-5 specific action items for today
- winsThisWeek: array of 1-3 positive developments or completed milestones

Return ONLY valid JSON.`,
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "daily_brief",
        strict: true,
        schema: {
          type: "object",
          properties: {
            headline: { type: "string" },
            priorityItems: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  type: { type: "string" },
                  description: { type: "string" },
                  venture: { type: "string" },
                  action: { type: "string" },
                  daysRemaining: { type: "number" },
                },
                required: ["type", "description", "venture", "action", "daysRemaining"],
                additionalProperties: false,
              },
            },
            portfolioHealth: { type: "string" },
            recommendedActions: { type: "array", items: { type: "string" } },
            winsThisWeek: { type: "array", items: { type: "string" } },
          },
          required: ["headline", "priorityItems", "portfolioHealth", "recommendedActions", "winsThisWeek"],
          additionalProperties: false,
        },
      },
    },
  });

  const content = result.choices[0]?.message?.content;
  const text = typeof content === "string" ? content : "";
  try {
    return JSON.parse(text);
  } catch {
    return {
      headline: "Daily brief generation encountered an issue",
      priorityItems: [],
      portfolioHealth: "good",
      recommendedActions: ["Review overdue tasks", "Check active SPV status"],
      winsThisWeek: [],
    };
  }
}

// ── Venture Health Score Calculator ────────────────────────────────────

async function calculateVentureHealthScore(db: any, ventureId: number): Promise<number> {
  const ventureTasks = await db.select().from(tasks).where(eq(tasks.ventureId, ventureId));
  const ventureRiskRows = await db.select().from(ventureRisks).where(eq(ventureRisks.ventureId, ventureId));

  let score = 70; // Base score

  // Task completion rate
  const completedTasks = ventureTasks.filter((t: any) => t.status === "complete").length;
  const totalTasks = ventureTasks.length;
  if (totalTasks > 0) {
    const completionRate = completedTasks / totalTasks;
    score += Math.round(completionRate * 15); // Up to +15
  }

  // Overdue tasks penalty
  const overdueTasks = ventureTasks.filter((t: any) => {
    if (!t.dueDate || t.status === "complete") return false;
    return new Date(t.dueDate) < new Date();
  });
  score -= overdueTasks.length * 5; // -5 per overdue task

  // Active risks penalty
  const activeRisks = ventureRiskRows.filter((r: any) => r.status === "Monitoring");
  score -= activeRisks.length * 3; // -3 per active risk

  // Clamp between 0-100
  return Math.max(0, Math.min(100, score));
}

// ── Smart Alerts Generator ─────────────────────────────────────────────

async function generateSmartAlerts(db: any): Promise<void> {
  const allTasks = await db.select().from(tasks);
  const allVentures = await db.select().from(ventures);
  const allRisks = await db.select().from(ventureRisks);

  // Check for overdue tasks
  for (const task of allTasks) {
    if (!task.dueDate || task.status === "complete") continue;
    const daysOverdue = Math.ceil((Date.now() - new Date(task.dueDate).getTime()) / (1000 * 60 * 60 * 24));
    if (daysOverdue > 0) {
      const venture = allVentures.find((v: any) => v.id === task.ventureId);
      // Check if alert already exists
      const existing = await db.select().from(smartAlerts)
        .where(and(
          eq(smartAlerts.entityType, "task"),
          eq(smartAlerts.entityId, task.id),
          eq(smartAlerts.alertType, "overdue_task"),
        )).limit(1);

      if (existing.length === 0) {
        await db.insert(smartAlerts).values({
          severity: daysOverdue > 7 ? "critical" : "warning",
          alertType: "overdue_task",
          message: `Task "${task.title}" is ${daysOverdue} days overdue${venture ? ` (${venture.name})` : ""}`,
          entityType: "task",
          entityId: task.id,
          entityName: task.title,
          actionUrl: venture ? `/ventures/${venture.slug}` : "/ventures",
        });
      }
    }
  }

  // Check for ventures with many active risks
  for (const venture of allVentures) {
    const risksForVenture = allRisks.filter((r: any) => r.ventureId === venture.id && r.status === "Monitoring");
    if (risksForVenture.length >= 3) {
      const existing = await db.select().from(smartAlerts)
        .where(and(
          eq(smartAlerts.entityType, "venture"),
          eq(smartAlerts.entityId, venture.id),
          eq(smartAlerts.alertType, "high_risk_venture"),
        )).limit(1);

      if (existing.length === 0) {
        await db.insert(smartAlerts).values({
          severity: "warning",
          alertType: "high_risk_venture",
          message: `${venture.name} has ${risksForVenture.length} active risks that need attention`,
          entityType: "venture",
          entityId: venture.id,
          entityName: venture.name,
          actionUrl: `/ventures/${venture.slug}`,
        });
      }
    }
  }
}

// ── Router ─────────────────────────────────────────────────────────────

export const intelligenceRouter = router({
  // Generate or get today's daily brief
  getDailyBrief: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) return null;

    const today = new Date().toISOString().split("T")[0];
    const existing = await db.select().from(dailyBriefs)
      .where(eq(dailyBriefs.briefDate, today)).limit(1);

    if (existing.length > 0) return existing[0];
    return null;
  }),

  // Generate a new daily brief
  generateDailyBrief: publicProcedure.mutation(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const today = new Date().toISOString().split("T")[0];

    // Delete existing brief for today
    await db.delete(dailyBriefs).where(eq(dailyBriefs.briefDate, today));

    const content = await generateDailyBriefContent(db);

    const [inserted] = await db.insert(dailyBriefs).values({
      briefDate: today,
      headline: content.headline,
      priorityItems: content.priorityItems,
      portfolioHealth: content.portfolioHealth,
      recommendedActions: content.recommendedActions,
      winsThisWeek: content.winsThisWeek,
    });

    const [brief] = await db.select().from(dailyBriefs)
      .where(eq(dailyBriefs.briefDate, today)).limit(1);

    return brief;
  }),

  // Get past briefs
  getBriefHistory: publicProcedure
    .input(z.object({ limit: z.number().default(7) }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      return db.select().from(dailyBriefs)
        .orderBy(desc(dailyBriefs.generatedAt))
        .limit(input.limit);
    }),

  // Get venture health score
  getVentureHealth: publicProcedure
    .input(z.object({ ventureId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { score: 50 };
      const score = await calculateVentureHealthScore(db, input.ventureId);

      // Update the venture's health score in DB
      await db.update(ventures)
        .set({ healthScore: score })
        .where(eq(ventures.id, input.ventureId));

      return { score };
    }),

  // Get all venture health scores
  getAllVentureHealth: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    const allVentures = await db.select({
      id: ventures.id,
      name: ventures.name,
      healthScore: ventures.healthScore,
      sector: ventures.sector,
      slug: ventures.slug,
    }).from(ventures);
    return allVentures;
  }),

  // Refresh all health scores
  refreshAllHealthScores: publicProcedure.mutation(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const allVentures = await db.select().from(ventures);
    for (const venture of allVentures) {
      const score = await calculateVentureHealthScore(db, venture.id);
      await db.update(ventures)
        .set({ healthScore: score })
        .where(eq(ventures.id, venture.id));
    }
    return { success: true, count: allVentures.length };
  }),

  // Get smart alerts
  getSmartAlerts: publicProcedure
    .input(z.object({ includeDissmissed: z.boolean().default(false) }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      const conditions = input.includeDissmissed
        ? []
        : [eq(smartAlerts.dismissed, 0)];
      return db.select().from(smartAlerts)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(smartAlerts.createdAt))
        .limit(20);
    }),

  // Refresh smart alerts (regenerate)
  refreshSmartAlerts: publicProcedure.mutation(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    await generateSmartAlerts(db);
    return { success: true };
  }),

  // Dismiss a smart alert
  dismissAlert: publicProcedure
    .input(z.object({ alertId: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db.update(smartAlerts)
        .set({ dismissed: 1 })
        .where(eq(smartAlerts.id, input.alertId));
      return { success: true };
    }),

  // Get AI observations
  getObservations: publicProcedure
    .input(z.object({
      ventureId: z.number().optional(),
      limit: z.number().default(10),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      const conditions = [];
      if (input.ventureId) conditions.push(eq(aiObservations.ventureId, input.ventureId));
      conditions.push(eq(aiObservations.dismissed, 0));
      return db.select().from(aiObservations)
        .where(and(...conditions))
        .orderBy(desc(aiObservations.createdAt))
        .limit(input.limit);
    }),

  // Dismiss an observation
  dismissObservation: publicProcedure
    .input(z.object({ observationId: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db.update(aiObservations)
        .set({ dismissed: 1 })
        .where(eq(aiObservations.id, input.observationId));
      return { success: true };
    }),

  // Accept observation and create task
  acceptObservation: publicProcedure
    .input(z.object({ observationId: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const [obs] = await db.select().from(aiObservations)
        .where(eq(aiObservations.id, input.observationId)).limit(1);

      if (!obs) throw new Error("Observation not found");

      if (obs.suggestedTaskTitle) {
        const dueDate = obs.suggestedDueDays
          ? new Date(Date.now() + obs.suggestedDueDays * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
          : null;

        await db.insert(tasks).values({
          title: obs.suggestedTaskTitle,
          ventureId: obs.ventureId,
          dueDate,
          status: "open",
          priority: "Medium",
          description: obs.recommendedAction || "",
          assigneeNames: obs.suggestedAssignee ? [obs.suggestedAssignee] : null,
        });
      }

      await db.update(aiObservations)
        .set({ dismissed: 1 })
        .where(eq(aiObservations.id, input.observationId));

      return { success: true };
    }),

  // Generate AI observations for a venture
  generateObservations: publicProcedure
    .input(z.object({ ventureId: z.number().optional() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const allVentures = input.ventureId
        ? await db.select().from(ventures).where(eq(ventures.id, input.ventureId))
        : await db.select().from(ventures);

      const allTasks = await db.select().from(tasks);
      const allRisks = await db.select().from(ventureRisks);
      const allTeam = await db.select().from(teamMembers);
      const recentDocs = await db.select().from(documentIntelligence)
        .where(eq(documentIntelligence.processingStatus, "completed"))
        .orderBy(desc(documentIntelligence.processedAt)).limit(20);

      const context = `
Ventures: ${allVentures.map((v: any) => `${v.name} (${v.sector}, status: ${v.status}, health: ${v.healthScore})`).join("; ")}
Tasks: ${allTasks.length} total, ${allTasks.filter((t: any) => t.status !== "complete").length} open
Risks: ${allRisks.map((r: any) => `${r.riskDescription} (${r.status})`).join("; ")}
Team: ${allTeam.map((t: any) => `${t.name} (${t.role})`).join("; ")}
Recent document insights: ${recentDocs.slice(0, 5).map((d: any) => d.summary).join("; ")}
      `.trim();

      const result = await invokeLLM({
        messages: [
          {
            role: "system",
            content: `You are the AI intelligence officer for Royalton Venture Holding. Generate 3-5 actionable observations about the portfolio. Each observation should identify a pattern, risk, opportunity, or recommendation.`,
          },
          {
            role: "user",
            content: `Based on this portfolio data, generate observations:

${context}

Return JSON array of observations, each with:
- observationType: "risk"|"opportunity"|"pattern"|"recommendation"|"anomaly"
- ventureId: number (match to a venture ID) or null for portfolio-wide
- ventureName: string or null
- observation: detailed observation text
- recommendedAction: what to do about it
- suggestedTaskTitle: a task title if one should be created, or null
- suggestedAssignee: team member name or null
- suggestedDueDays: number of days from now for the task, or 0

Return ONLY valid JSON array.`,
          },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "observations",
            strict: true,
            schema: {
              type: "object",
              properties: {
                observations: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      observationType: { type: "string" },
                      ventureId: { type: "number" },
                      ventureName: { type: "string" },
                      observation: { type: "string" },
                      recommendedAction: { type: "string" },
                      suggestedTaskTitle: { type: "string" },
                      suggestedAssignee: { type: "string" },
                      suggestedDueDays: { type: "number" },
                    },
                    required: ["observationType", "ventureId", "ventureName", "observation", "recommendedAction", "suggestedTaskTitle", "suggestedAssignee", "suggestedDueDays"],
                    additionalProperties: false,
                  },
                },
              },
              required: ["observations"],
              additionalProperties: false,
            },
          },
        },
      });

      const content = result.choices[0]?.message?.content;
      const text = typeof content === "string" ? content : "";
      let observations: any[] = [];
      try {
        const parsed = JSON.parse(text);
        observations = parsed.observations || [];
      } catch {
        observations = [];
      }

      let count = 0;
      for (const obs of observations) {
        await db.insert(aiObservations).values({
          observationType: obs.observationType || "recommendation",
          ventureId: obs.ventureId || null,
          ventureName: obs.ventureName || null,
          observation: obs.observation,
          recommendedAction: obs.recommendedAction || null,
          suggestedTaskTitle: obs.suggestedTaskTitle || null,
          suggestedAssignee: obs.suggestedAssignee || null,
          suggestedDueDays: obs.suggestedDueDays || 0,
        });
        count++;
      }

      return { success: true, count };
    }),
});
