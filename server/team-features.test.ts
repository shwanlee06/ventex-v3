import { describe, it, expect } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import { calculateLiveStatus } from "./routers/team";
import { hasPermission, isAtlasTeam, ROLE_HIERARCHY } from "./security/rbac";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createContext(role: string, orgId: number | null = null): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: `${role}-user`,
    email: `${role}@atlas.io`,
    name: `${role} User`,
    loginMethod: "manus",
    role,
    organizationId: orgId,
    status: "active",
    invitationId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
      cookie: () => {},
    } as unknown as TrpcContext["res"],
  };
}

function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {}, cookie: () => {} } as unknown as TrpcContext["res"],
  };
}

const adminCaller = appRouter.createCaller(createContext("admin"));
const partnerCaller = appRouter.createCaller(createContext("partner"));
const userCaller = appRouter.createCaller(createContext("user"));
const publicCaller = appRouter.createCaller(createPublicContext());

// ── Sort Order Tests ──────────────────────────────────────────────────
describe("Team — Custom Sort Order", () => {
  it("listInternal returns members sorted by sortOrder ascending", async () => {
    const members = await adminCaller.team.listInternal();
    expect(members.length).toBeGreaterThan(0);
    // Verify sortOrder is ascending (or null defaults to 100)
    for (let i = 1; i < members.length; i++) {
      const prev = members[i - 1].sortOrder ?? 100;
      const curr = members[i].sortOrder ?? 100;
      // Allow equal sortOrder (then sorted by name)
      expect(prev).toBeLessThanOrEqual(curr);
    }
  });

  it("reorder updates sortOrder for multiple members", async () => {
    const members = await adminCaller.team.listInternal();
    if (members.length < 2) return;

    // Reverse the order
    const items = members.map((m, i) => ({
      id: m.id,
      sortOrder: (members.length - i) * 10,
    }));

    const result = await adminCaller.team.reorder({ items });
    expect(result.success).toBe(true);

    // Verify the order changed
    const after = await adminCaller.team.listInternal();
    // The last member should now be first (or close to it)
    expect(after[0].id).toBe(members[members.length - 1].id);

    // Restore original order
    const restore = members.map((m, i) => ({
      id: m.id,
      sortOrder: (i + 1) * 10,
    }));
    await adminCaller.team.reorder({ items: restore });
  });

  it("reorder requires admin role", async () => {
    await expect(
      publicCaller.team.reorder({ items: [{ id: 1, sortOrder: 1 }] })
    ).rejects.toThrow();
  });

  it("update can set sortOrder for a single member", async () => {
    const members = await adminCaller.team.listInternal();
    if (members.length === 0) return;
    const member = members[0];
    const result = await adminCaller.team.update({
      id: member.id,
      sortOrder: 999,
    });
    expect(result.success).toBe(true);

    // Restore
    await adminCaller.team.update({
      id: member.id,
      sortOrder: member.sortOrder ?? 1,
    });
  });
});

// ── Avatar Upload Tests ───────────────────────────────────────────────
describe("Team — Avatar Upload", () => {
  it("uploadAvatar requires admin role", async () => {
    await expect(
      publicCaller.team.uploadAvatar({
        memberId: 1,
        base64: "iVBORw0KGgoAAAANSUhEUg==",
        mimeType: "image/png",
        filename: "test.png",
      })
    ).rejects.toThrow();
  });

  it("update can set avatarUrl directly", async () => {
    const members = await adminCaller.team.listInternal();
    if (members.length === 0) return;
    const member = members[0];
    const result = await adminCaller.team.update({
      id: member.id,
      avatarUrl: "https://example.com/test-avatar.png",
    });
    expect(result.success).toBe(true);

    // Verify
    const updated = await adminCaller.team.getById({ id: member.id });
    expect(updated?.avatarUrl).toBe("https://example.com/test-avatar.png");

    // Restore
    await adminCaller.team.update({
      id: member.id,
      avatarUrl: member.avatarUrl || null,
    });
  });

  it("update can clear avatarUrl by setting null", async () => {
    const members = await adminCaller.team.listInternal();
    if (members.length === 0) return;
    const member = members[0];

    // Set then clear
    await adminCaller.team.update({
      id: member.id,
      avatarUrl: "https://example.com/temp.png",
    });
    const result = await adminCaller.team.update({
      id: member.id,
      avatarUrl: null,
    });
    expect(result.success).toBe(true);

    const updated = await adminCaller.team.getById({ id: member.id });
    expect(updated?.avatarUrl).toBeNull();
  });
});

// ── Partner Role Tests ────────────────────────────────────────────────
describe("Team — Partner Role-Based Access", () => {
  it("partner role exists in ROLE_HIERARCHY", () => {
    expect(ROLE_HIERARCHY).toHaveProperty("partner");
    expect(ROLE_HIERARCHY.partner).toBe(35);
  });

  it("partner is between user and manager in hierarchy", () => {
    expect(ROLE_HIERARCHY.partner).toBeGreaterThan(ROLE_HIERARCHY.user);
    expect(ROLE_HIERARCHY.partner).toBeLessThan(ROLE_HIERARCHY.manager);
  });

  it("partner is considered ATLAS team", () => {
    expect(isAtlasTeam({ role: "partner" })).toBe(true);
  });

  it("partner has read permission", () => {
    expect(hasPermission("partner", "read")).toBe(true);
  });

  it("partner has export_data permission", () => {
    expect(hasPermission("partner", "export_data")).toBe(true);
  });

  it("partner has view_audit_log permission", () => {
    expect(hasPermission("partner", "view_audit_log")).toBe(true);
  });

  it("partner does NOT have manage_team permission", () => {
    expect(hasPermission("partner", "manage_team")).toBe(false);
  });

  it("partner does NOT have delete permission", () => {
    expect(hasPermission("partner", "delete")).toBe(false);
  });

  it("partner does NOT have manage_roles permission", () => {
    expect(hasPermission("partner", "manage_roles")).toBe(false);
  });

  it("partner can access read-only endpoints (listInternal)", async () => {
    // Partners should be able to read team data
    const members = await partnerCaller.team.listInternal();
    expect(Array.isArray(members)).toBe(true);
  });

  it("partner cannot access admin-only endpoints (reorder)", async () => {
    await expect(
      partnerCaller.team.reorder({ items: [{ id: 1, sortOrder: 1 }] })
    ).rejects.toThrow();
  });

  it("partner cannot access admin-only endpoints (create)", async () => {
    await expect(
      partnerCaller.team.create({ name: "Test", type: "Internal" })
    ).rejects.toThrow();
  });

  it("partner cannot access admin-only endpoints (delete)", async () => {
    await expect(
      partnerCaller.team.delete({ id: 999999 })
    ).rejects.toThrow();
  });

  it("regular user cannot access partner-level features", () => {
    expect(isAtlasTeam({ role: "user" })).toBe(false);
    expect(hasPermission("user", "export_data")).toBe(false);
    expect(hasPermission("user", "view_audit_log")).toBe(false);
  });
});
