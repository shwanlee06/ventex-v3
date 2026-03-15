// ============================================================================
// Airtable Sync API — pushes dashboard data to Airtable via MCP
// POST /api/airtable/sync
// ============================================================================

import { Router, json } from "express";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

const router = Router();
router.use(json({ limit: "2mb" }));

const BASE_ID = "appw7nayCfrZBRDg6";

const TABLE_IDS = {
  people: "tblPTaySMNGp62Iy8",
  tasks: "tblhk530xUvF5GOUi",
  ventures: "tbluA5DMjppyLENqJ",
  spvs: "tblZxYdGYMDh45WDq",
};

// Field mappings (field IDs from Airtable schema)
const FIELD_MAP = {
  people: {
    name: "fldQbQDmBVZZsFRBi",        // Full Name
    role: "fldlrbzhHn3oUNEgG",         // VH Role
    legacyRole: "fldkrjfEd7pcjusbF",   // Legacy - Role
    function: "fldOVYTaZ5jy0dTou",     // Legacy - Function
    status: "fldlr3npG13WTPac8",       // Legacy - Status
    memberType: "fldTTDJgZZJcgpm1e",   // Legacy - Member Type
    notes: "fldEirsVieMIYdR4E",        // Notes
  },
  tasks: {
    title: "fldOAAgW00NS4s6fk",        // Task Title
    description: "fldzyptcmPwluR7tt",   // Task Description
    status: "fldxE0fA8m1rc01i8",       // Task Status
    priority: "fld5qgCVpooMueL1K",     // Legacy - Priority
    dueDate: "fld4oxqeJuACZwjn3",      // Due Date
    taskType: "fldImYau6FvCxEX6j",     // Task Type
    notes: "fldmRvOxuh2wgn2Y4",        // Notes
  },
  ventures: {
    name: "fldDRKGTSFNCIqTF2",         // Name
    theme: "flds0RCuooVLnUbJy",        // Legacy - Theme
    location: "flduM6Iz4jzpd7Yn9",     // Legacy - Location
    status: "fldCM0ShSw98aKajP",       // Legacy - Status
    currentStatus: "fldYjHCLABpQNVliJ", // Legacy - Current Status
    nextStep: "fldF74xeiS0juMQZ6",     // Legacy - Next Step
    ventureStatus: "fldJhbpJuXYlZhEYg", // Venture Status
    sector: "fldJ5iWqgqiSbfFKB",       // Sector
  },
  spvs: {
    dealName: "fld8ODgNx21l1R2SJ",     // Deal Name
    dealStage: "fldPJPJVFCGNHfJkx",    // Deal Stage
  },
};

// Map app status to Airtable status values
function mapTaskStatus(status: string): string {
  const map: Record<string, string> = {
    open: "Not Started",
    "in-progress": "In Progress",
    overdue: "In Progress",
    complete: "Complete",
    blocked: "Blocked",
  };
  return map[status] || "Not Started";
}

function mapVentureStatus(status: string): string {
  const map: Record<string, string> = {
    "In progress": "Active",
    "On-Hold": "Paused",
    "Completed": "Closed",
    "Pipeline": "Pipeline",
  };
  return map[status] || "Active";
}

async function mcpCall(toolName: string, input: Record<string, unknown>): Promise<unknown> {
  const inputJson = JSON.stringify(input).replace(/'/g, "'\\''");
  try {
    const { stdout } = await execAsync(
      `manus-mcp-cli tool call ${toolName} --server airtable --input '${inputJson}'`,
      { timeout: 30000 }
    );
    try {
      return JSON.parse(stdout);
    } catch {
      return stdout;
    }
  } catch (err: any) {
    console.error(`[Airtable] MCP call failed for ${toolName}:`, err.message);
    throw err;
  }
}

// Search for existing record by name to avoid duplicates
async function findRecordByName(tableId: string, name: string): Promise<string | null> {
  try {
    const result = await mcpCall("search_records", {
      baseId: BASE_ID,
      tableId,
      searchTerm: name,
      maxRecords: 5,
    }) as any;
    
    if (result?.records?.length > 0) {
      return result.records[0].id;
    }
    return null;
  } catch {
    return null;
  }
}

// ── Sync Ventures ──────────────────────────────────────────────────────────
router.post("/sync/ventures", async (req, res) => {
  try {
    const { ventures } = req.body;
    if (!ventures || !Array.isArray(ventures)) {
      return res.json({ success: false, error: "Invalid ventures data" });
    }

    const results = [];
    for (const v of ventures) {
      try {
        const existingId = await findRecordByName(TABLE_IDS.ventures, v.name);
        const fields: Record<string, unknown> = {
          [FIELD_MAP.ventures.name]: v.name,
          [FIELD_MAP.ventures.sector]: v.theme || undefined,
          [FIELD_MAP.ventures.theme]: v.theme || undefined,
          [FIELD_MAP.ventures.location]: v.location || undefined,
          [FIELD_MAP.ventures.status]: v.status || undefined,
          [FIELD_MAP.ventures.ventureStatus]: mapVentureStatus(v.status),
          [FIELD_MAP.ventures.currentStatus]: v.currentStatus || undefined,
          [FIELD_MAP.ventures.nextStep]: v.nextStep || undefined,
        };

        // Remove undefined values
        Object.keys(fields).forEach((k) => fields[k] === undefined && delete fields[k]);

        if (existingId) {
          await mcpCall("update_records", {
            baseId: BASE_ID,
            tableId: TABLE_IDS.ventures,
            records: [{ id: existingId, fields }],
          });
          results.push({ name: v.name, action: "updated", id: existingId });
        } else {
          const created = await mcpCall("create_record", {
            baseId: BASE_ID,
            tableId: TABLE_IDS.ventures,
            fields,
          }) as any;
          results.push({ name: v.name, action: "created", id: created?.id });
        }
      } catch (err: any) {
        results.push({ name: v.name, action: "error", error: err.message });
      }
    }

    res.json({ success: true, results });
  } catch (err: any) {
    res.json({ success: false, error: err.message });
  }
});

// ── Sync Tasks ─────────────────────────────────────────────────────────────
router.post("/sync/tasks", async (req, res) => {
  try {
    const { tasks } = req.body;
    if (!tasks || !Array.isArray(tasks)) {
      return res.json({ success: false, error: "Invalid tasks data" });
    }

    const results = [];
    for (const t of tasks) {
      try {
        const existingId = await findRecordByName(TABLE_IDS.tasks, t.title);
        const fields: Record<string, unknown> = {
          [FIELD_MAP.tasks.title]: t.title,
          [FIELD_MAP.tasks.status]: mapTaskStatus(t.status),
          [FIELD_MAP.tasks.priority]: t.priority || undefined,
          [FIELD_MAP.tasks.dueDate]: t.dueDate || undefined,
          [FIELD_MAP.tasks.notes]: t.notes || undefined,
        };

        Object.keys(fields).forEach((k) => fields[k] === undefined && delete fields[k]);

        if (existingId) {
          await mcpCall("update_records", {
            baseId: BASE_ID,
            tableId: TABLE_IDS.tasks,
            records: [{ id: existingId, fields }],
          });
          results.push({ title: t.title, action: "updated", id: existingId });
        } else {
          const created = await mcpCall("create_record", {
            baseId: BASE_ID,
            tableId: TABLE_IDS.tasks,
            fields,
          }) as any;
          results.push({ title: t.title, action: "created", id: created?.id });
        }
      } catch (err: any) {
        results.push({ title: t.title, action: "error", error: err.message });
      }
    }

    res.json({ success: true, results });
  } catch (err: any) {
    res.json({ success: false, error: err.message });
  }
});

// ── Sync People ────────────────────────────────────────────────────────────
router.post("/sync/people", async (req, res) => {
  try {
    const { team } = req.body;
    if (!team || !Array.isArray(team)) {
      return res.json({ success: false, error: "Invalid team data" });
    }

    const results = [];
    for (const m of team) {
      try {
        const existingId = await findRecordByName(TABLE_IDS.people, m.name);
        const fields: Record<string, unknown> = {
          [FIELD_MAP.people.name]: m.name,
          [FIELD_MAP.people.legacyRole]: m.role || undefined,
          [FIELD_MAP.people.function]: m.function || undefined,
          [FIELD_MAP.people.status]: m.status || undefined,
          [FIELD_MAP.people.memberType]: m.type || undefined,
        };

        Object.keys(fields).forEach((k) => fields[k] === undefined && delete fields[k]);

        if (existingId) {
          await mcpCall("update_records", {
            baseId: BASE_ID,
            tableId: TABLE_IDS.people,
            records: [{ id: existingId, fields }],
          });
          results.push({ name: m.name, action: "updated", id: existingId });
        } else {
          const created = await mcpCall("create_record", {
            baseId: BASE_ID,
            tableId: TABLE_IDS.people,
            fields,
          }) as any;
          results.push({ name: m.name, action: "created", id: created?.id });
        }
      } catch (err: any) {
        results.push({ name: m.name, action: "error", error: err.message });
      }
    }

    res.json({ success: true, results });
  } catch (err: any) {
    res.json({ success: false, error: err.message });
  }
});

// ── Sync SPVs ──────────────────────────────────────────────────────────────
router.post("/sync/spvs", async (req, res) => {
  try {
    const { spvs } = req.body;
    if (!spvs || !Array.isArray(spvs)) {
      return res.json({ success: false, error: "Invalid SPVs data" });
    }

    const results = [];
    for (const s of spvs) {
      try {
        const existingId = await findRecordByName(TABLE_IDS.spvs, s.name);
        const fields: Record<string, unknown> = {
          [FIELD_MAP.spvs.dealName]: s.name,
          [FIELD_MAP.spvs.dealStage]: s.stage || undefined,
        };

        Object.keys(fields).forEach((k) => fields[k] === undefined && delete fields[k]);

        if (existingId) {
          await mcpCall("update_records", {
            baseId: BASE_ID,
            tableId: TABLE_IDS.spvs,
            records: [{ id: existingId, fields }],
          });
          results.push({ name: s.name, action: "updated", id: existingId });
        } else {
          const created = await mcpCall("create_record", {
            baseId: BASE_ID,
            tableId: TABLE_IDS.spvs,
            fields,
          }) as any;
          results.push({ name: s.name, action: "created", id: created?.id });
        }
      } catch (err: any) {
        results.push({ name: s.name, action: "error", error: err.message });
      }
    }

    res.json({ success: true, results });
  } catch (err: any) {
    res.json({ success: false, error: err.message });
  }
});

// ── Full Sync (all tables at once) ────────────────────────────────────────
router.post("/sync/all", async (req, res) => {
  try {
    const { ventures, tasks, team, spvs } = req.body;
    const results: Record<string, unknown> = {};

    if (ventures?.length) {
      const ventureRes = await fetch(`http://localhost:${process.env.PORT || 3000}/api/airtable/sync/ventures`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ventures }),
      });
      results.ventures = await ventureRes.json();
    }

    if (tasks?.length) {
      const taskRes = await fetch(`http://localhost:${process.env.PORT || 3000}/api/airtable/sync/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tasks }),
      });
      results.tasks = await taskRes.json();
    }

    if (team?.length) {
      const teamRes = await fetch(`http://localhost:${process.env.PORT || 3000}/api/airtable/sync/people`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ team }),
      });
      results.people = await teamRes.json();
    }

    if (spvs?.length) {
      const spvRes = await fetch(`http://localhost:${process.env.PORT || 3000}/api/airtable/sync/spvs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ spvs }),
      });
      results.spvs = await spvRes.json();
    }

    res.json({ success: true, results });
  } catch (err: any) {
    res.json({ success: false, error: err.message });
  }
});

export default router;
