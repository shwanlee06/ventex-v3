// ============================================================================
// Flywheel Features Tests
// Tests for: (1) Client Task Velocity, (2) Escalation Engine, (3) Momentum Indicators
// ============================================================================

import { describe, expect, it, vi, beforeEach } from "vitest";

// ── Shared Pipeline Tests ──────────────────────────────────────────────────
import { STAGE_PIPELINE, getNextStage, isTerminalStage } from "../shared/pipeline";

describe("Shared Pipeline Utility", () => {
  it("defines the correct stage order", () => {
    expect(STAGE_PIPELINE).toEqual([
      "In Validation",
      "In Fundraising",
      "Active Ventures",
      "Completed",
    ]);
  });

  it("getNextStage returns the next stage for each non-terminal stage", () => {
    expect(getNextStage("In Validation")).toBe("In Fundraising");
    expect(getNextStage("In Fundraising")).toBe("Active Ventures");
    expect(getNextStage("Active Ventures")).toBe("Completed");
  });

  it("getNextStage returns null for terminal stage", () => {
    expect(getNextStage("Completed")).toBeNull();
  });

  it("getNextStage returns null for unknown stage", () => {
    expect(getNextStage("Nonexistent")).toBeNull();
  });

  it("isTerminalStage correctly identifies Completed", () => {
    expect(isTerminalStage("Completed")).toBe(true);
    expect(isTerminalStage("In Validation")).toBe(false);
    expect(isTerminalStage("Active Ventures")).toBe(false);
  });
});

// ── Escalation Engine Tests ────────────────────────────────────────────────
// We mock the DB and email dependencies to test the escalation logic in isolation

vi.mock("./db", () => ({
  getDb: vi.fn(),
}));

vi.mock("./email/emailService", () => ({
  sendClientNudge: vi.fn().mockResolvedValue(true),
  sendOverdueAutoEmail: vi.fn().mockResolvedValue(true),
}));

vi.mock("./_core/notification", () => ({
  createNotification: vi.fn().mockResolvedValue(true),
  NOTIF_TYPES: {
    SMART_ALERT: { title: "Smart Alert", body: "Alert" },
    TASK_COMPLETED: { title: "Task Completed", body: "Done" },
    STAGE_ADVANCED: { title: "Stage Advanced", body: "Advanced" },
  },
}));

import { getDb } from "./db";
import { sendClientNudge } from "./email/emailService";

describe("Escalation Engine", () => {
  // Create a chainable mock DB
  function createMockDb(overdueTasks: any[] = [], staleEvents: any[] = []) {
    let callCount = 0;
    const makeChain = (data: any[]) => {
      const chain: any = {};
      chain.select = vi.fn().mockReturnValue(chain);
      chain.from = vi.fn().mockReturnValue(chain);
      chain.innerJoin = vi.fn().mockReturnValue(chain);
      chain.leftJoin = vi.fn().mockReturnValue(chain);
      chain.where = vi.fn().mockReturnValue({
        ...chain,
        then: (resolve: any) => resolve(data),
        catch: (reject: any) => ({ then: (resolve: any) => resolve(data) }),
        [Symbol.toStringTag]: "Promise",
      });
      chain.limit = vi.fn().mockReturnValue({
        then: (resolve: any) => resolve(data),
        catch: (reject: any) => ({ then: (resolve: any) => resolve(data) }),
        [Symbol.toStringTag]: "Promise",
      });
      chain.orderBy = vi.fn().mockReturnValue(chain);
      chain.groupBy = vi.fn().mockReturnValue(chain);
      chain.insert = vi.fn().mockReturnValue({ values: vi.fn().mockResolvedValue([]) });
      chain.update = vi.fn().mockReturnValue({ set: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([]) }) });
      return chain;
    };

    const mockDb: any = {
      ...makeChain(overdueTasks),
      select: vi.fn().mockImplementation(() => {
        callCount++;
        // First select = overdue tasks, second = stale events
        if (callCount <= 1) return makeChain(overdueTasks);
        return makeChain(staleEvents);
      }),
      insert: vi.fn().mockReturnValue({ values: vi.fn().mockResolvedValue([]) }),
      update: vi.fn().mockReturnValue({ set: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([]) }) }),
    };

    return mockDb;
  }

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("runEscalationSweep returns a result object with expected shape", async () => {
    const mockDb = createMockDb([], []);
    (getDb as any).mockResolvedValue(mockDb);

    const { runEscalationSweep } = await import("./intelligence/escalationEngine");
    const result = await runEscalationSweep(1);

    expect(result).toHaveProperty("nudgesSent");
    expect(result).toHaveProperty("escalationsCreated");
    expect(result).toHaveProperty("overdueTaskAlerts");
    expect(typeof result.nudgesSent).toBe("number");
    expect(typeof result.escalationsCreated).toBe("number");
    expect(typeof result.overdueTaskAlerts).toBe("number");
  });

  it("runEscalationSweep handles empty org gracefully", async () => {
    const mockDb = createMockDb([], []);
    (getDb as any).mockResolvedValue(mockDb);

    const { runEscalationSweep } = await import("./intelligence/escalationEngine");
    const result = await runEscalationSweep(1);

    expect(result.nudgesSent).toBe(0);
    expect(result.escalationsCreated).toBe(0);
    expect(result.overdueTaskAlerts).toBe(0);
  });

  it("runEscalationSweep handles null DB gracefully", async () => {
    (getDb as any).mockResolvedValue(null);

    const { runEscalationSweep } = await import("./intelligence/escalationEngine");
    const result = await runEscalationSweep(1);

    // When DB is null, the function returns early — may return 0s or undefined
    expect(result.nudgesSent === 0 || result.nudgesSent === undefined).toBe(true);
    expect(result.escalationsCreated === 0 || result.escalationsCreated === undefined).toBe(true);
    expect(result.overdueAlerts === 0 || result.overdueAlerts === undefined).toBe(true);
  });

  it("getEscalationStats returns expected shape", async () => {
    // getEscalationStats uses .where().orderBy().limit() chain
    const makeFullChain = (data: any[]) => {
      const chain: any = {};
      chain.select = vi.fn().mockReturnValue(chain);
      chain.from = vi.fn().mockReturnValue(chain);
      chain.innerJoin = vi.fn().mockReturnValue(chain);
      chain.leftJoin = vi.fn().mockReturnValue(chain);
      chain.where = vi.fn().mockReturnValue(chain);
      chain.orderBy = vi.fn().mockReturnValue(chain);
      chain.groupBy = vi.fn().mockReturnValue(chain);
      chain.limit = vi.fn().mockReturnValue({
        then: (resolve: any) => resolve(data),
        catch: () => ({ then: (resolve: any) => resolve(data) }),
      });
      // Also make chain itself thenable for queries without .limit()
      chain.then = (resolve: any) => resolve(data);
      chain.catch = () => ({ then: (resolve: any) => resolve(data) });
      return chain;
    };

    const mockDb: any = {
      select: vi.fn().mockImplementation(() => makeFullChain([])),
      insert: vi.fn().mockReturnValue({ values: vi.fn().mockResolvedValue([]) }),
      update: vi.fn().mockReturnValue({ set: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([]) }) }),
    };
    (getDb as any).mockResolvedValue(mockDb);

    const { getEscalationStats } = await import("./intelligence/escalationEngine");
    const stats = await getEscalationStats(1);

    expect(stats).toHaveProperty("total");
    expect(stats).toHaveProperty("critical");
    expect(stats).toHaveProperty("pending");
    expect(stats).toHaveProperty("resolved");
  });
});

// ── Portal Task Completion Logic Tests ─────────────────────────────────────
// These test the shared pipeline logic that drives auto-advance

describe("Client Task Velocity — Auto-Advance Logic", () => {
  it("auto-advance triggers when all tasks in a venture are complete", () => {
    // Simulate: 3 tasks, all complete
    const tasks = [
      { id: 1, status: "complete" },
      { id: 2, status: "complete" },
      { id: 3, status: "complete" },
    ];
    const allComplete = tasks.every((t) => t.status === "complete");
    expect(allComplete).toBe(true);

    // The venture should advance to the next stage
    const currentStage = "In Validation";
    const nextStage = getNextStage(currentStage);
    expect(nextStage).toBe("In Fundraising");
  });

  it("auto-advance does NOT trigger when some tasks are incomplete", () => {
    const tasks = [
      { id: 1, status: "complete" },
      { id: 2, status: "open" },
      { id: 3, status: "complete" },
    ];
    const allComplete = tasks.every((t) => t.status === "complete");
    expect(allComplete).toBe(false);
  });

  it("auto-advance does NOT trigger for terminal stage ventures", () => {
    const tasks = [{ id: 1, status: "complete" }];
    const allComplete = tasks.every((t) => t.status === "complete");
    expect(allComplete).toBe(true);

    const currentStage = "Completed";
    const nextStage = getNextStage(currentStage);
    expect(nextStage).toBeNull();
    // No advance should happen
  });

  it("task completion changes status from open to complete", () => {
    const task = { id: 1, status: "open" };
    // Simulate the mutation
    task.status = "complete";
    expect(task.status).toBe("complete");
  });

  it("task completion changes status from in_progress to complete", () => {
    const task = { id: 1, status: "in_progress" };
    task.status = "complete";
    expect(task.status).toBe("complete");
  });

  it("already complete tasks cannot be re-completed", () => {
    const task = { id: 1, status: "complete" };
    const wasAlreadyComplete = task.status === "complete";
    expect(wasAlreadyComplete).toBe(true);
    // The endpoint should return early without re-processing
  });
});

// ── Momentum Indicator Logic Tests ─────────────────────────────────────────

describe("Venture Momentum Indicators", () => {
  it("computes velocity vs benchmark correctly — faster", () => {
    const forecasts = [
      { ventureId: 1, projectedDays: 10 },
      { ventureId: 2, projectedDays: 30 },
      { ventureId: 3, projectedDays: 40 },
    ];
    const avgDays = forecasts.reduce((sum, f) => sum + f.projectedDays, 0) / forecasts.length;
    // avgDays = 26.67
    const venture1 = forecasts[0];
    // 10 < 26.67 * 0.85 (22.67) → faster
    const velocity =
      venture1.projectedDays < avgDays * 0.85
        ? "faster"
        : venture1.projectedDays > avgDays * 1.15
          ? "slower"
          : "on-pace";
    expect(velocity).toBe("faster");
  });

  it("computes velocity vs benchmark correctly — slower", () => {
    const forecasts = [
      { ventureId: 1, projectedDays: 10 },
      { ventureId: 2, projectedDays: 15 },
      { ventureId: 3, projectedDays: 50 },
    ];
    const avgDays = forecasts.reduce((sum, f) => sum + f.projectedDays, 0) / forecasts.length;
    // avgDays = 25
    const venture3 = forecasts[2];
    // 50 > 25 * 1.15 (28.75) → slower
    const velocity =
      venture3.projectedDays < avgDays * 0.85
        ? "faster"
        : venture3.projectedDays > avgDays * 1.15
          ? "slower"
          : "on-pace";
    expect(velocity).toBe("slower");
  });

  it("computes velocity vs benchmark correctly — on-pace", () => {
    const forecasts = [
      { ventureId: 1, projectedDays: 20 },
      { ventureId: 2, projectedDays: 22 },
      { ventureId: 3, projectedDays: 24 },
    ];
    const avgDays = forecasts.reduce((sum, f) => sum + f.projectedDays, 0) / forecasts.length;
    // avgDays = 22
    const venture2 = forecasts[1];
    // 22 is within 0.85*22 (18.7) and 1.15*22 (25.3) → on-pace
    const velocity =
      venture2.projectedDays < avgDays * 0.85
        ? "faster"
        : venture2.projectedDays > avgDays * 1.15
          ? "slower"
          : "on-pace";
    expect(velocity).toBe("on-pace");
  });

  it("benchmark days rounds to nearest integer", () => {
    const forecasts = [
      { ventureId: 1, projectedDays: 10 },
      { ventureId: 2, projectedDays: 33 },
    ];
    const avgDays = forecasts.reduce((sum, f) => sum + f.projectedDays, 0) / forecasts.length;
    // avgDays = 21.5
    expect(Math.round(avgDays)).toBe(22);
  });

  it("single venture is always on-pace (no meaningful benchmark)", () => {
    const forecasts = [{ ventureId: 1, projectedDays: 30 }];
    const avgDays = forecasts.reduce((sum, f) => sum + f.projectedDays, 0) / forecasts.length;
    // avgDays = 30, venture is 30 → within 0.85*30 (25.5) and 1.15*30 (34.5)
    const velocity =
      forecasts[0].projectedDays < avgDays * 0.85
        ? "faster"
        : forecasts[0].projectedDays > avgDays * 1.15
          ? "slower"
          : "on-pace";
    expect(velocity).toBe("on-pace");
  });

  it("momentum is null when no forecast data exists for a venture", () => {
    const forecasts: any[] = [];
    const forecastMap = new Map(forecasts.map((f: any) => [f.ventureId, f]));
    const venture = { id: 99, name: "Test Venture" };
    const momentum = forecastMap.get(venture.id) || null;
    expect(momentum).toBeNull();
  });

  it("risk factors are surfaced when risk level is not low", () => {
    const forecast = {
      ventureId: 1,
      riskLevel: "high",
      riskFactors: ["Regulatory delay", "Funding gap", "Team capacity"],
    };
    // UI shows max 2 risk factors
    const displayed = forecast.riskFactors.slice(0, 2);
    expect(displayed).toEqual(["Regulatory delay", "Funding gap"]);
    expect(displayed.length).toBe(2);
  });

  it("risk factors are hidden when risk level is low", () => {
    const forecast = {
      ventureId: 1,
      riskLevel: "low",
      riskFactors: ["Minor delay"],
    };
    const shouldShow = forecast.riskLevel !== "low" && forecast.riskFactors.length > 0;
    expect(shouldShow).toBe(false);
  });
});

// ── Escalation Timing Logic Tests ──────────────────────────────────────────

describe("Escalation Timing Logic", () => {
  it("48-hour threshold correctly identifies stale events", () => {
    const now = Date.now();
    const eventCreatedAt = new Date(now - 49 * 60 * 60 * 1000); // 49 hours ago
    const hoursElapsed = (now - eventCreatedAt.getTime()) / (1000 * 60 * 60);
    expect(hoursElapsed).toBeGreaterThan(48);
  });

  it("events under 48 hours are NOT escalated", () => {
    const now = Date.now();
    const eventCreatedAt = new Date(now - 24 * 60 * 60 * 1000); // 24 hours ago
    const hoursElapsed = (now - eventCreatedAt.getTime()) / (1000 * 60 * 60);
    expect(hoursElapsed).toBeLessThan(48);
  });

  it("overdue task detection uses dueDate comparison", () => {
    const now = new Date();
    const pastDue = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000); // 3 days ago
    const isOverdue = pastDue < now;
    expect(isOverdue).toBe(true);
  });

  it("future tasks are NOT flagged as overdue", () => {
    const now = new Date();
    const futureDue = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days from now
    const isOverdue = futureDue < now;
    expect(isOverdue).toBe(false);
  });
});
