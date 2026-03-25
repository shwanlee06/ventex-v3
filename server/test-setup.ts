/**
 * Global test setup/teardown — cleans up test data after each test suite.
 * Test records use IDs >= 30000 to distinguish from real data.
 */
import { afterAll } from "vitest";
import { getDb } from "./db";
import { sql } from "drizzle-orm";

afterAll(async () => {
  try {
    const db = await getDb();
    if (!db) return;

    // Clean up all test records (IDs >= 30000) from all tables
    const tables = [
      "notifications",
      "activity_log",
      "venture_team",
      "venture_files",
      "venture_folders",
      "document_intelligence",
      "venture_risks",
      "meeting_briefs",
      "tasks",
      "distributions",
      "spvs",
      "ventures",
      "team_members",
    ];

    for (const table of tables) {
      try {
        await db.execute(sql.raw(`DELETE FROM \`${table}\` WHERE id >= 30000`));
      } catch {
        // Table might not exist or have different structure, skip
      }
    }
  } catch {
    // Silently fail cleanup — don't break test results
  }
});
