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

describe("Portal Router — Vision Compliance", () => {
  // ══════════════════════════════════════════════════════════════════
  // FIX 4 — Velocity Feed: 3 card types (amber/teal/gray)
  // ══════════════════════════════════════════════════════════════════

  describe("Velocity Feed — 3 card types", () => {
    it("returns actionCards, completedCards, and watchingCards arrays", async () => {
      const caller = appRouter.createCaller(createAdminContext());
      const result = await caller.portal.getData({ orgSlug: "royalton" });

      expect(result).toHaveProperty("actionCards");
      expect(result).toHaveProperty("completedCards");
      expect(result).toHaveProperty("watchingCards");
      expect(Array.isArray(result.actionCards)).toBe(true);
      expect(Array.isArray(result.completedCards)).toBe(true);
      expect(Array.isArray(result.watchingCards)).toBe(true);
    });

    it("actionCards (amber) have required fields: id, summary, actionFlow, actionLabel", async () => {
      const caller = appRouter.createCaller(createAdminContext());
      const result = await caller.portal.getData({ orgSlug: "royalton" });

      for (const card of result.actionCards) {
        expect(card).toHaveProperty("id");
        expect(card).toHaveProperty("summary");
        expect(typeof card.summary).toBe("string");
        expect(card.summary.length).toBeGreaterThan(0);
        expect(card).toHaveProperty("actionFlow");
        expect(card).toHaveProperty("actionLabel");
        expect(card).toHaveProperty("ventureName");
        expect(card).toHaveProperty("ventureId");
      }
    });

    it("actionCards have valid actionFlow values", async () => {
      const caller = appRouter.createCaller(createAdminContext());
      const result = await caller.portal.getData({ orgSlug: "royalton" });

      const validFlows = [
        "advance_stage",
        "approve_followup",
        "confirm_distribution",
        "unblock_venture",
        "view_task",
        null,
      ];

      for (const card of result.actionCards) {
        expect(validFlows).toContain(card.actionFlow);
      }
    });

    it("completedCards (teal) have id, summary, date, ventureName", async () => {
      const caller = appRouter.createCaller(createAdminContext());
      const result = await caller.portal.getData({ orgSlug: "royalton" });

      for (const card of result.completedCards) {
        expect(card).toHaveProperty("id");
        expect(card).toHaveProperty("summary");
        expect(card).toHaveProperty("date");
        expect(card).toHaveProperty("ventureName");
      }
    });

    it("watchingCards (gray) have id, summary, date, ventureName", async () => {
      const caller = appRouter.createCaller(createAdminContext());
      const result = await caller.portal.getData({ orgSlug: "royalton" });

      for (const card of result.watchingCards) {
        expect(card).toHaveProperty("id");
        expect(card).toHaveProperty("summary");
        expect(card).toHaveProperty("date");
        expect(card).toHaveProperty("ventureName");
      }
    });

    it("no card type contains raw agent names", async () => {
      const caller = appRouter.createCaller(createAdminContext());
      const result = await caller.portal.getData({ orgSlug: "royalton" });

      const agentNames = ["Velocity Agent", "Distribution Sentinel", "Orchestrator", "Overdue Agent"];
      const allCards = [
        ...result.actionCards.map((c) => c.summary),
        ...result.completedCards.map((c) => c.summary),
        ...result.watchingCards.map((c) => c.summary),
      ];

      for (const summary of allCards) {
        for (const name of agentNames) {
          expect(summary.toLowerCase()).not.toContain(name.toLowerCase());
        }
      }
    });

    it("no card type contains square bracket content", async () => {
      const caller = appRouter.createCaller(createAdminContext());
      const result = await caller.portal.getData({ orgSlug: "royalton" });

      const allCards = [
        ...result.actionCards.map((c) => c.summary),
        ...result.completedCards.map((c) => c.summary),
        ...result.watchingCards.map((c) => c.summary),
      ];

      for (const summary of allCards) {
        expect(summary).not.toMatch(/\[.*\]/);
      }
    });

    it("cards are deduplicated within each type", async () => {
      const caller = appRouter.createCaller(createAdminContext());
      const result = await caller.portal.getData({ orgSlug: "royalton" });

      for (const cards of [result.actionCards, result.completedCards, result.watchingCards]) {
        const keys = new Set<string>();
        for (const card of cards) {
          const key = `${card.ventureName || ""}::${card.summary.toLowerCase().replace(/\d/g, "").trim()}`;
          expect(keys.has(key)).toBe(false);
          keys.add(key);
        }
      }
    });

    it("actionCards use client-friendly stage names", async () => {
      const caller = appRouter.createCaller(createAdminContext());
      const result = await caller.portal.getData({ orgSlug: "royalton" });

      const internalStages = ["In Validation", "In Fundraising", "Active ventures", "In Execution"];
      for (const card of result.actionCards) {
        if (card.fromStage) expect(internalStages).not.toContain(card.fromStage);
        if (card.toStage) expect(internalStages).not.toContain(card.toStage);
      }
    });
  });

  // ══════════════════════════════════════════════════════════════════
  // Velocity Summary
  // ══════════════════════════════════════════════════════════════════

  describe("Velocity Summary", () => {
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

  // ══════════════════════════════════════════════════════════════════
  // Portfolio
  // ══════════════════════════════════════════════════════════════════

  describe("Portfolio — venture cards", () => {
    it("portfolio ventures have lastAgentAction and lastAgentActionType fields", async () => {
      const caller = appRouter.createCaller(createAdminContext());
      const result = await caller.portal.getData({ orgSlug: "royalton" });

      for (const v of result.portfolio) {
        expect(v).toHaveProperty("lastAgentAction");
        expect(v).toHaveProperty("lastAgentActionType");
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

  // ══════════════════════════════════════════════════════════════════
  // Operator Preview Mode
  // ══════════════════════════════════════════════════════════════════

  describe("Operator Preview Mode", () => {
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

  // ══════════════════════════════════════════════════════════════════
  // Access control (cross-tenant isolation)
  // ══════════════════════════════════════════════════════════════════

  describe("Access control — cross-tenant isolation", () => {
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

    it("admin can access any org portal", async () => {
      const caller = appRouter.createCaller(createAdminContext());
      const result = await caller.portal.getData({ orgSlug: "royalton" });
      expect(result.orgName).toBeDefined();
    });

    it("client user can access their own org portal", async () => {
      const caller = appRouter.createCaller(createClientContext(2));
      const result = await caller.portal.getData({ orgSlug: "royalton" });
      expect(result.orgName).toBeDefined();
    });
  });

  // ══════════════════════════════════════════════════════════════════
  // FIX 5 — Org name updated
  // ══════════════════════════════════════════════════════════════════

  describe("FIX 5 — Org name", () => {
    it("portal header reads 'Royalton Venture Holding'", async () => {
      const caller = appRouter.createCaller(createAdminContext());
      const result = await caller.portal.getData({ orgSlug: "royalton" });
      expect(result.orgName).toBe("Royalton Venture Holding");
    });
  });

  // ══════════════════════════════════════════════════════════════════
  // resolveAction mutation
  // ══════════════════════════════════════════════════════════════════

  describe("resolveAction mutation", () => {
    it("rejects non-existent event", async () => {
      const caller = appRouter.createCaller(createAdminContext());
      await expect(
        caller.portal.resolveAction({
          eventId: 999999999,
          actionFlow: "approve_followup",
        })
      ).rejects.toThrow("Event not found");
    });

    it("rejects invalid actionFlow value", async () => {
      const caller = appRouter.createCaller(createAdminContext());
      await expect(
        caller.portal.resolveAction({
          eventId: 1,
          actionFlow: "invalid_flow" as any,
        })
      ).rejects.toThrow();
    });
  });

  // ══════════════════════════════════════════════════════════════════
  // Backward compatibility
  // ══════════════════════════════════════════════════════════════════

  describe("Backward compatibility", () => {
    it("still returns thisWeek and comingUp arrays", async () => {
      const caller = appRouter.createCaller(createAdminContext());
      const result = await caller.portal.getData({ orgSlug: "royalton" });

      expect(Array.isArray(result.thisWeek)).toBe(true);
      expect(Array.isArray(result.comingUp)).toBe(true);
    });
  });
});
