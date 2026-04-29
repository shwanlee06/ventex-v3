/**
 * Airtable API Client — Shared helper for all CRM automations
 * 
 * Provides typed CRUD operations for the Aurovia Airtable base:
 *   - Investor Pool
 *   - Interactions
 *   - Pipeline Tasks
 *   - Meetings
 *   - Fundraise Tracker
 *   - Aurovia Documents
 *   - Signed Documents
 */

const BASE_ID = "app7fqXNgqKmnKhXZ";
const API_URL = `https://api.airtable.com/v0/${BASE_ID}`;

// Table IDs
export const TABLES = {
  INVESTOR_POOL: "tbllyxUFfrleMGtYl",
  INTERACTIONS: "tblwBqRHKzAOdMOqW",
  PIPELINE_TASKS: "tbl1iRqQi7SLnXOp2",
  MEETINGS: "tbllC8l3lt2wozFxg",
  FUNDRAISE_TRACKER: "tbluIAwIAdNbTkohj",
  AUROVIA_DOCUMENTS: "tblKL0Cuh6wrI6nrd",
  AUROVIA_MEMBERS: "tbl02QkWLX6wsOFib",
  SIGNED_DOCUMENTS: "tblSZv3mt85OMCbcw",
  EMAIL_TEMPLATES: "tblxrX7stX61q02uz",
} as const;

function getToken(): string {
  const token = process.env.AIRTABLE_PAT;
  if (!token) throw new Error("AIRTABLE_PAT environment variable is not set");
  return token;
}

function headers() {
  return {
    Authorization: `Bearer ${getToken()}`,
    "Content-Type": "application/json",
  };
}

// ─── Generic CRUD ──────────────────────────────────────────────

export interface AirtableRecord<T = Record<string, any>> {
  id: string;
  fields: T;
  createdTime?: string;
}

export interface AirtableListResponse<T = Record<string, any>> {
  records: AirtableRecord<T>[];
  offset?: string;
}

/**
 * List records from a table with optional filter formula
 */
export async function listRecords<T = Record<string, any>>(
  tableId: string,
  options?: {
    filterByFormula?: string;
    maxRecords?: number;
    sort?: Array<{ field: string; direction?: "asc" | "desc" }>;
    fields?: string[];
    offset?: string;
  }
): Promise<AirtableListResponse<T>> {
  const params = new URLSearchParams();
  if (options?.filterByFormula) params.set("filterByFormula", options.filterByFormula);
  if (options?.maxRecords) params.set("maxRecords", String(options.maxRecords));
  if (options?.offset) params.set("offset", options.offset);
  if (options?.fields) {
    options.fields.forEach((f) => params.append("fields[]", f));
  }
  if (options?.sort) {
    options.sort.forEach((s, i) => {
      params.set(`sort[${i}][field]`, s.field);
      if (s.direction) params.set(`sort[${i}][direction]`, s.direction);
    });
  }

  const url = `${API_URL}/${tableId}?${params.toString()}`;
  const res = await fetch(url, { headers: headers() });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Airtable listRecords failed (${res.status}): ${body}`);
  }
  return res.json();
}

/**
 * Get all records (handles pagination automatically)
 */
export async function getAllRecords<T = Record<string, any>>(
  tableId: string,
  options?: {
    filterByFormula?: string;
    sort?: Array<{ field: string; direction?: "asc" | "desc" }>;
    fields?: string[];
  }
): Promise<AirtableRecord<T>[]> {
  const all: AirtableRecord<T>[] = [];
  let offset: string | undefined;

  do {
    const resp = await listRecords<T>(tableId, { ...options, offset });
    all.push(...resp.records);
    offset = resp.offset;
  } while (offset);

  return all;
}

/**
 * Get a single record by ID
 */
export async function getRecord<T = Record<string, any>>(
  tableId: string,
  recordId: string
): Promise<AirtableRecord<T>> {
  const url = `${API_URL}/${tableId}/${recordId}`;
  const res = await fetch(url, { headers: headers() });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Airtable getRecord failed (${res.status}): ${body}`);
  }
  return res.json();
}

/**
 * Create records (batch, max 10 per call)
 */
export async function createRecords<T = Record<string, any>>(
  tableId: string,
  records: Array<{ fields: Partial<T> }>
): Promise<AirtableRecord<T>[]> {
  const all: AirtableRecord<T>[] = [];

  // Airtable allows max 10 records per batch
  for (let i = 0; i < records.length; i += 10) {
    const batch = records.slice(i, i + 10);
    const url = `${API_URL}/${tableId}`;
    const res = await fetch(url, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({ records: batch }),
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Airtable createRecords failed (${res.status}): ${body}`);
    }
    const data = await res.json();
    all.push(...data.records);
  }

  return all;
}

/**
 * Update records (batch, max 10 per call)
 */
export async function updateRecords<T = Record<string, any>>(
  tableId: string,
  records: Array<{ id: string; fields: Partial<T> }>
): Promise<AirtableRecord<T>[]> {
  const all: AirtableRecord<T>[] = [];

  for (let i = 0; i < records.length; i += 10) {
    const batch = records.slice(i, i + 10);
    const url = `${API_URL}/${tableId}`;
    const res = await fetch(url, {
      method: "PATCH",
      headers: headers(),
      body: JSON.stringify({ records: batch }),
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Airtable updateRecords failed (${res.status}): ${body}`);
    }
    const data = await res.json();
    all.push(...data.records);
  }

  return all;
}

/**
 * Delete records (batch, max 10 per call)
 */
export async function deleteRecords(
  tableId: string,
  recordIds: string[]
): Promise<void> {
  for (let i = 0; i < recordIds.length; i += 10) {
    const batch = recordIds.slice(i, i + 10);
    const params = batch.map((id) => `records[]=${id}`).join("&");
    const url = `${API_URL}/${tableId}?${params}`;
    const res = await fetch(url, {
      method: "DELETE",
      headers: headers(),
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Airtable deleteRecords failed (${res.status}): ${body}`);
    }
  }
}

// ─── Typed Interfaces ──────────────────────────────────────────

export interface InvestorFields {
  "Investor Name"?: string;
  "Type"?: string;
  "Contact Email"?: string;
  "Contact Name"?: string;
  "LinkedIn URL"?: string;
  "Website"?: string;
  "Location"?: string;
  "Check Size Range"?: string;
  "Thesis Match"?: string;
  "Pipeline Stage"?: string;
  "Priority"?: string;
  "Interest Level"?: string;
  "Tags"?: string[];
  "Notes"?: string;
  "Last Contacted"?: string;
  "Next Follow-Up"?: string;
  "Interactions"?: string[];
  "Pipeline Tasks"?: string[];
  "Meetings"?: string[];
}

export interface InteractionFields {
  "Interaction Title"?: string;
  "Type"?: string;
  "Date"?: string;
  "Direction"?: string;
  "Summary"?: string;
  "Investor Pool"?: string[];
  "Follow-Up Required"?: boolean;
  "Follow-Up Date"?: string;
  "Aurovia Members"?: string;
}

export interface PipelineTaskFields {
  "Task Title"?: string;
  "Task Type"?: string;
  "Status"?: string;
  "Due Date"?: string;
  "Assigned To"?: string[];
  "Description"?: string;
  "Completed"?: boolean;
  "Related Investor"?: string[];
  "Related Meeting"?: string[];
  "Aurovia Members"?: string;
}

export interface MeetingFields {
  "Meeting Title"?: string;
  "Meeting Type"?: string;
  "Date & Time"?: string;
  "Location / Link"?: string;
  "Aurovia Attendees"?: string;
  "Meeting Notes"?: string;
  "Outcome"?: string;
  "Follow-Up Required"?: boolean;
  "Investor Pool"?: string[];
  "Pipeline Tasks"?: string[];
  "Aurovia Members"?: string;
}

export interface DocumentFields {
  "Document Name"?: string;
  "Document Type"?: string;
  "Type of Project"?: string;
  "Version"?: number;
  "File"?: Array<{ url: string; filename?: string }>;
  "Status"?: string;
  "Date Created"?: string;
  "Last Updated"?: string;
  "Notes"?: string;
  "Related Round"?: string;
}

export interface FundraiseFields {
  "Round Name"?: string;
  "Round Stage"?: string;
  "Target Amount (USD)"?: number;
  "Committed Amount (USD)"?: number;
  "Received Amount (USD)"?: number;
  "Instrument"?: string;
  "Valuation Cap (USD)"?: number;
  "Discount Rate (%)"?: number;
  "Round Open Date"?: string;
  "Target Close Date"?: string;
  "Entity"?: string;
  "Notes"?: string;
}

// ─── Domain Helpers ────────────────────────────────────────────

/**
 * Get all investors at a specific pipeline stage
 */
export async function getInvestorsByStage(stage: string) {
  return getAllRecords<InvestorFields>(TABLES.INVESTOR_POOL, {
    filterByFormula: `{Pipeline Stage} = "${stage}"`,
  });
}

/**
 * Get investors that haven't been contacted in N days
 */
export async function getStaleInvestors(days: number) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const cutoffStr = cutoff.toISOString().split("T")[0];

  return getAllRecords<InvestorFields>(TABLES.INVESTOR_POOL, {
    filterByFormula: `AND(
      OR({Pipeline Stage} = "Contacted", {Pipeline Stage} = "Intro Call", {Pipeline Stage} = "Pitch Meeting"),
      OR({Last Contacted} = "", IS_BEFORE({Last Contacted}, "${cutoffStr}"))
    )`,
  });
}

/**
 * Get investors missing email addresses
 */
export async function getInvestorsWithoutEmail() {
  return getAllRecords<InvestorFields>(TABLES.INVESTOR_POOL, {
    filterByFormula: `{Contact Email} = ""`,
    fields: ["Investor Name", "LinkedIn URL", "Organization", "Location"],
  });
}

/**
 * Get pipeline summary (count by stage)
 */
export async function getPipelineSummary(): Promise<Record<string, number>> {
  const all = await getAllRecords<InvestorFields>(TABLES.INVESTOR_POOL, {
    fields: ["Pipeline Stage"],
  });

  const summary: Record<string, number> = {};
  for (const r of all) {
    const stage = r.fields["Pipeline Stage"] || "Unknown";
    summary[stage] = (summary[stage] || 0) + 1;
  }
  return summary;
}

/**
 * Log an interaction and update investor's Last Contacted date
 */
export async function logInteraction(
  investorRecordId: string,
  interaction: {
    title: string;
    type: string;
    direction: string;
    summary: string;
    followUpRequired?: boolean;
    followUpDate?: string;
    auroviaMembers?: string;
  }
) {
  // Create interaction record
  const [interactionRecord] = await createRecords<InteractionFields>(TABLES.INTERACTIONS, [
    {
      fields: {
        "Interaction Title": interaction.title,
        "Type": interaction.type,
        "Date": new Date().toISOString().split("T")[0],
        "Direction": interaction.direction,
        "Summary": interaction.summary,
        "Investor Pool": [investorRecordId],
        "Follow-Up Required": interaction.followUpRequired ?? false,
        "Follow-Up Date": interaction.followUpDate,
        "Aurovia Members": interaction.auroviaMembers,
      },
    },
  ]);

  // Update investor's Last Contacted date
  await updateRecords<InvestorFields>(TABLES.INVESTOR_POOL, [
    {
      id: investorRecordId,
      fields: {
        "Last Contacted": new Date().toISOString().split("T")[0],
      },
    },
  ]);

  return interactionRecord;
}

/**
 * Create a pipeline task linked to an investor
 */
export async function createPipelineTask(
  investorRecordId: string | null,
  task: {
    title: string;
    type: string;
    dueDate: string;
    assignedTo?: string;
    description?: string;
  }
) {
  const fields: Partial<PipelineTaskFields> = {
    "Task Title": task.title,
    "Task Type": task.type,
    "Status": "Not Started",
    "Due Date": task.dueDate,
    "Description": task.description,
  };

  if (investorRecordId) {
    fields["Related Investor"] = [investorRecordId];
  }

  const [record] = await createRecords<PipelineTaskFields>(TABLES.PIPELINE_TASKS, [
    { fields },
  ]);

  return record;
}
