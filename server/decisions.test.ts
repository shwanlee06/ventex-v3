import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAdminContext(): { ctx: TrpcContext } {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "admin-user",
    email: "admin@ventex.com",
    name: "Admin User",
    role: "admin",
    organizationId: null,
    organizationSlug: null,
    avatar: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: { headers: { "x-forwarded-for": "127.0.0.1" } } as any,
    res: { clearCookie: () => {} } as any,
  };

  return { ctx };
}

describe("Decision Queue endpoints", () => {
  it("approveEvent endpoint exists and validates input", async () => {
    const { ctx } = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    // Should throw NOT_FOUND for non-existent event
    await expect(
      caller.agents.approveEvent({ eventId: 999999 })
    ).rejects.toThrow();
  });

  it("rejectEvent endpoint exists and validates input", async () => {
    const { ctx } = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    // Should throw NOT_FOUND for non-existent event
    await expect(
      caller.agents.rejectEvent({ eventId: 999999, reason: "Test rejection" })
    ).rejects.toThrow();
  });

  it("approveDraft endpoint exists and validates input", async () => {
    const { ctx } = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    // Should throw NOT_FOUND for non-existent draft
    await expect(
      caller.agents.approveDraft({ draftId: 999999 })
    ).rejects.toThrow();
  });

  it("rejectDraft endpoint exists and validates input", async () => {
    const { ctx } = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    // Should throw NOT_FOUND for non-existent draft
    await expect(
      caller.agents.rejectDraft({ draftId: 999999, reason: "Test rejection" })
    ).rejects.toThrow();
  });

  it("pendingApprovals endpoint returns events and drafts arrays", async () => {
    const { ctx } = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.agents.pendingApprovals({});
    expect(result).toHaveProperty("events");
    expect(result).toHaveProperty("drafts");
    expect(Array.isArray(result.events)).toBe(true);
    expect(Array.isArray(result.drafts)).toBe(true);
  });
});

describe("Bulk approve/reject endpoints", () => {
  it("bulkApprove endpoint exists and handles empty items gracefully", async () => {
    const { ctx } = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.agents.bulkApprove({ items: [] });
    expect(result.approved).toBe(0);
    expect(result.failed).toBe(0);
    expect(result.total).toBe(0);
  });

  it("bulkApprove handles non-existent items without throwing", async () => {
    const { ctx } = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.agents.bulkApprove({
      items: [
        { id: 999998, type: "event" },
        { id: 999999, type: "draft" },
      ],
    });
    expect(result.failed).toBe(2);
    expect(result.approved).toBe(0);
  });

  it("bulkReject endpoint exists and validates reason", async () => {
    const { ctx } = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.agents.bulkReject({
      items: [{ id: 999999, type: "event" }],
      reason: "Not needed",
    });
    expect(result.failed).toBe(1);
    expect(result.rejected).toBe(0);
  });
});

describe("Client delete endpoint", () => {
  it("delete endpoint exists and validates input", async () => {
    const { ctx } = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    // Should throw for non-existent org
    await expect(
      caller.organizations.delete({ id: 999999 })
    ).rejects.toThrow("Organization not found");
  });
});
