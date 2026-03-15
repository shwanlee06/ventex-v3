import { drizzle } from "drizzle-orm/mysql2";
import { sql } from "drizzle-orm";
import dotenv from "dotenv";
dotenv.config();

const db = drizzle(process.env.DATABASE_URL);

function slugify(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

// ── Seed Data ──────────────────────────────────────────────────────────

const VENTURES_DATA = [
  { legacyId: "recDQd3Euhh8f2zjE", name: "Nammos - Barcelona", sector: "Real Estate", stage: "In Validation", status: "In progress", location: "Spain", priority: "Medium" },
  { legacyId: "recEnlRnvbzK5WTDW", name: "Nammos - Lagonissi", sector: "Real Estate", stage: "In Validation", status: "In progress", location: "Greece", priority: "High" },
  { legacyId: "recGv6fMY6U0qawuU", name: "Muscat Bay", sector: "Real Estate", stage: "Active ventures", status: "In progress", location: "Oman" },
  { legacyId: "recLPHfRcbEJFEYpP", name: "Chekka Land - Resort", sector: "Real Estate", stage: "Active ventures", status: "In progress", location: "Lebanon" },
  { legacyId: "recNuXb3Gg2YKWJ6U", name: "Shady Hotel", sector: "Real Estate", stage: "Active ventures", status: "In progress", location: "Oman" },
  { legacyId: "receY8DMb82SYrOOe", name: "Nammos - Watson Island", sector: "Real Estate", stage: "In Validation", status: "In progress", location: "USA", currentStatus: "Draft the deck", nextStep: "Draft the deck", nextMilestone: "2026-03-04" },
  { legacyId: "rechKfDosHAlsgeQP", name: "Zarka City", sector: "Real Estate", stage: "In Validation", status: "In progress", location: "Oman", currentStatus: "Distribution and finalization of the working sheet and master plan", nextStep: "Validate revenue growth assumptions with market data", nextMilestone: "2026-02-22" },
  { legacyId: "rec5p1dwm5SowncHB", name: "Berbara - Lebanon", sector: "F&B", stage: "Active ventures", status: "On-Hold", location: "Lebanon" },
  { legacyId: "recMUwCXnPzQOqiXp", name: "Nammos - Ibiza", sector: "F&B", stage: "In Validation", status: "In progress", location: "Spain" },
  { legacyId: "recaTVtvEBZ0Ewbr5", name: "Nammos Lebanon", sector: "F&B", stage: "In Validation", status: "In progress", location: "Lebanon" },
  { legacyId: "recFY55UsCgpgmnng", name: "Mar-a-Lago Yacht Club", sector: "Yacht", stage: "In Fundraising", status: "In progress", location: "USA" },
  { legacyId: "recGIlkRxb7NhUxLz", name: "Bagatelle", sector: "Yacht", stage: "In Validation", status: "In progress", location: "TBD" },
  { legacyId: "reckg6WcKxF2IRTF6", name: "JV Yacht - Nammos", sector: "Yacht", stage: "In Validation", status: "In progress", location: "TBD", currentStatus: "Figure out JV Yacht - Nammos" },
  { legacyId: "recC7kyF7o9QOzUW2", name: "Berlin", sector: "Entertainment", stage: "Active ventures", status: "Completed", location: "Malaysia" },
  { legacyId: "recOPwrJi1hnVCIq7", name: "KTL-Dubai Casino License", sector: "Entertainment", stage: "On Hold", status: "In progress", location: "UAE" },
  { legacyId: "recy3wsUgdOTh6u7j", name: "Casino - Malaysia", sector: "Entertainment", stage: "Active ventures", status: "In progress", location: "TBD" },
  { legacyId: "rec8cJyOaDtDrFVYY", name: "Kazzafi Daughter", sector: "Others", stage: "Active ventures", status: "In progress", location: "Oman" },
  { legacyId: "recBbe9nhPjXZH6BV", name: "Shady Project", sector: "Others", stage: "Active ventures", status: "In progress", location: "Oman" },
  { legacyId: "recPJqBkpKXcBwLzS", name: "P430", sector: "Others", stage: "In Validation", status: "In progress", location: "TBD" },
  { legacyId: "recOilGas1", name: "Venezuela Mining Rights", sector: "Oil & Gas", stage: "In Validation", status: "In progress", location: "Venezuela" },
];

const TEAM_DATA = [
  { legacyId: "rec9HC4unUf3rlUz1", name: "Jimmy Frangi", role: "Founder", memberFunction: "Finance & Capital", status: "Active", type: "Internal", notes: "Treasury, LP comms, capital deployment.", whatsapp: "+33680999999" },
  { legacyId: "rec52Aei2efKPEuN0", name: "Anton Maghami", role: "Vice President", memberFunction: "Operations & Systems", status: "Active", type: "Internal", notes: "Owns automation stack, reporting, and governance processes.", telegram: "@antonmaghami", whatsapp: "+15715242787" },
  { legacyId: "rec1MSjH1uWVFqRM9", name: "Jon Eichner", role: "COO", memberFunction: "Operations", status: "Active", type: "Internal" },
  { legacyId: "recZoxAfOxevi65jz", name: "Maher Abou Chakra", role: "Accounting", memberFunction: "Finance / Accounting", status: "Active", type: "Internal", notes: "Entity bookkeeping, closing packages, compliance files." },
  { legacyId: "recmUu5W2yRxeyNj5", name: "Angie Samadi", role: "HR", memberFunction: "People Ops / HR", status: "Active", type: "Internal", notes: "Hiring pipelines, onboarding, contracts." },
  { legacyId: "recjvWiLvE5jky6dG", name: "Carl Frangi", role: "Member", memberFunction: "Investor Relations", status: "Advisor", type: "Advisor", notes: "Family office coordination, investor relations.", telegram: "@carlfranji" },
  { legacyId: "recODuqZQixtieT95", name: "Leonidas Kyrris", role: "Legal (maritime focus)", memberFunction: "Legal", status: "Advisor", type: "Advisor", notes: "Maritime-focused counsel for yacht / port matters." },
  { legacyId: "rec0sYZnsOcya6vUI", name: "Igor", role: "Deck Design", memberFunction: "Design", status: "Contributor", type: "External Partner", notes: "Creative support for pitch materials." },
  { legacyId: "recFLbPdtZt2OHPFw", name: "Sohail", role: "Financial Modeling", memberFunction: "Financial Modeling", status: "Contributor", type: "External Partner", notes: "Builds out deal financial models ad hoc." },
  { legacyId: "recpMPSXi5lOhkANT", name: "Ruwaida", role: "Yacht Design", memberFunction: "Design", status: "Contributor", type: "External Partner", notes: "Design support for yacht ventures." },
  { legacyId: "recSHWNL33xK9mP01", name: "Shwan Lee", role: "Founder & CEO", memberFunction: "Strategy & Vision", status: "Active", type: "Internal", notes: "Founder of Aurovia. Leads product vision, GTM strategy, and key partnerships." },
  { legacyId: "recNJB44yR7tQ2vW8", name: "Najib", role: "Advisor", memberFunction: "Legal & Compliance", status: "Active", type: "Advisor", notes: "Senior legal counsel specializing in cross-border venture structures and regulatory compliance." },
];

const SPVS_DATA = [
  { legacyId: "rectbrWqAdepS7dC4", name: "Venezuela Mining Rights", sector: "Oil & Gas", priority: "High", stage: "Active deal", currentStatus: "Awaiting updated financials from founder.", nextStep: "Schedule IC prep call with team." },
  { legacyId: "recxTZCzi6GGEr205", name: "Azzam - Yacht", sector: "Yacht", priority: "Medium", stage: "Active deal" },
  { legacyId: "rec6CU1RdVpxnUyMx", name: "Crude Oil Deal", sector: "Oil & Gas", priority: "Medium", stage: "In negotiation" },
  { legacyId: "recGkP0NHIeVTyorl", name: "Shipping Deal", sector: "Others", priority: "Low", stage: "Active deal" },
  { legacyId: "recKfmvELhFEuhOXP", name: "Chakra Yacht - Brokerage", sector: "Yacht", priority: "Low", stage: "Active deal" },
  { legacyId: "recTh2puenSEDUBq2", name: "Serenity Yacht - Brokerage", sector: "Yacht", priority: "Low", stage: "Active deal" },
  { legacyId: "reck3hvO7JIURZA7M", name: "Ego Yacht", sector: "Yacht", priority: "Low", stage: "Active deal" },
  { legacyId: "rec7R4RhbclkKvTOb", name: "Onara", sector: "TBD", priority: "Medium", stage: "Closed deal" },
  { legacyId: "recaWPjG9t5DW5EfO", name: "ReserveOne", sector: "TBD", priority: "Medium", stage: "Closed deal" },
  { legacyId: "recL2pxn3HahYBRdP", name: "Casino License", sector: "Entertainment", priority: "Medium", stage: "Dropped deal" },
];

const TASKS_DATA = [
  { legacyId: "rec6UJmmuR2rsk4J1", title: "Nammos Watson Island", status: "open", dueDate: "2026-02-25", priority: "Medium", assigneeNames: ["Anton Maghami"], ventureLink: "Nammos - Watson Island" },
  { legacyId: "recszfvvxgrTAxBY2", title: "Call Prince and discuss oil and gas", status: "complete", dueDate: "2026-02-24", priority: "Medium", assigneeNames: ["Carl Frangi"] },
  { legacyId: "recCLbzR2muTXnGS4", title: "Zarka City — Workshop schedule (vision statement/storytelling)", status: "open", dueDate: "2026-03-01", priority: "Low", assigneeNames: ["Anton Maghami"], ventureLink: "Zarka City" },
  { legacyId: "recTCuYHVPfyTD9Ke", title: "Presentation Master Deck Real Estate — Miami, Bahamas", status: "open", dueDate: "2026-03-05", priority: "Low", assigneeNames: ["Anton Maghami", "Igor"] },
  { legacyId: "receN1p9e3AkUy33o", title: "Lagonissi Nammos — Internal deal structure meeting", status: "open", dueDate: "2026-02-26", priority: "High", assigneeNames: ["Anton Maghami", "Jimmy Frangi"], ventureLink: "Nammos - Lagonissi" },
  { legacyId: "recZbejW7Gv9AmQZu", title: "Schedule meeting with Anton and Jimmy to discuss ventures", status: "open", dueDate: "2026-02-24", priority: "Medium", assigneeNames: ["Anton Maghami", "Jimmy Frangi"] },
  { legacyId: "rec_yacht", title: "JV Yacht Nammos — Internal deal structure meeting", status: "open", dueDate: "2026-02-26", priority: "Medium", assigneeNames: ["Anton Maghami"], ventureLink: "JV Yacht - Nammos" },
  { legacyId: "rec_nadine", title: "Add ventures and deals discussed yesterday with Nadine", status: "complete", dueDate: "2026-02-24", priority: "Medium", assigneeNames: [] },
  { legacyId: "rec_najib", title: "Call Najib", status: "complete", dueDate: "2026-02-26", priority: "Medium", assigneeNames: [] },
];

const DISTRIBUTIONS_DATA = [
  { legacyId: "reczfbACIbdw01OnB", name: "Q4 2025 Profit Share", distributionDate: "2026-01-14", fund: "Thalora Venture Fund I", amount: 250000, currency: "USD", type: "Profit", status: "Paid", method: "Wire", notes: "Quarterly profit share for Q4 2025. Paid to LPs as scheduled." },
  { legacyId: "recjvCJ8Gf8lLuuZH", name: "2025 Return of Capital - SPV Alpha", distributionDate: "2026-01-28", fund: "Thalora SPV Alpha", amount: 100000, currency: "USD", type: "Return of Capital", status: "Paid", method: "Wire", notes: "Return of capital to LPs after exit from SPV Alpha." },
  { legacyId: "recqNgcoApulVgiih", name: "2026 Scheduled Dividend - REIT Fund I", distributionDate: "2026-02-09", fund: "Thalora Real Estate Fund II", amount: 40000, currency: "USD", type: "Dividend", status: "Scheduled", method: "Wire", notes: "Scheduled semi-annual dividend for REIT Fund I." },
  { legacyId: "recONJPIqJBxlTEBT", name: "Cancelled Profit Distribution - Growth Equity Fund II", distributionDate: "2026-02-14", fund: "Thalora Growth Equity Fund II", amount: 50000, currency: "USD", type: "Profit", status: "Cancelled", method: "Wire", notes: "Cancelled due to compliance review." },
];

const CONTACTS_DATA = [
  { legacyId: "recUMWGqm7xOehSbv", name: "Benjamin", role: "Miami Real Estate Growth Leader", status: "Active", industries: ["Real Estate"] },
  { legacyId: "recKasLElIchg6ydi", name: "Shawki Rassi", role: "Support on Nammos Watson venture", status: "Active", industries: ["Real Estate"], geography: "Lebanon" },
  { legacyId: "recKCf3sMWBHTOLkG", name: "Mohamed", role: "Architect - Zarka", status: "Active", industries: ["Real Estate"], geography: "Oman" },
  { legacyId: "recCokIMaCGM4NM8p", name: "Marwan", role: "Support - Zarka", status: "Active", industries: ["Real Estate"] },
  { legacyId: "recabrBi2wP5p3JvG", name: "Guy", role: "Zarka City Consultant", status: "Active", industries: ["Real Estate"] },
  { legacyId: "recOKkcPoYypyLCNC", name: "Saeed", role: "Mar-A-Lago", status: "Active", industries: ["Yacht"] },
  { legacyId: "recBSBC44ZS4XENQg", name: "Doris", status: "Active", industries: ["F&B"] },
  { legacyId: "recD9lTVZaCCxiKCh", name: "Moe", role: "Partner Lagonissi", status: "Active", industries: ["F&B"] },
  { legacyId: "rec59YAgORfmFOg9U", name: "Nicola", role: "Oil & Gas", status: "Active", industries: ["Oil & Gas"] },
  { legacyId: "recMoLtR5joaraBdr", name: "Victor", status: "Active", industries: ["Shipping"] },
];

const ACTIVITY_SEED = [
  { entityType: "venture", entityName: "Zarka City", action: "Workshop Scheduled", detail: "Zarka City vision statement workshop — Anton coordinating", userName: "Anton Maghami", sector: "Real Estate" },
  { entityType: "venture", entityName: "Nammos - Watson Island", action: "Deck Drafted", detail: "Nammos Watson Island presentation deck in progress", userName: "Igor", sector: "Real Estate" },
  { entityType: "venture", entityName: "Nammos - Lagonissi", action: "Deal Structure", detail: "Lagonissi Nammos internal deal structure meeting scheduled", userName: "Jimmy Frangi", sector: "Real Estate" },
  { entityType: "spv", entityName: "Venezuela Mining Rights", action: "SPV Update", detail: "Venezuela Mining Rights — awaiting updated financials", userName: "Anton Maghami", sector: "Oil & Gas" },
  { entityType: "distribution", entityName: "Q4 2025 Profit Share", action: "Distribution Paid", detail: "Q4 2025 Profit Share — $250K paid to LPs via wire", userName: "Jimmy Frangi", sector: "Others" },
];

async function seed() {
  console.log("🌱 Seeding database...");

  // Check if already seeded
  const [existing] = await db.execute(sql`SELECT COUNT(*) as cnt FROM ventures`);
  if (existing[0]?.cnt > 0) {
    console.log("⚠️  Database already has data. Skipping seed to avoid duplicates.");
    console.log("   To re-seed, truncate tables first.");
    process.exit(0);
  }

  // 1. Seed ventures
  console.log("  → Seeding ventures...");
  for (const v of VENTURES_DATA) {
    await db.execute(sql`INSERT INTO ventures (legacyId, name, sector, location, stage, status, currentStatus, nextStep, nextMilestone, priority, slug) VALUES (${v.legacyId}, ${v.name}, ${v.sector}, ${v.location}, ${v.stage}, ${v.status}, ${v.currentStatus || null}, ${v.nextStep || null}, ${v.nextMilestone || null}, ${v.priority || "Medium"}, ${slugify(v.name)})`);
  }
  console.log(`    ✓ ${VENTURES_DATA.length} ventures`);

  // 2. Seed team members
  console.log("  → Seeding team members...");
  for (const t of TEAM_DATA) {
    await db.execute(sql`INSERT INTO team_members (legacyId, name, \`role\`, memberFunction, status, type, notes, telegram, whatsapp, slug) VALUES (${t.legacyId}, ${t.name}, ${t.role}, ${t.memberFunction}, ${t.status}, ${t.type}, ${t.notes || null}, ${t.telegram || null}, ${t.whatsapp || null}, ${slugify(t.name)})`);
  }
  console.log(`    ✓ ${TEAM_DATA.length} team members`);

  // 3. Seed SPVs
  console.log("  → Seeding SPVs...");
  for (const s of SPVS_DATA) {
    await db.execute(sql`INSERT INTO spvs (legacyId, name, sector, priority, stage, currentStatus, nextStep, slug) VALUES (${s.legacyId}, ${s.name}, ${s.sector}, ${s.priority}, ${s.stage}, ${s.currentStatus || null}, ${s.nextStep || null}, ${slugify(s.name)})`);
  }
  console.log(`    ✓ ${SPVS_DATA.length} SPVs`);

  // 4. Seed tasks — resolve venture IDs
  console.log("  → Seeding tasks...");
  const [ventureRows] = await db.execute(sql`SELECT id, name FROM ventures`);
  const ventureMap = {};
  for (const r of ventureRows) ventureMap[r.name] = r.id;

  for (const t of TASKS_DATA) {
    const ventureId = t.ventureLink ? (ventureMap[t.ventureLink] || null) : null;
    await db.execute(sql`INSERT INTO tasks (legacyId, title, ventureId, ventureLink, assigneeNames, dueDate, priority, status) VALUES (${t.legacyId}, ${t.title}, ${ventureId}, ${t.ventureLink || null}, ${JSON.stringify(t.assigneeNames)}, ${t.dueDate}, ${t.priority}, ${t.status})`);
  }
  console.log(`    ✓ ${TASKS_DATA.length} tasks`);

  // 5. Seed distributions
  console.log("  → Seeding distributions...");
  for (const d of DISTRIBUTIONS_DATA) {
    await db.execute(sql`INSERT INTO distributions (legacyId, name, fund, amount, currency, type, status, method, notes, distributionDate) VALUES (${d.legacyId}, ${d.name}, ${d.fund}, ${d.amount}, ${d.currency}, ${d.type}, ${d.status}, ${d.method}, ${d.notes}, ${d.distributionDate})`);
  }
  console.log(`    ✓ ${DISTRIBUTIONS_DATA.length} distributions`);

  // 6. Seed contacts
  console.log("  → Seeding contacts...");
  for (const c of CONTACTS_DATA) {
    await db.execute(sql`INSERT INTO contacts (legacyId, name, \`role\`, status, industries, geography, slug) VALUES (${c.legacyId}, ${c.name}, ${c.role || null}, ${c.status}, ${JSON.stringify(c.industries)}, ${c.geography || null}, ${slugify(c.name)})`);
  }
  console.log(`    ✓ ${CONTACTS_DATA.length} contacts`);

  // 7. Seed activity log
  console.log("  → Seeding activity log...");
  for (const a of ACTIVITY_SEED) {
    await db.execute(sql`INSERT INTO activity_log (entityType, entityName, action, detail, userName, sector) VALUES (${a.entityType}, ${a.entityName}, ${a.action}, ${a.detail}, ${a.userName}, ${a.sector})`);
  }
  console.log(`    ✓ ${ACTIVITY_SEED.length} activity entries`);

  console.log("\n✅ Seed complete!");
  process.exit(0);
}

seed().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
