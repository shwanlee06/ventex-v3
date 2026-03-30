// ============================================================================
// Client Detail Page — Drill into a specific client's workspace
// Shows ventures, tasks, SPVs, team, activity for the selected client
// Accessible via /clients/:slug
// ============================================================================

import DashboardLayout from "@/components/DashboardLayout";
import StatusBadge from "@/components/StatusBadge";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc";
import {
  SPV_STAGE_CONFIG,
  getThemeColor,
  formatTimestamp,
  formatCurrency,
  formatDate,
} from "@/lib/data";
import {
  ArrowLeft,
  Building2,
  Layers3,
  ListChecks,
  Briefcase,
  Users,
  Activity,
  DollarSign,
  ChevronRight,
  AlertTriangle,
  Search,
  ArrowUpDown,
  LayoutGrid,
  List,
  ChevronDown,
  Network,
  ScatterChart,
  Plus,
  CheckCircle2,
  Trash2,
  Loader2,
  Archive,
  ArchiveRestore,
  Settings,
  FileText,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useMemo, useCallback } from "react";
import { useLocation, useParams } from "wouter";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import VentureHealthMatrix from "@/components/VentureHealthMatrix";
import SectorPulsePanel from "@/components/SectorPulsePanel";
import DistributionTimeline from "@/components/DistributionTimeline";
import TeamVentureAttribution from "@/components/TeamVentureAttribution";
import ClientSettings from "@/components/ClientSettings";
import BlueprintExtractor from "@/components/BlueprintExtractor";
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

type SortField = "name" | "tasks" | "completion" | "overdue";
type ViewMode = "grid" | "table" | "matrix";

export default function ClientDetail() {
  const params = useParams<{ slug: string }>();
  const [, navigate] = useLocation();
  const slug = params.slug || "";

  // ── Load organization ──────────────────────────────────────────────
  const orgQ = trpc.organizations.bySlug.useQuery({ slug }, { enabled: !!slug });
  const org = orgQ.data;
  const orgId = org?.id;

  // ── Load org-scoped data ───────────────────────────────────────────
  const orgFilter = orgId ? { organizationId: orgId } : undefined;
  const venturesQ = trpc.ventures.list.useQuery(orgFilter, { enabled: !!orgId });
  const tasksQ = trpc.tasks.list.useQuery(orgFilter, { enabled: !!orgId });
  const spvsQ = trpc.spvs.list.useQuery(orgFilter, { enabled: !!orgId });
  const distQ = trpc.distributions.list.useQuery(orgFilter, { enabled: !!orgId });
  const activityQ = trpc.activity.recent.useQuery({ limit: 8, organizationId: orgId }, { enabled: !!orgId });
  const teamQ = trpc.team.list.useQuery(orgFilter, { enabled: !!orgId });
  const ventureAssignmentsQ = trpc.team.ventureAssignments.useQuery(orgFilter, { enabled: !!orgId });

  const utils = trpc.useUtils();
  const updateTask = trpc.tasks.update.useMutation({
    onSuccess: () => {
      utils.tasks.list.invalidate();
      utils.activity.recent.invalidate();
    },
  });

  const archiveOrg = trpc.organizations.archive.useMutation({
    onSuccess: (data) => {
      toast.success(`"${data.name}" has been archived`);
      navigate("/dashboard");
    },
    onError: (err) => toast.error(err.message),
  });

  const restoreOrg = trpc.organizations.restore.useMutation({
    onSuccess: (data) => {
      toast.success(`"${data.name}" has been restored`);
      orgQ.refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteOrg = trpc.organizations.delete.useMutation({
    onSuccess: (data) => {
      toast.success(`"${data.name}" has been permanently deleted`);
      navigate("/dashboard");
    },
    onError: (err) => toast.error(err.message),
  });

  const [showArchiveDialog, setShowArchiveDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const isArchived = org?.status === "archived";

  const pageLoading = orgQ.isLoading || venturesQ.isLoading || tasksQ.isLoading;

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
  const [activeTab, setActiveTab] = useState<"portfolio" | "settings" | "blueprints">("portfolio");

  const now = useMemo(() => new Date(), []);

  // ── Partnership analytics computation ─────────────────────────────
  const ventureAnalytics = useMemo(() => {
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

  const toggleSort = useCallback((field: SortField) => {
    if (sortField === field) {
      setSortDir(d => d === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  }, [sortField]);

  const clientName = org?.name || "Client";

  if (pageLoading) {
    return (
      <DashboardLayout title="Client" subtitle="Loading...">
        <div className="p-4 sm:p-5 md:p-6 space-y-5">
          <Skeleton className="h-10 w-48 rounded-xl" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-44 rounded-xl" />)}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!org) {
    return (
      <DashboardLayout title="Client" subtitle="Not Found">
        <div className="p-4 sm:p-5 md:p-6 text-center py-20">
          <Building2 className="size-8 text-muted-foreground mx-auto mb-3 opacity-40" />
          <p className="text-sm text-muted-foreground mb-4">Client not found</p>
          <Button variant="outline" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="size-4 mr-1.5" /> Back to Dashboard
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title={clientName} subtitle="VENTURE PORTFOLIO">
      <div className="p-4 sm:p-5 md:p-6 space-y-5 pb-24 md:pb-6">

        {/* ── Back + Client Header ────────────────────────────────── */}
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/dashboard")}
            className="h-8 px-2 text-muted-foreground"
          >
            <ArrowLeft className="size-4 mr-1" /> All Clients
          </Button>
          <div className="flex items-center gap-2">
            {isArchived ? (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => orgId && restoreOrg.mutate({ id: orgId })}
                  className="h-8 px-2 text-muted-foreground hover:text-emerald-400 hover:bg-emerald-500/10"
                  disabled={restoreOrg.isPending}
                >
                  {restoreOrg.isPending ? <Loader2 className="size-4 animate-spin mr-1" /> : <ArchiveRestore className="size-4 mr-1" />}
                  Restore Client
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowDeleteDialog(true)}
                  className="h-8 px-2 text-muted-foreground hover:text-red-400 hover:bg-red-500/10"
                >
                  <Trash2 className="size-4 mr-1" /> Delete Permanently
                </Button>
              </>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowArchiveDialog(true)}
                className="h-8 px-2 text-muted-foreground hover:text-amber-400 hover:bg-amber-500/10"
              >
                <Archive className="size-4 mr-1" /> Archive Client
              </Button>
            )}
          </div>
        </div>

        {/* ── KPI Summary — 4 cards ──────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            {
              label: "Partnerships",
              value: allVentures.length,
              sub: `${sectors.length} sectors`,
              icon: <Layers3 className="size-4" />,
              color: "#5B8DBE",
            },
            {
              label: "Open Tasks",
              value: openTasksCount,
              sub: overdueCount > 0 ? `${overdueCount} overdue` : "on track",
              icon: <ListChecks className="size-4" />,
              color: overdueCount > 0 ? "#EF4444" : "#F59E0B",
            },
            {
              label: "Active SPVs",
              value: allSpvs.length,
              sub: `${allSpvs.filter(s => s.stage === "Active deal").length} active deals`,
              icon: <Briefcase className="size-4" />,
              color: "#8B5CF6",
            },
            {
              label: "Distributions",
              value: formatCurrency(paidDistAmount),
              sub: "paid",
              icon: <DollarSign className="size-4" />,
              color: "#4ADE80",
            },
          ].map((m, i) => (
            <motion.div
              key={m.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05, duration: 0.3 }}
              className="bg-card border border-border rounded-xl p-4 flex flex-col gap-2"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] uppercase tracking-[0.06em] text-muted-foreground font-medium">
                  {m.label}
                </span>
                <span className="opacity-60" style={{ color: m.color }}>{m.icon}</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-semibold tracking-tight text-foreground font-mono">
                  {m.value}
                </span>
                <span className="text-[10px] text-muted-foreground font-mono">{m.sub}</span>
              </div>
            </motion.div>
          ))}
        </div>

        {/* ── Tab Navigation ────────────────────────────────────── */}
        <div className="flex items-center gap-1 border-b border-border">
          <button
            onClick={() => setActiveTab("portfolio")}
            className={cn(
              "px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px",
              activeTab === "portfolio"
                ? "text-foreground border-foreground"
                : "text-muted-foreground border-transparent hover:text-foreground hover:border-border"
            )}
          >
            <Layers3 className="size-3.5 inline mr-1.5" />
            Portfolio
          </button>
          <button
            onClick={() => setActiveTab("settings")}
            className={cn(
              "px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px",
              activeTab === "settings"
                ? "text-foreground border-foreground"
                : "text-muted-foreground border-transparent hover:text-foreground hover:border-border"
            )}
          >
            <Settings className="size-3.5 inline mr-1.5" />
            Settings
          </button>
          <button
            onClick={() => setActiveTab("blueprints")}
            className={cn(
              "px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px",
              activeTab === "blueprints"
                ? "text-foreground border-foreground"
                : "text-muted-foreground border-transparent hover:text-foreground hover:border-border"
            )}
          >
            <FileText className="size-3.5 inline mr-1.5" />
            Blueprints
          </button>
        </div>

        {/* ── Blueprints Tab ────────────────────────────────────────── */}
        {activeTab === "blueprints" && orgId && (
          <BlueprintsTab organizationId={orgId} />
        )}

        {/* ── Settings Tab ────────────────────────────────────────── */}
        {activeTab === "settings" && orgId && (
          <ClientSettings orgId={orgId} orgSlug={slug} />
        )}

        {/* ── Portfolio Tab Content ────────────────────────────────── */}
        {activeTab === "portfolio" && (
        <>
        {/* ── Sector Pulse Panel (Upgrade 4) ──────────────────────── */}
        <SectorPulsePanel ventures={ventureAnalytics} />

        {/* ── Ventures Toolbar ────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-foreground">{clientName} Partnerships</h2>
            <span className="text-[10px] font-mono text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">
              {filteredVentures.length}
            </span>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            {/* Sector filter */}
            {sectors.length > 1 && (
              <select
                value={sectorFilter}
                onChange={(e) => setSectorFilter(e.target.value)}
                className="h-8 text-[11px] bg-card border border-border rounded-lg px-2 text-foreground appearance-none cursor-pointer"
              >
                <option value="all">All Sectors</option>
                {sectors.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            )}

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
              <Input
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 h-8 w-36 sm:w-48 text-xs bg-card border-border"
              />
            </div>

            {/* View toggle */}
            <div className="flex items-center bg-card border border-border rounded-lg overflow-hidden">
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
              <button
                onClick={() => setViewMode("matrix")}
                className={cn("p-1.5 transition-colors", viewMode === "matrix" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground")}
                title="Health Matrix"
              >
                <ScatterChart className="size-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* ── Venture Cards / Table ───────────────────────────────── */}
        {viewMode === "grid" ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredVentures.map((v, i) => {
              const tc = getThemeColor(v.sector);
              const vTasks = allTasks.filter(t => t.ventureId === v.id);
              const isExpanded = expandedVenture === v.id;
              const members = (membersByVenture[v.id] || []).filter(m => m.memberName !== "Shwan Lee");

              return (
                <motion.div
                  key={v.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03, duration: 0.3 }}
                  className="bg-card border border-border rounded-xl p-4 sm:p-5 hover:border-primary/30 transition-all"
                >
                  {/* Header */}
                  <div
                    className="flex items-start justify-between mb-3 cursor-pointer"
                    onClick={() => navigate(`/ventures/${v.slug}`)}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="size-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: tc.color }} />
                      <div>
                        <span className="text-sm font-medium text-foreground block">{v.name}</span>
                        <span className="text-[11px] text-muted-foreground">{v.sector} · {v.stage}</span>
                      </div>
                    </div>
                    <HealthIndicator score={v.healthScore ?? 50} />
                  </div>

                  {/* Metrics */}
                  <div className="grid grid-cols-4 gap-2 mb-3">
                    <div className="text-center">
                      <span className="text-sm font-mono font-semibold text-foreground">{v.totalTasks}</span>
                      <p className="text-[9px] text-muted-foreground">Total</p>
                    </div>
                    <div className="text-center">
                      <span className="text-sm font-mono font-semibold text-emerald-400">{v.completedTasks}</span>
                      <p className="text-[9px] text-muted-foreground">Done</p>
                    </div>
                    <div className="text-center">
                      <span className="text-sm font-mono font-semibold text-foreground">{v.openTasks}</span>
                      <p className="text-[9px] text-muted-foreground">Open</p>
                    </div>
                    <div className="text-center">
                      <span className={cn("text-sm font-mono font-semibold", v.overdueTasks > 0 ? "text-red-400" : "text-muted-foreground")}>{v.overdueTasks}</span>
                      <p className="text-[9px] text-muted-foreground">Overdue</p>
                    </div>
                  </div>

                  {/* Completion bar */}
                  <div className="flex items-center gap-2 mb-3">
                    <div className="flex-1 h-1.5 rounded-full bg-secondary overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${v.totalTasks > 0 ? v.completionRate : 0}%`,
                          backgroundColor: v.completionRate >= 70 ? "#4ADE80" : v.completionRate >= 40 ? "#F59E0B" : "#EF4444",
                        }}
                      />
                    </div>
                    <span className="text-[10px] font-mono text-muted-foreground">{v.completionRate}%</span>
                  </div>

                  {/* Team avatars */}
                  {members.length > 0 && (
                    <div className="flex items-center gap-1.5 mb-3">
                      <div className="flex -space-x-1.5">
                        {members.slice(0, 4).map((m) => {
                          const initials = (m.memberName || "?").split(" ").map(w => w[0]).join("").slice(0, 2);
                          return (
                            <div key={m.id} title={m.memberName || ""} className="size-6 rounded-full bg-primary/10 border border-background flex items-center justify-center">
                              <span className="text-[8px] font-medium text-primary">{initials}</span>
                            </div>
                          );
                        })}
                      </div>
                      {members.length > 4 && <span className="text-[10px] font-mono text-muted-foreground">+{members.length - 4}</span>}
                    </div>
                  )}

                  {/* Expand tasks */}
                  <button
                    onClick={() => setExpandedVenture(isExpanded ? null : v.id)}
                    className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <ChevronDown className={cn("size-3 transition-transform", isExpanded && "rotate-180")} />
                    {isExpanded ? "Hide tasks" : `Show ${vTasks.length} tasks`}
                  </button>

                  <AnimatePresence>
                    {isExpanded && (
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
        ) : viewMode === "table" ? (
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
                      onClick={() => navigate(`/ventures/${v.slug}`)}
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
        ) : (
          /* ── Matrix View ─────────────────────────────────────────── */
          <VentureHealthMatrix
            ventures={filteredVentures.map(v => ({
              ...v,
              slug: v.slug,
            }))}
            onVentureClick={(path) => navigate(path)}
          />
        )}

        {/* ── Bottom Section: Activity + SPVs + Team ─────────────── */}
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
                <Button variant="ghost" size="sm" className="text-xs h-8 px-2 text-muted-foreground" onClick={() => navigate("/spvs")}>
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
                      onClick={() => navigate(`/spvs/${spv.slug}`)}
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
                {allSpvs.filter(s => s.stage === "Active deal" || s.stage === "In negotiation").length === 0 && (
                  <p className="text-sm text-muted-foreground py-4 text-center">No active SPVs</p>
                )}
              </div>
            </div>

            <DistributionTimeline
              distributions={allDists.map(d => ({
                id: d.id,
                spvName: d.fund || d.name,
                amount: d.amount,
                status: d.status || "Pending",
                date: d.distributionDate || null,
              }))}
            />
          </div>

          {/* Client Team — Upgrade 6: Team Venture Attribution */}
          <TeamVentureAttribution
            members={allTeam.filter(t => t.name !== "Shwan Lee")}
            venturesByMember={venturesByMember}
            onNavigateToTeam={() => navigate("/team")}
          />
        </div>

        </>
        )}

        {/* ── Archived Banner ──────────────────────────────────── */}
        {isArchived && (
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Archive className="size-5 text-amber-400" />
              <div>
                <span className="text-sm font-medium text-amber-400">This client is archived</span>
                <p className="text-[12px] text-muted-foreground">All data is preserved. Restore to move back to active clients.</p>
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => orgId && restoreOrg.mutate({ id: orgId })}
              disabled={restoreOrg.isPending}
              className="border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
            >
              {restoreOrg.isPending ? <Loader2 className="size-4 animate-spin mr-1" /> : <ArchiveRestore className="size-4 mr-1" />}
              Restore
            </Button>
          </div>
        )}

        {/* ── Archive Client Confirmation ─────────────────────────── */}
        <AlertDialog open={showArchiveDialog} onOpenChange={setShowArchiveDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Archive Client</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to archive <strong>{clientName}</strong>? The client and all their data will be preserved but hidden from the active view. You can restore them at any time.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => orgId && archiveOrg.mutate({ id: orgId })}
                className="bg-amber-600 hover:bg-amber-700 text-white"
              >
                {archiveOrg.isPending ? <Loader2 className="size-4 animate-spin mr-1.5" /> : <Archive className="size-4 mr-1.5" />}
                Archive Client
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* ── Permanent Delete Confirmation ───────────────────────── */}
        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Permanently Delete Client</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to <strong>permanently delete</strong> <strong>{clientName}</strong>? This will remove all venture access links, distributions, invitations, and API keys. <span className="text-red-400 font-medium">This action cannot be undone.</span>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => orgId && deleteOrg.mutate({ id: orgId })}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {deleteOrg.isPending ? <Loader2 className="size-4 animate-spin mr-1.5" /> : <Trash2 className="size-4 mr-1.5" />}
                Delete Permanently
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
}


// ── Blueprints Tab ──────────────────────────────────────────────────────
function BlueprintsTab({ organizationId }: { organizationId: number }) {
  const templatesQ = trpc.blueprints.listTemplates.useQuery({ organizationId });
  const missingSectorsQ = trpc.blueprints.getMissingSectors.useQuery({ organizationId });
  const [showExtractor, setShowExtractor] = useState(false);

  const templates = templatesQ.data || [];
  const missingSectors = missingSectorsQ.data || [];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Process Blueprints</h2>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            Define the steps needed to move ventures through each stage
          </p>
        </div>
        <Button size="sm" className="text-xs h-7" onClick={() => setShowExtractor(!showExtractor)}>
          <Plus className="size-3 mr-1" /> New Blueprint
        </Button>
      </div>

      {/* Missing sectors alert */}
      {missingSectors.length > 0 && (
        <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-3">
          <div className="flex items-center gap-2 text-xs text-amber-400">
            <AlertTriangle className="size-3.5" />
            <span className="font-medium">Missing blueprints for {missingSectors.length} sector{missingSectors.length > 1 ? "s" : ""}</span>
          </div>
          <div className="flex flex-wrap gap-2 mt-2">
            {missingSectors.map(s => (
              <span key={s.sector} className="text-[10px] bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded">
                {s.sector} ({s.ventureCount} venture{s.ventureCount > 1 ? "s" : ""})
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Extractor */}
      {showExtractor && (
        <div className="bg-card border border-border rounded-lg p-4">
          <BlueprintExtractor
            organizationId={organizationId}
            onComplete={(templateId) => {
              setShowExtractor(false);
              templatesQ.refetch();
              toast.success("Blueprint created successfully");
            }}
          />
        </div>
      )}

      {/* Existing templates */}
      {templatesQ.isLoading ? (
        <div className="space-y-2">
          {[1, 2].map(i => <Skeleton key={i} className="h-20 rounded-lg" />)}
        </div>
      ) : templates.length === 0 && !showExtractor ? (
        <div className="bg-card border border-border rounded-lg p-8 text-center">
          <FileText className="size-8 text-muted-foreground mx-auto mb-2 opacity-40" />
          <p className="text-xs text-muted-foreground">No blueprints yet. Create one to define the process steps for this client's ventures.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {templates.map(t => (
            <div key={t.id} className="bg-card border border-border rounded-lg p-4 hover:border-primary/20 transition-colors">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-medium text-foreground">{t.blueprintName}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] font-mono text-muted-foreground">{t.sector}</span>
                    <span className={cn(
                      "text-[9px] px-1.5 py-0.5 rounded",
                      t.confidence === "High" ? "bg-emerald-500/10 text-emerald-400" :
                      t.confidence === "Medium" ? "bg-amber-500/10 text-amber-400" :
                      "bg-red-500/10 text-red-400"
                    )}>
                      {t.confidence}
                    </span>
                    <span className="text-[10px] text-muted-foreground">via {t.source}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                  {t.refinementCount > 0 && (
                    <span className="bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                      Refined {t.refinementCount}x
                    </span>
                  )}
                  <span>{formatDate(t.createdAt instanceof Date ? t.createdAt.toISOString() : String(t.createdAt))}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
