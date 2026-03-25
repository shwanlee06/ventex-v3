/**
 * Global test setup/teardown — cleans up test data after each test suite.
 * 
 * Strategy:
 * - For most tables: delete by ID >= 30000 (safe, no real data in that range)
 * - For team_members: clean by name pattern only (real members may have high IDs)
 * - For organizations: clean by name pattern (test orgs have "Test" or timestamp slugs)
 */
import { afterAll } from "vitest";
import { getDb } from "./db";
import { sql } from "drizzle-orm";

afterAll(async () => {
  try {
    const db = await getDb();
    if (!db) return;

    // Tables safe to clean by ID range
    const safeIdTables = [
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
      "org_venture_access",
      "user_venture_access",
      "audit_log",
    ];

    for (const table of safeIdTables) {
      try {
        await db.execute(sql.raw(`DELETE FROM \`${table}\` WHERE id >= 30000`));
      } catch {
        // Table might not exist or have different structure, skip
      }
    }

    // Clean test organizations by name pattern
    try {
      await db.execute(
        sql.raw(`DELETE FROM organizations WHERE name LIKE 'AI Test%' OR name LIKE 'AI Empty%' OR name LIKE 'Test Org%' OR slug LIKE 'ai-test-%' OR slug LIKE 'ai-empty-%' OR slug LIKE 'test-org-%'`)
      );
    } catch {
      // skip
    }

    // Clean test team members by name pattern only (not by ID)
    try {
      await db.execute(
        sql.raw(`DELETE FROM team_members WHERE name LIKE 'Test %' OR name LIKE 'Delete Me%'`)
      );
    } catch {
      // skip
    }
  } catch {
    // Silently fail cleanup — don't break test results
  }
});
