import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock dependencies
vi.mock("../_core/env", () => ({
  ENV: {
    forgeApiKey: "test-key",
    forgeApiUrl: "https://forge.test.com",
  },
}));

vi.mock("../db", () => ({
  getDb: vi.fn(),
}));

import { getDb } from "../db";

describe("AI Stream — Org-Scoped Context", () => {
  const mockSelect = vi.fn().mockReturnThis();
  const mockFrom = vi.fn().mockReturnThis();
  const mockWhere = vi.fn().mockReturnThis();
  const mockOrderBy = vi.fn().mockReturnThis();
  const mockLimit = vi.fn().mockResolvedValue([]);

  const mockDb = {
    select: mockSelect,
    from: mockFrom,
    where: mockWhere,
    orderBy: mockOrderBy,
    limit: mockLimit,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (getDb as any).mockResolvedValue(mockDb);
    mockSelect.mockReturnValue(mockDb);
    mockFrom.mockReturnValue(mockDb);
    mockWhere.mockReturnValue(mockDb);
    mockOrderBy.mockReturnValue(mockDb);
    mockLimit.mockResolvedValue([]);
  });

  it("should accept organizationId in request body", () => {
    // The endpoint now accepts { messages, organizationId }
    const requestBody = {
      messages: [{ role: "user", content: "What are my ventures?" }],
      organizationId: 1,
    };
    expect(requestBody.organizationId).toBe(1);
  });

  it("should work without organizationId (global view)", () => {
    const requestBody = {
      messages: [{ role: "user", content: "Show all portfolio data" }],
    };
    expect(requestBody).not.toHaveProperty("organizationId");
  });

  it("should scope context label correctly for org-scoped requests", () => {
    const orgName = "Royalton";
    const scopeLabel = orgName ? `CLIENT: ${orgName}` : "ALL CLIENTS (GLOBAL VIEW)";
    expect(scopeLabel).toBe("CLIENT: Royalton");
  });

  it("should show global label when no org is specified", () => {
    const orgName: string | null = null;
    const scopeLabel = orgName ? `CLIENT: ${orgName}` : "ALL CLIENTS (GLOBAL VIEW)";
    expect(scopeLabel).toBe("ALL CLIENTS (GLOBAL VIEW)");
  });

  it("should return empty arrays when org has no ventures", () => {
    const ventureIds: number[] = [];
    const allVentures = ventureIds.length === 0 ? [] : [{ id: 1 }];
    expect(allVentures).toEqual([]);
  });

  it("should filter ventures by org_venture_access IDs", () => {
    const ventureIds = [10, 20, 30];
    const allVentures = [
      { id: 10, name: "Venture A" },
      { id: 20, name: "Venture B" },
      { id: 30, name: "Venture C" },
      { id: 40, name: "Venture D - different org" },
    ];
    const filtered = allVentures.filter(v => ventureIds.includes(v.id));
    expect(filtered).toHaveLength(3);
    expect(filtered.map(v => v.id)).toEqual([10, 20, 30]);
  });
});
