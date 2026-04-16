// ═══════════════════════════════════════════════════════════════════════════
// WS3: AI Agent Safety — Unit Tests
// ═══════════════════════════════════════════════════════════════════════════

import { describe, it, expect } from "vitest";
import {
  generateDisclaimer,
  generateOperatorDisclaimer,
  computeConfidenceScore,
  requiresHumanApproval,
  isApprovedForExecution,
  getDraftSafetyFields,
  getEventSafetyFields,
  DEFAULT_CONFIDENCE_THRESHOLD,
  AGENT_CONFIDENCE_THRESHOLDS,
} from "./aiSafety";

describe("generateDisclaimer", () => {
  it("should include operator name and date", () => {
    const disclaimer = generateDisclaimer("John Smith", new Date("2026-04-16"));
    expect(disclaimer).toContain("John Smith");
    expect(disclaimer).toContain("2026-04-16");
    expect(disclaimer).toContain("Not investment, legal, or tax advice");
  });

  it("should use [Pending Review] when no operator name provided", () => {
    const disclaimer = generateDisclaimer();
    expect(disclaimer).toContain("[Pending Review]");
  });

  it("should include AI-assisted output label", () => {
    const disclaimer = generateDisclaimer("Admin");
    expect(disclaimer).toContain("AI-assisted output");
  });
});

describe("generateOperatorDisclaimer", () => {
  it("should warn about confidence scores", () => {
    const disclaimer = generateOperatorDisclaimer();
    expect(disclaimer).toContain("AI-generated");
    expect(disclaimer).toContain("Confidence scores");
  });
});

describe("computeConfidenceScore", () => {
  it("should return base score of 50 with no data", () => {
    const score = computeConfidenceScore({
      agentName: "Overdue Agent",
      hasEntityData: false,
      hasHistoricalData: false,
      hasBlueprintContext: false,
    });
    expect(score).toBe(50);
  });

  it("should increase score with entity data", () => {
    const score = computeConfidenceScore({
      agentName: "Overdue Agent",
      hasEntityData: true,
      hasHistoricalData: false,
      hasBlueprintContext: false,
    });
    expect(score).toBe(65); // 50 + 15
  });

  it("should increase score with all data available", () => {
    const score = computeConfidenceScore({
      agentName: "Overdue Agent",
      hasEntityData: true,
      hasHistoricalData: true,
      hasBlueprintContext: true,
    });
    expect(score).toBe(90); // 50 + 15 + 15 + 10
  });

  it("should decrease score for Distribution Sentinel (financial caution)", () => {
    const score = computeConfidenceScore({
      agentName: "Distribution Sentinel",
      hasEntityData: true,
      hasHistoricalData: true,
      hasBlueprintContext: false,
    });
    expect(score).toBe(75); // 50 + 15 + 15 - 5
  });

  it("should increase score for Orchestrator (aggregation reliability)", () => {
    const score = computeConfidenceScore({
      agentName: "Orchestrator",
      hasEntityData: true,
      hasHistoricalData: true,
      hasBlueprintContext: false,
    });
    expect(score).toBe(85); // 50 + 15 + 15 + 5
  });

  it("should clamp score between 0 and 100", () => {
    const high = computeConfidenceScore({
      agentName: "Orchestrator",
      hasEntityData: true,
      hasHistoricalData: true,
      hasBlueprintContext: true,
      outputQuality: "high",
    });
    expect(high).toBeLessThanOrEqual(100);

    const low = computeConfidenceScore({
      agentName: "Distribution Sentinel",
      hasEntityData: false,
      hasHistoricalData: false,
      hasBlueprintContext: false,
      outputQuality: "low",
    });
    expect(low).toBeGreaterThanOrEqual(0);
  });
});

describe("requiresHumanApproval", () => {
  it("should require approval for client-facing communications", () => {
    expect(requiresHumanApproval({ audience: "client" })).toBe(true);
    expect(requiresHumanApproval({ audience: "both" })).toBe(true);
  });

  it("should require approval for draft actions", () => {
    expect(requiresHumanApproval({ actionType: "draft" })).toBe(true);
  });

  it("should require approval for stage advance actions", () => {
    expect(requiresHumanApproval({ actionType: "advance" })).toBe(true);
  });

  it("should require approval for financial actions", () => {
    expect(requiresHumanApproval({ isFinancial: true })).toBe(true);
  });

  it("should require approval for low confidence scores", () => {
    expect(requiresHumanApproval({
      confidenceScore: 50,
      agentName: "Overdue Agent",
    })).toBe(true);
  });

  it("should use agent-specific thresholds", () => {
    // Distribution Sentinel has threshold of 80
    expect(requiresHumanApproval({
      confidenceScore: 75,
      agentName: "Distribution Sentinel",
    })).toBe(true);
  });

  it("should default to requiring approval (fail-safe)", () => {
    expect(requiresHumanApproval({})).toBe(true);
  });
});

describe("isApprovedForExecution", () => {
  it("should allow execution when approval not required", () => {
    expect(isApprovedForExecution({
      humanApprovalRequired: false,
      approvalStatus: null,
    })).toBe(true);
  });

  it("should allow execution when approved", () => {
    expect(isApprovedForExecution({
      humanApprovalRequired: true,
      approvalStatus: "approved",
    })).toBe(true);
  });

  it("should block execution when pending", () => {
    expect(isApprovedForExecution({
      humanApprovalRequired: true,
      approvalStatus: "pending",
    })).toBe(false);
  });

  it("should block execution when rejected", () => {
    expect(isApprovedForExecution({
      humanApprovalRequired: true,
      approvalStatus: "rejected",
    })).toBe(false);
  });
});

describe("getDraftSafetyFields", () => {
  it("should always require human approval for drafts", () => {
    const fields = getDraftSafetyFields({
      agentName: "Overdue Agent",
      draftType: "follow_up",
      hasEntityData: true,
    });
    expect(fields.humanApprovalRequired).toBe(true);
    expect(fields.approvalStatus).toBe("pending");
  });

  it("should include confidence score", () => {
    const fields = getDraftSafetyFields({
      agentName: "Overdue Agent",
      draftType: "follow_up",
      hasEntityData: true,
      hasHistoricalData: true,
    });
    expect(fields.confidenceScore).toBeGreaterThan(0);
    expect(fields.confidenceScore).toBeLessThanOrEqual(100);
  });

  it("should include disclaimer text", () => {
    const fields = getDraftSafetyFields({
      agentName: "Distribution Sentinel",
      draftType: "lp_notice",
      hasEntityData: true,
    });
    expect(fields.disclaimer).toContain("AI-assisted output");
    expect(fields.disclaimer).toContain("Not investment, legal, or tax advice");
  });
});

describe("getEventSafetyFields", () => {
  it("should require approval for client-facing events", () => {
    const fields = getEventSafetyFields({
      agentName: "Overdue Agent",
      audience: "client",
      hasEntityData: true,
    });
    expect(fields.humanApprovalRequired).toBe(true);
    expect(fields.approvalStatus).toBe("pending");
    expect(fields.disclaimer).toBeTruthy();
  });

  it("should include disclaimer only for client-facing events", () => {
    const operatorFields = getEventSafetyFields({
      agentName: "Velocity Agent",
      audience: "operator",
      hasEntityData: true,
    });
    // Operator-only events still require approval (fail-safe) but no disclaimer
    expect(operatorFields.disclaimer).toBeNull();
  });

  it("should compute confidence score based on available data", () => {
    const fields = getEventSafetyFields({
      agentName: "Velocity Agent",
      hasEntityData: true,
      hasHistoricalData: true,
      hasBlueprintContext: true,
    });
    expect(fields.confidenceScore).toBeGreaterThan(70);
  });

  it("should flag financial events for Distribution Sentinel", () => {
    const fields = getEventSafetyFields({
      agentName: "Distribution Sentinel",
      audience: "client",
      hasEntityData: true,
      isFinancial: true,
    });
    expect(fields.humanApprovalRequired).toBe(true);
    expect(fields.disclaimer).toContain("Not investment");
  });
});

describe("AGENT_CONFIDENCE_THRESHOLDS", () => {
  it("should have a higher threshold for Distribution Sentinel", () => {
    expect(AGENT_CONFIDENCE_THRESHOLDS["Distribution Sentinel"]).toBeGreaterThan(
      AGENT_CONFIDENCE_THRESHOLDS["Velocity Agent"]
    );
  });

  it("should have default threshold of 70", () => {
    expect(DEFAULT_CONFIDENCE_THRESHOLD).toBe(70);
  });
});
