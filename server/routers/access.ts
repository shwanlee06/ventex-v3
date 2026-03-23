/**
 * Access Control Router — Invite-Only System, API Keys, Organizations
 * Manages the closed-circle access model for Aurovia/ATLAS partnerships
 */

import { z } from "zod";
import { router, adminProcedure, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import {
  organizations,
  invitations,
  apiKeys,
  orgVentureAccess,
  users,
  ventures,
} from "../../drizzle/schema";
import { eq, desc, and, sql } from "drizzle-orm";
import { logAudit } from "../security/rbac";
import crypto from "crypto";

// ── Helpers ──────────────────────────────────────────────────────────────

/** Generate a 48-character API key: ATLAS-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX */
function generateApiKey(): string {
  const segments: string[] = [];
  for (let i = 0; i < 8; i++) {
    segments.push(crypto.randomBytes(2).toString("hex").toUpperCase());
  }
  return `ATLAS-${segments.join("-")}`;
}

/** Generate a secure invitation token */
function generateInviteToken(): string {
  return crypto.randomBytes(48).toString("base64url");
}

/** Hash an API key for storage (SHA-256) */
function hashApiKey(key: string): string {
  return crypto.createHash("sha256").update(key).digest("hex");
}

/** Get the first 8 chars of an API key for display */
function getKeyPrefix(key: string): string {
  return key.substring(0, 10);
}

// ── Router ───────────────────────────────────────────────────────────────

export const accessRouter = router({
  // ── Organizations ─────────────────────────────────────────────────────

  /** List all organizations */
  listOrganizations: adminProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];

    const orgs = await db
      .select()
      .from(organizations)
      .orderBy(desc(organizations.createdAt));

    // Get member counts for each org
    const result = [];
    for (const org of orgs) {
      const [memberCount] = await db
        .select({ count: sql<number>`count(*)` })
        .from(users)
        .where(eq(users.organizationId, org.id));
      const [ventureCount] = await db
        .select({ count: sql<number>`count(*)` })
        .from(orgVentureAccess)
        .where(eq(orgVentureAccess.organizationId, org.id));
      result.push({
        ...org,
        memberCount: memberCount?.count ?? 0,
        ventureCount: ventureCount?.count ?? 0,
      });
    }

    return result;
  }),

  /** Create an organization */
  createOrganization: adminProcedure
    .input(
      z.object({
        name: z.string().min(1).max(255),
        type: z.enum(["core", "partner", "client"]),
        description: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const slug = input.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");

      await db.insert(organizations).values({
        name: input.name,
        slug,
        type: input.type,
        description: input.description ?? null,
      });

      await logAudit({
        userId: ctx.user.id,
        userName: ctx.user.name,
        action: "create_organization",
        entityType: "organization",
        entityName: input.name,
        ipAddress: ctx.req.ip,
        userAgent: ctx.req.headers["user-agent"],
      });

      return { success: true };
    }),

  /** Update an organization */
  updateOrganization: adminProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().min(1).max(255).optional(),
        type: z.enum(["core", "partner", "client"]).optional(),
        status: z.enum(["active", "suspended", "archived"]).optional(),
        description: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const updateSet: Record<string, unknown> = {};
      if (input.name) updateSet.name = input.name;
      if (input.type) updateSet.type = input.type;
      if (input.status) updateSet.status = input.status;
      if (input.description !== undefined) updateSet.description = input.description;

      if (Object.keys(updateSet).length > 0) {
        await db.update(organizations).set(updateSet).where(eq(organizations.id, input.id));
      }

      return { success: true };
    }),

  /** Assign venture access to an organization */
  grantOrgVentureAccess: adminProcedure
    .input(
      z.object({
        organizationId: z.number(),
        ventureId: z.number(),
        permission: z.enum(["view", "edit", "manage", "full"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Check if already exists
      const existing = await db
        .select()
        .from(orgVentureAccess)
        .where(
          and(
            eq(orgVentureAccess.organizationId, input.organizationId),
            eq(orgVentureAccess.ventureId, input.ventureId)
          )
        )
        .limit(1);

      if (existing.length > 0) {
        await db
          .update(orgVentureAccess)
          .set({ permission: input.permission })
          .where(eq(orgVentureAccess.id, existing[0].id));
      } else {
        await db.insert(orgVentureAccess).values({
          organizationId: input.organizationId,
          ventureId: input.ventureId,
          permission: input.permission,
          grantedBy: ctx.user.id,
        });
      }

      return { success: true };
    }),

  /** Remove venture access from an organization */
  revokeOrgVentureAccess: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      await db.delete(orgVentureAccess).where(eq(orgVentureAccess.id, input.id));
      return { success: true };
    }),

  /** List venture access for an organization */
  listOrgVentureAccess: adminProcedure
    .input(z.object({ organizationId: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return [];

      return db
        .select({
          id: orgVentureAccess.id,
          organizationId: orgVentureAccess.organizationId,
          ventureId: orgVentureAccess.ventureId,
          permission: orgVentureAccess.permission,
          ventureName: ventures.name,
          ventureSector: ventures.sector,
          createdAt: orgVentureAccess.createdAt,
        })
        .from(orgVentureAccess)
        .leftJoin(ventures, eq(orgVentureAccess.ventureId, ventures.id))
        .where(eq(orgVentureAccess.organizationId, input.organizationId))
        .orderBy(desc(orgVentureAccess.createdAt));
    }),

  // ── Invitations ───────────────────────────────────────────────────────

  /** Send an invitation */
  sendInvitation: adminProcedure
    .input(
      z.object({
        email: z.string().email(),
        organizationId: z.number(),
        role: z.enum(["viewer", "client", "user", "manager", "admin"]),
        ventureIds: z.array(z.number()).optional(),
        expiresInDays: z.number().min(1).max(90).default(30),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Check if email already has a pending invitation
      const existing = await db
        .select()
        .from(invitations)
        .where(
          and(
            eq(invitations.email, input.email.toLowerCase()),
            eq(invitations.status, "pending")
          )
        )
        .limit(1);

      if (existing.length > 0) {
        throw new Error("This email already has a pending invitation");
      }

      // Check if user already exists
      const existingUser = await db
        .select()
        .from(users)
        .where(eq(users.email, input.email.toLowerCase()))
        .limit(1);

      if (existingUser.length > 0 && existingUser[0].status === "active") {
        throw new Error("This email is already registered and active");
      }

      const token = generateInviteToken();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + input.expiresInDays);

      await db.insert(invitations).values({
        email: input.email.toLowerCase(),
        organizationId: input.organizationId,
        role: input.role,
        token,
        ventureIds: input.ventureIds ?? null,
        invitedBy: ctx.user.id,
        invitedByName: ctx.user.name ?? "Admin",
        expiresAt,
      });

      await logAudit({
        userId: ctx.user.id,
        userName: ctx.user.name,
        action: "send_invitation",
        entityType: "invitation",
        entityName: input.email,
        details: JSON.stringify({
          organizationId: input.organizationId,
          role: input.role,
          ventureIds: input.ventureIds,
        }),
        ipAddress: ctx.req.ip,
        userAgent: ctx.req.headers["user-agent"],
      });

      return { success: true, token };
    }),

  /** List all invitations */
  listInvitations: adminProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];

    return db
      .select({
        id: invitations.id,
        email: invitations.email,
        organizationId: invitations.organizationId,
        orgName: organizations.name,
        role: invitations.role,
        status: invitations.status,
        ventureIds: invitations.ventureIds,
        invitedByName: invitations.invitedByName,
        acceptedAt: invitations.acceptedAt,
        expiresAt: invitations.expiresAt,
        createdAt: invitations.createdAt,
        token: invitations.token,
      })
      .from(invitations)
      .leftJoin(organizations, eq(invitations.organizationId, organizations.id))
      .orderBy(desc(invitations.createdAt));
  }),

  /** Revoke an invitation */
  revokeInvitation: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      await db
        .update(invitations)
        .set({ status: "revoked" })
        .where(eq(invitations.id, input.id));

      return { success: true };
    }),

  // ── Invitation Validation (public — used during OAuth) ────────────────

  /** Validate an invitation token (public procedure for OAuth flow) */
  validateInvitation: protectedProcedure
    .input(z.object({ token: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { valid: false, reason: "Database unavailable" };

      const [invite] = await db
        .select()
        .from(invitations)
        .where(eq(invitations.token, input.token))
        .limit(1);

      if (!invite) return { valid: false, reason: "Invalid invitation token" };
      if (invite.status !== "pending") return { valid: false, reason: `Invitation is ${invite.status}` };
      if (new Date() > invite.expiresAt) return { valid: false, reason: "Invitation has expired" };

      // Get org name
      const [org] = await db
        .select()
        .from(organizations)
        .where(eq(organizations.id, invite.organizationId))
        .limit(1);

      return {
        valid: true,
        invitation: {
          id: invite.id,
          email: invite.email,
          organizationName: org?.name ?? "Unknown",
          role: invite.role,
          expiresAt: invite.expiresAt,
        },
      };
    }),

  /** Accept an invitation and generate API key */
  acceptInvitation: protectedProcedure
    .input(z.object({ token: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Validate the invitation
      const [invite] = await db
        .select()
        .from(invitations)
        .where(eq(invitations.token, input.token))
        .limit(1);

      if (!invite) throw new Error("Invalid invitation token");
      if (invite.status !== "pending") throw new Error(`Invitation is ${invite.status}`);
      if (new Date() > invite.expiresAt) throw new Error("Invitation has expired");

      // Check email matches
      if (ctx.user.email?.toLowerCase() !== invite.email.toLowerCase()) {
        throw new Error("This invitation was sent to a different email address");
      }

      // Update user with organization and role
      await db
        .update(users)
        .set({
          organizationId: invite.organizationId,
          role: invite.role,
          status: "active",
          invitationId: invite.id,
        })
        .where(eq(users.id, ctx.user.id));

      // Mark invitation as accepted
      await db
        .update(invitations)
        .set({ status: "accepted", acceptedAt: new Date() })
        .where(eq(invitations.id, invite.id));

      // Grant venture access from invitation
      if (invite.ventureIds && invite.ventureIds.length > 0) {
        for (const ventureId of invite.ventureIds) {
          // Import from the existing user_venture_access table
          const { userVentureAccess } = await import("../../drizzle/schema");
          await db.insert(userVentureAccess).values({
            userId: ctx.user.id,
            ventureId,
            permission: invite.role === "admin" || invite.role === "manager" ? "full" : "view",
            grantedBy: invite.invitedBy,
          });
        }
      }

      // Generate 48-char API key
      const rawKey = generateApiKey();
      const keyHash = hashApiKey(rawKey);
      const keyPrefix = getKeyPrefix(rawKey);

      await db.insert(apiKeys).values({
        userId: ctx.user.id,
        organizationId: invite.organizationId,
        keyHash,
        keyPrefix,
        label: `${ctx.user.name ?? "User"} — Auto-generated`,
        ventureIds: invite.ventureIds ?? null,
      });

      await logAudit({
        userId: ctx.user.id,
        userName: ctx.user.name,
        action: "accept_invitation",
        entityType: "invitation",
        entityId: String(invite.id),
        entityName: invite.email,
        ipAddress: ctx.req.ip,
        userAgent: ctx.req.headers["user-agent"],
      });

      // Return the raw key — this is the ONLY time it's shown
      return {
        success: true,
        apiKey: rawKey,
        organization: invite.organizationId,
        role: invite.role,
      };
    }),

  // ── API Keys ──────────────────────────────────────────────────────────

  /** List all API keys (admin sees all, user sees own) */
  listApiKeys: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];

    const isAdmin = ctx.user.role === "admin" || ctx.user.role === "owner";

    const condition = isAdmin ? undefined : eq(apiKeys.userId, ctx.user.id);

    const keys = await db
      .select({
        id: apiKeys.id,
        userId: apiKeys.userId,
        organizationId: apiKeys.organizationId,
        keyPrefix: apiKeys.keyPrefix,
        label: apiKeys.label,
        ventureIds: apiKeys.ventureIds,
        status: apiKeys.status,
        lastUsedAt: apiKeys.lastUsedAt,
        expiresAt: apiKeys.expiresAt,
        createdAt: apiKeys.createdAt,
        userName: users.name,
        userEmail: users.email,
        orgName: organizations.name,
      })
      .from(apiKeys)
      .leftJoin(users, eq(apiKeys.userId, users.id))
      .leftJoin(organizations, eq(apiKeys.organizationId, organizations.id))
      .where(condition)
      .orderBy(desc(apiKeys.createdAt));

    return keys;
  }),

  /** Generate a new API key for a user */
  generateApiKey: adminProcedure
    .input(
      z.object({
        userId: z.number(),
        organizationId: z.number(),
        label: z.string().optional(),
        ventureIds: z.array(z.number()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const rawKey = generateApiKey();
      const keyHash = hashApiKey(rawKey);
      const keyPrefix = getKeyPrefix(rawKey);

      await db.insert(apiKeys).values({
        userId: input.userId,
        organizationId: input.organizationId,
        keyHash,
        keyPrefix,
        label: input.label ?? "Manually generated",
        ventureIds: input.ventureIds ?? null,
      });

      await logAudit({
        userId: ctx.user.id,
        userName: ctx.user.name,
        action: "generate_api_key",
        entityType: "api_key",
        details: JSON.stringify({ targetUserId: input.userId }),
        ipAddress: ctx.req.ip,
        userAgent: ctx.req.headers["user-agent"],
      });

      return { success: true, apiKey: rawKey };
    }),

  /** Revoke an API key */
  revokeApiKey: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      await db
        .update(apiKeys)
        .set({ status: "revoked" })
        .where(eq(apiKeys.id, input.id));

      await logAudit({
        userId: ctx.user.id,
        userName: ctx.user.name,
        action: "revoke_api_key",
        entityType: "api_key",
        entityId: String(input.id),
        ipAddress: ctx.req.ip,
        userAgent: ctx.req.headers["user-agent"],
      });

      return { success: true };
    }),

  // ── Access Check (used by OAuth gating) ───────────────────────────────

  /** Check if a user (by email) is authorized to access the system */
  checkAccess: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return { authorized: false, reason: "Database unavailable" };

    const user = ctx.user;

    // Owner/admin always authorized
    if (user.role === "owner" || user.role === "admin") {
      return { authorized: true, role: user.role, organizationId: user.organizationId };
    }

    // Check if user has an active status and organization
    if (user.status !== "active") {
      return { authorized: false, reason: `Account status: ${user.status}` };
    }

    if (!user.organizationId) {
      return { authorized: false, reason: "No organization assigned" };
    }

    // Check if organization is active
    const [org] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, user.organizationId))
      .limit(1);

    if (!org || org.status !== "active") {
      return { authorized: false, reason: "Organization is not active" };
    }

    return {
      authorized: true,
      role: user.role,
      organizationId: user.organizationId,
      organizationName: org.name,
    };
  }),

  // ── Stats ─────────────────────────────────────────────────────────────

  /** Get access control stats */
  getStats: adminProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return { organizations: 0, invitations: 0, pendingInvitations: 0, apiKeys: 0, activeKeys: 0 };

    const [orgCount] = await db.select({ count: sql<number>`count(*)` }).from(organizations);
    const [inviteCount] = await db.select({ count: sql<number>`count(*)` }).from(invitations);
    const [pendingCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(invitations)
      .where(eq(invitations.status, "pending"));
    const [keyCount] = await db.select({ count: sql<number>`count(*)` }).from(apiKeys);
    const [activeKeyCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(apiKeys)
      .where(eq(apiKeys.status, "active"));

    return {
      organizations: orgCount?.count ?? 0,
      invitations: inviteCount?.count ?? 0,
      pendingInvitations: pendingCount?.count ?? 0,
      apiKeys: keyCount?.count ?? 0,
      activeKeys: activeKeyCount?.count ?? 0,
    };
  }),

  /** Block a user (admin only) */
  blockUser: adminProcedure
    .input(z.object({ userId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      if (input.userId === ctx.user.id) throw new Error("Cannot block yourself");

      await db
        .update(users)
        .set({ status: "blocked" })
        .where(eq(users.id, input.userId));

      // Revoke all their API keys
      await db
        .update(apiKeys)
        .set({ status: "revoked" })
        .where(eq(apiKeys.userId, input.userId));

      await logAudit({
        userId: ctx.user.id,
        userName: ctx.user.name,
        action: "block_user",
        entityType: "user",
        entityId: String(input.userId),
        ipAddress: ctx.req.ip,
        userAgent: ctx.req.headers["user-agent"],
      });

      return { success: true };
    }),

  /** Unblock a user */
  unblockUser: adminProcedure
    .input(z.object({ userId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      await db
        .update(users)
        .set({ status: "active" })
        .where(eq(users.id, input.userId));

      return { success: true };
    }),
});
