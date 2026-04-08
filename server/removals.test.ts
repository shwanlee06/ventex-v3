import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

describe("Client portal removals", () => {
  it("VelocityFeed no longer shows WATCHING label", () => {
    const content = readFileSync(
      join(__dirname, "../client/src/components/VelocityFeed.tsx"),
      "utf-8"
    );
    // The label for watching cards should be "UPDATE" not "WATCHING"
    expect(content).not.toContain('label: "WATCHING"');
    expect(content).toContain('label: "UPDATE"');
  });

  it("VelocityFeed hides agent names for watching/update cards", () => {
    const content = readFileSync(
      join(__dirname, "../client/src/components/VelocityFeed.tsx"),
      "utf-8"
    );
    // Should conditionally hide agent name for watching cards
    expect(content).toContain('cardType !== "watching"');
  });

  it("ClientDashboard does not show false portfolio on track card", () => {
    const content = readFileSync(
      join(__dirname, "../client/src/components/ClientDashboard.tsx"),
      "utf-8"
    );
    // Should not contain the "Portfolio on track" text in active code
    // The card was replaced with a comment
    expect(content).not.toMatch(/>\s*Portfolio on track\s*</);
  });

  it("LiveTicker uses AgentContext instead of duplicate agents.list query", () => {
    const content = readFileSync(
      join(__dirname, "../client/src/components/LiveTicker.tsx"),
      "utf-8"
    );
    // Should import from AgentContext
    expect(content).toContain("useAgents");
    // Should NOT have its own direct trpc.agents.list.useQuery call (only in a comment)
    const lines = content.split("\n").filter(l => !l.trim().startsWith("//"));
    const codeOnly = lines.join("\n");
    expect(codeOnly).not.toContain("trpc.agents.list.useQuery");
  });

  it("VentureDetail hides TBD location", () => {
    const content = readFileSync(
      join(__dirname, "../client/src/pages/VentureDetail.tsx"),
      "utf-8"
    );
    expect(content).toContain('!== "TBD"');
  });

  it("TeamMemberDetail hides TBD location", () => {
    const content = readFileSync(
      join(__dirname, "../client/src/pages/TeamMemberDetail.tsx"),
      "utf-8"
    );
    expect(content).toContain('!== "TBD"');
  });

  it("ClientDashboard no longer shows venture locations (Your Ventures removed)", () => {
    const content = readFileSync(
      join(__dirname, "../client/src/components/ClientDashboard.tsx"),
      "utf-8"
    );
    // Your Ventures section was removed from dashboard (redundant with Ventures tab)
    // So there's no location display to filter TBD from
    expect(content).not.toContain('Your Ventures');
  });
});
