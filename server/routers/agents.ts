// ============================================================================
// ATLAS Agent System — Velocity Build: Action-Based Intelligence Agents
// Four agents: Overdue, Velocity, Distribution Sentinel, Orchestrator
// Every event carries an ACTION — not just awareness, but execution.
// ============================================================================

import { z } from "zod";
import { protectedProcedure, adminProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import {
  agentEvents,
  agentDrafts,
  ventureVelocity,
  tasks,
  ventures,
  distributions,
  ventureTeam,
  teamMembers,
} from "../../drizzle/schema";
import { eq, desc, sql, and, ne, gte } from "drizzle-orm";
import { invokeLLM } from "../_core/llm";

// ── Types ──────────────────────────────────────────────────────────────

type AgentName = "Overdue Agent" | "Velocity Agent" | "Distribution Sentinel" | "Orchestrator";
type EventType = "signal" | "alert" | "recommendation" | "status_change" | "summary";
type Severity = "info" | "warning" | "critical";
type ActionType = "notify" | "advance" | "draft" | "escalate";

interface AgentSignal {
  agentName: AgentName;
  eventType: EventType;
  message: string;
  severity: Severity;
  actionType?: ActionType;
  actionLabel?: string;
  actionPayload?: Record<string, unknown>;
  entityType?: string;
  agentEntityId?: string;
  agentEntityName?: string;
  oldStatus?: string;
  newStatus?: string;
}

// ── Stage Pipeline ─────────────────────────────────────────────────────

const STAGE_PIPELINE = [
  "In Validation",
  "In Fundraising",
  "Active Ventures",
  "Completed",
];

function getNextStage(current: string): string | null {
  const idx = STAGE_PIPELINE.indexOf(current);
  if (idx === -1 || idx >= STAGE_PIPELINE.length - 1) return null;
  return STAGE_PIPELINE[idx + 1];
}

// ── LLM Helper ─────────────────────────────────────────────────────────

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
      const textPart = content.find((p: any) => typeof p === "object" && "type" in p && p.type === "text");
      if (textPart && "text" in textPart) return (textPart as any).text;
    }
    return "No analysis available.";
  } catch (err) {
    console.error("[Agent LLM] Error:", err);
    return "Agent analysis temporarily unavailable.";
  }
}

// ── AGENT 1: OVERDUE AGENT ─────────────────────────────────────────────
// Finds tasks past due, moves them to overdue, drafts follow-up comms

async function runOverdueAgent(db: NonNullable<Awaited<ReturnType<typeof getDb>>>): Promise<AgentSignal[]> {
  const signals: AgentSignal[] = [];

  // Find tasks that are open/in-progress AND past due date
  const overdueTasks = await db
    .select({
      id: tasks.id,
      title: tasks.title,
      dueDate: tasks.dueDate,
      ventureId: tasks.ventureId,
      ventureLink: tasks.ventureLink,
      assigneeNames: tasks.assigneeNames,
      status: tasks.status,
    })
    .from(tasks)
    .where(
      and(
        ne(tasks.status, "complete"),
        ne(tasks.status, "overdue"),
        sql`${tasks.dueDate} IS NOT NULL AND ${tasks.dueDate} < CURDATE()`
      )
    );

  if (overdueTasks.length === 0) {
    // Check if there are already-overdue tasks to report on
    const existingOverdue = await db
      .select({ id: tasks.id, title: tasks.title, dueDate: tasks.dueDate })
      .from(tasks)
      .where(eq(tasks.status, "overdue"));

    if (existingOverdue.length > 0) {
      signals.push({
        agentName: "Overdue Agent",
        eventType: "signal",
        message: `${existingOverdue.length} tasks remain in overdue status. No new overdue tasks detected.`,
        severity: existingOverdue.length > 5 ? "warning" : "info",
        actionType: "notify",
        actionLabel: "Review Overdue",
        entityType: "task",
      });
    } else {
      signals.push({
        agentName: "Overdue Agent",
        eventType: "signal",
        message: "All tasks are on schedule. No overdue items detected.",
        severity: "info",
      });
    }
    return signals;
  }

  const now = new Date();

  // Get venture names for context
  const ventureIds = Array.from(new Set(overdueTasks.filter(t => t.ventureId).map(t => t.ventureId!)));
  let ventureMap: Record<number, { name: string; sector: string }> = {};
  if (ventureIds.length > 0) {
    const ventureRows = await db
      .select({ id: ventures.id, name: ventures.name, sector: ventures.sector })
      .from(ventures);
    for (const v of ventureRows) {
      ventureMap[v.id] = { name: v.name, sector: v.sector };
    }
  }

  // Process each overdue task
  for (const task of overdueTasks) {
    const due = new Date(task.dueDate!);
    const daysOverdue = Math.floor((now.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
    const severity: Severity = daysOverdue > 21 ? "critical" : daysOverdue > 7 ? "warning" : "info";

    // Step A: Update task status to 'overdue'
    await db.update(tasks).set({ status: "overdue" }).where(eq(tasks.id, task.id));

    const ventureName = task.ventureId ? ventureMap[task.ventureId]?.name || "Unknown" : "Unassigned";
    const sector = task.ventureId ? ventureMap[task.ventureId]?.sector || "General" : "General";
    const assignees = task.assigneeNames?.join(", ") || "Unassigned";

    // Step B: Draft follow-up communication
    const draftBody = await callAgentLLM(
      "You are ATLAS, a venture velocity platform. Draft a brief, professional follow-up message (max 4 sentences) to send to the assigned team member about an overdue task. Reference the task and venture by name. Be direct but professional. Sign off as 'ATLAS Operations'.",
      `Task: "${task.title}" | Venture: ${ventureName} | Assigned to: ${assignees} | Days overdue: ${daysOverdue} | Sector: ${sector}`
    );

    // Step C: Save draft to agent_drafts
    const draftResult = await db.insert(agentDrafts).values({
      ventureId: task.ventureId,
      ventureName,
      draftType: "follow_up",
      subject: `Follow-up: ${task.title} (${daysOverdue} days overdue)`,
      body: draftBody,
      recipientName: assignees,
      recipientRole: "Assignee",
      status: "pending",
      createdByAgent: "Overdue Agent",
    });

    const draftId = (draftResult as any)[0]?.insertId;

    // Step D: Write agent event with action
    signals.push({
      agentName: "Overdue Agent",
      eventType: "status_change",
      message: `"${task.title}" moved to overdue (${daysOverdue} days). Follow-up drafted for ${assignees}.`,
      severity,
      actionType: "draft",
      actionLabel: "Send Follow-Up",
      actionPayload: { draftId, taskId: task.id },
      entityType: "task",
      agentEntityId: String(task.id),
      agentEntityName: task.title,
      oldStatus: task.status,
      newStatus: "overdue",
    });
  }

  return signals;
}

// ── AGENT 2: VELOCITY AGENT ────────────────────────────────────────────
// Detects ventures ready to advance, auto-advances, logs velocity

async function runVelocityAgent(db: NonNullable<Awaited<ReturnType<typeof getDb>>>): Promise<AgentSignal[]> {
  const signals: AgentSignal[] = [];

  // Get all ventures with their task counts
  const ventureList = await db
    .select({
      id: ventures.id,
      name: ventures.name,
      stage: ventures.stage,
      sector: ventures.sector,
      status: ventures.status,
      healthScore: ventures.healthScore,
      updatedAt: ventures.updatedAt,
    })
    .from(ventures)
    .where(ne(ventures.status, "Completed"));

  if (ventureList.length === 0) {
    signals.push({
      agentName: "Velocity Agent",
      eventType: "signal",
      message: "No active ventures to monitor.",
      severity: "info",
    });
    return signals;
  }

  const now = new Date();

  for (const venture of ventureList) {
    // Get tasks for this venture
    const ventureTasks = await db
      .select({ id: tasks.id, status: tasks.status })
      .from(tasks)
      .where(eq(tasks.ventureId, venture.id));

    const totalTasks = ventureTasks.length;
    const completedTasks = ventureTasks.filter(t => t.status === "complete").length;

    // ── AUTO-ADVANCE: all tasks complete ──
    if (totalTasks > 0 && completedTasks === totalTasks) {
      const nextStage = getNextStage(venture.stage);
      if (nextStage) {
        const daysInStage = Math.floor(
          (now.getTime() - new Date(venture.updatedAt).getTime()) / (1000 * 60 * 60 * 24)
        );

        // Advance the venture
        await db
          .update(ventures)
          .set({ stage: nextStage })
          .where(eq(ventures.id, venture.id));

        // Log velocity
        await db.insert(ventureVelocity).values({
          ventureId: venture.id,
          ventureName: venture.name,
          sector: venture.sector,
          fromStage: venture.stage,
          toStage: nextStage,
          daysInStage,
          advancedBy: "agent",
        });

        signals.push({
          agentName: "Velocity Agent",
          eventType: "status_change",
          message: `"${venture.name}" advanced from ${venture.stage} → ${nextStage} in ${daysInStage} days. ${totalTasks} tasks completed.`,
          severity: "info",
          actionType: "advance",
          actionLabel: "View Venture",
          actionPayload: { ventureId: venture.id, ventureName: venture.name },
          entityType: "venture",
          agentEntityId: String(venture.id),
          agentEntityName: venture.name,
          oldStatus: venture.stage,
          newStatus: nextStage,
        });
      }
    }

    // ── STALL DETECTION: no tasks, aging in Validation ──
    if (totalTasks === 0 && venture.stage === "In Validation") {
      const daysStalled = Math.floor(
        (now.getTime() - new Date(venture.updatedAt).getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysStalled < 7) continue; // Not stalled yet

      // Check if stall alert already sent in last 7 days
      const recentStallAlerts = await db
        .select({ id: agentEvents.id })
        .from(agentEvents)
        .where(
          and(
            eq(agentEvents.agentName, "Velocity Agent"),
            eq(agentEvents.agentEntityId, String(venture.id)),
            sql`${agentEvents.actionType} = 'escalate'`,
            gte(agentEvents.createdAt, new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000))
          )
        )
        .limit(1);

      if (recentStallAlerts.length > 0) continue; // Already alerted

      // Get team members for this venture
      const team = await db
        .select({ name: teamMembers.name })
        .from(ventureTeam)
        .innerJoin(teamMembers, eq(ventureTeam.memberId, teamMembers.id))
        .where(eq(ventureTeam.ventureId, venture.id));

      const teamNames = team.map(t => t.name).join(", ") || "No team assigned";

      const interventionNote = await callAgentLLM(
        "You are ATLAS. Draft a brief internal note (3 sentences max) recommending a specific intervention for a stalled venture. Name the venture, how long it's been stalled, and one concrete next action to unblock it.",
        `Venture: "${venture.name}" | Sector: ${venture.sector} | Stage: In Validation | Days stalled: ${daysStalled} | Team members assigned: ${teamNames}`
      );

      signals.push({
        agentName: "Velocity Agent",
        eventType: "alert",
        message: interventionNote,
        severity: "warning",
        actionType: "escalate",
        actionLabel: "Assign First Task",
        actionPayload: { ventureId: venture.id, ventureName: venture.name },
        entityType: "venture",
        agentEntityId: String(venture.id),
        agentEntityName: venture.name,
      });
    }
  }

  // If no specific signals, provide portfolio summary
  if (signals.length === 0) {
    const atRisk = ventureList.filter(v => v.healthScore !== null && v.healthScore < 50);
    signals.push({
      agentName: "Velocity Agent",
      eventType: "signal",
      message: `${ventureList.length} ventures monitored. ${atRisk.length} at risk. No auto-advance triggers detected.`,
      severity: atRisk.length > 3 ? "warning" : "info",
      entityType: "venture",
    });
  }

  return signals;
}

// ── AGENT 3: DISTRIBUTION SENTINEL ─────────────────────────────────────
// Monitors scheduled distributions, fires reminders, drafts LP notices

async function runDistributionSentinel(db: NonNullable<Awaited<ReturnType<typeof getDb>>>): Promise<AgentSignal[]> {
  const signals: AgentSignal[] = [];

  // Get scheduled distributions
  const scheduledDists = await db
    .select({
      id: distributions.id,
      name: distributions.name,
      fund: distributions.fund,
      amount: distributions.amount,
      currency: distributions.currency,
      status: distributions.status,
      distributionDate: distributions.distributionDate,
    })
    .from(distributions)
    .where(
      sql`${distributions.status} IN ('Scheduled', 'scheduled', 'pending')`
    );

  if (scheduledDists.length === 0) {
    // Check overall distribution status
    const allDists = await db
      .select({ id: distributions.id, status: distributions.status, amount: distributions.amount })
      .from(distributions)
      .limit(20);

    const totalPaid = allDists
      .filter(d => d.status === "Paid" || d.status === "paid")
      .reduce((sum, d) => sum + Number(d.amount || 0), 0);

    signals.push({
      agentName: "Distribution Sentinel",
      eventType: "signal",
      message: totalPaid > 0
        ? `No pending distributions. $${totalPaid.toLocaleString()} total paid to date.`
        : "No distributions scheduled or recorded.",
      severity: "info",
    });
    return signals;
  }

  const now = new Date();

  for (const dist of scheduledDists) {
    const dueDate = dist.distributionDate ? new Date(dist.distributionDate) : null;
    const daysUntil = dueDate
      ? Math.floor((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      : null;

    // Check for duplicate alerts in last 24h
    const recentAlerts = await db
      .select({ id: agentEvents.id })
      .from(agentEvents)
      .where(
        and(
          eq(agentEvents.agentName, "Distribution Sentinel"),
          eq(agentEvents.agentEntityId, String(dist.id)),
          gte(agentEvents.createdAt, new Date(now.getTime() - 24 * 60 * 60 * 1000))
        )
      )
      .limit(1);

    if (recentAlerts.length > 0) continue; // Already alerted in last 24h

    const severity: Severity =
      daysUntil !== null && daysUntil <= 7 ? "critical" :
      daysUntil !== null && daysUntil <= 30 ? "warning" : "info";

    const fundName = dist.fund || dist.name;
    const amount = Number(dist.amount || 0);

    // Draft LP notification
    const draftBody = await callAgentLLM(
      "You are ATLAS. Draft a brief, professional LP distribution notification (4 sentences max). Include fund name, amount, timing, and next steps. Professional tone. Sign as 'Royalton Venture Holding'.",
      `${fundName} | $${amount.toLocaleString()} | Due: ${dist.distributionDate || "TBD"} | Days until: ${daysUntil ?? "Unknown"}`
    );

    // Save draft
    const draftResult = await db.insert(agentDrafts).values({
      ventureName: fundName,
      draftType: "lp_notice",
      subject: `Distribution Notice: ${fundName} — $${amount.toLocaleString()}`,
      body: draftBody,
      recipientName: "LP Investors",
      recipientRole: "Limited Partner",
      status: "pending",
      createdByAgent: "Distribution Sentinel",
    });

    const draftId = (draftResult as any)[0]?.insertId;

    signals.push({
      agentName: "Distribution Sentinel",
      eventType: "alert",
      message: `${fundName}: $${amount.toLocaleString()} ${daysUntil !== null ? `due in ${daysUntil} days` : "date TBD"}. LP notice drafted.`,
      severity,
      actionType: "draft",
      actionLabel: "Send LP Notice",
      actionPayload: { draftId, distributionId: dist.id },
      entityType: "distribution",
      agentEntityId: String(dist.id),
      agentEntityName: fundName,
    });
  }

  if (signals.length === 0) {
    signals.push({
      agentName: "Distribution Sentinel",
      eventType: "signal",
      message: `${scheduledDists.length} scheduled distributions monitored. All recently alerted.`,
      severity: "info",
    });
  }

  return signals;
}

// ── AGENT 4: ORCHESTRATOR ──────────────────────────────────────────────
// Reads all agent outputs, generates portfolio-level insight

async function runOrchestrator(
  db: NonNullable<Awaited<ReturnType<typeof getDb>>>,
  agentSignals: AgentSignal[]
): Promise<AgentSignal[]> {
  const signals: AgentSignal[] = [];

  // Check if Orchestrator fired in last 3 minutes
  const recentOrch = await db
    .select({ id: agentEvents.id })
    .from(agentEvents)
    .where(
      and(
        eq(agentEvents.agentName, "Orchestrator"),
        gte(agentEvents.createdAt, new Date(Date.now() - 3 * 60 * 1000))
      )
    )
    .limit(1);

  if (recentOrch.length > 0 && agentSignals.length === 0) {
    return signals; // Don't fire if recently ran and no new sub-signals
  }

  // Build portfolio snapshot
  const ventureList = await db
    .select({ id: ventures.id, name: ventures.name, stage: ventures.stage, healthScore: ventures.healthScore })
    .from(ventures)
    .limit(30);

  const taskStats = await db
    .select({
      total: sql<number>`COUNT(*)`,
      overdue: sql<number>`SUM(CASE WHEN ${tasks.status} = 'overdue' THEN 1 ELSE 0 END)`,
      complete: sql<number>`SUM(CASE WHEN ${tasks.status} = 'complete' THEN 1 ELSE 0 END)`,
    })
    .from(tasks);

  const recentEvents = await db
    .select()
    .from(agentEvents)
    .where(ne(agentEvents.agentName, "Orchestrator"))
    .orderBy(desc(agentEvents.createdAt))
    .limit(10);

  const portfolioSnapshot = [
    `Ventures: ${ventureList.length} total`,
    `  At risk (health<50): ${ventureList.filter(v => v.healthScore !== null && v.healthScore < 50).length}`,
    `  Stages: ${STAGE_PIPELINE.map(s => `${s}: ${ventureList.filter(v => v.stage === s).length}`).join(", ")}`,
    `Tasks: ${taskStats[0]?.total || 0} total, ${taskStats[0]?.overdue || 0} overdue, ${taskStats[0]?.complete || 0} complete`,
    `Recent agent signals:`,
    ...(agentSignals.length > 0
      ? agentSignals.map(s => `  [${s.agentName}] (${s.severity}): ${s.message}`)
      : recentEvents.map(e => `  [${e.agentName}] (${e.severity}): ${e.message.substring(0, 100)}`)),
  ].join("\n");

  const analysis = await callAgentLLM(
    "You are the ATLAS Orchestrator — the master velocity agent for a UHNWI holding company. You see the entire portfolio across all verticals simultaneously. Your job is to find the ONE thing that, if acted on in the next 24 hours, would most accelerate the portfolio. Identify it, name the specific venture or sector, and state the exact action required. 2 sentences max. No preamble. No filler. Be direct.",
    portfolioSnapshot
  );

  const maxSeverity: Severity = agentSignals.some(s => s.severity === "critical")
    ? "critical"
    : agentSignals.some(s => s.severity === "warning")
    ? "warning"
    : "info";

  signals.push({
    agentName: "Orchestrator",
    eventType: "summary",
    message: analysis,
    severity: maxSeverity,
    actionType: "notify",
    actionLabel: "Mark Resolved",
  });

  return signals;
}

// ── Persist Signals ────────────────────────────────────────────────────

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
      actionType: signal.actionType ?? null,
      actionLabel: signal.actionLabel ?? null,
      actionPayload: signal.actionPayload ?? null,
      entityType: signal.entityType ?? null,
      agentEntityId: signal.agentEntityId ?? null,
      agentEntityName: signal.agentEntityName ?? null,
      oldStatus: signal.oldStatus ?? null,
      newStatus: signal.newStatus ?? null,
      isRead: false,
      actionTaken: false,
    });
  }
}

// ── Router ─────────────────────────────────────────────────────────────

export const agentsRouter = router({
  /**
   * List recent agent events with optional filtering
   */
  list: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(200).default(50),
        agentName: z.string().optional(),
        severity: z.string().optional(),
        actionType: z.string().optional(),
        unreadOnly: z.boolean().optional(),
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

      let filtered = results;
      if (input?.agentName) {
        filtered = filtered.filter(e => e.agentName === input.agentName);
      }
      if (input?.severity) {
        filtered = filtered.filter(e => e.severity === input.severity);
      }
      if (input?.actionType) {
        filtered = filtered.filter(e => e.actionType === input.actionType);
      }
      if (input?.unreadOnly) {
        filtered = filtered.filter(e => !e.isRead);
      }

      return filtered;
    }),

  /**
   * Get agent metrics/stats
   */
  metrics: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) return { total: 0, unread: 0, critical: 0, warning: 0, draftsGenerated: 0, byAgent: {} as Record<string, number> };

    const allEvents = await db
      .select()
      .from(agentEvents)
      .orderBy(desc(agentEvents.createdAt))
      .limit(200);

    const unread = allEvents.filter(e => !e.isRead).length;
    const critical = allEvents.filter(e => e.severity === "critical").length;
    const warning = allEvents.filter(e => e.severity === "warning").length;

    const byAgent: Record<string, number> = {};
    for (const e of allEvents) {
      byAgent[e.agentName] = (byAgent[e.agentName] || 0) + 1;
    }

    // Count pending drafts
    const pendingDrafts = await db
      .select({ id: agentDrafts.id })
      .from(agentDrafts)
      .where(eq(agentDrafts.status, "pending"));

    return {
      total: allEvents.length,
      unread,
      critical,
      warning,
      draftsGenerated: pendingDrafts.length,
      byAgent,
    };
  }),

  /**
   * Run all agents — admin only
   */
  runAll: adminProcedure.mutation(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const [overdueSignals, velocitySignals, distSignals] = await Promise.all([
      runOverdueAgent(db),
      runVelocityAgent(db),
      runDistributionSentinel(db),
    ]);

    const allSubSignals = [...overdueSignals, ...velocitySignals, ...distSignals];
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
    .input(z.object({ agentName: z.enum(["overdue", "velocity", "distribution", "orchestrator"]) }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      let signals: AgentSignal[] = [];

      switch (input.agentName) {
        case "overdue":
          signals = await runOverdueAgent(db);
          break;
        case "velocity":
          signals = await runVelocityAgent(db);
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

          const subSignals: AgentSignal[] = recentEvents.map(e => ({
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

  /**
   * Execute an action on an agent event
   */
  executeAction: adminProcedure
    .input(z.object({
      eventId: z.number(),
      actionType: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      await db
        .update(agentEvents)
        .set({
          actionTaken: true,
          actionTakenAt: new Date(),
          actionTakenBy: ctx.user.name || "Admin",
        })
        .where(eq(agentEvents.id, input.eventId));

      return { success: true };
    }),

  // ── Draft Management ──────────────────────────────────────────────────

  /**
   * List drafts with optional status filter
   */
  listDrafts: protectedProcedure
    .input(
      z.object({
        status: z.enum(["pending", "sent", "dismissed"]).optional(),
        limit: z.number().min(1).max(100).default(50),
      }).optional()
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      let results = await db
        .select()
        .from(agentDrafts)
        .orderBy(desc(agentDrafts.createdAt))
        .limit(input?.limit ?? 50);

      if (input?.status) {
        results = results.filter(d => d.status === input.status);
      }

      return results;
    }),

  /**
   * Send a draft — marks as sent, logs who sent it
   */
  sendDraft: adminProcedure
    .input(z.object({
      draftId: z.number(),
      editedBody: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const updates: Record<string, unknown> = {
        status: "sent",
        sentAt: new Date(),
        sentBy: ctx.user.name || "Admin",
      };

      if (input.editedBody) {
        updates.body = input.editedBody;
      }

      await db
        .update(agentDrafts)
        .set(updates as any)
        .where(eq(agentDrafts.id, input.draftId));

      // Also mark any related agent_event as action_taken
      const draft = await db
        .select()
        .from(agentDrafts)
        .where(eq(agentDrafts.id, input.draftId))
        .limit(1);

      if (draft[0]) {
        // Find events with matching draft in payload
        const events = await db
          .select()
          .from(agentEvents)
          .where(
            and(
              eq(agentEvents.actionType, "draft"),
              eq(agentEvents.actionTaken, false)
            )
          )
          .limit(50);

        for (const evt of events) {
          const payload = evt.actionPayload as Record<string, unknown> | null;
          if (payload && payload.draftId === input.draftId) {
            await db
              .update(agentEvents)
              .set({
                actionTaken: true,
                actionTakenAt: new Date(),
                actionTakenBy: ctx.user.name || "Admin",
              })
              .where(eq(agentEvents.id, evt.id));
          }
        }
      }

      return { success: true };
    }),

  /**
   * Dismiss a draft
   */
  dismissDraft: adminProcedure
    .input(z.object({ draftId: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      await db
        .update(agentDrafts)
        .set({ status: "dismissed" })
        .where(eq(agentDrafts.id, input.draftId));

      return { success: true };
    }),

  /**
   * Restore a dismissed draft to pending
   */
  restoreDraft: adminProcedure
    .input(z.object({ draftId: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      await db
        .update(agentDrafts)
        .set({ status: "pending" })
        .where(eq(agentDrafts.id, input.draftId));

      return { success: true };
    }),

  // ── Velocity Tracking ─────────────────────────────────────────────────

  /**
   * Get velocity metrics — avg days per stage advance
   */
  velocityMetrics: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) return { avgDays: null, totalAdvances: 0, recentAdvances: [] };

    const allAdvances = await db
      .select()
      .from(ventureVelocity)
      .orderBy(desc(ventureVelocity.advancedAt));

    if (allAdvances.length === 0) {
      return { avgDays: null, totalAdvances: 0, recentAdvances: [] };
    }

    const avgDays = Math.round(
      allAdvances.reduce((sum, a) => sum + a.daysInStage, 0) / allAdvances.length
    );

    return {
      avgDays,
      totalAdvances: allAdvances.length,
      recentAdvances: allAdvances.slice(0, 10),
    };
  }),

  /**
   * Get full velocity log for client page
   */
  velocityLog: protectedProcedure
    .input(z.object({ ventureId: z.number().optional() }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      let results = await db
        .select()
        .from(ventureVelocity)
        .orderBy(desc(ventureVelocity.advancedAt));

      if (input?.ventureId) {
        results = results.filter(r => r.ventureId === input.ventureId);
      }

      return results;
    }),
});
