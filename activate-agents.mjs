// ============================================================================
// Activate AI Agents — Wire ventures/tasks/distributions to client orgs
// so the agent scheduler has real data to process
// ============================================================================

import mysql from 'mysql2/promise';

const conn = await mysql.createConnection(process.env.DATABASE_URL);

// ── 1. Get all ventures ──────────────────────────────────────────────────
const [allVentures] = await conn.execute(
  'SELECT id, name, sector, stage, healthScore FROM ventures WHERE 1=1 ORDER BY id'
);
console.log(`Found ${allVentures.length} ventures`);

// ── 2. Get demo client orgs ──────────────────────────────────────────────
const [orgs] = await conn.execute(
  "SELECT id, name FROM organizations WHERE name IN ('Al-Rashid Capital', 'Meridian Wealth Partners', 'Sovereign Gulf Holdings')"
);
console.log('Demo orgs:', orgs.map(o => `${o.name} (${o.id})`));

if (orgs.length < 3) {
  console.error('Missing demo orgs!');
  process.exit(1);
}

const alRashid = orgs.find(o => o.name === 'Al-Rashid Capital');
const meridian = orgs.find(o => o.name === 'Meridian Wealth Partners');
const sovereign = orgs.find(o => o.name === 'Sovereign Gulf Holdings');

// ── 3. Assign ventures to client orgs via org_venture_access ─────────────
// Split ventures across 3 orgs: ~7 each
// Al-Rashid: Real Estate + Oil & Gas (ventures 1-7)
// Meridian: F&B + Entertainment (ventures 8-14)
// Sovereign Gulf: Yacht + Others (ventures 15-20)

const ventureAssignments = {};
for (const v of allVentures) {
  const sector = v.sector;
  let orgId;
  if (['Real Estate', 'Oil & Gas'].includes(sector)) {
    orgId = alRashid.id;
  } else if (['F&B', 'Entertainment'].includes(sector)) {
    orgId = meridian.id;
  } else {
    orgId = sovereign.id;
  }
  ventureAssignments[v.id] = orgId;
}

// Insert org_venture_access records
for (const [ventureId, orgId] of Object.entries(ventureAssignments)) {
  const [existing] = await conn.execute(
    'SELECT id FROM org_venture_access WHERE organizationId = ? AND ventureId = ?',
    [orgId, ventureId]
  );
  if (existing.length === 0) {
    await conn.execute(
      'INSERT INTO org_venture_access (organizationId, ventureId) VALUES (?, ?)',
      [orgId, ventureId]
    );
  }
}
console.log('✅ Venture access assigned to client orgs');

// Count per org
for (const org of orgs) {
  const count = Object.values(ventureAssignments).filter(id => id === org.id).length;
  console.log(`  ${org.name}: ${count} ventures`);
}

// ── 4. Assign tasks to client orgs ───────────────────────────────────────
// Update existing tasks to match their venture's org
const [existingTasks] = await conn.execute('SELECT id, ventureId FROM tasks WHERE ventureId IS NOT NULL');
for (const task of existingTasks) {
  const orgId = ventureAssignments[task.ventureId];
  if (orgId) {
    await conn.execute('UPDATE tasks SET organizationId = ? WHERE id = ?', [orgId, task.id]);
  }
}
console.log(`✅ Updated ${existingTasks.length} existing tasks with org IDs`);

// ── 5. Create realistic tasks for ventures that have none ────────────────
const STAGE_TASKS = {
  'In Validation': [
    { title: 'Complete market feasibility study', priority: 'High' },
    { title: 'Prepare initial financial projections', priority: 'High' },
    { title: 'Identify regulatory requirements', priority: 'Medium' },
    { title: 'Draft preliminary business plan', priority: 'Medium' },
    { title: 'Conduct site assessment', priority: 'Low' },
  ],
  'In Fundraising': [
    { title: 'Finalize investor presentation deck', priority: 'High' },
    { title: 'Schedule LP roadshow meetings', priority: 'High' },
    { title: 'Complete due diligence documentation', priority: 'Medium' },
    { title: 'Negotiate term sheet with lead investor', priority: 'High' },
    { title: 'Prepare subscription agreement templates', priority: 'Medium' },
  ],
  'Active Ventures': [
    { title: 'Submit quarterly progress report', priority: 'High' },
    { title: 'Review contractor milestone deliverables', priority: 'Medium' },
    { title: 'Update financial model with actuals', priority: 'Medium' },
    { title: 'Conduct operational risk assessment', priority: 'Low' },
    { title: 'Prepare investor communication update', priority: 'Medium' },
  ],
};

const TEAM_NAMES = ['Shwan Lee', 'Shourya Kudaravalli', 'Chris Phelps', 'Jason Yu', 'Hamza Hegab', 'Brian Chen'];

let tasksCreated = 0;
for (const venture of allVentures) {
  const [existingVTasks] = await conn.execute(
    'SELECT COUNT(*) as cnt FROM tasks WHERE ventureId = ?',
    [venture.id]
  );
  
  if (existingVTasks[0].cnt >= 3) continue; // Already has enough tasks
  
  const stageTasks = STAGE_TASKS[venture.stage] || STAGE_TASKS['Active Ventures'];
  const orgId = ventureAssignments[venture.id];
  const now = new Date();
  
  // Create 3-5 tasks per venture, some complete, some open, some overdue
  const numTasks = Math.min(stageTasks.length, 3 + Math.floor(Math.random() * 3));
  
  for (let i = 0; i < numTasks; i++) {
    const taskDef = stageTasks[i];
    const assignee = TEAM_NAMES[Math.floor(Math.random() * TEAM_NAMES.length)];
    
    // Distribute statuses: ~30% complete, ~50% open, ~20% overdue
    let status, dueDate;
    const roll = Math.random();
    if (roll < 0.3) {
      status = 'complete';
      dueDate = new Date(now.getTime() - (5 + Math.floor(Math.random() * 20)) * 86400000).toISOString().split('T')[0];
    } else if (roll < 0.8) {
      status = 'open';
      dueDate = new Date(now.getTime() + (3 + Math.floor(Math.random() * 30)) * 86400000).toISOString().split('T')[0];
    } else {
      status = 'open'; // Will be marked overdue by the agent
      dueDate = new Date(now.getTime() - (3 + Math.floor(Math.random() * 14)) * 86400000).toISOString().split('T')[0];
    }
    
    const fullTitle = `${taskDef.title} — ${venture.name}`;
    
    // Check for duplicate
    const [dup] = await conn.execute('SELECT id FROM tasks WHERE title = ? AND ventureId = ?', [fullTitle, venture.id]);
    if (dup.length > 0) continue;
    
    await conn.execute(
      `INSERT INTO tasks (organizationId, title, ventureId, assigneeNames, dueDate, priority, status) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [orgId, fullTitle, venture.id, JSON.stringify([assignee]), dueDate, taskDef.priority, status]
    );
    tasksCreated++;
  }
}
console.log(`✅ Created ${tasksCreated} new tasks across ventures`);

// ── 6. Create distributions for client orgs ──────────────────────────────
const DIST_TEMPLATES = [
  { name: 'Q1 2026 Distribution', type: 'Quarterly', status: 'Paid', daysAgo: 45 },
  { name: 'Q2 2026 Distribution', type: 'Quarterly', status: 'Scheduled', daysAhead: 15 },
  { name: 'Q3 2026 Distribution', type: 'Quarterly', status: 'Scheduled', daysAhead: 105 },
  { name: 'Special Capital Return', type: 'Special', status: 'Scheduled', daysAhead: 30 },
];

let distsCreated = 0;
for (const org of orgs) {
  for (const tmpl of DIST_TEMPLATES) {
    const now = new Date();
    const distDate = tmpl.daysAgo
      ? new Date(now.getTime() - tmpl.daysAgo * 86400000)
      : new Date(now.getTime() + tmpl.daysAhead * 86400000);
    
    const amount = 25000 + Math.floor(Math.random() * 175000);
    const fundName = `${org.name} — ${tmpl.name}`;
    
    const [dup] = await conn.execute('SELECT id FROM distributions WHERE name = ?', [fundName]);
    if (dup.length > 0) continue;
    
    await conn.execute(
      `INSERT INTO distributions (organizationId, name, fund, amount, currency, type, status, distributionDate)
       VALUES (?, ?, ?, ?, 'USD', ?, ?, ?)`,
      [org.id, fundName, org.name, amount, tmpl.type, tmpl.status, distDate.toISOString().split('T')[0]]
    );
    distsCreated++;
  }
}
console.log(`✅ Created ${distsCreated} distributions for client orgs`);

// ── 7. Enable agent config for client orgs ───────────────────────────────
for (const org of orgs) {
  const [existing] = await conn.execute(
    'SELECT id FROM client_agent_config WHERE organizationId = ?',
    [org.id]
  );
  if (existing.length === 0) {
    await conn.execute(
      `INSERT INTO client_agent_config (organizationId, velocityAgentEnabled, complianceAgentEnabled, dealFlowAgentEnabled, orchestratorEnabled, autoAdvanceEnabled, autoAdvanceSectors, pollingIntervalMinutes)
       VALUES (?, 1, 1, 1, 1, 1, '[]', 360)`,
      [org.id]
    );
    console.log(`  Enabled agent config for ${org.name}`);
  }
}
console.log('✅ Agent configs enabled for all client orgs');

// ── 8. Update health scores based on task status ─────────────────────────
for (const venture of allVentures) {
  const [taskStats] = await conn.execute(`
    SELECT 
      COUNT(*) as total,
      SUM(CASE WHEN status = 'complete' THEN 1 ELSE 0 END) as complete,
      SUM(CASE WHEN status = 'overdue' OR (status = 'open' AND dueDate < CURDATE()) THEN 1 ELSE 0 END) as overdue
    FROM tasks WHERE ventureId = ?
  `, [venture.id]);
  
  const stats = taskStats[0];
  if (stats.total === 0) continue;
  
  const completionRate = stats.complete / stats.total;
  const overdueRate = stats.overdue / stats.total;
  
  // Health = 100 * completionRate - 50 * overdueRate, clamped 10-95
  const health = Math.max(10, Math.min(95, Math.round(100 * completionRate - 50 * overdueRate + 30)));
  
  await conn.execute('UPDATE ventures SET healthScore = ? WHERE id = ?', [health, venture.id]);
}
console.log('✅ Health scores recalculated based on task status');

// ── 9. Summary ───────────────────────────────────────────────────────────
console.log('\n═══════════════════════════════════════════');
console.log('AI AGENT ACTIVATION COMPLETE');
console.log('═══════════════════════════════════════════');
console.log('The agent scheduler runs every 6 hours (and 30s after server restart).');
console.log('Agents will now find:');
console.log('  - Ventures assigned to each client org');
console.log('  - Tasks (some overdue) that trigger the Overdue Agent');
console.log('  - Distributions that trigger the Distribution Sentinel');
console.log('  - Venture stage progress that triggers the Velocity Agent');
console.log('  - The Orchestrator will synthesize all signals via LLM');
console.log('');
console.log('To trigger agents immediately, use the "Run All Agents" button in the ATLAS Command Center.');

await conn.end();
