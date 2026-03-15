import { describe, it, expect, vi, beforeEach } from "vitest";
import express from "express";
import request from "supertest";

// We'll test the airtable sync route handler by importing it and mounting on a test app
describe("Airtable Sync API Routes", () => {
  let app: express.Express;

  beforeEach(async () => {
    app = express();
    app.use(express.json({ limit: "2mb" }));
    // Dynamically import the router
    const { default: airtableSyncRouter } = await import("./routes/airtableSync");
    app.use("/api/airtable", airtableSyncRouter);
  });

  it("POST /api/airtable/sync/ventures returns success or error shape", async () => {
    const res = await request(app)
      .post("/api/airtable/sync/ventures")
      .send({ ventures: [{ name: "Test Venture", theme: "Real Estate", status: "In progress" }] })
      .expect("Content-Type", /json/);

    // The response should have a success field (may fail if MCP is not available, but shape should be correct)
    expect(res.body).toHaveProperty("success");
    if (res.body.success) {
      expect(res.body).toHaveProperty("results");
      expect(Array.isArray(res.body.results)).toBe(true);
    }
  });

  it("POST /api/airtable/sync/tasks returns success or error shape", async () => {
    const res = await request(app)
      .post("/api/airtable/sync/tasks")
      .send({ tasks: [{ title: "Test Task", status: "open", priority: "High" }] })
      .expect("Content-Type", /json/);

    expect(res.body).toHaveProperty("success");
  });

  it("POST /api/airtable/sync/people returns success or error shape", async () => {
    const res = await request(app)
      .post("/api/airtable/sync/people")
      .send({ team: [{ name: "Test Person", role: "Analyst" }] })
      .expect("Content-Type", /json/);

    expect(res.body).toHaveProperty("success");
  });

  it("POST /api/airtable/sync/spvs returns success or error shape", async () => {
    const res = await request(app)
      .post("/api/airtable/sync/spvs")
      .send({ spvs: [{ name: "Test SPV", stage: "Active deal" }] })
      .expect("Content-Type", /json/);

    expect(res.body).toHaveProperty("success");
  });

  it("rejects invalid ventures payload", async () => {
    const res = await request(app)
      .post("/api/airtable/sync/ventures")
      .send({ ventures: "not-an-array" })
      .expect("Content-Type", /json/);

    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain("Invalid");
  });

  it("rejects invalid tasks payload", async () => {
    const res = await request(app)
      .post("/api/airtable/sync/tasks")
      .send({})
      .expect("Content-Type", /json/);

    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain("Invalid");
  });

  it("rejects invalid team payload", async () => {
    const res = await request(app)
      .post("/api/airtable/sync/people")
      .send({ team: 123 })
      .expect("Content-Type", /json/);

    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain("Invalid");
  });

  it("rejects invalid spvs payload", async () => {
    const res = await request(app)
      .post("/api/airtable/sync/spvs")
      .send({})
      .expect("Content-Type", /json/);

    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain("Invalid");
  });
});
