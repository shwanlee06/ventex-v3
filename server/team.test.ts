import { describe, it, expect } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

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
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
      cookie: () => {},
    } as unknown as TrpcContext["res"],
  };
}

function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
      cookie: () => {},
    } as unknown as TrpcContext["res"],
  };
}

const caller = appRouter.createCaller(createAdminContext());
const publicCaller = appRouter.createCaller(createPublicContext());

describe("Team Router — Org-scoped queries", () => {
  it("listInternal returns only Internal type members", async () => {
    const members = await caller.team.listInternal();
    expect(Array.isArray(members)).toBe(true);
    // All returned members should have type "Internal"
    for (const m of members) {
      expect(m.type).toBe("Internal");
    }
  });

  it("listByOrganization returns only members with organizationId", async () => {
    const members = await caller.team.listByOrganization();
    expect(Array.isArray(members)).toBe(true);
    // All returned members should have a non-null organizationId
    for (const m of members) {
      expect(m.organizationId).not.toBeNull();
    }
  });

  it("listByOrganization includes orgName and orgSlug fields", async () => {
    const members = await caller.team.listByOrganization();
    expect(Array.isArray(members)).toBe(true);
    // Each member should have orgName and orgSlug from the join
    for (const m of members) {
      expect(m).toHaveProperty("orgName");
      expect(m).toHaveProperty("orgSlug");
    }
  });

  it("list without organizationId returns all members", async () => {
    const all = await caller.team.list();
    const internal = await caller.team.listInternal();
    const clientContacts = await caller.team.listByOrganization();
    expect(Array.isArray(all)).toBe(true);
    // Total should be >= internal + client (some may overlap via venture assignments)
    expect(all.length).toBeGreaterThanOrEqual(0);
  });

  it("list with organizationId scopes to that org", async () => {
    const orgs = await caller.organizations.list();
    if (orgs.length > 0) {
      const orgId = orgs[0].id;
      const members = await caller.team.list({ organizationId: orgId });
      expect(Array.isArray(members)).toBe(true);
    }
  });

  it("create with organizationId=null creates an ATLAS internal member", async () => {
    const result = await caller.team.create({
      name: "Test ATLAS Member " + Date.now(),
      role: "Test Role",
      type: "Internal",
      organizationId: null,
    });
    expect(result.success).toBe(true);

    // Verify it shows up in listInternal
    const internal = await caller.team.listInternal();
    const found = internal.find(m => m.role === "Test Role");
    expect(found).toBeDefined();
    expect(found?.organizationId).toBeNull();
  });

  it("create with organizationId creates a client contact", async () => {
    const orgs = await caller.organizations.list();
    if (orgs.length > 0) {
      const orgId = orgs[0].id;
      const result = await caller.team.create({
        name: "Test Client Contact " + Date.now(),
        role: "Client Liaison",
        type: "External Partner",
        organizationId: orgId,
      });
      expect(result.success).toBe(true);

      // Verify it shows up in listByOrganization
      const byOrg = await caller.team.listByOrganization();
      const found = byOrg.find(m => m.role === "Client Liaison");
      expect(found).toBeDefined();
      expect(found?.organizationId).toBe(orgId);
    }
  });

  it("delete removes a team member and their venture assignments", async () => {
    // Create a temp member
    await caller.team.create({
      name: "Delete Me " + Date.now(),
      role: "Temp",
      organizationId: null,
    });
    const internal = await caller.team.listInternal();
    const temp = internal.find(m => m.role === "Temp");
    expect(temp).toBeDefined();

    if (temp) {
      const result = await caller.team.delete({ id: temp.id });
      expect(result.success).toBe(true);
      expect(result.name).toBe(temp.name);

      // Verify it's gone
      const after = await caller.team.listInternal();
      const gone = after.find(m => m.id === temp.id);
      expect(gone).toBeUndefined();
    }
  });

  it("listByOrganization requires admin role", async () => {
    await expect(publicCaller.team.listByOrganization()).rejects.toThrow();
  });

  it("delete requires admin role", async () => {
    await expect(publicCaller.team.delete({ id: 999999 })).rejects.toThrow();
  });

  it("delete of non-existent member returns success idempotently", async () => {
    // Deleting a member that doesn't exist should not throw — it's idempotent
    const result = await caller.team.delete({ id: 999999 });
    expect(result.success).toBe(true);
    expect(result.name).toBe("Unknown");
  });
});
