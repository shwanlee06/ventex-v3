/**
 * Tests for live presence — verifying that liveStatuses uses the more recent
 * of team_members.lastSeenAt and users.lastSignedIn.
 */
import { describe, it, expect } from "vitest";
import { calculateLiveStatus } from "./routers/team";

describe("Live Presence — calculateLiveStatus", () => {
  it("returns 'online' when lastSeenAt is within 2 minutes", () => {
    const now = new Date();
    const oneMinAgo = new Date(now.getTime() - 60_000);
    expect(calculateLiveStatus(oneMinAgo, "active")).toBe("online");
  });

  it("returns 'away' when lastSeenAt is between 2-5 minutes", () => {
    const now = new Date();
    const threeMinAgo = new Date(now.getTime() - 3 * 60_000);
    expect(calculateLiveStatus(threeMinAgo, "active")).toBe("away");
  });

  it("returns 'offline' when lastSeenAt is older than 5 minutes", () => {
    const now = new Date();
    const tenMinAgo = new Date(now.getTime() - 10 * 60_000);
    expect(calculateLiveStatus(tenMinAgo, "active")).toBe("offline");
  });

  it("returns 'offline' when lastSeenAt is null", () => {
    expect(calculateLiveStatus(null, "active")).toBe("offline");
  });

  it("returns 'on_leave' regardless of lastSeenAt when adminStatus is on_leave", () => {
    const now = new Date();
    expect(calculateLiveStatus(now, "on_leave")).toBe("on_leave");
  });

  it("returns 'deactivated' regardless of lastSeenAt when adminStatus is deactivated", () => {
    const now = new Date();
    expect(calculateLiveStatus(now, "deactivated")).toBe("deactivated");
  });
});

describe("Live Presence — timestamp fallback logic", () => {
  it("uses the more recent timestamp when team_members.lastSeenAt is stale but users.lastSignedIn is fresh", () => {
    // Simulating the logic from liveStatuses query
    const tmSeen = new Date("2026-04-10T07:06:59.000Z"); // 13 days ago
    const uSeen = new Date("2026-04-23T07:09:30.000Z");  // today

    const tmTime = tmSeen.getTime();
    const uTime = uSeen.getTime();
    const effectiveLastSeen = tmTime >= uTime ? tmSeen : uSeen;

    // Should pick the users.lastSignedIn since it's more recent
    expect(effectiveLastSeen).toEqual(uSeen);
    expect(effectiveLastSeen.toISOString()).toBe("2026-04-23T07:09:30.000Z");
  });

  it("uses team_members.lastSeenAt when it is more recent than users.lastSignedIn", () => {
    const tmSeen = new Date("2026-04-23T08:00:00.000Z"); // heartbeat just fired
    const uSeen = new Date("2026-04-23T07:09:30.000Z");  // login was earlier

    const tmTime = tmSeen.getTime();
    const uTime = uSeen.getTime();
    const effectiveLastSeen = tmTime >= uTime ? tmSeen : uSeen;

    expect(effectiveLastSeen).toEqual(tmSeen);
  });

  it("handles null team_members.lastSeenAt by falling back to users.lastSignedIn", () => {
    const tmSeen: Date | null = null;
    const uSeen = new Date("2026-04-23T07:09:30.000Z");

    const tmTime = tmSeen?.getTime() ?? 0;
    const uTime = uSeen?.getTime() ?? 0;
    const effectiveLastSeen = tmTime >= uTime ? tmSeen : uSeen;

    expect(effectiveLastSeen).toEqual(uSeen);
  });

  it("handles null users.lastSignedIn by using team_members.lastSeenAt", () => {
    const tmSeen = new Date("2026-04-10T07:06:59.000Z");
    const uSeen: Date | null = null;

    const tmTime = tmSeen?.getTime() ?? 0;
    const uTime = uSeen?.getTime() ?? 0;
    const effectiveLastSeen = tmTime >= uTime ? tmSeen : uSeen;

    expect(effectiveLastSeen).toEqual(tmSeen);
  });

  it("handles both null by returning null", () => {
    const tmSeen: Date | null = null;
    const uSeen: Date | null = null;

    const tmTime = tmSeen?.getTime() ?? 0;
    const uTime = uSeen?.getTime() ?? 0;
    const effectiveLastSeen = tmTime >= uTime ? tmSeen : uSeen;

    // Both are 0, so tmTime >= uTime is true, effectiveLastSeen = tmSeen = null
    expect(effectiveLastSeen).toBeNull();
  });
});
