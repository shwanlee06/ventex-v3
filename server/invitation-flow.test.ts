import { describe, it, expect, afterAll } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import { getDb } from "./db";
import { teamMembers, invitations } from "../drizzle/schema";
import { eq, and, like } from "drizzle-orm";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAdminContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "admin-user",
    email: "admin@atlas.io",
    name: "Admin User",
    loginMethod: "manus",
    role: "admin",
    organizationId: null,
    status: "active",
    invitationId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: {
      protocol: "https",
      headers: {},
      ip: "127.0.0.1",
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
      cookie: () => {},
    } as unknown as TrpcContext["res"],
  };
}

const caller = appRouter.createCaller(createAdminContext());
const testTimestamp = Date.now();

// Clean up test data after all tests
afterAll(async () => {
  const db = await getDb();
  if (!db) return;
  // Clean up test team members
  await db.delete(teamMembers).where(like(teamMembers.name, `%InvTest ${testTimestamp}%`));
  // Clean up test invitations
  await db.delete(invitations).where(like(invitations.email, `%invtest-${testTimestamp}%`));
});

describe("Team Member Invitation Flow", () => {
  let createdMemberId: number;

  it("should create a member with email and auto-send invitation", async () => {
    const result = await caller.team.create({
      name: `InvTest ${testTimestamp} Partner`,
      role: "Partner",
      memberFunction: "Strategy & Vision",
      email: `invtest-${testTimestamp}-partner@atlas.io`,
      systemRole: "partner",
      origin: "https://test.example.com",
    });

    expect(result.success).toBe(true);
    expect(result.invitationSent).toBe(true);
    expect(result.inviteToken).toBeTruthy();
    expect(result.memberId).toBeTruthy();
    createdMemberId = result.memberId;
  });

  it("should set invitationStatus to pending on the team member", async () => {
    const db = await getDb();
    if (!db) throw new Error("DB unavailable");

    const [member] = await db.select()
      .from(teamMembers)
      .where(eq(teamMembers.id, createdMemberId))
      .limit(1);

    expect(member).toBeTruthy();
    expect(member.invitationStatus).toBe("pending");
    expect(member.systemRole).toBe("partner");
    expect(member.invitationId).toBeTruthy();
  });

  it("should create an invitation record linked to the team member", async () => {
    const db = await getDb();
    if (!db) throw new Error("DB unavailable");

    const [member] = await db.select()
      .from(teamMembers)
      .where(eq(teamMembers.id, createdMemberId))
      .limit(1);

    const [inv] = await db.select()
      .from(invitations)
      .where(eq(invitations.id, member.invitationId!))
      .limit(1);

    expect(inv).toBeTruthy();
    expect(inv.email).toBe(`invtest-${testTimestamp}-partner@atlas.io`);
    expect(inv.role).toBe("partner");
    expect(inv.status).toBe("pending");
    expect(inv.teamMemberId).toBe(createdMemberId);
    expect(inv.organizationId).toBe(1); // ATLAS org
  });

  it("should create a member without email and NOT send invitation", async () => {
    const result = await caller.team.create({
      name: `InvTest ${testTimestamp} NoEmail`,
      role: "Analyst",
      memberFunction: "Operations",
    });

    expect(result.success).toBe(true);
    expect(result.invitationSent).toBe(false);
    expect(result.inviteToken).toBeNull();
  });

  it("should resend invitation for a member", async () => {
    const result = await caller.team.resendInvitation({
      memberId: createdMemberId,
      origin: "https://test.example.com",
    });

    expect(result.success).toBe(true);
    expect(result.token).toBeTruthy();
  });

  it("should revoke old invitation and create new one on resend", async () => {
    const db = await getDb();
    if (!db) throw new Error("DB unavailable");

    // Check that there are revoked invitations for this email
    const revokedInvs = await db.select()
      .from(invitations)
      .where(and(
        eq(invitations.email, `invtest-${testTimestamp}-partner@atlas.io`),
        eq(invitations.status, "revoked")
      ));

    expect(revokedInvs.length).toBeGreaterThanOrEqual(1);

    // Check that there's exactly one pending invitation
    const pendingInvs = await db.select()
      .from(invitations)
      .where(and(
        eq(invitations.email, `invtest-${testTimestamp}-partner@atlas.io`),
        eq(invitations.status, "pending")
      ));

    expect(pendingInvs.length).toBe(1);
  });

  it("should get invitation status for a member", async () => {
    const result = await caller.team.getInvitationStatus({
      memberId: createdMemberId,
    });

    expect(result).toBeTruthy();
    expect(result!.status).toBe("pending");
    expect(result!.role).toBe("partner");
    expect(result!.email).toBe(`invtest-${testTimestamp}-partner@atlas.io`);
  });

  it("should fail to resend invitation for member without email", async () => {
    const db = await getDb();
    if (!db) throw new Error("DB unavailable");

    // Find the no-email member
    const [noEmailMember] = await db.select()
      .from(teamMembers)
      .where(like(teamMembers.name, `InvTest ${testTimestamp} NoEmail`))
      .limit(1);

    await expect(
      caller.team.resendInvitation({ memberId: noEmailMember.id })
    ).rejects.toThrow("no email");
  });
});
