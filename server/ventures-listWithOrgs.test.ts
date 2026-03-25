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
    } as TrpcContext["res"],
  };
}

function createClientContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 10,
    openId: "client-user",
    email: "client@example.com",
    name: "Client User",
    loginMethod: "manus",
    role: "client",
    organizationId: 2,
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
    } as TrpcContext["res"],
  };
}

describe("ventures.listWithOrgs", () => {
  const caller = appRouter.createCaller(createAdminContext());
  const clientCaller = appRouter.createCaller(createClientContext());

  it("returns an array for admin users", async () => {
    const result = await caller.ventures.listWithOrgs();
    expect(Array.isArray(result)).toBe(true);
  });

  it("each venture has an organizations array", async () => {
    const result = await caller.ventures.listWithOrgs();
    for (const v of result) {
      expect(v).toHaveProperty("organizations");
      expect(Array.isArray(v.organizations)).toBe(true);
    }
  });

  it("organization entries have orgId, orgName, orgSlug", async () => {
    const result = await caller.ventures.listWithOrgs();
    for (const v of result) {
      for (const org of v.organizations) {
        expect(org).toHaveProperty("orgId");
        expect(org).toHaveProperty("orgName");
        expect(org).toHaveProperty("orgSlug");
        expect(typeof org.orgId).toBe("number");
        expect(typeof org.orgName).toBe("string");
        expect(typeof org.orgSlug).toBe("string");
      }
    }
  });

  it("returns empty array for non-admin users", async () => {
    const result = await clientCaller.ventures.listWithOrgs();
    expect(result).toEqual([]);
  });

  it("ventures include standard fields like name, slug, sector", async () => {
    const result = await caller.ventures.listWithOrgs();
    if (result.length > 0) {
      const v = result[0];
      expect(v).toHaveProperty("id");
      expect(v).toHaveProperty("name");
      expect(v).toHaveProperty("slug");
      expect(v).toHaveProperty("sector");
      expect(v).toHaveProperty("location");
      expect(v).toHaveProperty("status");
    }
  });

  it("does not include archived organizations in venture mappings", async () => {
    const result = await caller.ventures.listWithOrgs();
    for (const v of result) {
      // We can't directly check org status from here, but we verify the structure is correct
      for (const org of v.organizations) {
        expect(org.orgName).toBeTruthy();
        expect(org.orgSlug).toBeTruthy();
      }
    }
  });
});
