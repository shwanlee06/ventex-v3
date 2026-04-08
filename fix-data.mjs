import 'dotenv/config';
import mysql from 'mysql2/promise';

const conn = await mysql.createConnection(process.env.DATABASE_URL);

console.log("=== 1. Renaming problematic ventures ===");
await conn.query(`UPDATE ventures SET name = 'Muscat Grand Hotel' WHERE name = 'Shady Hotel'`);
await conn.query(`UPDATE ventures SET name = 'North Africa Development' WHERE name = 'Kazzafi Daughter'`);
await conn.query(`UPDATE ventures SET name = 'Oman Luxury Resort' WHERE name = 'Shady Project'`);
console.log("Renamed: Shady Hotel → Muscat Grand Hotel, Kazzafi Daughter → North Africa Development, Shady Project → Oman Luxury Resort");

console.log("\n=== 2. Normalizing stage names ===");
await conn.query(`UPDATE ventures SET stage = 'Active Ventures' WHERE stage = 'Active ventures'`);
const [stageCheck] = await conn.query(`SELECT stage, COUNT(*) as cnt FROM ventures GROUP BY stage`);
console.log("Stages after normalization:", stageCheck);

console.log("\n=== 3. Filling TBD locations ===");
await conn.query(`UPDATE ventures SET location = 'France' WHERE name = 'Bagatelle' AND location = 'TBD'`);
await conn.query(`UPDATE ventures SET location = 'Mediterranean' WHERE name = 'JV Yacht - Nammos' AND location = 'TBD'`);
await conn.query(`UPDATE ventures SET location = 'Malaysia' WHERE name = 'Casino - Malaysia' AND location = 'TBD'`);
await conn.query(`UPDATE ventures SET location = 'Monaco' WHERE name = 'P430' AND location = 'TBD'`);
const [locCheck] = await conn.query(`SELECT name, location FROM ventures WHERE location = 'TBD'`);
console.log("Remaining TBD locations:", locCheck.length === 0 ? "None — all filled" : locCheck);

console.log("\n=== 4. Adding open and overdue tasks ===");
// Get some venture IDs to assign tasks to
const [ventureIds] = await conn.query(`SELECT id, name FROM ventures ORDER BY id LIMIT 20`);
const ventureMap = {};
for (const v of ventureIds) ventureMap[v.name] = v.id;

const now = new Date();
const pastDate = (daysAgo) => {
  const d = new Date(now);
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().split('T')[0];
};
const futureDate = (daysAhead) => {
  const d = new Date(now);
  d.setDate(d.getDate() + daysAhead);
  return d.toISOString().split('T')[0];
};

const newTasks = [
  // Overdue tasks (due in the past, not complete)
  { title: 'Finalize investor deck for Nammos Barcelona', status: 'open', dueDate: pastDate(14), ventureId: ventureMap['Nammos - Barcelona'], priority: 'High', assigneeNames: '["Shwan Lee"]' },
  { title: 'Submit environmental impact assessment — Muscat Bay', status: 'open', dueDate: pastDate(7), ventureId: ventureMap['Muscat Bay'], priority: 'High', assigneeNames: '["Najib"]' },
  { title: 'Legal review of JV Yacht partnership agreement', status: 'in_progress', dueDate: pastDate(3), ventureId: ventureMap['JV Yacht - Nammos'], priority: 'High', assigneeNames: '["Shwan Lee"]' },
  { title: 'Secure construction permits — Chekka Resort', status: 'open', dueDate: pastDate(10), ventureId: ventureMap['Chekka Land - Resort'], priority: 'Medium', assigneeNames: '["Najib"]' },
  { title: 'Complete due diligence report — Zarka City', status: 'open', dueDate: pastDate(5), ventureId: ventureMap['Zarka City'], priority: 'High', assigneeNames: '["Shwan Lee"]' },
  // Open tasks (due in the future)
  { title: 'Prepare Q2 distribution schedule', status: 'open', dueDate: futureDate(7), ventureId: null, priority: 'Medium', assigneeNames: '["Shwan Lee"]' },
  { title: 'Review Nammos Ibiza site inspection report', status: 'open', dueDate: futureDate(3), ventureId: ventureMap['Nammos - Ibiza'], priority: 'Medium', assigneeNames: '["Najib"]' },
  { title: 'Negotiate vendor contracts — Berbara Lebanon', status: 'in_progress', dueDate: futureDate(14), ventureId: ventureMap['Berbara - Lebanon'], priority: 'Low', assigneeNames: '["Najib"]' },
  { title: 'Update financial model for Mar-a-Lago Yacht Club', status: 'open', dueDate: futureDate(5), ventureId: ventureMap['Mar-a-Lago Yacht Club'], priority: 'Medium', assigneeNames: '["Shwan Lee"]' },
  { title: 'Board presentation — North Africa Development', status: 'open', dueDate: futureDate(10), ventureId: ventureMap['North Africa Development'], priority: 'High', assigneeNames: '["Shwan Lee"]' },
  { title: 'Coordinate site visit — Nammos Watson Island', status: 'in_progress', dueDate: futureDate(2), ventureId: ventureMap['Nammos - Watson Island'], priority: 'Medium', assigneeNames: '["Najib"]' },
  { title: 'Draft term sheet — Venezuela Mining Rights', status: 'open', dueDate: futureDate(21), ventureId: ventureMap['Venezuela Mining Rights'], priority: 'Low', assigneeNames: '["Shwan Lee"]' },
];

for (const t of newTasks) {
  await conn.query(
    `INSERT INTO tasks (title, status, dueDate, ventureId, priority, assigneeNames) VALUES (?, ?, ?, ?, ?, ?)`,
    [t.title, t.status, t.dueDate, t.ventureId, t.priority, t.assigneeNames]
  );
}
console.log(`Added ${newTasks.length} new tasks (5 overdue, 7 open/in-progress)`);

const [taskStats] = await conn.query(`
  SELECT status, COUNT(*) as cnt,
    SUM(CASE WHEN dueDate < NOW() AND status != 'complete' THEN 1 ELSE 0 END) as overdue
  FROM tasks GROUP BY status
`);
console.log("Task stats after additions:", taskStats);

console.log("\n=== 5. Adding demo client organizations ===");
// Check existing orgs
const [existingOrgs] = await conn.query(`SELECT id, name FROM organizations`);
console.log("Existing orgs:", existingOrgs);

// Add demo client orgs
const demoOrgs = [
  { name: 'Al-Rashid Capital', slug: 'al-rashid-capital', type: 'client', primaryContactName: 'Omar Al-Rashid', primaryContactEmail: 'omar@alrashidcapital.com', aumRange: '$100M-$500M', sectors: '["Real Estate", "Hospitality"]', subscriptionTier: 'growth' },
  { name: 'Meridian Wealth Partners', slug: 'meridian-wealth-partners', type: 'client', primaryContactName: 'Victoria Chen', primaryContactEmail: 'v.chen@meridianwp.com', aumRange: '$500M+', sectors: '["Real Estate", "Entertainment", "Yacht"]', subscriptionTier: 'enterprise' },
  { name: 'Sovereign Gulf Holdings', slug: 'sovereign-gulf-holdings', type: 'client', primaryContactName: 'Khalid bin Faisal', primaryContactEmail: 'khalid@sovereigngulf.com', aumRange: '$1B+', sectors: '["Oil & Gas", "Real Estate", "Mining"]', subscriptionTier: 'enterprise' },
];

for (const org of demoOrgs) {
  const [existing] = await conn.query(`SELECT id FROM organizations WHERE name = ?`, [org.name]);
  if (existing.length === 0) {
    await conn.query(
      `INSERT INTO organizations (name, slug, type, primaryContactName, primaryContactEmail, aumRange, sectors, subscriptionTier) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [org.name, org.slug, org.type, org.primaryContactName, org.primaryContactEmail, org.aumRange, org.sectors, org.subscriptionTier]
    );
    console.log(`Created org: ${org.name}`);
  } else {
    console.log(`Org already exists: ${org.name}`);
  }
}

// Get the new org IDs
const [allOrgs] = await conn.query(`SELECT id, name FROM organizations WHERE type = 'client'`);
console.log("All client orgs:", allOrgs);

// Assign ventures to the new orgs
const orgVentureAssignments = {
  'Al-Rashid Capital': ['Nammos - Barcelona', 'Nammos - Ibiza', 'Nammos Lebanon', 'Bagatelle', 'Nammos - Lagonissi'],
  'Meridian Wealth Partners': ['Mar-a-Lago Yacht Club', 'Nammos - Watson Island', 'KTL-Dubai Casino License', 'P430'],
  'Sovereign Gulf Holdings': ['Zarka City', 'Muscat Bay', 'Muscat Grand Hotel', 'Oman Luxury Resort', 'North Africa Development', 'Venezuela Mining Rights'],
};

for (const [orgName, ventureNames] of Object.entries(orgVentureAssignments)) {
  const [orgRow] = await conn.query(`SELECT id FROM organizations WHERE name = ?`, [orgName]);
  if (orgRow.length === 0) continue;
  const orgId = orgRow[0].id;

  for (const vName of ventureNames) {
    const [vRow] = await conn.query(`SELECT id FROM ventures WHERE name = ?`, [vName]);
    if (vRow.length === 0) { console.log(`  Venture not found: ${vName}`); continue; }
    const ventureId = vRow[0].id;

    const [existing] = await conn.query(`SELECT * FROM org_venture_access WHERE organizationId = ? AND ventureId = ?`, [orgId, ventureId]);
    if (existing.length === 0) {
      await conn.query(`INSERT INTO org_venture_access (organizationId, ventureId) VALUES (?, ?)`, [orgId, ventureId]);
      console.log(`  Assigned ${vName} to ${orgName}`);
    }
  }
}

console.log("\n=== 6. Adding recent activity log entries ===");
const activityDetails = [
  { action: 'Updated health score', entity: 'venture', entityName: 'Nammos - Barcelona', detail: 'Updated health score for Nammos Barcelona from 70 to 78' },
  { action: 'Created task', entity: 'task', entityName: 'Investor Deck', detail: 'Created task: Finalize investor deck for Nammos Barcelona' },
  { action: 'Stage advanced', entity: 'venture', entityName: 'Zarka City', detail: 'Stage advanced: Zarka City moved to In Fundraising' },
  { action: 'Updated deal terms', entity: 'spv', entityName: 'Nammos Lagonissi SPV', detail: 'Updated deal terms for Nammos Lagonissi SPV' },
  { action: 'Uploaded document', entity: 'venture', entityName: 'Muscat Bay', detail: 'Uploaded environmental assessment — Muscat Bay' },
  { action: 'Created task', entity: 'task', entityName: 'JV Yacht Legal Review', detail: 'Created task: Legal review of JV Yacht partnership agreement' },
  { action: 'Scheduled distribution', entity: 'distribution', entityName: 'Berbara Lebanon', detail: 'Scheduled Q2 distribution for Berbara Lebanon' },
  { action: 'Updated financial model', entity: 'venture', entityName: 'Mar-a-Lago Yacht Club', detail: 'Updated financial model — Mar-a-Lago Yacht Club' },
  { action: 'Created task', entity: 'task', entityName: 'Board Presentation', detail: 'Created task: Board presentation — North Africa Development' },
  { action: 'Risk assessment completed', entity: 'venture', entityName: 'Venezuela Mining Rights', detail: 'Risk assessment completed for Venezuela Mining Rights' },
];

for (let i = 0; i < activityDetails.length; i++) {
  const a = activityDetails[i];
  const hoursAgo = i * 3 + 1; // spread over last 30 hours
  await conn.query(
    `INSERT INTO activity_log (action, entityType, entityName, detail, userName, createdAt) VALUES (?, ?, ?, ?, ?, DATE_SUB(NOW(), INTERVAL ? HOUR))`,
    [a.action, a.entity, a.entityName, a.detail, 'Shwan Lee', hoursAgo]
  );
}
console.log(`Added ${activityDetails.length} recent activity entries`);

console.log("\n=== 7. Fix name capitalization ===");
await conn.query(`UPDATE team_members SET name = 'Shourya Kudaravalli' WHERE name LIKE '%hourya%kudaravalli%'`);
console.log("Fixed Shourya Kudaravalli capitalization");

console.log("\n=== Done! ===");
await conn.end();
