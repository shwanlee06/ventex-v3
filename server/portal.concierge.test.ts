import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

const ROOT = path.resolve(__dirname, "..");

describe("Portal AI Concierge Integration", () => {
  // ── Backend: portal.aiChat procedure exists ──────────────────────
  it("portal router exports aiChat mutation", () => {
    const portalPath = path.join(ROOT, "server/routers/portal.ts");
    const content = fs.readFileSync(portalPath, "utf-8");
    // Must contain an aiChat procedure definition
    expect(content).toContain("aiChat");
    // Must be a mutation (not query) since it sends chat messages
    expect(content).toMatch(/aiChat.*mutation/s);
  });

  it("portal aiChat requires orgSlug and messages in input schema", () => {
    const portalPath = path.join(ROOT, "server/routers/portal.ts");
    const content = fs.readFileSync(portalPath, "utf-8");
    // The aiChat input should validate orgSlug and messages
    expect(content).toContain("orgSlug");
    expect(content).toContain("messages");
  });

  it("portal aiChat uses invokeLLM for AI responses", () => {
    const portalPath = path.join(ROOT, "server/routers/portal.ts");
    const content = fs.readFileSync(portalPath, "utf-8");
    expect(content).toContain("invokeLLM");
  });

  it("portal aiChat has rate limiting", () => {
    const portalPath = path.join(ROOT, "server/routers/portal.ts");
    const content = fs.readFileSync(portalPath, "utf-8");
    // Should enforce rate limiting for the chat endpoint
    expect(content).toContain("rateLimit");
  });

  it("portal aiChat sanitizes LLM output", () => {
    const portalPath = path.join(ROOT, "server/routers/portal.ts");
    const content = fs.readFileSync(portalPath, "utf-8");
    expect(content).toContain("sanitize");
  });

  // ── Backend: Tool-calling for task execution ──────────────────────
  it("portal aiChat defines tools for task execution", () => {
    const portalPath = path.join(ROOT, "server/routers/portal.ts");
    const content = fs.readFileSync(portalPath, "utf-8");
    // Should define tools for the LLM
    expect(content).toContain("create_task");
    expect(content).toContain("complete_task");
    expect(content).toContain("update_task_priority");
  });

  it("portal aiChat has tool execution handler", () => {
    const portalPath = path.join(ROOT, "server/routers/portal.ts");
    const content = fs.readFileSync(portalPath, "utf-8");
    // Should have a function to execute tool calls
    expect(content).toContain("executeTool");
    expect(content).toContain("tool_calls");
  });

  it("portal aiChat passes tools to invokeLLM", () => {
    const portalPath = path.join(ROOT, "server/routers/portal.ts");
    const content = fs.readFileSync(portalPath, "utf-8");
    // Should pass tools array and tool_choice to invokeLLM
    expect(content).toContain("tool_choice");
    expect(content).toContain("tools: conciergeTools");
  });

  it("portal aiChat logs tool actions to activity log", () => {
    const portalPath = path.join(ROOT, "server/routers/portal.ts");
    const content = fs.readFileSync(portalPath, "utf-8");
    expect(content).toContain("AI Concierge");
    expect(content).toContain("activityLog");
  });

  // ── Frontend: Left-side panel architecture ──────────────────────
  it("ClientPortal has AI Concierge as a left-side panel (not tab or floating widget)", () => {
    const portalPath = path.join(ROOT, "client/src/pages/ClientPortal.tsx");
    const content = fs.readFileSync(portalPath, "utf-8");
    // Should NOT import the floating widget anymore
    expect(content).not.toContain('import PortalConcierge from "@/components/PortalConcierge"');
    // Should NOT have concierge as a tab
    expect(content).not.toContain('activeTab === "concierge"');
    // Should have conciergeOpen state for the panel
    expect(content).toContain("conciergeOpen");
    expect(content).toContain("setConciergeOpen");
  });

  it("ClientPortal has concierge panel with VENTEX logo", () => {
    const portalPath = path.join(ROOT, "client/src/pages/ClientPortal.tsx");
    const content = fs.readFileSync(portalPath, "utf-8");
    expect(content).toContain("conciergePanel");
    expect(content).toContain("VENTEX Intelligence");
    expect(content).toContain("ventex-logo-mark");
  });

  it("ClientPortal has concierge trigger button on left side", () => {
    const portalPath = path.join(ROOT, "client/src/pages/ClientPortal.tsx");
    const content = fs.readFileSync(portalPath, "utf-8");
    expect(content).toContain("conciergeTrigger");
    expect(content).toContain("AI Concierge");
    // Should be fixed to left side
    expect(content).toContain("fixed left-0");
  });

  it("ClientPortal concierge uses portal.aiChat and localStorage", () => {
    const portalPath = path.join(ROOT, "client/src/pages/ClientPortal.tsx");
    const content = fs.readFileSync(portalPath, "utf-8");
    expect(content).toContain("portal.aiChat");
    expect(content).toContain("localStorage.getItem");
    expect(content).toContain("localStorage.setItem");
    expect(content).toContain("ventex_portal_chat_");
  });

  it("ClientPortal concierge has clear chat and suggestion prompts", () => {
    const portalPath = path.join(ROOT, "client/src/pages/ClientPortal.tsx");
    const content = fs.readFileSync(portalPath, "utf-8");
    expect(content).toContain("clearConciergeChat");
    expect(content).toContain("Conversation cleared");
    expect(content).toContain("What's the status of my portfolio?");
    expect(content).toContain("Create a new task for me");
  });

  // ── Admin sidebar: AI Concierge removed ──────────────────────────
  it("AI Concierge removed from admin sidebar", () => {
    const sidebarPath = path.join(ROOT, "client/src/components/AppSidebar.tsx");
    const content = fs.readFileSync(sidebarPath, "utf-8");
    // Should NOT have an active nav item for AI Concierge
    expect(content).not.toContain('{ label: "AI Concierge"');
    // Should have a comment about it being moved
    expect(content).toContain("AI Concierge moved to client portal");
  });
});
