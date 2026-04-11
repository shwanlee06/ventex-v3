import { describe, expect, it } from "vitest";
import { resolveOrgId } from "./orgScope";

describe("resolveOrgId — cross-tenant isolation", () => {
  // ── VENTEX team (owner/admin) ────────────────────────────────────────
  describe("VENTEX team users", () => {
    const ownerUser = { role: "owner", organizationId: null };
    const adminUser = { role: "admin", organizationId: null };

    it("owner can access any org", () => {
      expect(resolveOrgId(ownerUser, 2)).toBe(2);
      expect(resolveOrgId(ownerUser, 999)).toBe(999);
    });

    it("admin can access any org", () => {
      expect(resolveOrgId(adminUser, 2)).toBe(2);
    });

    it("VENTEX team with no orgId returns null (view all)", () => {
      expect(resolveOrgId(ownerUser, null)).toBeNull();
      expect(resolveOrgId(ownerUser, undefined)).toBeNull();
    });
  });

  // ── Partner users (external, not VENTEX team) ─────────────────────────
  describe("Partner users", () => {
    const partnerWithOrg = { role: "partner", organizationId: 3 };
    const partnerNoOrg = { role: "partner", organizationId: null };

    it("partner with org can access their own org", () => {
      expect(resolveOrgId(partnerWithOrg, 3)).toBe(3);
    });

    it("partner without org throws FORBIDDEN", () => {
      expect(() => resolveOrgId(partnerNoOrg, 2)).toThrow("Access denied");
    });
  });

  // ── Client users ────────────────────────────────────────────────────
  describe("Client users", () => {
    const clientUser = { role: "user", organizationId: 2 };

    it("client can access their own org", () => {
      expect(resolveOrgId(clientUser, 2)).toBe(2);
    });

    it("client is forced to their own org when no orgId requested", () => {
      expect(resolveOrgId(clientUser, null)).toBe(2);
      expect(resolveOrgId(clientUser, undefined)).toBe(2);
    });

    it("client CANNOT access another org — throws FORBIDDEN", () => {
      expect(() => resolveOrgId(clientUser, 999)).toThrow("Access denied");
    });

    it("client CANNOT access org 1 (VENTEX org) — throws FORBIDDEN", () => {
      expect(() => resolveOrgId(clientUser, 1)).toThrow("Access denied");
    });
  });

  // ── Edge cases ──────────────────────────────────────────────────────
  describe("Edge cases", () => {
    it("user with no organization is treated as VENTEX team (internal user)", () => {
      // Business logic: users with no org assignment (null) are considered
      // VENTEX team members, so they can access any org
      const noOrgUser = { role: "user", organizationId: null };
      expect(resolveOrgId(noOrgUser, 2)).toBe(2);
    });

    it("user with no organization and no requested org returns null (view all)", () => {
      const noOrgUser = { role: "user", organizationId: null };
      const result = resolveOrgId(noOrgUser, null);
      expect(result).toBeNull();
    });

    it("VENTEX team user with org assignment can still access any org", () => {
      // Edge case: admin who also has an org assigned
      const adminWithOrg = { role: "admin", organizationId: 5 };
      expect(resolveOrgId(adminWithOrg, 2)).toBe(2);
      expect(resolveOrgId(adminWithOrg, 999)).toBe(999);
    });
  });
});
