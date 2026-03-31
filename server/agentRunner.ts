// ============================================================================
// Agent Runner — Shared execution logic for agents
// Used by both the tRPC router (manual trigger) and the scheduler (auto trigger)
// ============================================================================

import {
  runOverdueAgent,
  runVelocityAgent,
  runDistributionSentinel,
  runOrchestrator,
  persistSignals,
} from "./routers/agents";
import { getDb } from "./db";
import type { ClientAgentConfig } from "../drizzle/schema";

/**
 * Run all agents for a specific organization.
 * Returns the total signal count.
 */
export async function runAgentsForOrg(
  db: NonNullable<Awaited<ReturnType<typeof getDb>>>,
  organizationId: number,
  config: ClientAgentConfig | null
): Promise<{ signalCount: number }> {
  const [overdueSignals, velocitySignals, distSignals] = await Promise.all([
    runOverdueAgent(db, organizationId),
    runVelocityAgent(db, organizationId),
    runDistributionSentinel(db, organizationId),
  ]);

  const allSubSignals = [...overdueSignals, ...velocitySignals, ...distSignals];
  const orchestratorSignals = await runOrchestrator(db, allSubSignals, organizationId);

  const allSignals = [...allSubSignals, ...orchestratorSignals];
  await persistSignals(db, allSignals);

  return { signalCount: allSignals.length };
}
