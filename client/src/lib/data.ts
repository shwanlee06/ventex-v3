// VENTEX Data Types, Config Constants & Utility Functions
// All actual data comes from the database via tRPC queries

export type TaskStatus = "open" | "complete" | "overdue";
export type VentureTheme = "Real Estate" | "F&B" | "Yacht" | "Entertainment" | "Others" | "Oil & Gas";
export type VentureStage = "In Validation" | "Active ventures" | "In Fundraising" | "On Hold";
export type SPVStage = "Active deal" | "In negotiation" | "Closed deal" | "Dropped deal";
export type MemberType = "Internal" | "External Partner" | "Advisor";
export type DistributionStatus = "Paid" | "Scheduled" | "Cancelled";

export interface Task {
  id: string;
  title: string;
  status: TaskStatus;
  dueDate: string;
  priority: string;
  assignees: string[];
  ventureLink?: string;
}

export interface Venture {
  id: string;
  name: string;
  theme: VentureTheme;
  stage: VentureStage;
  status: string;
  location: string;
  currentStatus?: string;
  nextStep?: string;
  nextMilestone?: string;
  priority?: string;
  contactIds?: string[];
}

export interface SPV {
  id: string;
  name: string;
  stage: SPVStage;
  theme: string;
  priority: string;
  currentStatus?: string;
  nextStep?: string;
}

export interface TeamMember {
  id: string;
  name: string;
  role: string;
  function: string;
  status: string;
  type: MemberType;
  notes?: string;
  telegram?: string;
  whatsapp?: string;
}

export interface Contact {
  id: string;
  name: string;
  role?: string;
  status: string;
  industries: string[];
  geography?: string;
}

export interface Distribution {
  id: string;
  name: string;
  date: string;
  fund: string;
  amount: number;
  currency: string;
  type: string;
  status: DistributionStatus;
  method: string;
  notes?: string;
  ageDays: number;
  isPaid: boolean;
}

export interface Meeting {
  id: string;
  name: string;
  agenda: string;
  summary: string;
  attendees: string[];
  ventexAttendees: string[];
}

export interface Organization {
  id: string;
  name: string;
  type: string;
  geography: string;
  website: string;
  description: string;
  sector: string;
}

export interface LPInvestor {
  id: string;
  name: string;
  type: string;
  status: string;
  linkedVentures: string[];
}

// ─── Visual Config Constants ───────────────────────────────────────────────────

export const THEME_COLORS: Record<string, { label: string; color: string; bg: string; dot: string; text: string }> = {
  "Real Estate": { label: "Real Estate", color: "#5B8DBE", bg: "bg-[#5B8DBE]/10", dot: "bg-[#5B8DBE]", text: "text-[#5B8DBE]" },
  "Yacht": { label: "Yacht", color: "#4ABFB0", bg: "bg-[#4ABFB0]/10", dot: "bg-[#4ABFB0]", text: "text-[#4ABFB0]" },
  "F&B": { label: "F&B", color: "#BF4A7F", bg: "bg-[#BF4A7F]/10", dot: "bg-[#BF4A7F]", text: "text-[#BF4A7F]" },
  "Entertainment": { label: "Entertainment", color: "#BF8A4A", bg: "bg-[#BF8A4A]/10", dot: "bg-[#BF8A4A]", text: "text-[#BF8A4A]" },
  "Oil & Gas": { label: "Oil & Gas", color: "#BFA84A", bg: "bg-[#BFA84A]/10", dot: "bg-[#BFA84A]", text: "text-[#BFA84A]" },
  "Others": { label: "Others", color: "#8B8FA3", bg: "bg-[#8B8FA3]/10", dot: "bg-[#8B8FA3]", text: "text-[#8B8FA3]" },
};

export const STATUS_CONFIG: Record<TaskStatus, { label: string; color: string; bg: string; dot: string }> = {
  open: { label: "Open", color: "text-amber-400", bg: "bg-amber-500/10 text-amber-400 border-amber-500/20", dot: "bg-amber-400" },
  complete: { label: "Complete", color: "text-emerald-400", bg: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20", dot: "bg-emerald-400" },
  overdue: { label: "Overdue", color: "text-red-400", bg: "bg-red-500/10 text-red-400 border-red-500/20", dot: "bg-red-400" },
};

export const SPV_STAGE_CONFIG: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  "Active deal": { label: "Active", color: "text-emerald-400", bg: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20", dot: "bg-emerald-400" },
  "In negotiation": { label: "Negotiating", color: "text-blue-400", bg: "bg-blue-500/10 text-blue-400 border-blue-500/20", dot: "bg-blue-400" },
  "Closed deal": { label: "Closed", color: "text-muted-foreground", bg: "bg-secondary text-muted-foreground border-border", dot: "bg-muted-foreground" },
  "Dropped deal": { label: "Dropped", color: "text-red-400", bg: "bg-red-500/10 text-red-400 border-red-500/20", dot: "bg-red-400" },
  "Pipeline": { label: "Pipeline", color: "text-zinc-400", bg: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20", dot: "bg-zinc-400" },
};

export const DIST_STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  "Paid": { label: "Paid", color: "text-emerald-400", bg: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20", dot: "bg-emerald-400" },
  "Scheduled": { label: "Scheduled", color: "text-blue-400", bg: "bg-blue-500/10 text-blue-400 border-blue-500/20", dot: "bg-blue-400" },
  "Cancelled": { label: "Cancelled", color: "text-red-400", bg: "bg-red-500/10 text-red-400 border-red-500/20", dot: "bg-red-400" },
};

// ─── Agent System Prompt ───────────────────────────────────────────────────────

export const AGENT_CONTEXT = `You are the VENTEX Venture Ops AI Assistant for the VENTEX System. You help manage operations across the venture holding portfolio.

Key context:
- VENTEX manages multiple ventures across sectors: Real Estate, F&B, Yacht, Entertainment, Oil & Gas
- Each venture has stages: In Validation, Active ventures, In Fundraising, On Hold
- SPVs (Special Purpose Vehicles) track individual deals
- The system tracks tasks, team members, contacts, distributions, and meetings
- You have access to the full portfolio data and can help with analysis, recommendations, and task management

You are professional, concise, and action-oriented. Always provide specific, actionable recommendations.`;

// ─── Utility Functions ─────────────────────────────────────────────────────────

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

/// Currency decimal config for formatCurrency
const CURRENCY_DECIMALS: Record<string, number> = {
  JPY: 0, KRW: 0, VND: 0, BHD: 3, KWD: 3, OMR: 3,
};

export function formatCurrency(amount: number, currency: string = "USD"): string {
  const decimals = CURRENCY_DECIMALS[currency] ?? 2;
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: decimals,
      maximumFractionDigits: Math.max(decimals, 2),
    }).format(amount);
  } catch {
    return `${currency} ${amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}`;
  }
}

export function getThemeColor(theme: string): typeof THEME_COLORS[string] {
  return THEME_COLORS[theme] || THEME_COLORS["Others"];
}

export function getTaskStatusFromDate(task: Task): TaskStatus {
  if (task.status === "complete") return "complete";
  const due = new Date(task.dueDate);
  const now = new Date();
  if (due < now) return "overdue";
  return "open";
}
