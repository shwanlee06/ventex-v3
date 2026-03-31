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

/**
 * Automatic tRPC mutation audit middleware.
 * Applied at the router level so every mutation is captured without manual calls.
 * 
 * Usage in _core/trpc.ts:
 *   const protectedProcedure = t.procedure.use(isAuthed).use(autoAuditMiddleware);
 */
export function createAutoAuditMiddleware() {
  return async (opts: any) => {
    const { ctx, type, path, next, rawInput } = opts;

    // Only log mutations, not queries
    if (type !== "mutation") {
      return next();
    }

    const user = ctx?.user;
    const startTime = Date.now();

    try {
      const result = await next();
      const duration = Date.now() - startTime;

      // Fire-and-forget audit log — don't block the response
      logAudit({
        organizationId: user?.organizationId ?? null,
        userId: user?.id ?? null,
        userName: user?.name ?? user?.email ?? null,
        action: `trpc.${path}`,
        entityType: extractEntityType(path),
        entityId: extractEntityId(rawInput),
        entityName: extractEntityName(rawInput),
        details: JSON.stringify({
          duration,
          inputKeys: rawInput ? Object.keys(rawInput) : [],
        }),
        ipAddress: ctx?.req?.ip,
        userAgent: ctx?.req?.headers?.["user-agent"],
        result: "success",
      }).catch(() => {});

      return result;
    } catch (error: any) {
      const duration = Date.now() - startTime;

      // Log failed mutations too
      logAudit({
        organizationId: user?.organizationId ?? null,
        userId: user?.id ?? null,
        userName: user?.name ?? user?.email ?? null,
        action: `trpc.${path}`,
        entityType: extractEntityType(path),
        entityId: extractEntityId(rawInput),
        entityName: extractEntityName(rawInput),
        details: JSON.stringify({
          duration,
          error: error?.message?.substring(0, 200),
          inputKeys: rawInput ? Object.keys(rawInput) : [],
        }),
        ipAddress: ctx?.req?.ip,
        userAgent: ctx?.req?.headers?.["user-agent"],
        result: error?.code === "FORBIDDEN" || error?.code === "UNAUTHORIZED" ? "denied" : "error",
      }).catch(() => {});

      throw error;
    }
  };
}

// ── Helpers ─────────────────────────────────────────────────────────────

function extractEntityType(path: string): string {
  const parts = path.split(".");
  if (parts.length === 0) return "unknown";
  const router = parts[0];
  const singular: Record<string, string> = {
    ventures: "venture",
    agents: "agent",
    blueprints: "blueprint",
    distributions: "distribution",
    organizations: "organization",
    security: "security",
    intelligence: "intelligence",
    portal: "portal",
    activity: "activity",
    search: "search",
  };
  return singular[router] || router;
}

function extractEntityId(input: any): string | undefined {
  if (!input || typeof input !== "object") return undefined;
  for (const key of ["id", "ventureId", "spvId", "taskId", "userId", "organizationId", "eventId"]) {
    if (input[key] !== undefined && input[key] !== null) {
      return String(input[key]);
    }
  }
  return undefined;
}

function extractEntityName(input: any): string | undefined {
  if (!input || typeof input !== "object") return undefined;
  for (const key of ["name", "title", "label", "ventureName"]) {
    if (typeof input[key] === "string") {
      return input[key].substring(0, 100);
    }
  }
  return undefined;
}
