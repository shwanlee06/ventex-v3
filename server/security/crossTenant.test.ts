import { describe, expect, it } from "vitest";
import { resolveOrgId } from "./orgScope";

/**
 * Cross-tenant isolation tests for all routers that accept organizationId.
 * Verifies that resolveOrgId blocks client users from accessing other orgs' data.
 */
describe("Cross-tenant isolation — resolveOrgId enforcement", () => {
  // ── Simulate a client user from org 2 (Royalton) ──────────────────
  const org2Client = { role: "client", organizationId: 2 };
  const org2User = { role: "user", organizationId: 2 };

  // ── Simulate VENTEX admin ───────────────────────────────────────────
  const ventexAdmin = { role: "admin", organizationId: null };

  describe("distributions.list — org2 client cannot access org1 data", () => {
    it("org2 client requesting org1 data → FORBIDDEN", () => {
      expect(() => resolveOrgId(org2Client, 1)).toThrow("Access denied");
    });

    it("org2 client requesting org3 data → FORBIDDEN", () => {
      expect(() => resolveOrgId(org2Client, 3)).toThrow("Access denied");
    });

    it("org2 client requesting own org → allowed, returns 2", () => {
      expect(resolveOrgId(org2Client, 2)).toBe(2);
    });

    it("org2 client with no orgId → forced to own org (2)", () => {
      expect(resolveOrgId(org2Client, undefined)).toBe(2);
    });

    it("VENTEX admin requesting org1 → allowed", () => {
      expect(resolveOrgId(ventexAdmin, 1)).toBe(1);
    });

    it("VENTEX admin with no orgId → null (view all)", () => {
      expect(resolveOrgId(ventexAdmin, undefined)).toBeNull();
    });
  });

  describe("team.list — org2 user cannot access org1 team members", () => {
    it("org2 user requesting org1 team → FORBIDDEN", () => {
      expect(() => resolveOrgId(org2User, 1)).toThrow("Access denied");
    });

    it("org2 user requesting own team → allowed", () => {
      expect(resolveOrgId(org2User, 2)).toBe(2);
    });
  });

  describe("distributions.metrics — org2 client cannot see org1 metrics", () => {
    it("org2 client requesting org1 metrics → FORBIDDEN", () => {
      expect(() => resolveOrgId(org2Client, 1)).toThrow("Access denied");
    });

    it("org2 client with no orgId → forced to own org", () => {
      expect(resolveOrgId(org2Client, null)).toBe(2);
    });
  });

  describe("Boundary: user with no org assignment", () => {
    const noOrgClient = { role: "client", organizationId: null };

    it("client with no org → FORBIDDEN (no org assigned)", () => {
      expect(() => resolveOrgId(noOrgClient, 1)).toThrow("Access denied");
    });

    it("client with no org and no requested org → FORBIDDEN", () => {
      expect(() => resolveOrgId(noOrgClient, undefined)).toThrow(
        "Access denied — no organization assigned"
      );
    });
  });
});
