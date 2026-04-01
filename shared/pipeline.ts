// ============================================================================
// Shared Pipeline Stages — used by both portal and agents routers
// ============================================================================

export const STAGE_PIPELINE = [
  "In Validation",
  "In Fundraising",
  "Active Ventures",
  "Completed",
] as const;

export type PipelineStage = (typeof STAGE_PIPELINE)[number];

export function getNextStage(current: string): string | null {
  const idx = STAGE_PIPELINE.indexOf(current as PipelineStage);
  if (idx === -1 || idx >= STAGE_PIPELINE.length - 1) return null;
  return STAGE_PIPELINE[idx + 1];
}

export function isTerminalStage(stage: string): boolean {
  return stage === "Completed";
}
