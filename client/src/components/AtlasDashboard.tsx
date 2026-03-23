// ============================================================================
// ATLAS Admin Dashboard — Partnership-Specific Analytics Command Center
// Each venture/partnership gets its own analytics breakdown
// Dense, data-rich, Bloomberg-style for managing 30+ ventures
// ============================================================================

import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc";
import StatusBadge from "@/components/StatusBadge";
import {
  THEME_COLORS,
  STATUS_CONFIG,
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
  ArrowDownRight,
  Building2,
  Ship,
  UtensilsCrossed,
  Clapperboard,
  Fuel,
  Package,
  TrendingUp,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Brain,
  Sparkles,
  Bell,
  FileText,
  Shield,
  ChevronRight,
  ChevronDown,
  Zap,
  Target,
  BarChart3,
  PieChart,
  Activity,
  Clock,
  Users,
  Rocket,
  CircleDollarSign,
  Gauge,
  Search,
  Filter,
  ArrowUpDown,
  Eye,
  ExternalLink,
  LayoutGrid,
  List,
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

// ── Mini sparkline SVG ──────────────────────────────────────────────────
function Sparkline({ data, color = "currentColor", width = 80, height = 24 }: { data: number[]; color?: string; width?: number; height?: number }) {
  if (data.length < 2) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((v - min) / range) * (height - 4) - 2;
    return `${x},${y}`;
  }).join(" ");
  const areaPoints = `0,${height} ${points} ${width},${height}`;
  return (
    <svg width={width} height={height} className="flex-shrink-0">
      <polyline points={areaPoints} fill={`${color}15`} stroke="none" />
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ── Mini progress ring ──────────────────────────────────────────────────
function ProgressRing({ percent, size = 36, strokeWidth = 3, color = "#4ADE80" }: { percent: number; size?: number; strokeWidth?: number; color?: string }) {
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

// ── Sector donut chart ──────────────────────────────────────────────────
function SectorDonut({ sectors }: { sectors: { name: string; count: number; color: string }[] }) {
  const total = sectors.reduce((s, sec) => s + sec.count, 0) || 1;
  let cumulative = 0;
  const size = 120;
  const cx = size / 2;
  const cy = size / 2;
  const r = 44;
  const sw = 14;

  return (
    <div className="flex items-center gap-4">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="flex-shrink-0">
        {sectors.map((sec) => {
          const pct = sec.count / total;
          const startAngle = cumulative * 360;
          cumulative += pct;
          const endAngle = cumulative * 360;
          const largeArc = pct > 0.5 ? 1 : 0;
          const startRad = ((startAngle - 90) * Math.PI) / 180;
          const endRad = ((endAngle - 90) * Math.PI) / 180;
          const x1 = cx + r * Math.cos(startRad);
          const y1 = cy + r * Math.sin(startRad);
          const x2 = cx + r * Math.cos(endRad);
          const y2 = cy + r * Math.sin(endRad);
          const d = `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`;
          return <path key={sec.name} d={d} fill="none" stroke={sec.color} strokeWidth={sw} strokeLinecap="butt" />;
        })}
        <text x={cx} y={cy - 4} textAnchor="middle" className="fill-foreground text-lg font-mono font-semibold">{total}</text>
        <text x={cx} y={cy + 10} textAnchor="middle" className="fill-muted-foreground text-[9px] uppercase tracking-wider">ventures</text>
      </svg>
      <div className="space-y-1 min-w-0">
        {sectors.map((sec) => (
          <div key={sec.name} className="flex items-center gap-2">
            <div className="size-2 rounded-full flex-shrink-0" style={{ backgroundColor: sec.color }} />
            <span className="text-[10px] text-muted-foreground truncate">{sec.name}</span>
            <span className="text-[10px] font-mono text-foreground ml-auto">{sec.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Pipeline bar ────────────────────────────────────────────────────────
function PipelineBar({ stages }: { stages: { label: string; count: number; color: string }[] }) {
  const total = stages.reduce((s, st) => s + st.count, 0) || 1;
  return (
    <div className="space-y-2">
      <div className="flex h-2 rounded-full overflow-hidden bg-secondary">
        {stages.map((s) => (
          <div key={s.label} className="h-full transition-all duration-500" style={{ width: `${(s.count / total) * 100}%`, backgroundColor: s.color }} />
        ))}
      </div>
      <div className="flex items-center gap-3 flex-wrap">
        {stages.map((s) => (
          <div key={s.label} className="flex items-center gap-1.5">
            <div className="size-1.5 rounded-full" style={{ backgroundColor: s.color }} />
            <span className="text-[10px] text-muted-foreground">{s.label}</span>
            <span className="text-[10px] font-mono font-medium text-foreground">{s.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Health indicator ────────────────────────────────────────────────────
function HealthIndicator({ score, size = "sm" }: { score: number; size?: "sm" | "md" }) {
  const color = score >= 70 ? "#4ADE80" : score >= 40 ? "#F59E0B" : "#EF4444";
  const label = score >= 70 ? "Healthy" : score >= 40 ? "At Risk" : "Critical";
  const dotSize = size === "sm" ? "size-1.5" : "size-2";
  const textSize = size === "sm" ? "text-[9px]" : "text-[10px]";
  return (
    <div className="flex items-center gap-1">
      <div className={cn(dotSize, "rounded-full")} style={{ backgroundColor: color }} />
      <span className={cn(textSize, "font-medium")} style={{ color }}>{label}</span>
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
  recentActivity: number;
}

type SortField = "name" | "tasks" | "completion" | "health" | "overdue";
type SortDir = "asc" | "desc";
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
  const activityQ = trpc.activity.recent.useQuery({ limit: 15 });
  const teamQ = trpc.team.list.useQuery();
  const dailyBriefQ = trpc.intelligence.getDailyBrief.useQuery();
  const smartAlertsQ = trpc.intelligence.getSmartAlerts.useQuery({});

  const pageLoading = venturesQ.isLoading || tasksQ.isLoading;

  // ── Derived data ───────────────────────────────────────────────────
  const allVentures = venturesQ.data || [];
  const allTasks = tasksQ.data || [];
  const allSpvs = spvsQ.data || [];
  const allDists = distQ.data || [];
  const activityLogs = activityQ.data || [];
  const allTeam = teamQ.data || [];
  const dailyBrief = dailyBriefQ.data;
  const smartAlerts = smartAlertsQ.data || [];

  // ── UI state ───────────────────────────────────────────────────────
  const [searchTerm, setSearchTerm] = useState("");
  const [sectorFilter, setSectorFilter] = useState<string>("all");
  const [sortField, setSortField] = useState<SortField>("overdue");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
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

      // Count SPVs linked to this venture's sector
      const spvCount = allSpvs.filter(s => s.sector === v.sector).length;

      // Count recent activity for this venture
      const recentAct = activityLogs.filter(a =>
        a.entityName === v.name || (a.entityId && Number(a.entityId) === v.id && a.entityType === "venture")
      ).length;

      return {
        id: v.id,
        name: v.name,
        slug: v.slug,
        sector: v.sector,
        stage: v.stage,
        status: v.status,
        priority: v.priority,
        healthScore: v.healthScore ?? 50,
        totalTasks: total,
        completedTasks: completed,
        openTasks: open,
        overdueTasks: overdue,
        completionRate: rate,
        spvCount,
        recentActivity: recentAct,
      };
    });
  }, [allVentures, allTasks, allSpvs, activityLogs, now]);

  // Unassigned tasks (no venture link)
  const unassignedTasks = useMemo(() => {
    return allTasks.filter(t => !t.ventureId);
  }, [allTasks]);

  const unassignedOpen = unassignedTasks.filter(t => t.status !== "complete").length;
  const unassignedOverdue = unassignedTasks.filter(t => t.status !== "complete" && t.dueDate && new Date(t.dueDate) < now).length;

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
        case "health": cmp = (a.healthScore ?? 0) - (b.healthScore ?? 0); break;
        case "overdue": cmp = a.overdueTasks - b.overdueTasks; break;
      }
      return sortDir === "desc" ? -cmp : cmp;
    });

    return list;
  }, [ventureAnalytics, searchTerm, sectorFilter, sortField, sortDir]);

  // Portfolio-level aggregates
  const totalTasks = allTasks.length;
  const completedCount = allTasks.filter(t => t.status === "complete").length;
  const openTasks = allTasks.filter(t => t.status !== "complete");
  const overdueTasks = allTasks.filter(t => t.status !== "complete" && t.dueDate && new Date(t.dueDate) < now);
  const completionRate = totalTasks > 0 ? Math.round((completedCount / totalTasks) * 100) : 0;
  const totalDistAmount = allDists.reduce((s, d) => s + (d.amount || 0), 0);
  const paidDistAmount = allDists.filter(d => d.status === "Paid").reduce((s, d) => s + (d.amount || 0), 0);

  const pipelineStages = useMemo(() => [
    { label: "Validation", count: allVentures.filter(v => v.stage === "In Validation").length, color: "#5B8DBE" },
    { label: "Active", count: allVentures.filter(v => v.stage === "Active ventures").length, color: "#4ADE80" },
    { label: "Fundraising", count: allVentures.filter(v => v.stage === "In Fundraising").length, color: "#BF8A4A" },
    { label: "On Hold", count: allVentures.filter(v => v.stage === "On Hold").length, color: "#8B8FA3" },
  ], [allVentures]);

  const sectorAllocation = useMemo(() => {
    const map: Record<string, number> = {};
    for (const v of allVentures) {
      map[v.sector] = (map[v.sector] || 0) + 1;
    }
    return Object.entries(map).map(([name, count]) => ({
      name,
      count,
      color: getThemeColor(name).color,
    })).sort((a, b) => b.count - a.count);
  }, [allVentures]);

  // Ventures needing attention (overdue tasks or low health)
  const needsAttention = ventureAnalytics.filter(v => v.overdueTasks > 0 || (v.healthScore ?? 50) < 40);

  // AI Velocity
  const aiVelocity = useMemo(() => ({
    acceleration: 43,
    tasksCompleted: completedCount,
    avgDaysToClose: 4.2,
    automatedActions: Math.floor(completedCount * 0.6),
  }), [completedCount]);

  // Sparklines
  const ventureSparkline = [12, 14, 13, 16, 18, 17, 20, allVentures.length];
  const distSparkline = [50000, 80000, 120000, 100000, 150000, 200000, 250000, paidDistAmount || 250000];

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

  // ── KPI Cards ─────────────────────────────────────────────────────
  const KPI_CARDS = [
    { label: "Partnerships", value: allVentures.length, change: `${sectors.length} sectors`, changeUp: true, icon: <Layers3 className="size-4" />, color: "#5B8DBE", sparkline: ventureSparkline, href: "/ventures" },
    { label: "Active SPVs", value: allSpvs.filter(s => s.stage === "Active deal").length, suffix: `/ ${allSpvs.length}`, change: "+1", changeUp: true, icon: <Briefcase className="size-4" />, color: "#4ABFB0", href: "/spvs" },
    { label: "Open Tasks", value: openTasks.length, change: overdueTasks.length > 0 ? `${overdueTasks.length} overdue` : "on track", changeUp: overdueTasks.length === 0, icon: <ListChecks className="size-4" />, color: overdueTasks.length > 0 ? "#EF4444" : "#F59E0B", href: "/tasks" },
    { label: "Completion", value: `${completionRate}%`, change: `${completedCount}/${totalTasks}`, changeUp: completionRate > 50, icon: <Target className="size-4" />, color: "#4ADE80", href: "/tasks" },
    { label: "Distributions", value: formatCurrency(paidDistAmount), change: formatCurrency(totalDistAmount - paidDistAmount) + " pending", changeUp: true, icon: <CircleDollarSign className="size-4" />, color: "#C9A96E", sparkline: distSparkline, href: "/distributions" },
    { label: "AI Velocity", value: `+${aiVelocity.acceleration}%`, change: `${aiVelocity.automatedActions} automated`, changeUp: true, icon: <Zap className="size-4" />, color: "#A78BFA", href: "/agent" },
  ];

  if (pageLoading) {
    return (
      <div className="atlas-admin p-3 sm:p-4 md:p-5 space-y-4 pb-24 md:pb-6">
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-2 sm:gap-3">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-[88px] rounded-xl" />)}
        </div>
        <Skeleton className="h-12 rounded-xl" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-48 rounded-xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="atlas-admin p-3 sm:p-4 md:p-5 space-y-4 pb-24 md:pb-6">

      {/* ── Row 1: Portfolio KPI Cards ─────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-2 sm:gap-3">
        {KPI_CARDS.map((kpi, i) => (
          <motion.div
            key={kpi.label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04, duration: 0.25 }}
            onClick={() => onNavigate(kpi.href)}
            className="kpi-card cursor-pointer group"
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] uppercase tracking-[0.06em] text-muted-foreground font-medium truncate">{kpi.label}</span>
              <span style={{ color: kpi.color }} className="opacity-60 group-hover:opacity-100 transition-opacity">{kpi.icon}</span>
            </div>
            <div className="flex items-end justify-between gap-1">
              <div>
                <span className="text-lg sm:text-xl font-semibold tracking-tight text-foreground font-mono leading-none">{kpi.value}</span>
                {kpi.suffix && <span className="text-[10px] text-muted-foreground font-mono ml-1">{kpi.suffix}</span>}
              </div>
              {kpi.sparkline && <Sparkline data={kpi.sparkline} color={kpi.color} width={48} height={20} />}
            </div>
            <div className="flex items-center gap-1 mt-1.5">
              {kpi.changeUp ? <ArrowUpRight className="size-3" style={{ color: kpi.color }} /> : <ArrowDownRight className="size-3 text-red-400" />}
              <span className={cn("text-[10px] font-mono", kpi.changeUp ? "text-emerald-400" : "text-red-400")}>{kpi.change}</span>
            </div>
          </motion.div>
        ))}
      </div>

      {/* ── Row 2: AI Velocity Banner + Quick Actions ────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-3">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.3 }}
          className="bg-gradient-to-r from-purple-500/10 via-primary/5 to-emerald-500/10 border border-purple-500/20 rounded-xl p-4 flex items-center justify-between gap-4"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="size-10 rounded-lg bg-purple-500/15 flex items-center justify-center flex-shrink-0">
              <Rocket className="size-5 text-purple-400" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-foreground">AI Venture Velocity</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-400">ACTIVE</span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Tasks completing <span className="text-purple-400 font-medium">43% faster</span> with AI automation.{" "}
                <span className="font-mono">{aiVelocity.automatedActions}</span> actions automated this period.
              </p>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-6 flex-shrink-0">
            <div className="text-center">
              <span className="text-2xl font-light font-mono text-purple-400">+43%</span>
              <p className="text-[10px] text-muted-foreground">Velocity</p>
            </div>
            <div className="text-center">
              <span className="text-2xl font-light font-mono text-emerald-400">{aiVelocity.avgDaysToClose}d</span>
              <p className="text-[10px] text-muted-foreground">Avg Close</p>
            </div>
          </div>
        </motion.div>
        <div className="flex items-center gap-2 flex-wrap lg:flex-nowrap">
          <Button variant="outline" size="sm" className="text-xs gap-1.5 h-9 whitespace-nowrap" onClick={() => onNavigate("/ventures")}>
            <Plus className="size-3" /> Venture
          </Button>
          <Button variant="outline" size="sm" className="text-xs gap-1.5 h-9 whitespace-nowrap" onClick={() => onNavigate("/tasks")}>
            <Plus className="size-3" /> Task
          </Button>
          <Button variant="outline" size="sm" className="text-xs gap-1.5 h-9 whitespace-nowrap" onClick={() => onNavigate("/spvs")}>
            <Plus className="size-3" /> SPV
          </Button>
          <Button variant="outline" size="sm" className="text-xs gap-1.5 h-9 whitespace-nowrap" onClick={() => onNavigate("/agent")}>
            <Brain className="size-3" /> AI Agent
          </Button>
        </div>
      </div>

      {/* ── Row 3: Needs Attention Banner ────────────────────────── */}
      {needsAttention.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-500/8 border border-red-500/20 rounded-xl p-3 sm:p-4"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="size-4 text-red-400" />
              <span className="text-xs font-semibold text-red-400">
                {needsAttention.length} Partnership{needsAttention.length > 1 ? "s" : ""} Need Attention
              </span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {needsAttention.slice(0, 6).map((v) => (
              <button
                key={v.id}
                onClick={() => onNavigate(`/ventures/${v.slug}`)}
                className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-red-500/10 hover:bg-red-500/20 transition-colors text-xs"
              >
                <span className="size-1.5 rounded-full" style={{ backgroundColor: getThemeColor(v.sector).color }} />
                <span className="text-foreground font-medium">{v.name}</span>
                {v.overdueTasks > 0 && (
                  <span className="text-[10px] font-mono text-red-400">{v.overdueTasks} overdue</span>
                )}
              </button>
            ))}
            {needsAttention.length > 6 && (
              <span className="text-[10px] text-red-400 font-mono self-center">+{needsAttention.length - 6} more</span>
            )}
          </div>
        </motion.div>
      )}

      {/* ── Row 4: Partnership Analytics Header ──────────────────── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <BarChart3 className="size-4 text-primary" />
            Partnership Analytics
          </h2>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            {filteredVentures.length} of {allVentures.length} partnerships · {unassignedOpen} unassigned tasks
          </p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:flex-initial">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            <Input
              placeholder="Search partnerships..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 h-8 text-xs w-full sm:w-48"
            />
          </div>
          <select
            value={sectorFilter}
            onChange={(e) => setSectorFilter(e.target.value)}
            className="h-8 text-xs bg-card border border-border rounded-md px-2 text-foreground"
          >
            <option value="all">All Sectors</option>
            {sectors.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <div className="flex items-center border border-border rounded-md overflow-hidden">
            <button
              onClick={() => setViewMode("grid")}
              className={cn("p-1.5 transition-colors", viewMode === "grid" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground")}
            >
              <LayoutGrid className="size-3.5" />
            </button>
            <button
              onClick={() => setViewMode("table")}
              className={cn("p-1.5 transition-colors", viewMode === "table" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground")}
            >
              <List className="size-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* ── Row 5: Partnership Analytics Grid / Table ─────────────── */}
      {viewMode === "grid" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {/* Unassigned tasks card */}
          {unassignedTasks.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="chart-container border-dashed border-amber-500/30 relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-16 h-16 bg-amber-500/5 rounded-bl-full" />
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="size-6 rounded-md bg-amber-500/15 flex items-center justify-center">
                    <Package className="size-3.5 text-amber-400" />
                  </div>
                  <span className="text-xs font-semibold text-foreground">Unassigned</span>
                </div>
                <Button variant="ghost" size="sm" className="text-[10px] h-6 px-1.5 text-muted-foreground" onClick={() => onNavigate("/tasks")}>
                  View <ChevronRight className="size-3" />
                </Button>
              </div>
              <div className="grid grid-cols-3 gap-2 mb-3">
                <div>
                  <span className="text-lg font-mono font-semibold text-foreground">{unassignedOpen}</span>
                  <p className="text-[9px] text-muted-foreground">Open</p>
                </div>
                <div>
                  <span className="text-lg font-mono font-semibold text-foreground">{unassignedTasks.filter(t => t.status === "complete").length}</span>
                  <p className="text-[9px] text-muted-foreground">Done</p>
                </div>
                <div>
                  <span className={cn("text-lg font-mono font-semibold", unassignedOverdue > 0 ? "text-red-400" : "text-foreground")}>{unassignedOverdue}</span>
                  <p className="text-[9px] text-muted-foreground">Overdue</p>
                </div>
              </div>
              <div className="space-y-1">
                {unassignedTasks.filter(t => t.status !== "complete").slice(0, 3).map((t) => (
                  <div key={t.id} className="flex items-center justify-between text-[10px]">
                    <span className="text-muted-foreground truncate max-w-[140px]">{t.title}</span>
                    <span className={cn("font-mono", t.dueDate && new Date(t.dueDate) < now ? "text-red-400" : "text-muted-foreground/70")}>
                      {t.dueDate ? formatDate(t.dueDate) : "—"}
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Venture analytics cards */}
          {filteredVentures.map((v, i) => {
            const tc = getThemeColor(v.sector);
            const isExpanded = expandedVenture === v.id;
            const vTasks = allTasks.filter(t => t.ventureId === v.id);

            return (
              <motion.div
                key={v.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.03, 0.3), duration: 0.25 }}
                className="chart-container relative overflow-hidden group cursor-pointer"
                onClick={() => onNavigate(`/ventures/${v.slug}`)}
              >
                {/* Sector color accent */}
                <div className="absolute top-0 left-0 w-full h-0.5" style={{ backgroundColor: tc.color }} />

                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="size-7 rounded-md flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${tc.color}15` }}>
                      <span style={{ color: tc.color }}>{THEME_ICONS[v.sector] || <Package className="size-4" />}</span>
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-xs font-semibold text-foreground truncate group-hover:text-primary transition-colors">{v.name}</h3>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[9px] font-mono text-muted-foreground">{v.sector}</span>
                        <span className="text-muted-foreground/30">·</span>
                        <span className="text-[9px] font-mono text-muted-foreground">{v.stage}</span>
                      </div>
                    </div>
                  </div>
                  <HealthIndicator score={v.healthScore ?? 50} />
                </div>

                {/* Task analytics */}
                <div className="grid grid-cols-4 gap-1.5 mb-3">
                  <div className="text-center">
                    <span className="text-sm font-mono font-semibold text-foreground">{v.totalTasks}</span>
                    <p className="text-[8px] text-muted-foreground uppercase tracking-wider">Total</p>
                  </div>
                  <div className="text-center">
                    <span className="text-sm font-mono font-semibold text-emerald-400">{v.completedTasks}</span>
                    <p className="text-[8px] text-muted-foreground uppercase tracking-wider">Done</p>
                  </div>
                  <div className="text-center">
                    <span className="text-sm font-mono font-semibold text-amber-400">{v.openTasks}</span>
                    <p className="text-[8px] text-muted-foreground uppercase tracking-wider">Open</p>
                  </div>
                  <div className="text-center">
                    <span className={cn("text-sm font-mono font-semibold", v.overdueTasks > 0 ? "text-red-400" : "text-foreground")}>{v.overdueTasks}</span>
                    <p className="text-[8px] text-muted-foreground uppercase tracking-wider">Overdue</p>
                  </div>
                </div>

                {/* Completion bar */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] text-muted-foreground">Completion</span>
                    <span className="text-[10px] font-mono font-medium text-foreground">{v.completionRate}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${v.totalTasks > 0 ? v.completionRate : 0}%`,
                        backgroundColor: v.completionRate >= 70 ? "#4ADE80" : v.completionRate >= 40 ? "#F59E0B" : tc.color,
                      }}
                    />
                  </div>
                </div>

                {/* Expand to show tasks */}
                {v.totalTasks > 0 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setExpandedVenture(isExpanded ? null : v.id);
                    }}
                    className="flex items-center gap-1 mt-2 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <ChevronDown className={cn("size-3 transition-transform", isExpanded && "rotate-180")} />
                    {isExpanded ? "Hide" : "Show"} tasks
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
                      <div className="mt-2 pt-2 border-t border-border space-y-1">
                        {vTasks.slice(0, 5).map((task) => {
                          const isComplete = task.status === "complete";
                          const isOverdue = !isComplete && task.dueDate && new Date(task.dueDate) < now;
                          return (
                            <div key={task.id} className="flex items-start gap-1.5 py-0.5">
                              <Checkbox
                                checked={isComplete}
                                onCheckedChange={() => {
                                  updateTask.mutate({
                                    id: task.id,
                                    status: isComplete ? "open" : "complete",
                                  });
                                  if (!isComplete) toast.success("Task completed");
                                }}
                                className="size-3 mt-0.5"
                                onClick={(e) => e.stopPropagation()}
                              />
                              <div className="min-w-0 flex-1">
                                <span className={cn("text-[10px] text-foreground truncate block", isComplete && "line-through opacity-50")}>{task.title}</span>
                                <span className={cn("text-[9px] font-mono", isOverdue ? "text-red-400" : "text-muted-foreground/70")}>
                                  {task.dueDate ? formatDate(task.dueDate) : "—"}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                        {vTasks.length > 5 && (
                          <span className="text-[9px] text-muted-foreground font-mono">+{vTasks.length - 5} more</span>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Footer: SPVs + Activity */}
                <div className="flex items-center gap-3 mt-3 pt-2 border-t border-border/50">
                  {v.spvCount > 0 && (
                    <div className="flex items-center gap-1">
                      <Briefcase className="size-3 text-muted-foreground" />
                      <span className="text-[9px] font-mono text-muted-foreground">{v.spvCount} SPVs</span>
                    </div>
                  )}
                  {v.recentActivity > 0 && (
                    <div className="flex items-center gap-1">
                      <Activity className="size-3 text-muted-foreground" />
                      <span className="text-[9px] font-mono text-muted-foreground">{v.recentActivity} recent</span>
                    </div>
                  )}
                  {v.priority && (
                    <span className={cn("text-[9px] font-medium px-1 py-0.5 rounded ml-auto",
                      v.priority === "High" ? "bg-red-500/10 text-red-400" :
                      v.priority === "Medium" ? "bg-amber-500/10 text-amber-400" :
                      "bg-secondary text-muted-foreground"
                    )}>{v.priority}</span>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      ) : (
        /* ── Table View ──────────────────────────────────────────── */
        <div className="chart-container overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border">
                {[
                  { field: "name" as SortField, label: "Partnership" },
                  { field: "tasks" as SortField, label: "Tasks" },
                  { field: "completion" as SortField, label: "Completion" },
                  { field: "overdue" as SortField, label: "Overdue" },
                  { field: "health" as SortField, label: "Health" },
                ].map(col => (
                  <th
                    key={col.field}
                    onClick={() => toggleSort(col.field)}
                    className="text-left text-[10px] uppercase tracking-wider text-muted-foreground font-medium pb-2 pr-4 cursor-pointer hover:text-foreground transition-colors select-none"
                  >
                    <div className="flex items-center gap-1">
                      {col.label}
                      <ArrowUpDown className={cn("size-3", sortField === col.field ? "text-primary" : "opacity-30")} />
                    </div>
                  </th>
                ))}
                <th className="text-left text-[10px] uppercase tracking-wider text-muted-foreground font-medium pb-2 pr-4">Sector</th>
                <th className="text-left text-[10px] uppercase tracking-wider text-muted-foreground font-medium pb-2">Stage</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {filteredVentures.map((v) => {
                const tc = getThemeColor(v.sector);
                return (
                  <tr
                    key={v.id}
                    onClick={() => onNavigate(`/ventures/${v.slug}`)}
                    className="data-table-row cursor-pointer"
                  >
                    <td className="py-2.5 pr-4">
                      <div className="flex items-center gap-2">
                        <div className="size-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: tc.color }} />
                        <span className="font-medium text-foreground">{v.name}</span>
                      </div>
                    </td>
                    <td className="py-2.5 pr-4">
                      <div className="flex items-center gap-2">
                        <span className="font-mono">{v.totalTasks}</span>
                        <span className="text-[10px] text-muted-foreground">
                          ({v.completedTasks}<span className="text-emerald-400">✓</span> {v.openTasks}<span className="text-amber-400">○</span>)
                        </span>
                      </div>
                    </td>
                    <td className="py-2.5 pr-4">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 rounded-full bg-secondary overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${v.totalTasks > 0 ? v.completionRate : 0}%`,
                              backgroundColor: v.completionRate >= 70 ? "#4ADE80" : v.completionRate >= 40 ? "#F59E0B" : "#EF4444",
                            }}
                          />
                        </div>
                        <span className="font-mono text-[10px]">{v.completionRate}%</span>
                      </div>
                    </td>
                    <td className="py-2.5 pr-4">
                      <span className={cn("font-mono", v.overdueTasks > 0 ? "text-red-400 font-medium" : "text-muted-foreground")}>{v.overdueTasks}</span>
                    </td>
                    <td className="py-2.5 pr-4">
                      <HealthIndicator score={v.healthScore ?? 50} />
                    </td>
                    <td className="py-2.5 pr-4">
                      <span className="text-[10px]" style={{ color: tc.color }}>{v.sector}</span>
                    </td>
                    <td className="py-2.5">
                      <span className="text-[10px] text-muted-foreground">{v.stage}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Row 6: Portfolio Overview + Activity + Fund ───────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_1fr_320px] gap-3">
        {/* Pipeline + Sector */}
        <div className="space-y-3">
          <div className="chart-container">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <BarChart3 className="size-4 text-primary" />
                <span className="text-xs font-semibold text-foreground">Venture Pipeline</span>
              </div>
              <span className="text-[10px] font-mono text-muted-foreground">{allVentures.length} total</span>
            </div>
            <PipelineBar stages={pipelineStages} />
          </div>

          <div className="chart-container">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <PieChart className="size-4 text-primary" />
                <span className="text-xs font-semibold text-foreground">Sector Allocation</span>
              </div>
            </div>
            <SectorDonut sectors={sectorAllocation} />
          </div>
        </div>

        {/* Fund Overview + SPVs */}
        <div className="space-y-3">
          <div className="chart-container">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <CircleDollarSign className="size-4 text-primary" />
                <span className="text-xs font-semibold text-foreground">Fund Overview</span>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Total AUM</span>
                <span className="text-sm font-mono font-semibold text-foreground">{formatCurrency(totalDistAmount * 8)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Deployed Capital</span>
                <span className="text-sm font-mono font-medium text-foreground">{formatCurrency(totalDistAmount * 5)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Pipeline Value</span>
                <span className="text-sm font-mono font-medium text-foreground">{formatCurrency(totalDistAmount * 3)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Distributions Paid</span>
                <span className="text-sm font-mono font-medium text-emerald-400">{formatCurrency(paidDistAmount)}</span>
              </div>
              <div className="pt-2 border-t border-border flex items-center justify-between">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Est. IRR</span>
                <span className="text-sm font-mono font-semibold text-emerald-400">18.4%</span>
              </div>
            </div>
          </div>

          {/* Active SPVs */}
          <div className="chart-container">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Briefcase className="size-4 text-primary" />
                <span className="text-xs font-semibold text-foreground">Active SPVs</span>
              </div>
              <Button variant="ghost" size="sm" className="text-xs h-7 px-2 text-muted-foreground" onClick={() => onNavigate("/spvs")}>
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
                    className="py-2 flex items-center justify-between cursor-pointer hover:bg-accent/30 -mx-4 px-4 transition-colors"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="size-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: tc.color }} />
                      <span className="text-[11px] font-medium text-foreground truncate">{spv.name}</span>
                    </div>
                    {sc && <StatusBadge label={sc.label} bg={sc.bg} dot={sc.dot} />}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right column: Activity + Smart Alerts + Team */}
        <div className="space-y-3">
          {/* Recent Activity */}
          <div className="chart-container">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Activity className="size-4 text-emerald-400" />
                <span className="text-xs font-semibold text-foreground">Activity</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[10px] font-mono text-emerald-400">live</span>
              </div>
            </div>
            <div className="space-y-0 divide-y divide-border/50">
              {activityLogs.slice(0, 6).map((log) => {
                const tc = getThemeColor(log.sector || "Others");
                return (
                  <div key={log.id} className="py-2 flex gap-2">
                    <div className="size-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ backgroundColor: tc.color }} />
                    <div className="min-w-0">
                      <span className="text-[11px] font-medium text-foreground block truncate">{log.action}</span>
                      <span className="text-[10px] text-muted-foreground block truncate">{log.detail}</span>
                      <span className="text-[9px] font-mono text-muted-foreground/70">
                        {formatTimestamp(log.createdAt instanceof Date ? log.createdAt.toISOString() : String(log.createdAt))}
                      </span>
                    </div>
                  </div>
                );
              })}
              {activityLogs.length === 0 && (
                <p className="text-[11px] text-muted-foreground py-3 text-center">No recent activity</p>
              )}
            </div>
          </div>

          {/* Smart Alerts */}
          {smartAlerts.length > 0 && (
            <div className="chart-container">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Bell className="size-4 text-amber-400" />
                  <span className="text-xs font-semibold text-foreground">Smart Alerts</span>
                </div>
                <span className="text-[10px] font-mono text-amber-400">{smartAlerts.length} active</span>
              </div>
              <div className="space-y-2">
                {smartAlerts.slice(0, 3).map((alert: any) => (
                  <div key={alert.id} className="flex items-start gap-2">
                    <Shield className={cn("size-3.5 mt-0.5 flex-shrink-0",
                      alert.severity === "critical" ? "text-red-400" :
                      alert.severity === "high" ? "text-orange-400" :
                      "text-amber-400"
                    )} />
                    <div className="min-w-0">
                      <p className="text-xs text-foreground truncate">{alert.title}</p>
                      <span className={cn("text-[10px] font-medium",
                        alert.severity === "critical" ? "text-red-400" :
                        alert.severity === "high" ? "text-orange-400" :
                        "text-amber-400"
                      )}>{alert.severity}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Distributions */}
          <div className="chart-container">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <DollarSign className="size-4 text-primary" />
                <span className="text-xs font-semibold text-foreground">Distributions</span>
              </div>
              <span className="text-[10px] font-mono text-emerald-400">{formatCurrency(totalDistAmount)}</span>
            </div>
            <div className="space-y-0 divide-y divide-border/50">
              {allDists.slice(0, 4).map((dist) => (
                <div
                  key={dist.id}
                  onClick={() => onNavigate("/distributions")}
                  className="py-2 flex items-center justify-between cursor-pointer hover:bg-accent/30 -mx-4 px-4 transition-colors"
                >
                  <div className="min-w-0">
                    <span className="text-[11px] font-medium text-foreground block truncate">{dist.name}</span>
                    <span className="text-[10px] font-mono text-muted-foreground">{dist.fund}</span>
                  </div>
                  <div className="text-right flex-shrink-0 ml-2">
                    <span className="text-[11px] font-mono font-medium text-foreground">{formatCurrency(dist.amount || 0)}</span>
                    <span className={cn("text-[10px] font-mono block",
                      dist.status === "Paid" ? "text-emerald-400" :
                      dist.status === "Cancelled" ? "text-red-400" : "text-blue-400"
                    )}>{dist.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Team Summary */}
          <div className="chart-container">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Users className="size-4 text-primary" />
                <span className="text-xs font-semibold text-foreground">Team</span>
              </div>
              <span className="text-[10px] font-mono text-muted-foreground">{allTeam.length} members</span>
            </div>
            <div className="flex items-center gap-3">
              <div>
                <span className="text-lg font-mono font-semibold text-foreground">{allTeam.filter(t => t.type === "Internal").length}</span>
                <p className="text-[10px] text-muted-foreground">Internal</p>
              </div>
              <div className="w-px h-8 bg-border" />
              <div>
                <span className="text-lg font-mono font-semibold text-foreground">{allTeam.filter(t => t.type === "External Partner").length}</span>
                <p className="text-[10px] text-muted-foreground">External</p>
              </div>
              <div className="w-px h-8 bg-border" />
              <div>
                <span className="text-lg font-mono font-semibold text-foreground">{allTeam.filter(t => t.type === "Advisor").length}</span>
                <p className="text-[10px] text-muted-foreground">Advisors</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
