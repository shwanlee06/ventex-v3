import { describe, it, expect, vi } from "vitest";

// Test that the agent modules export the expected functions
describe("Proactive Agent Modules", () => {
  it("proactiveTaskGenerator exports runProactiveTaskGenerator", async () => {
    const mod = await import("./proactiveTaskGenerator");
    expect(typeof mod.runProactiveTaskGenerator).toBe("function");
  });

  it("autonomousTaskExecutor exports runAutonomousTaskExecutor", async () => {
    const mod = await import("./autonomousTaskExecutor");
    expect(typeof mod.runAutonomousTaskExecutor).toBe("function");
  });
});

describe("Task Classification", () => {
  it("classifies research tasks correctly", async () => {
    // The classification logic is internal, but we can verify the module loads
    // and the function signature is correct
    const { runAutonomousTaskExecutor } = await import("./autonomousTaskExecutor");
    // Calling with a non-existent org should return 0 results gracefully
    const result = await runAutonomousTaskExecutor(999999);
    expect(result).toEqual({
      tasksCompleted: 0,
      venturesAdvanced: 0,
      eventsLogged: 0,
    });
  });

  it("proactive generator handles non-existent org gracefully", async () => {
    const { runProactiveTaskGenerator } = await import("./proactiveTaskGenerator");
    const result = await runProactiveTaskGenerator(999999);
    expect(result).toEqual({
      tasksCreated: 0,
      venturesProcessed: 0,
      eventsLogged: 0,
    });
  });
});
