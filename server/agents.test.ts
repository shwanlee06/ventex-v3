import { describe, expect, it, vi } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAdminContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "admin-user",
    email: "admin@atlas.com",
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

function createUserContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 2,
    openId: "regular-user",
    email: "user@client.com",
    name: "Regular User",
    loginMethod: "manus",
    role: "user",
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

describe("agents router", () => {
  describe("agents.list", () => {
    it("returns an array of events for authenticated users", async () => {
      const ctx = createUserContext();
      const caller = appRouter.createCaller(ctx);
      const result = await caller.agents.list({ limit: 10 });
      expect(Array.isArray(result)).toBe(true);
    });

    it("returns events with expected shape", async () => {
      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);
      const result = await caller.agents.list({ limit: 5 });
      if (result.length > 0) {
        const event = result[0];
        expect(event).toHaveProperty("id");
        expect(event).toHaveProperty("agentName");
        expect(event).toHaveProperty("eventType");
        expect(event).toHaveProperty("message");
        expect(event).toHaveProperty("severity");
        expect(event).toHaveProperty("isRead");
        expect(event).toHaveProperty("createdAt");
      }
    });

    it("filters by agentName when provided", async () => {
      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);
      const result = await caller.agents.list({ limit: 50, agentName: "Orchestrator" });
      expect(Array.isArray(result)).toBe(true);
      for (const event of result) {
        expect(event.agentName).toBe("Orchestrator");
      }
    });

    it("filters by severity when provided", async () => {
      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);
      const result = await caller.agents.list({ limit: 50, severity: "info" });
      expect(Array.isArray(result)).toBe(true);
      for (const event of result) {
        expect(event.severity).toBe("info");
      }
    });
  });

  describe("agents.metrics", () => {
    it("returns metrics object with expected shape", async () => {
      const ctx = createUserContext();
      const caller = appRouter.createCaller(ctx);
      const result = await caller.agents.metrics();
      expect(result).toHaveProperty("total");
      expect(result).toHaveProperty("unread");
      expect(result).toHaveProperty("critical");
      expect(result).toHaveProperty("warning");
      expect(result).toHaveProperty("byAgent");
      expect(typeof result.total).toBe("number");
      expect(typeof result.unread).toBe("number");
    });
  });

  describe("agents.markAllRead", () => {
    it("returns success for authenticated users", async () => {
      const ctx = createUserContext();
      const caller = appRouter.createCaller(ctx);
      const result = await caller.agents.markAllRead();
      expect(result).toEqual({ success: true });
    });
  });

  describe("agents.markRead", () => {
    it("returns success when marking specific IDs", async () => {
      const ctx = createUserContext();
      const caller = appRouter.createCaller(ctx);
      // Use a non-existent ID — should still succeed
      const result = await caller.agents.markRead({ ids: [999999] });
      expect(result).toEqual({ success: true });
    });
  });

  describe("agents.runAll (admin only)", () => {
    it("rejects non-admin users", async () => {
      const ctx = createUserContext();
      const caller = appRouter.createCaller(ctx);
      await expect(caller.agents.runAll()).rejects.toThrow();
    });

    it("runs all agents and returns signals for admin", async () => {
      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);
      const result = await caller.agents.runAll();
      expect(result).toHaveProperty("success", true);
      expect(result).toHaveProperty("signalCount");
      expect(typeof result.signalCount).toBe("number");
      expect(result.signalCount).toBeGreaterThan(0);
      expect(Array.isArray(result.signals)).toBe(true);
    }, 60000); // LLM calls can be slow
  });

  describe("agents.runSingle (admin only)", () => {
    it("rejects non-admin users", async () => {
      const ctx = createUserContext();
      const caller = appRouter.createCaller(ctx);
      await expect(caller.agents.runSingle({ agentName: "overdue" })).rejects.toThrow();
    });

    it("runs a single agent for admin", async () => {
      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);
      const result = await caller.agents.runSingle({ agentName: "orchestrator" });
      expect(result).toHaveProperty("success", true);
      expect(result).toHaveProperty("signalCount");
      expect(Array.isArray(result.signals)).toBe(true);
    }, 60000);
  });
});
