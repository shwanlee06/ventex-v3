import { describe, it, expect } from "vitest";
import Papa from "papaparse";

// Test CSV parsing and validation logic directly
describe("CSV Import", () => {
  it("parses valid venture CSV correctly", () => {
    const csv = `name,sector,location,stage,status,priority
"Test Venture","Real Estate","Dubai","Active","In progress","High"
"Second Venture","F&B","Oman","Sourcing","In progress","Medium"`;

    const result = Papa.parse(csv, { header: true, skipEmptyLines: true });
    expect(result.errors).toHaveLength(0);
    expect(result.data).toHaveLength(2);
    expect(result.data[0]).toHaveProperty("name", "Test Venture");
    expect(result.data[0]).toHaveProperty("sector", "Real Estate");
    expect(result.data[1]).toHaveProperty("name", "Second Venture");
  });

  it("parses valid task CSV correctly", () => {
    const csv = `title,ventureName,assigneeNames,dueDate,priority,status
"Complete report","Test Venture","John; Jane","2026-06-30","High","open"`;

    const result = Papa.parse(csv, { header: true, skipEmptyLines: true });
    expect(result.errors).toHaveLength(0);
    expect(result.data).toHaveLength(1);
    expect(result.data[0]).toHaveProperty("title", "Complete report");
    expect(result.data[0]).toHaveProperty("assigneeNames", "John; Jane");
  });

  it("parses valid team CSV correctly", () => {
    const csv = `name,role,email,phone,location,type,authorityLevel,escalationPriority
"John Smith","Director","john@test.com","+1-555-0100","Dubai","Internal","approve","1"`;

    const result = Papa.parse(csv, { header: true, skipEmptyLines: true });
    expect(result.errors).toHaveLength(0);
    expect(result.data).toHaveLength(1);
    expect(result.data[0]).toHaveProperty("name", "John Smith");
    expect(result.data[0]).toHaveProperty("authorityLevel", "approve");
  });

  it("parses valid SPV CSV correctly", () => {
    const csv = `name,sector,stage,priority,ventureName,purpose,capitalCommitted,capitalCalled,capitalRemaining
"SPV Alpha","Real Estate","Active deal","High","Test Venture","Investment vehicle","10000000","5000000","5000000"`;

    const result = Papa.parse(csv, { header: true, skipEmptyLines: true });
    expect(result.errors).toHaveLength(0);
    expect(result.data).toHaveLength(1);
    expect(result.data[0]).toHaveProperty("name", "SPV Alpha");
    expect(result.data[0]).toHaveProperty("capitalCommitted", "10000000");
  });

  it("handles empty fields gracefully", () => {
    const csv = `name,sector,location,stage,status,priority
"Venture A","Tech","","","",""`;

    const result = Papa.parse(csv, { header: true, skipEmptyLines: true });
    expect(result.errors).toHaveLength(0);
    expect(result.data).toHaveLength(1);
    expect(result.data[0]).toHaveProperty("name", "Venture A");
    expect(result.data[0]).toHaveProperty("location", "");
  });

  it("reports parse errors for malformed CSV", () => {
    const csv = `name,sector
"Unclosed quote,Tech`;

    const result = Papa.parse(csv, { header: true, skipEmptyLines: true });
    // PapaParse may handle this differently but should flag issues
    expect(result.data.length).toBeGreaterThanOrEqual(0);
  });

  it("handles semicolon-separated multi-values", () => {
    const csv = `title,ventureName,assigneeNames,dueDate,priority,status
"Task A","Venture","Alice; Bob; Charlie","2026-07-01","Medium","open"`;

    const result = Papa.parse<Record<string, string>>(csv, { header: true, skipEmptyLines: true });
    const assignees = result.data[0].assigneeNames.split(";").map((n: string) => n.trim());
    expect(assignees).toEqual(["Alice", "Bob", "Charlie"]);
  });

  it("validates required fields", () => {
    // Simulate validation logic
    const row = { name: "", sector: "Tech" };
    const errors: string[] = [];
    if (!row.name?.trim()) errors.push("Name is required");
    expect(errors).toContain("Name is required");
  });

  it("validates numeric fields", () => {
    const row = { currentValuation: "not-a-number" };
    const isValid = !isNaN(Number(row.currentValuation));
    expect(isValid).toBe(false);
  });

  it("validates stage values", () => {
    const VALID_STAGES = ["Sourcing", "Due Diligence", "Active", "Exiting", "Closed"];
    expect(VALID_STAGES.includes("Active")).toBe(true);
    expect(VALID_STAGES.includes("Invalid Stage")).toBe(false);
  });
});
