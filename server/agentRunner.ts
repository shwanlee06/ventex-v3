// ============================================================================
// Agent Runner — Shared execution logic for agents
// Used by both the tRPC router (manual trigger) and the scheduler (auto trigger)
// Now includes: Predictive Analytics, Market Intelligence, Continuous Learning
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

// Intelligence engines
import { runPredictiveEngine } from "./intelligence/predictiveEngine";
import { runMarketIntelligence } from "./intelligence/marketIntelligence";
import { runContinuousLearning } from "./intelligence/continuousLearning";
import { runEscalationSweep, type EscalationResult } from "./intelligence/escalationEngine";

// Proactive AI agents — the engine that actually moves ventures
import { runProactiveTaskGenerator } from "./agents/proactiveTaskGenerator";
import { runAutonomousTaskExecutor } from "./agents/autonomousTaskExecutor";

/**
 * Run all agents for a specific organization.
 * Returns the total signal count.
 */
export async function runAgentsForOrg(
  db: NonNullable<Awaited<ReturnType<typeof getDb>>>,
  organizationId: number,
  config: ClientAgentConfig | null
): Promise<{ signalCount: number; intelligence?: IntelligenceResult; escalation?: EscalationResult; proactive?: ProactiveAgentResult }> {
  // ── Phase 1: Core Agents (existing) ──────────────────────────────────
  const [overdueSignals, velocitySignals, distSignals] = await Promise.all([
    runOverdueAgent(db, organizationId),
    runVelocityAgent(db, organizationId),
    runDistributionSentinel(db, organizationId),
  ]);

  const allSubSignals = [...overdueSignals, ...velocitySignals, ...distSignals];
  const orchestratorSignals = await runOrchestrator(db, allSubSignals, organizationId);

  const allSignals = [...allSubSignals, ...orchestratorSignals];
  await persistSignals(db, allSignals);

  // ── Phase 2: Intelligence Engines (new) ──────────────────────────────
  let intelligence: IntelligenceResult | undefined;
  try {
    const intelligenceStart = Date.now();

    const [predictive, market, learning] = await Promise.allSettled([
      runPredictiveEngine(organizationId),
      runMarketIntelligence(organizationId),
      runContinuousLearning(organizationId),
    ]);

    const elapsed = ((Date.now() - intelligenceStart) / 1000).toFixed(1);

    intelligence = {
      predictive: predictive.status === "fulfilled" ? predictive.value : null,
      market: market.status === "fulfilled" ? market.value : null,
      learning: learning.status === "fulfilled" ? learning.value : null,
      elapsedSeconds: parseFloat(elapsed),
    };

    if (predictive.status === "rejected") {
      console.error(`[AgentRunner] Predictive engine failed for org ${organizationId}:`, predictive.reason);
    }
    if (market.status === "rejected") {
      console.error(`[AgentRunner] Market intelligence failed for org ${organizationId}:`, market.reason);
    }
    if (learning.status === "rejected") {
      console.error(`[AgentRunner] Continuous learning failed for org ${organizationId}:`, learning.reason);
    }

    console.log(
      `[AgentRunner] Intelligence engines for org ${organizationId}: ` +
      `predictive=${predictive.status}, market=${market.status}, learning=${learning.status} (${elapsed}s)`
    );
  } catch (err: any) {
    console.error(`[AgentRunner] Intelligence phase failed for org ${organizationId}:`, err.message);
  }

  // ── Phase 2.5: Proactive AI Agents (the engine) ─────────────────────
  let proactiveResult: ProactiveAgentResult | undefined;
  try {
    const proactiveStart = Date.now();

    // Step 1: Execute automatable tasks (complete work)
    const executorResult = await runAutonomousTaskExecutor(organizationId);

    // Step 2: Generate new tasks for ventures that need them
    const generatorResult = await runProactiveTaskGenerator(organizationId);

    const proactiveElapsed = ((Date.now() - proactiveStart) / 1000).toFixed(1);

    proactiveResult = {
      tasksCompleted: executorResult.tasksCompleted,
      tasksCreated: generatorResult.tasksCreated,
      venturesProcessed: generatorResult.venturesProcessed,
      elapsedSeconds: parseFloat(proactiveElapsed),
    };

    console.log(
      `[AgentRunner] Proactive agents for org ${organizationId}: ` +
      `${executorResult.tasksCompleted} tasks completed, ${generatorResult.tasksCreated} tasks created (${proactiveElapsed}s)`
    );
  } catch (err: any) {
    console.error(`[AgentRunner] Proactive agents failed for org ${organizationId}:`, err.message);
  }

  // ── Phase 3: Escalation Sweep ────────────────────────────────────────
  let escalation: EscalationResult | undefined;
  try {
    escalation = await runEscalationSweep(organizationId);
    console.log(
      `[AgentRunner] Escalation sweep for org ${organizationId}: ` +
      `${escalation.nudgesSent} nudges, ${escalation.escalationsCreated} escalations, ` +
      `${escalation.overdueTaskAlerts} overdue alerts`
    );
  } catch (err: any) {
    console.error(`[AgentRunner] Escalation sweep failed for org ${organizationId}:`, err.message);
  }

  return { signalCount: allSignals.length, intelligence, escalation, proactive: proactiveResult };
}

type ProactiveAgentResult = {
  tasksCompleted: number;
  tasksCreated: number;
  venturesProcessed: number;
  elapsedSeconds: number;
};

type IntelligenceResult = {
  predictive: Awaited<ReturnType<typeof runPredictiveEngine>> | null;
  market: Awaited<ReturnType<typeof runMarketIntelligence>> | null;
  learning: Awaited<ReturnType<typeof runContinuousLearning>> | null;
  elapsedSeconds: number;
};

export type { EscalationResult };
