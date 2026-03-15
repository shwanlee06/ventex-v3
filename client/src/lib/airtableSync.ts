// ============================================================================
// Airtable Sync Client — pushes data changes to Airtable via backend API
// ============================================================================

import { toast } from "sonner";

const SYNC_DEBOUNCE_MS = 5000; // Wait 5s after last change before syncing
const syncTimers: Record<string, ReturnType<typeof setTimeout>> = {};

type SyncType = "ventures" | "tasks" | "people" | "spvs";

async function pushSync(type: SyncType, payload: Record<string, unknown>): Promise<boolean> {
  try {
    const res = await fetch(`/api/airtable/sync/${type}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (data.success) {
      console.log(`[Airtable] Synced ${type}:`, data.results);
      return true;
    } else {
      console.warn(`[Airtable] Sync failed for ${type}:`, data.error);
      return false;
    }
  } catch (err) {
    console.warn(`[Airtable] Sync error for ${type}:`, err);
    return false;
  }
}

/** Debounced sync — waits 5s after last change, then pushes to Airtable */
function debouncedSync(type: SyncType, payload: Record<string, unknown>): void {
  if (syncTimers[type]) clearTimeout(syncTimers[type]);
  syncTimers[type] = setTimeout(async () => {
    const ok = await pushSync(type, payload);
    if (ok) {
      toast.success(`Synced ${type} to Airtable`, {
        description: "Data backed up successfully",
        duration: 2000,
      });
    }
  }, SYNC_DEBOUNCE_MS);
}

// ── Public API ─────────────────────────────────────────────────────────────

export function syncVentures(ventures: unknown[]): void {
  debouncedSync("ventures", { ventures });
}

export function syncTasks(tasks: unknown[]): void {
  debouncedSync("tasks", { tasks });
}

export function syncTeam(team: unknown[]): void {
  debouncedSync("people", { team });
}

export function syncSPVs(spvs: unknown[]): void {
  debouncedSync("spvs", { spvs });
}

/** Manual full sync — triggered from Settings */
export async function syncAll(data: {
  ventures?: unknown[];
  tasks?: unknown[];
  team?: unknown[];
  spvs?: unknown[];
}): Promise<{ success: boolean; results: Record<string, unknown> }> {
  try {
    const res = await fetch("/api/airtable/sync/all", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return await res.json();
  } catch (err) {
    return { success: false, results: { error: String(err) } };
  }
}
