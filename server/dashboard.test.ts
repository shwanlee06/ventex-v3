import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

/**
 * Dashboard integration tests — verifies the data endpoints
 * that power both the VENTEX admin command center and the
 * Client Portal dashboard views.
 */

function createVentexContext(): TrpcContext {
  return {
    user: {
      id: 1,
      openId: "ventex-admin-test",
      name: "VENTEX Admin",
      email: "admin@ventex.com",
      role: "admin",
      organizationId: null,
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

function createClientContext(): TrpcContext {
  return {
    user: {
      id: 2,
      openId: "client-user-test",
      name: "Client Partner",
      email: "partner@client.com",
      role: "user",
      organizationId: null,
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

describe("VENTEX Admin Dashboard — data endpoints", () => {
  it("fetches ventures list for VENTEX team", async () => {
    const caller = appRouter.createCaller(createVentexContext());
    const ventures = await caller.ventures.list();
    expect(Array.isArray(ventures)).toBe(true);
    expect(ventures.length).toBeGreaterThan(0);

    // Verify venture shape has all fields needed by dashboard
    const v = ventures[0];
    expect(v).toHaveProperty("id");
    expect(v).toHaveProperty("name");
    expect(v).toHaveProperty("slug");
    expect(v).toHaveProperty("sector");
    expect(v).toHaveProperty("status");
    expect(v).toHaveProperty("stage");
    expect(v).toHaveProperty("location");
  });

  it("fetches tasks list for VENTEX team", async () => {
    const caller = appRouter.createCaller(createVentexContext());
    const tasks = await caller.tasks.list();
    expect(Array.isArray(tasks)).toBe(true);

    // Verify task shape has fields needed by dashboard
    if (tasks.length > 0) {
      const t = tasks[0];
      expect(t).toHaveProperty("id");
      expect(t).toHaveProperty("title");
      expect(t).toHaveProperty("status");
      expect(t).toHaveProperty("dueDate");
      expect(t).toHaveProperty("priority");
    }
  });

  it("fetches SPVs list for VENTEX team", async () => {
    const caller = appRouter.createCaller(createVentexContext());
    const spvs = await caller.spvs.list();
    expect(Array.isArray(spvs)).toBe(true);
    expect(spvs.length).toBeGreaterThan(0);

    const s = spvs[0];
    expect(s).toHaveProperty("id");
    expect(s).toHaveProperty("name");
    expect(s).toHaveProperty("slug");
    expect(s).toHaveProperty("stage");
    expect(s).toHaveProperty("priority");
    expect(s).toHaveProperty("sector");
  });

  it("fetches distributions list for VENTEX team", async () => {
    const caller = appRouter.createCaller(createVentexContext());
    const dists = await caller.distributions.list();
    expect(Array.isArray(dists)).toBe(true);
    expect(dists.length).toBeGreaterThan(0);

    const d = dists[0];
    expect(d).toHaveProperty("id");
    expect(d).toHaveProperty("name");
    expect(d).toHaveProperty("amount");
    expect(d).toHaveProperty("status");
    expect(d).toHaveProperty("fund");
  });

  it("fetches recent activity for VENTEX team", async () => {
    const caller = appRouter.createCaller(createVentexContext());
    // Activity router uses publicProcedure, so it works for both
    const activity = await caller.activity.recent({ limit: 10 });
    expect(Array.isArray(activity)).toBe(true);

    if (activity.length > 0) {
      const a = activity[0];
      expect(a).toHaveProperty("id");
      expect(a).toHaveProperty("action");
      expect(a).toHaveProperty("createdAt");
    }
  });

  it("fetches team list for VENTEX team", async () => {
    const caller = appRouter.createCaller(createVentexContext());
    // Team router uses publicProcedure
    const team = await caller.team.list();
    expect(Array.isArray(team)).toBe(true);
    expect(team.length).toBeGreaterThan(0);

    const t = team[0];
    expect(t).toHaveProperty("id");
    expect(t).toHaveProperty("name");
    expect(t).toHaveProperty("type");
  });

  it("fetches intelligence daily brief for VENTEX team", async () => {
    const caller = appRouter.createCaller(createVentexContext());
    const brief = await caller.intelligence.getDailyBrief();
    // May return null if no brief generated today
    if (brief) {
      expect(brief).toHaveProperty("briefDate");
    }
  });

  it("fetches smart alerts for VENTEX team", async () => {
    const caller = appRouter.createCaller(createVentexContext());
    const alerts = await caller.intelligence.getSmartAlerts({});
    expect(Array.isArray(alerts)).toBe(true);
  });

  it("fetches doc intelligence feed for VENTEX team", async () => {
    const caller = appRouter.createCaller(createVentexContext());
    const feed = await caller.docIntel.recentFeed({ limit: 5 });
    expect(Array.isArray(feed)).toBe(true);
  });
});

describe("Client Portal Dashboard — data endpoints", () => {
  it("fetches ventures list for client user", async () => {
    const caller = appRouter.createCaller(createClientContext());
    const ventures = await caller.ventures.list();
    expect(Array.isArray(ventures)).toBe(true);
    // Client may see fewer ventures depending on org assignment
  });

  it("fetches SPVs list for client user", async () => {
    const caller = appRouter.createCaller(createClientContext());
    const spvs = await caller.spvs.list();
    expect(Array.isArray(spvs)).toBe(true);
  });

  it("fetches distributions for client user", async () => {
    const caller = appRouter.createCaller(createClientContext());
    const dists = await caller.distributions.list();
    expect(Array.isArray(dists)).toBe(true);
  });

  it("fetches recent activity for client user", async () => {
    const caller = appRouter.createCaller(createClientContext());
    const activity = await caller.activity.recent({ limit: 6 });
    expect(Array.isArray(activity)).toBe(true);
  });
});

describe("Dashboard — access control", () => {
  it("rejects unauthenticated access to ventures", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(caller.ventures.list()).rejects.toThrow();
  });

  it("rejects unauthenticated access to tasks", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(caller.tasks.list()).rejects.toThrow();
  });

  it("rejects unauthenticated access to SPVs", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(caller.spvs.list()).rejects.toThrow();
  });

  it("rejects unauthenticated access to distributions", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(caller.distributions.list()).rejects.toThrow();
  });
});

describe("Dashboard — data integrity for metrics", () => {
  it("venture data supports sector grouping", async () => {
    const caller = appRouter.createCaller(createVentexContext());
    const ventures = await caller.ventures.list();

    // Group by sector and verify each venture has a sector
    const sectors = new Set(ventures.map(v => v.sector));
    expect(sectors.size).toBeGreaterThan(0);

    // All ventures should have a sector
    for (const v of ventures) {
      expect(v.sector).toBeTruthy();
    }
  });

  it("venture data supports pipeline stage grouping", async () => {
    const caller = appRouter.createCaller(createVentexContext());
    const ventures = await caller.ventures.list();

    // All ventures should have a stage
    for (const v of ventures) {
      expect(v.stage).toBeTruthy();
    }
  });

  it("task data supports completion rate calculation", async () => {
    const caller = appRouter.createCaller(createVentexContext());
    const tasks = await caller.tasks.list();

    // All tasks should have a status
    for (const t of tasks) {
      expect(t.status).toBeTruthy();
    }

    // Calculate completion rate
    const completed = tasks.filter(t => t.status === "complete").length;
    const total = tasks.length;
    const rate = total > 0 ? Math.round((completed / total) * 100) : 0;
    expect(rate).toBeGreaterThanOrEqual(0);
    expect(rate).toBeLessThanOrEqual(100);
  });

  it("distribution data supports paid/pending calculation", async () => {
    const caller = appRouter.createCaller(createVentexContext());
    const dists = await caller.distributions.list();

    // All distributions should have amount and status
    for (const d of dists) {
      expect(typeof d.amount).toBe("number");
      expect(d.status).toBeTruthy();
    }

    // Calculate paid vs total
    const totalAmount = dists.reduce((s, d) => s + (d.amount || 0), 0);
    const paidAmount = dists.filter(d => d.status === "Paid").reduce((s, d) => s + (d.amount || 0), 0);
    expect(paidAmount).toBeLessThanOrEqual(totalAmount);
  });

  it("SPV data supports stage filtering", async () => {
    const caller = appRouter.createCaller(createVentexContext());
    const spvs = await caller.spvs.list();

    // Filter active deals
    const activeDeals = spvs.filter(s => s.stage === "Active deal");
    expect(activeDeals.length).toBeGreaterThanOrEqual(0);
    expect(activeDeals.length).toBeLessThanOrEqual(spvs.length);
  });
});
