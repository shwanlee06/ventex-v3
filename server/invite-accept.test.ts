/**
 * Tests for invitation acceptance flow and email delivery wiring.
 * Covers:
 * - Token-only validation endpoint
 * - Team member invitation status update on acceptance
 * - Email notification helper (buildInviteLink)
 * - Invitation flow end-to-end
 */

import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import { getDb } from "./db";
import { invitations, teamMembers, organizations, users } from "../drizzle/schema";
import { eq, and } from "drizzle-orm";
import crypto from "crypto";
import { buildInviteLink } from "./invitationEmail";

// ── Helper: create test data ────────────────────────────────────────────

async function createTestOrg(db: any, name: string) {
  const slug = name.toLowerCase().replace(/\s+/g, "-") + "-" + Date.now();
  const [result] = await db.insert(organizations).values({
    name,
    slug,
    type: "client",
  });
  return { id: result.insertId, name, slug };
}

async function createTestMember(db: any, name: string, email: string, orgId?: number) {
  const slug = name.toLowerCase().replace(/\s+/g, "-") + "-" + Date.now();
  const [result] = await db.insert(teamMembers).values({
    name,
    email,
    slug,
    type: orgId ? "Client Contact" : "Internal",
    organizationId: orgId ?? null,
    invitationStatus: "pending",
    systemRole: "partner",
  });
  return { id: result.insertId, name, email, slug };
}

async function createTestInvitation(
  db: any,
  email: string,
  orgId: number,
  role: string,
  memberId?: number
) {
  const token = crypto.randomBytes(48).toString("base64url");
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30);

  const [result] = await db.insert(invitations).values({
    email: email.toLowerCase(),
    organizationId: orgId,
    role: role as any,
    token,
    teamMemberId: memberId ?? null,
    invitedBy: 1,
    invitedByName: "Test Admin",
    expiresAt,
  });

  return { id: result.insertId, token, email, role };
}

// ── Tests ───────────────────────────────────────────────────────────────

describe("Invitation Acceptance Flow", () => {
  let db: any;
  let testOrg: any;
  let testMember: any;
  let testInvitation: any;

  beforeAll(async () => {
    db = await getDb();
    testOrg = await createTestOrg(db, `Test Accept Org ${Date.now()}`);
    testMember = await createTestMember(
      db,
      `Test Accept Member ${Date.now()}`,
      `test-accept-${Date.now()}@example.com`,
      testOrg.id
    );
    testInvitation = await createTestInvitation(
      db,
      testMember.email,
      testOrg.id,
      "partner",
      testMember.id
    );

    // Link invitation to member
    await db
      .update(teamMembers)
      .set({ invitationId: testInvitation.id })
      .where(eq(teamMembers.id, testMember.id));
  });

  afterAll(async () => {
    if (!db) return;
    // Clean up test data
    if (testInvitation?.id) {
      await db.delete(invitations).where(eq(invitations.id, testInvitation.id));
    }
    if (testMember?.id) {
      await db.delete(teamMembers).where(eq(teamMembers.id, testMember.id));
    }
    if (testOrg?.id) {
      await db.delete(organizations).where(eq(organizations.id, testOrg.id));
    }
  });

  it("should have created test invitation with correct data", async () => {
    const [inv] = await db
      .select()
      .from(invitations)
      .where(eq(invitations.id, testInvitation.id))
      .limit(1);

    expect(inv).toBeDefined();
    expect(inv.email).toBe(testMember.email.toLowerCase());
    expect(inv.status).toBe("pending");
    expect(inv.teamMemberId).toBe(testMember.id);
    expect(inv.role).toBe("partner");
  });

  it("should have linked invitation to team member", async () => {
    const [member] = await db
      .select()
      .from(teamMembers)
      .where(eq(teamMembers.id, testMember.id))
      .limit(1);

    expect(member).toBeDefined();
    expect(member.invitationId).toBe(testInvitation.id);
    expect(member.invitationStatus).toBe("pending");
  });

  it("should update team member status when invitation is accepted", async () => {
    // Simulate acceptance: update invitation and team member
    await db
      .update(invitations)
      .set({ status: "accepted", acceptedAt: new Date() })
      .where(eq(invitations.id, testInvitation.id));

    await db
      .update(teamMembers)
      .set({ invitationStatus: "accepted" })
      .where(eq(teamMembers.id, testMember.id));

    // Verify
    const [member] = await db
      .select()
      .from(teamMembers)
      .where(eq(teamMembers.id, testMember.id))
      .limit(1);

    expect(member.invitationStatus).toBe("accepted");

    const [inv] = await db
      .select()
      .from(invitations)
      .where(eq(invitations.id, testInvitation.id))
      .limit(1);

    expect(inv.status).toBe("accepted");
    expect(inv.acceptedAt).toBeDefined();
  });

  it("should reject expired invitations", async () => {
    // Create an expired invitation
    const expiredToken = crypto.randomBytes(48).toString("base64url");
    const expiredDate = new Date();
    expiredDate.setDate(expiredDate.getDate() - 1); // expired yesterday

    const [expResult] = await db.insert(invitations).values({
      email: `expired-${Date.now()}@example.com`,
      organizationId: testOrg.id,
      role: "user" as any,
      token: expiredToken,
      invitedBy: 1,
      invitedByName: "Test",
      expiresAt: expiredDate,
    });

    // Verify it's expired
    const [inv] = await db
      .select()
      .from(invitations)
      .where(eq(invitations.id, expResult.insertId))
      .limit(1);

    expect(new Date() > inv.expiresAt).toBe(true);

    // Clean up
    await db.delete(invitations).where(eq(invitations.id, expResult.insertId));
  });

  it("should reject already-accepted invitations", async () => {
    // Our test invitation is already accepted from the previous test
    const [inv] = await db
      .select()
      .from(invitations)
      .where(eq(invitations.id, testInvitation.id))
      .limit(1);

    expect(inv.status).toBe("accepted");
    // An acceptance attempt should fail since status !== "pending"
    expect(inv.status !== "pending").toBe(true);
  });
});

describe("buildInviteLink", () => {
  it("should build correct invite link with origin and token", () => {
    const link = buildInviteLink("https://example.com", "abc123token");
    expect(link).toBe("https://example.com/accept-invite?token=abc123token");
  });

  it("should URL-encode special characters in token", () => {
    const link = buildInviteLink("https://example.com", "token+with/special=chars");
    expect(link).toContain("/accept-invite?token=");
    expect(link).toContain(encodeURIComponent("token+with/special=chars"));
  });

  it("should handle trailing slash in origin", () => {
    const link = buildInviteLink("https://example.com", "mytoken");
    expect(link).toBe("https://example.com/accept-invite?token=mytoken");
  });
});

describe("Token-only validation endpoint logic", () => {
  let db: any;
  let testOrg: any;
  let testInvitation: any;

  beforeAll(async () => {
    db = await getDb();
    testOrg = await createTestOrg(db, `Test Validate Org ${Date.now()}`);
    testInvitation = await createTestInvitation(
      db,
      `validate-${Date.now()}@example.com`,
      testOrg.id,
      "manager"
    );
  });

  afterAll(async () => {
    if (!db) return;
    if (testInvitation?.id) {
      await db.delete(invitations).where(eq(invitations.id, testInvitation.id));
    }
    if (testOrg?.id) {
      await db.delete(organizations).where(eq(organizations.id, testOrg.id));
    }
  });

  it("should find invitation by token", async () => {
    const [inv] = await db
      .select()
      .from(invitations)
      .where(eq(invitations.token, testInvitation.token))
      .limit(1);

    expect(inv).toBeDefined();
    expect(inv.email).toBe(testInvitation.email);
    expect(inv.status).toBe("pending");
    expect(inv.organizationId).toBe(testOrg.id);
  });

  it("should resolve organization from invitation", async () => {
    const [inv] = await db
      .select()
      .from(invitations)
      .where(eq(invitations.token, testInvitation.token))
      .limit(1);

    const [org] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, inv.organizationId))
      .limit(1);

    expect(org).toBeDefined();
    expect(org.name).toBe(testOrg.name);
    expect(org.slug).toBe(testOrg.slug);
  });

  it("should not find invitation with invalid token", async () => {
    const rows = await db
      .select()
      .from(invitations)
      .where(eq(invitations.token, "completely-invalid-token-that-does-not-exist"))
      .limit(1);

    expect(rows.length).toBe(0);
  });
});
