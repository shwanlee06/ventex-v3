/**
 * Compliance Calendar Router
 * Pre-populates compliance items from jurisdiction templates (UAE, US, EU)
 * Supports CRUD, auto-recurrence, and template management.
 */
import { z } from "zod";
import { router, protectedProcedure, adminProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { compliance } from "../../drizzle/schema";
import { eq, and, gte, lte, desc, asc } from "drizzle-orm";

// ─── Jurisdiction Templates ─────────────────────────────────────────────────
// Pre-built compliance templates for common jurisdictions

export interface ComplianceTemplate {
  filingType: string;
  jurisdiction: string;
  description: string;
  recurrence: "annual" | "quarterly" | "monthly" | "one-time";
  /** Month (1-12) the filing is typically due. For quarterly: first quarter month. */
  dueMonth: number;
  /** Day of month the filing is typically due */
  dueDay: number;
  category: "tax" | "corporate" | "regulatory" | "license" | "financial_reporting";
}

export const JURISDICTION_TEMPLATES: Record<string, ComplianceTemplate[]> = {
  "UAE": [
    { filingType: "Corporate Tax Return", jurisdiction: "UAE", description: "UAE Federal Corporate Tax filing (9% on profits above AED 375,000)", recurrence: "annual", dueMonth: 9, dueDay: 30, category: "tax" },
    { filingType: "VAT Return", jurisdiction: "UAE", description: "Federal Tax Authority VAT return (5%)", recurrence: "quarterly", dueMonth: 1, dueDay: 28, category: "tax" },
    { filingType: "Economic Substance Report", jurisdiction: "UAE", description: "Annual Economic Substance Regulations (ESR) notification and report", recurrence: "annual", dueMonth: 12, dueDay: 31, category: "regulatory" },
    { filingType: "Trade License Renewal", jurisdiction: "UAE", description: "Annual trade license renewal with relevant Free Zone or DED", recurrence: "annual", dueMonth: 3, dueDay: 31, category: "license" },
    { filingType: "UBO Declaration", jurisdiction: "UAE", description: "Ultimate Beneficial Owner declaration update", recurrence: "annual", dueMonth: 6, dueDay: 30, category: "corporate" },
    { filingType: "AML Compliance Report", jurisdiction: "UAE", description: "Anti-Money Laundering compliance report and suspicious transaction reporting", recurrence: "annual", dueMonth: 3, dueDay: 31, category: "regulatory" },
    { filingType: "DIFC Annual Return", jurisdiction: "UAE - DIFC", description: "Dubai International Financial Centre annual return filing", recurrence: "annual", dueMonth: 3, dueDay: 31, category: "corporate" },
    { filingType: "ADGM Annual Return", jurisdiction: "UAE - ADGM", description: "Abu Dhabi Global Market annual return filing", recurrence: "annual", dueMonth: 4, dueDay: 30, category: "corporate" },
  ],
  "US": [
    { filingType: "Federal Tax Return (1120)", jurisdiction: "US - Federal", description: "IRS Form 1120 Corporate Income Tax Return", recurrence: "annual", dueMonth: 4, dueDay: 15, category: "tax" },
    { filingType: "Partnership Return (1065)", jurisdiction: "US - Federal", description: "IRS Form 1065 for partnership/LLC tax reporting", recurrence: "annual", dueMonth: 3, dueDay: 15, category: "tax" },
    { filingType: "Quarterly Estimated Tax (1120-W)", jurisdiction: "US - Federal", description: "Quarterly estimated tax payments for corporations", recurrence: "quarterly", dueMonth: 4, dueDay: 15, category: "tax" },
    { filingType: "K-1 Distribution to Partners", jurisdiction: "US - Federal", description: "Schedule K-1 distribution to partners/LPs", recurrence: "annual", dueMonth: 3, dueDay: 15, category: "financial_reporting" },
    { filingType: "State Annual Report", jurisdiction: "US - Delaware", description: "Delaware Annual Franchise Tax Report", recurrence: "annual", dueMonth: 3, dueDay: 1, category: "corporate" },
    { filingType: "SEC Form D", jurisdiction: "US - Federal", description: "Notice of Exempt Offering of Securities (Reg D)", recurrence: "one-time", dueMonth: 1, dueDay: 15, category: "regulatory" },
    { filingType: "FinCEN BOI Report", jurisdiction: "US - Federal", description: "Beneficial Ownership Information Report (Corporate Transparency Act)", recurrence: "annual", dueMonth: 1, dueDay: 1, category: "regulatory" },
    { filingType: "FATCA Reporting", jurisdiction: "US - Federal", description: "Foreign Account Tax Compliance Act reporting", recurrence: "annual", dueMonth: 6, dueDay: 30, category: "tax" },
  ],
  "EU": [
    { filingType: "Corporate Tax Return", jurisdiction: "EU - General", description: "Annual corporate tax return (varies by member state)", recurrence: "annual", dueMonth: 6, dueDay: 30, category: "tax" },
    { filingType: "VAT Return", jurisdiction: "EU - General", description: "Quarterly VAT return filing", recurrence: "quarterly", dueMonth: 1, dueDay: 20, category: "tax" },
    { filingType: "Annual Accounts Filing", jurisdiction: "EU - General", description: "Filing of annual financial statements with Companies Registry", recurrence: "annual", dueMonth: 9, dueDay: 30, category: "financial_reporting" },
    { filingType: "UBO Register Update", jurisdiction: "EU - General", description: "Ultimate Beneficial Owner register update (AMLD5)", recurrence: "annual", dueMonth: 3, dueDay: 31, category: "regulatory" },
    { filingType: "GDPR Annual Review", jurisdiction: "EU - General", description: "Annual data protection impact assessment and privacy policy review", recurrence: "annual", dueMonth: 5, dueDay: 25, category: "regulatory" },
    { filingType: "DAC6 Reporting", jurisdiction: "EU - General", description: "Mandatory disclosure of cross-border tax arrangements", recurrence: "quarterly", dueMonth: 1, dueDay: 31, category: "tax" },
    { filingType: "Transfer Pricing Documentation", jurisdiction: "EU - General", description: "Transfer pricing master file and local file documentation", recurrence: "annual", dueMonth: 12, dueDay: 31, category: "tax" },
    { filingType: "ESG/CSRD Report", jurisdiction: "EU - General", description: "Corporate Sustainability Reporting Directive annual disclosure", recurrence: "annual", dueMonth: 4, dueDay: 30, category: "regulatory" },
  ],
  "Oman": [
    { filingType: "Corporate Tax Return", jurisdiction: "Oman", description: "Oman Income Tax Return (15% flat rate)", recurrence: "annual", dueMonth: 3, dueDay: 31, category: "tax" },
    { filingType: "VAT Return", jurisdiction: "Oman", description: "Oman Tax Authority VAT return (5%)", recurrence: "quarterly", dueMonth: 1, dueDay: 30, category: "tax" },
    { filingType: "Commercial Registration Renewal", jurisdiction: "Oman", description: "Annual renewal of Commercial Registration with MOCI", recurrence: "annual", dueMonth: 1, dueDay: 31, category: "license" },
    { filingType: "Chamber of Commerce Membership", jurisdiction: "Oman", description: "Annual Oman Chamber of Commerce membership renewal", recurrence: "annual", dueMonth: 1, dueDay: 31, category: "license" },
    { filingType: "Annual Audit Filing", jurisdiction: "Oman", description: "Submission of audited financial statements to CMA", recurrence: "annual", dueMonth: 6, dueDay: 30, category: "financial_reporting" },
  ],
};

/** Generate due dates for the next 12 months from a template */
function generateDueDates(template: ComplianceTemplate, year: number): string[] {
  const dates: string[] = [];
  if (template.recurrence === "annual" || template.recurrence === "one-time") {
    const d = new Date(year, template.dueMonth - 1, template.dueDay);
    if (d >= new Date()) {
      dates.push(d.toISOString().split("T")[0]);
    } else {
      // Next year
      const nextD = new Date(year + 1, template.dueMonth - 1, template.dueDay);
      dates.push(nextD.toISOString().split("T")[0]);
    }
  } else if (template.recurrence === "quarterly") {
    for (let q = 0; q < 4; q++) {
      const month = ((template.dueMonth - 1) + q * 3) % 12;
      const d = new Date(year, month, template.dueDay);
      if (d >= new Date()) {
        dates.push(d.toISOString().split("T")[0]);
      }
    }
    // If no dates in current year, add next year Q1
    if (dates.length === 0) {
      const d = new Date(year + 1, template.dueMonth - 1, template.dueDay);
      dates.push(d.toISOString().split("T")[0]);
    }
  } else if (template.recurrence === "monthly") {
    for (let m = 0; m < 12; m++) {
      const d = new Date(year, m, template.dueDay);
      if (d >= new Date()) {
        dates.push(d.toISOString().split("T")[0]);
      }
    }
  }
  return dates;
}

export const complianceCalendarRouter = router({
  /** Get available jurisdiction templates */
  getTemplates: protectedProcedure.query(() => {
    return Object.entries(JURISDICTION_TEMPLATES).map(([jurisdiction, templates]) => ({
      jurisdiction,
      count: templates.length,
      categories: Array.from(new Set(templates.map(t => t.category))),
      templates,
    }));
  }),

  /** Populate compliance calendar from jurisdiction templates */
  populateFromTemplate: adminProcedure
    .input(z.object({
      organizationId: z.number(),
      jurisdictions: z.array(z.string()).min(1),
      ventureId: z.number().optional(),
      spvId: z.number().optional(),
      year: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const year = input.year || new Date().getFullYear();
      let created = 0;

      for (const jurisdiction of input.jurisdictions) {
        const templates = JURISDICTION_TEMPLATES[jurisdiction];
        if (!templates) continue;

        for (const template of templates) {
          const dueDates = generateDueDates(template, year);
          for (const dueDate of dueDates) {
            await db.insert(compliance).values({
              organizationId: input.organizationId,
              ventureId: input.ventureId ?? null,
              spvId: input.spvId ?? null,
              filingType: template.filingType,
              jurisdiction: template.jurisdiction,
              dueDate,
              status: "not_started",
              notes: `${template.description}\n\nRecurrence: ${template.recurrence}\nCategory: ${template.category}`,
            });
            created++;
          }
        }
      }

      return { created, jurisdictions: input.jurisdictions };
    }),

  /** List compliance items for an org with filters */
  list: protectedProcedure
    .input(z.object({
      organizationId: z.number(),
      status: z.enum(["not_started", "in_progress", "filed", "overdue"]).optional(),
      jurisdiction: z.string().optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      const conditions: any[] = [eq(compliance.organizationId, input.organizationId as any)];
      if (input.status) conditions.push(eq(compliance.status, input.status));
      if (input.jurisdiction) conditions.push(eq(compliance.jurisdiction, input.jurisdiction));
      if (input.startDate) conditions.push(gte(compliance.dueDate, input.startDate));
      if (input.endDate) conditions.push(lte(compliance.dueDate, input.endDate));

      return db.select().from(compliance)
        .where(and(...conditions))
        .orderBy(asc(compliance.dueDate));
    }),

  /** Update a compliance item */
  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      status: z.enum(["not_started", "in_progress", "filed", "overdue"]).optional(),
      assignedTo: z.string().optional(),
      assignedToId: z.number().optional(),
      filedDate: z.string().optional(),
      filedBy: z.string().optional(),
      notes: z.string().optional(),
      documentUrl: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const { id, ...updates } = input;
      const updateSet: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(updates)) {
        if (value !== undefined) updateSet[key] = value;
      }

      if (Object.keys(updateSet).length > 0) {
        await db.update(compliance).set(updateSet).where(eq(compliance.id, id));
      }

      return { success: true };
    }),

  /** Delete a compliance item */
  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db.delete(compliance).where(eq(compliance.id, input.id));
      return { success: true };
    }),

  /** Auto-recurrence: Generate next year's items from existing filed items */
  generateRecurrence: adminProcedure
    .input(z.object({ organizationId: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Find all filed items that have recurrence info in notes
      const filedItems = await db.select().from(compliance)
        .where(and(
          eq(compliance.organizationId, input.organizationId as any),
          eq(compliance.status, "filed")
        ));

      let generated = 0;
      const nextYear = new Date().getFullYear() + 1;

      for (const item of filedItems) {
        // Parse recurrence from notes
        const recurrenceMatch = item.notes?.match(/Recurrence: (annual|quarterly|monthly)/);
        if (!recurrenceMatch) continue;

        const recurrence = recurrenceMatch[1];
        const currentDue = new Date(item.dueDate);

        let nextDueDate: Date;
        if (recurrence === "annual") {
          nextDueDate = new Date(nextYear, currentDue.getMonth(), currentDue.getDate());
        } else if (recurrence === "quarterly") {
          nextDueDate = new Date(currentDue);
          nextDueDate.setMonth(nextDueDate.getMonth() + 3);
        } else {
          nextDueDate = new Date(currentDue);
          nextDueDate.setMonth(nextDueDate.getMonth() + 1);
        }

        // Check if next item already exists
        const existing = await db.select().from(compliance)
          .where(and(
            eq(compliance.organizationId, input.organizationId as any),
            eq(compliance.filingType, item.filingType),
            eq(compliance.dueDate, nextDueDate.toISOString().split("T")[0])
          )).limit(1);

        if (existing.length === 0) {
          await db.insert(compliance).values({
            organizationId: input.organizationId,
            ventureId: item.ventureId,
            spvId: item.spvId,
            filingType: item.filingType,
            jurisdiction: item.jurisdiction,
            dueDate: nextDueDate.toISOString().split("T")[0],
            status: "not_started",
            notes: item.notes,
            assignedTo: item.assignedTo,
            assignedToId: item.assignedToId,
          });
          generated++;
        }
      }

      return { generated };
    }),
});
