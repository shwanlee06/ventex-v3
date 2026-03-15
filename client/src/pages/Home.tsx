// ============================================================================
// Dashboard Page — Swiss Instrument design — FULLY INTERACTIVE
// ============================================================================

import DashboardLayout from "@/components/DashboardLayout";
import StatusBadge from "@/components/StatusBadge";
import { cn } from "@/lib/utils";
import {
  METRICS,
  VENTURES_BY_THEME,
  VENTURES,
  SPVS,
  TASKS,
  AGENT_LOGS,
  DISTRIBUTIONS,
  THEME_COLORS,
  STATUS_CONFIG,
  SPV_STAGE_CONFIG,
  getThemeColor,
  getTaskStatusFromDate,
  formatTimestamp,
  formatCurrency,
  formatDate,
  type Task,
  type SPV,
  type Venture,
  TEAM,
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
  TrendingUp,
  CheckCircle2,
  X,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useCallback, useEffect } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { logAction } from "@/lib/operatorSession";
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

export default function Home() {
  const [, navigate] = useLocation();
  const [tasks, setTasks] = useState<Task[]>([...TASKS]);
  const [sectorDrawer, setSectorDrawer] = useState<string | null>(null);
  const [spvModal, setSpvModal] = useState<SPV | null>(null);
  const [taskModal, setTaskModal] = useState<Task | null>(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [confirmUncheck, setConfirmUncheck] = useState<string | null>(null);

  // Simulate loading
  useEffect(() => {
    const timer = setTimeout(() => setPageLoading(false), 600);
    return () => clearTimeout(timer);
  }, []);

  const openTasks = tasks.filter(t => t.status !== "complete");
  const completedCount = tasks.filter(t => t.status === "complete").length;

  const handleTaskToggle = useCallback((taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    if (task.status === "complete") {
      // Unmarking — ask for confirmation
      setConfirmUncheck(taskId);
    } else {
      // Marking complete
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: "complete" as const } : t));
      logAction("Task completed", `Marked task ${taskId} complete`);
      toast.success("Task marked complete");
    }
  }, [tasks]);

  const confirmUncomplete = useCallback(() => {
    if (!confirmUncheck) return;
    setTasks(prev => prev.map(t => t.id === confirmUncheck ? { ...t, status: "open" as const } : t));
    toast.info("Task marked incomplete");
    setConfirmUncheck(null);
  }, [confirmUncheck]);

  const handleReassign = useCallback((taskId: string, assignee: string) => {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, assignees: [assignee] } : t));
    logAction("Task reassigned", `Reassigned to ${assignee}`);
    toast.success(`Task reassigned to ${assignee}`);
    setTaskModal(null);
  }, []);

  const METRIC_CARDS = [
    { label: "Active Ventures", value: METRICS.activeVentures, suffix: `of ${METRICS.totalVentures}`, icon: <Layers3 className="size-4" />, color: "text-blue-400", href: "/ventures" },
    { label: "Active SPVs", value: METRICS.activeSPVs, suffix: `of ${METRICS.totalSPVs}`, icon: <Briefcase className="size-4" />, color: "text-emerald-400", href: "/spvs" },
    { label: "Open Tasks", value: openTasks.length, suffix: `${completedCount} done`, icon: <ListChecks className="size-4" />, color: "text-amber-400", href: "/ventures" },
    { label: "Distributions", value: formatCurrency(METRICS.paidDistributions), suffix: "paid", icon: <DollarSign className="size-4" />, color: "text-primary", href: "/distributions" },
  ];

  // Sector drawer data
  const sectorVentures = sectorDrawer ? VENTURES_BY_THEME[sectorDrawer] || [] : [];
  const sectorActive = sectorVentures.filter(v => v.status === "In progress").length;

  return (
    <DashboardLayout title="Dashboard" subtitle="THALORA">
      <div className="p-4 md:p-6 space-y-6">
        {/* Metrics Bar — clickable */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {pageLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-lg" />
            ))
          ) : (
            METRIC_CARDS.map((m, i) => (
              <motion.div
                key={m.label}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05, duration: 0.3, ease: "easeOut" }}
                onClick={() => navigate(m.href)}
                className="bg-card border border-border rounded-lg p-4 flex flex-col gap-2 cursor-pointer hover:border-primary/30 hover:bg-card/80 transition-all group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] uppercase tracking-[0.06em] text-muted-foreground font-medium">
                    {m.label}
                  </span>
                  <span className={cn("opacity-60 group-hover:opacity-100 transition-opacity", m.color)}>{m.icon}</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-semibold tracking-tight text-foreground font-mono">
                    {m.value}
                  </span>
                  <span className="text-[10px] text-muted-foreground font-mono">{m.suffix}</span>
                </div>
              </motion.div>
            ))
          )}
        </div>

        {/* Main content */}
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-6">
          {/* Venture Sectors Grid — clickable */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-foreground">Venture Sectors</h2>
              <span className="text-[10px] font-mono text-muted-foreground">{Object.keys(VENTURES_BY_THEME).length} sectors · {METRICS.totalVentures} ventures</span>
            </div>

            {pageLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-48 rounded-lg" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {Object.entries(VENTURES_BY_THEME).map(([theme, ventures], i) => {
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
                          <div
                            className="flex items-center justify-center size-7 rounded-md"
                            style={{ backgroundColor: `${tc.color}15` }}
                          >
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
            )}

            {/* Active SPVs — clickable rows */}
            <div className="mt-6">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-foreground">Active SPVs & Deals</h2>
                <span className="text-[10px] font-mono text-muted-foreground">{SPVS.length} total</span>
              </div>
              <div className="bg-card border border-border rounded-lg divide-y divide-border">
                {SPVS.filter(s => s.stage === "Active deal" || s.stage === "In negotiation").slice(0, 5).map((spv, i) => {
                  const tc = getThemeColor(spv.theme);
                  const sc = SPV_STAGE_CONFIG[spv.stage];
                  return (
                    <motion.div
                      key={spv.id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 + i * 0.05, duration: 0.25 }}
                      onClick={() => setSpvModal(spv)}
                      className="p-3 flex items-center justify-between cursor-pointer hover:bg-accent/30 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="size-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: tc.color }} />
                        <div>
                          <span className="text-xs font-medium text-foreground">{spv.name}</span>
                          <span className="text-[10px] font-mono text-muted-foreground ml-2">{spv.theme}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded", spv.priority === "High" ? "bg-red-500/10 text-red-400" : spv.priority === "Medium" ? "bg-amber-500/10 text-amber-400" : "bg-secondary text-muted-foreground")}>
                          {spv.priority}
                        </span>
                        <StatusBadge label={sc?.label || spv.stage} bg={sc?.bg} dot={sc?.dot} />
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right column */}
          <div className="space-y-4">
            {/* Agent Activity Feed — clickable rows */}
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-foreground">Recent Activity</h2>
              <div className="flex items-center gap-1.5">
                <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[10px] font-mono text-emerald-400">live</span>
              </div>
            </div>

            <div className="bg-card border border-border rounded-lg divide-y divide-border">
              {AGENT_LOGS.map((log, i) => {
                const tc = getThemeColor(log.theme);
                return (
                  <motion.div
                    key={log.id}
                    initial={{ opacity: 0, x: 8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 + i * 0.08, duration: 0.25, ease: "easeOut" }}
                    onClick={() => toast.info(`${log.action}: ${log.detail}`)}
                    className="p-3 flex gap-3 cursor-pointer hover:bg-accent/30 transition-colors"
                  >
                    <div className="size-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ backgroundColor: tc.color }} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-foreground">{log.action}</span>
                        <span className="text-[10px] font-mono text-muted-foreground">{formatTimestamp(log.timestamp)}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">{log.detail}</p>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Tasks — with checkboxes and click-to-open modal */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-foreground">Tasks</h2>
                <span className="text-[10px] font-mono text-muted-foreground">{openTasks.length} open · {completedCount} done</span>
              </div>
              <div className="bg-card border border-border rounded-lg divide-y divide-border">
                {[...tasks].sort((a, b) => (a.status === "complete" ? 1 : 0) - (b.status === "complete" ? 1 : 0)).slice(0, 8).map((task) => {
                  const resolvedStatus = getTaskStatusFromDate(task);
                  const sc = STATUS_CONFIG[resolvedStatus];
                  return (
                    <div key={task.id} className="p-3 group">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Checkbox
                            checked={task.status === "complete"}
                            onCheckedChange={() => handleTaskToggle(task.id)}
                            className="size-3.5"
                          />
                          <button
                            onClick={() => setTaskModal(task)}
                            className={cn(
                              "text-xs font-medium text-foreground truncate max-w-[200px] hover:text-primary transition-colors text-left",
                              task.status === "complete" && "line-through opacity-50"
                            )}
                          >
                            {task.title}
                          </button>
                        </div>
                        <StatusBadge label={sc.label} bg={sc.bg} dot={sc.dot} />
                      </div>
                      <div className="flex items-center gap-2 mt-1 ml-6">
                        <span className="text-[10px] font-mono text-muted-foreground">Due {formatDate(task.dueDate)}</span>
                        {task.assignees.length > 0 && (
                          <span className="text-[10px] text-muted-foreground">· {task.assignees[0]}</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Distributions Summary */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-foreground">Distributions</h2>
                <span className="text-[10px] font-mono text-emerald-400">
                  <TrendingUp className="size-3 inline mr-1" />
                  {formatCurrency(METRICS.totalDistributions)} total
                </span>
              </div>
              <div className="bg-card border border-border rounded-lg divide-y divide-border">
                {DISTRIBUTIONS.map((dist) => (
                  <div
                    key={dist.id}
                    onClick={() => navigate("/distributions")}
                    className="p-3 flex items-center justify-between cursor-pointer hover:bg-accent/30 transition-colors"
                  >
                    <div>
                      <span className="text-xs font-medium text-foreground">{dist.name}</span>
                      <p className="text-[10px] font-mono text-muted-foreground mt-0.5">{dist.fund}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-mono font-medium text-foreground">{formatCurrency(dist.amount)}</span>
                      <p className={cn("text-[10px] font-mono mt-0.5", dist.status === "Paid" ? "text-emerald-400" : dist.status === "Cancelled" ? "text-red-400" : "text-blue-400")}>
                        {dist.status}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sector Drawer */}
      <Sheet open={!!sectorDrawer} onOpenChange={(open) => !open && setSectorDrawer(null)}>
        <SheetContent side="right" className="w-[420px] sm:max-w-[420px] bg-card border-border p-0">
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
                <div key={v.id} className="px-4 py-3">
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
                    <p className="text-[10px] text-muted-foreground mt-1 italic">{v.currentStatus}</p>
                  )}
                </div>
              ))}
            </div>
            <div className="p-4">
              <Button
                variant="outline"
                size="sm"
                className="w-full text-xs"
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
        <DialogContent className="sm:max-w-md">
          {spvModal && (
            <>
              <DialogHeader>
                <DialogTitle className="text-sm">{spvModal.name}</DialogTitle>
                <DialogDescription className="text-[10px] font-mono">{spvModal.theme} · {spvModal.stage}</DialogDescription>
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
                  {SPV_STAGE_CONFIG[spvModal.stage] && (
                    <StatusBadge label={SPV_STAGE_CONFIG[spvModal.stage].label} bg={SPV_STAGE_CONFIG[spvModal.stage].bg} dot={SPV_STAGE_CONFIG[spvModal.stage].dot} />
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
              <DialogFooter>
                <Button variant="outline" size="sm" className="text-xs" onClick={() => { setSpvModal(null); navigate("/spvs"); }}>
                  View full details →
                </Button>
                <Button variant="ghost" size="sm" className="text-xs" onClick={() => setSpvModal(null)}>
                  Close
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Task Modal */}
      <Dialog open={!!taskModal} onOpenChange={(open) => !open && setTaskModal(null)}>
        <DialogContent className="sm:max-w-md">
          {taskModal && (
            <>
              <DialogHeader>
                <DialogTitle className="text-sm">{taskModal.title}</DialogTitle>
                <DialogDescription className="text-[10px] font-mono">
                  Due {formatDate(taskModal.dueDate)} · {taskModal.priority} priority
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3 py-2">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Status</span>
                  {(() => {
                    const rs = getTaskStatusFromDate(taskModal);
                    const sc = STATUS_CONFIG[rs];
                    return <StatusBadge label={sc.label} bg={sc.bg} dot={sc.dot} />;
                  })()}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Assignees</span>
                  <span className="text-xs text-foreground">{taskModal.assignees.join(", ") || "Unassigned"}</span>
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
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Select team member" />
                    </SelectTrigger>
                    <SelectContent>
                      {TEAM.map(m => (
                        <SelectItem key={m.id} value={m.name}>{m.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button size="sm" className="text-xs" onClick={() => { handleTaskToggle(taskModal.id); setTaskModal(null); }}>
                  <CheckCircle2 className="size-3.5 mr-1" />
                  {taskModal.status === "complete" ? "Reopen Task" : "Mark Complete"}
                </Button>
                <Button variant="ghost" size="sm" className="text-xs" onClick={() => setTaskModal(null)}>
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
              Are you sure you want to mark this task as incomplete? It will be moved back to your open tasks list.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="text-xs h-8">Cancel</AlertDialogCancel>
            <AlertDialogAction className="text-xs h-8 bg-amber-600 hover:bg-amber-700" onClick={confirmUncomplete}>
              Yes, reopen task
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
