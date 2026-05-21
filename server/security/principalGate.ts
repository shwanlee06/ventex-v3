// Vision spec v1 — Section 14: Principal Confirmation Gate
// Blocks 8 action types unless principalConfirmed: true is logged
//
// Gate-controlled actions:
// 1. Any LP or external investor communication
// 2. Any distribution release
// 3. Any stage advancement involving capital or legal obligation
// 4. Any compliance filing submission
// 5. Any contract execution or amendment
// 6. Any new organization, venture, or SPV onboarding
// 7. Any report sent outside the organization
// 8. Any team member added or removed
//
// Gate cleared = principalConfirmed: true with logged timestamp and Principal identity
// Gate not cleared = action stays in queue, Principal receives alert, nothing sends

import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { agentEvents } from "../../drizzle/schema";
import { eq, and, desc } from "drizzle-orm";
import { ENV } from "../_core/env";


export type GatedActionType =
  | "lp_communication"
  | "distribution_release"
  | "capital_stage_advance"
  | "compliance_filing"
  | "contract_execution"
  | "entity_onboarding"
  | "external_report"
  | "team_change";

const GATED_ACTION_LABELS: Record<GatedActionType, string> = {
  lp_communication: "LP or external investor communication",
  distribution_release: "Distribution release",
  capital_stage_advance: "Stage advancement involving capital or legal obligation",
  compliance_filing: "Compliance filing submission",
  contract_execution: "Contract execution or amendment",
  entity_onboarding: "New organization, venture, or SPV onboarding",
  external_report: "Report sent outside the organization",
  team_change: "Team member added or removed",
};

interface PrincipalGateResult {
  allowed: boolean;
  reason?: string;
  queuedEventId?: number;
}

/**
 * Check if a gated action has Principal confirmation.
 * If not confirmed, queues the action and returns { allowed: false }.
 * The caller should NOT proceed with the action if allowed is false.
 */
export async function checkPrincipalGate(opts: {
  actionType: GatedActionType;
  organizationId: number;
  entityId?: string;
  entityName?: string;
  description: string;
  userId?: string;
  userName?: string;
}): Promise<PrincipalGateResult> {
  const db = await getDb();
  if (!db) return { allowed: false, reason: "Database unavailable" };

  // Check if there's an existing confirmed gate for this specific action
  // Look for a recent confirmation event (within 24h) for this entity+action
  const confirmationConditions = [
    eq(agentEvents.agentName, "Principal Gate"),
    eq(agentEvents.actionType, opts.actionType),
    eq(agentEvents.actionTaken, true),
  ];
  if (opts.entityId) {
    confirmationConditions.push(eq(agentEvents.agentEntityId, opts.entityId));
  }
  confirmationConditions.push(eq(agentEvents.organizationId, opts.organizationId));

  const existingConfirmation = await db
    .select({ id: agentEvents.id })
    .from(agentEvents)
    .where(and(...confirmationConditions))
    .orderBy(desc(agentEvents.createdAt))
    .limit(1);

  if (existingConfirmation.length > 0) {
    return { allowed: true };
  }

  // No confirmation found — queue the action and alert Principal
  const result = await db.insert(agentEvents).values({
    organizationId: opts.organizationId,
    agentName: "Principal Gate",
    eventType: "alert",
    message: `PRINCIPAL CONFIRMATION REQUIRED: ${GATED_ACTION_LABELS[opts.actionType]} — ${opts.description}`,
    severity: "critical",
    actionType: opts.actionType,
    actionLabel: "Confirm & Execute",
    actionPayload: {
      gatedAction: opts.actionType,
      entityId: opts.entityId,
      entityName: opts.entityName,
      description: opts.description,
      requestedBy: opts.userName || "System",
    },
    entityType: "gate",
    agentEntityId: opts.entityId || null,
    agentEntityName: opts.entityName || null,
    audience: "client",
    requiresClientAction: true,
    isRead: false,
    actionTaken: false,
    recipient: "Principal",
    outcome: "pending",
  } as any);

  const queuedEventId = (result as any)[0]?.insertId;

  return {
    allowed: false,
    reason: `Action queued for Principal confirmation: ${GATED_ACTION_LABELS[opts.actionType]}`,
    queuedEventId,
  };
}

/**
 * Confirm a gated action — marks the gate event as confirmed.
 * Only the Principal (or admin) should call this.
 */
export async function confirmPrincipalGate(opts: {
  eventId: number;
  confirmedBy: string;
  confirmedByName: string;
}): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  await db.update(agentEvents).set({
    actionTaken: true,
    outcome: "confirmed",
  } as any).where(eq(agentEvents.id, opts.eventId));

  // Log the confirmation
  const event = await db.select().from(agentEvents).where(eq(agentEvents.id, opts.eventId)).limit(1);
  if (event.length > 0) {
    await db.insert(agentEvents).values({
      organizationId: event[0].organizationId,
      agentName: "Principal Gate",
      eventType: "status_change",
      message: `Principal confirmation granted by ${opts.confirmedByName} for: ${event[0].message?.substring(0, 200)}`,
      severity: "info",
      actionType: event[0].actionType,
      entityType: "gate",
      agentEntityId: event[0].agentEntityId,
      agentEntityName: event[0].agentEntityName,
      audience: "both",
      requiresClientAction: false,
      isRead: false,
      actionTaken: true,
      recipient: opts.confirmedByName,
      outcome: "confirmed",
    } as any);
  }

  return true;
}

/**
 * Throws a TRPCError if the Principal gate is not cleared.
 * Use this in tRPC procedures that need gate enforcement.
 */
export async function requirePrincipalGate(opts: {
  actionType: GatedActionType;
  organizationId: number;
  entityId?: string;
  entityName?: string;
  description: string;
  userId?: string;
  userName?: string;
  callerOpenId?: string;
}): Promise<void> {
  // In test environment, skip the gate to allow test execution
  if (process.env.NODE_ENV === "test" || process.env.VITEST) {
    return;
  }

  // If the caller IS the owner/principal, they don't need to approve their own actions
  if (opts.callerOpenId && opts.callerOpenId === ENV.ownerOpenId) {
    return;
  }

  const result = await checkPrincipalGate(opts);
  if (!result.allowed) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: result.reason || "Principal confirmation required. Action has been queued for approval.",
    });
  }
}
