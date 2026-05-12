// Agent Scheduler — Automatic agent execution on configurable intervals
// Runs all four agents (Overdue, Velocity, Distribution, Orchestrator)
// + Intelligence engines + Proactive agents for every active organization

import { getDb, resetDbPool } from "./db";
import {
  agentEvents,
  agentDrafts,
  organizations,
  clientAgentConfig,
  auditLog,
} from "../drizzle/schema";
import { eq, desc, and, lt, sql, inArray } from "drizzle-orm";

let schedulerInterval: ReturnType<typeof setInterval> | null = null;
let lastRunAt: Date | null = null;
let nextRunAt: Date | null = null;
let isRunning = false;
let totalRunCount = 0;
let consecutiveFailures = 0;

const DEFAULT_INTERVAL_MS = 6 * 60 * 60 * 1000; // 6 hours (production)
const MAX_CONSECUTIVE_FAILURES = 3;

/**
 * Run all agents for all active organizations.
 * This is the core function called by the scheduler.
 * Includes connection resilience: resets pool after consecutive failures.
 */
async function executeAgentCycle(): Promise<{
  success: boolean;
  orgsProcessed: number;
  totalSignals: number;
  errors: string[];
}> {
  if (isRunning) {
    return { success: false, orgsProcessed: 0, totalSignals: 0, errors: ["Previous cycle still running"] };
  }

  isRunning = true;
  const startTime = Date.now();
  const errors: string[] = [];
  let orgsProcessed = 0;
  let totalSignals = 0;

  try {
    // If we've had consecutive failures, force-reset the connection pool before trying again
    if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
      console.warn(`[AgentScheduler] ${consecutiveFailures} consecutive failures — resetting DB pool before retry`);
      await resetDbPool();
      consecutiveFailures = 0;
    }

    const db = await getDb();
    if (!db) {
      consecutiveFailures++;
      isRunning = false;
      return { success: false, orgsProcessed: 0, totalSignals: 0, errors: ["Database not available"] };
    }

    // Get all active CLIENT organizations (exclude the core VENTEX operator org)
    const activeOrgs = await db
      .select({ id: organizations.id, name: organizations.name })
      .from(organizations)
      .where(
        and(
          eq(organizations.status, "active"),
          eq(organizations.type, "client")
        )
      );

    // Auto-provision: create agent configs for any active org that doesn't have one yet
    // This ensures new clients get agents working from day one (multi-client ready)
    try {
      const existingConfigs = await db
        .select({ organizationId: clientAgentConfig.organizationId })
        .from(clientAgentConfig);
      const configOrgIds = new Set(existingConfigs.map(c => c.organizationId));
      const missingOrgs = activeOrgs.filter(o => !configOrgIds.has(o.id));

      for (const org of missingOrgs) {
        await db.insert(clientAgentConfig).values({
          organizationId: org.id,
          velocityAgentEnabled: true,
          complianceAgentEnabled: true,
          dealFlowAgentEnabled: true,
          orchestratorEnabled: true,
          overdueDaysThreshold: 7,
          distributionWarningDays: 14,
          healthScoreAlertThreshold: 30,
          autoAdvanceEnabled: true,
          pollingIntervalMinutes: 30,
        });
        console.log(`[AgentScheduler] Auto-provisioned agent config for org ${org.id} (${org.name})`);
      }
    } catch (provisionErr: any) {
      console.error("[AgentScheduler] Config auto-provision error:", provisionErr.message);
    }

    // Dynamically import agent functions to avoid circular dependencies
    const { runAgentsForOrg } = await import("./agentRunner");

    // Also import SSE broadcast for real-time client updates
    let broadcastSSE: ((event: any) => void) | null = null;
    try {
      const sseModule = await import("./routes/sseEvents");
      broadcastSSE = sseModule.broadcastSSE;
    } catch {
      // SSE not available — non-critical
    }

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

        // Broadcast agent activity via SSE so connected clients see updates in real-time
        if (broadcastSSE && result.signalCount > 0) {
          broadcastSSE({
            type: "agent_activity" as const,
            data: {
              organizationId: org.id,
              organizationName: org.name,
              signalCount: result.signalCount,
              tasksCompleted: result.proactive?.tasksCompleted || 0,
              tasksCreated: result.proactive?.tasksCreated || 0,
              timestamp: Date.now(),
            },
            organizationId: org.id,
          });
        }

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
        console.log(`[AgentScheduler] Cleaned up ${deletedCount} old drafts`);
      }
    } catch (cleanupErr: any) {
      console.error("[AgentScheduler] Draft cleanup error:", cleanupErr.message);
    }

    lastRunAt = new Date();
    totalRunCount++;
    consecutiveFailures = 0; // Reset on success
    nextRunAt = new Date(Date.now() + DEFAULT_INTERVAL_MS);

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`[AgentScheduler] Cycle #${totalRunCount} complete: ${orgsProcessed} orgs, ${totalSignals} signals, ${elapsed}s`);

    // SOC 2 audit trail — log every agent cycle
    try {
      await db.insert(auditLog).values({
        action: "agent_cycle_complete",
        entityType: "system",
        userName: "SYSTEM:AgentScheduler",
        details: JSON.stringify({
          orgsProcessed,
          totalSignals,
          elapsedSeconds: parseFloat(elapsed),
          errors: errors.length > 0 ? errors : undefined,
          runNumber: totalRunCount,
        }),
        result: errors.length > 0 ? "error" : "success",
      });
    } catch {
      // Non-critical — cycle itself succeeded
    }

    return { success: true, orgsProcessed, totalSignals, errors };
  } catch (err: any) {
    consecutiveFailures++;
    errors.push(err.message);
    console.error(`[AgentScheduler] Fatal cycle error (failure #${consecutiveFailures}):`, err.message);

    // If this is a connection error, reset the pool for next attempt
    if (err.message?.includes("Failed query") || err.message?.includes("ECONNREFUSED") || err.message?.includes("PROTOCOL_CONNECTION_LOST") || err.message?.includes("ETIMEDOUT")) {
      console.warn("[AgentScheduler] Connection error detected — will reset pool on next cycle");
      await resetDbPool();
    }

    return { success: false, orgsProcessed, totalSignals, errors };
  } finally {
    isRunning = false;
  }
}

/**
 * Start the agent scheduler with the default interval.
 * Called once during server startup.
 */
export function startAgentScheduler(): void {
  if (schedulerInterval) {
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
    console.log("[AgentScheduler] Running initial cycle (30s after startup)...");
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
    consecutiveFailures,
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
