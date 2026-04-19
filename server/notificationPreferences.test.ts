import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

// Mock DB layer
let mockPrefs: Record<string, unknown> | null = null;
let insertedValues: Record<string, unknown> | null = null;
let updatedValues: Record<string, unknown> | null = null;

vi.mock("./db", () => ({
  getDb: vi.fn(async () => {
    return {
      select: (cols?: Record<string, unknown>) => ({
        from: () => ({
          where: () => ({
            limit: () => (mockPrefs ? [mockPrefs] : []),
          }),
        }),
      }),
      insert: () => ({
        values: (vals: Record<string, unknown>) => {
          insertedValues = vals;
          return { onConflictDoUpdate: () => Promise.resolve() };
        },
      }),
      update: () => ({
        set: (vals: Record<string, unknown>) => ({
          where: () => {
            updatedValues = vals;
            return Promise.resolve();
          },
        }),
      }),
    };
  }),
}));

function createAuthContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 42,
    openId: "test-client-user",
    email: "client@royalton.com",
    name: "Test Client",
    loginMethod: "manus",
    role: "user",
    organizationId: 1,
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
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

describe("portal.getNotificationPreferences", () => {
  beforeEach(() => {
    mockPrefs = null;
    insertedValues = null;
    updatedValues = null;
  });

  it("returns defaults when no preferences exist", async () => {
    mockPrefs = null;
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.portal.getNotificationPreferences();

    expect(result).toEqual({
      pushEnabled: true,
      emailEnabled: true,
      actionItems: true,
      distributions: true,
      stageAdvances: true,
      teamUpdates: false,
      marketSignals: true,
      agentActivity: false,
      quietHoursStart: null,
      quietHoursEnd: null,
    });
  });

  it("returns stored preferences when they exist", async () => {
    mockPrefs = {
      id: 1,
      userId: 42,
      pushEnabled: false,
      emailEnabled: true,
      actionItems: true,
      distributions: false,
      stageAdvances: true,
      teamUpdates: true,
      marketSignals: false,
      agentActivity: true,
      quietHoursStart: "22:00",
      quietHoursEnd: "07:00",
    };

    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.portal.getNotificationPreferences();

    expect(result.pushEnabled).toBe(false);
    expect(result.distributions).toBe(false);
    expect(result.teamUpdates).toBe(true);
    expect(result.agentActivity).toBe(true);
    expect(result.quietHoursStart).toBe("22:00");
    expect(result.quietHoursEnd).toBe("07:00");
  });
});

describe("portal.updateNotificationPreferences", () => {
  beforeEach(() => {
    mockPrefs = null;
    insertedValues = null;
    updatedValues = null;
  });

  it("inserts new preferences when none exist", async () => {
    mockPrefs = null;
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.portal.updateNotificationPreferences({
      pushEnabled: false,
      distributions: false,
    });

    expect(result).toEqual({ success: true });
    // When no existing record, insert path is taken
    expect(insertedValues).toBeTruthy();
    // Verify the values object was captured by the mock
    expect(typeof insertedValues).toBe("object");
  });

  it("updates existing preferences", async () => {
    // Simulate existing record found by select
    mockPrefs = { id: 1 };
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.portal.updateNotificationPreferences({
      emailEnabled: false,
      quietHoursStart: "23:00",
      quietHoursEnd: "06:00",
    });

    expect(result).toEqual({ success: true });
    expect(updatedValues).toBeTruthy();
    expect(updatedValues!.emailEnabled).toBe(false);
    expect(updatedValues!.quietHoursStart).toBe("23:00");
    expect(updatedValues!.quietHoursEnd).toBe("06:00");
  });
});
