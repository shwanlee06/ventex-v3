/**
 * Global setup/teardown — runs before AND after ALL test suites.
 * Cleans up test records from all tables.
 * 
 * Strategy:
 * - For most tables: delete by ID >= 30000 (safe, no real data in that range)
 * - For team_members: clean by name pattern only (real members may have high IDs)
 * - For organizations: clean by name pattern (test orgs have "Test" or timestamp slugs)
 */
import { drizzle } from "drizzle-orm/mysql2";
import { sql } from "drizzle-orm";

async function cleanup() {
  if (!process.env.DATABASE_URL) return;

  try {
    const db = drizzle(process.env.DATABASE_URL);

    // Tables safe to clean by ID range (no real data with IDs >= 30000)
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

    // For organizations: clean test orgs by name pattern
    try {
      await db.execute(
        sql.raw(`DELETE FROM organizations WHERE name LIKE 'AI Test%' OR name LIKE 'AI Empty%' OR name LIKE 'Test Org%' OR slug LIKE 'ai-test-%' OR slug LIKE 'ai-empty-%' OR slug LIKE 'test-org-%'`)
      );
    } catch {
      // skip
    }

    // team_members: do NOT delete by ID range — real members may have high IDs
    // Clean only test-created members by name pattern
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
}

// globalSetup returns a teardown function
export default async function globalSetup() {
  // Clean before tests (remove leftovers from previous runs)
  await cleanup();
  
  // Return teardown function that runs after all tests
  return async () => {
    await cleanup();
  };
}
