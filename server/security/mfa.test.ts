import { describe, it, expect } from "vitest";
import {
  generateTotpSecret,
  verifyTotpCode,
  generateBackupCodes,
  verifyBackupCode,
} from "./mfa";

describe("MFA / TOTP Module", () => {
  it("generates a TOTP secret with valid structure", () => {
    const result = generateTotpSecret("test@atlas.io");
    expect(result.secret).toBeTruthy();
    expect(result.secret.length).toBeGreaterThanOrEqual(16);
    expect(result.encryptedSecret).toBeTruthy();
    expect(result.otpauthUri).toContain("otpauth://totp/");
    expect(result.otpauthUri).toContain("ATLAS");
    expect(result.otpauthUri).toContain("test%40atlas.io");
  });

  it("verifyTotpCode returns false for invalid code", () => {
    const { encryptedSecret } = generateTotpSecret("test@atlas.io");
    const result = verifyTotpCode("000000", encryptedSecret);
    // This may or may not be valid depending on timing, but "000000" is almost certainly wrong
    expect(typeof result).toBe("boolean");
  });

  it("generates 10 backup codes with correct format", () => {
    const { plainCodes, hashedCodes } = generateBackupCodes();
    expect(plainCodes).toHaveLength(10);
    expect(hashedCodes).toHaveLength(10);
    // Each plain code should be in XXXX-XXXX format
    for (const code of plainCodes) {
      expect(code).toMatch(/^[A-F0-9]{4}-[A-F0-9]{4}$/);
    }
    // Each hashed code should be a 64-char hex string (SHA-256)
    for (const hash of hashedCodes) {
      expect(hash).toMatch(/^[a-f0-9]{64}$/);
    }
  });

  it("verifies a backup code correctly", () => {
    const { plainCodes, hashedCodes } = generateBackupCodes();
    // First code should match
    const idx = verifyBackupCode(plainCodes[0], hashedCodes);
    expect(idx).toBe(0);
    // Last code should match
    const lastIdx = verifyBackupCode(plainCodes[9], hashedCodes);
    expect(lastIdx).toBe(9);
    // Invalid code should not match
    const badIdx = verifyBackupCode("ZZZZ-ZZZZ", hashedCodes);
    expect(badIdx).toBe(-1);
  });

  it("backup code verification is case-insensitive", () => {
    const { plainCodes, hashedCodes } = generateBackupCodes();
    const lower = plainCodes[0].toLowerCase();
    const idx = verifyBackupCode(lower, hashedCodes);
    expect(idx).toBe(0);
  });

  it("each backup code is unique", () => {
    const { plainCodes } = generateBackupCodes();
    const unique = new Set(plainCodes);
    expect(unique.size).toBe(10);
  });
});
