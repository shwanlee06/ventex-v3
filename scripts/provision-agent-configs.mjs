// Auto-provision agent configs for all active organizations that lack one
// This is multi-client ready — any new org added to the system will get a config
import mysql from "mysql2/promise";
import dotenv from "dotenv";
dotenv.config();

const conn = await mysql.createConnection(process.env.DATABASE_URL);

// Get all active orgs
const [orgs] = await conn.query("SELECT id, name FROM organizations WHERE orgStatus = 'active'");
console.log(`Active organizations: ${orgs.length}`);

// Get existing configs
const [configs] = await conn.query("SELECT organizationId FROM client_agent_config");
const configOrgIds = new Set(configs.map(c => c.organizationId));
console.log(`Existing configs: ${configs.length}`);

// Find orgs missing configs
const missing = orgs.filter(o => !configOrgIds.has(o.id));
console.log(`Orgs missing config: ${missing.length}`);

if (missing.length === 0) {
  console.log("All active orgs have agent configs. Nothing to do.");
  await conn.end();
  process.exit(0);
}

// Insert default configs with autoAdvanceEnabled = true for all missing orgs
for (const org of missing) {
  await conn.query(
    `INSERT INTO client_agent_config (organizationId, velocityAgentEnabled, complianceAgentEnabled, dealFlowAgentEnabled, orchestratorEnabled, overdueDaysThreshold, distributionWarningDays, healthScoreAlertThreshold, autoAdvanceEnabled, pollingIntervalMinutes)
     VALUES (?, true, true, true, true, 7, 14, 30, true, 30)`,
    [org.id]
  );
  console.log(`  Created config for org ${org.id} (${org.name}) — autoAdvance: ON`);
}

// Also enable autoAdvance for existing configs that have it disabled
const [disabled] = await conn.query("SELECT organizationId FROM client_agent_config WHERE autoAdvanceEnabled = false");
if (disabled.length > 0) {
  await conn.query("UPDATE client_agent_config SET autoAdvanceEnabled = true WHERE autoAdvanceEnabled = false");
  console.log(`\nEnabled autoAdvance for ${disabled.length} existing configs that had it disabled`);
}

// Verify final state
const [final] = await conn.query("SELECT COUNT(*) as total FROM client_agent_config WHERE autoAdvanceEnabled = true");
console.log(`\nFinal state: ${final[0].total} orgs with autoAdvance enabled`);

await conn.end();
console.log("Done.");
