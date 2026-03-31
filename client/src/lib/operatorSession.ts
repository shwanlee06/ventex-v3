// ============================================================================
// Operator Session Tracking — ATLAS System
// Tracks operator logins, activity, and session history in localStorage
// ============================================================================

export interface SessionEntry {
  operator: string;
  loginTime: string;
  logoutTime?: string;
  ip: string;
  actions: ActionEntry[];
}

export interface ActionEntry {
  time: string;
  action: string;
  detail?: string;
}

const SESSION_KEY = "atlas_sessions";
const CURRENT_SESSION_KEY = "atlas_current_session_id";
const MAX_SESSIONS = 50;

function generateSessionId(): string {
  return `ses_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

function generateIp(): string {
  // Simulate IP for demo — in production this would come from the server
  const octets = [
    Math.floor(Math.random() * 50) + 10,
    Math.floor(Math.random() * 255),
    Math.floor(Math.random() * 255),
    Math.floor(Math.random() * 255),
  ];
  return octets.join(".");
}

export function getAllSessions(): Record<string, SessionEntry> {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveSessions(sessions: Record<string, SessionEntry>) {
  // Trim to MAX_SESSIONS (keep newest)
  const entries = Object.entries(sessions);
  if (entries.length > MAX_SESSIONS) {
    entries.sort((a, b) => new Date(b[1].loginTime).getTime() - new Date(a[1].loginTime).getTime());
    sessions = Object.fromEntries(entries.slice(0, MAX_SESSIONS));
  }
  localStorage.setItem(SESSION_KEY, JSON.stringify(sessions));
}

export function startSession(operatorName: string): string {
  const sessions = getAllSessions();
  const id = generateSessionId();
  sessions[id] = {
    operator: operatorName,
    loginTime: new Date().toISOString(),
    ip: generateIp(),
    actions: [{ time: new Date().toISOString(), action: "Login", detail: "Operator authenticated" }],
  };
  saveSessions(sessions);
  localStorage.setItem(CURRENT_SESSION_KEY, id);
  return id;
}

export function endCurrentSession() {
  const id = localStorage.getItem(CURRENT_SESSION_KEY);
  if (!id) return;
  const sessions = getAllSessions();
  if (sessions[id]) {
    sessions[id].logoutTime = new Date().toISOString();
    sessions[id].actions.push({ time: new Date().toISOString(), action: "Logout" });
    saveSessions(sessions);
  }
  localStorage.removeItem(CURRENT_SESSION_KEY);
}

export function logAction(action: string, detail?: string) {
  const id = localStorage.getItem(CURRENT_SESSION_KEY);
  if (!id) return;
  const sessions = getAllSessions();
  if (sessions[id]) {
    sessions[id].actions.push({ time: new Date().toISOString(), action, detail });
    saveSessions(sessions);
  }
}

export function getCurrentSession(): (SessionEntry & { id: string }) | null {
  const id = localStorage.getItem(CURRENT_SESSION_KEY);
  if (!id) return null;
  const sessions = getAllSessions();
  if (!sessions[id]) return null;
  return { ...sessions[id], id };
}

export function getSessionHistory(): (SessionEntry & { id: string })[] {
  const sessions = getAllSessions();
  return Object.entries(sessions)
    .map(([id, entry]) => ({ ...entry, id }))
    .sort((a, b) => new Date(b.loginTime).getTime() - new Date(a.loginTime).getTime());
}

export function getUniqueOperators(): { name: string; sessions: number; lastSeen: string }[] {
  const sessions = getAllSessions();
  const map = new Map<string, { count: number; lastSeen: string }>();
  for (const s of Object.values(sessions)) {
    const existing = map.get(s.operator);
    const time = s.logoutTime || s.loginTime;
    if (!existing || new Date(time) > new Date(existing.lastSeen)) {
      map.set(s.operator, { count: (existing?.count || 0) + 1, lastSeen: time });
    } else {
      map.set(s.operator, { ...existing, count: existing.count + 1 });
    }
  }
  return Array.from(map.entries())
    .map(([name, data]) => ({ name, sessions: data.count, lastSeen: data.lastSeen }))
    .sort((a, b) => new Date(b.lastSeen).getTime() - new Date(a.lastSeen).getTime());
}

export function clearAllSessions() {
  localStorage.removeItem(SESSION_KEY);
  localStorage.removeItem(CURRENT_SESSION_KEY);
}

export function formatRelativeTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffSec < 60) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}
