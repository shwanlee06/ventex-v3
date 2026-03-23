import { describe, it, expect } from "vitest";

// ── Role identification tests ──────────────────────────────────────────

function isAtlasTeam(role: string): boolean {
  return role === "owner" || role === "admin";
}

function isClientUser(role: string): boolean {
  return !isAtlasTeam(role);
}

const ATLAS_NAV_ONLY = ["AI Agent", "Team", "Security", "Access", "Settings"];
const CLIENT_NAV_ONLY = ["My Profile"];
const SHARED_NAV = ["Dashboard", "Ventures", "SPVs & Deals", "Tasks", "Distributions", "Activity"];

interface NavItem {
  label: string;
  atlasOnly?: boolean;
  clientOnly?: boolean;
}

const ALL_NAV_ITEMS: NavItem[] = [
  { label: "Dashboard" },
  { label: "AI Agent", atlasOnly: true },
  { label: "Ventures" },
  { label: "SPVs & Deals" },
  { label: "Team", atlasOnly: true },
  { label: "Tasks" },
  { label: "Distributions" },
  { label: "Activity" },
  { label: "Security", atlasOnly: true },
  { label: "Access", atlasOnly: true },
  { label: "Settings", atlasOnly: true },
  { label: "My Profile", clientOnly: true },
];

function getNavForRole(role: string): string[] {
  const isAtlas = isAtlasTeam(role);
  return ALL_NAV_ITEMS
    .filter((item) => {
      if (item.atlasOnly && !isAtlas) return false;
      if (item.clientOnly && isAtlas) return false;
      return true;
    })
    .map((item) => item.label);
}

describe("Two-Tier Architecture — Role Identification", () => {
  it("owner is ATLAS team", () => {
    expect(isAtlasTeam("owner")).toBe(true);
    expect(isClientUser("owner")).toBe(false);
  });

  it("admin is ATLAS team", () => {
    expect(isAtlasTeam("admin")).toBe(true);
    expect(isClientUser("admin")).toBe(false);
  });

  it("manager is client user", () => {
    expect(isAtlasTeam("manager")).toBe(false);
    expect(isClientUser("manager")).toBe(true);
  });

  it("user is client user", () => {
    expect(isAtlasTeam("user")).toBe(false);
    expect(isClientUser("user")).toBe(true);
  });

  it("viewer is client user", () => {
    expect(isAtlasTeam("viewer")).toBe(false);
    expect(isClientUser("viewer")).toBe(true);
  });

  it("client is client user", () => {
    expect(isAtlasTeam("client")).toBe(false);
    expect(isClientUser("client")).toBe(true);
  });
});

describe("Two-Tier Architecture — Navigation Filtering", () => {
  it("owner sees full nav without client-only items", () => {
    const nav = getNavForRole("owner");
    for (const item of ATLAS_NAV_ONLY) {
      expect(nav).toContain(item);
    }
    for (const item of SHARED_NAV) {
      expect(nav).toContain(item);
    }
    for (const item of CLIENT_NAV_ONLY) {
      expect(nav).not.toContain(item);
    }
  });

  it("admin sees full nav without client-only items", () => {
    const nav = getNavForRole("admin");
    for (const item of ATLAS_NAV_ONLY) {
      expect(nav).toContain(item);
    }
    expect(nav).not.toContain("My Profile");
  });

  it("viewer sees scoped nav without atlas-only items", () => {
    const nav = getNavForRole("viewer");
    for (const item of ATLAS_NAV_ONLY) {
      expect(nav).not.toContain(item);
    }
    for (const item of SHARED_NAV) {
      expect(nav).toContain(item);
    }
    expect(nav).toContain("My Profile");
  });

  it("client sees scoped nav without atlas-only items", () => {
    const nav = getNavForRole("client");
    expect(nav).not.toContain("AI Agent");
    expect(nav).not.toContain("Team");
    expect(nav).not.toContain("Security");
    expect(nav).not.toContain("Access");
    expect(nav).not.toContain("Settings");
    expect(nav).toContain("Dashboard");
    expect(nav).toContain("Ventures");
    expect(nav).toContain("My Profile");
  });

  it("manager sees scoped nav with shared items", () => {
    const nav = getNavForRole("manager");
    expect(nav).toContain("Dashboard");
    expect(nav).toContain("Ventures");
    expect(nav).toContain("Tasks");
    expect(nav).not.toContain("AI Agent");
    expect(nav).not.toContain("Security");
  });

  it("ATLAS nav has more items than client nav", () => {
    const atlasNav = getNavForRole("owner");
    const clientNav = getNavForRole("viewer");
    expect(atlasNav.length).toBeGreaterThan(clientNav.length);
  });
});

describe("Two-Tier Architecture — Dashboard Subtitle", () => {
  function getDashboardSubtitle(role: string): string {
    return isAtlasTeam(role) ? "ROYALTON VENTURE HOLDING" : "Client Portal";
  }

  it("owner sees ROYALTON VENTURE HOLDING", () => {
    expect(getDashboardSubtitle("owner")).toBe("ROYALTON VENTURE HOLDING");
  });

  it("admin sees ROYALTON VENTURE HOLDING", () => {
    expect(getDashboardSubtitle("admin")).toBe("ROYALTON VENTURE HOLDING");
  });

  it("viewer sees Client Portal", () => {
    expect(getDashboardSubtitle("viewer")).toBe("Client Portal");
  });

  it("client sees Client Portal", () => {
    expect(getDashboardSubtitle("client")).toBe("Client Portal");
  });
});

describe("Two-Tier Architecture — Org-Scoped Data Filtering", () => {
  // Simulate the backend filtering logic
  function filterVenturesByOrg(
    ventures: { id: number; name: string }[],
    allowedIds: number[] | null, // null = ATLAS (see all)
  ) {
    if (allowedIds === null) return ventures;
    return ventures.filter((v) => allowedIds.includes(v.id));
  }

  const allVentures = [
    { id: 1, name: "Dubai Tower" },
    { id: 2, name: "Yacht Club" },
    { id: 3, name: "Restaurant Chain" },
    { id: 4, name: "Film Studio" },
    { id: 5, name: "Oil Field" },
  ];

  it("ATLAS team sees all ventures (null = no filter)", () => {
    const result = filterVenturesByOrg(allVentures, null);
    expect(result).toHaveLength(5);
  });

  it("client org with 2 ventures sees only those", () => {
    const result = filterVenturesByOrg(allVentures, [1, 3]);
    expect(result).toHaveLength(2);
    expect(result.map((v) => v.name)).toEqual(["Dubai Tower", "Restaurant Chain"]);
  });

  it("client org with no ventures sees empty list", () => {
    const result = filterVenturesByOrg(allVentures, []);
    expect(result).toHaveLength(0);
  });

  it("client org can't see ventures outside their access", () => {
    const result = filterVenturesByOrg(allVentures, [1, 2]);
    expect(result.map((v) => v.id)).not.toContain(3);
    expect(result.map((v) => v.id)).not.toContain(4);
    expect(result.map((v) => v.id)).not.toContain(5);
  });
});

describe("Two-Tier Architecture — Route Guards", () => {
  const ATLAS_ONLY_ROUTES = ["/agent", "/team", "/security", "/access", "/settings"];
  const SHARED_ROUTES = ["/dashboard", "/ventures", "/spvs", "/tasks", "/distributions", "/activity", "/profile"];

  function canAccessRoute(role: string, route: string): boolean {
    if (ATLAS_ONLY_ROUTES.some((r) => route.startsWith(r))) {
      return isAtlasTeam(role);
    }
    return true; // shared routes accessible to all authenticated users
  }

  it("owner can access all routes", () => {
    for (const route of [...ATLAS_ONLY_ROUTES, ...SHARED_ROUTES]) {
      expect(canAccessRoute("owner", route)).toBe(true);
    }
  });

  it("admin can access all routes", () => {
    for (const route of [...ATLAS_ONLY_ROUTES, ...SHARED_ROUTES]) {
      expect(canAccessRoute("admin", route)).toBe(true);
    }
  });

  it("viewer cannot access ATLAS-only routes", () => {
    for (const route of ATLAS_ONLY_ROUTES) {
      expect(canAccessRoute("viewer", route)).toBe(false);
    }
  });

  it("viewer can access shared routes", () => {
    for (const route of SHARED_ROUTES) {
      expect(canAccessRoute("viewer", route)).toBe(true);
    }
  });

  it("client cannot access ATLAS-only routes", () => {
    for (const route of ATLAS_ONLY_ROUTES) {
      expect(canAccessRoute("client", route)).toBe(false);
    }
  });

  it("manager cannot access ATLAS-only routes", () => {
    for (const route of ATLAS_ONLY_ROUTES) {
      expect(canAccessRoute("manager", route)).toBe(false);
    }
  });
});
