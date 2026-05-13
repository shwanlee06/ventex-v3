// Vision spec v1 — Section 16: Hard Blocks
// These are absolute rules enforced at the application layer.
//
// 1. Never send any external communication without principalConfirmed: true
// 2. Never execute or instruct a financial wire or transaction
// 3. Never mark a compliance filing complete without a filed document attached
// 4. Never mark a task Complete unless the assignedTo party or Principal confirms it
// 5. Never share data across two different organizationId values
// 6. Never delete any record from the Agent Log

import { TRPCError } from "@trpc/server";

/**
 * HARD BLOCK 1: External communication requires Principal confirmation
 */
export function enforceExternalCommsBlock(principalConfirmed: boolean | null | undefined): void {
  if (!principalConfirmed) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "HARD BLOCK: Cannot send external communication without Principal confirmation. Set principalConfirmed to true first.",
    });
  }
}

/**
 * HARD BLOCK 2: No financial wire or transaction execution
 * This is a permanent block — the system never executes money movement.
 */
export function enforceNoFinancialExecution(): void {
  throw new TRPCError({
    code: "FORBIDDEN",
    message: "HARD BLOCK: This system does not execute financial wires or transactions. Distribution tracking is display-only.",
  });
}

/**
 * HARD BLOCK 3: Compliance filing cannot be marked complete without a filed document
 */
export function enforceComplianceDocumentRequired(status: string, documentUrl: string | null | undefined): void {
  if ((status === "filed" || status === "Filed") && !documentUrl) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "HARD BLOCK: Cannot mark compliance filing as complete without an attached filed document. Upload the document first.",
    });
  }
}

/**
 * HARD BLOCK 4: Task cannot be marked Complete unless assignedTo or Principal confirms
 * The caller must verify that the current user is either the assignee or a Principal/admin.
 */
export function enforceTaskCompletionAuth(
  newStatus: string,
  currentUserId: string | number,
  currentUserName: string | undefined,
  currentUserRole: string | undefined,
  assignedTo: string | null | undefined,
  assignedToId: number | null | undefined
): void {
  if (newStatus !== "complete" && newStatus !== "Complete") return;

  const isPrincipalOrAdmin = currentUserRole === "admin" || currentUserRole === "owner";
  const isAssignee =
    (assignedToId && String(assignedToId) === String(currentUserId)) ||
    (assignedTo && currentUserName && assignedTo.toLowerCase() === currentUserName.toLowerCase());

  if (!isPrincipalOrAdmin && !isAssignee) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "HARD BLOCK: Only the assigned party or Principal can mark a task as Complete.",
    });
  }
}

/**
 * HARD BLOCK 5: Cross-tenant data isolation
 * Verifies that the requested organizationId matches the user's authorized org.
 * This is already enforced by resolveOrgId() in most routers, but this provides
 * an explicit check for edge cases.
 */
export function enforceTenantIsolation(
  userOrgId: number | null | undefined,
  requestedOrgId: number | null | undefined,
  isAdmin: boolean
): void {
  if (isAdmin) return; // Admins (VENTEX team) can access all orgs
  if (!requestedOrgId) return; // No org specified = will be resolved by resolveOrgId
  if (userOrgId && requestedOrgId !== userOrgId) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "HARD BLOCK: Cannot access data from another organization.",
    });
  }
}

/**
 * HARD BLOCK 6: Agent Log records are immutable — never delete
 * This is enforced by NOT exposing any delete endpoint for agent_events.
 * The purgeStaleEvents procedure only removes duplicates, not audit records.
 * This function exists as a guard for any future code that might try to delete.
 */
export function enforceAgentLogImmutability(): void {
  throw new TRPCError({
    code: "FORBIDDEN",
    message: "HARD BLOCK: Agent Log records are immutable and cannot be deleted. This is the audit trail.",
  });
}
