/**
 * Security Router — RBAC Management, Audit Log, Session Management
 * Security administration (SOC 2 Type II readiness in progress)
 */

import { z } from "zod";
import { router, protectedProcedure, adminProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { clearAllowlistCache } from "../security/ipAllowlist";
import {
  users,
  userVentureAccess,
  auditLog,
  sessions,
  ventures,
  spvs,
  apiKeys,
  organizations,
} from "../../drizzle/schema";
import { eq, desc, and, like, sql, gte, lte } from "drizzle-orm";
import {
  hasPermission,
  requirePermission,
  logAudit,
  grantVentureAccess,
  grantSpvAccess,
  revokeAccess,
  isRoleAtLeast,
  ROLE_HIERARCHY,
  isVentexTeam,
} from "../security/rbac";
import { isEncryptionConfigured } from "../security/encryption";
import { resolveOrgId } from "../security/orgScope";

export const securityRouter = router({

  /** List all users with their roles */
  listUsers: adminProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];

    await logAudit({
      userId: ctx.user.id,
      userName: ctx.user.name,
      action: "list_users",
      entityType: "security",
      ipAddress: ctx.req.ip,
      userAgent: ctx.req.headers["user-agent"],
    });

    return db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        createdAt: users.createdAt,
        lastSignedIn: users.lastSignedIn,
      })
      .from(users)
      .orderBy(desc(users.lastSignedIn));
  }),

  /** Update a user's role */
  updateUserRole: adminProcedure
    .input(
      z.object({
        userId: z.number(),
        role: z.enum(["viewer", "client", "user", "manager", "admin", "owner"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      requirePermission(ctx.user, "manage_roles");

      // Cannot change own role
      if (input.userId === ctx.user.id) {
        throw new Error("Cannot change your own role");
      }

      // Only owner/admin can promote to admin; only owner can promote to owner
      if (input.role === "owner" && ctx.user.role !== "owner") {
        throw new Error("Only the owner can promote users to owner");
      }

      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Get current user info for audit
      const [targetUser] = await db
        .select()
        .from(users)
        .where(eq(users.id, input.userId))
        .limit(1);

      if (!targetUser) throw new Error("User not found");

      await db
        .update(users)
        .set({ role: input.role })
        .where(eq(users.id, input.userId));

      await logAudit({
        userId: ctx.user.id,
        userName: ctx.user.name,
        action: "update_role",
        entityType: "user",
        entityId: String(input.userId),
        entityName: targetUser.name ?? "Unknown",
        details: JSON.stringify({
          previousRole: targetUser.role,
          newRole: input.role,
        }),
        ipAddress: ctx.req.ip,
        userAgent: ctx.req.headers["user-agent"],
      });

      return { success: true };
    }),

  /** Delete a user and all associated data */
  deleteUser: adminProcedure
    .input(z.object({ userId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      requirePermission(ctx.user, "manage_roles");

      // Cannot delete yourself
      if (input.userId === ctx.user.id) {
        throw new Error("Cannot delete your own account");
      }

      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Get the target user for audit and validation
      const [targetUser] = await db
        .select()
        .from(users)
        .where(eq(users.id, input.userId))
        .limit(1);

      if (!targetUser) throw new Error("User not found");

      // Cannot delete the owner
      if (targetUser.role === "owner") {
        throw new Error("Cannot delete the system owner");
      }

      // Only owner can delete other admins (admins cannot delete each other)
      if (targetUser.role === "admin" && ctx.user.role !== "owner") {
        throw new Error("Only the owner can delete admin users");
      }

      // Delete associated data in order (foreign key safe)
      await db.delete(sessions).where(eq(sessions.userId, input.userId));
      await db.delete(apiKeys).where(eq(apiKeys.userId, input.userId));
      await db.delete(userVentureAccess).where(eq(userVentureAccess.userId, input.userId));

      // Delete the user
      await db.delete(users).where(eq(users.id, input.userId));

      // Log the deletion
      await logAudit({
        userId: ctx.user.id,
        userName: ctx.user.name,
        action: "delete_user",
        entityType: "user",
        entityId: String(input.userId),
        entityName: targetUser.name ?? "Unknown",
        details: JSON.stringify({
          deletedEmail: targetUser.email,
          deletedRole: targetUser.role,
        }),
        ipAddress: ctx.req.ip,
        userAgent: ctx.req.headers["user-agent"],
      });

      return { success: true };
    }),


  /** List all access grants for a venture */
  listVentureAccess: protectedProcedure
    .input(z.object({ ventureId: z.number() }))
    .query(async ({ ctx, input }) => {
      requirePermission(ctx.user, "manage_access");

      const db = await getDb();
      if (!db) return [];

      return db
        .select({
          id: userVentureAccess.id,
          userId: userVentureAccess.userId,
          ventureId: userVentureAccess.ventureId,
          permission: userVentureAccess.permission,
          grantedAt: userVentureAccess.grantedAt,
          expiresAt: userVentureAccess.expiresAt,
          userName: users.name,
          userEmail: users.email,
          userRole: users.role,
        })
        .from(userVentureAccess)
        .leftJoin(users, eq(userVentureAccess.userId, users.id))
        .where(eq(userVentureAccess.ventureId, input.ventureId))
        .orderBy(desc(userVentureAccess.grantedAt));
    }),

  /** Grant access to a venture */
  grantAccess: protectedProcedure
    .input(
      z.object({
        userId: z.number(),
        ventureId: z.number().optional(),
        spvId: z.number().optional(),
        permission: z.enum(["view", "edit", "manage", "full"]),
        expiresAt: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      requirePermission(ctx.user, "manage_access");

      if (input.ventureId) {
        await grantVentureAccess({
          userId: input.userId,
          ventureId: input.ventureId,
          permission: input.permission,
          grantedBy: ctx.user.id,
          expiresAt: input.expiresAt ? new Date(input.expiresAt) : undefined,
        });
      }

      if (input.spvId) {
        await grantSpvAccess({
          userId: input.userId,
          spvId: input.spvId,
          permission: input.permission,
          grantedBy: ctx.user.id,
          expiresAt: input.expiresAt ? new Date(input.expiresAt) : undefined,
        });
      }

      await logAudit({
        userId: ctx.user.id,
        userName: ctx.user.name,
        action: "grant_access",
        entityType: input.ventureId ? "venture" : "spv",
        entityId: String(input.ventureId ?? input.spvId),
        details: JSON.stringify({
          targetUserId: input.userId,
          permission: input.permission,
          expiresAt: input.expiresAt,
        }),
        ipAddress: ctx.req.ip,
        userAgent: ctx.req.headers["user-agent"],
      });

      return { success: true };
    }),

  /** Revoke access */
  revokeAccess: protectedProcedure
    .input(z.object({ accessId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      requirePermission(ctx.user, "manage_access");

      await revokeAccess(input.accessId);

      await logAudit({
        userId: ctx.user.id,
        userName: ctx.user.name,
        action: "revoke_access",
        entityType: "access",
        entityId: String(input.accessId),
        ipAddress: ctx.req.ip,
        userAgent: ctx.req.headers["user-agent"],
      });

      return { success: true };
    }),


  /** Query audit log with filters */
  getAuditLog: protectedProcedure
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
      requirePermission(ctx.user, "view_audit_log");

      const db = await getDb();
      if (!db) return { entries: [], total: 0 };

      const effectiveOrgId = resolveOrgId(ctx.user, input.organizationId);

      const conditions = [];
      // Exclude archived (soft-deleted) entries by default
      conditions.push(sql`${auditLog.archivedAt} IS NULL`);
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

  /** Get audit log stats */
  getAuditStats: protectedProcedure.query(async ({ ctx }) => {
    requirePermission(ctx.user, "view_audit_log");

    const db = await getDb();
    if (!db) return { total: 0, denied: 0, errors: 0, today: 0 };

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [total, denied, errors, todayCount] = await Promise.all([
      db.select({ count: sql<number>`count(*)` }).from(auditLog),
      db.select({ count: sql<number>`count(*)` }).from(auditLog).where(eq(auditLog.result, "denied")),
      db.select({ count: sql<number>`count(*)` }).from(auditLog).where(eq(auditLog.result, "error")),
      db.select({ count: sql<number>`count(*)` }).from(auditLog).where(gte(auditLog.createdAt, today)),
    ]);

    return {
      total: Number(total[0]?.count) ?? 0,
      denied: Number(denied[0]?.count) ?? 0,
      errors: Number(errors[0]?.count) ?? 0,
      today: Number(todayCount[0]?.count) ?? 0,
    };
  }),


  /** Get overall security status */
  getSecurityStatus: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();

    const encryptionActive = isEncryptionConfigured();

    let userCount = 0;
    let adminCount = 0;
    let accessGrantCount = 0;

    if (db) {
      const [uc, ac, agc] = await Promise.all([
        db.select({ count: sql<number>`count(*)` }).from(users),
        db.select({ count: sql<number>`count(*)` }).from(users).where(eq(users.role, "admin")),
        db.select({ count: sql<number>`count(*)` }).from(userVentureAccess),
      ]);
      userCount = Number(uc[0]?.count) ?? 0;
      adminCount = Number(ac[0]?.count) ?? 0;
      accessGrantCount = Number(agc[0]?.count) ?? 0;
    }

    return {
      encryption: {
        aes256: encryptionActive,
        algorithm: "AES-256-GCM",
        keyDerivation: "HMAC-SHA256",
      },
      rbac: {
        enabled: true,
        roles: Object.keys(ROLE_HIERARCHY),
        totalUsers: userCount,
        adminUsers: adminCount,
        accessGrants: accessGrantCount,
      },
      zeroTrust: {
        sessionValidation: true,
        auditLogging: true,
        ipLogging: true,
      },
      compliance: {
        soc2Ready: encryptionActive,
        dataEncryption: encryptionActive,
        accessControl: true,
        auditTrail: true,
      },
    };
  }),


  /** Check current user's permissions */
  getMyPermissions: protectedProcedure.query(async ({ ctx }) => {
    const allActions = [
      "read", "create", "update", "delete",
      "manage_team", "manage_roles", "manage_settings",
      "manage_access", "export_data", "view_audit_log",
      "process_documents", "manage_spvs", "manage_distributions",
    ] as const;

    const permissions: Record<string, boolean> = {};
    for (const action of allActions) {
       permissions[action] = hasPermission(ctx.user.role, action);
    }
    return {
      role: ctx.user.role,
      roleLevel: ROLE_HIERARCHY[ctx.user.role] ?? 0,
      permissions,
    };
  }),

  // ─── WS2: Per-Tenant Security Settings ──────────────────────────────────

  /** Get org-level security settings (admin only) */
  getOrgSecuritySettings: adminProcedure
    .input(z.object({ organizationId: z.number().optional() }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const orgId = input.organizationId || resolveOrgId(ctx.user, undefined);
      if (!orgId) throw new Error("No organization context");
      const [org] = await db.select({
        id: organizations.id,
        name: organizations.name,
        sessionIdleTimeoutMinutes: organizations.sessionIdleTimeoutMinutes,
        sessionAbsoluteTimeoutHours: organizations.sessionAbsoluteTimeoutHours,
        mfaEnforced: organizations.mfaEnforced,
        ipAllowlist: organizations.ipAllowlist,
        ssoEnabled: organizations.ssoEnabled,
        ssoProvider: organizations.ssoProvider,
        ssoMetadataUrl: organizations.ssoMetadataUrl,
        allowedAuthMethods: organizations.allowedAuthMethods,
      }).from(organizations).where(eq(organizations.id, orgId)).limit(1);
      if (!org) throw new Error("Organization not found");
      return org;
    }),

  /** Update org-level security settings (admin only) */
  updateOrgSecuritySettings: adminProcedure
    .input(z.object({
      organizationId: z.number().optional(),
      sessionIdleTimeoutMinutes: z.number().min(5).max(30).optional(),
      sessionAbsoluteTimeoutHours: z.number().min(1).max(8).optional(),
      mfaEnforced: z.boolean().optional(),
      ipAllowlist: z.array(z.string()).nullable().optional(),
      // SSO fields are gated — [LEGAL REVIEW REQUIRED]
      // ssoEnabled, ssoProvider, ssoMetadataUrl are not exposed yet
      allowedAuthMethods: z.array(z.string()).nullable().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      if (!isVentexTeam(ctx.user)) {
        throw new Error("Only VENTEX team can update org security settings");
      }
      const orgId = input.organizationId || resolveOrgId(ctx.user, undefined);
      if (!orgId) throw new Error("No organization context");

      const updates: Record<string, unknown> = {};
      if (input.sessionIdleTimeoutMinutes !== undefined) {
        updates.sessionIdleTimeoutMinutes = input.sessionIdleTimeoutMinutes;
      }
      if (input.sessionAbsoluteTimeoutHours !== undefined) {
        updates.sessionAbsoluteTimeoutHours = input.sessionAbsoluteTimeoutHours;
      }
      if (input.mfaEnforced !== undefined) {
        updates.mfaEnforced = input.mfaEnforced;
      }
      if (input.ipAllowlist !== undefined) {
        updates.ipAllowlist = input.ipAllowlist;
      }
      if (input.allowedAuthMethods !== undefined) {
        updates.allowedAuthMethods = input.allowedAuthMethods;
      }

      if (Object.keys(updates).length === 0) {
        throw new Error("No settings to update");
      }

      await db.update(organizations).set(updates as any).where(eq(organizations.id, orgId));

      // Clear IP allowlist cache if it was updated
      if (input.ipAllowlist !== undefined) {
        clearAllowlistCache(orgId);
      }

      // Audit log
      await db.insert(auditLog).values({
        userId: ctx.user.id,
        userName: ctx.user.name || ctx.user.email || "Admin",
        action: "update_org_security_settings",
        entityType: "organization",
        entityId: String(orgId),
        details: JSON.stringify(updates),
        result: "success",
      });

      const [updated] = await db.select({
        sessionIdleTimeoutMinutes: organizations.sessionIdleTimeoutMinutes,
        sessionAbsoluteTimeoutHours: organizations.sessionAbsoluteTimeoutHours,
        mfaEnforced: organizations.mfaEnforced,
        ipAllowlist: organizations.ipAllowlist,
        ssoEnabled: organizations.ssoEnabled,
        allowedAuthMethods: organizations.allowedAuthMethods,
      }).from(organizations).where(eq(organizations.id, orgId)).limit(1);
      return updated;
    }),

  /** Get the session config for the current user's org (used by frontend idle timeout) */
  getSessionConfig: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return { idleTimeoutMinutes: 30, absoluteTimeoutHours: 8 };
    const orgId = ctx.user.organizationId;
    if (!orgId) return { idleTimeoutMinutes: 30, absoluteTimeoutHours: 8 };
    const [org] = await db.select({
      idleTimeoutMinutes: organizations.sessionIdleTimeoutMinutes,
      absoluteTimeoutHours: organizations.sessionAbsoluteTimeoutHours,
    }).from(organizations).where(eq(organizations.id, orgId)).limit(1);
    return org || { idleTimeoutMinutes: 30, absoluteTimeoutHours: 8 };
  }),

  /**
   * Export audit log as CSV.
   * Returns CSV string content that the frontend can download as a file.
   * Supports the same filters as getAuditLog.
   */
  exportAuditLogCsv: protectedProcedure
    .input(
      z.object({
        action: z.string().optional(),
        entityType: z.string().optional(),
        userId: z.number().optional(),
        result: z.enum(["success", "denied", "error"]).optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        organizationId: z.number().optional(),
        maxRows: z.number().min(1).max(10000).default(5000),
      })
    )
    .mutation(async ({ ctx, input }) => {
      requirePermission(ctx.user, "export_data");

      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const effectiveOrgId = resolveOrgId(ctx.user, input.organizationId);

      const conditions = [];
      // Exclude archived (soft-deleted) entries by default
      conditions.push(sql`${auditLog.archivedAt} IS NULL`);
      if (effectiveOrgId) conditions.push(eq(auditLog.organizationId, effectiveOrgId));
      if (input.action) conditions.push(like(auditLog.action, `%${input.action}%`));
      if (input.entityType) conditions.push(eq(auditLog.entityType, input.entityType));
      if (input.userId) conditions.push(eq(auditLog.userId, input.userId));
      if (input.result) conditions.push(eq(auditLog.result, input.result));
      if (input.startDate) conditions.push(gte(auditLog.createdAt, new Date(input.startDate)));
      if (input.endDate) conditions.push(lte(auditLog.createdAt, new Date(input.endDate)));

      const where = conditions.length > 0 ? and(...conditions) : undefined;

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
        action: "export_audit_log",
        entityType: "audit_log",
        entityId: "bulk_export",
        details: JSON.stringify({ rowCount: entries.length, filters: input }),
        result: "success",
        organizationId: effectiveOrgId || undefined,
      });

      // Build CSV
      const headers = [
        "ID", "Timestamp", "User ID", "User Name", "Action",
        "Entity Type", "Entity ID", "Result", "Details", "IP Address",
        "Organization ID",
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
          e.id,
          e.createdAt ? new Date(e.createdAt).toISOString() : "",
          e.userId,
          e.userName,
          e.action,
          e.entityType,
          e.entityId,
          e.result,
          e.details,
          e.ipAddress || "",
          e.organizationId || "",
        ]
          .map(escCsv)
          .join(",")
      );

      return {
        csv: [headers.join(","), ...rows].join("\n"),
        rowCount: entries.length,
        exportedAt: new Date().toISOString(),
      };
    }),

  /**
   * Get audit log retention stats.
   * Shows how many records exist and how many would be purged by the retention policy.
   */
  getRetentionStats: adminProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const RETENTION_DAYS = 90;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - RETENTION_DAYS);

    const effectiveOrgId = resolveOrgId(ctx.user, undefined);
    const orgCondition = effectiveOrgId ? eq(auditLog.organizationId, effectiveOrgId) : undefined;

    const [totalResult, expiredResult, oldestResult] = await Promise.all([
      db.select({ count: sql<number>`count(*)` }).from(auditLog).where(orgCondition),
      db.select({ count: sql<number>`count(*)` }).from(auditLog).where(
        orgCondition
          ? and(orgCondition, lte(auditLog.createdAt, cutoffDate))
          : lte(auditLog.createdAt, cutoffDate)
      ),
      db.select({ oldest: sql<Date>`MIN(createdAt)` }).from(auditLog).where(orgCondition),
    ]);

    return {
      totalRecords: Number(totalResult[0]?.count) ?? 0,
      expiredRecords: Number(expiredResult[0]?.count) ?? 0,
      retentionDays: RETENTION_DAYS,
      cutoffDate: cutoffDate.toISOString(),
      oldestRecord: oldestResult[0]?.oldest ? new Date(oldestResult[0].oldest).toISOString() : null,
    };
  }),

  /**
   * Purge expired audit log entries (older than 90 days).
   * Admin-only operation. Logs the purge action before deleting.
   */
  purgeExpiredAuditLogs: adminProcedure
    .input(z.object({
      dryRun: z.boolean().default(true),
      organizationId: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!isVentexTeam(ctx.user)) {
        throw new Error("Only VENTEX team can purge audit logs");
      }

      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const RETENTION_DAYS = 90;
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - RETENTION_DAYS);

      const effectiveOrgId = resolveOrgId(ctx.user, input.organizationId);
      const conditions = [lte(auditLog.createdAt, cutoffDate)];
      if (effectiveOrgId) conditions.push(eq(auditLog.organizationId, effectiveOrgId));

      const where = and(...conditions);

      // Count how many would be purged
      const [countResult] = await db.select({ count: sql<number>`count(*)` }).from(auditLog).where(where);
      const purgeCount = Number(countResult?.count) ?? 0;

      if (input.dryRun) {
        return {
          dryRun: true,
          wouldPurge: purgeCount,
          cutoffDate: cutoffDate.toISOString(),
          retentionDays: RETENTION_DAYS,
        };
      }

      // Log the purge action BEFORE deleting
      await logAudit({
        userId: ctx.user.id,
        userName: ctx.user.name || ctx.user.email || "Admin",
        action: "purge_audit_logs",
        entityType: "audit_log",
        entityId: "retention_cleanup",
        details: JSON.stringify({
          purgedCount: purgeCount,
          cutoffDate: cutoffDate.toISOString(),
          retentionDays: RETENTION_DAYS,
          organizationId: effectiveOrgId,
        }),
        result: "success",
        organizationId: effectiveOrgId || undefined,
      });

      // Soft-delete: mark as archived instead of hard-deleting
      if (purgeCount > 0) {
        await db.update(auditLog).set({ archivedAt: new Date() }).where(where);
      }

      return {
        dryRun: false,
        archived: purgeCount,
        cutoffDate: cutoffDate.toISOString(),
        retentionDays: RETENTION_DAYS,
      };
    }),
});
