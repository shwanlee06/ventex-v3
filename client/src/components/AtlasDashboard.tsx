// ============================================================================
// ATLAS Admin Dashboard — Velocity AI Venture System
// Premium CRM command center for managing 30+ UHNWI/HNWI clients
// Velocity metrics, completion %, task velocity, progress trends per client
// ============================================================================

import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc";
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
  Brain,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useCallback, useMemo } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
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
import OverdueAlertBanner from "@/components/OverdueAlertBanner";
import LivePresenceWidget from "@/components/LivePresenceWidget";
import VelocityIntelligenceCard from "@/components/VelocityIntelligenceCard";
import LiveTicker from "@/components/LiveTicker";

// ── Types ───────────────────────────────────────────────────────────────
type SortField = "name" | "ventures" | "velocity" | "overdue" | "health" | "completion";
type ViewMode = "grid" | "table";
type TabMode = "active" | "archived";

interface AtlasDashboardProps {
  onNavigate: (path: string) => void;
}

// ── Velocity indicator ──────────────────────────────────────────────────
function VelocityBadge({ rate }: { rate: number }) {
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

// ── Progress ring (mini) ────────────────────────────────────────────────
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

// ── Overdue badge ───────────────────────────────────────────────────────
function OverdueBadge({ count }: { count: number }) {
  if (count === 0) return <span className="text-[11px] font-mono text-muted-foreground">0</span>;
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-mono font-medium text-red-400">
      <AlertTriangle className="size-3" />
      {count}
    </span>
  );
}

// ── Format currency ─────────────────────────────────────────────────────
function fmtCurrency(amount: number): string {
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `$${(amount / 1_000).toFixed(0)}K`;
  return `$${amount.toLocaleString()}`;
}

export default function AtlasDashboard({ onNavigate }: AtlasDashboardProps) {
  // Fetch active clients (default)
  const activeClientsQ = trpc.organizations.listWithMetrics.useQuery();
  // Fetch archived clients separately
  const archivedClientsQ = trpc.organizations.listWithMetrics.useQuery({ includeArchived: true });
  const utils = trpc.useUtils();

  const invalidateAll = () => {
    activeClientsQ.refetch();
    archivedClientsQ.refetch();
    utils.organizations.list.invalidate();
  };

  const createOrg = trpc.organizations.create.useMutation({
    onSuccess: () => {
      invalidateAll();
      setAddDialogOpen(false);
      setNewName("");
      setNewDesc("");
      toast.success("Client created");
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

  // ── UI state ───────────────────────────────────────────────────────
  const [tabMode, setTabMode] = useState<TabMode>("active");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState<SortField>("velocity");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [viewMode, setViewMode] = useState<ViewMode>("table");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [archiveTarget, setArchiveTarget] = useState<{ id: number; name: string } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; name: string } | null>(null);
  const [aiTaskTarget, setAiTaskTarget] = useState<{ id: number; name: string } | null>(null);

  // Current tab's clients
  const clients = tabMode === "active" ? activeClients : archivedClients;

  // ── Velocity calculation per client ───────────────────────────────
  // Velocity = weighted score: 40% completion rate + 30% health + 30% (100 - overdue%)
  const clientsWithVelocity = useMemo(() => {
    return clients.map(c => {
      const overdueRate = c.totalTasks > 0 ? (c.overdueTasks / c.totalTasks) * 100 : 0;
      const velocity = Math.round(
        c.completionRate * 0.4 +
        c.avgHealth * 0.3 +
        (100 - overdueRate) * 0.3
      );
      return { ...c, velocity };
    });
  }, [clients]);

  // ── Aggregate KPIs across ACTIVE clients only ─────────────────────
  const kpis = useMemo(() => {
    const activeWithVelocity = activeClients.map(c => {
      const overdueRate = c.totalTasks > 0 ? (c.overdueTasks / c.totalTasks) * 100 : 0;
      const velocity = Math.round(c.completionRate * 0.4 + c.avgHealth * 0.3 + (100 - overdueRate) * 0.3);
      return { ...c, velocity };
    });

    const totalClients = activeClients.length;
    const totalVentures = activeClients.reduce((s, c) => s + c.ventureCount, 0);
    const totalOpenTasks = activeClients.reduce((s, c) => s + c.openTasks, 0);
    const totalOverdue = activeClients.reduce((s, c) => s + c.overdueTasks, 0);
    const totalCompleted = activeClients.reduce((s, c) => s + c.completedTasks, 0);
    const totalTasks = activeClients.reduce((s, c) => s + c.totalTasks, 0);
    const overallCompletion = totalTasks > 0 ? Math.round((totalCompleted / totalTasks) * 100) : 0;
    const avgVelocity = activeWithVelocity.length > 0
      ? Math.round(activeWithVelocity.reduce((s, c) => s + c.velocity, 0) / activeWithVelocity.length)
      : 0;
    const highVelocity = activeWithVelocity.filter(c => c.velocity >= 70).length;
    const lowVelocity = activeWithVelocity.filter(c => c.velocity < 40).length;
    const clientsNeedingAttention = activeClients.filter(c => c.overdueTasks > 0).length;

    return {
      totalClients, totalVentures, totalOpenTasks, totalOverdue,
      overallCompletion, avgVelocity, highVelocity, lowVelocity,
      clientsNeedingAttention, totalTasks, totalCompleted,
    };
  }, [activeClients]);

  // ── Filtered + sorted clients ─────────────────────────────────────
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
        list = list.filter(c => c.velocity < 40);
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

  // ── Sort toggle ────────────────────────────────────────────────────
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
    createOrg.mutate({ name, slug, description: newDesc || undefined });
  };

  const handleArchiveClient = () => {
    if (!archiveTarget) return;
    archiveOrg.mutate({ id: archiveTarget.id });
  };

  const handleDeleteClient = () => {
    if (!deleteTarget) return;
    deleteOrg.mutate({ id: deleteTarget.id });
  };

  // ── Loading state ──────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="p-4 sm:p-5 md:p-6 space-y-5">
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
    <div className="space-y-0">
      {/* ── Live Agent Ticker (Upgrade Step 5) ──────────────────── */}
      <LiveTicker />

      <div className="p-4 sm:p-5 md:p-6 space-y-5 pb-24 md:pb-6">

      {/* ── Velocity System KPIs ──────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {/* Velocity Intelligence Card — Upgrade 1 */}
        <VelocityIntelligenceCard
          avgVelocity={kpis.avgVelocity}
          highVelocity={kpis.highVelocity}
          lowVelocity={kpis.lowVelocity}
          clients={clientsWithVelocity}
        />

        {/* Remaining 4 standard KPI cards */}
        {[
          {
            label: "Clients",
            value: kpis.totalClients,
            sub: kpis.clientsNeedingAttention > 0 ? `${kpis.clientsNeedingAttention} need attention` : "all on track",
            icon: <Building2 className="size-4" />,
            color: "#5B8DBE",
          },
          {
            label: "Ventures",
            value: kpis.totalVentures,
            sub: `across ${kpis.totalClients} clients`,
            icon: <Layers3 className="size-4" />,
            color: "#8B5CF6",
          },
          {
            label: "Completion",
            value: `${kpis.overallCompletion}%`,
            sub: `${kpis.totalCompleted}/${kpis.totalTasks} tasks`,
            icon: <Target className="size-4" />,
            color: kpis.overallCompletion >= 70 ? "#4ADE80" : kpis.overallCompletion >= 40 ? "#F59E0B" : "#EF4444",
          },
          {
            label: "Overdue",
            value: kpis.totalOverdue,
            sub: kpis.totalOverdue > 0 ? "require action" : "none pending",
            icon: <AlertTriangle className="size-4" />,
            color: kpis.totalOverdue > 0 ? "#EF4444" : "#4ADE80",
          },
        ].map((m, i) => (
          <motion.div
            key={m.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: (i + 1) * 0.05, duration: 0.3 }}
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
              <span className={cn(
                "text-[10px] font-mono",
                typeof m.value === "number" && m.value > 0 && m.label === "Overdue" ? "text-red-400" : "text-muted-foreground"
              )}>
                {m.sub}
              </span>
            </div>
          </motion.div>
        ))}
      </div>

      {/* ── Live Presence ────────────────────────────────────── */}
      <LivePresenceWidget />

      {/* ── Overdue Alert Banner ────────────────────────────────── */}
      <OverdueAlertBanner onNavigate={onNavigate} />

      {/* ── Active / Archived Tabs ────────────────────────────────── */}
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
            placeholder={tabMode === "active" ? "Search clients or sectors..." : "Search archived clients..."}
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
              { key: "low-velocity", label: "Low Velocity", count: clientsWithVelocity.filter(c => c.velocity < 40 && c.status !== "archived").length },
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
              <Archive className="size-8 text-muted-foreground mx-auto mb-3 opacity-40" />
              <p className="text-sm text-muted-foreground">
                {searchTerm ? "No archived clients match your search" : "No archived clients. Clients you archive will appear here."}
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
          <table className="w-full text-sm">
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
                    className="text-left text-[11px] uppercase tracking-wider text-muted-foreground font-medium p-3 sm:p-4 cursor-pointer hover:text-foreground transition-colors select-none"
                  >
                    <div className="flex items-center gap-1">
                      {col.label}
                      <ArrowUpDown className={cn("size-3", sortField === col.field ? "text-primary" : "opacity-30")} />
                    </div>
                  </th>
                ))}
                <th className="p-3 sm:p-4 text-right text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
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
                  <td className="p-3 sm:p-4">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <ProgressRing value={client.velocity} size={36} />
                        <span className="absolute inset-0 flex items-center justify-center text-[8px] font-mono font-bold text-foreground">
                          {client.velocity}
                        </span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-foreground">{client.name}</span>
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
                  <td className="p-3 sm:p-4">
                    <div className="flex items-center gap-1.5">
                      <Layers3 className="size-3 text-muted-foreground" />
                      <span className="font-mono text-foreground">{client.ventureCount}</span>
                    </div>
                  </td>

                  {/* Velocity */}
                  <td className="p-3 sm:p-4">
                    <VelocityBadge rate={client.velocity} />
                  </td>

                  {/* Completion */}
                  <td className="p-3 sm:p-4">
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
                  <td className="p-3 sm:p-4">
                    <OverdueBadge count={client.overdueTasks} />
                  </td>

                  {/* Health */}
                  <td className="p-3 sm:p-4">
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
                      <span className="text-[10px] font-medium" style={{
                        color: client.avgHealth >= 70 ? "#4ADE80" : client.avgHealth >= 40 ? "#F59E0B" : "#EF4444"
                      }}>
                        {client.avgHealth >= 70 ? "Healthy" : client.avgHealth >= 40 ? "At Risk" : "Critical"}
                      </span>
                    </div>
                  </td>

                  {/* Actions */}
                  <td className="p-3 sm:p-4">
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredClients.map((client, i) => (
            <motion.div
              key={client.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03, duration: 0.3 }}
              onClick={() => onNavigate(`/clients/${client.slug}`)}
              className={cn(
                "bg-card border border-border rounded-xl p-5 cursor-pointer hover:border-primary/30 transition-all group relative",
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
                  </>
                )}
              </div>

              {/* Header with velocity ring */}
              <div className="flex items-center gap-3 mb-4">
                <div className="relative">
                  <ProgressRing value={client.velocity} size={44} />
                  <span className="absolute inset-0 flex items-center justify-center text-[10px] font-mono font-bold text-foreground">
                    {client.velocity}
                  </span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-foreground">{client.name}</span>
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
              <div className="mb-4 space-y-2">
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
              <div className="grid grid-cols-3 gap-3 mb-3">
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
              <div className="pt-3 border-t border-border/50 flex items-center justify-between">
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
            </motion.div>
          ))}
        </div>
      )}

      {/* ── Add Client Dialog ─────────────────────────────────────── */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Client</DialogTitle>
            <DialogDescription>
              Create a new client workspace. You can add ventures and team members after creation.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Client Name</label>
              <Input
                placeholder="e.g., FL1 Capital"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddClient()}
                autoFocus
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Description (optional)</label>
              <Input
                placeholder="Brief description of the client..."
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleAddClient} disabled={!newName.trim() || createOrg.isPending}>
              {createOrg.isPending ? <Loader2 className="size-4 animate-spin mr-1.5" /> : null}
              Create Client
            </Button>
          </DialogFooter>
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
    </div>
  );
}
