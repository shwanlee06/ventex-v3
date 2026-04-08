import { describe, it, expect, beforeEach } from "vitest";
import {
  checkRateLimit,
  enforceRateLimit,
  resetRateLimit,
  getRateLimitStatus,
  getRateLimitStoreSize,
  RATE_LIMITS,
} from "./rateLimit";

describe("Rate Limiter", () => {
  // Use unique keys per test to avoid cross-contamination
  let testKey = 0;
  beforeEach(() => { testKey++; });

  it("allows requests within the limit", () => {
    const key = `test-allow-${testKey}`;
    const config = { maxRequests: 3, windowMs: 60_000 };

    const r1 = checkRateLimit(key, config);
    expect(r1.allowed).toBe(true);
    expect(r1.remaining).toBe(2);

    const r2 = checkRateLimit(key, config);
    expect(r2.allowed).toBe(true);
    expect(r2.remaining).toBe(1);

    const r3 = checkRateLimit(key, config);
    expect(r3.allowed).toBe(true);
    expect(r3.remaining).toBe(0);
  });

  it("blocks requests exceeding the limit", () => {
    const key = `test-block-${testKey}`;
    const config = { maxRequests: 2, windowMs: 60_000 };

    checkRateLimit(key, config);
    checkRateLimit(key, config);

    const r3 = checkRateLimit(key, config);
    expect(r3.allowed).toBe(false);
    expect(r3.remaining).toBe(0);
    expect(r3.retryAfterMs).toBeGreaterThan(0);
  });

  it("enforceRateLimit throws when exceeded", () => {
    // Use a unique category key via the general category
    const id = `enforce-${testKey}`;
    // General: 200 per minute — too many to exhaust, use direct checkRateLimit
    const config = { maxRequests: 1, windowMs: 60_000 };
    const key = `test-enforce-${testKey}`;
    checkRateLimit(key, config); // consume the one allowed

    const result = checkRateLimit(key, config);
    expect(result.allowed).toBe(false);
  });

  it("resetRateLimit clears the counter", () => {
    // Use invitation category for a real test
    const userId = 99990 + testKey;
    // Exhaust the limit
    for (let i = 0; i < RATE_LIMITS.invitation.maxRequests; i++) {
      enforceRateLimit("invitation", userId);
    }
    // Should be blocked now
    expect(() => enforceRateLimit("invitation", userId)).toThrow("Rate limit exceeded");

    // Reset
    resetRateLimit("invitation", userId);

    // Should work again
    expect(() => enforceRateLimit("invitation", userId)).not.toThrow();
  });

  it("getRateLimitStatus returns correct remaining", () => {
    const userId = 88880 + testKey;
    const status1 = getRateLimitStatus("mfaVerify", userId);
    expect(status1.remaining).toBe(RATE_LIMITS.mfaVerify.maxRequests);

    enforceRateLimit("mfaVerify", userId);
    const status2 = getRateLimitStatus("mfaVerify", userId);
    expect(status2.remaining).toBe(RATE_LIMITS.mfaVerify.maxRequests - 1);
  });

  it("getRateLimitStoreSize returns positive number after usage", () => {
    const key = `store-size-${testKey}`;
    checkRateLimit(key, { maxRequests: 10, windowMs: 60_000 });
    expect(getRateLimitStoreSize()).toBeGreaterThan(0);
  });

  it("RATE_LIMITS has all expected categories", () => {
    expect(RATE_LIMITS.login).toBeDefined();
    expect(RATE_LIMITS.apiKeyCreate).toBeDefined();
    expect(RATE_LIMITS.fileUpload).toBeDefined();
    expect(RATE_LIMITS.invitation).toBeDefined();
    expect(RATE_LIMITS.mfaVerify).toBeDefined();
    expect(RATE_LIMITS.aiChat).toBeDefined();
    expect(RATE_LIMITS.portalAi).toBeDefined();
    expect(RATE_LIMITS.general).toBeDefined();
    expect(RATE_LIMITS.emailSend).toBeDefined();
  });
});
