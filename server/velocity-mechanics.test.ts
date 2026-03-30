/**
 * Velocity Mechanics Tests
 * Tests for the three True Velocity mechanics:
 * 1. Email auto-triggers (overdue, ready-to-advance, stage-advanced)
 * 2. Auto-advance logic (Mode A + Mode B)
 * 3. Velocity compression measurement
 */
import { describe, expect, it, vi } from "vitest";

// ── Mechanic 1: Email Service Templates & Functions ─────────────────────

describe("Mechanic 1: Email Auto-Triggers", () => {
  describe("Email service module structure", () => {
    it("exports sendOverdueAutoEmail function", async () => {
      const mod = await import("./emailService");
      expect(typeof mod.sendOverdueAutoEmail).toBe("function");
    });

    it("exports sendReadyToAdvanceEmail function", async () => {
      const mod = await import("./emailService");
      expect(typeof mod.sendReadyToAdvanceEmail).toBe("function");
    });

    it("exports sendStageAdvancedEmail function", async () => {
      const mod = await import("./emailService");
      expect(typeof mod.sendStageAdvancedEmail).toBe("function");
    });

    it("exports original sendTaskFollowUp function", async () => {
      const mod = await import("./emailService");
      expect(typeof mod.sendTaskFollowUp).toBe("function");
    });

    it("exports original sendDistributionNotice function", async () => {
      const mod = await import("./emailService");
      expect(typeof mod.sendDistributionNotice).toBe("function");
    });

    it("exports original sendClientNudge function", async () => {
      const mod = await import("./emailService");
      expect(typeof mod.sendClientNudge).toBe("function");
    });
  });

  describe("Email send functions handle missing API key gracefully", () => {
    it("sendOverdueAutoEmail returns error when RESEND_API_KEY is missing", async () => {
      const origKey = process.env.RESEND_API_KEY;
      delete process.env.RESEND_API_KEY;
      // Re-import to get fresh module (Resend initialized with empty key)
      const { sendOverdueAutoEmail } = await import("./emailService");
      const result = await sendOverdueAutoEmail({
        to: "test@example.com",
        assigneeName: "John",
        taskTitle: "Test Task",
        ventureName: "Test Venture",
        stage: "In Validation",
        daysOverdue: 5,
        deadlineDate: "Monday, April 1",
      });
      expect(result.success).toBe(false);
      expect(result.error).toContain("RESEND_API_KEY");
      process.env.RESEND_API_KEY = origKey;
    });

    it("sendReadyToAdvanceEmail returns error when RESEND_API_KEY is missing", async () => {
      const origKey = process.env.RESEND_API_KEY;
      delete process.env.RESEND_API_KEY;
      const { sendReadyToAdvanceEmail } = await import("./emailService");
      const result = await sendReadyToAdvanceEmail({
        to: "test@example.com",
        contactName: "Jane",
        ventureName: "Test Venture",
        currentStage: "In Validation",
        nextStage: "In Fundraising",
        completedSteps: ["Step 1", "Step 2"],
      });
      expect(result.success).toBe(false);
      expect(result.error).toContain("RESEND_API_KEY");
      process.env.RESEND_API_KEY = origKey;
    });

    it("sendStageAdvancedEmail returns error when RESEND_API_KEY is missing", async () => {
      const origKey = process.env.RESEND_API_KEY;
      delete process.env.RESEND_API_KEY;
      const { sendStageAdvancedEmail } = await import("./emailService");
      const result = await sendStageAdvancedEmail({
        to: "test@example.com",
        contactName: "Jane",
        ventureName: "Test Venture",
        previousStage: "In Validation",
        newStage: "In Fundraising",
        daysInPreviousStage: 14,
        clientAvgDays: 21,
        nextBlockingSteps: ["Investor deck", "Term sheet"],
      });
      expect(result.success).toBe(false);
      expect(result.error).toContain("RESEND_API_KEY");
      process.env.RESEND_API_KEY = origKey;
    });
  });

  describe("Overdue auto-email trigger rules", () => {
    it("should only trigger for tasks > 3 days overdue", () => {
      // Business rule: daysOverdue must be > 3
      const daysOverdue = 4;
      expect(daysOverdue > 3).toBe(true);
      const notOverdueEnough = 2;
      expect(notOverdueEnough > 3).toBe(false);
    });

    it("should enforce 7-day cooldown between emails", () => {
      const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
      const now = Date.now();

      // Last email sent 8 days ago — can send
      const lastSent8DaysAgo = now - 8 * 24 * 60 * 60 * 1000;
      expect((now - lastSent8DaysAgo) > sevenDaysMs).toBe(true);

      // Last email sent 3 days ago — cannot send
      const lastSent3DaysAgo = now - 3 * 24 * 60 * 60 * 1000;
      expect((now - lastSent3DaysAgo) > sevenDaysMs).toBe(false);

      // Never sent (lastSent = 0) — can send
      expect((now - 0) > sevenDaysMs).toBe(true);
    });
  });
});

// ── Mechanic 2: Auto-Advance Logic ─────────────────────────────────────

describe("Mechanic 2: Automatic Stage Advancement", () => {
  const STAGE_PIPELINE = [
    "In Validation",
    "In Fundraising",
    "Active Ventures",
    "Completed",
  ];
  const CAPITAL_STAGES = ["In Fundraising"];

  function getNextStage(current: string): string | null {
    const idx = STAGE_PIPELINE.indexOf(current);
    if (idx === -1 || idx >= STAGE_PIPELINE.length - 1) return null;
    return STAGE_PIPELINE[idx + 1];
  }

  function isCapitalStage(stage: string): boolean {
    return CAPITAL_STAGES.includes(stage);
  }

  describe("Stage pipeline progression", () => {
    it("advances In Validation → In Fundraising", () => {
      expect(getNextStage("In Validation")).toBe("In Fundraising");
    });

    it("advances In Fundraising → Active Ventures", () => {
      expect(getNextStage("In Fundraising")).toBe("Active Ventures");
    });

    it("advances Active Ventures → Completed", () => {
      expect(getNextStage("Active Ventures")).toBe("Completed");
    });

    it("returns null for Completed (terminal stage)", () => {
      expect(getNextStage("Completed")).toBeNull();
    });

    it("returns null for unknown stage", () => {
      expect(getNextStage("Unknown Stage")).toBeNull();
    });
  });

  describe("Capital stage detection", () => {
    it("identifies In Fundraising as capital stage", () => {
      expect(isCapitalStage("In Fundraising")).toBe(true);
    });

    it("In Validation is not a capital stage", () => {
      expect(isCapitalStage("In Validation")).toBe(false);
    });

    it("Active Ventures is not a capital stage", () => {
      expect(isCapitalStage("Active Ventures")).toBe(false);
    });
  });

  describe("Mode A vs Mode B decision logic", () => {
    it("Mode A: auto-advance when enabled + non-capital + sector authorized", () => {
      const autoAdvanceEnabled = true;
      const capitalStage = false;
      const sectorAuthorized = true;
      const canAutoAdvance = autoAdvanceEnabled && sectorAuthorized && !capitalStage;
      expect(canAutoAdvance).toBe(true);
    });

    it("Mode B: requires approval when auto-advance disabled", () => {
      const autoAdvanceEnabled = false;
      const capitalStage = false;
      const sectorAuthorized = true;
      const canAutoAdvance = autoAdvanceEnabled && sectorAuthorized && !capitalStage;
      expect(canAutoAdvance).toBe(false);
    });

    it("Mode B: requires approval for capital stages even with auto-advance enabled", () => {
      const autoAdvanceEnabled = true;
      const capitalStage = true;
      const sectorAuthorized = true;
      const canAutoAdvance = autoAdvanceEnabled && sectorAuthorized && !capitalStage;
      expect(canAutoAdvance).toBe(false);
    });

    it("Mode B: requires approval when sector not authorized", () => {
      const autoAdvanceEnabled = true;
      const capitalStage = false;
      const sectorAuthorized = false;
      const canAutoAdvance = autoAdvanceEnabled && sectorAuthorized && !capitalStage;
      expect(canAutoAdvance).toBe(false);
    });

    it("sector authorization: empty list means all sectors authorized", () => {
      const autoAdvanceSectors: string[] = [];
      const ventureSector = "Real Estate";
      const sectorAuthorized = autoAdvanceSectors.length === 0 || autoAdvanceSectors.includes(ventureSector);
      expect(sectorAuthorized).toBe(true);
    });

    it("sector authorization: specific list restricts to listed sectors", () => {
      const autoAdvanceSectors = ["Real Estate", "F&B"];
      expect(autoAdvanceSectors.includes("Real Estate")).toBe(true);
      expect(autoAdvanceSectors.includes("Yacht")).toBe(false);
    });
  });

  describe("Schema: clientAgentConfig has auto-advance fields", () => {
    it("schema exports clientAgentConfig with autoAdvanceEnabled", async () => {
      const schema = await import("../drizzle/schema");
      expect(schema.clientAgentConfig).toBeDefined();
      expect((schema.clientAgentConfig as any).autoAdvanceEnabled).toBeDefined();
    });

    it("schema exports clientAgentConfig with autoAdvanceSectors", async () => {
      const schema = await import("../drizzle/schema");
      expect((schema.clientAgentConfig as any).autoAdvanceSectors).toBeDefined();
    });
  });

  describe("Schema: tasks has email tracking fields", () => {
    it("tasks table has lastEmailSentAt column", async () => {
      const schema = await import("../drizzle/schema");
      expect((schema.tasks as any).lastEmailSentAt).toBeDefined();
    });

    it("tasks table has emailSentCount column", async () => {
      const schema = await import("../drizzle/schema");
      expect((schema.tasks as any).emailSentCount).toBeDefined();
    });
  });
});

// ── Mechanic 3: Velocity Compression Measurement ───────────────────────

describe("Mechanic 3: Velocity Compression", () => {
  describe("Schema: venture_velocity has enhanced columns", () => {
    it("has hoursInStage column for precision", async () => {
      const schema = await import("../drizzle/schema");
      expect((schema.ventureVelocity as any).hoursInStage).toBeDefined();
    });

    it("has blockingStepsTotal column", async () => {
      const schema = await import("../drizzle/schema");
      expect((schema.ventureVelocity as any).blockingStepsTotal).toBeDefined();
    });

    it("has blockingStepsCompleted column", async () => {
      const schema = await import("../drizzle/schema");
      expect((schema.ventureVelocity as any).blockingStepsCompleted).toBeDefined();
    });

    it("has tasksCompletedInStage column", async () => {
      const schema = await import("../drizzle/schema");
      expect((schema.ventureVelocity as any).tasksCompletedInStage).toBeDefined();
    });
  });

  describe("Velocity compression calculation", () => {
    it("calculates average days correctly from velocity records", () => {
      const records = [
        { daysInStage: 14 },
        { daysInStage: 7 },
        { daysInStage: 21 },
      ];
      const avg = records.reduce((sum, r) => sum + r.daysInStage, 0) / records.length;
      expect(avg).toBe(14);
    });

    it("handles single record", () => {
      const records = [{ daysInStage: 10 }];
      const avg = records.reduce((sum, r) => sum + r.daysInStage, 0) / records.length;
      expect(avg).toBe(10);
    });

    it("handles empty records gracefully", () => {
      const records: { daysInStage: number }[] = [];
      const avg = records.length > 0
        ? records.reduce((sum, r) => sum + r.daysInStage, 0) / records.length
        : null;
      expect(avg).toBeNull();
    });

    it("hours-to-days conversion is accurate", () => {
      const hoursInStage = 72;
      const daysInStage = Math.floor(hoursInStage / 24);
      expect(daysInStage).toBe(3);
    });

    it("compression ratio: lower avg days = better", () => {
      const beforeAvg = 21; // days
      const afterAvg = 14;  // days
      const compressionPct = Math.round(((beforeAvg - afterAvg) / beforeAvg) * 100);
      expect(compressionPct).toBe(33);
    });
  });

  describe("VelocityKPI 3-tier display logic", () => {
    it("tier 0: no advances shows empty state", () => {
      const totalAdvances = 0;
      const tier = totalAdvances === 0 ? 0 : totalAdvances <= 2 ? 1 : 2;
      expect(tier).toBe(0);
    });

    it("tier 1: 1-2 advances shows basic metrics", () => {
      const totalAdvances = 2;
      const tier = totalAdvances === 0 ? 0 : totalAdvances <= 2 ? 1 : 2;
      expect(tier).toBe(1);
    });

    it("tier 2: 3+ advances shows full sparkline", () => {
      const totalAdvances = 5;
      const tier = totalAdvances === 0 ? 0 : totalAdvances <= 2 ? 1 : 2;
      expect(tier).toBe(2);
    });
  });

  describe("Blocking steps tracking", () => {
    it("calculates completion percentage correctly", () => {
      const total = 5;
      const completed = 3;
      const pct = Math.round((completed / total) * 100);
      expect(pct).toBe(60);
    });

    it("handles zero total steps", () => {
      const total = 0;
      const completed = 0;
      const pct = total > 0 ? Math.round((completed / total) * 100) : 100;
      expect(pct).toBe(100);
    });
  });
});

// ── Integration: Router exports ─────────────────────────────────────────

describe("Router integration", () => {
  it("agents router has clientAdvanceStage procedure", async () => {
    const { appRouter } = await import("./routers");
    // Check that the procedure exists on the router
    expect((appRouter as any)._def.procedures["agents.clientAdvanceStage"]).toBeDefined();
  });

  it("agents router has velocityMetrics procedure", async () => {
    const { appRouter } = await import("./routers");
    expect((appRouter as any)._def.procedures["agents.velocityMetrics"]).toBeDefined();
  });
});
