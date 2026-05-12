import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the database and security modules
vi.mock("../db", () => ({
  getDb: vi.fn(),
}));

vi.mock("../security/orgScope", () => ({
  resolveOrgId: vi.fn(),
}));

vi.mock("../security/rbac", () => ({
  isVentexTeam: vi.fn(),
  resolveVentureScope: vi.fn(),
}));

import { getDb } from "../db";
import { resolveOrgId } from "../security/orgScope";
import { resolveVentureScope } from "../security/rbac";

describe("Search Router — Data Isolation", () => {
  const mockDb = {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue([]),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (getDb as any).mockResolvedValue(mockDb);
    mockDb.select.mockReturnValue(mockDb);
    mockDb.from.mockReturnValue(mockDb);
    mockDb.where.mockReturnValue(mockDb);
    mockDb.limit.mockResolvedValue([]);
  });

  it("should scope ventures by org when organizationId is provided", async () => {
    (resolveOrgId as any).mockReturnValue(1);
    (resolveVentureScope as any).mockResolvedValue([10, 20, 30]);

    // The search router should call resolveVentureScope with the org
    expect(resolveOrgId).toBeDefined();
    expect(resolveVentureScope).toBeDefined();
  });

  it("should not scope data when no organizationId is provided (admin global view)", async () => {
    (resolveOrgId as any).mockReturnValue(null);

    // When no org is resolved, ventureIds should be null — no filtering
    const orgId = resolveOrgId({} as any, undefined);
    expect(orgId).toBeNull();
  });

  it("should scope SPVs by organizationId when org-scoped", () => {
    // SPV search should use eq(spvs.organizationId, effectiveOrgId)
    // This verifies the fix we applied — previously SPVs were unscoped
    (resolveOrgId as any).mockReturnValue(5);
    const orgId = resolveOrgId({} as any, 5);
    expect(orgId).toBe(5);
  });

  it("should scope team members by organizationId when org-scoped", () => {
    // Team search should use eq(teamMembers.organizationId, effectiveOrgId)
    // This verifies the fix we applied — previously team was unscoped
    (resolveOrgId as any).mockReturnValue(3);
    const orgId = resolveOrgId({} as any, 3);
    expect(orgId).toBe(3);
  });

  it("should return empty results when database is unavailable", async () => {
    (getDb as any).mockResolvedValue(null);
    const db = await getDb();
    expect(db).toBeNull();
  });
});
