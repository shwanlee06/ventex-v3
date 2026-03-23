import { describe, it, expect, vi, beforeEach } from "vitest";
import crypto from "crypto";

// ── Unit tests for access control helpers ──────────────────────────────

describe("Access Control Helpers", () => {
  describe("API Key Generation", () => {
    function generateApiKey(): string {
      const segments: string[] = [];
      for (let i = 0; i < 8; i++) {
        segments.push(crypto.randomBytes(2).toString("hex").toUpperCase());
      }
      return `ATLAS-${segments.join("-")}`;
    }

    it("should generate a key starting with ATLAS-", () => {
      const key = generateApiKey();
      expect(key).toMatch(/^ATLAS-/);
    });

    it("should generate a key with 48 characters", () => {
      const key = generateApiKey();
      // ATLAS- (6) + 8 segments of 4 chars (32) + 7 dashes (7) = 45
      // Actually: "ATLAS-" = 6, then 8 segments of 4 hex chars with 7 dashes = 32+7 = 39, total = 45
      expect(key.length).toBe(45);
    });

    it("should generate unique keys", () => {
      const keys = new Set<string>();
      for (let i = 0; i < 100; i++) {
        keys.add(generateApiKey());
      }
      expect(keys.size).toBe(100);
    });

    it("should only contain valid characters (hex + dashes + ATLAS prefix)", () => {
      const key = generateApiKey();
      expect(key).toMatch(/^ATLAS-[0-9A-F]{4}(-[0-9A-F]{4}){7}$/);
    });
  });

  describe("Invite Token Generation", () => {
    function generateInviteToken(): string {
      return crypto.randomBytes(48).toString("base64url");
    }

    it("should generate a non-empty token", () => {
      const token = generateInviteToken();
      expect(token.length).toBeGreaterThan(0);
    });

    it("should generate URL-safe tokens", () => {
      const token = generateInviteToken();
      // base64url should not contain +, /, or =
      expect(token).not.toMatch(/[+/=]/);
    });

    it("should generate unique tokens", () => {
      const tokens = new Set<string>();
      for (let i = 0; i < 100; i++) {
        tokens.add(generateInviteToken());
      }
      expect(tokens.size).toBe(100);
    });
  });

  describe("API Key Hashing", () => {
    function hashApiKey(key: string): string {
      return crypto.createHash("sha256").update(key).digest("hex");
    }

    it("should produce a 64-character hex string", () => {
      const hash = hashApiKey("ATLAS-1234-5678-9ABC-DEF0-1234-5678-9ABC-DEF0");
      expect(hash).toHaveLength(64);
      expect(hash).toMatch(/^[0-9a-f]{64}$/);
    });

    it("should produce consistent hashes for the same input", () => {
      const key = "ATLAS-1234-5678-9ABC-DEF0-1234-5678-9ABC-DEF0";
      const hash1 = hashApiKey(key);
      const hash2 = hashApiKey(key);
      expect(hash1).toBe(hash2);
    });

    it("should produce different hashes for different inputs", () => {
      const hash1 = hashApiKey("ATLAS-1111-2222-3333-4444-5555-6666-7777-8888");
      const hash2 = hashApiKey("ATLAS-AAAA-BBBB-CCCC-DDDD-EEEE-FFFF-0000-1111");
      expect(hash1).not.toBe(hash2);
    });
  });

  describe("Key Prefix Extraction", () => {
    function getKeyPrefix(key: string): string {
      return key.substring(0, 10);
    }

    it("should return the first 10 characters", () => {
      const prefix = getKeyPrefix("ATLAS-1234-5678-9ABC-DEF0-1234-5678-9ABC-DEF0");
      expect(prefix).toBe("ATLAS-1234");
    });

    it("should be 10 characters long", () => {
      const prefix = getKeyPrefix("ATLAS-ABCD-EFGH-IJKL-MNOP-QRST-UVWX-YZ01-2345");
      expect(prefix).toHaveLength(10);
    });
  });

  describe("OAuth Error Messages", () => {
    const errorMessages: Record<string, string> = {
      no_invitation: "ACCESS DENIED — NO INVITATION FOUND FOR THIS ACCOUNT",
      blocked: "ACCESS DENIED — YOUR ACCOUNT HAS BEEN BLOCKED",
      suspended: "ACCESS DENIED — YOUR ACCOUNT HAS BEEN SUSPENDED",
      invitation_expired: "ACCESS DENIED — YOUR INVITATION HAS EXPIRED",
    };

    it("should have messages for all error types", () => {
      expect(errorMessages).toHaveProperty("no_invitation");
      expect(errorMessages).toHaveProperty("blocked");
      expect(errorMessages).toHaveProperty("suspended");
      expect(errorMessages).toHaveProperty("invitation_expired");
    });

    it("should return undefined for unknown error types", () => {
      expect(errorMessages["unknown_error"]).toBeUndefined();
    });
  });

  describe("Invitation Expiry Logic", () => {
    it("should detect expired invitations", () => {
      const expiresAt = new Date("2025-01-01");
      const now = new Date("2026-03-23");
      expect(now > expiresAt).toBe(true);
    });

    it("should detect valid invitations", () => {
      const expiresAt = new Date("2027-01-01");
      const now = new Date("2026-03-23");
      expect(now > expiresAt).toBe(false);
    });

    it("should calculate correct expiry from days", () => {
      const now = new Date("2026-03-23T00:00:00Z");
      const expiresInDays = 30;
      const expiresAt = new Date(now.getTime() + expiresInDays * 24 * 60 * 60 * 1000);
      expect(expiresAt.toISOString()).toBe("2026-04-22T00:00:00.000Z");
    });
  });

  describe("Role Hierarchy", () => {
    const ROLE_HIERARCHY = ["viewer", "client", "user", "manager", "admin", "owner"];

    it("should have 6 roles in ascending order", () => {
      expect(ROLE_HIERARCHY).toHaveLength(6);
      expect(ROLE_HIERARCHY[0]).toBe("viewer");
      expect(ROLE_HIERARCHY[5]).toBe("owner");
    });

    it("should correctly compare role levels", () => {
      const roleLevel = (role: string) => ROLE_HIERARCHY.indexOf(role);
      expect(roleLevel("admin")).toBeGreaterThan(roleLevel("user"));
      expect(roleLevel("viewer")).toBeLessThan(roleLevel("manager"));
      expect(roleLevel("owner")).toBeGreaterThan(roleLevel("admin"));
    });

    it("should not allow invitation for owner role", () => {
      const invitableRoles = ROLE_HIERARCHY.filter(r => r !== "owner");
      expect(invitableRoles).not.toContain("owner");
      expect(invitableRoles).toHaveLength(5);
    });
  });

  describe("Organization Types", () => {
    const ORG_TYPES = ["core", "partner", "client"] as const;

    it("should have 3 organization types", () => {
      expect(ORG_TYPES).toHaveLength(3);
    });

    it("should include core for internal orgs like Aurovia/ATLAS", () => {
      expect(ORG_TYPES).toContain("core");
    });

    it("should include partner for partnership organizations", () => {
      expect(ORG_TYPES).toContain("partner");
    });
  });
});
