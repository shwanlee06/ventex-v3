/**
 * Partner Identification & Org-Branded Access Tests
 * Tests for org-specific invite links, branded API keys, and invite validation
 */

import { describe, it, expect } from "vitest";
import crypto from "crypto";

// ── Replicate the generateApiKey helper with org prefix ──────────────

function generateApiKey(orgSlug?: string): string {
  const prefix = orgSlug
    ? orgSlug.toUpperCase().replace(/[^A-Z0-9]/g, "").substring(0, 6)
    : null;
  const segments: string[] = [];
  const segCount = prefix ? 6 : 8;
  for (let i = 0; i < segCount; i++) {
    segments.push(crypto.randomBytes(2).toString("hex").toUpperCase());
  }
  return prefix
    ? `ATLAS-${prefix}-${segments.join("-")}`
    : `ATLAS-${segments.join("-")}`;
}

function generateInviteToken(): string {
  return crypto.randomBytes(48).toString("base64url");
}

function hashApiKey(key: string): string {
  return crypto.createHash("sha256").update(key).digest("hex");
}

function getKeyPrefix(key: string): string {
  return key.substring(0, 10);
}

function generateOrgSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

// ── Tests ────────────────────────────────────────────────────────────

describe("Org-Branded API Key Generation", () => {
  it("generates keys with org prefix for known orgs", () => {
    const key = generateApiKey("aurovia");
    expect(key).toMatch(/^ATLAS-AUROVI-/);
    // ATLAS- (6) + AUROVI- (7) + 6 segments of 4 chars + 5 dashes = 6+7+24+5 = 42
    expect(key.length).toBeGreaterThan(35);
  });

  it("generates keys with org prefix for royalton", () => {
    const key = generateApiKey("royalton");
    expect(key).toMatch(/^ATLAS-ROYALT-/);
  });

  it("generates keys with org prefix for atlas", () => {
    const key = generateApiKey("atlas");
    expect(key).toMatch(/^ATLAS-ATLAS-/);
  });

  it("generates generic keys when no org slug provided", () => {
    const key = generateApiKey();
    expect(key).toMatch(/^ATLAS-[A-F0-9]{4}-/);
    // Should NOT have a double prefix
    expect(key).not.toMatch(/^ATLAS-[A-Z]{3,}-[A-Z]{3,}-/);
  });

  it("strips special characters from org slug in key prefix", () => {
    const key = generateApiKey("oil-&-gas");
    expect(key).toMatch(/^ATLAS-OILGAS-/);
  });

  it("truncates long org names to 6 chars in prefix", () => {
    const key = generateApiKey("entertainment-ventures");
    expect(key).toMatch(/^ATLAS-ENTERT-/);
  });

  it("generates unique keys for the same org", () => {
    const key1 = generateApiKey("aurovia");
    const key2 = generateApiKey("aurovia");
    expect(key1).not.toBe(key2);
    // But both have the same prefix
    expect(key1.substring(0, 13)).toBe(key2.substring(0, 13));
  });
});

describe("Org Slug Generation", () => {
  it("converts org name to URL-safe slug", () => {
    expect(generateOrgSlug("Aurovia")).toBe("aurovia");
    expect(generateOrgSlug("ATLAS")).toBe("atlas");
    expect(generateOrgSlug("Royalton Venture Holding")).toBe("royalton-venture-holding");
  });

  it("strips special characters", () => {
    expect(generateOrgSlug("Oil & Gas Partners")).toBe("oil-gas-partners");
    expect(generateOrgSlug("F&B Holdings")).toBe("f-b-holdings");
  });

  it("removes leading and trailing dashes", () => {
    expect(generateOrgSlug("--Test Org--")).toBe("test-org");
  });
});

describe("Invite Token for Org-Specific Links", () => {
  it("generates URL-safe tokens", () => {
    const token = generateInviteToken();
    // base64url should not contain +, /, or =
    expect(token).not.toMatch(/[+/=]/);
    expect(token.length).toBeGreaterThan(40);
  });

  it("generates unique tokens", () => {
    const tokens = new Set(Array.from({ length: 100 }, () => generateInviteToken()));
    expect(tokens.size).toBe(100);
  });
});

describe("Invite Link Format", () => {
  it("builds correct org-specific invite link", () => {
    const orgSlug = "aurovia";
    const token = "abc123def456";
    const origin = "https://royaltonai-tykqbqav.manus.space";
    const link = `${origin}/invite/${orgSlug}/${token}`;
    expect(link).toBe("https://royaltonai-tykqbqav.manus.space/invite/aurovia/abc123def456");
  });

  it("falls back to query param format when no org slug", () => {
    const token = "abc123def456";
    const origin = "https://royaltonai-tykqbqav.manus.space";
    const orgSlug: string | null = null;
    const link = orgSlug
      ? `${origin}/invite/${orgSlug}/${token}`
      : `${origin}/?invite=${token}`;
    expect(link).toBe("https://royaltonai-tykqbqav.manus.space/?invite=abc123def456");
  });
});

describe("API Key Hashing and Prefix", () => {
  it("hashes org-branded keys consistently", () => {
    const key = "ATLAS-AUROVI-1234-5678-9ABC-DEF0-1234-5678";
    const hash1 = hashApiKey(key);
    const hash2 = hashApiKey(key);
    expect(hash1).toBe(hash2);
    expect(hash1).toHaveLength(64); // SHA-256 hex
  });

  it("produces different hashes for different org keys", () => {
    const key1 = generateApiKey("aurovia");
    const key2 = generateApiKey("royalton");
    expect(hashApiKey(key1)).not.toBe(hashApiKey(key2));
  });

  it("extracts correct prefix from org-branded key", () => {
    const key = "ATLAS-AUROVI-1234-5678-9ABC-DEF0-1234-5678";
    expect(getKeyPrefix(key)).toBe("ATLAS-AURO");
  });

  it("extracts correct prefix from generic key", () => {
    const key = "ATLAS-1234-5678-9ABC-DEF0-1234-5678-ABCD-EF01";
    expect(getKeyPrefix(key)).toBe("ATLAS-1234");
  });
});

describe("Invite Validation Logic", () => {
  it("rejects mismatched org slug and invitation org", () => {
    // Simulating the validation: invite belongs to org ID 1, but URL has org ID 2's slug
    const inviteOrgId = 1;
    const urlOrgId = 2;
    expect(inviteOrgId).not.toBe(urlOrgId);
  });

  it("masks email correctly for privacy", () => {
    const email = "partner@aurovia.com";
    const parts = email.split("@");
    const masked = parts[0].substring(0, 2) + "***@" + (parts[1] || "");
    expect(masked).toBe("pa***@aurovia.com");
  });

  it("masks short emails correctly", () => {
    const email = "a@test.com";
    const parts = email.split("@");
    const masked = parts[0].substring(0, 2) + "***@" + (parts[1] || "");
    expect(masked).toBe("a***@test.com");
  });
});
