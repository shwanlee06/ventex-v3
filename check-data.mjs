import 'dotenv/config';
import mysql from 'mysql2/promise';

const conn = await mysql.createConnection(process.env.DATABASE_URL);

// Check tasks by status with overdue counts
const [tasks] = await conn.query(`
  SELECT status, COUNT(*) as cnt, 
    SUM(CASE WHEN dueDate < NOW() AND status != 'complete' THEN 1 ELSE 0 END) as overdue
  FROM tasks 
  GROUP BY status
`);
console.log("Tasks by status:", tasks);

// Check tasks with venture_id
const [ventureTaskCount] = await conn.query(`
  SELECT COUNT(*) as total, 
    SUM(CASE WHEN dueDate IS NOT NULL THEN 1 ELSE 0 END) as with_due_date,
    SUM(CASE WHEN dueDate < NOW() AND status != 'complete' THEN 1 ELSE 0 END) as overdue
  FROM tasks WHERE ventureId IS NOT NULL
`);
console.log("Venture tasks:", ventureTaskCount);

// Check org_venture_access
const [orgAccess] = await conn.query(`
  SELECT ova.organizationId, o.name, COUNT(ova.ventureId) as venture_count
  FROM org_venture_access ova
  JOIN organizations o ON o.id = ova.organizationId
  GROUP BY ova.organizationId, o.name
`);
console.log("Org venture access:", orgAccess);

// Check ventures health
const [healthDesc] = await conn.query(`
  SELECT id, name, healthScore FROM ventures ORDER BY healthScore ASC LIMIT 10
`);
console.log("Venture health scores:", healthDesc);

// Check velocity data
const [velocityData] = await conn.query(`
  SELECT v.name, v.velocityScore, v.healthScore, v.stage
  FROM ventures v
  ORDER BY v.velocityScore DESC
  LIMIT 10
`);
console.log("Velocity scores:", velocityData);

// Check if negative days exist
const [negativeDays] = await conn.query(`
  SELECT id, name, stage, DATEDIFF(NOW(), createdAt) as days_in_stage
  FROM ventures 
  WHERE DATEDIFF(NOW(), createdAt) < 0
  LIMIT 5
`);
console.log("Negative days ventures:", negativeDays);

// Check agent events
const [agentEvents] = await conn.query(`
  SELECT actionTaken, requiresClientAction, clientDismissed, COUNT(*) as cnt
  FROM agent_events
  GROUP BY actionTaken, requiresClientAction, clientDismissed
`);
console.log("Agent events breakdown:", agentEvents);

await conn.end();
