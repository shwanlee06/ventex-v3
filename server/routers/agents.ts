// ============================================================================
// ATLAS Agent System — Velocity Build: Action-Based Intelligence Agents
// Four agents: Overdue, Velocity, Distribution Sentinel, Orchestrator
// Every event carries an ACTION — not just awareness, but execution.
// Multi-tenant: all queries scoped by organizationId
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
  orgVentureAccess,
} from "../../drizzle/schema";
import { eq, desc, sql, and, ne, gte, inArray } from "drizzle-orm";
import { invokeLLM } from "../_core/llm";
import { isAtlasTeam, resolveVentureScope } from "../security/rbac";
import type { User } from "../../drizzle/schema";

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
  organizationId?: number | null;
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

// ── Org-scoped venture IDs helper ─────────────────────────────────────

async function getVentureIdsForOrg(
  db: NonNullable<Awaited<ReturnType<typeof getDb>>>,
  organizationId: number
): Promise<number[]> {
  const rows = await db
    .select({ ventureId: orgVentureAccess.ventureId })
    .from(orgVentureAccess)
    .where(eq(orgVentureAccess.organizationId, organizationId));
  return rows.map((r) => r.ventureId);
}

// ── AGENT 1: OVERDUE AGENT ─────────────────────────────────────────────
// Finds tasks past due, moves them to overdue, drafts follow-up comms

async function runOverdueAgent(
  db: NonNullable<Awaited<ReturnType<typeof getDb>>>,
  orgId?: number | null
): Promise<AgentSignal[]> {
  const signals: AgentSignal[] = [];

  // Build base conditions
  const conditions = [
    ne(tasks.status, "complete"),
    ne(tasks.status, "overdue"),
    sql`${tasks.dueDate} IS NOT NULL AND ${tasks.dueDate} < CURDATE()`,
  ];

  // Scope by org if provided
  if (orgId) {
    conditions.push(eq(tasks.organizationId, orgId));
  }

  const overdueTasks = await db
    .select({
      id: tasks.id,
      title: tasks.title,
      dueDate: tasks.dueDate,
      ventureId: tasks.ventureId,
      ventureLink: tasks.ventureLink,
      assigneeNames: tasks.assigneeNames,
      status: tasks.status,
      organizationId: tasks.organizationId,
    })
    .from(tasks)
    .where(and(...conditions));

  if (overdueTasks.length === 0) {
    const overdueConditions: any[] = [eq(tasks.status, "overdue")];
    if (orgId) overdueConditions.push(eq(tasks.organizationId, orgId));

    const existingOverdue = await db
      .select({ id: tasks.id, title: tasks.title, dueDate: tasks.dueDate })
      .from(tasks)
      .where(and(...overdueConditions));

    if (existingOverdue.length > 0) {
      signals.push({
        agentName: "Overdue Agent",
        eventType: "signal",
        message: `${existingOverdue.length} tasks remain in overdue status. No new overdue tasks detected.`,
        severity: existingOverdue.length > 5 ? "warning" : "info",
        organizationId: orgId,
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
        organizationId: orgId,
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
      .from(ventures)
      .where(inArray(ventures.id, ventureIds));
    for (const v of ventureRows) {
      ventureMap[v.id] = { name: v.name, sector: v.sector };
    }
  }

  for (const task of overdueTasks) {
    const due = new Date(task.dueDate!);
    const daysOverdue = Math.floor((now.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
    const severity: Severity = daysOverdue > 21 ? "critical" : daysOverdue > 7 ? "warning" : "info";

    await db.update(tasks).set({ status: "overdue" }).where(eq(tasks.id, task.id));

    const ventureName = task.ventureId ? ventureMap[task.ventureId]?.name || "Unknown" : "Unassigned";
    const sector = task.ventureId ? ventureMap[task.ventureId]?.sector || "General" : "General";
    const assignees = task.assigneeNames?.join(", ") || "Unassigned";

    const draftBody = await callAgentLLM(
      "You are ATLAS, a venture velocity platform. Draft a brief, professional follow-up message (max 4 sentences) to send to the assigned team member about an overdue task. Reference the task and venture by name. Be direct but professional. Sign off as 'ATLAS Operations'.",
      `Task: "${task.title}" | Venture: ${ventureName} | Assigned to: ${assignees} | Days overdue: ${daysOverdue} | Sector: ${sector}`
    );

    const draftResult = await db.insert(agentDrafts).values({
      organizationId: task.organizationId,
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

    signals.push({
      agentName: "Overdue Agent",
      eventType: "status_change",
      message: `"${task.title}" moved to overdue (${daysOverdue} days). Follow-up drafted for ${assignees}.`,
      severity,
      organizationId: task.organizationId,
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

async function runVelocityAgent(
  db: NonNullable<Awaited<ReturnType<typeof getDb>>>,
  orgId?: number | null
): Promise<AgentSignal[]> {
  const signals: AgentSignal[] = [];

  // Scope ventures by org
  let ventureConditions: any[] = [ne(ventures.status, "Completed")];
  if (orgId) {
    const orgVentureIds = await getVentureIdsForOrg(db, orgId);
    if (orgVentureIds.length === 0) {
      signals.push({ agentName: "Velocity Agent", eventType: "signal", message: "No active ventures to monitor.", severity: "info", organizationId: orgId });
      return signals;
    }
    ventureConditions.push(inArray(ventures.id, orgVentureIds));
  }

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
    .where(and(...ventureConditions));

  if (ventureList.length === 0) {
    signals.push({ agentName: "Velocity Agent", eventType: "signal", message: "No active ventures to monitor.", severity: "info", organizationId: orgId });
    return signals;
  }

  const now = new Date();

  for (const venture of ventureList) {
    const ventureTasks = await db
      .select({ id: tasks.id, status: tasks.status })
      .from(tasks)
      .where(eq(tasks.ventureId, venture.id));

    const totalTasks = ventureTasks.length;
    const completedTasks = ventureTasks.filter(t => t.status === "complete").length;

    if (totalTasks > 0 && completedTasks === totalTasks) {
      const nextStage = getNextStage(venture.stage);
      if (nextStage) {
        const daysInStage = Math.floor(
          (now.getTime() - new Date(venture.updatedAt).getTime()) / (1000 * 60 * 60 * 24)
        );

        await db.update(ventures).set({ stage: nextStage }).where(eq(ventures.id, venture.id));

        await db.insert(ventureVelocity).values({
          organizationId: orgId,
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
          organizationId: orgId,
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

    if (totalTasks === 0 && venture.stage === "In Validation") {
      const daysStalled = Math.floor(
        (now.getTime() - new Date(venture.updatedAt).getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysStalled < 7) continue;

      const stallConditions: any[] = [
        eq(agentEvents.agentName, "Velocity Agent"),
        eq(agentEvents.agentEntityId, String(venture.id)),
        eq(agentEvents.actionType, 'escalate'),
        gte(agentEvents.createdAt, new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)),
      ];
      if (orgId) stallConditions.push(eq(agentEvents.organizationId, orgId));

      const recentStallAlerts = await db
        .select({ id: agentEvents.id })
        .from(agentEvents)
        .where(and(...stallConditions))
        .limit(1);

      if (recentStallAlerts.length > 0) continue;

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
        organizationId: orgId,
        actionType: "escalate",
        actionLabel: "Assign First Task",
        actionPayload: { ventureId: venture.id, ventureName: venture.name },
        entityType: "venture",
        agentEntityId: String(venture.id),
        agentEntityName: venture.name,
      });
    }
  }

  if (signals.length === 0) {
    const atRisk = ventureList.filter(v => v.healthScore !== null && v.healthScore < 50);
    signals.push({
      agentName: "Velocity Agent",
      eventType: "signal",
      message: `${ventureList.length} ventures monitored. ${atRisk.length} at risk. No auto-advance triggers detected.`,
      severity: atRisk.length > 3 ? "warning" : "info",
      organizationId: orgId,
      entityType: "venture",
    });
  }

  return signals;
}

// ── AGENT 3: DISTRIBUTION SENTINEL ─────────────────────────────────────

async function runDistributionSentinel(
  db: NonNullable<Awaited<ReturnType<typeof getDb>>>,
  orgId?: number | null
): Promise<AgentSignal[]> {
  const signals: AgentSignal[] = [];

  const distConditions: any[] = [
    sql`${distributions.status} IN ('Scheduled', 'scheduled', 'pending')`,
  ];
  if (orgId) {
    distConditions.push(eq(distributions.organizationId, orgId));
  }

  const scheduledDists = await db
    .select({
      id: distributions.id,
      name: distributions.name,
      fund: distributions.fund,
      amount: distributions.amount,
      currency: distributions.currency,
      status: distributions.status,
      distributionDate: distributions.distributionDate,
      organizationId: distributions.organizationId,
    })
    .from(distributions)
    .where(and(...distConditions));

  if (scheduledDists.length === 0) {
    const allDistConditions: any[] = [];
    if (orgId) allDistConditions.push(eq(distributions.organizationId, orgId));

    const allDists = await db
      .select({ id: distributions.id, status: distributions.status, amount: distributions.amount })
      .from(distributions)
      .where(allDistConditions.length > 0 ? and(...allDistConditions) : undefined)
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
      organizationId: orgId,
    });
    return signals;
  }

  const now = new Date();

  for (const dist of scheduledDists) {
    const dueDate = dist.distributionDate ? new Date(dist.distributionDate) : null;
    const daysUntil = dueDate
      ? Math.floor((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      : null;

    const alertConditions: any[] = [
      eq(agentEvents.agentName, "Distribution Sentinel"),
      eq(agentEvents.agentEntityId, String(dist.id)),
      gte(agentEvents.createdAt, new Date(now.getTime() - 24 * 60 * 60 * 1000)),
    ];
    if (orgId) alertConditions.push(eq(agentEvents.organizationId, orgId));

    const recentAlerts = await db
      .select({ id: agentEvents.id })
      .from(agentEvents)
      .where(and(...alertConditions))
      .limit(1);

    if (recentAlerts.length > 0) continue;

    const severity: Severity =
      daysUntil !== null && daysUntil <= 7 ? "critical" :
      daysUntil !== null && daysUntil <= 30 ? "warning" : "info";

    const fundName = dist.fund || dist.name;
    const amount = Number(dist.amount || 0);

    const draftBody = await callAgentLLM(
      "You are ATLAS. Draft a brief, professional LP distribution notification (4 sentences max). Include fund name, amount, timing, and next steps. Professional tone. Sign as 'Royalton Venture Holding'.",
      `${fundName} | $${amount.toLocaleString()} | Due: ${dist.distributionDate || "TBD"} | Days until: ${daysUntil ?? "Unknown"}`
    );

    const draftResult = await db.insert(agentDrafts).values({
      organizationId: dist.organizationId,
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
      organizationId: dist.organizationId,
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
      organizationId: orgId,
    });
  }

  return signals;
}

// ── AGENT 4: ORCHESTRATOR ──────────────────────────────────────────────

async function runOrchestrator(
  db: NonNullable<Awaited<ReturnType<typeof getDb>>>,
  agentSignals: AgentSignal[],
  orgId?: number | null
): Promise<AgentSignal[]> {
  const signals: AgentSignal[] = [];

  const orchConditions: any[] = [
    eq(agentEvents.agentName, "Orchestrator"),
    gte(agentEvents.createdAt, new Date(Date.now() - 3 * 60 * 1000)),
  ];
  if (orgId) orchConditions.push(eq(agentEvents.organizationId, orgId));

  const recentOrch = await db
    .select({ id: agentEvents.id })
    .from(agentEvents)
    .where(and(...orchConditions))
    .limit(1);

  if (recentOrch.length > 0 && agentSignals.length === 0) {
    return signals;
  }

  // Build portfolio snapshot — scoped by org
  let ventureConditions: any[] = [];
  let taskConditions: any[] = [];
  if (orgId) {
    const orgVentureIds = await getVentureIdsForOrg(db, orgId);
    if (orgVentureIds.length > 0) {
      ventureConditions.push(inArray(ventures.id, orgVentureIds));
      taskConditions.push(inArray(tasks.ventureId, orgVentureIds));
    }
  }

  const ventureList = await db
    .select({ id: ventures.id, name: ventures.name, stage: ventures.stage, healthScore: ventures.healthScore })
    .from(ventures)
    .where(ventureConditions.length > 0 ? and(...ventureConditions) : undefined)
    .limit(30);

  const taskStats = await db
    .select({
      total: sql<number>`COUNT(*)`,
      overdue: sql<number>`SUM(CASE WHEN ${tasks.status} = 'overdue' THEN 1 ELSE 0 END)`,
      complete: sql<number>`SUM(CASE WHEN ${tasks.status} = 'complete' THEN 1 ELSE 0 END)`,
    })
    .from(tasks)
    .where(taskConditions.length > 0 ? and(...taskConditions) : undefined);

  const eventConditions: any[] = [ne(agentEvents.agentName, "Orchestrator")];
  if (orgId) eventConditions.push(eq(agentEvents.organizationId, orgId));

  const recentEvents = await db
    .select()
    .from(agentEvents)
    .where(and(...eventConditions))
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
    organizationId: orgId,
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
      organizationId: signal.organizationId ?? null,
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
    } as any);
  }
}

// ── Router ─────────────────────────────────────────────────────────────

export const agentsRouter = router({
  /**
   * List recent agent events with optional filtering — org-scoped
   */
  list: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(200).default(50),
        organizationId: z.number().optional(),
        agentName: z.string().optional(),
        severity: z.string().optional(),
        actionType: z.string().optional(),
        unreadOnly: z.boolean().optional(),
      }).optional()
    )
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) return [];

      const limit = input?.limit ?? 50;
      const isAdmin = isAtlasTeam(ctx.user);

      // Determine effective org ID
      const effectiveOrgId = isAdmin
        ? input?.organizationId
        : ctx.user.organizationId;

      const conditions: any[] = [];
      if (effectiveOrgId) {
        conditions.push(eq(agentEvents.organizationId, effectiveOrgId));
      }
      if (input?.agentName) {
        conditions.push(eq(agentEvents.agentName, input.agentName));
      }
      if (input?.severity) {
        conditions.push(eq(agentEvents.severity, input.severity));
      }
      if (input?.actionType) {
        conditions.push(eq(agentEvents.actionType, input.actionType));
      }
      if (input?.unreadOnly) {
        conditions.push(eq(agentEvents.isRead, false));
      }

      const results = await db
        .select()
        .from(agentEvents)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(agentEvents.createdAt))
        .limit(limit);

      return results;
    }),

  /**
   * Get agent metrics/stats — org-scoped
   */
  metrics: protectedProcedure
    .input(z.object({ organizationId: z.number().optional() }).optional())
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) return { total: 0, unread: 0, critical: 0, warning: 0, draftsGenerated: 0, byAgent: {} as Record<string, number> };

      const isAdmin = isAtlasTeam(ctx.user);
      const effectiveOrgId = isAdmin ? input?.organizationId : ctx.user.organizationId;

      const eventConditions: any[] = [];
      if (effectiveOrgId) {
        eventConditions.push(eq(agentEvents.organizationId, effectiveOrgId));
      }

      const allEvents = await db
        .select()
        .from(agentEvents)
        .where(eventConditions.length > 0 ? and(...eventConditions) : undefined)
        .orderBy(desc(agentEvents.createdAt))
        .limit(200);

      const unread = allEvents.filter(e => !e.isRead).length;
      const critical = allEvents.filter(e => e.severity === "critical").length;
      const warning = allEvents.filter(e => e.severity === "warning").length;

      const byAgent: Record<string, number> = {};
      for (const e of allEvents) {
        byAgent[e.agentName] = (byAgent[e.agentName] || 0) + 1;
      }

      const draftConditions: any[] = [eq(agentDrafts.status, "pending")];
      if (effectiveOrgId) {
        draftConditions.push(eq(agentDrafts.organizationId, effectiveOrgId));
      }

      const pendingDrafts = await db
        .select({ id: agentDrafts.id })
        .from(agentDrafts)
        .where(and(...draftConditions));

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
   * Run all agents — admin only, org-scoped
   */
  runAll: adminProcedure
    .input(z.object({ organizationId: z.number().optional() }).optional())
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const orgId = input?.organizationId;

      const [overdueSignals, velocitySignals, distSignals] = await Promise.all([
        runOverdueAgent(db, orgId),
        runVelocityAgent(db, orgId),
        runDistributionSentinel(db, orgId),
      ]);

      const allSubSignals = [...overdueSignals, ...velocitySignals, ...distSignals];
      const orchestratorSignals = await runOrchestrator(db, allSubSignals, orgId);

      const allSignals = [...allSubSignals, ...orchestratorSignals];
      await persistSignals(db, allSignals);

      return {
        success: true,
        signalCount: allSignals.length,
        signals: allSignals,
      };
    }),

  /**
   * Run a single agent — admin only, org-scoped
   */
  runSingle: adminProcedure
    .input(z.object({
      agentName: z.enum(["overdue", "velocity", "distribution", "orchestrator"]),
      organizationId: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const orgId = input.organizationId;
      let signals: AgentSignal[] = [];

      switch (input.agentName) {
        case "overdue":
          signals = await runOverdueAgent(db, orgId);
          break;
        case "velocity":
          signals = await runVelocityAgent(db, orgId);
          break;
        case "distribution":
          signals = await runDistributionSentinel(db, orgId);
          break;
        case "orchestrator": {
          const eventConditions: any[] = [ne(agentEvents.agentName, "Orchestrator")];
          if (orgId) eventConditions.push(eq(agentEvents.organizationId, orgId));

          const recentEvents = await db
            .select()
            .from(agentEvents)
            .where(and(...eventConditions))
            .orderBy(desc(agentEvents.createdAt))
            .limit(10);

          const subSignals: AgentSignal[] = recentEvents.map(e => ({
            agentName: e.agentName as AgentName,
            eventType: e.eventType as EventType,
            message: e.message,
            severity: e.severity as Severity,
            organizationId: e.organizationId,
          }));
          signals = await runOrchestrator(db, subSignals, orgId);
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
   * Mark all events as read — org-scoped
   */
  markAllRead: protectedProcedure
    .input(z.object({ organizationId: z.number().optional() }).optional())
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) return { success: false };

      const isAdmin = isAtlasTeam(ctx.user);
      const effectiveOrgId = isAdmin ? input?.organizationId : ctx.user.organizationId;

      const conditions: any[] = [eq(agentEvents.isRead, false)];
      if (effectiveOrgId) {
        conditions.push(eq(agentEvents.organizationId, effectiveOrgId));
      }

      await db
        .update(agentEvents)
        .set({ isRead: true })
        .where(and(...conditions));

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
   * List drafts with optional status filter — org-scoped
   */
  listDrafts: protectedProcedure
    .input(
      z.object({
        status: z.enum(["pending", "sent", "dismissed"]).optional(),
        organizationId: z.number().optional(),
        limit: z.number().min(1).max(100).default(50),
      }).optional()
    )
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) return [];

      const isAdmin = isAtlasTeam(ctx.user);
      const effectiveOrgId = isAdmin ? input?.organizationId : ctx.user.organizationId;

      const conditions: any[] = [];
      if (effectiveOrgId) {
        conditions.push(eq(agentDrafts.organizationId, effectiveOrgId));
      }
      if (input?.status) {
        conditions.push(eq(agentDrafts.status, input.status));
      }

      const results = await db
        .select()
        .from(agentDrafts)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(agentDrafts.createdAt))
        .limit(input?.limit ?? 50);

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
   * Get velocity metrics — avg days per stage advance — org-scoped
   */
  velocityMetrics: protectedProcedure
    .input(z.object({ organizationId: z.number().optional() }).optional())
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) return { avgDays: null, totalAdvances: 0, recentAdvances: [] };

      const isAdmin = isAtlasTeam(ctx.user);
      const effectiveOrgId = isAdmin ? input?.organizationId : ctx.user.organizationId;

      const conditions: any[] = [];
      if (effectiveOrgId) {
        conditions.push(eq(ventureVelocity.organizationId, effectiveOrgId));
      }

      const allAdvances = await db
        .select()
        .from(ventureVelocity)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
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
   * Get full velocity log for client page — org-scoped
   */
  velocityLog: protectedProcedure
    .input(z.object({
      ventureId: z.number().optional(),
      organizationId: z.number().optional(),
    }).optional())
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) return [];

      const isAdmin = isAtlasTeam(ctx.user);
      const effectiveOrgId = isAdmin ? input?.organizationId : ctx.user.organizationId;

      const conditions: any[] = [];
      if (effectiveOrgId) {
        conditions.push(eq(ventureVelocity.organizationId, effectiveOrgId));
      }
      if (input?.ventureId) {
        conditions.push(eq(ventureVelocity.ventureId, input.ventureId));
      }

      const results = await db
        .select()
        .from(ventureVelocity)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(ventureVelocity.advancedAt));

      return results;
    }),
});
