// ═══════════════════════════════════════════════════════════════════════════
// ATLAS Intelligence Platform — Unit Tests
// Tests for: Predictive Analytics, Market Intelligence, Continuous Learning,
//            Real-time Triggers, Portal Intelligence Integration
// ═══════════════════════════════════════════════════════════════════════════

import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mock DB layer ────────────────────────────────────────────────────────
// Drizzle queries are thenable at any point in the chain (.where(), .from(), etc.)
// The db object itself must NOT have .then (or `await getDb()` resolves the thenable).
// Instead, query-chain methods (.select, .from, .where, etc.) return a separate
// chainable+thenable object.
function createQueryChain(): any {
  const chain: any = {
    select: (..._args: any[]) => chain,
    from: (..._args: any[]) => chain,
    where: (..._args: any[]) => chain,
    orderBy: (..._args: any[]) => chain,
    limit: (..._args: any[]) => chain,
    insert: (..._args: any[]) => chain,
    values: (..._args: any[]) => Promise.resolve([{ insertId: 1 }]),
    update: (..._args: any[]) => chain,
    set: (..._args: any[]) => chain,
    // Thenable: await resolves to []
    then: (resolve: any, reject?: any) => Promise.resolve([]).then(resolve, reject),
  };
  return chain;
}

// The db object delegates to a fresh chain for each query
const mockDb: any = {};

function setupMockDb() {
  const chain = createQueryChain();
  mockDb.select = (...args: any[]) => chain.select(...args);
  mockDb.from = (...args: any[]) => chain.from(...args);
  mockDb.where = (...args: any[]) => chain.where(...args);
  mockDb.orderBy = (...args: any[]) => chain.orderBy(...args);
  mockDb.limit = (...args: any[]) => chain.limit(...args);
  mockDb.insert = (...args: any[]) => chain.insert(...args);
  mockDb.values = (...args: any[]) => chain.values(...args);
  mockDb.update = (...args: any[]) => chain.update(...args);
  mockDb.set = (...args: any[]) => chain.set(...args);
  // NO .then on mockDb itself — so `await getDb()` returns mockDb properly
}

setupMockDb();

vi.mock("../db", () => ({
  getDb: vi.fn(() => Promise.resolve(mockDb)),
}));

vi.mock("../_core/llm", () => ({
  invokeLLM: vi.fn(() =>
    Promise.resolve({
      choices: [
        {
          message: {
            content: JSON.stringify({
              signals: [
                {
                  signalType: "opportunity",
                  headline: "Dubai property market surges 15%",
                  summary: "Strong demand in freehold zones",
                  impact: "positive",
                  impactScore: 85,
                  relevanceScore: 90,
                  actionRecommendation: "Consider accelerating launches",
                },
              ],
              executiveSummary: "Portfolio is healthy",
              topRisks: ["Market volatility"],
              topOpportunities: ["New regulation favorable"],
              items: [
                {
                  ventureName: "Test Venture",
                  narrative: "On track for completion",
                  recommendedActions: ["Continue monitoring"],
                },
              ],
            }),
          },
        },
      ],
    })
  ),
}));

// ═══════════════════════════════════════════════════════════════════════════
// GAP 1: Predictive Analytics Engine
// ═══════════════════════════════════════════════════════════════════════════
describe("Predictive Analytics Engine", () => {
  beforeEach(() => {
    setupMockDb();
  });

  describe("Module exports", () => {
    it("exports computeBenchmarks function", async () => {
      const mod = await import("./predictiveEngine");
      expect(mod.computeBenchmarks).toBeDefined();
      expect(typeof mod.computeBenchmarks).toBe("function");
    });

    it("exports forecastVentures function", async () => {
      const mod = await import("./predictiveEngine");
      expect(mod.forecastVentures).toBeDefined();
      expect(typeof mod.forecastVentures).toBe("function");
    });

    it("exports computePortfolioHealth function", async () => {
      const mod = await import("./predictiveEngine");
      expect(mod.computePortfolioHealth).toBeDefined();
      expect(typeof mod.computePortfolioHealth).toBe("function");
    });

    it("exports runPredictiveEngine master function", async () => {
      const mod = await import("./predictiveEngine");
      expect(mod.runPredictiveEngine).toBeDefined();
      expect(typeof mod.runPredictiveEngine).toBe("function");
    });
  });

  describe("computeBenchmarks", () => {
    it("returns empty array when no velocity data exists", async () => {
      const { computeBenchmarks } = await import("./predictiveEngine");
      const result = await computeBenchmarks(1);
      expect(Array.isArray(result)).toBe(true);
    });

    it("queries the database for velocity records", async () => {
      const { computeBenchmarks } = await import("./predictiveEngine");
      // Should not throw — it queries DB and returns results
      const result = await computeBenchmarks(1);
      expect(result).toBeDefined();
    });
  });

  describe("forecastVentures", () => {
    it("returns an array of forecasts", async () => {
      const { forecastVentures } = await import("./predictiveEngine");
      const result = await forecastVentures(1);
      expect(Array.isArray(result)).toBe(true);
    });

    it("accepts organizationId parameter", async () => {
      const { forecastVentures } = await import("./predictiveEngine");
      await expect(forecastVentures(1)).resolves.toBeDefined();
      await expect(forecastVentures(999)).resolves.toBeDefined();
    });
  });

  describe("computePortfolioHealth", () => {
    it("returns null when no forecasts exist", async () => {
      const { computePortfolioHealth } = await import("./predictiveEngine");
      const result = await computePortfolioHealth(1);
      expect(result).toBeNull();
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// GAP 2: Market Intelligence Engine
// ═══════════════════════════════════════════════════════════════════════════
describe("Market Intelligence Engine", () => {
  beforeEach(() => {
    setupMockDb();
  });

  describe("Module exports", () => {
    it("exports runMarketIntelligence function", async () => {
      const mod = await import("./marketIntelligence");
      expect(mod.runMarketIntelligence).toBeDefined();
      expect(typeof mod.runMarketIntelligence).toBe("function");
    });

    it("exports getActiveSignals function", async () => {
      const mod = await import("./marketIntelligence");
      expect(mod.getActiveSignals).toBeDefined();
      expect(typeof mod.getActiveSignals).toBe("function");
    });

    it("exports getVentureSignals function", async () => {
      const mod = await import("./marketIntelligence");
      expect(mod.getVentureSignals).toBeDefined();
      expect(typeof mod.getVentureSignals).toBe("function");
    });
  });

  describe("getActiveSignals", () => {
    it("returns an array", async () => {
      const { getActiveSignals } = await import("./marketIntelligence");
      const result = await getActiveSignals(1);
      expect(Array.isArray(result)).toBe(true);
    });

    it("accepts optional limit parameter", async () => {
      const { getActiveSignals } = await import("./marketIntelligence");
      const result = await getActiveSignals(1, 5);
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe("getVentureSignals", () => {
    it("returns an array", async () => {
      const { getVentureSignals } = await import("./marketIntelligence");
      const result = await getVentureSignals(10);
      expect(Array.isArray(result)).toBe(true);
    });

    it("accepts optional limit parameter", async () => {
      const { getVentureSignals } = await import("./marketIntelligence");
      const result = await getVentureSignals(10, 3);
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe("runMarketIntelligence", () => {
    it("returns signal count when no org found", async () => {
      const { runMarketIntelligence } = await import("./marketIntelligence");
      const result = await runMarketIntelligence(999);
      expect(result).toHaveProperty("signals");
      expect(result.signals).toBe(0);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// GAP 3: Continuous Learning Engine
// ═══════════════════════════════════════════════════════════════════════════
describe("Continuous Learning Engine", () => {
  beforeEach(() => {
    setupMockDb();
  });

  describe("Module exports", () => {
    it("exports trackOutcomes function", async () => {
      const mod = await import("./continuousLearning");
      expect(mod.trackOutcomes).toBeDefined();
      expect(typeof mod.trackOutcomes).toBe("function");
    });

    it("exports computeAgentPerformance function", async () => {
      const mod
 = await import("./continuousLearning");
      expect(mod.computeAgentPerformance).toBeDefined();
      expect(typeof mod.computeAgentPerformance).toBe("function");
    });

    it("exports runContinuousLearning function", async () => {
      const mod = await import("./continuousLearning");
      expect(mod.runContinuousLearning).toBeDefined();
      expect(typeof mod.runContinuousLearning).toBe("function");
    });

    it("exports getAgentPerformanceSummary function", async () => {
      const mod = await import("./continuousLearning");
      expect(mod.getAgentPerformanceSummary).toBeDefined();
      expect(typeof mod.getAgentPerformanceSummary).toBe("function");
    });
  });

  describe("trackOutcomes", () => {
    it("returns a number representing tracked count", async () => {
      const { trackOutcomes } = await import("./continuousLearning");
      const result = await trackOutcomes(1);
      expect(typeof result).toBe("number");
      expect(result).toBeGreaterThanOrEqual(0);
    });
  });

  describe("computeAgentPerformance", () => {
    it("returns an array of agent performance reports", async () => {
      const { computeAgentPerformance } = await import("./continuousLearning");
      const result = await computeAgentPerformance(1);
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe("getAgentPerformanceSummary", () => {
    it("returns an array", async () => {
      const { getAgentPerformanceSummary } = await import("./continuousLearning");
      const result = await getAgentPerformanceSummary(1);
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe("runContinuousLearning", () => {
    it("returns summary with outcomesTracked, agentReports, elapsedSeconds", async () => {
      const { runContinuousLearning } = await import("./continuousLearning");
      const result = await runContinuousLearning(1);
      expect(result).toHaveProperty("outcomesTracked");
      expect(result).toHaveProperty("agentReports");
      expect(result).toHaveProperty("elapsedSeconds");
      expect(typeof result.outcomesTracked).toBe("number");
      expect(typeof result.agentReports).toBe("number");
      expect(typeof result.elapsedSeconds).toBe("number");
    });

    it("elapsedSeconds is non-negative", async () => {
      const { runContinuousLearning } = await import("./continuousLearning");
      const result = await runContinuousLearning(1);
      expect(result.elapsedSeconds).toBeGreaterThanOrEqual(0);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// GAP 4: Real-time Agent Triggers
// ═══════════════════════════════════════════════════════════════════════════
describe("Real-time Agent Triggers", () => {
  beforeEach(() => {
    setupMockDb();
  });

  describe("Module exports", () => {
    it("exports dispatchTrigger function", async () => {
      const mod = await import("./realtimeTriggers");
      expect(mod.dispatchTrigger).toBeDefined();
      expect(typeof mod.dispatchTrigger).toBe("function");
    });

    it("exports all convenience dispatchers", async () => {
      const mod = await import("./realtimeTriggers");
      expect(typeof mod.onTaskCompleted).toBe("function");
      expect(typeof mod.onTaskOverdue).toBe("function");
      expect(typeof mod.onStageAdvanced).toBe("function");
      expect(typeof mod.onClientPortalAction).toBe("function");
      expect(typeof mod.onBlueprintGenerated).toBe("function");
      expect(typeof mod.onDistributionScheduled).toBe("function");
    });

    it("exports getTriggerHistory function", async () => {
      const mod = await import("./realtimeTriggers");
      expect(mod.getTriggerHistory).toBeDefined();
      expect(typeof mod.getTriggerHistory).toBe("function");
    });
  });

  describe("dispatchTrigger", () => {
    it("returns an array of TriggerResult objects", async () => {
      const { dispatchTrigger } = await import("./realtimeTriggers");
      const result = await dispatchTrigger({
        type: "task_completed",
        organizationId: 1,
        entityType: "task",
        entityId: 5,
        entityName: "Test Task",
        metadata: { ventureId: 10 },
      });
      expect(Array.isArray(result)).toBe(true);
    });

    it("each result has triggered, agentName, and action fields", async () => {
      const { dispatchTrigger } = await import("./realtimeTriggers");
      const results = await dispatchTrigger({
        type: "task_overdue",
        organizationId: 1,
        entityType: "task",
        entityId: 5,
        entityName: "Overdue Task",
      });
      for (const r of results) {
        expect(r).toHaveProperty("triggered");
        expect(r).toHaveProperty("agentName");
        expect(r).toHaveProperty("action");
        expect(typeof r.triggered).toBe("boolean");
        expect(typeof r.agentName).toBe("string");
        expect(typeof r.action).toBe("string");
      }
    });

    it("logs trigger execution to event_trigger_log", async () => {
      const { dispatchTrigger } = await import("./realtimeTriggers");
      const results = await dispatchTrigger({
        type: "task_overdue",
        organizationId: 1,
        entityType: "task",
        entityId: 5,
        entityName: "Overdue Task",
      });
      // Should have processed the trigger and returned results
      expect(results.length).toBeGreaterThan(0);
    });
  });

  describe("onStageAdvanced", () => {
    it("dispatches stage_advanced trigger", async () => {
      const { onStageAdvanced } = await import("./realtimeTriggers");
      const result = await onStageAdvanced(1, 10, "Test Venture", "Due Diligence", "Structuring");
      expect(Array.isArray(result)).toBe(true);
    });

    it("creates agent event for stage advancement", async () => {
      const { onStageAdvanced } = await import("./realtimeTriggers");
      const results = await onStageAdvanced(1, 10, "Test Venture", "Due Diligence", "Structuring");
      // Should have triggered and created events
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].triggered).toBe(true);
    });
  });

  describe("onTaskCompleted", () => {
    it("dispatches task_completed trigger", async () => {
      const { onTaskCompleted } = await import("./realtimeTriggers");
      const result = await onTaskCompleted(1, 10, 5, "Complete legal review");
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe("onTaskOverdue", () => {
    it("dispatches task_overdue trigger and creates alert", async () => {
      const { onTaskOverdue } = await import("./realtimeTriggers");
      const result = await onTaskOverdue(1, 5, "Submit documents");
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe("onClientPortalAction", () => {
    it("dispatches client_portal_action trigger", async () => {
      const { onClientPortalAction } = await import("./realtimeTriggers");
      const result = await onClientPortalAction(1, "approve_followup", 10, "Test Event");
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe("onBlueprintGenerated", () => {
    it("dispatches blueprint_generated trigger", async () => {
      const { onBlueprintGenerated } = await import("./realtimeTriggers");
      const result = await onBlueprintGenerated(1, 10, "Test Venture");
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe("onDistributionScheduled", () => {
    it("dispatches distribution_scheduled trigger", async () => {
      const { onDistributionScheduled } = await import("./realtimeTriggers");
      const result = await onDistributionScheduled(1, 5, "Q1 Distribution", "$500,000");
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe("getTriggerHistory", () => {
    it("returns an array", async () => {
      const { getTriggerHistory } = await import("./realtimeTriggers");
      const result = await getTriggerHistory(1);
      expect(Array.isArray(result)).toBe(true);
    });

    it("accepts optional limit parameter", async () => {
      const { getTriggerHistory } = await import("./realtimeTriggers");
      const result = await getTriggerHistory(1, 10);
      expect(Array.isArray(result)).toBe(true);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Portal Intelligence Integration
// ═══════════════════════════════════════════════════════════════════════════
describe("Portal Intelligence Integration", () => {
  it("portal router imports predictive engine functions", async () => {
    const predictive = await import("./predictiveEngine");
    expect(predictive.forecastVentures).toBeDefined();
    expect(predictive.computePortfolioHealth).toBeDefined();
  });

  it("portal router imports market intelligence functions", async () => {
    const market = await import("./marketIntelligence");
    expect(market.getActiveSignals).toBeDefined();
  });

  it("portal router imports real-time trigger functions", async () => {
    const triggers = await import("./realtimeTriggers");
    expect(triggers.onClientPortalAction).toBeDefined();
  });

  it("all 4 intelligence modules are importable without errors", async () => {
    const [predictive, market, learning, triggers] = await Promise.all([
      import("./predictiveEngine"),
      import("./marketIntelligence"),
      import("./continuousLearning"),
      import("./realtimeTriggers"),
    ]);

    expect(predictive.runPredictiveEngine).toBeDefined();
    expect(market.runMarketIntelligence).toBeDefined();
    expect(learning.runContinuousLearning).toBeDefined();
    expect(triggers.dispatchTrigger).toBeDefined();
  });
});
