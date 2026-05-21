// VENTEX Agent System — Velocity Build: Action-Based Intelligence Agents
// Four agents: Overdue, Velocity, Distribution Sentinel, Orchestrator
// Every event carries an ACTION — not just awareness, but execution.
// Multi-tenant: all queries scoped by organizationId

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
  compliance,
  spvs,
} from "../../drizzle/schema";
import {
  sendOverdueAutoEmail,
  sendReadyToAdvanceEmail,
  sendStageAdvancedEmail,
  sendPrincipalConfirmation,
  sendDistributionAlert,
  sendVelocityStallAlert,
  sendOrchestratorBriefing,
} from "../emailService";
import { onStageAdvanced, onTaskCompleted, onTaskOverdue } from "../intelligence/realtimeTriggers";
import { eq, desc, sql, and, ne, gte, lte, inArray, isNotNull } from "drizzle-orm";
import { invokeLLM } from "../_core/llm";
import { sanitizeLLMOutput } from "../security/llmSanitize";
import { isVentexTeam, resolveVentureScope, getOrgVentureIds } from "../security/rbac";
import { resolveOrgId } from "../security/orgScope";
import { lookupBlueprintForVenture, buildBlueprintContext } from "../blueprintLookup";
import { getDraftSafetyFields, getEventSafetyFields, isApprovedForExecution, logApprovalAction, generateDisclaimer } from "../aiSafety";
import { agentApprovalLog } from "../../drizzle/schema";
import type { User } from "../../drizzle/schema";


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
  // Vision spec v1: direct FK columns for agent log
  ventureId?: number | null;
  spvId?: number | null;
  taskId?: number | null;
  distributionId?: number | null;
  recipient?: string | null;
  outcome?: string | null;
}


// Vision spec v1: stages must be exactly Sourcing | Due Diligence | Active | Exiting | Closed
// Legacy stages are mapped to spec stages in getNextStage()
const STAGE_PIPELINE = [
  "Sourcing",
  "Due Diligence",
  "Active",
  "Exiting",
  "Closed",
];

// Legacy stage mapping — maps old stage names to spec stages for backward compat
const LEGACY_STAGE_MAP: Record<string, string> = {
  "In Validation": "Sourcing",
  "In Fundraising": "Due Diligence",
  "Active Ventures": "Active",
  "Completed": "Closed",
};

function normalizeStage(stage: string): string {
  return LEGACY_STAGE_MAP[stage] || stage;
}

// Capital-intensive stages require explicit Principal approval (Mode B)
// Spec: Never advance Exiting or Closed without explicit Principal confirmation
const CAPITAL_STAGES = ["Due Diligence", "Exiting", "In Fundraising"];

// Vision spec v1: stall thresholds by stage (days)
const STALL_THRESHOLDS: Record<string, number> = {
  "Sourcing": 30,
  "Due Diligence": 60,
  "Exiting": 90,
  // Active: no auto-flag unless Principal sets custom threshold
};

function getNextStage(current: string): string | null {
  const normalized = normalizeStage(current);
  const idx = STAGE_PIPELINE.indexOf(normalized);
  if (idx === -1 || idx >= STAGE_PIPELINE.length - 1) return null;
  return STAGE_PIPELINE[idx + 1];
}

function isCapitalStage(stage: string): boolean {
  const normalized = normalizeStage(stage);
  return CAPITAL_STAGES.includes(normalized);
}


async function callAgentLLM(systemPrompt: string, userPrompt: string): Promise<string> {
  try {
    const result = await invokeLLM({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    });
    const content = result.choices?.[0]?.message?.content;
    let text = "No analysis available.";
    if (typeof content === "string") text = content;
    else if (Array.isArray(content)) {
      const textPart = content.find((p: any) => typeof p === "object" && "type" in p && p.type === "text");
      if (textPart && "text" in textPart) text = (textPart as any).text;
    }
    const sanitized = sanitizeLLMOutput(text);
    if (sanitized.flagged) console.warn("[Agent LLM] Output flagged:", sanitized.flags);
    return sanitized.text;
  } catch (err) {
    console.error("[Agent LLM] Error:", err);
    return "Agent analysis temporarily unavailable.";
  }
}


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

// Vision spec v1 — Overdue Agent
// Runs every 6 hours. Queries all tasks where dueDate is past AND status is not Complete.
// Escalation chain: assignee → escalationContact → Principal
// Blocked tasks: immediate Principal alert with blockingReason

export async function runOverdueAgent(
  db: NonNullable<Awaited<ReturnType<typeof getDb>>>,
  orgId?: number | null
): Promise<AgentSignal[]> {
  const signals: AgentSignal[] = [];
  const now = new Date();

  // --- Part A: Overdue tasks (dueDate past, status not Complete, not Blocked) ---
  const overdueConditions: any[] = [
    ne(tasks.status, "complete"),
    ne(tasks.status, "Complete"),
    ne(tasks.status, "Blocked"),
    ne(tasks.status, "blocked"),
    sql`${tasks.dueDate} IS NOT NULL AND ${tasks.dueDate} < CURDATE()`,
  ];
  if (orgId) overdueConditions.push(eq(tasks.organizationId, orgId));

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
      followUpCount: tasks.followUpCount,
      lastFollowUpSent: tasks.lastFollowUpSent,
      escalationContact: tasks.escalationContact,
      blockingReason: tasks.blockingReason,
      spvId: tasks.spvId,
    })
    .from(tasks)
    .where(and(...overdueConditions));

  // --- Part B: Blocked tasks — immediate Principal alert ---
  const blockedConditions: any[] = [
    sql`(${tasks.status} = 'Blocked' OR ${tasks.status} = 'blocked')`,
  ];
  if (orgId) blockedConditions.push(eq(tasks.organizationId, orgId));

  const blockedTasks = await db
    .select({
      id: tasks.id,
      title: tasks.title,
      dueDate: tasks.dueDate,
      ventureId: tasks.ventureId,
      organizationId: tasks.organizationId,
      blockingReason: tasks.blockingReason,
      assigneeNames: tasks.assigneeNames,
      spvId: tasks.spvId,
    })
    .from(tasks)
    .where(and(...blockedConditions));

  // Get venture names for context
  const allVentureIds = Array.from(new Set([
    ...overdueTasks.filter(t => t.ventureId).map(t => t.ventureId!),
    ...blockedTasks.filter(t => t.ventureId).map(t => t.ventureId!),
  ]));
  let ventureMap: Record<number, { name: string; sector: string }> = {};
  if (allVentureIds.length > 0) {
    const ventureRows = await db
      .select({ id: ventures.id, name: ventures.name, sector: ventures.sector })
      .from(ventures)
      .where(inArray(ventures.id, allVentureIds));
    for (const v of ventureRows) {
      ventureMap[v.id] = { name: v.name, sector: v.sector };
    }
  }

  // Get Principal email for escalations
  let principalEmail: string | null = null;
  let principalName = "Principal";
  if (orgId) {
    const [org] = await db.select({
      primaryContactEmail: organizations.primaryContactEmail,
      primaryContactName: organizations.primaryContactName,
    }).from(organizations).where(eq(organizations.id, orgId)).limit(1);
    if (org?.primaryContactEmail) {
      principalEmail = org.primaryContactEmail;
      principalName = org.primaryContactName || "Principal";
    }
  }

  // --- Process blocked tasks: immediate Principal alert ---
  for (const task of blockedTasks) {
    // Dedup: skip if we already alerted about this blocked task in the last 24h
    const dedupConds: any[] = [
      eq(agentEvents.agentName, "Overdue Agent"),
      eq(agentEvents.agentEntityId, String(task.id)),
      eq(agentEvents.actionType, "escalate"),
      gte(agentEvents.createdAt, new Date(now.getTime() - 24 * 60 * 60 * 1000)),
    ];
    if (orgId) dedupConds.push(eq(agentEvents.organizationId, orgId));
    const recent = await db.select({ id: agentEvents.id }).from(agentEvents).where(and(...dedupConds)).limit(1);
    if (recent.length > 0) continue;

    const ventureName = task.ventureId ? ventureMap[task.ventureId]?.name || "Unknown" : "Unassigned";
    const reason = task.blockingReason || "No reason provided";

    signals.push({
      agentName: "Overdue Agent",
      eventType: "alert",
      message: `BLOCKED: "${task.title}" (${ventureName}) — ${reason}. Requires Principal attention.`,
      severity: "critical",
      organizationId: task.organizationId,
      audience: "both",
      requiresClientAction: true,
      actionType: "escalate",
      actionLabel: "Unblock Task",
      actionPayload: { taskId: task.id, blockingReason: reason },
      entityType: "task",
      agentEntityId: String(task.id),
      agentEntityName: task.title,
      taskId: task.id,
      ventureId: task.ventureId,
      spvId: task.spvId,
      recipient: principalName,
      outcome: "pending",
    });
  }

  // --- Process overdue tasks with escalation chain ---
  if (overdueTasks.length === 0 && blockedTasks.length === 0) {
    signals.push({
      agentName: "Overdue Agent",
      eventType: "signal",
      message: "All tasks are on schedule. No overdue or blocked items detected.",
      severity: "info",
      organizationId: orgId,
      audience: "client",
      requiresClientAction: false,
    });
    return signals;
  }

  for (const task of overdueTasks) {
    const due = new Date(task.dueDate!);
    const daysOverdue = Math.floor((now.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
    const followUpCount = task.followUpCount || 0;
    const lastFollowUp = task.lastFollowUpSent ? new Date(task.lastFollowUpSent) : null;
    const hoursSinceLastFollowUp = lastFollowUp
      ? (now.getTime() - lastFollowUp.getTime()) / (1000 * 60 * 60)
      : Infinity;

    const ventureName = task.ventureId ? ventureMap[task.ventureId]?.name || "Unknown" : "Unassigned";
    const assignees = task.assigneeNames?.join(", ") || "Unassigned";

    // Spec: determine escalation level
    // Level 1: followUpCount is 0 OR (lastFollowUpSent > 7 days ago AND followUpCount < 3) → send to assignee
    // Level 2: no response after 48h from first follow-up → send to escalationContact
    // Level 3: no response from escalation contact after 24h → send to Principal
    let escalationLevel: "assignee" | "escalation_contact" | "principal" = "assignee";
    let recipientLabel = assignees;
    let severity: Severity = "info";

    if (followUpCount === 0 || (hoursSinceLastFollowUp > 7 * 24 && followUpCount < 3)) {
      // Level 1: send follow-up to assignee
      escalationLevel = "assignee";
      recipientLabel = assignees;
      severity = daysOverdue > 7 ? "warning" : "info";
    } else if (followUpCount >= 1 && hoursSinceLastFollowUp > 48 && followUpCount < 3) {
      // Level 2: escalate to escalationContact
      escalationLevel = "escalation_contact";
      recipientLabel = task.escalationContact || "Escalation Contact";
      severity = "warning";
    } else if (followUpCount >= 3 || (followUpCount >= 2 && hoursSinceLastFollowUp > 24)) {
      // Level 3: escalate to Principal
      escalationLevel = "principal";
      recipientLabel = principalName;
      severity = "critical";
    } else {
      // Within cooldown period — skip
      continue;
    }

    // Mark task as overdue if not already
    if (task.status !== "overdue") {
      await db.update(tasks).set({ status: "overdue" }).where(eq(tasks.id, task.id));
    }

    // Update followUpCount and lastFollowUpSent
    await db.update(tasks).set({
      followUpCount: followUpCount + 1,
      lastFollowUpSent: now,
      lastActionDate: now,
      lastActionTaken: `Escalation level ${escalationLevel}: follow-up #${followUpCount + 1} sent to ${recipientLabel}`,
    } as any).where(eq(tasks.id, task.id));

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
      signals.push({
        agentName: "Overdue Agent",
        eventType: "status_change",
        message: `"${task.title}" still overdue (${daysOverdue} days). Existing draft pending — skipping duplicate.`,
        severity,
        organizationId: task.organizationId,
        audience: "client",
        requiresClientAction: false,
        actionType: "notify" as ActionType,
        taskId: task.id,
        ventureId: task.ventureId,
        recipient: recipientLabel,
        outcome: "pending",
      });
      continue;
    }

    // Blueprint context
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

    const escalationContext = escalationLevel === "principal"
      ? ` This task has been escalated through the chain (${followUpCount} follow-ups sent). Requires your direct intervention.`
      : escalationLevel === "escalation_contact"
      ? ` Assignee has not responded after ${followUpCount} follow-ups. Escalating to escalation contact.`
      : "";

    const draftBody = await callAgentLLM(
      `You are VENTEX, a venture velocity platform. Draft a brief, professional ${escalationLevel === "principal" ? "escalation alert" : "follow-up message"} (max 4 sentences). Reference the task and venture by name.${escalationContext} Be direct but professional. Sign off as 'VENTEX Operations'.`,
      `Task: "${task.title}" | Venture: ${ventureName} | Assigned to: ${assignees} | Days overdue: ${daysOverdue} | Follow-up #${followUpCount + 1} | Escalation level: ${escalationLevel} | Recipient: ${recipientLabel}${blueprintHint}`
    );

    const draftSafety = getDraftSafetyFields({ agentName: "Overdue Agent", draftType: "follow_up", hasEntityData: true, hasHistoricalData: daysOverdue > 0, hasBlueprintContext: !!blueprintHint });
    const draftResult = await db.insert(agentDrafts).values({
      organizationId: task.organizationId,
      ventureId: task.ventureId,
      ventureName,
      draftType: "follow_up",
      subject: `${escalationLevel === "principal" ? "ESCALATION: " : ""}Follow-up: ${task.title} (${daysOverdue} days overdue)`,
      body: draftBody,
      recipientName: recipientLabel,
      recipientRole: escalationLevel === "principal" ? "Principal" : escalationLevel === "escalation_contact" ? "Escalation Contact" : "Assignee",
      status: "pending",
      createdByAgent: "Overdue Agent",
      ...draftSafety,
    });

    const draftId = (draftResult as any)[0]?.insertId;

    signals.push({
      agentName: "Overdue Agent",
      eventType: escalationLevel === "principal" ? "alert" : "status_change",
      message: `"${task.title}" overdue (${daysOverdue} days). ${escalationLevel === "principal" ? "ESCALATED TO PRINCIPAL." : escalationLevel === "escalation_contact" ? `Escalated to ${recipientLabel}.` : `Follow-up #${followUpCount + 1} drafted for ${assignees}.`}${blueprintSourceLabel ? ` [${blueprintSourceLabel}]` : ""}`,
      severity,
      organizationId: task.organizationId,
      audience: escalationLevel === "principal" ? "both" : "client",
      requiresClientAction: true,
      actionType: escalationLevel === "principal" ? "escalate" : "draft",
      actionLabel: escalationLevel === "principal" ? "Review Escalation" : "Approve Follow-Up",
      actionPayload: { draftId, taskId: task.id, escalationLevel },
      entityType: "task",
      agentEntityId: String(task.id),
      agentEntityName: task.title,
      oldStatus: task.status,
      newStatus: "overdue",
      taskId: task.id,
      ventureId: task.ventureId,
      spvId: task.spvId,
      recipient: recipientLabel,
      outcome: "pending",
    });

    // Auto-send email for escalation levels 2 and 3
    if (escalationLevel !== "assignee") {
      let recipientEmail: string | null = null;
      if (escalationLevel === "principal") {
        recipientEmail = principalEmail;
      } else if (task.escalationContact) {
        // Look up escalation contact email
        const [member] = await db.select({ email: teamMembers.email })
          .from(teamMembers)
          .where(eq(teamMembers.name, task.escalationContact))
          .limit(1);
        recipientEmail = member?.email || null;
      }

      if (recipientEmail) {
        const { checkEmailGate } = await import("../notificationGate");
        const gate = await checkEmailGate(recipientEmail, "overdue");
        if (gate.allowed) {
          try {
            await sendOverdueAutoEmail({
              to: recipientEmail,
              assigneeName: recipientLabel,
              taskTitle: task.title,
              ventureName,
              stage: "Overdue",
              daysOverdue,
              deadlineDate: new Date(now.getTime() + 48 * 60 * 60 * 1000).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" }),
            });
          } catch (emailErr) {
            console.error(`[Overdue Agent] Escalation email failed for task ${task.id}:`, emailErr);
          }
        }
      }
    }
  }

  return signals;
}


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
      lastActivityDate: ventures.lastActivityDate,
      daysInCurrentStage: ventures.daysInCurrentStage,
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
            advancedBy: "VENTEX Agent",
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

          // Blueprint refinement: auto-mark current stage steps as complete
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

          if (clientEmail) {
            const { checkEmailGate } = await import("../notificationGate");
            const stageGate = await checkEmailGate(clientEmail, "stage_advance");
            if (stageGate.allowed) {
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
              } catch (emailErr) {
                console.error(`[Velocity Agent] Stage-advanced email failed:`, emailErr);
              }
            }
          }
        } else {
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
            } catch (emailErr) {
              console.error(`[Velocity Agent] Ready-to-advance email failed:`, emailErr);
            }
          }
        }
      }
    }

    // Vision spec v1: stall detection using lastActivityDate and STALL_THRESHOLDS
    const normalizedStage = normalizeStage(venture.stage);
    const stallThreshold = STALL_THRESHOLDS[normalizedStage];
    const lastActivity = venture.lastActivityDate ? new Date(venture.lastActivityDate) : new Date(venture.updatedAt);
    const daysSinceActivity = Math.floor((now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24));

    // Update daysInCurrentStage on the venture
    const daysInStageCalc = Math.floor((now.getTime() - new Date(venture.updatedAt).getTime()) / (1000 * 60 * 60 * 24));
    if (daysInStageCalc !== (venture.daysInCurrentStage || 0)) {
      await db.update(ventures).set({ daysInCurrentStage: daysInStageCalc } as any).where(eq(ventures.id, venture.id));
    }

    if (stallThreshold && daysSinceActivity >= stallThreshold) {
      // Stall detected — check dedup
      const stallConditions: any[] = [
        eq(agentEvents.agentName, "Velocity Agent"),
        eq(agentEvents.agentEntityId, String(venture.id)),
        eq(agentEvents.actionType, "escalate"),
        gte(agentEvents.createdAt, new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)),
      ];
      if (orgId) stallConditions.push(eq(agentEvents.organizationId, orgId));
      const recentStallAlerts = await db.select({ id: agentEvents.id }).from(agentEvents).where(and(...stallConditions)).limit(1);

      if (recentStallAlerts.length === 0) {
        const team = await db
          .select({ name: teamMembers.name })
          .from(ventureTeam)
          .innerJoin(teamMembers, eq(ventureTeam.memberId, teamMembers.id))
          .where(eq(ventureTeam.ventureId, venture.id));
        const teamNames = team.map(t => t.name).join(", ") || "No team assigned";

        const interventionNote = await callAgentLLM(
          "You are VENTEX. Draft a brief internal note (3 sentences max) recommending a specific intervention for a stalled venture. Name the venture, how long it's been stalled, the stage threshold that was breached, and one concrete next action to unblock it.",
          `Venture: "${venture.name}" | Sector: ${venture.sector} | Stage: ${normalizedStage} | Days since last activity: ${daysSinceActivity} | Threshold: ${stallThreshold} days | Team: ${teamNames}${blueprintContext}${bpSourceLabel ? ` | Operating on: ${bpSourceLabel}` : ""}`
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
           actionPayload: { ventureId: venture.id, ventureName: venture.name, daysSinceActivity, stallThreshold },
          entityType: "venture",
          agentEntityId: String(venture.id),
          agentEntityName: venture.name,
          ventureId: venture.id,
          outcome: "pending",
        });

        // Send velocity stall alert email
        if (orgId) {
          try {
            const [stallOrg] = await db.select({
              primaryContactEmail: organizations.primaryContactEmail,
              primaryContactName: organizations.primaryContactName,
            }).from(organizations).where(eq(organizations.id, orgId)).limit(1);
            if (stallOrg?.primaryContactEmail) {
              await sendVelocityStallAlert({
                to: stallOrg.primaryContactEmail,
                recipientName: stallOrg.primaryContactName || "Team",
                ventureName: venture.name,
                sector: venture.sector,
                stage: normalizedStage,
                daysSinceActivity,
                threshold: stallThreshold,
                interventionNote,
              });
            }
          } catch (emailErr) {
            console.error(`[Velocity Agent] Stall alert email failed:`, emailErr);
          }
        }
      }
    }
    // Legacy stall detection for In Validation with no tasks
    if (totalTasks === 0 && (venture.stage === "In Validation" || normalizedStage === "Sourcing")) {
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
        "You are VENTEX. Draft a brief internal note (3 sentences max) recommending a specific intervention for a stalled venture. Name the venture, how long it's been stalled, and one concrete next action to unblock it. If blueprint steps are provided, reference the specific blocking steps and who owns them.",
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
        ventureId: venture.id,
        outcome: "pending",
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


// Vision spec v1 — Distribution Sentinel
// Timeline: T-30 draft LP notice | T-14 verify wire instructions | T-7 Principal confirmation | T-3 final reminder | T-0 execute
// Hard blocks: no distribution without principalConfirmed AND wireInstructionsOnFile

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
      ventureId: distributions.ventureId,
      spvId: distributions.spvId,
      lpRecipients: distributions.lpRecipients,
      noticeDraftStatus: distributions.noticeDraftStatus,
      noticeSentDate: distributions.noticeSentDate,
      principalConfirmed: distributions.principalConfirmed,
      principalConfirmedAt: distributions.principalConfirmedAt,
      wireInstructionsOnFile: distributions.wireInstructionsOnFile,
      confirmationReceiptSent: distributions.confirmationReceiptSent,
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

  // Resolve principal email for this org
  let principalEmail: string | null = null;
  let principalName = "Principal";
  if (orgId) {
    const [org] = await db.select({
      primaryContactEmail: organizations.primaryContactEmail,
      primaryContactName: organizations.primaryContactName,
    }).from(organizations).where(eq(organizations.id, orgId)).limit(1);
    if (org?.primaryContactEmail) {
      principalEmail = org.primaryContactEmail;
      principalName = org.primaryContactName || "Principal";
    }
  }

  for (const dist of scheduledDists) {
    const dueDate = dist.distributionDate ? new Date(dist.distributionDate) : null;
    const daysUntil = dueDate
      ? Math.floor((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      : null;

    // 24h dedup per distribution
    const alertConditions: any[] = [
      eq(agentEvents.agentName, "Distribution Sentinel"),
      eq(agentEvents.agentEntityId, String(dist.id)),
      gte(agentEvents.createdAt, new Date(now.getTime() - 24 * 60 * 60 * 1000)),
    ];
    if (orgId) alertConditions.push(eq(agentEvents.organizationId, orgId));
    const recentAlerts = await db.select({ id: agentEvents.id }).from(agentEvents).where(and(...alertConditions)).limit(1);
    if (recentAlerts.length > 0) continue;

    const fundName = dist.fund || dist.name;
    const amount = Number(dist.amount || 0);
    const lpCount = dist.lpRecipients?.length || 0;
    const hasWireInstructions = dist.wireInstructionsOnFile;
    const hasPrincipalConfirmation = dist.principalConfirmed;
    const noticeDrafted = dist.noticeDraftStatus === "drafted" || dist.noticeDraftStatus === "sent";

    // --- T-30: Draft LP notice ---
    if (daysUntil !== null && daysUntil <= 30 && !noticeDrafted) {
      // Dedup: skip if a pending LP notice draft already exists
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

      if (existingLpDraft.length === 0) {
        const draftBody = await callAgentLLM(
          "You are VENTEX. Draft a brief, professional LP distribution notification (4 sentences max). Include fund name, amount, timing, LP recipients count, and next steps. Professional tone. Sign as 'VENTEX Operations'.",
          `${fundName} | $${amount.toLocaleString()} | Due: ${dist.distributionDate || "TBD"} | Days until: ${daysUntil} | LP recipients: ${lpCount || "TBD"}`
        );

        const draftSafety = getDraftSafetyFields({ agentName: "Distribution Sentinel", draftType: "lp_notice", hasEntityData: true, hasHistoricalData: true });
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
          ...draftSafety,
        });

        const draftId = (draftResult as any)[0]?.insertId;

        // Update distribution notice status
        await db.update(distributions).set({ noticeDraftStatus: "drafted" } as any).where(eq(distributions.id, dist.id));

        signals.push({
          agentName: "Distribution Sentinel",
          eventType: "alert",
          message: `T-${daysUntil}: ${fundName} ($${amount.toLocaleString()}) — LP notice drafted for ${lpCount || "pending"} recipients.`,
          severity: "warning",
          organizationId: dist.organizationId,
          audience: "client",
          requiresClientAction: true,
          actionType: "draft",
          actionLabel: "Review LP Notice",
          actionPayload: { draftId, distributionId: dist.id },
          entityType: "distribution",
          agentEntityId: String(dist.id),
          agentEntityName: fundName,
          distributionId: dist.id,
          ventureId: dist.ventureId,
          spvId: dist.spvId,
          outcome: "pending",
        });
      }
    }

    // --- T-14: Verify wire instructions ---
    if (daysUntil !== null && daysUntil <= 14 && !hasWireInstructions) {
      signals.push({
        agentName: "Distribution Sentinel",
        eventType: "alert",
        message: `T-${daysUntil}: ${fundName} ($${amount.toLocaleString()}) — WIRE INSTRUCTIONS MISSING. Distribution cannot proceed without wire instructions on file.`,
        severity: "critical",
        organizationId: dist.organizationId,
        audience: "both",
        requiresClientAction: true,
        actionType: "escalate",
        actionLabel: "Upload Wire Instructions",
        actionPayload: { distributionId: dist.id, missingItem: "wireInstructions" },
        entityType: "distribution",
        agentEntityId: String(dist.id),
        agentEntityName: fundName,
        distributionId: dist.id,
        ventureId: dist.ventureId,
        spvId: dist.spvId,
        recipient: "Principal",
        outcome: "pending",
      });

      // Send distribution alert email for T-14
      if (principalEmail) {
        try {
          await sendDistributionAlert({
            to: principalEmail,
            recipientName: principalName,
            fundName,
            amount: amount.toLocaleString(),
            currency: dist.currency || "USD",
            daysUntil: daysUntil!,
            milestone: "T-14",
            alertMessage: `Wire instructions are missing for this distribution. The distribution cannot proceed without wire instructions on file.`,
            missingItems: ["Wire transfer instructions"],
          });
        } catch (emailErr) {
          console.error(`[Distribution Sentinel] T-14 alert email failed:`, emailErr);
        }
      }
    }

    // --- T-7: Principal confirmation required ---
    if (daysUntil !== null && daysUntil <= 7 && !hasPrincipalConfirmation) {
      signals.push({
        agentName: "Distribution Sentinel",
        eventType: "alert",
        message: `T-${daysUntil}: ${fundName} ($${amount.toLocaleString()}) — PRINCIPAL CONFIRMATION REQUIRED. Distribution blocked until Principal approves.`,
        severity: "critical",
        organizationId: dist.organizationId,
        audience: "both",
        requiresClientAction: true,
        actionType: "escalate",
        actionLabel: "Confirm Distribution",
        actionPayload: { distributionId: dist.id, missingItem: "principalConfirmation" },
        entityType: "distribution",
        agentEntityId: String(dist.id),
        agentEntityName: fundName,
        distributionId: dist.id,
        ventureId: dist.ventureId,
        spvId: dist.spvId,
        recipient: "Principal",
        outcome: "pending",
      });

      // Send principal confirmation email
      if (principalEmail) {
        try {
          await sendPrincipalConfirmation({
            to: principalEmail,
            principalName,
            entityType: "distribution",
            entityName: fundName,
            amount: amount.toLocaleString(),
            currency: dist.currency || "USD",
            daysUntilDeadline: daysUntil,
            context: `This distribution of $${amount.toLocaleString()} is due in ${daysUntil} day${daysUntil !== 1 ? "s" : ""}. It cannot proceed without your explicit confirmation. Wire instructions ${hasWireInstructions ? "are on file" : "are still missing"}.`,
          });
        } catch (emailErr) {
          console.error(`[Distribution Sentinel] Principal confirmation email failed:`, emailErr);
        }
      }
    }

    // --- T-3: Final reminder ---
    if (daysUntil !== null && daysUntil <= 3 && daysUntil > 0) {
      const missingItems: string[] = [];
      if (!hasWireInstructions) missingItems.push("wire instructions");
      if (!hasPrincipalConfirmation) missingItems.push("Principal confirmation");
      if (lpCount === 0) missingItems.push("LP recipient list");

      const statusMsg = missingItems.length > 0
        ? `BLOCKED: Missing ${missingItems.join(", ")}.`
        : "All requirements met. Ready to execute.";

      signals.push({
        agentName: "Distribution Sentinel",
        eventType: "alert",
        message: `T-${daysUntil}: ${fundName} ($${amount.toLocaleString()}) — ${statusMsg}`,
        severity: missingItems.length > 0 ? "critical" : "info",
        organizationId: dist.organizationId,
        audience: "both",
        requiresClientAction: missingItems.length > 0,
        actionType: missingItems.length > 0 ? "escalate" : "notify",
        actionLabel: missingItems.length > 0 ? "Resolve Blockers" : "View Distribution",
        actionPayload: { distributionId: dist.id, missingItems },
        entityType: "distribution",
        agentEntityId: String(dist.id),
        agentEntityName: fundName,
        distributionId: dist.id,
        ventureId: dist.ventureId,
        spvId: dist.spvId,
        outcome: missingItems.length > 0 ? "pending" : "success",
      });

      // Send T-3 distribution alert email
      if (principalEmail) {
        try {
          await sendDistributionAlert({
            to: principalEmail,
            recipientName: principalName,
            fundName,
            amount: amount.toLocaleString(),
            currency: dist.currency || "USD",
            daysUntil: daysUntil!,
            milestone: "T-3",
            alertMessage: missingItems.length > 0
              ? `FINAL WARNING: Distribution is ${daysUntil} day${daysUntil !== 1 ? "s" : ""} away and is BLOCKED.`
              : `Distribution is ${daysUntil} day${daysUntil !== 1 ? "s" : ""} away. All requirements met — ready to execute.`,
            missingItems: missingItems.length > 0 ? missingItems : undefined,
          });
        } catch (emailErr) {
          console.error(`[Distribution Sentinel] T-3 alert email failed:`, emailErr);
        }
      }
    }

    // --- T-0: Execute day (hard block check) ---
    if (daysUntil !== null && daysUntil <= 0) {
      if (!hasPrincipalConfirmation || !hasWireInstructions) {
        const blockers: string[] = [];
        if (!hasPrincipalConfirmation) blockers.push("Principal has NOT confirmed");
        if (!hasWireInstructions) blockers.push("wire instructions NOT on file");

        signals.push({
          agentName: "Distribution Sentinel",
          eventType: "alert",
          message: `HARD BLOCK: ${fundName} ($${amount.toLocaleString()}) is due ${daysUntil < 0 ? `${Math.abs(daysUntil)} days ago` : "today"} but CANNOT execute: ${blockers.join("; ")}.`,
          severity: "critical",
          organizationId: dist.organizationId,
          audience: "both",
          requiresClientAction: true,
          actionType: "escalate",
          actionLabel: "Resolve & Execute",
          actionPayload: { distributionId: dist.id, blockers },
          entityType: "distribution",
          agentEntityId: String(dist.id),
          agentEntityName: fundName,
          distributionId: dist.id,
          ventureId: dist.ventureId,
          spvId: dist.spvId,
          recipient: "Principal",
          outcome: "failed",
        });

        // Send T-0 HARD BLOCK email
        if (principalEmail) {
          try {
            await sendDistributionAlert({
              to: principalEmail,
              recipientName: principalName,
              fundName,
              amount: amount.toLocaleString(),
              currency: dist.currency || "USD",
              daysUntil: 0,
              milestone: "T-0",
              alertMessage: `HARD BLOCK: This distribution is ${daysUntil < 0 ? `${Math.abs(daysUntil)} days overdue` : "due today"} but CANNOT execute.`,
              missingItems: blockers,
            });
          } catch (emailErr) {
            console.error(`[Distribution Sentinel] T-0 alert email failed:`, emailErr);
          }
        }
      } else {
        signals.push({
          agentName: "Distribution Sentinel",
          eventType: "status_change",
          message: `${fundName}: $${amount.toLocaleString()} — all requirements met. Principal confirmed, wire instructions on file. Ready for execution.`,
          severity: "info",
          organizationId: dist.organizationId,
          audience: "client",
          requiresClientAction: false,
          actionType: "notify",
          actionLabel: "Execute Distribution",
          actionPayload: { distributionId: dist.id },
          entityType: "distribution",
          agentEntityId: String(dist.id),
          agentEntityName: fundName,
          distributionId: dist.id,
          ventureId: dist.ventureId,
          spvId: dist.spvId,
          outcome: "success",
        });
      }
    }

    // --- Catch-all: distributions more than 30 days out, just monitor ---
    if (daysUntil !== null && daysUntil > 30) {
      // No action needed yet, just log for monitoring
      signals.push({
        agentName: "Distribution Sentinel",
        eventType: "signal",
        message: `${fundName}: $${amount.toLocaleString()} scheduled in ${daysUntil} days. Monitoring.`,
        severity: "info",
        organizationId: dist.organizationId,
        audience: "client",
        requiresClientAction: false,
        distributionId: dist.id,
        ventureId: dist.ventureId,
        spvId: dist.spvId,
      });
    }
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


// Vision spec v1 — Orchestrator
// Weekly Monday briefing + on-demand reports + cross-venture risk detection

export async function runOrchestrator(
  db: NonNullable<Awaited<ReturnType<typeof getDb>>>,
  agentSignals: AgentSignal[],
  orgId?: number | null
): Promise<AgentSignal[]> {
  const signals: AgentSignal[] = [];
  const now = new Date();

  // Dedup: skip if orchestrator ran in last 3 minutes (unless there are new signals)
  const orchConditions: any[] = [
    eq(agentEvents.agentName, "Orchestrator"),
    gte(agentEvents.createdAt, new Date(now.getTime() - 3 * 60 * 1000)),
  ];
  if (orgId) orchConditions.push(eq(agentEvents.organizationId, orgId));
  const recentOrch = await db.select({ id: agentEvents.id }).from(agentEvents).where(and(...orchConditions)).limit(1);
  if (recentOrch.length > 0 && agentSignals.length === 0) return signals;

  // --- Gather comprehensive portfolio data ---
  let ventureConditions: any[] = [];
  let taskConditions: any[] = [];
  let spvConditions: any[] = [];
  let distConditions: any[] = [];
  let complianceConditions: any[] = [];

  if (orgId) {
    const orgVentureIds = await getVentureIdsForOrg(db, orgId);
    if (orgVentureIds.length > 0) {
      ventureConditions.push(inArray(ventures.id, orgVentureIds));
      taskConditions.push(inArray(tasks.ventureId, orgVentureIds));
    }
    spvConditions.push(eq(spvs.organizationId, orgId));
    distConditions.push(eq(distributions.organizationId, orgId));
    complianceConditions.push(eq(compliance.organizationId, orgId as any));
  }

  // 1. Active ventures and SPVs
  const ventureList = await db
    .select({
      id: ventures.id, name: ventures.name, stage: ventures.stage,
      healthScore: ventures.healthScore, sector: ventures.sector,
      jurisdiction: ventures.jurisdiction, lastActivityDate: ventures.lastActivityDate,
      daysInCurrentStage: ventures.daysInCurrentStage,
    })
    .from(ventures)
    .where(ventureConditions.length > 0 ? and(...ventureConditions) : undefined)
    .limit(50);

  const spvList = await db
    .select({ id: spvs.id, name: spvs.name, stage: spvs.stage })
    .from(spvs)
    .where(spvConditions.length > 0 ? and(...spvConditions) : undefined)
    .limit(50);

  // 2. Open tasks by priority
  const tasksByPriority = await db
    .select({
      priority: tasks.priority,
      count: sql<number>`COUNT(*)`,
    })
    .from(tasks)
    .where(and(
      ...(taskConditions.length > 0 ? taskConditions : []),
      sql`${tasks.status} NOT IN ('complete', 'Complete')`
    ))
    .groupBy(tasks.priority);

  // Date strings for varchar comparisons
  const nowISO = now.toISOString().split("T")[0];
  const thirtyDaysISO = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

  // 3. Overdue tasks with venture name
  const overdueTasks = await db
    .select({
      id: tasks.id, title: tasks.title, dueDate: tasks.dueDate,
      ventureName: ventures.name, ventureId: tasks.ventureId,
    })
    .from(tasks)
    .leftJoin(ventures, eq(tasks.ventureId, ventures.id))
    .where(and(
      ...(taskConditions.length > 0 ? taskConditions : []),
      sql`${tasks.status} NOT IN ('complete', 'Complete')`,
      lte(tasks.dueDate, nowISO)
    ))
    .limit(20);

  // 4. Distributions in next 30 days
  const upcomingDists = await db
    .select({
      id: distributions.id, name: distributions.name, fund: distributions.fund,
      amount: distributions.amount, distributionDate: distributions.distributionDate,
      principalConfirmed: distributions.principalConfirmed,
      wireInstructionsOnFile: distributions.wireInstructionsOnFile,
    })
    .from(distributions)
    .where(and(
      ...(distConditions.length > 0 ? distConditions : []),
      gte(distributions.distributionDate, nowISO),
      lte(distributions.distributionDate, thirtyDaysISO)
    ))
    .limit(20);

  // 5. Compliance deadlines in next 30 days
  const upcomingCompliance = await db
    .select({
      id: compliance.id,
      filingType: compliance.filingType, dueDate: compliance.dueDate,
      status: compliance.status, jurisdiction: compliance.jurisdiction,
    })
    .from(compliance)
    .where(and(
      ...(complianceConditions.length > 0 ? complianceConditions : []),
      gte(compliance.dueDate, nowISO),
      lte(compliance.dueDate, thirtyDaysISO)
    ))
    .limit(20);

  // 6. Stalled ventures (using STALL_THRESHOLDS)
  const stalledVentures = ventureList.filter(v => {
    const stage = normalizeStage(v.stage);
    const threshold = STALL_THRESHOLDS[stage];
    if (!threshold) return false;
    const lastActivity = v.lastActivityDate ? new Date(v.lastActivityDate) : null;
    if (!lastActivity) return (v.daysInCurrentStage || 0) > threshold;
    const daysSince = Math.floor((now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24));
    return daysSince >= threshold;
  });

  // 7. Items pending Principal confirmation
  const pendingConfirmation = await db
    .select({ id: agentEvents.id, message: agentEvents.message, agentName: agentEvents.agentName })
    .from(agentEvents)
    .where(and(
      eq(agentEvents.requiresClientAction, true),
      eq(agentEvents.actionTaken, false),
      ...(orgId ? [eq(agentEvents.organizationId, orgId)] : [])
    ))
    .orderBy(desc(agentEvents.createdAt))
    .limit(10);

  // 8. Full agent activity log for past 7 days
  const weeklyEvents = await db
    .select({
      agentName: agentEvents.agentName, eventType: agentEvents.eventType,
      severity: agentEvents.severity, message: agentEvents.message,
      createdAt: agentEvents.createdAt,
    })
    .from(agentEvents)
    .where(and(
      gte(agentEvents.createdAt, new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)),
      ...(orgId ? [eq(agentEvents.organizationId, orgId)] : [])
    ))
    .orderBy(desc(agentEvents.createdAt))
    .limit(50);

  // 9. Cross-venture risk detection: same jurisdiction, sector, or counterparty
  const jurisdictionGroups: Record<string, string[]> = {};
  const sectorGroups: Record<string, string[]> = {};
  for (const v of ventureList) {
    if (v.jurisdiction) {
      if (!jurisdictionGroups[v.jurisdiction]) jurisdictionGroups[v.jurisdiction] = [];
      jurisdictionGroups[v.jurisdiction].push(v.name);
    }
    if (v.sector) {
      if (!sectorGroups[v.sector]) sectorGroups[v.sector] = [];
      sectorGroups[v.sector].push(v.name);
    }
  }
  const crossVentureRisks: string[] = [];
  for (const [jurisdiction, names] of Object.entries(jurisdictionGroups)) {
    if (names.length >= 2) crossVentureRisks.push(`Jurisdiction concentration: ${names.join(", ")} share ${jurisdiction}`);
  }
  for (const [sector, names] of Object.entries(sectorGroups)) {
    if (names.length >= 2) crossVentureRisks.push(`Sector concentration: ${names.join(", ")} in ${sector}`);
  }

  // --- Build comprehensive briefing ---
  const briefingSections = [
    `=== WEEKLY EXECUTIVE BRIEFING ==="`,
    ``,
    `PORTFOLIO OVERVIEW:`,
    `  Active Ventures: ${ventureList.length}`,
    `  Active SPVs: ${spvList.length}`,
    `  Stages: ${STAGE_PIPELINE.map(s => `${s}: ${ventureList.filter(v => normalizeStage(v.stage) === s).length}`).join(", ")}`,
    ``,
    `OPEN TASKS BY PRIORITY:`,
    ...(tasksByPriority.length > 0
      ? tasksByPriority.map(t => `  ${t.priority}: ${t.count}`)
      : ["  No open tasks"]),
    ``,
    `OVERDUE TASKS (${overdueTasks.length}):`,
    ...(overdueTasks.length > 0
      ? overdueTasks.map(t => {
          const daysOverdue = Math.floor((now.getTime() - new Date(t.dueDate!).getTime()) / (1000 * 60 * 60 * 24));
          return `  "${t.title}" — ${t.ventureName || "Unassigned"} — ${daysOverdue} days overdue`;
        })
      : ["  None"]),
    ``,
    `DISTRIBUTIONS (NEXT 30 DAYS): ${upcomingDists.length}`,
    ...(upcomingDists.length > 0
      ? upcomingDists.map(d => {
          const daysUntil = Math.floor((new Date(d.distributionDate!).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          const flags = [];
          if (!d.principalConfirmed) flags.push("⚠ unconfirmed");
          if (!d.wireInstructionsOnFile) flags.push("⚠ no wire");
          return `  ${d.fund || d.name}: $${Number(d.amount || 0).toLocaleString()} in ${daysUntil}d ${flags.length > 0 ? flags.join(", ") : "✓"}`;
        })
      : ["  None"]),
    ``,
    `COMPLIANCE DEADLINES (NEXT 30 DAYS): ${upcomingCompliance.length}`,
    ...(upcomingCompliance.length > 0
      ? upcomingCompliance.map(c => {
          const daysUntil = Math.floor((new Date(c.dueDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          return `  ${c.filingType} (${c.jurisdiction || "N/A"}) — ${c.status} — due in ${daysUntil}d`;
        })
      : ["  None"]),
    ``,
    `STALLED VENTURES (${stalledVentures.length}):`,
    ...(stalledVentures.length > 0
      ? stalledVentures.map(v => `  "${v.name}" — ${v.stage} — ${v.daysInCurrentStage || "?"}d in stage`)
      : ["  None"]),
    ``,
    `PENDING PRINCIPAL CONFIRMATION (${pendingConfirmation.length}):`,
    ...(pendingConfirmation.length > 0
      ? pendingConfirmation.map(p => `  [${p.agentName}] ${p.message.substring(0, 120)}`)
      : ["  None"]),
    ``,
    ...(crossVentureRisks.length > 0
      ? [`CROSS-VENTURE RISK ALERTS:`, ...crossVentureRisks.map(r => `  ⚠ ${r}`), ``]
      : []),
    `AGENT ACTIVITY (PAST 7 DAYS): ${weeklyEvents.length} events`,
    ...(weeklyEvents.slice(0, 15).map(e => `  [${e.agentName}] (${e.severity}) ${e.message.substring(0, 100)}`)),
    ...(weeklyEvents.length > 15 ? [`  ... and ${weeklyEvents.length - 15} more`] : []),
  ].join("\n");

  // Generate portfolio health summary
  const analysis = await callAgentLLM(
    "You are the VENTEX Orchestrator — the master velocity agent for a UHNWI holding company. Based on this weekly briefing data, write: (1) A plain-English portfolio health summary paragraph (3-4 sentences). (2) The ONE thing that, if acted on in the next 24 hours, would most accelerate the portfolio — name the specific venture/sector and exact action required. Be direct, no filler.",
    briefingSections
  );

  const maxSeverity: Severity = agentSignals.some(s => s.severity === "critical")
    ? "critical"
    : agentSignals.some(s => s.severity === "warning")
    ? "warning"
    : stalledVentures.length > 0 || overdueTasks.length > 3
    ? "warning"
    : "info";

  signals.push({
    agentName: "Orchestrator",
    eventType: "summary",
    message: analysis,
    severity: maxSeverity,
    organizationId: orgId,
    audience: "both",
    requiresClientAction: pendingConfirmation.length > 0,
    actionType: "notify",
    actionLabel: pendingConfirmation.length > 0 ? "Review Pending Items" : "Mark Resolved",
    actionPayload: {
      ventureCount: ventureList.length,
      spvCount: spvList.length,
      overdueTaskCount: overdueTasks.length,
      upcomingDistCount: upcomingDists.length,
      complianceCount: upcomingCompliance.length,
      stalledCount: stalledVentures.length,
      pendingConfirmationCount: pendingConfirmation.length,
      crossVentureRisks: crossVentureRisks.length,
    },
    outcome: maxSeverity === "critical" ? "pending" : "success",
  });

  // Send weekly briefing email to principal
  if (orgId) {
    try {
      const [org] = await db.select({
        primaryContactEmail: organizations.primaryContactEmail,
        primaryContactName: organizations.primaryContactName,
      }).from(organizations).where(eq(organizations.id, orgId)).limit(1);
      if (org?.primaryContactEmail) {
        // Extract top action from analysis (second paragraph)
        const analysisParts = analysis.split("\n").filter(l => l.trim());
        const portfolioSummary = analysisParts[0] || analysis;
        const topAction = analysisParts.length > 1 ? analysisParts.slice(1).join(" ") : "Review your dashboard for the latest updates.";
        await sendOrchestratorBriefing({
          to: org.primaryContactEmail,
          principalName: org.primaryContactName || "Principal",
          portfolioSummary,
          topAction,
          stats: {
            ventureCount: ventureList.length,
            overdueTaskCount: overdueTasks.length,
            upcomingDistCount: upcomingDists.length,
            stalledCount: stalledVentures.length,
            pendingConfirmationCount: pendingConfirmation.length,
          },
        });
      }
    } catch (emailErr) {
      console.error(`[Orchestrator] Weekly briefing email failed:`, emailErr);
    }
  }

  return signals;
}


export async function persistSignals(
  db: NonNullable<Awaited<ReturnType<typeof getDb>>>,
  signals: AgentSignal[]
): Promise<void> {
  if (signals.length === 0) return;

  const dedupWindow = new Date(Date.now() - 6 * 60 * 60 * 1000); // 6h dedup window

  for (const signal of signals) {
    // Dedup: skip if a matching signal already exists within the dedup window
    const dedupConds: any[] = [
      eq(agentEvents.agentName, signal.agentName),
      gte(agentEvents.createdAt, dedupWindow),
    ];
    if (signal.agentEntityId) {
      dedupConds.push(eq(agentEvents.agentEntityId, signal.agentEntityId));
    } else {
      // For signals without entity (e.g. Orchestrator summaries), dedup by eventType
      if (signal.eventType) dedupConds.push(eq(agentEvents.eventType, signal.eventType));
    }
    if (signal.actionType) dedupConds.push(eq(agentEvents.actionType, signal.actionType));
    if (signal.organizationId) dedupConds.push(eq(agentEvents.organizationId, signal.organizationId));
    const existing = await db.select({ id: agentEvents.id }).from(agentEvents).where(and(...dedupConds)).limit(1);
    if (existing.length > 0) continue;

    // WS3: Compute AI safety fields for every event
    const eventSafety = getEventSafetyFields({
      agentName: signal.agentName,
      actionType: signal.actionType ?? null,
      audience: signal.audience ?? "operator",
      hasEntityData: !!signal.agentEntityId,
      hasHistoricalData: !!signal.oldStatus,
      isFinancial: signal.agentName === "Distribution Sentinel",
    });

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
      // Vision spec v1: direct FK columns for agent log
      ventureId: signal.ventureId ?? null,
      spvId: signal.spvId ?? null,
      taskId: signal.taskId ?? null,
      distributionId: signal.distributionId ?? null,
      recipient: signal.recipient ?? null,
      outcome: signal.outcome ?? null,
      ...eventSafety,
    } as any);
  }
}


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

      const draftConditions: any[] = [
        eq(agentDrafts.status, "pending"),
        isNotNull(agentDrafts.organizationId),
      ];
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

  /**
   * Bulk resolve multiple oversight events at once (F-020)
   */
  bulkResolve: adminProcedure
    .input(z.object({
      eventIds: z.array(z.number()).min(1).max(100),
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
        .where(inArray(agentEvents.id, input.eventIds));

      return { success: true, count: input.eventIds.length };
    }),


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

      const conditions: any[] = [isNotNull(agentDrafts.organizationId)];
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

      // WS9: Feature flag enforcement — block securities communications if disabled
      // [LEGAL REVIEW REQUIRED] — enables_securities_communications must be cleared by counsel
      const draftAudience = (draft as any).audience || "operator";
      if (draftAudience === "client" || draftAudience === "both") {
        // Client-facing drafts may constitute securities communications
        // Feature flag check would go here when per-tenant compliance config is wired
        // For now, all client-facing drafts require human approval (WS3) which is already enforced
      }

      // WS3: Sending a draft IS the human approval — mark as approved
      const userName = ctx.user.name || ctx.user.email || "User";
      const now = new Date();
      const disclaimerText = generateDisclaimer(userName, now);
      const finalBody = input.editedBody || draft.body;

      const updates: Record<string, unknown> = {
        status: "sent",
        sentAt: now,
        sentBy: userName,
        approvalStatus: "approved",
        approvedBy: userName,
        approvedAt: now,
        disclaimer: disclaimerText,
      };

      if (input.editedBody) {
        updates.body = input.editedBody;
      }

      await db
        .update(agentDrafts)
        .set(updates as any)
        .where(eq(agentDrafts.id, input.draftId));

      // WS3: Log approval to immutable audit trail
      await logApprovalAction({
        entityType: "draft",
        entityId: input.draftId,
        action: input.editedBody ? "edited" : "approved",
        actorId: ctx.user.id,
        actorName: userName,
        originalContent: draft.body,
        finalContent: finalBody,
        confidenceScore: draft.confidenceScore ?? undefined,
        disclaimerApplied: disclaimerText,
      });

      // Also mark any related agent_event as action_taken + approved
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
              actionTakenAt: now,
              actionTakenBy: userName,
              approvalStatus: "approved",
              approvedBy: userName,
              approvedAt: now,
            })
            .where(eq(agentEvents.id, evt.id));
        }
      }

      return { success: true, disclaimer: disclaimerText };
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

      const userName = ctx.user.name || ctx.user.email || "User";
      await db
        .update(agentDrafts)
        .set({
          status: "dismissed",
          approvalStatus: "rejected",
          approvedBy: userName,
          approvedAt: new Date(),
          rejectionReason: "Dismissed by operator",
        } as any)
        .where(eq(agentDrafts.id, input.draftId));

      // WS3: Log rejection to immutable audit trail
      await logApprovalAction({
        entityType: "draft",
        entityId: input.draftId,
        action: "rejected",
        actorId: ctx.user.id,
        actorName: userName,
        originalContent: draft.body,
        reason: "Dismissed by operator",
        confidenceScore: draft.confidenceScore ?? undefined,
      });

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

  /**
   * Permanently delete a dismissed draft
   */
  deleteDraft: protectedProcedure
    .input(z.object({ draftId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Verify the draft belongs to the user's org and is dismissed
      const effectiveOrgId = resolveOrgId(ctx.user, undefined);
      const [draft] = await db.select().from(agentDrafts).where(eq(agentDrafts.id, input.draftId)).limit(1);
      if (!draft) throw new Error("Draft not found");
      if (effectiveOrgId && draft.organizationId !== effectiveOrgId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
      }
      if (draft.status !== "dismissed") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Only dismissed drafts can be deleted" });
      }

      await db.delete(agentDrafts).where(eq(agentDrafts.id, input.draftId));

      return { success: true };
    }),

  /**
   * Bulk delete dismissed drafts
   */
  bulkDeleteDrafts: protectedProcedure
    .input(z.object({ draftIds: z.array(z.number()).min(1).max(100) }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const effectiveOrgId = resolveOrgId(ctx.user, undefined);

      // Verify all drafts exist, belong to user's org, and are dismissed
      const drafts = await db.select().from(agentDrafts).where(inArray(agentDrafts.id, input.draftIds));
      for (const draft of drafts) {
        if (effectiveOrgId && draft.organizationId !== effectiveOrgId) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
        }
        if (draft.status !== "dismissed") {
          throw new TRPCError({ code: "BAD_REQUEST", message: `Draft ${draft.id} is not dismissed` });
        }
      }

      if (drafts.length > 0) {
        await db.delete(agentDrafts).where(inArray(agentDrafts.id, input.draftIds));
      }

      return { success: true, deleted: drafts.length };
    }),


  /**
   * Aggregate draft stats across all orgs — for admin dashboard KPI
   */
  draftStats: protectedProcedure
    .query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return { totalSent: 0, totalPending: 0, sentThisMonth: 0 };

      const allDrafts = await db
        .select({
          status: agentDrafts.status,
          sentAt: agentDrafts.sentAt,
        })
        .from(agentDrafts)
        .where(isNotNull(agentDrafts.organizationId));

      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

      const totalSent = allDrafts.filter(d => d.status === "sent").length;
      const totalPending = allDrafts.filter(d => d.status === "pending").length;
      const sentThisMonth = allDrafts.filter(d =>
        d.status === "sent" && d.sentAt && new Date(d.sentAt) >= monthStart
      ).length;

      return { totalSent, totalPending, sentThisMonth };
    }),

  // ═══════════════════════════════════════════════════════════════════════
  // WS3: APPROVAL QUEUE — Explicit approve/reject for AI outputs
  // ═══════════════════════════════════════════════════════════════════════

  /**
   * Get pending approvals — events and drafts requiring human review
   */
  pendingApprovals: protectedProcedure
    .input(z.object({ organizationId: z.number().optional() }).optional())
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) return { events: [], drafts: [] };

      const effectiveOrgId = resolveOrgId(ctx.user, input?.organizationId);

      // Pending events requiring approval
      const eventConds: any[] = [
        eq(agentEvents.humanApprovalRequired, true),
        eq(agentEvents.approvalStatus, "pending"),
      ];
      if (effectiveOrgId) eventConds.push(eq(agentEvents.organizationId, effectiveOrgId));

      const pendingEvents = await db.select().from(agentEvents)
        .where(and(...eventConds))
        .orderBy(desc(agentEvents.createdAt))
        .limit(100);

      // Pending drafts requiring approval
      const draftConds: any[] = [
        eq(agentDrafts.humanApprovalRequired, true),
        eq(agentDrafts.approvalStatus, "pending"),
        eq(agentDrafts.status, "pending"),
      ];
      if (effectiveOrgId) draftConds.push(eq(agentDrafts.organizationId, effectiveOrgId));

      const pendingDrafts = await db.select().from(agentDrafts)
        .where(and(...draftConds))
        .orderBy(desc(agentDrafts.createdAt))
        .limit(100);

      return { events: pendingEvents, drafts: pendingDrafts };
    }),

  /**
   * Approve an agent event — marks as approved, logs to audit trail
   */
  approveEvent: adminProcedure
    .input(z.object({
      eventId: z.number(),
      reason: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const [event] = await db.select().from(agentEvents).where(eq(agentEvents.id, input.eventId)).limit(1);
      if (!event) throw new TRPCError({ code: "NOT_FOUND", message: "Event not found" });

      const userName = ctx.user.name || ctx.user.email || "Admin";
      const now = new Date();

      await db.update(agentEvents).set({
        approvalStatus: "approved",
        approvedBy: userName,
        approvedAt: now,
        disclaimer: generateDisclaimer(userName, now),
      }).where(eq(agentEvents.id, input.eventId));

      await logApprovalAction({
        entityType: "event",
        entityId: input.eventId,
        action: "approved",
        actorId: ctx.user.id,
        actorName: userName,
        originalContent: event.message,
        finalContent: event.message,
        reason: input.reason,
        confidenceScore: event.confidenceScore ?? undefined,
        disclaimerApplied: generateDisclaimer(userName, now),
      });

      return { success: true };
    }),

  /**
   * Reject an agent event — marks as rejected, logs to audit trail
   */
  rejectEvent: adminProcedure
    .input(z.object({
      eventId: z.number(),
      reason: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const [event] = await db.select().from(agentEvents).where(eq(agentEvents.id, input.eventId)).limit(1);
      if (!event) throw new TRPCError({ code: "NOT_FOUND", message: "Event not found" });

      const userName = ctx.user.name || ctx.user.email || "Admin";

      await db.update(agentEvents).set({
        approvalStatus: "rejected",
        approvedBy: userName,
        approvedAt: new Date(),
        rejectionReason: input.reason,
      }).where(eq(agentEvents.id, input.eventId));

      await logApprovalAction({
        entityType: "event",
        entityId: input.eventId,
        action: "rejected",
        actorId: ctx.user.id,
        actorName: userName,
        originalContent: event.message,
        reason: input.reason,
        confidenceScore: event.confidenceScore ?? undefined,
      });

            return { success: true };
    }),

  /**
   * Approve an agent draft — marks as approved/sent, logs to audit trail
   */
  approveDraft: adminProcedure
    .input(z.object({
      draftId: z.number(),
      editedBody: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const [draft] = await db.select().from(agentDrafts).where(eq(agentDrafts.id, input.draftId)).limit(1);
      if (!draft) throw new TRPCError({ code: "NOT_FOUND", message: "Draft not found" });

      const userName = ctx.user.name || ctx.user.email || "Admin";
      const now = new Date();

      await db.update(agentDrafts).set({
        status: "sent",
        approvalStatus: "approved",
        approvedBy: userName,
        approvedAt: now,
        sentAt: now,
        sentBy: userName,
        disclaimer: generateDisclaimer(userName, now),
        ...(input.editedBody ? { body: input.editedBody } : {}),
      } as any).where(eq(agentDrafts.id, input.draftId));

      await logApprovalAction({
        entityType: "draft",
        entityId: input.draftId,
        action: "approved",
        actorId: ctx.user.id,
        actorName: userName,
        originalContent: draft.body,
        finalContent: input.editedBody || draft.body,
        confidenceScore: draft.confidenceScore ?? undefined,
        disclaimerApplied: generateDisclaimer(userName, now),
      });

      return { success: true };
    }),

  /**
   * Reject an agent draft — marks as rejected, logs to audit trail
   */
  rejectDraft: adminProcedure
    .input(z.object({
      draftId: z.number(),
      reason: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const [draft] = await db.select().from(agentDrafts).where(eq(agentDrafts.id, input.draftId)).limit(1);
      if (!draft) throw new TRPCError({ code: "NOT_FOUND", message: "Draft not found" });

      const userName = ctx.user.name || ctx.user.email || "Admin";

      await db.update(agentDrafts).set({
        status: "dismissed",
        approvalStatus: "rejected",
        approvedBy: userName,
        approvedAt: new Date(),
        rejectionReason: input.reason,
      } as any).where(eq(agentDrafts.id, input.draftId));

      await logApprovalAction({
        entityType: "draft",
        entityId: input.draftId,
        action: "rejected",
        actorId: ctx.user.id,
        actorName: userName,
        originalContent: draft.body,
        reason: input.reason,
        confidenceScore: draft.confidenceScore ?? undefined,
      });

      return { success: true };
    }),

  /**
   * Bulk approve multiple decisions (events and/or drafts) at once
   */
  bulkApprove: adminProcedure
    .input(z.object({
      items: z.array(z.object({
        id: z.number(),
        type: z.enum(["event", "draft"]),
      })),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const userName = ctx.user.name || ctx.user.email || "Admin";
      let approved = 0;
      let failed = 0;

      for (const item of input.items) {
        try {
          if (item.type === "event") {
            const [event] = await db.select().from(agentEvents).where(eq(agentEvents.id, item.id)).limit(1);
            if (!event) { failed++; continue; }

            await db.update(agentEvents).set({
              approvalStatus: "approved",
              approvedBy: userName,
              approvedAt: new Date(),
            } as any).where(eq(agentEvents.id, item.id));

            await logApprovalAction({
              entityType: "event",
              entityId: item.id,
              action: "approved",
              actorId: ctx.user.id,
              actorName: userName,
              originalContent: event.message,
              confidenceScore: event.confidenceScore ?? undefined,
            });
            approved++;
          } else {
            const [draft] = await db.select().from(agentDrafts).where(eq(agentDrafts.id, item.id)).limit(1);
            if (!draft) { failed++; continue; }

            await db.update(agentDrafts).set({
              status: "sent",
              approvalStatus: "approved",
              approvedBy: userName,
              approvedAt: new Date(),
            } as any).where(eq(agentDrafts.id, item.id));

            await logApprovalAction({
              entityType: "draft",
              entityId: item.id,
              action: "approved",
              actorId: ctx.user.id,
              actorName: userName,
              originalContent: draft.body,
              confidenceScore: draft.confidenceScore ?? undefined,
            });
            approved++;
          }
        } catch {
          failed++;
        }
      }

      return { approved, failed, total: input.items.length };
    }),

  /**
   * Bulk reject multiple decisions (events and/or drafts) at once
   */
  bulkReject: adminProcedure
    .input(z.object({
      items: z.array(z.object({
        id: z.number(),
        type: z.enum(["event", "draft"]),
      })),
      reason: z.string().min(1),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const userName = ctx.user.name || ctx.user.email || "Admin";
      let rejected = 0;
      let failed = 0;

      for (const item of input.items) {
        try {
          if (item.type === "event") {
            const [event] = await db.select().from(agentEvents).where(eq(agentEvents.id, item.id)).limit(1);
            if (!event) { failed++; continue; }

            await db.update(agentEvents).set({
              approvalStatus: "rejected",
              approvedBy: userName,
              approvedAt: new Date(),
              rejectionReason: input.reason,
            } as any).where(eq(agentEvents.id, item.id));

            await logApprovalAction({
              entityType: "event",
              entityId: item.id,
              action: "rejected",
              actorId: ctx.user.id,
              actorName: userName,
              originalContent: event.message,
              reason: input.reason,
              confidenceScore: event.confidenceScore ?? undefined,
            });
            rejected++;
          } else {
            const [draft] = await db.select().from(agentDrafts).where(eq(agentDrafts.id, item.id)).limit(1);
            if (!draft) { failed++; continue; }

            await db.update(agentDrafts).set({
              status: "dismissed",
              approvalStatus: "rejected",
              approvedBy: userName,
              approvedAt: new Date(),
              rejectionReason: input.reason,
            } as any).where(eq(agentDrafts.id, item.id));

            await logApprovalAction({
              entityType: "draft",
              entityId: item.id,
              action: "rejected",
              actorId: ctx.user.id,
              actorName: userName,
              originalContent: draft.body,
              reason: input.reason,
              confidenceScore: draft.confidenceScore ?? undefined,
            });
            rejected++;
          }
        } catch {
          failed++;
        }
      }

      return { rejected, failed, total: input.items.length };
    }),

  /**
   * Get approval audit log — immutable history of all approvals/rejections
   */
  approvalLog: adminProcedure
    .input(z.object({
      entityType: z.enum(["event", "draft"]).optional(),
      limit: z.number().min(1).max(200).default(50),
    }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      const conditions: any[] = [];
      if (input?.entityType) {
        conditions.push(eq(agentApprovalLog.entityType, input.entityType));
      }

      return db.select().from(agentApprovalLog)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(agentApprovalLog.createdAt))
        .limit(input?.limit ?? 50);
    }),

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

      // Filter out noise messages that don't add value for clients
      const isNoise = (msg: string) => {
        const lower = msg.toLowerCase();
        return (
          lower.includes("no active ventures") ||
          lower.includes("no distributions scheduled") ||
          lower.includes("no distributions recorded") ||
          (lower.includes("all tasks are on schedule") && lower.includes("no overdue"))
        );
      };
      const meaningful = events.filter(e => !isNoise(e.message ?? ""));

      const actionNeeded = meaningful.filter(e => e.requiresClientAction && !e.actionTaken);
      const completed = meaningful.filter(e => e.actionTaken);
      const watching = meaningful.filter(e => !e.requiresClientAction && !e.actionTaken);

      return { actionNeeded, completed, watching };
    }),

  /**
   * Client dismiss an event (hide from their feed)
   */
  clientDismiss: protectedProcedure
    .input(z.object({ eventId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) return { success: false };
      // TENANT_PATCHED: Verify event belongs to user's org
      if (!isVentexTeam(ctx.user) && ctx.user.organizationId) {
        const [ev] = await db.select({ orgId: agentEvents.organizationId }).from(agentEvents).where(eq(agentEvents.id, input.eventId)).limit(1);
        if (ev && ev.orgId !== ctx.user.organizationId) return { success: false };
      }

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
                const { checkEmailGate } = await import("../notificationGate");
                const taskGate = await checkEmailGate(member.email, "task");
                if (taskGate.allowed) {
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
            }
          } catch (e) {
            result.emailError = String(e);
          }
        }

        result.flow = "approve_followup";
      }

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
            humanApprovalRequired: false,  // human-initiated action
            approvalStatus: "approved",
            approvedBy: userName,
            approvedAt: new Date(),
            confidenceScore: 100,  // human action = full confidence
          });
        }

        result.flow = "reassign_task";
        result.taskId = taskId;
      }

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
              const toAddress = recipients?.length ? recipients : "ventex@aurovia.com";
              const { checkEmailGate } = await import("../notificationGate");
              const distEmail = Array.isArray(toAddress) ? toAddress[0] : toAddress;
              const distGate = await checkEmailGate(distEmail, "distribution");
              if (!distGate.allowed) {
                result.emailError = distGate.reason || "Blocked by preferences";
              } else {
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
            }
          } catch (e) {
            result.emailError = String(e);
          }
        }

        result.flow = "confirm_distribution";
        result.distributionId = distributionId;
      }

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
            humanApprovalRequired: false,  // human-initiated action
            approvalStatus: "approved",
            approvedBy: userName,
            approvedAt: new Date(),
            confidenceScore: 100,
          });
        }

        result.flow = "unblock_venture";
        result.ventureId = ventureId;
      }

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
    .query(async ({ input, ctx }) => {
      // TENANT_PATCHED: Verify draft belongs to user's org
      if (!isVentexTeam(ctx.user) && ctx.user.organizationId) {
        const db2 = await getDb();
        if (db2) {
          const [d] = await db2.select({ orgId: agentDrafts.organizationId }).from(agentDrafts).where(eq(agentDrafts.id, input.draftId)).limit(1);
          if (d && d.orgId !== ctx.user.organizationId) return null;
        }
      }
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
    .query(async ({ input, ctx }) => {
      // TENANT_PATCHED: Verify event belongs to user's org
      if (!isVentexTeam(ctx.user) && ctx.user.organizationId) {
        const db2 = await getDb();
        if (db2) {
          const [ev] = await db2.select({ orgId: agentEvents.organizationId }).from(agentEvents).where(eq(agentEvents.id, input.eventId)).limit(1);
          if (ev && ev.orgId !== ctx.user.organizationId) return null;
        }
      }
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
      // TENANT_PATCHED: Verify venture belongs to user's org
      if (!isVentexTeam(ctx.user)) {
        const ventureIds = await getOrgVentureIds(ctx.user);
        if (ventureIds && !ventureIds.includes(input.ventureId)) throw new Error("Access denied: venture not in your organization");
      }
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

      // Log agent event — human-approved stage advance
      await db.insert(agentEvents).values({
        organizationId: orgId,
        agentName: "Velocity Agent",
        eventType: "status_change",
        message: `"${venture.name}" advanced from ${venture.stage} → ${nextStage} by ${userName} in ${daysInStage} days.`,
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
        humanApprovalRequired: false,  // human-initiated stage advance
        approvalStatus: "approved",
        approvedBy: userName,
        approvedAt: now,
        confidenceScore: 100,
        disclaimer: generateDisclaimer(userName, now),
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

      if (orgId) {
        const [org] = await db.select({
          primaryContactEmail: organizations.primaryContactEmail,
          primaryContactName: organizations.primaryContactName,
          name: organizations.name,
        }).from(organizations).where(eq(organizations.id, orgId)).limit(1);

         if (org?.primaryContactEmail) {
          const { checkEmailGate } = await import("../notificationGate");
          const advGate = await checkEmailGate(org.primaryContactEmail, "stage_advance");
          if (advGate.allowed) {
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
      }

      return {
        success: true,
        ventureName: venture.name,
        fromStage: venture.stage,
        toStage: nextStage,
        daysInStage,
      };
    }),

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
        } else if (!e.clientDismissed) {
          // Escalation applies to ALL unactioned events, not just requiresClientAction
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

      // Compute stats — escalation applies to ALL unactioned events
      const unactioned = events.filter(e => !e.actionTaken && !e.clientDismissed);
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
   * Get agent config for the current org — admin only
   * Returns which agents are enabled/disabled (persisted state)
   */
  getConfig: adminProcedure
    .input(z.object({ organizationId: z.number().optional() }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;
      const orgId = input?.organizationId;
      if (!orgId) return null;
      const [config] = await db
        .select()
        .from(clientAgentConfig)
        .where(eq(clientAgentConfig.organizationId, orgId))
        .limit(1);
      return config || null;
    }),

  /**
   * Toggle an agent on/off for a specific org — admin only
   * Persists to database so state survives page refreshes and scheduler cycles
   */
  toggleAgent: adminProcedure
    .input(z.object({
      organizationId: z.number(),
      agentName: z.enum(["overdue", "velocity", "distribution", "orchestrator"]),
      enabled: z.boolean(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Map frontend agent names to config columns
      const columnMap: Record<string, keyof typeof clientAgentConfig.$inferSelect> = {
        overdue: "complianceAgentEnabled",
        velocity: "velocityAgentEnabled",
        distribution: "dealFlowAgentEnabled",
        orchestrator: "orchestratorEnabled",
      };

      const column = columnMap[input.agentName];
      if (!column) throw new Error("Invalid agent name");

      // Upsert: update if exists, create if not
      const [existing] = await db
        .select()
        .from(clientAgentConfig)
        .where(eq(clientAgentConfig.organizationId, input.organizationId))
        .limit(1);

      if (existing) {
        await db.update(clientAgentConfig)
          .set({ [column]: input.enabled })
          .where(eq(clientAgentConfig.id, existing.id));
      } else {
        await db.insert(clientAgentConfig).values({
          organizationId: input.organizationId,
          velocityAgentEnabled: input.agentName === "velocity" ? input.enabled : true,
          complianceAgentEnabled: input.agentName === "overdue" ? input.enabled : true,
          dealFlowAgentEnabled: input.agentName === "distribution" ? input.enabled : true,
          orchestratorEnabled: input.agentName === "orchestrator" ? input.enabled : true,
          overdueDaysThreshold: 7,
          distributionWarningDays: 14,
          healthScoreAlertThreshold: 30,
          autoAdvanceEnabled: true,
          pollingIntervalMinutes: 30,
        });
      }

      return { success: true, agentName: input.agentName, enabled: input.enabled };
    }),

  /**
   * Pause/resume the entire scheduler — admin only
   */
  toggleScheduler: adminProcedure
    .input(z.object({ action: z.enum(["pause", "resume"]) }))
    .mutation(async ({ input }) => {
      if (input.action === "pause") {
        const { stopAgentScheduler } = await import("../agentScheduler");
        stopAgentScheduler();
      } else {
        const { startAgentScheduler } = await import("../agentScheduler");
        startAgentScheduler();
      }
      const { getSchedulerStatus } = await import("../agentScheduler");
      return getSchedulerStatus();
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
  /**
   * Purge stale/duplicate agent events — admin only.
   * Keeps the most recent event per (agentName, agentEntityId, eventType, organizationId)
   * within the last 24h and removes older duplicates.
   * Also removes all events older than 30 days.
   */
  purgeStaleEvents: adminProcedure
    .mutation(async () => {
      const db = await getDb();
      if (!db) return { deleted: 0 };

      // 1. Remove events older than 30 days
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const oldResult = await db.delete(agentEvents).where(
        lte(agentEvents.createdAt, thirtyDaysAgo)
      );

      // 2. Remove duplicate escalation events (keep newest per entity per 24h)
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const escalations = await db
        .select()
        .from(agentEvents)
        .where(
          and(
            eq(agentEvents.eventType, "escalation"),
            gte(agentEvents.createdAt, twentyFourHoursAgo),
          )
        )
        .orderBy(desc(agentEvents.createdAt));

      const seen = new Set<string>();
      const dupeIds: number[] = [];
      for (const e of escalations) {
        const key = `${e.agentName}|${e.agentEntityId || ""}|${e.organizationId || ""}`;
        if (seen.has(key)) {
          dupeIds.push(e.id);
        } else {
          seen.add(key);
        }
      }

      // 3. Remove duplicate Orchestrator summaries (keep newest per org per 6h)
      const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000);
      const orchEvents = await db
        .select()
        .from(agentEvents)
        .where(
          and(
            eq(agentEvents.agentName, "Orchestrator"),
            eq(agentEvents.eventType, "summary"),
            gte(agentEvents.createdAt, sixHoursAgo),
          )
        )
        .orderBy(desc(agentEvents.createdAt));

      const orchSeen = new Set<string>();
      for (const e of orchEvents) {
        const key = `orch|${e.organizationId || ""}`;
        if (orchSeen.has(key)) {
          dupeIds.push(e.id);
        } else {
          orchSeen.add(key);
        }
      }

      if (dupeIds.length > 0) {
        // Delete in batches of 100
        for (let i = 0; i < dupeIds.length; i += 100) {
          const batch = dupeIds.slice(i, i + 100);
          await db.delete(agentEvents).where(inArray(agentEvents.id, batch));
        }
      }

      return { deleted: dupeIds.length, message: `Purged ${dupeIds.length} duplicate events` };
    }),
});
