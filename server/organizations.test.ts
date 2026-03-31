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
  // Client user — belongs to a client org (not ATLAS org 1)
  // With the new isAtlasTeam logic, user/manager with orgId=1 or null are Atlas team
  const user: AuthenticatedUser = {
    id: 3,
    openId: "regular-user",
    email: "user@client.io",
    name: "Regular User",
    loginMethod: "manus",
    role: "user",
    organizationId: 999,
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

  it("returns scoped data for non-Atlas client users (not rejected)", async () => {
    const ctx = createRegularUserContext();
    const caller = appRouter.createCaller(ctx);
    // Non-Atlas users get their own org data (or empty array), not a rejection
    const result = await caller.organizations.list();
    expect(Array.isArray(result)).toBe(true);
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

  it("returns scoped data for non-Atlas client users (not rejected)", async () => {
    const ctx = createRegularUserContext();
    const caller = appRouter.createCaller(ctx);
    // Non-Atlas users get their own org data (or empty array), not a rejection
    const result = await caller.organizations.listWithMetrics();
    expect(Array.isArray(result)).toBe(true);
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

describe("organizations.delete", () => {
  it("rejects non-admin users", async () => {
    const ctx = createRegularUserContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.organizations.delete({ id: 999999 })
    ).rejects.toThrow();
  });

  it("throws for non-existent org", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.organizations.delete({ id: 999999 })
    ).rejects.toThrow("Organization not found");
  });

  it("can create and then delete a client org", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    // Create a temp org
    const slug = "delete-test-" + Date.now();
    const created = await caller.organizations.create({
      name: "Delete Test Client",
      slug,
    });
    expect(created).toBeTruthy();
    expect(created.slug).toBe(slug);

    // Delete it
    const result = await caller.organizations.delete({ id: created.id });
    expect(result.success).toBe(true);
    expect(result.name).toBe("Delete Test Client");

    // Verify it's gone
    const found = await caller.organizations.bySlug({ slug });
    expect(found).toBeNull();
  });
});

describe("distributions (per-client scoping)", () => {
  it("list returns array for admin", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.distributions.list();
    expect(Array.isArray(result)).toBe(true);
  });

  it("list filters by organizationId when provided", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    // Get all distributions
    const all = await caller.distributions.list();

    // Filter by a non-existent org — should return empty
    const filtered = await caller.distributions.list({ organizationId: 999999 });
    expect(filtered.length).toBe(0);
  });

  it("metrics returns totals", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);
    const metrics = await caller.distributions.metrics();
    expect(metrics).toHaveProperty("total");
    expect(metrics).toHaveProperty("paid");
    expect(metrics).toHaveProperty("totalAmount");
    expect(metrics).toHaveProperty("paidAmount");
    expect(typeof metrics.total).toBe("number");
    expect(typeof metrics.totalAmount).toBe("number");
  });

  it("metrics scoped by org returns zeroes for non-existent org", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);
    const metrics = await caller.distributions.metrics({ organizationId: 999999 });
    expect(metrics.total).toBe(0);
    expect(metrics.totalAmount).toBe(0);
  });

  it("create rejects non-admin users", async () => {
    const ctx = createRegularUserContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.distributions.create({
        name: "Test Dist",
        amount: 1000,
      })
    ).rejects.toThrow();
  });
});

describe("organizations.archive", () => {
  it("rejects non-admin users", async () => {
    const ctx = createRegularUserContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.organizations.archive({ id: 999999 })
    ).rejects.toThrow();
  });

  it("throws for non-existent org", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.organizations.archive({ id: 999999 })
    ).rejects.toThrow("Organization not found");
  });

  it("can create, archive, and verify status", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    // Create a temp org
    const slug = "archive-test-" + Date.now();
    const created = await caller.organizations.create({
      name: "Archive Test Client",
      slug,
    });
    expect(created).toBeTruthy();
    expect(created.status).toBe("active");

    // Archive it
    const result = await caller.organizations.archive({ id: created.id });
    expect(result.success).toBe(true);
    expect(result.name).toBe("Archive Test Client");

    // Verify it's archived
    const found = await caller.organizations.bySlug({ slug });
    expect(found).not.toBeNull();
    expect(found!.status).toBe("archived");

    // Clean up — delete it
    await caller.organizations.delete({ id: created.id });
  });

  it("throws when archiving an already archived org", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const slug = "archive-double-" + Date.now();
    const created = await caller.organizations.create({
      name: "Double Archive Test",
      slug,
    });

    await caller.organizations.archive({ id: created.id });

    // Try to archive again
    await expect(
      caller.organizations.archive({ id: created.id })
    ).rejects.toThrow("Organization is already archived");

    // Clean up
    await caller.organizations.delete({ id: created.id });
  });
});

describe("organizations.restore", () => {
  it("rejects non-admin users", async () => {
    const ctx = createRegularUserContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.organizations.restore({ id: 999999 })
    ).rejects.toThrow();
  });

  it("throws for non-existent org", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.organizations.restore({ id: 999999 })
    ).rejects.toThrow("Organization not found");
  });

  it("can archive and then restore a client org", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const slug = "restore-test-" + Date.now();
    const created = await caller.organizations.create({
      name: "Restore Test Client",
      slug,
    });

    // Archive
    await caller.organizations.archive({ id: created.id });
    let found = await caller.organizations.bySlug({ slug });
    expect(found!.status).toBe("archived");

    // Restore
    const result = await caller.organizations.restore({ id: created.id });
    expect(result.success).toBe(true);
    expect(result.name).toBe("Restore Test Client");

    // Verify it's active again
    found = await caller.organizations.bySlug({ slug });
    expect(found!.status).toBe("active");

    // Clean up
    await caller.organizations.delete({ id: created.id });
  });

  it("throws when restoring a non-archived org", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const slug = "restore-active-" + Date.now();
    const created = await caller.organizations.create({
      name: "Active Restore Test",
      slug,
    });

    // Try to restore an active org
    await expect(
      caller.organizations.restore({ id: created.id })
    ).rejects.toThrow("Organization is not archived");

    // Clean up
    await caller.organizations.delete({ id: created.id });
  });
});

describe("organizations.listWithMetrics (includeArchived)", () => {
  it("default excludes archived orgs", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const slug = "metrics-archived-" + Date.now();
    const created = await caller.organizations.create({
      name: "Metrics Archived Test",
      slug,
    });

    // Archive it
    await caller.organizations.archive({ id: created.id });

    // Default list should NOT include it
    const defaultList = await caller.organizations.listWithMetrics();
    const found = defaultList.find(o => o.id === created.id);
    expect(found).toBeUndefined();

    // includeArchived should include it
    const fullList = await caller.organizations.listWithMetrics({ includeArchived: true });
    const foundFull = fullList.find(o => o.id === created.id);
    expect(foundFull).toBeTruthy();
    expect(foundFull!.status).toBe("archived");

    // Clean up
    await caller.organizations.delete({ id: created.id });
  });
});

describe("organizations.list (includeArchived)", () => {
  it("default excludes archived orgs", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const slug = "list-archived-" + Date.now();
    const created = await caller.organizations.create({
      name: "List Archived Test",
      slug,
    });

    await caller.organizations.archive({ id: created.id });

    // Default should exclude
    const defaultList = await caller.organizations.list();
    const found = defaultList.find(o => o.id === created.id);
    expect(found).toBeUndefined();

    // includeArchived should include
    const fullList = await caller.organizations.list({ includeArchived: true });
    const foundFull = fullList.find(o => o.id === created.id);
    expect(foundFull).toBeTruthy();

    // Clean up
    await caller.organizations.delete({ id: created.id });
  });
});

describe("velocity metrics calculation", () => {
  it("listWithMetrics returns data needed for velocity calculation", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.organizations.listWithMetrics();
    for (const org of result) {
      // All fields needed for velocity formula exist and are numbers
      expect(typeof org.completionRate).toBe("number");
      expect(typeof org.avgHealth).toBe("number");
      expect(typeof org.overdueTasks).toBe("number");
      expect(typeof org.totalTasks).toBe("number");

      // Velocity = 40% completionRate + 30% avgHealth + 30% (100 - overdueRate)
      const overdueRate = org.totalTasks > 0 ? (org.overdueTasks / org.totalTasks) * 100 : 0;
      const velocity = Math.round(
        org.completionRate * 0.4 +
        org.avgHealth * 0.3 +
        (100 - overdueRate) * 0.3
      );
      // Velocity should be between 0 and 100
      expect(velocity).toBeGreaterThanOrEqual(0);
      expect(velocity).toBeLessThanOrEqual(100);
    }
  });

  it("avgHealth is between 0 and 100", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.organizations.listWithMetrics();
    for (const org of result) {
      expect(org.avgHealth).toBeGreaterThanOrEqual(0);
      expect(org.avgHealth).toBeLessThanOrEqual(100);
    }
  });

  it("overdueTasks is non-negative and <= totalTasks", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.organizations.listWithMetrics();
    for (const org of result) {
      expect(org.overdueTasks).toBeGreaterThanOrEqual(0);
      expect(org.overdueTasks).toBeLessThanOrEqual(org.totalTasks);
    }
  });

  it("completedTasks + openTasks equals totalTasks", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.organizations.listWithMetrics();
    for (const org of result) {
      expect(org.completedTasks + org.openTasks).toBe(org.totalTasks);
    }
  });
});

describe("sidebar refresh: list excludes archived after archive", () => {
  it("archived org disappears from default list (sidebar source)", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const slug = "sidebar-refresh-" + Date.now();
    const created = await caller.organizations.create({
      name: "Sidebar Refresh Test",
      slug,
    });

    // Verify it appears in default list
    let list = await caller.organizations.list();
    expect(list.some(o => o.id === created.id)).toBe(true);

    // Archive it
    await caller.organizations.archive({ id: created.id });

    // Verify it no longer appears in default list (this is what the sidebar reads)
    list = await caller.organizations.list();
    expect(list.some(o => o.id === created.id)).toBe(false);

    // Clean up
    await caller.organizations.delete({ id: created.id });
  });

  it("deleted org disappears from default list (sidebar source)", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const slug = "sidebar-delete-" + Date.now();
    const created = await caller.organizations.create({
      name: "Sidebar Delete Test",
      slug,
    });

    // Verify it appears in default list
    let list = await caller.organizations.list();
    expect(list.some(o => o.id === created.id)).toBe(true);

    // Delete it
    await caller.organizations.delete({ id: created.id });

    // Verify it no longer appears in default list
    list = await caller.organizations.list();
    expect(list.some(o => o.id === created.id)).toBe(false);
  });

  it("restored org reappears in default list (sidebar source)", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const slug = "sidebar-restore-" + Date.now();
    const created = await caller.organizations.create({
      name: "Sidebar Restore Test",
      slug,
    });

    // Archive
    await caller.organizations.archive({ id: created.id });
    let list = await caller.organizations.list();
    expect(list.some(o => o.id === created.id)).toBe(false);

    // Restore
    await caller.organizations.restore({ id: created.id });
    list = await caller.organizations.list();
    expect(list.some(o => o.id === created.id)).toBe(true);

    // Clean up
    await caller.organizations.delete({ id: created.id });
  });
});
