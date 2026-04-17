/**
 * Server-side Cron Jobs — Scheduled Tasks
 *
 * W4-003: ECB FX rate fetching — daily at 16:00 CET (15:00 UTC in winter, 14:00 UTC in summer)
 * W4-004: Nightly portfolio snapshots to S3 — daily at 02:00 UTC
 *
 * Uses setInterval-based scheduling with time-of-day targeting.
 * Each job checks the current UTC hour and runs if it matches the target.
 */

import { fetchECBRates } from "./currency";
import { generatePortfolioSnapshot } from "./resilience/snapshotExport";
import { storagePut } from "./storage";
import { getDb } from "./db";
import { organizations } from "../drizzle/schema";
import { eq } from "drizzle-orm";

// ─── Configuration ──────────────────────────────────────────────

/** ECB publishes rates around 16:00 CET. We fetch at 15:15 UTC (16:15 CET winter / 17:15 CEST summer) */
const ECB_FETCH_HOUR_UTC = 15;
const ECB_FETCH_MINUTE_UTC = 15;

/** Nightly snapshots at 02:00 UTC */
const SNAPSHOT_HOUR_UTC = 2;
const SNAPSHOT_MINUTE_UTC = 0;

/** Check interval: every 15 minutes */
const CHECK_INTERVAL_MS = 15 * 60 * 1000;

// Track last run dates to prevent duplicate runs
let lastECBRunDate = "";
let lastSnapshotRunDate = "";

// ─── ECB FX Rate Job ────────────────────────────────────────────

async function runECBFetchJob(): Promise<void> {
  const today = new Date().toISOString().slice(0, 10);
  if (lastECBRunDate === today) return; // Already ran today

  const now = new Date();
  const utcHour = now.getUTCHours();
  const utcMinute = now.getUTCMinutes();

  // Run if we're within the target window (15:15-15:29 UTC)
  if (utcHour !== ECB_FETCH_HOUR_UTC || utcMinute < ECB_FETCH_MINUTE_UTC) return;

  console.log("[Cron/ECB] Starting daily ECB FX rate fetch...");
  try {
    const saved = await fetchECBRates();
    lastECBRunDate = today;
    if (saved > 0) {
      console.log(`[Cron/ECB] Successfully saved ${saved} FX rates for ${today}`);
    } else {
      console.warn("[Cron/ECB] No rates fetched — ECB feed may be unavailable (weekend/holiday)");
    }
  } catch (err) {
    console.error("[Cron/ECB] Failed to fetch rates:", err);
  }
}

// ─── Nightly Snapshot Job ───────────────────────────────────────

async function runSnapshotJob(): Promise<void> {
  const today = new Date().toISOString().slice(0, 10);
  if (lastSnapshotRunDate === today) return; // Already ran today

  const now = new Date();
  const utcHour = now.getUTCHours();
  const utcMinute = now.getUTCMinutes();

  // Run if we're within the target window (02:00-02:14 UTC)
  if (utcHour !== SNAPSHOT_HOUR_UTC || utcMinute < SNAPSHOT_MINUTE_UTC || utcMinute >= SNAPSHOT_MINUTE_UTC + 15) return;

  console.log("[Cron/Snapshot] Starting nightly portfolio snapshot export...");
  try {
    const db = await getDb();
    if (!db) {
      console.warn("[Cron/Snapshot] Database unavailable, skipping snapshot");
      return;
    }

    // Fetch all active organizations
    const activeOrgs = await db
      .select()
      .from(organizations)
      .where(eq(organizations.status, "active"));

    if (activeOrgs.length === 0) {
      console.log("[Cron/Snapshot] No active organizations found, skipping");
      lastSnapshotRunDate = today;
      return;
    }

    let successCount = 0;
    let failCount = 0;

    for (const org of activeOrgs) {
      try {
        const snapshot = await generatePortfolioSnapshot(org.id);
        const snapshotJson = JSON.stringify(snapshot, null, 2);
        const key = `snapshots/${org.slug}/${today}/portfolio-snapshot.json`;

        await storagePut(key, snapshotJson, "application/json");
        successCount++;
        console.log(`[Cron/Snapshot] Exported snapshot for ${org.name} → ${key}`);
      } catch (orgErr: any) {
        failCount++;
        console.error(`[Cron/Snapshot] Failed for org ${org.name}:`, orgErr.message);
      }
    }

    lastSnapshotRunDate = today;
    console.log(`[Cron/Snapshot] Complete: ${successCount} success, ${failCount} failed out of ${activeOrgs.length} orgs`);
  } catch (err) {
    console.error("[Cron/Snapshot] Job failed:", err);
  }
}

// ─── Scheduler ──────────────────────────────────────────────────

let cronInterval: ReturnType<typeof setInterval> | null = null;

/**
 * Start the cron scheduler. Checks every 15 minutes if any job should run.
 * Call this once from server startup (after DB is ready).
 */
export function startCronScheduler(): void {
  if (cronInterval) {
    console.warn("[Cron] Scheduler already running");
    return;
  }

  console.log("[Cron] Starting scheduled task runner (ECB FX @ 15:15 UTC, Snapshots @ 02:00 UTC)");

  // Run checks immediately on startup
  setTimeout(async () => {
    await runECBFetchJob();
    await runSnapshotJob();
  }, 5000); // 5s delay to let DB warm up

  // Then check every 15 minutes
  cronInterval = setInterval(async () => {
    await runECBFetchJob();
    await runSnapshotJob();
  }, CHECK_INTERVAL_MS);
}

/**
 * Stop the cron scheduler.
 */
export function stopCronScheduler(): void {
  if (cronInterval) {
    clearInterval(cronInterval);
    cronInterval = null;
    console.log("[Cron] Scheduler stopped");
  }
}

/**
 * Get the current status of the cron scheduler.
 */
export function getCronStatus(): {
  running: boolean;
  lastECBRun: string;
  lastSnapshotRun: string;
  nextCheckIn: string;
} {
  return {
    running: cronInterval !== null,
    lastECBRun: lastECBRunDate || "never",
    lastSnapshotRun: lastSnapshotRunDate || "never",
    nextCheckIn: `${CHECK_INTERVAL_MS / 60000} minutes`,
  };
}

/**
 * Manually trigger the ECB rate fetch (for admin use / testing).
 */
export async function triggerECBFetch(): Promise<number> {
  console.log("[Cron/ECB] Manual trigger initiated");
  const saved = await fetchECBRates();
  if (saved > 0) {
    lastECBRunDate = new Date().toISOString().slice(0, 10);
  }
  return saved;
}

/**
 * Manually trigger a snapshot export for a specific org (for admin use / testing).
 */
export async function triggerSnapshot(organizationId: number): Promise<string> {
  console.log(`[Cron/Snapshot] Manual trigger for org ${organizationId}`);
  const snapshot = await generatePortfolioSnapshot(organizationId);
  const snapshotJson = JSON.stringify(snapshot, null, 2);
  const today = new Date().toISOString().slice(0, 10);
  const key = `snapshots/${snapshot.organization.slug}/${today}/portfolio-snapshot-manual.json`;
  const { url } = await storagePut(key, snapshotJson, "application/json");
  return url;
}
