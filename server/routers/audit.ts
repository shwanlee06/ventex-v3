/**
 * Audit Router — Top-level audit endpoints
 * Required for compliance readiness.
 * 
 * Exposes:
 * - audit.list: Paginated, filterable audit log query
 * - audit.entityHistory: Full audit trail for a specific entity
 * - audit.exportEntityCsv: Downloadable CSV for a specific entity (legal teams)
 * 
 * Restricted to VENTEX team (owner, admin, partner roles).
 */

import { z } from "zod";
import { router, partnerProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { auditLog } from "../../drizzle/schema";
import { eq, desc, and, like, sql, gte, lte } from "drizzle-orm";
import { resolveOrgId } from "../security/orgScope";
import { logAudit } from "../security/rbac";

export const auditRouter = router({
  /**
   * audit.list — Paginated, filterable audit log query.
   * Returns records for every blueprint generation, stage advance, and agent event.
   * Restricted to ventex_operator (admin/owner/partner) roles.
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
        total: Number(countResult[0]?.count) ?? 0,
      };
    }),

  /**
   * audit.entityHistory — Full audit trail for a specific entity.
   * Used on venture/SPV/distribution detail pages to show "what happened to this entity".
   */
  entityHistory: partnerProcedure
    .input(
      z.object({
        entityType: z.enum(["venture", "spv", "distribution", "task", "file", "compliance"]),
        entityId: z.string(),
        limit: z.number().min(1).max(500).default(100),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return { entries: [], total: 0 };

      const conditions = [
        eq(auditLog.entityType, input.entityType),
        eq(auditLog.entityId, input.entityId),
      ];

      const where = and(...conditions);

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
        total: Number(countResult[0]?.count) ?? 0,
      };
    }),

  /**
   * audit.exportEntityCsv — Downloadable CSV audit trail for a specific entity.
   * Enterprise requirement: legal teams need "show me every action taken on this venture."
   * Includes all fields, properly escaped for Excel/Google Sheets compatibility.
   */
  exportEntityCsv: partnerProcedure
    .input(
      z.object({
        entityType: z.enum(["venture", "spv", "distribution", "task", "file", "compliance"]),
        entityId: z.string(),
        entityName: z.string().optional(), // for the filename
        maxRows: z.number().min(1).max(10000).default(5000),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const conditions = [
        eq(auditLog.entityType, input.entityType),
        eq(auditLog.entityId, input.entityId),
        sql`${auditLog.archivedAt} IS NULL`,
      ];

      const where = and(...conditions);

      const entries = await db
        .select()
        .from(auditLog)
        .where(where)
        .orderBy(desc(auditLog.createdAt))
        .limit(input.maxRows);

      // Log the export action itself
      await logAudit({
        userId: ctx.user.id,
        userName: ctx.user.name || ctx.user.email || "System",
        action: "export_entity_audit",
        entityType: input.entityType,
        entityId: input.entityId,
        entityName: input.entityName,
        details: JSON.stringify({ rowCount: entries.length }),
        result: "success",
      });

      // Build CSV with BOM for Excel compatibility
      const BOM = "\uFEFF";
      const headers = [
        "Timestamp (UTC)",
        "Action",
        "User",
        "Result",
        "Details",
        "IP Address",
      ];

      const escCsv = (val: unknown): string => {
        const s = String(val ?? "");
        if (s.includes(",") || s.includes('"') || s.includes("\n")) {
          return `"${s.replace(/"/g, '""')}"`;
        }
        return s;
      };

      const rows = entries.map((e) =>
        [
          e.createdAt ? new Date(e.createdAt).toISOString() : "",
          e.action,
          e.userName || `User #${e.userId}`,
          e.result,
          e.details || "",
          e.ipAddress || "",
        ]
          .map(escCsv)
          .join(",")
      );

      const csv = BOM + [headers.join(","), ...rows].join("\n");

      return {
        csv,
        rowCount: entries.length,
        filename: `audit-${input.entityType}-${input.entityName || input.entityId}-${new Date().toISOString().slice(0, 10)}.csv`,
        exportedAt: new Date().toISOString(),
      };
    }),
});
