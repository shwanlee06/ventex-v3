// ============================================================================
// Demo Dashboard — Investor-facing read-only replica of the ATLAS admin dashboard
// Self-contained: no tRPC, no auth, no external data. Pure static UI.
// ============================================================================

import { cn } from "@/lib/utils";
import AnimatedCounter from "@/components/AnimatedCounter";
import {
  LayoutDashboard,
  Bot,
  Layers3,
  Briefcase,
  Users,
  DollarSign,
  ListChecks,
  Activity,
  Settings,
  Shield,
  Cpu,
  FileText,
  UserPlus,
  Eye,
  ChevronRight,
  Search,
  Bell,
  ArrowLeft,
  TrendingUp,
  ArrowUp,
  ArrowDown,
  Minus,
  Zap,
  Target,
  Brain,
  AlertTriangle,
  Building2,
  CheckCircle2,
  Clock,
  ExternalLink,
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
  { id: 7, action: "Distribution Sentinel", detail: "Quarterly distribution processed — $890K to Sovereign Wealth Partners", time: "2h ago", color: "#A855F7" },
];

const DEMO_TASKS = [
  { title: "Review SPV formation docs — Al Rashid Tower III", assignee: "Anton K.", due: "Today", priority: "high" as const },
  { title: "Submit KYC renewal — Northstar Capital", assignee: "Angie M.", due: "Tomorrow", priority: "medium" as const },
  { title: "Finalize yacht purchase agreement — Titan Industries", assignee: "Jon R.", due: "Apr 12", priority: "high" as const },
  { title: "Distribution approval — Meridian Q1 payout", assignee: "Jimmy L.", due: "Apr 14", priority: "medium" as const },
  { title: "Insurance policy review — Pacific Entertainment Complex", assignee: "Maher S.", due: "Apr 15", priority: "low" as const },
];

const DEMO_KPI = [
  { label: "Active Clients", value: 6, suffix: "of 8", trend: "+2 this quarter", trendUp: true },
  { label: "Active Ventures", value: 33, suffix: "across 6 sectors", trend: "+5 this month", trendUp: true },
  { label: "Open Tasks", value: 47, suffix: "12 due this week", trend: "3 overdue", trendUp: false },
  { label: "Velocity Score", value: 87, suffix: "% avg", trend: "+4% vs last month", trendUp: true },
];

const DEMO_NAV = [
  { label: "Dashboard", icon: <LayoutDashboard className="size-[18px]" />, active: true },
  { label: "Activity", icon: <Activity className="size-[18px]" /> },
  { label: "Oversight", icon: <Eye className="size-[18px]" /> },
  { label: "AI Concierge", icon: <Bot className="size-[18px]" /> },
  { label: "AI Agents", icon: <Cpu className="size-[18px]" /> },
  { label: "Blueprints", icon: <Layers3 className="size-[18px]" /> },
  { label: "ATLAS Team", icon: <Shield className="size-[18px]" /> },
  { label: "Client Contacts", icon: <Users className="size-[18px]" /> },
  { label: "Onboard Client", icon: <UserPlus className="size-[18px]" /> },
  { label: "Drafts", icon: <FileText className="size-[18px]" /> },
  { label: "Settings", icon: <Settings className="size-[18px]" /> },
];

const ATLAS_LOGO_URL = "https://d2xsxph8kpxj0f.cloudfront.net/310519663421947072/TYkqBQavc4Sd5YvF3sSZqT/atlas-logo-G2SBqxAK64sZYAYmAZY9js.webp";

/* ─── Health badge ─── */
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

/* ─── Velocity badge ─── */
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

/* ─── Priority badge ─── */
function PriorityBadge({ priority }: { priority: "high" | "medium" | "low" }) {
  const cfg = {
    high: "bg-red-500/10 text-red-400",
    medium: "bg-amber-500/10 text-amber-400",
    low: "bg-secondary text-muted-foreground",
  }[priority];
  return <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded capitalize", cfg)}>{priority}</span>;
}

/* ─── Animated section ─── */
function FadeIn({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 12 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.35, delay, ease: "easeOut" }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
export default function DemoDashboard() {
  const [, navigate] = useLocation();
  const [search, setSearch] = useState("");

  const filteredClients = search
    ? DEMO_CLIENTS.filter(c => c.name.toLowerCase().includes(search.toLowerCase()))
    : DEMO_CLIENTS;

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      {/* ── Sidebar ── */}
      <aside className="hidden lg:flex flex-col w-[220px] border-r border-border bg-card/50 shrink-0">
        {/* Logo */}
        <div className="h-14 flex items-center gap-2.5 px-4 border-b border-border">
          <img src={ATLAS_LOGO_URL} alt="ATLAS" className="size-7 rounded-md" />
          <div className="flex flex-col">
            <span className="text-[11px] font-semibold tracking-[0.12em] text-foreground">ATLAS</span>
            <span className="text-[9px] text-muted-foreground tracking-wider">VELOCITY AI</span>
          </div>
        </div>

        {/* Nav items */}
        <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
          {DEMO_NAV.map((item) => (
            <button
              key={item.label}
              className={cn(
                "w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-[13px] transition-colors cursor-default",
                item.active
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
              )}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        {/* User */}
        <div className="border-t border-border p-3">
          <div className="flex items-center gap-2.5">
            <div className="size-8 rounded-full bg-primary/20 flex items-center justify-center text-[11px] font-semibold text-primary">
              IV
            </div>
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
              <h1 className="text-sm font-semibold text-foreground">Dashboard</h1>
              <p className="text-[10px] text-muted-foreground tracking-wider">ATLAS COMMAND CENTER</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
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
          <div className="p-4 md:p-6 space-y-6">
            {/* ── Overdue alert banner ── */}
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

            {/* ── KPI Cards ── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {DEMO_KPI.map((kpi, i) => (
                <FadeIn key={kpi.label} delay={i * 0.05}>
                  <div className="bg-card border border-border rounded-lg p-4 flex flex-col gap-2 hover:border-primary/30 transition-all">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] uppercase tracking-[0.06em] text-muted-foreground font-medium">{kpi.label}</span>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-semibold tracking-tight text-foreground font-mono">
                        <AnimatedCounter value={kpi.value} duration={1200} />
                      </span>
                      <span className="text-[10px] text-muted-foreground font-mono">{kpi.suffix}</span>
                    </div>
                    <div className="flex items-center gap-1 mt-1">
                      {kpi.trendUp ? (
                        <TrendingUp className="size-3 text-emerald-400" />
                      ) : (
                        <AlertTriangle className="size-3 text-amber-400" />
                      )}
                      <span className={cn("text-[10px] font-mono", kpi.trendUp ? "text-emerald-400" : "text-amber-400")}>
                        {kpi.trend}
                      </span>
                    </div>
                  </div>
                </FadeIn>
              ))}
            </div>

            {/* ── Main grid ── */}
            <div className="grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-6">
              {/* Left: Client grid */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-foreground">Client Portfolio</h2>
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                      <input
                        type="text"
                        placeholder="Search clients..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="h-8 pl-8 pr-3 text-xs bg-card border border-border rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/30 w-48"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {filteredClients.map((client, i) => (
                    <FadeIn key={client.slug} delay={0.1 + i * 0.05}>
                      <div className="bg-card border border-border rounded-lg p-4 hover:border-primary/30 transition-all cursor-default group">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2.5">
                            <div className="size-8 rounded-md bg-primary/10 flex items-center justify-center">
                              <Building2 className="size-4 text-primary" />
                            </div>
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
                          <div className="flex flex-col items-end">
                            <HealthBadge health={client.health} />
                          </div>
                        </div>

                        {/* Completion bar */}
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] text-muted-foreground">Completion</span>
                            <span className="text-[10px] font-mono text-foreground">{client.completion}%</span>
                          </div>
                          <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                            <motion.div
                              className="h-full rounded-full bg-primary"
                              initial={{ width: 0 }}
                              animate={{ width: `${client.completion}%` }}
                              transition={{ duration: 1, delay: 0.3 + i * 0.1, ease: "easeOut" }}
                            />
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

                {/* ── Open Tasks ── */}
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
                            <div className="size-5 rounded border border-border flex items-center justify-center shrink-0">
                              <CheckCircle2 className="size-3 text-muted-foreground/30" />
                            </div>
                            <div className="min-w-0">
                              <span className="text-xs font-medium text-foreground truncate block">{task.title}</span>
                              <span className="text-[10px] text-muted-foreground">{task.assignee}</span>
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

              {/* Right column: Agent feed + Intelligence */}
              <div className="space-y-4">
                {/* Velocity Intelligence */}
                <FadeIn delay={0.2}>
                  <div className="bg-card border border-border rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Brain className="size-4 text-primary" />
                      <h3 className="text-xs font-semibold text-foreground">Velocity Intelligence</h3>
                    </div>
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
                  </div>
                </FadeIn>

                {/* Agent Activity Feed */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-sm font-semibold text-foreground">Agent Activity</h2>
                    <div className="flex items-center gap-1.5">
                      <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      <span className="text-[10px] font-mono text-emerald-400">live</span>
                    </div>
                  </div>

                  <div className="bg-card border border-border rounded-lg divide-y divide-border">
                    {DEMO_FEED.map((item, i) => (
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

                {/* Agent Status */}
                <FadeIn delay={0.6}>
                  <div className="bg-card border border-border rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Cpu className="size-4 text-primary" />
                      <h3 className="text-xs font-semibold text-foreground">Active Agents</h3>
                    </div>
                    <div className="space-y-2">
                      {[
                        { name: "Overdue Agent", status: "Running", actions: 47, color: "#EF4444" },
                        { name: "Velocity Agent", status: "Running", actions: 23, color: "#22D3EE" },
                        { name: "Distribution Sentinel", status: "Monitoring", actions: 12, color: "#A855F7" },
                        { name: "Compliance Watcher", status: "Running", actions: 8, color: "#F59E0B" },
                      ].map((agent) => (
                        <div key={agent.name} className="flex items-center justify-between py-1.5">
                          <div className="flex items-center gap-2">
                            <div className="size-1.5 rounded-full" style={{ backgroundColor: agent.color }} />
                            <span className="text-[11px] text-foreground">{agent.name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-mono text-muted-foreground">{agent.actions} actions</span>
                            <span className="text-[10px] text-emerald-400 font-medium">{agent.status}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </FadeIn>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
