// VENTEX Admin Dashboard — Velocity AI Venture System
// Premium CRM command center for managing 30+ UHNWI/HNWI clients
// Velocity metrics, completion %, task velocity, progress trends per client

import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc";
import AnimatedCounter from "@/components/AnimatedCounter";
import {
  Building2,
  Search,
  ArrowUpDown,
  LayoutGrid,
  List,
  Plus,
  ChevronRight,
  AlertTriangle,
  Users,
  Layers3,
  ListChecks,
  Activity,
  TrendingUp,
  Loader2,
  Trash2,
  Archive,
  ArchiveRestore,
  Zap,
  Target,
  ArrowUp,
  ArrowDown,
  Minus,
  Mail,
  Brain,
  Bot,
  Download,
  Rocket,
  Check,
  UserPlus,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useCallback, useMemo } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import AITaskGenerator from "@/components/AITaskGenerator";
import { exportCSV, VENTURE_COLUMNS } from "@/lib/export";
import OverdueAlertBanner from "@/components/OverdueAlertBanner";
import LivePresenceWidget from "@/components/LivePresenceWidget";
import VelocityIntelligenceCard from "@/components/VelocityIntelligenceCard";
import AgentExecutionLog from "@/components/AgentExecutionLog";
import ExecutiveSummaryWidget from "@/components/ExecutiveSummaryWidget";
import MorningBriefingCard from "@/components/MorningBriefingCard";

type SortField = "name" | "ventures" | "velocity" | "overdue" | "health" | "completion";
type ViewMode = "grid" | "table";
type TabMode = "active" | "archived";

interface VentexDashboardProps {
  onNavigate: (path: string) => void;
}

function VelocityBadge({ rate }: { rate: number }) {
  if (rate < 0) {
    return (
      <div className="flex items-center gap-1">
        <div className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-secondary">
          <span className="text-[11px] font-mono font-medium text-muted-foreground">N/A</span>
        </div>
      </div>
    );
  }
  if (rate >= 70) {
    return (
      <div className="flex items-center gap-1">
        <div className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-emerald-500/10">
          <ArrowUp className="size-3 text-emerald-400" />
          <span className="text-[11px] font-mono font-medium text-emerald-400">{rate}%</span>
        </div>
      </div>
    );
  }
  if (rate >= 40) {
    return (
      <div className="flex items-center gap-1">
        <div className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-amber-500/10">
          <Minus className="size-3 text-amber-400" />
          <span className="text-[11px] font-mono font-medium text-amber-400">{rate}%</span>
        </div>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-1">
      <div className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-red-500/10">
        <ArrowDown className="size-3 text-red-400" />
        <span className="text-[11px] font-mono font-medium text-red-400">{rate}%</span>
      </div>
    </div>
  );
}

function ProgressRing({ value, size = 32 }: { value: number; size?: number }) {
  const r = (size - 4) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (value / 100) * circ;
  const color = value >= 70 ? "#4ADE80" : value >= 40 ? "#F59E0B" : "#EF4444";
  return (
    <svg width={size} height={size} className="flex-shrink-0 -rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeWidth={2.5} className="text-secondary" />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={2.5} strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" className="transition-all duration-700" />
    </svg>
  );
}

function OverdueBadge({ count }: { count: number }) {
  if (count === 0) return <span className="text-[11px] font-mono text-muted-foreground">0</span>;
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-mono font-medium text-red-400">
      <AlertTriangle className="size-3" />
      {count}
    </span>
  );
}

function timeAgo(date: Date | string | null): string {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d ago`;
  return `${Math.floor(diffDay / 7)}w ago`;
}

function AgentIndicator({ action, agentName, actionAt }: {
  action: string | null;
  agentName: string | null;
  actionAt: Date | string | null;
}) {
  if (!action || !actionAt) {
    return <span className="text-[10px] text-muted-foreground/40 font-mono">No activity</span>;
  }
  const ago = timeAgo(actionAt);
  const shortName = agentName?.replace(" Agent", "") || "Agent";
  // Truncate action to first ~30 chars
  const shortAction = action.length > 35 ? action.slice(0, 32) + "..." : action;
  return (
    <div className="flex items-center gap-1.5 max-w-[180px]">
      <Bot className="size-3 text-primary flex-shrink-0" />
      <div className="min-w-0">
        <p className="text-[10px] text-foreground truncate" title={action}>{shortAction}</p>
        <p className="text-[9px] text-muted-foreground font-mono">{shortName} {ago}</p>
      </div>
    </div>
  );
}

function fmtCurrency(amount: number): string {
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `$${(amount / 1_000).toFixed(0)}K`;
  return `$${amount.toLocaleString()}`;
}

export default function VentexDashboard({ onNavigate }: VentexDashboardProps) {
  // Fetch active clients (default)
  const activeClientsQ = trpc.organizations.listWithMetrics.useQuery();
  // Fetch archived clients separately
  const archivedClientsQ = trpc.organizations.listWithMetrics.useQuery({ includeArchived: true });
  const utils = trpc.useUtils();
  const draftStatsQ = trpc.agents.draftStats.useQuery();

  const invalidateAll = () => {
    activeClientsQ.refetch();
    archivedClientsQ.refetch();
    utils.organizations.list.invalidate();
  };

  const createOrg = trpc.organizations.create.useMutation({
    onSuccess: (created) => {
      invalidateAll();
      setAddDialogOpen(false);
      toast.success(`Client "${created.name}" created`);
      // Show onboarding redirect dialog
      setShowOnboardRedirect({ id: created.id, name: created.name });
    },
    onError: (err) => toast.error(err.message),
  });

  const archiveOrg = trpc.organizations.archive.useMutation({
    onSuccess: (data) => {
      invalidateAll();
      setArchiveTarget(null);
      toast.success(`"${data.name}" has been archived`);
    },
    onError: (err) => toast.error(err.message),
  });

  const restoreOrg = trpc.organizations.restore.useMutation({
    onSuccess: (data) => {
      invalidateAll();
      toast.success(`"${data.name}" has been restored`);
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteOrg = trpc.organizations.delete.useMutation({
    onSuccess: (data) => {
      invalidateAll();
      setDeleteTarget(null);
      toast.success(`"${data.name}" has been permanently deleted`);
    },
    onError: (err) => toast.error(err.message),
  });

  // Separate active vs archived from the full list
  const allClients = archivedClientsQ.data || [];
  const activeClients = activeClientsQ.data || [];
  const archivedClients = useMemo(() => allClients.filter(c => c.status === "archived"), [allClients]);

  const isLoading = activeClientsQ.isLoading;

  const [tabMode, setTabMode] = useState<TabMode>("active");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState<SortField>("velocity");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [viewMode, setViewMode] = useState<ViewMode>("table");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newContactName, setNewContactName] = useState("");
  const [newContactEmail, setNewContactEmail] = useState("");
  const [newAumRange, setNewAumRange] = useState("");
  const [newSectors, setNewSectors] = useState<string[]>([]);
  const [newTier, setNewTier] = useState<"poc" | "growth" | "enterprise">("poc");
  const [showOnboardRedirect, setShowOnboardRedirect] = useState<{ id: number; name: string } | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<{ id: number; name: string } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; name: string } | null>(null);
  const [aiTaskTarget, setAiTaskTarget] = useState<{ id: number; name: string } | null>(null);
  const [intelOpen, setIntelOpen] = useState(false);

  // Current tab's clients
  const clients = tabMode === "active" ? activeClients : archivedClients;

  // Velocity = weighted composite of completion rate, overdue penalty, and health
  // Completion (50%) + Overdue penalty (30%) + Health (20%)
  const computeVelocity = (c: typeof clients[0]) => {
    if (c.ventureCount === 0 && c.totalTasks === 0) return -1;
    // Completion component: % of tasks completed (0-100)
    const completionScore = c.totalTasks > 0
      ? (c.completedTasks / c.totalTasks) * 100
      : 0;
    // Overdue penalty: ratio of overdue to total non-complete tasks
    const nonComplete = c.totalTasks - c.completedTasks;
    const overdueRatio = nonComplete > 0 ? c.overdueTasks / nonComplete : 0;
    const overdueScore = (1 - overdueRatio) * 100; // 100 = no overdue, 0 = all overdue
    // Health component: average venture health (already 0-100)
    const healthScore = c.avgHealth ?? 50;
    // Weighted composite
    const velocity = Math.round(
      completionScore * 0.50 + overdueScore * 0.30 + healthScore * 0.20
    );
    return Math.min(100, Math.max(0, velocity));
  };

  const clientsWithVelocity = useMemo(() => {
    return clients.map(c => ({ ...c, velocity: computeVelocity(c) }));
  }, [clients]);

  const kpis = useMemo(() => {
    const activeWithVelocity = activeClients.map(c => ({
      ...c, velocity: computeVelocity(c),
    }));

    const totalClients = activeClients.length;
    const totalVentures = activeClients.reduce((s, c) => s + c.ventureCount, 0);
    const totalOpenTasks = activeClients.reduce((s, c) => s + c.openTasks, 0);
    const totalOverdue = activeClients.reduce((s, c) => s + c.overdueTasks, 0);
    const totalCompleted = activeClients.reduce((s, c) => s + c.completedTasks, 0);
    const totalTasks = activeClients.reduce((s, c) => s + c.totalTasks, 0);
    const overallCompletion = totalTasks > 0 ? Math.round((totalCompleted / totalTasks) * 100) : 0;
    const measurableClients = activeWithVelocity.filter(c => c.velocity >= 0);
    const avgVelocity = measurableClients.length > 0
      ? Math.round(measurableClients.reduce((s, c) => s + c.velocity, 0) / measurableClients.length)
      : 0;
    const highVelocity = measurableClients.filter(c => c.velocity >= 70).length;
    const lowVelocity = measurableClients.filter(c => c.velocity < 40).length;
    const clientsNeedingAttention = activeClients.filter(c => c.overdueTasks > 0).length;

    return {
      totalClients, totalVentures, totalOpenTasks, totalOverdue,
      overallCompletion, avgVelocity, highVelocity, lowVelocity,
      clientsNeedingAttention, totalTasks, totalCompleted,
    };
  }, [activeClients]);

  const filteredClients = useMemo(() => {
    let list = [...clientsWithVelocity];

    // Search
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      list = list.filter(c =>
        c.name.toLowerCase().includes(term) ||
        c.sectors.some(s => s.toLowerCase().includes(term))
      );
    }

    // Status filter (only for active tab)
    if (tabMode === "active") {
      if (statusFilter === "high-velocity") {
        list = list.filter(c => c.velocity >= 70);
      } else if (statusFilter === "low-velocity") {
        list = list.filter(c => c.velocity >= 0 && c.velocity < 40);
      } else if (statusFilter === "overdue") {
        list = list.filter(c => c.overdueTasks > 0);
      }
    }

    // Sort
    list.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case "name": cmp = a.name.localeCompare(b.name); break;
        case "ventures": cmp = a.ventureCount - b.ventureCount; break;
        case "velocity": cmp = a.velocity - b.velocity; break;
        case "overdue": cmp = a.overdueTasks - b.overdueTasks; break;
        case "health": cmp = a.avgHealth - b.avgHealth; break;
        case "completion": cmp = a.completionRate - b.completionRate; break;
      }
      return sortDir === "desc" ? -cmp : cmp;
    });

    return list;
  }, [clientsWithVelocity, searchTerm, sortField, sortDir, statusFilter, tabMode]);

  const toggleSort = useCallback((field: SortField) => {
    if (sortField === field) {
      setSortDir(d => d === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  }, [sortField]);

  const handleAddClient = () => {
    const name = newName.trim();
    if (!name) return;
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    createOrg.mutate({
      name,
      slug,
      description: newDesc || undefined,
      primaryContactName: newContactName.trim() || undefined,
      primaryContactEmail: newContactEmail.trim() || undefined,
      aumRange: newAumRange || undefined,
      sectors: newSectors.length > 0 ? newSectors : undefined,
      subscriptionTier: newTier,
    });
  };

  const resetAddClientForm = () => {
    setNewName("");
    setNewDesc("");
    setNewContactName("");
    setNewContactEmail("");
    setNewAumRange("");
    setNewSectors([]);
    setNewTier("poc");
  };

  const toggleSector = (sector: string) => {
    setNewSectors(prev =>
      prev.includes(sector) ? prev.filter(s => s !== sector) : [...prev, sector]
    );
  };

  const handleArchiveClient = () => {
    if (!archiveTarget) return;
    archiveOrg.mutate({ id: archiveTarget.id });
  };

  const handleDeleteClient = () => {
    if (!deleteTarget) return;
    deleteOrg.mutate({ id: deleteTarget.id });
  };

  if (isLoading) {
    return (
      <div className="p-5 sm:p-6 md:p-8 space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
        <Skeleton className="h-12 rounded-xl" />
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="p-5 sm:p-6 md:p-8 space-y-6 pb-24 md:pb-8">

      {/* ── Velocity System KPIs ──────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {/* Velocity Intelligence Card — Upgrade 1 */}
        <VelocityIntelligenceCard
          avgVelocity={kpis.avgVelocity}
          highVelocity={kpis.highVelocity}
          lowVelocity={kpis.lowVelocity}
          clients={clientsWithVelocity}
        />

        {/* Remaining 4 standard KPI cards — enhanced with trend indicators */}
        {[
          {
            label: "Clients",
            value: kpis.totalClients,
            sub: kpis.clientsNeedingAttention > 0 ? `${kpis.clientsNeedingAttention} need attention` : "all on track",
            icon: <Building2 className="size-4" />,
            color: "#5B8DBE",
            trendLabel: kpis.clientsNeedingAttention > 0
              ? `${Math.round(((kpis.totalClients - kpis.clientsNeedingAttention) / kpis.totalClients) * 100)}% healthy`
              : "100% healthy",
            trendColor: kpis.clientsNeedingAttention === 0 ? "text-emerald-400" : "text-amber-400",
            progressPct: kpis.totalClients > 0 ? Math.round(((kpis.totalClients - kpis.clientsNeedingAttention) / kpis.totalClients) * 100) : 100,
            progressColor: "#5B8DBE",
          },
          {
            label: "Ventures",
            value: kpis.totalVentures,
            sub: `across ${kpis.totalClients} clients`,
            icon: <Layers3 className="size-4" />,
            color: "#8B5CF6",
            trendLabel: kpis.totalClients > 0 ? `~${Math.round(kpis.totalVentures / kpis.totalClients)} per client` : "—",
            trendColor: "text-muted-foreground",
            progressPct: null as number | null,
            progressColor: "#8B5CF6",
          },
          {
            label: "Completion",
            value: `${kpis.overallCompletion}%`,
            sub: `${kpis.totalCompleted}/${kpis.totalTasks} tasks`,
            icon: <Target className="size-4" />,
            color: kpis.overallCompletion >= 70 ? "#4ADE80" : kpis.overallCompletion >= 40 ? "#F59E0B" : "#EF4444",
            trendLabel: kpis.totalOpenTasks > 0 ? `${kpis.totalOpenTasks} open` : "all done",
            trendColor: kpis.overallCompletion >= 70 ? "text-emerald-400" : kpis.overallCompletion >= 40 ? "text-amber-400" : "text-red-400",
            progressPct: kpis.overallCompletion,
            progressColor: kpis.overallCompletion >= 70 ? "#4ADE80" : kpis.overallCompletion >= 40 ? "#F59E0B" : "#EF4444",
          },
          {
            label: "AI Comms",
            value: draftStatsQ.data?.totalSent ?? 0,
            sub: (draftStatsQ.data?.totalPending ?? 0) > 0
              ? `${draftStatsQ.data?.totalPending} pending client review`
              : "all reviewed",
            icon: <Mail className="size-4" />,
            color: "#06B6D4",
            trendLabel: (draftStatsQ.data?.sentThisMonth ?? 0) > 0
              ? `${draftStatsQ.data?.sentThisMonth} sent this month`
              : "none this month",
            trendColor: (draftStatsQ.data?.sentThisMonth ?? 0) > 0 ? "text-emerald-400" : "text-muted-foreground",
            progressPct: (draftStatsQ.data?.totalSent ?? 0) + (draftStatsQ.data?.totalPending ?? 0) > 0
              ? Math.round(((draftStatsQ.data?.totalSent ?? 0) / ((draftStatsQ.data?.totalSent ?? 0) + (draftStatsQ.data?.totalPending ?? 0))) * 100)
              : 0,
            progressColor: "#06B6D4",
          },
        ].map((m, i) => (
          <motion.div
            key={m.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: (i + 1) * 0.05, duration: 0.3 }}
            className="bg-card border border-border rounded-xl p-6 flex flex-col gap-3 hover:border-primary/20 transition-colors"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground font-medium">
                {m.label}
              </span>
              <span className="opacity-50" style={{ color: m.color }}>{m.icon}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[1.75rem] font-semibold tracking-tight text-foreground" style={{ fontVariantNumeric: 'tabular-nums' }}>
                {typeof m.value === 'number' ? (
                  <AnimatedCounter value={m.value} duration={1000} />
                ) : (
                  m.value
                )}
              </span>
              <span className={cn(
                "text-[11px]",
                typeof m.value === "number" && m.value > 0 && m.label === "Overdue" ? "text-red-400" : "text-muted-foreground"
              )}>
                {m.sub}
              </span>
              {/* Trend indicator */}
              <span className={cn("text-[10px] font-mono", m.trendColor)}>
                {m.trendLabel}
              </span>
              {/* Mini progress bar */}
              {m.progressPct !== null && (
                <div className="w-full h-1 rounded-full bg-secondary/50 mt-0.5 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${Math.min(100, m.progressPct)}%`, backgroundColor: m.progressColor }}
                  />
                </div>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      {/* ── F3-024: AI Morning Briefing Card ──────────────────── */}
      <MorningBriefingCard
        overdueTasks={kpis.totalOverdue}
        clientsNeedingAttention={kpis.clientsNeedingAttention}
        totalClients={kpis.totalClients}
        totalOpenTasks={kpis.totalOpenTasks}
        avgVelocity={kpis.avgVelocity}
        overallCompletion={kpis.overallCompletion}
      />

      {/* ── Live Presence ────────────────────────────────────── */}
      <LivePresenceWidget />

      {/* ── Overdue Alert Banner — only shows when there are overdue items */}
      <OverdueAlertBanner onNavigate={onNavigate} />

      {/* ── Active / Archived Tabs — CLIENT LIST FIRST for clarity ── */}
      <div className="flex items-center gap-1 border-b border-border">
        <button
          onClick={() => { setTabMode("active"); setStatusFilter("all"); setSearchTerm(""); }}
          className={cn(
            "flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px",
            tabMode === "active"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          <Building2 className="size-4" />
          Active Clients
          <span className="text-[11px] font-mono bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">
            {activeClients.length}
          </span>
        </button>
        <button
          onClick={() => { setTabMode("archived"); setStatusFilter("all"); setSearchTerm(""); }}
          className={cn(
            "flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px",
            tabMode === "archived"
              ? "border-amber-500 text-amber-400"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          <Archive className="size-4" />
          Archived
          {archivedClients.length > 0 && (
            <span className="text-[11px] font-mono bg-amber-500/10 text-amber-400 px-1.5 py-0.5 rounded-full">
              {archivedClients.length}
            </span>
          )}
        </button>
      </div>

      {/* ── Toolbar: Search + Filters + View Toggle + Add Client ── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder={tabMode === "active" ? "Search clients, ventures, tasks..." : "Search archived clients..."}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-10 bg-card border-border"
          />
        </div>

        {/* Status filter pills — only for active tab */}
        {tabMode === "active" && (
          <div className="flex items-center gap-1.5 overflow-x-auto">
            {[
              { key: "all", label: "All", count: activeClients.length },
              { key: "high-velocity", label: "High Velocity", count: clientsWithVelocity.filter(c => c.velocity >= 70 && c.status !== "archived").length },
              { key: "low-velocity", label: "Low Velocity", count: clientsWithVelocity.filter(c => c.velocity >= 0 && c.velocity < 40 && c.status !== "archived").length },
              { key: "overdue", label: "Overdue", count: activeClients.filter(c => c.overdueTasks > 0).length },
            ].map(f => (
              <button
                key={f.key}
                onClick={() => setStatusFilter(f.key)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium transition-colors whitespace-nowrap",
                  statusFilter === f.key
                    ? "bg-primary/10 text-primary border border-primary/20"
                    : "bg-card border border-border text-muted-foreground hover:text-foreground hover:border-foreground/20"
                )}
              >
                {f.label}
                <span className="font-mono text-[10px] opacity-70">{f.count}</span>
              </button>
            ))}
          </div>
        )}

        {/* View toggle + Add */}
        <div className="flex items-center gap-2 ml-auto">
          <div className="flex items-center bg-card border border-border rounded-lg overflow-hidden">
            <button
              onClick={() => setViewMode("table")}
              className={cn("p-2 transition-colors", viewMode === "table" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground")}
            >
              <List className="size-4" />
            </button>
            <button
              onClick={() => setViewMode("grid")}
              className={cn("p-2 transition-colors", viewMode === "grid" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground")}
            >
              <LayoutGrid className="size-4" />
            </button>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              const rows = filteredClients.map(c => ({
                name: c.name,
                sector: "",
                location: "",
                status: "Active",
                stage: "",
                priority: "",
                healthScore: c.avgHealth,
                overdueTasks: c.overdueTasks,
                totalTasks: c.totalTasks,
                createdAt: "",
              }));
              exportCSV(rows, [
                { key: "name", label: "Client" },
                { key: "healthScore", label: "Health Score" },
                { key: "overdueTasks", label: "Overdue Tasks" },
                { key: "totalTasks", label: "Total Tasks" },
              ], `ventex-clients-${new Date().toISOString().slice(0,10)}.csv`);
              toast.success("Exported client data");
            }}
            className="h-9 gap-1.5"
          >
            <Download className="size-4" />
            <span className="hidden sm:inline">Export</span>
          </Button>
          {tabMode === "active" && (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  if (filteredClients.length === 1) {
                    setAiTaskTarget({ id: filteredClients[0].id, name: filteredClients[0].name });
                  } else {
                    toast.info("Select a client row to generate AI tasks for them");
                  }
                }}
                className="h-9 gap-1.5 border-primary/20 text-primary hover:bg-primary/10"
              >
                <Brain className="size-4" />
                <span className="hidden sm:inline">AI Tasks</span>
              </Button>
              <Button
                size="sm"
                onClick={() => setAddDialogOpen(true)}
                className="h-9 gap-1.5"
              >
                <Plus className="size-4" />
                <span className="hidden sm:inline">Add Client</span>
              </Button>
            </>
          )}
        </div>
      </div>

      {/* ── Client List ───────────────────────────────────────────── */}
      {filteredClients.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-12 text-center">
          {tabMode === "archived" ? (
            <>
              <Archive className="size-8 text-muted-foreground mx-auto mb-3 opacity-30" strokeWidth={1.5} />
              <p className="text-base font-medium text-foreground/80 mb-1">No archived clients</p>
              <p className="text-[13px] text-muted-foreground/40">
                {searchTerm ? "No archived clients match your search" : "Clients you archive will appear here"}
              </p>
            </>
          ) : (
            <>
              <Building2 className="size-8 text-muted-foreground mx-auto mb-3 opacity-40" />
              <p className="text-sm text-muted-foreground">
                {searchTerm || statusFilter !== "all" ? "No clients match your filters" : "No clients yet. Add your first client to get started."}
              </p>
              {!searchTerm && statusFilter === "all" && (
                <Button size="sm" className="mt-4" onClick={() => setAddDialogOpen(true)}>
                  <Plus className="size-4 mr-1.5" /> Add Client
                </Button>
              )}
            </>
          )}
        </div>
      ) : viewMode === "table" ? (
        /* ── Table View ──────────────────────────────────────────── */
        <div className="bg-card border border-border rounded-xl overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-border">
                {[
                  { field: "name" as SortField, label: "Client" },
                  { field: "ventures" as SortField, label: "Ventures" },
                  { field: "velocity" as SortField, label: "Velocity" },
                  { field: "completion" as SortField, label: "Completion" },
                  { field: "overdue" as SortField, label: "Overdue" },
                  { field: "health" as SortField, label: "Health" },
                ].map(col => (
                  <th
                    key={col.field}
                    onClick={() => toggleSort(col.field)}
                    className="text-left text-[11px] uppercase tracking-[0.08em] text-muted-foreground font-medium px-4 py-3.5 sm:px-5 sm:py-4 cursor-pointer hover:text-foreground transition-colors select-none align-middle"
                  >
                    <div className="flex items-center gap-1">
                      {col.label}
                      <ArrowUpDown className={cn("size-3", sortField === col.field ? "text-primary" : "opacity-30")} />
                    </div>
                  </th>
                ))}
                <th className="px-4 py-3.5 sm:px-5 sm:py-4 text-left text-[11px] uppercase tracking-[0.08em] text-muted-foreground font-medium">
                  Agent
                </th>
                <th className="px-4 py-3.5 sm:px-5 sm:py-4 text-right text-[11px] uppercase tracking-[0.08em] text-muted-foreground font-medium">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {filteredClients.map((client, i) => (
                <motion.tr
                  key={client.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.02, duration: 0.2 }}
                  onClick={() => onNavigate(`/clients/${client.slug}`)}
                  className={cn(
                    "cursor-pointer hover:bg-accent/30 transition-colors group",
                    client.status === "archived" && "opacity-60"
                  )}
                >
                  {/* Client name + sectors */}
                  <td className="px-4 py-3.5 sm:px-5 sm:py-4">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <ProgressRing value={client.velocity < 0 ? 0 : client.velocity} size={36} />
                        <span className="absolute inset-0 flex items-center justify-center text-[8px] font-mono font-bold text-foreground">
                          {client.velocity < 0 ? "—" : client.velocity}
                        </span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-foreground capitalize">{client.name}</span>
                          {client.status === "archived" && (
                            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400">
                              Archived
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-muted-foreground">
                          {client.sectors.slice(0, 3).join(", ")}
                          {client.sectors.length > 3 && ` +${client.sectors.length - 3}`}
                        </span>
                      </div>
                    </div>
                  </td>

                  {/* Ventures */}
                  <td className="px-4 py-3.5 sm:px-5 sm:py-4">
                    <div className="flex items-center gap-1.5">
                      <Layers3 className="size-3 text-muted-foreground" />
                      <span className="font-mono text-foreground">{client.ventureCount}</span>
                    </div>
                  </td>

                  {/* Velocity */}
                  <td className="px-4 py-3.5 sm:px-5 sm:py-4">
                    <VelocityBadge rate={client.velocity} />
                  </td>

                  {/* Completion */}
                  <td className="px-4 py-3.5 sm:px-5 sm:py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 rounded-full bg-secondary overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${client.completionRate}%`,
                            backgroundColor: client.completionRate >= 70 ? "#4ADE80" : client.completionRate >= 40 ? "#F59E0B" : "#EF4444",
                          }}
                        />
                      </div>
                      <span className="font-mono text-[11px] text-muted-foreground">{client.completionRate}%</span>
                    </div>
                  </td>

                  {/* Overdue */}
                  <td className="px-4 py-3.5 sm:px-5 sm:py-4">
                    <OverdueBadge count={client.overdueTasks} />
                  </td>

                  {/* Health */}
                  <td className="px-4 py-3.5 sm:px-5 sm:py-4">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 max-w-[60px] h-1.5 rounded-full bg-secondary overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${client.avgHealth}%`,
                            backgroundColor: client.avgHealth >= 70 ? "#4ADE80" : client.avgHealth >= 40 ? "#F59E0B" : "#EF4444",
                          }}
                        />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[10px] font-medium" style={{
                          color: client.avgHealth >= 70 ? "#4ADE80" : client.avgHealth >= 40 ? "#F59E0B" : "#EF4444"
                        }}>
                          {client.avgHealth >= 70 ? "Healthy" : client.avgHealth >= 40 ? "At Risk" : "Critical"}
                        </span>
                        {client.overdueTasks > 0 && (
                          <span className="text-[9px] text-muted-foreground">
                            {client.overdueTasks} overdue
                          </span>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Agent */}
                  <td className="px-4 py-3.5 sm:px-5 sm:py-4">
                    <AgentIndicator
                      action={(client as any).lastAgentAction}
                      agentName={(client as any).lastAgentName}
                      actionAt={(client as any).lastAgentActionAt}
                    />
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3.5 sm:px-5 sm:py-4">
                    <div className="flex items-center justify-end gap-1.5">
                      {client.status === "archived" ? (
                        <>
                          <button
                            onClick={(e) => { e.stopPropagation(); restoreOrg.mutate({ id: client.id }); }}
                            className="p-1.5 rounded-md text-muted-foreground hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors opacity-0 group-hover:opacity-100"
                            title="Restore client"
                          >
                            <ArchiveRestore className="size-3.5" />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); setDeleteTarget({ id: client.id, name: client.name }); }}
                            className="p-1.5 rounded-md text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors opacity-0 group-hover:opacity-100"
                            title="Permanently delete"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={(e) => { e.stopPropagation(); setAiTaskTarget({ id: client.id, name: client.name }); }}
                            className="p-1.5 rounded-md text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors opacity-0 group-hover:opacity-100"
                            title="Generate AI tasks"
                          >
                            <Brain className="size-3.5" />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); setArchiveTarget({ id: client.id, name: client.name }); }}
                            className="p-1.5 rounded-md text-muted-foreground hover:text-amber-400 hover:bg-amber-500/10 transition-colors opacity-0 group-hover:opacity-100"
                            title="Archive client"
                          >
                            <Archive className="size-3.5" />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); setDeleteTarget({ id: client.id, name: client.name }); }}
                            className="p-1.5 rounded-md text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors opacity-0 group-hover:opacity-100"
                            title="Permanently delete"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </>
                      )}
                      <ChevronRight className="size-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        /* ── Grid View ───────────────────────────────────────────── */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredClients.map((client, i) => (
            <motion.div
              key={client.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03, duration: 0.3 }}
              onClick={() => onNavigate(`/clients/${client.slug}`)}
              className={cn(
                "bg-card border border-border rounded-xl p-6 cursor-pointer hover:border-primary/30 transition-all group relative",
                client.status === "archived" && "opacity-60 border-dashed"
              )}
            >
              {/* Action buttons — top right */}
              <div className="absolute top-3 right-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {client.status === "archived" ? (
                  <>
                    <button
                      onClick={(e) => { e.stopPropagation(); restoreOrg.mutate({ id: client.id }); }}
                      className="p-1.5 rounded-md text-muted-foreground hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors"
                      title="Restore client"
                    >
                      <ArchiveRestore className="size-3.5" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setDeleteTarget({ id: client.id, name: client.name }); }}
                      className="p-1.5 rounded-md text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors"
                      title="Permanently delete"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={(e) => { e.stopPropagation(); setAiTaskTarget({ id: client.id, name: client.name }); }}
                      className="p-1.5 rounded-md text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                      title="Generate AI tasks"
                    >
                      <Brain className="size-3.5" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setArchiveTarget({ id: client.id, name: client.name }); }}
                      className="p-1.5 rounded-md text-muted-foreground hover:text-amber-400 hover:bg-amber-500/10 transition-colors"
                      title="Archive client"
                    >
                      <Archive className="size-3.5" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setDeleteTarget({ id: client.id, name: client.name }); }}
                      className="p-1.5 rounded-md text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors"
                      title="Permanently delete"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </>
                )}
              </div>

              {/* Header with velocity ring */}
              <div className="flex items-center gap-3.5 mb-5">
                <div className="relative">
                  <ProgressRing value={client.velocity < 0 ? 0 : client.velocity} size={44} />
                  <span className="absolute inset-0 flex items-center justify-center text-[10px] font-mono font-bold text-foreground">
                    {client.velocity < 0 ? "—" : client.velocity}
                  </span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-foreground capitalize">{client.name}</span>
                  </div>
                  <span className="text-[11px] text-muted-foreground">
                    {client.status === "archived" ? (
                      <span className="text-amber-400">Archived</span>
                    ) : (
                      client.sectors.slice(0, 2).join(", ") || "No sectors"
                    )}
                  </span>
                </div>
              </div>

              {/* Velocity + Completion bar */}
              <div className="mb-5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Velocity</span>
                  <VelocityBadge rate={client.velocity} />
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 rounded-full bg-secondary overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${client.completionRate}%`,
                        backgroundColor: client.completionRate >= 70 ? "#4ADE80" : client.completionRate >= 40 ? "#F59E0B" : "#EF4444",
                      }}
                    />
                  </div>
                  <span className="text-[10px] font-mono text-muted-foreground">{client.completionRate}%</span>
                </div>
              </div>

              {/* Metrics grid */}
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div>
                  <span className="text-lg font-mono font-semibold text-foreground">{client.ventureCount}</span>
                  <p className="text-[10px] text-muted-foreground">Ventures</p>
                </div>
                <div>
                  <span className="text-lg font-mono font-semibold text-foreground">{client.openTasks}</span>
                  <p className="text-[10px] text-muted-foreground">Open Tasks</p>
                </div>
                <div>
                  <span className="text-lg font-mono font-semibold text-foreground">{client.teamSize}</span>
                  <p className="text-[10px] text-muted-foreground">Team</p>
                </div>
              </div>

              {/* Distributions */}
              {client.totalDistributions > 0 && (
                <div className="mb-3 flex items-center gap-1.5">
                  <span className="text-[11px] text-muted-foreground">Distributions:</span>
                  <span className="text-[12px] font-mono font-medium text-emerald-400">
                    {fmtCurrency(client.totalDistributions)}
                  </span>
                </div>
              )}

              {/* Health + Overdue */}
              <div className="pt-4 border-t border-border/50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-12 h-1 rounded-full bg-secondary overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${client.avgHealth}%`,
                        backgroundColor: client.avgHealth >= 70 ? "#4ADE80" : client.avgHealth >= 40 ? "#F59E0B" : "#EF4444",
                      }}
                    />
                  </div>
                  <span className="text-[10px] font-medium" style={{
                    color: client.avgHealth >= 70 ? "#4ADE80" : client.avgHealth >= 40 ? "#F59E0B" : "#EF4444"
                  }}>
                    {client.avgHealth}%
                  </span>
                </div>
                {client.overdueTasks > 0 && <OverdueBadge count={client.overdueTasks} />}
              </div>

              {/* Agent activity */}
              {(client as any).lastAgentAction && (
                <div className="mt-2 pt-2 border-t border-border/30">
                  <AgentIndicator
                    action={(client as any).lastAgentAction}
                    agentName={(client as any).lastAgentName}
                    actionAt={(client as any).lastAgentActionAt}
                  />
                </div>
              )}
            </motion.div>
          ))}
        </div>
      )}

      {/* ── Intelligence Panel (collapsed by default) ─────────── */}
      <div className="border border-border rounded-xl overflow-hidden">
        <button
          onClick={() => setIntelOpen(!intelOpen)}
          className="w-full flex items-center justify-between px-5 py-3 bg-card hover:bg-accent/30 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Brain className="size-4 text-primary" />
            <span className="text-sm font-medium text-foreground">Agent Intelligence</span>
            <span className="text-[10px] font-mono text-muted-foreground bg-secondary/50 px-1.5 py-0.5 rounded">AI Summary + Execution Log</span>
          </div>
          <ChevronRight className={cn("size-4 text-muted-foreground transition-transform", intelOpen && "rotate-90")} />
        </button>
        <AnimatePresence>
          {intelOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden"
            >
              <div className="p-4 space-y-4 border-t border-border">
                <ExecutiveSummaryWidget />
                <AgentExecutionLog />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Add Client Dialog (Enhanced) ────────────────────────── */}
      <Dialog open={addDialogOpen} onOpenChange={(open) => { setAddDialogOpen(open); if (!open) resetAddClientForm(); }}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Add New Client</DialogTitle>
            <DialogDescription>
              Set up the client profile. After creation you'll be guided to the full onboarding wizard.
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="flex-1 pr-3 -mr-3">
            <div className="space-y-4 py-2">
              {/* Client Name */}
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Client Name <span className="text-red-400">*</span></label>
                <Input
                  placeholder="e.g., FL1 Capital"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  autoFocus
                />
              </div>

              {/* Contact Row */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Primary Contact</label>
                  <Input
                    placeholder="Full name"
                    value={newContactName}
                    onChange={(e) => setNewContactName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Contact Email</label>
                  <Input
                    type="email"
                    placeholder="email@example.com"
                    value={newContactEmail}
                    onChange={(e) => setNewContactEmail(e.target.value)}
                  />
                </div>
              </div>

              {/* AUM + Tier Row */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">AUM Range</label>
                  <Select value={newAumRange} onValueChange={setNewAumRange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select range" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="under-50m">Under $50M</SelectItem>
                      <SelectItem value="50m-100m">$50M – $100M</SelectItem>
                      <SelectItem value="100m-250m">$100M – $250M</SelectItem>
                      <SelectItem value="250m-500m">$250M – $500M</SelectItem>
                      <SelectItem value="500m-plus">$500M+</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Subscription Tier</label>
                  <Select value={newTier} onValueChange={(v) => setNewTier(v as "poc" | "growth" | "enterprise")}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="poc">POC</SelectItem>
                      <SelectItem value="growth">Growth</SelectItem>
                      <SelectItem value="enterprise">Enterprise</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Sectors */}
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Sectors</label>
                <div className="flex flex-wrap gap-1.5">
                  {["Real Estate", "Yacht", "F&B", "Entertainment", "Oil & Gas", "Technology", "Healthcare", "Finance", "Energy", "Others"].map((s) => (
                    <Badge
                      key={s}
                      variant={newSectors.includes(s) ? "default" : "outline"}
                      className={cn(
                        "cursor-pointer text-xs transition-colors",
                        newSectors.includes(s)
                          ? "bg-primary text-primary-foreground hover:bg-primary/90"
                          : "hover:bg-accent"
                      )}
                      onClick={() => toggleSector(s)}
                    >
                      {s}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Description (optional)</label>
                <Input
                  placeholder="Brief description of the client..."
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                />
              </div>
            </div>
          </ScrollArea>
          <DialogFooter className="pt-4 border-t border-border">
            <Button variant="outline" onClick={() => { setAddDialogOpen(false); resetAddClientForm(); }}>Cancel</Button>
            <Button onClick={handleAddClient} disabled={!newName.trim() || createOrg.isPending}>
              {createOrg.isPending ? <Loader2 className="size-4 animate-spin mr-1.5" /> : <Plus className="size-4 mr-1.5" />}
              Create & Continue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Onboarding Redirect Dialog ────────────────────────────── */}
      <Dialog open={!!showOnboardRedirect} onOpenChange={(open) => { if (!open) { setShowOnboardRedirect(null); resetAddClientForm(); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="flex items-center justify-center size-8 rounded-full bg-emerald-500/10">
                <Check className="size-4 text-emerald-400" />
              </div>
              Client Created
            </DialogTitle>
            <DialogDescription>
              <strong>{showOnboardRedirect?.name}</strong> has been added. Continue to the onboarding wizard to add ventures, invite team members, and configure AI agents.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2 pt-2">
            <Button
              onClick={() => {
                if (showOnboardRedirect) {
                  onNavigate(`/onboarding?orgId=${showOnboardRedirect.id}&step=2`);
                }
                setShowOnboardRedirect(null);
                resetAddClientForm();
              }}
              className="w-full gap-2"
            >
              <Rocket className="size-4" />
              Continue to Onboarding
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setShowOnboardRedirect(null);
                resetAddClientForm();
              }}
              className="w-full"
            >
              Skip — I'll set up later
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Archive Client Confirmation ───────────────────────────── */}
      <AlertDialog open={!!archiveTarget} onOpenChange={(open) => !open && setArchiveTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive Client</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to archive <strong>{archiveTarget?.name}</strong>? The client and all their data will be preserved but hidden from the active view. You can restore them at any time from the Archived tab.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleArchiveClient}
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              {archiveOrg.isPending ? <Loader2 className="size-4 animate-spin mr-1.5" /> : <Archive className="size-4 mr-1.5" />}
              Archive Client
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Permanent Delete Confirmation ─────────────────────────── */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Permanently Delete Client</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to <strong>permanently delete</strong> <strong>{deleteTarget?.name}</strong>? This will remove all venture access links, distributions, invitations, and API keys. <span className="text-red-400 font-medium">This action cannot be undone.</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteClient}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {deleteOrg.isPending ? <Loader2 className="size-4 animate-spin mr-1.5" /> : <Trash2 className="size-4 mr-1.5" />}
              Delete Permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── AI Task Generator Dialog ──────────────────────────────── */}
      {aiTaskTarget && (
        <AITaskGenerator
          open={!!aiTaskTarget}
          onOpenChange={(open) => !open && setAiTaskTarget(null)}
          organizationId={aiTaskTarget.id}
          organizationName={aiTaskTarget.name}
          onTasksCreated={() => {
            invalidateAll();
            utils.tasks.list.invalidate();
            utils.tasks.metrics.invalidate();
          }}
        />
      )}
    </div>
  );
}
