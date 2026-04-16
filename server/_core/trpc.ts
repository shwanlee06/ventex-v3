import { NOT_ADMIN_ERR_MSG, UNAUTHED_ERR_MSG } from '@shared/const';
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "./context";
import { createAutoAuditMiddleware } from "../security/auditMiddleware";
import { createTenantGuard } from "../security/tenantGuard";

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

export const protectedProcedure = t.procedure.use(requireUser).use(autoAudit);

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
export const tenantScopedProcedure = t.procedure.use(requireUser).use(tenantGuard).use(autoAudit);

export const adminProcedure = t.procedure.use(
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
export const partnerProcedure = t.procedure.use(
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
