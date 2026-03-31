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

describe("Portal Router", () => {
  describe("portal.getData", () => {
    it("returns portal data for admin user (operator preview)", async () => {
      const caller = appRouter.createCaller(createAdminContext());
      // slug "royalton" is org ID 2 (Example Venture Holding)
      const result = await caller.portal.getData({ orgSlug: "royalton" });

      expect(result).toBeDefined();
      expect(result.orgName).toBeDefined();
      expect(typeof result.orgName).toBe("string");
      expect(result.orgSlug).toBe("royalton");
      expect(result.isOperatorPreview).toBe(true);
      expect(Array.isArray(result.thisWeek)).toBe(true);
      expect(Array.isArray(result.portfolio)).toBe(true);
      expect(Array.isArray(result.comingUp)).toBe(true);
    });

    it("returns portfolio ventures with client-friendly stage names", async () => {
      const caller = appRouter.createCaller(createAdminContext());
      const result = await caller.portal.getData({ orgSlug: "royalton" });

      // Stage names should be client-friendly (not internal)
      const internalStages = ["In Validation", "In Fundraising", "Active ventures"];
      for (const v of result.portfolio) {
        expect(internalStages).not.toContain(v.stage);
        expect(v).toHaveProperty("name");
        expect(v).toHaveProperty("sector");
        expect(v).toHaveProperty("statusLine");
        expect(v).toHaveProperty("slug");
      }
    });

    it("thisWeek events do not contain operator jargon", async () => {
      const caller = appRouter.createCaller(createAdminContext());
      const result = await caller.portal.getData({ orgSlug: "royalton" });

      const operatorTerms = [
        "Velocity Agent",
        "Distribution Sentinel",
        "Orchestrator",
        "Overdue Agent",
        "scheduler",
        "cron",
        "pipeline",
        "One-click advance",
      ];

      for (const event of result.thisWeek) {
        for (const term of operatorTerms) {
          expect(event.summary.toLowerCase()).not.toContain(term.toLowerCase());
        }
      }
    });

    it("thisWeek events do not have Advance Stage action labels", async () => {
      const caller = appRouter.createCaller(createAdminContext());
      const result = await caller.portal.getData({ orgSlug: "royalton" });

      for (const event of result.thisWeek) {
        if (event.actionLabel) {
          expect(event.actionLabel).not.toBe("Advance Stage");
          expect(event.actionLabel).not.toBe("Review Blueprint");
          expect(event.actionLabel).not.toBe("Run Agent");
        }
      }
    });

    it("thisWeek events are deduplicated", async () => {
      const caller = appRouter.createCaller(createAdminContext());
      const result = await caller.portal.getData({ orgSlug: "royalton" });

      // Check that no two events have the same dedup key
      const keys = new Set<string>();
      for (const event of result.thisWeek) {
        const key = event.summary.toLowerCase().replace(/\d/g, "").trim();
        expect(keys.has(key)).toBe(false);
        keys.add(key);
      }
    });

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

    it("allows client user to access their own org's portal", async () => {
      // Org ID 2 is the "royalton" slug org
      const caller = appRouter.createCaller(createClientContext(2));
      const result = await caller.portal.getData({ orgSlug: "royalton" });

      expect(result).toBeDefined();
      expect(result.orgSlug).toBe("royalton");
      expect(result.isOperatorPreview).toBe(false);
    });

    it("comingUp items have title and optional dueDate", async () => {
      const caller = appRouter.createCaller(createAdminContext());
      const result = await caller.portal.getData({ orgSlug: "royalton" });

      for (const item of result.comingUp) {
        expect(item).toHaveProperty("id");
        expect(item).toHaveProperty("title");
        expect(typeof item.title).toBe("string");
      }
    });

    it("rejects empty orgSlug", async () => {
      const caller = appRouter.createCaller(createAdminContext());
      await expect(
        caller.portal.getData({ orgSlug: "" })
      ).rejects.toThrow();
    });
  });
});
