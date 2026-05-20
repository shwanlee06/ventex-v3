/**
 * CSV Import Router — Bulk data ingestion for ventures, tasks, team members, SPVs
 * Provides: template generation, CSV parsing/validation, preview, and commit
 */
import { z } from "zod";
import { protectedProcedure, adminProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import {
  ventures,
  tasks,
  teamMembers,
  spvs,
  orgVentureAccess,
  activityLog,
  distributions,
} from "../../drizzle/schema";
import { eq, and, sql } from "drizzle-orm";
import { isVentexTeam, logAudit } from "../security/rbac";
import Papa from "papaparse";
import { nanoid } from "nanoid";

function slugify(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

// ─── CSV Templates ───────────────────────────────────────────────────────────

const VENTURE_TEMPLATE_HEADERS = [
  "name", "sector", "location", "stage", "status", "priority",
  "legalEntity", "jurisdiction", "dateAcquired", "currentValuation",
  "equityOwned", "keyContact", "nextMilestone", "nextMilestoneDate", "description"
];

const TASK_TEMPLATE_HEADERS = [
  "title", "ventureName", "assigneeNames", "dueDate", "priority",
  "status", "description", "escalationContact", "blockingReason"
];

const TEAM_TEMPLATE_HEADERS = [
  "name", "role", "email", "phone", "location", "type",
  "authorityLevel", "escalationPriority", "timezone"
];

const SPV_TEMPLATE_HEADERS = [
  "name", "sector", "stage", "priority", "ventureName",
  "purpose", "capitalCommitted", "capitalCalled", "capitalRemaining",
  "legalCounsel", "nextCapitalCallDate", "nextDistributionDate"
];

const DISTRIBUTION_TEMPLATE_HEADERS = [
  "name", "fund", "amount", "currency", "type", "status",
  "method", "distributionDate", "ventureName", "lpRecipients", "notes"
];

function generateCSVTemplate(headers: string[]): string {
  return headers.join(",") + "\n";
}

// ─── Validation helpers ──────────────────────────────────────────────────────

interface ValidationError {
  row: number;
  field: string;
  message: string;
  value?: string;
}

const VALID_STAGES = ["Sourcing", "Due Diligence", "Active", "Exiting", "Closed", "In Validation", "In Fundraising"];
const VALID_PRIORITIES = ["Low", "Medium", "High", "Critical"];
const VALID_STATUSES = ["In progress", "Completed", "On hold", "Cancelled"];
const VALID_TASK_STATUSES = ["open", "in_progress", "overdue", "blocked", "complete"];
const VALID_AUTHORITY_LEVELS = ["execute", "recommend", "approve"];
const VALID_SPV_STAGES = ["Active deal", "In negotiation", "Closed", "Exited", "On hold"];

function validateVentureRow(row: Record<string, string>, idx: number): ValidationError[] {
  const errors: ValidationError[] = [];
  if (!row.name?.trim()) errors.push({ row: idx, field: "name", message: "Name is required" });
  if (!row.sector?.trim()) errors.push({ row: idx, field: "sector", message: "Sector is required" });
  if (row.stage && !VALID_STAGES.includes(row.stage)) {
    errors.push({ row: idx, field: "stage", message: `Invalid stage. Must be one of: ${VALID_STAGES.join(", ")}`, value: row.stage });
  }
  if (row.priority && !VALID_PRIORITIES.includes(row.priority)) {
    errors.push({ row: idx, field: "priority", message: `Invalid priority. Must be one of: ${VALID_PRIORITIES.join(", ")}`, value: row.priority });
  }
  if (row.currentValuation && isNaN(Number(row.currentValuation))) {
    errors.push({ row: idx, field: "currentValuation", message: "Must be a number", value: row.currentValuation });
  }
  if (row.equityOwned && (isNaN(Number(row.equityOwned)) || Number(row.equityOwned) < 0 || Number(row.equityOwned) > 100)) {
    errors.push({ row: idx, field: "equityOwned", message: "Must be a number between 0 and 100", value: row.equityOwned });
  }
  return errors;
}

function validateTaskRow(row: Record<string, string>, idx: number): ValidationError[] {
  const errors: ValidationError[] = [];
  if (!row.title?.trim()) errors.push({ row: idx, field: "title", message: "Title is required" });
  if (row.priority && !VALID_PRIORITIES.includes(row.priority)) {
    errors.push({ row: idx, field: "priority", message: `Invalid priority. Must be one of: ${VALID_PRIORITIES.join(", ")}`, value: row.priority });
  }
  if (row.status && !VALID_TASK_STATUSES.includes(row.status)) {
    errors.push({ row: idx, field: "status", message: `Invalid status. Must be one of: ${VALID_TASK_STATUSES.join(", ")}`, value: row.status });
  }
  return errors;
}

function validateTeamRow(row: Record<string, string>, idx: number): ValidationError[] {
  const errors: ValidationError[] = [];
  if (!row.name?.trim()) errors.push({ row: idx, field: "name", message: "Name is required" });
  if (row.email && !row.email.includes("@")) {
    errors.push({ row: idx, field: "email", message: "Invalid email format", value: row.email });
  }
  if (row.authorityLevel && !VALID_AUTHORITY_LEVELS.includes(row.authorityLevel)) {
    errors.push({ row: idx, field: "authorityLevel", message: `Must be one of: ${VALID_AUTHORITY_LEVELS.join(", ")}`, value: row.authorityLevel });
  }
  if (row.escalationPriority && isNaN(Number(row.escalationPriority))) {
    errors.push({ row: idx, field: "escalationPriority", message: "Must be a number", value: row.escalationPriority });
  }
  return errors;
}

function validateSpvRow(row: Record<string, string>, idx: number): ValidationError[] {
  const errors: ValidationError[] = [];
  if (!row.name?.trim()) errors.push({ row: idx, field: "name", message: "Name is required" });
  if (row.capitalCommitted && isNaN(Number(row.capitalCommitted))) {
    errors.push({ row: idx, field: "capitalCommitted", message: "Must be a number", value: row.capitalCommitted });
  }
  if (row.capitalCalled && isNaN(Number(row.capitalCalled))) {
    errors.push({ row: idx, field: "capitalCalled", message: "Must be a number", value: row.capitalCalled });
  }
  return errors;
}

function validateDistributionRow(row: Record<string, string>, idx: number): ValidationError[] {
  const errors: ValidationError[] = [];
  if (!row.name?.trim()) errors.push({ row: idx, field: "name", message: "Name is required" });
  if (!row.amount?.trim()) errors.push({ row: idx, field: "amount", message: "Amount is required" });
  if (row.amount && isNaN(Number(row.amount))) {
    errors.push({ row: idx, field: "amount", message: "Must be a number", value: row.amount });
  }
  return errors;
}

// ─── Router ──────────────────────────────────────────────────────────────────

export const csvImportRouter = router({
  // Get CSV template for a given entity type
  getTemplate: protectedProcedure
    .input(z.object({
      entityType: z.enum(["ventures", "tasks", "team", "spvs", "distributions"]),
    }))
    .query(({ input }) => {
      const headers: Record<string, string[]> = {
        ventures: VENTURE_TEMPLATE_HEADERS,
        tasks: TASK_TEMPLATE_HEADERS,
        team: TEAM_TEMPLATE_HEADERS,
        spvs: SPV_TEMPLATE_HEADERS,
        distributions: DISTRIBUTION_TEMPLATE_HEADERS,
      };
      const exampleRows: Record<string, string> = {
        ventures: '"Acme Real Estate","Real Estate","Dubai, UAE","Active","In progress","High","Acme Holdings LLC","DIFC, UAE","2023-06-15","5000000","75","John Smith","Phase 2 completion","2026-08-01","Mixed-use development project"',
        tasks: '"Complete due diligence report","Acme Real Estate","John Smith; Jane Doe","2026-06-30","High","open","Review all financials and legal docs","Jane Doe",""',
        team: '"John Smith","Managing Director","john@example.com","+1-555-0100","Dubai, UAE","Internal","approve","1","Asia/Dubai"',
        spvs: '"Acme Capital SPV I","Real Estate","Active deal","High","Acme Real Estate","Equity investment vehicle for Acme project","10000000","7500000","2500000","Baker McKenzie","2026-09-01","2026-12-15"',
        distributions: '"Q2 2026 Distribution","Acme Capital Fund","500000","USD","Dividend","Scheduled","Wire","2026-06-30","Acme Real Estate","LP1@email.com; LP2@email.com","Quarterly distribution"',
      };
      return {
        csv: generateCSVTemplate(headers[input.entityType]) + exampleRows[input.entityType] + "\n",
        headers: headers[input.entityType],
      };
    }),

  // Parse and validate CSV data without committing
  preview: protectedProcedure
    .input(z.object({
      entityType: z.enum(["ventures", "tasks", "team", "spvs", "distributions"]),
      csvContent: z.string().max(5_000_000), // 5MB max
      organizationId: z.number(),
    }))
    .mutation(({ input }) => {
      const parsed = Papa.parse<Record<string, string>>(input.csvContent, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (h) => h.trim(),
      });

      if (parsed.errors.length > 0) {
        return {
          success: false,
          parseErrors: parsed.errors.slice(0, 10).map(e => ({
            row: e.row,
            message: e.message,
          })),
          rows: [],
          validationErrors: [],
          totalRows: 0,
        };
      }

      const rows = parsed.data;
      let validationErrors: ValidationError[] = [];

      const validators: Record<string, (row: Record<string, string>, idx: number) => ValidationError[]> = {
        ventures: validateVentureRow,
        tasks: validateTaskRow,
        team: validateTeamRow,
        spvs: validateSpvRow,
        distributions: validateDistributionRow,
      };

      const validator = validators[input.entityType];
      for (let i = 0; i < rows.length; i++) {
        const rowErrors = validator(rows[i], i + 1);
        validationErrors.push(...rowErrors);
      }

      return {
        success: validationErrors.length === 0,
        parseErrors: [],
        rows: rows.slice(0, 100), // Preview first 100 rows
        validationErrors: validationErrors.slice(0, 50), // First 50 errors
        totalRows: rows.length,
      };
    }),

  // Commit the import — actually insert data
  commit: adminProcedure
    .input(z.object({
      entityType: z.enum(["ventures", "tasks", "team", "spvs", "distributions"]),
      csvContent: z.string().max(5_000_000),
      organizationId: z.number(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const parsed = Papa.parse<Record<string, string>>(input.csvContent, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (h) => h.trim(),
      });

      if (parsed.errors.length > 0) {
        throw new Error(`CSV parse error: ${parsed.errors[0].message}`);
      }

      const rows = parsed.data;
      let created = 0;
      let skipped = 0;
      const errors: string[] = [];

      if (input.entityType === "ventures") {
        for (const row of rows) {
          const errs = validateVentureRow(row, created + 1);
          if (errs.length > 0) { skipped++; errors.push(`Row ${created + skipped}: ${errs[0].message}`); continue; }

          const slug = slugify(row.name) + "-" + nanoid(4);
          try {
            await db.insert(ventures).values({
              name: row.name.trim(),
              sector: row.sector?.trim() || "Others",
              location: row.location?.trim() || "TBD",
              stage: row.stage?.trim() || "Sourcing",
              status: row.status?.trim() || "In progress",
              priority: row.priority?.trim() || "Medium",
              legalEntity: row.legalEntity?.trim() || undefined,
              jurisdiction: row.jurisdiction?.trim() || undefined,
              dateAcquired: row.dateAcquired?.trim() || undefined,
              currentValuation: row.currentValuation?.trim() || undefined,
              equityOwned: row.equityOwned?.trim() || undefined,
              keyContact: row.keyContact?.trim() || undefined,
              nextMilestone: row.nextMilestone?.trim() || undefined,
              nextMilestoneDate: row.nextMilestoneDate?.trim() || undefined,
              description: row.description?.trim() || undefined,
              slug,
              organizationId: input.organizationId,
            });

            // Link to org
            const [newVenture] = await db.select({ id: ventures.id }).from(ventures).where(eq(ventures.slug, slug)).limit(1);
            if (newVenture) {
              await db.insert(orgVentureAccess).values({
                organizationId: input.organizationId,
                ventureId: newVenture.id,
                permission: "full",
                grantedBy: ctx.user.id,
              });
            }
            created++;
          } catch (err: any) {
            skipped++;
            errors.push(`Row ${created + skipped}: ${err.message?.slice(0, 100)}`);
          }
        }
      } else if (input.entityType === "tasks") {
        // Resolve venture names to IDs
        const ventureRows = await db.select({ id: ventures.id, name: ventures.name })
          .from(ventures)
          .where(eq(ventures.organizationId, input.organizationId));
        const ventureNameMap: Record<string, number> = {};
        for (const v of ventureRows) {
          ventureNameMap[v.name.toLowerCase()] = v.id;
        }

        for (const row of rows) {
          const errs = validateTaskRow(row, created + 1);
          if (errs.length > 0) { skipped++; errors.push(`Row ${created + skipped}: ${errs[0].message}`); continue; }

          const ventureId = row.ventureName ? ventureNameMap[row.ventureName.toLowerCase().trim()] || null : null;
          const assigneeNames = row.assigneeNames
            ? row.assigneeNames.split(";").map(n => n.trim()).filter(Boolean)
            : undefined;

          try {
            await db.insert(tasks).values({
              title: row.title.trim(),
              ventureId,
              ventureLink: row.ventureName?.trim() || undefined,
              assigneeNames: assigneeNames?.length ? assigneeNames : undefined,
              dueDate: row.dueDate?.trim() || undefined,
              priority: row.priority?.trim() || "Medium",
              status: row.status?.trim() || "open",
              description: row.description?.trim() || undefined,
              escalationContact: row.escalationContact?.trim() || undefined,
              blockingReason: row.blockingReason?.trim() || undefined,
              organizationId: input.organizationId,
            });
            created++;
          } catch (err: any) {
            skipped++;
            errors.push(`Row ${created + skipped}: ${err.message?.slice(0, 100)}`);
          }
        }
      } else if (input.entityType === "team") {
        for (const row of rows) {
          const errs = validateTeamRow(row, created + 1);
          if (errs.length > 0) { skipped++; errors.push(`Row ${created + skipped}: ${errs[0].message}`); continue; }

          const slug = slugify(row.name) + "-" + nanoid(4);
          try {
            await db.insert(teamMembers).values({
              name: row.name.trim(),
              role: row.role?.trim() || undefined,
              email: row.email?.trim() || undefined,
              phone: row.phone?.trim() || undefined,
              location: row.location?.trim() || undefined,
              type: row.type?.trim() || "Internal",
              authorityLevel: (row.authorityLevel?.trim() as any) || "execute",
              escalationPriority: row.escalationPriority ? Number(row.escalationPriority) : 99,
              timezone: row.timezone?.trim() || undefined,
              slug,
              organizationId: input.organizationId,
            });
            created++;
          } catch (err: any) {
            skipped++;
            errors.push(`Row ${created + skipped}: ${err.message?.slice(0, 100)}`);
          }
        }
      } else if (input.entityType === "spvs") {
        // Resolve venture names to IDs
        const ventureRows = await db.select({ id: ventures.id, name: ventures.name })
          .from(ventures)
          .where(eq(ventures.organizationId, input.organizationId));
        const ventureNameMap: Record<string, number> = {};
        for (const v of ventureRows) {
          ventureNameMap[v.name.toLowerCase()] = v.id;
        }

        for (const row of rows) {
          const errs = validateSpvRow(row, created + 1);
          if (errs.length > 0) { skipped++; errors.push(`Row ${created + skipped}: ${errs[0].message}`); continue; }

          const slug = slugify(row.name) + "-" + nanoid(4);
          const ventureId = row.ventureName ? ventureNameMap[row.ventureName.toLowerCase().trim()] || null : null;

          try {
            await db.insert(spvs).values({
              name: row.name.trim(),
              sector: row.sector?.trim() || undefined,
              stage: row.stage?.trim() || "Active deal",
              priority: row.priority?.trim() || "Medium",
              ventureId,
              purpose: row.purpose?.trim() || undefined,
              capitalCommitted: row.capitalCommitted?.trim() || undefined,
              capitalCalled: row.capitalCalled?.trim() || undefined,
              capitalRemaining: row.capitalRemaining?.trim() || undefined,
              legalCounsel: row.legalCounsel?.trim() || undefined,
              nextCapitalCallDate: row.nextCapitalCallDate?.trim() || undefined,
              nextDistributionDate: row.nextDistributionDate?.trim() || undefined,
              slug,
              organizationId: input.organizationId,
            });
            created++;
          } catch (err: any) {
            skipped++;
            errors.push(`Row ${created + skipped}: ${err.message?.slice(0, 100)}`);
          }
        }
      } else if (input.entityType === "distributions") {
        // Resolve venture names to IDs
        const ventureRows = await db.select({ id: ventures.id, name: ventures.name })
          .from(ventures)
          .where(eq(ventures.organizationId, input.organizationId));
        const ventureNameMap: Record<string, number> = {};
        for (const v of ventureRows) {
          ventureNameMap[v.name.toLowerCase()] = v.id;
        }

        for (const row of rows) {
          const errs = validateDistributionRow(row, created + 1);
          if (errs.length > 0) { skipped++; errors.push(`Row ${created + skipped}: ${errs[0].message}`); continue; }

          const ventureId = row.ventureName ? ventureNameMap[row.ventureName.toLowerCase().trim()] || null : null;
          const lpRecipients = row.lpRecipients
            ? row.lpRecipients.split(";").map(n => n.trim()).filter(Boolean)
            : undefined;

          try {
            await db.insert(distributions).values({
              name: row.name.trim(),
              fund: row.fund?.trim() || undefined,
              amount: Number(row.amount) || 0,
              currency: row.currency?.trim() || "USD",
              type: row.type?.trim() || undefined,
              status: row.status?.trim() || "Scheduled",
              method: row.method?.trim() || undefined,
              distributionDate: row.distributionDate?.trim() || undefined,
              ventureId: ventureId as any,
              lpRecipients: lpRecipients?.length ? lpRecipients : undefined,
              notes: row.notes?.trim() || undefined,
              organizationId: input.organizationId,
            });
            created++;
          } catch (err: any) {
            skipped++;
            errors.push(`Row ${created + skipped}: ${err.message?.slice(0, 100)}`);
          }
        }
      }

      // Log the import
      await db.insert(activityLog).values({
        entityType: "system",
        entityName: "CSV Import",
        action: `Imported ${created} ${input.entityType}`,
        detail: `CSV import: ${created} created, ${skipped} skipped${errors.length > 0 ? `. First error: ${errors[0]}` : ""}`,
        userName: ctx.user.name || "System",
        activitySource: "system",
        organizationId: input.organizationId,
      });

      await logAudit({
        organizationId: input.organizationId,
        userId: ctx.user.id,
        userName: ctx.user.name,
        action: "csv_import",
        entityType: input.entityType,
        entityId: "bulk",
        entityName: `${created} ${input.entityType}`,
        details: JSON.stringify({ created, skipped, errorCount: errors.length }),
      });

      return { created, skipped, errors: errors.slice(0, 10), totalRows: rows.length };
    }),
});
