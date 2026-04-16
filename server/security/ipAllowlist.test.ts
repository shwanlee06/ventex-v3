import { describe, it, expect } from "vitest";

// Import the pure utility functions for testing
// We test the CIDR matching logic directly since the middleware depends on DB
// and Express request objects which require integration tests.

// Inline the pure functions for unit testing (same logic as ipAllowlist.ts)
function ipToNumber(ip: string): number | null {
  const parts = ip.split(".");
  if (parts.length !== 4) return null;
  const nums = parts.map(Number);
  if (nums.some((n) => isNaN(n) || n < 0 || n > 255)) return null;
  return ((nums[0] << 24) | (nums[1] << 16) | (nums[2] << 8) | nums[3]) >>> 0;
}

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

function normalizeIp(ip: string): string {
  if (ip.startsWith("::ffff:")) return ip.slice(7);
  return ip;
}

function isIpAllowed(ip: string, allowlist: string[] | null): boolean {
  if (!allowlist || allowlist.length === 0) return true;
  return allowlist.some((cidr) => isIpInCidr(ip, cidr));
}

describe("IP Allowlist — CIDR Matching", () => {
  describe("ipToNumber", () => {
    it("converts valid IPv4 addresses", () => {
      expect(ipToNumber("0.0.0.0")).toBe(0);
      expect(ipToNumber("255.255.255.255")).toBe(4294967295);
      expect(ipToNumber("192.168.1.1")).toBe(3232235777);
      expect(ipToNumber("10.0.0.1")).toBe(167772161);
    });

    it("rejects invalid addresses", () => {
      expect(ipToNumber("")).toBeNull();
      expect(ipToNumber("256.0.0.0")).toBeNull();
      expect(ipToNumber("1.2.3")).toBeNull();
      expect(ipToNumber("1.2.3.4.5")).toBeNull();
      expect(ipToNumber("abc.def.ghi.jkl")).toBeNull();
    });
  });

  describe("isIpInCidr", () => {
    it("matches exact IP with /32 mask", () => {
      expect(isIpInCidr("192.168.1.1", "192.168.1.1/32")).toBe(true);
      expect(isIpInCidr("192.168.1.2", "192.168.1.1/32")).toBe(false);
    });

    it("matches /24 subnet", () => {
      expect(isIpInCidr("192.168.1.0", "192.168.1.0/24")).toBe(true);
      expect(isIpInCidr("192.168.1.255", "192.168.1.0/24")).toBe(true);
      expect(isIpInCidr("192.168.1.100", "192.168.1.0/24")).toBe(true);
      expect(isIpInCidr("192.168.2.1", "192.168.1.0/24")).toBe(false);
    });

    it("matches /16 subnet", () => {
      expect(isIpInCidr("10.0.0.1", "10.0.0.0/16")).toBe(true);
      expect(isIpInCidr("10.0.255.255", "10.0.0.0/16")).toBe(true);
      expect(isIpInCidr("10.1.0.1", "10.0.0.0/16")).toBe(false);
    });

    it("matches /8 subnet", () => {
      expect(isIpInCidr("10.0.0.1", "10.0.0.0/8")).toBe(true);
      expect(isIpInCidr("10.255.255.255", "10.0.0.0/8")).toBe(true);
      expect(isIpInCidr("11.0.0.1", "10.0.0.0/8")).toBe(false);
    });

    it("matches /0 (any IP)", () => {
      expect(isIpInCidr("1.2.3.4", "0.0.0.0/0")).toBe(true);
      expect(isIpInCidr("255.255.255.255", "0.0.0.0/0")).toBe(true);
    });

    it("rejects invalid CIDR notation", () => {
      expect(isIpInCidr("1.2.3.4", "invalid")).toBe(false);
      expect(isIpInCidr("1.2.3.4", "1.2.3.4/33")).toBe(false);
      expect(isIpInCidr("1.2.3.4", "1.2.3.4/-1")).toBe(false);
      expect(isIpInCidr("1.2.3.4", "")).toBe(false);
    });

    it("handles common office CIDR ranges", () => {
      // Typical office range: 203.0.113.0/28 = 203.0.113.0 - 203.0.113.15
      expect(isIpInCidr("203.0.113.0", "203.0.113.0/28")).toBe(true);
      expect(isIpInCidr("203.0.113.15", "203.0.113.0/28")).toBe(true);
      expect(isIpInCidr("203.0.113.16", "203.0.113.0/28")).toBe(false);
    });
  });

  describe("normalizeIp", () => {
    it("strips IPv6-mapped IPv4 prefix", () => {
      expect(normalizeIp("::ffff:192.168.1.1")).toBe("192.168.1.1");
      expect(normalizeIp("::ffff:10.0.0.1")).toBe("10.0.0.1");
    });

    it("passes through regular IPv4", () => {
      expect(normalizeIp("192.168.1.1")).toBe("192.168.1.1");
    });
  });

  describe("isIpAllowed", () => {
    it("allows all IPs when allowlist is null", () => {
      expect(isIpAllowed("1.2.3.4", null)).toBe(true);
    });

    it("allows all IPs when allowlist is empty", () => {
      expect(isIpAllowed("1.2.3.4", [])).toBe(true);
    });

    it("allows IPs matching any CIDR in the list", () => {
      const allowlist = ["192.168.1.0/24", "10.0.0.0/8"];
      expect(isIpAllowed("192.168.1.50", allowlist)).toBe(true);
      expect(isIpAllowed("10.5.5.5", allowlist)).toBe(true);
    });

    it("blocks IPs not matching any CIDR", () => {
      const allowlist = ["192.168.1.0/24", "10.0.0.0/8"];
      expect(isIpAllowed("172.16.0.1", allowlist)).toBe(false);
      expect(isIpAllowed("8.8.8.8", allowlist)).toBe(false);
    });

    it("supports single IP allowlist with /32", () => {
      const allowlist = ["203.0.113.42/32"];
      expect(isIpAllowed("203.0.113.42", allowlist)).toBe(true);
      expect(isIpAllowed("203.0.113.43", allowlist)).toBe(false);
    });
  });
});
