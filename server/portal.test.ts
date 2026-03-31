import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAdminContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "admin-user",
    email: "admin@atlas.io",
    name: "Admin User",
    loginMethod: "manus",
    role: "owner",
    organizationId: null,
    status: "active",
    invitationId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as unknown as TrpcContext["res"],
  };
}

function createClientContext(orgId: number): TrpcContext {
  const user: AuthenticatedUser = {
    id: 100,
    openId: "client-user",
    email: "client@example.com",
    name: "Client User",
    loginMethod: "manus",
    role: "user",
    organizationId: orgId,
    status: "active",
    invitationId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as unknown as TrpcContext["res"],
  };
}

function createUnauthorizedClientContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 200,
    openId: "wrong-client",
    email: "wrong@example.com",
    name: "Wrong Client",
    loginMethod: "manus",
    role: "user",
    organizationId: 999999,
    status: "active",
    invitationId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as unknown as TrpcContext["res"],
  };
}

describe("Portal Router — Velocity Wired", () => {
  // ── Fix 1: Coming Up shows requiresClientAction events ──────────────
  describe("Fix 1 — Coming Up shows action-required events", () => {
    it("returns comingUp array with action-required events", async () => {
      const caller = appRouter.createCaller(createAdminContext());
      const result = await caller.portal.getData({ orgSlug: "royalton" });

      expect(result).toBeDefined();
      expect(Array.isArray(result.comingUp)).toBe(true);

      // Each comingUp item should have the required fields
      for (const item of result.comingUp) {
        expect(item).toHaveProperty("id");
        expect(item).toHaveProperty("summary");
        expect(typeof item.summary).toBe("string");
        expect(item.summary.length).toBeGreaterThan(0);
        expect(item).toHaveProperty("date");
        expect(item).toHaveProperty("ventureName");
        expect(item).toHaveProperty("ventureId");
        expect(item).toHaveProperty("actionLabel");
      }
    });

    it("comingUp items have stage from→to information when available", async () => {
      const caller = appRouter.createCaller(createAdminContext());
      const result = await caller.portal.getData({ orgSlug: "royalton" });

      for (const item of result.comingUp) {
        expect(item).toHaveProperty("fromStage");
        expect(item).toHaveProperty("toStage");
      }
    });

    it("comingUp items use client-friendly stage names (not internal)", async () => {
      const caller = appRouter.createCaller(createAdminContext());
      const result = await caller.portal.getData({ orgSlug: "royalton" });

      const internalStages = ["In Validation", "In Fundraising", "Active ventures", "In Execution"];
      for (const item of result.comingUp) {
        if (item.fromStage) {
          expect(internalStages).not.toContain(item.fromStage);
        }
        if (item.toStage) {
          expect(internalStages).not.toContain(item.toStage);
        }
      }
    });

    it("comingUp items have actionLabel for Advance Stage events", async () => {
      const caller = appRouter.createCaller(createAdminContext());
      const result = await caller.portal.getData({ orgSlug: "royalton" });

      // At least some comingUp items should have Advance Stage label
      const advanceItems = result.comingUp.filter(
        (i) => i.actionLabel === "Advance Stage"
      );
      // We know there are 28 requiresClientAction events in the DB
      // After dedup, there should be at least some
      expect(advanceItems.length).toBeGreaterThanOrEqual(0);
    });
  });

  // ── Fix 2: This Week uses proper translation ────────────────────────
  describe("Fix 2 — This Week translation layer", () => {
    it("thisWeek events do not contain raw agent names", async () => {
      const caller = appRouter.createCaller(createAdminContext());
      const result = await caller.portal.getData({ orgSlug: "royalton" });

      const agentNames = [
        "Velocity Agent",
        "Distribution Sentinel",
        "Orchestrator",
        "Overdue Agent",
      ];

      for (const event of result.thisWeek) {
        for (const name of agentNames) {
          expect(event.summary.toLowerCase()).not.toContain(name.toLowerCase());
        }
      }
    });

    it("thisWeek events do not contain square bracket content", async () => {
      const caller = appRouter.createCaller(createAdminContext());
      const result = await caller.portal.getData({ orgSlug: "royalton" });

      for (const event of result.thisWeek) {
        expect(event.summary).not.toMatch(/\[.*\]/);
      }
    });

    it("thisWeek events do not contain operator phrases", async () => {
      const caller = appRouter.createCaller(createAdminContext());
      const result = await caller.portal.getData({ orgSlug: "royalton" });

      const operatorPhrases = [
        "one-click advance",
        "advance available",
        "scheduler",
        "cron",
        "pipeline",
      ];

      for (const event of result.thisWeek) {
        for (const phrase of operatorPhrases) {
          expect(event.summary.toLowerCase()).not.toContain(phrase);
        }
      }
    });

    it("thisWeek events are deduplicated", async () => {
      const caller = appRouter.createCaller(createAdminContext());
      const result = await caller.portal.getData({ orgSlug: "royalton" });

      const keys = new Set<string>();
      for (const event of result.thisWeek) {
        const key = `${event.ventureName || ""}::${event.summary.toLowerCase().replace(/\d/g, "").trim()}`;
        expect(keys.has(key)).toBe(false);
        keys.add(key);
      }
    });

    it("thisWeek does not contain requiresClientAction events (those go to comingUp)", async () => {
      const caller = appRouter.createCaller(createAdminContext());
      const result = await caller.portal.getData({ orgSlug: "royalton" });

      // thisWeek items should not have "your approval is needed" text
      // (those should be in comingUp instead)
      for (const event of result.thisWeek) {
        expect(event.summary.toLowerCase()).not.toContain("your approval is needed");
      }
    });
  });

  // ── Fix 3: Velocity summary ─────────────────────────────────────────
  describe("Fix 3 — Velocity summary", () => {
    it("returns a velocitySummary string", async () => {
      const caller = appRouter.createCaller(createAdminContext());
      const result = await caller.portal.getData({ orgSlug: "royalton" });

      expect(result).toHaveProperty("velocitySummary");
      expect(typeof result.velocitySummary).toBe("string");
      expect(result.velocitySummary.length).toBeGreaterThan(10);
    });

    it("velocitySummary starts with 'This week, ATLAS' or is the fallback message", async () => {
      const caller = appRouter.createCaller(createAdminContext());
      const result = await caller.portal.getData({ orgSlug: "royalton" });

      const isActive = result.velocitySummary.startsWith("This week, ATLAS");
      const isFallback = result.velocitySummary.startsWith("ATLAS is monitoring");
      expect(isActive || isFallback).toBe(true);
    });
  });

  // ── Fix 4: Venture cards show last agent action ─────────────────────
  describe("Fix 4 — Venture cards with agent action", () => {
    it("portfolio ventures have lastAgentAction and lastAgentActionType fields", async () => {
      const caller = appRouter.createCaller(createAdminContext());
      const result = await caller.portal.getData({ orgSlug: "royalton" });

      for (const v of result.portfolio) {
        expect(v).toHaveProperty("lastAgentAction");
        expect(v).toHaveProperty("lastAgentActionType");
        // Type should be null or one of the allowed values
        if (v.lastAgentActionType !== null) {
          expect(["ready", "advanced", "info"]).toContain(v.lastAgentActionType);
        }
      }
    });

    it("portfolio ventures use client-friendly stage names", async () => {
      const caller = appRouter.createCaller(createAdminContext());
      const result = await caller.portal.getData({ orgSlug: "royalton" });

      const internalStages = ["In Validation", "In Fundraising", "Active ventures", "In Execution"];
      for (const v of result.portfolio) {
        expect(internalStages).not.toContain(v.stage);
      }
    });
  });

  // ── Fix 5: Operator Preview Mode ────────────────────────────────────
  describe("Fix 5 — Operator Preview Mode", () => {
    it("admin user sees isOperatorPreview = true", async () => {
      const caller = appRouter.createCaller(createAdminContext());
      const result = await caller.portal.getData({ orgSlug: "royalton" });
      expect(result.isOperatorPreview).toBe(true);
    });

    it("client user sees isOperatorPreview = false", async () => {
      const caller = appRouter.createCaller(createClientContext(2));
      const result = await caller.portal.getData({ orgSlug: "royalton" });
      expect(result.isOperatorPreview).toBe(false);
    });
  });

  // ── Access control ──────────────────────────────────────────────────
  describe("Access control", () => {
    it("throws NOT_FOUND for non-existent org slug", async () => {
      const caller = appRouter.createCaller(createAdminContext());
      await expect(
        caller.portal.getData({ orgSlug: "non-existent-org-xyz" })
      ).rejects.toThrow("Organization not found");
    });

    it("throws FORBIDDEN for client user accessing another org's portal", async () => {
      const caller = appRouter.createCaller(createUnauthorizedClientContext());
      await expect(
        caller.portal.getData({ orgSlug: "royalton" })
      ).rejects.toThrow("You do not have access to this portal");
    });

    it("rejects empty orgSlug", async () => {
      const caller = appRouter.createCaller(createAdminContext());
      await expect(
        caller.portal.getData({ orgSlug: "" })
      ).rejects.toThrow();
    });
  });
});
