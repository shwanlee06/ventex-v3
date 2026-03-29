// ============================================================================
// ATLAS Agent System — Layer 1: Autonomous Intelligence Agents
// Four agents: Overdue, Venture, Distribution Sentinel, Orchestrator
// ============================================================================

import { z } from "zod";
import { protectedProcedure, adminProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import {
  agentEvents,
  tasks,
  ventures,
  distributions,
} from "../../drizzle/schema";
import { eq, desc, sql, and, ne } from "drizzle-orm";
import { invokeLLM } from "../_core/llm";

// ── Agent Definitions ───────────────────────────────────────────────────

type AgentName = "Overdue Agent" | "Venture Agent" | "Distribution Sentinel" | "Orchestrator";
type EventType = "signal" | "alert" | "recommendation" | "status_change" | "summary";
type Severity = "info" | "warning" | "critical";

interface AgentSignal {
  agentName: AgentName;
  eventType: EventType;
  message: string;
  severity: Severity;
  entityType?: string;
  agentEntityId?: string;
  agentEntityName?: string;
  oldStatus?: string;
  newStatus?: string;
}

// ── LLM Helper ──────────────────────────────────────────────────────────

async function callAgentLLM(systemPrompt: string, userPrompt: string): Promise<string> {
  try {
    const result = await invokeLLM({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    });
    const content = result.choices?.[0]?.message?.content;
    if (typeof content === "string") return content;
    if (Array.isArray(content)) {
      const textPart = content.find((p) => typeof p === "object" && "type" in p && p.type === "text");
      if (textPart && "text" in textPart) return textPart.text;
    }
    return "No analysis available.";
  } catch (err) {
    console.error("[Agent LLM] Error:", err);
    return "Agent analysis temporarily unavailable.";
  }
}

// ── Agent Logic ─────────────────────────────────────────────────────────

async function runOverdueAgent(db: NonNullable<Awaited<ReturnType<typeof getDb>>>): Promise<AgentSignal[]> {
  const signals: AgentSignal[] = [];

  const overdueTasks = await db
    .select({
      id: tasks.id,
      title: tasks.title,
      dueDate: tasks.dueDate,
      ventureId: tasks.ventureId,
    })
    .from(tasks)
    .where(
      and(
        ne(tasks.status, "complete"),
        sql`${tasks.dueDate} IS NOT NULL AND ${tasks.dueDate} < NOW()`
      )
    );

  if (overdueTasks.length === 0) {
    signals.push({
      agentName: "Overdue Agent",
      eventType: "signal",
      message: "All tasks are on schedule. No overdue items detected.",
      severity: "info",
    });
    return signals;
  }

  const now = new Date();
  const critical = overdueTasks.filter((t) => {
    const due = new Date(t.dueDate!);
    return (now.getTime() - due.getTime()) / (1000 * 60 * 60 * 24) >= 14;
  });
  const warning = overdueTasks.filter((t) => {
    const due = new Date(t.dueDate!);
    const days = (now.getTime() - due.getTime()) / (1000 * 60 * 60 * 24);
    return days >= 7 && days < 14;
  });

  const taskSummary = overdueTasks
    .slice(0, 10)
    .map((t) => `- "${t.title}" (due: ${t.dueDate})`)
    .join("\n");

  const analysis = await callAgentLLM(
    "You are the Overdue Agent for ATLAS, a venture holding management system. Analyze overdue tasks and provide a concise 1-2 sentence intelligence signal. Be specific about risk levels and recommend priority actions. Use a professional, concise tone.",
    `There are ${overdueTasks.length} overdue tasks (${critical.length} critical, ${warning.length} warning):\n${taskSummary}\n\nProvide a brief intelligence signal.`
  );

  signals.push({
    agentName: "Overdue Agent",
    eventType: "alert",
    message: analysis,
    severity: critical.length > 0 ? "critical" : warning.length > 0 ? "warning" : "info",
    entityType: "task",
  });

  return signals;
}

async function runVentureAgent(db: NonNullable<Awaited<ReturnType<typeof getDb>>>): Promise<AgentSignal[]> {
  const signals: AgentSignal[] = [];

  const ventureList = await db
    .select({
      id: ventures.id,
      name: ventures.name,
      status: ventures.status,
      health: ventures.healthScore,
    })
    .from(ventures);

  if (ventureList.length === 0) {
    signals.push({
      agentName: "Venture Agent",
      eventType: "signal",
      message: "No ventures found in the system.",
      severity: "info",
    });
    return signals;
  }

  const atRisk = ventureList.filter((v) => v.health !== null && v.health < 50);
  const healthy = ventureList.filter((v) => v.health !== null && v.health >= 70);

  const ventureSummary = ventureList
    .slice(0, 10)
    .map((v) => `- "${v.name}" (status: ${v.status}, health: ${v.health ?? "N/A"})`)
    .join("\n");

  const analysis = await callAgentLLM(
    "You are the Venture Agent for ATLAS. Analyze venture portfolio health and provide a concise 1-2 sentence intelligence signal about portfolio status, risks, and opportunities. Be specific and actionable.",
    `Portfolio: ${ventureList.length} ventures (${healthy.length} healthy, ${atRisk.length} at risk):\n${ventureSummary}\n\nProvide a brief portfolio intelligence signal.`
  );

  signals.push({
    agentName: "Venture Agent",
    eventType: "signal",
    message: analysis,
    severity: atRisk.length > 3 ? "critical" : atRisk.length > 0 ? "warning" : "info",
    entityType: "venture",
  });

  return signals;
}

async function runDistributionSentinel(db: NonNullable<Awaited<ReturnType<typeof getDb>>>): Promise<AgentSignal[]> {
  const signals: AgentSignal[] = [];

  const recentDists = await db
    .select({
      id: distributions.id,
      amount: distributions.amount,
      status: distributions.status,
      distributionDate: distributions.distributionDate,
    })
    .from(distributions)
    .orderBy(desc(distributions.createdAt))
    .limit(20);

  if (recentDists.length === 0) {
    signals.push({
      agentName: "Distribution Sentinel",
      eventType: "signal",
      message: "No distributions recorded yet.",
      severity: "info",
    });
    return signals;
  }

  const pending = recentDists.filter((d) => d.status === "pending" || d.status === "Scheduled");
  const totalPending = pending.reduce((sum, d) => sum + Number(d.amount || 0), 0);

  const distSummary = recentDists
    .slice(0, 8)
    .map((d) => `- $${Number(d.amount || 0).toLocaleString()} (${d.status}, date: ${d.distributionDate || "N/A"})`)
    .join("\n");

  const analysis = await callAgentLLM(
    "You are the Distribution Sentinel for ATLAS. Monitor distribution flows and provide a concise 1-2 sentence intelligence signal about payment status, upcoming obligations, and any anomalies. Be specific about amounts.",
    `${recentDists.length} recent distributions (${pending.length} pending, $${totalPending.toLocaleString()} pending value):\n${distSummary}\n\nProvide a brief distribution intelligence signal.`
  );

  signals.push({
    agentName: "Distribution Sentinel",
    eventType: "signal",
    message: analysis,
    severity: totalPending > 1000000 ? "warning" : "info",
    entityType: "distribution",
  });

  return signals;
}

async function runOrchestrator(
  db: NonNullable<Awaited<ReturnType<typeof getDb>>>,
  agentSignals: AgentSignal[]
): Promise<AgentSignal[]> {
  const signals: AgentSignal[] = [];

  if (agentSignals.length === 0) {
    signals.push({
      agentName: "Orchestrator",
      eventType: "summary",
      message: "All systems nominal. No actionable signals from sub-agents.",
      severity: "info",
    });
    return signals;
  }

  const signalSummary = agentSignals
    .map((s) => `[${s.agentName}] (${s.severity}): ${s.message}`)
    .join("\n");

  const analysis = await callAgentLLM(
    "You are the Orchestrator for ATLAS, the master intelligence agent. Synthesize signals from sub-agents (Overdue Agent, Venture Agent, Distribution Sentinel) into a single executive briefing. Provide 1-2 sentences with the most critical insight and recommended action. Be decisive and specific.",
    `Sub-agent signals:\n${signalSummary}\n\nSynthesize into an executive briefing.`
  );

  const maxSeverity = agentSignals.some((s) => s.severity === "critical")
    ? "critical"
    : agentSignals.some((s) => s.severity === "warning")
    ? "warning"
    : "info";

  signals.push({
    agentName: "Orchestrator",
    eventType: "summary",
    message: analysis,
    severity: maxSeverity as Severity,
  });

  return signals;
}

// ── Persist Signals ─────────────────────────────────────────────────────

async function persistSignals(
  db: NonNullable<Awaited<ReturnType<typeof getDb>>>,
  signals: AgentSignal[]
): Promise<void> {
  if (signals.length === 0) return;

  for (const signal of signals) {
    await db.insert(agentEvents).values({
      agentName: signal.agentName,
      eventType: signal.eventType,
      message: signal.message,
      severity: signal.severity,
      entityType: signal.entityType ?? null,
      agentEntityId: signal.agentEntityId ?? null,
      agentEntityName: signal.agentEntityName ?? null,
      oldStatus: signal.oldStatus ?? null,
      newStatus: signal.newStatus ?? null,
      isRead: false,
    });
  }
}

// ── Router ──────────────────────────────────────────────────────────────

export const agentsRouter = router({
  /**
   * List recent agent events with optional filtering
   */
  list: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(50),
        agentName: z.string().optional(),
        severity: z.string().optional(),
      }).optional()
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      const limit = input?.limit ?? 50;

      const results = await db
        .select()
        .from(agentEvents)
        .orderBy(desc(agentEvents.createdAt))
        .limit(limit);

      // Apply filters in JS
      let filtered = results;
      if (input?.agentName) {
        filtered = filtered.filter((e) => e.agentName === input.agentName);
      }
      if (input?.severity) {
        filtered = filtered.filter((e) => e.severity === input.severity);
      }

      return filtered;
    }),

  /**
   * Get agent metrics/stats
   */
  metrics: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) return { total: 0, unread: 0, critical: 0, warning: 0, byAgent: {} as Record<string, number> };

    const allEvents = await db
      .select()
      .from(agentEvents)
      .orderBy(desc(agentEvents.createdAt))
      .limit(200);

    const unread = allEvents.filter((e) => !e.isRead).length;
    const critical = allEvents.filter((e) => e.severity === "critical").length;
    const warning = allEvents.filter((e) => e.severity === "warning").length;

    const byAgent: Record<string, number> = {};
    for (const e of allEvents) {
      byAgent[e.agentName] = (byAgent[e.agentName] || 0) + 1;
    }

    return {
      total: allEvents.length,
      unread,
      critical,
      warning,
      byAgent,
    };
  }),

  /**
   * Run all agents — admin only
   */
  runAll: adminProcedure.mutation(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const [overdueSignals, ventureSignals, distSignals] = await Promise.all([
      runOverdueAgent(db),
      runVentureAgent(db),
      runDistributionSentinel(db),
    ]);

    const allSubSignals = [...overdueSignals, ...ventureSignals, ...distSignals];
    const orchestratorSignals = await runOrchestrator(db, allSubSignals);

    const allSignals = [...allSubSignals, ...orchestratorSignals];
    await persistSignals(db, allSignals);

    return {
      success: true,
      signalCount: allSignals.length,
      signals: allSignals,
    };
  }),

  /**
   * Run a single agent — admin only
   */
  runSingle: adminProcedure
    .input(z.object({ agentName: z.enum(["overdue", "venture", "distribution", "orchestrator"]) }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      let signals: AgentSignal[] = [];

      switch (input.agentName) {
        case "overdue":
          signals = await runOverdueAgent(db);
          break;
        case "venture":
          signals = await runVentureAgent(db);
          break;
        case "distribution":
          signals = await runDistributionSentinel(db);
          break;
        case "orchestrator": {
          const recentEvents = await db
            .select()
            .from(agentEvents)
            .where(ne(agentEvents.agentName, "Orchestrator"))
            .orderBy(desc(agentEvents.createdAt))
            .limit(10);

          const subSignals: AgentSignal[] = recentEvents.map((e) => ({
            agentName: e.agentName as AgentName,
            eventType: e.eventType as EventType,
            message: e.message,
            severity: e.severity as Severity,
          }));
          signals = await runOrchestrator(db, subSignals);
          break;
        }
      }

      await persistSignals(db, signals);

      return {
        success: true,
        signalCount: signals.length,
        signals,
      };
    }),

  /**
   * Mark events as read
   */
  markRead: protectedProcedure
    .input(z.object({ ids: z.array(z.number()) }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) return { success: false };

      for (const id of input.ids) {
        await db
          .update(agentEvents)
          .set({ isRead: true })
          .where(eq(agentEvents.id, id));
      }

      return { success: true };
    }),

  /**
   * Mark all events as read
   */
  markAllRead: protectedProcedure.mutation(async () => {
    const db = await getDb();
    if (!db) return { success: false };

    await db
      .update(agentEvents)
      .set({ isRead: true })
      .where(eq(agentEvents.isRead, false));

    return { success: true };
  }),
});
