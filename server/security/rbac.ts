/**
 * Role-Based Access Control (RBAC) Middleware
 * 
 * Permission system (SOC 2 Type II readiness in progress) with 7 roles:
 * 
 * VENTEX INTERNAL TEAM:
 * - owner: Full system access, can manage all settings and users
 * - admin: Same as owner — full Command Center access, all settings, all clients
 * 
 * EXTERNAL / CLIENT-SIDE:
 * - partner: Elevated client access (read all data + limited write) — NOT VENTEX internal
 * - manager: Can view/edit assigned ventures and tasks
 * - user: Standard access to assigned ventures (read + limited write)
 * - client: External client portal — read-only access to assigned ventures
 * - viewer: Read-only access to assigned ventures
 *
 * DUAL-IDENTITY MODEL (PE-01):
 * The `user` and `manager` roles operate with a dual-identity model:
 * - Their system role (from the `users` table) determines UI capabilities and permissions
 * - Their organizationId (from `users` table) determines data scope
 * - A "manager" with organizationId=5 can only access ventures assigned to org 5
 *   via the `org_venture_access` table
 * - A "manager" with NO organizationId (or orgId=1) is treated as VENTEX internal
 *   and gets full Command Center access (same as admin for data visibility)
 * - VENTEX internal roles (owner, admin) have NO organizationId constraint
 *   and can access all data across all organizations
 * - The `isVentexTeam()` helper checks: owner/admin = always true;
 *   manager/user = true only if no organizationId or orgId=1
 * - For scoped queries, `resolveVentureScope()` returns:
 *   - null (no filter) for VENTEX admins
 *   - array of venture IDs for org-scoped users
 */

import { TRPCError } from "@trpc/server";
import { eq, and, or, isNull, gte, inArray } from "drizzle-orm";
import { getDb } from "../db";
import { userVentureAccess, auditLog, orgVentureAccess } from "../../drizzle/schema";
import type { User } from "../../drizzle/schema";

// Higher number = more permissions
export const ROLE_HIERARCHY: Record<string, number> = {
  viewer: 10,
  client: 20,
  user: 30,
  partner: 35,
  manager: 40,
  admin: 50,
  owner: 60,
};

export type Action =
  | "read"
  | "create"
  | "update"
  | "delete"
  | "manage_team"
  | "manage_roles"
  | "manage_settings"
  | "manage_access"
  | "export_data"
  | "view_audit_log"
  | "process_documents"
  | "manage_spvs"
  | "manage_distributions";

// Maps each role to the actions they can perform
const PERMISSION_MATRIX: Record<string, Set<Action>> = {
  viewer: new Set<Action>(["read"]),
  client: new Set<Action>(["read"]),
  user: new Set<Action>(["read", "create", "update", "process_documents"]),
  partner: new Set<Action>([
    "read", "create", "update",
    "process_documents", "export_data",
    "view_audit_log",
  ]),
  manager: new Set<Action>([
    "read", "create", "update", "delete",
    "manage_team", "process_documents", "manage_spvs",
  ]),
  admin: new Set<Action>([
    "read", "create", "update", "delete",
    "manage_team", "manage_roles", "manage_settings",
    "manage_access", "export_data", "view_audit_log",
    "process_documents", "manage_spvs", "manage_distributions",
  ]),
  owner: new Set<Action>([
    "read", "create", "update", "delete",
    "manage_team", "manage_roles", "manage_settings",
    "manage_access", "export_data", "view_audit_log",
    "process_documents", "manage_spvs", "manage_distributions",
  ]),
};


/**
 * Roles that require MFA when the organization has mfaEnforced=true.
 * These are privileged roles that can modify system state.
 */
export const MFA_REQUIRED_ROLES = new Set(["owner", "admin", "manager"]);

/**
 * Check if a user should be required to have MFA enabled.
 * Returns true if the user's role is in MFA_REQUIRED_ROLES.
 * The actual enforcement (blocking access if MFA not set up) should be
 * checked at the session/context level when the org has mfaEnforced=true.
 */
export function requiresMFA(user: { role: string }): boolean {
  return MFA_REQUIRED_ROLES.has(user.role);
}

/**
 * Check if a user is part of the VENTEX internal team.
 * VENTEX team sees everything; clients see only their org's data.
 * 
 * owner/admin = VENTEX team (full Command Center access)
 * partner = external (elevated client, NOT VENTEX internal)
 * manager/user = VENTEX team only if no client org assigned
 * client/viewer = never VENTEX team
 */
export function isVentexTeam(user: { role: string; organizationId?: number | null }): boolean {
  if (user.role === "owner" || user.role === "admin") return true;
  if (user.role === "manager" || user.role === "user") {
    return !user.organizationId || user.organizationId === 1;
  }
  return false;
}

/**
 * Get venture IDs accessible to a user's organization.
 * Returns null for VENTEX team (meaning "all ventures").
 * Returns empty array if user has no org or org has no venture access.
 */
export async function getOrgVentureIds(
  user: User
): Promise<number[] | null> {
  // VENTEX team sees everything
  if (isVentexTeam(user)) return null;

  // No org = no access
  if (!user.organizationId) return [];

  const db = await getDb();
  if (!db) return [];

  const rows = await db
    .select({ ventureId: orgVentureAccess.ventureId })
    .from(orgVentureAccess)
    .where(eq(orgVentureAccess.organizationId, user.organizationId));

  return rows.map((r) => r.ventureId);
}

/**
 * Get SPV IDs accessible to a user's organization (via venture links).
 * Returns null for VENTEX team (meaning "all SPVs").
 */
export async function getOrgSpvIds(
  user: User
): Promise<number[] | null> {
  if (isVentexTeam(user)) return null;

  const ventureIds = await getOrgVentureIds(user);
  if (!ventureIds || ventureIds.length === 0) return ventureIds === null ? null : [];

  const db = await getDb();
  if (!db) return [];

  // Import spvVentures dynamically to avoid circular deps
  const { spvVentures } = await import("../../drizzle/schema");
  const rows = await db
    .select({ spvId: spvVentures.spvId })
    .from(spvVentures)
    .where(inArray(spvVentures.ventureId, ventureIds));

  return Array.from(new Set(rows.map((r) => r.spvId)));
}

/**
 * Check if a role has a specific permission.
 */
export function hasPermission(role: string, action: Action): boolean {
  const perms = PERMISSION_MATRIX[role];
  if (!perms) return false;
  return perms.has(action);
}

/**
 * Check if roleA is at least as privileged as roleB.
 */
export function isRoleAtLeast(roleA: string, roleB: string): boolean {
  return (ROLE_HIERARCHY[roleA] ?? 0) >= (ROLE_HIERARCHY[roleB] ?? 0);
}

/**
 * Get venture IDs belonging to a specific organization.
 * Used by VENTEX admin to scope data to a selected client workspace.
 */
export async function getVentureIdsForOrg(
  organizationId: number
): Promise<number[]> {
  const db = await getDb();
  if (!db) return [];

  const rows = await db
    .select({ ventureId: orgVentureAccess.ventureId })
    .from(orgVentureAccess)
    .where(eq(orgVentureAccess.organizationId, organizationId));

  return rows.map((r) => r.ventureId);
}

/**
 * Get SPV IDs belonging to a specific organization (via venture links).
 */
export async function getSpvIdsForOrg(
  organizationId: number
): Promise<number[]> {
  const ventureIds = await getVentureIdsForOrg(organizationId);
  if (ventureIds.length === 0) return [];

  const db = await getDb();
  if (!db) return [];

  const { spvVentures } = await import("../../drizzle/schema");
  const rows = await db
    .select({ spvId: spvVentures.spvId })
    .from(spvVentures)
    .where(inArray(spvVentures.ventureId, ventureIds));

  return Array.from(new Set(rows.map((r) => r.spvId)));
}

/**
 * Resolve venture IDs for a query — handles both VENTEX admin org-scoping and client RBAC.
 * Returns null if no filtering needed (VENTEX admin with no org selected).
 * Returns number[] of allowed venture IDs otherwise.
 */
export async function resolveVentureScope(
  user: User,
  organizationId?: number | null
): Promise<number[] | null> {
  // If VENTEX admin with a specific org selected, scope to that org
  if (isVentexTeam(user) && organizationId) {
    return getVentureIdsForOrg(organizationId);
  }
  // Otherwise use standard RBAC
  return getOrgVentureIds(user);
}

/**
 * Resolve SPV IDs for a query — handles both VENTEX admin org-scoping and client RBAC.
 */
export async function resolveSpvScope(
  user: User,
  organizationId?: number | null
): Promise<number[] | null> {
  if (isVentexTeam(user) && organizationId) {
    return getSpvIdsForOrg(organizationId);
  }
  return getOrgSpvIds(user);
}

/**
 * Check if a user has access to a specific venture.
 * Owner and Admin have access to everything.
 * Other roles need explicit access grants.
 */
export async function checkVentureAccess(
  user: User,
  ventureId: number,
  requiredPermission: "view" | "edit" | "manage" | "full" = "view"
): Promise<boolean> {
  // Owner and Admin have universal access
  if (user.role === "owner" || user.role === "admin") return true;

  const permHierarchy: Record<string, number> = {
    view: 1,
    edit: 2,
    manage: 3,
    full: 4,
  };

  const db = await getDb();
  if (!db) return false;
  const access = await db
    .select()
    .from(userVentureAccess)
    .where(
      and(
        eq(userVentureAccess.userId, user.id),
        eq(userVentureAccess.ventureId, ventureId),
        or(
          isNull(userVentureAccess.expiresAt),
          gte(userVentureAccess.expiresAt, new Date())
        )
      )
    )
    .limit(1);

  if (access.length === 0) return false;

  const grantedLevel = permHierarchy[access[0].permission] ?? 0;
  const requiredLevel = permHierarchy[requiredPermission] ?? 0;

  return grantedLevel >= requiredLevel;
}

/**
 * Check if a user has access to a specific SPV.
 */
export async function checkSpvAccess(
  user: User,
  spvId: number,
  requiredPermission: "view" | "edit" | "manage" | "full" = "view"
): Promise<boolean> {
  if (user.role === "owner" || user.role === "admin") return true;

  const permHierarchy: Record<string, number> = {
    view: 1,
    edit: 2,
    manage: 3,
    full: 4,
  };

  const db = await getDb();
  if (!db) return false;
  const access = await db
    .select()
    .from(userVentureAccess)
    .where(
      and(
        eq(userVentureAccess.userId, user.id),
        eq(userVentureAccess.spvId, spvId),
        or(
          isNull(userVentureAccess.expiresAt),
          gte(userVentureAccess.expiresAt, new Date())
        )
      )
    )
    .limit(1);

  if (access.length === 0) return false;

  const grantedLevel = permHierarchy[access[0].permission] ?? 0;
  const requiredLevel = permHierarchy[requiredPermission] ?? 0;

  return grantedLevel >= requiredLevel;
}

/**
 * Get all venture IDs a user has access to.
 * Returns null for owner/admin (meaning "all").
 */
export async function getAccessibleVentureIds(
  user: User
): Promise<number[] | null> {
  if (user.role === "owner" || user.role === "admin") return null; // all

  const db = await getDb();
  if (!db) return [];
  const rows = await db
    .select({ ventureId: userVentureAccess.ventureId })
    .from(userVentureAccess)
    .where(
      and(
        eq(userVentureAccess.userId, user.id),
        or(
          isNull(userVentureAccess.expiresAt),
          gte(userVentureAccess.expiresAt, new Date())
        )
      )
    );

  return rows
    .map((r: { ventureId: number | null }) => r.ventureId)
    .filter((id: number | null): id is number => id !== null);
}

/**
 * Get all SPV IDs a user has access to.
 * Returns null for owner/admin (meaning "all").
 */
export async function getAccessibleSpvIds(
  user: User
): Promise<number[] | null> {
  if (user.role === "owner" || user.role === "admin") return null;

  const db = await getDb();
  if (!db) return [];
  const rows = await db
    .select({ spvId: userVentureAccess.spvId })
    .from(userVentureAccess)
    .where(
      and(
        eq(userVentureAccess.userId, user.id),
        or(
          isNull(userVentureAccess.expiresAt),
          gte(userVentureAccess.expiresAt, new Date())
        )
      )
    );

  return rows
    .map((r: { spvId: number | null }) => r.spvId)
    .filter((id: number | null): id is number => id !== null);
}

/**
 * Log an audit event.
 */
export async function logAudit(params: {
  organizationId?: number | null;
  userId?: number | null;
  userName?: string | null;
  action: string;
  entityType?: string;
  entityId?: string;
  entityName?: string;
  details?: string;
  ipAddress?: string;
  userAgent?: string;
  result?: "success" | "denied" | "error";
}): Promise<void> {
  try {
    const db = await getDb();
    if (!db) return;
    await db.insert(auditLog).values({
      organizationId: params.organizationId ?? null,
      userId: params.userId ?? null,
      userName: params.userName ?? null,
      action: params.action,
      entityType: params.entityType ?? null,
      entityId: params.entityId ?? null,
      entityName: params.entityName ?? null,
      details: params.details ?? null,
      ipAddress: params.ipAddress ?? null,
      userAgent: params.userAgent ?? null,
      result: params.result ?? "success",
    });
  } catch (err) {
    // Audit logging should never break the main flow
    console.error("[AUDIT] Failed to log:", err);
  }
}

/**
 * Require a specific action permission — throws FORBIDDEN if denied.
 * Use in tRPC procedures.
 */
export function requirePermission(user: User, action: Action): void {
  if (!hasPermission(user.role, action)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: `Insufficient permissions: ${action} requires role ${getMinimumRole(action) || "unknown"}`,
    });
  }
}

/**
 * Get the minimum role required for an action.
 */
function getMinimumRole(action: Action): string | undefined {
  const roles = ["viewer", "client", "user", "manager", "admin", "owner"];
  for (const role of roles) {
    if (PERMISSION_MATRIX[role]?.has(action)) return role;
  }
  return undefined;
}

/**
 * Grant a user access to a venture.
 */
export async function grantVentureAccess(params: {
  userId: number;
  ventureId: number;
  permission: "view" | "edit" | "manage" | "full";
  grantedBy: number;
  expiresAt?: Date;
}): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(userVentureAccess).values({
    userId: params.userId,
    ventureId: params.ventureId,
    permission: params.permission,
    grantedBy: params.grantedBy,
    expiresAt: params.expiresAt ?? null,
  });
}

/**
 * Grant a user access to an SPV.
 */
export async function grantSpvAccess(params: {
  userId: number;
  spvId: number;
  permission: "view" | "edit" | "manage" | "full";
  grantedBy: number;
  expiresAt?: Date;
}): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(userVentureAccess).values({
    userId: params.userId,
    spvId: params.spvId,
    permission: params.permission,
    grantedBy: params.grantedBy,
    expiresAt: params.expiresAt ?? null,
  });
}

/**
 * Revoke a user's access to a venture.
 */
export async function revokeAccess(accessId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .delete(userVentureAccess)
    .where(eq(userVentureAccess.id, accessId));
}
