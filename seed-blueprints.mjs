// Seed default blueprints for Royalton's 6 active sectors
// Each sector gets 5-8 standard process steps that agents use for operational context
import 'dotenv/config';
import mysql from 'mysql2/promise';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) { console.error("DATABASE_URL not set"); process.exit(1); }

const url = new URL(DATABASE_URL);
const conn = await mysql.createConnection({
  host: url.hostname,
  port: parseInt(url.port) || 4000,
  user: url.username,
  password: url.password,
  database: url.pathname.slice(1).split('?')[0],
  ssl: { rejectUnauthorized: true },
});

// Royalton Venture Holding = org id 2
const ORG_ID = 2;

const BLUEPRINTS = [
  {
    sector: "Real Estate",
    blueprintName: "Real Estate Venture Operations",
    steps: [
      { stageName: "Acquisition", stepName: "Lease renewal tracking & deadline monitoring", stepOrder: 1, stageOrder: 1, isBlocking: true, whoOwns: "Legal Team", typicalDays: 30 },
      { stageName: "Acquisition", stepName: "Property due diligence & valuation review", stepOrder: 2, stageOrder: 1, isBlocking: true, whoOwns: "Investment Team", typicalDays: 21 },
      { stageName: "Compliance", stepName: "Regulatory compliance deadline monitoring", stepOrder: 1, stageOrder: 2, isBlocking: true, whoOwns: "Compliance Officer", typicalDays: 14 },
      { stageName: "Compliance", stepName: "Building permit & zoning approval tracking", stepOrder: 2, stageOrder: 2, isBlocking: false, whoOwns: "Legal Team", typicalDays: 45 },
      { stageName: "Operations", stepName: "Vendor invoice approval & payment processing", stepOrder: 1, stageOrder: 3, isBlocking: false, whoOwns: "Finance Team", typicalDays: 7 },
      { stageName: "Operations", stepName: "Maintenance coordination & contractor scheduling", stepOrder: 2, stageOrder: 3, isBlocking: false, whoOwns: "Operations Manager", typicalDays: 5 },
      { stageName: "Reporting", stepName: "Board reporting & investor update preparation", stepOrder: 1, stageOrder: 4, isBlocking: false, whoOwns: "CFO", typicalDays: 10 },
      { stageName: "Reporting", stepName: "Quarterly financial reconciliation", stepOrder: 2, stageOrder: 4, isBlocking: false, whoOwns: "Finance Team", typicalDays: 14 },
    ],
  },
  {
    sector: "Yacht",
    blueprintName: "Yacht Venture Operations",
    steps: [
      { stageName: "Procurement", stepName: "Vessel acquisition & survey coordination", stepOrder: 1, stageOrder: 1, isBlocking: true, whoOwns: "Marine Surveyor", typicalDays: 30 },
      { stageName: "Procurement", stepName: "Flag state registration & documentation", stepOrder: 2, stageOrder: 1, isBlocking: true, whoOwns: "Legal Team", typicalDays: 21 },
      { stageName: "Maintenance", stepName: "Scheduled maintenance & dry dock planning", stepOrder: 1, stageOrder: 2, isBlocking: true, whoOwns: "Captain / Marine Engineer", typicalDays: 14 },
      { stageName: "Maintenance", stepName: "Crew certification & safety compliance", stepOrder: 2, stageOrder: 2, isBlocking: true, whoOwns: "HR / Marine Safety", typicalDays: 10 },
      { stageName: "Operations", stepName: "Charter booking management & guest coordination", stepOrder: 1, stageOrder: 3, isBlocking: false, whoOwns: "Charter Manager", typicalDays: 7 },
      { stageName: "Operations", stepName: "Marina berth & port fee management", stepOrder: 2, stageOrder: 3, isBlocking: false, whoOwns: "Operations Manager", typicalDays: 5 },
      { stageName: "Financial", stepName: "Insurance renewal & claims processing", stepOrder: 1, stageOrder: 4, isBlocking: false, whoOwns: "Insurance Broker", typicalDays: 30 },
    ],
  },
  {
    sector: "F&B",
    blueprintName: "Food & Beverage Venture Operations",
    steps: [
      { stageName: "Setup", stepName: "Venue licensing & health permit acquisition", stepOrder: 1, stageOrder: 1, isBlocking: true, whoOwns: "Legal Team", typicalDays: 30 },
      { stageName: "Setup", stepName: "Supplier contract negotiation & onboarding", stepOrder: 2, stageOrder: 1, isBlocking: true, whoOwns: "Procurement Manager", typicalDays: 14 },
      { stageName: "Operations", stepName: "Inventory management & reorder automation", stepOrder: 1, stageOrder: 2, isBlocking: false, whoOwns: "Kitchen Manager", typicalDays: 3 },
      { stageName: "Operations", stepName: "Staff scheduling & labor cost optimization", stepOrder: 2, stageOrder: 2, isBlocking: false, whoOwns: "General Manager", typicalDays: 7 },
      { stageName: "Compliance", stepName: "Health & safety inspection preparation", stepOrder: 1, stageOrder: 3, isBlocking: true, whoOwns: "Compliance Officer", typicalDays: 14 },
      { stageName: "Financial", stepName: "Revenue reporting & margin analysis", stepOrder: 1, stageOrder: 4, isBlocking: false, whoOwns: "Finance Team", typicalDays: 7 },
      { stageName: "Financial", stepName: "Franchise fee & royalty payment tracking", stepOrder: 2, stageOrder: 4, isBlocking: false, whoOwns: "Finance Team", typicalDays: 10 },
    ],
  },
  {
    sector: "Hospitality",
    blueprintName: "Hospitality Venture Operations",
    steps: [
      { stageName: "Development", stepName: "Property development & construction milestone tracking", stepOrder: 1, stageOrder: 1, isBlocking: true, whoOwns: "Project Manager", typicalDays: 60 },
      { stageName: "Development", stepName: "Interior design & FF&E procurement coordination", stepOrder: 2, stageOrder: 1, isBlocking: false, whoOwns: "Design Team", typicalDays: 45 },
      { stageName: "Licensing", stepName: "Hotel operating license & tourism board registration", stepOrder: 1, stageOrder: 2, isBlocking: true, whoOwns: "Legal Team", typicalDays: 30 },
      { stageName: "Operations", stepName: "OTA channel management & rate optimization", stepOrder: 1, stageOrder: 3, isBlocking: false, whoOwns: "Revenue Manager", typicalDays: 7 },
      { stageName: "Operations", stepName: "Guest experience & service quality monitoring", stepOrder: 2, stageOrder: 3, isBlocking: false, whoOwns: "General Manager", typicalDays: 3 },
      { stageName: "Staffing", stepName: "Recruitment pipeline & training program management", stepOrder: 1, stageOrder: 4, isBlocking: false, whoOwns: "HR Director", typicalDays: 21 },
      { stageName: "Financial", stepName: "RevPAR tracking & investor reporting", stepOrder: 1, stageOrder: 5, isBlocking: false, whoOwns: "CFO", typicalDays: 10 },
      { stageName: "Financial", stepName: "Capital expenditure approval & budget reconciliation", stepOrder: 2, stageOrder: 5, isBlocking: false, whoOwns: "Finance Team", typicalDays: 14 },
    ],
  },
  {
    sector: "Oil & Gas",
    blueprintName: "Oil & Gas Venture Operations",
    steps: [
      { stageName: "Exploration", stepName: "License block acquisition & geological survey coordination", stepOrder: 1, stageOrder: 1, isBlocking: true, whoOwns: "Exploration Manager", typicalDays: 90 },
      { stageName: "Exploration", stepName: "Environmental impact assessment & regulatory filing", stepOrder: 2, stageOrder: 1, isBlocking: true, whoOwns: "Environmental Team", typicalDays: 60 },
      { stageName: "Development", stepName: "Drilling contractor procurement & rig scheduling", stepOrder: 1, stageOrder: 2, isBlocking: true, whoOwns: "Operations Director", typicalDays: 45 },
      { stageName: "Development", stepName: "Pipeline infrastructure & transport logistics", stepOrder: 2, stageOrder: 2, isBlocking: false, whoOwns: "Engineering Team", typicalDays: 60 },
      { stageName: "Compliance", stepName: "HSE compliance monitoring & incident reporting", stepOrder: 1, stageOrder: 3, isBlocking: true, whoOwns: "HSE Manager", typicalDays: 7 },
      { stageName: "Operations", stepName: "Production volume monitoring & optimization", stepOrder: 1, stageOrder: 4, isBlocking: false, whoOwns: "Production Engineer", typicalDays: 3 },
      { stageName: "Financial", stepName: "Royalty payment calculation & government reporting", stepOrder: 1, stageOrder: 5, isBlocking: false, whoOwns: "Finance Team", typicalDays: 14 },
      { stageName: "Financial", stepName: "Joint venture partner reconciliation", stepOrder: 2, stageOrder: 5, isBlocking: false, whoOwns: "CFO", typicalDays: 21 },
    ],
  },
  {
    sector: "Energy",
    blueprintName: "Energy Venture Operations",
    steps: [
      { stageName: "Development", stepName: "Power purchase agreement negotiation & execution", stepOrder: 1, stageOrder: 1, isBlocking: true, whoOwns: "Business Development", typicalDays: 60 },
      { stageName: "Development", stepName: "Grid connection application & technical assessment", stepOrder: 2, stageOrder: 1, isBlocking: true, whoOwns: "Engineering Team", typicalDays: 45 },
      { stageName: "Permitting", stepName: "Environmental permit & land use authorization", stepOrder: 1, stageOrder: 2, isBlocking: true, whoOwns: "Legal Team", typicalDays: 30 },
      { stageName: "Construction", stepName: "EPC contractor management & milestone tracking", stepOrder: 1, stageOrder: 3, isBlocking: true, whoOwns: "Project Manager", typicalDays: 90 },
      { stageName: "Construction", stepName: "Equipment procurement & delivery coordination", stepOrder: 2, stageOrder: 3, isBlocking: false, whoOwns: "Procurement Manager", typicalDays: 60 },
      { stageName: "Operations", stepName: "Plant performance monitoring & maintenance scheduling", stepOrder: 1, stageOrder: 4, isBlocking: false, whoOwns: "Plant Manager", typicalDays: 7 },
      { stageName: "Financial", stepName: "Carbon credit tracking & renewable energy certificate management", stepOrder: 1, stageOrder: 5, isBlocking: false, whoOwns: "Sustainability Officer", typicalDays: 14 },
    ],
  },
];

console.log("Seeding blueprints for Royalton Venture Holding (org_id=2)...\n");

for (const bp of BLUEPRINTS) {
  // Insert template using actual DB columns
  const [templateResult] = await conn.execute(
    `INSERT INTO process_templates (organizationId, sector, blueprintName, extractionSource, confidence)
     VALUES (?, ?, ?, 'manual', 'High')`,
    [ORG_ID, bp.sector, bp.blueprintName]
  );
  const templateId = templateResult.insertId;
  console.log(`✓ ${bp.sector}: "${bp.blueprintName}" (id=${templateId})`);

  // Insert steps using actual DB columns
  for (const step of bp.steps) {
    await conn.execute(
      `INSERT INTO process_steps (templateId, stageName, stepName, stepOrder, stageOrder, isBlocking, whoOwns, typicalDays)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [templateId, step.stageName, step.stepName, step.stepOrder, step.stageOrder, step.isBlocking ? 1 : 0, step.whoOwns, step.typicalDays]
    );
  }
  console.log(`  → ${bp.steps.length} steps inserted`);
}

console.log("\n✅ Blueprint seeding complete!");
console.log(`   ${BLUEPRINTS.length} sectors, ${BLUEPRINTS.reduce((a, b) => a + b.steps.length, 0)} total steps`);

await conn.end();
