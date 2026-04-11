// ============================================================================
// Client Action Flows — Tests for the 4 action flows from Velocity Feed
// 1. approve_followup  2. reassign_task  3. confirm_distribution  4. unblock_venture
// ============================================================================
import { describe, it, expect, vi } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAdminContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "admin-action-test",
    email: "admin@ventex.com",
    name: "Admin User",
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

function createClientContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 2,
    openId: "client-action-test",
    email: "client@royalton.com",
    name: "Client User",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
    organizationId: 2,
  } as AuthenticatedUser;

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

describe("Client Action Flows", () => {
  // ── clientFeed ──────────────────────────────────────────────────────────
  describe("agents.clientFeed", () => {
    it("returns categorized feed for client users", async () => {
      const caller = appRouter.createCaller(createClientContext());
      const result = await caller.agents.clientFeed({ organizationId: 2, limit: 20 });
      expect(result).toBeDefined();
      expect(result).toHaveProperty("actionNeeded");
      expect(result).toHaveProperty("completed");
      expect(result).toHaveProperty("watching");
      expect(Array.isArray(result.actionNeeded)).toBe(true);
      expect(Array.isArray(result.completed)).toBe(true);
      expect(Array.isArray(result.watching)).toBe(true);
    });

    it("returns feed for admin users with org filter", async () => {
      const caller = appRouter.createCaller(createAdminContext());
      const result = await caller.agents.clientFeed({ organizationId: 2, limit: 10 });
      expect(result).toBeDefined();
      expect(Array.isArray(result.actionNeeded)).toBe(true);
    });
  });

  // ── clientDismiss ──────────────────────────────────────────────────────
  describe("agents.clientDismiss", () => {
    it("returns success when dismissing an event", async () => {
      const caller = appRouter.createCaller(createClientContext());
      // Use a non-existent ID — should still succeed (no-op update)
      const result = await caller.agents.clientDismiss({ eventId: 999999 });
      expect(result).toEqual({ success: true });
    });
  });

  // ── clientAction — generic ─────────────────────────────────────────────
  describe("agents.clientAction (generic)", () => {
    it("rejects with invalid event ID", async () => {
      const caller = appRouter.createCaller(createClientContext());
      await expect(
        caller.agents.clientAction({
          eventId: 999999,
          actionType: "generic",
        })
      ).rejects.toThrow("Event not found");
    });
  });

  // ── clientAction — approve_followup ────────────────────────────────────
  describe("agents.clientAction (approve_followup)", () => {
    it("rejects with non-existent event", async () => {
      const caller = appRouter.createCaller(createClientContext());
      await expect(
        caller.agents.clientAction({
          eventId: 999999,
          actionType: "approve_followup",
          payload: { sendEmail: false },
        })
      ).rejects.toThrow("Event not found");
    });

    it("accepts valid actionType enum values", async () => {
      // Verify the enum validation works
      const caller = appRouter.createCaller(createClientContext());
      await expect(
        caller.agents.clientAction({
          eventId: 999999,
          actionType: "approve_followup" as any,
          payload: {},
        })
      ).rejects.toThrow("Event not found");
    });
  });

  // ── clientAction — reassign_task ───────────────────────────────────────
  describe("agents.clientAction (reassign_task)", () => {
    it("rejects with non-existent event", async () => {
      const caller = appRouter.createCaller(createClientContext());
      await expect(
        caller.agents.clientAction({
          eventId: 999999,
          actionType: "reassign_task",
          payload: {
            newAssigneeName: "Test User",
            newDueDate: "2026-04-15",
          },
        })
      ).rejects.toThrow("Event not found");
    });
  });

  // ── clientAction — confirm_distribution ────────────────────────────────
  describe("agents.clientAction (confirm_distribution)", () => {
    it("rejects with non-existent event", async () => {
      const caller = appRouter.createCaller(createClientContext());
      await expect(
        caller.agents.clientAction({
          eventId: 999999,
          actionType: "confirm_distribution",
          payload: { sendEmail: false },
        })
      ).rejects.toThrow("Event not found");
    });
  });

  // ── clientAction — unblock_venture ─────────────────────────────────────
  describe("agents.clientAction (unblock_venture)", () => {
    it("rejects with non-existent event", async () => {
      const caller = appRouter.createCaller(createClientContext());
      await expect(
        caller.agents.clientAction({
          eventId: 999999,
          actionType: "unblock_venture",
          payload: {
            unblockAction: "assign_task",
            taskTitle: "Test task",
          },
        })
      ).rejects.toThrow("Event not found");
    });
  });

  // ── getEventDetail ─────────────────────────────────────────────────────
  describe("agents.getEventDetail", () => {
    it("returns null for non-existent event", async () => {
      const caller = appRouter.createCaller(createClientContext());
      const result = await caller.agents.getEventDetail({ eventId: 999999 });
      expect(result).toBeNull();
    });

    it("returns event detail with linked entities when event exists", async () => {
      const caller = appRouter.createCaller(createAdminContext());
      // First get an event from the list
      const events = await caller.agents.list({ limit: 1 });
      if (events.length > 0) {
        const detail = await caller.agents.getEventDetail({ eventId: events[0].id });
        expect(detail).toBeDefined();
        expect(detail).toHaveProperty("event");
        expect(detail).toHaveProperty("draft");
        expect(detail).toHaveProperty("task");
        expect(detail).toHaveProperty("distribution");
        expect(detail).toHaveProperty("venture");
        expect(detail).toHaveProperty("availableTeam");
        expect(detail!.event.id).toBe(events[0].id);
      }
    });
  });

  // ── getDraft ───────────────────────────────────────────────────────────
  describe("agents.getDraft", () => {
    it("returns null for non-existent draft", async () => {
      const caller = appRouter.createCaller(createClientContext());
      const result = await caller.agents.getDraft({ draftId: 999999 });
      expect(result).toBeNull();
    });
  });

  // ── operatorOversight (admin only) ─────────────────────────────────────
  describe("agents.operatorOversight", () => {
    it("returns oversight data for admin users", async () => {
      const caller = appRouter.createCaller(createAdminContext());
      const result = await caller.agents.operatorOversight({ limit: 10, hoursBack: 48 });
      expect(result).toBeDefined();
      expect(result).toHaveProperty("agentActions");
      expect(result).toHaveProperty("clientActions");
      expect(result).toHaveProperty("unactioned");
      expect(result).toHaveProperty("escalations");
      expect(Array.isArray(result.agentActions)).toBe(true);
    });

    it("rejects non-admin users", async () => {
      const caller = appRouter.createCaller(createClientContext());
      await expect(
        caller.agents.operatorOversight({ limit: 10, hoursBack: 48 })
      ).rejects.toThrow();
    });
  });

  // ── Input validation ───────────────────────────────────────────────────
  describe("input validation", () => {
    it("rejects invalid actionType enum value", async () => {
      const caller = appRouter.createCaller(createClientContext());
      await expect(
        caller.agents.clientAction({
          eventId: 1,
          actionType: "invalid_action" as any,
        })
      ).rejects.toThrow();
    });

    it("accepts all valid actionType values", async () => {
      const validTypes = ["approve_followup", "reassign_task", "confirm_distribution", "unblock_venture", "generic"];
      const caller = appRouter.createCaller(createClientContext());
      for (const actionType of validTypes) {
        // All should fail with "Event not found" (not validation error)
        await expect(
          caller.agents.clientAction({
            eventId: 999999,
            actionType: actionType as any,
          })
        ).rejects.toThrow("Event not found");
      }
    });
  });
});
