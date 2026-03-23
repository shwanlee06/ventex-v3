import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { users, userPreferences, apiKeys, sessions, auditLog } from "../../drizzle/schema";
import { eq, and, desc } from "drizzle-orm";

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
});
