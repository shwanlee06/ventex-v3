import { describe, expect, it } from "vitest";
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

function createOwnerContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 2,
    openId: "owner-user",
    email: "owner@atlas.io",
    name: "Owner User",
    loginMethod: "manus",
    role: "owner",
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

function createRegularUserContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 3,
    openId: "regular-user",
    email: "user@client.io",
    name: "Regular User",
    loginMethod: "manus",
    role: "user",
    organizationId: 1,
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

describe("organizations.list", () => {
  it("returns an array when called by admin", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.organizations.list();
    expect(Array.isArray(result)).toBe(true);
  });

  it("returns an array when called by owner", async () => {
    const ctx = createOwnerContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.organizations.list();
    expect(Array.isArray(result)).toBe(true);
  });

  it("rejects non-admin users", async () => {
    const ctx = createRegularUserContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.organizations.list()).rejects.toThrow();
  });

  it("each org has ventureCount field", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.organizations.list();
    for (const org of result) {
      expect(org).toHaveProperty("ventureCount");
      expect(typeof org.ventureCount).toBe("number");
    }
  });
});

describe("organizations.listWithMetrics", () => {
  it("returns an array when called by admin", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.organizations.listWithMetrics();
    expect(Array.isArray(result)).toBe(true);
  });

  it("returns an array when called by owner", async () => {
    const ctx = createOwnerContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.organizations.listWithMetrics();
    expect(Array.isArray(result)).toBe(true);
  });

  it("rejects non-admin users", async () => {
    const ctx = createRegularUserContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.organizations.listWithMetrics()).rejects.toThrow();
  });

  it("each org has aggregate metric fields", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.organizations.listWithMetrics();
    for (const org of result) {
      expect(org).toHaveProperty("id");
      expect(org).toHaveProperty("name");
      expect(org).toHaveProperty("slug");
      expect(org).toHaveProperty("ventureCount");
      expect(org).toHaveProperty("sectors");
      expect(org).toHaveProperty("avgHealth");
      expect(org).toHaveProperty("totalTasks");
      expect(org).toHaveProperty("completedTasks");
      expect(org).toHaveProperty("openTasks");
      expect(org).toHaveProperty("overdueTasks");
      expect(org).toHaveProperty("completionRate");
      expect(org).toHaveProperty("spvCount");
      expect(org).toHaveProperty("teamSize");
      expect(org).toHaveProperty("totalDistributions");
      expect(org).toHaveProperty("lastActivityAt");
      expect(Array.isArray(org.sectors)).toBe(true);
      expect(typeof org.ventureCount).toBe("number");
      expect(typeof org.avgHealth).toBe("number");
      expect(typeof org.totalTasks).toBe("number");
      expect(typeof org.completionRate).toBe("number");
    }
  });

  it("completionRate is between 0 and 100", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.organizations.listWithMetrics();
    for (const org of result) {
      expect(org.completionRate).toBeGreaterThanOrEqual(0);
      expect(org.completionRate).toBeLessThanOrEqual(100);
    }
  });
});

describe("organizations.bySlug", () => {
  it("returns null for non-existent slug", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.organizations.bySlug({ slug: "non-existent-org-xyz" });
    expect(result).toBeNull();
  });

  it("returns org with ventureCount for existing slug", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);
    // First get list to find a real slug
    const list = await caller.organizations.list();
    if (list.length > 0) {
      const result = await caller.organizations.bySlug({ slug: list[0].slug });
      expect(result).not.toBeNull();
      expect(result!.slug).toBe(list[0].slug);
      expect(result).toHaveProperty("ventureCount");
    }
  });
});

describe("organizations.create", () => {
  it("rejects non-admin users", async () => {
    const ctx = createRegularUserContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.organizations.create({
        name: "Test Client",
        slug: "test-client-" + Date.now(),
      })
    ).rejects.toThrow();
  });
});
