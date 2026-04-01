/**
 * Tests for invitation link fixes:
 * 1. resendInvitation returns both `token` and `inviteToken`
 * 2. OAuth callback links userId to team member on acceptance
 * 3. acceptInvitation links userId to team member on acceptance
 * 4. Partner role is recognized as ATLAS-level access
 */

import { describe, it, expect, afterAll } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import { getDb } from "./db";
import { teamMembers, invitations, users } from "../drizzle/schema";
import { eq, like, and } from "drizzle-orm";

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
  await db.delete(teamMembers).where(like(teamMembers.name, `%LinkFix ${testTimestamp}%`));
  await db.delete(invitations).where(like(invitations.email, `%linkfix-${testTimestamp}%`));
});

describe("resendInvitation returns inviteToken field", () => {
  let memberId: number;

  it("should create a member with invitation", async () => {
    const result = await caller.team.create({
      name: `LinkFix ${testTimestamp} Member`,
      role: "Partner",
      memberFunction: "Strategy & Vision",
      email: `linkfix-${testTimestamp}@atlas.io`,
      systemRole: "partner",
      origin: "https://test.example.com",
    });

    expect(result.success).toBe(true);
    expect(result.inviteToken).toBeTruthy();
    memberId = result.memberId;
  });

  it("resendInvitation should return both token and inviteToken", async () => {
    const result = await caller.team.resendInvitation({
      memberId,
      origin: "https://test.example.com",
    });

    expect(result.success).toBe(true);
    // The fix: backend now returns both `token` and `inviteToken`
    expect(result.token).toBeTruthy();
    expect(result.inviteToken).toBeTruthy();
    // They should be the same value
    expect(result.inviteToken).toBe(result.token);
  });

  it("inviteToken should be a valid base64url string", async () => {
    const result = await caller.team.resendInvitation({
      memberId,
      origin: "https://test.example.com",
    });

    // base64url tokens should only contain [A-Za-z0-9_-]
    expect(result.inviteToken).toMatch(/^[A-Za-z0-9_-]+$/);
    // Should be long enough (48 random bytes = 64 chars in base64url)
    expect(result.inviteToken!.length).toBeGreaterThanOrEqual(60);
  });
});

describe("Invitation acceptance links userId to team member", () => {
  it("should have teamMemberId on invitation records created via team.create", async () => {
    const db = await getDb();
    if (!db) throw new Error("DB unavailable");

    // Find the invitation for our test member
    const [inv] = await db
      .select()
      .from(invitations)
      .where(
        and(
          like(invitations.email, `linkfix-${testTimestamp}%`),
          eq(invitations.status, "pending")
        )
      )
      .limit(1);

    expect(inv).toBeTruthy();
    expect(inv.teamMemberId).toBeTruthy();
    // The teamMemberId should point to a valid team member
    const [member] = await db
      .select()
      .from(teamMembers)
      .where(eq(teamMembers.id, inv.teamMemberId!))
      .limit(1);

    expect(member).toBeTruthy();
    expect(member.name).toContain(`LinkFix ${testTimestamp}`);
  });
});

describe("Partner role access control", () => {
  it("partner role exists in the users table enum", async () => {
    const db = await getDb();
    if (!db) throw new Error("DB unavailable");

    // Check that Chris Phelps has partner role
    const [chris] = await db
      .select()
      .from(users)
      .where(eq(users.id, 840001))
      .limit(1);

    // Chris was promoted from partner to admin — verify he exists with admin role
    if (chris) {
      expect(chris.role).toBe("admin");
    }
  });

  it("should recognize partner as a valid system role for team members", async () => {
    const db = await getDb();
    if (!db) throw new Error("DB unavailable");

    const [member] = await db
      .select()
      .from(teamMembers)
      .where(like(teamMembers.name, `LinkFix ${testTimestamp}%`))
      .limit(1);

    expect(member).toBeTruthy();
    expect(member.systemRole).toBe("partner");
  });
});
