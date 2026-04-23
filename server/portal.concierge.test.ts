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

  // ── Frontend: Dedicated Concierge page ──────────────────────────
  it("Concierge page exists as a dedicated page", () => {
    const conciergePath = path.join(ROOT, "client/src/pages/Concierge.tsx");
    expect(fs.existsSync(conciergePath)).toBe(true);
    const content = fs.readFileSync(conciergePath, "utf-8");
    // Should use DashboardLayout
    expect(content).toContain("DashboardLayout");
    // Should have VENTEX Intelligence branding
    expect(content).toContain("VENTEX Intelligence");
    expect(content).toContain("ventex-logo-mark");
  });

  it("Concierge page has streaming chat with history", () => {
    const conciergePath = path.join(ROOT, "client/src/pages/Concierge.tsx");
    const content = fs.readFileSync(conciergePath, "utf-8");
    // Streaming via /api/ai/stream
    expect(content).toContain("/api/ai/stream");
    expect(content).toContain("streamChat");
    // Chat history with localStorage
    expect(content).toContain("ventex_concierge_index");
    expect(content).toContain("localStorage");
    // Conversation management
    expect(content).toContain("createNewChat");
    expect(content).toContain("deleteChat");
    expect(content).toContain("switchChat");
  });

  it("Concierge page has suggestion cards", () => {
    const conciergePath = path.join(ROOT, "client/src/pages/Concierge.tsx");
    const content = fs.readFileSync(conciergePath, "utf-8");
    expect(content).toContain("Portfolio overview");
    expect(content).toContain("Overdue tasks");
    expect(content).toContain("Create a task");
    expect(content).toContain("Venture health");
  });

  it("Concierge page uses Streamdown for markdown rendering", () => {
    const conciergePath = path.join(ROOT, "client/src/pages/Concierge.tsx");
    const content = fs.readFileSync(conciergePath, "utf-8");
    expect(content).toContain("Streamdown");
  });

  // ── Route: /concierge registered ──────────────────────────────────
  it("App.tsx has /concierge route", () => {
    const appPath = path.join(ROOT, "client/src/App.tsx");
    const content = fs.readFileSync(appPath, "utf-8");
    expect(content).toContain('path="/concierge"');
    expect(content).toContain("Concierge");
  });

  // ── Sidebar: AI Concierge in admin sidebar with star icon ─────────
  it("AppSidebar has AI Concierge nav item with Sparkles icon", () => {
    const sidebarPath = path.join(ROOT, "client/src/components/AppSidebar.tsx");
    const content = fs.readFileSync(sidebarPath, "utf-8");
    expect(content).toContain("AI Concierge");
    expect(content).toContain("/concierge");
    expect(content).toContain("Sparkles");
  });

  // ── Client Portal: concierge removed ──────────────────────────────
  it("ClientPortal does NOT have concierge tab or overlay", () => {
    const portalPath = path.join(ROOT, "client/src/pages/ClientPortal.tsx");
    const content = fs.readFileSync(portalPath, "utf-8");
    // Should NOT have concierge as a tab
    expect(content).not.toContain('activeTab === "concierge"');
    // Should NOT have floating widget
    expect(content).not.toContain('import PortalConcierge from "@/components/PortalConcierge"');
    // Should NOT have overlay panel or trigger
    expect(content).not.toContain("conciergePanel");
    expect(content).not.toContain("conciergeTrigger");
    expect(content).not.toContain("conciergeOpen");
  });
});
