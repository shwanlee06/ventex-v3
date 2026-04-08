// ============================================================================
// ATLAS Agent System — Velocity Build: Action-Based Intelligence Agents
// Four agents: Overdue, Velocity, Distribution Sentinel, Orchestrator
// Every event carries an ACTION — not just awareness, but execution.
// Multi-tenant: all queries scoped by organizationId
// ============================================================================

import { z } from "zod";
import { TRPCError } from "@trpc/server";
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
  organizations,
  clientAgentConfig,
  ventureProcessTracking,
  processSteps,
} from "../../drizzle/schema";
import {
  sendOverdueAutoEmail,
  sendReadyToAdvanceEmail,
  sendStageAdvancedEmail,
} from "../emailService";
import { onStageAdvanced, onTaskCompleted, onTaskOverdue } from "../intelligence/realtimeTriggers";
import { eq, desc, sql, and, ne, gte, inArray } from "drizzle-orm";
import { invokeLLM } from "../_core/llm";
import { isAtlasTeam, resolveVentureScope } from "../security/rbac";
import { resolveOrgId } from "../security/orgScope";
import { lookupBlueprintForVenture, buildBlueprintContext } from "../blueprintLookup";
import type { User } from "../../drizzle/schema";

// ── Types ──────────────────────────────────────────────────────────────

type AgentName = "Overdue Agent" | "Velocity Agent" | "Distribution Sentinel" | "Orchestrator";
type EventType = "signal" | "alert" | "recommendation" | "status_change" | "summary";
type Severity = "info" | "warning" | "critical";
type ActionType = "notify" | "advance" | "draft" | "escalate";

type Audience = "client" | "operator" | "both";

interface AgentSignal {
  agentName: AgentName;
  eventType: EventType;
  message: string;
  severity: Severity;
  organizationId?: number | null;
  audience?: Audience;
  requiresClientAction?: boolean;
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

// Capital-intensive stages require explicit client approval (Mode B)
const CAPITAL_STAGES = ["In Fundraising"];

function getNextStage(current: string): string | null {
  const idx = STAGE_PIPELINE.indexOf(current);
  if (idx === -1 || idx >= STAGE_PIPELINE.length - 1) return null;
  return STAGE_PIPELINE[idx + 1];
}

function isCapitalStage(stage: string): boolean {
  return CAPITAL_STAGES.includes(stage);
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

export async function runOverdueAgent(
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
      assigneeIds: tasks.assigneeIds,
      status: tasks.status,
      organizationId: tasks.organizationId,
      lastEmailSentAt: tasks.lastEmailSentAt,
      emailSentCount: tasks.emailSentCount,
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
        audience: "client",
        requiresClientAction: true,
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
        audience: "client",
        requiresClientAction: false,
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

    // 3-Layer Blueprint lookup for richer overdue follow-ups
    let blueprintHint = "";
    let blueprintSourceLabel = "";
    if (task.ventureId) {
      try {
        const bpResult = await lookupBlueprintForVenture(task.ventureId);
        blueprintSourceLabel = bpResult.sourceLabel;
        const ctx = buildBlueprintContext(bpResult);
        if (ctx) blueprintHint = ctx;
      } catch { /* no blueprint */ }
    }

    // Dedup: skip if a pending draft already exists for this task
    const existingDraft = await db
      .select({ id: agentDrafts.id })
      .from(agentDrafts)
      .where(
        and(
          sql`${agentDrafts.organizationId} = ${task.organizationId}`,
          eq(agentDrafts.draftType, "follow_up"),
          eq(agentDrafts.status, "pending"),
          sql`${agentDrafts.subject} LIKE ${`%${task.title}%`}`
        )
      )
      .limit(1);

    if (existingDraft.length > 0) {
      // Draft already exists for this task — skip
      signals.push({
        agentName: "Overdue Agent",
        eventType: "status_change",
        message: `"${task.title}" still overdue (${daysOverdue} days). Existing draft pending — skipping duplicate.`,
        severity: daysOverdue > 7 ? "critical" as Severity : "warning" as Severity,
        organizationId: task.organizationId,
        audience: "client",
        requiresClientAction: false,
        actionType: "notify" as ActionType,
      });
      continue;
    }

    const draftBody = await callAgentLLM(
      "You are ATLAS, a venture velocity platform. Draft a brief, professional follow-up message (max 4 sentences) to send to the assigned team member about an overdue task. Reference the task and venture by name. If blueprint blocking steps are provided, mention the specific step that needs attention. Be direct but professional. Sign off as 'ATLAS Operations'.",
      `Task: "${task.title}" | Venture: ${ventureName} | Assigned to: ${assignees} | Days overdue: ${daysOverdue} | Sector: ${sector}${blueprintHint}${blueprintSourceLabel ? ` | Operating on: ${blueprintSourceLabel}` : ""}`
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
      message: `"${task.title}" moved to overdue (${daysOverdue} days). Follow-up drafted for ${assignees}.${blueprintSourceLabel ? ` [${blueprintSourceLabel}]` : ""}`,
      severity,
      organizationId: task.organizationId,
      audience: "client",
      requiresClientAction: true,
      actionType: "draft",
      actionLabel: "Approve Follow-Up",
      actionPayload: { draftId, taskId: task.id },
      entityType: "task",
      agentEntityId: String(task.id),
      agentEntityName: task.title,
      oldStatus: task.status,
      newStatus: "overdue",
    });

    // ── TRIGGER 1: Auto-email when task is >3 days overdue ──────────
    // 7-day cooldown to prevent spam
    if (daysOverdue > 3) {
      const lastSent = task.lastEmailSentAt ? new Date(task.lastEmailSentAt).getTime() : 0;
      const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
      const canSend = (now.getTime() - lastSent) > sevenDaysMs;

      if (canSend) {
        // Find assignee email from team_members
        const assigneeNames = task.assigneeNames || [];
        let recipientEmail: string | null = null;
        let recipientName = assigneeNames[0] || "Team Member";

        if (assigneeNames.length > 0) {
          const [member] = await db.select({ email: teamMembers.email, name: teamMembers.name })
            .from(teamMembers)
            .where(eq(teamMembers.name, assigneeNames[0]))
            .limit(1);
          if (member?.email) {
            recipientEmail = member.email;
            recipientName = member.name;
          }
        }

        // Get venture stage for context
        const ventureStage = task.ventureId
          ? (await db.select({ stage: ventures.stage }).from(ventures).where(eq(ventures.id, task.ventureId)).limit(1))[0]?.stage || "Active"
          : "Active";

        if (recipientEmail) {
          const deadline = new Date(now.getTime() + 48 * 60 * 60 * 1000);
          const deadlineStr = deadline.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

          try {
            const emailResult = await sendOverdueAutoEmail({
              to: recipientEmail,
              assigneeName: recipientName,
              taskTitle: task.title,
              ventureName,
              stage: ventureStage,
              daysOverdue,
              deadlineDate: deadlineStr,
            });

            if (emailResult.success) {
              // Update task email tracking
              await db.update(tasks).set({
                lastEmailSentAt: new Date(),
                emailSentCount: (task.emailSentCount || 0) + 1,
              } as any).where(eq(tasks.id, task.id));

              console.log(`[Overdue Agent] Auto-email sent to ${recipientEmail} for task "${task.title}"`);
            }
          } catch (emailErr) {
            console.error(`[Overdue Agent] Auto-email failed for task ${task.id}:`, emailErr);
          }
        }
      }
    }
  }

  return signals;
}

// ── AGENT 2: VELOCITY AGENT ────────────────────────────────────────────

export async function runVelocityAgent(
  db: NonNullable<Awaited<ReturnType<typeof getDb>>>,
  orgId?: number | null
): Promise<AgentSignal[]> {
  const signals: AgentSignal[] = [];

  // Scope ventures by org
  let ventureConditions: any[] = [ne(ventures.status, "Completed")];
  if (orgId) {
    const orgVentureIds = await getVentureIdsForOrg(db, orgId);
    if (orgVentureIds.length === 0) {
      signals.push({ agentName: "Velocity Agent", eventType: "signal", message: "No active ventures to monitor.", severity: "info", organizationId: orgId, audience: "client", requiresClientAction: false });
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
    signals.push({ agentName: "Velocity Agent", eventType: "signal", message: "No active ventures to monitor.", severity: "info", organizationId: orgId, audience: "client", requiresClientAction: false });
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

    // ── 3-Layer Blueprint context for velocity analysis ──
    let blueprintSteps: any[] = [];
    let blueprintContext = "";
    let bpSourceLabel = "";
    try {
      const bpResult = await lookupBlueprintForVenture(venture.id);
      blueprintSteps = bpResult.steps;
      bpSourceLabel = bpResult.sourceLabel;
      blueprintContext = buildBlueprintContext(bpResult, venture.stage);
    } catch { /* no blueprint */ }

    if (totalTasks > 0 && completedTasks === totalTasks) {
      const nextStage = getNextStage(venture.stage);
      if (nextStage) {
        const daysInStage = Math.floor(
          (now.getTime() - new Date(venture.updatedAt).getTime()) / (1000 * 60 * 60 * 24)
        );
        const hoursInStage = Math.floor(
          (now.getTime() - new Date(venture.updatedAt).getTime()) / (1000 * 60 * 60)
        );

        // ── Check auto-advance config for this org ──────────────────
        let autoAdvanceEnabled = false;
        let autoAdvanceSectors: string[] = [];
        if (orgId) {
          const [config] = await db.select({
            autoAdvanceEnabled: clientAgentConfig.autoAdvanceEnabled,
            autoAdvanceSectors: clientAgentConfig.autoAdvanceSectors,
          }).from(clientAgentConfig).where(eq(clientAgentConfig.organizationId, orgId)).limit(1);
          if (config) {
            autoAdvanceEnabled = config.autoAdvanceEnabled;
            autoAdvanceSectors = config.autoAdvanceSectors || [];
          }
        }

        // Determine if this is a capital stage (requires Mode B)
        const capitalStage = isCapitalStage(venture.stage);
        const sectorAuthorized = autoAdvanceSectors.length === 0 || autoAdvanceSectors.includes(venture.sector);
        const canAutoAdvance = autoAdvanceEnabled && sectorAuthorized && !capitalStage;

        // Get client primary contact for email triggers
        let clientEmail: string | null = null;
        let clientContactName = "Team";
        if (orgId) {
          const [org] = await db.select({
            primaryContactEmail: organizations.primaryContactEmail,
            primaryContactName: organizations.primaryContactName,
            name: organizations.name,
          }).from(organizations).where(eq(organizations.id, orgId)).limit(1);
          if (org?.primaryContactEmail) {
            clientEmail = org.primaryContactEmail;
            clientContactName = org.primaryContactName || org.name;
          }
        }

        // Completed task titles for email context
        const completedTaskTitles = await db.select({ title: tasks.title })
          .from(tasks)
          .where(and(eq(tasks.ventureId, venture.id), eq(tasks.status, "complete")))
          .limit(10);
        const stepNames = completedTaskTitles.map(t => t.title);

        if (canAutoAdvance) {
          // ── MODE A: Fully automatic advance ──────────────────────
          await db.update(ventures).set({ stage: nextStage }).where(eq(ventures.id, venture.id));

          await db.insert(ventureVelocity).values({
            organizationId: orgId,
            ventureId: venture.id,
            ventureName: venture.name,
            sector: venture.sector,
            fromStage: venture.stage,
            toStage: nextStage,
            daysInStage,
            hoursInStage,
            advancedBy: "ATLAS Agent",
            blockingStepsTotal: totalTasks,
            blockingStepsCompleted: completedTasks,
            tasksCompletedInStage: completedTasks,
          });

          signals.push({
            agentName: "Velocity Agent",
            eventType: "status_change",
            message: `"${venture.name}" auto-advanced from ${venture.stage} \u2192 ${nextStage} in ${daysInStage} days. ${totalTasks} tasks completed.${bpSourceLabel ? ` [${bpSourceLabel}]` : ""}`,
            severity: "info",
            organizationId: orgId,
            audience: "client",
            requiresClientAction: false,
            actionType: "advance",
            actionLabel: "View Venture",
            actionPayload: { ventureId: venture.id, ventureName: venture.name },
            entityType: "venture",
            agentEntityId: String(venture.id),
            agentEntityName: venture.name,
            oldStatus: venture.stage,
            newStatus: nextStage,
          });

          // ── Blueprint refinement: auto-mark current stage steps as complete ──
          if (blueprintSteps.length > 0) {
            const stageSteps = blueprintSteps.filter(s => s.stageName === venture.stage && s.status !== "complete");
            for (const step of stageSteps) {
              await db.update(ventureProcessTracking)
                .set({ status: "complete", completedAt: new Date() })
                .where(
                  and(
                    eq(ventureProcessTracking.ventureId, venture.id),
                    eq(ventureProcessTracking.stepName, step.stepName)
                  )
                );
            }
          }

          // ── TRIGGER 3: Stage advanced confirmation email ────────────
          if (clientEmail) {
            // Get avg days for benchmark
            const [avgResult] = await db.select({
              avg: sql<number>`AVG(${ventureVelocity.daysInStage})`,
            }).from(ventureVelocity).where(
              orgId ? eq(ventureVelocity.organizationId, orgId) : sql`1=1`
            );
            const clientAvgDays = avgResult?.avg ? Math.round(avgResult.avg) : null;

            try {
              await sendStageAdvancedEmail({
                to: clientEmail,
                contactName: clientContactName,
                ventureName: venture.name,
                previousStage: venture.stage,
                newStage: nextStage,
                daysInPreviousStage: daysInStage,
                clientAvgDays,
                nextBlockingSteps: [],  // No steps defined yet for new stage
              });
              console.log(`[Velocity Agent] Stage-advanced email sent to ${clientEmail} for ${venture.name}`);
            } catch (emailErr) {
              console.error(`[Velocity Agent] Stage-advanced email failed:`, emailErr);
            }
          }
        } else {
          // ── MODE B: Ready to advance — requires client approval ──
          // Dedup: skip if we already have an unactioned ready-to-advance signal for this venture in the last 24h
          const dedupConditions: any[] = [
            eq(agentEvents.agentName, "Velocity Agent"),
            eq(agentEvents.agentEntityId, String(venture.id)),
            eq(agentEvents.actionType, "advance"),
            gte(agentEvents.createdAt, new Date(now.getTime() - 24 * 60 * 60 * 1000)),
          ];
          if (orgId) dedupConditions.push(eq(agentEvents.organizationId, orgId));
          const recentAdvanceSignals = await db
            .select({ id: agentEvents.id })
            .from(agentEvents)
            .where(and(...dedupConditions))
            .limit(1);
          if (recentAdvanceSignals.length > 0) continue;

          signals.push({
            agentName: "Velocity Agent",
            eventType: "alert",
            message: `"${venture.name}" has completed all ${totalTasks} tasks in ${venture.stage} and is ready to advance to ${nextStage}.${capitalStage ? " Capital stage \u2014 requires explicit approval." : " One-click advance available."}${bpSourceLabel ? ` [${bpSourceLabel}]` : ""}`,
            severity: "info",
            organizationId: orgId,
            audience: "client",
            requiresClientAction: true,
            actionType: "advance",
            actionLabel: capitalStage ? "Review & Advance" : "Advance Stage",
            actionPayload: {
              ventureId: venture.id,
              ventureName: venture.name,
              currentStage: venture.stage,
              nextStage,
              daysInStage,
              hoursInStage,
              completedTasks: totalTasks,
              isCapitalStage: capitalStage,
            },
            entityType: "venture",
            agentEntityId: String(venture.id),
            agentEntityName: venture.name,
            oldStatus: venture.stage,
            newStatus: `ready:${nextStage}`,
          });

          // ── TRIGGER 2: Ready-to-advance email ──────────────────────
          if (clientEmail) {
            try {
              await sendReadyToAdvanceEmail({
                to: clientEmail,
                contactName: clientContactName,
                ventureName: venture.name,
                currentStage: venture.stage,
                nextStage,
                completedSteps: stepNames,
              });
              console.log(`[Velocity Agent] Ready-to-advance email sent to ${clientEmail} for ${venture.name}`);
            } catch (emailErr) {
              console.error(`[Velocity Agent] Ready-to-advance email failed:`, emailErr);
            }
          }
        }
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

      // Blueprint context for stall detection (already loaded above)
      const stallBlueprintCtx = blueprintContext;

      const interventionNote = await callAgentLLM(
        "You are ATLAS. Draft a brief internal note (3 sentences max) recommending a specific intervention for a stalled venture. Name the venture, how long it's been stalled, and one concrete next action to unblock it. If blueprint steps are provided, reference the specific blocking step and who owns it.",
        `Venture: "${venture.name}" | Sector: ${venture.sector} | Stage: In Validation | Days stalled: ${daysStalled} | Team members assigned: ${teamNames}${stallBlueprintCtx}${bpSourceLabel ? ` | Operating on: ${bpSourceLabel}` : ""}`
      );

      signals.push({
        agentName: "Velocity Agent",
        eventType: "alert",
        message: interventionNote,
        severity: "warning",
        organizationId: orgId,
        audience: "both",
        requiresClientAction: true,
        actionType: "escalate",
        actionLabel: "Unblock Venture",
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
      audience: "client",
      requiresClientAction: false,
      entityType: "venture",
    });
  }

  return signals;
}

// ── AGENT 3: DISTRIBUTION SENTINEL ─────────────────────────────────────

export async function runDistributionSentinel(
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
      audience: "client",
      requiresClientAction: false,
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
      daysUntil !== null && daysUntil < 0 ? "critical" :
      daysUntil !== null && daysUntil <= 7 ? "critical" :
      daysUntil !== null && daysUntil <= 30 ? "warning" : "info";

    const fundName = dist.fund || dist.name;
    const amount = Number(dist.amount || 0);

    // Dedup: skip if a pending LP notice draft already exists for this distribution
    const existingLpDraft = await db
      .select({ id: agentDrafts.id })
      .from(agentDrafts)
      .where(
        and(
          sql`${agentDrafts.organizationId} = ${dist.organizationId}`,
          eq(agentDrafts.draftType, "lp_notice"),
          eq(agentDrafts.status, "pending"),
          sql`${agentDrafts.subject} LIKE ${`%${fundName}%`}`
        )
      )
      .limit(1);

    if (existingLpDraft.length > 0) {
      // Draft already exists — skip
      signals.push({
        agentName: "Distribution Sentinel",
        eventType: "alert",
        message: `${fundName}: $${amount.toLocaleString()} — existing LP notice pending, skipping duplicate.`,
        severity,
        organizationId: dist.organizationId,
        audience: "client",
        requiresClientAction: false,
        actionType: "notify" as ActionType,
      });
      continue;
    }

    const draftBody = await callAgentLLM(
      "You are ATLAS. Draft a brief, professional LP distribution notification (4 sentences max). Include fund name, amount, timing, and next steps. Professional tone. Sign as 'ATLAS'.",
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
      message: `${fundName}: $${amount.toLocaleString()} ${daysUntil !== null ? (daysUntil < 0 ? `${Math.abs(daysUntil)} days overdue` : daysUntil === 0 ? `due today` : `due in ${daysUntil} days`) : "date TBD"}. LP notice drafted.`,
      severity,
      organizationId: dist.organizationId,
      audience: "client",
      requiresClientAction: true,
      actionType: "draft",
      actionLabel: "Confirm Distribution",
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
      audience: "client",
      requiresClientAction: false,
    });
  }

  return signals;
}

// ── AGENT 4: ORCHESTRATOR ──────────────────────────────────────────────

export async function runOrchestrator(
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
    audience: "operator",
    requiresClientAction: false,
    actionType: "notify",
    actionLabel: "Mark Resolved",
  });

  return signals;
}

// ── Persist Signals ────────────────────────────────────────────────────

export async function persistSignals(
  db: NonNullable<Awaited<ReturnType<typeof getDb>>>,
  signals: AgentSignal[]
): Promise<void> {
  if (signals.length === 0) return;

  const dedupWindow = new Date(Date.now() - 6 * 60 * 60 * 1000); // 6h dedup window

  for (const signal of signals) {
    // Dedup: skip if a matching signal already exists within the dedup window
    if (signal.agentEntityId) {
      const dedupConds: any[] = [
        eq(agentEvents.agentName, signal.agentName),
        eq(agentEvents.agentEntityId, signal.agentEntityId),
        gte(agentEvents.createdAt, dedupWindow),
      ];
      if (signal.actionType) dedupConds.push(eq(agentEvents.actionType, signal.actionType));
      if (signal.organizationId) dedupConds.push(eq(agentEvents.organizationId, signal.organizationId));
      const existing = await db.select({ id: agentEvents.id }).from(agentEvents).where(and(...dedupConds)).limit(1);
      if (existing.length > 0) continue;
    }

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
      audience: signal.audience ?? "operator",
      requiresClientAction: signal.requiresClientAction ?? false,
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

      // Cross-tenant isolation: validates org access, throws FORBIDDEN on mismatch
      const effectiveOrgId = resolveOrgId(ctx.user, input?.organizationId);

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

      const effectiveOrgId = resolveOrgId(ctx.user, input?.organizationId);

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

      const effectiveOrgId = resolveOrgId(ctx.user, input?.organizationId);

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

      const effectiveOrgId = resolveOrgId(ctx.user, input?.organizationId);

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
  sendDraft: protectedProcedure
    .input(z.object({
      draftId: z.number(),
      editedBody: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Verify the draft belongs to the user's org
      const effectiveOrgId = resolveOrgId(ctx.user, undefined);
      const [draft] = await db.select().from(agentDrafts).where(eq(agentDrafts.id, input.draftId)).limit(1);
      if (!draft) throw new Error("Draft not found");
      if (effectiveOrgId && draft.organizationId !== effectiveOrgId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
      }

      const updates: Record<string, unknown> = {
        status: "sent",
        sentAt: new Date(),
        sentBy: ctx.user.name || ctx.user.email || "User",
      };

      if (input.editedBody) {
        updates.body = input.editedBody;
      }

      await db
        .update(agentDrafts)
        .set(updates as any)
        .where(eq(agentDrafts.id, input.draftId));

      // Also mark any related agent_event as action_taken
      const sentDraft = await db
        .select()
        .from(agentDrafts)
        .where(eq(agentDrafts.id, input.draftId))
        .limit(1);

      if (sentDraft[0]) {
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
  dismissDraft: protectedProcedure
    .input(z.object({ draftId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Verify the draft belongs to the user's org
      const effectiveOrgId = resolveOrgId(ctx.user, undefined);
      const [draft] = await db.select().from(agentDrafts).where(eq(agentDrafts.id, input.draftId)).limit(1);
      if (!draft) throw new Error("Draft not found");
      if (effectiveOrgId && draft.organizationId !== effectiveOrgId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
      }

      await db
        .update(agentDrafts)
        .set({ status: "dismissed" })
        .where(eq(agentDrafts.id, input.draftId));

      return { success: true };
    }),

  /**
   * Restore a dismissed draft to pending
   */
  restoreDraft: protectedProcedure
    .input(z.object({ draftId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Verify the draft belongs to the user's org
      const effectiveOrgId = resolveOrgId(ctx.user, undefined);
      const [draft] = await db.select().from(agentDrafts).where(eq(agentDrafts.id, input.draftId)).limit(1);
      if (!draft) throw new Error("Draft not found");
      if (effectiveOrgId && draft.organizationId !== effectiveOrgId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
      }

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

      const effectiveOrgId = resolveOrgId(ctx.user, input?.organizationId);

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
      const effectiveOrgId = resolveOrgId(ctx.user, input?.organizationId);

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

  /**
   * Client Velocity Feed — returns events visible to clients, grouped by type
   * ACTION NEEDED → COMPLETED → WATCHING
   */
  clientFeed: protectedProcedure
    .input(z.object({
      organizationId: z.number().optional(),
      limit: z.number().min(1).max(100).default(30),
    }).optional())
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) return { actionNeeded: [], completed: [], watching: [] };

      const effectiveOrgId = resolveOrgId(ctx.user, input?.organizationId);

      const conditions: any[] = [
        sql`${agentEvents.audience} IN ('client', 'both')`,
        eq(agentEvents.clientDismissed, false),
      ];
      if (effectiveOrgId) {
        conditions.push(eq(agentEvents.organizationId, effectiveOrgId));
      }

      const events = await db
        .select()
        .from(agentEvents)
        .where(and(...conditions))
        .orderBy(desc(agentEvents.createdAt))
        .limit(input?.limit ?? 30);

      const actionNeeded = events.filter(e => e.requiresClientAction && !e.actionTaken);
      const completed = events.filter(e => e.actionTaken);
      const watching = events.filter(e => !e.requiresClientAction && !e.actionTaken);

      return { actionNeeded, completed, watching };
    }),

  /**
   * Client dismiss an event (hide from their feed)
   */
  clientDismiss: protectedProcedure
    .input(z.object({ eventId: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) return { success: false };

      await db
        .update(agentEvents)
        .set({ clientDismissed: true } as any)
        .where(eq(agentEvents.id, input.eventId));

      return { success: true };
    }),

  /**
   * Client execute action on an event (approve follow-up, confirm distribution, etc.)
   * Supports 4 action flows:
   *  1. approve_followup — approve agent's suggested task follow-up, optionally send email
   *  2. reassign_task — reassign an overdue task to a different team member
   *  3. confirm_distribution — confirm a distribution notice, optionally send LP email
   *  4. unblock_venture — provide info to unblock a stalled venture (assign task / schedule review / hold)
   */
  clientAction: protectedProcedure
    .input(z.object({
      eventId: z.number(),
      actionType: z.enum(["approve_followup", "reassign_task", "confirm_distribution", "unblock_venture", "generic"]),
      payload: z.record(z.string(), z.unknown()).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const userName = ctx.user.name || ctx.user.email || "Client";
      const orgId = ctx.user.organizationId;

      // Fetch the event
      const [event] = await db.select().from(agentEvents).where(eq(agentEvents.id, input.eventId)).limit(1);
      if (!event) throw new Error("Event not found");

      let result: Record<string, unknown> = { success: true };

      // ── Flow 1: Approve Follow-Up ──────────────────────────────────
      if (input.actionType === "approve_followup") {
        const payload = input.payload || {};
        const draftId = payload.draftId as number | undefined;
        const sendEmail = payload.sendEmail as boolean | undefined;
        const editedBody = payload.editedBody as string | undefined;

        // If there's a linked draft, mark it as sent
        if (draftId) {
          const updates: Record<string, unknown> = {
            status: "sent",
            sentAt: new Date(),
            sentBy: userName,
          };
          if (editedBody) {
            updates.body = editedBody;
          }
          await db.update(agentDrafts).set(updates as any).where(eq(agentDrafts.id, draftId));
        }

        // Optionally send email via Resend
        if (sendEmail) {
          try {
            const { sendTaskFollowUp } = await import("../emailService");
            const draft = draftId
              ? (await db.select().from(agentDrafts).where(eq(agentDrafts.id, draftId)).limit(1))[0]
              : null;

            if (draft?.recipientName) {
              // Find recipient email from team_members
              const [member] = await db.select().from(teamMembers)
                .where(eq(teamMembers.name, draft.recipientName)).limit(1);
              if (member?.email) {
                await sendTaskFollowUp({
                  to: member.email,
                  assigneeName: draft.recipientName,
                  taskTitle: event.agentEntityName || "Task",
                  ventureName: draft.ventureName || "Portfolio",
                  agentNote: editedBody || draft.body,
                });
                result.emailSent = true;
              }
            }
          } catch (e) {
            result.emailError = String(e);
          }
        }

        result.flow = "approve_followup";
      }

      // ── Flow 2: Reassign Task ──────────────────────────────────────
      if (input.actionType === "reassign_task") {
        const payload = input.payload || {};
        const taskId = (payload.taskId as number) || (event.actionPayload as any)?.taskId;
        const newAssigneeId = payload.newAssigneeId as number | undefined;
        const newAssigneeName = payload.newAssigneeName as string | undefined;
        const newDueDate = payload.newDueDate as string | undefined;
        const note = payload.note as string | undefined;

        if (taskId) {
          const updates: Record<string, unknown> = {};
          if (newAssigneeName) {
            updates.assigneeNames = [newAssigneeName];
          }
          if (newAssigneeId) {
            updates.assigneeIds = [newAssigneeId];
          }
          if (newDueDate) {
            updates.dueDate = newDueDate;
          }
          if (Object.keys(updates).length > 0) {
            await db.update(tasks).set(updates as any).where(eq(tasks.id, taskId));
          }

          // Log a new agent event for the reassignment
          await db.insert(agentEvents).values({
            organizationId: orgId,
            agentName: "Overdue Agent",
            eventType: "status_change",
            message: `Task reassigned to ${newAssigneeName || "new assignee"}${newDueDate ? ` with new deadline ${newDueDate}` : ""}${note ? `. Note: ${note}` : ""}`,
            severity: "info",
            entityType: "Task",
            agentEntityId: String(taskId),
            agentEntityName: event.agentEntityName,
            audience: "both",
            requiresClientAction: false,
            actionTaken: true,
            actionTakenAt: new Date(),
            actionTakenBy: userName,
          });
        }

        result.flow = "reassign_task";
        result.taskId = taskId;
      }

      // ── Flow 3: Confirm Distribution ───────────────────────────────
      if (input.actionType === "confirm_distribution") {
        const payload = input.payload || {};
        const distributionId = (payload.distributionId as number) || Number(event.agentEntityId);
        const sendEmail = payload.sendEmail as boolean | undefined;
        const editedBody = payload.editedBody as string | undefined;
        const draftId = payload.draftId as number | undefined;

        // Update distribution status to confirmed if we have an ID
        if (distributionId) {
          await db.update(distributions)
            .set({ status: "Confirmed" } as any)
            .where(eq(distributions.id, distributionId));
        }

        // Mark draft as sent if provided
        if (draftId) {
          const updates: Record<string, unknown> = {
            status: "sent",
            sentAt: new Date(),
            sentBy: userName,
          };
          if (editedBody) updates.body = editedBody;
          await db.update(agentDrafts).set(updates as any).where(eq(agentDrafts.id, draftId));
        }

        // Optionally send distribution notice email
        if (sendEmail) {
          try {
            const { sendDistributionNotice } = await import("../emailService");
            const draft = draftId
              ? (await db.select().from(agentDrafts).where(eq(agentDrafts.id, draftId)).limit(1))[0]
              : null;

            // Get distribution details
            const dist = distributionId
              ? (await db.select().from(distributions).where(eq(distributions.id, distributionId)).limit(1))[0]
              : null;

            if (dist) {
              const recipients = payload.recipients as string[] | undefined;
              const toAddress = recipients?.length ? recipients : "atlas@royaltonventures.com";
              await sendDistributionNotice({
                to: toAddress,
                recipientName: draft?.recipientName || "Investor",
                fundName: dist.fund || dist.name,
                amount: dist.amount?.toLocaleString() || "0",
                currency: dist.currency || "USD",
                distributionDate: dist.distributionDate || undefined,
                draftBody: editedBody || draft?.body || `Distribution of ${dist.name} has been confirmed.`,
              });
              result.emailSent = true;
            }
          } catch (e) {
            result.emailError = String(e);
          }
        }

        result.flow = "confirm_distribution";
        result.distributionId = distributionId;
      }

      // ── Flow 4: Unblock Venture ────────────────────────────────────
      if (input.actionType === "unblock_venture") {
        const payload = input.payload || {};
        const ventureId = (payload.ventureId as number) || Number(event.agentEntityId);
        const unblockAction = payload.unblockAction as string; // "assign_task" | "schedule_review" | "mark_hold"
        const taskTitle = payload.taskTitle as string | undefined;
        const taskAssignee = payload.taskAssignee as string | undefined;
        const taskDueDate = payload.taskDueDate as string | undefined;
        const reviewNote = payload.reviewNote as string | undefined;

        if (unblockAction === "assign_task" && ventureId) {
          // Create a new task to unblock
          await db.insert(tasks).values({
            organizationId: orgId,
            title: taskTitle || `Unblock: ${event.agentEntityName || "Venture"}`,
            ventureId,
            assigneeNames: taskAssignee ? [taskAssignee] : null,
            dueDate: taskDueDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
            status: "open",
            priority: "High",
            description: reviewNote || `Created to unblock stalled venture.`,
          });
          result.taskCreated = true;
        }

        if (unblockAction === "schedule_review" && ventureId) {
          // Create a review task
          await db.insert(tasks).values({
            organizationId: orgId,
            title: `Review: ${event.agentEntityName || "Venture"} — Unblock Assessment`,
            ventureId,
            assigneeNames: taskAssignee ? [taskAssignee] : null,
            dueDate: taskDueDate || new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
            status: "open",
            priority: "High",
            description: reviewNote || "Scheduled review to assess and unblock stalled venture.",
          });
          result.reviewScheduled = true;
        }

        if (unblockAction === "mark_hold" && ventureId) {
          // Mark venture as on hold
          await db.update(ventures)
            .set({ status: "On hold" } as any)
            .where(eq(ventures.id, ventureId));
          result.markedOnHold = true;
        }

        // Log the unblock action
        if (ventureId) {
          const actionDesc = unblockAction === "assign_task" ? "New task assigned"
            : unblockAction === "schedule_review" ? "Review scheduled"
            : unblockAction === "mark_hold" ? "Marked on hold"
            : "Action taken";

          await db.insert(agentEvents).values({
            organizationId: orgId,
            agentName: "Velocity Agent",
            eventType: "status_change",
            message: `Venture unblock: ${actionDesc} for ${event.agentEntityName || "venture"}${reviewNote ? `. ${reviewNote}` : ""}`,
            severity: "info",
            entityType: "Venture",
            agentEntityId: String(ventureId),
            agentEntityName: event.agentEntityName,
            audience: "both",
            requiresClientAction: false,
            actionTaken: true,
            actionTakenAt: new Date(),
            actionTakenBy: userName,
          });
        }

        result.flow = "unblock_venture";
        result.ventureId = ventureId;
      }

      // ── Mark the original event as actioned ────────────────────────
      await db
        .update(agentEvents)
        .set({
          actionTaken: true,
          actionTakenAt: new Date(),
          actionTakenBy: userName,
        } as any)
        .where(eq(agentEvents.id, input.eventId));

      return result;
    }),

  /**
   * Get a draft by ID (for action flow modals)
   */
  getDraft: protectedProcedure
    .input(z.object({ draftId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;
      const [draft] = await db.select().from(agentDrafts).where(eq(agentDrafts.id, input.draftId)).limit(1);
      return draft || null;
    }),

  /**
   * Get event details with linked entities (for action flow modals)
   */
  getEventDetail: protectedProcedure
    .input(z.object({ eventId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;

      const [event] = await db.select().from(agentEvents).where(eq(agentEvents.id, input.eventId)).limit(1);
      if (!event) return null;

      let draft = null;
      let task = null;
      let distribution = null;
      let venture = null;
      let availableTeam: { id: number; name: string; role: string | null }[] = [];

      const payload = (event.actionPayload || {}) as Record<string, unknown>;

      // Load linked draft
      if (payload.draftId) {
        const [d] = await db.select().from(agentDrafts).where(eq(agentDrafts.id, Number(payload.draftId))).limit(1);
        draft = d || null;
      }

      // Load linked task
      if (payload.taskId || (event.entityType === "Task" && event.agentEntityId)) {
        const taskId = Number(payload.taskId || event.agentEntityId);
        const [t] = await db.select().from(tasks).where(eq(tasks.id, taskId)).limit(1);
        task = t || null;
      }

      // Load linked distribution
      if (event.entityType === "Distribution" && event.agentEntityId) {
        const [d] = await db.select().from(distributions).where(eq(distributions.id, Number(event.agentEntityId))).limit(1);
        distribution = d || null;
      }

      // Load linked venture
      if (payload.ventureId || (event.entityType === "Venture" && event.agentEntityId)) {
        const ventureId = Number(payload.ventureId || event.agentEntityId);
        const [v] = await db.select().from(ventures).where(eq(ventures.id, ventureId)).limit(1);
        venture = v || null;
      }

      // Load available team members for reassignment (scoped to org)
      if (event.organizationId) {
        availableTeam = await db.select({
          id: teamMembers.id,
          name: teamMembers.name,
          role: teamMembers.role,
        }).from(teamMembers).where(
          eq(teamMembers.organizationId, event.organizationId)
        );
      }

      return { event, draft, task, distribution, venture, availableTeam };
    }),

  /**
   * Operator Oversight Feed — cross-client view of what agents did, what clients acted on, what's unactioned
   */
  operatorOversight: adminProcedure
    .input(z.object({
      limit: z.number().min(1).max(200).default(50),
      hoursBack: z.number().default(48),
    }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { agentActions: [], clientActions: [], unactioned: [], escalations: [] };

      const hoursBack = input?.hoursBack ?? 48;
      const cutoff = new Date(Date.now() - hoursBack * 60 * 60 * 1000);

      const recentEvents = await db
        .select()
        .from(agentEvents)
        .where(gte(agentEvents.createdAt, cutoff))
        .orderBy(desc(agentEvents.createdAt))
        .limit(input?.limit ?? 50);

      const agentActions = recentEvents.filter(e => e.audience === "operator" || e.audience === "both");
      const clientActions = recentEvents.filter(e => e.actionTaken && (e.audience === "client" || e.audience === "both"));
      const unactioned = recentEvents.filter(e =>
        e.requiresClientAction && !e.actionTaken && !e.clientDismissed &&
        (e.audience === "client" || e.audience === "both")
      );

      // Flag items unactioned for > 48 hours as escalations
      const escalationCutoff = new Date(Date.now() - 48 * 60 * 60 * 1000);
      const escalations = unactioned.filter(e => new Date(e.createdAt) < escalationCutoff);

      return { agentActions, clientActions, unactioned, escalations };
    }),

  /**
   * Client one-click stage advance (Mode B)
   * Advances a venture to the next stage when all tasks are complete.
   * Sends Trigger 3 email (stage-advanced confirmation).
   */
  clientAdvanceStage: protectedProcedure
    .input(z.object({
      ventureId: z.number(),
      eventId: z.number().optional(), // The "ready to advance" event to mark as actioned
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const userName = ctx.user.name || ctx.user.email || "Client";
      const orgId = ctx.user.organizationId;

      // Fetch the venture
      const [venture] = await db.select().from(ventures).where(eq(ventures.id, input.ventureId)).limit(1);
      if (!venture) throw new Error("Venture not found");

      const nextStage = getNextStage(venture.stage);
      if (!nextStage) throw new Error(`No next stage after ${venture.stage}`);

      // Verify all tasks are complete
      const ventureTasks = await db
        .select({ id: tasks.id, status: tasks.status })
        .from(tasks)
        .where(eq(tasks.ventureId, input.ventureId));

      const totalTasks = ventureTasks.length;
      const completedTasks = ventureTasks.filter(t => t.status === "complete").length;

      if (totalTasks > 0 && completedTasks < totalTasks) {
        throw new Error(`Cannot advance: ${totalTasks - completedTasks} tasks still incomplete`);
      }

      const now = new Date();
      const daysInStage = Math.floor(
        (now.getTime() - new Date(venture.updatedAt).getTime()) / (1000 * 60 * 60 * 24)
      );
      const hoursInStage = Math.floor(
        (now.getTime() - new Date(venture.updatedAt).getTime()) / (1000 * 60 * 60)
      );

      // Advance the venture
      await db.update(ventures).set({ stage: nextStage }).where(eq(ventures.id, input.ventureId));

      // Log velocity record
      await db.insert(ventureVelocity).values({
        organizationId: orgId,
        ventureId: input.ventureId,
        ventureName: venture.name,
        sector: venture.sector,
        fromStage: venture.stage,
        toStage: nextStage,
        daysInStage,
        hoursInStage,
        advancedBy: userName,
        blockingStepsTotal: totalTasks,
        blockingStepsCompleted: completedTasks,
        tasksCompletedInStage: completedTasks,
      });

      // Log agent event
      await db.insert(agentEvents).values({
        organizationId: orgId,
        agentName: "Velocity Agent",
        eventType: "status_change",
        message: `"${venture.name}" advanced from ${venture.stage} \u2192 ${nextStage} by ${userName} in ${daysInStage} days.`,
        severity: "info",
        entityType: "Venture",
        agentEntityId: String(input.ventureId),
        agentEntityName: venture.name,
        oldStatus: venture.stage,
        newStatus: nextStage,
        audience: "both",
        requiresClientAction: false,
        actionTaken: true,
        actionTakenAt: now,
        actionTakenBy: userName,
      });

      // Fire real-time trigger for intelligence engines
      if (orgId) {
        onStageAdvanced(orgId, input.ventureId, venture.name, venture.stage, nextStage)
          .catch((e: any) => console.error("[Agents] Stage advance trigger failed:", e));
      }

      // Mark the "ready to advance" event as actioned
      if (input.eventId) {
        await db.update(agentEvents).set({
          actionTaken: true,
          actionTakenAt: now,
          actionTakenBy: userName,
        } as any).where(eq(agentEvents.id, input.eventId));
      }

      // ── TRIGGER 3: Stage advanced confirmation email ──────────────
      if (orgId) {
        const [org] = await db.select({
          primaryContactEmail: organizations.primaryContactEmail,
          primaryContactName: organizations.primaryContactName,
          name: organizations.name,
        }).from(organizations).where(eq(organizations.id, orgId)).limit(1);

        if (org?.primaryContactEmail) {
          // Get avg days for benchmark
          const [avgResult] = await db.select({
            avg: sql<number>`AVG(${ventureVelocity.daysInStage})`,
          }).from(ventureVelocity).where(eq(ventureVelocity.organizationId, orgId));
          const clientAvgDays = avgResult?.avg ? Math.round(avgResult.avg) : null;

          try {
            await sendStageAdvancedEmail({
              to: org.primaryContactEmail,
              contactName: org.primaryContactName || org.name,
              ventureName: venture.name,
              previousStage: venture.stage,
              newStage: nextStage,
              daysInPreviousStage: daysInStage,
              clientAvgDays,
              nextBlockingSteps: [],
            });
          } catch (emailErr) {
            console.error(`[clientAdvanceStage] Email failed:`, emailErr);
          }
        }
      }

      return {
        success: true,
        ventureName: venture.name,
        fromStage: venture.stage,
        toStage: nextStage,
        daysInStage,
      };
    }),

  // ── agents.listEvents — alias for agents.list filtered by organizationId ──
  listEvents: protectedProcedure
    .input(
      z.object({
        organizationId: z.number(),
        limit: z.number().min(1).max(200).default(50),
        agentName: z.string().optional(),
        severity: z.string().optional(),
        actionType: z.string().optional(),
        unreadOnly: z.boolean().optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) return [];
      // Cross-tenant isolation: validates org access, throws FORBIDDEN on mismatch
      const effectiveOrgId = resolveOrgId(ctx.user, input.organizationId);
      const conditions: any[] = [];
      if (effectiveOrgId) {
        conditions.push(eq(agentEvents.organizationId, effectiveOrgId));
      }
      if (input.agentName) {
        conditions.push(eq(agentEvents.agentName, input.agentName));
      }
      if (input.severity) {
        conditions.push(eq(agentEvents.severity, input.severity));
      }
      if (input.actionType) {
        conditions.push(eq(agentEvents.actionType, input.actionType));
      }
      if (input.unreadOnly) {
        conditions.push(eq(agentEvents.isRead, false));
      }
      return db
        .select()
        .from(agentEvents)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(agentEvents.createdAt))
        .limit(input.limit);
    }),

  /**
   * Sector velocity benchmarks — compare a venture's velocity against its sector average
   */
  sectorBenchmarks: protectedProcedure
    .input(z.object({ organizationId: z.number().optional() }).optional())
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) return { sectors: [], overall: null };

      const effectiveOrgId = resolveOrgId(ctx.user, input?.organizationId);

      const conditions: any[] = [];
      if (effectiveOrgId) {
        conditions.push(eq(ventureVelocity.organizationId, effectiveOrgId));
      }

      const allAdvances = await db
        .select()
        .from(ventureVelocity)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(ventureVelocity.advancedAt));

      if (allAdvances.length === 0) return { sectors: [], overall: null };

      // Group by sector
      const sectorMap: Record<string, { totalDays: number; count: number; ventures: Set<number>; fastest: number; slowest: number }> = {};
      for (const adv of allAdvances) {
        const sector = adv.sector || "Others";
        if (!sectorMap[sector]) sectorMap[sector] = { totalDays: 0, count: 0, ventures: new Set(), fastest: Infinity, slowest: 0 };
        sectorMap[sector].totalDays += adv.daysInStage;
        sectorMap[sector].count += 1;
        sectorMap[sector].ventures.add(adv.ventureId);
        if (adv.daysInStage < sectorMap[sector].fastest) sectorMap[sector].fastest = adv.daysInStage;
        if (adv.daysInStage > sectorMap[sector].slowest) sectorMap[sector].slowest = adv.daysInStage;
      }

      const sectors = Object.entries(sectorMap).map(([name, stats]) => ({
        sector: name,
        avgDays: Math.round(stats.totalDays / stats.count),
        totalAdvances: stats.count,
        ventureCount: stats.ventures.size,
        fastest: stats.fastest === Infinity ? 0 : stats.fastest,
        slowest: stats.slowest,
      })).sort((a, b) => a.avgDays - b.avgDays);

      const overallAvg = Math.round(allAdvances.reduce((s, a) => s + a.daysInStage, 0) / allAdvances.length);

      return {
        sectors,
        overall: {
          avgDays: overallAvg,
          totalAdvances: allAdvances.length,
          totalVentures: new Set(allAdvances.map(a => a.ventureId)).size,
        },
      };
    }),

  /**
   * Enhanced Operator Oversight Feed — with escalation stats and filtering
   */
  enhancedOversight: adminProcedure
    .input(z.object({
      organizationId: z.number().optional(),
      severity: z.enum(["all", "critical", "warning", "info"]).default("all"),
      hoursBack: z.number().default(720),
      limit: z.number().min(1).max(500).default(200),
    }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { items: [], stats: { total: 0, critical: 0, pending: 0, resolved: 0 } };

      const hoursBack = input?.hoursBack ?? 720;
      const cutoff = new Date(Date.now() - hoursBack * 60 * 60 * 1000);
      const cutoff48h = new Date(Date.now() - 48 * 60 * 60 * 1000);
      const cutoff24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

      const conditions: any[] = [gte(agentEvents.createdAt, cutoff)];
      if (input?.organizationId) {
        conditions.push(eq(agentEvents.organizationId, input.organizationId));
      }
      if (input?.severity && input.severity !== "all") {
        conditions.push(eq(agentEvents.severity, input.severity));
      }

      const events = await db
        .select()
        .from(agentEvents)
        .where(and(...conditions))
        .orderBy(desc(agentEvents.createdAt))
        .limit(input?.limit ?? 100);

      // Enrich with org names
      const orgIds = Array.from(new Set(events.map(e => e.organizationId).filter(Boolean)));
      const orgs = orgIds.length > 0
        ? await db.select({ id: organizations.id, name: organizations.name })
            .from(organizations)
            .where(sql`${organizations.id} IN (${sql.join(orgIds.map(id => sql`${id}`), sql`, `)})`)
        : [];
      const orgMap = Object.fromEntries(orgs.map(o => [o.id, o.name]));

      const enriched = events.map(e => {
        let escalationLevel: "critical" | "warning" | "normal" | "resolved" = "normal";
        if (e.actionTaken) {
          escalationLevel = "resolved";
        } else if (e.requiresClientAction) {
          const eventTime = new Date(e.createdAt);
          if (eventTime < cutoff48h) escalationLevel = "critical";
          else if (eventTime < cutoff24h) escalationLevel = "warning";
          else escalationLevel = "normal";
        }
        return {
          ...e,
          orgName: e.organizationId ? orgMap[e.organizationId] || "Unknown" : "System",
          escalationLevel,
        };
      });

      // Compute stats
      const unactioned = events.filter(e => e.requiresClientAction && !e.actionTaken && !e.clientDismissed);
      const critical = unactioned.filter(e => new Date(e.createdAt) < cutoff48h).length;
      const pending = unactioned.filter(e => new Date(e.createdAt) >= cutoff48h && new Date(e.createdAt) < cutoff24h).length;
      const resolved = events.filter(e => e.actionTaken).length;

      return {
        items: enriched,
        stats: { total: events.length, unactioned: unactioned.length, critical, pending, resolved },
      };
    }),

  /**
   * Get escalation stats summary — admin only
   */
  escalationStats: adminProcedure
    .input(z.object({ organizationId: z.number().optional() }).optional())
    .query(async ({ input }) => {
      const { getEscalationStats } = await import("../intelligence/escalationEngine");
      return getEscalationStats(input?.organizationId);
    }),

  /**
   * Get agent scheduler status — admin only
   */
  schedulerStatus: adminProcedure
    .query(async () => {
      const { getSchedulerStatus } = await import("../agentScheduler");
      return getSchedulerStatus();
    }),

  /**
   * Manually trigger an agent cycle — admin only
   */
  triggerCycle: adminProcedure
    .mutation(async () => {
      const { triggerManualCycle } = await import("../agentScheduler");
      return await triggerManualCycle();
    }),
});
