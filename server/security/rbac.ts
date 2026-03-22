/**
 * Role-Based Access Control (RBAC) Middleware
 * 
 * SOC 2 compliant permission system with 6 roles:
 * - owner: Full system access, can manage all settings and users
 * - admin: Can manage ventures, SPVs, tasks, team, but not system settings
 * - manager: Can view/edit assigned ventures and tasks
 * - user: Standard access to assigned ventures (read + limited write)
 * - client: External client portal — read-only access to assigned ventures
 * - viewer: Read-only access to assigned ventures
 */

import { TRPCError } from "@trpc/server";
import { eq, and, or, isNull, gte } from "drizzle-orm";
import { getDb } from "../db";
import { userVentureAccess, auditLog } from "../../drizzle/schema";
import type { User } from "../../drizzle/schema";

// ── Role Hierarchy ─────────────────────────────────────────────────────
// Higher number = more permissions
export const ROLE_HIERARCHY: Record<string, number> = {
  viewer: 10,
  client: 20,
  user: 30,
  manager: 40,
  admin: 50,
  owner: 60,
};

// ── Permission Actions ─────────────────────────────────────────────────
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

// ── Permission Matrix ──────────────────────────────────────────────────
// Maps each role to the actions they can perform
const PERMISSION_MATRIX: Record<string, Set<Action>> = {
  viewer: new Set<Action>(["read"]),
  client: new Set<Action>(["read"]),
  user: new Set<Action>(["read", "create", "update", "process_documents"]),
  manager: new Set<Action>([
    "read", "create", "update", "delete",
    "manage_team", "process_documents", "manage_spvs",
  ]),
  admin: new Set<Action>([
    "read", "create", "update", "delete",
    "manage_team", "manage_roles", "export_data",
    "view_audit_log", "process_documents",
    "manage_spvs", "manage_distributions",
  ]),
  owner: new Set<Action>([
    "read", "create", "update", "delete",
    "manage_team", "manage_roles", "manage_settings",
    "manage_access", "export_data", "view_audit_log",
    "process_documents", "manage_spvs", "manage_distributions",
  ]),
};

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
