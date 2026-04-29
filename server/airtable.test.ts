import { describe, it, expect } from "vitest";

describe("Airtable PAT validation", () => {
  it("should authenticate successfully with the Airtable API", async () => {
    const token = process.env.AIRTABLE_PAT;
    expect(token).toBeDefined();
    expect(token!.startsWith("pat")).toBe(true);

    const response = await fetch(
      "https://api.airtable.com/v0/app7fqXNgqKmnKhXZ/Aurovia%20Documents?maxRecords=1",
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.records).toBeDefined();
    expect(Array.isArray(data.records)).toBe(true);
  });
});
