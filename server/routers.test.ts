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

function createCaller() {
  return appRouter.createCaller(createPublicContext());
}

describe("ventures router", () => {
  it("lists all ventures from the database", async () => {
    const caller = createCaller();
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
    const caller = createCaller();
    const ventures = await caller.ventures.list();
    if (ventures.length > 0) {
      const venture = await caller.ventures.getBySlug({ slug: ventures[0].slug });
      expect(venture).not.toBeNull();
      expect(venture!.name).toBe(ventures[0].name);
    }
  });

  it("returns null for non-existent venture slug", async () => {
    const caller = createCaller();
    const venture = await caller.ventures.getBySlug({ slug: "non-existent-slug-xyz" });
    expect(venture).toBeNull();
  });
});

describe("tasks router", () => {
  it("lists all tasks from the database", async () => {
    const caller = createCaller();
    const tasks = await caller.tasks.list();
    expect(Array.isArray(tasks)).toBe(true);
    expect(tasks.length).toBeGreaterThan(0);
    const t = tasks[0];
    expect(t).toHaveProperty("id");
    expect(t).toHaveProperty("title");
    expect(t).toHaveProperty("status");
  });

  it("creates a new task", async () => {
    const caller = createCaller();
    const result = await caller.tasks.create({
      title: "Test task from vitest",
      priority: "Medium",
      status: "open",
      dueDate: new Date().toISOString(),
    });
    expect(result).toHaveProperty("success", true);
  });
});

describe("spvs router", () => {
  it("lists all SPVs from the database", async () => {
    const caller = createCaller();
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
    const caller = createCaller();
    const spvs = await caller.spvs.list();
    if (spvs.length > 0) {
      const spv = await caller.spvs.getBySlug({ slug: spvs[0].slug });
      expect(spv).not.toBeNull();
      expect(spv!.name).toBe(spvs[0].name);
    }
  });
});

describe("team router", () => {
  it("lists all team members from the database", async () => {
    const caller = createCaller();
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
    const caller = createCaller();
    const dists = await caller.distributions.list();
    expect(Array.isArray(dists)).toBe(true);
    expect(dists.length).toBeGreaterThan(0);
    const d = dists[0];
    expect(d).toHaveProperty("id");
    expect(d).toHaveProperty("name");
    expect(d).toHaveProperty("amount");
  });
});

describe("activity router", () => {
  it("lists recent activity entries", async () => {
    const caller = createCaller();
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
    const caller = createCaller();
    const metrics = await caller.activity.metrics();
    expect(metrics).toHaveProperty("total");
    expect(metrics).toHaveProperty("today");
    expect(typeof metrics.total).toBe("number");
  });
});

describe("notifications router", () => {
  it("lists notifications", async () => {
    const caller = createCaller();
    const notifs = await caller.notifications.list({ limit: 10 });
    expect(Array.isArray(notifs)).toBe(true);
  });

  it("creates a notification", async () => {
    const caller = createCaller();
    const result = await caller.notifications.create({
      type: "info",
      title: "Test notification from vitest",
      message: "This is a test",
    });
    expect(result).toHaveProperty("success", true);
  });

  it("gets unread count", async () => {
    const caller = createCaller();
    const count = await caller.notifications.unreadCount();
    expect(typeof count).toBe("number");
  });
});
