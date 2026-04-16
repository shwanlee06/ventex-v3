import { NOT_ADMIN_ERR_MSG, UNAUTHED_ERR_MSG } from '@shared/const';
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "./context";
import { createAutoAuditMiddleware } from "../security/auditMiddleware";
import { createTenantGuard } from "../security/tenantGuard";
import { getOrgAllowlist, getClientIp } from "../security/ipAllowlist";

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;

const requireUser = t.middleware(async opts => {
  const { ctx, next } = opts;

  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

const autoAudit = t.middleware(createAutoAuditMiddleware());

/**
 * IP Allowlist enforcement middleware.
 * Runs after requireUser (so ctx.user is available) and before business logic.
 * If the user's org has an ipAllowlist configured, the request IP must match.
 */
const enforceIpAllowlist = t.middleware(async (opts) => {
  const { ctx, next } = opts;
  if (!ctx.user?.organizationId) return next();

  const allowlist = await getOrgAllowlist(ctx.user.organizationId);
  if (!allowlist || allowlist.length === 0) return next();

  const clientIp = getClientIp(ctx.req);
  const allowed = allowlist.some((cidr: string) => {
    const parts = cidr.split("/");
    if (parts.length !== 2) return false;
    const ipToNum = (ip: string) => {
      const p = ip.split(".").map(Number);
      if (p.length !== 4 || p.some((n) => isNaN(n) || n < 0 || n > 255)) return null;
      return ((p[0] << 24) | (p[1] << 16) | (p[2] << 8) | p[3]) >>> 0;
    };
    const maskBits = parseInt(parts[1], 10);
    if (isNaN(maskBits) || maskBits < 0 || maskBits > 32) return false;
    const ipNum = ipToNum(clientIp);
    const cidrNum = ipToNum(parts[0]);
    if (ipNum === null || cidrNum === null) return false;
    const mask = maskBits === 0 ? 0 : (~0 << (32 - maskBits)) >>> 0;
    return (ipNum & mask) === (cidrNum & mask);
  });

  if (!allowed) {
    console.warn(`[IP_ALLOWLIST] Blocked tRPC request from ${clientIp} for org ${ctx.user.organizationId}`);
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Your IP address is not in the organization's allowed list. Contact your administrator.",
    });
  }

  return next();
});

export const protectedProcedure = t.procedure.use(requireUser).use(enforceIpAllowlist).use(autoAudit);

const tenantGuard = t.middleware(createTenantGuard());

/**
 * Tenant-scoped procedure — enforces org isolation for all non-VENTEX users.
 * After this middleware, ctx contains:
 *   ctx.tenantOrgId: number | null (null only for VENTEX team in "view all" mode)
 *   ctx.isCrossTenantAccess: boolean
 * 
 * Use this for ANY procedure that touches tenant-specific data.
 * System-level procedures (auth, settings) should use protectedProcedure instead.
 */
export const tenantScopedProcedure = t.procedure.use(requireUser).use(enforceIpAllowlist).use(tenantGuard).use(autoAudit);

export const adminProcedure = t.procedure.use(requireUser).use(enforceIpAllowlist).use(
  t.middleware(async opts => {
    const { ctx, next } = opts;

    if (!ctx.user || (ctx.user.role !== 'admin' && ctx.user.role !== 'owner')) {
      throw new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }

    return next({
      ctx: {
        ...ctx,
        user: ctx.user,
      },
    });
  }),
).use(autoAudit);

/**
 * Partner procedure — accessible by partner, admin, and owner roles.
 * Partners have read access to all data + limited write access.
 */
export const partnerProcedure = t.procedure.use(requireUser).use(enforceIpAllowlist).use(
  t.middleware(async opts => {
    const { ctx, next } = opts;

    if (!ctx.user || !['partner', 'admin', 'owner'].includes(ctx.user.role)) {
      throw new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }

    return next({
      ctx: {
        ...ctx,
        user: ctx.user,
      },
    });
  }),
).use(autoAudit);
