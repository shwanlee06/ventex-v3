// ============================================================================
// Shared Blueprint Lookup — 3-Layer Resolution
// Used by agents and tRPC procedures alike.
// Layer 3 (venture override) > Layer 2 (client blueprint) > Layer 1 (system default)
// ============================================================================

import { getDb } from "./db";
import {
  processTemplates,
  processSteps,
  ventureProcessOverrides,
  ventures,
  orgVentureAccess,
} from "../drizzle/schema";
import { eq, and, desc } from "drizzle-orm";

export interface BlueprintStep {
  id: number;
  templateId: number;
  stageName: string;
  stepName: string;
  isBlocking: boolean;
  whoOwns: string | null;
  typicalDays: number | null;
  stepDescription: string | null;
  stageOrder: number;
  stepOrder: number;
  hasOverride: boolean;
  skipped?: boolean;
  overrides?: any[];
}

export interface BlueprintLookupResult {
  venture: { id: number; name: string; sector: string; stage: string } | null;
  template: any | null;
  steps: BlueprintStep[];
  overrides: any[];
  blueprintLayer: "venture_override" | "client_blueprint" | "sector_default" | null;
  /** Human-readable label for agent logs */
  sourceLabel: string;
}

/**
 * Resolve the effective blueprint for a venture using the 3-layer hierarchy.
 * Returns null template if no blueprint exists for the venture's sector.
 */
export async function lookupBlueprintForVenture(
  ventureId: number
): Promise<BlueprintLookupResult> {
  const db = await getDb();
  if (!db) {
    return { venture: null, template: null, steps: [], overrides: [], blueprintLayer: null, sourceLabel: "No DB" };
  }

  // Get the venture
  const [venture] = await db
    .select({
      id: ventures.id,
      name: ventures.name,
      sector: ventures.sector,
      stage: ventures.stage,
    })
    .from(ventures)
    .where(eq(ventures.id, ventureId))
    .limit(1);

  if (!venture) {
    return { venture: null, template: null, steps: [], overrides: [], blueprintLayer: null, sourceLabel: "Venture not found" };
  }

  // Find org for this venture
  const [orgAccess] = await db
    .select({ organizationId: orgVentureAccess.organizationId })
    .from(orgVentureAccess)
    .where(eq(orgVentureAccess.ventureId, ventureId))
    .limit(1);
  const orgId = orgAccess?.organizationId;

  let template: any = null;
  let blueprintLayer: string = "sector_default";

  // Layer 2: Client-specific confirmed blueprint
  if (orgId) {
    const [clientBp] = await db
      .select()
      .from(processTemplates)
      .where(
        and(
          eq(processTemplates.organizationId, orgId),
          eq(processTemplates.sector, venture.sector || ""),
          eq(processTemplates.status, "confirmed"),
          eq(processTemplates.isActive, true)
        )
      )
      .orderBy(desc(processTemplates.updatedAt))
      .limit(1);

    if (clientBp) {
      template = clientBp;
      blueprintLayer = "client_blueprint";
    }
  }

  // Layer 1 fallback: system default
  if (!template) {
    const [systemBp] = await db
      .select()
      .from(processTemplates)
      .where(
        and(
          eq(processTemplates.source, "system"),
          eq(processTemplates.sector, venture.sector || ""),
          eq(processTemplates.isActive, true)
        )
      )
      .orderBy(desc(processTemplates.updatedAt))
      .limit(1);
    if (systemBp) {
      template = systemBp;
      blueprintLayer = "sector_default";
    }
  }

  if (!template) {
    return {
      venture,
      template: null,
      steps: [],
      overrides: [],
      blueprintLayer: null,
      sourceLabel: `No blueprint for ${venture.sector}`,
    };
  }

  // Get steps
  const steps = await db
    .select()
    .from(processSteps)
    .where(eq(processSteps.templateId, template.id))
    .orderBy(processSteps.stageOrder, processSteps.stepOrder);

  // Layer 3: Get venture-level overrides
  const overrides = await db
    .select()
    .from(ventureProcessOverrides)
    .where(eq(ventureProcessOverrides.ventureId, ventureId));

  // Apply overrides to steps
  const effectiveSteps: BlueprintStep[] = steps.map((step: any) => {
    const stepOverrides = overrides.filter((o: any) => o.stepId === step.id);
    if (stepOverrides.length === 0) return { ...step, hasOverride: false };

    const merged: any = { ...step, hasOverride: true, overrides: stepOverrides };
    for (const ov of stepOverrides) {
      if (ov.overrideField === "typicalDays") merged.typicalDays = parseInt(ov.overrideValue);
      else if (ov.overrideField === "whoOwns") merged.whoOwns = ov.overrideValue;
      else if (ov.overrideField === "isBlocking") merged.isBlocking = ov.overrideValue === "true";
      else if (ov.overrideType === "skip") merged.skipped = true;
    }
    if (stepOverrides.length > 0) blueprintLayer = "venture_override";
    return merged;
  });

  // Build human-readable source label
  const sourceLabel =
    blueprintLayer === "venture_override"
      ? `Venture Override \u2192 ${template.blueprintName}`
      : blueprintLayer === "client_blueprint"
        ? `Client Blueprint \u2192 ${template.blueprintName}`
        : `Sector Default \u2192 ${template.blueprintName}`;

  return {
    venture,
    template,
    steps: effectiveSteps,
    overrides,
    blueprintLayer: blueprintLayer as BlueprintLookupResult["blueprintLayer"],
    sourceLabel,
  };
}

/**
 * Build a compact context string for agent LLM prompts.
 * Includes the effective blueprint steps for the current stage,
 * blocking steps, and the source layer.
 */
export function buildBlueprintContext(
  result: BlueprintLookupResult,
  currentStage?: string
): string {
  if (!result.template || result.steps.length === 0) {
    return "";
  }

  const stage = currentStage || result.venture?.stage || "";
  const stageSteps = stage
    ? result.steps.filter((s) => s.stageName === stage && !s.skipped)
    : result.steps.filter((s) => !s.skipped);

  const blocking = stageSteps.filter((s) => s.isBlocking);
  const blockingIncomplete = blocking; // Agents will cross-reference with tracking

  const lines = [
    `\n[Blueprint: ${result.sourceLabel}]`,
    `Steps for "${stage}": ${stageSteps.length} total, ${blocking.length} blocking`,
  ];

  if (stageSteps.length > 0) {
    lines.push(
      `Key steps: ${stageSteps
        .slice(0, 5)
        .map(
          (s) =>
            `"${s.stepName}" (${s.isBlocking ? "BLOCKING" : "non-blocking"}, owned by ${s.whoOwns || "unassigned"}${s.typicalDays ? `, ~${s.typicalDays}d` : ""})`
        )
        .join("; ")}`
    );
  }

  return lines.join(" | ");
}
