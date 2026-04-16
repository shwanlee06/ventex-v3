// Multi-Currency Support — FX rate management and conversion
// Supports manual rate entry and ECB-style rate feeds

import { getDb } from "./db";
import { fxRates } from "../drizzle/schema";
import { eq, and, desc } from "drizzle-orm";

// Supported currencies with display metadata
export const SUPPORTED_CURRENCIES: Record<string, { symbol: string; name: string; decimals: number }> = {
  USD: { symbol: "$", name: "US Dollar", decimals: 2 },
  EUR: { symbol: "€", name: "Euro", decimals: 2 },
  GBP: { symbol: "£", name: "British Pound", decimals: 2 },
  CHF: { symbol: "CHF", name: "Swiss Franc", decimals: 2 },
  AED: { symbol: "د.إ", name: "UAE Dirham", decimals: 2 },
  SAR: { symbol: "﷼", name: "Saudi Riyal", decimals: 2 },
  SGD: { symbol: "S$", name: "Singapore Dollar", decimals: 2 },
  HKD: { symbol: "HK$", name: "Hong Kong Dollar", decimals: 2 },
  JPY: { symbol: "¥", name: "Japanese Yen", decimals: 0 },
  CAD: { symbol: "C$", name: "Canadian Dollar", decimals: 2 },
  AUD: { symbol: "A$", name: "Australian Dollar", decimals: 2 },
  BHD: { symbol: "BD", name: "Bahraini Dinar", decimals: 3 },
  KWD: { symbol: "KD", name: "Kuwaiti Dinar", decimals: 3 },
  QAR: { symbol: "QR", name: "Qatari Riyal", decimals: 2 },
  OMR: { symbol: "OMR", name: "Omani Rial", decimals: 3 },
};

// In-memory cache for FX rates (5 min TTL)
let rateCache: Map<string, { rate: number; fetchedAt: number }> = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000;

function cacheKey(base: string, target: string): string {
  return `${base}:${target}`;
}

/**
 * Get the latest FX rate between two currencies.
 * Returns null if no rate is available.
 */
export async function getLatestRate(baseCurrency: string, targetCurrency: string): Promise<number | null> {
  if (baseCurrency === targetCurrency) return 1;

  // Check cache first
  const key = cacheKey(baseCurrency, targetCurrency);
  const cached = rateCache.get(key);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.rate;
  }

  const db = await getDb();
  if (!db) return null;

  // Try direct rate
  const [direct] = await db
    .select()
    .from(fxRates)
    .where(and(eq(fxRates.baseCurrency, baseCurrency), eq(fxRates.targetCurrency, targetCurrency)))
    .orderBy(desc(fxRates.createdAt))
    .limit(1);

  if (direct) {
    rateCache.set(key, { rate: direct.rate, fetchedAt: Date.now() });
    rateCache.set(cacheKey(targetCurrency, baseCurrency), { rate: direct.inverseRate, fetchedAt: Date.now() });
    return direct.rate;
  }

  // Try inverse rate
  const [inverse] = await db
    .select()
    .from(fxRates)
    .where(and(eq(fxRates.baseCurrency, targetCurrency), eq(fxRates.targetCurrency, baseCurrency)))
    .orderBy(desc(fxRates.createdAt))
    .limit(1);

  if (inverse) {
    const rate = inverse.inverseRate;
    rateCache.set(key, { rate, fetchedAt: Date.now() });
    rateCache.set(cacheKey(targetCurrency, baseCurrency), { rate: inverse.rate, fetchedAt: Date.now() });
    return rate;
  }

  // Try triangulation through USD
  if (baseCurrency !== "USD" && targetCurrency !== "USD") {
    const baseToUsd = await getLatestRate(baseCurrency, "USD");
    const usdToTarget = await getLatestRate("USD", targetCurrency);
    if (baseToUsd !== null && usdToTarget !== null) {
      const triangulated = baseToUsd * usdToTarget;
      rateCache.set(key, { rate: triangulated, fetchedAt: Date.now() });
      return triangulated;
    }
  }

  return null;
}

/**
 * Convert an amount from one currency to another.
 * Returns the converted amount or null if no rate is available.
 */
export async function convertCurrency(
  amount: number,
  fromCurrency: string,
  toCurrency: string
): Promise<{ convertedAmount: number; rate: number } | null> {
  const rate = await getLatestRate(fromCurrency, toCurrency);
  if (rate === null) return null;
  return {
    convertedAmount: Math.round(amount * rate * 100) / 100,
    rate,
  };
}

/**
 * Format a currency amount for display.
 */
export function formatAmount(amount: number, currency: string = "USD"): string {
  const config = SUPPORTED_CURRENCIES[currency];
  if (!config) {
    return `${currency} ${amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}`;
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: config.decimals,
    maximumFractionDigits: config.decimals,
  }).format(amount);
}

/**
 * Save a new FX rate to the database.
 */
export async function saveRate(params: {
  baseCurrency: string;
  targetCurrency: string;
  rate: number;
  source?: string;
  effectiveDate: string;
}): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.insert(fxRates).values({
    baseCurrency: params.baseCurrency,
    targetCurrency: params.targetCurrency,
    rate: params.rate,
    inverseRate: 1 / params.rate,
    source: params.source || "manual",
    effectiveDate: params.effectiveDate,
  });

  // Clear cache for this pair
  rateCache.delete(cacheKey(params.baseCurrency, params.targetCurrency));
  rateCache.delete(cacheKey(params.targetCurrency, params.baseCurrency));
}

/**
 * Clear the in-memory rate cache.
 */
export function clearRateCache(): void {
  rateCache = new Map();
}
