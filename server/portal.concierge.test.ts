import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

const ROOT = path.resolve(__dirname, "..");

describe("AI Concierge Integration", () => {
  // ── Backend: portal.aiChat procedure exists ──────────────────────
  it("portal router exports aiChat mutation", () => {
    const portalPath = path.join(ROOT, "server/routers/portal.ts");
    const content = fs.readFileSync(portalPath, "utf-8");
    expect(content).toContain("aiChat");
    expect(content).toMatch(/aiChat.*mutation/s);
  });

  it("portal aiChat requires orgSlug and messages in input schema", () => {
    const portalPath = path.join(ROOT, "server/routers/portal.ts");
    const content = fs.readFileSync(portalPath, "utf-8");
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
    expect(content).toContain("create_task");
    expect(content).toContain("complete_task");
    expect(content).toContain("update_task_priority");
  });

  it("portal aiChat has tool execution handler", () => {
    const portalPath = path.join(ROOT, "server/routers/portal.ts");
    const content = fs.readFileSync(portalPath, "utf-8");
    expect(content).toContain("executeTool");
    expect(content).toContain("tool_calls");
  });

  it("portal aiChat passes tools to invokeLLM", () => {
    const portalPath = path.join(ROOT, "server/routers/portal.ts");
    const content = fs.readFileSync(portalPath, "utf-8");
    expect(content).toContain("tool_choice");
    expect(content).toContain("tools: conciergeTools");
  });

  it("portal aiChat logs tool actions to activity log", () => {
    const portalPath = path.join(ROOT, "server/routers/portal.ts");
    const content = fs.readFileSync(portalPath, "utf-8");
    expect(content).toContain("AI Concierge");
    expect(content).toContain("activityLog");
  });

  // ── Frontend: AI Concierge is a tab in ClientPortal ──────────────
  it("ClientPortal has AI Concierge as a tab with Sparkles icon", () => {
    const portalPath = path.join(ROOT, "client/src/pages/ClientPortal.tsx");
    const content = fs.readFileSync(portalPath, "utf-8");
    // Should have concierge in the activeTab type
    expect(content).toContain('"concierge"');
    // Should have concierge tab in the tabs array
    expect(content).toContain("AI Concierge");
    // Should use Sparkles icon for the concierge tab
    expect(content).toContain("Sparkles");
    // Should have concierge tab content
    expect(content).toContain('activeTab === "concierge"');
  });

  it("ClientPortal concierge tab has VENTEX Intelligence branding", () => {
    const portalPath = path.join(ROOT, "client/src/pages/ClientPortal.tsx");
    const content = fs.readFileSync(portalPath, "utf-8");
    expect(content).toContain("VENTEX Intelligence");
  });

  it("ClientPortal concierge tab has chat with localStorage persistence", () => {
    const portalPath = path.join(ROOT, "client/src/pages/ClientPortal.tsx");
    const content = fs.readFileSync(portalPath, "utf-8");
    expect(content).toContain("conciergeMessages");
    expect(content).toContain("handleConciergeSend");
    expect(content).toContain("localStorage");
    expect(content).toContain("ventex_concierge_");
  });

  it("ClientPortal concierge tab has suggestion cards", () => {
    const portalPath = path.join(ROOT, "client/src/pages/ClientPortal.tsx");
    const content = fs.readFileSync(portalPath, "utf-8");
    expect(content).toContain("What's the status of my portfolio?");
    expect(content).toContain("Which tasks need my attention?");
    expect(content).toContain("Create a task for my next review");
    expect(content).toContain("Show venture health scores");
  });

  it("ClientPortal concierge tab uses Streamdown for markdown", () => {
    const portalPath = path.join(ROOT, "client/src/pages/ClientPortal.tsx");
    const content = fs.readFileSync(portalPath, "utf-8");
    expect(content).toContain("Streamdown");
  });

  // ── Admin sidebar: AI Concierge removed ──────────────────────────
  it("AppSidebar does NOT have AI Concierge nav item", () => {
    const sidebarPath = path.join(ROOT, "client/src/components/AppSidebar.tsx");
    const content = fs.readFileSync(sidebarPath, "utf-8");
    expect(content).not.toContain("AI Concierge");
    expect(content).not.toContain("/concierge");
  });

  // ── Client Portal: no floating widget or overlay ──────────────────
  it("ClientPortal does NOT have floating widget or overlay", () => {
    const portalPath = path.join(ROOT, "client/src/pages/ClientPortal.tsx");
    const content = fs.readFileSync(portalPath, "utf-8");
    expect(content).not.toContain('import PortalConcierge from "@/components/PortalConcierge"');
    expect(content).not.toContain("conciergePanel");
    expect(content).not.toContain("conciergeTrigger");
    expect(content).not.toContain("conciergeOpen");
  });
});
