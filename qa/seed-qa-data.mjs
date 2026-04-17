// QA Phase 1 — Seed Test Data
// Creates: Meridian Holdings (Tenant A), Volkov Capital (Tenant B), Apex Partners (Tenant C)
import { drizzle } from "drizzle-orm/mysql2";
import { sql } from "drizzle-orm";
import dotenv from "dotenv";
dotenv.config();

const db = drizzle(process.env.DATABASE_URL);

function slugify(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split("T")[0];
}

function daysFromNow(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().split("T")[0];
}

async function seed() {
  console.log("🧪 QA Phase 1 — Seeding test tenants...\n");

  // ── 1. Create Organizations ──────────────────────────────────────────
  console.log("  → Creating organizations...");

  // Check if already seeded
  const [existingOrgs] = await db.execute(sql`SELECT slug FROM organizations WHERE slug IN ('meridian-holdings', 'volkov-capital', 'apex-partners')`);
  if (existingOrgs.length > 0) {
    console.log("  ⚠️  QA tenants already exist. Cleaning up first...");
    // Delete in reverse dependency order
    for (const slug of ['meridian-holdings', 'volkov-capital', 'apex-partners']) {
      const [org] = await db.execute(sql`SELECT id FROM organizations WHERE slug = ${slug}`);
      if (org.length > 0) {
        const orgId = org[0].id;
        await db.execute(sql`DELETE FROM venture_velocity WHERE ventureId IN (SELECT id FROM ventures WHERE id IN (SELECT ventureId FROM org_venture_access WHERE organizationId = ${orgId}))`);
        await db.execute(sql`DELETE FROM venture_process_tracking WHERE ventureId IN (SELECT id FROM ventures WHERE id IN (SELECT ventureId FROM org_venture_access WHERE organizationId = ${orgId}))`);
        await db.execute(sql`DELETE FROM agent_events WHERE organizationId = ${orgId}`);
        await db.execute(sql`DELETE FROM agent_drafts WHERE organizationId = ${orgId}`);
        await db.execute(sql`DELETE FROM client_agent_config WHERE organizationId = ${orgId}`);
        await db.execute(sql`DELETE FROM distribution_read_receipts WHERE distributionId IN (SELECT id FROM distributions WHERE organizationId = ${orgId})`);
        await db.execute(sql`DELETE FROM distributions WHERE organizationId = ${orgId}`);
        await db.execute(sql`DELETE FROM spv_ventures WHERE spvId IN (SELECT id FROM spvs WHERE organizationId = ${orgId})`);
        await db.execute(sql`DELETE FROM spv_team WHERE spvId IN (SELECT id FROM spvs WHERE organizationId = ${orgId})`);
        await db.execute(sql`DELETE FROM spvs WHERE organizationId = ${orgId}`);
        await db.execute(sql`DELETE FROM tasks WHERE organizationId = ${orgId}`);
        await db.execute(sql`DELETE FROM venture_team WHERE ventureId IN (SELECT ventureId FROM org_venture_access WHERE organizationId = ${orgId})`);
        await db.execute(sql`DELETE FROM venture_files WHERE ventureId IN (SELECT ventureId FROM org_venture_access WHERE organizationId = ${orgId})`);
        await db.execute(sql`DELETE FROM venture_folders WHERE ventureId IN (SELECT ventureId FROM org_venture_access WHERE organizationId = ${orgId})`);
        // Get venture IDs before deleting access records
        const [ventureRows] = await db.execute(sql`SELECT ventureId FROM org_venture_access WHERE organizationId = ${orgId}`);
        const vIds = ventureRows.map(r => r.ventureId);
        await db.execute(sql`DELETE FROM org_venture_access WHERE organizationId = ${orgId}`);
        await db.execute(sql`DELETE FROM invitations WHERE organizationId = ${orgId}`);
        await db.execute(sql`DELETE FROM team_members WHERE organizationId = ${orgId}`);
        await db.execute(sql`DELETE FROM activity_log WHERE activityOrgId = ${orgId}`);
        await db.execute(sql`DELETE FROM notifications WHERE notifOrgId = ${orgId}`);
        await db.execute(sql`DELETE FROM audit_log WHERE organizationId = ${orgId}`);
        // Delete ventures
        for (const vid of vIds) {
          await db.execute(sql`DELETE FROM ventures WHERE id = ${vid}`);
        }
        // Note: ventures already deleted above via org_venture_access, but some may be orphaned
        await db.execute(sql`DELETE FROM organizations WHERE id = ${orgId}`);
      }
    }
    console.log("  ✓ Cleanup done.\n");
  }

  // Tenant A: Meridian Holdings
  await db.execute(sql`INSERT INTO organizations (name, slug, type, orgStatus, primaryContactName, primaryContactEmail, aumRange, sectors, subscriptionTier) VALUES ('Meridian Holdings', 'meridian-holdings', 'client', 'active', 'Victoria Ashworth', 'v.ashworth@meridianholdings.com', '$500M+', ${JSON.stringify(["Real Estate", "Yacht"])}, 'enterprise')`);
  const [meridianRows] = await db.execute(sql`SELECT id FROM organizations WHERE slug = 'meridian-holdings'`);
  const meridianId = meridianRows[0].id;
  console.log(`    Meridian Holdings → org #${meridianId}`);

  // Tenant B: Volkov Capital
  await db.execute(sql`INSERT INTO organizations (name, slug, type, orgStatus, primaryContactName, primaryContactEmail, aumRange, sectors, subscriptionTier) VALUES ('Volkov Capital', 'volkov-capital', 'client', 'active', 'Dmitri Volkov', 'd.volkov@volkovcapital.com', '$100M-$500M', ${JSON.stringify(["F&B", "Entertainment"])}, 'growth')`);
  const [volkovRows] = await db.execute(sql`SELECT id FROM organizations WHERE slug = 'volkov-capital'`);
  const volkovId = volkovRows[0].id;
  console.log(`    Volkov Capital → org #${volkovId}`);

  // Tenant C: Apex Partners (partner org)
  await db.execute(sql`INSERT INTO organizations (name, slug, type, orgStatus, primaryContactName, primaryContactEmail, aumRange, sectors, subscriptionTier) VALUES ('Apex Partners', 'apex-partners', 'partner', 'active', 'Rachel Kim', 'r.kim@apexpartners.com', '<$100M', ${JSON.stringify(["Real Estate"])}, 'poc')`);
  const [apexRows] = await db.execute(sql`SELECT id FROM organizations WHERE slug = 'apex-partners'`);
  const apexId = apexRows[0].id;
  console.log(`    Apex Partners → org #${apexId}`);

  // ── 2. Create Ventures ───────────────────────────────────────────────
  console.log("\n  → Creating ventures...");

  // Meridian: 5 ventures (Real Estate + Yacht)
  const meridianVentures = [
    { name: "QA-Meridian Tower Dubai",    sector: "Real Estate", location: "UAE",     stage: "Active ventures", status: "In progress", priority: "High",   healthScore: 72 },
    { name: "QA-Meridian Marina Residences", sector: "Real Estate", location: "Greece", stage: "In Fundraising", status: "In progress", priority: "Medium", healthScore: 55 },
    { name: "QA-Meridian Riviera Estate", sector: "Real Estate", location: "France",  stage: "In Validation",  status: "In progress", priority: "Low",    healthScore: 40 },
    { name: "QA-Meridian Yacht Athena",   sector: "Yacht",       location: "Monaco",  stage: "Active ventures", status: "In progress", priority: "High",   healthScore: 80 },
    { name: "QA-Meridian Yacht Poseidon", sector: "Yacht",       location: "USA",     stage: "In Validation",  status: "On-Hold",     priority: "Medium", healthScore: 30 },
  ];

  const meridianVentureIds = [];
  for (const v of meridianVentures) {
    const slug = slugify(`qa-${v.name}-${Date.now()}-${Math.random().toString(36).slice(2,6)}`);
    await db.execute(sql`INSERT INTO ventures (name, sector, location, stage, status, priority, healthScore, slug) VALUES (${v.name}, ${v.sector}, ${v.location}, ${v.stage}, ${v.status}, ${v.priority}, ${v.healthScore}, ${slug})`);
    const [row] = await db.execute(sql`SELECT id FROM ventures WHERE slug = ${slug}`);
    meridianVentureIds.push(row[0].id);
    await db.execute(sql`INSERT INTO org_venture_access (organizationId, ventureId, orgPermission) VALUES (${meridianId}, ${row[0].id}, 'full')`);
    console.log(`    ${v.name} → venture #${row[0].id}`);
  }

  // Volkov: 3 ventures (F&B + Entertainment)
  const volkovVentures = [
    { name: "QA-Volkov Bistro Chain",   sector: "F&B",           location: "London",  stage: "Active ventures", status: "In progress", priority: "High",   healthScore: 65 },
    { name: "QA-Volkov Night Club",     sector: "Entertainment", location: "Berlin",  stage: "In Validation",  status: "In progress", priority: "Medium", healthScore: 50 },
    { name: "QA-Volkov Film Studio",    sector: "Entertainment", location: "LA",      stage: "In Fundraising", status: "In progress", priority: "Low",    healthScore: 35 },
  ];

  const volkovVentureIds = [];
  for (const v of volkovVentures) {
    const slug = slugify(`qa-${v.name}-${Date.now()}-${Math.random().toString(36).slice(2,6)}`);
    await db.execute(sql`INSERT INTO ventures (name, sector, location, stage, status, priority, healthScore, slug) VALUES (${v.name}, ${v.sector}, ${v.location}, ${v.stage}, ${v.status}, ${v.priority}, ${v.healthScore}, ${slug})`);
    const [row] = await db.execute(sql`SELECT id FROM ventures WHERE slug = ${slug}`);
    volkovVentureIds.push(row[0].id);
    await db.execute(sql`INSERT INTO org_venture_access (organizationId, ventureId, orgPermission) VALUES (${volkovId}, ${row[0].id}, 'full')`);
    console.log(`    ${v.name} → venture #${row[0].id}`);
  }

  // ── 3. Create SPVs ──────────────────────────────────────────────────
  console.log("\n  → Creating SPVs...");

  // Meridian: 3 SPVs
  const meridianSpvs = [
    { name: "QA-Meridian RE Fund I",    sector: "Real Estate", priority: "High",   stage: "Active deal",    notes: "Primary real estate fund for Meridian" },
    { name: "QA-Meridian Yacht SPV",    sector: "Yacht",       priority: "Medium", stage: "In negotiation", notes: "Yacht acquisition vehicle" },
    { name: "QA-Meridian Growth Fund",  sector: "Real Estate", priority: "Low",    stage: "Pipeline",       notes: "Growth equity vehicle" },
  ];

  const meridianSpvIds = [];
  for (const s of meridianSpvs) {
    const slug = slugify(`qa-${s.name}-${Date.now()}-${Math.random().toString(36).slice(2,6)}`);
    await db.execute(sql`INSERT INTO spvs (organizationId, name, sector, priority, stage, notes, slug) VALUES (${meridianId}, ${s.name}, ${s.sector}, ${s.priority}, ${s.stage}, ${s.notes}, ${slug})`);
    const [row] = await db.execute(sql`SELECT id FROM spvs WHERE slug = ${slug}`);
    meridianSpvIds.push(row[0].id);
    console.log(`    ${s.name} → spv #${row[0].id}`);
  }

  // Link SPV ventures
  await db.execute(sql`INSERT INTO spv_ventures (spvId, ventureId) VALUES (${meridianSpvIds[0]}, ${meridianVentureIds[0]})`);
  await db.execute(sql`INSERT INTO spv_ventures (spvId, ventureId) VALUES (${meridianSpvIds[0]}, ${meridianVentureIds[1]})`);
  await db.execute(sql`INSERT INTO spv_ventures (spvId, ventureId) VALUES (${meridianSpvIds[0]}, ${meridianVentureIds[2]})`);
  await db.execute(sql`INSERT INTO spv_ventures (spvId, ventureId) VALUES (${meridianSpvIds[1]}, ${meridianVentureIds[3]})`);
  await db.execute(sql`INSERT INTO spv_ventures (spvId, ventureId) VALUES (${meridianSpvIds[1]}, ${meridianVentureIds[4]})`);

  // Volkov: 1 SPV
  const volkovSpvSlug = slugify(`qa-volkov-entertainment-spv-${Date.now()}`);
  await db.execute(sql`INSERT INTO spvs (organizationId, name, sector, priority, stage, notes, slug) VALUES (${volkovId}, 'QA-Volkov Entertainment SPV', 'Entertainment', 'Medium', 'Active deal', 'Entertainment sector vehicle', ${volkovSpvSlug})`);
  const [volkovSpvRow] = await db.execute(sql`SELECT id FROM spvs WHERE slug = ${volkovSpvSlug}`);
  const volkovSpvId = volkovSpvRow[0].id;
  await db.execute(sql`INSERT INTO spv_ventures (spvId, ventureId) VALUES (${volkovSpvId}, ${volkovVentureIds[1]})`);
  await db.execute(sql`INSERT INTO spv_ventures (spvId, ventureId) VALUES (${volkovSpvId}, ${volkovVentureIds[2]})`);
  console.log(`    QA-Volkov Entertainment SPV → spv #${volkovSpvId}`);

  // ── 4. Create Tasks ──────────────────────────────────────────────────
  console.log("\n  → Creating tasks (40+ for Meridian, 20 for Volkov)...");

  // Meridian: 42 tasks across ventures
  const meridianTasks = [
    // Venture 0: Tower Dubai (10 tasks, mixed statuses)
    { title: "QA-Finalize site acquisition agreement",   ventureId: meridianVentureIds[0], status: "complete", dueDate: daysAgo(10), priority: "High" },
    { title: "QA-Submit planning permit application",    ventureId: meridianVentureIds[0], status: "complete", dueDate: daysAgo(5),  priority: "High" },
    { title: "QA-Environmental impact assessment",       ventureId: meridianVentureIds[0], status: "open",     dueDate: daysFromNow(7),  priority: "Medium" },
    { title: "QA-Structural engineering review",         ventureId: meridianVentureIds[0], status: "open",     dueDate: daysFromNow(14), priority: "Medium" },
    { title: "QA-Contractor shortlist and RFP",          ventureId: meridianVentureIds[0], status: "open",     dueDate: daysFromNow(21), priority: "Low" },
    { title: "QA-Foundation design approval",            ventureId: meridianVentureIds[0], status: "open",     dueDate: daysFromNow(30), priority: "Medium" },
    { title: "QA-Investor update deck Q1",               ventureId: meridianVentureIds[0], status: "open",     dueDate: daysAgo(3),  priority: "High" },  // overdue
    { title: "QA-Legal review of JV terms",              ventureId: meridianVentureIds[0], status: "open",     dueDate: daysAgo(7),  priority: "High" },  // overdue
    { title: "QA-Insurance policy renewal",              ventureId: meridianVentureIds[0], status: "open",     dueDate: daysFromNow(5),  priority: "Low" },
    { title: "QA-Stakeholder quarterly meeting",         ventureId: meridianVentureIds[0], status: "open",     dueDate: daysFromNow(3),  priority: "Medium" },

    // Venture 1: Marina Residences (8 tasks)
    { title: "QA-Market feasibility study",              ventureId: meridianVentureIds[1], status: "complete", dueDate: daysAgo(15), priority: "High" },
    { title: "QA-Architect selection process",           ventureId: meridianVentureIds[1], status: "complete", dueDate: daysAgo(8),  priority: "Medium" },
    { title: "QA-Draft investor memorandum",             ventureId: meridianVentureIds[1], status: "open",     dueDate: daysFromNow(10), priority: "High" },
    { title: "QA-Regulatory compliance check",           ventureId: meridianVentureIds[1], status: "open",     dueDate: daysFromNow(5),  priority: "Medium" },
    { title: "QA-Financial model update",                ventureId: meridianVentureIds[1], status: "open",     dueDate: daysAgo(2),  priority: "High" },  // overdue
    { title: "QA-Site survey coordination",              ventureId: meridianVentureIds[1], status: "open",     dueDate: daysFromNow(12), priority: "Low" },
    { title: "QA-Local partner due diligence",           ventureId: meridianVentureIds[1], status: "open",     dueDate: daysFromNow(8),  priority: "Medium" },
    { title: "QA-Preliminary design review",             ventureId: meridianVentureIds[1], status: "open",     dueDate: daysFromNow(20), priority: "Low" },

    // Venture 2: Riviera Estate (8 tasks)
    { title: "QA-Land title verification",               ventureId: meridianVentureIds[2], status: "open",     dueDate: daysFromNow(5),  priority: "High" },
    { title: "QA-Zoning compliance review",              ventureId: meridianVentureIds[2], status: "open",     dueDate: daysFromNow(10), priority: "Medium" },
    { title: "QA-Heritage site assessment",              ventureId: meridianVentureIds[2], status: "open",     dueDate: daysFromNow(15), priority: "Low" },
    { title: "QA-Concept design brief",                  ventureId: meridianVentureIds[2], status: "open",     dueDate: daysFromNow(20), priority: "Medium" },
    { title: "QA-Tax structure optimization",            ventureId: meridianVentureIds[2], status: "open",     dueDate: daysAgo(1),  priority: "High" },  // overdue
    { title: "QA-Local counsel engagement",              ventureId: meridianVentureIds[2], status: "open",     dueDate: daysFromNow(7),  priority: "Medium" },
    { title: "QA-Preliminary cost estimate",             ventureId: meridianVentureIds[2], status: "open",     dueDate: daysFromNow(25), priority: "Low" },
    { title: "QA-Investor roadshow preparation",         ventureId: meridianVentureIds[2], status: "open",     dueDate: daysFromNow(30), priority: "Medium" },

    // Venture 3: Yacht Athena (8 tasks)
    { title: "QA-Hull inspection report",                ventureId: meridianVentureIds[3], status: "complete", dueDate: daysAgo(20), priority: "High" },
    { title: "QA-Engine overhaul schedule",              ventureId: meridianVentureIds[3], status: "complete", dueDate: daysAgo(12), priority: "High" },
    { title: "QA-Interior refit design approval",        ventureId: meridianVentureIds[3], status: "complete", dueDate: daysAgo(5),  priority: "Medium" },
    { title: "QA-Charter license application",           ventureId: meridianVentureIds[3], status: "open",     dueDate: daysFromNow(10), priority: "High" },
    { title: "QA-Crew recruitment plan",                 ventureId: meridianVentureIds[3], status: "open",     dueDate: daysFromNow(15), priority: "Medium" },
    { title: "QA-Insurance underwriting",                ventureId: meridianVentureIds[3], status: "open",     dueDate: daysFromNow(8),  priority: "Medium" },
    { title: "QA-Flag state registration",               ventureId: meridianVentureIds[3], status: "open",     dueDate: daysAgo(4),  priority: "High" },  // overdue
    { title: "QA-Sea trial scheduling",                  ventureId: meridianVentureIds[3], status: "open",     dueDate: daysFromNow(25), priority: "Low" },

    // Venture 4: Yacht Poseidon (8 tasks)
    { title: "QA-Vessel valuation report",               ventureId: meridianVentureIds[4], status: "open",     dueDate: daysFromNow(5),  priority: "High" },
    { title: "QA-Survey and classification",             ventureId: meridianVentureIds[4], status: "open",     dueDate: daysFromNow(10), priority: "Medium" },
    { title: "QA-Broker engagement terms",               ventureId: meridianVentureIds[4], status: "open",     dueDate: daysFromNow(3),  priority: "Medium" },
    { title: "QA-Market comparable analysis",            ventureId: meridianVentureIds[4], status: "open",     dueDate: daysAgo(6),  priority: "High" },  // overdue
    { title: "QA-Ownership structure review",            ventureId: meridianVentureIds[4], status: "open",     dueDate: daysFromNow(15), priority: "Low" },
    { title: "QA-Maintenance log audit",                 ventureId: meridianVentureIds[4], status: "open",     dueDate: daysFromNow(20), priority: "Medium" },
    { title: "QA-Dry dock scheduling",                   ventureId: meridianVentureIds[4], status: "open",     dueDate: daysFromNow(30), priority: "Low" },
    { title: "QA-Regulatory flag review",                ventureId: meridianVentureIds[4], status: "open",     dueDate: daysFromNow(12), priority: "Medium" },
  ];

  for (const t of meridianTasks) {
    await db.execute(sql`INSERT INTO tasks (organizationId, title, ventureId, status, dueDate, priority) VALUES (${meridianId}, ${t.title}, ${t.ventureId}, ${t.status}, ${t.dueDate}, ${t.priority})`);
  }
  console.log(`    Meridian: ${meridianTasks.length} tasks created`);

  // Volkov: 20 tasks
  const volkovTasks = [
    { title: "QA-Restaurant concept finalization",       ventureId: volkovVentureIds[0], status: "complete", dueDate: daysAgo(10), priority: "High" },
    { title: "QA-Menu development and testing",          ventureId: volkovVentureIds[0], status: "complete", dueDate: daysAgo(5),  priority: "Medium" },
    { title: "QA-Lease negotiation for flagship",        ventureId: volkovVentureIds[0], status: "open",     dueDate: daysFromNow(7),  priority: "High" },
    { title: "QA-Interior design brief",                 ventureId: volkovVentureIds[0], status: "open",     dueDate: daysFromNow(14), priority: "Medium" },
    { title: "QA-Health and safety compliance",          ventureId: volkovVentureIds[0], status: "open",     dueDate: daysAgo(2),  priority: "High" },  // overdue
    { title: "QA-Staff recruitment plan",                ventureId: volkovVentureIds[0], status: "open",     dueDate: daysFromNow(10), priority: "Medium" },
    { title: "QA-Supply chain partnerships",             ventureId: volkovVentureIds[0], status: "open",     dueDate: daysFromNow(20), priority: "Low" },

    { title: "QA-Venue scouting report",                 ventureId: volkovVentureIds[1], status: "complete", dueDate: daysAgo(8),  priority: "High" },
    { title: "QA-Sound system specification",            ventureId: volkovVentureIds[1], status: "open",     dueDate: daysFromNow(5),  priority: "Medium" },
    { title: "QA-Licensing and permits",                 ventureId: volkovVentureIds[1], status: "open",     dueDate: daysFromNow(10), priority: "High" },
    { title: "QA-Brand identity development",            ventureId: volkovVentureIds[1], status: "open",     dueDate: daysFromNow(15), priority: "Medium" },
    { title: "QA-Security plan and staffing",            ventureId: volkovVentureIds[1], status: "open",     dueDate: daysFromNow(8),  priority: "Medium" },
    { title: "QA-Opening night event planning",          ventureId: volkovVentureIds[1], status: "open",     dueDate: daysFromNow(25), priority: "Low" },

    { title: "QA-Script development pipeline",           ventureId: volkovVentureIds[2], status: "open",     dueDate: daysFromNow(10), priority: "High" },
    { title: "QA-Studio space lease review",             ventureId: volkovVentureIds[2], status: "open",     dueDate: daysFromNow(15), priority: "Medium" },
    { title: "QA-Equipment procurement plan",            ventureId: volkovVentureIds[2], status: "open",     dueDate: daysFromNow(20), priority: "Low" },
    { title: "QA-Distribution deal exploration",         ventureId: volkovVentureIds[2], status: "open",     dueDate: daysFromNow(30), priority: "Medium" },
    { title: "QA-Tax incentive application",             ventureId: volkovVentureIds[2], status: "open",     dueDate: daysAgo(5),  priority: "High" },  // overdue
    { title: "QA-Talent scouting framework",             ventureId: volkovVentureIds[2], status: "open",     dueDate: daysFromNow(12), priority: "Medium" },
    { title: "QA-Investor pitch deck",                   ventureId: volkovVentureIds[2], status: "open",     dueDate: daysFromNow(7),  priority: "High" },
  ];

  for (const t of volkovTasks) {
    await db.execute(sql`INSERT INTO tasks (organizationId, title, ventureId, status, dueDate, priority) VALUES (${volkovId}, ${t.title}, ${t.ventureId}, ${t.status}, ${t.dueDate}, ${t.priority})`);
  }
  console.log(`    Volkov: ${volkovTasks.length} tasks created`);

  // ── 5. Create Distributions ──────────────────────────────────────────
  console.log("\n  → Creating distributions...");

  const meridianDistributions = [
    { name: "QA-Q4 2025 Profit Share",       fund: "Meridian RE Fund I",    amount: 350000, currency: "USD", type: "Profit",            status: "Paid",      method: "Wire", distributionDate: daysAgo(60), notes: "Quarterly profit share" },
    { name: "QA-Q1 2026 Dividend",           fund: "Meridian RE Fund I",    amount: 125000, currency: "EUR", type: "Dividend",           status: "Paid",      method: "Wire", distributionDate: daysAgo(30), notes: "Semi-annual dividend" },
    { name: "QA-Yacht Charter Revenue Q4",   fund: "Meridian Yacht SPV",    amount: 85000,  currency: "GBP", type: "Revenue Share",      status: "Paid",      method: "Wire", distributionDate: daysAgo(45), notes: "Charter revenue distribution" },
    { name: "QA-Return of Capital - Alpha",  fund: "Meridian Growth Fund",  amount: 200000, currency: "USD", type: "Return of Capital",  status: "Paid",      method: "Wire", distributionDate: daysAgo(90), notes: "Exit proceeds" },
    { name: "QA-Q2 2026 Scheduled Dividend", fund: "Meridian RE Fund I",    amount: 150000, currency: "USD", type: "Dividend",           status: "Scheduled", method: "Wire", distributionDate: daysFromNow(30), notes: "Upcoming quarterly" },
    { name: "QA-Yacht Refit Drawdown",       fund: "Meridian Yacht SPV",    amount: 75000,  currency: "CHF", type: "Capital Call",        status: "Scheduled", method: "Wire", distributionDate: daysFromNow(15), notes: "Refit capital call" },
    { name: "QA-Cancelled Distribution",     fund: "Meridian Growth Fund",  amount: 50000,  currency: "USD", type: "Profit",             status: "Cancelled", method: "Wire", distributionDate: daysAgo(10), notes: "Cancelled due to review" },
    { name: "QA-AED Distribution Test",      fund: "Meridian RE Fund I",    amount: 500000, currency: "AED", type: "Profit",             status: "Paid",      method: "Wire", distributionDate: daysAgo(20), notes: "AED currency test" },
  ];

  for (const d of meridianDistributions) {
    await db.execute(sql`INSERT INTO distributions (organizationId, name, fund, amount, currency, type, status, method, distributionDate, notes) VALUES (${meridianId}, ${d.name}, ${d.fund}, ${d.amount}, ${d.currency}, ${d.type}, ${d.status}, ${d.method}, ${d.distributionDate}, ${d.notes})`);
  }
  console.log(`    Meridian: ${meridianDistributions.length} distributions created`);

  const volkovDistributions = [
    { name: "QA-F&B Revenue Share Q4",       fund: "Volkov F&B Fund",       amount: 95000,  currency: "GBP", type: "Revenue Share",      status: "Paid",      method: "Wire", distributionDate: daysAgo(40), notes: "Restaurant revenue" },
    { name: "QA-Entertainment Dividend",     fund: "Volkov Entertainment",  amount: 60000,  currency: "EUR", type: "Dividend",           status: "Paid",      method: "Wire", distributionDate: daysAgo(25), notes: "Quarterly dividend" },
    { name: "QA-Scheduled Capital Call",     fund: "Volkov F&B Fund",       amount: 120000, currency: "USD", type: "Capital Call",        status: "Scheduled", method: "Wire", distributionDate: daysFromNow(20), notes: "Expansion capital" },
    { name: "QA-JPY Distribution Test",      fund: "Volkov Entertainment",  amount: 8000000, currency: "JPY", type: "Profit",            status: "Paid",      method: "Wire", distributionDate: daysAgo(15), notes: "JPY currency test" },
  ];

  for (const d of volkovDistributions) {
    await db.execute(sql`INSERT INTO distributions (organizationId, name, fund, amount, currency, type, status, method, distributionDate, notes) VALUES (${volkovId}, ${d.name}, ${d.fund}, ${d.amount}, ${d.currency}, ${d.type}, ${d.status}, ${d.method}, ${d.distributionDate}, ${d.notes})`);
  }
  console.log(`    Volkov: ${volkovDistributions.length} distributions created`);

  // ── 6. Create Team Members ───────────────────────────────────────────
  console.log("\n  → Creating team members...");

  // Meridian: 2 client users + 1 manager
  const meridianTeam = [
    { name: "Victoria Ashworth",  role: "Principal",      memberFunction: "Investment Oversight", type: "Client", email: "v.ashworth@meridianholdings.com", systemRole: "client" },
    { name: "James Whitfield",    role: "Analyst",        memberFunction: "Financial Analysis",   type: "Client", email: "j.whitfield@meridianholdings.com", systemRole: "client" },
    { name: "Sarah Chen",         role: "Portfolio Mgr",  memberFunction: "Portfolio Management", type: "Client", email: "s.chen@meridianholdings.com", systemRole: "manager" },
  ];

  for (const m of meridianTeam) {
    const slug = slugify(`qa-${m.name}-${Date.now()}-${Math.random().toString(36).slice(2,5)}`);
    await db.execute(sql`INSERT INTO team_members (name, role, memberFunction, type, organizationId, email, systemRole, status, slug, invitationStatus) VALUES (${m.name}, ${m.role}, ${m.memberFunction}, ${m.type}, ${meridianId}, ${m.email}, ${m.systemRole}, 'Active', ${slug}, 'accepted')`);
    console.log(`    ${m.name} (${m.systemRole}) → Meridian`);
  }

  // Volkov: 1 client user
  const volkovTeam = [
    { name: "Dmitri Volkov",      role: "Founder",        memberFunction: "Strategy",             type: "Client", email: "d.volkov@volkovcapital.com", systemRole: "client" },
  ];

  for (const m of volkovTeam) {
    const slug = slugify(`qa-${m.name}-${Date.now()}-${Math.random().toString(36).slice(2,5)}`);
    await db.execute(sql`INSERT INTO team_members (name, role, memberFunction, type, organizationId, email, systemRole, status, slug, invitationStatus) VALUES (${m.name}, ${m.role}, ${m.memberFunction}, ${m.type}, ${volkovId}, ${m.email}, ${m.systemRole}, 'Active', ${slug}, 'accepted')`);
    console.log(`    ${m.name} (${m.systemRole}) → Volkov`);
  }

  // Apex: 1 partner user
  const apexTeam = [
    { name: "Rachel Kim",         role: "Partner",        memberFunction: "Deal Sourcing",        type: "External Partner", email: "r.kim@apexpartners.com", systemRole: "partner" },
  ];

  for (const m of apexTeam) {
    const slug = slugify(`qa-${m.name}-${Date.now()}-${Math.random().toString(36).slice(2,5)}`);
    await db.execute(sql`INSERT INTO team_members (name, role, memberFunction, type, organizationId, email, systemRole, status, slug, invitationStatus) VALUES (${m.name}, ${m.role}, ${m.memberFunction}, ${m.type}, ${apexId}, ${m.email}, ${m.systemRole}, 'Active', ${slug}, 'accepted')`);
    console.log(`    ${m.name} (${m.systemRole}) → Apex`);
  }

  // ── 7. Grant Apex Partners access to 2 Meridian ventures ─────────────
  console.log("\n  → Granting Apex Partners access to Meridian ventures...");
  await db.execute(sql`INSERT INTO org_venture_access (organizationId, ventureId, orgPermission) VALUES (${apexId}, ${meridianVentureIds[0]}, 'view')`);
  await db.execute(sql`INSERT INTO org_venture_access (organizationId, ventureId, orgPermission) VALUES (${apexId}, ${meridianVentureIds[1]}, 'view')`);
  console.log(`    Apex → Tower Dubai (#${meridianVentureIds[0]}) + Marina Residences (#${meridianVentureIds[1]})`);

  // ── 8. Create Agent Configs ──────────────────────────────────────────
  console.log("\n  → Creating agent configs...");
  for (const orgId of [meridianId, volkovId]) {
    await db.execute(sql`INSERT INTO client_agent_config (organizationId, velocityAgentEnabled, complianceAgentEnabled, dealFlowAgentEnabled, orchestratorEnabled, overdueDaysThreshold, distributionWarningDays, healthScoreAlertThreshold, pollingIntervalMinutes) VALUES (${orgId}, true, true, true, true, 3, 7, 40, 60) ON DUPLICATE KEY UPDATE velocityAgentEnabled = true`);
  }
  console.log(`    Agent configs created for Meridian + Volkov`);

  // ── 9. Create Activity Log Entries ───────────────────────────────────
  console.log("\n  → Creating activity log entries...");
  const activities = [
    { entityType: "venture", entityName: "QA-Meridian Tower Dubai",    action: "Venture Created",      detail: "New venture created via onboarding", userName: "Shwan Lee",    sector: "Real Estate", orgId: meridianId, source: "atlas_ops" },
    { entityType: "venture", entityName: "QA-Meridian Tower Dubai",    action: "Stage Advanced",       detail: "Advanced from In Validation to Active ventures", userName: "System", sector: "Real Estate", orgId: meridianId, source: "system" },
    { entityType: "task",    entityName: "QA-Finalize site acquisition", action: "Task Completed",     detail: "Marked complete by operator",       userName: "Chris Phelps", sector: "Real Estate", orgId: meridianId, source: "atlas_ops" },
    { entityType: "distribution", entityName: "QA-Q4 2025 Profit Share", action: "Distribution Paid", detail: "$350,000 paid via wire",             userName: "Brian Chen",   sector: "Real Estate", orgId: meridianId, source: "client_business" },
    { entityType: "venture", entityName: "QA-Volkov Bistro Chain",     action: "Venture Created",      detail: "New venture created via onboarding", userName: "Shwan Lee",    sector: "F&B",         orgId: volkovId,   source: "atlas_ops" },
    { entityType: "task",    entityName: "QA-Restaurant concept",      action: "Task Completed",       detail: "Concept finalized",                 userName: "Michael Adenew", sector: "F&B",       orgId: volkovId,   source: "atlas_ops" },
  ];

  for (const a of activities) {
    await db.execute(sql`INSERT INTO activity_log (entityType, entityName, action, detail, userName, sector, activitySource, activityOrgId) VALUES (${a.entityType}, ${a.entityName}, ${a.action}, ${a.detail}, ${a.userName}, ${a.sector}, ${a.source}, ${a.orgId})`);
  }
  console.log(`    ${activities.length} activity entries created`);

  // ── Summary ──────────────────────────────────────────────────────────
  console.log("\n✅ QA seed complete!");
  console.log("   ┌─────────────────────┬──────────┬──────────┬──────────┐");
  console.log("   │                     │ Meridian │ Volkov   │ Apex     │");
  console.log("   ├─────────────────────┼──────────┼──────────┼──────────┤");
  console.log(`   │ Org ID              │ ${String(meridianId).padEnd(8)} │ ${String(volkovId).padEnd(8)} │ ${String(apexId).padEnd(8)} │`);
  console.log(`   │ Ventures            │ 5        │ 3        │ 2 (view) │`);
  console.log(`   │ SPVs                │ 3        │ 1        │ 0        │`);
  console.log(`   │ Tasks               │ ${String(meridianTasks.length).padEnd(8)} │ ${String(volkovTasks.length).padEnd(8)} │ 0        │`);
  console.log(`   │ Distributions       │ ${String(meridianDistributions.length).padEnd(8)} │ ${String(volkovDistributions.length).padEnd(8)} │ 0        │`);
  console.log(`   │ Team Members        │ 3        │ 1        │ 1        │`);
  console.log("   └─────────────────────┴──────────┴──────────┴──────────┘");

  process.exit(0);
}

seed().catch(err => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
