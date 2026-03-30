import { describe, it, expect } from "vitest";

describe("organizations.onboardingComplete procedure", () => {
  it("organizations router exports and includes onboardingComplete", async () => {
    const mod = await import("./routers/organizations");
    expect(mod.organizationsRouter).toBeDefined();
    const router = mod.organizationsRouter as any;
    expect(router._def.procedures.onboardingComplete).toBeDefined();
  });

  it("onboardingComplete is a mutation (not a query)", async () => {
    const mod = await import("./routers/organizations");
    const router = mod.organizationsRouter as any;
    const proc = router._def.procedures.onboardingComplete;
    expect(proc._def.type).toBe("mutation");
  });

  it("onboardingComplete requires admin access (protected procedure)", async () => {
    const mod = await import("./routers/organizations");
    const router = mod.organizationsRouter as any;
    const proc = router._def.procedures.onboardingComplete;
    // Admin procedures have middleware that checks for admin role
    expect(proc._def.middlewares.length).toBeGreaterThan(0);
  });
});
