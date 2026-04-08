import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { users, userPreferences, apiKeys, sessions, auditLog } from "../../drizzle/schema";
import { eq, and, desc } from "drizzle-orm";
import {
  generateTotpSecret,
  generateQrCode,
  verifyTotpCode,
  generateBackupCodes,
  verifyBackupCode,
} from "../security/mfa";
import { enforceRateLimit } from "../security/rateLimit";
import { runDataRetentionPurge, getRetentionStats, RETENTION_DAYS } from "../security/dataRetention";

export const settingsRouter = router({
  // ── Get user profile (from users table + preferences) ──────────────
  getProfile: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const userId = ctx.user!.id;

    // Get user data
    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!user) throw new Error("User not found");

    // Get preferences (create defaults if none exist)
    let [prefs] = await db.select().from(userPreferences).where(eq(userPreferences.userId, userId)).limit(1);
    if (!prefs) {
      await db.insert(userPreferences).values({
        userId,
        displayName: user.name,
        timezone: "America/New_York",
      });
      [prefs] = await db.select().from(userPreferences).where(eq(userPreferences.userId, userId)).limit(1);
    }

    // Get user's API keys
    const keys = await db.select({
      id: apiKeys.id,
      keyPrefix: apiKeys.keyPrefix,
      label: apiKeys.label,
      status: apiKeys.status,
      lastUsedAt: apiKeys.lastUsedAt,
      createdAt: apiKeys.createdAt,
    }).from(apiKeys).where(eq(apiKeys.userId, userId));

    // Get active sessions count
    const activeSessions = await db.select()
      .from(sessions)
      .where(and(eq(sessions.userId, userId), eq(sessions.isActive, true)));

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        organizationId: user.organizationId,
        createdAt: user.createdAt,
        lastSignedIn: user.lastSignedIn,
        mfaEnabled: user.mfaEnabled,
      },
      preferences: prefs,
      apiKeys: keys,
      activeSessionCount: activeSessions.length,
    };
  }),

  // ── Update personal info (name, email, timezone) ───────────────────
  updateProfile: protectedProcedure
    .input(z.object({
      displayName: z.string().min(1).max(255).optional(),
      timezone: z.string().max(64).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const userId = ctx.user!.id;

      // Update display name in users table if provided
      if (input.displayName) {
        await db.update(users)
          .set({ name: input.displayName })
          .where(eq(users.id, userId));
      }

      // Upsert preferences
      const existing = await db.select().from(userPreferences).where(eq(userPreferences.userId, userId)).limit(1);
      if (existing.length === 0) {
        await db.insert(userPreferences).values({
          userId,
          displayName: input.displayName,
          timezone: input.timezone || "America/New_York",
        });
      } else {
        const updateSet: Record<string, unknown> = {};
        if (input.displayName !== undefined) updateSet.displayName = input.displayName;
        if (input.timezone !== undefined) updateSet.timezone = input.timezone;
        if (Object.keys(updateSet).length > 0) {
          await db.update(userPreferences).set(updateSet).where(eq(userPreferences.userId, userId));
        }
      }

      // Audit log
      await db.insert(auditLog).values({
        userId,
        userName: ctx.user!.name || "Unknown",
        action: "update",
        entityType: "profile",
        entityId: String(userId),
        details: JSON.stringify(input),
        result: "success",
      });

      return { success: true };
    }),

  // ── Update notification preferences ────────────────────────────────
  updateNotifications: protectedProcedure
    .input(z.object({
      emailNotifications: z.boolean().optional(),
      pushNotifications: z.boolean().optional(),
      slackNotifications: z.boolean().optional(),
      notifTaskComplete: z.boolean().optional(),
      notifDistribution: z.boolean().optional(),
      notifLogin: z.boolean().optional(),
      notifOverdue: z.boolean().optional(),
      notifWeekly: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const userId = ctx.user!.id;

      // Upsert preferences
      const existing = await db.select().from(userPreferences).where(eq(userPreferences.userId, userId)).limit(1);
      if (existing.length === 0) {
        await db.insert(userPreferences).values({
          userId,
          ...input,
        });
      } else {
        await db.update(userPreferences).set(input).where(eq(userPreferences.userId, userId));
      }

      // Audit log
      await db.insert(auditLog).values({
        userId,
        userName: ctx.user!.name || "Unknown",
        action: "update",
        entityType: "notification_preferences",
        entityId: String(userId),
        details: JSON.stringify(input),
        result: "success",
      });

      return { success: true };
    }),

  // ── Update display preferences ─────────────────────────────────────
  updateDisplay: protectedProcedure
    .input(z.object({
      compactView: z.boolean().optional(),
      autoRefresh: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const userId = ctx.user!.id;

      const existing = await db.select().from(userPreferences).where(eq(userPreferences.userId, userId)).limit(1);
      if (existing.length === 0) {
        await db.insert(userPreferences).values({
          userId,
          ...input,
        });
      } else {
        await db.update(userPreferences).set(input).where(eq(userPreferences.userId, userId));
      }

      return { success: true };
    }),

  // ── Update security settings ───────────────────────────────────────
  updateSecurity: protectedProcedure
    .input(z.object({
      twoFactorEnabled: z.boolean().optional(),
      sessionTimeoutMinutes: z.number().min(5).max(1440).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const userId = ctx.user!.id;

      const existing = await db.select().from(userPreferences).where(eq(userPreferences.userId, userId)).limit(1);
      if (existing.length === 0) {
        await db.insert(userPreferences).values({
          userId,
          ...input,
        });
      } else {
        await db.update(userPreferences).set(input).where(eq(userPreferences.userId, userId));
      }

      // Audit log
      await db.insert(auditLog).values({
        userId,
        userName: ctx.user!.name || "Unknown",
        action: "update",
        entityType: "security_settings",
        entityId: String(userId),
        details: JSON.stringify(input),
        result: "success",
      });

      return { success: true };
    }),

  // ═══════════════════════════════════════════════════════════════════
  // MFA / TOTP Procedures
  // ═══════════════════════════════════════════════════════════════════

  // ── Get MFA status for current user ────────────────────────────────
  getMfaStatus: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const [user] = await db.select({
      mfaEnabled: users.mfaEnabled,
      mfaVerifiedAt: users.mfaVerifiedAt,
    }).from(users).where(eq(users.id, ctx.user!.id)).limit(1);

    return {
      mfaEnabled: user?.mfaEnabled ?? false,
      mfaVerifiedAt: user?.mfaVerifiedAt ?? null,
    };
  }),

  // ── Begin MFA setup — generate secret + QR code ────────────────────
  mfaSetup: protectedProcedure.mutation(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const userId = ctx.user!.id;
    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!user) throw new Error("User not found");

    if (user.mfaEnabled) {
      throw new Error("MFA is already enabled. Disable it first to reconfigure.");
    }

    const email = user.email || user.name || `user-${userId}`;
    const { secret, encryptedSecret, otpauthUri } = generateTotpSecret(email);
    const qrCodeDataUrl = await generateQrCode(otpauthUri);

    // Store the encrypted secret temporarily (not yet verified)
    await db.update(users)
      .set({ mfaSecret: encryptedSecret, mfaEnabled: false })
      .where(eq(users.id, userId));

    // Audit log
    await db.insert(auditLog).values({
      userId,
      userName: ctx.user!.name || "Unknown",
      action: "create",
      entityType: "mfa_setup",
      entityId: String(userId),
      details: "MFA setup initiated",
      result: "success",
    });

    return {
      secret, // Show to user for manual entry
      qrCodeDataUrl, // QR code image as data URL
    };
  }),

  // ── Verify MFA setup — confirm the code works ─────────────────────
  mfaVerify: protectedProcedure
    .input(z.object({ code: z.string().length(6) }))
    .mutation(async ({ ctx, input }) => {
      // Rate limit: 5 MFA attempts per 5 minutes
      enforceRateLimit("mfaVerify", ctx.user!.id);

      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const userId = ctx.user!.id;
      const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
      if (!user) throw new Error("User not found");

      if (!user.mfaSecret) {
        throw new Error("No MFA setup in progress. Start setup first.");
      }

      // Verify the code
      const isValid = verifyTotpCode(input.code, user.mfaSecret);
      if (!isValid) {
        // Audit failed attempt
        await db.insert(auditLog).values({
          userId,
          userName: ctx.user!.name || "Unknown",
          action: "verify",
          entityType: "mfa_setup",
          entityId: String(userId),
          details: "MFA verification failed — invalid code",
          result: "error",
        });
        throw new Error("Invalid verification code. Please try again.");
      }

      // Generate backup codes
      const { plainCodes, hashedCodes } = generateBackupCodes();

      // Enable MFA
      await db.update(users)
        .set({
          mfaEnabled: true,
          mfaVerifiedAt: new Date(),
          mfaBackupCodes: hashedCodes,
        })
        .where(eq(users.id, userId));

      // Audit log
      await db.insert(auditLog).values({
        userId,
        userName: ctx.user!.name || "Unknown",
        action: "verify",
        entityType: "mfa_setup",
        entityId: String(userId),
        details: "MFA enabled successfully",
        result: "success",
      });

      return {
        success: true,
        backupCodes: plainCodes, // Show to user ONCE
      };
    }),

  // ── Validate MFA code (for login flow) ─────────────────────────────
  mfaValidate: protectedProcedure
    .input(z.object({
      code: z.string().min(6).max(9), // 6-digit TOTP or 9-char backup code
    }))
    .mutation(async ({ ctx, input }) => {
      // Rate limit: 5 MFA attempts per 5 minutes
      enforceRateLimit("mfaVerify", ctx.user!.id);

      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const userId = ctx.user!.id;
      const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
      if (!user) throw new Error("User not found");

      if (!user.mfaEnabled || !user.mfaSecret) {
        return { valid: true }; // MFA not enabled, pass through
      }

      // Try TOTP code first
      if (input.code.length === 6 && /^\d{6}$/.test(input.code)) {
        const isValid = verifyTotpCode(input.code, user.mfaSecret);
        if (isValid) {
          await db.insert(auditLog).values({
            userId,
            userName: ctx.user!.name || "Unknown",
            action: "verify",
            entityType: "mfa_login",
            entityId: String(userId),
            details: "MFA TOTP validation successful",
            result: "success",
          });
          return { valid: true };
        }
      }

      // Try backup code
      const backupCodes = user.mfaBackupCodes || [];
      const matchIdx = verifyBackupCode(input.code, backupCodes);
      if (matchIdx >= 0) {
        // Remove used backup code
        const updatedCodes = [...backupCodes];
        updatedCodes.splice(matchIdx, 1);
        await db.update(users)
          .set({ mfaBackupCodes: updatedCodes })
          .where(eq(users.id, userId));

        await db.insert(auditLog).values({
          userId,
          userName: ctx.user!.name || "Unknown",
          action: "verify",
          entityType: "mfa_login",
          entityId: String(userId),
          details: `MFA backup code used (${updatedCodes.length} remaining)`,
          result: "success",
        });
        return { valid: true, backupCodesRemaining: updatedCodes.length };
      }

      // Both failed
      await db.insert(auditLog).values({
        userId,
        userName: ctx.user!.name || "Unknown",
        action: "verify",
        entityType: "mfa_login",
        entityId: String(userId),
          details: "MFA validation failed — invalid code",
          result: "error",
      });

      throw new Error("Invalid MFA code. Please try again.");
    }),

  // ── Disable MFA ────────────────────────────────────────────────────
  mfaDisable: protectedProcedure
    .input(z.object({ code: z.string().length(6) }))
    .mutation(async ({ ctx, input }) => {
      // Rate limit: 5 MFA attempts per 5 minutes
      enforceRateLimit("mfaVerify", ctx.user!.id);

      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const userId = ctx.user!.id;
      const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
      if (!user) throw new Error("User not found");

      if (!user.mfaEnabled || !user.mfaSecret) {
        throw new Error("MFA is not enabled.");
      }

      // Verify current code before disabling
      const isValid = verifyTotpCode(input.code, user.mfaSecret);
      if (!isValid) {
        throw new Error("Invalid verification code. Cannot disable MFA.");
      }

      // Disable MFA
      await db.update(users)
        .set({
          mfaEnabled: false,
          mfaSecret: null,
          mfaVerifiedAt: null,
          mfaBackupCodes: null,
        })
        .where(eq(users.id, userId));

      // Audit log
      await db.insert(auditLog).values({
        userId,
        userName: ctx.user!.name || "Unknown",
        action: "delete",
        entityType: "mfa",
        entityId: String(userId),
        details: "MFA disabled by user",
        result: "success",
      });

      return { success: true };
    }),

  // ── Regenerate backup codes ────────────────────────────────────────
  mfaRegenerateBackupCodes: protectedProcedure
    .input(z.object({ code: z.string().length(6) }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const userId = ctx.user!.id;
      const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
      if (!user) throw new Error("User not found");

      if (!user.mfaEnabled || !user.mfaSecret) {
        throw new Error("MFA is not enabled.");
      }

      // Verify current code
      const isValid = verifyTotpCode(input.code, user.mfaSecret);
      if (!isValid) {
        throw new Error("Invalid verification code.");
      }

      const { plainCodes, hashedCodes } = generateBackupCodes();

      await db.update(users)
        .set({ mfaBackupCodes: hashedCodes })
        .where(eq(users.id, userId));

      // Audit log
      await db.insert(auditLog).values({
        userId,
        userName: ctx.user!.name || "Unknown",
        action: "update",
        entityType: "mfa_backup_codes",
        entityId: String(userId),
        details: "Backup codes regenerated",
        result: "success",
      });

      return { backupCodes: plainCodes };
    }),

  // ── Get recent audit log for current user ──────────────────────────
  getAuditLog: protectedProcedure
    .input(z.object({ limit: z.number().min(1).max(100).default(50) }).optional())
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const userId = ctx.user!.id;
      const limit = input?.limit || 50;

      const logs = await db.select()
        .from(auditLog)
        .where(eq(auditLog.userId, userId))
        .orderBy(desc(auditLog.createdAt))
        .limit(limit);

      return logs;
    }),

  // ── Get active sessions for current user ───────────────────────────
  getActiveSessions: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const userId = ctx.user!.id;

    const activeSessions = await db.select()
      .from(sessions)
      .where(and(eq(sessions.userId, userId), eq(sessions.isActive, true)))
      .orderBy(desc(sessions.lastActivity));

    return activeSessions;
  }),

  // ── Terminate a session ────────────────────────────────────────────
  terminateSession: protectedProcedure
    .input(z.object({ sessionId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      await db.update(sessions)
        .set({ isActive: false })
        .where(and(eq(sessions.id, input.sessionId), eq(sessions.userId, ctx.user!.id)));

      return { success: true };
    }),

  // ── Data Retention ──────────────────────────────────────────────────
  getRetentionStats: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user!.role !== "admin") throw new Error("Admin only");
    const stats = await getRetentionStats();
    return { stats, retentionDays: RETENTION_DAYS };
  }),

  runRetentionPurge: protectedProcedure.mutation(async ({ ctx }) => {
    if (ctx.user!.role !== "admin") throw new Error("Admin only");
    enforceRateLimit("general", ctx.user!.id);
    const summary = await runDataRetentionPurge();
    return summary;
  }),
});
