// ============================================================================
// Centralized Data Persistence Layer
// All dashboard data changes are persisted to localStorage.
// Data is NEVER removed — only added or updated.
// ============================================================================

const STORAGE_KEYS = {
  tasks: "atlas_tasks",
  ventures: "atlas_ventures",
  distributions: "atlas_distributions",
  team: "atlas_team",
  spvs: "atlas_spvs",
  settings: "atlas_settings",
} as const;

// Generic helpers
function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function save<T>(key: string, data: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.warn("[Persistence] Failed to save:", key, e);
  }
}

// ── Tasks ──────────────────────────────────────────────────────────────────
import type { Task } from "./data";

export function loadTasks(defaults: Task[]): Task[] {
  const saved = load<Task[] | null>(STORAGE_KEYS.tasks, null);
  if (!saved) return [...defaults];
  // Merge: keep all saved tasks, add any new defaults not already present
  const savedIds = new Set(saved.map((t) => t.id));
  const merged = [...saved];
  for (const d of defaults) {
    if (!savedIds.has(d.id)) merged.push(d);
  }
  return merged;
}

export function saveTasks(tasks: Task[]): void {
  save(STORAGE_KEYS.tasks, tasks);
  // Debounced Airtable sync
  import("./airtableSync").then(m => m.syncTasks(tasks)).catch(() => {});
}

// ── Ventures ───────────────────────────────────────────────────────────────
import type { Venture } from "./data";

export function loadVentures(defaults: Venture[]): Venture[] {
  const saved = load<Venture[] | null>(STORAGE_KEYS.ventures, null);
  if (!saved) return [...defaults];
  const savedIds = new Set(saved.map((v) => v.id));
  const merged = [...saved];
  for (const d of defaults) {
    if (!savedIds.has(d.id)) merged.push(d);
  }
  return merged;
}

export function saveVentures(ventures: Venture[]): void {
  save(STORAGE_KEYS.ventures, ventures);
  import("./airtableSync").then(m => m.syncVentures(ventures)).catch(() => {});
}

// ── Distributions ──────────────────────────────────────────────────────────
import type { Distribution } from "./data";

export function loadDistributions(defaults: Distribution[]): Distribution[] {
  const saved = load<Distribution[] | null>(STORAGE_KEYS.distributions, null);
  if (!saved) return [...defaults];
  const savedIds = new Set(saved.map((d) => d.id));
  const merged = [...saved];
  for (const d of defaults) {
    if (!savedIds.has(d.id)) merged.push(d);
  }
  return merged;
}

export function saveDistributions(distributions: Distribution[]): void {
  save(STORAGE_KEYS.distributions, distributions);
  // Distributions don't have an Airtable table yet
}

// ── SPVs ───────────────────────────────────────────────────────────────────
import type { SPV } from "./data";

export function loadSPVs(defaults: SPV[]): SPV[] {
  const saved = load<SPV[] | null>(STORAGE_KEYS.spvs, null);
  if (!saved) return [...defaults];
  const savedIds = new Set(saved.map((s) => s.id));
  const merged = [...saved];
  for (const d of defaults) {
    if (!savedIds.has(d.id)) merged.push(d);
  }
  return merged;
}

export function saveSPVs(spvs: SPV[]): void {
  save(STORAGE_KEYS.spvs, spvs);
  import("./airtableSync").then(m => m.syncSPVs(spvs)).catch(() => {});
}

// ── Team ───────────────────────────────────────────────────────────────────
import type { TeamMember } from "./data";

export function loadTeam(defaults: TeamMember[]): TeamMember[] {
  const saved = load<TeamMember[] | null>(STORAGE_KEYS.team, null);
  if (!saved) return [...defaults];
  const savedIds = new Set(saved.map((m) => m.id));
  const merged = [...saved];
  for (const d of defaults) {
    if (!savedIds.has(d.id)) merged.push(d);
  }
  return merged;
}

export function saveTeam(team: TeamMember[]): void {
  save(STORAGE_KEYS.team, team);
  import("./airtableSync").then(m => m.syncTeam(team)).catch(() => {});
}

// ── Settings ───────────────────────────────────────────────────────────────
interface AppSettings {
  darkMode: boolean;
  notifications: Record<string, boolean>;
  [key: string]: unknown;
}

export function loadSettings(defaults: AppSettings): AppSettings {
  return load<AppSettings>(STORAGE_KEYS.settings, defaults);
}

export function saveSettings(settings: AppSettings): void {
  save(STORAGE_KEYS.settings, settings);
}

// ── Utility ────────────────────────────────────────────────────────────────

/** Get a summary of all persisted data counts */
export function getStorageSummary(): Record<string, number> {
  const summary: Record<string, number> = {};
  for (const [label, key] of Object.entries(STORAGE_KEYS)) {
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        summary[label] = Array.isArray(parsed) ? parsed.length : 1;
      } else {
        summary[label] = 0;
      }
    } catch {
      summary[label] = 0;
    }
  }
  return summary;
}

/** Export all persisted data as a JSON blob (for backup) */
export function exportAllData(): string {
  const allData: Record<string, unknown> = {};
  for (const [label, key] of Object.entries(STORAGE_KEYS)) {
    try {
      const raw = localStorage.getItem(key);
      if (raw) allData[label] = JSON.parse(raw);
    } catch {
      // skip
    }
  }
  return JSON.stringify(allData, null, 2);
}
