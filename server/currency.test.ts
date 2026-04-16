import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  SUPPORTED_CURRENCIES,
  formatAmount,
  clearRateCache,
} from "./currency";

// ─── Pure function tests (no DB needed) ───────────────────────────

describe("Tier 3b: Multi-Currency Module", () => {
  describe("SUPPORTED_CURRENCIES", () => {
    it("should contain at least 15 currencies", () => {
      expect(Object.keys(SUPPORTED_CURRENCIES).length).toBeGreaterThanOrEqual(15);
    });

    it("should include USD, EUR, GBP, AED, SAR", () => {
      expect(SUPPORTED_CURRENCIES.USD).toBeDefined();
      expect(SUPPORTED_CURRENCIES.EUR).toBeDefined();
      expect(SUPPORTED_CURRENCIES.GBP).toBeDefined();
      expect(SUPPORTED_CURRENCIES.AED).toBeDefined();
      expect(SUPPORTED_CURRENCIES.SAR).toBeDefined();
    });

    it("each currency should have symbol, name, and decimals", () => {
      for (const [code, meta] of Object.entries(SUPPORTED_CURRENCIES)) {
        expect(meta.symbol).toBeTruthy();
        expect(meta.name).toBeTruthy();
        expect(typeof meta.decimals).toBe("number");
        expect(meta.decimals).toBeGreaterThanOrEqual(0);
        expect(meta.decimals).toBeLessThanOrEqual(3);
      }
    });

    it("JPY should have 0 decimal places", () => {
      expect(SUPPORTED_CURRENCIES.JPY.decimals).toBe(0);
    });

    it("BHD, KWD, OMR should have 3 decimal places", () => {
      expect(SUPPORTED_CURRENCIES.BHD.decimals).toBe(3);
      expect(SUPPORTED_CURRENCIES.KWD.decimals).toBe(3);
      expect(SUPPORTED_CURRENCIES.OMR.decimals).toBe(3);
    });

    it("USD, EUR, GBP should have 2 decimal places", () => {
      expect(SUPPORTED_CURRENCIES.USD.decimals).toBe(2);
      expect(SUPPORTED_CURRENCIES.EUR.decimals).toBe(2);
      expect(SUPPORTED_CURRENCIES.GBP.decimals).toBe(2);
    });
  });

  describe("formatAmount", () => {
    it("should format USD amounts with $ symbol", () => {
      const result = formatAmount(1000, "USD");
      expect(result).toContain("$");
      expect(result).toContain("1,000");
    });

    it("should format EUR amounts with € symbol", () => {
      const result = formatAmount(2500.5, "EUR");
      expect(result).toContain("€");
    });

    it("should format JPY with 0 decimal places", () => {
      const result = formatAmount(100000, "JPY");
      expect(result).toContain("¥");
      // JPY should not have decimal places
      expect(result).not.toContain(".");
    });

    it("should format BHD with 3 decimal places", () => {
      const result = formatAmount(1000.123, "BHD");
      expect(result).toContain("1,000.123");
    });

    it("should handle unknown currencies gracefully", () => {
      const result = formatAmount(500, "XYZ");
      expect(result).toContain("XYZ");
      expect(result).toContain("500");
    });

    it("should default to USD when no currency specified", () => {
      const result = formatAmount(1234.56);
      expect(result).toContain("$");
      expect(result).toContain("1,234.56");
    });

    it("should format zero amounts", () => {
      const result = formatAmount(0, "USD");
      expect(result).toContain("$");
      expect(result).toContain("0.00");
    });

    it("should format large amounts with commas", () => {
      const result = formatAmount(1234567.89, "USD");
      expect(result).toContain("1,234,567.89");
    });

    it("should format negative amounts", () => {
      const result = formatAmount(-500, "USD");
      expect(result).toContain("500");
    });
  });

  describe("clearRateCache", () => {
    it("should not throw when called", () => {
      expect(() => clearRateCache()).not.toThrow();
    });

    it("should be callable multiple times", () => {
      clearRateCache();
      clearRateCache();
      expect(true).toBe(true);
    });
  });

  // ─── DB-dependent tests (mock getDb) ───────────────────────────

  describe("getLatestRate", () => {
    beforeEach(() => {
      clearRateCache();
    });

    it("should return 1 for same currency", async () => {
      const { getLatestRate } = await import("./currency");
      const rate = await getLatestRate("USD", "USD");
      expect(rate).toBe(1);
    });

    it("should return 1 for any same currency pair", async () => {
      const { getLatestRate } = await import("./currency");
      expect(await getLatestRate("EUR", "EUR")).toBe(1);
      expect(await getLatestRate("GBP", "GBP")).toBe(1);
      expect(await getLatestRate("JPY", "JPY")).toBe(1);
    });
  });

  describe("convertCurrency", () => {
    beforeEach(() => {
      clearRateCache();
    });

    it("should return same amount for same currency", async () => {
      const { convertCurrency } = await import("./currency");
      const result = await convertCurrency(1000, "USD", "USD");
      expect(result).toEqual({ convertedAmount: 1000, rate: 1 });
    });

    it("should return same amount for zero amount", async () => {
      const { convertCurrency } = await import("./currency");
      const result = await convertCurrency(0, "USD", "USD");
      expect(result).toEqual({ convertedAmount: 0, rate: 1 });
    });
  });

  // ─── Router procedure tests ─────────────────────────────────────

  describe("Distribution FX procedures", () => {
    it("supportedCurrencies should return all 15 currencies", async () => {
      // Import the router to test the procedure
      const { appRouter } = await import("./routers");
      const caller = appRouter.createCaller({
        user: null,
        req: { protocol: "https", headers: {} } as any,
        res: { clearCookie: () => {} } as any,
      });

      const currencies = await caller.distributions.supportedCurrencies();
      expect(currencies.length).toBeGreaterThanOrEqual(15);
      expect(currencies.find((c: any) => c.code === "USD")).toBeDefined();
      expect(currencies.find((c: any) => c.code === "EUR")).toBeDefined();
      expect(currencies.find((c: any) => c.code === "AED")).toBeDefined();

      // Each currency should have code, symbol, name, decimals
      for (const c of currencies) {
        expect(c.code).toBeTruthy();
        expect(c.symbol).toBeTruthy();
        expect(c.name).toBeTruthy();
        expect(typeof c.decimals).toBe("number");
      }
    });

    it("supportedCurrencies should include Gulf currencies", async () => {
      const { appRouter } = await import("./routers");
      const caller = appRouter.createCaller({
        user: null,
        req: { protocol: "https", headers: {} } as any,
        res: { clearCookie: () => {} } as any,
      });

      const currencies = await caller.distributions.supportedCurrencies();
      const gulfCodes = ["AED", "SAR", "BHD", "KWD", "QAR", "OMR"];
      for (const code of gulfCodes) {
        expect(currencies.find((c: any) => c.code === code)).toBeDefined();
      }
    });
  });
});
