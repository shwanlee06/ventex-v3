/**
 * Global teardown — runs once after ALL test suites complete.
 * Cleans up test records (IDs >= 30000) from all tables.
 */
import { drizzle } from "drizzle-orm/mysql2";
import { sql } from "drizzle-orm";

export default async function globalTeardown() {
  if (!process.env.DATABASE_URL) return;

  try {
    const db = drizzle(process.env.DATABASE_URL);

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
}
