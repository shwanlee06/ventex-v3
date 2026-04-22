import { describe, it, expect } from "vitest";

/**
 * Tests for the CSRF origin-matching logic used in server/_core/index.ts
 * The middleware checks that POST/PUT/DELETE requests have an Origin header
 * that matches the Host (or X-Forwarded-Host) header to prevent CSRF attacks.
 *
 * In production behind a reverse proxy (Manus/Cloudflare), the Host header
 * seen by Express may differ from the public domain. The fix uses
 * X-Forwarded-Host and allows known *.manus.space domains.
 */

function isOriginAllowed(
  origin: string | undefined,
  host: string | undefined,
  forwardedHost: string | undefined,
  directHost: string | undefined
): boolean {
  if (!origin || !host) return true; // No origin = same-origin or non-browser
  try {
    const originHost = new URL(origin).host;
    const effectiveHost = forwardedHost || host;
    const isMatch =
      originHost === effectiveHost ||
      originHost === (directHost || "") ||
      (originHost.endsWith(".manus.space") && origin.startsWith("https://"));
    return isMatch;
  } catch {
    return false; // Malformed origin
  }
}

describe("CSRF Origin Check", () => {
  it("allows request when origin matches host directly", () => {
    expect(
      isOriginAllowed(
        "https://ventexdemo.manus.space",
        "ventexdemo.manus.space",
        undefined,
        "ventexdemo.manus.space"
      )
    ).toBe(true);
  });

  it("allows request when origin matches X-Forwarded-Host", () => {
    expect(
      isOriginAllowed(
        "https://ventexdemo.manus.space",
        "internal-proxy:3000",
        "ventexdemo.manus.space",
        "internal-proxy:3000"
      )
    ).toBe(true);
  });

  it("allows request from any *.manus.space HTTPS domain", () => {
    expect(
      isOriginAllowed(
        "https://royaltonai-tykqbqav.manus.space",
        "internal-proxy:3000",
        undefined,
        "internal-proxy:3000"
      )
    ).toBe(true);
  });

  it("rejects request from non-matching origin", () => {
    expect(
      isOriginAllowed(
        "https://evil-site.com",
        "ventexdemo.manus.space",
        "ventexdemo.manus.space",
        "ventexdemo.manus.space"
      )
    ).toBe(false);
  });

  it("rejects HTTP (non-HTTPS) manus.space origin", () => {
    expect(
      isOriginAllowed(
        "http://ventexdemo.manus.space",
        "internal-proxy:3000",
        undefined,
        "internal-proxy:3000"
      )
    ).toBe(false);
  });

  it("allows request when no origin header (same-origin request)", () => {
    expect(
      isOriginAllowed(undefined, "ventexdemo.manus.space", undefined, "ventexdemo.manus.space")
    ).toBe(true);
  });

  it("rejects malformed origin URL", () => {
    expect(
      isOriginAllowed(
        "not-a-url",
        "ventexdemo.manus.space",
        undefined,
        "ventexdemo.manus.space"
      )
    ).toBe(false);
  });

  it("allows when origin matches direct host but not forwarded host", () => {
    expect(
      isOriginAllowed(
        "https://ventexdemo.manus.space",
        "ventexdemo.manus.space",
        "some-other-host.com",
        "ventexdemo.manus.space"
      )
    ).toBe(true);
  });
});
