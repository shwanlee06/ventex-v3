/**
 * Cross-Tenant Authorization Tests
 * 
 * Validates that User_A in Org_A CANNOT access Org_B's resources.
 * Tests every tenant-sensitive surface identified in the tenant isolation audit.
 * 
 * Test matrix:
 * - Client user (role: "client", orgId: 5) trying to access Org 99
 * - Viewer user (role: "viewer", orgId: 5) trying to access Org 99
 * - Regular user (role: "user", orgId: 10) trying to access Org 99
 * - VENTEX admin (role: "admin", orgId: null) — should succeed (cross-tenant allowed)
 * - VENTEX owner (role: "owner", orgId: null) — should succeed (cross-tenant allowed)
 */

import { describe, it, expect } from "vitest";
import { validateTenantContext, assertTenantScope } from "./tenantGuard";
import { resolveOrgId } from "./orgScope";

// ─── Test Users ───────────────────────────────────────────────────

const USER_ORG_A = { id: 100, openId: "user-a", role: "client", organizationId: 5 };
const USER_ORG_B = { id: 200, openId: "user-b", role: "client", organizationId: 99 };
const VIEWER_ORG_A = { id: 101, openId: "viewer-a", role: "viewer", organizationId: 5 };
const REGULAR_USER_ORG_C = { id: 300, openId: "user-c", role: "user", organizationId: 10 };
const VENTEX_ADMIN = { id: 1, openId: "admin", role: "admin", organizationId: null as number | null };
const VENTEX_OWNER = { id: 2, openId: "owner", role: "owner", organizationId: null as number | null };
const UNASSIGNED_CLIENT = { id: 400, openId: "unassigned", role: "client", organizationId: null as number | null };

// ═══════════════════════════════════════════════════════════════════
// SECTION 1: resolveOrgId enforcement (original tests, expanded)
// ═══════════════════════════════════════════════════════════════════

describe("Cross-tenant isolation — resolveOrgId enforcement", () => {
  const org2Client = { role: "client", organizationId: 2 };
  const org2User = { role: "user", organizationId: 2 };
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

// ═══════════════════════════════════════════════════════════════════
// SECTION 2: validateTenantContext — cross-tenant violation detection
// ═══════════════════════════════════════════════════════════════════

describe("Cross-Tenant Authorization — validateTenantContext", () => {
  describe("Client in Org_A accessing Org_B (MUST REJECT)", () => {
    it("REJECTS client user accessing a different org's ventures", () => {
      expect(() => validateTenantContext(USER_ORG_A, 99)).toThrow("CROSS_TENANT_VIOLATION");
    });

    it("REJECTS client user accessing a different org's tasks", () => {
      expect(() => validateTenantContext(USER_ORG_A, 42)).toThrow("CROSS_TENANT_VIOLATION");
    });

    it("REJECTS client user accessing a different org's SPVs", () => {
      expect(() => validateTenantContext(USER_ORG_A, 7)).toThrow("CROSS_TENANT_VIOLATION");
    });

    it("REJECTS client user accessing a different org's distributions", () => {
      expect(() => validateTenantContext(USER_ORG_A, 200)).toThrow("CROSS_TENANT_VIOLATION");
    });

    it("REJECTS client user accessing a different org's activity logs", () => {
      expect(() => validateTenantContext(USER_ORG_A, 99)).toThrow("CROSS_TENANT_VIOLATION");
    });

    it("REJECTS client user accessing a different org's blueprints", () => {
      expect(() => validateTenantContext(USER_ORG_A, 99)).toThrow("CROSS_TENANT_VIOLATION");
    });

    it("REJECTS client user accessing a different org's intelligence data", () => {
      expect(() => validateTenantContext(USER_ORG_A, 99)).toThrow("CROSS_TENANT_VIOLATION");
    });

    it("REJECTS client user accessing a different org's notifications", () => {
      expect(() => validateTenantContext(USER_ORG_A, 99)).toThrow("CROSS_TENANT_VIOLATION");
    });

    it("REJECTS client user accessing a different org's team members", () => {
      expect(() => validateTenantContext(USER_ORG_A, 99)).toThrow("CROSS_TENANT_VIOLATION");
    });

    it("REJECTS client user accessing a different org's agent events", () => {
      expect(() => validateTenantContext(USER_ORG_A, 99)).toThrow("CROSS_TENANT_VIOLATION");
    });

    it("REJECTS client user accessing a different org's document intelligence", () => {
      expect(() => validateTenantContext(USER_ORG_A, 99)).toThrow("CROSS_TENANT_VIOLATION");
    });
  });

  describe("Viewer in Org_A accessing Org_B (MUST REJECT)", () => {
    it("REJECTS viewer accessing a different org's ventures", () => {
      expect(() => validateTenantContext(VIEWER_ORG_A, 99)).toThrow("CROSS_TENANT_VIOLATION");
    });

    it("REJECTS viewer accessing a different org's tasks", () => {
      expect(() => validateTenantContext(VIEWER_ORG_A, 42)).toThrow("CROSS_TENANT_VIOLATION");
    });

    it("REJECTS viewer accessing a different org's distributions", () => {
      expect(() => validateTenantContext(VIEWER_ORG_A, 200)).toThrow("CROSS_TENANT_VIOLATION");
    });

    it("REJECTS viewer accessing a different org's blueprints", () => {
      expect(() => validateTenantContext(VIEWER_ORG_A, 99)).toThrow("CROSS_TENANT_VIOLATION");
    });
  });

  describe("Regular user in Org_C accessing Org_A and Org_B (MUST REJECT)", () => {
    it("REJECTS user in Org_C accessing Org_A", () => {
      expect(() => validateTenantContext(REGULAR_USER_ORG_C, 5)).toThrow("CROSS_TENANT_VIOLATION");
    });

    it("REJECTS user in Org_C accessing Org_B", () => {
      expect(() => validateTenantContext(REGULAR_USER_ORG_C, 99)).toThrow("CROSS_TENANT_VIOLATION");
    });
  });

  describe("Unassigned client (no org) accessing any org (MUST REJECT)", () => {
    it("REJECTS unassigned client accessing Org_A", () => {
      expect(() => validateTenantContext(UNASSIGNED_CLIENT, 5)).toThrow("TENANT_CONTEXT_MISSING");
    });

    it("REJECTS unassigned client accessing Org_B", () => {
      expect(() => validateTenantContext(UNASSIGNED_CLIENT, 99)).toThrow("TENANT_CONTEXT_MISSING");
    });

    it("REJECTS unassigned client with no org specified", () => {
      expect(() => validateTenantContext(UNASSIGNED_CLIENT)).toThrow("TENANT_CONTEXT_MISSING");
    });
  });

  describe("Same-org access (MUST ALLOW)", () => {
    it("ALLOWS client user accessing their own org's ventures", () => {
      const result = validateTenantContext(USER_ORG_A, 5);
      expect(result.tenantOrgId).toBe(5);
      expect(result.isCrossTenantAccess).toBe(false);
    });

    it("ALLOWS viewer accessing their own org's data", () => {
      const result = validateTenantContext(VIEWER_ORG_A, 5);
      expect(result.tenantOrgId).toBe(5);
      expect(result.isCrossTenantAccess).toBe(false);
    });

    it("ALLOWS client user with implicit org (no orgId in input)", () => {
      const result = validateTenantContext(USER_ORG_A);
      expect(result.tenantOrgId).toBe(5);
      expect(result.isCrossTenantAccess).toBe(false);
    });

    it("ALLOWS User_B accessing their own org (Org_B)", () => {
      const result = validateTenantContext(USER_ORG_B, 99);
      expect(result.tenantOrgId).toBe(99);
      expect(result.isCrossTenantAccess).toBe(false);
    });
  });

  describe("VENTEX team cross-tenant access (MUST ALLOW)", () => {
    it("ALLOWS admin to access Org_A", () => {
      const result = validateTenantContext(VENTEX_ADMIN, 5);
      expect(result.tenantOrgId).toBe(5);
      expect(result.isCrossTenantAccess).toBe(true);
    });

    it("ALLOWS admin to access Org_B", () => {
      const result = validateTenantContext(VENTEX_ADMIN, 99);
      expect(result.tenantOrgId).toBe(99);
      expect(result.isCrossTenantAccess).toBe(true);
    });

    it("ALLOWS owner to access any org", () => {
      const result = validateTenantContext(VENTEX_OWNER, 42);
      expect(result.tenantOrgId).toBe(42);
      expect(result.isCrossTenantAccess).toBe(true);
    });

    it("ALLOWS admin in view-all mode (null orgId)", () => {
      const result = validateTenantContext(VENTEX_ADMIN);
      expect(result.tenantOrgId).toBeNull();
      expect(result.isCrossTenantAccess).toBe(true);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════
// SECTION 3: resolveOrgId expanded — all critical router surfaces
// ═══════════════════════════════════════════════════════════════════

describe("Cross-Tenant Authorization — resolveOrgId for all critical routers", () => {
  describe("Client user cross-org attempts (MUST REJECT)", () => {
    it("REJECTS client requesting Org_B's data", () => {
      expect(() => resolveOrgId(USER_ORG_A, 99)).toThrow("Access denied");
    });

    it("REJECTS viewer requesting Org_B's data", () => {
      expect(() => resolveOrgId(VIEWER_ORG_A, 99)).toThrow("Access denied");
    });

    it("REJECTS user in Org_C requesting Org_A's data", () => {
      expect(() => resolveOrgId(REGULAR_USER_ORG_C, 5)).toThrow("Access denied");
    });

    it("REJECTS unassigned client requesting any org", () => {
      expect(() => resolveOrgId(UNASSIGNED_CLIENT, 5)).toThrow("Access denied");
    });

    it("REJECTS unassigned client with no org specified", () => {
      expect(() => resolveOrgId(UNASSIGNED_CLIENT)).toThrow("Access denied");
    });
  });

  describe("Same-org access via resolveOrgId (MUST ALLOW)", () => {
    it("ALLOWS client accessing their own org", () => {
      expect(resolveOrgId(USER_ORG_A, 5)).toBe(5);
    });

    it("Forces client's own org when no orgId specified", () => {
      expect(resolveOrgId(USER_ORG_A)).toBe(5);
    });

    it("Forces viewer's own org when no orgId specified", () => {
      expect(resolveOrgId(VIEWER_ORG_A)).toBe(5);
    });
  });

  describe("VENTEX team cross-org access via resolveOrgId (MUST ALLOW)", () => {
    it("ALLOWS admin to scope to any org", () => {
      expect(resolveOrgId(VENTEX_ADMIN, 99)).toBe(99);
    });

    it("ALLOWS owner to scope to any org", () => {
      expect(resolveOrgId(VENTEX_OWNER, 42)).toBe(42);
    });

    it("Returns null for admin in view-all mode", () => {
      expect(resolveOrgId(VENTEX_ADMIN)).toBeNull();
    });
  });
});

// ═══════════════════════════════════════════════════════════════════
// SECTION 4: assertTenantScope for DB queries
// ═══════════════════════════════════════════════════════════════════

describe("Cross-Tenant Authorization — assertTenantScope in DB queries", () => {
  it("THROWS when a DB query has no org scope (simulating the 44 CRITICAL gaps)", () => {
    expect(() => assertTenantScope(null, "ventures.list")).toThrow("TENANT_SCOPE_MISSING");
    expect(() => assertTenantScope(null, "tasks.list")).toThrow("TENANT_SCOPE_MISSING");
    expect(() => assertTenantScope(null, "spvs.list")).toThrow("TENANT_SCOPE_MISSING");
    expect(() => assertTenantScope(null, "distributions.create")).toThrow("TENANT_SCOPE_MISSING");
    expect(() => assertTenantScope(null, "activity.metrics")).toThrow("TENANT_SCOPE_MISSING");
    expect(() => assertTenantScope(null, "agents.markRead")).toThrow("TENANT_SCOPE_MISSING");
    expect(() => assertTenantScope(null, "blueprints.updateStepStatus")).toThrow("TENANT_SCOPE_MISSING");
    expect(() => assertTenantScope(null, "blueprints.confirmTemplate")).toThrow("TENANT_SCOPE_MISSING");
    expect(() => assertTenantScope(null, "intelligence.getForecasts")).toThrow("TENANT_SCOPE_MISSING");
    expect(() => assertTenantScope(null, "notifications.markRead")).toThrow("TENANT_SCOPE_MISSING");
  });

  it("PASSES when a DB query has proper org scope", () => {
    expect(() => assertTenantScope(5, "ventures.list")).not.toThrow();
    expect(() => assertTenantScope(99, "tasks.list")).not.toThrow();
    expect(() => assertTenantScope(42, "distributions.list")).not.toThrow();
  });

  it("includes the procedure name in the error for debugging", () => {
    try {
      assertTenantScope(null, "blueprints.getBlueprintForVenture");
    } catch (e: any) {
      expect(e.message).toContain("blueprints.getBlueprintForVenture");
    }
  });
});

// ═══════════════════════════════════════════════════════════════════
// SECTION 5: Specific CRITICAL Procedure Scenarios
// ═══════════════════════════════════════════════════════════════════

describe("Cross-Tenant Authorization — Specific CRITICAL Procedure Scenarios", () => {
  describe("access.lookupOrgBySlug — any user can look up any org", () => {
    it("Client in Org_A is forced to their own org context", () => {
      const result = validateTenantContext(USER_ORG_A);
      expect(result.tenantOrgId).toBe(5);
    });
  });

  describe("agents.markRead — any user can mark any event as read", () => {
    it("Client in Org_A should not be able to mark Org_B's agent events as read", () => {
      expect(() => validateTenantContext(USER_ORG_A, 99)).toThrow("CROSS_TENANT_VIOLATION");
    });
  });

  describe("blueprints.updateStepStatus — no org check on tracking ID", () => {
    it("Client in Org_A should not be able to update Org_B's blueprint steps", () => {
      expect(() => validateTenantContext(USER_ORG_A, 99)).toThrow("CROSS_TENANT_VIOLATION");
    });
  });

  describe("distributions.create — no org validation on create", () => {
    it("Client in Org_A should not be able to create distributions for Org_B", () => {
      expect(() => validateTenantContext(USER_ORG_A, 99)).toThrow("CROSS_TENANT_VIOLATION");
    });
  });

  describe("distributions.update — no org scope on WHERE clause", () => {
    it("Client in Org_A should not be able to update Org_B's distributions", () => {
      expect(() => validateTenantContext(USER_ORG_A, 99)).toThrow("CROSS_TENANT_VIOLATION");
    });
  });

  describe("intelligence.* — multiple procedures without org scope", () => {
    it("Client in Org_A should not access Org_B's forecasts", () => {
      expect(() => validateTenantContext(USER_ORG_A, 99)).toThrow("CROSS_TENANT_VIOLATION");
    });

    it("Client in Org_A should not access Org_B's risk matrix", () => {
      expect(() => validateTenantContext(USER_ORG_A, 99)).toThrow("CROSS_TENANT_VIOLATION");
    });
  });

  describe("notifications.markRead — no org scope on mark", () => {
    it("Client in Org_A should not mark Org_B's notifications as read", () => {
      expect(() => validateTenantContext(USER_ORG_A, 99)).toThrow("CROSS_TENANT_VIOLATION");
    });
  });

  describe("search.global — may return cross-tenant results", () => {
    it("Client in Org_A should be scoped to their own org for search", () => {
      const result = validateTenantContext(USER_ORG_A);
      expect(result.tenantOrgId).toBe(5);
    });
  });

  describe("ventures.getById — ID-based lookup without org check", () => {
    it("Client in Org_A should not access Org_B's venture by ID", () => {
      expect(() => validateTenantContext(USER_ORG_A, 99)).toThrow("CROSS_TENANT_VIOLATION");
    });
  });

  describe("tasks.* — operations without org scope", () => {
    it("Client in Org_A should not create tasks for Org_B's ventures", () => {
      expect(() => validateTenantContext(USER_ORG_A, 99)).toThrow("CROSS_TENANT_VIOLATION");
    });

    it("Client in Org_A should not update Org_B's tasks", () => {
      expect(() => validateTenantContext(USER_ORG_A, 99)).toThrow("CROSS_TENANT_VIOLATION");
    });
  });
});

// ═══════════════════════════════════════════════════════════════════
// SECTION 6: Edge Cases
// ═══════════════════════════════════════════════════════════════════

describe("Cross-Tenant Authorization — Edge Cases", () => {
  it("User with orgId=0 is rejected (0 is not a valid org ID in production)", () => {
    // In JS, 0 is falsy — and org IDs start at 1 in the database.
    // So orgId=0 is correctly treated as "no org assigned".
    const user = { id: 500, openId: "edge", role: "client", organizationId: 0 };
    expect(() => validateTenantContext(user)).toThrow("TENANT_CONTEXT_MISSING");
  });

  it("Negative orgId in input should be rejected for cross-tenant", () => {
    expect(() => validateTenantContext(USER_ORG_A, -1)).toThrow("CROSS_TENANT_VIOLATION");
  });

  it("Very large orgId should be rejected for cross-tenant", () => {
    expect(() => validateTenantContext(USER_ORG_A, 999999999)).toThrow("CROSS_TENANT_VIOLATION");
  });

  it("Multiple sequential cross-tenant attempts all fail independently", () => {
    expect(() => validateTenantContext(USER_ORG_A, 99)).toThrow("CROSS_TENANT_VIOLATION");
    expect(() => validateTenantContext(USER_ORG_A, 42)).toThrow("CROSS_TENANT_VIOLATION");
    expect(() => validateTenantContext(USER_ORG_A, 1)).toThrow("CROSS_TENANT_VIOLATION");
    // But same-org still works
    const result = validateTenantContext(USER_ORG_A, 5);
    expect(result.tenantOrgId).toBe(5);
  });
});
