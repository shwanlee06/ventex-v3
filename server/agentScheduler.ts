// ============================================================================
// Agent Scheduler — Automatic agent execution on configurable intervals
// Runs all four agents (Overdue, Velocity, Distribution, Orchestrator)
// for each active organization on a recurring schedule.
// ============================================================================

import { getDb } from "./db";
import {
  agentEvents,
  agentDrafts,
  organizations,
  clientAgentConfig,
} from "../drizzle/schema";
import { eq, desc, and, lt, sql, inArray } from "drizzle-orm";

// Import agent runner functions — they are exported from the agents router module
// We re-export them here so the scheduler can call them directly without tRPC context

let schedulerInterval: ReturnType<typeof setInterval> | null = null;
let lastRunAt: Date | null = null;
let nextRunAt: Date | null = null;
let isRunning = false;
let totalRunCount = 0;

const DEFAULT_INTERVAL_MS = 2 * 60 * 60 * 1000; // 2 hours (demo mode — production should be 6h)

/**
 * Run all agents for all active organizations.
 * This is the core function called by the scheduler.
 */
async function executeAgentCycle(): Promise<{
  success: boolean;
  orgsProcessed: number;
  totalSignals: number;
  errors: string[];
}> {
  if (isRunning) {
    console.log("[AgentScheduler] Skipping — previous cycle still running");
    return { success: false, orgsProcessed: 0, totalSignals: 0, errors: ["Previous cycle still running"] };
  }

  isRunning = true;
  const startTime = Date.now();
  const errors: string[] = [];
  let orgsProcessed = 0;
  let totalSignals = 0;

  try {
    const db = await getDb();
    if (!db) {
      isRunning = false;
      return { success: false, orgsProcessed: 0, totalSignals: 0, errors: ["Database not available"] };
    }

    // Get all active organizations (orgStatus column)
    const activeOrgs = await db
      .select({ id: organizations.id, name: organizations.name })
      .from(organizations)
      .where(eq(organizations.status, "active"));

    console.log(`[AgentScheduler] Starting cycle for ${activeOrgs.length} organizations`);

    // Dynamically import agent functions to avoid circular dependencies
    const { runAgentsForOrg } = await import("./agentRunner");

    for (const org of activeOrgs) {
      try {
        // Check if org has agent config and if agents are enabled
        const [config] = await db
          .select()
          .from(clientAgentConfig)
          .where(eq(clientAgentConfig.organizationId, org.id))
          .limit(1);

        const result = await runAgentsForOrg(db, org.id, config || null);
        totalSignals += result.signalCount;
        orgsProcessed++;

        console.log(`[AgentScheduler] Org "${org.name}" (${org.id}): ${result.signalCount} signals`);
      } catch (err: any) {
        const errMsg = `Org ${org.id} (${org.name}): ${err.message}`;
        errors.push(errMsg);
        console.error(`[AgentScheduler] Error for ${errMsg}`);
      }
    }

    // Auto-cleanup: archive old sent/dismissed drafts (older than 14 days)
    try {
      const cutoffDate = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
      const deleted = await db
        .delete(agentDrafts)
        .where(
          and(
            inArray(agentDrafts.status, ["sent", "dismissed"]),
            lt(agentDrafts.createdAt, cutoffDate)
          )
        );
      const deletedCount = (deleted as any)[0]?.affectedRows || 0;
      if (deletedCount > 0) {
        console.log(`[AgentScheduler] Auto-cleanup: removed ${deletedCount} old sent/dismissed drafts`);
      }
    } catch (cleanupErr: any) {
      console.error("[AgentScheduler] Draft cleanup error:", cleanupErr.message);
    }

    lastRunAt = new Date();
    totalRunCount++;
    nextRunAt = new Date(Date.now() + DEFAULT_INTERVAL_MS);

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`[AgentScheduler] Cycle complete: ${orgsProcessed} orgs, ${totalSignals} signals, ${elapsed}s`);

    return { success: true, orgsProcessed, totalSignals, errors };
  } catch (err: any) {
    errors.push(err.message);
    console.error("[AgentScheduler] Fatal cycle error:", err.message);
    return { success: false, orgsProcessed, totalSignals, errors };
  } finally {
    isRunning = false;
  }
}

/**
 * Start the agent scheduler with the default 6-hour interval.
 * Called once during server startup.
 */
export function startAgentScheduler(): void {
  if (schedulerInterval) {
    console.log("[AgentScheduler] Already running, skipping start");
    return;
  }

  console.log(`[AgentScheduler] Starting with ${DEFAULT_INTERVAL_MS / 1000 / 60 / 60}h interval`);
  nextRunAt = new Date(Date.now() + DEFAULT_INTERVAL_MS);

  schedulerInterval = setInterval(() => {
    executeAgentCycle().catch(err => {
      console.error("[AgentScheduler] Unhandled error in cycle:", err);
    });
  }, DEFAULT_INTERVAL_MS);

  // Also run once 30 seconds after server start to populate fresh data
  setTimeout(() => {
    console.log("[AgentScheduler] Running initial cycle (30s after startup)");
    executeAgentCycle().catch(err => {
      console.error("[AgentScheduler] Initial cycle error:", err);
    });
  }, 30_000);
}

/**
 * Stop the agent scheduler.
 */
export function stopAgentScheduler(): void {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
    nextRunAt = null;
    console.log("[AgentScheduler] Stopped");
  }
}

/**
 * Get the current scheduler status.
 */
export function getSchedulerStatus() {
  return {
    isActive: schedulerInterval !== null,
    isRunning,
    lastRunAt: lastRunAt?.toISOString() || null,
    nextRunAt: nextRunAt?.toISOString() || null,
    totalRunCount,
    intervalHours: DEFAULT_INTERVAL_MS / 1000 / 60 / 60,
  };
}

/**
 * Manually trigger an agent cycle (used by the admin "Run All" button).
 */
export async function triggerManualCycle() {
  const result = await executeAgentCycle();
  return result;
}
