import { z } from "zod";
import { protectedProcedure, adminProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import {
  documentIntelligence, ventureFiles, spvFiles, ventureRisks,
  tasks, notifications, meetingBriefs, ventures, teamMembers, activityLog,
  orgVentureAccess,
} from "../../drizzle/schema";
import { isAtlasTeam, getOrgVentureIds } from "../security/rbac";
import { TRPCError } from "@trpc/server";
import { eq, desc, and, sql, like, or } from "drizzle-orm";
import { invokeLLM } from "../_core/llm";
import { createNotification, NOTIF_TYPES } from "../notificationHelper";

// ── Text extraction helpers ────────────────────────────────────────────

async function extractPdfText(buffer: Buffer): Promise<string> {
  try {
    const { PDFParse } = await import("pdf-parse");
    const parser = new PDFParse({ data: buffer });
    const result = await parser.getText();
    return result.text || "";
  } catch (e) {
    console.error("PDF extraction failed:", e);
    return "";
  }
}

async function extractDocxText(buffer: Buffer): Promise<string> {
  try {
    const mammoth = await import("mammoth");
    const result = await mammoth.extractRawText({ buffer });
    return result.value || "";
  } catch (e) {
    console.error("DOCX extraction failed:", e);
    return "";
  }
}

async function extractXlsxText(buffer: Buffer): Promise<string> {
  try {
    const XLSX = await import("xlsx");
    const workbook = XLSX.read(buffer, { type: "buffer" });
    let text = "";
    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      text += `--- Sheet: ${sheetName} ---\n`;
      text += XLSX.utils.sheet_to_csv(sheet) + "\n\n";
    }
    return text;
  } catch (e) {
    console.error("XLSX extraction failed:", e);
    return "";
  }
}

async function describeImageWithVision(fileUrl: string): Promise<string> {
  try {
    const result = await invokeLLM({
      messages: [
        { role: "system", content: "Describe this image in detail. If it contains text, transcribe it. If it's a chart, describe the data. If it's an org chart or diagram, describe the structure." },
        {
          role: "user",
          content: [
            { type: "image_url", image_url: { url: fileUrl, detail: "high" } },
            { type: "text", text: "Describe this image in detail." },
          ],
        },
      ],
    });
    return result.choices[0]?.message?.content as string || "";
  } catch (e) {
    console.error("Vision extraction failed:", e);
    return "";
  }
}

// ── Claude classification ──────────────────────────────────────────────

async function classifyDocument(rawText: string, filename: string): Promise<{
  document_type: string;
  key_entities: string[];
  key_financial_figures: { label: string; value: string; currency: string }[];
  action_items: string[];
  deadlines: { description: string; date: string }[];
  risks_mentioned: string[];
  summary: string;
  sentiment: string;
}> {
  const truncated = rawText.slice(0, 12000); // Limit context size
  const result = await invokeLLM({
    messages: [
      {
        role: "system",
        content: `You are a document intelligence analyst for a venture holding company. Analyze the following document and return structured JSON. Be thorough but concise.`,
      },
      {
        role: "user",
        content: `Analyze this document (filename: "${filename}"):

${truncated}

Return a JSON object with these fields:
- document_type: one of "meeting_minutes", "legal_contract", "financial_model", "pitch_deck", "due_diligence", "invoice", "term_sheet", "correspondence", "other"
- key_entities: array of company names, people names, dates, locations mentioned
- key_financial_figures: array of {label, value, currency} for any financial numbers found
- action_items: array of action items or to-dos mentioned
- deadlines: array of {description, date} for any deadlines mentioned (use YYYY-MM-DD format)
- risks_mentioned: array of risks or concerns mentioned
- summary: 2-3 sentence plain English summary
- sentiment: one of "positive", "neutral", "negative", "urgent"

Return ONLY valid JSON, no markdown fences.`,
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "document_classification",
        strict: true,
        schema: {
          type: "object",
          properties: {
            document_type: { type: "string" },
            key_entities: { type: "array", items: { type: "string" } },
            key_financial_figures: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  label: { type: "string" },
                  value: { type: "string" },
                  currency: { type: "string" },
                },
                required: ["label", "value", "currency"],
                additionalProperties: false,
              },
            },
            action_items: { type: "array", items: { type: "string" } },
            deadlines: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  description: { type: "string" },
                  date: { type: "string" },
                },
                required: ["description", "date"],
                additionalProperties: false,
              },
            },
            risks_mentioned: { type: "array", items: { type: "string" } },
            summary: { type: "string" },
            sentiment: { type: "string" },
          },
          required: [
            "document_type", "key_entities", "key_financial_figures",
            "action_items", "deadlines", "risks_mentioned", "summary", "sentiment",
          ],
          additionalProperties: false,
        },
      },
    },
  });

  const content = result.choices[0]?.message?.content;
  const text = typeof content === "string" ? content : "";
  try {
    return JSON.parse(text);
  } catch {
    return {
      document_type: "other",
      key_entities: [],
      key_financial_figures: [],
      action_items: [],
      deadlines: [],
      risks_mentioned: [],
      summary: "Document could not be fully analyzed.",
      sentiment: "neutral",
    };
  }
}

// ── Meeting brief generator ────────────────────────────────────────────

async function generateMeetingBrief(rawText: string, filename: string, teamNames: string[]): Promise<{
  meetingDate: string;
  attendees: string[];
  keyDecisions: string[];
  actionItems: { item: string; assignee: string }[];
  nextMeetingDate: string;
  headline: string;
  summary: string;
}> {
  const truncated = rawText.slice(0, 12000);
  const result = await invokeLLM({
    messages: [
      {
        role: "system",
        content: `You are a meeting intelligence analyst. Extract structured meeting information. Known team members: ${teamNames.join(", ")}. Match action item assignees to these names when possible.`,
      },
      {
        role: "user",
        content: `Analyze these meeting minutes (filename: "${filename}"):

${truncated}

Return JSON with:
- meetingDate: date of meeting (YYYY-MM-DD or "unknown")
- attendees: array of people who attended
- keyDecisions: array of key decisions made
- actionItems: array of {item, assignee} where assignee is matched to known team members or "Unassigned"
- nextMeetingDate: next meeting date if mentioned, or "unknown"
- headline: one-line headline summarizing the meeting
- summary: 2-3 paragraph summary

Return ONLY valid JSON.`,
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "meeting_brief",
        strict: true,
        schema: {
          type: "object",
          properties: {
            meetingDate: { type: "string" },
            attendees: { type: "array", items: { type: "string" } },
            keyDecisions: { type: "array", items: { type: "string" } },
            actionItems: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  item: { type: "string" },
                  assignee: { type: "string" },
                },
                required: ["item", "assignee"],
                additionalProperties: false,
              },
            },
            nextMeetingDate: { type: "string" },
            headline: { type: "string" },
            summary: { type: "string" },
          },
          required: ["meetingDate", "attendees", "keyDecisions", "actionItems", "nextMeetingDate", "headline", "summary"],
          additionalProperties: false,
        },
      },
    },
  });

  const content = result.choices[0]?.message?.content;
  const text = typeof content === "string" ? content : "";
  try {
    return JSON.parse(text);
  } catch {
    return {
      meetingDate: "unknown",
      attendees: [],
      keyDecisions: [],
      actionItems: [],
      nextMeetingDate: "unknown",
      headline: "Meeting brief could not be generated",
      summary: "",
    };
  }
}

// ── Router ─────────────────────────────────────────────────────────────

export const documentIntelligenceRouter = router({
  // Process a file (called after upload)
  processFile: adminProcedure
    .input(z.object({
      fileId: z.number(),
      ventureId: z.number().optional(),
      spvId: z.number().optional(),
      fileUrl: z.string(),
      filename: z.string(),
      fileType: z.string(),
      fileSize: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // File size check (10MB limit for processing)
      if (input.fileSize && input.fileSize > 10 * 1024 * 1024) {
        return { success: false, reason: "File too large for AI analysis (>10MB)" };
      }

      // Create initial record
      const [inserted] = await db.insert(documentIntelligence).values({
        fileId: input.fileId,
        ventureId: input.ventureId || null,
        spvId: input.spvId || null,
        processingStatus: "processing",
      });
      const docIntelId = inserted.insertId;

      // Run processing async (don't block the response)
      processDocumentAsync(db, docIntelId, input).catch(err => {
        console.error("Document processing failed:", err);
        db.update(documentIntelligence)
          .set({ processingStatus: "failed" })
          .where(eq(documentIntelligence.id, Number(docIntelId)))
          .catch(() => {});
      });

      return { success: true, docIntelId: Number(docIntelId) };
    }),

  // Get intelligence for a specific file
  getByFileId: adminProcedure
    .input(z.object({ fileId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;
      const rows = await db.select().from(documentIntelligence)
        .where(eq(documentIntelligence.fileId, input.fileId)).limit(1);
      return rows[0] || null;
    }),

  // Get all intelligence for a venture
  getByVenture: adminProcedure
    .input(z.object({ ventureId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      return db.select().from(documentIntelligence)
        .where(eq(documentIntelligence.ventureId, input.ventureId))
        .orderBy(desc(documentIntelligence.processedAt));
    }),

  // Get all intelligence for an SPV
  getBySpv: adminProcedure
    .input(z.object({ spvId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      return db.select().from(documentIntelligence)
        .where(eq(documentIntelligence.spvId, input.spvId))
        .orderBy(desc(documentIntelligence.processedAt));
    }),

  // Get recent intelligence feed (for dashboard)
  recentFeed: adminProcedure
    .input(z.object({ limit: z.number().default(10) }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      // Join with venture_files to get filename and venture name
      const rows = await db.select({
        id: documentIntelligence.id,
        fileId: documentIntelligence.fileId,
        ventureId: documentIntelligence.ventureId,
        spvId: documentIntelligence.spvId,
        documentType: documentIntelligence.documentType,
        summary: documentIntelligence.summary,
        sentiment: documentIntelligence.sentiment,
        actionItems: documentIntelligence.actionItems,
        deadlines: documentIntelligence.deadlines,
        processingStatus: documentIntelligence.processingStatus,
        processedAt: documentIntelligence.processedAt,
        createdAt: documentIntelligence.createdAt,
      })
        .from(documentIntelligence)
        .where(eq(documentIntelligence.processingStatus, "completed"))
        .orderBy(desc(documentIntelligence.processedAt))
        .limit(input.limit);
      return rows;
    }),

  // Retry failed processing
  retryProcessing: adminProcedure
    .input(z.object({ docIntelId: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db.update(documentIntelligence)
        .set({ processingStatus: "pending" })
        .where(eq(documentIntelligence.id, input.docIntelId));
      return { success: true };
    }),

  // Get risks for a venture
  getVentureRisks: adminProcedure
    .input(z.object({ ventureId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      return db.select().from(ventureRisks)
        .where(eq(ventureRisks.ventureId, input.ventureId))
        .orderBy(desc(ventureRisks.identifiedAt));
    }),

  // Update risk status
  updateRiskStatus: adminProcedure
    .input(z.object({ riskId: z.number(), status: z.string() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db.update(ventureRisks)
        .set({ status: input.status })
        .where(eq(ventureRisks.id, input.riskId));
      return { success: true };
    }),

  // Get meeting briefs for a venture
  getMeetingBriefs: adminProcedure
    .input(z.object({ ventureId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      return db.select().from(meetingBriefs)
        .where(eq(meetingBriefs.ventureId, input.ventureId))
        .orderBy(desc(meetingBriefs.createdAt));
    }),

  // Search across document text
  searchDocuments: adminProcedure
    .input(z.object({ query: z.string(), ventureId: z.number().optional() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      const conditions = [
        like(documentIntelligence.rawText, `%${input.query}%`),
      ];
      if (input.ventureId) {
        conditions.push(eq(documentIntelligence.ventureId, input.ventureId));
      }
      return db.select().from(documentIntelligence)
        .where(and(...conditions))
        .orderBy(desc(documentIntelligence.processedAt))
        .limit(20);
    }),
});

// ── Async processing function ──────────────────────────────────────────

async function processDocumentAsync(db: any, docIntelId: number, input: {
  fileId: number;
  ventureId?: number;
  spvId?: number;
  fileUrl: string;
  filename: string;
  fileType: string;
}) {
  let rawText = "";
  const ext = input.filename.toLowerCase();
  const mimeType = input.fileType.toLowerCase();

  // Extract text based on file type
  if (mimeType.includes("pdf") || ext.endsWith(".pdf")) {
    const response = await fetch(input.fileUrl);
    const buffer = Buffer.from(await response.arrayBuffer());
    rawText = await extractPdfText(buffer);
  } else if (mimeType.includes("word") || ext.endsWith(".docx") || ext.endsWith(".doc")) {
    const response = await fetch(input.fileUrl);
    const buffer = Buffer.from(await response.arrayBuffer());
    rawText = await extractDocxText(buffer);
  } else if (mimeType.includes("sheet") || mimeType.includes("excel") || ext.endsWith(".xlsx") || ext.endsWith(".xls") || ext.endsWith(".csv")) {
    const response = await fetch(input.fileUrl);
    const buffer = Buffer.from(await response.arrayBuffer());
    rawText = await extractXlsxText(buffer);
  } else if (mimeType.startsWith("image/")) {
    rawText = await describeImageWithVision(input.fileUrl);
  } else if (mimeType.includes("text") || ext.endsWith(".txt") || ext.endsWith(".md")) {
    const response = await fetch(input.fileUrl);
    rawText = await response.text();
  } else {
    // Unsupported type — mark as completed with minimal info
    await db.update(documentIntelligence).set({
      processingStatus: "completed",
      summary: "File type not supported for text extraction.",
      documentType: "other",
      sentiment: "neutral",
      processedAt: new Date(),
    }).where(eq(documentIntelligence.id, docIntelId));
    return;
  }

  if (!rawText || rawText.trim().length < 10) {
    await db.update(documentIntelligence).set({
      processingStatus: "completed",
      summary: "No extractable text found in document.",
      documentType: "other",
      sentiment: "neutral",
      rawText: rawText || "",
      processedAt: new Date(),
    }).where(eq(documentIntelligence.id, docIntelId));
    return;
  }

  // Classify with Claude
  const classification = await classifyDocument(rawText, input.filename);

  // Update intelligence record
  await db.update(documentIntelligence).set({
    documentType: classification.document_type,
    summary: classification.summary,
    sentiment: classification.sentiment,
    keyEntities: classification.key_entities,
    keyFinancialFigures: classification.key_financial_figures,
    actionItems: classification.action_items,
    deadlines: classification.deadlines,
    risksMentioned: classification.risks_mentioned,
    rawText,
    processingStatus: "completed",
    processedAt: new Date(),
  }).where(eq(documentIntelligence.id, docIntelId));

  // ── Auto-create tasks from action items ──────────────────────────────
  let tasksCreated = 0;
  if (classification.action_items.length > 0 && input.ventureId) {
    for (const item of classification.action_items) {
      // Fuzzy check: see if a similar task already exists
      const existing = await db.select().from(tasks)
        .where(and(
          eq(tasks.ventureId, input.ventureId),
          like(tasks.title, `%${item.slice(0, 30)}%`),
        )).limit(1);

      if (existing.length === 0) {
        // Find matching deadline
        const matchingDeadline = classification.deadlines.find(d =>
          item.toLowerCase().includes(d.description.toLowerCase().slice(0, 20))
        );

        await db.insert(tasks).values({
          title: item,
          ventureId: input.ventureId,
          dueDate: matchingDeadline?.date || null,
          status: "open",
          priority: "Medium",
          description: `Auto-created from document: ${input.filename}`,
        });
        tasksCreated++;
      }
    }
  }

  // ── Auto-create notifications from deadlines ─────────────────────────
  if (classification.deadlines.length > 0) {
    for (const deadline of classification.deadlines) {
      const deadlineDate = new Date(deadline.date);
      const daysUntil = Math.ceil((deadlineDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      const isUrgent = daysUntil <= 7 && daysUntil >= 0;

      await db.insert(notifications).values({
        type: isUrgent ? "urgent" : "deadline",
        title: `Deadline detected in ${input.filename}`,
        message: `${deadline.description} due ${deadline.date}${isUrgent ? ` (${daysUntil} days away)` : ""}`,
        entityType: input.ventureId ? "venture" : "spv",
        entityId: input.ventureId || input.spvId || null,
      });
    }
  }

  // ── Auto-create venture risks ────────────────────────────────────────
  if (classification.risks_mentioned.length > 0 && input.ventureId) {
    for (const risk of classification.risks_mentioned) {
      await db.insert(ventureRisks).values({
        ventureId: input.ventureId,
        riskDescription: risk,
        sourceFileId: input.fileId,
        status: "Monitoring",
      });
    }
  }

  // ── Meeting minutes special processing ───────────────────────────────
  if (classification.document_type === "meeting_minutes" && input.ventureId) {
    const allTeam = await db.select({ name: teamMembers.name }).from(teamMembers);
    const teamNames = allTeam.map((t: any) => t.name);

    const brief = await generateMeetingBrief(rawText, input.filename, teamNames);

    await db.insert(meetingBriefs).values({
      fileId: input.fileId,
      ventureId: input.ventureId,
      meetingDate: brief.meetingDate,
      attendees: brief.attendees,
      keyDecisions: brief.keyDecisions,
      actionItems: brief.actionItems,
      nextMeetingDate: brief.nextMeetingDate,
      headline: brief.headline,
      summary: brief.summary,
    });

    // Notify team
    await db.insert(notifications).values({
      type: "meeting_brief",
      title: `New meeting brief: ${brief.headline}`,
      message: `Meeting brief generated from ${input.filename}`,
      entityType: "venture",
      entityId: input.ventureId,
    });
  }

  // ── Urgent document banner ───────────────────────────────────────────
  if (classification.sentiment === "urgent" && input.ventureId) {
    await db.insert(notifications).values({
      type: "urgent",
      title: `Urgent document uploaded`,
      message: `${input.filename} requires immediate review`,
      entityType: "venture",
      entityId: input.ventureId,
    });
  }

  // ── Activity log ─────────────────────────────────────────────────────
  if (input.ventureId) {
    const [v] = await db.select().from(ventures).where(eq(ventures.id, input.ventureId)).limit(1);
    await db.insert(activityLog).values({
      entityType: "document",
      entityId: input.fileId,
      entityName: input.filename,
      action: "Document analyzed",
      detail: `${classification.document_type} — ${classification.summary?.slice(0, 100)}. ${tasksCreated} tasks created, ${classification.deadlines.length} deadlines, ${classification.risks_mentioned.length} risks.`,
      sector: v?.sector || "",
      activitySource: "system",
    });

    // Notification for document analysis
    await createNotification({
      type: NOTIF_TYPES.DOCUMENT_ANALYZED,
      category: classification.risks_mentioned.length > 2 ? "critical" : "info",
      title: `Document Analyzed: ${input.filename}`,
      message: `${classification.document_type} — ${tasksCreated} tasks, ${classification.deadlines.length} deadlines, ${classification.risks_mentioned.length} risks`,
      entityType: "document",
      entityId: input.fileId,
      entityName: input.filename,
      link: v ? `/ventures/${v.slug}` : undefined,
      actorName: "AI System",
    });

    // Extra notification for high-risk documents (3+ risks mentioned)
    if (classification.risks_mentioned.length >= 3) {
      await createNotification({
        type: NOTIF_TYPES.DOCUMENT_URGENT,
        category: "critical",
        title: `HIGH RISK: ${input.filename}`,
        message: `${classification.risks_mentioned.length} risks detected — ${classification.summary?.slice(0, 120)}`,
        entityType: "document",
        entityId: input.fileId,
        entityName: input.filename,
        link: v ? `/ventures/${v.slug}` : undefined,
        actorName: "AI System",
      });
    }
  }
}
