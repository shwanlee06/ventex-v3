// ============================================================================
// Dashboard Page — Swiss Instrument design — LIVE DB DATA — Mobile-First
// ============================================================================

import DashboardLayout from "@/components/DashboardLayout";
import StatusBadge from "@/components/StatusBadge";
import { cn } from "@/lib/utils";
import {
  THEME_COLORS,
  STATUS_CONFIG,
  SPV_STAGE_CONFIG,
  getThemeColor,
  formatTimestamp,
  formatCurrency,
  formatDate,
} from "@/lib/data";
import { trpc } from "@/lib/trpc";
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
} from "lucide-react";
import { motion } from "framer-motion";
import { useState, useCallback, useMemo } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
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
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";

const THEME_ICONS: Record<string, React.ReactNode> = {
  "Real Estate": <Building2 className="size-4" />,
  "Yacht": <Ship className="size-4" />,
  "F&B": <UtensilsCrossed className="size-4" />,
  "Entertainment": <Clapperboard className="size-4" />,
  "Oil & Gas": <Fuel className="size-4" />,
  "Others": <Package className="size-4" />,
};

type DBTask = {
  id: number;
  title: string;
  status: string;
  dueDate: string | null;
  priority: string | null;
  assigneeNames: string[] | null;
  ventureLink: string | null;
  ventureId: number | null;
};

type DBSPV = {
  id: number;
  name: string;
  sector: string | null;
  priority: string | null;
  stage: string | null;
  currentStatus: string | null;
  nextStep: string | null;
  slug: string;
};

export default function Home() {
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();

  // ── Live data queries ──────────────────────────────────────────────
  const venturesQ = trpc.ventures.list.useQuery();
  const tasksQ = trpc.tasks.list.useQuery();
  const spvsQ = trpc.spvs.list.useQuery();
  const distQ = trpc.distributions.list.useQuery();
  const activityQ = trpc.activity.recent.useQuery({ limit: 8 });
  const teamQ = trpc.team.list.useQuery();

  // ── Intelligence queries ──────────────────────────────────────────
  const docFeedQ = trpc.docIntel.recentFeed.useQuery({ limit: 5 });
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
  const docFeed = docFeedQ.data || [];
  const dailyBrief = dailyBriefQ.data;
  const smartAlerts = smartAlertsQ.data || [];

  // Group ventures by sector
  const venturesBySector = useMemo(() => {
    const map: Record<string, typeof allVentures> = {};
    for (const v of allVentures) {
      if (!map[v.sector]) map[v.sector] = [];
      map[v.sector].push(v);
    }
    return map;
  }, [allVentures]);

  // Task metrics
  const now = new Date();
  const openTasks = allTasks.filter(t => t.status !== "complete");
  const completedCount = allTasks.filter(t => t.status === "complete").length;
  const overdueTasks = allTasks.filter(t => t.status !== "complete" && t.dueDate && new Date(t.dueDate) < now);

  // Distribution metrics
  const totalDistAmount = allDists.reduce((s, d) => s + (d.amount || 0), 0);
  const paidDistAmount = allDists.filter(d => d.status === "Paid").reduce((s, d) => s + (d.amount || 0), 0);

  // ── Mutations ──────────────────────────────────────────────────────
  const updateTask = trpc.tasks.update.useMutation({
    onSuccess: () => {
      utils.tasks.list.invalidate();
      utils.activity.recent.invalidate();
    },
  });

  // ── State ──────────────────────────────────────────────────────────
  const [sectorDrawer, setSectorDrawer] = useState<string | null>(null);
  const [spvModal, setSpvModal] = useState<DBSPV | null>(null);
  const [taskModal, setTaskModal] = useState<DBTask | null>(null);
  const [confirmUncheck, setConfirmUncheck] = useState<number | null>(null);

  // ── Handlers ───────────────────────────────────────────────────────
  const handleTaskToggle = useCallback((task: DBTask) => {
    if (task.status === "complete") {
      setConfirmUncheck(task.id);
    } else {
      updateTask.mutate({ id: task.id, status: "complete" });
      toast.success("Task marked complete");
    }
  }, [updateTask]);

  const confirmUncomplete = useCallback(() => {
    if (!confirmUncheck) return;
    updateTask.mutate({ id: confirmUncheck, status: "open" });
    toast.info("Task marked incomplete");
    setConfirmUncheck(null);
  }, [confirmUncheck, updateTask]);

  const handleReassign = useCallback((taskId: number, assignee: string) => {
    updateTask.mutate({ id: taskId, assigneeNames: [assignee] });
    toast.success(`Task reassigned to ${assignee}`);
    setTaskModal(null);
  }, [updateTask]);

  function getTaskStatus(task: DBTask): "open" | "complete" | "overdue" {
    if (task.status === "complete") return "complete";
    if (task.dueDate && new Date(task.dueDate) < now) return "overdue";
    return "open";
  }

  // ── Metric cards ───────────────────────────────────────────────────
  const METRIC_CARDS = [
    { label: "Active Ventures", value: allVentures.filter(v => v.status === "In progress").length, suffix: `of ${allVentures.length}`, icon: <Layers3 className="size-4" />, color: "text-blue-400", href: "/ventures" },
    { label: "Active SPVs", value: allSpvs.filter(s => s.stage === "Active deal").length, suffix: `of ${allSpvs.length}`, icon: <Briefcase className="size-4" />, color: "text-emerald-400", href: "/spvs" },
    { label: "Open Tasks", value: openTasks.length, suffix: `${completedCount} done`, icon: <ListChecks className="size-4" />, color: "text-amber-400", href: "/tasks" },
    { label: "Distributions", value: formatCurrency(paidDistAmount), suffix: "paid", icon: <DollarSign className="size-4" />, color: "text-primary", href: "/distributions" },
  ];

  // Sector drawer data
  const sectorVentures = sectorDrawer ? venturesBySector[sectorDrawer] || [] : [];
  const sectorActive = sectorVentures.filter(v => v.status === "In progress").length;

  return (
    <DashboardLayout title="Dashboard" subtitle="ROYALTON VENTURE HOLDING">
      <div className="p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6 pb-24 md:pb-6">

        {/* Overdue Alert Banner */}
        {overdueTasks.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <AlertTriangle className="size-4 text-red-400 flex-shrink-0" />
              <span className="text-xs font-medium text-red-400">
                {overdueTasks.length} overdue task{overdueTasks.length > 1 ? "s" : ""}
              </span>
            </div>
            <Button variant="ghost" size="sm" className="text-xs text-red-400 h-8 min-h-[32px] px-3" onClick={() => navigate("/tasks")}>
              View <ChevronRight className="size-3 ml-0.5" />
            </Button>
          </motion.div>
        )}

        {/* Metrics Bar — 2x2 grid on mobile, 4-col on desktop */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
          {pageLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-20 sm:h-24 rounded-lg" />
            ))
          ) : (
            METRIC_CARDS.map((m, i) => (
              <motion.div
                key={m.label}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05, duration: 0.3, ease: "easeOut" }}
                onClick={() => navigate(m.href)}
                className="bg-card border border-border rounded-lg p-3 sm:p-4 flex flex-col gap-1.5 sm:gap-2 cursor-pointer hover:border-primary/30 active:scale-[0.98] hover:bg-card/80 transition-all group touch-manipulation"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] sm:text-[11px] uppercase tracking-[0.06em] text-muted-foreground font-medium truncate">
                    {m.label}
                  </span>
                  <span className={cn("opacity-60 group-hover:opacity-100 transition-opacity flex-shrink-0", m.color)}>{m.icon}</span>
                </div>
                <div className="flex items-baseline gap-1.5 sm:gap-2">
                  <span className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground font-mono">
                    {m.value}
                  </span>
                  <span className="text-[9px] sm:text-[10px] text-muted-foreground font-mono">{m.suffix}</span>
                </div>
              </motion.div>
            ))
          )}
        </div>

        {/* Quick Actions — horizontal scroll on mobile */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 -mx-3 px-3 sm:mx-0 sm:px-0 scrollbar-hide">
          <Button variant="outline" size="sm" className="text-xs gap-1.5 h-8 min-h-[32px] whitespace-nowrap flex-shrink-0 touch-manipulation" onClick={() => navigate("/ventures")}>
            <Plus className="size-3" /> New Venture
          </Button>
          <Button variant="outline" size="sm" className="text-xs gap-1.5 h-8 min-h-[32px] whitespace-nowrap flex-shrink-0 touch-manipulation" onClick={() => navigate("/tasks")}>
            <Plus className="size-3" /> New Task
          </Button>
          <Button variant="outline" size="sm" className="text-xs gap-1.5 h-8 min-h-[32px] whitespace-nowrap flex-shrink-0 touch-manipulation" onClick={() => navigate("/spvs")}>
            <Plus className="size-3" /> New SPV
          </Button>
        </div>

        {/* Main content — stacked on mobile, 2-col on desktop */}
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-4 sm:gap-6">
          {/* Left column — Venture Sectors + SPVs */}
          <div className="space-y-4 sm:space-y-6">
            {/* Venture Sectors */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-foreground">Venture Sectors</h2>
                <span className="text-[10px] font-mono text-muted-foreground">{Object.keys(venturesBySector).length} sectors</span>
              </div>

              {pageLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-40 sm:h-48 rounded-lg" />
                  ))}
                </div>
              ) : (
                /* Horizontal scroll on mobile, grid on desktop */
                <>
                  {/* Mobile: horizontal scroll */}
                  <div className="flex gap-3 overflow-x-auto pb-2 -mx-3 px-3 sm:hidden scrollbar-hide snap-x snap-mandatory">
                    {Object.entries(venturesBySector).map(([theme, ventures], i) => {
                      const tc = getThemeColor(theme);
                      const activeCount = ventures.filter(v => v.status === "In progress").length;
                      return (
                        <motion.div
                          key={theme}
                          initial={{ opacity: 0, y: 12 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.2 + i * 0.05, duration: 0.3 }}
                          onClick={() => setSectorDrawer(theme)}
                          className="bg-card border border-border rounded-lg p-3 min-w-[240px] w-[240px] flex-shrink-0 snap-start cursor-pointer active:scale-[0.98] transition-all touch-manipulation"
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <div className="flex items-center justify-center size-7 rounded-md" style={{ backgroundColor: `${tc.color}15` }}>
                              <span style={{ color: tc.color }}>{THEME_ICONS[theme] || <Package className="size-4" />}</span>
                            </div>
                            <span className="text-sm font-medium text-foreground">{theme}</span>
                          </div>
                          <div className="space-y-1 mb-2">
                            {ventures.slice(0, 3).map((v) => (
                              <div key={v.id} className="flex items-center justify-between">
                                <span className="text-xs text-muted-foreground truncate max-w-[140px]">{v.name}</span>
                                <span className="text-[10px] font-mono text-muted-foreground">{v.location}</span>
                              </div>
                            ))}
                            {ventures.length > 3 && (
                              <span className="text-[10px] text-muted-foreground font-mono">+{ventures.length - 3} more</span>
                            )}
                          </div>
                          <div className="flex items-center gap-4 pt-2 border-t border-border">
                            <div className="flex flex-col">
                              <span className="text-xs font-mono font-medium text-foreground">{ventures.length}</span>
                              <span className="text-[10px] text-muted-foreground">ventures</span>
                            </div>
                            <div className="flex flex-col">
                              <span className="text-xs font-mono font-medium text-foreground">{activeCount}</span>
                              <span className="text-[10px] text-muted-foreground">active</span>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>

                  {/* Desktop: grid */}
                  <div className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {Object.entries(venturesBySector).map(([theme, ventures], i) => {
                      const tc = getThemeColor(theme);
                      const activeCount = ventures.filter(v => v.status === "In progress").length;
                      return (
                        <motion.div
                          key={theme}
                          initial={{ opacity: 0, y: 12 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.2 + i * 0.05, duration: 0.3, ease: "easeOut" }}
                          onClick={() => setSectorDrawer(theme)}
                          className="bg-card border border-border rounded-lg p-4 hover:border-primary/30 transition-all cursor-pointer group"
                        >
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <div className="flex items-center justify-center size-7 rounded-md" style={{ backgroundColor: `${tc.color}15` }}>
                                <span style={{ color: tc.color }}>{THEME_ICONS[theme] || <Package className="size-4" />}</span>
                              </div>
                              <span className="text-sm font-medium text-foreground">{theme}</span>
                            </div>
                            <ArrowUpRight className="size-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                          <div className="space-y-1.5 mb-3">
                            {ventures.slice(0, 4).map((v) => (
                              <div key={v.id} className="flex items-center justify-between">
                                <span className="text-xs text-muted-foreground truncate max-w-[160px]">{v.name}</span>
                                <span className="text-[10px] font-mono text-muted-foreground">{v.location}</span>
                              </div>
                            ))}
                            {ventures.length > 4 && (
                              <span className="text-[10px] text-muted-foreground font-mono">+{ventures.length - 4} more</span>
                            )}
                          </div>
                          <div className="flex items-center gap-4 pt-3 border-t border-border">
                            <div className="flex flex-col">
                              <span className="text-xs font-mono font-medium text-foreground">{ventures.length}</span>
                              <span className="text-[10px] text-muted-foreground">ventures</span>
                            </div>
                            <div className="flex flex-col">
                              <span className="text-xs font-mono font-medium text-foreground">{activeCount}</span>
                              <span className="text-[10px] text-muted-foreground">active</span>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>

            {/* Active SPVs — card style on mobile */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-foreground">Active SPVs & Deals</h2>
                <span className="text-[10px] font-mono text-muted-foreground">{allSpvs.length} total</span>
              </div>
              <div className="bg-card border border-border rounded-lg divide-y divide-border">
                {allSpvs.filter(s => s.stage === "Active deal" || s.stage === "In negotiation").slice(0, 5).map((spv, i) => {
                  const tc = getThemeColor(spv.sector || "Others");
                  const sc = SPV_STAGE_CONFIG[spv.stage || "Active deal"];
                  return (
                    <motion.div
                      key={spv.id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 + i * 0.05, duration: 0.25 }}
                      onClick={() => setSpvModal(spv)}
                      className="p-3 flex items-center justify-between cursor-pointer hover:bg-accent/30 active:bg-accent/40 transition-colors touch-manipulation"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="size-2 rounded-full flex-shrink-0" style={{ backgroundColor: tc.color }} />
                        <div className="min-w-0">
                          <span className="text-xs font-medium text-foreground block truncate">{spv.name}</span>
                          <span className="text-[10px] font-mono text-muted-foreground">{spv.sector}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                        <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded hidden sm:inline-block", spv.priority === "High" ? "bg-red-500/10 text-red-400" : spv.priority === "Medium" ? "bg-amber-500/10 text-amber-400" : "bg-secondary text-muted-foreground")}>
                          {spv.priority}
                        </span>
                        <StatusBadge label={sc?.label || spv.stage || "Unknown"} bg={sc?.bg} dot={sc?.dot} />
                      </div>
                    </motion.div>
                  );
                })}
                {allSpvs.filter(s => s.stage === "Active deal" || s.stage === "In negotiation").length === 0 && (
                  <div className="p-4 text-center text-xs text-muted-foreground">No active SPVs</div>
                )}
              </div>
            </div>
          </div>

          {/* Right column — stacked on mobile below main content */}
          <div className="space-y-4">
            {/* Recent Activity */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-foreground">Recent Activity</h2>
                <div className="flex items-center gap-1.5">
                  <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[10px] font-mono text-emerald-400">live</span>
                </div>
              </div>
              <div className="bg-card border border-border rounded-lg divide-y divide-border">
                {activityLogs.slice(0, 6).map((log, i) => {
                  const tc = getThemeColor(log.sector || "Others");
                  return (
                    <motion.div
                      key={log.id}
                      initial={{ opacity: 0, x: 8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.4 + i * 0.08, duration: 0.25, ease: "easeOut" }}
                      onClick={() => toast.info(`${log.action}: ${log.detail || ""}`)}
                      className="p-3 flex gap-3 cursor-pointer hover:bg-accent/30 active:bg-accent/40 transition-colors touch-manipulation"
                    >
                      <div className="size-2 rounded-full mt-1.5 flex-shrink-0" style={{ backgroundColor: tc.color }} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-foreground truncate">{log.action}</span>
                          <span className="text-[10px] font-mono text-muted-foreground flex-shrink-0">{formatTimestamp(log.createdAt instanceof Date ? log.createdAt.toISOString() : String(log.createdAt))}</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">{log.detail}</p>
                      </div>
                    </motion.div>
                  );
                })}
                {activityLogs.length === 0 && (
                  <div className="p-4 text-center text-xs text-muted-foreground">No recent activity</div>
                )}
              </div>
            </div>

            {/* Tasks */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-foreground">Tasks</h2>
                <span className="text-[10px] font-mono text-muted-foreground">{openTasks.length} open · {completedCount} done</span>
              </div>
              <div className="bg-card border border-border rounded-lg divide-y divide-border">
                {[...allTasks].sort((a, b) => (a.status === "complete" ? 1 : 0) - (b.status === "complete" ? 1 : 0)).slice(0, 8).map((task) => {
                  const resolvedStatus = getTaskStatus(task as DBTask);
                  const sc = STATUS_CONFIG[resolvedStatus];
                  return (
                    <div key={task.id} className="p-3 group touch-manipulation">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 min-w-0">
                          <Checkbox
                            checked={task.status === "complete"}
                            onCheckedChange={() => handleTaskToggle(task as DBTask)}
                            className="size-4 flex-shrink-0"
                          />
                          <button
                            onClick={() => setTaskModal(task as DBTask)}
                            className={cn(
                              "text-xs font-medium text-foreground truncate hover:text-primary transition-colors text-left",
                              task.status === "complete" && "line-through opacity-50"
                            )}
                          >
                            {task.title}
                          </button>
                        </div>
                        <StatusBadge label={sc.label} bg={sc.bg} dot={sc.dot} />
                      </div>
                      <div className="flex items-center gap-2 mt-1 ml-6">
                        <span className="text-[10px] font-mono text-muted-foreground">Due {task.dueDate ? formatDate(task.dueDate) : "—"}</span>
                        {task.assigneeNames && task.assigneeNames.length > 0 && (
                          <span className="text-[10px] text-muted-foreground hidden sm:inline">· {task.assigneeNames[0]}</span>
                        )}
                      </div>
                    </div>
                  );
                })}
                {allTasks.length === 0 && (
                  <div className="p-4 text-center text-xs text-muted-foreground">No tasks yet</div>
                )}
              </div>
            </div>

            {/* Smart Alerts */}
            {smartAlerts.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Bell className="size-4 text-amber-400" /> Smart Alerts
                  </h2>
                  <span className="text-[10px] font-mono text-amber-400">{smartAlerts.length} active</span>
                </div>
                <div className="bg-card border border-border rounded-lg divide-y divide-border">
                  {smartAlerts.map((alert: any) => (
                    <div key={alert.id} className="p-3 flex items-start gap-2 touch-manipulation">
                      <Shield className={cn("size-4 mt-0.5 flex-shrink-0",
                        alert.severity === "critical" ? "text-red-400" :
                        alert.severity === "high" ? "text-orange-400" :
                        alert.severity === "medium" ? "text-amber-400" : "text-muted-foreground"
                      )} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-foreground">{alert.title}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2">{alert.message}</p>
                        <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded mt-1 inline-block",
                          alert.severity === "critical" ? "bg-red-500/10 text-red-400" :
                          alert.severity === "high" ? "bg-orange-500/10 text-orange-400" :
                          alert.severity === "medium" ? "bg-amber-500/10 text-amber-400" : "bg-secondary text-muted-foreground"
                        )}>{alert.severity}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Daily Brief */}
            {dailyBrief && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Sparkles className="size-4 text-purple-400" /> Daily Brief
                  </h2>
                  <span className="text-[10px] font-mono text-muted-foreground">{dailyBrief.briefDate}</span>
                </div>
                <div className="bg-card border border-border rounded-lg p-3 sm:p-4">
                  {dailyBrief.headline && <p className="text-sm font-medium text-foreground mb-2">{dailyBrief.headline}</p>}
                  {dailyBrief.portfolioHealth && <p className="text-xs text-foreground leading-relaxed">{dailyBrief.portfolioHealth}</p>}
                  {dailyBrief.recommendedActions && dailyBrief.recommendedActions.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-border">
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Recommended Actions</span>
                      <ul className="mt-1 space-y-1">
                        {dailyBrief.recommendedActions.map((a: string, i: number) => (
                          <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                            <span className="text-primary mt-0.5">•</span> {a}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {dailyBrief.winsThisWeek && dailyBrief.winsThisWeek.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-border">
                      <span className="text-[10px] uppercase tracking-wider text-emerald-400 font-medium">Wins This Week</span>
                      <ul className="mt-1 space-y-1">
                        {dailyBrief.winsThisWeek.map((w: string, i: number) => (
                          <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                            <span className="text-emerald-400 mt-0.5">✓</span> {w}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Document Intelligence Feed */}
            {docFeed.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Brain className="size-4 text-purple-400" /> Doc Intelligence
                  </h2>
                  <span className="text-[10px] font-mono text-muted-foreground">{docFeed.length} recent</span>
                </div>
                <div className="bg-card border border-border rounded-lg divide-y divide-border">
                  {docFeed.map((doc: any) => (
                    <div key={doc.id} className="p-3">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <FileText className="size-3.5 text-purple-400 flex-shrink-0" />
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400">
                          {doc.documentType || "Unknown"}
                        </span>
                        <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded",
                          doc.processingStatus === "completed" ? "bg-emerald-500/10 text-emerald-400" :
                          doc.processingStatus === "processing" ? "bg-amber-500/10 text-amber-400" :
                          "bg-red-500/10 text-red-400"
                        )}>{doc.processingStatus}</span>
                      </div>
                      {doc.summary && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{doc.summary}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Distributions Summary */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-foreground">Distributions</h2>
                <span className="text-[10px] font-mono text-emerald-400">
                  <TrendingUp className="size-3 inline mr-1" />
                  {formatCurrency(totalDistAmount)} total
                </span>
              </div>
              <div className="bg-card border border-border rounded-lg divide-y divide-border">
                {allDists.map((dist) => (
                  <div
                    key={dist.id}
                    onClick={() => navigate("/distributions")}
                    className="p-3 flex items-center justify-between cursor-pointer hover:bg-accent/30 active:bg-accent/40 transition-colors touch-manipulation"
                  >
                    <div className="min-w-0">
                      <span className="text-xs font-medium text-foreground block truncate">{dist.name}</span>
                      <p className="text-[10px] font-mono text-muted-foreground mt-0.5">{dist.fund}</p>
                    </div>
                    <div className="text-right flex-shrink-0 ml-2">
                      <span className="text-xs font-mono font-medium text-foreground">{formatCurrency(dist.amount || 0)}</span>
                      <p className={cn("text-[10px] font-mono mt-0.5", dist.status === "Paid" ? "text-emerald-400" : dist.status === "Cancelled" ? "text-red-400" : "text-blue-400")}>
                        {dist.status}
                      </p>
                    </div>
                  </div>
                ))}
                {allDists.length === 0 && (
                  <div className="p-4 text-center text-xs text-muted-foreground">No distributions</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sector Drawer — full width on mobile */}
      <Sheet open={!!sectorDrawer} onOpenChange={(open) => !open && setSectorDrawer(null)}>
        <SheetContent side="right" className="w-full sm:w-[420px] sm:max-w-[420px] bg-card border-border p-0">
          <SheetHeader className="px-4 pt-4 pb-3 border-b border-border">
            <div className="flex items-center gap-2">
              {sectorDrawer && (
                <div
                  className="flex items-center justify-center size-7 rounded-md"
                  style={{ backgroundColor: `${getThemeColor(sectorDrawer).color}15` }}
                >
                  <span style={{ color: getThemeColor(sectorDrawer).color }}>
                    {THEME_ICONS[sectorDrawer] || <Package className="size-4" />}
                  </span>
                </div>
              )}
              <SheetTitle className="text-sm font-semibold">{sectorDrawer}</SheetTitle>
            </div>
            <SheetDescription className="text-[10px] font-mono text-muted-foreground">
              {sectorVentures.length} ventures · {sectorActive} active
            </SheetDescription>
          </SheetHeader>
          <ScrollArea className="h-[calc(100vh-140px)]">
            <div className="divide-y divide-border">
              {sectorVentures.map((v) => (
                <div
                  key={v.id}
                  className="px-4 py-3 cursor-pointer hover:bg-accent/30 active:bg-accent/40 transition-colors touch-manipulation"
                  onClick={() => { setSectorDrawer(null); navigate(`/ventures/${v.slug}`); }}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-foreground">{v.name}</span>
                    <span className={cn(
                      "text-[10px] font-medium px-1.5 py-0.5 rounded",
                      v.status === "In progress" ? "bg-emerald-500/10 text-emerald-400" :
                      v.status === "On-Hold" ? "bg-amber-500/10 text-amber-400" :
                      v.status === "Completed" ? "bg-blue-500/10 text-blue-400" :
                      "bg-secondary text-muted-foreground"
                    )}>
                      {v.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-[10px] font-mono text-muted-foreground">{v.location}</span>
                    <span className="text-[10px] text-muted-foreground">{v.stage}</span>
                  </div>
                  {v.currentStatus && (
                    <p className="text-[10px] text-muted-foreground mt-1 italic line-clamp-2">{v.currentStatus}</p>
                  )}
                </div>
              ))}
            </div>
            <div className="p-4">
              <Button
                variant="outline"
                size="sm"
                className="w-full text-xs h-9 min-h-[36px] touch-manipulation"
                onClick={() => { setSectorDrawer(null); navigate("/ventures"); }}
              >
                View all ventures →
              </Button>
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>

      {/* SPV Modal */}
      <Dialog open={!!spvModal} onOpenChange={(open) => !open && setSpvModal(null)}>
        <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
          {spvModal && (
            <>
              <DialogHeader>
                <DialogTitle className="text-sm">{spvModal.name}</DialogTitle>
                <DialogDescription className="text-[10px] font-mono">{spvModal.sector} · {spvModal.stage}</DialogDescription>
              </DialogHeader>
              <div className="space-y-3 py-2">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Priority</span>
                  <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded", spvModal.priority === "High" ? "bg-red-500/10 text-red-400" : spvModal.priority === "Medium" ? "bg-amber-500/10 text-amber-400" : "bg-secondary text-muted-foreground")}>
                    {spvModal.priority}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Status</span>
                  {SPV_STAGE_CONFIG[spvModal.stage || ""] && (
                    <StatusBadge label={SPV_STAGE_CONFIG[spvModal.stage || ""].label} bg={SPV_STAGE_CONFIG[spvModal.stage || ""].bg} dot={SPV_STAGE_CONFIG[spvModal.stage || ""].dot} />
                  )}
                </div>
                {spvModal.currentStatus && (
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium block mb-1">Notes</span>
                    <p className="text-xs text-foreground bg-secondary/30 rounded-md p-2">{spvModal.currentStatus}</p>
                  </div>
                )}
                {spvModal.nextStep && (
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium block mb-1">Next Step</span>
                    <p className="text-xs text-foreground bg-secondary/30 rounded-md p-2">{spvModal.nextStep}</p>
                  </div>
                )}
              </div>
              <DialogFooter className="flex-col sm:flex-row gap-2">
                <Button variant="outline" size="sm" className="text-xs h-9 min-h-[36px] w-full sm:w-auto touch-manipulation" onClick={() => { setSpvModal(null); navigate(`/spvs/${spvModal.slug}`); }}>
                  View full details →
                </Button>
                <Button variant="ghost" size="sm" className="text-xs h-9 min-h-[36px] w-full sm:w-auto touch-manipulation" onClick={() => setSpvModal(null)}>
                  Close
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Task Modal */}
      <Dialog open={!!taskModal} onOpenChange={(open) => !open && setTaskModal(null)}>
        <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
          {taskModal && (
            <>
              <DialogHeader>
                <DialogTitle className="text-sm">{taskModal.title}</DialogTitle>
                <DialogDescription className="text-[10px] font-mono">
                  Due {taskModal.dueDate ? formatDate(taskModal.dueDate) : "—"} · {taskModal.priority} priority
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3 py-2">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Status</span>
                  {(() => {
                    const rs = getTaskStatus(taskModal);
                    const sc = STATUS_CONFIG[rs];
                    return <StatusBadge label={sc.label} bg={sc.bg} dot={sc.dot} />;
                  })()}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Assignees</span>
                  <span className="text-xs text-foreground">{taskModal.assigneeNames?.join(", ") || "Unassigned"}</span>
                </div>
                {taskModal.ventureLink && (
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Venture</span>
                    <span className="text-xs text-primary">{taskModal.ventureLink}</span>
                  </div>
                )}
                <div>
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium block mb-1">Reassign</span>
                  <Select onValueChange={(val) => handleReassign(taskModal.id, val)}>
                    <SelectTrigger className="h-9 min-h-[36px] text-xs">
                      <SelectValue placeholder="Select team member" />
                    </SelectTrigger>
                    <SelectContent>
                      {allTeam.map(m => (
                        <SelectItem key={m.id} value={m.name}>{m.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter className="flex-col sm:flex-row gap-2">
                <Button size="sm" className="text-xs h-9 min-h-[36px] w-full sm:w-auto touch-manipulation" onClick={() => { handleTaskToggle(taskModal); setTaskModal(null); }}>
                  <CheckCircle2 className="size-3.5 mr-1" />
                  {taskModal.status === "complete" ? "Reopen Task" : "Mark Complete"}
                </Button>
                <Button variant="ghost" size="sm" className="text-xs h-9 min-h-[36px] w-full sm:w-auto touch-manipulation" onClick={() => setTaskModal(null)}>
                  Close
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Confirm Uncomplete Dialog */}
      <AlertDialog open={!!confirmUncheck} onOpenChange={(open) => !open && setConfirmUncheck(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-sm">Reopen this task?</AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground">
              Are you sure you want to mark this task as incomplete?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel className="text-xs h-9 min-h-[36px] touch-manipulation">Cancel</AlertDialogCancel>
            <AlertDialogAction className="text-xs h-9 min-h-[36px] bg-amber-600 hover:bg-amber-700 touch-manipulation" onClick={confirmUncomplete}>
              Yes, reopen task
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
