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

  // ── Frontend: PortalConcierge component ──────────────────────────
  it("PortalConcierge component exists and exports default", () => {
    const compPath = path.join(ROOT, "client/src/components/PortalConcierge.tsx");
    expect(fs.existsSync(compPath)).toBe(true);
    const content = fs.readFileSync(compPath, "utf-8");
    expect(content).toContain("export default function PortalConcierge");
  });

  it("PortalConcierge accepts orgSlug and orgName props", () => {
    const compPath = path.join(ROOT, "client/src/components/PortalConcierge.tsx");
    const content = fs.readFileSync(compPath, "utf-8");
    expect(content).toContain("orgSlug: string");
    expect(content).toContain("orgName: string");
  });

  it("PortalConcierge calls portal.aiChat mutation", () => {
    const compPath = path.join(ROOT, "client/src/components/PortalConcierge.tsx");
    const content = fs.readFileSync(compPath, "utf-8");
    expect(content).toContain("portal.aiChat");
  });

  it("PortalConcierge uses localStorage for chat persistence", () => {
    const compPath = path.join(ROOT, "client/src/components/PortalConcierge.tsx");
    const content = fs.readFileSync(compPath, "utf-8");
    expect(content).toContain("localStorage.getItem");
    expect(content).toContain("localStorage.setItem");
    expect(content).toContain("ventex_portal_chat_");
  });

  it("PortalConcierge has clear chat functionality", () => {
    const compPath = path.join(ROOT, "client/src/components/PortalConcierge.tsx");
    const content = fs.readFileSync(compPath, "utf-8");
    expect(content).toContain("clearChat");
    expect(content).toContain("localStorage.removeItem");
    expect(content).toContain("Conversation cleared");
  });

  it("PortalConcierge renders as floating widget with open/close", () => {
    const compPath = path.join(ROOT, "client/src/components/PortalConcierge.tsx");
    const content = fs.readFileSync(compPath, "utf-8");
    // Should have open/close state
    expect(content).toContain("isOpen");
    expect(content).toContain("setIsOpen");
    // Should have fixed positioning for floating widget
    expect(content).toContain("fixed");
    // Should have a trigger button
    expect(content).toContain("AI Concierge");
  });

  it("PortalConcierge renders suggestion prompts for empty state", () => {
    const compPath = path.join(ROOT, "client/src/components/PortalConcierge.tsx");
    const content = fs.readFileSync(compPath, "utf-8");
    expect(content).toContain("What's the status of my portfolio?");
    expect(content).toContain("Which tasks need attention?");
    expect(content).toContain("Summarize my distributions");
  });

  // ── Integration: ClientPortal has AI Concierge as dedicated tab ───────
  it("ClientPortal has AI Concierge as a dedicated tab (not floating widget)", () => {
    const portalPath = path.join(ROOT, "client/src/pages/ClientPortal.tsx");
    const content = fs.readFileSync(portalPath, "utf-8");
    // Should NOT import the floating widget anymore
    expect(content).not.toContain('import PortalConcierge from "@/components/PortalConcierge"');
    // Should have concierge in the activeTab type union
    expect(content).toContain('"concierge"');
  });

  it("ClientPortal has AI Concierge tab in the tabs array", () => {
    const portalPath = path.join(ROOT, "client/src/pages/ClientPortal.tsx");
    const content = fs.readFileSync(portalPath, "utf-8");
    expect(content).toContain('"AI Concierge"');
    expect(content).toContain('activeTab === "concierge"');
  });

  it("ClientPortal AI Concierge tab uses VENTEX logo and portal.aiChat", () => {
    const portalPath = path.join(ROOT, "client/src/pages/ClientPortal.tsx");
    const content = fs.readFileSync(portalPath, "utf-8");
    expect(content).toContain("VENTEX Intelligence");
    expect(content).toContain("portal.aiChat");
    expect(content).toContain("ventex-logo-mark");
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
