import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const conn = await mysql.createConnection(process.env.DATABASE_URL);

// Check current counts
const [counts] = await conn.execute('SELECT draftStatus, COUNT(*) as n FROM agent_drafts GROUP BY draftStatus');
console.log('Before cleanup:', counts);

// Find duplicate pending drafts (same subject + org + type)
const [dupes] = await conn.execute(`
  SELECT subject, draftType, organizationId, COUNT(*) as cnt, MIN(id) as keep_id
  FROM agent_drafts
  WHERE draftStatus = 'pending'
  GROUP BY subject, draftType, organizationId
  HAVING cnt > 1
`);
console.log(`Found ${dupes.length} groups of duplicate pending drafts`);

let removedCount = 0;
for (const dupe of dupes) {
  // Delete all but the oldest (keep_id)
  const [result] = await conn.execute(
    `DELETE FROM agent_drafts WHERE subject = ? AND draftType = ? AND organizationId = ? AND draftStatus = 'pending' AND id != ?`,
    [dupe.subject, dupe.draftType, dupe.organizationId, dupe.keep_id]
  );
  removedCount += result.affectedRows;
}
console.log(`Removed ${removedCount} duplicate drafts`);

// Check counts after
const [after] = await conn.execute('SELECT draftStatus, COUNT(*) as n FROM agent_drafts GROUP BY draftStatus');
console.log('After cleanup:', after);

await conn.end();
