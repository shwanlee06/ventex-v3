import { describe, it, expect } from "vitest";
import { RETENTION_DAYS } from "./dataRetention";

describe("Data Retention Policy", () => {
  it("has correct retention periods", () => {
    expect(RETENTION_DAYS.auditLog).toBe(365);
    expect(RETENTION_DAYS.activityLog).toBe(180);
    expect(RETENTION_DAYS.expiredSessions).toBe(30);
    expect(RETENTION_DAYS.agentEvents).toBe(180);
    expect(RETENTION_DAYS.readNotifications).toBe(90);
  });

  it("audit log retention meets SOC 2 minimum (1 year)", () => {
    expect(RETENTION_DAYS.auditLog).toBeGreaterThanOrEqual(365);
  });

  it("all retention periods are positive numbers", () => {
    for (const [key, value] of Object.entries(RETENTION_DAYS)) {
      expect(value).toBeGreaterThan(0);
      expect(Number.isInteger(value)).toBe(true);
    }
  });

  it("session retention is shorter than audit log retention", () => {
    expect(RETENTION_DAYS.expiredSessions).toBeLessThan(RETENTION_DAYS.auditLog);
  });
});
