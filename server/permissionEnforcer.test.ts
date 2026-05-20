import { describe, it, expect } from "vitest";
import { checkPermission, enforcePermission, enforceTaskUpdateScope, enforceDecisionAuthority } from "./security/permissionEnforcer";

describe("Permission Enforcer", () => {
  describe("checkPermission", () => {
    it("viewer can read ventures", () => {
      expect(checkPermission({ role: "viewer" }, "ventures", "read")).toBe(true);
    });
    it("viewer cannot create ventures", () => {
      expect(checkPermission({ role: "viewer" }, "ventures", "create")).toBe(false);
    });
    it("viewer cannot update tasks", () => {
      expect(checkPermission({ role: "viewer" }, "tasks", "update")).toBe(false);
    });
    it("client can update tasks (mark complete)", () => {
      expect(checkPermission({ role: "client" }, "tasks", "update")).toBe(true);
    });
    it("client cannot create tasks", () => {
      expect(checkPermission({ role: "client" }, "tasks", "create")).toBe(false);
    });
    it("client can approve decisions (dismiss drafts)", () => {
      expect(checkPermission({ role: "client" }, "decisions", "approve")).toBe(true);
    });
    it("user can create tasks", () => {
      expect(checkPermission({ role: "user" }, "tasks", "create")).toBe(true);
    });
    it("user cannot delete tasks", () => {
      expect(checkPermission({ role: "user" }, "tasks", "delete")).toBe(false);
    });
    it("user cannot create ventures", () => {
      expect(checkPermission({ role: "user" }, "ventures", "create")).toBe(false);
    });
    it("partner can export audit", () => {
      expect(checkPermission({ role: "partner" }, "audit", "export")).toBe(true);
    });
    it("manager can create ventures", () => {
      expect(checkPermission({ role: "manager" }, "ventures", "create")).toBe(true);
    });
    it("manager cannot delete ventures", () => {
      expect(checkPermission({ role: "manager" }, "ventures", "delete")).toBe(false);
    });
    it("admin can do everything", () => {
      expect(checkPermission({ role: "admin" }, "ventures", "delete")).toBe(true);
      expect(checkPermission({ role: "admin" }, "distributions", "approve")).toBe(true);
      expect(checkPermission({ role: "admin" }, "agents", "create")).toBe(true);
    });
    it("owner has same permissions as admin", () => {
      expect(checkPermission({ role: "owner" }, "ventures", "delete")).toBe(true);
      expect(checkPermission({ role: "owner" }, "settings", "update")).toBe(true);
    });
    it("unknown role has no permissions", () => {
      expect(checkPermission({ role: "hacker" }, "ventures", "read")).toBe(false);
    });
    it("null user has no permissions", () => {
      expect(checkPermission(null, "ventures", "read")).toBe(false);
    });
  });

  describe("enforcePermission", () => {
    it("throws FORBIDDEN for denied operations", () => {
      expect(() => enforcePermission({ role: "viewer" }, "tasks", "create")).toThrow("Permission denied");
    });
    it("does not throw for allowed operations", () => {
      expect(() => enforcePermission({ role: "admin" }, "tasks", "create")).not.toThrow();
    });
  });

  describe("enforceTaskUpdateScope", () => {
    it("throws for viewer", () => {
      expect(() => enforceTaskUpdateScope({ role: "viewer" }, { status: "complete" })).toThrow("Viewers cannot modify tasks");
    });
    it("allows client to mark complete", () => {
      expect(() => enforceTaskUpdateScope({ role: "client" }, { id: 1, status: "complete" })).not.toThrow();
    });
    it("blocks client from changing assignees", () => {
      expect(() => enforceTaskUpdateScope({ role: "client" }, { id: 1, assigneeNames: ["Bob"] })).toThrow("Clients can only mark tasks complete");
    });
    it("blocks client from changing status to non-complete", () => {
      expect(() => enforceTaskUpdateScope({ role: "client" }, { id: 1, status: "open" })).toThrow("Clients can only mark tasks as complete");
    });
    it("allows manager to change anything", () => {
      expect(() => enforceTaskUpdateScope({ role: "manager" }, { id: 1, assigneeNames: ["Bob"], status: "open" })).not.toThrow();
    });
  });

  describe("enforceDecisionAuthority", () => {
    it("allows admin to approve decisions", () => {
      expect(() => enforceDecisionAuthority({ role: "admin" })).not.toThrow();
    });
    it("allows client to approve decisions (dismiss drafts)", () => {
      expect(() => enforceDecisionAuthority({ role: "client" })).not.toThrow();
    });
    it("blocks viewer from approving decisions", () => {
      expect(() => enforceDecisionAuthority({ role: "viewer" })).toThrow("Permission denied");
    });
    it("blocks user from approving decisions", () => {
      expect(() => enforceDecisionAuthority({ role: "user" })).toThrow("Permission denied");
    });
  });
});
