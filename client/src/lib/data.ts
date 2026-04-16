// VENTEX System — Real Airtable Data
// Swiss Instrument design: DM Sans + DM Mono, near-black surfaces, gold accent
// Source: Venture Holding Tracker (appw7nayCfrZBRDg6)


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
};

export const DIST_STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  "Paid": { label: "Paid", color: "text-emerald-400", bg: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20", dot: "bg-emerald-400" },
  "Scheduled": { label: "Scheduled", color: "text-blue-400", bg: "bg-blue-500/10 text-blue-400 border-blue-500/20", dot: "bg-blue-400" },
  "Cancelled": { label: "Cancelled", color: "text-red-400", bg: "bg-red-500/10 text-red-400 border-red-500/20", dot: "bg-red-400" },
};


// People map for resolving assignees
const PEOPLE_MAP: Record<string, string> = {
  "rec0sYZnsOcya6vUI": "Igor",
  "rec1MSjH1uWVFqRM9": "Jon Eichner",
  "rec52Aei2efKPEuN0": "Anton Maghami",
  "rec9HC4unUf3rlUz1": "Jimmy Frangi",
  "recFLbPdtZt2OHPFw": "Sohail",
  "recODuqZQixtieT95": "Leonidas Kyrris",
  "recZoxAfOxevi65jz": "Maher Abou Chakra",
  "recjvWiLvE5jky6dG": "Carl Frangi",
  "recmUu5W2yRxeyNj5": "Angie Samadi",
  "recpMPSXi5lOhkANT": "Ruwaida",
};

export const TASKS: Task[] = [
  {
    id: "rec6UJmmuR2rsk4J1",
    title: "Nammos Watson Island",
    status: "open",
    dueDate: "2026-02-25",
    priority: "Medium",
    assignees: ["Anton Maghami"],
    ventureLink: "Nammos - Watson Island",
  },
  {
    id: "recszfvvxgrTAxBY2",
    title: "Call Prince and discuss oil and gas",
    status: "complete",
    dueDate: "2026-02-24",
    priority: "Medium",
    assignees: ["Carl Frangi"],
  },
  {
    id: "recCLbzR2muTXnGS4",
    title: "Zarka City — Workshop schedule (vision statement/storytelling)",
    status: "open",
    dueDate: "2026-03-01",
    priority: "Low",
    assignees: ["Anton Maghami"],
    ventureLink: "Zarka City",
  },
  {
    id: "recTCuYHVPfyTD9Ke",
    title: "Presentation Master Deck Real Estate — Miami, Bahamas",
    status: "open",
    dueDate: "2026-03-05",
    priority: "Low",
    assignees: ["Anton Maghami", "Igor"],
  },
  {
    id: "receN1p9e3AkUy33o",
    title: "Lagonissi Nammos — Internal deal structure meeting",
    status: "open",
    dueDate: "2026-02-26",
    priority: "High",
    assignees: ["Anton Maghami", "Jimmy Frangi"],
    ventureLink: "Nammos - Lagonissi",
  },
  {
    id: "recZbejW7Gv9AmQZu",
    title: "Schedule meeting with Anton and Jimmy to discuss ventures",
    status: "open",
    dueDate: "2026-02-24",
    priority: "Medium",
    assignees: ["Anton Maghami", "Jimmy Frangi"],
  },
  {
    id: "rec_yacht",
    title: "JV Yacht Nammos — Internal deal structure meeting",
    status: "open",
    dueDate: "2026-02-26",
    priority: "Medium",
    assignees: ["Anton Maghami"],
    ventureLink: "JV Yacht - Nammos",
  },
  {
    id: "rec_nadine",
    title: "Add ventures and deals discussed yesterday with Nadine",
    status: "complete",
    dueDate: "2026-02-24",
    priority: "Medium",
    assignees: [],
  },
  {
    id: "rec_najib",
    title: "Call Najib",
    status: "complete",
    dueDate: "2026-02-26",
    priority: "Medium",
    assignees: [],
  },
];

export const VENTURES: Venture[] = [
  // Real Estate (7)
  { id: "recDQd3Euhh8f2zjE", name: "Nammos - Barcelona", theme: "Real Estate", stage: "In Validation", status: "In progress", location: "Spain", priority: "Medium" },
  { id: "recEnlRnvbzK5WTDW", name: "Nammos - Lagonissi", theme: "Real Estate", stage: "In Validation", status: "In progress", location: "Greece", priority: "High" },
  { id: "recGv6fMY6U0qawuU", name: "Muscat Bay", theme: "Real Estate", stage: "Active ventures", status: "In progress", location: "Oman" },
  { id: "recLPHfRcbEJFEYpP", name: "Chekka Land - Resort", theme: "Real Estate", stage: "Active ventures", status: "In progress", location: "Lebanon" },
  { id: "recNuXb3Gg2YKWJ6U", name: "Muscat Grand Hotel", theme: "Real Estate", stage: "Active ventures", status: "In progress", location: "Oman" },
  { id: "receY8DMb82SYrOOe", name: "Nammos - Watson Island", theme: "Real Estate", stage: "In Validation", status: "In progress", location: "USA", currentStatus: "Draft the deck", nextStep: "Draft the deck", nextMilestone: "2026-03-04" },
  { id: "rechKfDosHAlsgeQP", name: "Zarka City", theme: "Real Estate", stage: "In Validation", status: "In progress", location: "Oman", currentStatus: "Distribution and finalization of the working sheet and master plan", nextStep: "Validate revenue growth assumptions with market data", nextMilestone: "2026-02-22" },

  // F&B (3)
  { id: "rec5p1dwm5SowncHB", name: "Berbara - Lebanon", theme: "F&B", stage: "Active ventures", status: "On-Hold", location: "Lebanon" },
  { id: "recMUwCXnPzQOqiXp", name: "Nammos - Ibiza", theme: "F&B", stage: "In Validation", status: "In progress", location: "Spain" },
  { id: "recaTVtvEBZ0Ewbr5", name: "Nammos Lebanon", theme: "F&B", stage: "In Validation", status: "In progress", location: "Lebanon" },

  // Yacht (3)
  { id: "recFY55UsCgpgmnng", name: "Mar-a-Lago Yacht Club", theme: "Yacht", stage: "In Fundraising", status: "In progress", location: "USA" },
  { id: "recGIlkRxb7NhUxLz", name: "Bagatelle", theme: "Yacht", stage: "In Validation", status: "In progress", location: "France" },
  { id: "reckg6WcKxF2IRTF6", name: "JV Yacht - Nammos", theme: "Yacht", stage: "In Validation", status: "In progress", location: "Mediterranean", currentStatus: "Evaluating JV Yacht - Nammos partnership" },

  // Entertainment (3)
  { id: "recC7kyF7o9QOzUW2", name: "Berlin", theme: "Entertainment", stage: "Active ventures", status: "Completed", location: "Malaysia" },
  { id: "recOPwrJi1hnVCIq7", name: "KTL-Dubai Casino License", theme: "Entertainment", stage: "On Hold", status: "In progress", location: "UAE" },
  { id: "recy3wsUgdOTh6u7j", name: "Casino - Malaysia", theme: "Entertainment", stage: "Active ventures", status: "In progress", location: "Malaysia" },

  // Others (4)
  { id: "rec8cJyOaDtDrFVYY", name: "North Africa Development", theme: "Others", stage: "Active ventures", status: "In progress", location: "Oman" },
  { id: "recBbe9nhPjXZH6BV", name: "Oman Luxury Resort", theme: "Others", stage: "Active ventures", status: "In progress", location: "Oman" },
  { id: "recPJqBkpKXcBwLzS", name: "P430", theme: "Others", stage: "In Validation", status: "In progress", location: "Monaco" },
  { id: "recQmPJLlKhEJKfKq", name: "Gulf Logistics Hub", theme: "Others", stage: "Active ventures", status: "In progress", location: "UAE" },
];

export const SPVS: SPV[] = [
  { id: "rectbrWqAdepS7dC4", name: "Venezuela Mining Rights", stage: "Active deal", theme: "Oil & Gas", priority: "High", currentStatus: "Awaiting updated financials from founder.", nextStep: "Schedule IC prep call with team." },
  { id: "recxTZCzi6GGEr205", name: "Azzam - Yacht", stage: "Active deal", theme: "Yacht", priority: "Medium" },
  { id: "rec6CU1RdVpxnUyMx", name: "Crude Oil Deal", stage: "In negotiation", theme: "Oil & Gas", priority: "Medium" },
  { id: "recGkP0NHIeVTyorl", name: "Shipping Deal", stage: "Active deal", theme: "Others", priority: "Low" },
  { id: "recKfmvELhFEuhOXP", name: "Chakra Yacht - Brokerage", stage: "Active deal", theme: "Yacht", priority: "Low" },
  { id: "recTh2puenSEDUBq2", name: "Serenity Yacht - Brokerage", stage: "Active deal", theme: "Yacht", priority: "Low" },
  { id: "reck3hvO7JIURZA7M", name: "Ego Yacht", stage: "Active deal", theme: "Yacht", priority: "Low" },
  { id: "rec7R4RhbclkKvTOb", name: "Onara", stage: "Closed deal", theme: "Others", priority: "Medium" },
  { id: "recaWPjG9t5DW5EfO", name: "ReserveOne", stage: "Closed deal", theme: "Others", priority: "Medium" },
  { id: "recL2pxn3HahYBRdP", name: "Casino License", stage: "Dropped deal", theme: "Entertainment", priority: "Medium" },
];

export const TEAM: TeamMember[] = [
  { id: "rec9HC4unUf3rlUz1", name: "Jimmy Frangi", role: "Founder", function: "Finance & Capital", status: "Active", type: "Internal", notes: "Treasury, LP comms, capital deployment.", whatsapp: "+33680999999" },
  { id: "rec52Aei2efKPEuN0", name: "Anton Maghami", role: "Vice President", function: "Operations & Systems", status: "Active", type: "Internal", notes: "Owns automation stack, reporting, and governance processes.", telegram: "@antonmaghami", whatsapp: "+15715242787" },
  { id: "rec1MSjH1uWVFqRM9", name: "Jon Eichner", role: "COO", function: "Operations", status: "Active", type: "Internal" },
  { id: "recZoxAfOxevi65jz", name: "Maher Abou Chakra", role: "Accounting", function: "Finance / Accounting", status: "Active", type: "Internal", notes: "Entity bookkeeping, closing packages, compliance files." },
  { id: "recmUu5W2yRxeyNj5", name: "Angie Samadi", role: "HR", function: "People Ops / HR", status: "Active", type: "Internal", notes: "Hiring pipelines, onboarding, contracts." },
  { id: "recjvWiLvE5jky6dG", name: "Carl Frangi", role: "Member", function: "Investor Relations", status: "Advisor", type: "Advisor", notes: "Family office coordination, investor relations.", telegram: "@carlfranji" },
  { id: "recODuqZQixtieT95", name: "Leonidas Kyrris", role: "Legal (maritime focus)", function: "Legal", status: "Advisor", type: "Advisor", notes: "Maritime-focused counsel for yacht / port matters." },
  { id: "rec0sYZnsOcya6vUI", name: "Igor", role: "Deck Design", function: "Design", status: "Contributor", type: "External Partner", notes: "Creative support for pitch materials." },
  { id: "recFLbPdtZt2OHPFw", name: "Sohail", role: "Financial Modeling", function: "Financial Modeling", status: "Contributor", type: "External Partner", notes: "Builds out deal financial models ad hoc." },
  { id: "recpMPSXi5lOhkANT", name: "Ruwaida", role: "Yacht Design", function: "Design", status: "Contributor", type: "External Partner", notes: "Design support for yacht ventures." },
  { id: "recSHWNL33xK9mP01", name: "Shwan Lee", role: "Founder & CEO", function: "Strategy & Vision", status: "Active", type: "Internal", notes: "Founder of Aurovia. Leads product vision, GTM strategy, and key partnerships." },
  { id: "recNJB44yR7tQ2vW8", name: "Najib", role: "Advisor", function: "Legal & Compliance", status: "Active", type: "Advisor", notes: "Senior legal counsel specializing in cross-border venture structures and regulatory compliance." },
];

export const CONTACTS: Contact[] = [
  { id: "recUMWGqm7xOehSbv", name: "Benjamin", role: "Miami Real Estate Growth Leader", status: "Active", industries: ["Real Estate"] },
  { id: "recKasLElIchg6ydi", name: "Shawki Rassi", role: "Support on Nammos Watson venture", status: "Active", industries: ["Real Estate"], geography: "Lebanon" },
  { id: "recKCf3sMWBHTOLkG", name: "Mohamed", role: "Architect - Zarka", status: "Active", industries: ["Real Estate"], geography: "Oman" },
  { id: "recCokIMaCGM4NM8p", name: "Marwan", role: "Support - Zarka", status: "Active", industries: ["Real Estate"] },
  { id: "recabrBi2wP5p3JvG", name: "Guy", role: "Zarka City Consultant", status: "Active", industries: ["Real Estate"] },
  { id: "recOKkcPoYypyLCNC", name: "Saeed", role: "Mar-A-Lago", status: "Active", industries: ["Yacht"] },
  { id: "recBSBC44ZS4XENQg", name: "Doris", status: "Active", industries: ["F&B"] },
  { id: "recD9lTVZaCCxiKCh", name: "Moe", role: "Partner Lagonissi", status: "Active", industries: ["F&B"] },
  { id: "rec59YAgORfmFOg9U", name: "Nicola", role: "Oil & Gas", status: "Active", industries: ["Oil & Gas"] },
  { id: "recMoLtR5joaraBdr", name: "Victor", status: "Active", industries: ["Shipping"] },
];

export const DISTRIBUTIONS: Distribution[] = [
  { id: "reczfbACIbdw01OnB", name: "Q4 2025 Profit Share", date: "2026-01-14", fund: "VENTEX Venture Fund I", amount: 250000, currency: "USD", type: "Profit", status: "Paid", method: "Wire", notes: "Quarterly profit share for Q4 2025. Paid to LPs as scheduled.", ageDays: 60, isPaid: true },
  { id: "recjvCJ8Gf8lLuuZH", name: "2025 Return of Capital - SPV Alpha", date: "2026-01-28", fund: "VENTEX SPV Alpha", amount: 100000, currency: "USD", type: "Return of Capital", status: "Paid", method: "Wire", notes: "Return of capital to LPs after exit from SPV Alpha.", ageDays: 46, isPaid: true },
  { id: "recqNgcoApulVgiih", name: "2026 Scheduled Dividend - REIT Fund I", date: "2026-02-09", fund: "VENTEX Real Estate Fund II", amount: 40000, currency: "USD", type: "Dividend", status: "Scheduled", method: "Wire", notes: "Scheduled semi-annual dividend for REIT Fund I.", ageDays: 34, isPaid: false },
  { id: "recONJPIqJBxlTEBT", name: "Cancelled Profit Distribution - Growth Equity Fund II", date: "2026-02-14", fund: "VENTEX Growth Equity Fund II", amount: 50000, currency: "USD", type: "Profit", status: "Cancelled", method: "Wire", notes: "Cancelled due to compliance review.", ageDays: 29, isPaid: false },
];

export const MEETINGS: Meeting[] = [
  {
    id: "recDxPfQy4he6yNv1",
    name: "Zarka City",
    agenda: "The purpose of the meeting was to discuss the vision and storytelling of the project and an introduction of Marwan to the team.",
    summary: "Purpose: Vision Discussion\n\nMeeting Date: 2026-02-21\n\nKey updates:\n- Narrative Direction and Storytelling\n- The team agreed that the plan must evolve beyond a technical master plan into a narrative driven vision.\n- Anton has formed a focused working group consisting of Guy, Mohammed, Marwan, and Jimmy.\n\nNext steps:\n- Small group workshop to be scheduled this week to finalize vision statement/storytelling. Anton to coordinate day/time.",
    attendees: ["Guy", "Mohamed", "Marwan"],
    ventexAttendees: ["Jimmy Frangi", "Anton Maghami"],
  },
];

export const ORGANIZATIONS: Organization[] = [
  {
    id: "recqH3WicAg1nfNVu",
    name: "Monterock International",
    type: "Corporate",
    geography: "UAE",
    website: "https://www.monterock.com",
    description: "Monterock International is a UAE-based multinational private equity and lifestyle holding company with a global portfolio across hospitality, real estate and investments. They are known for partnering with and developing luxury lifestyle brands, including Nammos.",
    sector: "Consumer",
  },
];

export const LP_INVESTORS: LPInvestor[] = [
  { id: "recBsYGNuNjofF8yt", name: "Mike Haddad", type: "High Net Worth", status: "Potential", linkedVentures: ["Nammos Watson Island"] },
];


export const METRICS = {
  totalVentures: VENTURES.length,
  activeVentures: VENTURES.filter(v => v.status === "In progress").length,
  totalSPVs: SPVS.length,
  activeSPVs: SPVS.filter(s => s.stage === "Active deal").length,
  openTasks: TASKS.filter(t => t.status === "open").length,
  completedTasks: TASKS.filter(t => t.status === "complete").length,
  totalTeam: TEAM.length,
  totalDistributions: DISTRIBUTIONS.reduce((sum, d) => sum + d.amount, 0),
  paidDistributions: DISTRIBUTIONS.filter(d => d.status === "Paid").reduce((sum, d) => sum + d.amount, 0),
};

// Ventures grouped by theme
export const VENTURES_BY_THEME = VENTURES.reduce((acc, v) => {
  if (!acc[v.theme]) acc[v.theme] = [];
  acc[v.theme].push(v);
  return acc;
}, {} as Record<string, Venture[]>);

// Agent activity log (derived from real data)
export interface AgentLogEntry {
  id: string;
  action: string;
  detail: string;
  timestamp: string;
  theme: string;
}

export const AGENT_LOGS: AgentLogEntry[] = [
  { id: "al1", action: "Workshop Scheduled", detail: "Zarka City vision statement workshop — Anton coordinating", timestamp: "2026-03-14T14:32:00Z", theme: "Real Estate" },
  { id: "al2", action: "Deck Drafted", detail: "Nammos Watson Island presentation deck in progress", timestamp: "2026-03-14T13:15:00Z", theme: "Real Estate" },
  { id: "al3", action: "Deal Structure", detail: "Lagonissi Nammos internal deal structure meeting scheduled", timestamp: "2026-03-14T11:48:00Z", theme: "Real Estate" },
  { id: "al4", action: "SPV Update", detail: "Venezuela Mining Rights — awaiting updated financials", timestamp: "2026-03-14T10:22:00Z", theme: "Oil & Gas" },
  { id: "al5", action: "Distribution Paid", detail: "Q4 2025 Profit Share — $250K paid to LPs via wire", timestamp: "2026-03-14T09:05:00Z", theme: "Others" },
];

// Agent context for chat
export const AGENT_CONTEXT = `You are the VENTEX Venture Ops AI Assistant for the VENTEX System. You help manage operations across the venture holding portfolio.

Current Portfolio:
- ${VENTURES.length} ventures across ${Object.keys(VENTURES_BY_THEME).length} sectors (Real Estate, F&B, Yacht, Entertainment, Others)
- ${SPVS.length} SPVs (${SPVS.filter(s => s.stage === "Active deal").length} active, ${SPVS.filter(s => s.stage === "In negotiation").length} in negotiation)
- ${TASKS.filter(t => t.status === "open").length} open tasks, ${TASKS.filter(t => t.status === "complete").length} completed
- ${TEAM.length} team members (${TEAM.filter(t => t.type === "Internal").length} internal, ${TEAM.filter(t => t.type === "External Partner").length} external, ${TEAM.filter(t => t.type === "Advisor").length} advisors)
- $${(METRICS.totalDistributions / 1000).toFixed(0)}K in distributions ($${(METRICS.paidDistributions / 1000).toFixed(0)}K paid)

Key Ventures:
${VENTURES.filter(v => v.priority === "High" || v.currentStatus).map(v => `- ${v.name} (${v.theme}, ${v.location}): ${v.currentStatus || v.status}`).join('\n')}

Active SPVs:
${SPVS.filter(s => s.stage === "Active deal" || s.stage === "In negotiation").map(s => `- ${s.name} (${s.theme}): ${s.currentStatus || s.stage}`).join('\n')}

Organization: Monterock International (UAE) — key partner for Nammos brand ventures.
LP: Mike Haddad (HNW, Potential) — linked to Nammos Watson Island.

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

// Currency decimal config for formatCurrency
const CURRENCY_DECIMALS: Record<string, number> = {
  JPY: 0, BHD: 3, KWD: 3, OMR: 3,
};

export function formatCurrency(amount: number, currency: string = "USD"): string {
  const decimals = CURRENCY_DECIMALS[currency] ?? 0;
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

// Map of original task statuses for undo confirmation
export const ORIGINAL_TASK_STATUS: Record<string, TaskStatus> = Object.fromEntries(
  TASKS.map(t => [t.id, t.status])
);
