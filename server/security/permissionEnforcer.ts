/**
 * Permission Enforcer — Granular role-based write restrictions
 * 
 * Enforces what each role can DO (not just what they can SEE).
 * This layer sits on top of the existing RBAC and adds action-level enforcement.
 * 
 * Role capabilities:
 * 
 * VIEWER:  Read-only. Cannot create, update, or delete anything.
 * CLIENT:  Read + mark own tasks complete + approve/dismiss drafts.
 * USER:    Read + create/update tasks on assigned ventures + upload docs.
 * PARTNER: Read + create/update tasks + view audit log + export data.
 * MANAGER: Read + full CRUD on assigned ventures (tasks, docs, team) + manage SPVs.
 * ADMIN:   Full access to all operations across all orgs.
 * OWNER:   Same as admin.
 * 
 * Usage:
 *   import { enforcePermission } from "../security/permissionEnforcer";
 *   // In a mutation:
 *   enforcePermission(ctx.user, "tasks", "create");
 */
import { TRPCError } from "@trpc/server";

export type Resource =
  | "ventures"
  | "tasks"
  | "spvs"
  | "distributions"
  | "documents"
  | "team"
  | "compliance"
  | "agents"
  | "settings"
  | "decisions"
  | "audit";

export type Operation = "read" | "create" | "update" | "delete" | "approve" | "export";

/**
 * Permission matrix: role → resource → allowed operations
 */
// Helper to create typed operation sets
function ops(...operations: Operation[]): Set<Operation> {
  return new Set(operations);
}

const PERMISSIONS: Record<string, Record<Resource, Set<Operation>>> = {
  viewer: {
    ventures: ops("read"),
    tasks: ops("read"),
    spvs: ops("read"),
    distributions: ops("read"),
    documents: ops("read"),
    team: ops("read"),
    compliance: ops("read"),
    agents: ops("read"),
    settings: ops(),
    decisions: ops("read"),
    audit: ops(),
  },
  client: {
    ventures: ops("read"),
    tasks: ops("read", "update"), // can mark tasks complete
    spvs: ops("read"),
    distributions: ops("read"),
    documents: ops("read"),
    team: ops("read"),
    compliance: ops("read"),
    agents: ops("read"),
    settings: ops(),
    decisions: ops("read", "approve"), // can approve/dismiss drafts
    audit: ops(),
  },
  user: {
    ventures: ops("read"),
    tasks: ops("read", "create", "update"),
    spvs: ops("read"),
    distributions: ops("read"),
    documents: ops("read", "create"), // can upload docs
    team: ops("read"),
    compliance: ops("read", "update"),
    agents: ops("read"),
    settings: ops(),
    decisions: ops("read"),
    audit: ops(),
  },
  partner: {
    ventures: ops("read"),
    tasks: ops("read", "create", "update"),
    spvs: ops("read"),
    distributions: ops("read"),
    documents: ops("read", "create"),
    team: ops("read"),
    compliance: ops("read"),
    agents: ops("read"),
    settings: ops(),
    decisions: ops("read", "approve"),
    audit: ops("read", "export"),
  },
  manager: {
    ventures: ops("read", "create", "update"),
    tasks: ops("read", "create", "update", "delete"),
    spvs: ops("read", "create", "update"),
    distributions: ops("read", "update"),
    documents: ops("read", "create", "delete"),
    team: ops("read", "create", "update"),
    compliance: ops("read", "create", "update"),
    agents: ops("read"),
    settings: ops("read"),
    decisions: ops("read", "approve"),
    audit: ops("read", "export"),
  },
  admin: {
    ventures: ops("read", "create", "update", "delete"),
    tasks: ops("read", "create", "update", "delete"),
    spvs: ops("read", "create", "update", "delete"),
    distributions: ops("read", "create", "update", "delete", "approve"),
    documents: ops("read", "create", "update", "delete"),
    team: ops("read", "create", "update", "delete"),
    compliance: ops("read", "create", "update", "delete"),
    agents: ops("read", "create", "update", "delete"),
    settings: ops("read", "update"),
    decisions: ops("read", "approve"),
    audit: ops("read", "export"),
  },
  owner: {
    ventures: ops("read", "create", "update", "delete"),
    tasks: ops("read", "create", "update", "delete"),
    spvs: ops("read", "create", "update", "delete"),
    distributions: ops("read", "create", "update", "delete", "approve"),
    documents: ops("read", "create", "update", "delete"),
    team: ops("read", "create", "update", "delete"),
    compliance: ops("read", "create", "update", "delete"),
    agents: ops("read", "create", "update", "delete"),
    settings: ops("read", "update"),
    decisions: ops("read", "approve"),
    audit: ops("read", "export"),
  },
};

/**
 * Check if a user has permission to perform an operation on a resource.
 * Returns boolean (non-throwing).
 */
export function checkPermission(
  user: { role: string } | null | undefined,
  resource: Resource,
  operation: Operation
): boolean {
  if (!user) return false;
  const rolePerms = PERMISSIONS[user.role];
  if (!rolePerms) return false;
  const resourcePerms = rolePerms[resource];
  if (!resourcePerms) return false;
  return resourcePerms.has(operation);
}

/**
 * Enforce permission — throws TRPCError if denied.
 * Use this in mutations/queries that need granular enforcement.
 */
export function enforcePermission(
  user: { role: string; name?: string | null } | null | undefined,
  resource: Resource,
  operation: Operation
): void {
  if (!checkPermission(user, resource, operation)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: `Permission denied: ${user?.role || "unknown"} cannot ${operation} ${resource}`,
    });
  }
}

/**
 * Get all permissions for a role (for frontend display).
 */
export function getRolePermissions(role: string): Record<Resource, Operation[]> {
  const rolePerms = PERMISSIONS[role];
  if (!rolePerms) return {} as Record<Resource, Operation[]>;
  
  const result: Partial<Record<Resource, Operation[]>> = {};
  for (const resource of Object.keys(rolePerms) as Resource[]) {
    result[resource] = Array.from(rolePerms[resource]) as Operation[];
  }
  return result as Record<Resource, Operation[]>;
}

/**
 * Client-side task update restriction:
 * - viewer: cannot update anything
 * - client: can only update status to "complete" (mark done)
 * - user/partner: can update status, assignees, due date
 * - manager+: can update anything
 */
export function enforceTaskUpdateScope(
  user: { role: string },
  updates: Record<string, unknown>
): void {
  if (user.role === "viewer") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Viewers cannot modify tasks",
    });
  }
  if (user.role === "client") {
    // Clients can only mark tasks complete
    const allowedFields = new Set(["id", "status"]);
    const attemptedFields = Object.keys(updates).filter(k => updates[k] !== undefined);
    const disallowed = attemptedFields.filter(f => !allowedFields.has(f));
    if (disallowed.length > 0) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: `Clients can only mark tasks complete. Cannot modify: ${disallowed.join(", ")}`,
      });
    }
    if (updates.status && updates.status !== "complete" && updates.status !== "Complete") {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Clients can only mark tasks as complete",
      });
    }
  }
}

/**
 * Enforce that only principal-level users (admin/owner/partner with approve permission)
 * can approve or reject decisions.
 */
export function enforceDecisionAuthority(
  user: { role: string } | null | undefined
): void {
  enforcePermission(user, "decisions", "approve");
}
