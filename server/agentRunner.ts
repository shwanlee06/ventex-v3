// Agent Runner — Shared execution logic for agents
// Used by both the tRPC router (manual trigger) and the scheduler (auto trigger)
// Now includes: Predictive Analytics, Market Intelligence, Continuous Learning
// SSE broadcast: pushes real-time updates to connected clients after each phase

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

// SSE broadcast — push real-time updates to connected clients
import { broadcastSSE, type SSEEvent } from "./routes/sseEvents";

/**
 * Emit an SSE event to all clients in a specific organization.
 * Non-blocking — failures are silently ignored.
 */
function emitAgentEvent(organizationId: number, data: Record<string, unknown>) {
  try {
    broadcastSSE({
      type: "agent_activity",
      data: { ...data, timestamp: Date.now() },
      organizationId,
    });
  } catch {
    // Non-critical — SSE is best-effort
  }
}

/**
 * Run all agents for a specific organization.
 * Returns the total signal count.
 * Broadcasts SSE events after each major phase so clients see real-time activity.
 */
export async function runAgentsForOrg(
  db: NonNullable<Awaited<ReturnType<typeof getDb>>>,
  organizationId: number,
  config: ClientAgentConfig | null
): Promise<{ signalCount: number; intelligence?: IntelligenceResult; escalation?: EscalationResult; proactive?: ProactiveAgentResult }> {

  // Phase 1: Core agents — Overdue, Velocity, Distribution
  const [overdueSignals, velocitySignals, distSignals] = await Promise.all([
    runOverdueAgent(db, organizationId),
    runVelocityAgent(db, organizationId),
    runDistributionSentinel(db, organizationId),
  ]);

  const allSubSignals = [...overdueSignals, ...velocitySignals, ...distSignals];

  // Broadcast: core agent signals detected
  if (allSubSignals.length > 0) {
    const overdueCount = overdueSignals.filter(s => s.severity === "warning" || s.severity === "critical").length;
    const velocityCount = velocitySignals.filter(s => s.eventType === "status_change" || s.eventType === "recommendation").length;
    const distCount = distSignals.length;

    emitAgentEvent(organizationId, {
      phase: "core_agents",
      action: "signals_detected",
      totalSignals: allSubSignals.length,
      overdueAlerts: overdueCount,
      velocityActions: velocityCount,
      distributionAlerts: distCount,
      message: `VENTEX detected ${allSubSignals.length} signals: ${overdueCount} overdue alerts, ${velocityCount} velocity actions, ${distCount} distribution alerts`,
    });
  }

  // Phase 2: Orchestrator — cross-references all signals
  const orchestratorSignals = await runOrchestrator(db, allSubSignals, organizationId);
  const allSignals = [...allSubSignals, ...orchestratorSignals];
  await persistSignals(db, allSignals);

  // Phase 3: Intelligence engines — Predictive, Market, Learning
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

    // Broadcast: intelligence phase complete
    const insightsGenerated = [
      predictive.status === "fulfilled" ? "predictive" : null,
      market.status === "fulfilled" ? "market" : null,
      learning.status === "fulfilled" ? "learning" : null,
    ].filter(Boolean);

    if (insightsGenerated.length > 0) {
      emitAgentEvent(organizationId, {
        phase: "intelligence",
        action: "insights_generated",
        engines: insightsGenerated,
        elapsedSeconds: parseFloat(elapsed),
        message: `Intelligence engines completed: ${insightsGenerated.join(", ")} (${elapsed}s)`,
      });
    }

    if (predictive.status === "rejected") {
      console.error(`[AgentRunner] Predictive engine failed for org ${organizationId}:`, predictive.reason);
    }
    if (market.status === "rejected") {
      console.error(`[AgentRunner] Market intelligence failed for org ${organizationId}:`, market.reason);
    }
    if (learning.status === "rejected") {
      console.error(`[AgentRunner] Continuous learning failed for org ${organizationId}:`, learning.reason);
    }

  } catch (err: any) {
    console.error(`[AgentRunner] Intelligence phase failed for org ${organizationId}:`, err.message);
  }

  // Phase 4: Proactive agents — Execute tasks + Generate new tasks
  let proactiveResult: ProactiveAgentResult | undefined;
  try {
    const proactiveStart = Date.now();

    // Step 1: Execute automatable tasks (complete work)
    const executorResult = await runAutonomousTaskExecutor(organizationId);

    // Broadcast: tasks completed by AI
    if (executorResult.tasksCompleted > 0) {
      emitAgentEvent(organizationId, {
        phase: "proactive",
        action: "tasks_completed",
        tasksCompleted: executorResult.tasksCompleted,
        message: `VENTEX AI completed ${executorResult.tasksCompleted} task${executorResult.tasksCompleted > 1 ? "s" : ""} autonomously`,
      });
    }

    // Step 2: Generate new tasks for ventures that need them
    const generatorResult = await runProactiveTaskGenerator(organizationId);

    // Broadcast: new tasks created by AI
    if (generatorResult.tasksCreated > 0) {
      emitAgentEvent(organizationId, {
        phase: "proactive",
        action: "tasks_created",
        tasksCreated: generatorResult.tasksCreated,
        venturesProcessed: generatorResult.venturesProcessed,
        message: `VENTEX AI created ${generatorResult.tasksCreated} new task${generatorResult.tasksCreated > 1 ? "s" : ""} across ${generatorResult.venturesProcessed} venture${generatorResult.venturesProcessed > 1 ? "s" : ""}`,
      });
    }

    const proactiveElapsed = ((Date.now() - proactiveStart) / 1000).toFixed(1);

    proactiveResult = {
      tasksCompleted: executorResult.tasksCompleted,
      tasksCreated: generatorResult.tasksCreated,
      venturesProcessed: generatorResult.venturesProcessed,
      elapsedSeconds: parseFloat(proactiveElapsed),
    };

  } catch (err: any) {
    console.error(`[AgentRunner] Proactive agents failed for org ${organizationId}:`, err.message);
  }

  // Phase 5: Escalation sweep
  let escalation: EscalationResult | undefined;
  try {
    escalation = await runEscalationSweep(organizationId);

    // Broadcast: escalations detected
    const totalEscalations = (escalation?.escalationsCreated || 0) + (escalation?.nudgesSent || 0);
    if (totalEscalations > 0) {
      emitAgentEvent(organizationId, {
        phase: "escalation",
        action: "items_escalated",
        escalationsCreated: escalation!.escalationsCreated,
        nudgesSent: escalation!.nudgesSent,
        overdueTaskAlerts: escalation!.overdueTaskAlerts,
        message: `VENTEX escalated ${escalation!.escalationsCreated} item${escalation!.escalationsCreated !== 1 ? "s" : ""} and sent ${escalation!.nudgesSent} nudge${escalation!.nudgesSent !== 1 ? "s" : ""}`,
      });
    }
  } catch (err: any) {
    console.error(`[AgentRunner] Escalation sweep failed for org ${organizationId}:`, err.message);
  }

  // Final broadcast: cycle summary for this org
  emitAgentEvent(organizationId, {
    phase: "summary",
    action: "cycle_complete",
    signalCount: allSignals.length,
    tasksCompleted: proactiveResult?.tasksCompleted || 0,
    tasksCreated: proactiveResult?.tasksCreated || 0,
    escalationsCreated: escalation?.escalationsCreated || 0,
    nudgesSent: escalation?.nudgesSent || 0,
    message: `VENTEX cycle complete: ${allSignals.length} signals, ${proactiveResult?.tasksCompleted || 0} tasks completed, ${proactiveResult?.tasksCreated || 0} tasks created`,
  });

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
