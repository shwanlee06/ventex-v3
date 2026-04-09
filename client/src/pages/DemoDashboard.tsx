// ============================================================================
// Demo Dashboard — Investor-facing read-only replica of the ATLAS admin dashboard
// Self-contained: no tRPC, no auth, no external data. Pure static UI.
// ALL sidebar tabs are interactive with data-rich views.
// ============================================================================

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
} from "lucide-react";
import { motion, useInView } from "framer-motion";
import { useState, useRef } from "react";
import { Link, useLocation } from "wouter";

/* ─── Static demo data ─── */
const DEMO_CLIENTS = [
  { name: "Al Rashid Group", slug: "al-rashid", ventures: 8, velocity: 94, completion: 78, overdue: 1, health: "excellent" as const, sector: "Real Estate" },
  { name: "Meridian Holdings", slug: "meridian", ventures: 5, velocity: 87, completion: 65, overdue: 2, health: "good" as const, sector: "F&B" },
  { name: "Northstar Capital", slug: "northstar", ventures: 6, velocity: 91, completion: 82, overdue: 0, health: "excellent" as const, sector: "Oil & Gas" },
  { name: "Pacific Ventures", slug: "pacific", ventures: 4, velocity: 76, completion: 55, overdue: 3, health: "warning" as const, sector: "Entertainment" },
  { name: "Sovereign Wealth Partners", slug: "sovereign", ventures: 7, velocity: 89, completion: 71, overdue: 1, health: "good" as const, sector: "Real Estate" },
  { name: "Titan Industries", slug: "titan", ventures: 3, velocity: 82, completion: 60, overdue: 0, health: "good" as const, sector: "Yacht" },
];

const DEMO_FEED = [
  { id: 1, action: "Velocity Agent", detail: "Advanced 'Marina Bay Tower' from Due Diligence → Closing", time: "2m ago", color: "#22D3EE" },
  { id: 2, action: "Overdue Agent", detail: "Sent follow-up to Al Rashid Group — permit review 3 days overdue", time: "8m ago", color: "#EF4444" },
  { id: 3, action: "Distribution Sentinel", detail: "Flagged $2.4M distribution for Meridian Holdings — awaiting approval", time: "14m ago", color: "#A855F7" },
  { id: 4, action: "Compliance Watcher", detail: "KYC renewal triggered for Northstar Capital — 30 days remaining", time: "22m ago", color: "#F59E0B" },
  { id: 5, action: "Velocity Agent", detail: "Stall detected: 'Dubai Creek Residences' — no activity for 7 days", time: "35m ago", color: "#22D3EE" },
  { id: 6, action: "Overdue Agent", detail: "Task completed: Legal review for Pacific Ventures yacht acquisition", time: "1h ago", color: "#EF4444" },
  { id: 7, action: "Compliance Watcher", detail: "Annual audit documents uploaded for Sovereign Wealth Partners", time: "2h ago", color: "#F59E0B" },
];

const DEMO_KPI = [
  { label: "Active Ventures", value: 33, suffix: "of 41", trendUp: true, trend: "+3 this month" },
  { label: "Active SPVs", value: 12, suffix: "of 18", trendUp: true, trend: "+2 in negotiation" },
  { label: "Open Tasks", value: 24, suffix: "7 overdue", trendUp: false, trend: "3 overdue" },
  { label: "Distributions", value: 8, suffix: "$14.2M total", trendUp: true, trend: "+$2.4M pending" },
];

const DEMO_TASKS = [
  { title: "Review Marina Bay Tower closing documents", assignee: "Anton Keller", priority: "high" as const, due: "Apr 10", client: "Al Rashid Group" },
  { title: "Submit KYC renewal for Northstar Capital", assignee: "Maher Haddad", priority: "high" as const, due: "Apr 11", client: "Northstar Capital" },
  { title: "Finalize yacht acquisition terms — Pacific Ventures", assignee: "Jon Mercer", priority: "medium" as const, due: "Apr 12", client: "Pacific Ventures" },
  { title: "Prepare Q1 distribution report for Sovereign Wealth", assignee: "Angie Reyes", priority: "medium" as const, due: "Apr 14", client: "Sovereign Wealth" },
  { title: "Schedule board meeting for Meridian Holdings F&B expansion", assignee: "Anton Keller", priority: "low" as const, due: "Apr 18", client: "Meridian Holdings" },
];

const DEMO_ACTIVITY = [
  { id: 1, type: "venture", action: "Stage advanced", detail: "Marina Bay Tower moved from Due Diligence to Closing", user: "Velocity Agent", time: "2 minutes ago", icon: <Zap className="size-3.5" />, color: "text-cyan-400" },
  { id: 2, type: "task", action: "Task overdue", detail: "Permit review for Al Rashid Group is 3 days overdue", user: "Overdue Agent", time: "8 minutes ago", icon: <AlertTriangle className="size-3.5" />, color: "text-red-400" },
  { id: 3, type: "distribution", action: "Distribution flagged", detail: "$2.4M distribution for Meridian Holdings flagged for approval", user: "Distribution Sentinel", time: "14 minutes ago", icon: <DollarSign className="size-3.5" />, color: "text-purple-400" },
  { id: 4, type: "compliance", action: "KYC renewal", detail: "Northstar Capital KYC renewal triggered — 30 days remaining", user: "Compliance Watcher", time: "22 minutes ago", icon: <ShieldCheck className="size-3.5" />, color: "text-amber-400" },
  { id: 5, type: "venture", action: "Stall detected", detail: "Dubai Creek Residences — no activity for 7 days", user: "Velocity Agent", time: "35 minutes ago", icon: <AlertTriangle className="size-3.5" />, color: "text-cyan-400" },
  { id: 6, type: "task", action: "Task completed", detail: "Legal review for Pacific Ventures yacht acquisition", user: "Jon Mercer", time: "1 hour ago", icon: <CheckCircle2 className="size-3.5" />, color: "text-emerald-400" },
  { id: 7, type: "document", action: "Document uploaded", detail: "Annual audit documents for Sovereign Wealth Partners", user: "Angie Reyes", time: "2 hours ago", icon: <FileText className="size-3.5" />, color: "text-blue-400" },
  { id: 8, type: "venture", action: "New venture created", detail: "Palm Jumeirah Residences added to Al Rashid Group portfolio", user: "Shwan Lee", time: "3 hours ago", icon: <Plus className="size-3.5" />, color: "text-emerald-400" },
  { id: 9, type: "task", action: "Task assigned", detail: "Prepare investor deck for Titan Industries yacht project", user: "Shwan Lee", time: "4 hours ago", icon: <ListChecks className="size-3.5" />, color: "text-blue-400" },
  { id: 10, type: "compliance", action: "Compliance check passed", detail: "Titan Industries annual compliance review approved", user: "Compliance Watcher", time: "5 hours ago", icon: <ShieldCheck className="size-3.5" />, color: "text-emerald-400" },
];

const DEMO_AGENTS = [
  { name: "Overdue Agent", status: "running" as const, actions: 47, uptime: "99.8%", lastAction: "Sent follow-up to Al Rashid Group", lastActionTime: "8m ago", color: "#EF4444", description: "Monitors all tasks for overdue deadlines. Sends automated follow-ups and escalates to team leads after 48 hours." },
  { name: "Velocity Agent", status: "running" as const, actions: 23, uptime: "99.9%", lastAction: "Advanced Marina Bay Tower stage", lastActionTime: "2m ago", color: "#22D3EE", description: "Tracks venture pipeline velocity. Detects stalls, suggests stage advances, and optimizes deal flow timing." },
  { name: "Distribution Sentinel", status: "monitoring" as const, actions: 12, uptime: "100%", lastAction: "Flagged $2.4M distribution", lastActionTime: "14m ago", color: "#A855F7", description: "Watches all distribution events. Validates amounts, flags anomalies, and ensures compliance before payouts." },
  { name: "Compliance Watcher", status: "running" as const, actions: 8, uptime: "99.7%", lastAction: "KYC renewal triggered", lastActionTime: "22m ago", color: "#F59E0B", description: "Monitors regulatory deadlines. Auto-triggers KYC renewals, audit reminders, and license expiration alerts." },
];

const DEMO_TEAM = [
  { name: "Shwan Lee", role: "Founder & CEO", email: "shwan@aurovia.co", status: "online" as const, ventures: 12, tasks: 3, avatar: "SL" },
  { name: "Brian Chen", role: "COO", email: "brian@aurovia.co", status: "online" as const, ventures: 8, tasks: 5, avatar: "BC" },
  { name: "Chris Phelps", role: "CRO", email: "chris@aurovia.co", status: "online" as const, ventures: 10, tasks: 4, avatar: "CP" },
  { name: "Anton Keller", role: "Head of Operations", email: "anton@atlas.co", status: "online" as const, ventures: 15, tasks: 6, avatar: "AK" },
  { name: "Maher Haddad", role: "Compliance Lead", email: "maher@atlas.co", status: "away" as const, ventures: 8, tasks: 3, avatar: "MH" },
  { name: "Jon Mercer", role: "Deal Structuring", email: "jon@atlas.co", status: "offline" as const, ventures: 6, tasks: 2, avatar: "JM" },
  { name: "Angie Reyes", role: "Finance & Distributions", email: "angie@atlas.co", status: "online" as const, ventures: 7, tasks: 4, avatar: "AR" },
];

const DEMO_CONTACTS = [
  { name: "Ahmed Al Rashid", org: "Al Rashid Group", role: "Chairman", email: "ahmed@alrashid.ae", phone: "+971-4-XXX-XXXX", status: "active" as const },
  { name: "Sarah Chen", org: "Meridian Holdings", role: "CEO", email: "sarah@meridian.com", phone: "+1-XXX-XXX-XXXX", status: "active" as const },
  { name: "Viktor Petrov", org: "Northstar Capital", role: "Managing Partner", email: "viktor@northstar.com", phone: "+44-XXX-XXX-XXXX", status: "active" as const },
  { name: "Maria Santos", org: "Pacific Ventures", role: "Director", email: "maria@pacific.vc", phone: "+1-XXX-XXX-XXXX", status: "active" as const },
  { name: "James Whitfield", org: "Sovereign Wealth Partners", role: "CIO", email: "james@sovereign.com", phone: "+41-XXX-XXX-XXXX", status: "active" as const },
  { name: "Yuki Tanaka", org: "Titan Industries", role: "VP Operations", email: "yuki@titan.co.jp", phone: "+81-XXX-XXX-XXXX", status: "active" as const },
];

const DEMO_BLUEPRINTS = [
  { name: "Marina Bay Tower", client: "Al Rashid Group", stage: "Closing", progress: 92, sector: "Real Estate" },
  { name: "Dubai Creek Residences", client: "Al Rashid Group", stage: "Due Diligence", progress: 45, sector: "Real Estate" },
  { name: "Palm Jumeirah Residences", client: "Al Rashid Group", stage: "Negotiation", progress: 30, sector: "Real Estate" },
  { name: "Meridian F&B Hub", client: "Meridian Holdings", stage: "Active", progress: 68, sector: "F&B" },
  { name: "Northstar Refinery", client: "Northstar Capital", stage: "Active", progress: 75, sector: "Oil & Gas" },
  { name: "Pacific Yacht Club", client: "Pacific Ventures", stage: "Due Diligence", progress: 40, sector: "Yacht" },
  { name: "Sovereign Tower II", client: "Sovereign Wealth", stage: "Closing", progress: 88, sector: "Real Estate" },
  { name: "Titan Superyacht", client: "Titan Industries", stage: "Negotiation", progress: 25, sector: "Yacht" },
];

const DEMO_CHAT = [
  { role: "assistant" as const, content: "Good morning. I've completed the overnight analysis. Here's your briefing:\n\n**3 items require attention:**\n1. Marina Bay Tower closing docs need review by Apr 10\n2. Northstar Capital KYC renewal due in 30 days\n3. Pacific Ventures has 3 overdue tasks — velocity declining\n\nShall I draft follow-up emails for the overdue items?" },
  { role: "user" as const, content: "Yes, draft the follow-ups. Also, what's the status on the Meridian distribution?" },
  { role: "assistant" as const, content: "I've drafted 3 follow-up emails — they're in your Drafts tab for review.\n\n**Meridian Holdings Distribution:**\n- Amount: $2.4M (Q1 2026)\n- Status: Flagged by Distribution Sentinel for approval\n- Reason: Amount exceeds quarterly threshold by 15%\n- Action needed: Your approval to release\n\nWould you like me to prepare the approval memo?" },
];

const DEMO_DRAFTS = [
  { title: "Follow-up: Marina Bay Tower Closing Documents", to: "Ahmed Al Rashid", status: "ready" as const, created: "2h ago", type: "email" },
  { title: "Follow-up: Pacific Ventures Overdue Tasks", to: "Maria Santos", status: "ready" as const, created: "2h ago", type: "email" },
  { title: "Follow-up: Northstar KYC Renewal", to: "Viktor Petrov", status: "ready" as const, created: "2h ago", type: "email" },
  { title: "Q1 Distribution Report — Sovereign Wealth", to: "James Whitfield", status: "draft" as const, created: "1d ago", type: "report" },
  { title: "Board Meeting Agenda — Meridian Holdings", to: "Sarah Chen", status: "draft" as const, created: "2d ago", type: "document" },
];

type TabId = "dashboard" | "activity" | "oversight" | "concierge" | "agents" | "blueprints" | "team" | "contacts" | "onboard" | "drafts" | "settings";

const DEMO_NAV: { label: string; icon: React.ReactNode; id: TabId }[] = [
  { label: "Dashboard", icon: <LayoutDashboard className="size-[18px]" />, id: "dashboard" },
  { label: "Activity", icon: <Activity className="size-[18px]" />, id: "activity" },
  { label: "Oversight", icon: <Eye className="size-[18px]" />, id: "oversight" },
  { label: "AI Concierge", icon: <Bot className="size-[18px]" />, id: "concierge" },
  { label: "AI Agents", icon: <Cpu className="size-[18px]" />, id: "agents" },
  { label: "Blueprints", icon: <Layers3 className="size-[18px]" />, id: "blueprints" },
  { label: "ATLAS Team", icon: <Shield className="size-[18px]" />, id: "team" },
  { label: "Client Contacts", icon: <Users className="size-[18px]" />, id: "contacts" },
  { label: "Onboard Client", icon: <UserPlus className="size-[18px]" />, id: "onboard" },
  { label: "Drafts", icon: <FileText className="size-[18px]" />, id: "drafts" },
  { label: "Settings", icon: <Settings className="size-[18px]" />, id: "settings" },
];

const ATLAS_LOGO_URL = "https://d2xsxph8kpxj0f.cloudfront.net/310519663421947072/TYkqBQavc4Sd5YvF3sSZqT/atlas-logo-G2SBqxAK64sZYAYmAZY9js.webp";

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

function DashboardView({ search, setSearch }: { search: string; setSearch: (s: string) => void }) {
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
              <span className="text-[11px] uppercase tracking-[0.06em] text-muted-foreground font-medium">{kpi.label}</span>
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
                    <div className="flex flex-col">
                      <VelocityBadge rate={client.velocity} />
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
                    <span className="text-primary font-medium">Insight:</span> Al Rashid Group's velocity increased 12% after AI agent automation was enabled. Recommend expanding to Meridian Holdings.
                  </p>
                </div>
                <div className="p-2.5 bg-amber-500/5 border border-amber-500/10 rounded-md">
                  <p className="text-[11px] text-foreground leading-relaxed">
                    <span className="text-amber-400 font-medium">Alert:</span> Pacific Ventures has 3 overdue tasks and declining velocity. Schedule a review call.
                  </p>
                </div>
              </div>
            </SectionCard>
          </FadeIn>

          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-foreground">Agent Activity</h2>
              <div className="flex items-center gap-1.5">
                <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[10px] font-mono text-emerald-400">live</span>
              </div>
            </div>
            <div className="bg-card border border-border rounded-lg divide-y divide-border">
              {DEMO_FEED.slice(0, 6).map((item, i) => (
                <FadeIn key={item.id} delay={0.4 + i * 0.06}>
                  <div className="p-3 flex gap-3 cursor-default hover:bg-accent/30 transition-colors">
                    <div className="size-1.5 rounded-full mt-1.5 shrink-0" style={{ backgroundColor: item.color }} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-foreground">{item.action}</span>
                        <span className="text-[10px] font-mono text-muted-foreground">{item.time}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">{item.detail}</p>
                    </div>
                  </div>
                </FadeIn>
              ))}
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
        <span className="text-[10px] font-mono text-muted-foreground">Last scan: 2m ago</span>
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
            { level: "high", title: "Pacific Ventures velocity declining", detail: "3 overdue tasks, velocity dropped from 85% to 76% in 2 weeks", action: "Review call scheduled" },
            { level: "medium", title: "Northstar Capital KYC expiring", detail: "KYC documents expire in 30 days — renewal process initiated", action: "Auto-reminder sent" },
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
        </div>

        {/* Input */}
        <div className="border-t border-border p-3 flex items-center gap-2">
          <button className="size-8 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors">
            <Paperclip className="size-4" />
          </button>
          <div className="flex-1 relative">
            <input type="text" placeholder="Ask ATLAS anything about your portfolio..." disabled
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
          <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
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
                      <span className="size-1.5 rounded-full bg-emerald-400" />
                      <span className="text-[10px] text-emerald-400 capitalize">{agent.status}</span>
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
        <h2 className="text-sm font-semibold text-foreground">ATLAS Team</h2>
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
                  <div className="size-10 rounded-full bg-primary/20 flex items-center justify-center text-sm font-semibold text-primary">{member.avatar}</div>
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
            { label: "Organization Name", value: "Royalton Venture Holding" },
            { label: "Primary Domain", value: "atlasops.manus.space" },
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

/* ═══════════════════════════════════════════════════════════════════════════ */
/* ─── MAIN COMPONENT ─── */
/* ═══════════════════════════════════════════════════════════════════════════ */

export default function DemoDashboard() {
  const [, navigate] = useLocation();
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<TabId>("dashboard");

  const TAB_TITLES: Record<TabId, string> = {
    dashboard: "Dashboard",
    activity: "Activity Log",
    oversight: "Portfolio Oversight",
    concierge: "AI Concierge",
    agents: "AI Agents",
    blueprints: "Venture Blueprints",
    team: "ATLAS Team",
    contacts: "Client Contacts",
    onboard: "Onboard Client",
    drafts: "Drafts",
    settings: "Settings",
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      {/* ── Sidebar ── */}
      <aside className="hidden lg:flex flex-col w-[220px] border-r border-border bg-card/50 shrink-0">
        <div className="h-14 flex items-center gap-2.5 px-4 border-b border-border">
          <img src={ATLAS_LOGO_URL} alt="ATLAS" className="size-7 rounded-md" />
          <div className="flex flex-col">
            <span className="text-[11px] font-semibold tracking-[0.12em] text-foreground">ATLAS</span>
            <span className="text-[9px] text-muted-foreground tracking-wider">VELOCITY AI</span>
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
            <div className="size-8 rounded-full bg-primary/20 flex items-center justify-center text-[11px] font-semibold text-primary">IV</div>
            <div className="flex flex-col">
              <span className="text-xs font-medium text-foreground">Investor View</span>
              <span className="text-[10px] text-muted-foreground">Read-only demo</span>
            </div>
          </div>
        </div>
      </aside>

      {/* ── Main content ── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Demo banner */}
        <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Eye className="size-3.5 text-amber-400" />
            <span className="text-[11px] font-medium text-amber-300 tracking-wide">INVESTOR DEMO — READ-ONLY VIEW</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/demo" className="text-[11px] text-amber-400 hover:text-amber-300 transition-colors flex items-center gap-1">
              <ArrowLeft className="size-3" />
              Back to Pitch
            </Link>
            <Link href="/" className="text-[11px] text-muted-foreground hover:text-foreground transition-colors">
              Sign In →
            </Link>
          </div>
        </div>

        {/* Topbar */}
        <header className="h-14 flex items-center justify-between px-4 md:px-6 border-b border-border bg-card/30 shrink-0">
          <div className="flex items-center gap-3">
            <div className="lg:hidden flex items-center gap-2">
              <img src={ATLAS_LOGO_URL} alt="ATLAS" className="size-6 rounded" />
            </div>
            <div>
              <h1 className="text-sm font-semibold text-foreground">{TAB_TITLES[activeTab]}</h1>
              <p className="text-[10px] text-muted-foreground tracking-wider">ATLAS COMMAND CENTER</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Mobile nav dropdown */}
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
            <button className="size-8 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors">
              <Search className="size-4" />
            </button>
            <button className="size-8 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors relative">
              <Bell className="size-4" />
              <span className="absolute -top-0.5 -right-0.5 size-4 rounded-full bg-red-500 text-[9px] font-bold text-white flex items-center justify-center">3</span>
            </button>
          </div>
        </header>

        {/* Scrollable content */}
        <main className="flex-1 overflow-y-auto overscroll-contain">
          <div className="p-4 md:p-6">
            {activeTab === "dashboard" && <DashboardView search={search} setSearch={setSearch} />}
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
          </div>
        </main>
      </div>
    </div>
  );
}
