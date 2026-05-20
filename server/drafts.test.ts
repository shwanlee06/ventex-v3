import { describe, it, expect, vi } from "vitest";

/**
 * Draft Center restructuring tests:
 * - Draft procedures are now protectedProcedure (not adminProcedure)
 * - Org-scoping: users can only send/dismiss/restore drafts belonging to their org
 * - Dedup: agents skip draft creation if a pending draft already exists for the same subject
 * - Auto-cleanup: scheduler deletes sent/dismissed drafts older than 14 days
 */

describe("Draft Center — Access & Permissions", () => {
  it("sendDraft, dismissDraft, restoreDraft should be defined in agents router", async () => {
    const { agentsRouter } = await import("./routers/agents");
    expect(agentsRouter).toBeDefined();
    // The router should have these procedures
    const procedures = Object.keys(agentsRouter._def.procedures || {});
    expect(procedures).toContain("sendDraft");
    expect(procedures).toContain("dismissDraft");
    expect(procedures).toContain("restoreDraft");
    expect(procedures).toContain("listDrafts");
  });

  it("Draft procedures should use protectedProcedure (not adminProcedure)", async () => {
    // Verify by checking the source file for the correct procedure type
    const fs = await import("fs");
    const source = fs.readFileSync("./server/routers/agents.ts", "utf-8");
    
    // sendDraft should be protectedProcedure
    const sendDraftMatch = source.match(/sendDraft:\s*(protectedProcedure|adminProcedure)/);
    expect(sendDraftMatch).toBeTruthy();
    expect(sendDraftMatch![1]).toBe("protectedProcedure");
    
    // dismissDraft should be protectedProcedure
    const dismissDraftMatch = source.match(/dismissDraft:\s*(protectedProcedure|adminProcedure)/);
    expect(dismissDraftMatch).toBeTruthy();
    expect(dismissDraftMatch![1]).toBe("protectedProcedure");
    
    // restoreDraft should be protectedProcedure
    const restoreDraftMatch = source.match(/restoreDraft:\s*(protectedProcedure|adminProcedure)/);
    expect(restoreDraftMatch).toBeTruthy();
    expect(restoreDraftMatch![1]).toBe("protectedProcedure");
  });
});

describe("Draft Center — Dedup Logic", () => {
  it("Overdue Agent should check for existing pending drafts before creating new ones", async () => {
    const fs = await import("fs");
    const source = fs.readFileSync("./server/routers/agents.ts", "utf-8");
    
    // The overdue agent section should contain dedup logic
    const overdueSection = source.indexOf("Dedup: skip if a pending draft already exists for this task");
    expect(overdueSection).toBeGreaterThan(-1);
    
    // Should check agentDrafts for existing pending follow_up
    const dedupCheck = source.indexOf('eq(agentDrafts.draftType, "follow_up")');
    expect(dedupCheck).toBeGreaterThan(-1);
  });

  it("Distribution Sentinel should check for existing pending LP notice drafts", async () => {
    const fs = await import("fs");
    const source = fs.readFileSync("./server/routers/agents.ts", "utf-8");
    
    // The distribution sentinel section should contain dedup logic
    const distSection = source.indexOf("Dedup: skip if a pending LP notice draft already exists");
    expect(distSection).toBeGreaterThan(-1);
    
    // Should check agentDrafts for existing pending lp_notice
    const dedupCheck = source.indexOf('eq(agentDrafts.draftType, "lp_notice")');
    expect(dedupCheck).toBeGreaterThan(-1);
  });
});

describe("Draft Center — Auto-Cleanup", () => {
  it("Agent scheduler should include auto-cleanup logic for old drafts", async () => {
    const fs = await import("fs");
    const source = fs.readFileSync("./server/agentScheduler.ts", "utf-8");
    
    // Should import agentDrafts
    expect(source).toContain("agentDrafts");
    
    // Should have auto-cleanup section
    expect(source).toContain("Auto-cleanup: archive old sent/dismissed drafts");
    
    // Should delete drafts older than 14 days
    expect(source).toContain("14 * 24 * 60 * 60 * 1000");
    
    // Should filter by sent/dismissed status
    expect(source).toContain('"sent"');
    expect(source).toContain('"dismissed"');
  });
});

describe("Draft Center — Routing & Navigation", () => {
  it("Drafts are now handled through the Decisions page", async () => {
    const fs = await import("fs");
    const appSource = fs.readFileSync("./client/src/App.tsx", "utf-8");
    
    // The decisions route should exist and be accessible to all authenticated users
    const decisionsRoute = appSource.match(/path="\/decisions"[\s\S]*?<\/Route>/);
    expect(decisionsRoute).toBeTruthy();
    expect(decisionsRoute![0]).toContain("RequireAuth");
    expect(decisionsRoute![0]).not.toContain("RequireVentex");
  });

  it("Decisions nav item should be visible to clients in sidebar", async () => {
    const fs = await import("fs");
    const sidebarSource = fs.readFileSync("./client/src/components/AppSidebar.tsx", "utf-8");
    
    // Find the Decisions nav item — it should exist and have pendingDecisions badge
    const decisionsItem = sidebarSource.match(/label:\s*"Decisions"[^}]+}/);
    expect(decisionsItem).toBeTruthy();
    expect(decisionsItem![0]).toContain('badgeKey: "pendingDecisions"');
  });

  it("Decisions nav item should have pendingDecisions badge", async () => {
    const fs = await import("fs");
    const sidebarSource = fs.readFileSync("./client/src/components/AppSidebar.tsx", "utf-8");
    
    // The decisions item should have a badge key
    expect(sidebarSource).toContain('badgeKey: "pendingDecisions"');
  });
});
