import { describe, it, expect, vi } from "vitest";

// Mock Resend before importing the router — use class-style mock for resend v6
vi.mock("resend", () => {
  class MockResend {
    emails = {
      send: vi.fn().mockResolvedValue({ data: { id: "test-id-123" }, error: null }),
    };
  }
  return { Resend: MockResend, default: { Resend: MockResend } };
});

describe("email router", () => {
  it("email router module exports emailRouter", async () => {
    const mod = await import("./routers/email");
    expect(mod.emailRouter).toBeDefined();
    expect(typeof mod.emailRouter).toBe("object");
  });

  it("emailRouter has send and sendTest procedures", async () => {
    const mod = await import("./routers/email");
    const router = mod.emailRouter as any;
    // tRPC routers have _def.procedures
    expect(router._def).toBeDefined();
    expect(router._def.procedures).toBeDefined();
    expect(router._def.procedures.send).toBeDefined();
    expect(router._def.procedures.sendTest).toBeDefined();
  });

  it("email.send procedure is a mutation (not a query)", async () => {
    const mod = await import("./routers/email");
    const router = mod.emailRouter as any;
    const sendProc = router._def.procedures.send;
    // tRPC mutations have _def.type === 'mutation'
    expect(sendProc._def.type).toBe("mutation");
  });

  it("email.sendTest procedure is a mutation", async () => {
    const mod = await import("./routers/email");
    const router = mod.emailRouter as any;
    const sendTestProc = router._def.procedures.sendTest;
    expect(sendTestProc._def.type).toBe("mutation");
  });
});
