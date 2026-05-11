/**
 * Security Headers Middleware — Applied to All HTTP Responses
 *
 * Enforces:
 * - HSTS (HTTP Strict Transport Security)
 * - CSP (Content Security Policy)
 * - X-Content-Type-Options: nosniff
 * - X-Frame-Options: DENY
 * - Referrer-Policy: strict-origin-when-cross-origin
 * - Permissions-Policy (camera, microphone, geolocation disabled)
 * - Request ID tracking for audit correlation
 *
 * SOC 2 Controls: CC6.1, CC6.6, CC7.1
 */

import type { Request, Response, NextFunction } from "express";
import crypto from "crypto";
import { getSecurityHeaders, isOriginAllowed } from "./enterpriseControls";

/**
 * Express middleware that applies enterprise security headers to every response.
 */
export function securityHeadersMiddleware(req: Request, res: Response, next: NextFunction): void {
  const headers = getSecurityHeaders();

  // Apply all security headers
  for (const [key, value] of Object.entries(headers)) {
    res.setHeader(key, value);
  }

  // CORS handling
  const origin = req.headers.origin;
  if (origin && isOriginAllowed(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, PATCH, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Request-ID, X-CSRF-Token");
    res.setHeader("Access-Control-Max-Age", "86400");
  }

  // Handle preflight
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  next();
}

/**
 * Request ID middleware — attaches a unique ID to each request for audit correlation.
 */
export function requestIdMiddleware(req: Request, _res: Response, next: NextFunction): void {
  const requestId = req.headers["x-request-id"] as string || crypto.randomUUID();
  (req as any).requestId = requestId;
  next();
}
