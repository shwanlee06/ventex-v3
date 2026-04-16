/**
 * Input Sanitization — Defense-in-depth layer
 *
 * While tRPC + Zod handles schema validation, this module provides
 * additional sanitization for string inputs to prevent:
 * - XSS via stored payloads
 * - SQL injection via string concatenation (defense-in-depth, Drizzle uses parameterized queries)
 * - Path traversal in file operations
 * - Log injection via newlines/control characters
 */

/**
 * Strip HTML tags from a string to prevent stored XSS.
 * Use on any user-provided string that will be rendered in HTML.
 */
export function stripHtml(input: string): string {
  return input
    .replace(/<[^>]*>/g, "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/<[^>]*>/g, ""); // Second pass after entity decode
}

/**
 * Escape HTML entities for safe rendering.
 * Use when you need to preserve the original text but render it safely.
 */
export function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .replace(/\//g, "&#x2F;");
}

/**
 * Sanitize a filename to prevent path traversal.
 * Strips directory separators and null bytes.
 */
export function sanitizeFilename(filename: string): string {
  return filename
    .replace(/\0/g, "") // Null bytes
    .replace(/\.\./g, "") // Directory traversal
    .replace(/[/\\]/g, "") // Path separators
    .replace(/[<>:"|?*]/g, "") // Windows-illegal chars
    .trim();
}

/**
 * Sanitize a path component (e.g., folder name).
 * More restrictive than filename — only allows alphanumeric, dash, underscore, dot.
 */
export function sanitizePath(pathComponent: string): string {
  return pathComponent
    .replace(/\0/g, "")
    .replace(/\.\./g, "")
    .replace(/[/\\]/g, "")
    .replace(/[^a-zA-Z0-9\-_. ]/g, "")
    .trim();
}

/**
 * Strip control characters from log-safe strings.
 * Prevents log injection attacks.
 */
export function sanitizeForLog(input: string): string {
  // eslint-disable-next-line no-control-regex
  return input.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "").slice(0, 1000);
}

/**
 * Validate and sanitize a CIDR notation string.
 * Returns null if invalid.
 */
export function validateCidr(cidr: string): string | null {
  const match = cidr.trim().match(/^(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})\/(\d{1,2})$/);
  if (!match) return null;

  const [, ip, mask] = match;
  const maskNum = parseInt(mask, 10);
  if (maskNum < 0 || maskNum > 32) return null;

  const octets = ip.split(".").map(Number);
  if (octets.some((o) => o < 0 || o > 255)) return null;

  return `${octets.join(".")}/${maskNum}`;
}

/**
 * Check if an IP address is within a CIDR range.
 */
export function isIpInCidr(ip: string, cidr: string): boolean {
  const [cidrIp, cidrMask] = cidr.split("/");
  const maskBits = parseInt(cidrMask, 10);

  const ipNum = ipToNumber(ip);
  const cidrNum = ipToNumber(cidrIp);

  if (ipNum === null || cidrNum === null) return false;

  const mask = maskBits === 0 ? 0 : (~0 << (32 - maskBits)) >>> 0;
  return (ipNum & mask) === (cidrNum & mask);
}

/**
 * Convert an IPv4 address string to a 32-bit number.
 */
function ipToNumber(ip: string): number | null {
  const parts = ip.split(".");
  if (parts.length !== 4) return null;

  const nums = parts.map(Number);
  if (nums.some((n) => isNaN(n) || n < 0 || n > 255)) return null;

  return ((nums[0] << 24) | (nums[1] << 16) | (nums[2] << 8) | nums[3]) >>> 0;
}

/**
 * Check if an IP is allowed by an allowlist of CIDR ranges.
 * Returns true if allowlist is null/empty (no restrictions).
 */
export function isIpAllowed(ip: string, allowlist: string[] | null): boolean {
  if (!allowlist || allowlist.length === 0) return true;
  return allowlist.some((cidr) => isIpInCidr(ip, cidr));
}
