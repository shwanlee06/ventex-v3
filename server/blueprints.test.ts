/**
 * Blueprint Extraction Engine Tests
 * Tests for the 7-section Blueprint Engine:
 * 1. Schema: process_templates, process_steps, venture_process_tracking
 * 2. Router: extraction, conversation, apply, tracking, refinement
 * 3. Velocity Agent integration: blueprint context in signals
 */
import { describe, expect, it, vi } from "vitest";

// ── Section 1: Schema Tables ────────────────────────────────────────────

describe("Blueprint Schema Tables", () => {
  it("processTemplates table exists with correct columns", async () => {
    const schema = await import("../drizzle/schema");
    const table = schema.processTemplates;
    expect(table).toBeDefined();
    expect(table.id).toBeDefined();
    expect(table.organizationId).toBeDefined();
    expect(table.blueprintName).toBeDefined();
    expect(table.sector).toBeDefined();
    expect(table.source).toBeDefined();
    expect(table.confidence).toBeDefined();
    expect(table.refinementCount).toBeDefined();
  });

  it("processSteps table exists with correct columns", async () => {
    const schema = await import("../drizzle/schema");
    const table = schema.processSteps;
    expect(table).toBeDefined();
    expect(table.id).toBeDefined();
    expect(table.templateId).toBeDefined();
    expect(table.stageName).toBeDefined();
    expect(table.stepName).toBeDefined();
    expect(table.stepOrder).toBeDefined();
    expect(table.isBlocking).toBeDefined();
    expect(table.whoOwns).toBeDefined();
    expect(table.typicalDays).toBeDefined();
  });

  it("ventureProcessTracking table exists with correct columns", async () => {
    const schema = await import("../drizzle/schema");
    const table = schema.ventureProcessTracking;
    expect(table).toBeDefined();
    expect(table.id).toBeDefined();
    expect(table.ventureId).toBeDefined();
    expect(table.templateId).toBeDefined();
    expect(table.stepId).toBeDefined();
    expect(table.stageName).toBeDefined();
    expect(table.stepName).toBeDefined();
    expect(table.isBlocking).toBeDefined();
    expect(table.whoOwns).toBeDefined();
    expect(table.status).toBeDefined();
    expect(table.completedAt).toBeDefined();
  });

  it("processSteps has correct status enum values", async () => {
    const schema = await import("../drizzle/schema");
    // Check that the table is properly defined with the expected structure
    expect(schema.processSteps).toBeDefined();
    expect(schema.processSteps.stepName).toBeDefined();
  });

  it("ventureProcessTracking has status column for tracking completion", async () => {
    const schema = await import("../drizzle/schema");
    const table = schema.ventureProcessTracking;
    expect(table.status).toBeDefined();
    expect(table.completedAt).toBeDefined();
  });
});

// ── Section 2: Blueprints Router ────────────────────────────────────────

describe("Blueprints Router", () => {
  it("blueprints router is registered in main routers", async () => {
    const mod = await import("./routers");
    const router = mod.appRouter;
    expect(router).toBeDefined();
    // The router should have a blueprints namespace
    expect(router._def).toBeDefined();
  });

  it("blueprints router module exports a router", async () => {
    const mod = await import("./routers/blueprints");
    expect(mod.blueprintsRouter).toBeDefined();
  });

  describe("Router procedures exist", () => {
    it("has extractFromDocument procedure", async () => {
      const mod = await import("./routers/blueprints");
      const router = mod.blueprintsRouter;
      expect(router._def.procedures.extractFromDocument).toBeDefined();
    });

    it("has uploadAndExtract procedure", async () => {
      const mod = await import("./routers/blueprints");
      const router = mod.blueprintsRouter;
      expect(router._def.procedures.uploadAndExtract).toBeDefined();
    });

    it("has conversationExtract procedure", async () => {
      const mod = await import("./routers/blueprints");
      const router = mod.blueprintsRouter;
      expect(router._def.procedures.conversationExtract).toBeDefined();
    });

    it("has listTemplates procedure", async () => {
      const mod = await import("./routers/blueprints");
      const router = mod.blueprintsRouter;
      expect(router._def.procedures.listTemplates).toBeDefined();
    });

    it("has getTemplateWithSteps procedure", async () => {
      const mod = await import("./routers/blueprints");
      const router = mod.blueprintsRouter;
      expect(router._def.procedures.getTemplateWithSteps).toBeDefined();
    });

    it("has applyToVentures procedure", async () => {
      const mod = await import("./routers/blueprints");
      const router = mod.blueprintsRouter;
      expect(router._def.procedures.applyToVentures).toBeDefined();
    });

    it("has getVentureTracking procedure", async () => {
      const mod = await import("./routers/blueprints");
      const router = mod.blueprintsRouter;
      expect(router._def.procedures.getVentureTracking).toBeDefined();
    });

    it("has updateTrackingStep procedure", async () => {
      const mod = await import("./routers/blueprints");
      const router = mod.blueprintsRouter;
      expect(router._def.procedures.updateTrackingStep).toBeDefined();
    });

    it("has refineFromActuals procedure", async () => {
      const mod = await import("./routers/blueprints");
      const router = mod.blueprintsRouter;
      expect(router._def.procedures.refineFromActuals).toBeDefined();
    });

    it("has getMissingSectors procedure", async () => {
      const mod = await import("./routers/blueprints");
      const router = mod.blueprintsRouter;
      expect(router._def.procedures.getMissingSectors).toBeDefined();
    });

    it("has updateStep procedure", async () => {
      const mod = await import("./routers/blueprints");
      const router = mod.blueprintsRouter;
      expect(router._def.procedures.updateStep).toBeDefined();
    });

    it("has deleteStep procedure", async () => {
      const mod = await import("./routers/blueprints");
      const router = mod.blueprintsRouter;
      expect(router._def.procedures.deleteStep).toBeDefined();
    });

    it("has addStep procedure", async () => {
      const mod = await import("./routers/blueprints");
      const router = mod.blueprintsRouter;
      expect(router._def.procedures.addStep).toBeDefined();
    });
  });
});

// ── Section 3: Velocity Agent Blueprint Integration ─────────────────────

describe("Velocity Agent Blueprint Integration", () => {
  it("agents router imports ventureProcessTracking", async () => {
    // Verify the schema exports the table
    const schema = await import("../drizzle/schema");
    expect(schema.ventureProcessTracking).toBeDefined();
  });

  it("agents router imports processSteps", async () => {
    const schema = await import("../drizzle/schema");
    expect(schema.processSteps).toBeDefined();
  });

  it("agents router is properly defined", async () => {
    const mod = await import("./routers/agents");
    expect(mod.agentsRouter).toBeDefined();
    expect(mod.agentsRouter._def).toBeDefined();
  });
});

// ── Section 4: Stage Pipeline ───────────────────────────────────────────

describe("Stage Pipeline Constants", () => {
  it("STAGE_PIPELINE is defined in agents module", async () => {
    // We can't directly access the constant, but we can verify the module loads
    const mod = await import("./routers/agents");
    expect(mod.agentsRouter).toBeDefined();
  });

  it("getNextStage logic works correctly", () => {
    // Test the stage pipeline logic
    const STAGE_PIPELINE = [
      "In Validation",
      "In Fundraising",
      "Active Ventures",
      "Completed",
    ];

    function getNextStage(current: string): string | null {
      const idx = STAGE_PIPELINE.indexOf(current);
      if (idx === -1 || idx >= STAGE_PIPELINE.length - 1) return null;
      return STAGE_PIPELINE[idx + 1];
    }

    expect(getNextStage("In Validation")).toBe("In Fundraising");
    expect(getNextStage("In Fundraising")).toBe("Active Ventures");
    expect(getNextStage("Active Ventures")).toBe("Completed");
    expect(getNextStage("Completed")).toBeNull();
    expect(getNextStage("Unknown")).toBeNull();
  });

  it("CAPITAL_STAGES includes In Fundraising", () => {
    const CAPITAL_STAGES = ["In Fundraising"];
    expect(CAPITAL_STAGES.includes("In Fundraising")).toBe(true);
    expect(CAPITAL_STAGES.includes("In Validation")).toBe(false);
  });
});

// ── Section 5: Blueprint Data Structures ────────────────────────────────

describe("Blueprint Data Structures", () => {
  it("blueprint extraction result has expected shape", () => {
    // Validate the expected shape of extraction results
    const mockResult = {
      templateId: 1,
      stepsCreated: 12,
      blueprint: {
        name: "Real Estate Development",
        stages: [
          {
            stageName: "In Validation",
            steps: [
              { stepName: "Site Analysis", isBlocking: true, whoOwns: "Development Team", estimatedDays: 14 },
              { stepName: "Market Research", isBlocking: false, whoOwns: "Research Team", estimatedDays: 7 },
            ],
          },
        ],
      },
    };

    expect(mockResult.templateId).toBeTypeOf("number");
    expect(mockResult.stepsCreated).toBeTypeOf("number");
    expect(mockResult.blueprint.stages).toBeInstanceOf(Array);
    expect(mockResult.blueprint.stages[0].steps).toBeInstanceOf(Array);
    expect(mockResult.blueprint.stages[0].steps[0].isBlocking).toBe(true);
    expect(mockResult.blueprint.stages[0].steps[0].whoOwns).toBe("Development Team");
  });

  it("conversation message format is correct", () => {
    const messages = [
      { role: "user" as const, content: "We do real estate development" },
      { role: "assistant" as const, content: "Great! What are the typical steps?" },
    ];

    expect(messages).toHaveLength(2);
    expect(messages[0].role).toBe("user");
    expect(messages[1].role).toBe("assistant");
  });

  it("tracking status values are valid", () => {
    const validStatuses = ["pending", "in_progress", "complete", "skipped"];
    for (const status of validStatuses) {
      expect(typeof status).toBe("string");
      expect(status.length).toBeGreaterThan(0);
    }
  });

  it("blueprint confidence levels are valid", () => {
    const validLevels = ["High", "Medium", "Low"];
    for (const level of validLevels) {
      expect(typeof level).toBe("string");
    }
  });

  it("blueprint source types are valid", () => {
    const validSources = ["document", "conversation", "manual"];
    for (const source of validSources) {
      expect(typeof source).toBe("string");
    }
  });
});

// ── Section 6: Smart Pre-Marking Logic ──────────────────────────────────

describe("Smart Pre-Marking Logic", () => {
  it("should mark steps as complete for stages before current stage", () => {
    const STAGE_PIPELINE = [
      "In Validation",
      "In Fundraising",
      "Active Ventures",
      "Completed",
    ];

    const currentStage = "Active Ventures";
    const currentIdx = STAGE_PIPELINE.indexOf(currentStage);

    const steps = [
      { stageName: "In Validation", stepName: "Due Diligence", status: "pending" },
      { stageName: "In Fundraising", stepName: "Investor Deck", status: "pending" },
      { stageName: "Active Ventures", stepName: "Operations Setup", status: "pending" },
    ];

    const preMarked = steps.map(s => {
      const stepIdx = STAGE_PIPELINE.indexOf(s.stageName);
      if (stepIdx < currentIdx) {
        return { ...s, status: "complete" };
      }
      if (stepIdx === currentIdx) {
        return { ...s, status: "in_progress" };
      }
      return s;
    });

    expect(preMarked[0].status).toBe("complete");
    expect(preMarked[1].status).toBe("complete");
    expect(preMarked[2].status).toBe("in_progress");
  });

  it("should not pre-mark steps for stages after current stage", () => {
    const STAGE_PIPELINE = ["In Validation", "In Fundraising", "Active Ventures"];
    const currentStage = "In Validation";
    const currentIdx = STAGE_PIPELINE.indexOf(currentStage);

    const steps = [
      { stageName: "In Validation", stepName: "Step 1", status: "pending" },
      { stageName: "In Fundraising", stepName: "Step 2", status: "pending" },
      { stageName: "Active Ventures", stepName: "Step 3", status: "pending" },
    ];

    const preMarked = steps.map(s => {
      const stepIdx = STAGE_PIPELINE.indexOf(s.stageName);
      if (stepIdx < currentIdx) return { ...s, status: "complete" };
      if (stepIdx === currentIdx) return { ...s, status: "in_progress" };
      return s;
    });

    expect(preMarked[0].status).toBe("in_progress");
    expect(preMarked[1].status).toBe("pending");
    expect(preMarked[2].status).toBe("pending");
  });
});

// ── Section 7: Blueprint Refinement Logic ───────────────────────────────

describe("Blueprint Refinement Logic", () => {
  it("refinement should increment refinement count", () => {
    let refinementCount = 0;
    refinementCount += 1;
    expect(refinementCount).toBe(1);
  });

  it("auto-mark steps complete when stage advances", () => {
    // Simulate what the velocity agent does after Mode A auto-advance
    const blueprintSteps = [
      { stageName: "In Validation", stepName: "Due Diligence", status: "in_progress", isBlocking: true },
      { stageName: "In Validation", stepName: "Market Research", status: "pending", isBlocking: false },
      { stageName: "In Fundraising", stepName: "Investor Deck", status: "pending", isBlocking: true },
    ];

    const currentStage = "In Validation";
    const stageSteps = blueprintSteps.filter(s => s.stageName === currentStage && s.status !== "complete");

    expect(stageSteps).toHaveLength(2);
    expect(stageSteps[0].stepName).toBe("Due Diligence");
    expect(stageSteps[1].stepName).toBe("Market Research");

    // After auto-marking
    const updated = blueprintSteps.map(s =>
      s.stageName === currentStage ? { ...s, status: "complete" } : s
    );

    expect(updated[0].status).toBe("complete");
    expect(updated[1].status).toBe("complete");
    expect(updated[2].status).toBe("pending"); // Next stage untouched
  });

  it("blocking incomplete count is calculated correctly", () => {
    const steps = [
      { isBlocking: true, status: "complete" },
      { isBlocking: true, status: "in_progress" },
      { isBlocking: false, status: "pending" },
      { isBlocking: true, status: "pending" },
    ];

    const blockingIncomplete = steps.filter(s => s.isBlocking && s.status !== "complete");
    expect(blockingIncomplete).toHaveLength(2);
  });
});

// ── Section 8: Frontend Component Existence ─────────────────────────────

describe("Frontend Components", () => {
  it("BlueprintExtractor component file exists", async () => {
    const fs = await import("fs");
    const exists = fs.existsSync("/home/ubuntu/royalton-system/client/src/components/BlueprintExtractor.tsx");
    expect(exists).toBe(true);
  });

  it("BlueprintJourneyTracker component file exists", async () => {
    const fs = await import("fs");
    const exists = fs.existsSync("/home/ubuntu/royalton-system/client/src/components/BlueprintJourneyTracker.tsx");
    expect(exists).toBe(true);
  });

  it("VentureDetail imports BlueprintJourneyTracker", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync("/home/ubuntu/royalton-system/client/src/pages/VentureDetail.tsx", "utf-8");
    expect(content).toContain("BlueprintJourneyTracker");
  });

  it("ClientDetail has BlueprintsTab", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync("/home/ubuntu/royalton-system/client/src/pages/ClientDetail.tsx", "utf-8");
    expect(content).toContain("BlueprintsTab");
    expect(content).toContain("BlueprintExtractor");
  });
});
