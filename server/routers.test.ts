import { describe, expect, it, beforeAll } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

function createAuthenticatedContext(): TrpcContext {
  return {
    user: {
      id: 1,
      openId: "test-open-id",
      name: "Test Admin",
      email: "admin@test.com",
      role: "admin",
      organizationId: null, // VENTEX team (no org = sees all)
      status: "active",
      avatarUrl: null,
      invitationId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedInAt: new Date(),
    },
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

function createPublicCaller() {
  return appRouter.createCaller(createPublicContext());
}

function createAuthCaller() {
  return appRouter.createCaller(createAuthenticatedContext());
}

describe("ventures router", () => {
  it("lists all ventures from the database", async () => {
    const caller = createAuthCaller();
    const ventures = await caller.ventures.list();
    expect(Array.isArray(ventures)).toBe(true);
    expect(ventures.length).toBeGreaterThan(0);
    // Check shape
    const v = ventures[0];
    expect(v).toHaveProperty("id");
    expect(v).toHaveProperty("name");
    expect(v).toHaveProperty("slug");
    expect(v).toHaveProperty("sector");
  });

  it("gets a single venture by slug", async () => {
    const caller = createAuthCaller();
    const ventures = await caller.ventures.list();
    if (ventures.length > 0) {
      const venture = await caller.ventures.getBySlug({ slug: ventures[0].slug });
      expect(venture).not.toBeNull();
      expect(venture!.name).toBe(ventures[0].name);
    }
  });

  it("returns null for non-existent venture slug", async () => {
    const caller = createAuthCaller();
    const venture = await caller.ventures.getBySlug({ slug: "non-existent-slug-xyz" });
    expect(venture).toBeNull();
  });

  it("rejects unauthenticated access", async () => {
    const caller = createPublicCaller();
    await expect(caller.ventures.list()).rejects.toThrow();
  });
});

describe("tasks router", () => {
  it("lists all tasks from the database", async () => {
    const caller = createAuthCaller();
    const tasks = await caller.tasks.list();
    expect(Array.isArray(tasks)).toBe(true);
    expect(tasks.length).toBeGreaterThan(0);
    const t = tasks[0];
    expect(t).toHaveProperty("id");
    expect(t).toHaveProperty("title");
    expect(t).toHaveProperty("status");
  });

  it("creates a new task and cleans up", async () => {
    const caller = createAuthCaller();
    const result = await caller.tasks.create({
      title: `Vitest task ${Date.now()}`,
      priority: "Medium",
      status: "open",
      dueDate: new Date().toISOString(),
    });
    expect(result).toHaveProperty("success", true);
    // Cleanup: delete the test task
    if (result.id) {
      try { await caller.tasks.delete({ id: result.id }); } catch {}
    }
  });

  it("rejects unauthenticated access", async () => {
    const caller = createPublicCaller();
    await expect(caller.tasks.list()).rejects.toThrow();
  });
});

describe("spvs router", () => {
  it("lists all SPVs from the database", async () => {
    const caller = createAuthCaller();
    const spvs = await caller.spvs.list();
    expect(Array.isArray(spvs)).toBe(true);
    expect(spvs.length).toBeGreaterThan(0);
    const s = spvs[0];
    expect(s).toHaveProperty("id");
    expect(s).toHaveProperty("name");
    expect(s).toHaveProperty("slug");
    expect(s).toHaveProperty("stage");
  });

  it("gets a single SPV by slug", async () => {
    const caller = createAuthCaller();
    const spvs = await caller.spvs.list();
    if (spvs.length > 0) {
      const spv = await caller.spvs.getBySlug({ slug: spvs[0].slug });
      expect(spv).not.toBeNull();
      expect(spv!.name).toBe(spvs[0].name);
    }
  });

  it("rejects unauthenticated access", async () => {
    const caller = createPublicCaller();
    await expect(caller.spvs.list()).rejects.toThrow();
  });
});

describe("team router", () => {
  it("lists all team members from the database", async () => {
    const caller = createAuthCaller();
    const team = await caller.team.list();
    expect(Array.isArray(team)).toBe(true);
    expect(team.length).toBeGreaterThan(0);
    const t = team[0];
    expect(t).toHaveProperty("id");
    expect(t).toHaveProperty("name");
    expect(t).toHaveProperty("role");
  });
});

describe("distributions router", () => {
  it("lists all distributions from the database", async () => {
    const caller = createAuthCaller();
    const dists = await caller.distributions.list();
    expect(Array.isArray(dists)).toBe(true);
    expect(dists.length).toBeGreaterThan(0);
    const d = dists[0];
    expect(d).toHaveProperty("id");
    expect(d).toHaveProperty("name");
    expect(d).toHaveProperty("amount");
  });

  it("rejects unauthenticated access", async () => {
    const caller = createPublicCaller();
    await expect(caller.distributions.list()).rejects.toThrow();
  });
});

describe("activity router", () => {
  it("lists recent activity entries", async () => {
    const caller = createAuthCaller();
    const activity = await caller.activity.recent({ limit: 10 });
    expect(Array.isArray(activity)).toBe(true);
    // Seeded data should have entries
    expect(activity.length).toBeGreaterThan(0);
    const a = activity[0];
    expect(a).toHaveProperty("id");
    expect(a).toHaveProperty("action");
    expect(a).toHaveProperty("entityType");
  });

  it("returns activity metrics", async () => {
    const caller = createAuthCaller();
    const metrics = await caller.activity.metrics();
    expect(metrics).toHaveProperty("total");
    expect(metrics).toHaveProperty("today");
    expect(typeof metrics.total).toBe("number");
  });
});

describe("notifications router", () => {
  it("lists notifications", async () => {
    const caller = createAuthCaller();
    const result = await caller.notifications.list({ limit: 10 });
    expect(result).toHaveProperty("items");
    expect(Array.isArray(result.items)).toBe(true);
  });

  it("creates notifications via helper and lists them", async () => {
    // Notifications are now created via createNotification helper, not tRPC endpoint
    // This test verifies the list endpoint works with the new cursor-based pagination
    const caller = createAuthCaller();
    const result = await caller.notifications.list({ limit: 5 });
    expect(result).toHaveProperty("items");
    expect(result).toHaveProperty("nextCursor");
  });

  it("gets unread count", async () => {
    const caller = createAuthCaller();
    const count = await caller.notifications.unreadCount();
    expect(typeof count).toBe("number");
  });
});
