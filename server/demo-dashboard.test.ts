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
        "AI Agents", "Blueprints", "VENTEX Team", "Client Contacts",
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
      expect(source).toContain("Ask VENTEX anything");
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
      expect(source).toContain("VENTEX Team");
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
    it("shows INVESTOR DEMO banner", () => {
      expect(source).toContain("INVESTOR DEMO");
    });

    it("has Back to Pitch link", () => {
      expect(source).toContain("Back to Pitch");
      expect(source).toContain('href="/demo"');
    });

    it("has Authorized Access link", () => {
      expect(source).toContain("Authorized Access");
      expect(source).toContain('href="/"');
    });

    it("has mobile navigation dropdown", () => {
      expect(source).toContain("<select");
      expect(source).toContain("lg:hidden");
    });
  });

  describe("Admin/Client View Toggle", () => {
    it("has a DemoView type with admin and client options", () => {
      expect(source).toContain('type DemoView = "admin" | "client"');
    });

    it("has Admin View and Client View toggle buttons", () => {
      expect(source).toContain("Admin View");
      expect(source).toContain("Client View");
    });

    it("tracks demoView state", () => {
      expect(source).toContain('useState<DemoView>("admin")');
    });

    it("shows WHAT THE OPERATOR SEES for admin view", () => {
      expect(source).toContain("WHAT THE OPERATOR SEES");
    });

    it("shows WHAT THE CLIENT SEES for client view", () => {
      expect(source).toContain("WHAT THE CLIENT SEES");
    });

    it("renders admin sidebar with OPERATOR PANEL label", () => {
      expect(source).toContain("OPERATOR PANEL");
    });

    it("renders client sidebar with CLIENT PORTAL label", () => {
      expect(source).toContain("CLIENT PORTAL");
    });

    it("client sidebar has appropriate nav items", () => {
      expect(source).toContain("My Ventures");
      expect(source).toContain("Documents");
      expect(source).toContain("Distributions");
      expect(source).toContain("Reports");
      expect(source).toContain("Messages");
    });

    it("client sidebar shows a sample client name", () => {
      expect(source).toContain("Ahmed Al Rashid");
      expect(source).toContain("Al Rashid Group");
    });

    it("conditionally renders ClientPortalDemoView for client mode", () => {
      expect(source).toContain("ClientPortalDemoView");
    });

    it("uses AnimatePresence for smooth view transitions", () => {
      expect(source).toContain('AnimatePresence mode="wait"');
    });
  });

  describe("Annotation System", () => {
    it("has ADMIN_ANNOTATIONS with descriptions for all admin tabs", () => {
      expect(source).toContain("ADMIN_ANNOTATIONS");
      const adminTabs = ["dashboard", "activity", "oversight", "concierge", "agents", "blueprints", "team", "contacts", "onboard", "drafts", "settings"];
      for (const tab of adminTabs) {
        expect(source).toContain(`${tab}: { title:`);
      }
    });

    it("has CLIENT_ANNOTATIONS with descriptions for client portal sections", () => {
      expect(source).toContain("CLIENT_ANNOTATIONS");
      const clientSections = ["velocitySummary", "actionNeeded", "completed", "portfolio", "health", "forecasts", "market", "chat"];
      for (const section of clientSections) {
        expect(source).toContain(`${section}: { title:`);
      }
    });

    it("has an Annotation tooltip component", () => {
      expect(source).toContain("function Annotation");
      expect(source).toContain("annotations");
    });

    it("renders annotation tooltips in admin header", () => {
      expect(source).toContain('annotations={ADMIN_ANNOTATIONS}');
    });

    it("renders annotation tooltips in client portal sections", () => {
      expect(source).toContain('annotations={CLIENT_ANNOTATIONS}');
    });
  });

  describe("Client Portal Demo View", () => {
    it("has ClientPortalDemoView function", () => {
      expect(source).toContain("function ClientPortalDemoView");
    });

    it("shows AI Briefing section", () => {
      expect(source).toContain("AI Briefing");
    });

    it("shows Action Needed section with action cards", () => {
      expect(source).toContain("Action Needed");
      expect(source).toContain("CLIENT_DEMO_FEED");
    });

    it("shows Completed section", () => {
      expect(source).toContain("CLIENT_DEMO_COMPLETED");
    });

    it("shows Your Portfolio section with venture cards", () => {
      expect(source).toContain("Your Portfolio");
      expect(source).toContain("CLIENT_DEMO_PORTFOLIO");
    });

    it("shows Portfolio Health score", () => {
      expect(source).toContain("Portfolio Health");
    });

    it("shows Venture Forecasts with AI projections", () => {
      expect(source).toContain("Venture Forecasts");
      expect(source).toContain("CLIENT_DEMO_FORECASTS");
    });

    it("shows Market Intelligence with sector signals", () => {
      expect(source).toContain("Market Intelligence");
      expect(source).toContain("CLIENT_DEMO_SIGNALS");
    });

    it("shows Portfolio Assistant chat preview", () => {
      expect(source).toContain("Portfolio Assistant");
    });

    it("includes venture stage indicators", () => {
      expect(source).toContain("Negotiation");
      expect(source).toContain("Due Diligence");
      expect(source).toContain("Active");
      expect(source).toContain("Closing");
    });

    it("includes momentum/velocity data for ventures", () => {
      expect(source).toContain("projectedDays");
      expect(source).toContain("confidence");
      expect(source).toContain("velocityVsBenchmark");
    });
  });

  describe("Team Photos", () => {
    it("includes photo URLs for team members", () => {
      expect(source).toContain("photo:");
      // Check CDN URLs are present
      expect(source).toContain("cloudfront.net");
    });

    it("renders photos with img tags when available", () => {
      expect(source).toContain("(member as any).photo");
      expect(source).toContain('<img src={(member as any).photo}');
    });
  });

  describe("Client Tab Views", () => {
    const CLIENT_TAB_IDS = ["overview", "ventures", "documents", "distributions", "reports", "messages", "settings"];

    it("defines ClientTabId type with all 7 tabs", () => {
      expect(source).toContain('type ClientTabId = "overview" | "ventures" | "documents" | "distributions" | "reports" | "messages" | "settings"');
    });

    it("tracks clientTab state", () => {
      expect(source).toContain('useState<ClientTabId>("overview")');
    });

    it("has CLIENT_TAB_TITLES mapping for all client tabs", () => {
      expect(source).toContain("CLIENT_TAB_TITLES");
      for (const id of CLIENT_TAB_IDS) {
        expect(source).toContain(`${id}:`);
      }
    });

    it("client sidebar buttons call setClientTab on click", () => {
      expect(source).toContain("setClientTab(item.id)");
    });

    it("has conditional rendering for each client tab", () => {
      for (const id of CLIENT_TAB_IDS) {
        expect(source).toContain(`clientTab === "${id}"`);
      }
    });

    it("has ClientVenturesView with stage progress and momentum", () => {
      expect(source).toContain("function ClientVenturesView");
      expect(source).toContain("My Ventures");
      expect(source).toContain("Stage progress");
      expect(source).toContain("Momentum");
    });

    it("has ClientDocumentsView with document list", () => {
      expect(source).toContain("function ClientDocumentsView");
      expect(source).toContain("Documents");
      expect(source).toContain("Purchase Agreement");
      expect(source).toContain("signed");
      expect(source).toContain("pending");
    });

    it("has ClientDistributionsView with summary cards and payment list", () => {
      expect(source).toContain("function ClientDistributionsView");
      expect(source).toContain("Distributions");
      expect(source).toContain("Total Paid");
      expect(source).toContain("Pending");
      expect(source).toContain("Quarterly Dividend");
      expect(source).toContain("Capital Return");
    });

    it("has ClientReportsView with AI-generated reports", () => {
      expect(source).toContain("function ClientReportsView");
      expect(source).toContain("Reports & Analytics");
      expect(source).toContain("Q1 2026 Portfolio Performance");
      expect(source).toContain("Annual Review 2025");
      expect(source).toContain("Risk Assessment Report");
    });

    it("has ClientMessagesView with message threads", () => {
      expect(source).toContain("function ClientMessagesView");
      expect(source).toContain("Messages");
      expect(source).toContain("Shwan Jafar");
      expect(source).toContain("VENTEX AI");
      expect(source).toContain("unread");
    });

    it("has ClientSettingsView with profile, notifications, and security", () => {
      expect(source).toContain("function ClientSettingsView");
      expect(source).toContain("Account Settings");
      expect(source).toContain("Profile Information");
      expect(source).toContain("Notification Preferences");
      expect(source).toContain("Two-Factor Authentication");
      expect(source).toContain("Security");
    });

    it("has mobile dropdown for client tabs", () => {
      expect(source).toContain('setClientTab(e.target.value as ClientTabId)');
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
          // Allow VENTEX_LOGO_URL and similar technical references
          if (line.includes("VENTEX_LOGO_URL") || line.includes("manus-")) continue;
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

describe("Guided Tour Feature", () => {
  const source = readFileSync(DEMO_DASHBOARD_PATH, "utf-8");

  describe("Tour Steps Data", () => {
    it("defines TourStep interface with required fields", () => {
      expect(source).toContain("interface TourStep");
      expect(source).toContain("view: DemoView");
      expect(source).toContain("tab: TabId | ClientTabId");
      expect(source).toContain("title: string");
      expect(source).toContain("narration: string");
      expect(source).toContain("duration: number");
    });

    it("defines TOUR_STEPS array with 18 steps (11 admin + 7 client)", () => {
      expect(source).toContain("const TOUR_STEPS: TourStep[]");
      // Count admin steps
      const adminSteps = (source.match(/view: "admin"/g) || []).length;
      const clientSteps = (source.match(/view: "client"/g) || []).length;
      // At minimum 11 admin and 7 client tour steps (may also appear in other contexts)
      expect(adminSteps).toBeGreaterThanOrEqual(11);
      expect(clientSteps).toBeGreaterThanOrEqual(7);
    });

    it("covers all 11 admin tabs in tour steps", () => {
      const adminTabs = ["dashboard", "activity", "oversight", "concierge", "agents", "blueprints", "team", "contacts", "onboard", "drafts", "settings"];
      for (const tab of adminTabs) {
        expect(source).toContain(`view: "admin", tab: "${tab}"`);
      }
    });

    it("covers all 7 client tabs in tour steps", () => {
      const clientTabs = ["overview", "ventures", "documents", "distributions", "reports", "messages", "settings"];
      for (const tab of clientTabs) {
        expect(source).toContain(`view: "client", tab: "${tab}"`);
      }
    });

    it("each tour step has a narration description", () => {
      // Extract narration strings - should have at least 18
      const narrations = source.match(/narration: "/g) || [];
      expect(narrations.length).toBeGreaterThanOrEqual(18);
    });

    it("each tour step has a duration in seconds", () => {
      const durations = source.match(/duration: \d+/g) || [];
      expect(durations.length).toBeGreaterThanOrEqual(18);
    });
  });

  describe("Tour State Management", () => {
    it("tracks tourActive boolean state", () => {
      expect(source).toContain("tourActive");
      expect(source).toContain("setTourActive");
    });

    it("tracks tourStep number state", () => {
      expect(source).toContain("tourStep");
      expect(source).toContain("setTourStep");
    });

    it("tracks tourPlaying boolean state for auto-advance", () => {
      expect(source).toContain("tourPlaying");
      expect(source).toContain("setTourPlaying");
    });

    it("tracks tourProgress for the progress bar", () => {
      expect(source).toContain("tourProgress");
      expect(source).toContain("setTourProgress");
    });

    it("has a startTour callback", () => {
      expect(source).toContain("const startTour");
    });

    it("has tourNext and tourPrev callbacks", () => {
      expect(source).toContain("const tourNext");
      expect(source).toContain("const tourPrev");
    });

    it("has tourTogglePlay callback", () => {
      expect(source).toContain("const tourTogglePlay");
    });

    it("has tourClose callback", () => {
      expect(source).toContain("const tourClose");
    });
  });

  describe("Tour UI Components", () => {
    it("has GuidedTourOverlay component", () => {
      expect(source).toContain("function GuidedTourOverlay");
    });

    it("GuidedTourOverlay shows step title and narration", () => {
      expect(source).toContain("step.title");
      expect(source).toContain("step.narration");
    });

    it("shows step counter (Step X of Y)", () => {
      expect(source).toContain("Step {currentStep + 1} of {totalSteps}");
    });

    it("has play/pause toggle button", () => {
      expect(source).toContain("onTogglePlay");
      expect(source).toContain("Pause tour");
      expect(source).toContain("Play tour");
    });

    it("has next/previous navigation buttons", () => {
      expect(source).toContain("onNext");
      expect(source).toContain("onPrev");
      expect(source).toContain("Previous step");
      expect(source).toContain("Next step");
    });

    it("has skip/close tour button", () => {
      expect(source).toContain("Skip Tour");
      expect(source).toContain("onClose");
      expect(source).toContain("Close tour");
    });

    it("shows progress bar with gradient", () => {
      expect(source).toContain("bg-gradient-to-r from-primary to-cyan-400");
    });

    it("shows ADMIN/CLIENT badge based on current step view", () => {
      expect(source).toContain('"ADMIN"');
      expect(source).toContain('"CLIENT"');
    });

    it("shows step dots for navigation", () => {
      expect(source).toContain("TOUR_STEPS.map");
    });
  });

  describe("Tour Integration", () => {
    it("has Start Tour / Guided Tour button in demo banner", () => {
      expect(source).toContain("Guided Tour");
      expect(source).toContain("startTour");
    });

    it("hides Start Tour button when tour is active", () => {
      expect(source).toContain("!tourActive");
    });

    it("renders GuidedTourOverlay when tour is active", () => {
      expect(source).toContain("tourActive && TOUR_STEPS[tourStep]");
      expect(source).toContain("<GuidedTourOverlay");
    });

    it("has spotlight overlay when tour is active", () => {
      expect(source).toContain("Tour spotlight overlay");
      expect(source).toContain("bg-black/20");
    });

    it("syncs tour step to view and tab", () => {
      expect(source).toContain("Sync tour step to view/tab");
      expect(source).toContain("setDemoView(step.view)");
      expect(source).toContain("setActiveTab(step.tab as TabId)");
      expect(source).toContain("setClientTab(step.tab as ClientTabId)");
    });

    it("auto-advances tour steps based on duration", () => {
      expect(source).toContain("Tour auto-advance");
      expect(source).toContain("tourTimerRef");
    });
  });
});
