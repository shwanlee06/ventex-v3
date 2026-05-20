import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Resend
const mockSend = vi.hoisted(() => vi.fn().mockResolvedValue({ data: { id: "mock-msg-id" }, error: null }));
vi.mock("resend", () => {
  return {
    Resend: class {
      emails = { send: mockSend };
    },
  };
});

// Set env before importing
process.env.RESEND_API_KEY = "re_test_123";

import {
  sendPrincipalConfirmation,
  sendDistributionAlert,
  sendVelocityStallAlert,
  sendOrchestratorBriefing,
  sendTaskFollowUp,
  sendDistributionNotice,
  sendOverdueAutoEmail,
} from "./emailService";

describe("Email Notification Service", () => {
  describe("sendPrincipalConfirmation", () => {
    it("sends principal confirmation email successfully", async () => {
      const result = await sendPrincipalConfirmation({
        to: "principal@test.com",
        principalName: "John Smith",
        entityType: "distribution",
        entityName: "Royalton Fund Q2",
        amount: "500,000",
        currency: "USD",
        daysUntilDeadline: 5,
        context: "This distribution is due in 5 days. Wire instructions are on file.",
      });
      expect(result.success).toBe(true);
      expect(result.messageId).toBe("mock-msg-id");
    });

    it("handles urgent deadline (<=3 days)", async () => {
      const result = await sendPrincipalConfirmation({
        to: "principal@test.com",
        principalName: "John Smith",
        entityType: "distribution",
        entityName: "Royalton Fund Q2",
        amount: "500,000",
        daysUntilDeadline: 2,
        context: "Urgent: 2 days remaining.",
      });
      expect(result.success).toBe(true);
    });
  });

  describe("sendDistributionAlert", () => {
    it("sends T-14 distribution alert", async () => {
      const result = await sendDistributionAlert({
        to: "principal@test.com",
        recipientName: "John Smith",
        fundName: "Royalton Fund Q2",
        amount: "500,000",
        currency: "USD",
        daysUntil: 14,
        milestone: "T-14",
        alertMessage: "Wire instructions are missing.",
        missingItems: ["Wire transfer instructions"],
      });
      expect(result.success).toBe(true);
    });

    it("sends T-3 urgent alert with missing items", async () => {
      const result = await sendDistributionAlert({
        to: ["principal@test.com", "ops@test.com"],
        recipientName: "John Smith",
        fundName: "Royalton Fund Q2",
        amount: "250,000",
        daysUntil: 3,
        milestone: "T-3",
        alertMessage: "FINAL WARNING: Distribution is 3 days away and is BLOCKED.",
        missingItems: ["Principal confirmation", "Wire instructions"],
      });
      expect(result.success).toBe(true);
    });

    it("sends T-0 hard block alert", async () => {
      const result = await sendDistributionAlert({
        to: "principal@test.com",
        recipientName: "John Smith",
        fundName: "Royalton Fund Q2",
        amount: "1,000,000",
        daysUntil: 0,
        milestone: "T-0",
        alertMessage: "HARD BLOCK: Distribution is due today but CANNOT execute.",
        missingItems: ["Principal has NOT confirmed"],
      });
      expect(result.success).toBe(true);
    });
  });

  describe("sendVelocityStallAlert", () => {
    it("sends stall alert for inactive venture", async () => {
      const result = await sendVelocityStallAlert({
        to: "team@test.com",
        recipientName: "Operations Team",
        ventureName: "Marina Tower",
        sector: "Real Estate",
        stage: "In Progress",
        daysSinceActivity: 45,
        threshold: 30,
        interventionNote: "Marina Tower has been stalled for 45 days. Recommend scheduling a review meeting with the development team.",
      });
      expect(result.success).toBe(true);
    });
  });

  describe("sendOrchestratorBriefing", () => {
    it("sends weekly portfolio briefing", async () => {
      const result = await sendOrchestratorBriefing({
        to: "principal@test.com",
        principalName: "John Smith",
        portfolioSummary: "Portfolio health is moderate. 3 ventures are on track, 2 are stalled, and 1 distribution is pending confirmation.",
        topAction: "Confirm the Q2 distribution for Royalton Fund ($500K) — it's been waiting 5 days and blocks LP payments.",
        stats: {
          ventureCount: 27,
          overdueTaskCount: 4,
          upcomingDistCount: 2,
          stalledCount: 2,
          pendingConfirmationCount: 1,
        },
      });
      expect(result.success).toBe(true);
    });
  });

  describe("existing email functions still work", () => {
    it("sendTaskFollowUp works", async () => {
      const result = await sendTaskFollowUp({
        to: "assignee@test.com",
        assigneeName: "Sarah",
        taskTitle: "Submit due diligence report",
        ventureName: "Marina Tower",
        agentNote: "This task is 5 days overdue. Please provide an update.",
      });
      expect(result.success).toBe(true);
    });

    it("sendOverdueAutoEmail works", async () => {
      const result = await sendOverdueAutoEmail({
        to: "assignee@test.com",
        assigneeName: "Mike",
        taskTitle: "File quarterly report",
        ventureName: "Yacht Fund",
        stage: "Overdue",
        daysOverdue: 7,
        deadlineDate: "Monday, May 26",
      });
      expect(result.success).toBe(true);
    });
  });
});
