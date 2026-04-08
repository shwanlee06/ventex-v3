import { describe, expect, it, vi, beforeEach } from "vitest";
import { agentDrafts } from "../drizzle/schema";

/**
 * Unit tests for agents.deleteDraft and agents.bulkDeleteDrafts procedures.
 * We mock the database layer to test the procedure logic in isolation.
 */

// Mock the database module
const mockSelect = vi.fn();
const mockDelete = vi.fn();
const mockFrom = vi.fn();
const mockWhere = vi.fn();
const mockLimit = vi.fn();

vi.mock("./db", () => ({
  getDb: vi.fn(() => ({
    select: () => ({ from: mockFrom }),
    delete: mockDelete,
  })),
}));

// After mocking, import the router
import { agentsRouter } from "./routers/agents";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(orgId?: number): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user",
    email: "test@example.com",
    name: "Test User",
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

describe("agents.deleteDraft", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: mockFrom returns { where: mockWhere }
    mockFrom.mockReturnValue({ where: mockWhere });
    mockWhere.mockReturnValue({ limit: mockLimit });
    mockDelete.mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) });
  });

  it("should reject deletion of a non-dismissed draft", async () => {
    // Mock: draft exists but is "pending"
    mockLimit.mockResolvedValue([{
      id: 1,
      organizationId: null,
      status: "pending",
    }]);

    const ctx = createAuthContext();

    // The procedure should throw BAD_REQUEST for non-dismissed drafts
    await expect(async () => {
      // We can't easily create a caller for a sub-router, so we test the logic
      // by verifying the mock behavior expectations
      const caller = agentsRouter.createCaller(ctx);
      await caller.deleteDraft({ draftId: 1 });
    }).rejects.toThrow(/Only dismissed drafts can be deleted/);
  });

  it("should reject deletion of a non-existent draft", async () => {
    // Mock: no draft found
    mockLimit.mockResolvedValue([]);

    const ctx = createAuthContext();

    await expect(async () => {
      const caller = agentsRouter.createCaller(ctx);
      await caller.deleteDraft({ draftId: 999 });
    }).rejects.toThrow(/Draft not found/);
  });

  it("should successfully delete a dismissed draft", async () => {
    // Mock: draft exists and is dismissed
    mockLimit.mockResolvedValue([{
      id: 1,
      organizationId: null,
      status: "dismissed",
    }]);

    const deleteWhere = vi.fn().mockResolvedValue(undefined);
    mockDelete.mockReturnValue({ where: deleteWhere });

    const ctx = createAuthContext();
    const caller = agentsRouter.createCaller(ctx);
    const result = await caller.deleteDraft({ draftId: 1 });

    expect(result).toEqual({ success: true });
    expect(mockDelete).toHaveBeenCalledWith(agentDrafts);
    expect(deleteWhere).toHaveBeenCalled();
  });
});

describe("agents.bulkDeleteDrafts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFrom.mockReturnValue({ where: mockWhere });
    mockDelete.mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) });
  });

  it("should reject if any draft is not dismissed", async () => {
    // Mock: return drafts where one is still pending
    mockWhere.mockResolvedValue([
      { id: 1, organizationId: null, status: "dismissed" },
      { id: 2, organizationId: null, status: "pending" },
    ]);

    const ctx = createAuthContext();

    await expect(async () => {
      const caller = agentsRouter.createCaller(ctx);
      await caller.bulkDeleteDrafts({ draftIds: [1, 2] });
    }).rejects.toThrow(/not dismissed/);
  });

  it("should successfully bulk delete dismissed drafts", async () => {
    // Mock: all drafts are dismissed
    mockWhere.mockResolvedValue([
      { id: 1, organizationId: null, status: "dismissed" },
      { id: 2, organizationId: null, status: "dismissed" },
    ]);

    const deleteWhere = vi.fn().mockResolvedValue(undefined);
    mockDelete.mockReturnValue({ where: deleteWhere });

    const ctx = createAuthContext();
    const caller = agentsRouter.createCaller(ctx);
    const result = await caller.bulkDeleteDrafts({ draftIds: [1, 2] });

    expect(result).toEqual({ success: true, deleted: 2 });
    expect(mockDelete).toHaveBeenCalledWith(agentDrafts);
  });

  it("should require at least one draft ID", async () => {
    const ctx = createAuthContext();

    await expect(async () => {
      const caller = agentsRouter.createCaller(ctx);
      await caller.bulkDeleteDrafts({ draftIds: [] });
    }).rejects.toThrow();
  });
});
