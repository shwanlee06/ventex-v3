import mysql from "mysql2/promise";
import dotenv from "dotenv";
dotenv.config();

const conn = await mysql.createConnection(process.env.DATABASE_URL);

try {
  // 1. Create ATLAS (core platform org)
  await conn.execute(
    `INSERT INTO organizations (name, slug, type, orgStatus, description) VALUES (?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE name=name`,
    ["ATLAS", "atlas", "core", "active", "AI Venture Velocity Platform — the SaaS tool managing client portfolios"]
  );

  // 2. Create Royalton Venture Holding (first client)
  await conn.execute(
    `INSERT INTO organizations (name, slug, type, orgStatus, description) VALUES (?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE name=name`,
    ["Royalton Venture Holding", "royalton", "client", "active", "UHNWI venture holding managing 20+ partnerships across Real Estate, Yacht, F&B, Entertainment, Oil & Gas"]
  );

  // Get org IDs
  const [orgs] = await conn.execute(`SELECT id, slug FROM organizations`);
  const royaltonId = orgs.find(o => o.slug === "royalton")?.id;
  const atlasId = orgs.find(o => o.slug === "atlas")?.id;
  console.log(`ATLAS org id: ${atlasId}, Royalton org id: ${royaltonId}`);

  // 3. Link all ventures to Royalton
  const [ventures] = await conn.execute(`SELECT id, name FROM ventures`);
  console.log(`Found ${ventures.length} ventures to link to Royalton`);

  for (const v of ventures) {
    // Check if already linked
    const [existing] = await conn.execute(
      `SELECT id FROM org_venture_access WHERE organizationId = ? AND ventureId = ?`,
      [royaltonId, v.id]
    );
    if (existing.length === 0) {
      await conn.execute(
        `INSERT INTO org_venture_access (organizationId, ventureId, orgPermission, grantedBy) VALUES (?, ?, ?, ?)`,
        [royaltonId, v.id, "full", null]
      );
      console.log(`  Linked: ${v.name} → Royalton`);
    } else {
      console.log(`  Already linked: ${v.name}`);
    }
  }

  // 4. Link team members to Royalton org (except Shwan who is ATLAS)
  // First check if team_members has an organizationId column
  try {
    const [cols] = await conn.execute(`SHOW COLUMNS FROM team_members LIKE 'organizationId'`);
    if (cols.length === 0) {
      console.log("team_members doesn't have organizationId column — skipping member org linking");
    }
  } catch (e) {
    console.log("Skipping team member org linking:", e.message);
  }

  console.log("\nDone! Organizations seeded and ventures linked.");
  
  // Verify
  const [result] = await conn.execute(
    `SELECT o.name, o.type, COUNT(ova.id) as ventureCount 
     FROM organizations o 
     LEFT JOIN org_venture_access ova ON o.id = ova.organizationId 
     GROUP BY o.id`
  );
  console.table(result);

} finally {
  await conn.end();
}
