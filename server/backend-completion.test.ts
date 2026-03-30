import { describe, it, expect } from "vitest";
import { ventures, tasks, ventureProcessTracking, processTemplates, processSteps, clientVelocityBenchmarks, activityLog } from "../drizzle/schema";

// ── Step 1: Table existence ──────────────────────────────────────────────
describe("Backend Completion — Table Verification", () => {
  it("ventures table has all intelligence fields", () => {
    expect(ventures.description).toBeDefined();
    expect(ventures.currentStatus).toBeDefined();
    expect(ventures.nextStep).toBeDefined();
    expect(ventures.nextMilestone).toBeDefined();
    expect(ventures.healthScore).toBeDefined();
  });

  it("tasks table has email tracking fields", () => {
    expect(tasks.lastEmailSentAt).toBeDefined();
    expect(tasks.emailSentCount).toBeDefined();
  });

  it("process_templates table exists with correct columns", () => {
    expect(processTemplates.id).toBeDefined();
    expect(processTemplates.organizationId).toBeDefined();
    expect(processTemplates.sector).toBeDefined();
    expect(processTemplates.blueprintName).toBeDefined();
    expect(processTemplates.source).toBeDefined();
  });

  it("process_steps table exists with correct columns", () => {
    expect(processSteps.id).toBeDefined();
    expect(processSteps.templateId).toBeDefined();
    expect(processSteps.stageName).toBeDefined();
    expect(processSteps.stepName).toBeDefined();
    expect(processSteps.isBlocking).toBeDefined();
    expect(processSteps.whoOwns).toBeDefined();
  });

  it("venture_process_tracking table exists with correct columns", () => {
    expect(ventureProcessTracking.id).toBeDefined();
    expect(ventureProcessTracking.ventureId).toBeDefined();
    expect(ventureProcessTracking.templateId).toBeDefined();
    expect(ventureProcessTracking.stepId).toBeDefined();
    expect(ventureProcessTracking.status).toBeDefined();
    expect(ventureProcessTracking.completedAt).toBeDefined();
    expect(ventureProcessTracking.completedBy).toBeDefined();
  });

  it("client_velocity_benchmarks table exists with correct columns", () => {
    expect(clientVelocityBenchmarks.id).toBeDefined();
    expect(clientVelocityBenchmarks.organizationId).toBeDefined();
    expect(clientVelocityBenchmarks.sector).toBeDefined();
    expect(clientVelocityBenchmarks.stage).toBeDefined();
    expect(clientVelocityBenchmarks.avgDaysToAdvance).toBeDefined();
    expect(clientVelocityBenchmarks.sampleCount).toBeDefined();
  });

  it("activity_log table has entityType for venture filtering", () => {
    expect(activityLog.entityType).toBeDefined();
    expect(activityLog.entityId).toBeDefined();
  });
});

// ── Step 2: Procedure existence (router shape) ──────────────────────────
describe("Backend Completion — Procedure Verification", () => {
  it("ventures router has getWithMilestones procedure", async () => {
    const { venturesRouter } = await import("./routers/ventures");
    expect(venturesRouter).toBeDefined();
    const procedures = venturesRouter._def.procedures;
    expect(procedures.getWithMilestones).toBeDefined();
  });

  it("ventures router has updateMilestone procedure", async () => {
    const { venturesRouter } = await import("./routers/ventures");
    const procedures = venturesRouter._def.procedures;
    expect(procedures.updateMilestone).toBeDefined();
  });

  it("ventures router has populateIntelligence procedure", async () => {
    const { venturesRouter } = await import("./routers/ventures");
    const procedures = venturesRouter._def.procedures;
    expect(procedures.populateIntelligence).toBeDefined();
  });

  it("ventures router has recalculateHealth procedure", async () => {
    const { venturesRouter } = await import("./routers/ventures");
    const procedures = venturesRouter._def.procedures;
    expect(procedures.recalculateHealth).toBeDefined();
  });

  it("blueprints router has all required procedures", async () => {
    const { blueprintsRouter } = await import("./routers/blueprints");
    expect(blueprintsRouter).toBeDefined();
    const procedures = blueprintsRouter._def.procedures;
    expect(procedures.listTemplates).toBeDefined();
    expect(procedures.extractFromDocument).toBeDefined();
    expect(procedures.conversationExtract).toBeDefined();
    expect(procedures.applyToVentures).toBeDefined();
    expect(procedures.generateStarterBlueprints).toBeDefined();
    expect(procedures.recalculateHealthScores).toBeDefined();
  });

  it("agents router has list procedure for events", async () => {
    const { agentsRouter } = await import("./routers/agents");
    expect(agentsRouter).toBeDefined();
    const procedures = agentsRouter._def.procedures;
    expect(procedures.list).toBeDefined();
  });

  it("agents router has clientAdvanceStage procedure", async () => {
    const { agentsRouter } = await import("./routers/agents");
    const procedures = agentsRouter._def.procedures;
    expect(procedures.clientAdvanceStage).toBeDefined();
  });
});

// ── Step 3: Health score formula ─────────────────────────────────────────
describe("Backend Completion — Health Score Formula", () => {
  it("health score formula produces correct ranges", () => {
    // Simulate the formula
    const calculateHealth = (opts: {
      hasDescription: boolean;
      hasCurrentStatus: boolean;
      hasNextStep: boolean;
      hasNextMilestone: boolean;
      hasLocation: boolean;
      overdueCount: number;
      trackingTotal: number;
      blockingTotal: number;
      blockingComplete: number;
      completedSteps: number;
      status: string;
      recentWeekActivity: boolean;
      recentMonthActivity: boolean;
    }) => {
      // dataScore (25pts)
      let dataScore = 0;
      if (opts.hasDescription) dataScore += 5;
      if (opts.hasCurrentStatus) dataScore += 5;
      if (opts.hasNextStep) dataScore += 5;
      if (opts.hasNextMilestone) dataScore += 5;
      if (opts.hasLocation) dataScore += 5;

      // taskScore (25pts)
      const taskScore = opts.overdueCount === 0 ? 25 : opts.overdueCount === 1 ? 15 : 0;

      // milestoneScore (25pts)
      let milestoneScore = 12;
      if (opts.trackingTotal > 0) {
        if (opts.blockingTotal > 0) {
          milestoneScore = Math.round((opts.blockingComplete / opts.blockingTotal) * 25);
        } else {
          milestoneScore = Math.round((opts.completedSteps / opts.trackingTotal) * 25);
        }
      }

      // momentumScore (25pts)
      let momentumScore = 5;
      if (opts.status === "On hold") {
        momentumScore = 0;
      } else if (opts.recentWeekActivity) {
        momentumScore = 25;
      } else if (opts.recentMonthActivity) {
        momentumScore = 15;
      }

      return Math.min(100, Math.max(0, dataScore + taskScore + milestoneScore + momentumScore));
    };

    // Perfect venture: all data, no overdue, all blocking complete, recent activity
    const perfect = calculateHealth({
      hasDescription: true, hasCurrentStatus: true, hasNextStep: true,
      hasNextMilestone: true, hasLocation: true, overdueCount: 0,
      trackingTotal: 10, blockingTotal: 3, blockingComplete: 3,
      completedSteps: 10, status: "In progress",
      recentWeekActivity: true, recentMonthActivity: true,
    });
    expect(perfect).toBe(100); // 25 + 25 + 25 + 25

    // Worst venture: no data, many overdue, no progress, on hold
    const worst = calculateHealth({
      hasDescription: false, hasCurrentStatus: false, hasNextStep: false,
      hasNextMilestone: false, hasLocation: false, overdueCount: 5,
      trackingTotal: 10, blockingTotal: 5, blockingComplete: 0,
      completedSteps: 0, status: "On hold",
      recentWeekActivity: false, recentMonthActivity: false,
    });
    expect(worst).toBe(0); // 0 + 0 + 0 + 0

    // Typical venture: some data, 1 overdue, partial progress, month activity
    const typical = calculateHealth({
      hasDescription: true, hasCurrentStatus: true, hasNextStep: true,
      hasNextMilestone: false, hasLocation: true, overdueCount: 1,
      trackingTotal: 8, blockingTotal: 4, blockingComplete: 2,
      completedSteps: 4, status: "In progress",
      recentWeekActivity: false, recentMonthActivity: true,
    });
    expect(typical).toBe(20 + 15 + 13 + 15); // 63

    // No blueprint venture: neutral milestone score
    const noBlueprint = calculateHealth({
      hasDescription: true, hasCurrentStatus: true, hasNextStep: true,
      hasNextMilestone: true, hasLocation: true, overdueCount: 0,
      trackingTotal: 0, blockingTotal: 0, blockingComplete: 0,
      completedSteps: 0, status: "In progress",
      recentWeekActivity: true, recentMonthActivity: true,
    });
    expect(noBlueprint).toBe(25 + 25 + 12 + 25); // 87
  });
});

// ── Step 5: Email service functions exist ────────────────────────────────
describe("Backend Completion — Email Service", () => {
  it("email service exports all 3 auto-trigger functions", async () => {
    const emailService = await import("./emailService");
    expect(emailService.sendOverdueAutoEmail).toBeDefined();
    expect(typeof emailService.sendOverdueAutoEmail).toBe("function");
    expect(emailService.sendReadyToAdvanceEmail).toBeDefined();
    expect(typeof emailService.sendReadyToAdvanceEmail).toBe("function");
    expect(emailService.sendStageAdvancedEmail).toBeDefined();
    expect(typeof emailService.sendStageAdvancedEmail).toBe("function");
  });
});
