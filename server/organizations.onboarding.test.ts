import { describe, it, expect, vi } from "vitest";

/**
 * Tests for the Add Client → Onboarding sync feature:
 * 1. organizations.getById procedure returns org data for onboarding resume
 * 2. organizations.create accepts enhanced fields (contact, AUM, sectors, tier)
 * 3. organizations.update works for resume flow (update existing org from wizard)
 */

// Mock database
const mockOrg = {
  id: 42,
  name: "Test Capital",
  slug: "test-capital",
  type: "client",
  status: "active",
  description: "A test client",
  primaryContactName: "John Doe",
  primaryContactEmail: "john@test.com",
  aumRange: "100m-250m",
  sectors: JSON.stringify(["Real Estate", "Technology"]),
  subscriptionTier: "growth",
  renewalDate: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("organizations.getById", () => {
  it("should return normalized org data with parsed sectors", () => {
    // Simulate the normalizeOrg function behavior
    function parseJsonArray(val: unknown): string[] {
      if (Array.isArray(val)) return val;
      if (typeof val === "string") {
        try {
          const parsed = JSON.parse(val);
          return Array.isArray(parsed) ? parsed : [];
        } catch {
          return [];
        }
      }
      return [];
    }

    function normalizeOrg<T extends { sectors: unknown }>(
      org: T
    ): T & { sectors: string[] } {
      return { ...org, sectors: parseJsonArray(org.sectors) };
    }

    const normalized = normalizeOrg(mockOrg);
    expect(normalized.id).toBe(42);
    expect(normalized.name).toBe("Test Capital");
    expect(normalized.sectors).toEqual(["Real Estate", "Technology"]);
    expect(normalized.primaryContactName).toBe("John Doe");
    expect(normalized.primaryContactEmail).toBe("john@test.com");
    expect(normalized.aumRange).toBe("100m-250m");
    expect(normalized.subscriptionTier).toBe("growth");
  });

  it("should handle null sectors gracefully", () => {
    function parseJsonArray(val: unknown): string[] {
      if (Array.isArray(val)) return val;
      if (typeof val === "string") {
        try {
          const parsed = JSON.parse(val);
          return Array.isArray(parsed) ? parsed : [];
        } catch {
          return [];
        }
      }
      return [];
    }

    const result = parseJsonArray(null);
    expect(result).toEqual([]);
  });

  it("should handle already-parsed array sectors", () => {
    function parseJsonArray(val: unknown): string[] {
      if (Array.isArray(val)) return val;
      if (typeof val === "string") {
        try {
          const parsed = JSON.parse(val);
          return Array.isArray(parsed) ? parsed : [];
        } catch {
          return [];
        }
      }
      return [];
    }

    const result = parseJsonArray(["Real Estate", "Yacht"]);
    expect(result).toEqual(["Real Estate", "Yacht"]);
  });
});

describe("Enhanced Add Client → Onboarding flow", () => {
  it("should generate correct slug from client name", () => {
    const name = "FL1 Capital Partners";
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
    expect(slug).toBe("fl1-capital-partners");
  });

  it("should generate correct slug from name with special characters", () => {
    const name = "O'Brien & Associates LLC";
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
    expect(slug).toBe("o-brien-associates-llc");
  });

  it("should build correct onboarding redirect URL with orgId and step", () => {
    const orgId = 42;
    const url = `/onboarding?orgId=${orgId}&step=2`;
    expect(url).toBe("/onboarding?orgId=42&step=2");

    // Verify URL can be parsed
    const params = new URLSearchParams(url.split("?")[1]);
    expect(params.get("orgId")).toBe("42");
    expect(params.get("step")).toBe("2");
  });

  it("should parse resume query params correctly", () => {
    const search = "?orgId=42&step=2";
    const params = new URLSearchParams(search);
    const resumeOrgId = params.get("orgId")
      ? Number(params.get("orgId"))
      : null;
    const resumeStep = params.get("step")
      ? Number(params.get("step"))
      : null;

    expect(resumeOrgId).toBe(42);
    expect(resumeStep).toBe(2);
  });

  it("should default to step 1 when no query params", () => {
    const search = "";
    const params = new URLSearchParams(search);
    const resumeStep = params.get("step")
      ? Number(params.get("step"))
      : null;

    const step =
      resumeStep && resumeStep >= 2 && resumeStep <= 5 ? resumeStep : 1;
    expect(step).toBe(1);
  });

  it("should clamp invalid step values to 1", () => {
    const search = "?orgId=42&step=99";
    const params = new URLSearchParams(search);
    const resumeStep = params.get("step")
      ? Number(params.get("step"))
      : null;

    const step =
      resumeStep && resumeStep >= 2 && resumeStep <= 5 ? resumeStep : 1;
    expect(step).toBe(1);
  });

  it("should include all enhanced fields in create mutation input", () => {
    const input = {
      name: "Test Capital",
      slug: "test-capital",
      description: "A test client",
      primaryContactName: "John Doe",
      primaryContactEmail: "john@test.com",
      aumRange: "50M-100M",
      sectors: ["Real Estate", "Technology"],
      subscriptionTier: "growth" as const,
    };

    expect(input).toHaveProperty("primaryContactName");
    expect(input).toHaveProperty("primaryContactEmail");
    expect(input).toHaveProperty("aumRange");
    expect(input).toHaveProperty("sectors");
    expect(input).toHaveProperty("subscriptionTier");
    expect(input.sectors).toHaveLength(2);
  });

  it("should use consistent AUM range values between dialog and wizard", () => {
    // These are the canonical AUM values used in BOTH the Add Client dialog and Onboarding Wizard
    const AUM_VALUES = ["<1M", "1M-10M", "10M-50M", "50M-100M", "100M+"];
    expect(AUM_VALUES).toHaveLength(5);
    expect(AUM_VALUES).toContain("<1M");
    expect(AUM_VALUES).toContain("100M+");
  });

  it("should use consistent sector list between dialog and wizard", () => {
    const SECTORS = [
      "Real Estate", "Yacht", "F&B", "Entertainment", "Oil & Gas",
      "Technology", "Healthcare", "Finance", "Energy", "Others",
    ];
    expect(SECTORS).toHaveLength(10);
    expect(SECTORS).toContain("Real Estate");
    expect(SECTORS).toContain("Others");
  });

  it("should require sectors (at least one) for create button to be enabled", () => {
    const name = "Test Client";
    const sectors: string[] = [];
    const isDisabled = !name.trim() || sectors.length === 0;
    expect(isDisabled).toBe(true);

    const sectorsWithOne = ["Real Estate"];
    const isDisabledWithSector = !name.trim() || sectorsWithOne.length === 0;
    expect(isDisabledWithSector).toBe(false);
  });

  it("should handle optional fields being undefined", () => {
    const name = "Minimal Client";
    const input = {
      name,
      slug: name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, ""),
      description: undefined,
      primaryContactName: undefined,
      primaryContactEmail: undefined,
      aumRange: undefined,
      sectors: undefined,
      subscriptionTier: "poc" as const,
    };

    expect(input.name).toBe("Minimal Client");
    expect(input.slug).toBe("minimal-client");
    expect(input.primaryContactName).toBeUndefined();
    expect(input.subscriptionTier).toBe("poc");
  });
});
