/**
 * Tests for FINAL BACKEND WIRING — verifying all 6 spec items are wired.
 * Uses HTTP requests to confirm procedures are registered and reachable.
 * Non-404/405 status codes (400, 401, 403) confirm the procedure exists.
 */
import { describe, it, expect } from "vitest";

const BASE = "http://localhost:3000/api/trpc";

async function callMutation(name: string, body: any): Promise<number> {
  const res = await fetch(`${BASE}/${name}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ "0": { json: body } }),
  });
  return res.status;
}

async function callQuery(name: string, input: any): Promise<number> {
  const encoded = encodeURIComponent(JSON.stringify({ "0": { json: input } }));
  const res = await fetch(`${BASE}/${name}?input=${encoded}`);
  return res.status;
}

describe("Final Backend Wiring — All 6 Spec Items", () => {
  // #1 auth.acceptInvite (mutation) — was 404, should now be reachable
  it("#1 auth.acceptInvite returns non-404 status", async () => {
    const status = await callMutation("auth.acceptInvite", { token: "test-token-123" });
    expect(status).not.toBe(404);
    expect(status).not.toBe(405);
  });

  // #2 auth.forgotPassword (mutation) — was 404, should now be reachable
  it("#2 auth.forgotPassword returns non-404 status", async () => {
    const status = await callMutation("auth.forgotPassword", { email: "test@example.com" });
    expect(status).not.toBe(404);
    expect(status).not.toBe(405);
  });

  // #2b auth.resetPassword (mutation) — companion to forgotPassword
  it("#2b auth.resetPassword returns non-404 status", async () => {
    const status = await callMutation("auth.resetPassword", { token: "test-token", newPassword: "Test1234!" });
    expect(status).not.toBe(404);
    expect(status).not.toBe(405);
  });

  // #3 organizations.onboardingComplete (mutation) — was 404, should now be reachable
  it("#3 organizations.onboardingComplete returns non-404 status", async () => {
    const status = await callMutation("organizations.onboardingComplete", {
      organizationName: "Test Org",
      ventures: [],
      invitations: [],
      agentConfig: {},
    });
    expect(status).not.toBe(404);
    expect(status).not.toBe(405);
  });

  // #4a blueprints.list (query) — was 404, should now be reachable
  it("#4a blueprints.list returns non-404 status", async () => {
    const status = await callQuery("blueprints.list", { organizationId: 1 });
    expect(status).not.toBe(404);
    expect(status).not.toBe(405);
  });

  // #4b blueprints.create (mutation) — was 404, should now be reachable
  it("#4b blueprints.create returns non-404 status", async () => {
    const status = await callMutation("blueprints.create", {
      name: "Test Blueprint",
      sector: "Real Estate",
      organizationId: 1,
    });
    expect(status).not.toBe(404);
    expect(status).not.toBe(405);
  });

  // #4c blueprints.generateFromSector (mutation) — was 404, should now be reachable
  it("#4c blueprints.generateFromSector returns non-404 status", async () => {
    const status = await callMutation("blueprints.generateFromSector", {
      sector: "Real Estate",
      organizationId: 1,
    });
    expect(status).not.toBe(404);
    expect(status).not.toBe(405);
  });

  // #4d blueprints.applyToVentures (mutation) — was 405, should now be reachable
  it("#4d blueprints.applyToVentures returns non-404/405 status", async () => {
    const status = await callMutation("blueprints.applyToVentures", {
      templateId: 1,
      ventureIds: [1],
    });
    expect(status).not.toBe(404);
    expect(status).not.toBe(405);
  });

  // #5 agents.listEvents (query) — was 404, should now be reachable
  it("#5 agents.listEvents returns non-404 status", async () => {
    const status = await callQuery("agents.listEvents", { organizationId: 1 });
    expect(status).not.toBe(404);
    expect(status).not.toBe(405);
  });

  // #6 email.send (mutation) — was 405, should now be POST mutation
  it("#6 email.send returns non-404/405 status", async () => {
    const status = await callMutation("email.send", {
      to: "test@example.com",
      subject: "Test",
      type: "invitation",
      variables: {},
    });
    expect(status).not.toBe(404);
    expect(status).not.toBe(405);
  });
});
