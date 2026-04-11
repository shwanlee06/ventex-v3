/**
 * Audit Router — Top-level audit.list endpoint
 * Required for SOC 2 compliance.
 * 
 * Exposes audit log as `audit.list` (the expected tRPC path).
 * Restricted to VENTEX team (owner, admin, partner roles).
 */

import { z } from "zod";
import { router, partnerProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { auditLog } from "../../drizzle/schema";
import { eq, desc, and, like, sql, gte, lte } from "drizzle-orm";
import { resolveOrgId } from "../security/orgScope";

export const auditRouter = router({
  /**
   * audit.list — Paginated, filterable audit log query.
   * Returns records for every blueprint generation, stage advance, and agent event.
   * Restricted to atlas_operator (admin/owner/partner) roles.
   */
  list: partnerProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(200).default(50),
        offset: z.number().min(0).default(0),
        action: z.string().optional(),
        entityType: z.string().optional(),
        userId: z.number().optional(),
        result: z.enum(["success", "denied", "error"]).optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        organizationId: z.number().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return { entries: [], total: 0 };

      const effectiveOrgId = resolveOrgId(ctx.user, input.organizationId);

      const conditions = [];
      if (effectiveOrgId) conditions.push(eq(auditLog.organizationId, effectiveOrgId));
      if (input.action) conditions.push(like(auditLog.action, `%${input.action}%`));
      if (input.entityType) conditions.push(eq(auditLog.entityType, input.entityType));
      if (input.userId) conditions.push(eq(auditLog.userId, input.userId));
      if (input.result) conditions.push(eq(auditLog.result, input.result));
      if (input.startDate) conditions.push(gte(auditLog.createdAt, new Date(input.startDate)));
      if (input.endDate) conditions.push(lte(auditLog.createdAt, new Date(input.endDate)));

      const where = conditions.length > 0 ? and(...conditions) : undefined;

      const [entries, countResult] = await Promise.all([
        db
          .select()
          .from(auditLog)
          .where(where)
          .orderBy(desc(auditLog.createdAt))
          .limit(input.limit)
          .offset(input.offset),
        db
          .select({ count: sql<number>`count(*)` })
          .from(auditLog)
          .where(where),
      ]);

      return {
        entries,
        total: countResult[0]?.count ?? 0,
      };
    }),
});
