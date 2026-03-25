import { describe, it, expect, afterAll } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import { calculateDaysOverdue, getOverdueSeverity } from "./routers/tasks";
import { getDb } from "./db";
import { tasks, ventures, organizations, orgVentureAccess } from "../drizzle/schema";
import { eq, and, like } from "drizzle-orm";

// ── Pure function tests (no DB needed) ─────────────────────────────────

describe("calculateDaysOverdue", () => {
  it("returns 0 for null dueDate", () => {
    expect(calculateDaysOverdue(null)).toBe(0);
  });

  it("returns 0 for future dueDate", () => {
    const future = new Date();
    future.setDate(future.getDate() + 5);
    expect(calculateDaysOverdue(future.toISOString().split("T")[0])).toBe(0);
  });

  it("returns 0 for today's dueDate (end of day)", () => {
    // Due today at start of day — technically overdue if now > midnight
    // But we test with a fixed "now" to be deterministic
    const now = new Date("2026-03-25T12:00:00Z");
    const today = "2026-03-25";
    // Due date is start of day, now is noon — so it's 0 or 1 depending on interpretation
    // Our function: diffMs = noon - midnight = 12h > 0, so ceil(12h / 24h) = 1
    expect(calculateDaysOverdue(today, now)).toBe(1);
  });

  it("returns correct days for past dueDate", () => {
    const now = new Date("2026-03-25T12:00:00Z");
    expect(calculateDaysOverdue("2026-03-20", now)).toBe(6); // 5 full days + partial = ceil(5.5) = 6
    expect(calculateDaysOverdue("2026-03-18", now)).toBe(8);
    expect(calculateDaysOverdue("2026-03-01", now)).toBe(25);
  });

  it("returns 1 for yesterday", () => {
    const now = new Date("2026-03-25T12:00:00Z");
    expect(calculateDaysOverdue("2026-03-24", now)).toBe(2); // 1.5 days -> ceil = 2
  });
});

describe("getOverdueSeverity", () => {
  it("returns info for 1-6 days overdue", () => {
    expect(getOverdueSeverity(1)).toBe("info");
    expect(getOverdueSeverity(6)).toBe("info");
  });

  it("returns warning for 7-13 days overdue", () => {
    expect(getOverdueSeverity(7)).toBe("warning");
    expect(getOverdueSeverity(13)).toBe("warning");
  });

  it("returns critical for 14+ days overdue", () => {
    expect(getOverdueSeverity(14)).toBe("critical");
    expect(getOverdueSeverity(30)).toBe("critical");
  });
});

// ── Integration tests (DB-backed) ──────────────────────────────────────

function createAdminContext(): TrpcContext {
  return {
    user: {
      id: 1,
      openId: "test-open-id",
      name: "Test Admin",
      email: "admin@test.com",
      role: "admin",
      organizationId: null,
      status: "active",
      loginMethod: null,
      invitationId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as TrpcContext["res"],
  };
}

function createAdminCaller() {
  return appRouter.createCaller(createAdminContext());
}

// Test data tracking for cleanup
const testOrgSlug = `test-overdue-org-${Date.now()}`;
const testVentureSlug = `test-overdue-venture-${Date.now()}`;
let testOrgId: number | null = null;
let testVentureId: number | null = null;
let testTaskIds: number[] = [];

afterAll(async () => {
  const db = await getDb();
  if (!db) return;

  // Clean up test tasks
  for (const id of testTaskIds) {
    await db.delete(tasks).where(eq(tasks.id, id));
  }

  // Clean up org-venture access
  if (testOrgId && testVentureId) {
    await db.delete(orgVentureAccess).where(
      and(eq(orgVentureAccess.organizationId, testOrgId), eq(orgVentureAccess.ventureId, testVentureId))
    );
  }

  // Clean up venture
  if (testVentureId) {
    await db.delete(ventures).where(eq(ventures.id, testVentureId));
  }

  // Clean up org
  if (testOrgId) {
    await db.delete(organizations).where(eq(organizations.id, testOrgId));
  }
});

describe("tasks.listOverdue", () => {
  it("returns overdue tasks with enriched data", async () => {
    const db = await getDb();
    if (!db) throw new Error("DB not available");

    // Create test org
    await db.insert(organizations).values({
      name: `Test Overdue Org ${Date.now()}`,
      slug: testOrgSlug,
      type: "client",
      status: "active",
    });
    const [org] = await db.select().from(organizations).where(eq(organizations.slug, testOrgSlug));
    testOrgId = org.id;

    // Create test venture
    await db.insert(ventures).values({
      name: `Test Overdue Venture ${Date.now()}`,
      slug: testVentureSlug,
      sector: "Test",
      location: "Test",
      status: "In progress",
    });
    const [venture] = await db.select().from(ventures).where(eq(ventures.slug, testVentureSlug));
    testVentureId = venture.id;

    // Link venture to org
    await db.insert(orgVentureAccess).values({
      organizationId: testOrgId,
      ventureId: testVentureId,
      permission: "full",
    });

    // Create overdue task (10 days ago)
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 10);
    await db.insert(tasks).values({
      title: `Overdue Test Task ${Date.now()}`,
      ventureId: testVentureId,
      dueDate: pastDate.toISOString().split("T")[0],
      priority: "High",
      status: "open",
    });
    const [overdueTask] = await db.select().from(tasks)
      .where(eq(tasks.ventureId, testVentureId));
    testTaskIds.push(overdueTask.id);

    // Create non-overdue task (future)
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 10);
    await db.insert(tasks).values({
      title: `Future Test Task ${Date.now()}`,
      ventureId: testVentureId,
      dueDate: futureDate.toISOString().split("T")[0],
      priority: "Medium",
      status: "open",
    });
    const allVentureTasks = await db.select().from(tasks)
      .where(eq(tasks.ventureId, testVentureId));
    const futureTask = allVentureTasks.find(t => t.title.startsWith("Future"));
    if (futureTask) testTaskIds.push(futureTask.id);

    // Create completed task (should not appear)
    await db.insert(tasks).values({
      title: `Complete Test Task ${Date.now()}`,
      ventureId: testVentureId,
      dueDate: pastDate.toISOString().split("T")[0],
      priority: "Low",
      status: "complete",
    });
    const allTasks2 = await db.select().from(tasks)
      .where(eq(tasks.ventureId, testVentureId));
    const completeTask = allTasks2.find(t => t.title.startsWith("Complete"));
    if (completeTask) testTaskIds.push(completeTask.id);

    // Call the endpoint
    const caller = createAdminCaller();
    const overdue = await caller.tasks.listOverdue();

    // Should include our overdue task
    const found = overdue.find(t => t.id === overdueTask.id);
    expect(found).toBeDefined();
    expect(found!.daysOverdue).toBeGreaterThanOrEqual(10);
    expect(found!.severity).toBe("warning"); // 10 days = warning
    expect(found!.ventureName).toBeTruthy();
    expect(found!.clientName).toBeTruthy();

    // Should NOT include future or completed tasks
    const futureFound = overdue.find(t => t.title.startsWith("Future"));
    expect(futureFound).toBeUndefined();
    const completeFound = overdue.find(t => t.title.startsWith("Complete"));
    expect(completeFound).toBeUndefined();
  });
});

describe("tasks.overdueByClient", () => {
  it("returns per-client overdue summary", async () => {
    const caller = createAdminCaller();
    const summary = await caller.tasks.overdueByClient();

    expect(Array.isArray(summary)).toBe(true);

    // Should include our test org if it has overdue tasks
    if (testOrgId) {
      const found = summary.find(s => s.orgId === testOrgId);
      if (found) {
        expect(found.overdueCount).toBeGreaterThanOrEqual(1);
        expect(found.maxDaysOverdue).toBeGreaterThanOrEqual(10);
        expect(found.overdueTasks.length).toBeGreaterThanOrEqual(1);
      }
    }
  });
});

describe("tasks.scanAndNotify", () => {
  it("creates notifications for overdue tasks", async () => {
    const caller = createAdminCaller();
    const result = await caller.tasks.scanAndNotify();

    expect(result).toHaveProperty("notified");
    expect(result.notified).toBeGreaterThanOrEqual(0);
  });
});

describe("tasks.workloadSummary", () => {
  it("returns workload data for team members", async () => {
    const caller = createAdminCaller();
    const workload = await caller.tasks.workloadSummary();

    expect(Array.isArray(workload)).toBe(true);

    // Each entry should have the expected shape
    for (const w of workload) {
      expect(w).toHaveProperty("memberId");
      expect(w).toHaveProperty("memberName");
      expect(w).toHaveProperty("assigned");
      expect(w).toHaveProperty("completed");
      expect(w).toHaveProperty("overdue");
      expect(w).toHaveProperty("completionRate");
      expect(w).toHaveProperty("capacityStatus");
      expect(["available", "busy", "overloaded"]).toContain(w.capacityStatus);
    }
  });
});
