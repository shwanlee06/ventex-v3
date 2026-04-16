import mysql from 'mysql2/promise';

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL);
  
  // ── 1. Assign ventures to demo client orgs ──────────────────────────
  // Al-Rashid Capital (450031) — Real Estate: ventures 1,2,3,4 (Barcelona, Lagonissi, Muscat Bay, Chekka)
  // Meridian Wealth Partners (450032) — F&B + Entertainment: ventures 8,9,15,16 (Berbara, Ibiza, KTL-Dubai, Casino-Malaysia)
  // Sovereign Gulf Holdings (450033) — Yacht + Oil & Gas: ventures 11,12,13,20 (Mar-a-Lago, Bagatelle, JV Yacht, Venezuela)
  
  const assignments = [
    // Al-Rashid Capital
    { orgId: 450031, ventureIds: [1, 2, 3, 4] },
    // Meridian Wealth Partners
    { orgId: 450032, ventureIds: [8, 9, 15, 16] },
    // Sovereign Gulf Holdings
    { orgId: 450033, ventureIds: [11, 12, 13, 20] },
  ];
  
  for (const { orgId, ventureIds } of assignments) {
    for (const ventureId of ventureIds) {
      // Check if already exists
      const [existing] = await conn.execute(
        'SELECT id FROM org_venture_access WHERE organizationId = ? AND ventureId = ?',
        [orgId, ventureId]
      );
      if (existing.length === 0) {
        await conn.execute(
          'INSERT INTO org_venture_access (organizationId, ventureId) VALUES (?, ?)',
          [orgId, ventureId]
        );
        console.log(`Assigned venture ${ventureId} to org ${orgId}`);
      }
    }
  }
  
  // ── 2. Add overdue tasks for demo orgs ──────────────────────────────
  const now = new Date();
  const daysAgo = (d) => {
    const date = new Date(now);
    date.setDate(date.getDate() - d);
    return date.toISOString().slice(0, 10);
  };
  const daysFromNow = (d) => {
    const date = new Date(now);
    date.setDate(date.getDate() + d);
    return date.toISOString().slice(0, 10);
  };
  
  const newTasks = [
    // Al-Rashid Capital ventures (Real Estate)
    { title: "Finalize Barcelona lease agreement with local counsel", ventureId: 1, status: "overdue", dueDate: daysAgo(12), priority: "high", assignees: "Shwan Lee" },
    { title: "Submit Lagonissi environmental impact assessment", ventureId: 2, status: "overdue", dueDate: daysAgo(8), priority: "high", assignees: "Najib" },
    { title: "Muscat Bay — Investor presentation deck v3", ventureId: 3, status: "in_progress", dueDate: daysFromNow(5), priority: "medium", assignees: "Shourya Kudaravalli" },
    { title: "Chekka Land — Zoning approval follow-up", ventureId: 4, status: "open", dueDate: daysFromNow(10), priority: "medium", assignees: "Shwan Lee" },
    
    // Meridian Wealth Partners ventures (F&B + Entertainment)
    { title: "Nammos Ibiza — Seasonal staffing plan Q3", ventureId: 9, status: "overdue", dueDate: daysAgo(15), priority: "high", assignees: "Nadine" },
    { title: "KTL-Dubai — Gaming license renewal documentation", ventureId: 15, status: "overdue", dueDate: daysAgo(5), priority: "critical", assignees: "Shwan Lee" },
    { title: "Casino Malaysia — Regulatory compliance audit", ventureId: 16, status: "in_progress", dueDate: daysFromNow(3), priority: "high", assignees: "Najib" },
    
    // Sovereign Gulf Holdings ventures (Yacht + Oil & Gas)
    { title: "Mar-a-Lago Yacht Club — Membership tier pricing review", ventureId: 11, status: "overdue", dueDate: daysAgo(18), priority: "medium", assignees: "Shourya Kudaravalli" },
    { title: "JV Yacht Nammos — Hull inspection scheduling", ventureId: 13, status: "in_progress", dueDate: daysFromNow(7), priority: "medium", assignees: "Nadine" },
    { title: "Venezuela Mining — Export permit application", ventureId: 20, status: "open", dueDate: daysFromNow(14), priority: "high", assignees: "Shwan Lee" },
    { title: "Bagatelle — Marina berth allocation contract", ventureId: 12, status: "overdue", dueDate: daysAgo(3), priority: "medium", assignees: "Najib" },
    
    // Cross-portfolio ventures
    { title: "Zarka City — Master plan review with architects", ventureId: 7, status: "in_progress", dueDate: daysFromNow(2), priority: "high", assignees: "Shwan Lee" },
  ];
  
  for (const task of newTasks) {
    // Check if task already exists (by title)
    const [existing] = await conn.execute(
      'SELECT id FROM tasks WHERE title = ?',
      [task.title]
    );
    if (existing.length === 0) {
      await conn.execute(
        'INSERT INTO tasks (title, ventureId, status, dueDate, priority, assigneeNames) VALUES (?, ?, ?, ?, ?, ?)',
        [task.title, task.ventureId, task.status, task.dueDate, task.priority, JSON.stringify([task.assignees])]
      );
      console.log(`Created task: ${task.title} (${task.status}, due: ${task.dueDate})`);
    } else {
      console.log(`Task already exists: ${task.title}`);
    }
  }
  
  // ── 3. Add recent activity log entries ──────────────────────────────
  const activities = [
    { entityType: "venture", entityName: "Nammos - Barcelona", action: "Stage Update", detail: "Moved from In Validation to In Fundraising", userName: "ATLAS Velocity Agent", activitySource: "system" },
    { entityType: "task", entityName: "Finalize Barcelona lease agreement", action: "Task Created", detail: "New task assigned to Shwan Lee — due in 12 days", userName: "ATLAS Operations", activitySource: "atlas_ops" },
    { entityType: "venture", entityName: "KTL-Dubai Casino License", action: "Document Uploaded", detail: "Gaming license renewal package uploaded (3 files)", userName: "Shwan Lee", activitySource: "client_business" },
    { entityType: "distribution", entityName: "Muscat Bay Q1 Distribution", action: "Distribution Scheduled", detail: "$125,000 LP distribution scheduled for next month", userName: "ATLAS Distribution Sentinel", activitySource: "system" },
    { entityType: "venture", entityName: "JV Yacht - Nammos", action: "Health Score Updated", detail: "Health score adjusted from 70 to 66 — overdue tasks detected", userName: "ATLAS Orchestrator", activitySource: "system" },
    { entityType: "task", entityName: "Submit Lagonissi environmental impact assessment", action: "Task Overdue", detail: "Task is 8 days past due — follow-up drafted", userName: "ATLAS Overdue Agent", activitySource: "system" },
    { entityType: "venture", entityName: "Casino - Malaysia", action: "Team Member Added", detail: "Najib assigned to regulatory compliance workstream", userName: "Shwan Lee", activitySource: "client_business" },
    { entityType: "venture", entityName: "Venezuela Mining Rights", action: "Risk Alert", detail: "Export permit deadline approaching — 14 days remaining", userName: "ATLAS Compliance Agent", activitySource: "system" },
  ];
  
  for (const act of activities) {
    await conn.execute(
      'INSERT INTO activity_log (entityType, entityName, action, detail, userName, activitySource) VALUES (?, ?, ?, ?, ?, ?)',
      [act.entityType, act.entityName, act.action, act.detail, act.userName, act.activitySource]
    );
    console.log(`Activity: ${act.action} — ${act.entityName}`);
  }
  
  // ── 4. Update health scores for ventures with overdue tasks ─────────
  // Lower health for ventures with overdue tasks
  const venturesWithOverdue = [1, 2, 9, 15, 11, 12];
  for (const vId of venturesWithOverdue) {
    await conn.execute(
      'UPDATE ventures SET healthScore = GREATEST(35, healthScore - 15) WHERE id = ? AND healthScore > 50',
      [vId]
    );
  }
  console.log('Updated health scores for ventures with overdue tasks');
  
  // ── 5. Clean up test data ───────────────────────────────────────────
  const [testOrgs] = await conn.execute('SELECT id FROM organizations WHERE name LIKE "Test %"');
  for (const org of testOrgs) {
    await conn.execute('DELETE FROM organizations WHERE id = ?', [org.id]);
    console.log(`Cleaned up test org ${org.id}`);
  }
  
  // ── 6. Assign ATLAS team members to ventures ────────────────────────
  // Get ATLAS team members
  const [atlasMembers] = await conn.execute('SELECT id, name FROM team_members WHERE type = "Internal" OR organizationId IS NULL');
  console.log('ATLAS members:', atlasMembers.map(m => ({ id: m.id, name: m.name })));
  
  // Assign each ATLAS member to 3-5 ventures if not already assigned
  const ventureAssignments = {
    'Shwan Lee': [1, 2, 4, 7, 15, 20],
    'Najib': [3, 12, 13, 16, 17],
    'Shourya Kudaravalli': [5, 6, 11, 18, 19],
    'Nadine': [8, 9, 10, 14],
  };
  
  for (const member of atlasMembers) {
    const ventureIds = ventureAssignments[member.name];
    if (!ventureIds) continue;
    
    for (const ventureId of ventureIds) {
      const [existing] = await conn.execute(
        'SELECT id FROM venture_team WHERE memberId = ? AND ventureId = ?',
        [member.id, ventureId]
      );
      if (existing.length === 0) {
        await conn.execute(
          'INSERT INTO venture_team (memberId, ventureId, responsibility) VALUES (?, ?, ?)',
          [member.id, ventureId, 'Lead']
        );
        console.log(`Assigned ${member.name} to venture ${ventureId}`);
      }
    }
  }
  
  console.log('\n✅ MVP data seeding complete');
  await conn.end();
}

main().catch(console.error);
