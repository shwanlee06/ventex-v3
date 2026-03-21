import { describe, it, expect, vi } from "vitest";

// Test the intelligence and document processing router shapes
// These tests verify the router structure and procedure availability

describe("Document Intelligence Router", () => {
  it("should export documentIntelligenceRouter with expected procedures", async () => {
    const mod = await import("./routers/documentIntelligence");
    expect(mod.documentIntelligenceRouter).toBeDefined();
    
    const router = mod.documentIntelligenceRouter;
    expect(router._def.procedures).toBeDefined();
  });

  it("should have processFile procedure", async () => {
    const mod = await import("./routers/documentIntelligence");
    const procedures = mod.documentIntelligenceRouter._def.procedures;
    expect(procedures.processFile).toBeDefined();
  });

  it("should have getByVenture procedure", async () => {
    const mod = await import("./routers/documentIntelligence");
    const procedures = mod.documentIntelligenceRouter._def.procedures;
    expect(procedures.getByVenture).toBeDefined();
  });

  it("should have getBySpv procedure", async () => {
    const mod = await import("./routers/documentIntelligence");
    const procedures = mod.documentIntelligenceRouter._def.procedures;
    expect(procedures.getBySpv).toBeDefined();
  });

  it("should have recentFeed procedure", async () => {
    const mod = await import("./routers/documentIntelligence");
    const procedures = mod.documentIntelligenceRouter._def.procedures;
    expect(procedures.recentFeed).toBeDefined();
  });

  it("should have getVentureRisks procedure", async () => {
    const mod = await import("./routers/documentIntelligence");
    const procedures = mod.documentIntelligenceRouter._def.procedures;
    expect(procedures.getVentureRisks).toBeDefined();
  });

  it("should have getMeetingBriefs procedure", async () => {
    const mod = await import("./routers/documentIntelligence");
    const procedures = mod.documentIntelligenceRouter._def.procedures;
    expect(procedures.getMeetingBriefs).toBeDefined();
  });

  it("should have searchDocuments procedure", async () => {
    const mod = await import("./routers/documentIntelligence");
    const procedures = mod.documentIntelligenceRouter._def.procedures;
    expect(procedures.searchDocuments).toBeDefined();
  });
});

describe("Intelligence Router", () => {
  it("should export intelligenceRouter with expected procedures", async () => {
    const mod = await import("./routers/intelligence");
    expect(mod.intelligenceRouter).toBeDefined();
    
    const router = mod.intelligenceRouter;
    expect(router._def.procedures).toBeDefined();
  });

  it("should have generateDailyBrief procedure", async () => {
    const mod = await import("./routers/intelligence");
    const procedures = mod.intelligenceRouter._def.procedures;
    expect(procedures.generateDailyBrief).toBeDefined();
  });

  it("should have getDailyBrief procedure", async () => {
    const mod = await import("./routers/intelligence");
    const procedures = mod.intelligenceRouter._def.procedures;
    expect(procedures.getDailyBrief).toBeDefined();
  });

  it("should have getVentureHealth procedure", async () => {
    const mod = await import("./routers/intelligence");
    const procedures = mod.intelligenceRouter._def.procedures;
    expect(procedures.getVentureHealth).toBeDefined();
  });

  it("should have getSmartAlerts procedure", async () => {
    const mod = await import("./routers/intelligence");
    const procedures = mod.intelligenceRouter._def.procedures;
    expect(procedures.getSmartAlerts).toBeDefined();
  });

  it("should have getObservations procedure", async () => {
    const mod = await import("./routers/intelligence");
    const procedures = mod.intelligenceRouter._def.procedures;
    expect(procedures.getObservations).toBeDefined();
  });

  it("should have acceptObservation procedure", async () => {
    const mod = await import("./routers/intelligence");
    const procedures = mod.intelligenceRouter._def.procedures;
    expect(procedures.acceptObservation).toBeDefined();
  });

  it("should have dismissObservation procedure", async () => {
    const mod = await import("./routers/intelligence");
    const procedures = mod.intelligenceRouter._def.procedures;
    expect(procedures.dismissObservation).toBeDefined();
  });
});

describe("AI Chat Router (document-aware)", () => {
  it("should export aiRouter with chat procedure", async () => {
    const mod = await import("./routers/ai");
    expect(mod.aiRouter).toBeDefined();
    const procedures = mod.aiRouter._def.procedures;
    expect(procedures.chat).toBeDefined();
  });
});
