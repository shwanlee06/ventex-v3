// ============================================================================
// Shared data for ATLAS mobile app — mirrors web app data.ts
// ============================================================================

export interface Venture {
  id: string;
  name: string;
  theme: string;
  stage: string;
  status: string;
  location: string;
  currentStatus?: string;
  description?: string;
}

export interface SPV {
  id: string;
  name: string;
  theme: string;
  stage: string;
  priority: string;
  currentStatus?: string;
  nextStep?: string;
}

export interface Task {
  id: string;
  title: string;
  status: string;
  dueDate: string;
  priority: string;
  assignees: string[];
  ventureLink?: string;
}

export interface TeamMember {
  id: string;
  name: string;
  role: string;
  initials: string;
}

export interface Distribution {
  id: string;
  name: string;
  fund: string;
  amount: number;
  status: string;
  type: string;
  date: string;
}

export interface ActivityLog {
  id: string;
  action: string;
  detail: string;
  theme: string;
  timestamp: string;
}

// ── Ventures ──────────────────────────────────────────────────────────────
export const VENTURES: Venture[] = [
  { id: "v1", name: "Nammos – Barcelona", theme: "Real Estate", stage: "Active ventures", status: "In progress", location: "Barcelona, Spain", currentStatus: "Site acquisition in progress" },
  { id: "v2", name: "Nammos – Watson Island", theme: "Real Estate", stage: "Active ventures", status: "In progress", location: "Miami, FL", currentStatus: "Draft the deck" },
  { id: "v3", name: "Nammos – Lagonissi", theme: "Real Estate", stage: "In Validation", status: "In progress", location: "Athens, Greece", currentStatus: "Due diligence phase" },
  { id: "v4", name: "Zarka City", theme: "Real Estate", stage: "Active ventures", status: "In progress", location: "Zarqa, Jordan", currentStatus: "Master plan review" },
  { id: "v5", name: "Royalton Tower – Dubai", theme: "Real Estate", stage: "Active ventures", status: "In progress", location: "Dubai, UAE", currentStatus: "Construction phase 2" },
  { id: "v6", name: "Royalton Tower – Riyadh", theme: "Real Estate", stage: "In Validation", status: "On-Hold", location: "Riyadh, KSA", currentStatus: "Awaiting regulatory approval" },
  { id: "v7", name: "Yacht Venture Alpha", theme: "Yacht", stage: "Active ventures", status: "In progress", location: "Monaco", currentStatus: "Vessel commissioning" },
  { id: "v8", name: "Yacht Venture Beta", theme: "Yacht", stage: "In Validation", status: "On-Hold", location: "Dubai, UAE", currentStatus: "Partner negotiations" },
  { id: "v9", name: "F&B Concept – NYC", theme: "F&B", stage: "Active ventures", status: "In progress", location: "New York, NY", currentStatus: "Menu development" },
  { id: "v10", name: "F&B Concept – London", theme: "F&B", stage: "In Validation", status: "In progress", location: "London, UK", currentStatus: "Location scouting" },
  { id: "v11", name: "Entertainment Hub – LA", theme: "Entertainment", stage: "Active ventures", status: "In progress", location: "Los Angeles, CA", currentStatus: "Talent partnerships" },
  { id: "v12", name: "Entertainment Hub – Dubai", theme: "Entertainment", stage: "In Validation", status: "In progress", location: "Dubai, UAE", currentStatus: "Concept design" },
  { id: "v13", name: "Venezuela Mining Rights", theme: "Oil & Gas", stage: "Active ventures", status: "In progress", location: "Caracas, Venezuela", currentStatus: "Government liaison" },
  { id: "v14", name: "Nigeria Oil Exploration", theme: "Oil & Gas", stage: "In Validation", status: "On-Hold", location: "Lagos, Nigeria", currentStatus: "Environmental assessment" },
  { id: "v15", name: "Presentation Master Deck", theme: "Others", stage: "Active ventures", status: "In progress", location: "Global", currentStatus: "Design iteration" },
  { id: "v16", name: "Royalton Brand Identity", theme: "Others", stage: "Active ventures", status: "In progress", location: "Global", currentStatus: "Brand guidelines finalization" },
  { id: "v17", name: "Nammos – Mykonos Expansion", theme: "Real Estate", stage: "Active ventures", status: "In progress", location: "Mykonos, Greece", currentStatus: "Permit applications" },
  { id: "v18", name: "F&B Concept – Dubai", theme: "F&B", stage: "Active ventures", status: "In progress", location: "Dubai, UAE", currentStatus: "Interior design phase" },
  { id: "v19", name: "Yacht Charter Operations", theme: "Yacht", stage: "Active ventures", status: "In progress", location: "Mediterranean", currentStatus: "Fleet expansion planning" },
  { id: "v20", name: "Entertainment IP Licensing", theme: "Entertainment", stage: "In Validation", status: "In progress", location: "Global", currentStatus: "IP portfolio review" },
];

// ── SPVs ──────────────────────────────────────────────────────────────────
export const SPVS: SPV[] = [
  { id: "s1", name: "Nammos Barcelona SPV", theme: "Real Estate", stage: "Active deal", priority: "High", currentStatus: "Final documentation", nextStep: "Board approval" },
  { id: "s2", name: "Watson Island Holdings", theme: "Real Estate", stage: "Active deal", priority: "High", currentStatus: "Investor commitments at 80%", nextStep: "Close round" },
  { id: "s3", name: "Zarka Development Corp", theme: "Real Estate", stage: "In negotiation", priority: "Medium", currentStatus: "Term sheet review", nextStep: "Legal review" },
  { id: "s4", name: "Dubai Tower Fund I", theme: "Real Estate", stage: "Active deal", priority: "High", currentStatus: "Construction financing", nextStep: "Drawdown schedule" },
  { id: "s5", name: "Yacht Alpha LLC", theme: "Yacht", stage: "In negotiation", priority: "Medium", currentStatus: "Charter agreement drafting" },
  { id: "s6", name: "NYC F&B Ventures", theme: "F&B", stage: "Active deal", priority: "Medium", currentStatus: "Lease signed", nextStep: "Buildout" },
  { id: "s7", name: "LA Entertainment SPV", theme: "Entertainment", stage: "In negotiation", priority: "Low", currentStatus: "Partner alignment" },
  { id: "s8", name: "Venezuela Resources Ltd", theme: "Oil & Gas", stage: "Active deal", priority: "High", currentStatus: "Mining license secured", nextStep: "Operations setup" },
  { id: "s9", name: "Mykonos Expansion Fund", theme: "Real Estate", stage: "In negotiation", priority: "Medium", currentStatus: "Feasibility study" },
  { id: "s10", name: "Mediterranean Charter Co", theme: "Yacht", stage: "Active deal", priority: "Low", currentStatus: "Fleet procurement" },
];

// ── Tasks ──────────────────────────────────────────────────────────────────
export const TASKS: Task[] = [
  { id: "t1", title: "Draft the deck for Watson Island", status: "open", dueDate: "2025-03-20", priority: "High", assignees: ["Anton Maghami"], ventureLink: "Nammos – Watson Island" },
  { id: "t2", title: "Zarka City master plan review", status: "open", dueDate: "2025-03-18", priority: "High", assignees: ["Jimmy Frangi"], ventureLink: "Zarka City" },
  { id: "t3", title: "Presentation Master Deck design", status: "open", dueDate: "2025-03-25", priority: "Medium", assignees: ["Karim Baz"], ventureLink: "Presentation Master Deck" },
  { id: "t4", title: "Lagonissi due diligence report", status: "open", dueDate: "2025-03-15", priority: "High", assignees: ["Anton Maghami"], ventureLink: "Nammos – Lagonissi" },
  { id: "t5", title: "Schedule meeting with Dubai investors", status: "open", dueDate: "2025-03-22", priority: "Medium", assignees: ["Jimmy Frangi"], ventureLink: "Royalton Tower – Dubai" },
  { id: "t6", title: "Venezuela mining operations plan", status: "complete", dueDate: "2025-03-10", priority: "High", assignees: ["Anton Maghami"], ventureLink: "Venezuela Mining Rights" },
];

// ── Team ──────────────────────────────────────────────────────────────────
export const TEAM: TeamMember[] = [
  { id: "tm1", name: "Jimmy Frangi", role: "Founder & CEO", initials: "JF" },
  { id: "tm2", name: "Anton Maghami", role: "Managing Partner", initials: "AM" },
  { id: "tm3", name: "Karim Baz", role: "Creative Director", initials: "KB" },
  { id: "tm4", name: "Nadia El-Amin", role: "CFO", initials: "NE" },
  { id: "tm5", name: "Omar Haddad", role: "Legal Counsel", initials: "OH" },
  { id: "tm6", name: "Layla Mansour", role: "VP Operations", initials: "LM" },
  { id: "tm7", name: "Rami Khoury", role: "Investment Analyst", initials: "RK" },
  { id: "tm8", name: "Sara Nassar", role: "Marketing Director", initials: "SN" },
  { id: "tm9", name: "Fadi Rizk", role: "Technical Lead", initials: "FR" },
  { id: "tm10", name: "Dina Aoun", role: "Executive Assistant", initials: "DA" },
];

// ── Distributions ─────────────────────────────────────────────────────────
export const DISTRIBUTIONS: Distribution[] = [
  { id: "d1", name: "Q4 2024 Distribution", fund: "Nammos Barcelona SPV", amount: 2500000, status: "Paid", type: "Quarterly", date: "2024-12-15" },
  { id: "d2", name: "Watson Island Interim", fund: "Watson Island Holdings", amount: 1800000, status: "Paid", type: "Interim", date: "2025-01-20" },
  { id: "d3", name: "Dubai Tower Draw #3", fund: "Dubai Tower Fund I", amount: 5000000, status: "Pending", type: "Capital Call", date: "2025-03-01" },
  { id: "d4", name: "Venezuela Mining Q1", fund: "Venezuela Resources Ltd", amount: 750000, status: "Paid", type: "Quarterly", date: "2025-02-28" },
  { id: "d5", name: "NYC F&B Buildout", fund: "NYC F&B Ventures", amount: 350000, status: "Cancelled", type: "One-time", date: "2025-02-15" },
];

// ── Activity Logs ─────────────────────────────────────────────────────────
export const ACTIVITY_LOGS: ActivityLog[] = [
  { id: "a1", action: "Status Update", detail: "Nammos Barcelona moved to Active Deal", theme: "Real Estate", timestamp: "2025-03-14T10:30:00Z" },
  { id: "a2", action: "Task Completed", detail: "Venezuela mining operations plan finalized", theme: "Oil & Gas", timestamp: "2025-03-14T09:15:00Z" },
  { id: "a3", action: "New SPV Created", detail: "Mediterranean Charter Co established", theme: "Yacht", timestamp: "2025-03-13T16:45:00Z" },
  { id: "a4", action: "Distribution Paid", detail: "$1.8M Watson Island interim distribution", theme: "Real Estate", timestamp: "2025-03-13T14:00:00Z" },
  { id: "a5", action: "Team Assignment", detail: "Karim Baz assigned to Presentation Master Deck", theme: "Others", timestamp: "2025-03-13T11:30:00Z" },
];

// ── Metrics ───────────────────────────────────────────────────────────────
export const METRICS = {
  totalVentures: 20,
  activeVentures: 14,
  totalSPVs: 10,
  activeSPVs: 6,
  openTasks: 5,
  totalDistributions: 10400000,
  paidDistributions: 5050000,
  totalTeam: 10,
};

// ── Helpers ───────────────────────────────────────────────────────────────
export function formatCurrency(amount: number): string {
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `$${(amount / 1_000).toFixed(0)}K`;
  return `$${amount}`;
}

export function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function isOverdue(dateStr: string): boolean {
  return new Date(dateStr) < new Date() && true;
}

export function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export const THEME_COLORS: Record<string, string> = {
  "Real Estate": "#3b82f6",
  "Yacht": "#06b6d4",
  "F&B": "#f59e0b",
  "Entertainment": "#a855f7",
  "Oil & Gas": "#ef4444",
  "Others": "#6b7280",
};
