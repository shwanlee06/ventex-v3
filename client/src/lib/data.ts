// ============================================================================
// Royalton System — Seed Data & Types
// Swiss Instrument design: DM Sans + DM Mono, near-black surfaces, gold accent
// ============================================================================

export type TaskStatus = "automated" | "pending" | "overdue" | "done";
export type OnboardingStep = "discovery" | "tenant-provisioning" | "agent-config" | "uat" | "go-live";
export type VerticalKey = "real-estate" | "yachts" | "hospitality" | "fnb" | "energy";

export interface Task {
  id: string;
  title: string;
  vertical: VerticalKey;
  status: TaskStatus;
  assignee: string;
  dueDate: string;
}

export interface ComplianceItem {
  id: string;
  vertical: VerticalKey;
  item: string;
  dueDate: string;
  status: TaskStatus;
}

export interface AgentLogEntry {
  id: string;
  action: string;
  detail: string;
  timestamp: string;
  vertical: VerticalKey;
}

export interface Client {
  id: string;
  name: string;
  status: "live" | "onboarding";
  currentStep: number;
  totalSteps: number;
  tasksPerWeek: number;
  hoursSavedPerMonth: number;
  avatarUrl: string;
}

export interface Vertical {
  key: VerticalKey;
  label: string;
  color: string;
  colorClass: string;
  bgClass: string;
  tasks: Task[];
  tasksPerWeek: number;
  hoursSavedPerMonth: number;
}

// Vertical color mapping
export const VERTICAL_COLORS: Record<VerticalKey, { label: string; color: string; bg: string; dot: string; text: string }> = {
  "real-estate": { label: "Real Estate", color: "#5B8DBE", bg: "bg-[#5B8DBE]/10", dot: "bg-[#5B8DBE]", text: "text-[#5B8DBE]" },
  "yachts": { label: "Yachts", color: "#4ABFB0", bg: "bg-[#4ABFB0]/10", dot: "bg-[#4ABFB0]", text: "text-[#4ABFB0]" },
  "hospitality": { label: "Hospitality", color: "#BF8A4A", bg: "bg-[#BF8A4A]/10", dot: "bg-[#BF8A4A]", text: "text-[#BF8A4A]" },
  "fnb": { label: "F&B", color: "#BF4A7F", bg: "bg-[#BF4A7F]/10", dot: "bg-[#BF4A7F]", text: "text-[#BF4A7F]" },
  "energy": { label: "Energy", color: "#BFA84A", bg: "bg-[#BFA84A]/10", dot: "bg-[#BFA84A]", text: "text-[#BFA84A]" },
};

export const STATUS_CONFIG: Record<TaskStatus, { label: string; color: string; bg: string; dot: string }> = {
  automated: { label: "Automated", color: "text-blue-400", bg: "bg-blue-500/10 text-blue-400 border-blue-500/20", dot: "bg-blue-400" },
  done: { label: "Done", color: "text-emerald-400", bg: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20", dot: "bg-emerald-400" },
  pending: { label: "Pending", color: "text-amber-400", bg: "bg-amber-500/10 text-amber-400 border-amber-500/20", dot: "bg-amber-400" },
  overdue: { label: "Overdue", color: "text-red-400", bg: "bg-red-500/10 text-red-400 border-red-500/20", dot: "bg-red-400" },
};

export const ONBOARDING_STEPS: { key: OnboardingStep; label: string }[] = [
  { key: "discovery", label: "Discovery" },
  { key: "tenant-provisioning", label: "Tenant Provisioning" },
  { key: "agent-config", label: "Agent Config" },
  { key: "uat", label: "UAT" },
  { key: "go-live", label: "Go-live" },
];

// Dummy data
export const CLIENTS: Client[] = [
  {
    id: "c1",
    name: "Meridian Holdings",
    status: "live",
    currentStep: 5,
    totalSteps: 5,
    tasksPerWeek: 142,
    hoursSavedPerMonth: 38,
    avatarUrl: "https://d2xsxph8kpxj0f.cloudfront.net/310519663421947072/TYkqBQavc4Sd5YvF3sSZqT/avatar-meridian-ZzyVxgrDZxQ7VL8iUxkcZQ.webp",
  },
  {
    id: "c2",
    name: "Solaris Group",
    status: "onboarding",
    currentStep: 3,
    totalSteps: 5,
    tasksPerWeek: 105,
    hoursSavedPerMonth: 23,
    avatarUrl: "https://d2xsxph8kpxj0f.cloudfront.net/310519663421947072/TYkqBQavc4Sd5YvF3sSZqT/avatar-solaris-nt24f5zmaRpKTKB6xdg8bn.webp",
  },
];

export const TASKS: Task[] = [
  // Real Estate
  { id: "t1", title: "Lease renewal — 42 Mayfair Crescent", vertical: "real-estate", status: "pending", assignee: "Agent", dueDate: "2026-03-18" },
  { id: "t2", title: "Vendor invoice reconciliation Q1", vertical: "real-estate", status: "automated", assignee: "Agent", dueDate: "2026-03-15" },
  { id: "t3", title: "Lease renewal — 8 Belgravia Sq", vertical: "real-estate", status: "done", assignee: "Agent", dueDate: "2026-03-10" },
  // Yachts
  { id: "t4", title: "Crew certification — M/Y Solaris", vertical: "yachts", status: "overdue", assignee: "Agent", dueDate: "2026-03-06" },
  { id: "t5", title: "Insurance renewal — M/Y Solaris", vertical: "yachts", status: "automated", assignee: "Agent", dueDate: "2026-04-01" },
  { id: "t6", title: "Dock reservation — Monaco", vertical: "yachts", status: "done", assignee: "Agent", dueDate: "2026-03-12" },
  // Hospitality
  { id: "t7", title: "Health & safety inspection prep", vertical: "hospitality", status: "pending", assignee: "Agent", dueDate: "2026-04-03" },
  { id: "t8", title: "Staff rota — week 12", vertical: "hospitality", status: "pending", assignee: "Agent", dueDate: "2026-03-17" },
  { id: "t9", title: "Guest feedback analysis — Feb", vertical: "hospitality", status: "automated", assignee: "Agent", dueDate: "2026-03-08" },
  // F&B
  { id: "t10", title: "Liquor license renewal", vertical: "fnb", status: "pending", assignee: "Agent", dueDate: "2026-03-31" },
  { id: "t11", title: "Agent deployment — POS integration", vertical: "fnb", status: "automated", assignee: "Agent", dueDate: "2026-03-20" },
  { id: "t12", title: "Menu cost analysis — Spring", vertical: "fnb", status: "done", assignee: "Agent", dueDate: "2026-03-09" },
  // Energy
  { id: "t13", title: "Solar array maintenance schedule", vertical: "energy", status: "automated", assignee: "Agent", dueDate: "2026-03-25" },
  { id: "t14", title: "Grid compliance audit", vertical: "energy", status: "pending", assignee: "Agent", dueDate: "2026-04-10" },
  { id: "t15", title: "Quarterly output report", vertical: "energy", status: "done", assignee: "Agent", dueDate: "2026-03-11" },
];

export const COMPLIANCE_ITEMS: ComplianceItem[] = [
  { id: "ci1", vertical: "yachts", item: "Crew certification — M/Y Solaris", dueDate: "2026-03-06", status: "overdue" },
  { id: "ci2", vertical: "fnb", item: "Liquor license renewal", dueDate: "2026-03-31", status: "pending" },
  { id: "ci3", vertical: "hospitality", item: "H&S inspection", dueDate: "2026-04-03", status: "pending" },
  { id: "ci4", vertical: "real-estate", item: "Fire safety certificate — 42 Mayfair", dueDate: "2026-04-15", status: "automated" },
  { id: "ci5", vertical: "energy", item: "Grid compliance audit", dueDate: "2026-04-10", status: "pending" },
  { id: "ci6", vertical: "yachts", item: "Flag state inspection — M/Y Solaris", dueDate: "2026-04-20", status: "automated" },
  { id: "ci7", vertical: "hospitality", item: "Food hygiene rating renewal", dueDate: "2026-05-01", status: "automated" },
  { id: "ci8", vertical: "real-estate", item: "Lease compliance check — Belgravia", dueDate: "2026-03-28", status: "done" },
];

export const AGENT_LOGS: AgentLogEntry[] = [
  { id: "al1", action: "Reconciled", detail: "12 vendor invoices for Real Estate Q1", timestamp: "2026-03-14T14:32:00Z", vertical: "real-estate" },
  { id: "al2", action: "Flagged", detail: "Crew cert overdue 8 days on M/Y Solaris", timestamp: "2026-03-14T13:15:00Z", vertical: "yachts" },
  { id: "al3", action: "Scheduled", detail: "H&S inspection prep tasks for hospitality", timestamp: "2026-03-14T11:48:00Z", vertical: "hospitality" },
  { id: "al4", action: "Deployed", detail: "POS integration agent for F&B vertical", timestamp: "2026-03-14T10:22:00Z", vertical: "fnb" },
  { id: "al5", action: "Generated", detail: "Quarterly solar output report for Energy", timestamp: "2026-03-14T09:05:00Z", vertical: "energy" },
];

export const VERTICALS: Vertical[] = [
  {
    key: "real-estate",
    label: "Real Estate",
    color: "#5B8DBE",
    colorClass: "text-[#5B8DBE]",
    bgClass: "bg-[#5B8DBE]/10",
    tasks: TASKS.filter(t => t.vertical === "real-estate"),
    tasksPerWeek: 48,
    hoursSavedPerMonth: 14,
  },
  {
    key: "yachts",
    label: "Yachts",
    color: "#4ABFB0",
    colorClass: "text-[#4ABFB0]",
    bgClass: "bg-[#4ABFB0]/10",
    tasks: TASKS.filter(t => t.vertical === "yachts"),
    tasksPerWeek: 35,
    hoursSavedPerMonth: 11,
  },
  {
    key: "hospitality",
    label: "Hospitality",
    color: "#BF8A4A",
    colorClass: "text-[#BF8A4A]",
    bgClass: "bg-[#BF8A4A]/10",
    tasks: TASKS.filter(t => t.vertical === "hospitality"),
    tasksPerWeek: 62,
    hoursSavedPerMonth: 16,
  },
  {
    key: "fnb",
    label: "F&B",
    color: "#BF4A7F",
    colorClass: "text-[#BF4A7F]",
    bgClass: "bg-[#BF4A7F]/10",
    tasks: TASKS.filter(t => t.vertical === "fnb"),
    tasksPerWeek: 54,
    hoursSavedPerMonth: 12,
  },
  {
    key: "energy",
    label: "Energy",
    color: "#BFA84A",
    colorClass: "text-[#BFA84A]",
    bgClass: "bg-[#BFA84A]/10",
    tasks: TASKS.filter(t => t.vertical === "energy"),
    tasksPerWeek: 48,
    hoursSavedPerMonth: 8,
  },
];

// Top-level metrics
export const METRICS = {
  tasksAutomatedThisWeek: 247,
  hoursReclaimed: 61,
  activeClients: 2,
  complianceAlerts: 3,
};

// Agent system prompt context
export const AGENT_CONTEXT = `You are the ATLAS Venture Ops AI Assistant. You help manage operations across 5 venture verticals for UHNWI/HNWI holding companies.

Current Status:
- 2 active beta clients, 247 tasks automated this week, 61 hours reclaimed
- 3 compliance alerts requiring attention

Compliance Alerts:
1. Crew certification overdue 8 days on M/Y Solaris (Yachts)
2. F&B liquor license renewal due Mar 31
3. Hospitality H&S inspection scheduled Apr 3

Vertical Status:
- Real Estate: 3 lease renewals pending, vendor invoices reconciled
- Yachts: Crew certification overdue 8 days on M/Y Solaris
- Hospitality: Health inspection scheduled, staff rota pending
- F&B: Agent deployment in progress (POS integration)
- Energy: Solar array maintenance scheduled, grid compliance audit pending

You are professional, concise, and action-oriented. Always provide specific, actionable recommendations.`;

export function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}
