import { describe, it, expect } from "vitest";

/**
 * Tests for Airtable Automation modules:
 * - Airtable client (shared API logic)
 * - Automation router procedures (type/schema checks)
 * - Scheduled automation endpoints (route existence)
 */

// ─── Airtable Client Module Tests ───────────────────────────────
describe("Airtable Client Module", () => {
  it("should export all table IDs", async () => {
    const { TABLES } = await import("./airtable/client");
    expect(TABLES.INVESTOR_POOL).toBe("tbllyxUFfrleMGtYl");
    expect(TABLES.INTERACTIONS).toBe("tblwBqRHKzAOdMOqW");
    expect(TABLES.PIPELINE_TASKS).toBe("tbl1iRqQi7SLnXOp2");
    expect(TABLES.MEETINGS).toBe("tbllC8l3lt2wozFxg");
    expect(TABLES.FUNDRAISE_TRACKER).toBe("tbluIAwIAdNbTkohj");
    expect(TABLES.AUROVIA_DOCUMENTS).toBe("tblKL0Cuh6wrI6nrd");
    expect(TABLES.AUROVIA_MEMBERS).toBe("tbl02QkWLX6wsOFib");
    expect(TABLES.SIGNED_DOCUMENTS).toBe("tblSZv3mt85OMCbcw");
    expect(TABLES.EMAIL_TEMPLATES).toBe("tblxrX7stX61q02uz");
  });

  it("should export all CRUD functions", async () => {
    const client = await import("./airtable/client");
    expect(typeof client.listRecords).toBe("function");
    expect(typeof client.getAllRecords).toBe("function");
    expect(typeof client.getRecord).toBe("function");
    expect(typeof client.createRecords).toBe("function");
    expect(typeof client.updateRecords).toBe("function");
    expect(typeof client.deleteRecords).toBe("function");
  });

  it("should export domain helper functions", async () => {
    const client = await import("./airtable/client");
    expect(typeof client.getInvestorsByStage).toBe("function");
    expect(typeof client.getStaleInvestors).toBe("function");
    expect(typeof client.getInvestorsWithoutEmail).toBe("function");
    expect(typeof client.getPipelineSummary).toBe("function");
    expect(typeof client.logInteraction).toBe("function");
    expect(typeof client.createPipelineTask).toBe("function");
  });

  it("should fetch pipeline summary from live Airtable", async () => {
    const { getPipelineSummary } = await import("./airtable/client");
    const summary = await getPipelineSummary();
    expect(typeof summary).toBe("object");
    // Should have at least some stages
    const totalInvestors = Object.values(summary).reduce((a, b) => a + b, 0);
    expect(totalInvestors).toBeGreaterThan(0);
  });

  it("should list investors from Airtable", async () => {
    const { listRecords, TABLES } = await import("./airtable/client");
    const result = await listRecords(TABLES.INVESTOR_POOL, { maxRecords: 3 });
    expect(result.records).toBeDefined();
    expect(Array.isArray(result.records)).toBe(true);
    expect(result.records.length).toBeGreaterThan(0);
    expect(result.records[0].id).toBeDefined();
    expect(result.records[0].fields).toBeDefined();
  });

  it("should get investors without email", async () => {
    const { getInvestorsWithoutEmail } = await import("./airtable/client");
    const investors = await getInvestorsWithoutEmail();
    expect(Array.isArray(investors)).toBe(true);
    // All returned records should have no email
    for (const inv of investors.slice(0, 5)) {
      expect(inv.fields["Contact Email"]).toBeFalsy();
    }
  });
});

// ─── Automation Router Tests ────────────────────────────────────
describe("Airtable Automation Router", () => {
  it("should export the airtableAutomationRouter", async () => {
    const { airtableAutomationRouter } = await import("./routers/airtableAutomation");
    expect(airtableAutomationRouter).toBeDefined();
  });

  it("should have logMeeting procedure", async () => {
    const { airtableAutomationRouter } = await import("./routers/airtableAutomation");
    const procedures = Object.keys((airtableAutomationRouter as any)._def.procedures);
    expect(procedures).toContain("logMeeting");
  });

  it("should have changeInvestorStage procedure", async () => {
    const { airtableAutomationRouter } = await import("./routers/airtableAutomation");
    const procedures = Object.keys((airtableAutomationRouter as any)._def.procedures);
    expect(procedures).toContain("changeInvestorStage");
  });

  it("should have updateDocument procedure", async () => {
    const { airtableAutomationRouter } = await import("./routers/airtableAutomation");
    const procedures = Object.keys((airtableAutomationRouter as any)._def.procedures);
    expect(procedures).toContain("updateDocument");
  });

  it("should have getPipelineSummary procedure", async () => {
    const { airtableAutomationRouter } = await import("./routers/airtableAutomation");
    const procedures = Object.keys((airtableAutomationRouter as any)._def.procedures);
    expect(procedures).toContain("getPipelineSummary");
  });
});

// ─── Scheduled Automation Route Tests ───────────────────────────
describe("Scheduled Automation Routes", () => {
  it("should export the scheduledAutomationRouter", async () => {
    const { scheduledAutomationRouter } = await import("./routes/scheduledAutomation");
    expect(scheduledAutomationRouter).toBeDefined();
  });

  it("should have pipeline-report, stale-leads, and email-finder routes", async () => {
    const { scheduledAutomationRouter } = await import("./routes/scheduledAutomation");
    // Express router stores routes in the stack
    const routes = (scheduledAutomationRouter as any).stack
      ?.filter((layer: any) => layer.route)
      ?.map((layer: any) => ({
        path: layer.route.path,
        methods: Object.keys(layer.route.methods),
      }));

    expect(routes).toBeDefined();
    const paths = routes.map((r: any) => r.path);
    expect(paths).toContain("/api/scheduled/pipeline-report");
    expect(paths).toContain("/api/scheduled/stale-leads");
    expect(paths).toContain("/api/scheduled/email-finder");

    // All should be POST
    for (const route of routes) {
      expect(route.methods).toContain("post");
    }
  });
});

// ─── Integration: Router is registered in appRouter ─────────────
describe("Router Registration", () => {
  it("should have airtableAutomation in the appRouter", async () => {
    const { appRouter } = await import("./routers");
    const procedures = Object.keys((appRouter as any)._def.procedures);
    // Check for namespaced procedures
    const airtableProcs = procedures.filter((p) => p.startsWith("airtableAutomation."));
    expect(airtableProcs.length).toBeGreaterThanOrEqual(4);
    expect(airtableProcs).toContain("airtableAutomation.logMeeting");
    expect(airtableProcs).toContain("airtableAutomation.changeInvestorStage");
    expect(airtableProcs).toContain("airtableAutomation.updateDocument");
    expect(airtableProcs).toContain("airtableAutomation.getPipelineSummary");
  });
});
