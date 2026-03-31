import { describe, expect, it } from "vitest";

const BASE_URL = "http://localhost:3000";

describe("Security Headers — Fix 2", () => {
  it("API responses include X-Content-Type-Options: nosniff", async () => {
    const res = await fetch(`${BASE_URL}/api/trpc/auth.me`, {
      method: "GET",
    });
    expect(res.headers.get("x-content-type-options")).toBe("nosniff");
  });

  it("API responses include X-Frame-Options: DENY", async () => {
    const res = await fetch(`${BASE_URL}/api/trpc/auth.me`, {
      method: "GET",
    });
    expect(res.headers.get("x-frame-options")).toBe("DENY");
  });

  it("API responses include X-XSS-Protection", async () => {
    const res = await fetch(`${BASE_URL}/api/trpc/auth.me`, {
      method: "GET",
    });
    expect(res.headers.get("x-xss-protection")).toBe("1; mode=block");
  });

  it("API responses include Referrer-Policy", async () => {
    const res = await fetch(`${BASE_URL}/api/trpc/auth.me`, {
      method: "GET",
    });
    expect(res.headers.get("referrer-policy")).toBe("strict-origin-when-cross-origin");
  });

  it("API responses include Strict-Transport-Security", async () => {
    const res = await fetch(`${BASE_URL}/api/trpc/auth.me`, {
      method: "GET",
    });
    const hsts = res.headers.get("strict-transport-security");
    expect(hsts).toBeTruthy();
    expect(hsts).toContain("max-age=");
  });

  it("API responses do NOT include X-Powered-By", async () => {
    const res = await fetch(`${BASE_URL}/api/trpc/auth.me`, {
      method: "GET",
    });
    expect(res.headers.get("x-powered-by")).toBeNull();
  });

  it("API responses include Content-Security-Policy", async () => {
    const res = await fetch(`${BASE_URL}/api/trpc/auth.me`, {
      method: "GET",
    });
    const csp = res.headers.get("content-security-policy");
    expect(csp).toBeTruthy();
    expect(csp).toContain("default-src");
  });
});
