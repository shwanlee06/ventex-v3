/**
 * Security Router — RBAC Management, Audit Log, Session Management
 * SOC 2 compliant security administration
 */

import { z } from "zod";
import { router, protectedProcedure, adminProcedure } from "../_core/trpc";
import { getDb } from "../db";
import {
  users,
  userVentureAccess,
  auditLog,
  sessions,
  ventures,
  spvs,
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
} from "../security/rbac";
import { isEncryptionConfigured } from "../security/encryption";

export const securityRouter = router({
  // ── Role Management ────────────────────────────────────────────────

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

      // Only owner can promote to admin/owner
      if (
        (input.role === "admin" || input.role === "owner") &&
        ctx.user.role !== "owner"
      ) {
        throw new Error("Only the owner can promote users to admin or owner");
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

  // ── Venture Access Management ──────────────────────────────────────

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

  // ── Audit Log ──────────────────────────────────────────────────────

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
      })
    )
    .query(async ({ ctx, input }) => {
      requirePermission(ctx.user, "view_audit_log");

      const db = await getDb();
      if (!db) return { entries: [], total: 0 };

      const conditions = [];
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
      total: total[0]?.count ?? 0,
      denied: denied[0]?.count ?? 0,
      errors: errors[0]?.count ?? 0,
      today: todayCount[0]?.count ?? 0,
    };
  }),

  // ── Security Status ────────────────────────────────────────────────

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
      userCount = uc[0]?.count ?? 0;
      adminCount = ac[0]?.count ?? 0;
      accessGrantCount = agc[0]?.count ?? 0;
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

  // ── Permission Check ───────────────────────────────────────────────

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
});
