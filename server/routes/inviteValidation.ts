/**
 * Public invite validation endpoint — no authentication required.
 * Used by the InviteAccept page to validate an invitation before OAuth.
 *
 * GET /api/invite/validate?orgSlug=aurovia&token=abc123...
 */

import { Router, type Request, type Response } from "express";
import { getDb } from "../db";
import { invitations, organizations } from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";

const inviteValidationRouter = Router();

inviteValidationRouter.get("/api/invite/validate", async (req: Request, res: Response) => {
  try {
    const orgSlug = typeof req.query.orgSlug === "string" ? req.query.orgSlug : "";
    const token = typeof req.query.token === "string" ? req.query.token : "";

    if (!orgSlug || !token) {
      res.json({ valid: false, reason: "Missing organization or token" });
      return;
    }

    const db = await getDb();
    if (!db) {
      res.json({ valid: false, reason: "Service unavailable" });
      return;
    }

    // Look up the organization by slug
    const [org] = await db
      .select({
        id: organizations.id,
        name: organizations.name,
        slug: organizations.slug,
        type: organizations.type,
        status: organizations.status,
      })
      .from(organizations)
      .where(eq(organizations.slug, orgSlug))
      .limit(1);

    if (!org) {
      res.json({ valid: false, reason: "Organization not found" });
      return;
    }

    if (org.status !== "active") {
      res.json({ valid: false, reason: "Organization is not active" });
      return;
    }

    // Look up the invitation by token
    const [invite] = await db
      .select({
        id: invitations.id,
        email: invitations.email,
        organizationId: invitations.organizationId,
        role: invitations.role,
        status: invitations.status,
        expiresAt: invitations.expiresAt,
      })
      .from(invitations)
      .where(eq(invitations.token, token))
      .limit(1);

    if (!invite) {
      res.json({ valid: false, reason: "Invalid invitation token" });
      return;
    }

    // Validate the invitation belongs to this org
    if (invite.organizationId !== org.id) {
      res.json({ valid: false, reason: "Invitation does not match this organization" });
      return;
    }

    // Check status
    if (invite.status !== "pending") {
      res.json({ valid: false, reason: `Invitation has already been ${invite.status}` });
      return;
    }

    // Check expiry
    if (new Date() > invite.expiresAt) {
      // Mark as expired
      await db
        .update(invitations)
        .set({ status: "expired" })
        .where(eq(invitations.id, invite.id));
      res.json({ valid: false, reason: "Invitation has expired" });
      return;
    }

    // Mask the email for privacy (show first 2 chars + domain)
    const emailParts = invite.email.split("@");
    const maskedEmail =
      emailParts[0].substring(0, 2) +
      "***@" +
      (emailParts[1] || "");

    res.json({
      valid: true,
      organizationName: org.name,
      organizationType: org.type,
      organizationSlug: org.slug,
      email: maskedEmail,
      role: invite.role,
    });
  } catch (error) {
    console.error("[InviteValidation] Error:", error);
    res.json({ valid: false, reason: "Validation failed" });
  }
});

/**
 * Token-only validation — used by team member invitations.
 * GET /api/invite/validate-token?token=abc123...
 * Does NOT require orgSlug — looks up the org from the invitation record.
 */
inviteValidationRouter.get("/api/invite/validate-token", async (req: Request, res: Response) => {
  try {
    const token = typeof req.query.token === "string" ? req.query.token : "";

    if (!token) {
      res.json({ valid: false, reason: "Missing token" });
      return;
    }

    const db = await getDb();
    if (!db) {
      res.json({ valid: false, reason: "Service unavailable" });
      return;
    }

    // Look up the invitation by token
    const [invite] = await db
      .select()
      .from(invitations)
      .where(eq(invitations.token, token))
      .limit(1);

    if (!invite) {
      res.json({ valid: false, reason: "Invalid invitation token" });
      return;
    }

    if (invite.status !== "pending") {
      res.json({ valid: false, reason: `Invitation has already been ${invite.status}` });
      return;
    }

    if (new Date() > invite.expiresAt) {
      await db
        .update(invitations)
        .set({ status: "expired" })
        .where(eq(invitations.id, invite.id));
      res.json({ valid: false, reason: "Invitation has expired" });
      return;
    }

    // Look up the organization
    const [org] = await db
      .select({
        id: organizations.id,
        name: organizations.name,
        slug: organizations.slug,
        type: organizations.type,
      })
      .from(organizations)
      .where(eq(organizations.id, invite.organizationId))
      .limit(1);

    // Mask the email
    const emailParts = invite.email.split("@");
    const maskedEmail =
      emailParts[0].substring(0, 2) +
      "***@" +
      (emailParts[1] || "");

    res.json({
      valid: true,
      organizationName: org?.name ?? "VENTEX",
      organizationType: org?.type ?? "core",
      organizationSlug: org?.slug ?? "ventex",
      email: maskedEmail,
      role: invite.role,
      invitedByName: invite.invitedByName,
    });
  } catch (error) {
    console.error("[InviteValidation] Token validation error:", error);
    res.json({ valid: false, reason: "Validation failed" });
  }
});

export default inviteValidationRouter;
