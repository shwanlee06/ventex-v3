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
  ventureProcessOverrides,
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
      const steps: Array<{ stageName: string; stepName: string; stepOrder: number; stageOrder: number; isBlocking: boolean; whoOwns: string | null; typicalDays: number | null; stepDescription: string | null }> = [];
      for (const stage of blueprint.stages || []) {
        for (const step of stage.steps || []) {
          steps.push({
            stageName: stage.stageName,
            stepName: step.stepName,
            stepOrder: step.stepOrder || 0,
            stageOrder: stage.stageOrder || 0,
            isBlocking: step.isBlocking || false,
            whoOwns: step.whoOwns || null,
            typicalDays: step.estimatedDays || null,
            stepDescription: step.evidence || step.description || null,
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
                typicalDays: step.estimatedDays || null,
                stepDescription: step.evidence || step.description || null,
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
      if (updates.estimatedDays !== undefined) setObj.typicalDays = updates.estimatedDays;
      if (updates.evidence !== undefined) setObj.stepDescription = updates.evidence;

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
        typicalDays: input.estimatedDays || null,
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
            // confidence inherited from template
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

  // ── Connection 1: Generate starter blueprints for selected sectors ──────
  generateStarterBlueprints: protectedProcedure
    .input(z.object({
      organizationId: z.number(),
      sectors: z.array(z.string()).min(1),
    }))
    .mutation(async ({ input }) => {
      const db = (await getDb())!;
      const results: { sector: string; templateId: number; stepCount: number }[] = [];

      for (const sector of input.sectors) {
        // Check if blueprint already exists for this sector
        const [existing] = await db
          .select({ id: processTemplates.id })
          .from(processTemplates)
          .where(and(
            eq(processTemplates.organizationId, input.organizationId),
            eq(processTemplates.sector, sector),
          ))
          .limit(1);
        if (existing) continue;

        const response = await invokeLLM({
          messages: [
            {
              role: "system",
              content: `You are an expert at creating operational blueprints for UHNWI holding companies. Output ONLY valid JSON, no markdown.`,
            },
            {
              role: "user",
              content: `Generate a detailed operational blueprint for a UHNWI holding company running ${sector} ventures. This is their starting process — it will be refined based on their actual operations.

Return JSON:
{
  "sector": "${sector}",
  "blueprintName": "${sector} Operations Blueprint",
  "stages": [
    {
      "stage_name": "In Validation|In Fundraising|Active Ventures|Completed",
      "stage_order": 1,
      "typical_duration_days": 30,
      "steps": [
        {
          "order": 1,
          "name": "specific step name",
          "description": "what happens",
          "who_owns": "role",
          "is_blocking": true,
          "typical_days": 5,
          "output": "document or decision produced"
        }
      ],
      "decision_maker": "role",
      "gate_criteria": "what must be true to advance"
    }
  ]
}

Use these exact stage names: In Validation, In Fundraising, Active Ventures, Completed.
Include 4-8 specific steps per stage. Make steps realistic for ${sector}.`,
            },
          ],
        });

        const content = response.choices?.[0]?.message?.content as string;
        if (!content) continue;

        let jsonStr = content;
        const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (jsonMatch) jsonStr = jsonMatch[1];

        let blueprint: any;
        try {
          blueprint = JSON.parse(jsonStr.trim());
        } catch {
          continue;
        }

        const stages = blueprint.stages || [];
        if (stages.length === 0) continue;

        // Save template
        const [templateResult] = await db.insert(processTemplates).values({
          organizationId: input.organizationId,
          sector,
          blueprintName: blueprint.blueprintName || `${sector} Operations Blueprint`,
          source: "auto_generated",
          confidence: "Medium",
          sourceDocumentUrl: null,
          sourceDocumentName: null,
        });
        const templateId = (templateResult as any).insertId;

        let stepCount = 0;
        for (const stage of stages) {
          const stageName = stage.stage_name || stage.stageName || "Unknown";
          const stageOrder = stage.stage_order || stage.stageOrder || 0;
          const steps = stage.steps || [];
          for (const step of steps) {
            await db.insert(processSteps).values({
              templateId,
              stageName,
              stepName: step.name || step.stepName || "Unnamed Step",
              stepOrder: step.order || step.stepOrder || 0,
              stageOrder,
              isBlocking: step.is_blocking ?? step.isBlocking ?? false,
              whoOwns: step.who_owns || step.whoOwns || null,
              typicalDays: step.typical_days || step.estimatedDays || null,
              stepDescription: step.output || step.description || null,
            });
            stepCount++;
          }
        }

        results.push({ sector, templateId, stepCount });
      }

      return results;
    }),

  // ── Connection 3: Auto-apply blueprint to all ventures in a sector ─────
  autoApplyToSectorVentures: protectedProcedure
    .input(z.object({
      templateId: z.number(),
      organizationId: z.number(),
    }))
    .mutation(async ({ input }) => {
      const db = (await getDb())!;

      // Get the template and its steps
      const [template] = await db
        .select()
        .from(processTemplates)
        .where(eq(processTemplates.id, input.templateId))
        .limit(1);
      if (!template) throw new TRPCError({ code: "NOT_FOUND", message: "Template not found" });

      const steps = await db
        .select()
        .from(processSteps)
        .where(eq(processSteps.templateId, input.templateId));

      // Get all ventures in this sector for this org
      const orgVentures = await db
        .select({ id: ventures.id, name: ventures.name, stage: ventures.stage })
        .from(ventures)
        .innerJoin(orgVentureAccess, eq(orgVentureAccess.ventureId, ventures.id))
        .where(and(
          eq(orgVentureAccess.organizationId, input.organizationId),
          eq(ventures.sector, template.sector),
        ));

      let appliedCount = 0;
      for (const venture of orgVentures) {
        // Check if already applied
        const [existing] = await db
          .select({ id: ventureProcessTracking.id })
          .from(ventureProcessTracking)
          .where(eq(ventureProcessTracking.ventureId, venture.id))
          .limit(1);
        if (existing) continue;

        // Create tracking records for all steps
        for (const step of steps) {
          // Smart pre-marking: if venture has passed this stage, mark as complete
          const STAGE_ORDER: Record<string, number> = {
            "In Validation": 1, "In Fundraising": 2, "Active Ventures": 3, "Completed": 4,
          };
          const ventureStageOrder = STAGE_ORDER[venture.stage || ""] || 0;
          const stepStageOrder = STAGE_ORDER[step.stageName] || 0;
          const isCompleted = stepStageOrder < ventureStageOrder;

          await db.insert(ventureProcessTracking).values({
            ventureId: venture.id,
            templateId: input.templateId,
            stepId: step.id,
            stageName: step.stageName,
            stepName: step.stepName,
            isBlocking: step.isBlocking,
            whoOwns: step.whoOwns,
            status: isCompleted ? "complete" : "pending",
            completedAt: isCompleted ? new Date() : null,
          });
        }
        appliedCount++;
      }

      return { appliedCount, ventureNames: orgVentures.map((v: { id: number; name: string; stage: string }) => v.name) };
    }),

  // ── Connection 4: Calculate real health scores ─────────────────────────
  recalculateHealthScores: protectedProcedure
    .input(z.object({
      organizationId: z.number(),
    }))
    .mutation(async ({ input }) => {
      const db = (await getDb())!;
      const { tasks: tasksTable } = await import("../../drizzle/schema");

      // Get all ventures for this org
      const orgVentures = await db
        .select({
          id: ventures.id,
          name: ventures.name,
          stage: ventures.stage,
          currentStatus: ventures.currentStatus,
          nextStep: ventures.nextStep,
          location: ventures.location,
        })
        .from(ventures)
        .innerJoin(orgVentureAccess, eq(orgVentureAccess.ventureId, ventures.id))
        .where(eq(orgVentureAccess.organizationId, input.organizationId));

      const results: { ventureId: number; name: string; oldScore: number; newScore: number }[] = [];

      for (const venture of orgVentures) {
        let score = 0;

        // 1. Blueprint completion: 40 points
        const tracking = await db
          .select({
            isBlocking: ventureProcessTracking.isBlocking,
            status: ventureProcessTracking.status,
          })
          .from(ventureProcessTracking)
          .where(eq(ventureProcessTracking.ventureId, venture.id));

        const blockingSteps = tracking.filter((t: any) => t.isBlocking);
        const blockingComplete = blockingSteps.filter((t: any) => t.status === "complete");
        if (blockingSteps.length > 0) {
          score += Math.round((blockingComplete.length / blockingSteps.length) * 40);
        } else if (tracking.length > 0) {
          const allComplete = tracking.filter((t: any) => t.status === "complete");
          score += Math.round((allComplete.length / tracking.length) * 40);
        }
        // No blueprint = 0 blueprint points

        // 2. Task velocity: 20 points
        const ventureTasks = await db
          .select({ status: tasksTable.status })
          .from(tasksTable)
          .where(eq(tasksTable.ventureId, venture.id));
        const overdueTasks = ventureTasks.filter((t: any) => t.status === "overdue");
        if (overdueTasks.length === 0) score += 20;
        else if (overdueTasks.length === 1) score += 10;
        // 2+ overdue = 0

        // 3. Stage momentum: 20 points
        // Check typical_duration from blueprint template
        const [templateForStage] = await db
          .select({ templateId: processSteps.templateId })
          .from(processSteps)
          .innerJoin(processTemplates, eq(processTemplates.id, processSteps.templateId))
          .where(and(
            eq(processTemplates.organizationId, input.organizationId),
            eq(processSteps.stageName, venture.stage || ""),
          ))
          .limit(1);

        // Simple heuristic: if venture has recent activity, give momentum points
        if (ventureTasks.length > 0) {
          const completedTasks = ventureTasks.filter((t: any) => t.status === "complete" || t.status === "done");
          const completionRate = ventureTasks.length > 0 ? completedTasks.length / ventureTasks.length : 0;
          if (completionRate > 0.7) score += 20;
          else if (completionRate > 0.3) score += 10;
        }

        // 4. Data completeness: 20 points
        if (venture.currentStatus) score += 5;
        if (venture.nextStep) score += 5;
        // Check if team assigned (has tasks with assignees)
        const assignedTasks = ventureTasks.length > 0 ? 5 : 0;
        score += assignedTasks;
        if (venture.location) score += 5;

        // Clamp to 0-100
        score = Math.max(0, Math.min(100, score));

        // Update in DB
        await db.update(ventures).set({ healthScore: score }).where(eq(ventures.id, venture.id));

        results.push({
          ventureId: venture.id,
          name: venture.name,
          oldScore: 50,
          newScore: score,
        });
      }

      return results;
    }),

  // ── Aliases for spec-required procedure names ─────────────────────────
  // blueprints.list → alias for listTemplates
  list: protectedProcedure
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

  // blueprints.create → manual blueprint creation
  create: protectedProcedure
    .input(z.object({
      name: z.string().min(1),
      sector: z.string().min(1),
      organizationId: z.number(),
      steps: z.array(z.object({
        stepName: z.string(),
        stageName: z.string(),
        stageOrder: z.number(),
        stepOrder: z.number(),
        isBlocking: z.boolean().default(false),
        whoOwns: z.string().optional(),
        estimatedDays: z.number().optional(),
        evidence: z.string().optional(),
      })).optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const [result] = await db.insert(processTemplates).values({
        blueprintName: input.name,
        sector: input.sector,
        organizationId: input.organizationId,
        source: "manual",
        confidence: "High",
        isActive: true,
      }).$returningId();
      const templateId = result.id;
      if (input.steps && input.steps.length > 0) {
        await db.insert(processSteps).values(
          input.steps.map(s => ({
            templateId,
            stepName: s.stepName,
            stageName: s.stageName,
            stageOrder: s.stageOrder,
            stepOrder: s.stepOrder,
            isBlocking: s.isBlocking,
            whoOwns: s.whoOwns ?? null,
            typicalDays: s.estimatedDays ?? null,
            stepDescription: s.evidence ?? null,
          }))
        );
      }
      return { id: templateId, name: input.name };
    }),

  // blueprints.generateFromSector → LLM-powered blueprint generation for a sector
  generateFromSector: protectedProcedure
    .input(z.object({
      sector: z.string().min(1),
      organizationId: z.number(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      // Check if template already exists for this sector
      const [existing] = await db.select().from(processTemplates)
        .where(and(
          eq(processTemplates.organizationId, input.organizationId),
          eq(processTemplates.sector, input.sector),
          eq(processTemplates.isActive, true),
        )).limit(1);
      if (existing) {
        return { id: existing.id, name: existing.blueprintName, alreadyExisted: true };
      }
      // Use LLM to generate a blueprint
      const llmResponse = await invokeLLM({
        messages: [
          {
            role: "system",
            content: `You are a venture operations expert. Generate a detailed process blueprint for a ${input.sector} venture. Return JSON: { "name": "<sector> Standard Process", "stages": [{ "stageName": "<name>", "stageOrder": <n>, "steps": [{ "stepName": "<name>", "stepOrder": <n>, "isBlocking": <bool>, "whoOwns": "<role>", "estimatedDays": <n> }] }] }. Include 4-6 stages with 3-5 steps each.`,
          },
          { role: "user", content: `Generate a process blueprint for: ${input.sector}` },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "blueprint",
            strict: true,
            schema: {
              type: "object",
              properties: {
                name: { type: "string" },
                stages: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      stageName: { type: "string" },
                      stageOrder: { type: "integer" },
                      steps: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            stepName: { type: "string" },
                            stepOrder: { type: "integer" },
                            isBlocking: { type: "boolean" },
                            whoOwns: { type: "string" },
                            estimatedDays: { type: "integer" },
                          },
                          required: ["stepName", "stepOrder", "isBlocking", "whoOwns", "estimatedDays"],
                          additionalProperties: false,
                        },
                      },
                    },
                    required: ["stageName", "stageOrder", "steps"],
                    additionalProperties: false,
                  },
                },
              },
              required: ["name", "stages"],
              additionalProperties: false,
            },
          },
        },
      });
      const content = llmResponse.choices?.[0]?.message?.content;
      if (!content) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "LLM returned empty response" });
      const blueprint = JSON.parse(content as string);
      const [templateResult] = await db.insert(processTemplates).values({
        blueprintName: blueprint.name || `${input.sector} Standard Process`,
        sector: input.sector,
        organizationId: input.organizationId,
        source: "ai_generated",
        confidence: "Medium",
        isActive: true,
      }).$returningId();
      const templateId = templateResult.id;
      const allSteps: any[] = [];
      for (const stage of blueprint.stages) {
        for (const step of stage.steps) {
          allSteps.push({
            templateId,
            stepName: step.stepName,
            stageName: stage.stageName,
            stageOrder: stage.stageOrder,
            stepOrder: step.stepOrder,
            isBlocking: step.isBlocking,
            whoOwns: step.whoOwns,
            typicalDays: step.estimatedDays,
          });
        }
      }
      if (allSteps.length > 0) {
        await db.insert(processSteps).values(allSteps);
      }
      return { id: templateId, name: blueprint.name, stepsCreated: allSteps.length };
    }),

  // ── Confirm a blueprint (human-in-the-loop review) ─────────────────────
  confirmTemplate: protectedProcedure
    .input(z.object({ templateId: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      await db.update(processTemplates).set({ status: "confirmed" })
        .where(eq(processTemplates.id, input.templateId));
      return { success: true };
    }),

  // ── Archive a blueprint ────────────────────────────────────────────────
  archiveTemplate: protectedProcedure
    .input(z.object({ templateId: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      await db.update(processTemplates).set({ status: "archived", isActive: false })
        .where(eq(processTemplates.id, input.templateId));
      return { success: true };
    }),

  // ── Update template metadata ───────────────────────────────────────────
  updateTemplate: protectedProcedure
    .input(z.object({
      templateId: z.number(),
      blueprintName: z.string().optional(),
      sector: z.string().optional(),
      confidence: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const { templateId, ...updates } = input;
      const setObj: any = {};
      if (updates.blueprintName !== undefined) setObj.blueprintName = updates.blueprintName;
      if (updates.sector !== undefined) setObj.sector = updates.sector;
      if (updates.confidence !== undefined) setObj.confidence = updates.confidence;
      await db.update(processTemplates).set(setObj)
        .where(eq(processTemplates.id, templateId));
      return { success: true };
    }),

  // ── Venture Process Overrides (Layer 3) ────────────────────────────────
  listOverrides: protectedProcedure
    .input(z.object({ ventureId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      return db.select().from(ventureProcessOverrides)
        .where(eq(ventureProcessOverrides.ventureId, input.ventureId));
    }),

  addOverride: protectedProcedure
    .input(z.object({
      ventureId: z.number(),
      processTemplateId: z.number(),
      stepId: z.number().optional(),
      overrideType: z.string(),
      overrideField: z.string().optional(),
      overrideValue: z.string(),
      reason: z.string().optional(),
      createdBy: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const [result] = await db.insert(ventureProcessOverrides).values({
        ventureId: input.ventureId,
        processTemplateId: input.processTemplateId,
        stepId: input.stepId ?? null,
        overrideType: input.overrideType,
        overrideField: input.overrideField ?? null,
        overrideValue: input.overrideValue,
        reason: input.reason ?? null,
        createdBy: input.createdBy || ctx.user?.name || "Operator",
      }).$returningId();
      return { id: result.id };
    }),

  removeOverride: protectedProcedure
    .input(z.object({ overrideId: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      await db.delete(ventureProcessOverrides)
        .where(eq(ventureProcessOverrides.id, input.overrideId));
      return { success: true };
    }),

  // ── 3-Layer Blueprint Lookup (used by agents) ──────────────────────────
  // Returns the effective blueprint for a venture:
  //   Layer 3 (venture override) > Layer 2 (client blueprint) > Layer 1 (system default)
  getBlueprintForVenture: protectedProcedure
    .input(z.object({ ventureId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      // Get the venture and its org
      const [venture] = await db.select({
        id: ventures.id,
        name: ventures.name,
        sector: ventures.sector,
        stage: ventures.stage,
      }).from(ventures)
        .where(eq(ventures.id, input.ventureId)).limit(1);
      if (!venture) throw new TRPCError({ code: "NOT_FOUND", message: "Venture not found" });

      // Find org for this venture
      const [orgAccess] = await db.select({ organizationId: orgVentureAccess.organizationId })
        .from(orgVentureAccess)
        .where(eq(orgVentureAccess.ventureId, input.ventureId)).limit(1);
      const orgId = orgAccess?.organizationId;

      let template: any = null;
      let steps: any[] = [];
      let blueprintLayer: "venture_override" | "client_blueprint" | "sector_default" = "sector_default";

      if (orgId) {
        // Layer 2: Client-specific confirmed blueprint for this sector
        const [clientBp] = await db.select().from(processTemplates)
          .where(and(
            eq(processTemplates.organizationId, orgId),
            eq(processTemplates.sector, venture.sector || ""),
            eq(processTemplates.status, "confirmed"),
            eq(processTemplates.isActive, true),
          ))
          .orderBy(desc(processTemplates.updatedAt))
          .limit(1);

        if (clientBp) {
          template = clientBp;
          blueprintLayer = "client_blueprint";
        }
      }

      // Layer 1 fallback: system default for this sector (source = 'system')
      if (!template) {
        const [systemBp] = await db.select().from(processTemplates)
          .where(and(
            eq(processTemplates.source, "system"),
            eq(processTemplates.sector, venture.sector || ""),
            eq(processTemplates.isActive, true),
          ))
          .orderBy(desc(processTemplates.updatedAt))
          .limit(1);
        if (systemBp) {
          template = systemBp;
          blueprintLayer = "sector_default";
        }
      }

      if (!template) {
        return { venture, template: null, steps: [], overrides: [], blueprintLayer: null };
      }

      // Get steps
      steps = await db.select().from(processSteps)
        .where(eq(processSteps.templateId, template.id))
        .orderBy(processSteps.stageOrder, processSteps.stepOrder);

      // Layer 3: Get venture-level overrides
      const overrides = await db.select().from(ventureProcessOverrides)
        .where(eq(ventureProcessOverrides.ventureId, input.ventureId));

      // Apply overrides to steps
      const effectiveSteps = steps.map((step: any) => {
        const stepOverrides = overrides.filter((o: any) => o.stepId === step.id);
        if (stepOverrides.length === 0) return { ...step, hasOverride: false };

        const merged = { ...step, hasOverride: true, overrides: stepOverrides };
        for (const ov of stepOverrides) {
          if (ov.overrideField === "typicalDays") merged.typicalDays = parseInt(ov.overrideValue);
          else if (ov.overrideField === "whoOwns") merged.whoOwns = ov.overrideValue;
          else if (ov.overrideField === "isBlocking") merged.isBlocking = ov.overrideValue === "true";
          else if (ov.overrideType === "skip") merged.skipped = true;
        }
        if (stepOverrides.length > 0) blueprintLayer = "venture_override";
        return merged;
      });

      return {
        venture,
        template,
        steps: effectiveSteps,
        overrides,
        blueprintLayer,
      };
    }),
});
