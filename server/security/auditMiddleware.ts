/**
 * Audit Middleware — Automatically logs all tRPC mutations
 * 
 * Wraps tRPC procedures to log:
 * - Who performed the action (user ID, name)
 * - What action was performed (procedure path)
 * - When it happened (timestamp)
 * - From where (IP address, user agent)
 * - Result (success, denied, error)
 */

import { logAudit } from "./rbac";
import type { TrpcContext } from "../_core/context";

/**
 * Log a mutation action. Call this at the start of any mutation
 * that modifies data to create an audit trail.
 */
export async function auditMutation(params: {
  ctx: TrpcContext;
  action: string;
  entityType: string;
  entityId?: string | number;
  entityName?: string;
  details?: Record<string, unknown>;
  result?: "success" | "denied" | "error";
}): Promise<void> {
  await logAudit({
    userId: params.ctx.user?.id ?? null,
    userName: params.ctx.user?.name ?? null,
    action: params.action,
    entityType: params.entityType,
    entityId: params.entityId != null ? String(params.entityId) : undefined,
    entityName: params.entityName,
    details: params.details ? JSON.stringify(params.details) : undefined,
    ipAddress: params.ctx.req.ip,
    userAgent: params.ctx.req.headers["user-agent"],
    result: params.result ?? "success",
  });
}

/**
 * Log a data access event. Call this for sensitive read operations.
 */
export async function auditAccess(params: {
  ctx: TrpcContext;
  entityType: string;
  entityId?: string | number;
  entityName?: string;
  granted: boolean;
}): Promise<void> {
  await logAudit({
    userId: params.ctx.user?.id ?? null,
    userName: params.ctx.user?.name ?? null,
    action: "read",
    entityType: params.entityType,
    entityId: params.entityId != null ? String(params.entityId) : undefined,
    entityName: params.entityName,
    ipAddress: params.ctx.req.ip,
    userAgent: params.ctx.req.headers["user-agent"],
    result: params.granted ? "success" : "denied",
  });
}

/**
 * Log an authentication event.
 */
export async function auditAuth(params: {
  ctx: TrpcContext;
  action: "login" | "logout" | "login_failed" | "session_expired" | "force_logout";
  userId?: number;
  userName?: string;
  details?: Record<string, unknown>;
}): Promise<void> {
  await logAudit({
    userId: params.userId ?? params.ctx.user?.id ?? null,
    userName: params.userName ?? params.ctx.user?.name ?? null,
    action: params.action,
    entityType: "auth",
    ipAddress: params.ctx.req.ip,
    userAgent: params.ctx.req.headers["user-agent"],
    details: params.details ? JSON.stringify(params.details) : undefined,
    result: params.action === "login_failed" ? "denied" : "success",
  });
}
