/**
 * In-Memory Rate Limiter — SOC 2 Compliant
 *
 * Token-bucket style rate limiting for sensitive endpoints.
 * Tracks requests by IP + route key with automatic cleanup.
 *
 * Limits:
 * - Login / OAuth: 10 attempts per 15 minutes per IP
 * - API key creation: 5 per hour per user
 * - File upload: 30 per 10 minutes per user
 * - Invitations: 20 per hour per user
 * - MFA verification: 5 attempts per 5 minutes per user
 * - AI chat: 30 per 10 minutes per user
 * - Portal AI: 20 per 10 minutes per user
 * - General API: 200 per minute per IP
 */

interface RateLimitEntry {
  count: number;
  resetAt: number; // Unix timestamp ms
}

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

// Store: key -> { count, resetAt }
const store = new Map<string, RateLimitEntry>();

// Cleanup stale entries every 5 minutes
const CLEANUP_INTERVAL = 5 * 60 * 1000;
let cleanupTimer: ReturnType<typeof setInterval> | null = null;

function startCleanup() {
  if (cleanupTimer) return;
  cleanupTimer = setInterval(() => {
    const now = Date.now();
    const keysToDelete: string[] = [];
    store.forEach((entry, key) => {
      if (entry.resetAt <= now) {
        keysToDelete.push(key);
      }
    });
    keysToDelete.forEach((key) => store.delete(key));
  }, CLEANUP_INTERVAL);
  // Don't prevent process exit
  if (cleanupTimer && typeof cleanupTimer === "object" && "unref" in cleanupTimer) {
    cleanupTimer.unref();
  }
}

startCleanup();

// ── Predefined rate limit configs ────────────────────────────────────

export const RATE_LIMITS = {
  login: { maxRequests: 10, windowMs: 15 * 60 * 1000 } as RateLimitConfig,
  apiKeyCreate: { maxRequests: 5, windowMs: 60 * 60 * 1000 } as RateLimitConfig,
  fileUpload: { maxRequests: 30, windowMs: 10 * 60 * 1000 } as RateLimitConfig,
  invitation: { maxRequests: 20, windowMs: 60 * 60 * 1000 } as RateLimitConfig,
  mfaVerify: { maxRequests: 5, windowMs: 5 * 60 * 1000 } as RateLimitConfig,
  aiChat: { maxRequests: 30, windowMs: 10 * 60 * 1000 } as RateLimitConfig,
  portalAi: { maxRequests: 20, windowMs: 10 * 60 * 1000 } as RateLimitConfig,
  general: { maxRequests: 200, windowMs: 60 * 1000 } as RateLimitConfig,
  emailSend: { maxRequests: 10, windowMs: 60 * 60 * 1000 } as RateLimitConfig,
} as const;

/**
 * Check if a request is rate limited.
 *
 * @param key - Unique identifier (e.g., "login:192.168.1.1" or "upload:userId:42")
 * @param config - Rate limit configuration
 * @returns { allowed, remaining, resetAt, retryAfterMs }
 */
export function checkRateLimit(
  key: string,
  config: RateLimitConfig
): {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  retryAfterMs: number;
} {
  const now = Date.now();
  const entry = store.get(key);

  // No existing entry or window expired — create fresh
  if (!entry || entry.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + config.windowMs });
    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetAt: now + config.windowMs,
      retryAfterMs: 0,
    };
  }

  // Window still active
  if (entry.count < config.maxRequests) {
    entry.count++;
    return {
      allowed: true,
      remaining: config.maxRequests - entry.count,
      resetAt: entry.resetAt,
      retryAfterMs: 0,
    };
  }

  // Rate limited
  return {
    allowed: false,
    remaining: 0,
    resetAt: entry.resetAt,
    retryAfterMs: entry.resetAt - now,
  };
}

/**
 * Build a rate limit key from components.
 */
export function rateLimitKey(
  category: keyof typeof RATE_LIMITS,
  identifier: string | number
): string {
  return `${category}:${identifier}`;
}

/**
 * Enforce rate limit — throws if exceeded.
 * Use in tRPC procedures.
 */
export function enforceRateLimit(
  category: keyof typeof RATE_LIMITS,
  identifier: string | number
): void {
  const key = rateLimitKey(category, identifier);
  const config = RATE_LIMITS[category];
  const result = checkRateLimit(key, config);

  if (!result.allowed) {
    const retrySeconds = Math.ceil(result.retryAfterMs / 1000);
    throw new Error(
      `Rate limit exceeded. Please try again in ${retrySeconds} seconds.`
    );
  }
}

/**
 * Get current rate limit status without consuming a request.
 */
export function getRateLimitStatus(
  category: keyof typeof RATE_LIMITS,
  identifier: string | number
): { remaining: number; resetAt: number } {
  const key = rateLimitKey(category, identifier);
  const config = RATE_LIMITS[category];
  const entry = store.get(key);
  const now = Date.now();

  if (!entry || entry.resetAt <= now) {
    return { remaining: config.maxRequests, resetAt: 0 };
  }

  return {
    remaining: Math.max(0, config.maxRequests - entry.count),
    resetAt: entry.resetAt,
  };
}

/**
 * Reset rate limit for a specific key (e.g., after successful login).
 */
export function resetRateLimit(
  category: keyof typeof RATE_LIMITS,
  identifier: string | number
): void {
  const key = rateLimitKey(category, identifier);
  store.delete(key);
}

/**
 * Get store size for monitoring.
 */
export function getRateLimitStoreSize(): number {
  return store.size;
}
