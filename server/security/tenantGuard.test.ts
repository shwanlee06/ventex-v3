/**
 * Tenant Guard — Unit Tests
 * 
 * Tests the core tenant isolation middleware:
 * - Client users without org are REJECTED (thrown, not warned)
 * - Client users cannot access other orgs' data
 * - VENTEX team can access any org
 * - assertTenantScope throws for null org IDs
 */

import { describe, it, expect } from "vitest";
import { validateTenantContext, assertTenantScope } from "./tenantGuard";

describe("Tenant Guard — validateTenantContext", () => {
  // ─── Client Users ───────────────────────────────────────────────

  it("ALLOWS 'user' role with null org (treated as VENTEX team per RBAC)", () => {
    // Per rbac.ts: user role with no org is considered VENTEX team
    const user = { id: 1, openId: "test", role: "user", organizationId: null };
    const result = validateTenantContext(user);
    expect(result.isCrossTenantAccess).toBe(true);
  });

  it("REJECTS 'user' role with non-VENTEX org and no org assigned", () => {
    // A user with role 'client' and no org should be rejected
    const user = { id: 1, openId: "test", role: "client", organizationId: null };
    expect(() => validateTenantContext(user)).toThrow("TENANT_CONTEXT_MISSING");
  });

  it("REJECTS client user with undefined organizationId", () => {
    const user = { id: 1, openId: "test", role: "client", organizationId: undefined };
    expect(() => validateTenantContext(user)).toThrow("TENANT_CONTEXT_MISSING");
  });

  it("REJECTS viewer user with no organizationId", () => {
    const user = { id: 1, openId: "test", role: "viewer", organizationId: null };
    expect(() => validateTenantContext(user)).toThrow("TENANT_CONTEXT_MISSING");
  });

  it("ALLOWS client user with valid organizationId", () => {
    const user = { id: 1, openId: "test", role: "user", organizationId: 5 };
    const result = validateTenantContext(user);
    expect(result.tenantOrgId).toBe(5);
    expect(result.isCrossTenantAccess).toBe(false);
  });

  it("ALLOWS client user requesting their own org", () => {
    const user = { id: 1, openId: "test", role: "client", organizationId: 5 };
    const result = validateTenantContext(user, 5);
    expect(result.tenantOrgId).toBe(5);
    expect(result.isCrossTenantAccess).toBe(false);
  });

  // ─── Cross-Tenant Violations ────────────────────────────────────

  it("REJECTS client user requesting a DIFFERENT org (cross-tenant violation)", () => {
    const user = { id: 1, openId: "test", role: "user", organizationId: 5 };
    expect(() => validateTenantContext(user, 99)).toThrow("CROSS_TENANT_VIOLATION");
  });

  it("REJECTS viewer requesting a different org", () => {
    const user = { id: 1, openId: "test", role: "viewer", organizationId: 5 };
    expect(() => validateTenantContext(user, 10)).toThrow("CROSS_TENANT_VIOLATION");
  });

  it("REJECTS client role requesting a different org", () => {
    const user = { id: 1, openId: "test", role: "client", organizationId: 3 };
    expect(() => validateTenantContext(user, 7)).toThrow("CROSS_TENANT_VIOLATION");
  });

  // ─── VENTEX Team (Cross-Tenant Access) ──────────────────────────

  it("ALLOWS owner to access any org", () => {
    const user = { id: 1, openId: "test", role: "owner", organizationId: null };
    const result = validateTenantContext(user, 99);
    expect(result.tenantOrgId).toBe(99);
    expect(result.isCrossTenantAccess).toBe(true);
  });

  it("ALLOWS admin to access any org", () => {
    const user = { id: 1, openId: "test", role: "admin", organizationId: null };
    const result = validateTenantContext(user, 42);
    expect(result.tenantOrgId).toBe(42);
    expect(result.isCrossTenantAccess).toBe(true);
  });

  it("REJECTS partner with null org (partner is NOT VENTEX team per RBAC)", () => {
    // Per rbac.ts: partner role is NOT in isVentexTeam — they need an org
    const user = { id: 1, openId: "test", role: "partner", organizationId: null };
    expect(() => validateTenantContext(user, 7)).toThrow("TENANT_CONTEXT_MISSING");
  });

  it("ALLOWS partner with valid org to access their own org", () => {
    const user = { id: 1, openId: "test", role: "partner", organizationId: 7 };
    const result = validateTenantContext(user, 7);
    expect(result.tenantOrgId).toBe(7);
    expect(result.isCrossTenantAccess).toBe(false);
  });

  it("ALLOWS manager to access any org", () => {
    const user = { id: 1, openId: "test", role: "manager", organizationId: null };
    const result = validateTenantContext(user, 3);
    expect(result.tenantOrgId).toBe(3);
    expect(result.isCrossTenantAccess).toBe(true);
  });

  it("ALLOWS VENTEX team with null requestedOrgId (view all mode)", () => {
    const user = { id: 1, openId: "test", role: "admin", organizationId: null };
    const result = validateTenantContext(user);
    expect(result.tenantOrgId).toBeNull();
    expect(result.isCrossTenantAccess).toBe(true);
  });

  it("ALLOWS VENTEX team even if they have an organizationId", () => {
    // Edge case: admin with org set (shouldn't happen, but shouldn't break)
    const user = { id: 1, openId: "test", role: "admin", organizationId: 5 };
    const result = validateTenantContext(user, 99);
    expect(result.tenantOrgId).toBe(99);
    expect(result.isCrossTenantAccess).toBe(true);
  });
});

describe("Tenant Guard — assertTenantScope", () => {
  it("THROWS for null orgId", () => {
    expect(() => assertTenantScope(null, "test.procedure")).toThrow("TENANT_SCOPE_MISSING");
  });

  it("THROWS for undefined orgId", () => {
    expect(() => assertTenantScope(undefined, "test.procedure")).toThrow("TENANT_SCOPE_MISSING");
  });

  it("PASSES for valid orgId", () => {
    expect(() => assertTenantScope(5, "test.procedure")).not.toThrow();
  });

  it("PASSES for orgId = 0 (edge case)", () => {
    // 0 is a valid number, should not throw
    expect(() => assertTenantScope(0, "test.procedure")).not.toThrow();
  });

  it("includes procedure name in error message", () => {
    expect(() => assertTenantScope(null, "ventures.list")).toThrow("ventures.list");
  });
});
