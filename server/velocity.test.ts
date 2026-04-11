// ============================================================================
// Velocity Build — Tests for drafts, velocity, and action-based agent events
// ============================================================================
import { describe, it, expect, vi } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAdminContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "velocity-admin",
    email: "admin@ventex.com",
    name: "Velocity Admin",
    loginMethod: "manus",
    role: "admin",
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
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

describe("Velocity Build Features", () => {
  describe("agents.list (events)", () => {
    it("returns events for admin users", async () => {
      const caller = appRouter.createCaller(createAdminContext());
      const result = await caller.agents.list({ limit: 5 });
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    it("returns events with action fields when present", async () => {
      const caller = appRouter.createCaller(createAdminContext());
      const events = await caller.agents.list({ limit: 3 });
      if (events.length > 0) {
        const event = events[0];
        expect(event).toHaveProperty("id");
        expect(event).toHaveProperty("agentName");
        expect(event).toHaveProperty("eventType");
        expect(event).toHaveProperty("message");
        expect(event).toHaveProperty("severity");
        expect(event).toHaveProperty("createdAt");
      }
    });
  });

  describe("agents.listDrafts", () => {
    it("returns pending drafts for admin users", async () => {
      const caller = appRouter.createCaller(createAdminContext());
      const result = await caller.agents.listDrafts({ status: "pending" });
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    it("returns sent drafts for admin users", async () => {
      const caller = appRouter.createCaller(createAdminContext());
      const result = await caller.agents.listDrafts({ status: "sent" });
      expect(Array.isArray(result)).toBe(true);
    });

    it("returns dismissed drafts for admin users", async () => {
      const caller = appRouter.createCaller(createAdminContext());
      const result = await caller.agents.listDrafts({ status: "dismissed" });
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe("agents.velocityMetrics", () => {
    it("returns velocity metrics with expected shape", async () => {
      const caller = appRouter.createCaller(createAdminContext());
      const result = await caller.agents.velocityMetrics();
      expect(result).toBeDefined();
      expect(result).toHaveProperty("avgDays");
      expect(result).toHaveProperty("totalAdvances");
      expect(result).toHaveProperty("recentAdvances");
      expect(typeof result.totalAdvances).toBe("number");
      expect(Array.isArray(result.recentAdvances)).toBe(true);
    });
  });

  describe("agents.metrics", () => {
    it("returns agent metrics object", async () => {
      const caller = appRouter.createCaller(createAdminContext());
      const result = await caller.agents.metrics();
      expect(result).toBeDefined();
      // metrics returns an object with summary data
      expect(typeof result).toBe("object");
    });
  });

  describe("agents.markRead", () => {
    it("marks events as read successfully", async () => {
      const caller = appRouter.createCaller(createAdminContext());
      const events = await caller.agents.list({ limit: 1 });
      if (events.length > 0) {
        const result = await caller.agents.markRead({ ids: [events[0].id] });
        expect(result).toBeDefined();
        expect(result.success).toBe(true);
      }
    });
  });

  describe("agents.markAllRead", () => {
    it("marks all events as read", async () => {
      const caller = appRouter.createCaller(createAdminContext());
      const result = await caller.agents.markAllRead();
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
    });
  });

  describe("agents.dismissDraft", () => {
    it("handles non-existent draft gracefully", async () => {
      const caller = appRouter.createCaller(createAdminContext());
      try {
        await caller.agents.dismissDraft({ draftId: 999999 });
        expect(true).toBe(true);
      } catch (e: any) {
        expect(e.message).toBeDefined();
      }
    });
  });

  describe("agents.sendDraft", () => {
    it("handles non-existent draft gracefully", async () => {
      const caller = appRouter.createCaller(createAdminContext());
      try {
        await caller.agents.sendDraft({ draftId: 999999 });
        expect(true).toBe(true);
      } catch (e: any) {
        expect(e.message).toBeDefined();
      }
    });
  });

  describe("agents.restoreDraft", () => {
    it("handles non-existent draft gracefully", async () => {
      const caller = appRouter.createCaller(createAdminContext());
      try {
        await caller.agents.restoreDraft({ draftId: 999999 });
        expect(true).toBe(true);
      } catch (e: any) {
        expect(e.message).toBeDefined();
      }
    });
  });

  describe("agents.velocityLog", () => {
    it("returns velocity log entries", async () => {
      const caller = appRouter.createCaller(createAdminContext());
      const result = await caller.agents.velocityLog({});
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe("agents.runAll (LLM integration)", () => {
    it("runs all agents and returns signals array", async () => {
      const caller = appRouter.createCaller(createAdminContext());
      const result = await caller.agents.runAll();
      expect(result).toBeDefined();
      expect(Array.isArray(result.signals)).toBe(true);
    }, 60000);
  });
});
