/**
 * IP Allowlist Enforcement Middleware
 *
 * Checks authenticated requests against the organization's ipAllowlist.
 * If the org has a non-empty ipAllowlist, the request IP must match
 * at least one CIDR range in the list. Unauthenticated requests and
 * requests from users without an org are allowed through (they'll be
 * caught by auth checks downstream).
 *
 * This middleware runs AFTER authentication context is established
 * but BEFORE tRPC procedures execute.
 */

import type { Request, Response, NextFunction } from "express";
import { eq } from "drizzle-orm";
import { organizations } from "../../drizzle/schema";
import { getDb } from "../db";

/**
 * Convert an IPv4 address string to a 32-bit unsigned integer.
 */
function ipToNumber(ip: string): number | null {
  const parts = ip.split(".");
  if (parts.length !== 4) return null;
  const nums = parts.map(Number);
  if (nums.some((n) => isNaN(n) || n < 0 || n > 255)) return null;
  return ((nums[0] << 24) | (nums[1] << 16) | (nums[2] << 8) | nums[3]) >>> 0;
}

/**
 * Check if an IP address falls within a CIDR range.
 */
function isIpInCidr(ip: string, cidr: string): boolean {
  const parts = cidr.split("/");
  if (parts.length !== 2) return false;

  const cidrIp = parts[0];
  const maskBits = parseInt(parts[1], 10);

  if (isNaN(maskBits) || maskBits < 0 || maskBits > 32) return false;

  const ipNum = ipToNumber(ip);
  const cidrNum = ipToNumber(cidrIp);

  if (ipNum === null || cidrNum === null) return false;

  const mask = maskBits === 0 ? 0 : (~0 << (32 - maskBits)) >>> 0;
  return (ipNum & mask) === (cidrNum & mask);
}

/**
 * Extract the client IP from the request, handling proxied requests.
 * Supports X-Forwarded-For, X-Real-IP, and direct connection IP.
 */
function getClientIp(req: Request): string {
  // X-Forwarded-For may contain a comma-separated list; take the first (client) IP
  const forwarded = req.headers["x-forwarded-for"];
  if (forwarded) {
    const first = (Array.isArray(forwarded) ? forwarded[0] : forwarded).split(",")[0].trim();
    if (first) return normalizeIp(first);
  }

  const realIp = req.headers["x-real-ip"];
  if (realIp) {
    const ip = Array.isArray(realIp) ? realIp[0] : realIp;
    return normalizeIp(ip.trim());
  }

  return normalizeIp(req.socket.remoteAddress || "0.0.0.0");
}

/**
 * Normalize IPv6-mapped IPv4 addresses (::ffff:x.x.x.x) to plain IPv4.
 */
function normalizeIp(ip: string): string {
  if (ip.startsWith("::ffff:")) {
    return ip.slice(7);
  }
  return ip;
}

// Simple in-memory cache for org IP allowlists to avoid DB lookups on every request.
// Cache entries expire after 60 seconds.
const allowlistCache = new Map<number, { list: string[] | null; expiresAt: number }>();
const CACHE_TTL_MS = 60_000; // 1 minute

async function getOrgAllowlist(orgId: number): Promise<string[] | null> {
  const now = Date.now();
  const cached = allowlistCache.get(orgId);
  if (cached && cached.expiresAt > now) {
    return cached.list;
  }

  const db = await getDb();
  if (!db) return null;
  const [org] = await db
    .select({ ipAllowlist: organizations.ipAllowlist })
    .from(organizations)
    .where(eq(organizations.id, orgId))
    .limit(1);

  const list = org?.ipAllowlist ?? null;
  allowlistCache.set(orgId, { list, expiresAt: now + CACHE_TTL_MS });
  return list;
}

/**
 * Clear the allowlist cache for a specific org (call after updating settings).
 */
export function clearAllowlistCache(orgId: number): void {
  allowlistCache.delete(orgId);
}

/**
 * Clear the entire allowlist cache.
 */
export function clearAllAllowlistCaches(): void {
  allowlistCache.clear();
}

/**
 * Express middleware that enforces IP allowlist for authenticated users.
 *
 * Must be mounted AFTER authentication middleware sets (req as any).__user.
 * For tRPC, this runs as a tRPC middleware instead (see createIpAllowlistMiddleware).
 */
export function ipAllowlistMiddleware() {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Only enforce for authenticated users with an org
      const user = (req as any).__user;
      if (!user?.organizationId) {
        return next();
      }

      const allowlist = await getOrgAllowlist(user.organizationId);

      // No allowlist = no restriction
      if (!allowlist || allowlist.length === 0) {
        return next();
      }

      const clientIp = getClientIp(req);

      // Check if the client IP matches any CIDR range in the allowlist
      const allowed = allowlist.some((cidr) => isIpInCidr(clientIp, cidr));

      if (!allowed) {
        console.warn(
          `[IP_ALLOWLIST] Blocked request from ${clientIp} for org ${user.organizationId}. Allowed: ${allowlist.join(", ")}`
        );
        res.status(403).json({
          error: "Access denied",
          message: "Your IP address is not in the organization's allowed list. Contact your administrator.",
        });
        return;
      }

      next();
    } catch (error) {
      // On error, fail open to avoid blocking legitimate requests.
      // Log the error for investigation.
      console.error("[IP_ALLOWLIST] Error checking allowlist, failing open:", error);
      next();
    }
  };
}

// ── Exports for testing ──
export { getClientIp, isIpInCidr, ipToNumber, normalizeIp, getOrgAllowlist };
