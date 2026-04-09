/**
 * Demo Dashboard Tests
 * 
 * Tests for the /demo/dashboard route — verifies:
 * 1. The page is publicly accessible (no auth required)
 * 2. The component exports correctly
 * 3. Static demo data is well-formed
 * 4. All tab IDs are valid and have corresponding views
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

const DEMO_DASHBOARD_PATH = resolve(__dirname, "../client/src/pages/DemoDashboard.tsx");
const APP_PATH = resolve(__dirname, "../client/src/App.tsx");
const PUBLIC_ROUTES_PATH = resolve(__dirname, "../client/src/lib/publicRoutes.ts");

describe("Demo Dashboard", () => {
  const source = readFileSync(DEMO_DASHBOARD_PATH, "utf-8");

  describe("Component Structure", () => {
    it("exports a default DemoDashboard component", () => {
      expect(source).toContain("export default function DemoDashboard");
    });

    it("does not import tRPC or useAuth (no auth dependency)", () => {
      expect(source).not.toContain("from \"@/lib/trpc\"");
      expect(source).not.toContain("from \"@/_core/hooks/useAuth\"");
      expect(source).not.toContain("trpc.");
    });

    it("uses only static data (no fetch/axios calls)", () => {
      expect(source).not.toContain("fetch(");
      expect(source).not.toContain("axios");
      expect(source).not.toContain("useQuery");
      expect(source).not.toContain("useMutation");
    });
  });

  describe("Tab Navigation", () => {
    const TAB_IDS = [
      "dashboard", "activity", "oversight", "concierge",
      "agents", "blueprints", "team", "contacts",
      "onboard", "drafts", "settings"
    ];

    it("defines all 11 sidebar navigation items", () => {
      // Check that DEMO_NAV array contains all tab IDs
      for (const tabId of TAB_IDS) {
        expect(source).toContain(`id: "${tabId}"`);
      }
    });

    it("has a view component for each tab", () => {
      // Each tab should have a conditional render in the main component
      for (const tabId of TAB_IDS) {
        expect(source).toContain(`activeTab === "${tabId}"`);
      }
    });

    it("has a title mapping for each tab", () => {
      expect(source).toContain("TAB_TITLES");
      for (const tabId of TAB_IDS) {
        expect(source).toContain(`${tabId}:`);
      }
    });

    it("includes sidebar labels for all navigation items", () => {
      const expectedLabels = [
        "Dashboard", "Activity", "Oversight", "AI Concierge",
        "AI Agents", "Blueprints", "ATLAS Team", "Client Contacts",
        "Onboard Client", "Drafts", "Settings"
      ];
      for (const label of expectedLabels) {
        expect(source).toContain(`"${label}"`);
      }
    });
  });

  describe("Static Demo Data", () => {
    it("includes client portfolio data (DEMO_CLIENTS)", () => {
      expect(source).toContain("DEMO_CLIENTS");
      expect(source).toContain("Al Rashid Group");
      expect(source).toContain("Meridian Holdings");
      expect(source).toContain("Northstar Capital");
      expect(source).toContain("Pacific Ventures");
      expect(source).toContain("Sovereign Wealth Partners");
      expect(source).toContain("Titan Industries");
    });

    it("includes agent activity feed data (DEMO_FEED)", () => {
      expect(source).toContain("DEMO_FEED");
      expect(source).toContain("Velocity Agent");
      expect(source).toContain("Overdue Agent");
      expect(source).toContain("Distribution Sentinel");
      expect(source).toContain("Compliance Watcher");
    });

    it("includes KPI data (DEMO_KPI)", () => {
      expect(source).toContain("DEMO_KPI");
      expect(source).toContain("Active Ventures");
      expect(source).toContain("Active SPVs");
      expect(source).toContain("Open Tasks");
      expect(source).toContain("Distributions");
    });

    it("includes task data (DEMO_TASKS)", () => {
      expect(source).toContain("DEMO_TASKS");
      // Verify tasks have required fields
      expect(source).toContain("title:");
      expect(source).toContain("assignee:");
      expect(source).toContain("priority:");
      expect(source).toContain("due:");
    });

    it("includes AI agent data (DEMO_AGENTS)", () => {
      expect(source).toContain("DEMO_AGENTS");
      expect(source).toContain("Overdue Agent");
      expect(source).toContain("Velocity Agent");
      expect(source).toContain("Distribution Sentinel");
      expect(source).toContain("Compliance Watcher");
    });

    it("includes team data (DEMO_TEAM)", () => {
      expect(source).toContain("DEMO_TEAM");
      expect(source).toContain("Shwan Lee");
      expect(source).toContain("Brian Chen");
      expect(source).toContain("Chris Phelps");
    });

    it("includes contact data (DEMO_CONTACTS)", () => {
      expect(source).toContain("DEMO_CONTACTS");
      expect(source).toContain("Ahmed Al Rashid");
    });

    it("includes blueprint/venture data (DEMO_BLUEPRINTS)", () => {
      expect(source).toContain("DEMO_BLUEPRINTS");
      expect(source).toContain("Marina Bay Tower");
    });

    it("includes AI concierge chat data (DEMO_CHAT)", () => {
      expect(source).toContain("DEMO_CHAT");
      expect(source).toContain("assistant");
      expect(source).toContain("user");
    });

    it("includes drafts data (DEMO_DRAFTS)", () => {
      expect(source).toContain("DEMO_DRAFTS");
      expect(source).toContain("Follow-up");
    });

    it("includes activity log data (DEMO_ACTIVITY)", () => {
      expect(source).toContain("DEMO_ACTIVITY");
    });
  });

  describe("View Components", () => {
    it("has DashboardView with KPI cards and client portfolio", () => {
      expect(source).toContain("function DashboardView");
      expect(source).toContain("AnimatedCounter");
      expect(source).toContain("Client Portfolio");
      expect(source).toContain("Priority Tasks");
    });

    it("has ActivityView with filter tabs", () => {
      expect(source).toContain("function ActivityView");
      expect(source).toContain("Activity Log");
      expect(source).toContain("filter");
    });

    it("has OversightView with health matrix and risk alerts", () => {
      expect(source).toContain("function OversightView");
      expect(source).toContain("Portfolio Oversight");
      expect(source).toContain("Client Health Matrix");
      expect(source).toContain("Active Risk Alerts");
      expect(source).toContain("Compliance Status");
    });

    it("has ConciergeView with chat interface", () => {
      expect(source).toContain("function ConciergeView");
      expect(source).toContain("AI Concierge");
      expect(source).toContain("Ask ATLAS anything");
    });

    it("has AgentsView with agent cards and metrics", () => {
      expect(source).toContain("function AgentsView");
      expect(source).toContain("AI Agents");
      expect(source).toContain("Total Actions");
      expect(source).toContain("Avg Uptime");
    });

    it("has BlueprintsView with kanban columns", () => {
      expect(source).toContain("function BlueprintsView");
      expect(source).toContain("Venture Blueprints");
      expect(source).toContain("Negotiation");
      expect(source).toContain("Due Diligence");
      expect(source).toContain("Active");
      expect(source).toContain("Closing");
    });

    it("has TeamView with team member cards", () => {
      expect(source).toContain("function TeamView");
      expect(source).toContain("ATLAS Team");
    });

    it("has ContactsView with contact list", () => {
      expect(source).toContain("function ContactsView");
      expect(source).toContain("Client Contacts");
    });

    it("has OnboardView with step wizard", () => {
      expect(source).toContain("function OnboardView");
      expect(source).toContain("Onboard New Client");
      expect(source).toContain("Client Information");
      expect(source).toContain("KYC Documentation");
      expect(source).toContain("Compliance Review");
    });

    it("has DraftsView with draft items", () => {
      expect(source).toContain("function DraftsView");
      expect(source).toContain("Drafts");
    });

    it("has SettingsView with configuration sections", () => {
      expect(source).toContain("function SettingsView");
      expect(source).toContain("Settings");
      expect(source).toContain("Notifications");
      expect(source).toContain("AI Agent Configuration");
    });
  });

  describe("Demo Banner and Navigation", () => {
    it("shows INVESTOR DEMO — READ-ONLY VIEW banner", () => {
      expect(source).toContain("INVESTOR DEMO");
      expect(source).toContain("READ-ONLY VIEW");
    });

    it("has Back to Pitch link", () => {
      expect(source).toContain("Back to Pitch");
      expect(source).toContain('href="/demo"');
    });

    it("has Sign In link", () => {
      expect(source).toContain("Sign In");
      expect(source).toContain('href="/"');
    });

    it("has mobile navigation dropdown", () => {
      expect(source).toContain("<select");
      expect(source).toContain("lg:hidden");
    });
  });

  describe("No Manus References", () => {
    it("does not contain Manus branding in demo content", () => {
      // Check that the word "Manus" doesn't appear in user-visible text
      // (it may appear in CDN URLs which is fine)
      const lines = source.split("\n");
      for (const line of lines) {
        // Skip CDN URLs and import paths
        if (line.includes("cloudfront") || line.includes("manus.computer") || line.includes("manus.space")) continue;
        if (line.includes("import ")) continue;
        // Check visible text strings
        if (line.includes('"') && line.toLowerCase().includes("manus")) {
          // Allow ATLAS_LOGO_URL and similar technical references
          if (line.includes("ATLAS_LOGO_URL") || line.includes("manus-")) continue;
          fail(`Found Manus reference in visible content: ${line.trim()}`);
        }
      }
    });
  });
});

describe("Demo Route Configuration", () => {
  it("/demo/dashboard route is registered in App.tsx", () => {
    const appSource = readFileSync(APP_PATH, "utf-8");
    expect(appSource).toContain('path="/demo/dashboard"');
    expect(appSource).toContain("DemoDashboard");
  });

  it("/demo routes are in the public routes list", () => {
    const publicRoutesSource = readFileSync(PUBLIC_ROUTES_PATH, "utf-8");
    expect(publicRoutesSource).toContain("/demo");
  });

  it("/demo/dashboard route is NOT wrapped in RequireAuth", () => {
    const appSource = readFileSync(APP_PATH, "utf-8");
    // Find the demo dashboard route line
    const lines = appSource.split("\n");
    const demoLine = lines.findIndex(l => l.includes('path="/demo/dashboard"'));
    expect(demoLine).toBeGreaterThan(-1);
    // Check surrounding lines don't have RequireAuth
    const context = lines.slice(Math.max(0, demoLine - 2), demoLine + 3).join("\n");
    expect(context).not.toContain("RequireAuth");
  });
});
