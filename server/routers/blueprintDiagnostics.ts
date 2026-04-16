// VENTEX Blueprint Diagnostics Engine
// Structural health scoring, recommended vs custom structure, velocity attribution
import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import {
  blueprintDiagnostics,
  blueprintStructureModes,
  velocityAttribution,
  organizations,
  ventures,
  tasks,
  teamMembers,
  processTemplates,
  processSteps,
  spvs,
  distributions,
  orgVentureAccess,
} from "../../drizzle/schema";
import { eq, and, sql, desc, inArray } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { invokeLLM } from "../_core/llm";
import { resolveOrgId } from "../security/orgScope";

// ═══════════════════════════════════════════════════════════════════════════
// AI PROMPT TEMPLATES
// ═══════════════════════════════════════════════════════════════════════════

const DIAGNOSTIC_SYSTEM_PROMPT = `You are VENTEX Structural Diagnostics Engine. You analyze venture holding organizations to identify structural friction that slows deal velocity.

Given data about an organization (ventures, tasks, team, SPVs, blueprints), produce a diagnostic assessment with these scores (0-100, higher = better):

1. **Decision Velocity** (0-100): How fast can decisions be made?
   - Fewer approval layers = higher score
   - Clear decision authority = higher score
   - Multiple overlapping approvers = lower score

2. **Ownership Clarity** (0-100): Are roles clearly mapped?
   - Each task/step has one clear owner = higher
   - Overlapping responsibilities = lower
   - Unassigned tasks = lower

3. **Communication Density** (0-100): Is communication lean and effective?
   - Right number of stakeholders per decision = higher
   - Too many people in every loop = lower
   - Clear reporting lines = higher

4. **Capital Readiness** (0-100): Is the org ready to deploy capital?
   - Legal/compliance infrastructure in place = higher
   - Banking/treasury setup complete = higher
   - Missing foundational elements = lower

5. **Execution Capacity** (0-100): Can the team execute at required pace?
   - Team size matches venture count = higher
   - Overloaded members = lower
   - Skill gaps in critical areas = lower

Also identify **friction flags** — specific structural bottlenecks:
Each flag has: id (uuid-style), category, severity, title, description, recommendation, affectedStages, estimatedDelayDays.

Categories: decision_chain | role_overlap | missing_capability | compliance_gap | communication_bottleneck | resource_constraint
Severities: critical | high | medium | low

Output ONLY valid JSON:
{
  "decisionVelocity": number,
  "ownershipClarity": number,
  "communicationDensity": number,
  "capitalReadiness": number,
  "executionCapacity": number,
  "overallScore": number,
  "frictionFlags": [
    {
      "id": "string",
      "category": "string",
      "severity": "string",
      "title": "string",
      "description": "string",
      "recommendation": "string",
      "affectedStages": ["string"],
      "estimatedDelayDays": number
    }
  ],
  "summary": "string"
}`;

const STRUCTURE_RECOMMENDATION_PROMPT = `You are VENTEX Structure Advisor. Given a sector and organization profile, generate the VENTEX Recommended operating structure — our proven model for maximum deal velocity.

For the given sector, provide:
1. **Roles**: Optimal team roles with clear responsibilities and decision authority
2. **Decision Chain**: Who approves what, and maximum days allowed
3. **Milestones Cadence**: Key checkpoints and their frequency
4. **Communication Protocol**: Channels, frequency, and participants

Also, if a custom structure is provided, compare it against the recommended and identify:
- Friction points: where the custom structure will slow things down
- Advantages: where the custom structure is actually better
- Risk score: 0-100, how much risk the custom structure introduces

Output ONLY valid JSON:
{
  "recommended": {
    "roles": [{ "title": "string", "responsibility": "string", "decisionAuthority": "string", "reportingTo": "string" }],
    "decisionChain": [{ "decision": "string", "approvers": ["string"], "maxDays": number }],
    "milestonesCadence": [{ "milestone": "string", "frequencyDays": number, "owner": "string" }],
    "communicationProtocol": [{ "channel": "string", "frequency": "string", "participants": ["string"] }]
  },
  "comparison": {
    "frictionPoints": [{ "area": "string", "issue": "string", "impact": "string", "recommendation": "string" }],
    "advantages": [{ "area": "string", "description": "string" }],
    "riskScore": number
  }
}`;

const VELOCITY_ATTRIBUTION_PROMPT = `You are VENTEX Velocity Attribution Engine. Given a stalled or delayed task/step, determine the root cause of the delay.

Classify the delay source:
- client_approval: Waiting for client to approve/sign/decide
- client_structure: Client's org structure is causing the delay (too many approvers, unclear ownership)
- ventex_processing: VENTEX team is the bottleneck
- external_dependency: Third party (government, bank, vendor) is causing delay
- regulatory: Regulatory/compliance process is the bottleneck
- market_condition: Market conditions are causing the delay

Classify the delay category:
- decision_chain: Too many approval layers
- missing_info: Waiting for information
- resource_unavailable: Key person unavailable
- compliance_wait: Regulatory processing time
- third_party: External vendor/agency delay
- internal_processing: Internal team processing

Output ONLY valid JSON:
{
  "delaySource": "string",
  "delayCategory": "string",
  "description": "string",
  "blockedBy": "string",
  "estimatedDelayDays": number,
  "recommendation": "string",
  "confidenceScore": number
}`;

// ═══════════════════════════════════════════════════════════════════════════
// HELPER: Gather org data for diagnostic analysis
// ═══════════════════════════════════════════════════════════════════════════

interface OrgSummary {
  name: string;
  type: string | null;
  sectors: string[];
  aumRange: string | null;
  totalVentures: number;
  activeVentures: number;
  totalTasks: number;
  openTasks: number;
  overdueTasks: number;
  unassignedTasks: number;
  teamSize: number;
  venturesPerMember: number;
  totalSpvs: number;
  blueprintCount: number;
  uncoveredSectors: string[];
  overdueRate: number;
  unassignedRate: number;
}

interface VentureSummary {
  name: string;
  sector: string;
  stage: string;
  status: string;
  healthScore: number | null;
}

interface TeamSummary {
  name: string | null;
  role: string | null;
  memberFunction: string | null;
  status: string | null;
}

interface BlueprintSummary {
  name: string | null;
  sector: string | null;
  source: string | null;
  status: string | null;
  keyPeopleRoles: unknown;
  commonBlockers: unknown;
}

async function gatherOrgDataForDiagnostic(orgId: number): Promise<{
  org: typeof organizations.$inferSelect | undefined;
  summary: OrgSummary;
  ventures: VentureSummary[];
  team: TeamSummary[];
  blueprints: BlueprintSummary[];
}> {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

  const [org] = await db.select().from(organizations).where(eq(organizations.id, orgId));

  // Get ventures via orgVentureAccess join
  const orgVentures = await db.select({
    id: ventures.id,
    name: ventures.name,
    sector: ventures.sector,
    stage: ventures.stage,
    status: ventures.status,
    healthScore: ventures.healthScore,
  })
    .from(ventures)
    .innerJoin(orgVentureAccess, eq(orgVentureAccess.ventureId, ventures.id))
    .where(eq(orgVentureAccess.organizationId, orgId));

  const orgTasks = await db.select().from(tasks).where(eq(tasks.organizationId, orgId));
  const orgTeam = await db.select().from(teamMembers).where(eq(teamMembers.organizationId, orgId));
  const orgSpvs = await db.select().from(spvs).where(eq(spvs.organizationId, orgId));
  const orgBlueprints = await db.select().from(processTemplates).where(eq(processTemplates.organizationId, orgId));

  // Calculate derived metrics
  const totalTasks = orgTasks.length;
  const openTasks = orgTasks.filter((t: typeof tasks.$inferSelect) => t.status === "open").length;
  const overdueTasks = orgTasks.filter((t: typeof tasks.$inferSelect) => {
    if (!t.dueDate || t.status === "complete") return false;
    return new Date(t.dueDate) < new Date();
  }).length;
  const unassignedTasks = orgTasks.filter((t: typeof tasks.$inferSelect) => !t.assigneeIds || (t.assigneeIds as unknown as number[]).length === 0).length;
  const activeVentures = orgVentures.filter((v) => v.status === "In progress").length;
  const teamSize = orgTeam.length;
  const venturesPerMember = teamSize > 0 ? activeVentures / teamSize : 0;

  // Check blueprint coverage
  const allSectors = Array.from(new Set(orgVentures.map((v) => v.sector).filter(Boolean)));
  const coveredSectors = Array.from(new Set(orgBlueprints.map((b) => b.sector)));
  const uncoveredSectors = allSectors.filter((s) => !coveredSectors.includes(s));

  return {
    org,
    summary: {
      name: org?.name || "Unknown",
      type: org?.type || null,
      sectors: org?.sectors || [],
      aumRange: org?.aumRange || null,
      totalVentures: orgVentures.length,
      activeVentures,
      totalTasks,
      openTasks,
      overdueTasks,
      unassignedTasks,
      teamSize,
      venturesPerMember: Math.round(venturesPerMember * 10) / 10,
      totalSpvs: orgSpvs.length,
      blueprintCount: orgBlueprints.length,
      uncoveredSectors,
      overdueRate: totalTasks > 0 ? Math.round((overdueTasks / totalTasks) * 100) : 0,
      unassignedRate: totalTasks > 0 ? Math.round((unassignedTasks / totalTasks) * 100) : 0,
    },
    ventures: orgVentures.map((v) => ({
      name: v.name,
      sector: v.sector,
      stage: v.stage,
      status: v.status,
      healthScore: v.healthScore,
    })),
    team: orgTeam.map((m) => ({
      name: m.name,
      role: m.role,
      memberFunction: m.memberFunction,
      status: m.status,
    })),
    blueprints: orgBlueprints.map((b) => ({
      name: b.blueprintName,
      sector: b.sector,
      source: b.source,
      status: b.status,
      keyPeopleRoles: b.keyPeopleRoles,
      commonBlockers: b.commonBlockers,
    })),
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// ROUTER
// ═══════════════════════════════════════════════════════════════════════════

export const blueprintDiagnosticsRouter = router({

  // ─── Run Diagnostic ─────────────────────────────────────────────────────
  runDiagnostic: protectedProcedure
    .input(z.object({ organizationId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const validatedOrgId = resolveOrgId(ctx.user, input.organizationId);
      if (!validatedOrgId) throw new TRPCError({ code: "FORBIDDEN" });

      const orgData = await gatherOrgDataForDiagnostic(validatedOrgId);
      if (!orgData.org) throw new TRPCError({ code: "NOT_FOUND", message: "Organization not found" });

      const analysisPrompt = `Analyze this organization's structural health for venture deal velocity:

Organization: ${orgData.summary.name}
Type: ${orgData.summary.type}
Sectors: ${(orgData.summary.sectors || []).join(", ")}
AUM Range: ${orgData.summary.aumRange || "Unknown"}

Key Metrics:
- Ventures: ${orgData.summary.totalVentures} total, ${orgData.summary.activeVentures} active
- Tasks: ${orgData.summary.totalTasks} total, ${orgData.summary.openTasks} open, ${orgData.summary.overdueTasks} overdue (${orgData.summary.overdueRate}%)
- Unassigned tasks: ${orgData.summary.unassignedTasks} (${orgData.summary.unassignedRate}%)
- Team: ${orgData.summary.teamSize} members, ${orgData.summary.venturesPerMember} ventures per member
- SPVs: ${orgData.summary.totalSpvs}
- Blueprints: ${orgData.summary.blueprintCount}, uncovered sectors: ${orgData.summary.uncoveredSectors.join(", ") || "none"}

Team Roles:
${orgData.team.map((m) => `- ${m.name}: ${m.role || "No role"} (${m.memberFunction || "No function"}) — ${m.status}`).join("\n")}

Ventures:
${orgData.ventures.map((v) => `- ${v.name}: ${v.sector} / ${v.stage} / ${v.status} (health: ${v.healthScore})`).join("\n")}

Blueprints:
${orgData.blueprints.map((b) => `- ${b.name} (${b.sector}): ${b.source} / ${b.status}`).join("\n")}

Provide your structural diagnostic assessment.`;

      const response = await invokeLLM({
        messages: [
          { role: "system", content: DIAGNOSTIC_SYSTEM_PROMPT },
          { role: "user", content: analysisPrompt },
        ],
        response_format: { type: "json_object" },
      });

      const rawContent = response.choices?.[0]?.message?.content;
      const content = typeof rawContent === "string" ? rawContent : JSON.stringify(rawContent) || "{}";
      let diagnostic: {
        decisionVelocity?: number;
        ownershipClarity?: number;
        communicationDensity?: number;
        capitalReadiness?: number;
        executionCapacity?: number;
        overallScore?: number;
        frictionFlags?: unknown[];
        summary?: string;
      };
      try {
        diagnostic = JSON.parse(content);
      } catch {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to parse diagnostic response" });
      }

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      // Mark previous diagnostics as superseded
      await db.update(blueprintDiagnostics)
        .set({ status: "superseded" })
        .where(and(
          eq(blueprintDiagnostics.organizationId, validatedOrgId),
          eq(blueprintDiagnostics.status, "current"),
        ));

      // Get previous version number
      const [prev] = await db.select({ maxV: sql<number>`MAX(${blueprintDiagnostics.version})` })
        .from(blueprintDiagnostics)
        .where(eq(blueprintDiagnostics.organizationId, validatedOrgId));
      const nextVersion = (prev?.maxV || 0) + 1;

      // Insert new diagnostic
      const [result] = await db.insert(blueprintDiagnostics).values({
        organizationId: validatedOrgId,
        decisionVelocity: diagnostic.decisionVelocity || 50,
        ownershipClarity: diagnostic.ownershipClarity || 50,
        communicationDensity: diagnostic.communicationDensity || 50,
        capitalReadiness: diagnostic.capitalReadiness || 50,
        executionCapacity: diagnostic.executionCapacity || 50,
        overallScore: diagnostic.overallScore || 50,
        frictionFlags: (diagnostic.frictionFlags || []) as typeof blueprintDiagnostics.$inferInsert["frictionFlags"],
        analysisPrompt,
        analysisResponse: content,
        dataPointsUsed: Object.keys(orgData.summary),
        version: nextVersion,
        status: "current",
      });

      return {
        id: result.insertId,
        ...diagnostic,
        version: nextVersion,
        orgSummary: orgData.summary,
      };
    }),

  // ─── Get Current Diagnostic ─────────────────────────────────────────────
  getCurrentDiagnostic: protectedProcedure
    .input(z.object({ organizationId: z.number() }))
    .query(async ({ input, ctx }) => {
      const validatedOrgId = resolveOrgId(ctx.user, input.organizationId);
      if (!validatedOrgId) throw new TRPCError({ code: "FORBIDDEN" });

      const db = await getDb();
      if (!db) return null;

      const [diagnostic] = await db.select()
        .from(blueprintDiagnostics)
        .where(and(
          eq(blueprintDiagnostics.organizationId, validatedOrgId),
          eq(blueprintDiagnostics.status, "current"),
        ))
        .orderBy(desc(blueprintDiagnostics.createdAt))
        .limit(1);

      return diagnostic || null;
    }),

  // ─── Get Diagnostic History ─────────────────────────────────────────────
  getDiagnosticHistory: protectedProcedure
    .input(z.object({ organizationId: z.number() }))
    .query(async ({ input, ctx }) => {
      const validatedOrgId = resolveOrgId(ctx.user, input.organizationId);
      if (!validatedOrgId) throw new TRPCError({ code: "FORBIDDEN" });

      const db = await getDb();
      if (!db) return [];

      return db.select({
        id: blueprintDiagnostics.id,
        version: blueprintDiagnostics.version,
        overallScore: blueprintDiagnostics.overallScore,
        decisionVelocity: blueprintDiagnostics.decisionVelocity,
        ownershipClarity: blueprintDiagnostics.ownershipClarity,
        communicationDensity: blueprintDiagnostics.communicationDensity,
        capitalReadiness: blueprintDiagnostics.capitalReadiness,
        executionCapacity: blueprintDiagnostics.executionCapacity,
        status: blueprintDiagnostics.status,
        calculatedAt: blueprintDiagnostics.calculatedAt,
      })
        .from(blueprintDiagnostics)
        .where(eq(blueprintDiagnostics.organizationId, validatedOrgId))
        .orderBy(desc(blueprintDiagnostics.version));
    }),

  // ─── Generate Structure Recommendation ──────────────────────────────────
  generateStructureRecommendation: protectedProcedure
    .input(z.object({
      organizationId: z.number(),
      sector: z.string(),
      customStructure: z.any().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const validatedOrgId = resolveOrgId(ctx.user, input.organizationId);
      if (!validatedOrgId) throw new TRPCError({ code: "FORBIDDEN" });

      const orgData = await gatherOrgDataForDiagnostic(validatedOrgId);

      const prompt = `Generate the VENTEX Recommended operating structure for a ${input.sector} venture holding organization.

Organization Profile:
- Name: ${orgData.summary.name}
- Team size: ${orgData.summary.teamSize}
- Active ventures: ${orgData.summary.activeVentures}
- AUM Range: ${orgData.summary.aumRange || "Unknown"}

${input.customStructure ? `
Client's Current Custom Structure:
${JSON.stringify(input.customStructure, null, 2)}

Compare the recommended structure against this custom structure and identify friction points and advantages.
` : "No custom structure provided — generate recommended structure only."}

Generate the optimal structure for maximum deal velocity in the ${input.sector} sector.`;

      const response = await invokeLLM({
        messages: [
          { role: "system", content: STRUCTURE_RECOMMENDATION_PROMPT },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" },
      });

      const rawContent2 = response.choices?.[0]?.message?.content;
      const content = typeof rawContent2 === "string" ? rawContent2 : JSON.stringify(rawContent2) || "{}";
      let result: { recommended?: unknown; comparison?: unknown };
      try {
        result = JSON.parse(content);
      } catch {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to parse structure recommendation" });
      }

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      // Upsert the structure mode
      const [existing] = await db.select()
        .from(blueprintStructureModes)
        .where(and(
          eq(blueprintStructureModes.organizationId, validatedOrgId),
          eq(blueprintStructureModes.sector, input.sector),
        ));

      const mode = input.customStructure ? "hybrid" : "recommended";

      if (existing) {
        await db.update(blueprintStructureModes)
          .set({
            recommendedStructure: result.recommended as any,
            customStructure: input.customStructure || existing.customStructure,
            structureDiff: (result.comparison as any) || null,
            mode,
          })
          .where(eq(blueprintStructureModes.id, existing.id));
        return { id: existing.id, ...result, mode };
      } else {
        const [inserted] = await db.insert(blueprintStructureModes).values({
          organizationId: validatedOrgId,
          sector: input.sector,
          mode,
          recommendedStructure: result.recommended as any,
          customStructure: input.customStructure || null,
          structureDiff: (result.comparison as any) || null,
        });
        return { id: inserted.insertId, ...result, mode };
      }
    }),

  // ─── Get Structure Mode ─────────────────────────────────────────────────
  getStructureMode: protectedProcedure
    .input(z.object({ organizationId: z.number(), sector: z.string() }))
    .query(async ({ input, ctx }) => {
      const validatedOrgId = resolveOrgId(ctx.user, input.organizationId);
      if (!validatedOrgId) throw new TRPCError({ code: "FORBIDDEN" });

      const db = await getDb();
      if (!db) return null;

      const [mode] = await db.select()
        .from(blueprintStructureModes)
        .where(and(
          eq(blueprintStructureModes.organizationId, validatedOrgId),
          eq(blueprintStructureModes.sector, input.sector),
        ));
      return mode || null;
    }),

  // ─── Set Structure Mode ─────────────────────────────────────────────────
  setStructureMode: protectedProcedure
    .input(z.object({
      organizationId: z.number(),
      sector: z.string(),
      mode: z.enum(["recommended", "custom", "hybrid"]),
    }))
    .mutation(async ({ input, ctx }) => {
      const validatedOrgId = resolveOrgId(ctx.user, input.organizationId);
      if (!validatedOrgId) throw new TRPCError({ code: "FORBIDDEN" });

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      // Upsert: check if row exists, insert if not, update if so
      const [existing] = await db.select()
        .from(blueprintStructureModes)
        .where(and(
          eq(blueprintStructureModes.organizationId, validatedOrgId),
          eq(blueprintStructureModes.sector, input.sector),
        ));

      if (existing) {
        await db.update(blueprintStructureModes)
          .set({ mode: input.mode })
          .where(eq(blueprintStructureModes.id, existing.id));
      } else {
        await db.insert(blueprintStructureModes).values({
          organizationId: validatedOrgId,
          sector: input.sector,
          mode: input.mode,
        });
      }
      return { success: true };
    }),

  // ─── List All Structure Modes for Org ───────────────────────────────────
  listStructureModes: protectedProcedure
    .input(z.object({ organizationId: z.number() }))
    .query(async ({ input, ctx }) => {
      const validatedOrgId = resolveOrgId(ctx.user, input.organizationId);
      if (!validatedOrgId) throw new TRPCError({ code: "FORBIDDEN" });

      const db = await getDb();
      if (!db) return [];

      return db.select()
        .from(blueprintStructureModes)
        .where(eq(blueprintStructureModes.organizationId, validatedOrgId));
    }),

  // ─── Create Velocity Attribution ────────────────────────────────────────
  createAttribution: protectedProcedure
    .input(z.object({
      organizationId: z.number().optional(),
      entityType: z.enum(["task", "process_step", "venture_stage"]),
      entityId: z.number(),
      entityName: z.string().optional(),
      ventureId: z.number().optional(),
      delaySource: z.string(),
      delayCategory: z.string(),
      description: z.string().optional(),
      blockedBy: z.string().optional(),
      expectedCompletionDate: z.string().optional(),
      delayDays: z.number().optional(),
      frictionFlagId: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const [result] = await db.insert(velocityAttribution).values({
        organizationId: input.organizationId,
        entityType: input.entityType,
        entityId: input.entityId,
        entityName: input.entityName,
        ventureId: input.ventureId,
        delaySource: input.delaySource,
        delayCategory: input.delayCategory,
        description: input.description,
        blockedBy: input.blockedBy,
        expectedCompletionDate: input.expectedCompletionDate,
        delayDays: input.delayDays || 0,
        frictionFlagId: input.frictionFlagId,
        aiGenerated: false,
      });
      return { id: result.insertId };
    }),

  // ─── AI Auto-Attribute Delay ────────────────────────────────────────────
  autoAttributeDelay: protectedProcedure
    .input(z.object({
      entityType: z.enum(["task", "process_step", "venture_stage"]),
      entityId: z.number(),
      entityName: z.string(),
      ventureId: z.number().optional(),
      organizationId: z.number(),
      context: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      const validatedOrgId = resolveOrgId(ctx.user, input.organizationId);
      if (!validatedOrgId) throw new TRPCError({ code: "FORBIDDEN" });

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      // Get the current diagnostic for context
      const [diagnostic] = await db.select()
        .from(blueprintDiagnostics)
        .where(and(
          eq(blueprintDiagnostics.organizationId, validatedOrgId),
          eq(blueprintDiagnostics.status, "current"),
        ))
        .limit(1);

      const frictionFlagTitles = diagnostic?.frictionFlags
        ? (diagnostic.frictionFlags as Array<{ title: string }>).map((f) => f.title)
        : [];

      const prompt = `A ${input.entityType} named "${input.entityName}" is delayed.

Context: ${input.context}

${diagnostic ? `
Organization Diagnostic (current):
- Decision Velocity: ${diagnostic.decisionVelocity}/100
- Ownership Clarity: ${diagnostic.ownershipClarity}/100
- Communication Density: ${diagnostic.communicationDensity}/100
- Capital Readiness: ${diagnostic.capitalReadiness}/100
- Execution Capacity: ${diagnostic.executionCapacity}/100
- Known friction flags: ${JSON.stringify(frictionFlagTitles)}
` : "No diagnostic data available."}

Determine the root cause of this delay and classify it.`;

      const response = await invokeLLM({
        messages: [
          { role: "system", content: VELOCITY_ATTRIBUTION_PROMPT },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" },
      });

      const rawContent3 = response.choices?.[0]?.message?.content;
      const content3 = typeof rawContent3 === "string" ? rawContent3 : JSON.stringify(rawContent3) || "{}";
      let attribution: {
        delaySource?: string;
        delayCategory?: string;
        description?: string;
        blockedBy?: string;
        estimatedDelayDays?: number;
        recommendation?: string;
        confidenceScore?: number;
      };
      try {
        attribution = JSON.parse(content3);
      } catch {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to parse attribution" });
      }

      // Find matching friction flag if any
      let frictionFlagId: string | undefined;
      if (diagnostic?.frictionFlags) {
        const flags = diagnostic.frictionFlags as Array<{ id: string; category: string; title: string }>;
        const matchingFlag = flags.find((f) =>
          f.category === attribution.delayCategory ||
          (attribution.description && attribution.description.toLowerCase().includes(f.title.toLowerCase()))
        );
        if (matchingFlag) frictionFlagId = matchingFlag.id;
      }

      const [result] = await db.insert(velocityAttribution).values({
        organizationId: validatedOrgId,
        entityType: input.entityType,
        entityId: input.entityId,
        entityName: input.entityName,
        ventureId: input.ventureId,
        delaySource: attribution.delaySource || "unknown",
        delayCategory: attribution.delayCategory || "unknown",
        description: attribution.description,
        blockedBy: attribution.blockedBy,
        delayDays: attribution.estimatedDelayDays || 0,
        aiGenerated: true,
        confidenceScore: attribution.confidenceScore || 50,
        frictionFlagId,
      });

      return { id: result.insertId, ...attribution, frictionFlagId };
    }),

  // ─── Get Attributions for Entity ────────────────────────────────────────
  getAttributions: protectedProcedure
    .input(z.object({
      entityType: z.string().optional(),
      entityId: z.number().optional(),
      ventureId: z.number().optional(),
      organizationId: z.number().optional(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      const conditions = [];
      if (input.entityType) conditions.push(eq(velocityAttribution.entityType, input.entityType));
      if (input.entityId) conditions.push(eq(velocityAttribution.entityId, input.entityId));
      if (input.ventureId) conditions.push(eq(velocityAttribution.ventureId, input.ventureId));
      if (input.organizationId) conditions.push(eq(velocityAttribution.organizationId, input.organizationId));

      return db.select()
        .from(velocityAttribution)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(velocityAttribution.createdAt))
        .limit(100);
    }),

  // ─── Resolve Attribution ────────────────────────────────────────────────
  resolveAttribution: protectedProcedure
    .input(z.object({
      id: z.number(),
      resolution: z.string(),
      actualCompletionDate: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      await db.update(velocityAttribution)
        .set({
          resolvedAt: new Date(),
          resolvedBy: ctx.user.name || ctx.user.openId,
          resolution: input.resolution,
          actualCompletionDate: input.actualCompletionDate,
        })
        .where(eq(velocityAttribution.id, input.id));
      return { success: true };
    }),

  // ─── Velocity Summary for Org ───────────────────────────────────────────
  getVelocitySummary: protectedProcedure
    .input(z.object({ organizationId: z.number() }))
    .query(async ({ input, ctx }) => {
      const validatedOrgId = resolveOrgId(ctx.user, input.organizationId);
      if (!validatedOrgId) throw new TRPCError({ code: "FORBIDDEN" });

      const db = await getDb();
      if (!db) return {
        total: 0, resolved: 0, unresolved: 0,
        totalDelayDays: 0, clientDelayDays: 0, ventexDelayDays: 0, externalDelayDays: 0,
        clientResponsibilityPct: 0, ventexResponsibilityPct: 0, externalResponsibilityPct: 0,
        bySource: {} as Record<string, { count: number; totalDelayDays: number; resolved: number }>,
        byCategory: {} as Record<string, { count: number; totalDelayDays: number }>,
      };

      const attributions = await db.select()
        .from(velocityAttribution)
        .where(eq(velocityAttribution.organizationId, validatedOrgId));

      // Aggregate by delay source
      const bySource: Record<string, { count: number; totalDelayDays: number; resolved: number }> = {};
      const byCategory: Record<string, { count: number; totalDelayDays: number }> = {};

      for (const a of attributions) {
        if (!bySource[a.delaySource]) bySource[a.delaySource] = { count: 0, totalDelayDays: 0, resolved: 0 };
        bySource[a.delaySource].count++;
        bySource[a.delaySource].totalDelayDays += a.delayDays;
        if (a.resolvedAt) bySource[a.delaySource].resolved++;

        if (!byCategory[a.delayCategory]) byCategory[a.delayCategory] = { count: 0, totalDelayDays: 0 };
        byCategory[a.delayCategory].count++;
        byCategory[a.delayCategory].totalDelayDays += a.delayDays;
      }

      const totalDelayDays = attributions.reduce((sum: number, a) => sum + a.delayDays, 0);
      const clientDelayDays = attributions
        .filter((a) => a.delaySource.startsWith("client"))
        .reduce((sum: number, a) => sum + a.delayDays, 0);
      const ventexDelayDays = attributions
        .filter((a) => a.delaySource === "ventex_processing")
        .reduce((sum: number, a) => sum + a.delayDays, 0);
      const externalDelayDays = totalDelayDays - clientDelayDays - ventexDelayDays;

      return {
        total: attributions.length,
        resolved: attributions.filter((a) => a.resolvedAt).length,
        unresolved: attributions.filter((a) => !a.resolvedAt).length,
        totalDelayDays,
        clientDelayDays,
        ventexDelayDays,
        externalDelayDays,
        clientResponsibilityPct: totalDelayDays > 0 ? Math.round((clientDelayDays / totalDelayDays) * 100) : 0,
        ventexResponsibilityPct: totalDelayDays > 0 ? Math.round((ventexDelayDays / totalDelayDays) * 100) : 0,
        externalResponsibilityPct: totalDelayDays > 0 ? Math.round((externalDelayDays / totalDelayDays) * 100) : 0,
        bySource,
        byCategory,
      };
    }),
});
