/**
 * Tenant Context Guard
 * 
 * Middleware that REJECTS any DB-touching procedure that lacks tenant context.
 * This is the core defense mechanism for tenant isolation.
 * 
 * Rules:
 * - VENTEX team (owner, admin, partner, manager): allowed to query without org scope
 *   (they manage all tenants), but effectiveOrgId is still tracked for audit.
 * - Client users (user, client, viewer): MUST have organizationId on their user record.
 *   If missing, the request is REJECTED (thrown, not warned).
 * - Public procedures are exempt (no user context).
 * 
 * This middleware should be applied to ALL protected procedures that touch tenant data.
 * System-level procedures (auth, settings, etc.) may be exempt.
 */

import { TRPCError } from "@trpc/server";
import { isVentexTeam } from "./rbac";

export interface TenantContext {
  /** The resolved tenant org ID. Null only for VENTEX team in "view all" mode. */
  tenantOrgId: number | null;
  /** Whether the current user is VENTEX team (cross-tenant access). */
  isCrossTenantAccess: boolean;
}

/**
 * Validates that the current user has proper tenant context.
 * Throws TRPCError (FORBIDDEN) if a client user lacks organizationId.
 * 
 * @param user - The authenticated user from ctx
 * @param requestedOrgId - Optional org ID from input (for VENTEX team scoping)
 * @returns TenantContext with resolved org ID
 */
export function validateTenantContext(
  user: { role: string; organizationId?: number | null; id: number; openId: string },
  requestedOrgId?: number | null
): TenantContext {
  const isAdmin = isVentexTeam(user);

  if (isAdmin) {
    // VENTEX team can access any org's data
    // If they specify an orgId, use it; otherwise null = "view all"
    return {
      tenantOrgId: requestedOrgId ?? null,
      isCrossTenantAccess: true,
    };
  }

  // Non-VENTEX user: MUST have an organization assigned
  if (!user.organizationId) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "TENANT_CONTEXT_MISSING: User has no organization assigned. Access denied.",
    });
  }

  // If they requested a specific org, it must match their own
  if (requestedOrgId != null && requestedOrgId !== user.organizationId) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "CROSS_TENANT_VIOLATION: Cannot access another organization's data.",
    });
  }

  return {
    tenantOrgId: user.organizationId,
    isCrossTenantAccess: false,
  };
}

/**
 * tRPC middleware factory for tenant context enforcement.
 * 
 * Usage:
 *   .use(createTenantGuard())
 * 
 * After this middleware, ctx will contain:
 *   ctx.tenantOrgId: number | null
 *   ctx.isCrossTenantAccess: boolean
 */
export function createTenantGuard() {
  return async (opts: any) => {
    const { ctx, input, next } = opts;
    const user = ctx.user;

    if (!user) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Authentication required for tenant-scoped operations.",
      });
    }

    // Extract organizationId from input if present
    const requestedOrgId = input?.organizationId ?? input?.orgId ?? null;

    const tenantCtx = validateTenantContext(user, requestedOrgId);

    return next({
      ctx: {
        ...ctx,
        tenantOrgId: tenantCtx.tenantOrgId,
        isCrossTenantAccess: tenantCtx.isCrossTenantAccess,
      },
    });
  };
}

/**
 * Utility to assert tenant scoping in DB queries.
 * Call this in any DB helper that touches tenant data to ensure
 * the query includes an org filter.
 * 
 * @param orgId - The org ID to scope the query to
 * @param procedureName - Name of the calling procedure (for error messages)
 * @throws TRPCError if orgId is null for a query that requires it
 */
export function assertTenantScope(
  orgId: number | null | undefined,
  procedureName: string
): asserts orgId is number {
  if (orgId == null) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: `TENANT_SCOPE_MISSING: Procedure "${procedureName}" attempted a DB query without org scoping.`,
    });
  }
}
