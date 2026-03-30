// ============================================================================
// ATLAS Blueprint Extraction Engine
// Document extraction, conversation extraction, venture mapping,
// venture mapping, and refinement
// ============================================================================
import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import {
  processTemplates,
  processSteps,
  ventureProcessTracking,
  ventures,
  ventureFiles,
  orgVentureAccess,
} from "../../drizzle/schema";
import { eq, and, sql, desc, inArray } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { invokeLLM } from "../_core/llm";
import { storagePut } from "../storage";

// ── LLM extraction prompt ────────────────────────────────────────────────
const EXTRACTION_SYSTEM_PROMPT = `You are an expert at analyzing business documents and extracting structured process blueprints for venture/investment management.

Given a document about a business process (e.g., real estate acquisition, yacht charter setup, F&B licensing), extract a structured blueprint with:
1. A clear blueprint name
2. The business sector it applies to
3. Stages (in order) with steps within each stage

For each step, identify:
- stepName: clear action description
- isBlocking: whether this step must be completed before the venture can advance
- whoOwns: who is responsible (e.g., "Legal Team", "Client", "ATLAS Operator", "Government Agency")
- estimatedDays: rough estimate of how many days this step typically takes
- evidence: brief note about why this step is needed
- confidence: "High", "Medium", or "Low" based on how clearly the document describes it

Output ONLY valid JSON in this exact format:
{
  "blueprintName": "string",
  "sector": "string",
  "confidence": "High" | "Medium" | "Low",
  "stages": [
    {
      "stageName": "string",
      "stageOrder": number,
      "steps": [
        {
          "stepName": "string",
          "stepOrder": number,
          "isBlocking": boolean,
          "whoOwns": "string",
          "estimatedDays": number,
          "evidence": "string",
          "confidence": "High" | "Medium" | "Low"
        }
      ]
    }
  ]
}`;

const CONVERSATION_SYSTEM_PROMPT = `You are ATLAS Concierge, an expert at understanding business processes through conversation. Your job is to help operators describe their venture management processes so you can build a structured blueprint.

Ask targeted questions about:
1. What sector/industry is this for?
2. What are the major stages a venture goes through?
3. For each stage, what specific steps need to happen?
4. Which steps are blocking (must complete before moving on)?
5. Who owns each step?
6. How long does each step typically take?

Be conversational but efficient. After each answer, acknowledge what you learned and ask the next most important question. When you have enough information for a complete blueprint (at least 2 stages with 2+ steps each), say "I think I have enough to build your blueprint. Let me put it together." and then output the structured JSON in the same format as the document extraction.

IMPORTANT: Only output the JSON when you have gathered enough information. Until then, just have a natural conversation.`;

// ── Stage pipeline for smart pre-marking ─────────────────────────────────
const STAGE_PIPELINE = [
  "In Validation",
  "In Structuring",
  "In Capitalization",
  "In Execution",
  "Post-Closing",
  "Operational",
  "In Distribution",
  "Completed",
];

function getStageIndex(stage: string): number {
  return STAGE_PIPELINE.indexOf(stage);
}

// ── Router ───────────────────────────────────────────────────────────────
export const blueprintsRouter = router({
  // ── Extract blueprint from document text ──────────────────────────────
  extractFromDocument: protectedProcedure
    .input(z.object({
      documentText: z.string().min(50),
      organizationId: z.number(),
      sourceDocumentUrl: z.string().optional(),
      sourceDocumentName: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const response = await invokeLLM({
        messages: [
          { role: "system", content: EXTRACTION_SYSTEM_PROMPT },
          { role: "user", content: `Extract a process blueprint from this document:\n\n${input.documentText}` },
        ],
      });

      const content = response.choices?.[0]?.message?.content as string;
      if (!content) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "LLM returned empty response" });

      // Parse JSON from response (handle markdown code blocks)
      let jsonStr = content;
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) jsonStr = jsonMatch[1];

      let blueprint: any;
      try {
        blueprint = JSON.parse(jsonStr.trim());
      } catch {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to parse blueprint JSON from LLM" });
      }

      // Save to database
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      const [template] = await db.insert(processTemplates).values({
        organizationId: input.organizationId,
        sector: blueprint.sector || "General",
        blueprintName: blueprint.blueprintName || "Untitled Blueprint",
        source: "document",
        confidence: blueprint.confidence || "Medium",
        sourceDocumentUrl: input.sourceDocumentUrl || null,
        sourceDocumentName: input.sourceDocumentName || null,
      }).$returningId();

      // Insert steps
      const steps: Array<{ stageName: string; stepName: string; stepOrder: number; stageOrder: number; isBlocking: boolean; whoOwns: string | null; estimatedDays: number | null; evidence: string | null; confidence: string }> = [];
      for (const stage of blueprint.stages || []) {
        for (const step of stage.steps || []) {
          steps.push({
            stageName: stage.stageName,
            stepName: step.stepName,
            stepOrder: step.stepOrder || 0,
            stageOrder: stage.stageOrder || 0,
            isBlocking: step.isBlocking || false,
            whoOwns: step.whoOwns || null,
            estimatedDays: step.estimatedDays || null,
            evidence: step.evidence || null,
            confidence: step.confidence || "Medium",
          });
        }
      }

      if (steps.length > 0) {
        await db.insert(processSteps).values(
          steps.map(s => ({ ...s, templateId: template.id }))
        );
      }

      return {
        templateId: template.id,
        blueprint,
        stepsCreated: steps.length,
      };
    }),

  // ── Upload document for extraction ────────────────────────────────────
  uploadAndExtract: protectedProcedure
    .input(z.object({
      fileBase64: z.string(),
      fileName: z.string(),
      mimeType: z.string(),
      organizationId: z.number(),
    }))
    .mutation(async ({ input }) => {
      // Upload to S3
      const buffer = Buffer.from(input.fileBase64, "base64");
      const fileKey = `blueprints/${input.organizationId}/${Date.now()}-${input.fileName}`;
      const { url } = await storagePut(fileKey, buffer, input.mimeType);

      // For now, we'll extract text from the document using LLM vision
      const response = await invokeLLM({
        messages: [
          { role: "system", content: "Extract all text content from this document. Return only the text, no commentary." },
          {
            role: "user",
            content: [
              { type: "text", text: "Extract all readable text from this document:" },
              { type: "image_url", image_url: { url, detail: "high" } },
            ],
          },
        ],
      });

      const extractedText = response.choices?.[0]?.message?.content as string || "";

      return {
        fileUrl: url,
        fileName: input.fileName,
        extractedText,
      };
    }),

  // ── Conversation extraction — chat with Concierge AI ──────────────────
  conversationExtract: protectedProcedure
    .input(z.object({
      messages: z.array(z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string(),
      })),
      organizationId: z.number(),
    }))
    .mutation(async ({ input }) => {
      const llmMessages = [
        { role: "system" as const, content: CONVERSATION_SYSTEM_PROMPT },
        ...input.messages.map(m => ({ role: m.role as "user" | "assistant", content: m.content })),
      ];

      const response = await invokeLLM({ messages: llmMessages });
      const content = response.choices?.[0]?.message?.content as string || "";

      // Check if the response contains a JSON blueprint
      let blueprint: any = null;
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        try {
          blueprint = JSON.parse(jsonMatch[1].trim());
        } catch { /* not valid JSON yet */ }
      } else if (content.includes('"blueprintName"') && content.includes('"stages"')) {
        // Try parsing the whole content as JSON
        try {
          blueprint = JSON.parse(content.trim());
        } catch { /* not valid JSON yet */ }
      }

      // If blueprint extracted, save it
      let templateId: number | null = null;
      if (blueprint?.blueprintName && blueprint?.stages) {
        const db = await getDb();
        if (db) {
          const [template] = await db.insert(processTemplates).values({
            organizationId: input.organizationId,
            sector: blueprint.sector || "General",
            blueprintName: blueprint.blueprintName,
            source: "conversation",
            confidence: blueprint.confidence || "Medium",
          }).$returningId();

          templateId = template.id;

          const steps: any[] = [];
          for (const stage of blueprint.stages || []) {
            for (const step of stage.steps || []) {
              steps.push({
                templateId: template.id,
                stageName: stage.stageName,
                stepName: step.stepName,
                stepOrder: step.stepOrder || 0,
                stageOrder: stage.stageOrder || 0,
                isBlocking: step.isBlocking || false,
                whoOwns: step.whoOwns || null,
                estimatedDays: step.estimatedDays || null,
                evidence: step.evidence || null,
                confidence: step.confidence || "Medium",
              });
            }
          }

          if (steps.length > 0) {
            await db.insert(processSteps).values(steps);
          }
        }
      }

      return {
        reply: content,
        blueprint,
        templateId,
        isComplete: !!blueprint,
      };
    }),

  // ── List templates for an organization ────────────────────────────────
  listTemplates: protectedProcedure
    .input(z.object({ organizationId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      return db.select().from(processTemplates)
        .where(and(
          eq(processTemplates.organizationId, input.organizationId),
          eq(processTemplates.isActive, true),
        ))
        .orderBy(desc(processTemplates.createdAt));
    }),

  // ── Get template with steps ───────────────────────────────────────────
  getTemplateWithSteps: protectedProcedure
    .input(z.object({ templateId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      const [template] = await db.select().from(processTemplates)
        .where(eq(processTemplates.id, input.templateId)).limit(1);
      if (!template) throw new TRPCError({ code: "NOT_FOUND", message: "Template not found" });

      const steps = await db.select().from(processSteps)
        .where(eq(processSteps.templateId, input.templateId))
        .orderBy(processSteps.stageOrder, processSteps.stepOrder);

      return { template, steps };
    }),

  // ── Update a step (inline editor) ─────────────────────────────────────
  updateStep: protectedProcedure
    .input(z.object({
      stepId: z.number(),
      stepName: z.string().optional(),
      isBlocking: z.boolean().optional(),
      whoOwns: z.string().optional(),
      estimatedDays: z.number().optional(),
      evidence: z.string().optional(),
      confidence: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      const { stepId, ...updates } = input;
      const setObj: any = {};
      if (updates.stepName !== undefined) setObj.stepName = updates.stepName;
      if (updates.isBlocking !== undefined) setObj.isBlocking = updates.isBlocking;
      if (updates.whoOwns !== undefined) setObj.whoOwns = updates.whoOwns;
      if (updates.estimatedDays !== undefined) setObj.estimatedDays = updates.estimatedDays;
      if (updates.evidence !== undefined) setObj.evidence = updates.evidence;
      if (updates.confidence !== undefined) setObj.confidence = updates.confidence;

      await db.update(processSteps).set(setObj).where(eq(processSteps.id, stepId));
      return { success: true };
    }),

  // ── Delete a step ─────────────────────────────────────────────────────
  deleteStep: protectedProcedure
    .input(z.object({ stepId: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      await db.delete(processSteps).where(eq(processSteps.id, input.stepId));
      return { success: true };
    }),

  // ── Add a step to a template ──────────────────────────────────────────
  addStep: protectedProcedure
    .input(z.object({
      templateId: z.number(),
      stageName: z.string(),
      stepName: z.string(),
      stageOrder: z.number(),
      stepOrder: z.number(),
      isBlocking: z.boolean().default(false),
      whoOwns: z.string().optional(),
      estimatedDays: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      const [step] = await db.insert(processSteps).values({
        templateId: input.templateId,
        stageName: input.stageName,
        stepName: input.stepName,
        stageOrder: input.stageOrder,
        stepOrder: input.stepOrder,
        isBlocking: input.isBlocking,
        whoOwns: input.whoOwns || null,
        estimatedDays: input.estimatedDays || null,
        confidence: "High", // manually added = high confidence
      }).$returningId();

      return { stepId: step.id };
    }),

  // ── Apply blueprint to ventures (auto-populate tracking) ──────────────
  applyToVentures: protectedProcedure
    .input(z.object({
      templateId: z.number(),
      ventureIds: z.array(z.number()),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      // Get template steps
      const steps = await db.select().from(processSteps)
        .where(eq(processSteps.templateId, input.templateId))
        .orderBy(processSteps.stageOrder, processSteps.stepOrder);

      if (steps.length === 0) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Template has no steps" });
      }

      // Get ventures with their current stages
      const ventureList = await db.select({
        id: ventures.id,
        stage: ventures.stage,
      }).from(ventures).where(inArray(ventures.id, input.ventureIds));

      let totalCreated = 0;
      let totalPreMarked = 0;

      for (const venture of ventureList) {
        const ventureStageIdx = getStageIndex(venture.stage);

        // Check if tracking already exists for this venture
        const existing = await db.select({ id: ventureProcessTracking.id })
          .from(ventureProcessTracking)
          .where(eq(ventureProcessTracking.ventureId, venture.id))
          .limit(1);

        if (existing.length > 0) continue; // Already has tracking

        for (const step of steps) {
          const stepStageIdx = getStageIndex(step.stageName);
          // Smart pre-marking: steps in stages before current stage are marked complete
          const isBeforeCurrent = stepStageIdx >= 0 && ventureStageIdx >= 0 && stepStageIdx < ventureStageIdx;

          await db.insert(ventureProcessTracking).values({
            ventureId: venture.id,
            templateId: input.templateId,
            stepId: step.id,
            stageName: step.stageName,
            stepName: step.stepName,
            stepOrder: step.stepOrder,
            isBlocking: step.isBlocking,
            whoOwns: step.whoOwns,
            status: isBeforeCurrent ? "complete" : "pending",
            completedAt: isBeforeCurrent ? new Date() : null,
            completedBy: isBeforeCurrent ? "Pre-marked (venture already past stage)" : null,
            actualDays: isBeforeCurrent ? 0 : null,
            confidence: step.confidence,
          });

          totalCreated++;
          if (isBeforeCurrent) totalPreMarked++;
        }
      }

      return {
        venturesProcessed: ventureList.length,
        trackingEntriesCreated: totalCreated,
        preMarkedComplete: totalPreMarked,
      };
    }),

  // ── Get venture tracking (for journey tracker) ────────────────────────
  getVentureTracking: protectedProcedure
    .input(z.object({ ventureId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      return db.select().from(ventureProcessTracking)
        .where(eq(ventureProcessTracking.ventureId, input.ventureId))
        .orderBy(ventureProcessTracking.stepOrder);
    }),

  // ── Update venture tracking step status ───────────────────────────────
  updateTrackingStep: protectedProcedure
    .input(z.object({
      trackingId: z.number(),
      status: z.enum(["pending", "in_progress", "complete", "skipped"]),
      completedBy: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      const [existing] = await db.select().from(ventureProcessTracking)
        .where(eq(ventureProcessTracking.id, input.trackingId)).limit(1);
      if (!existing) throw new TRPCError({ code: "NOT_FOUND" });

      const now = new Date();
      const setObj: any = { status: input.status };

      if (input.status === "complete") {
        setObj.completedAt = now;
        setObj.completedBy = input.completedBy || "Operator";
        if (existing.startedAt) {
          setObj.actualDays = Math.max(1, Math.floor(
            (now.getTime() - new Date(existing.startedAt).getTime()) / (1000 * 60 * 60 * 24)
          ));
        }
      } else if (input.status === "in_progress") {
        setObj.startedAt = now;
      }

      await db.update(ventureProcessTracking).set(setObj)
        .where(eq(ventureProcessTracking.id, input.trackingId));

      return { success: true };
    }),

  // ── Refine blueprint from actual completion data ──────────────────────
  refineFromActuals: protectedProcedure
    .input(z.object({ templateId: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      // Get all completed tracking entries for this template
      const completedTracking = await db
        .select({
          stepId: ventureProcessTracking.stepId,
          actualDays: ventureProcessTracking.actualDays,
          completedBy: ventureProcessTracking.completedBy,
        })
        .from(ventureProcessTracking)
        .where(and(
          eq(ventureProcessTracking.templateId, input.templateId),
          eq(ventureProcessTracking.status, "complete"),
          sql`${ventureProcessTracking.actualDays} IS NOT NULL`,
        ));

      // Group by step and calculate averages
      const stepStats = new Map<number, { totalDays: number; count: number; owners: string[] }>();
      for (const t of completedTracking) {
        if (!stepStats.has(t.stepId)) {
          stepStats.set(t.stepId, { totalDays: 0, count: 0, owners: [] });
        }
        const stat = stepStats.get(t.stepId)!;
        stat.totalDays += t.actualDays!;
        stat.count++;
        if (t.completedBy && !stat.owners.includes(t.completedBy)) {
          stat.owners.push(t.completedBy);
        }
      }

      // Update steps with actual averages (only if 3+ samples)
      let updatedCount = 0;
      for (const [stepId, stat] of Array.from(stepStats.entries())) {
        if (stat.count >= 3) {
          const avgDays = Math.round(stat.totalDays / stat.count);
          await db.update(processSteps).set({
            actualAvgDays: avgDays,
            sampleCount: stat.count,
          }).where(eq(processSteps.id, stepId));
          updatedCount++;
        }
      }

      // Update template refinement tracking
      await db.update(processTemplates).set({
        refinementCount: sql`${processTemplates.refinementCount} + 1`,
        lastRefinedAt: new Date(),
      }).where(eq(processTemplates.id, input.templateId));

      return { updatedSteps: updatedCount, totalSamples: completedTracking.length };
    }),

  // ── Get sectors without blueprints for an org ─────────────────────────
  getMissingSectors: protectedProcedure
    .input(z.object({ organizationId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      // Get all sectors from ventures for this org
      const orgVentures = await db
        .select({ sector: ventures.sector })
        .from(ventures)
        .innerJoin(
          orgVentureAccess,
          eq(orgVentureAccess.ventureId, ventures.id),
        )
        .where(eq(orgVentureAccess.organizationId, input.organizationId));

      const allSectors = Array.from(new Set(orgVentures.map(v => v.sector)));

      // Get sectors that already have blueprints
      const existingBlueprints = await db
        .select({ sector: processTemplates.sector })
        .from(processTemplates)
        .where(eq(processTemplates.organizationId, input.organizationId));

      const existingSectorsArr = existingBlueprints.map(b => b.sector);

      // Get venture counts per missing sector
      const missingSectors = allSectors
        .filter(s => !existingSectorsArr.includes(s))
        .map(sector => ({
          sector,
          ventureCount: orgVentures.filter(v => v.sector === sector).length,
        }));

      return missingSectors;
    }),
});
