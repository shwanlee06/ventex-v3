/**
 * Organization Scope Middleware
 * 
 * Validates that non-VENTEX-team users can only access data from their own organization.
 * VENTEX team (owner, admin, partner) can access any org's data.
 * 
 * Usage in tRPC procedures:
 *   someProc: protectedProcedure
 *     .input(z.object({ organizationId: z.number() }))
 *     .use(enforceOrgScope)
 *     .query(...)
 * 
 * For optional organizationId:
 *   someProc: protectedProcedure
 *     .input(z.object({ organizationId: z.number().optional() }))
 *     .use(enforceOrgScopeOptional)
 *     .query(...)
 */

import { TRPCError } from "@trpc/server";
import { isVentexTeam } from "./rbac";

/**
 * Resolves the effective organizationId for a query.
 * - VENTEX team: uses the requested orgId (can view any org)
 * - Client users: forced to their own orgId, throws FORBIDDEN if mismatch
 * 
 * Returns the effective orgId to use in queries.
 */
export function resolveOrgId(
  user: { role: string; organizationId?: number | null },
  requestedOrgId?: number | null
): number | null {
  const isAdmin = isVentexTeam(user);

  if (isAdmin) {
    // VENTEX team can scope to any org, or null for all
    return requestedOrgId ?? null;
  }

  // Non-VENTEX user: must have an org
  if (!user.organizationId) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Access denied — no organization assigned",
    });
  }

  // If they requested a specific org, it must match their own
  if (requestedOrgId && requestedOrgId !== user.organizationId) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Access denied",
    });
  }

  // Force their own org
  return user.organizationId;
}

/**
 * tRPC middleware for procedures with required organizationId input.
 * Validates org access and injects effectiveOrgId into context.
 */
export const enforceOrgScope = async (opts: any) => {
  const { ctx, input, next } = opts;
  const user = ctx.user;
  if (!user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Not authenticated" });
  }

  const requestedOrgId = input?.organizationId;
  const effectiveOrgId = resolveOrgId(user, requestedOrgId);

  return next({
    ctx: {
      ...ctx,
      effectiveOrgId,
    },
  });
};

/**
 * tRPC middleware for procedures with optional organizationId input.
 * Same validation but allows null orgId for VENTEX team "view all" mode.
 */
export const enforceOrgScopeOptional = async (opts: any) => {
  const { ctx, input, next } = opts;
  const user = ctx.user;
  if (!user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Not authenticated" });
  }

  const requestedOrgId = input?.organizationId;
  const effectiveOrgId = resolveOrgId(user, requestedOrgId);

  return next({
    ctx: {
      ...ctx,
      effectiveOrgId,
    },
  });
};
