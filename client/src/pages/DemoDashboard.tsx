// Demo Dashboard — Investor-facing read-only replica of the VENTEX admin dashboard
// Self-contained: no tRPC, no auth, no external data. Pure static UI.
// ALL sidebar tabs are interactive with data-rich views.

import { cn } from "@/lib/utils";
import AnimatedCounter from "@/components/AnimatedCounter";
import {
  LayoutDashboard, Bot, Layers3, Briefcase, Users, DollarSign, ListChecks,
  Activity, Settings, Shield, Cpu, FileText, UserPlus, Eye, ChevronRight,
  Search, Bell, ArrowLeft, TrendingUp, ArrowUp, ArrowDown, Minus, Zap,
  Target, Brain, AlertTriangle, Building2, CheckCircle2, Clock, ExternalLink,
  MessageSquare, Send, Paperclip, BarChart3, ShieldCheck, FileWarning,
  Mail, Phone, Globe, Plus, ChevronDown, Hash, Folder, PenLine, Calendar,
  CircleDot, Filter, MoreHorizontal, Play, Pause, RefreshCw, Sparkles,
  Info, ArrowRight, Package, Wallet, Monitor,
} from "lucide-react";
import { motion, useInView, AnimatePresence } from "framer-motion";
import { useState, useRef, useEffect, useCallback } from "react";
import { Link, useLocation } from "wouter";

type DemoView = "admin" | "client";
type ClientTabId = "overview" | "ventures" | "documents" | "distributions" | "reports" | "messages" | "settings";

/* ─── Static demo data ─── */
const DEMO_CLIENTS = [
  { name: "Crestfield Capital", slug: "crestfield", ventures: 8, velocity: 94, completion: 78, overdue: 1, health: "excellent" as const, sector: "Real Estate" },
  { name: "Harborview Group", slug: "meridian", ventures: 5, velocity: 87, completion: 65, overdue: 2, health: "good" as const, sector: "F&B" },
  { name: "Ironclad Partners", slug: "northstar", ventures: 6, velocity: 91, completion: 82, overdue: 0, health: "excellent" as const, sector: "Oil & Gas" },
  { name: "Solaris Holdings", slug: "pacific", ventures: 4, velocity: 76, completion: 55, overdue: 3, health: "warning" as const, sector: "Entertainment" },
  { name: "Pinnacle Trust", slug: "sovereign", ventures: 7, velocity: 89, completion: 71, overdue: 1, health: "good" as const, sector: "Real Estate" },
  { name: "Vanguard Maritime", slug: "titan", ventures: 3, velocity: 82, completion: 60, overdue: 0, health: "good" as const, sector: "Yacht" },
];

const DEMO_FEED = [
  { id: 1, action: "Velocity Agent", detail: "Advanced 'Marina Bay Tower' from Due Diligence → Closing", time: "2m ago", color: "#22D3EE" },
  { id: 2, action: "Overdue Agent", detail: "Sent follow-up to Crestfield Capital — permit review 3 days overdue", time: "8m ago", color: "#EF4444" },
  { id: 3, action: "Distribution Sentinel", detail: "Flagged $2.4M distribution for Harborview Group — awaiting approval", time: "14m ago", color: "#A855F7" },
  { id: 4, action: "Compliance Watcher", detail: "KYC renewal triggered for Ironclad Partners — 30 days remaining", time: "22m ago", color: "#F59E0B" },
  { id: 5, action: "Velocity Agent", detail: "Stall detected: 'Dubai Creek Residences' — no activity for 7 days", time: "35m ago", color: "#22D3EE" },
  { id: 6, action: "Overdue Agent", detail: "Task completed: Legal review for Solaris Holdings yacht acquisition", time: "1h ago", color: "#EF4444" },
  { id: 7, action: "Compliance Watcher", detail: "Annual audit documents uploaded for Pinnacle Trust", time: "2h ago", color: "#F59E0B" },
];

const DEMO_KPI = [
  { label: "Active Ventures", value: 33, suffix: "of 41", trendUp: true, trend: "+3 this month" },
  { label: "Active SPVs", value: 12, suffix: "of 18", trendUp: true, trend: "+2 in negotiation" },
  { label: "Open Tasks", value: 24, suffix: "7 overdue", trendUp: false, trend: "3 overdue" },
  { label: "Distributions", value: 8, suffix: "$14.2M total", trendUp: true, trend: "+$2.4M pending" },
];

const DEMO_TASKS = [
  { title: "Review Marina Bay Tower closing documents", assignee: "Daniel Voss", priority: "high" as const, due: "Apr 10", client: "Crestfield Capital" },
  { title: "Submit KYC renewal for Ironclad Partners", assignee: "Ryan Torres", priority: "high" as const, due: "Apr 11", client: "Ironclad Partners" },
  { title: "Finalize yacht acquisition terms — Solaris Holdings", assignee: "Nate Calloway", priority: "medium" as const, due: "Apr 12", client: "Solaris Holdings" },
  { title: "Prepare Q1 distribution report for Pinnacle Trust", assignee: "Lena Park", priority: "medium" as const, due: "Apr 14", client: "Pinnacle Trust" },
  { title: "Schedule board meeting for Harborview Group F&B expansion", assignee: "Daniel Voss", priority: "low" as const, due: "Apr 18", client: "Harborview Group" },
];

const DEMO_ACTIVITY = [
  { id: 1, type: "venture", action: "Stage advanced", detail: "Marina Bay Tower moved from Due Diligence to Closing", user: "Velocity Agent", time: "2 minutes ago", icon: <Zap className="size-3.5" />, color: "text-cyan-400" },
  { id: 2, type: "task", action: "Task overdue", detail: "Permit review for Crestfield Capital is 3 days overdue", user: "Overdue Agent", time: "8 minutes ago", icon: <AlertTriangle className="size-3.5" />, color: "text-red-400" },
  { id: 3, type: "distribution", action: "Distribution flagged", detail: "$2.4M distribution for Harborview Group flagged for approval", user: "Distribution Sentinel", time: "14 minutes ago", icon: <DollarSign className="size-3.5" />, color: "text-purple-400" },
  { id: 4, type: "compliance", action: "KYC renewal", detail: "Ironclad Partners KYC renewal triggered — 30 days remaining", user: "Compliance Watcher", time: "22 minutes ago", icon: <ShieldCheck className="size-3.5" />, color: "text-amber-400" },
  { id: 5, type: "venture", action: "Stall detected", detail: "Dubai Creek Residences — no activity for 7 days", user: "Velocity Agent", time: "35 minutes ago", icon: <AlertTriangle className="size-3.5" />, color: "text-cyan-400" },
  { id: 6, type: "task", action: "Task completed", detail: "Legal review for Solaris Holdings yacht acquisition", user: "Nate Calloway", time: "1 hour ago", icon: <CheckCircle2 className="size-3.5" />, color: "text-emerald-400" },
  { id: 7, type: "document", action: "Document uploaded", detail: "Annual audit documents for Pinnacle Trust", user: "Lena Park", time: "2 hours ago", icon: <FileText className="size-3.5" />, color: "text-blue-400" },
  { id: 8, type: "venture", action: "New venture created", detail: "Palm Jumeirah Residences added to Crestfield Capital portfolio", user: "Shwan Lee", time: "3 hours ago", icon: <Plus className="size-3.5" />, color: "text-emerald-400" },
  { id: 9, type: "task", action: "Task assigned", detail: "Prepare investor deck for Vanguard Maritime yacht project", user: "Shwan Lee", time: "4 hours ago", icon: <ListChecks className="size-3.5" />, color: "text-blue-400" },
  { id: 10, type: "compliance", action: "Compliance check passed", detail: "Vanguard Maritime annual compliance review approved", user: "Compliance Watcher", time: "5 hours ago", icon: <ShieldCheck className="size-3.5" />, color: "text-emerald-400" },
];

const DEMO_AGENTS = [
  { name: "Overdue Agent", status: "running" as const, actions: 47, uptime: "99.8%", lastAction: "Sent follow-up to Crestfield Capital", lastActionTime: "8m ago", color: "#EF4444", description: "Monitors all tasks for overdue deadlines. Sends automated follow-ups and escalates to team leads after 48 hours." },
  { name: "Velocity Agent", status: "running" as const, actions: 23, uptime: "99.9%", lastAction: "Advanced Marina Bay Tower stage", lastActionTime: "2m ago", color: "#22D3EE", description: "Tracks venture pipeline velocity. Detects stalls, suggests stage advances, and optimizes deal flow timing." },
  { name: "Distribution Sentinel", status: "monitoring" as const, actions: 12, uptime: "100%", lastAction: "Flagged $2.4M distribution", lastActionTime: "14m ago", color: "#A855F7", description: "Watches all distribution events. Validates amounts, flags anomalies, and ensures compliance before payouts." },
  { name: "Compliance Watcher", status: "running" as const, actions: 8, uptime: "99.7%", lastAction: "KYC renewal triggered", lastActionTime: "22m ago", color: "#F59E0B", description: "Monitors regulatory deadlines. Auto-triggers KYC renewals, audit reminders, and license expiration alerts." },
];

const DEMO_TEAM = [
  { name: "Shwan Lee", role: "Founder & CEO", email: "shwan@aurovia.co", status: "online" as const, ventures: 12, tasks: 3, avatar: "SL", photo: "https://d2xsxph8kpxj0f.cloudfront.net/310519663421947072/TYkqBQavc4Sd5YvF3sSZqT/shwan-lee-new_e321fa79.webp" },
  { name: "Brian Chen", role: "COO", email: "brian@aurovia.co", status: "online" as const, ventures: 8, tasks: 5, avatar: "BC", photo: "https://d2xsxph8kpxj0f.cloudfront.net/310519663421947072/TYkqBQavc4Sd5YvF3sSZqT/brian-chen_b535f902.jpeg" },
  { name: "Chris Phelps", role: "CRO", email: "chris@aurovia.co", status: "online" as const, ventures: 10, tasks: 4, avatar: "CP", photo: "https://d2xsxph8kpxj0f.cloudfront.net/310519663421947072/TYkqBQavc4Sd5YvF3sSZqT/chris-phelps_c7e7c272.jpeg" },
  { name: "Daniel Voss", role: "Head of Operations", email: "daniel@ventex.co", status: "online" as const, ventures: 15, tasks: 6, avatar: "DV" },
  { name: "Ryan Torres", role: "Compliance Lead", email: "ryan@ventex.co", status: "away" as const, ventures: 8, tasks: 3, avatar: "RT" },
  { name: "Nate Calloway", role: "Deal Structuring", email: "nate@ventex.co", status: "offline" as const, ventures: 6, tasks: 2, avatar: "NC" },
  { name: "Lena Park", role: "Finance & Distributions", email: "lena@ventex.co", status: "online" as const, ventures: 7, tasks: 4, avatar: "LP" },
];

const DEMO_CONTACTS = [
  { name: "Marcus Hale", org: "Crestfield Capital", role: "Chairman", email: "marcus@crestfield.com", phone: "+971-4-XXX-XXXX", status: "active" as const },
  { name: "Olivia Grant", org: "Harborview Group", role: "CEO", email: "olivia@harborview.com", phone: "+1-XXX-XXX-XXXX", status: "active" as const },
  { name: "Thomas Richter", org: "Ironclad Partners", role: "Managing Partner", email: "thomas@ironclad.com", phone: "+44-XXX-XXX-XXXX", status: "active" as const },
  { name: "Diana Morales", org: "Solaris Holdings", role: "Director", email: "diana@solaris.vc", phone: "+1-XXX-XXX-XXXX", status: "active" as const },
  { name: "Robert Ashford", org: "Pinnacle Trust", role: "CIO", email: "robert@pinnacle.com", phone: "+41-XXX-XXX-XXXX", status: "active" as const },
  { name: "Kenji Mori", org: "Vanguard Maritime", role: "VP Operations", email: "kenji@vanguard.co", phone: "+81-XXX-XXX-XXXX", status: "active" as const },
];

const DEMO_BLUEPRINTS = [
  { name: "Marina Bay Tower", client: "Crestfield Capital", stage: "Closing", progress: 92, sector: "Real Estate" },
  { name: "Dubai Creek Residences", client: "Crestfield Capital", stage: "Due Diligence", progress: 45, sector: "Real Estate" },
  { name: "Palm Jumeirah Residences", client: "Crestfield Capital", stage: "Negotiation", progress: 30, sector: "Real Estate" },
  { name: "Harborview Culinary District", client: "Harborview Group", stage: "Active", progress: 68, sector: "F&B" },
  { name: "Ironclad Refinery", client: "Ironclad Partners", stage: "Active", progress: 75, sector: "Oil & Gas" },
  { name: "Solaris Yacht Club", client: "Solaris Holdings", stage: "Due Diligence", progress: 40, sector: "Yacht" },
  { name: "Pinnacle Tower II", client: "Pinnacle Trust", stage: "Closing", progress: 88, sector: "Real Estate" },
  { name: "Vanguard Superyacht", client: "Vanguard Maritime", stage: "Negotiation", progress: 25, sector: "Yacht" },
];

const DEMO_CHAT = [
  { role: "assistant" as const, content: "Good morning. I've completed the overnight analysis. Here's your briefing:\n\n**3 items require attention:**\n1. Marina Bay Tower closing docs need review by Apr 10\n2. Ironclad Partners KYC renewal due in 30 days\n3. Solaris Holdings has 3 overdue tasks — velocity declining\n\nShall I draft follow-up emails for the overdue items?" },
  { role: "user" as const, content: "Yes, draft the follow-ups. Also, what's the status on the Harborview distribution?" },
  { role: "assistant" as const, content: "I've drafted 3 follow-up emails — they're in your Drafts tab for review.\n\n**Harborview Group Distribution:**\n- Amount: $2.4M (Q1 2026)\n- Status: Flagged by Distribution Sentinel for approval\n- Reason: Amount exceeds quarterly threshold by 15%\n- Action needed: Your approval to release\n\nWould you like me to prepare the approval memo?" },
];

const DEMO_DRAFTS = [
  { title: "Follow-up: Marina Bay Tower Closing Documents", to: "Marcus Hale", status: "ready" as const, created: "2h ago", type: "email" },
  { title: "Follow-up: Solaris Holdings Overdue Tasks", to: "Diana Morales", status: "ready" as const, created: "2h ago", type: "email" },
  { title: "Follow-up: Ironclad Partners KYC Renewal", to: "Thomas Richter", status: "ready" as const, created: "2h ago", type: "email" },
  { title: "Q1 Distribution Report — Pinnacle Trust", to: "Robert Ashford", status: "draft" as const, created: "1d ago", type: "report" },
  { title: "Board Meeting Agenda — Harborview Group", to: "Olivia Grant", status: "draft" as const, created: "2d ago", type: "document" },
];

/* ─── Live simulation data ─── */
const LIVE_EVENTS = [
  { action: "Velocity Agent", detail: "Detected momentum shift: Dubai Creek Residences velocity up 8% this week", color: "#22D3EE" },
  { action: "Overdue Agent", detail: "Auto-escalated: Solaris Holdings permit review — now 5 days overdue", color: "#EF4444" },
  { action: "Distribution Sentinel", detail: "Verified $1.8M distribution for Pinnacle Trust — cleared", color: "#A855F7" },
  { action: "Compliance Watcher", detail: "Vanguard Maritime license renewal — 45 days remaining, auto-reminder queued", color: "#F59E0B" },
  { action: "Velocity Agent", detail: "Palm Jumeirah Residences advanced from Negotiation → Due Diligence", color: "#22D3EE" },
  { action: "Overdue Agent", detail: "Follow-up sent to Harborview Group — board meeting agenda 2 days overdue", color: "#EF4444" },
  { action: "Distribution Sentinel", detail: "Q2 distribution forecast generated for Crestfield Capital — $3.1M projected", color: "#A855F7" },
  { action: "Compliance Watcher", detail: "Environmental compliance check passed for Ironclad Refinery", color: "#F59E0B" },
  { action: "Velocity Agent", detail: "Benchmark analysis: Portfolio velocity 18% above industry average", color: "#22D3EE" },
  { action: "Overdue Agent", detail: "Task auto-completed: Pinnacle Tower II title transfer docs received", color: "#EF4444" },
];

const TYPING_MESSAGES = [
  "Analyzing portfolio velocity trends across all clients...",
  "Generating Q2 distribution forecast for Crestfield Capital...",
  "Scanning regulatory updates for UAE energy sector...",
  "Preparing weekly performance summary for 6 clients...",
  "Cross-referencing market signals with venture timelines...",
];

/* ─── Guided Tour Steps ─── */
interface TourStep {
  view: DemoView;
  tab: TabId | ClientTabId;
  title: string;
  narration: string;
  duration: number; // seconds to show before auto-advancing
}

const TOUR_STEPS: TourStep[] = [
  // Admin tour
  { view: "admin", tab: "dashboard", title: "Command Center", narration: "This is the operator's nerve center. Real-time KPIs, client health cards with velocity sparklines, and a live AI agent feed that updates every 8 seconds. Everything the team needs to manage 50+ ventures from one screen.", duration: 10 },
  { view: "admin", tab: "activity", title: "Activity Log", narration: "A complete audit trail of every action — human and AI. Filter by type to see exactly what happened, when, and by whom. Full transparency for compliance and accountability.", duration: 8 },
  { view: "admin", tab: "oversight", title: "Portfolio Oversight", narration: "AI-powered risk monitoring across all clients. Health matrices, risk alerts, and compliance tracking update in real-time. The system flags issues before they become problems.", duration: 8 },
  { view: "admin", tab: "concierge", title: "AI Concierge", narration: "A conversational AI that understands the entire portfolio. Ask about any venture, client, or deadline — get instant answers. It can draft emails, generate reports, and brief the team.", duration: 8 },
  { view: "admin", tab: "agents", title: "Autonomous AI Agents", narration: "Four AI agents run 24/7 — Velocity Agent tracks momentum, Overdue Agent escalates delays, Distribution Sentinel verifies payments, Compliance Watcher monitors deadlines. They never sleep.", duration: 9 },
  { view: "admin", tab: "blueprints", title: "Venture Pipeline", narration: "A visual kanban showing every venture across stages — from Negotiation through Due Diligence to Active and Closing. Drag-and-drop simplicity with AI-projected timelines.", duration: 8 },
  { view: "admin", tab: "team", title: "VENTEX Team", narration: "Team management with real-time status, venture assignments, and task loads. See who's available, how work is distributed, and reassign with one click.", duration: 7 },
  { view: "admin", tab: "contacts", title: "Client Directory", narration: "A centralized contact directory organized by organization. One-click access to email and phone for every stakeholder across all client portfolios.", duration: 7 },
  { view: "admin", tab: "onboard", title: "Client Onboarding", narration: "A structured 5-step wizard — KYC, compliance review, portal setup, venture linking, and access provisioning. Ensures nothing is missed when bringing on new clients.", duration: 7 },
  { view: "admin", tab: "drafts", title: "AI-Generated Drafts", narration: "The AI Concierge auto-generates follow-up emails, reports, and documents based on portfolio activity. Operators review, edit, and send with one click.", duration: 7 },
  { view: "admin", tab: "settings", title: "System Configuration", narration: "Platform-wide settings — notifications, AI agent thresholds, integrations, security, and team permissions. Full control over how VENTEX operates.", duration: 6 },
  // Client tour
  { view: "client", tab: "overview", title: "Client Dashboard", narration: "Now switching to the client's view. This is what your investors see — an AI-generated briefing, action cards requiring their attention, and a real-time velocity feed showing progress.", duration: 10 },
  { view: "client", tab: "ventures", title: "My Ventures", narration: "Each venture card shows real-time stage progress, velocity momentum vs. benchmark, risk factors, and AI-projected timelines. Clients see exactly where their investments stand.", duration: 8 },
  { view: "client", tab: "documents", title: "Document Vault", narration: "A secure document vault with all venture-related files — agreements, reports, compliance docs. Organized by type with status badges and one-click download.", duration: 7 },
  { view: "client", tab: "distributions", title: "Distributions", narration: "Complete distribution history with summary cards showing total paid, pending, and projected amounts. Clients see every payment with full transparency.", duration: 7 },
  { view: "client", tab: "reports", title: "AI Reports", narration: "AI-generated performance reports with key highlights and trend analysis. Clients get institutional-grade analytics without the operator lifting a finger.", duration: 7 },
  { view: "client", tab: "messages", title: "Secure Messaging", narration: "Direct messaging with the VENTEX team. Clients can ask questions, request documents, or flag concerns — all in one secure channel.", duration: 7 },
  { view: "client", tab: "settings", title: "Account Settings", narration: "Profile management, notification preferences, and security settings. Clients control their own experience.", duration: 6 },
];

type TabId = "dashboard" | "activity" | "oversight" | "concierge" | "agents" | "blueprints" | "team" | "contacts" | "onboard" | "drafts" | "settings";

const DEMO_NAV: { label: string; icon: React.ReactNode; id: TabId }[] = [
  { label: "Dashboard", icon: <LayoutDashboard className="size-[18px]" />, id: "dashboard" },
  { label: "Activity", icon: <Activity className="size-[18px]" />, id: "activity" },
  { label: "Oversight", icon: <Eye className="size-[18px]" />, id: "oversight" },
  { label: "AI Concierge", icon: <Bot className="size-[18px]" />, id: "concierge" },
  { label: "AI Agents", icon: <Cpu className="size-[18px]" />, id: "agents" },
  { label: "Blueprints", icon: <Layers3 className="size-[18px]" />, id: "blueprints" },
  { label: "VENTEX Team", icon: <Shield className="size-[18px]" />, id: "team" },
  { label: "Client Contacts", icon: <Users className="size-[18px]" />, id: "contacts" },
  { label: "Onboard Client", icon: <UserPlus className="size-[18px]" />, id: "onboard" },
  { label: "Drafts", icon: <FileText className="size-[18px]" />, id: "drafts" },
  { label: "Settings", icon: <Settings className="size-[18px]" />, id: "settings" },
];

const VENTEX_LOGO_URL = "https://d2xsxph8kpxj0f.cloudfront.net/310519663421947072/TYkqBQavc4Sd5YvF3sSZqT/atlas-logo-G2SBqxAK64sZYAYmAZY9js.webp";

/* ─── Annotation descriptions for investor understanding ─── */
const ADMIN_ANNOTATIONS: Record<string, { title: string; desc: string }> = {
  dashboard: { title: "Command Center", desc: "The operator's real-time overview of all client portfolios, AI agent activity, and priority tasks. This is where the VENTEX team manages everything from one screen." },
  activity: { title: "Activity Log", desc: "A complete audit trail of every action — both human and AI. Operators can filter by type and see exactly what happened, when, and by whom." },
  oversight: { title: "Portfolio Oversight", desc: "Risk monitoring and compliance tracking across all clients. Health scores, risk alerts, and regulatory status are updated in real-time by AI agents." },
  concierge: { title: "AI Concierge", desc: "A conversational AI assistant that understands the entire portfolio. Operators can ask questions, draft communications, and get instant briefings." },
  agents: { title: "AI Agents", desc: "Four autonomous AI agents that run 24/7 — monitoring overdue tasks, tracking velocity, flagging distributions, and watching compliance deadlines." },
  blueprints: { title: "Venture Blueprints", desc: "A visual pipeline showing every venture across stages (Negotiation → Due Diligence → Active → Closing). Operators see progress at a glance." },
  team: { title: "VENTEX Team", desc: "Team management with real-time status, venture assignments, and task loads. The operator sees who is available and how work is distributed." },
  contacts: { title: "Client Contacts", desc: "A centralized directory of all client contacts organized by organization. One-click access to email and phone for every stakeholder." },
  onboard: { title: "Client Onboarding", desc: "A structured 5-step wizard for onboarding new clients — from KYC to compliance review to portal access. Ensures nothing is missed." },
  drafts: { title: "AI-Generated Drafts", desc: "The AI Concierge auto-generates follow-up emails, reports, and documents based on portfolio activity. Operators review and send with one click." },
  settings: { title: "System Settings", desc: "Configuration for the entire platform — notifications, AI agent thresholds, integrations, and security settings." },
};

const CLIENT_ANNOTATIONS: Record<string, { title: string; desc: string }> = {
  velocitySummary: { title: "AI Briefing", desc: "An AI-generated one-line summary of the client's portfolio status. Updated in real-time as ventures progress." },
  actionNeeded: { title: "Action Needed", desc: "Smart cards that surface decisions requiring the client's attention — stage advances, approvals, and unblocked ventures. Each has a one-click action button." },
  completed: { title: "Completed Updates", desc: "A feed of recently completed actions so clients see progress without having to ask. Builds trust through transparency." },
  portfolio: { title: "Venture Portfolio", desc: "Each venture card shows real-time stage, velocity momentum, risk factors, and AI-projected timelines. Clients see exactly where their investments stand." },
  health: { title: "Portfolio Health Score", desc: "An AI-calculated score (0-100) that aggregates velocity, task completion, risk factors, and compliance status across all ventures." },
  forecasts: { title: "AI Forecasts", desc: "Machine learning projections for each venture — estimated days to next stage, confidence levels, and risk factors. Clients see the future, not just the present." },
  market: { title: "Market Intelligence", desc: "AI-curated sector signals — opportunities, risks, and regulatory changes relevant to the client's portfolio. Proactive, not reactive." },
  chat: { title: "Portfolio Assistant", desc: "A personal AI assistant that knows the client's entire portfolio. Ask about venture status, overdue tasks, distributions — instant answers." },
};

/* ─── Annotation tooltip component ─── */
function Annotation({ id, annotations, className = "" }: { id: string; annotations: Record<string, { title: string; desc: string }>; className?: string }) {
  const [open, setOpen] = useState(false);
  const a = annotations[id];
  if (!a) return null;
  return (
    <div className={cn("relative inline-flex", className)}>
      <button
        onClick={() => setOpen(!open)}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        className="size-5 rounded-full bg-primary/10 flex items-center justify-center hover:bg-primary/20 transition-colors"
        aria-label={`Info: ${a.title}`}
      >
        <Info className="size-3 text-primary" />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 4, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 bottom-full mb-2 left-1/2 -translate-x-1/2 w-72 bg-card border border-primary/20 rounded-lg p-3 shadow-xl"
          >
            <div className="flex items-center gap-2 mb-1.5">
              <div className="size-1.5 rounded-full bg-primary" />
              <span className="text-[11px] font-semibold text-primary">{a.title}</span>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">{a.desc}</p>
            <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px">
              <div className="w-2 h-2 bg-card border-r border-b border-primary/20 rotate-45" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── Guided Tour Overlay ─── */
function GuidedTourOverlay({
  step,
  totalSteps,
  currentStep,
  isPlaying,
  progress,
  onNext,
  onPrev,
  onTogglePlay,
  onClose,
}: {
  step: TourStep;
  totalSteps: number;
  currentStep: number;
  isPlaying: boolean;
  progress: number;
  onNext: () => void;
  onPrev: () => void;
  onTogglePlay: () => void;
  onClose: () => void;
}) {
  const isAdmin = step.view === "admin";
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] w-[90vw] max-w-lg"
    >
      <div className="bg-card/95 backdrop-blur-xl border border-primary/30 rounded-2xl shadow-2xl shadow-primary/10 overflow-hidden">
        {/* Progress bar */}
        <div className="h-1 bg-border relative">
          <motion.div
            className="h-full bg-gradient-to-r from-primary to-cyan-400"
            initial={{ width: 0 }}
            animate={{ width: `${((currentStep + 1) / totalSteps) * 100}%` }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          />
          {/* Auto-advance timer bar */}
          {isPlaying && (
            <motion.div
              className="absolute top-0 left-0 h-full bg-white/20"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3 }}
            />
          )}
        </div>

        <div className="p-5">
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <div className={cn(
                "size-8 rounded-lg flex items-center justify-center",
                isAdmin ? "bg-primary/15" : "bg-emerald-500/15"
              )}>
                {isAdmin ? <Shield className="size-4 text-primary" /> : <Users className="size-4 text-emerald-400" />}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-foreground">{step.title}</span>
                  <span className={cn(
                    "text-[9px] font-semibold tracking-wider px-2 py-0.5 rounded-full",
                    isAdmin ? "bg-primary/15 text-primary" : "bg-emerald-500/15 text-emerald-400"
                  )}>
                    {isAdmin ? "ADMIN" : "CLIENT"}
                  </span>
                </div>
                <span className="text-[10px] text-muted-foreground font-mono">
                  Step {currentStep + 1} of {totalSteps}
                </span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="size-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
              aria-label="Close tour"
            >
              <span className="text-lg leading-none">&times;</span>
            </button>
          </div>

          {/* Narration */}
          <p className="text-[13px] text-muted-foreground leading-relaxed mb-4">
            {step.narration}
          </p>

          {/* Controls */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <button
                onClick={onPrev}
                disabled={currentStep === 0}
                className="size-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                aria-label="Previous step"
              >
                <ArrowLeft className="size-4" />
              </button>
              <button
                onClick={onTogglePlay}
                className={cn(
                  "size-8 rounded-lg flex items-center justify-center transition-colors",
                  isPlaying
                    ? "bg-primary/15 text-primary hover:bg-primary/25"
                    : "bg-accent/50 text-foreground hover:bg-accent"
                )}
                aria-label={isPlaying ? "Pause tour" : "Play tour"}
              >
                {isPlaying ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}
              </button>
              <button
                onClick={onNext}
                disabled={currentStep === totalSteps - 1}
                className="size-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                aria-label="Next step"
              >
                <ArrowRight className="size-4" />
              </button>
            </div>

            <div className="flex items-center gap-2">
              {/* Step dots */}
              <div className="flex items-center gap-1">
                {TOUR_STEPS.map((s, i) => (
                  <div
                    key={i}
                    className={cn(
                      "rounded-full transition-all duration-300",
                      i === currentStep
                        ? "size-2 bg-primary"
                        : i < currentStep
                          ? "size-1.5 bg-primary/40"
                          : "size-1.5 bg-border",
                      s.view !== step.view && i === currentStep - 1 && "ml-1.5"
                    )}
                  />
                ))}
              </div>
              <button
                onClick={onClose}
                className="text-[11px] text-muted-foreground hover:text-foreground transition-colors px-2 py-1"
              >
                Skip Tour
              </button>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/* ─── Client Portal Demo Data ─── */
const CLIENT_DEMO_FEED = [
  { id: 1, type: "action" as const, summary: "Marina Bay Tower is ready to advance from Due Diligence to Closing", ventureName: "Marina Bay Tower", actionLabel: "Advance Status", date: "2 hours ago" },
  { id: 2, type: "action" as const, summary: "Q1 distribution of $2.4M for Harborview Culinary District requires your confirmation", ventureName: "Harborview Culinary District", actionLabel: "Confirm Distribution", date: "4 hours ago" },
  { id: 3, type: "action" as const, summary: "Legal review completed — approve follow-up letter for Ironclad Refinery", ventureName: "Ironclad Refinery", actionLabel: "Review & Approve", date: "6 hours ago" },
];

const CLIENT_DEMO_COMPLETED = [
  { id: 4, summary: "KYC renewal documents submitted for Ironclad Partners", ventureName: "Ironclad Partners", date: "Yesterday" },
  { id: 5, summary: "Annual audit report uploaded for Pinnacle Tower II", ventureName: "Pinnacle Tower II", date: "2 days ago" },
  { id: 6, summary: "Board meeting minutes filed for Harborview Group", ventureName: "Harborview Group", date: "3 days ago" },
];

const CLIENT_DEMO_PORTFOLIO = [
  { id: 1, name: "Marina Bay Tower", sector: "Real Estate", stage: "Closing", statusLine: "Final documents under review", momentum: { projectedDays: 12, confidence: 88, velocityVsBenchmark: "faster" as const, benchmarkDays: 21 } },
  { id: 2, name: "Dubai Creek Residences", sector: "Real Estate", stage: "Due Diligence", statusLine: "Environmental assessment in progress", momentum: { projectedDays: 34, confidence: 72, velocityVsBenchmark: "on_pace" as const, benchmarkDays: 35 } },
  { id: 3, name: "Harborview Culinary District", sector: "F&B", stage: "Active", statusLine: "Construction phase — 68% complete", momentum: { projectedDays: 45, confidence: 81, velocityVsBenchmark: "faster" as const, benchmarkDays: 60 } },
  { id: 4, name: "Ironclad Refinery", sector: "Oil & Gas", stage: "Active", statusLine: "Regulatory permits approved", momentum: { projectedDays: 28, confidence: 65, velocityVsBenchmark: "slower" as const, benchmarkDays: 20, riskLevel: "medium" as const, riskFactors: ["Supply chain delays", "Permit renewal pending"] } },
  { id: 5, name: "Solaris Yacht Club", sector: "Yacht", stage: "Due Diligence", statusLine: "Structural survey scheduled", momentum: { projectedDays: 42, confidence: 58, velocityVsBenchmark: "slower" as const, benchmarkDays: 30, riskLevel: "high" as const, riskFactors: ["3 overdue tasks", "Vendor unresponsive"] } },
  { id: 6, name: "Pinnacle Tower II", sector: "Real Estate", stage: "Closing", statusLine: "Title transfer in progress", momentum: { projectedDays: 8, confidence: 94, velocityVsBenchmark: "faster" as const, benchmarkDays: 15 } },
];

const CLIENT_DEMO_FORECASTS = [
  { ventureName: "Marina Bay Tower", projectedDays: 12, confidence: 88, riskLevel: "low" },
  { ventureName: "Dubai Creek Residences", projectedDays: 34, confidence: 72, riskLevel: "medium", riskFactors: ["Environmental review pending"] },
  { ventureName: "Solaris Yacht Club", projectedDays: 42, confidence: 58, riskLevel: "high", riskFactors: ["3 overdue tasks", "Vendor delays", "Survey rescheduled"] },
];

const CLIENT_DEMO_SIGNALS = [
  { sector: "Real Estate", signalType: "opportunity", headline: "Dubai Marina demand up 18% YoY", impact: "Favorable conditions for Marina Bay Tower closing timeline", relevance: 92 },
  { sector: "Oil & Gas", signalType: "regulatory", headline: "New UAE energy efficiency standards", impact: "Ironclad Refinery may need compliance updates by Q3", relevance: 78 },
  { sector: "F&B", signalType: "opportunity", headline: "Tourism sector growth accelerating", impact: "Harborview Culinary District positioned to benefit from 23% visitor increase", relevance: 85 },
];

const SECTOR_ICONS: Record<string, React.ReactNode> = {
  "Real Estate": <Building2 className="size-4" />,
  "F&B": <Package className="size-4" />,
  "Oil & Gas": <Zap className="size-4" />,
  "Yacht": <Briefcase className="size-4" />,
  "Entertainment": <Monitor className="size-4" />,
};

/* ─── Helper components ─── */
function HealthBadge({ health }: { health: "excellent" | "good" | "warning" | "critical" }) {
  const cfg = {
    excellent: { bg: "bg-emerald-500/10", text: "text-emerald-400", dot: "bg-emerald-400", label: "Excellent" },
    good: { bg: "bg-blue-500/10", text: "text-blue-400", dot: "bg-blue-400", label: "Good" },
    warning: { bg: "bg-amber-500/10", text: "text-amber-400", dot: "bg-amber-400", label: "Attention" },
    critical: { bg: "bg-red-500/10", text: "text-red-400", dot: "bg-red-400", label: "Critical" },
  }[health];
  return (
    <span className={cn("inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium", cfg.bg, cfg.text)}>
      <span className={cn("size-1.5 rounded-full", cfg.dot)} />
      {cfg.label}
    </span>
  );
}

function VelocityBadge({ rate }: { rate: number }) {
  const color = rate >= 90 ? "text-emerald-400" : rate >= 70 ? "text-blue-400" : rate >= 50 ? "text-amber-400" : "text-red-400";
  const Icon = rate >= 70 ? ArrowUp : rate >= 50 ? Minus : ArrowDown;
  return (
    <span className={cn("inline-flex items-center gap-1 font-mono text-xs font-medium", color)}>
      <Icon className="size-3" />
      {rate}%
    </span>
  );
}

function PriorityBadge({ priority }: { priority: "high" | "medium" | "low" }) {
  const cfg = {
    high: "bg-red-500/10 text-red-400",
    medium: "bg-amber-500/10 text-amber-400",
    low: "bg-secondary text-muted-foreground",
  }[priority];
  return <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded capitalize", cfg)}>{priority}</span>;
}

function FadeIn({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  return (
    <motion.div ref={ref} initial={{ opacity: 0, y: 12 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.35, delay, ease: "easeOut" }} className={className}>
      {children}
    </motion.div>
  );
}

/* ─── Velocity Micro-Interactions ─── */
function SparkLine({ data, color = "#22D3EE", height = 24 }: { data: number[]; color?: string; height?: number }) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const w = 60;
  const points = data.map((v, i) => `${(i / (data.length - 1)) * w},${height - ((v - min) / range) * (height - 4) - 2}`).join(" ");
  return (
    <svg width={w} height={height} className="inline-block">
      <polyline fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" points={points} opacity={0.7} />
      <circle cx={(data.length - 1) / (data.length - 1) * w} cy={height - ((data[data.length - 1] - min) / range) * (height - 4) - 2} r="2" fill={color} />
    </svg>
  );
}

const SPARK_DATA: Record<string, number[]> = {
  "Active Clients": [4, 4, 5, 5, 5, 6, 6],
  "Total Ventures": [28, 29, 30, 31, 32, 33, 33],
  "Open Tasks": [18, 22, 19, 16, 14, 15, 12],
  "Distributions": [1.2, 1.4, 1.8, 2.1, 2.4, 2.6, 2.8],
};

function LivePulse() {
  return (
    <span className="relative flex size-2">
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
      <span className="relative inline-flex rounded-full size-2 bg-emerald-400" />
    </span>
  );
}

function AgentThinkingDots() {
  return (
    <span className="inline-flex items-center gap-0.5 ml-1">
      {[0, 1, 2].map(i => (
        <motion.span
          key={i}
          className="size-1 rounded-full bg-primary"
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
        />
      ))}
    </span>
  );
}

function LiveNotificationToast({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -20, x: 20 }}
      animate={{ opacity: 1, y: 0, x: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="fixed top-20 right-4 z-50 max-w-sm border border-primary/30 rounded-lg shadow-lg shadow-primary/5 p-3 flex items-start gap-3"
      style={{ backgroundColor: '#0a0a0f' }}
    >
      <div className="size-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
        <Zap className="size-3 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <span className="text-[10px] font-semibold text-primary uppercase tracking-wider">VENTEX Agent</span>
        <p className="text-xs text-foreground mt-0.5 leading-relaxed">{message}</p>
      </div>
      <button onClick={onDismiss} className="text-muted-foreground hover:text-foreground transition-colors shrink-0">
        <span className="text-xs">×</span>
      </button>
    </motion.div>
  );
}

function VelocityRing({ score, size = 48 }: { score: number; size?: number }) {
  const r = (size - 6) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  const color = score >= 85 ? "#22C55E" : score >= 70 ? "#22D3EE" : score >= 50 ? "#F59E0B" : "#EF4444";
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeWidth="3" className="text-secondary" />
        <motion.circle
          cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth="3" strokeLinecap="round"
          strokeDasharray={circ} initial={{ strokeDashoffset: circ }} animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.5, ease: "easeOut" }}
        />
      </svg>
      <span className="absolute text-[10px] font-bold font-mono" style={{ color }}>{score}</span>
    </div>
  );
}

function SectionCard({ title, subtitle, icon, children }: { title: string; subtitle?: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="bg-card border border-border rounded-lg">
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          {icon && <span className="text-primary">{icon}</span>}
          <div>
            <h3 className="text-xs font-semibold text-foreground">{title}</h3>
            {subtitle && <p className="text-[10px] text-muted-foreground">{subtitle}</p>}
          </div>
        </div>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/* ─── TAB CONTENT VIEWS ─── */
/* ═══════════════════════════════════════════════════════════════════════════ */

function DashboardView({ search, setSearch, liveFeed, agentThinking }: { search: string; setSearch: (s: string) => void; liveFeed: typeof DEMO_FEED; agentThinking: boolean }) {
  const filteredClients = search
    ? DEMO_CLIENTS.filter(c => c.name.toLowerCase().includes(search.toLowerCase()))
    : DEMO_CLIENTS;

  return (
    <div className="space-y-6">
      {/* Overdue alert */}
      <FadeIn>
        <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-3 flex items-center gap-3">
          <AlertTriangle className="size-4 text-red-400 shrink-0" />
          <div className="flex-1">
            <span className="text-xs font-medium text-red-400">3 overdue tasks detected</span>
            <span className="text-[10px] text-muted-foreground ml-2">Overdue Agent has sent automated follow-ups</span>
          </div>
          <span className="text-[10px] font-mono text-muted-foreground">Auto-resolved: 1</span>
        </div>
      </FadeIn>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {DEMO_KPI.map((kpi, i) => (
          <FadeIn key={kpi.label} delay={i * 0.05}>
            <div className="bg-card border border-border rounded-lg p-4 flex flex-col gap-2 hover:border-primary/30 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-[11px] uppercase tracking-[0.06em] text-muted-foreground font-medium">{kpi.label}</span>
                {SPARK_DATA[kpi.label] && <SparkLine data={SPARK_DATA[kpi.label]} color={kpi.trendUp ? "#22C55E" : "#F59E0B"} />}
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-semibold tracking-tight text-foreground font-mono">
                  <AnimatedCounter value={kpi.value} duration={1200} />
                </span>
                <span className="text-[10px] text-muted-foreground font-mono">{kpi.suffix}</span>
              </div>
              <div className="flex items-center gap-1 mt-1">
                {kpi.trendUp ? <TrendingUp className="size-3 text-emerald-400" /> : <AlertTriangle className="size-3 text-amber-400" />}
                <span className={cn("text-[10px] font-mono", kpi.trendUp ? "text-emerald-400" : "text-amber-400")}>{kpi.trend}</span>
              </div>
            </div>
          </FadeIn>
        ))}
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-6">
        <div className="space-y-4">
          {/* Client Portfolio */}
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">Client Portfolio</h2>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
              <input type="text" placeholder="Search clients..." value={search} onChange={e => setSearch(e.target.value)}
                className="h-8 pl-8 pr-3 text-xs bg-card border border-border rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/30 w-48" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {filteredClients.map((client, i) => (
              <FadeIn key={client.slug} delay={0.1 + i * 0.05}>
                <div className="bg-card border border-border rounded-lg p-4 hover:border-primary/30 transition-all cursor-default group">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="size-8 rounded-md bg-primary/10 flex items-center justify-center"><Building2 className="size-4 text-primary" /></div>
                      <div>
                        <span className="text-xs font-medium text-foreground">{client.name}</span>
                        <span className="text-[10px] text-muted-foreground ml-2">{client.sector}</span>
                      </div>
                    </div>
                    <ChevronRight className="size-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <div className="grid grid-cols-3 gap-3 mb-3">
                    <div className="flex flex-col">
                      <span className="text-lg font-semibold font-mono text-foreground">{client.ventures}</span>
                      <span className="text-[10px] text-muted-foreground">ventures</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <VelocityRing score={client.velocity} size={36} />
                      <span className="text-[10px] text-muted-foreground mt-0.5">velocity</span>
                    </div>
                    <div className="flex flex-col items-end"><HealthBadge health={client.health} /></div>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-muted-foreground">Completion</span>
                      <span className="text-[10px] font-mono text-foreground">{client.completion}%</span>
                    </div>
                    <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                      <motion.div className="h-full rounded-full bg-primary" initial={{ width: 0 }} animate={{ width: `${client.completion}%` }} transition={{ duration: 1, delay: 0.3 + i * 0.1, ease: "easeOut" }} />
                    </div>
                  </div>
                  {/* Velocity trend sparkline */}
                  <div className="mt-2 pt-2 border-t border-border flex items-center justify-between">
                    <SparkLine data={[client.velocity - 12, client.velocity - 8, client.velocity - 5, client.velocity - 2, client.velocity]} color={client.health === "excellent" ? "#22C55E" : client.health === "good" ? "#3B82F6" : "#F59E0B"} />
                    <span className="text-[9px] font-mono text-muted-foreground">30d trend</span>
                  </div>
                  {client.overdue > 0 && (
                    <div className="mt-2 flex items-center gap-1.5">
                      <AlertTriangle className="size-3 text-amber-400" />
                      <span className="text-[10px] text-amber-400 font-medium">{client.overdue} overdue</span>
                    </div>
                  )}
                </div>
              </FadeIn>
            ))}
          </div>

          {/* Priority Tasks */}
          <div className="mt-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-foreground">Priority Tasks</h2>
              <span className="text-[10px] font-mono text-muted-foreground">{DEMO_TASKS.length} open</span>
            </div>
            <div className="bg-card border border-border rounded-lg divide-y divide-border">
              {DEMO_TASKS.map((task, i) => (
                <FadeIn key={i} delay={0.3 + i * 0.05}>
                  <div className="p-3 flex items-center justify-between hover:bg-accent/30 transition-colors cursor-default">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="size-5 rounded border border-border flex items-center justify-center shrink-0"><CheckCircle2 className="size-3 text-muted-foreground/30" /></div>
                      <div className="min-w-0">
                        <span className="text-xs font-medium text-foreground truncate block">{task.title}</span>
                        <span className="text-[10px] text-muted-foreground">{task.assignee} · {task.client}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <PriorityBadge priority={task.priority} />
                      <span className="text-[10px] font-mono text-muted-foreground">{task.due}</span>
                    </div>
                  </div>
                </FadeIn>
              ))}
            </div>
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-4">
          <FadeIn delay={0.2}>
            <SectionCard title="Velocity Intelligence" icon={<Brain className="size-4" />}>
              <div className="space-y-2">
                <div className="p-2.5 bg-primary/5 border border-primary/10 rounded-md">
                  <p className="text-[11px] text-foreground leading-relaxed">
                    <span className="text-primary font-medium">Insight:</span> Crestfield Capital's velocity increased 12% after AI agent automation was enabled. Recommend expanding to Harborview Group.
                  </p>
                </div>
                <div className="p-2.5 bg-amber-500/5 border border-amber-500/10 rounded-md">
                  <p className="text-[11px] text-foreground leading-relaxed">
                    <span className="text-amber-400 font-medium">Alert:</span> Solaris Holdings has 3 overdue tasks and declining velocity. Schedule a review call.
                  </p>
                </div>
              </div>
            </SectionCard>
          </FadeIn>

          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-foreground">Agent Activity</h2>
              <div className="flex items-center gap-1.5">
                <LivePulse />
                <span className="text-[10px] font-mono text-emerald-400">live</span>
                {agentThinking && <AgentThinkingDots />}
              </div>
            </div>
            <div className="bg-card border border-border rounded-lg divide-y divide-border overflow-hidden">
              <AnimatePresence initial={false}>
                {liveFeed.slice(0, 6).map((item, i) => (
                  <motion.div
                    key={`${item.id}-${item.detail}`}
                    initial={{ opacity: 0, height: 0, y: -10 }}
                    animate={{ opacity: 1, height: "auto", y: 0 }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.4, ease: "easeOut" }}
                    className="p-3 flex gap-3 cursor-default hover:bg-accent/30 transition-colors"
                  >
                    <div className="size-1.5 rounded-full mt-1.5 shrink-0" style={{ backgroundColor: item.color }} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-foreground">{item.action}</span>
                        <span className="text-[10px] font-mono text-muted-foreground">{item.time}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">{item.detail}</p>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>

          <FadeIn delay={0.6}>
            <SectionCard title="Active Agents" icon={<Cpu className="size-4" />}>
              <div className="space-y-2">
                {DEMO_AGENTS.map(a => (
                  <div key={a.name} className="flex items-center justify-between py-1.5">
                    <div className="flex items-center gap-2">
                      <div className="size-1.5 rounded-full" style={{ backgroundColor: a.color }} />
                      <span className="text-[11px] text-foreground">{a.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono text-muted-foreground">{a.actions} actions</span>
                      <span className="text-[10px] text-emerald-400 font-medium capitalize">{a.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            </SectionCard>
          </FadeIn>
        </div>
      </div>
    </div>
  );
}

/* ─── Activity View ─── */
function ActivityView() {
  const [filter, setFilter] = useState<string>("all");
  const types = ["all", "venture", "task", "distribution", "compliance", "document"];
  const filtered = filter === "all" ? DEMO_ACTIVITY : DEMO_ACTIVITY.filter(a => a.type === filter);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">Activity Log</h2>
        <span className="text-[10px] font-mono text-muted-foreground">{DEMO_ACTIVITY.length} events today</span>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total Events", value: "847", trend: "+12% this week" },
          { label: "Agent Actions", value: "312", trend: "4 agents active" },
          { label: "Human Actions", value: "535", trend: "7 team members" },
          { label: "Avg Response", value: "4.2m", trend: "-18% from last week" },
        ].map((s, i) => (
          <FadeIn key={s.label} delay={i * 0.05}>
            <div className="bg-card border border-border rounded-lg p-3">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{s.label}</span>
              <div className="text-lg font-semibold font-mono text-foreground mt-1">{s.value}</div>
              <span className="text-[10px] text-muted-foreground">{s.trend}</span>
            </div>
          </FadeIn>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-1 flex-wrap">
        {types.map(t => (
          <button key={t} onClick={() => setFilter(t)}
            className={cn("px-3 py-1.5 rounded-md text-[11px] font-medium transition-colors capitalize",
              filter === t ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
            )}>
            {t}
          </button>
        ))}
      </div>

      {/* Timeline */}
      <div className="bg-card border border-border rounded-lg divide-y divide-border">
        {filtered.map((event, i) => (
          <FadeIn key={event.id} delay={i * 0.03}>
            <div className="p-3 flex items-start gap-3 hover:bg-accent/30 transition-colors">
              <div className={cn("mt-0.5 shrink-0", event.color)}>{event.icon}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-medium text-foreground">{event.action}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground capitalize">{event.type}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{event.detail}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] text-muted-foreground">{event.user}</span>
                  <span className="text-[10px] font-mono text-muted-foreground/60">{event.time}</span>
                </div>
              </div>
            </div>
          </FadeIn>
        ))}
      </div>
    </div>
  );
}

/* ─── Oversight View ─── */
function OversightView() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">Portfolio Oversight</h2>
        <div className="flex items-center gap-1.5">
          <LivePulse />
          <span className="text-[10px] font-mono text-emerald-400">scanning</span>
        </div>
      </div>

      {/* Health Matrix */}
      <SectionCard title="Client Health Matrix" subtitle="Real-time health scoring across all clients" icon={<BarChart3 className="size-4" />}>
        <div className="space-y-3">
          {DEMO_CLIENTS.map((client, i) => (
            <FadeIn key={client.slug} delay={i * 0.05}>
              <div className="flex items-center gap-4 py-2 border-b border-border last:border-0">
                <div className="w-40 shrink-0">
                  <span className="text-xs font-medium text-foreground">{client.name}</span>
                </div>
                <div className="flex-1">
                  <div className="h-2 bg-secondary rounded-full overflow-hidden">
                    <motion.div className={cn("h-full rounded-full", client.health === "excellent" ? "bg-emerald-400" : client.health === "good" ? "bg-blue-400" : "bg-amber-400")}
                      initial={{ width: 0 }} animate={{ width: `${client.velocity}%` }} transition={{ duration: 1, delay: 0.2 + i * 0.1 }} />
                  </div>
                </div>
                <VelocityBadge rate={client.velocity} />
                <HealthBadge health={client.health} />
                <SparkLine data={[client.velocity - 15, client.velocity - 10, client.velocity - 5, client.velocity - 2, client.velocity]} color={client.health === "excellent" ? "#22C55E" : client.health === "good" ? "#3B82F6" : "#F59E0B"} />
                <span className="text-[10px] font-mono text-muted-foreground w-16 text-right">{client.overdue} overdue</span>
              </div>
            </FadeIn>
          ))}
        </div>
      </SectionCard>

      {/* Risk Alerts */}
      <SectionCard title="Active Risk Alerts" subtitle="Items requiring immediate attention" icon={<AlertTriangle className="size-4" />}>
        <div className="space-y-2">
          {[
            { level: "high", title: "Solaris Holdings velocity declining", detail: "3 overdue tasks, velocity dropped from 85% to 76% in 2 weeks", action: "Review call scheduled" },
            { level: "medium", title: "Ironclad Partners KYC expiring", detail: "KYC documents expire in 30 days — renewal process initiated", action: "Auto-reminder sent" },
            { level: "low", title: "Meridian distribution threshold exceeded", detail: "$2.4M Q1 distribution exceeds quarterly threshold by 15%", action: "Pending approval" },
          ].map((risk, i) => (
            <FadeIn key={i} delay={i * 0.1}>
              <div className={cn("p-3 rounded-md border", risk.level === "high" ? "bg-red-500/5 border-red-500/20" : risk.level === "medium" ? "bg-amber-500/5 border-amber-500/20" : "bg-blue-500/5 border-blue-500/20")}>
                <div className="flex items-center gap-2 mb-1">
                  <span className={cn("text-[10px] font-medium uppercase tracking-wider", risk.level === "high" ? "text-red-400" : risk.level === "medium" ? "text-amber-400" : "text-blue-400")}>{risk.level} risk</span>
                </div>
                <p className="text-xs font-medium text-foreground">{risk.title}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{risk.detail}</p>
                <div className="flex items-center gap-1.5 mt-2">
                  <CheckCircle2 className="size-3 text-emerald-400" />
                  <span className="text-[10px] text-emerald-400">{risk.action}</span>
                </div>
              </div>
            </FadeIn>
          ))}
        </div>
      </SectionCard>

      {/* Compliance Status */}
      <SectionCard title="Compliance Status" subtitle="Regulatory and documentation tracking" icon={<ShieldCheck className="size-4" />}>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { label: "KYC Current", value: "5/6", status: "1 expiring", color: "text-amber-400" },
            { label: "Annual Audits", value: "4/6", status: "2 pending", color: "text-blue-400" },
            { label: "Licenses", value: "6/6", status: "All current", color: "text-emerald-400" },
          ].map((item, i) => (
            <div key={i} className="p-3 bg-secondary/30 rounded-md">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{item.label}</span>
              <div className="text-lg font-semibold font-mono text-foreground mt-1">{item.value}</div>
              <span className={cn("text-[10px]", item.color)}>{item.status}</span>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}

/* ─── AI Concierge View ─── */
function ConciergeView() {
  return (
    <div className="space-y-4 h-full flex flex-col">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bot className="size-4 text-primary" />
          <h2 className="text-sm font-semibold text-foreground">AI Concierge</h2>
        </div>
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-medium">Claude 4.6 Sonnet</span>
      </div>

      {/* Chat messages */}
      <div className="flex-1 bg-card border border-border rounded-lg overflow-hidden flex flex-col">
        <div className="flex-1 p-4 space-y-4 overflow-y-auto">
          {DEMO_CHAT.map((msg, i) => (
            <FadeIn key={i} delay={i * 0.15}>
              <div className={cn("flex gap-3", msg.role === "user" ? "justify-end" : "")}>
                {msg.role === "assistant" && (
                  <div className="size-7 rounded-full bg-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                    <Bot className="size-3.5 text-primary" />
                  </div>
                )}
                <div className={cn("max-w-[80%] rounded-lg px-3 py-2.5", msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-secondary/50")}>
                  <p className="text-xs leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                </div>
              </div>
            </FadeIn>
          ))}
          {/* AI typing indicator */}
          <FadeIn delay={DEMO_CHAT.length * 0.15 + 0.3}>
            <div className="flex gap-3">
              <div className="size-7 rounded-full bg-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                <Bot className="size-3.5 text-primary" />
              </div>
              <div className="bg-secondary/50 rounded-lg px-4 py-3">
                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-muted-foreground mr-1">Analyzing portfolio data</span>
                  <AgentThinkingDots />
                </div>
              </div>
            </div>
          </FadeIn>
        </div>

        {/* Input */}
        <div className="border-t border-border p-3 flex items-center gap-2">
          <button className="size-8 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors">
            <Paperclip className="size-4" />
          </button>
          <div className="flex-1 relative">
            <input type="text" placeholder="Ask VENTEX anything about your portfolio..." disabled
              className="w-full h-9 px-3 text-xs bg-secondary/30 border border-border rounded-md text-muted-foreground placeholder:text-muted-foreground/50" />
          </div>
          <button className="size-8 rounded-md flex items-center justify-center bg-primary/20 text-primary">
            <Send className="size-4" />
          </button>
        </div>
      </div>

      {/* Suggested actions */}
      <div className="grid grid-cols-2 gap-2">
        {[
          "Draft follow-up for overdue tasks",
          "Summarize this week's activity",
          "Prepare distribution report",
          "Analyze portfolio velocity trends",
        ].map((action, i) => (
          <button key={i} className="p-2.5 text-left bg-card border border-border rounded-md text-[11px] text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors">
            <Sparkles className="size-3 text-primary inline mr-1.5" />
            {action}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ─── AI Agents View ─── */
function AgentsView() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">AI Agents</h2>
        <div className="flex items-center gap-1.5">
          <LivePulse />
          <span className="text-[10px] font-mono text-emerald-400">4 active</span>
        </div>
      </div>

      {/* Agent stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total Actions", value: "90", trend: "+23 today" },
          { label: "Avg Uptime", value: "99.8%", trend: "Last 30 days" },
          { label: "Auto-Resolved", value: "34", trend: "This week" },
          { label: "Escalations", value: "3", trend: "Pending review" },
        ].map((s, i) => (
          <FadeIn key={s.label} delay={i * 0.05}>
            <div className="bg-card border border-border rounded-lg p-3">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{s.label}</span>
              <div className="text-lg font-semibold font-mono text-foreground mt-1">{s.value}</div>
              <span className="text-[10px] text-muted-foreground">{s.trend}</span>
            </div>
          </FadeIn>
        ))}
      </div>

      {/* Agent cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {DEMO_AGENTS.map((agent, i) => (
          <FadeIn key={agent.name} delay={0.1 + i * 0.08}>
            <div className="bg-card border border-border rounded-lg p-4 hover:border-primary/30 transition-all">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="size-8 rounded-md flex items-center justify-center" style={{ backgroundColor: `${agent.color}15` }}>
                    <Cpu className="size-4" style={{ color: agent.color }} />
                  </div>
                  <div>
                    <span className="text-xs font-medium text-foreground">{agent.name}</span>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <LivePulse />
                      <span className="text-[10px] text-emerald-400 capitalize">{agent.status}</span>
                      {agent.status === "running" && <AgentThinkingDots />}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button className="size-6 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors">
                    <Pause className="size-3" />
                  </button>
                  <button className="size-6 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors">
                    <RefreshCw className="size-3" />
                  </button>
                </div>
              </div>

              <p className="text-[11px] text-muted-foreground mb-3">{agent.description}</p>

              <div className="grid grid-cols-3 gap-2 pt-3 border-t border-border">
                <div>
                  <span className="text-xs font-semibold font-mono text-foreground">{agent.actions}</span>
                  <span className="text-[10px] text-muted-foreground block">actions</span>
                </div>
                <div>
                  <span className="text-xs font-semibold font-mono text-foreground">{agent.uptime}</span>
                  <span className="text-[10px] text-muted-foreground block">uptime</span>
                </div>
                <div>
                  <span className="text-[10px] font-mono text-muted-foreground">{agent.lastActionTime}</span>
                  <span className="text-[10px] text-muted-foreground block">last action</span>
                </div>
              </div>

              <div className="mt-2 p-2 bg-secondary/30 rounded-md">
                <span className="text-[10px] text-muted-foreground">Latest: </span>
                <span className="text-[10px] text-foreground">{agent.lastAction}</span>
              </div>
            </div>
          </FadeIn>
        ))}
      </div>
    </div>
  );
}

/* ─── Blueprints View ─── */
function BlueprintsView() {
  const stages = ["Negotiation", "Due Diligence", "Active", "Closing"];
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">Venture Blueprints</h2>
        <span className="text-[10px] font-mono text-muted-foreground">{DEMO_BLUEPRINTS.length} ventures</span>
      </div>

      {/* Pipeline stats */}
      <div className="grid grid-cols-4 gap-3">
        {stages.map((stage, i) => {
          const count = DEMO_BLUEPRINTS.filter(b => b.stage === stage).length;
          return (
            <FadeIn key={stage} delay={i * 0.05}>
              <div className="bg-card border border-border rounded-lg p-3 text-center">
                <span className="text-lg font-semibold font-mono text-foreground">{count}</span>
                <span className="text-[10px] text-muted-foreground block">{stage}</span>
              </div>
            </FadeIn>
          );
        })}
      </div>

      {/* Kanban columns */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        {stages.map((stage, si) => (
          <FadeIn key={stage} delay={0.1 + si * 0.08}>
            <div className="space-y-2">
              <div className="flex items-center gap-2 px-1">
                <CircleDot className={cn("size-3", si === 0 ? "text-blue-400" : si === 1 ? "text-amber-400" : si === 2 ? "text-emerald-400" : "text-purple-400")} />
                <span className="text-[11px] font-semibold text-foreground">{stage}</span>
                <span className="text-[10px] font-mono text-muted-foreground ml-auto">{DEMO_BLUEPRINTS.filter(b => b.stage === stage).length}</span>
              </div>
              {DEMO_BLUEPRINTS.filter(b => b.stage === stage).map((bp, i) => (
                <div key={bp.name} className="bg-card border border-border rounded-lg p-3 hover:border-primary/30 transition-all cursor-default">
                  <span className="text-xs font-medium text-foreground block">{bp.name}</span>
                  <span className="text-[10px] text-muted-foreground">{bp.client}</span>
                  <div className="mt-2 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-muted-foreground">{bp.sector}</span>
                      <span className="text-[10px] font-mono text-foreground">{bp.progress}%</span>
                    </div>
                    <div className="h-1 bg-secondary rounded-full overflow-hidden">
                      <motion.div className="h-full rounded-full bg-primary" initial={{ width: 0 }} animate={{ width: `${bp.progress}%` }} transition={{ duration: 0.8, delay: 0.3 + i * 0.1 }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </FadeIn>
        ))}
      </div>
    </div>
  );
}

/* ─── Team View ─── */
function TeamView() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">VENTEX Team</h2>
        <span className="text-[10px] font-mono text-muted-foreground">{DEMO_TEAM.length} members</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Online", value: DEMO_TEAM.filter(t => t.status === "online").length, color: "text-emerald-400" },
          { label: "Away", value: DEMO_TEAM.filter(t => t.status === "away").length, color: "text-amber-400" },
          { label: "Offline", value: DEMO_TEAM.filter(t => t.status === "offline").length, color: "text-muted-foreground" },
          { label: "Total Tasks", value: DEMO_TEAM.reduce((a, t) => a + t.tasks, 0), color: "text-primary" },
        ].map((s, i) => (
          <FadeIn key={s.label} delay={i * 0.05}>
            <div className="bg-card border border-border rounded-lg p-3">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{s.label}</span>
              <div className={cn("text-lg font-semibold font-mono mt-1", s.color)}>{s.value}</div>
            </div>
          </FadeIn>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {DEMO_TEAM.map((member, i) => (
          <FadeIn key={member.name} delay={0.1 + i * 0.05}>
            <div className="bg-card border border-border rounded-lg p-4 hover:border-primary/30 transition-all cursor-default">
              <div className="flex items-center gap-3 mb-3">
                <div className="relative">
                  {(member as any).photo ? (
                    <img src={(member as any).photo} alt={member.name} className="size-12 rounded-full object-cover object-[center_20%] border-2 border-primary/20" />
                  ) : (
                    <div className="size-12 rounded-full bg-primary/20 flex items-center justify-center text-sm font-semibold text-primary">{member.avatar}</div>
                  )}
                  <span className={cn("absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-card",
                    member.status === "online" ? "bg-emerald-400" : member.status === "away" ? "bg-amber-400" : "bg-muted-foreground/40"
                  )} />
                </div>
                <div>
                  <span className="text-xs font-medium text-foreground">{member.name}</span>
                  <span className="text-[10px] text-muted-foreground block">{member.role}</span>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 pt-3 border-t border-border">
                <div>
                  <span className="text-xs font-semibold font-mono text-foreground">{member.ventures}</span>
                  <span className="text-[10px] text-muted-foreground block">ventures</span>
                </div>
                <div>
                  <span className="text-xs font-semibold font-mono text-foreground">{member.tasks}</span>
                  <span className="text-[10px] text-muted-foreground block">tasks</span>
                </div>
                <div>
                  <span className={cn("text-[10px] capitalize", member.status === "online" ? "text-emerald-400" : member.status === "away" ? "text-amber-400" : "text-muted-foreground")}>{member.status}</span>
                  <span className="text-[10px] text-muted-foreground block">status</span>
                </div>
              </div>
            </div>
          </FadeIn>
        ))}
      </div>
    </div>
  );
}

/* ─── Client Contacts View ─── */
function ContactsView() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">Client Contacts</h2>
        <span className="text-[10px] font-mono text-muted-foreground">{DEMO_CONTACTS.length} contacts</span>
      </div>

      <div className="bg-card border border-border rounded-lg divide-y divide-border">
        {DEMO_CONTACTS.map((contact, i) => (
          <FadeIn key={contact.name} delay={i * 0.05}>
            <div className="p-4 flex items-center justify-between hover:bg-accent/30 transition-colors cursor-default">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary">
                  {contact.name.split(" ").map(n => n[0]).join("")}
                </div>
                <div>
                  <span className="text-xs font-medium text-foreground">{contact.name}</span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] text-muted-foreground">{contact.role}</span>
                    <span className="text-[10px] text-primary">{contact.org}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Mail className="size-3" />
                  <span className="text-[10px] hidden sm:inline">{contact.email}</span>
                </div>
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Phone className="size-3" />
                  <span className="text-[10px] hidden sm:inline">{contact.phone}</span>
                </div>
              </div>
            </div>
          </FadeIn>
        ))}
      </div>
    </div>
  );
}

/* ─── Onboard Client View ─── */
function OnboardView() {
  const steps = [
    { label: "Client Information", description: "Company name, registration, jurisdiction", status: "complete" as const },
    { label: "KYC Documentation", description: "Identity verification, beneficial ownership", status: "complete" as const },
    { label: "Compliance Review", description: "AML screening, risk assessment", status: "current" as const },
    { label: "Account Setup", description: "Portal access, team invitations", status: "pending" as const },
    { label: "Venture Assignment", description: "Link ventures, set initial pipeline", status: "pending" as const },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">Onboard New Client</h2>
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">Step 3 of 5</span>
      </div>

      {/* Progress */}
      <div className="bg-card border border-border rounded-lg p-4">
        <div className="space-y-4">
          {steps.map((step, i) => (
            <FadeIn key={step.label} delay={i * 0.08}>
              <div className="flex items-start gap-3">
                <div className={cn("size-6 rounded-full flex items-center justify-center shrink-0 mt-0.5",
                  step.status === "complete" ? "bg-emerald-500/20" : step.status === "current" ? "bg-primary/20" : "bg-secondary"
                )}>
                  {step.status === "complete" ? <CheckCircle2 className="size-3.5 text-emerald-400" /> :
                   step.status === "current" ? <CircleDot className="size-3.5 text-primary" /> :
                   <span className="text-[10px] font-mono text-muted-foreground">{i + 1}</span>}
                </div>
                <div className="flex-1">
                  <span className={cn("text-xs font-medium", step.status === "pending" ? "text-muted-foreground" : "text-foreground")}>{step.label}</span>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{step.description}</p>
                </div>
                {step.status === "complete" && <span className="text-[10px] text-emerald-400">Done</span>}
                {step.status === "current" && <span className="text-[10px] text-primary">In Progress</span>}
              </div>
              {i < steps.length - 1 && <div className="ml-3 w-px h-4 bg-border" />}
            </FadeIn>
          ))}
        </div>
      </div>

      {/* Current step form preview */}
      <SectionCard title="Compliance Review" subtitle="AML screening and risk assessment" icon={<ShieldCheck className="size-4" />}>
        <div className="space-y-3">
          {[
            { label: "AML Screening", value: "Passed", status: "complete" },
            { label: "PEP Check", value: "Clear", status: "complete" },
            { label: "Sanctions Screening", value: "Clear", status: "complete" },
            { label: "Risk Assessment", value: "In Review", status: "pending" },
          ].map((item, i) => (
            <div key={i} className="flex items-center justify-between py-2 border-b border-border last:border-0">
              <span className="text-xs text-foreground">{item.label}</span>
              <span className={cn("text-[10px] font-medium", item.status === "complete" ? "text-emerald-400" : "text-amber-400")}>{item.value}</span>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}

/* ─── Drafts View ─── */
function DraftsView() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">Drafts</h2>
        <span className="text-[10px] font-mono text-muted-foreground">{DEMO_DRAFTS.length} drafts</span>
      </div>

      <div className="bg-card border border-border rounded-lg divide-y divide-border">
        {DEMO_DRAFTS.map((draft, i) => (
          <FadeIn key={draft.title} delay={i * 0.05}>
            <div className="p-4 flex items-center justify-between hover:bg-accent/30 transition-colors cursor-default">
              <div className="flex items-center gap-3">
                <div className={cn("size-8 rounded-md flex items-center justify-center",
                  draft.type === "email" ? "bg-blue-500/10" : draft.type === "report" ? "bg-purple-500/10" : "bg-amber-500/10"
                )}>
                  {draft.type === "email" ? <Mail className="size-4 text-blue-400" /> :
                   draft.type === "report" ? <BarChart3 className="size-4 text-purple-400" /> :
                   <FileText className="size-4 text-amber-400" />}
                </div>
                <div>
                  <span className="text-xs font-medium text-foreground">{draft.title}</span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] text-muted-foreground">To: {draft.to}</span>
                    <span className="text-[10px] font-mono text-muted-foreground">{draft.created}</span>
                  </div>
                </div>
              </div>
              <span className={cn("text-[10px] font-medium px-2 py-0.5 rounded-full",
                draft.status === "ready" ? "bg-emerald-500/10 text-emerald-400" : "bg-secondary text-muted-foreground"
              )}>
                {draft.status === "ready" ? "Ready to send" : "Draft"}
              </span>
            </div>
          </FadeIn>
        ))}
      </div>

      <div className="p-3 bg-primary/5 border border-primary/10 rounded-md">
        <div className="flex items-center gap-2">
          <Sparkles className="size-3.5 text-primary" />
          <span className="text-[11px] text-foreground">3 drafts were auto-generated by the AI Concierge based on your morning briefing.</span>
        </div>
      </div>
    </div>
  );
}

/* ─── Settings View ─── */
function SettingsView() {
  return (
    <div className="space-y-6">
      <h2 className="text-sm font-semibold text-foreground">Settings</h2>

      <SectionCard title="General" icon={<Settings className="size-4" />}>
        <div className="space-y-3">
          {[
            { label: "Organization Name", value: "Crestfield Venture Holding" },
            { label: "Primary Domain", value: "ventex.manus.space" },
            { label: "Time Zone", value: "UTC+4 (Dubai)" },
            { label: "Default Currency", value: "USD" },
          ].map((item, i) => (
            <div key={i} className="flex items-center justify-between py-2 border-b border-border last:border-0">
              <span className="text-xs text-muted-foreground">{item.label}</span>
              <span className="text-xs font-medium text-foreground">{item.value}</span>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Notifications" icon={<Bell className="size-4" />}>
        <div className="space-y-3">
          {[
            { label: "Email notifications", enabled: true },
            { label: "Overdue task alerts", enabled: true },
            { label: "Distribution approvals", enabled: true },
            { label: "Weekly summary digest", enabled: false },
          ].map((item, i) => (
            <div key={i} className="flex items-center justify-between py-2 border-b border-border last:border-0">
              <span className="text-xs text-foreground">{item.label}</span>
              <div className={cn("w-9 h-5 rounded-full relative transition-colors", item.enabled ? "bg-primary" : "bg-secondary")}>
                <div className={cn("absolute top-0.5 size-4 rounded-full bg-white transition-transform", item.enabled ? "left-[18px]" : "left-0.5")} />
              </div>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="AI Agent Configuration" icon={<Cpu className="size-4" />}>
        <div className="space-y-3">
          {[
            { label: "Auto-follow-up on overdue tasks", value: "Enabled — after 24h" },
            { label: "Velocity stall detection", value: "Enabled — 7 day threshold" },
            { label: "Distribution auto-flag threshold", value: "$500K per quarter" },
            { label: "KYC renewal reminder", value: "30 days before expiry" },
          ].map((item, i) => (
            <div key={i} className="flex items-center justify-between py-2 border-b border-border last:border-0">
              <span className="text-xs text-muted-foreground">{item.label}</span>
              <span className="text-xs font-medium text-foreground">{item.value}</span>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}

/* ─── Client Portal Demo View ─── */
function ClientPortalDemoView() {
  const STAGES = ["Negotiation", "Due Diligence", "Active", "Closing"];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-foreground">Welcome back, Marcus</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Crestfield Capital · Managed by VENTEX</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground">Last login: Today, 9:14 AM</span>
        </div>
      </div>

      {/* AI Briefing */}
      <FadeIn>
        <div className="bg-primary/5 border border-primary/10 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="size-4 text-primary" />
            <span className="text-[11px] font-semibold text-primary uppercase tracking-wider">AI Briefing</span>
            <LivePulse />
            <Annotation id="velocitySummary" annotations={CLIENT_ANNOTATIONS} />
          </div>
          <p className="text-sm text-foreground leading-relaxed">
            Your portfolio is performing well. Marina Bay Tower is ready for closing, and Pinnacle Tower II title transfer is ahead of schedule. One item needs your attention: Solaris Yacht Club has 3 overdue tasks.
          </p>
        </div>
      </FadeIn>

      {/* Action Needed */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle className="size-4 text-amber-400" />
          <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">Action Needed</h2>
          <Annotation id="actionNeeded" annotations={CLIENT_ANNOTATIONS} />
          <span className="text-[11px] text-amber-400 ml-auto font-medium">{CLIENT_DEMO_FEED.length} items</span>
        </div>
        <div className="space-y-2">
          {CLIENT_DEMO_FEED.map((item, i) => (
            <FadeIn key={item.id} delay={i * 0.05}>
              <div className="bg-card border border-amber-500/20 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <div className="size-2 rounded-full bg-amber-400 mt-2 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium text-foreground mb-1">{item.ventureName}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{item.summary}</p>
                    <span className="text-[11px] text-muted-foreground/50 mt-1 block">{item.date}</span>
                  </div>
                  <button className="flex-shrink-0 px-3 py-1.5 text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-md hover:bg-amber-500/20 transition-colors">
                    {item.actionLabel}
                  </button>
                </div>
              </div>
            </FadeIn>
          ))}
        </div>
      </section>

      {/* Completed */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <CheckCircle2 className="size-4 text-emerald-400" />
          <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">Completed</h2>
          <Annotation id="completed" annotations={CLIENT_ANNOTATIONS} />
          <span className="text-[11px] text-muted-foreground ml-auto">{CLIENT_DEMO_COMPLETED.length} updates</span>
        </div>
        <div className="bg-card border border-emerald-500/15 rounded-xl divide-y divide-border">
          {CLIENT_DEMO_COMPLETED.map((item, i) => (
            <FadeIn key={item.id} delay={i * 0.03}>
              <div className="p-4 flex items-start gap-3">
                <div className="size-1.5 rounded-full mt-2 flex-shrink-0 bg-emerald-400" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground leading-relaxed">{item.summary}</p>
                  <div className="flex items-center gap-3 mt-1.5">
                    <span className="text-[11px] text-muted-foreground">{item.ventureName}</span>
                    <span className="text-[11px] text-muted-foreground/60">{item.date}</span>
                  </div>
                </div>
              </div>
            </FadeIn>
          ))}
        </div>
      </section>

      {/* Portfolio */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Briefcase className="size-4 text-primary" />
          <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">Your Portfolio</h2>
          <Annotation id="portfolio" annotations={CLIENT_ANNOTATIONS} />
          <span className="text-[11px] text-muted-foreground ml-auto">{CLIENT_DEMO_PORTFOLIO.length} ventures</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {CLIENT_DEMO_PORTFOLIO.map((v, i) => (
            <FadeIn key={v.id} delay={0.05 + i * 0.04}>
              <div className="bg-card border border-border rounded-xl p-4 hover:border-primary/20 transition-colors group">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">{SECTOR_ICONS[v.sector] || <Package className="size-4" />}</span>
                    <span className="text-xs text-muted-foreground">{v.sector}</span>
                  </div>
                  <ChevronRight className="size-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <h3 className="text-sm font-medium text-foreground mb-1">{v.name}</h3>
                <p className="text-xs text-muted-foreground mb-2">{v.statusLine}</p>

                {/* Stage indicator */}
                <div className="space-y-1.5 mb-3">
                  <div className="flex items-center gap-1">
                    {STAGES.map((stage, si) => {
                      const stageIdx = STAGES.indexOf(v.stage);
                      const isCurrent = si === stageIdx;
                      const isPast = si < stageIdx;
                      return (
                        <div key={stage} className="flex-1">
                          <div className={cn("h-1.5 rounded-full", isPast ? "bg-primary" : isCurrent ? "bg-primary/60" : "bg-secondary")} />
                        </div>
                      );
                    })}
                  </div>
                  <span className="text-[10px] text-muted-foreground/60">{v.stage}</span>
                </div>

                {/* Momentum */}
                {v.momentum && (
                  <div className="pt-3 border-t border-border">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5">
                        <Zap className={cn("size-3",
                          v.momentum.velocityVsBenchmark === "faster" ? "text-emerald-400" :
                          v.momentum.velocityVsBenchmark === "slower" ? "text-red-400" : "text-amber-400"
                        )} />
                        <span className="text-[10px] font-medium text-foreground">{v.momentum.projectedDays}d projected</span>
                      </div>
                      <span className={cn("text-[9px] font-medium px-1.5 py-0.5 rounded-full",
                        v.momentum.velocityVsBenchmark === "faster" ? "bg-emerald-500/10 text-emerald-400" :
                        v.momentum.velocityVsBenchmark === "slower" ? "bg-red-500/10 text-red-400" :
                        "bg-amber-500/10 text-amber-400"
                      )}>
                        {v.momentum.velocityVsBenchmark === "faster" ? "↑ Ahead" : v.momentum.velocityVsBenchmark === "slower" ? "↓ Behind" : "→ On pace"}
                        {v.momentum.benchmarkDays ? ` vs ${v.momentum.benchmarkDays}d avg` : ""}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-muted rounded-full h-1">
                        <div className={cn("h-1 rounded-full transition-all duration-500",
                          v.momentum.confidence >= 70 ? "bg-emerald-400" : v.momentum.confidence >= 40 ? "bg-amber-400" : "bg-red-400"
                        )} style={{ width: `${Math.min(v.momentum.confidence, 100)}%` }} />
                      </div>
                      <span className="text-[9px] font-mono text-muted-foreground">{v.momentum.confidence}%</span>
                    </div>
                    {(v.momentum as any).riskFactors && (v.momentum as any).riskFactors.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {(v.momentum as any).riskFactors.slice(0, 2).map((rf: string, j: number) => (
                          <span key={j} className="text-[9px] px-1.5 py-0.5 rounded bg-red-500/5 text-red-400/80">{rf}</span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </FadeIn>
          ))}
        </div>
      </section>

      {/* Portfolio Health */}
      <FadeIn>
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Zap className="size-4 text-primary" />
            <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">Portfolio Health</h2>
            <Annotation id="health" annotations={CLIENT_ANNOTATIONS} />
          </div>
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <VelocityRing score={82} size={64} />
                <div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold font-mono tracking-tight text-emerald-400">82</span>
                    <span className="text-xs text-muted-foreground">/100</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Overall portfolio health score</p>
                </div>
              </div>
              <div className="text-right">
                <div className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-400">
                  <LivePulse />
                  ↑ improving
                </div>
                <p className="text-[11px] text-amber-400 mt-1">1 venture at risk</p>
              </div>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <motion.div className="h-2 rounded-full bg-emerald-400" initial={{ width: 0 }} animate={{ width: "82%" }} transition={{ duration: 1, delay: 0.3 }} />
            </div>
            {/* Mini sparklines per venture */}
            <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-border">
              {[{ name: "Marina Bay", score: 92, data: [70, 75, 80, 85, 88, 90, 92] }, { name: "Meridian F&B", score: 78, data: [60, 65, 68, 72, 74, 76, 78] }, { name: "Pacific Yacht", score: 54, data: [72, 68, 65, 60, 58, 55, 54] }].map(v => (
                <div key={v.name} className="text-center">
                  <SparkLine data={v.data} color={v.score >= 70 ? "#22C55E" : v.score >= 50 ? "#F59E0B" : "#EF4444"} />
                  <div className="text-[10px] text-muted-foreground mt-1">{v.name}</div>
                  <div className="text-xs font-mono font-semibold" style={{ color: v.score >= 70 ? "#22C55E" : v.score >= 50 ? "#F59E0B" : "#EF4444" }}>{v.score}</div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </FadeIn>

      {/* Forecasts */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Clock className="size-4 text-primary" />
          <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">Venture Forecasts</h2>
          <Annotation id="forecasts" annotations={CLIENT_ANNOTATIONS} />
          <span className="text-[11px] text-muted-foreground ml-auto">AI-projected timelines</span>
        </div>
        <div className="space-y-2">
          {CLIENT_DEMO_FORECASTS.map((f, i) => (
            <FadeIn key={f.ventureName} delay={i * 0.04}>
              <div className="bg-card border border-border rounded-xl p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="text-sm font-medium text-foreground">{f.ventureName}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">Projected: <span className="font-mono">{f.projectedDays}</span> days to next status</p>
                  </div>
                  <div className={cn("px-2 py-0.5 rounded-full text-[10px] font-medium",
                    f.riskLevel === "low" ? "bg-emerald-500/10 text-emerald-400" :
                    f.riskLevel === "medium" ? "bg-amber-500/10 text-amber-400" : "bg-red-500/10 text-red-400"
                  )}>{f.riskLevel} risk</div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-1 bg-muted rounded-full h-1.5">
                    <motion.div className="h-1.5 rounded-full bg-primary/60" initial={{ width: 0 }} animate={{ width: `${Math.min(f.confidence, 100)}%` }} transition={{ duration: 0.8, delay: 0.2 + i * 0.1 }} />
                  </div>
                  <span className="text-[10px] font-mono text-muted-foreground">{f.confidence}% confidence</span>
                </div>
                {f.riskFactors && f.riskFactors.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {f.riskFactors.map((rf, j) => (
                      <span key={j} className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{rf}</span>
                    ))}
                  </div>
                )}
              </div>
            </FadeIn>
          ))}
        </div>
      </section>

      {/* Market Intelligence */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <ArrowRight className="size-4 text-primary" />
          <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">Market Intelligence</h2>
          <Annotation id="market" annotations={CLIENT_ANNOTATIONS} />
          <span className="text-[11px] text-muted-foreground ml-auto">Sector signals</span>
        </div>
        <div className="space-y-2">
          {CLIENT_DEMO_SIGNALS.map((s, i) => (
            <FadeIn key={i} delay={i * 0.04}>
              <div className="bg-card border border-border rounded-xl p-4">
                <div className="flex items-start justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">{SECTOR_ICONS[s.sector] || <Package className="size-4" />}</span>
                    <span className="text-[11px] text-muted-foreground">{s.sector}</span>
                    <span className={cn("text-[10px] px-1.5 py-0.5 rounded",
                      s.signalType === "opportunity" ? "bg-emerald-500/10 text-emerald-400" :
                      s.signalType === "regulatory" ? "bg-amber-500/10 text-amber-400" :
                      "bg-red-500/10 text-red-400"
                    )}>{s.signalType}</span>
                  </div>
                  <span className="text-[10px] font-mono text-muted-foreground">{s.relevance}% relevant</span>
                </div>
                <h3 className="text-sm font-medium text-foreground mb-1">{s.headline}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{s.impact}</p>
              </div>
            </FadeIn>
          ))}
        </div>
      </section>

      {/* AI Chat hint */}
      <FadeIn>
        <div className="bg-card border border-primary/20 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <MessageSquare className="size-4 text-primary" />
            <span className="text-[11px] font-semibold text-primary uppercase tracking-wider">Portfolio Assistant</span>
            <LivePulse />
            <Annotation id="chat" annotations={CLIENT_ANNOTATIONS} />
          </div>
          <p className="text-xs text-muted-foreground mb-3">Clients have a personal AI assistant that can answer questions about their portfolio in real-time.</p>
          <div className="bg-secondary/30 rounded-lg p-3 space-y-2">
            <div className="flex justify-start">
              <div className="bg-secondary/50 rounded-lg px-3 py-2 max-w-[85%]">
                <p className="text-xs text-foreground">What's the status of Marina Bay Tower?</p>
              </div>
            </div>
            <div className="flex justify-end">
              <div className="bg-primary text-primary-foreground rounded-lg px-3 py-2 max-w-[85%]">
                <p className="text-xs">Marina Bay Tower is in the Closing stage. Final documents are under review, and the projected completion is 12 days. The deal is ahead of the 21-day benchmark.</p>
              </div>
            </div>
          </div>
        </div>
      </FadeIn>

      {/* Footer */}
      <div className="pt-4 pb-8 text-center">
        <p className="text-[11px] text-muted-foreground/40">Managed by VENTEX · Powered by Aurovia</p>
      </div>
    </div>
  );
}

/* ─── CLIENT TAB VIEWS ─── */

function ClientVenturesView() {
  const STAGES = ["Negotiation", "Due Diligence", "Active", "Closing"];
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">My Ventures</h2>
          <p className="text-xs text-muted-foreground mt-0.5">{CLIENT_DEMO_PORTFOLIO.length} active ventures across your portfolio</p>
        </div>
        <div className="flex items-center gap-2">
          <Annotation id="portfolio" annotations={CLIENT_ANNOTATIONS} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {CLIENT_DEMO_PORTFOLIO.map((v, i) => (
          <FadeIn key={v.id} delay={i * 0.05}>
            <div className="bg-card border border-border rounded-xl p-5 hover:border-primary/20 transition-colors">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-muted-foreground">{SECTOR_ICONS[v.sector] || <Package className="size-4" />}</span>
                    <span className="text-[11px] text-muted-foreground">{v.sector}</span>
                  </div>
                  <h3 className="text-sm font-semibold text-foreground">{v.name}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">{v.statusLine}</p>
                </div>
                <div className={cn("px-2.5 py-1 rounded-full text-[11px] font-medium",
                  v.stage === "Closing" ? "bg-emerald-500/10 text-emerald-400" :
                  v.stage === "Active" ? "bg-blue-500/10 text-blue-400" :
                  v.stage === "Due Diligence" ? "bg-amber-500/10 text-amber-400" :
                  "bg-secondary text-muted-foreground"
                )}>{v.stage}</div>
              </div>

              {/* Stage progress */}
              <div className="flex items-center gap-1 mb-3">
                {STAGES.map((stage, si) => {
                  const stageIdx = STAGES.indexOf(v.stage);
                  const isPast = si < stageIdx;
                  const isCurrent = si === stageIdx;
                  return (
                    <div key={stage} className="flex-1">
                      <div className={cn("h-1.5 rounded-full", isPast ? "bg-primary" : isCurrent ? "bg-primary/60" : "bg-secondary")} />
                    </div>
                  );
                })}
              </div>

              {/* Momentum */}
              {v.momentum && (
                <div className="pt-3 border-t border-border">
                  <div className="grid grid-cols-4 gap-4">
                    <div className="flex items-center gap-2">
                      <VelocityRing score={v.momentum.confidence} size={36} />
                      <div>
                        <span className="text-[10px] text-muted-foreground block">Confidence</span>
                        <span className="text-sm font-mono font-medium text-foreground">{v.momentum.confidence}%</span>
                      </div>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground block">Projected</span>
                      <span className="text-sm font-mono font-medium text-foreground">{v.momentum.projectedDays}d</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground block">vs Benchmark</span>
                      <span className={cn("text-sm font-mono font-medium",
                        v.momentum.velocityVsBenchmark === "faster" ? "text-emerald-400" :
                        v.momentum.velocityVsBenchmark === "slower" ? "text-red-400" : "text-amber-400"
                      )}>
                        {v.momentum.velocityVsBenchmark === "faster" ? "↑ Ahead" : v.momentum.velocityVsBenchmark === "slower" ? "↓ Behind" : "→ On pace"}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground block">Trend</span>
                      <SparkLine data={[v.momentum.confidence - 15, v.momentum.confidence - 10, v.momentum.confidence - 5, v.momentum.confidence - 2, v.momentum.confidence]} color={v.momentum.velocityVsBenchmark === "faster" ? "#22C55E" : v.momentum.velocityVsBenchmark === "slower" ? "#EF4444" : "#F59E0B"} />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </FadeIn>
        ))}
      </div>
    </div>
  );
}

function ClientDocumentsView() {
  const DOCS = [
    { name: "Marina Bay Tower — Purchase Agreement", type: "Legal", date: "Mar 28, 2026", status: "signed" as const, size: "2.4 MB" },
    { name: "Q1 2026 Portfolio Report", type: "Report", date: "Mar 31, 2026", status: "ready" as const, size: "1.8 MB" },
    { name: "Ironclad Refinery — Environmental Assessment", type: "Compliance", date: "Mar 15, 2026", status: "pending" as const, size: "4.1 MB" },
    { name: "Dubai Creek Residences — Due Diligence Pack", type: "Legal", date: "Mar 10, 2026", status: "signed" as const, size: "8.7 MB" },
    { name: "Solaris Yacht Club — Survey Report", type: "Technical", date: "Feb 28, 2026", status: "ready" as const, size: "3.2 MB" },
    { name: "Annual Tax Summary 2025", type: "Financial", date: "Feb 15, 2026", status: "signed" as const, size: "1.1 MB" },
    { name: "Pinnacle Tower II — Title Transfer Docs", type: "Legal", date: "Apr 02, 2026", status: "pending" as const, size: "5.6 MB" },
    { name: "Harborview Culinary District — Construction Progress", type: "Report", date: "Mar 20, 2026", status: "ready" as const, size: "2.9 MB" },
  ];

  const statusCfg = {
    signed: { bg: "bg-emerald-500/10", text: "text-emerald-400", label: "Signed" },
    ready: { bg: "bg-blue-500/10", text: "text-blue-400", label: "Ready" },
    pending: { bg: "bg-amber-500/10", text: "text-amber-400", label: "Pending" },
  };

  const typeCfg: Record<string, string> = {
    Legal: "text-purple-400",
    Report: "text-blue-400",
    Compliance: "text-amber-400",
    Financial: "text-emerald-400",
    Technical: "text-cyan-400",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Documents</h2>
          <p className="text-xs text-muted-foreground mt-0.5">{DOCS.length} documents in your vault</p>
        </div>
        <Annotation id="portfolio" annotations={CLIENT_ANNOTATIONS} />
      </div>

      <div className="bg-card border border-border rounded-xl divide-y divide-border">
        {DOCS.map((doc, i) => {
          const sc = statusCfg[doc.status];
          return (
            <FadeIn key={i} delay={i * 0.03}>
              <div className="p-4 flex items-center gap-4 hover:bg-accent/20 transition-colors cursor-pointer">
                <div className="size-10 rounded-lg bg-secondary/50 flex items-center justify-center flex-shrink-0">
                  <FileText className={cn("size-5", typeCfg[doc.type] || "text-muted-foreground")} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-medium text-foreground truncate">{doc.name}</h3>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className={cn("text-[10px] font-medium", typeCfg[doc.type] || "text-muted-foreground")}>{doc.type}</span>
                    <span className="text-[10px] text-muted-foreground">{doc.date}</span>
                    <span className="text-[10px] text-muted-foreground/60">{doc.size}</span>
                  </div>
                </div>
                <span className={cn("text-[10px] font-medium px-2 py-0.5 rounded-full", sc.bg, sc.text)}>{sc.label}</span>
              </div>
            </FadeIn>
          );
        })}
      </div>
    </div>
  );
}

function ClientDistributionsView() {
  const DISTRIBUTIONS = [
    { venture: "Marina Bay Tower", type: "Quarterly Dividend", amount: 2400000, date: "Mar 31, 2026", status: "pending" as const },
    { venture: "Pinnacle Tower II", type: "Capital Return", amount: 1800000, date: "Mar 15, 2026", status: "paid" as const },
    { venture: "Harborview Culinary District", type: "Quarterly Dividend", amount: 950000, date: "Mar 31, 2026", status: "paid" as const },
    { venture: "Dubai Creek Residences", type: "Interest Payment", amount: 620000, date: "Feb 28, 2026", status: "paid" as const },
    { venture: "Ironclad Refinery", type: "Quarterly Dividend", amount: 1200000, date: "Jan 15, 2026", status: "paid" as const },
  ];

  const totalPaid = DISTRIBUTIONS.filter(d => d.status === "paid").reduce((s, d) => s + d.amount, 0);
  const totalPending = DISTRIBUTIONS.filter(d => d.status === "pending").reduce((s, d) => s + d.amount, 0);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Distributions</h2>
        <p className="text-xs text-muted-foreground mt-0.5">Track your investment returns and upcoming payments</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <FadeIn>
          <div className="bg-card border border-border rounded-xl p-4">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Total Paid</span>
            <div className="text-xl font-bold font-mono text-emerald-400 mt-1">${(totalPaid / 1000000).toFixed(1)}M</div>
          </div>
        </FadeIn>
        <FadeIn delay={0.05}>
          <div className="bg-card border border-border rounded-xl p-4">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Pending</span>
            <div className="text-xl font-bold font-mono text-amber-400 mt-1">${(totalPending / 1000000).toFixed(1)}M</div>
          </div>
        </FadeIn>
        <FadeIn delay={0.1}>
          <div className="bg-card border border-border rounded-xl p-4">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Total YTD</span>
            <div className="text-xl font-bold font-mono text-foreground mt-1">${((totalPaid + totalPending) / 1000000).toFixed(1)}M</div>
          </div>
        </FadeIn>
      </div>

      {/* Distribution list */}
      <div className="bg-card border border-border rounded-xl divide-y divide-border">
        {DISTRIBUTIONS.map((d, i) => (
          <FadeIn key={i} delay={i * 0.04}>
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={cn("size-2 rounded-full flex-shrink-0", d.status === "paid" ? "bg-emerald-400" : "bg-amber-400")} />
                <div>
                  <h3 className="text-sm font-medium text-foreground">{d.venture}</h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[11px] text-muted-foreground">{d.type}</span>
                    <span className="text-[10px] text-muted-foreground/60">{d.date}</span>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <span className="text-sm font-mono font-semibold text-foreground">${(d.amount / 1000000).toFixed(2)}M</span>
                <span className={cn("block text-[10px] font-medium mt-0.5",
                  d.status === "paid" ? "text-emerald-400" : "text-amber-400"
                )}>{d.status === "paid" ? "Paid" : "Pending Approval"}</span>
              </div>
            </div>
          </FadeIn>
        ))}
      </div>
    </div>
  );
}

function ClientReportsView() {
  const REPORTS = [
    { title: "Q1 2026 Portfolio Performance", period: "Jan – Mar 2026", type: "Quarterly", generated: "Apr 01, 2026", highlights: ["Portfolio velocity: 89/100", "4 ventures advanced stages", "$4.57M distributed"] },
    { title: "Annual Review 2025", period: "Jan – Dec 2025", type: "Annual", generated: "Jan 15, 2026", highlights: ["12 ventures completed", "$28.4M total distributions", "Average velocity: 84/100"] },
    { title: "Risk Assessment Report", period: "Mar 2026", type: "Monthly", generated: "Mar 31, 2026", highlights: ["1 high-risk venture flagged", "3 compliance items due", "Overall risk: Low"] },
    { title: "Tax Summary 2025", period: "FY 2025", type: "Annual", generated: "Feb 15, 2026", highlights: ["Total capital gains: $8.2M", "Dividend income: $12.1M", "Withholding tax: $1.4M"] },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Reports & Analytics</h2>
        <p className="text-xs text-muted-foreground mt-0.5">AI-generated reports on your portfolio performance</p>
      </div>

      <div className="space-y-3">
        {REPORTS.map((r, i) => (
          <FadeIn key={i} delay={i * 0.05}>
            <div className="bg-card border border-border rounded-xl p-5 hover:border-primary/20 transition-colors cursor-pointer group">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">{r.title}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[11px] text-muted-foreground">{r.period}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">{r.type}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                  <ExternalLink className="size-3.5" />
                  <span className="text-[10px]">View</span>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {r.highlights.map((h, j) => (
                  <span key={j} className="text-[10px] px-2 py-1 rounded-md bg-primary/5 text-primary/80 border border-primary/10">{h}</span>
                ))}
              </div>
              <p className="text-[10px] text-muted-foreground/50 mt-3">Generated {r.generated}</p>
            </div>
          </FadeIn>
        ))}
      </div>
    </div>
  );
}

function ClientMessagesView() {
  const THREADS = [
    { from: "VENTEX Operator", role: "VENTEX Operator", subject: "Marina Bay Tower — Closing Timeline Update", preview: "Hi Marcus, the closing documents are ready for your review. We've expedited the title transfer and expect completion within 12 days...", time: "2h ago", unread: true },
    { from: "VENTEX AI", role: "Portfolio Assistant", subject: "Weekly Portfolio Digest", preview: "Your portfolio health score improved to 82/100 this week. Key highlights: Marina Bay Tower advancing to closing, Harborview Culinary District at 68%...", time: "1d ago", unread: true },
    { from: "Lena Park", role: "Finance & Distributions", subject: "Q1 Distribution Confirmation Required", preview: "Dear Marcus, the Q1 distribution of $2.4M for Harborview Culinary District is ready for your confirmation. Please review the attached breakdown...", time: "2d ago", unread: false },
    { from: "Brian Chen", role: "Operations Lead", subject: "Solaris Yacht Club — Survey Rescheduled", preview: "We've rescheduled the structural survey for Solaris Yacht Club to next Tuesday. The vendor confirmed availability and we'll have results within 48 hours...", time: "3d ago", unread: false },
    { from: "VENTEX Compliance", role: "Legal & Compliance", subject: "KYC Renewal — Documents Received", preview: "Thank you for submitting the updated KYC documents. Everything looks good and we've updated your compliance status accordingly...", time: "5d ago", unread: false },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Messages</h2>
          <p className="text-xs text-muted-foreground mt-0.5">{THREADS.filter(t => t.unread).length} unread messages</p>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl divide-y divide-border">
        {THREADS.map((t, i) => (
          <FadeIn key={i} delay={i * 0.04}>
            <div className={cn("p-4 hover:bg-accent/20 transition-colors cursor-pointer", t.unread && "bg-primary/[0.02]")}>
              <div className="flex items-start gap-3">
                {t.unread && <div className="size-2 rounded-full bg-primary mt-2 flex-shrink-0" />}
                {!t.unread && <div className="size-2 rounded-full bg-transparent mt-2 flex-shrink-0" />}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className={cn("text-sm", t.unread ? "font-semibold text-foreground" : "font-medium text-foreground/80")}>{t.from}</span>
                    <span className="text-[10px] text-muted-foreground">{t.role}</span>
                    <span className="text-[10px] text-muted-foreground/60 ml-auto flex-shrink-0">{t.time}</span>
                  </div>
                  <h3 className={cn("text-xs mb-0.5", t.unread ? "font-medium text-foreground" : "text-foreground/70")}>{t.subject}</h3>
                  <p className="text-xs text-muted-foreground truncate">{t.preview}</p>
                </div>
              </div>
            </div>
          </FadeIn>
        ))}
      </div>
    </div>
  );
}

function ClientSettingsView() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Account Settings</h2>
        <p className="text-xs text-muted-foreground mt-0.5">Manage your profile and notification preferences</p>
      </div>

      {/* Profile */}
      <FadeIn>
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Profile Information</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { label: "Full Name", value: "Marcus Hale" },
              { label: "Email", value: "marcus@crestfield.com" },
              { label: "Organization", value: "Crestfield Capital" },
              { label: "Phone", value: "+971 50 XXX XXXX" },
              { label: "Role", value: "Principal Investor" },
              { label: "Member Since", value: "January 2024" },
            ].map((f, i) => (
              <div key={i}>
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground block mb-1">{f.label}</span>
                <span className="text-sm text-foreground">{f.value}</span>
              </div>
            ))}
          </div>
        </div>
      </FadeIn>

      {/* Notifications */}
      <FadeIn delay={0.05}>
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Notification Preferences</h3>
          <div className="space-y-3">
            {[
              { label: "Venture Status Updates", desc: "Get notified when ventures change stages", enabled: true },
              { label: "Distribution Alerts", desc: "Notifications for upcoming and completed distributions", enabled: true },
              { label: "Document Ready", desc: "Alert when new documents are available for review", enabled: true },
              { label: "Weekly Portfolio Digest", desc: "AI-generated weekly summary of your portfolio", enabled: true },
              { label: "Market Intelligence", desc: "Sector signals and opportunity alerts", enabled: false },
            ].map((n, i) => (
              <div key={i} className="flex items-center justify-between py-2">
                <div>
                  <span className="text-sm text-foreground">{n.label}</span>
                  <p className="text-[11px] text-muted-foreground">{n.desc}</p>
                </div>
                <div className={cn("w-10 h-5 rounded-full transition-colors cursor-pointer relative",
                  n.enabled ? "bg-primary" : "bg-secondary"
                )}>
                  <div className={cn("absolute top-0.5 size-4 rounded-full bg-white transition-transform",
                    n.enabled ? "translate-x-5" : "translate-x-0.5"
                  )} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </FadeIn>

      {/* Security */}
      <FadeIn delay={0.1}>
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Security</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2">
              <div>
                <span className="text-sm text-foreground">Two-Factor Authentication</span>
                <p className="text-[11px] text-emerald-400">Enabled</p>
              </div>
              <ShieldCheck className="size-4 text-emerald-400" />
            </div>
            <div className="flex items-center justify-between py-2">
              <div>
                <span className="text-sm text-foreground">Last Login</span>
                <p className="text-[11px] text-muted-foreground">Today, 9:14 AM — Dubai, UAE</p>
              </div>
            </div>
            <div className="flex items-center justify-between py-2">
              <div>
                <span className="text-sm text-foreground">Active Sessions</span>
                <p className="text-[11px] text-muted-foreground">2 devices</p>
              </div>
            </div>
          </div>
        </div>
      </FadeIn>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/* ─── MAIN COMPONENT ─── */
/* ═══════════════════════════════════════════════════════════════════════════ */

export default function DemoDashboard() {
  const [, navigate] = useLocation();
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<TabId>("dashboard");
  const [demoView, setDemoView] = useState<DemoView>("admin");
  const [clientTab, setClientTab] = useState<ClientTabId>("overview");

  // Guided tour state
  const [tourActive, setTourActive] = useState(false);
  const [tourStep, setTourStep] = useState(0);
  const [tourPlaying, setTourPlaying] = useState(true);
  const [tourProgress, setTourProgress] = useState(0);
  const tourTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Tour auto-advance
  useEffect(() => {
    if (!tourActive || !tourPlaying) {
      if (tourTimerRef.current) clearInterval(tourTimerRef.current);
      return;
    }
    const step = TOUR_STEPS[tourStep];
    if (!step) return;
    const totalMs = step.duration * 1000;
    const tickMs = 100;
    let elapsed = 0;
    setTourProgress(0);
    tourTimerRef.current = setInterval(() => {
      elapsed += tickMs;
      setTourProgress(Math.min((elapsed / totalMs) * 100, 100));
      if (elapsed >= totalMs) {
        if (tourStep < TOUR_STEPS.length - 1) {
          setTourStep(prev => prev + 1);
        } else {
          setTourActive(false);
          setTourPlaying(false);
        }
      }
    }, tickMs);
    return () => { if (tourTimerRef.current) clearInterval(tourTimerRef.current); };
  }, [tourActive, tourPlaying, tourStep]);

  // Sync tour step to view/tab
  useEffect(() => {
    if (!tourActive) return;
    const step = TOUR_STEPS[tourStep];
    if (!step) return;
    setDemoView(step.view);
    if (step.view === "admin") {
      setActiveTab(step.tab as TabId);
    } else {
      setClientTab(step.tab as ClientTabId);
    }
  }, [tourStep, tourActive]);

  const startTour = useCallback(() => {
    setTourStep(0);
    setTourActive(true);
    setTourPlaying(true);
    setTourProgress(0);
    setDemoView("admin");
    setActiveTab("dashboard");
  }, []);

  const tourNext = useCallback(() => {
    if (tourStep < TOUR_STEPS.length - 1) {
      setTourStep(prev => prev + 1);
      setTourProgress(0);
    }
  }, [tourStep]);

  const tourPrev = useCallback(() => {
    if (tourStep > 0) {
      setTourStep(prev => prev - 1);
      setTourProgress(0);
    }
  }, [tourStep]);

  const tourTogglePlay = useCallback(() => {
    setTourPlaying(prev => !prev);
    setTourProgress(0);
  }, []);

  const tourClose = useCallback(() => {
    setTourActive(false);
    setTourPlaying(false);
    if (tourTimerRef.current) clearInterval(tourTimerRef.current);
  }, []);

  // Live velocity simulation
  const [liveFeed, setLiveFeed] = useState(DEMO_FEED);
  const [agentThinking, setAgentThinking] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);
  const liveEventIdx = useRef(0);

  // Live feed: append new agent actions every 8-12 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      const evt = LIVE_EVENTS[liveEventIdx.current % LIVE_EVENTS.length];
      liveEventIdx.current++;

      // Show thinking dots
      setAgentThinking(true);
      setTimeout(() => {
        setAgentThinking(false);
        // Prepend new event to feed
        setLiveFeed(prev => [
          { id: Date.now(), action: evt.action, detail: evt.detail, time: "just now", color: evt.color },
          ...prev.slice(0, 9),
        ]);
        // Show notification toast
        setNotification(evt.detail);
        setTimeout(() => setNotification(null), 4000);
      }, 1500 + Math.random() * 1000);
    }, 8000 + Math.random() * 4000);

    return () => clearInterval(interval);
  }, []);

  const TAB_TITLES: Record<TabId, string> = {
    dashboard: "Dashboard",
    activity: "Activity Log",
    oversight: "Portfolio Oversight",
    concierge: "AI Concierge",
    agents: "AI Agents",
    blueprints: "Venture Blueprints",
    team: "VENTEX Team",
    contacts: "Client Contacts",
    onboard: "Onboard Client",
    drafts: "Drafts",
    settings: "Settings",
  };

  const CLIENT_TAB_TITLES: Record<ClientTabId, string> = {
    overview: "Client Overview",
    ventures: "My Ventures",
    documents: "Documents",
    distributions: "Distributions",
    reports: "Reports & Analytics",
    messages: "Messages",
    settings: "Account Settings",
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      {/* Live notification toast */}
      <AnimatePresence>
        {notification && <LiveNotificationToast message={notification} onDismiss={() => setNotification(null)} />}
      </AnimatePresence>
      {/* ── Sidebar ── */}
      <AnimatePresence mode="wait">
        {demoView === "admin" ? (
          <motion.aside key="admin-sidebar" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }}
            className="hidden lg:flex flex-col w-[220px] border-r border-border bg-card/50 shrink-0">
            <div className="h-14 flex items-center gap-2.5 px-4 border-b border-border">
              <img src={VENTEX_LOGO_URL} alt="VENTEX" className="size-7 rounded-md" />
              <div className="flex flex-col">
                <span className="text-[11px] font-semibold tracking-[0.12em] text-foreground">VENTEX</span>
                <span className="text-[9px] text-muted-foreground tracking-wider">OPERATOR PANEL</span>
              </div>
            </div>

            <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
              {DEMO_NAV.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={cn(
                    "w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-[13px] transition-colors",
                    activeTab === item.id
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                  )}
                >
                  {item.icon}
                  <span>{item.label}</span>
                  {item.id === "drafts" && (
                    <span className="ml-auto text-[10px] font-mono bg-primary/20 text-primary px-1.5 py-0.5 rounded">{DEMO_DRAFTS.filter(d => d.status === "ready").length}</span>
                  )}
                </button>
              ))}
            </nav>

            <div className="border-t border-border p-3">
              <div className="flex items-center gap-2.5">
                <div className="size-8 rounded-full bg-primary/20 flex items-center justify-center text-[11px] font-semibold text-primary">
                  <Shield className="size-4" />
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-medium text-foreground">Admin View</span>
                  <span className="text-[10px] text-muted-foreground">What the operator sees</span>
                </div>
              </div>
            </div>
          </motion.aside>
        ) : (
          <motion.aside key="client-sidebar" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }}
            className="hidden lg:flex flex-col w-[220px] border-r border-border bg-card/50 shrink-0">
            <div className="h-14 flex items-center gap-2.5 px-4 border-b border-border">
              <img src={VENTEX_LOGO_URL} alt="VENTEX" className="size-7 rounded-md" />
              <div className="flex flex-col">
                <span className="text-[11px] font-semibold tracking-[0.12em] text-foreground">VENTEX</span>
                <span className="text-[9px] text-muted-foreground tracking-wider">CLIENT PORTAL</span>
              </div>
            </div>

            <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
              {([
                { id: "overview" as ClientTabId, label: "Overview", icon: <LayoutDashboard className="size-[18px]" /> },
                { id: "ventures" as ClientTabId, label: "My Ventures", icon: <Briefcase className="size-[18px]" /> },
                { id: "documents" as ClientTabId, label: "Documents", icon: <FileText className="size-[18px]" /> },
                { id: "distributions" as ClientTabId, label: "Distributions", icon: <Wallet className="size-[18px]" /> },
                { id: "reports" as ClientTabId, label: "Reports", icon: <BarChart3 className="size-[18px]" /> },
                { id: "messages" as ClientTabId, label: "Messages", icon: <MessageSquare className="size-[18px]" /> },
                { id: "settings" as ClientTabId, label: "Settings", icon: <Settings className="size-[18px]" /> },
              ]).map((item) => (
                <button
                  key={item.id}
                  onClick={() => setClientTab(item.id)}
                  className={cn(
                    "w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-[13px] transition-colors",
                    clientTab === item.id
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                  )}
                >
                  {item.icon}
                  <span>{item.label}</span>
                  {item.id === "messages" && (
                    <span className="ml-auto text-[10px] font-mono bg-primary/20 text-primary px-1.5 py-0.5 rounded">2</span>
                  )}
                </button>
              ))}
            </nav>

            <div className="border-t border-border p-3">
              <div className="flex items-center gap-2.5">
                <div className="size-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-[11px] font-semibold text-emerald-400">
                  MH
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-medium text-foreground">Marcus Hale</span>
                  <span className="text-[10px] text-muted-foreground">Crestfield Capital</span>
                </div>
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* ── Main content ── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Demo banner with view toggle */}
        <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Eye className="size-3.5 text-amber-400" />
            <span className="text-[11px] font-medium text-amber-300 tracking-wide hidden sm:inline">INVESTOR DEMO</span>
          </div>

          {/* View toggle */}
          <div className="flex items-center gap-1 bg-background/50 rounded-full p-0.5 border border-border">
            <button
              onClick={() => setDemoView("admin")}
              className={cn(
                "px-3 py-1 rounded-full text-[11px] font-medium transition-all",
                demoView === "admin"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <span className="flex items-center gap-1.5">
                <Shield className="size-3" />
                Admin View
              </span>
            </button>
            <button
              onClick={() => setDemoView("client")}
              className={cn(
                "px-3 py-1 rounded-full text-[11px] font-medium transition-all",
                demoView === "client"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <span className="flex items-center gap-1.5">
                <Users className="size-3" />
                Client View
              </span>
            </button>
          </div>

          <div className="flex items-center gap-3">
            {!tourActive && (
              <button
                onClick={startTour}
                className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/15 text-primary text-[11px] font-medium hover:bg-primary/25 transition-colors border border-primary/20"
              >
                <Play className="size-3" />
                <span className="hidden sm:inline">Guided Tour</span>
              </button>
            )}
            <Link href="/demo" className="text-[11px] text-amber-400 hover:text-amber-300 transition-colors flex items-center gap-1">
              <ArrowLeft className="size-3" />
              <span className="hidden sm:inline">Back to Pitch</span>
            </Link>
            <Link href="/" className="text-[11px] text-muted-foreground hover:text-foreground transition-colors">
              Authorized Access →
            </Link>
          </div>
        </div>

        {/* Topbar */}
        <header className="h-14 flex items-center justify-between px-4 md:px-6 border-b border-border bg-card/30 shrink-0">
          <div className="flex items-center gap-3">
            <div className="lg:hidden flex items-center gap-2">
              <img src={VENTEX_LOGO_URL} alt="VENTEX" className="size-6 rounded" />
            </div>
            <div>
              <h1 className="text-sm font-semibold text-foreground">
                {demoView === "admin" ? TAB_TITLES[activeTab] : CLIENT_TAB_TITLES[clientTab]}
              </h1>
              <p className="text-[10px] text-muted-foreground tracking-wider">
                {demoView === "admin" ? "WHAT THE OPERATOR SEES" : "WHAT THE CLIENT SEES"}
              </p>
            </div>
            {demoView === "admin" && (
              <Annotation id={activeTab} annotations={ADMIN_ANNOTATIONS} className="ml-1" />
            )}
          </div>
          <div className="flex items-center gap-2">
            {/* Mobile nav dropdown */}
            {demoView === "admin" ? (
              <div className="lg:hidden">
                <select
                  value={activeTab}
                  onChange={e => setActiveTab(e.target.value as TabId)}
                  className="h-8 px-2 text-xs bg-card border border-border rounded-md text-foreground"
                >
                  {DEMO_NAV.map(item => (
                    <option key={item.id} value={item.id}>{item.label}</option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="lg:hidden">
                <select
                  value={clientTab}
                  onChange={e => setClientTab(e.target.value as ClientTabId)}
                  className="h-8 px-2 text-xs bg-card border border-border rounded-md text-foreground"
                >
                  {(["overview","ventures","documents","distributions","reports","messages","settings"] as ClientTabId[]).map(id => (
                    <option key={id} value={id}>{CLIENT_TAB_TITLES[id]}</option>
                  ))}
                </select>
              </div>
            )}
            <button className="size-8 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors">
              <Search className="size-4" />
            </button>
            <button className="size-8 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors relative" style={{ backgroundColor: 'transparent' }} onMouseEnter={e => e.currentTarget.style.backgroundColor = '#1a1a2e'} onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
              <Bell className="size-4" />
              <span className="absolute -top-0.5 -right-0.5 size-4 rounded-full bg-red-500 text-[9px] font-bold text-white flex items-center justify-center">3</span>
            </button>
          </div>
        </header>

        {/* Scrollable content */}
        <main className="flex-1 overflow-y-auto overscroll-contain">
          <div className="p-4 md:p-6">
            <AnimatePresence mode="wait">
              {demoView === "admin" ? (
                <motion.div key="admin" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} transition={{ duration: 0.2 }}>
                  {activeTab === "dashboard" && <DashboardView search={search} setSearch={setSearch} liveFeed={liveFeed} agentThinking={agentThinking} />}
                  {activeTab === "activity" && <ActivityView />}
                  {activeTab === "oversight" && <OversightView />}
                  {activeTab === "concierge" && <ConciergeView />}
                  {activeTab === "agents" && <AgentsView />}
                  {activeTab === "blueprints" && <BlueprintsView />}
                  {activeTab === "team" && <TeamView />}
                  {activeTab === "contacts" && <ContactsView />}
                  {activeTab === "onboard" && <OnboardView />}
                  {activeTab === "drafts" && <DraftsView />}
                  {activeTab === "settings" && <SettingsView />}
                </motion.div>
              ) : (
                <motion.div key={`client-${clientTab}`} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} transition={{ duration: 0.2 }}>
                  {clientTab === "overview" && <ClientPortalDemoView />}
                  {clientTab === "ventures" && <ClientVenturesView />}
                  {clientTab === "documents" && <ClientDocumentsView />}
                  {clientTab === "distributions" && <ClientDistributionsView />}
                  {clientTab === "reports" && <ClientReportsView />}
                  {clientTab === "messages" && <ClientMessagesView />}
                  {clientTab === "settings" && <ClientSettingsView />}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </main>
      </div>

      {/* Tour spotlight overlay */}
      <AnimatePresence>
        {tourActive && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-[90] pointer-events-none"
          >
            <div className="absolute inset-0 bg-black/20" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tour narration overlay */}
      <AnimatePresence>
        {tourActive && TOUR_STEPS[tourStep] && (
          <GuidedTourOverlay
            step={TOUR_STEPS[tourStep]}
            totalSteps={TOUR_STEPS.length}
            currentStep={tourStep}
            isPlaying={tourPlaying}
            progress={tourProgress}
            onNext={tourNext}
            onPrev={tourPrev}
            onTogglePlay={tourTogglePlay}
            onClose={tourClose}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
