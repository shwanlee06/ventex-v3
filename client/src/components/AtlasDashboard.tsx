// ============================================================================
// ATLAS Admin Dashboard — Clean, Mobile-First Analytics
// Partnership-specific analytics with clean spacing
// ============================================================================

import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc";
import StatusBadge from "@/components/StatusBadge";
import {
  SPV_STAGE_CONFIG,
  getThemeColor,
  formatTimestamp,
  formatCurrency,
  formatDate,
} from "@/lib/data";
import {
  Layers3,
  Briefcase,
  ListChecks,
  DollarSign,
  ArrowUpRight,
  Building2,
  Ship,
  UtensilsCrossed,
  Clapperboard,
  Fuel,
  Package,
  ChevronRight,
  ChevronDown,
  Zap,
  BarChart3,
  Activity,
  Search,
  ArrowUpDown,
  LayoutGrid,
  List,
  Network,
  CircleDollarSign,
  Plus,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useCallback, useMemo } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";

const THEME_ICONS: Record<string, React.ReactNode> = {
  "Real Estate": <Building2 className="size-4" />,
  "Yacht": <Ship className="size-4" />,
  "F&B": <UtensilsCrossed className="size-4" />,
  "Entertainment": <Clapperboard className="size-4" />,
  "Oil & Gas": <Fuel className="size-4" />,
  "Others": <Package className="size-4" />,
};

// ── Mini progress ring ──────────────────────────────────────────────────
function ProgressRing({ percent, size = 32, strokeWidth = 3, color = "#4ADE80" }: { percent: number; size?: number; strokeWidth?: number; color?: string }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;
  return (
    <svg width={size} height={size} className="flex-shrink-0 -rotate-90">
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="currentColor" strokeWidth={strokeWidth} className="text-border" />
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth={strokeWidth}
        strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" className="transition-all duration-700" />
    </svg>
  );
}

// ── Health indicator ────────────────────────────────────────────────────
function HealthIndicator({ score }: { score: number }) {
  const color = score >= 70 ? "#4ADE80" : score >= 40 ? "#F59E0B" : "#EF4444";
  const label = score >= 70 ? "Healthy" : score >= 40 ? "At Risk" : "Critical";
  return (
    <div className="flex items-center gap-1.5">
      <div className="size-1.5 rounded-full" style={{ backgroundColor: color }} />
      <span className="text-[10px] font-medium" style={{ color }}>{label}</span>
    </div>
  );
}

// ── Types ───────────────────────────────────────────────────────────────
interface VentureAnalytics {
  id: number;
  name: string;
  slug: string;
  sector: string;
  stage: string;
  status: string;
  priority: string | null;
  healthScore: number | null;
  totalTasks: number;
  completedTasks: number;
  openTasks: number;
  overdueTasks: number;
  completionRate: number;
  spvCount: number;
}

type SortField = "name" | "tasks" | "completion" | "overdue";
type ViewMode = "grid" | "table";

interface AtlasDashboardProps {
  onNavigate: (path: string) => void;
}

export default function AtlasDashboard({ onNavigate }: AtlasDashboardProps) {
  const utils = trpc.useUtils();

  // ── Live data queries ──────────────────────────────────────────────
  const venturesQ = trpc.ventures.list.useQuery();
  const tasksQ = trpc.tasks.list.useQuery();
  const spvsQ = trpc.spvs.list.useQuery();
  const distQ = trpc.distributions.list.useQuery();
  const activityQ = trpc.activity.recent.useQuery({ limit: 8 });
  const teamQ = trpc.team.list.useQuery();
  const ventureAssignmentsQ = trpc.team.ventureAssignments.useQuery();

  const pageLoading = venturesQ.isLoading || tasksQ.isLoading;

  // ── Derived data ───────────────────────────────────────────────────
  const allVentures = venturesQ.data || [];
  const allTasks = tasksQ.data || [];
  const allSpvs = spvsQ.data || [];
  const allDists = distQ.data || [];
  const activityLogs = activityQ.data || [];
  const allTeam = teamQ.data || [];
  const ventureAssignments = ventureAssignmentsQ.data || [];

  // ── UI state ───────────────────────────────────────────────────────
  const [searchTerm, setSearchTerm] = useState("");
  const [sectorFilter, setSectorFilter] = useState<string>("all");
  const [sortField, setSortField] = useState<SortField>("overdue");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [expandedVenture, setExpandedVenture] = useState<number | null>(null);

  // ── Partnership analytics computation ─────────────────────────────
  const now = useMemo(() => new Date(), []);

  const ventureAnalytics: VentureAnalytics[] = useMemo(() => {
    return allVentures.map((v) => {
      const vTasks = allTasks.filter(t => t.ventureId === v.id);
      const completed = vTasks.filter(t => t.status === "complete").length;
      const open = vTasks.filter(t => t.status !== "complete").length;
      const overdue = vTasks.filter(t => t.status !== "complete" && t.dueDate && new Date(t.dueDate) < now).length;
      const total = vTasks.length;
      const rate = total > 0 ? Math.round((completed / total) * 100) : 0;
      const spvCount = allSpvs.filter(s => s.sector === v.sector).length;

      return {
        id: v.id, name: v.name, slug: v.slug, sector: v.sector,
        stage: v.stage, status: v.status, priority: v.priority,
        healthScore: v.healthScore ?? 50,
        totalTasks: total, completedTasks: completed, openTasks: open,
        overdueTasks: overdue, completionRate: rate, spvCount,
      };
    });
  }, [allVentures, allTasks, allSpvs, now]);

  // ── Member-venture mapping ────────────────────────────────────────
  const membersByVenture = useMemo(() => {
    const map: Record<number, typeof ventureAssignments> = {};
    for (const a of ventureAssignments) {
      if (!map[a.ventureId]) map[a.ventureId] = [];
      map[a.ventureId].push(a);
    }
    return map;
  }, [ventureAssignments]);

  const venturesByMember = useMemo(() => {
    const map: Record<number, typeof ventureAssignments> = {};
    for (const a of ventureAssignments) {
      if (!map[a.memberId]) map[a.memberId] = [];
      map[a.memberId].push(a);
    }
    return map;
  }, [ventureAssignments]);

  // Sectors for filter
  const sectors = useMemo(() => {
    const s = new Set(allVentures.map(v => v.sector));
    return Array.from(s).sort();
  }, [allVentures]);

  // Filtered + sorted ventures
  const filteredVentures = useMemo(() => {
    let list = [...ventureAnalytics];
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      list = list.filter(v => v.name.toLowerCase().includes(term) || v.sector.toLowerCase().includes(term));
    }
    if (sectorFilter !== "all") {
      list = list.filter(v => v.sector === sectorFilter);
    }
    list.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case "name": cmp = a.name.localeCompare(b.name); break;
        case "tasks": cmp = a.totalTasks - b.totalTasks; break;
        case "completion": cmp = a.completionRate - b.completionRate; break;
        case "overdue": cmp = a.overdueTasks - b.overdueTasks; break;
      }
      return sortDir === "desc" ? -cmp : cmp;
    });
    return list;
  }, [ventureAnalytics, searchTerm, sectorFilter, sortField, sortDir]);

  // Portfolio-level aggregates
  const completedCount = allTasks.filter(t => t.status === "complete").length;
  const openTasksCount = allTasks.filter(t => t.status !== "complete").length;
  const overdueCount = allTasks.filter(t => t.status !== "complete" && t.dueDate && new Date(t.dueDate) < now).length;
  const paidDistAmount = allDists.filter(d => d.status === "Paid").reduce((s, d) => s + (d.amount || 0), 0);

  // ── Mutations ──────────────────────────────────────────────────────
  const updateTask = trpc.tasks.update.useMutation({
    onSuccess: () => {
      utils.tasks.list.invalidate();
      utils.activity.recent.invalidate();
    },
  });

  // ── Sort toggle ────────────────────────────────────────────────────
  const toggleSort = useCallback((field: SortField) => {
    if (sortField === field) {
      setSortDir(d => d === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  }, [sortField]);

  if (pageLoading) {
    return (
      <div className="p-4 sm:p-5 md:p-6 space-y-5">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
        <Skeleton className="h-10 rounded-xl" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-44 rounded-xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-5 md:p-6 space-y-5 pb-24 md:pb-6">

      {/* ── KPI Summary — 4 cards, 2x2 on mobile ──────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          {
            label: "Partnerships",
            value: allVentures.length,
            sub: `${sectors.length} sectors`,
            icon: <Layers3 className="size-4" />,
            color: "#5B8DBE",
            href: "/ventures",
          },
          {
            label: "Open Tasks",
            value: openTasksCount,
            sub: overdueCount > 0 ? `${overdueCount} overdue` : "on track",
            icon: <ListChecks className="size-4" />,
            color: overdueCount > 0 ? "#EF4444" : "#F59E0B",
            href: "/tasks",
          },
          {
            label: "Active SPVs",
            value: allSpvs.filter(s => s.stage === "Active deal").length,
            sub: `${allSpvs.length} total`,
            icon: <Briefcase className="size-4" />,
            color: "#4ABFB0",
            href: "/spvs",
          },
          {
            label: "Distributed",
            value: formatCurrency(paidDistAmount),
            sub: "paid out",
            icon: <CircleDollarSign className="size-4" />,
            color: "#C9A96E",
            href: "/distributions",
          },
        ].map((kpi, i) => (
          <motion.div
            key={kpi.label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05, duration: 0.25 }}
            onClick={() => onNavigate(kpi.href)}
            className="bg-card border border-border rounded-xl p-4 cursor-pointer hover:border-primary/20 transition-all group"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">{kpi.label}</span>
              <span style={{ color: kpi.color }} className="opacity-50 group-hover:opacity-100 transition-opacity">{kpi.icon}</span>
            </div>
            <p className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground font-mono">{kpi.value}</p>
            <p className={cn("text-[11px] mt-1 font-mono", kpi.color === "#EF4444" ? "text-red-400" : "text-muted-foreground")}>{kpi.sub}</p>
          </motion.div>
        ))}
      </div>

      {/* ── AI Velocity — hidden on small screens ─────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.3 }}
        className="hidden sm:flex items-center justify-between bg-gradient-to-r from-purple-500/8 via-transparent to-emerald-500/8 border border-purple-500/15 rounded-xl px-5 py-3"
      >
        <div className="flex items-center gap-3">
          <Zap className="size-4 text-purple-400" />
          <span className="text-sm text-foreground">
            AI Velocity: tasks completing <span className="text-purple-400 font-medium">43% faster</span>
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-lg font-mono text-purple-400 font-light">+43%</span>
          <span className="text-lg font-mono text-emerald-400 font-light">4.2d avg</span>
        </div>
      </motion.div>

      {/* ── Quick Actions ─────────────────────────────────────────── */}
      <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-1">
        <Button variant="outline" size="sm" className="text-xs gap-1.5 h-9 flex-shrink-0" onClick={() => onNavigate("/ventures")}>
          <Plus className="size-3" /> Venture
        </Button>
        <Button variant="outline" size="sm" className="text-xs gap-1.5 h-9 flex-shrink-0" onClick={() => onNavigate("/tasks")}>
          <Plus className="size-3" /> Task
        </Button>
        <Button variant="outline" size="sm" className="text-xs gap-1.5 h-9 flex-shrink-0" onClick={() => onNavigate("/spvs")}>
          <Plus className="size-3" /> SPV
        </Button>
      </div>

      {/* ── Partnership Analytics Header ──────────────────────────── */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <BarChart3 className="size-4 text-primary" />
              Royalton Partnerships
            </h2>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {filteredVentures.length} of {allVentures.length} · {overdueCount} overdue tasks
            </p>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:flex-initial">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
              <Input
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 h-9 text-sm w-full sm:w-44"
              />
            </div>
            <select
              value={sectorFilter}
              onChange={(e) => setSectorFilter(e.target.value)}
              className="h-9 text-xs bg-card border border-border rounded-lg px-2.5 text-foreground"
            >
              <option value="all">All Sectors</option>
              {sectors.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <div className="hidden sm:flex items-center border border-border rounded-lg overflow-hidden">
              <button
                onClick={() => setViewMode("grid")}
                className={cn("p-2 transition-colors", viewMode === "grid" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground")}
              >
                <LayoutGrid className="size-3.5" />
              </button>
              <button
                onClick={() => setViewMode("table")}
                className={cn("p-2 transition-colors", viewMode === "table" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground")}
              >
                <List className="size-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* ── Partnership Grid ──────────────────────────────────────── */}
        {viewMode === "grid" ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {filteredVentures.map((v, i) => {
              const tc = getThemeColor(v.sector);
              const isExpanded = expandedVenture === v.id;
              const vTasks = allTasks.filter(t => t.ventureId === v.id);
              const members = (membersByVenture[v.id] || []).filter(m => m.memberName !== "Shwan Lee");
              const ringColor = v.completionRate >= 70 ? "#4ADE80" : v.completionRate >= 40 ? "#F59E0B" : tc.color;

              return (
                <motion.div
                  key={v.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i * 0.03, 0.3), duration: 0.25 }}
                  className="bg-card border border-border rounded-xl p-4 sm:p-5 relative overflow-hidden group cursor-pointer hover:border-primary/20 transition-all"
                  onClick={() => onNavigate(`/ventures/${v.slug}`)}
                >
                  {/* Top accent */}
                  <div className="absolute top-0 left-0 w-full h-0.5" style={{ backgroundColor: tc.color }} />

                  {/* Header: name + completion ring */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="size-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${tc.color}12` }}>
                        <span style={{ color: tc.color }}>{THEME_ICONS[v.sector] || <Package className="size-4" />}</span>
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">{v.name}</h3>
                        <p className="text-[11px] text-muted-foreground mt-0.5">{v.sector}</p>
                      </div>
                    </div>
                    <div className="relative flex-shrink-0">
                      <ProgressRing percent={v.completionRate} size={36} color={ringColor} />
                      <span className="absolute inset-0 flex items-center justify-center text-[9px] font-mono font-medium text-foreground">{v.completionRate}%</span>
                    </div>
                  </div>

                  {/* Key metrics — clean row */}
                  <div className="flex items-center gap-4 text-sm mb-3">
                    <div>
                      <span className="font-mono font-medium text-foreground">{v.totalTasks}</span>
                      <span className="text-[11px] text-muted-foreground ml-1">tasks</span>
                    </div>
                    {v.overdueTasks > 0 && (
                      <div>
                        <span className="font-mono font-medium text-red-400">{v.overdueTasks}</span>
                        <span className="text-[11px] text-red-400/70 ml-1">overdue</span>
                      </div>
                    )}
                    {v.spvCount > 0 && (
                      <div>
                        <span className="font-mono font-medium text-foreground">{v.spvCount}</span>
                        <span className="text-[11px] text-muted-foreground ml-1">SPVs</span>
                      </div>
                    )}
                  </div>

                  {/* Health + Stage */}
                  <div className="flex items-center justify-between">
                    <HealthIndicator score={v.healthScore ?? 50} />
                    <span className="text-[10px] text-muted-foreground">{v.stage}</span>
                  </div>

                  {/* Team members */}
                  {members.length > 0 && (
                    <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-border/50">
                      <div className="flex -space-x-1.5">
                        {members.slice(0, 4).map((m) => {
                          const initials = (m.memberName || "?").split(" ").map(w => w[0]).join("").slice(0, 2);
                          return (
                            <div
                              key={m.id}
                              title={`${m.memberName} — ${m.responsibility || m.memberRole}`}
                              className="size-6 rounded-full bg-primary/10 border border-background flex items-center justify-center"
                            >
                              <span className="text-[8px] font-medium text-primary">{initials}</span>
                            </div>
                          );
                        })}
                        {members.length > 4 && (
                          <div className="size-6 rounded-full bg-secondary border border-background flex items-center justify-center">
                            <span className="text-[8px] font-mono text-muted-foreground">+{members.length - 4}</span>
                          </div>
                        )}
                      </div>
                      <span className="text-[10px] text-muted-foreground ml-1">{members.length} members</span>
                    </div>
                  )}

                  {/* Expandable tasks */}
                  {v.totalTasks > 0 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setExpandedVenture(isExpanded ? null : v.id);
                      }}
                      className="flex items-center gap-1 mt-3 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <ChevronDown className={cn("size-3.5 transition-transform", isExpanded && "rotate-180")} />
                      {isExpanded ? "Hide tasks" : "Show tasks"}
                    </button>
                  )}

                  <AnimatePresence>
                    {isExpanded && v.totalTasks > 0 && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="mt-3 pt-3 border-t border-border space-y-2">
                          {vTasks.slice(0, 5).map((task) => {
                            const isComplete = task.status === "complete";
                            const isOverdue = !isComplete && task.dueDate && new Date(task.dueDate) < now;
                            return (
                              <div key={task.id} className="flex items-start gap-2 py-0.5">
                                <Checkbox
                                  checked={isComplete}
                                  onCheckedChange={() => {
                                    updateTask.mutate({ id: task.id, status: isComplete ? "open" : "complete" });
                                    if (!isComplete) toast.success("Task completed");
                                  }}
                                  className="size-4 mt-0.5"
                                  onClick={(e) => e.stopPropagation()}
                                />
                                <div className="min-w-0 flex-1">
                                  <span className={cn("text-[12px] text-foreground block", isComplete && "line-through opacity-50")}>{task.title}</span>
                                  <span className={cn("text-[11px] font-mono", isOverdue ? "text-red-400" : "text-muted-foreground/70")}>
                                    {task.dueDate ? formatDate(task.dueDate) : "No due date"}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                          {vTasks.length > 5 && (
                            <span className="text-[10px] text-muted-foreground font-mono">+{vTasks.length - 5} more</span>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>
        ) : (
          /* ── Table View ──────────────────────────────────────────── */
          <div className="bg-card border border-border rounded-xl overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  {[
                    { field: "name" as SortField, label: "Partnership" },
                    { field: "tasks" as SortField, label: "Tasks" },
                    { field: "completion" as SortField, label: "Done" },
                    { field: "overdue" as SortField, label: "Overdue" },
                  ].map(col => (
                    <th
                      key={col.field}
                      onClick={() => toggleSort(col.field)}
                      className="text-left text-[11px] uppercase tracking-wider text-muted-foreground font-medium p-3 sm:p-4 cursor-pointer hover:text-foreground transition-colors select-none"
                    >
                      <div className="flex items-center gap-1">
                        {col.label}
                        <ArrowUpDown className={cn("size-3", sortField === col.field ? "text-primary" : "opacity-30")} />
                      </div>
                    </th>
                  ))}
                  <th className="text-left text-[11px] uppercase tracking-wider text-muted-foreground font-medium p-3 sm:p-4">Team</th>
                  <th className="text-left text-[11px] uppercase tracking-wider text-muted-foreground font-medium p-3 sm:p-4">Health</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {filteredVentures.map((v) => {
                  const tc = getThemeColor(v.sector);
                  const members = (membersByVenture[v.id] || []).filter(m => m.memberName !== "Shwan Lee");
                  return (
                    <tr
                      key={v.id}
                      onClick={() => onNavigate(`/ventures/${v.slug}`)}
                      className="cursor-pointer hover:bg-accent/30 transition-colors"
                    >
                      <td className="p-3 sm:p-4">
                        <div className="flex items-center gap-2.5">
                          <div className="size-2 rounded-full flex-shrink-0" style={{ backgroundColor: tc.color }} />
                          <div>
                            <span className="font-medium text-foreground">{v.name}</span>
                            <span className="text-[11px] text-muted-foreground block">{v.sector}</span>
                          </div>
                        </div>
                      </td>
                      <td className="p-3 sm:p-4 font-mono">{v.totalTasks}</td>
                      <td className="p-3 sm:p-4">
                        <div className="flex items-center gap-2">
                          <div className="w-12 h-1.5 rounded-full bg-secondary overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${v.totalTasks > 0 ? v.completionRate : 0}%`,
                                backgroundColor: v.completionRate >= 70 ? "#4ADE80" : v.completionRate >= 40 ? "#F59E0B" : "#EF4444",
                              }}
                            />
                          </div>
                          <span className="font-mono text-[11px]">{v.completionRate}%</span>
                        </div>
                      </td>
                      <td className="p-3 sm:p-4">
                        <span className={cn("font-mono", v.overdueTasks > 0 ? "text-red-400 font-medium" : "text-muted-foreground")}>{v.overdueTasks}</span>
                      </td>
                      <td className="p-3 sm:p-4">
                        <div className="flex items-center gap-1">
                          <div className="flex -space-x-1">
                            {members.slice(0, 3).map((m) => {
                              const initials = (m.memberName || "?").split(" ").map(w => w[0]).join("").slice(0, 2);
                              return (
                                <div key={m.id} title={m.memberName || ""} className="size-5 rounded-full bg-primary/10 border border-background flex items-center justify-center">
                                  <span className="text-[7px] font-medium text-primary">{initials}</span>
                                </div>
                              );
                            })}
                          </div>
                          {members.length > 0 && <span className="text-[11px] font-mono text-muted-foreground ml-1">{members.length}</span>}
                        </div>
                      </td>
                      <td className="p-3 sm:p-4">
                        <HealthIndicator score={v.healthScore ?? 50} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Bottom Section: Activity + SPVs + Org Map ─────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Activity Feed */}
        <div className="bg-card border border-border rounded-xl p-4 sm:p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Activity className="size-4 text-emerald-400" />
              <span className="text-sm font-semibold text-foreground">Activity</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[11px] font-mono text-emerald-400">live</span>
            </div>
          </div>
          <div className="space-y-0 divide-y divide-border/50">
            {activityLogs.slice(0, 5).map((log) => {
              const tc = getThemeColor(log.sector || "Others");
              return (
                <div key={log.id} className="py-2.5 flex gap-3">
                  <div className="size-2 rounded-full mt-1.5 flex-shrink-0" style={{ backgroundColor: tc.color }} />
                  <div className="min-w-0">
                    <span className="text-[12px] font-medium text-foreground block">{log.action}</span>
                    <span className="text-[11px] text-muted-foreground block truncate">{log.detail}</span>
                    <span className="text-[10px] font-mono text-muted-foreground/60">
                      {formatTimestamp(log.createdAt instanceof Date ? log.createdAt.toISOString() : String(log.createdAt))}
                    </span>
                  </div>
                </div>
              );
            })}
            {activityLogs.length === 0 && (
              <p className="text-sm text-muted-foreground py-4 text-center">No recent activity</p>
            )}
          </div>
        </div>

        {/* Active SPVs + Distributions */}
        <div className="space-y-4">
          <div className="bg-card border border-border rounded-xl p-4 sm:p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Briefcase className="size-4 text-primary" />
                <span className="text-sm font-semibold text-foreground">Active SPVs</span>
              </div>
              <Button variant="ghost" size="sm" className="text-xs h-8 px-2 text-muted-foreground" onClick={() => onNavigate("/spvs")}>
                All <ChevronRight className="size-3 ml-0.5" />
              </Button>
            </div>
            <div className="space-y-0 divide-y divide-border/50">
              {allSpvs.filter(s => s.stage === "Active deal" || s.stage === "In negotiation").slice(0, 4).map((spv) => {
                const tc = getThemeColor(spv.sector || "Others");
                const sc = SPV_STAGE_CONFIG[spv.stage || ""];
                return (
                  <div
                    key={spv.id}
                    onClick={() => onNavigate(`/spvs/${spv.slug}`)}
                    className="py-2.5 flex items-center justify-between cursor-pointer hover:bg-accent/30 -mx-4 px-4 sm:-mx-5 sm:px-5 transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="size-2 rounded-full flex-shrink-0" style={{ backgroundColor: tc.color }} />
                      <span className="text-[12px] font-medium text-foreground truncate">{spv.name}</span>
                    </div>
                    {sc && <StatusBadge label={sc.label} bg={sc.bg} dot={sc.dot} />}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-4 sm:p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <DollarSign className="size-4 text-primary" />
                <span className="text-sm font-semibold text-foreground">Distributions</span>
              </div>
              <span className="text-[11px] font-mono text-emerald-400">{formatCurrency(paidDistAmount)}</span>
            </div>
            <div className="space-y-0 divide-y divide-border/50">
              {allDists.slice(0, 3).map((dist) => (
                <div
                  key={dist.id}
                  onClick={() => onNavigate("/distributions")}
                  className="py-2.5 flex items-center justify-between cursor-pointer hover:bg-accent/30 -mx-4 px-4 sm:-mx-5 sm:px-5 transition-colors"
                >
                  <div className="min-w-0">
                    <span className="text-[12px] font-medium text-foreground block truncate">{dist.name}</span>
                    <span className="text-[11px] text-muted-foreground">{dist.fund}</span>
                  </div>
                  <div className="text-right flex-shrink-0 ml-3">
                    <span className="text-[12px] font-mono font-medium text-foreground">{formatCurrency(dist.amount || 0)}</span>
                    <span className={cn("text-[11px] font-mono block",
                      dist.status === "Paid" ? "text-emerald-400" :
                      dist.status === "Cancelled" ? "text-red-400" : "text-blue-400"
                    )}>{dist.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Royalton Team */}
        <div className="bg-card border border-border rounded-xl p-4 sm:p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Network className="size-4 text-primary" />
              <span className="text-sm font-semibold text-foreground">Royalton Team</span>
            </div>
            <Button variant="ghost" size="sm" className="text-xs h-8 px-2 text-muted-foreground" onClick={() => onNavigate("/team")}>
              All <ChevronRight className="size-3 ml-0.5" />
            </Button>
          </div>
          {/* Summary — exclude Shwan (ATLAS operator) from Royalton counts */}
          {(() => {
            const royaltonTeam = allTeam.filter(t => t.name !== "Shwan Lee");
            const internalCount = royaltonTeam.filter(t => t.type === "Internal").length;
            const externalCount = royaltonTeam.filter(t => t.type === "External Partner").length;
            const advisorCount = royaltonTeam.filter(t => t.type === "Advisor").length;
            return (
              <div className="flex items-center gap-4 mb-4 pb-4 border-b border-border/50">
                <div>
                  <span className="text-lg font-mono font-semibold text-foreground">{internalCount}</span>
                  <p className="text-[10px] text-muted-foreground">Internal</p>
                </div>
                <div>
                  <span className="text-lg font-mono font-semibold text-foreground">{externalCount}</span>
                  <p className="text-[10px] text-muted-foreground">External</p>
                </div>
                <div>
                  <span className="text-lg font-mono font-semibold text-foreground">{advisorCount}</span>
                  <p className="text-[10px] text-muted-foreground">Advisors</p>
                </div>
              </div>
            );
          })()}
          {/* Royalton member list — exclude Shwan */}
          <div className="space-y-0 divide-y divide-border/30">
            {allTeam.filter(t => t.name !== "Shwan Lee").slice(0, 6).map((member) => {
              const memberVentures = venturesByMember[member.id] || [];
              const typeColor = member.type === "Internal" ? "text-blue-400" : member.type === "Advisor" ? "text-amber-400" : "text-emerald-400";
              const initials = member.name.split(" ").map(w => w[0]).join("").slice(0, 2);
              return (
                <div
                  key={member.id}
                  onClick={() => onNavigate(`/team/${member.slug}`)}
                  className="py-2.5 flex items-center gap-3 cursor-pointer hover:bg-accent/30 -mx-4 px-4 sm:-mx-5 sm:px-5 transition-colors"
                >
                  <div className="size-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-[9px] font-semibold text-primary">{initials}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[12px] font-medium text-foreground truncate">{member.name}</span>
                      <span className={cn("text-[9px] font-medium", typeColor)}>
                        {member.type === "External Partner" ? "EXT" : member.type === "Advisor" ? "ADV" : "INT"}
                      </span>
                    </div>
                    <span className="text-[11px] text-muted-foreground truncate block">{member.role || member.memberFunction}</span>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span className="text-[12px] font-mono font-medium text-foreground">{memberVentures.length}</span>
                    <p className="text-[9px] text-muted-foreground">ventures</p>
                  </div>
                </div>
              );
            })}
            {allTeam.filter(t => t.name !== "Shwan Lee").length > 6 && (
              <div className="pt-3 text-center">
                <button onClick={() => onNavigate("/team")} className="text-[11px] text-muted-foreground hover:text-foreground transition-colors">
                  View all {allTeam.filter(t => t.name !== "Shwan Lee").length} members →
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
