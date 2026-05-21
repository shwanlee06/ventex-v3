import { z } from "zod";
import { publicProcedure, protectedProcedure, router, adminProcedure, partnerProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { teamMembers, activityLog, ventureTeam, ventures, organizations, users, invitations } from "../../drizzle/schema";
import crypto from "crypto";
import { eq, desc, asc, inArray, isNull, isNotNull, and, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import { resolveVentureScope, getVentureIdsForOrg, logAudit, isVentexTeam, getOrgVentureIds } from "../security/rbac";
import { resolveOrgId } from "../security/orgScope";
import { createNotification, NOTIF_TYPES } from "../notificationHelper";
import { storagePut } from "../storage";
import { sendInvitationEmail, buildInviteLink } from "../invitationEmail";
import { enforceRateLimit } from "../security/rateLimit";
import { requirePrincipalGate } from "../security/principalGate";

/**
 * Calculate live status from lastSeenAt timestamp and adminStatus.
 * - If adminStatus is "on_leave" or "deactivated", that takes priority.
 * - Otherwise: Online (<2min), Away (<5min), Offline (>5min or null)
 */
export function calculateLiveStatus(lastSeenAt: Date | null, adminStatus: string | null): "online" | "away" | "offline" | "on_leave" | "deactivated" {
  if (adminStatus === "on_leave") return "on_leave";
  if (adminStatus === "deactivated") return "deactivated";
  if (!lastSeenAt) return "offline";
  const diffMs = Date.now() - lastSeenAt.getTime();
  const diffMin = diffMs / 60000;
  if (diffMin < 2) return "online";   // heartbeat every 30s, so <2min = definitely active
  if (diffMin < 5) return "away";     // 2-5min = recently active but idle
  return "offline";                    // >5min = gone
}

function slugify(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export const teamRouter = router({
  /**
   * List all team members — supports org-scoped filtering
   * If organizationId is provided, returns members belonging to that org
   * If no filter, returns all members
   */
  list: protectedProcedure
    .input(z.object({ organizationId: z.number().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return [];

      // Cross-tenant isolation: client users forced to their own org
      const effectiveOrgId = resolveOrgId(ctx.user, input?.organizationId);

      // If org-scoped, return members that belong to that org (by organizationId field)
      // PLUS members assigned to that org's ventures via ventureTeam
      if (effectiveOrgId) {
        // Direct org members
        const directMembers = await db.select().from(teamMembers)
          .where(eq(teamMembers.organizationId, effectiveOrgId))
          .orderBy(desc(teamMembers.createdAt));

        // Also get members assigned to this org's ventures
        const ventureIds = ctx.user
          ? await resolveVentureScope(ctx.user, effectiveOrgId)
          : await getVentureIdsForOrg(effectiveOrgId);

        let ventureMembers: typeof directMembers = [];
        if (ventureIds !== null && ventureIds.length > 0) {
          const assignments = await db.select({ memberId: ventureTeam.memberId })
            .from(ventureTeam)
            .where(inArray(ventureTeam.ventureId, ventureIds));
          const memberIds = Array.from(new Set(assignments.map(a => a.memberId)));
          if (memberIds.length > 0) {
            ventureMembers = await db.select().from(teamMembers)
              .where(inArray(teamMembers.id, memberIds))
              .orderBy(desc(teamMembers.createdAt));
          }
        }

        // Merge and deduplicate
        const seen = new Set<number>();
        const merged = [];
        for (const m of [...directMembers, ...ventureMembers]) {
          if (!seen.has(m.id)) {
            seen.add(m.id);
            merged.push(m);
          }
        }
        return merged;
      }

      return db.select().from(teamMembers).orderBy(desc(teamMembers.createdAt));
    }),

  /**
   * List VENTEX/Aurovia internal members (type = 'Internal')
   * Includes members with any orgId as long as they are Internal type
   */
  listInternal: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    // Sort by custom sortOrder (lower = higher in list), then by name
    return db.select().from(teamMembers)
      .where(eq(teamMembers.type, "Internal"))
      .orderBy(asc(teamMembers.sortOrder), teamMembers.name);
  }),

  /**
   * List client contacts grouped by organization
   * Returns all members that have an organizationId set
   */
  listByOrganization: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];

    // Get all members with a CLIENT org — exclude VENTEX internal members
    // VENTEX team (admin/owner systemRole, or org 1 = VENTEX) should NOT appear in Client Contacts
    const members = await db.select({
      id: teamMembers.id,
      name: teamMembers.name,
      role: teamMembers.role,
      memberFunction: teamMembers.memberFunction,
      status: teamMembers.status,
      type: teamMembers.type,
      organizationId: teamMembers.organizationId,
      email: teamMembers.email,
      phone: teamMembers.phone,
      telegram: teamMembers.telegram,
      whatsapp: teamMembers.whatsapp,
      linkedin: teamMembers.linkedin,
      location: teamMembers.location,
      notes: teamMembers.notes,
      slug: teamMembers.slug,
      createdAt: teamMembers.createdAt,
      orgName: organizations.name,
      orgSlug: organizations.slug,
    })
      .from(teamMembers)
      .leftJoin(organizations, eq(teamMembers.organizationId, organizations.id))
      .where(and(
        isNotNull(teamMembers.organizationId),
        sql`${teamMembers.organizationId} != 1`,  // Exclude VENTEX org
        sql`(${teamMembers.systemRole} IS NULL OR ${teamMembers.systemRole} NOT IN ('admin', 'owner'))`,  // Exclude VENTEX team roles
      ))
      .orderBy(organizations.name, desc(teamMembers.createdAt));

    return members;
  }),

  getBySlug: protectedProcedure.input(z.object({ slug: z.string() })).query(async ({ input }) => {
    const db = await getDb();
    if (!db) return null;
    const rows = await db.select().from(teamMembers).where(eq(teamMembers.slug, input.slug)).limit(1);
    return rows[0] || null;
  }),

  getById: protectedProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
    const db = await getDb();
    if (!db) return null;
    const rows = await db.select().from(teamMembers).where(eq(teamMembers.id, input.id)).limit(1);
    return rows[0] || null;
  }),

  create: adminProcedure.input(z.object({
    name: z.string(),
    role: z.string().optional(),
    memberFunction: z.string().optional(),
    status: z.string().default("Active"),
    type: z.string().default("Internal"),
    organizationId: z.number().nullable().optional(), // null = VENTEX internal
    notes: z.string().optional(),
    email: z.string().optional(),
    phone: z.string().optional(),
    telegram: z.string().optional(),
    whatsapp: z.string().optional(),
    linkedin: z.string().optional(),
    location: z.string().optional(),
    systemRole: z.enum(["admin", "partner", "manager", "user", "viewer", "client"]).optional(),
    origin: z.string().optional(), // frontend origin for building invite link
  })).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // Section 14: Principal Gate — team member addition requires confirmation
    if (input.organizationId) {
      await requirePrincipalGate({
        actionType: "team_change",
        organizationId: input.organizationId,
        entityName: input.name,
        description: `Add team member "${input.name}" (${input.role || "unspecified role"})`,
        userId: String(ctx.user.id),
        userName: ctx.user.name || "System",
        callerOpenId: ctx.user.openId,
      });
    }

    const slug = slugify(input.name) + "-" + nanoid(4);
    const { organizationId, systemRole, origin, ...rest } = input;

    // Determine invitation status
    const hasEmail = !!input.email?.trim();
    const invitationStatus = hasEmail ? "pending" : null;

    const [insertResult] = await db.insert(teamMembers).values({
      ...rest,
      organizationId: organizationId ?? null,
      systemRole: systemRole ?? null,
      invitationStatus,
      slug,
    });

    const memberId = insertResult.insertId;

    // Auto-send invitation if email is provided
    let inviteToken: string | null = null;
    if (hasEmail && input.email) {
      try {
        const token = crypto.randomBytes(48).toString("base64url");
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30); // 30 day expiry

        // Use VENTEX org (id=1) for internal members, or the member's org
        const inviteOrgId = organizationId ?? 1;
        const inviteRole = systemRole ?? "user";

        await db.insert(invitations).values({
          email: input.email.trim().toLowerCase(),
          organizationId: inviteOrgId,
          role: inviteRole as any,
          token,
          teamMemberId: memberId,
          invitedBy: ctx.user.id,
          invitedByName: ctx.user.name ?? "Admin",
          expiresAt,
        });

        // Update team member with invitation link
        const [inv] = await db.select({ id: invitations.id })
          .from(invitations).where(eq(invitations.token, token)).limit(1);
        if (inv) {
          await db.update(teamMembers)
            .set({ invitationId: inv.id })
            .where(eq(teamMembers.id, memberId));
        }

        inviteToken = token;

        // Send invitation email notification
        if (origin) {
          const inviteLink = buildInviteLink(origin, token);
          // Get org name for the email
          let orgNameForEmail = "VENTEX";
          if (organizationId) {
            const [org] = await db.select({ name: organizations.name })
              .from(organizations).where(eq(organizations.id, organizationId)).limit(1);
            if (org) orgNameForEmail = org.name;
          }
          // Fire and forget — don't block on email delivery
          sendInvitationEmail({
            recipientEmail: input.email!.trim(),
            recipientName: input.name,
            role: inviteRole,
            inviterName: ctx.user.name ?? "Admin",
            inviteLink,
            organizationName: orgNameForEmail,
          }).catch(err => console.error("[Team] Email notification failed:", err));
        }
      } catch (err) {
        console.error("[Team] Failed to create invitation:", err);
        // Don't fail the member creation if invitation fails
      }
    }

    await db.insert(activityLog).values({
      entityType: "team", entityName: input.name, action: "Member Added",
      detail: `${input.name} added as ${input.role || input.type}${organizationId ? ` (client contact)` : ` (VENTEX internal)`}${hasEmail ? ` — invitation sent to ${input.email}` : ""}`,
      userName: ctx.user.name ?? "System",
      activitySource: "atlas_ops",
    });

    await createNotification({
      type: NOTIF_TYPES.TEAM_MEMBER_ADDED,
      category: "info",
      title: `New Team Member: ${input.name}`,
      message: `${input.name} added as ${input.role || input.type}${hasEmail ? `. Invitation sent to ${input.email}` : ""}`,
      entityType: "team",
      entityName: input.name,
      link: organizationId ? "/team" : "/ventex-team",
      actorName: ctx.user.name ?? "System",
      organizationId: organizationId || undefined,
    });

    return { success: true, memberId, inviteToken, invitationSent: hasEmail };
  }),

  // Venture team assignments — optionally scoped by org
  ventureAssignments: protectedProcedure
    .input(z.object({ organizationId: z.number().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return [];

      const rows = await db
        .select({
          id: ventureTeam.id,
          ventureId: ventureTeam.ventureId,
          memberId: ventureTeam.memberId,
          responsibility: ventureTeam.responsibility,
          ventureName: ventures.name,
          ventureSector: ventures.sector,
          memberName: teamMembers.name,
          memberRole: teamMembers.role,
          memberFunction: teamMembers.memberFunction,
          memberType: teamMembers.type,
        })
        .from(ventureTeam)
        .leftJoin(ventures, eq(ventureTeam.ventureId, ventures.id))
        .leftJoin(teamMembers, eq(ventureTeam.memberId, teamMembers.id));

      // Cross-tenant isolation: client users forced to their own org
      const effectiveOrgId2 = resolveOrgId(ctx.user, input?.organizationId);

      // If org-scoped, filter by venture IDs
      if (effectiveOrgId2) {
        const ventureIds = await resolveVentureScope(ctx.user, effectiveOrgId2);
        if (ventureIds === null) return rows;
        if (ventureIds.length === 0) return [];
        const ventureIdSet = new Set(ventureIds);
        return rows.filter(r => ventureIdSet.has(r.ventureId));
      }

      return rows;
    }),

  assignToVenture: protectedProcedure.input(z.object({
    ventureId: z.number(),
    memberId: z.number(),
    responsibility: z.string().optional(),
  })).mutation(async ({ input, ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    // TENANT_PATCHED: Verify venture access before assigning team member
    if (!isVentexTeam(ctx.user)) {
      const ventureIds = await getOrgVentureIds(ctx.user);
      if (ventureIds && !ventureIds.includes(input.ventureId)) throw new Error("Access denied: venture not in your organization");
    }
    await db.insert(ventureTeam).values({
      ventureId: input.ventureId,
      memberId: input.memberId,
      responsibility: input.responsibility || null,
    });
    return { success: true };
  }),

  removeFromVenture: protectedProcedure.input(z.object({
    id: z.number(),
  })).mutation(async ({ input, ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    // TENANT_PATCHED: Verify venture team assignment belongs to user's org
    if (!isVentexTeam(ctx.user)) {
      const [assignment] = await db.select({ ventureId: ventureTeam.ventureId }).from(ventureTeam).where(eq(ventureTeam.id, input.id)).limit(1);
      if (assignment) {
        const ventureIds = await getOrgVentureIds(ctx.user);
        if (ventureIds && !ventureIds.includes(assignment.ventureId)) throw new Error("Access denied: venture not in your organization");
      }
    }
    await db.delete(ventureTeam).where(eq(ventureTeam.id, input.id));
    return { success: true };
  }),

  update: adminProcedure.input(z.object({
    id: z.number(),
    name: z.string().optional(),
    role: z.string().optional(),
    memberFunction: z.string().optional(),
    status: z.string().optional(),
    type: z.string().optional(),
    organizationId: z.number().nullable().optional(),
    notes: z.string().optional(),
    email: z.string().optional(),
    phone: z.string().optional(),
    telegram: z.string().optional(),
    whatsapp: z.string().optional(),
    linkedin: z.string().optional(),
    location: z.string().optional(),
    avatarUrl: z.string().nullable().optional(),
    sortOrder: z.number().optional(),
  })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const { id, ...data } = input;
    // Handle explicit null for organizationId (move to VENTEX internal)
    const updateData: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(data)) {
      if (val !== undefined) updateData[key] = val;
    }
    await db.update(teamMembers).set(updateData).where(eq(teamMembers.id, id));
    return { success: true };
  }),

  /**
   * Heartbeat — called by frontend every 2 minutes to update lastSeenAt.
   * Links the current user to their team member record and updates lastSeenAt.
   * Auto-links unlinked team members by email match when userId is null.
   */
  heartbeat: protectedProcedure.mutation(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return { success: false };
    const userId = ctx.user.id;
    const userEmail = ctx.user.email;
    const now = new Date();

    // Update lastSignedIn on users table
    await db.update(users).set({ lastSignedIn: now }).where(eq(users.id, userId));

    // Find linked team member by userId
    let [member] = await db.select().from(teamMembers)
      .where(eq(teamMembers.userId, userId)).limit(1);

    // If no linked member found, try to auto-link by email match
    if (!member && userEmail) {
      const [unlinked] = await db.select().from(teamMembers)
        .where(and(
          eq(teamMembers.email, userEmail),
          isNull(teamMembers.userId)
        ))
        .limit(1);
      if (unlinked) {
        await db.update(teamMembers)
          .set({ userId, lastSeenAt: now, invitationStatus: "accepted" })
          .where(eq(teamMembers.id, unlinked.id));
        member = { ...unlinked, userId, lastSeenAt: now };
      }
    }

    if (member) {
      await db.update(teamMembers).set({ lastSeenAt: now }).where(eq(teamMembers.id, member.id));
    }

    return { success: true };
  }),

  /**
   * Get live status for all team members (Internal + client contacts).
   * Returns id, name, liveStatus, lastSeenAt, adminStatus.
   * Uses the MORE RECENT of team_members.lastSeenAt and users.lastSignedIn
   * so that login events are always reflected even if heartbeat didn't fire.
   */
  liveStatuses: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    const members = await db.select({
      id: teamMembers.id,
      name: teamMembers.name,
      type: teamMembers.type,
      lastSeenAt: teamMembers.lastSeenAt,
      adminStatus: teamMembers.adminStatus,
      userId: teamMembers.userId,
      userLastSignedIn: users.lastSignedIn,
    })
    .from(teamMembers)
    .leftJoin(users, eq(teamMembers.userId, users.id));

    return members.map(m => {
      // Use the more recent of the two timestamps
      const tmSeen = m.lastSeenAt?.getTime() ?? 0;
      const uSeen = m.userLastSignedIn?.getTime() ?? 0;
      const effectiveLastSeen = tmSeen >= uSeen ? m.lastSeenAt : m.userLastSignedIn;
      return {
        id: m.id,
        name: m.name,
        type: m.type,
        liveStatus: calculateLiveStatus(effectiveLastSeen ?? null, m.adminStatus),
        lastSeenAt: effectiveLastSeen?.toISOString() || null,
        adminStatus: m.adminStatus,
      };
    });
  }),

  /**
   * Admin: set a member's adminStatus (active, on_leave, deactivated)
   */
  setAdminStatus: adminProcedure.input(z.object({
    id: z.number(),
    adminStatus: z.enum(["active", "on_leave", "deactivated"]),
  })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    await db.update(teamMembers).set({ adminStatus: input.adminStatus }).where(eq(teamMembers.id, input.id));
    await db.insert(activityLog).values({
      entityType: "team", entityId: input.id, action: "Status Changed",
      detail: `Admin status set to ${input.adminStatus}`, userName: "System",
      activitySource: "atlas_ops",
    });
    return { success: true };
  }),

  /**
   * Link a team member to a user account (for login-based status tracking)
   */
  linkUser: adminProcedure.input(z.object({
    memberId: z.number(),
    userId: z.number(),
  })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    await db.update(teamMembers).set({ userId: input.userId }).where(eq(teamMembers.id, input.memberId));
    return { success: true };
  }),

  /** Delete a team member */
  delete: adminProcedure.input(z.object({ id: z.number() })).mutation(async ({ input, ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // Get member info for activity log
    const [member] = await db.select().from(teamMembers).where(eq(teamMembers.id, input.id)).limit(1);
    if (!member) {
      // Member already deleted (e.g., stale UI data) — return success idempotently
      return { success: true, name: "Unknown" };
    }

    // Section 14: Principal Gate — team member removal requires confirmation
    if (member.organizationId) {
      await requirePrincipalGate({
        actionType: "team_change",
        organizationId: member.organizationId,
        entityId: String(member.id),
        entityName: member.name,
        description: `Remove team member "${member.name}" (${member.role || "unspecified role"})`,
        callerOpenId: ctx.user.openId,
      });
    }

    // Remove venture assignments
    await db.delete(ventureTeam).where(eq(ventureTeam.memberId, input.id));

    // Delete member
    await db.delete(teamMembers).where(eq(teamMembers.id, input.id));

    await db.insert(activityLog).values({
      entityType: "team", entityName: member.name, action: "Member Removed",
      detail: `${member.name} removed from the system`, userName: "System",
      activitySource: "atlas_ops",
    });

    await createNotification({
      type: NOTIF_TYPES.TEAM_MEMBER_REMOVED,
      category: "warning",
      title: `Member Removed: ${member.name}`,
      message: `${member.name} has been removed from the system`,
      entityType: "team",
      entityName: member.name,
      actorName: "System",
    });

    return { success: true, name: member.name };
  }),

  /**
   * Reorder team members — accepts an array of { id, sortOrder } pairs.
   * Admin only.
   */
  reorder: adminProcedure.input(z.object({
    items: z.array(z.object({
      id: z.number(),
      sortOrder: z.number(),
    })),
  })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    for (const item of input.items) {
      await db.update(teamMembers)
        .set({ sortOrder: item.sortOrder })
        .where(eq(teamMembers.id, item.id));
    }
    return { success: true };
  }),

  /**
   * Upload avatar for a team member.
   * Accepts base64-encoded image data, uploads to S3, saves URL.
   */
  uploadAvatar: adminProcedure.input(z.object({
    memberId: z.number(),
    base64: z.string(),
    mimeType: z.string().default("image/png"),
    filename: z.string().default("avatar.png"),
  })).mutation(async ({ input, ctx }) => {
    // Rate limit: 30 uploads per 10 minutes per user
    enforceRateLimit("fileUpload", ctx.user!.id);

    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // Decode base64 to buffer
    const buffer = Buffer.from(input.base64, "base64");

    // Upload to S3 with unique key
    const ext = input.filename.split(".").pop() || "png";
    const fileKey = `avatars/member-${input.memberId}-${nanoid(8)}.${ext}`;
    const { url } = await storagePut(fileKey, buffer, input.mimeType);

    // Save URL to team member
    await db.update(teamMembers)
      .set({ avatarUrl: url })
      .where(eq(teamMembers.id, input.memberId));

    return { success: true, avatarUrl: url };
  }),

  /**
   * Resend invitation to a team member.
   * Revokes old invitation and creates a new one.
   */
  resendInvitation: adminProcedure.input(z.object({
    memberId: z.number(),
    origin: z.string().optional(),
  })).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // Get the team member
    const [member] = await db.select().from(teamMembers)
      .where(eq(teamMembers.id, input.memberId)).limit(1);
    if (!member) throw new Error("Team member not found");
    if (!member.email) throw new Error("Team member has no email address");

    // Revoke any existing pending invitations for this member
    if (member.invitationId) {
      await db.update(invitations)
        .set({ status: "revoked" })
        .where(and(
          eq(invitations.id, member.invitationId),
          eq(invitations.status, "pending")
        ));
    }
    // Also revoke any pending invitations by email
    await db.update(invitations)
      .set({ status: "revoked" })
      .where(and(
        eq(invitations.email, member.email.toLowerCase()),
        eq(invitations.status, "pending")
      ));

    // Create new invitation
    const token = crypto.randomBytes(48).toString("base64url");
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    const inviteOrgId = member.organizationId ?? 1;
    const inviteRole = (member.systemRole ?? "user") as any;

    await db.insert(invitations).values({
      email: member.email.toLowerCase(),
      organizationId: inviteOrgId,
      role: inviteRole,
      token,
      teamMemberId: member.id,
      invitedBy: ctx.user.id,
      invitedByName: ctx.user.name ?? "Admin",
      expiresAt,
    });

    // Update team member
    const [inv] = await db.select({ id: invitations.id })
      .from(invitations).where(eq(invitations.token, token)).limit(1);
    if (inv) {
      await db.update(teamMembers)
        .set({ invitationId: inv.id, invitationStatus: "pending" })
        .where(eq(teamMembers.id, member.id));
    }

    // Send invitation email notification
    if (input.origin) {
      const inviteLink = buildInviteLink(input.origin, token);
      let orgNameForEmail = "VENTEX";
      if (member.organizationId && member.organizationId !== 1) {
        const [org] = await db.select({ name: organizations.name })
          .from(organizations).where(eq(organizations.id, member.organizationId)).limit(1);
        if (org) orgNameForEmail = org.name;
      }
      sendInvitationEmail({
        recipientEmail: member.email.trim(),
        recipientName: member.name,
        role: inviteRole,
        inviterName: ctx.user.name ?? "Admin",
        inviteLink,
        organizationName: orgNameForEmail,
      }).catch(err => console.error("[Team] Resend email notification failed:", err));
    }

    await db.insert(activityLog).values({
      entityType: "team", entityName: member.name, action: "Invitation Resent",
      detail: `Invitation resent to ${member.email}`,
      userName: ctx.user.name ?? "System",
      activitySource: "atlas_ops",
    });

    return { success: true, token, inviteToken: token };
  }),

  /**
   * Get invitation status for a team member.
   */
  getInvitationStatus: adminProcedure.input(z.object({
    memberId: z.number(),
  })).query(async ({ input }) => {
    const db = await getDb();
    if (!db) return null;

    const [member] = await db.select().from(teamMembers)
      .where(eq(teamMembers.id, input.memberId)).limit(1);
    if (!member || !member.invitationId) return null;

    const [inv] = await db.select().from(invitations)
      .where(eq(invitations.id, member.invitationId)).limit(1);
    if (!inv) return null;

    // Check if expired
    const isExpired = inv.status === "pending" && new Date() > inv.expiresAt;
    return {
      status: isExpired ? "expired" : inv.status,
      email: inv.email,
      role: inv.role,
      expiresAt: inv.expiresAt,
      createdAt: inv.createdAt,
      acceptedAt: inv.acceptedAt,
    };
  }),
});
