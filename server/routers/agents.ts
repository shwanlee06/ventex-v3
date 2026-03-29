import { z } from "zod";
import { partnerProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { agentEvents, tasks, ventures, distributions } from "../../drizzle/schema";
import { eq, and, lt, gte, desc, sql, isNull } from "drizzle-orm";
import { invokeLLM } from "../_core/llm";

// ── Types ──────────────────────────────────────────────
type AgentSeverity = "info" | "warning" | "critical";

interface AgentStatus {
  name: string;
  displayName: string;
  icon: string;
  status: "active" | "running" | "idle" | "error";
  lastRun: number | null; // unix ms
  lastSignal: string | null;
  intervalMs: number;
  eventsToday: number;
  isPaused: boolean;
}

// ── In-memory agent state (per server process) ─────────
const agentState: Map<string, AgentStatus> = new Map([
  ["overdue", {
    name: "overdue", displayName: "Overdue Agent", icon: "🔴",
    status: "idle", lastRun: null, lastSignal: null,
    intervalMs: 60_000, eventsToday: 0, isPaused: false,
  }],
  ["venture", {
    name: "venture", displayName: "Venture Agent", icon: "⚡",
    status: "idle", lastRun: null, lastSignal: null,
    intervalMs: 120_000, eventsToday: 0, isPaused: false,
  }],
  ["distribution", {
    name: "distribution", displayName: "Distribution Sentinel", icon: "💰",
    status: "idle", lastRun: null, lastSignal: null,
    intervalMs: 300_000, eventsToday: 0, isPaused: false,
  }],
  ["orchestrator", {
    name: "orchestrator", displayName: "Orchestrator", icon: "🧠",
    status: "idle", lastRun: null, lastSignal: null,
    intervalMs: 180_000, eventsToday: 0, isPaused: false,
  }],
]);

// ── LLM helper (short, fast calls for agent signals) ───
async function callAgentLLM(system: string, userContent: string): Promise<string> {
  try {
    const result = await invokeLLM({
      messages: [
        { role: "system", content: system },
        { role: "user", content: userContent },
      ],
      maxTokens: 150,
    });
    const content = result.choices?.[0]?.message?.content;
    if (typeof content === "string") return content.trim();
    if (Array.isArray(content)) {
      const textPart = content.find((p: any) => p.type === "text");
      return (textPart as any)?.text?.trim() ?? "Signal unavailable";
    }
    return "Signal unavailable";
  } catch {
    return "Signal unavailable";
  }
}

// ── Agent Execution Logic ──────────────────────────────

async function runOverdueAgent(): Promise<number> {
  const db = await getDb();
  if (!db) return 0;

  const now = new Date();
  const todayStr = now.toISOString().split("T")[0];

  // Find open tasks past due date
  const overdueTasks = await db
    .select({
      id: tasks.id,
      title: tasks.title,
      dueDate: tasks.dueDate,
      status: tasks.status,
      ventureId: tasks.ventureId,
    })
    .from(tasks)
    .where(
      and(
        eq(tasks.status, "open"),
        lt(tasks.dueDate, todayStr)
      )
    )
    .limit(10);

  if (overdueTasks.length === 0) return 0;

  let eventCount = 0;

  for (const task of overdueTasks) {
    if (!task.dueDate) continue;

    const daysOverdue = Math.floor(
      (Date.now() - new Date(task.dueDate).getTime()) / (1000 * 60 * 60 * 24)
    );

    const severity: AgentSeverity =
      daysOverdue > 21 ? "critical" :
      daysOverdue > 7 ? "warning" : "info";

    // Get venture name for context
    let ventureName = "Unknown venture";
    let ventureSector = "Unknown";
    if (task.ventureId) {
      const [venture] = await db
        .select({ name: ventures.name, sector: ventures.sector })
        .from(ventures)
        .where(eq(ventures.id, task.ventureId))
        .limit(1);
      if (venture) {
        ventureName = venture.name;
        ventureSector = venture.sector;
      }
    }

    // Move task to overdue status
    await db.update(tasks).set({ status: "overdue" }).where(eq(tasks.id, task.id));

    // For critical tasks, use LLM to generate escalation message
    let message = `${task.title} on ${ventureName} moved to overdue — ${daysOverdue} days past due date`;

    if (severity === "critical") {
      const llmMessage = await callAgentLLM(
        `You are the Overdue Agent for ATLAS, a venture intelligence platform for a UHNWI holding company. Generate ONE urgent escalation message (max 15 words). Name the task and venture. Be direct. No preamble. No filler.`,
        `Task: "${task.title}" | Venture: ${ventureName} | Sector: ${ventureSector} | Days overdue: ${daysOverdue}`
      );
      if (llmMessage !== "Signal unavailable") message = llmMessage;
    }

    await db.insert(agentEvents).values({
      agentName: "Overdue Agent",
      eventType: "status_change",
      message,
      severity,
      entityType: "task",
      entityId: String(task.id),
      entityName: task.title,
      oldStatus: "open",
      newStatus: "overdue",
      isRead: false,
    });

    eventCount++;
  }

  return eventCount;
}

async function runVentureAgent(): Promise<number> {
  const db = await getDb();
  if (!db) return 0;

  const allVentures = await db
    .select({
      id: ventures.id,
      name: ventures.name,
      sector: ventures.sector,
      stage: ventures.stage,
    })
    .from(ventures)
    .limit(25);

  let eventCount = 0;

  for (const venture of allVentures) {
    // Count tasks by status for this venture
    const ventureTasks = await db
      .select({ id: tasks.id, status: tasks.status })
      .from(tasks)
      .where(eq(tasks.ventureId, venture.id));

    const totalTasks = ventureTasks.length;
    const completedTasks = ventureTasks.filter(t => t.status === "complete").length;

    // All tasks complete → advance stage
    if (totalTasks > 0 && completedTasks === totalTasks) {
      const stageMap: Record<string, string> = {
        "In Validation": "In Fundraising",
        "In Fundraising": "Active Ventures",
        "Active Ventures": "Completed",
      };
      const nextStage = stageMap[venture.stage];

      if (nextStage) {
        await db.update(ventures).set({ stage: nextStage }).where(eq(ventures.id, venture.id));

        await db.insert(agentEvents).values({
          agentName: "Venture Agent",
          eventType: "status_change",
          message: `${venture.name} advanced: ${venture.stage} → ${nextStage}. All ${totalTasks} tasks complete.`,
          severity: "info",
          entityType: "venture",
          entityId: String(venture.id),
          entityName: venture.name,
          oldStatus: venture.stage,
          newStatus: nextStage,
          isRead: false,
        });
        eventCount++;
      }
    }

    // 0 tasks and In Validation → stall warning (check if warned recently)
    if (totalTasks === 0 && venture.stage === "In Validation") {
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const recent = await db
        .select({ id: agentEvents.id })
        .from(agentEvents)
        .where(
          and(
            eq(agentEvents.entityId, String(venture.id)),
            eq(agentEvents.eventType, "notification"),
            gte(agentEvents.createdAt, weekAgo)
          )
        )
        .limit(1);

      if (recent.length === 0) {
        await db.insert(agentEvents).values({
          agentName: "Venture Agent",
          eventType: "notification",
          message: `${venture.name} is stalled in Validation with no tasks assigned — intervention required`,
          severity: "warning",
          entityType: "venture",
          entityId: String(venture.id),
          entityName: venture.name,
          isRead: false,
        });
        eventCount++;
      }
    }
  }

  return eventCount;
}

async function runDistributionAgent(): Promise<number> {
  const db = await getDb();
  if (!db) return 0;

  const scheduledDists = await db
    .select({
      id: distributions.id,
      name: distributions.name,
      fund: distributions.fund,
      amount: distributions.amount,
      distributionDate: distributions.distributionDate,
      status: distributions.status,
    })
    .from(distributions)
    .where(eq(distributions.status, "Scheduled"));

  let eventCount = 0;

  for (const dist of scheduledDists) {
    if (!dist.distributionDate) continue;

    const daysUntil = Math.floor(
      (new Date(dist.distributionDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );

    // Avoid duplicate alerts — check last 24h
    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recent = await db
      .select({ id: agentEvents.id })
      .from(agentEvents)
      .where(
        and(
          eq(agentEvents.entityId, String(dist.id)),
          gte(agentEvents.createdAt, dayAgo)
        )
      )
      .limit(1);

    if (recent.length > 0) continue;

    const fundName = dist.fund || dist.name;
    const amountStr = `$${(dist.amount ?? 0).toLocaleString()}`;

    if (daysUntil < 0) {
      await db.insert(agentEvents).values({
        agentName: "Distribution Sentinel",
        eventType: "escalation",
        message: `OVERDUE DISTRIBUTION: ${fundName} — ${amountStr} was due ${Math.abs(daysUntil)} days ago`,
        severity: "critical",
        entityType: "distribution",
        entityId: String(dist.id),
        entityName: fundName,
        isRead: false,
      });
      eventCount++;
    } else if (daysUntil <= 7) {
      await db.insert(agentEvents).values({
        agentName: "Distribution Sentinel",
        eventType: "notification",
        message: `${fundName} distribution of ${amountStr} due in ${daysUntil} days — action required`,
        severity: "critical",
        entityType: "distribution",
        entityId: String(dist.id),
        entityName: fundName,
        isRead: false,
      });
      eventCount++;
    } else if (daysUntil <= 30) {
      await db.insert(agentEvents).values({
        agentName: "Distribution Sentinel",
        eventType: "notification",
        message: `Upcoming: ${fundName} ${amountStr} due in ${daysUntil} days`,
        severity: "warning",
        entityType: "distribution",
        entityId: String(dist.id),
        entityName: fundName,
        isRead: false,
      });
      eventCount++;
    }
  }

  return eventCount;
}

async function runOrchestratorAgent(): Promise<number> {
  const db = await getDb();
  if (!db) return 0;

  // Don't fire if orchestrator already ran in last 3 min
  const threeMinAgo = new Date(Date.now() - 3 * 60 * 1000);
  const recentOrch = await db
    .select({ id: agentEvents.id })
    .from(agentEvents)
    .where(
      and(
        eq(agentEvents.agentName, "Orchestrator"),
        gte(agentEvents.createdAt, threeMinAgo)
      )
    )
    .limit(1);

  if (recentOrch.length > 0) return 0;

  // Build portfolio snapshot
  const allVentures = await db
    .select({ name: ventures.name, sector: ventures.sector, stage: ventures.stage, healthScore: ventures.healthScore })
    .from(ventures)
    .limit(25);

  const allTasks = await db
    .select({ status: tasks.status })
    .from(tasks)
    .limit(50);

  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const recentEvents = await db
    .select({ agentName: agentEvents.agentName, message: agentEvents.message, severity: agentEvents.severity })
    .from(agentEvents)
    .where(gte(agentEvents.createdAt, dayAgo))
    .orderBy(desc(agentEvents.createdAt))
    .limit(10);

  const overdueCount = allTasks.filter(t => t.status === "overdue").length;
  const openCount = allTasks.filter(t => t.status === "open").length;
  const completeCount = allTasks.filter(t => t.status === "complete").length;

  const snapshot = `
VENTURES (${allVentures.length} total):
${allVentures.map(v => `- ${v.name} | ${v.sector} | ${v.stage} | Health: ${v.healthScore}`).join("\n")}

TASKS: ${overdueCount} overdue, ${openCount} open, ${completeCount} complete

RECENT AGENT SIGNALS (last 24h):
${recentEvents.map(e => `- [${e.severity}] ${e.agentName}: ${e.message}`).join("\n") || "No recent signals"}
  `.trim();

  const message = await callAgentLLM(
    `You are the ATLAS Orchestrator — the master intelligence agent for a UHNWI holding company venture portfolio. You receive signals from all other agents and the full portfolio state. Your job is to detect ONE cross-vertical pattern or portfolio-level insight that no single-vertical agent can see. Max 2 sentences. Name specific ventures or sectors. State the recommended action. Be direct. No preamble. No filler.`,
    snapshot
  );

  // Classify severity from language
  const lower = message.toLowerCase();
  const severity: AgentSeverity =
    /urgent|critical|immediate|risk|overdue|fail/.test(lower) ? "critical" :
    /warning|attention|monitor|stall|concern/.test(lower) ? "warning" : "info";

  await db.insert(agentEvents).values({
    agentName: "Orchestrator",
    eventType: "notification",
    message,
    severity,
    isRead: false,
  });

  return 1;
}

// ── Agent runner map ───────────────────────────────────
const agentRunners: Record<string, () => Promise<number>> = {
  overdue: runOverdueAgent,
  venture: runVentureAgent,
  distribution: runDistributionAgent,
  orchestrator: runOrchestratorAgent,
};

// ── tRPC Router ────────────────────────────────────────
export const agentsRouter = router({
  // Run a specific agent (or all)
  run: partnerProcedure
    .input(z.object({ agentName: z.string() }))
    .mutation(async ({ input }) => {
      const { agentName } = input;
      const state = agentState.get(agentName);
      if (!state) throw new Error(`Unknown agent: ${agentName}`);
      if (state.isPaused) return { eventsCreated: 0, status: "paused" as const };

      // Mark as running
      agentState.set(agentName, { ...state, status: "running" });

      try {
        const runner = agentRunners[agentName];
        if (!runner) throw new Error(`No runner for: ${agentName}`);

        const eventsCreated = await runner();

        // Get last signal
        const db = await getDb();
        let lastSignal: string | null = null;
        if (db) {
          const [latest] = await db
            .select({ message: agentEvents.message })
            .from(agentEvents)
            .where(eq(agentEvents.agentName, state.displayName))
            .orderBy(desc(agentEvents.createdAt))
            .limit(1);
          lastSignal = latest?.message ?? null;
        }

        // Count today's events
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        let eventsToday = state.eventsToday + eventsCreated;
        if (db) {
          const [count] = await db
            .select({ count: sql<number>`count(*)` })
            .from(agentEvents)
            .where(
              and(
                eq(agentEvents.agentName, state.displayName),
                gte(agentEvents.createdAt, todayStart)
              )
            );
          eventsToday = count?.count ?? eventsToday;
        }

        agentState.set(agentName, {
          ...state,
          status: "active",
          lastRun: Date.now(),
          lastSignal,
          eventsToday,
          isPaused: false,
        });

        return { eventsCreated, status: "active" as const };
      } catch (err) {
        agentState.set(agentName, { ...state, status: "error", lastRun: Date.now() });
        return { eventsCreated: 0, status: "error" as const };
      }
    }),

  // Toggle pause state
  togglePause: partnerProcedure
    .input(z.object({ agentName: z.string() }))
    .mutation(({ input }) => {
      const state = agentState.get(input.agentName);
      if (!state) throw new Error(`Unknown agent: ${input.agentName}`);
      const newPaused = !state.isPaused;
      agentState.set(input.agentName, {
        ...state,
        isPaused: newPaused,
        status: newPaused ? "idle" : state.status,
      });
      return { isPaused: newPaused };
    }),

  // Get statuses of all agents
  statuses: partnerProcedure.query(() => {
    return Array.from(agentState.values());
  }),

  // Get recent events (paginated)
  events: partnerProcedure
    .input(z.object({
      limit: z.number().min(1).max(100).default(50),
      offset: z.number().min(0).default(0),
      agentName: z.string().optional(),
      severity: z.string().optional(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { events: [], total: 0 };

      const conditions = [];
      if (input.agentName) conditions.push(eq(agentEvents.agentName, input.agentName));
      if (input.severity) conditions.push(eq(agentEvents.severity, input.severity));

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const events = await db
        .select()
        .from(agentEvents)
        .where(whereClause)
        .orderBy(desc(agentEvents.createdAt))
        .limit(input.limit)
        .offset(input.offset);

      const [countResult] = await db
        .select({ count: sql<number>`count(*)` })
        .from(agentEvents)
        .where(whereClause);

      return { events, total: countResult?.count ?? 0 };
    }),

  // Get unread counts
  unreadCounts: partnerProcedure.query(async () => {
    const db = await getDb();
    if (!db) return { total: 0, critical: 0, warning: 0, info: 0 };

    const [total] = await db
      .select({ count: sql<number>`count(*)` })
      .from(agentEvents)
      .where(eq(agentEvents.isRead, false));

    const [critical] = await db
      .select({ count: sql<number>`count(*)` })
      .from(agentEvents)
      .where(and(eq(agentEvents.isRead, false), eq(agentEvents.severity, "critical")));

    const [warning] = await db
      .select({ count: sql<number>`count(*)` })
      .from(agentEvents)
      .where(and(eq(agentEvents.isRead, false), eq(agentEvents.severity, "warning")));

    const [info] = await db
      .select({ count: sql<number>`count(*)` })
      .from(agentEvents)
      .where(and(eq(agentEvents.isRead, false), eq(agentEvents.severity, "info")));

    return {
      total: total?.count ?? 0,
      critical: critical?.count ?? 0,
      warning: warning?.count ?? 0,
      info: info?.count ?? 0,
    };
  }),

  // Mark single event as read
  markRead: partnerProcedure
    .input(z.object({ eventId: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) return { success: false };
      await db.update(agentEvents).set({ isRead: true }).where(eq(agentEvents.id, input.eventId));
      return { success: true };
    }),

  // Mark all events as read
  markAllRead: partnerProcedure.mutation(async () => {
    const db = await getDb();
    if (!db) return { success: false };
    await db.update(agentEvents).set({ isRead: true }).where(eq(agentEvents.isRead, false));
    return { success: true };
  }),
});
