// Tasks Page — /tasks — Mobile-First Responsive
// Card/Table toggle, Kanban board, filters, add/edit, checkboxes

import DashboardLayout from "@/components/DashboardLayout";
import StatusBadge from "@/components/StatusBadge";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { isVentexTeam } from "@/lib/ventex";
import { usePreviewMode } from "@/contexts/PreviewMode";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { motion, AnimatePresence } from "framer-motion";
import {
  ListChecks, Plus, CheckCircle2, Clock, AlertTriangle,
  Search, X, LayoutGrid, List, Columns3,
} from "lucide-react";
import { useState, useCallback, useMemo } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

const PRIORITIES = ["High", "Medium", "Low"];

type TaskStatus = "open" | "overdue" | "complete";

function getTaskStatus(task: { status: string; dueDate: string | null }): TaskStatus {
  if (task.status === "complete") return "complete";
  if (task.dueDate && new Date(task.dueDate) < new Date()) return "overdue";
  return "open";
}

const STATUS_CONFIG: Record<TaskStatus, { label: string; bg: string; dot: string }> = {
  open: { label: "Open", bg: "bg-amber-500/10 text-amber-400 border-amber-500/20", dot: "bg-amber-400" },
  overdue: { label: "Overdue", bg: "bg-red-500/10 text-red-400 border-red-500/20", dot: "bg-red-400" },
  complete: { label: "Complete", bg: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20", dot: "bg-emerald-400" },
};

function formatDate(d: string | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

export default function TasksPage() {
  const utils = trpc.useUtils();
  const { user } = useAuth();
  const { isPreviewMode } = usePreviewMode();
  const { activeOrgId } = useWorkspace();
  const isAdmin = isVentexTeam(user) && !isPreviewMode;

  // In preview mode, scope queries to the active org
  const scopedOrgId = isPreviewMode && activeOrgId ? activeOrgId : undefined;
  const orgInput = scopedOrgId ? { organizationId: scopedOrgId } : undefined;

  const tasksQ = trpc.tasks.list.useQuery(orgInput);
  const metricsQ = trpc.tasks.metrics.useQuery(orgInput);
  const teamQ = trpc.team.list.useQuery(orgInput);
  const venturesQ = trpc.ventures.list.useQuery(orgInput);

  const rawTasks = tasksQ.data || [];
  // Strip "AI Generated:" prefix for client view
  const tasks = isAdmin ? rawTasks : rawTasks.map(t => ({
    ...t,
    title: t.title.replace(/^AI Generated:\s*/i, ''),
  }));
  const team = teamQ.data || [];
  const ventures = venturesQ.data || [];
  const metrics = metricsQ.data || { total: 0, open: 0, complete: 0, overdue: 0 };

  const createTask = trpc.tasks.create.useMutation({
    onSuccess: () => { utils.tasks.list.invalidate(); utils.tasks.metrics.invalidate(); utils.activity.recent.invalidate(); },
  });
  const updateTask = trpc.tasks.update.useMutation({
    onSuccess: () => { utils.tasks.list.invalidate(); utils.tasks.metrics.invalidate(); utils.activity.recent.invalidate(); },
  });

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [priorityFilter, setPriorityFilter] = useState("All");
  const [assigneeFilter, setAssigneeFilter] = useState("All");
  const [viewMode, setViewMode] = useState<"card" | "table" | "board">("card");
  const [activeMetric, setActiveMetric] = useState<string | null>(null);

  const [addOpen, setAddOpen] = useState(false);
  const [editTaskId, setEditTaskId] = useState<number | null>(null);
  const [confirmUncheck, setConfirmUncheck] = useState<number | null>(null);

  const [newTitle, setNewTitle] = useState("");
  const [newDue, setNewDue] = useState("");
  const [newPriority, setNewPriority] = useState("Medium");
  const [newAssignee, setNewAssignee] = useState("");
  const [newVentureId, setNewVentureId] = useState("");

  const allAssignees = useMemo(() => {
    const names = new Set<string>();
    tasks.forEach(t => ((t.assigneeNames || []) as string[]).forEach(n => names.add(n)));
    return ["All", ...Array.from(names)];
  }, [tasks]);

  const filtered = useMemo(() => {
    const result = tasks.filter(t => {
      const resolved = getTaskStatus(t);
      if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false;
      if (statusFilter === "open" && resolved !== "open") return false;
      if (statusFilter === "complete" && resolved !== "complete") return false;
      if (statusFilter === "overdue" && resolved !== "overdue") return false;
      if (priorityFilter !== "All" && t.priority !== priorityFilter) return false;
      if (assigneeFilter !== "All" && !((t.assigneeNames || []) as string[]).includes(assigneeFilter)) return false;
      return true;
    });
    // Default sort: most overdue first, then by due date
    return result.sort((a, b) => {
      const statusA = getTaskStatus(a);
      const statusB = getTaskStatus(b);
      // Overdue first, then open, then complete
      const order: Record<TaskStatus, number> = { overdue: 0, open: 1, complete: 2 };
      if (order[statusA] !== order[statusB]) return order[statusA] - order[statusB];
      // Within same status, sort by due date (earliest first)
      const dateA = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
      const dateB = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
      return dateA - dateB;
    });
  }, [tasks, search, statusFilter, priorityFilter, assigneeFilter]);

  // Progress stats
  const completedCount = tasks.filter(t => t.status === "complete").length;
  const overdueCount = tasks.filter(t => getTaskStatus(t) === "overdue").length;
  const openCount = tasks.filter(t => getTaskStatus(t) === "open").length;
  const totalCount = tasks.length;
  const completionPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const overduePct = totalCount > 0 ? Math.round((overdueCount / totalCount) * 100) : 0;

  // Severely overdue tasks (>21 days)
  const severelyOverdue = useMemo(() => {
    const now = Date.now();
    return tasks.filter(t => {
      if (t.status === "complete" || !t.dueDate) return false;
      const days = Math.floor((now - new Date(t.dueDate).getTime()) / (1000 * 60 * 60 * 24));
      return days > 21;
    });
  }, [tasks]);

  const editTask = editTaskId ? tasks.find(t => t.id === editTaskId) : null;

  const handleToggle = useCallback((taskId: number) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    if (task.status === "complete") {
      setConfirmUncheck(taskId);
    } else {
      updateTask.mutate({ id: taskId, status: "complete" });
      toast.success("Task marked complete");
    }
  }, [tasks, updateTask]);

  const confirmUncomplete = useCallback(() => {
    if (!confirmUncheck) return;
    updateTask.mutate({ id: confirmUncheck, status: "open" });
    toast.info("Task reopened");
    setConfirmUncheck(null);
  }, [confirmUncheck, updateTask]);

  const handleAdd = useCallback(() => {
    if (!newTitle.trim()) { toast.error("Task title is required"); return; }
    const ventureId = newVentureId ? parseInt(newVentureId) : undefined;
    const venture = ventureId ? ventures.find(v => v.id === ventureId) : null;
    createTask.mutate({
      title: newTitle.trim(),
      dueDate: newDue || undefined,
      priority: newPriority,
      assigneeNames: newAssignee ? [newAssignee] : [],
      ventureId,
      ventureLink: venture?.name || undefined,
      status: "open",
    });
    setAddOpen(false);
    setNewTitle(""); setNewDue(""); setNewPriority("Medium"); setNewAssignee(""); setNewVentureId("");
    toast.success("Task created");
  }, [newTitle, newDue, newPriority, newAssignee, newVentureId, ventures, createTask]);

  const handleReassign = useCallback((taskId: number, assignee: string) => {
    updateTask.mutate({ id: taskId, assigneeNames: [assignee] });
    toast.success(`Task reassigned to ${assignee}`);
    setEditTaskId(null);
  }, [updateTask]);

  const metricCards = [
    { key: "total", label: "Total", value: metrics.total, icon: <ListChecks className="size-4 text-blue-400" />, color: "text-blue-400", activeColor: "border-blue-500/50" },
    { key: "open", label: "Open", value: metrics.open, icon: <Clock className="size-4 text-amber-400" />, color: "text-amber-400", activeColor: "border-amber-500/50" },
    { key: "overdue", label: "Overdue", value: metrics.overdue, icon: <AlertTriangle className="size-4 text-red-400" />, color: "text-red-400", activeColor: "border-red-500/50" },
    { key: "done", label: "Done", value: metrics.complete, icon: <CheckCircle2 className="size-4 text-emerald-400" />, color: "text-emerald-400", activeColor: "border-emerald-500/50" },
  ];

  const displayTasks = useMemo(() => {
    if (!activeMetric) return filtered;
    switch (activeMetric) {
      case "open": return filtered.filter(t => getTaskStatus(t) === "open");
      case "overdue": return filtered.filter(t => getTaskStatus(t) === "overdue");
      case "done": return filtered.filter(t => getTaskStatus(t) === "complete");
      case "total": default: return filtered;
    }
  }, [activeMetric, filtered]);

  const boardColumns = useMemo(() => ({
    open: displayTasks.filter(t => getTaskStatus(t) === "open"),
    overdue: displayTasks.filter(t => getTaskStatus(t) === "overdue"),
    complete: displayTasks.filter(t => t.status === "complete"),
  }), [displayTasks]);

  // Shared task card component for card view and board view
  const TaskCard = ({ task }: { task: typeof tasks[0] }) => {
    const rs = getTaskStatus(task);
    const sc = STATUS_CONFIG[rs];
    return (
      <motion.div
        layout
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        className="bg-card border border-border rounded-xl p-3 cursor-pointer hover:border-primary/20 active:scale-[0.98] transition-all touch-manipulation"
        onClick={() => setEditTaskId(task.id)}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-2.5 min-w-0 flex-1">
            <Checkbox
              checked={task.status === "complete"}
              onCheckedChange={() => handleToggle(task.id)}
              className="size-4 mt-0.5 flex-shrink-0"
              onClick={(e) => e.stopPropagation()}
            />
            <span className={cn("text-xs font-medium text-foreground leading-tight", task.status === "complete" && "line-through opacity-50")}>
              {task.title}
            </span>
          </div>
          {/* CL-FIX 9: Hide priority labels for client view */}
          {isAdmin && (
            <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded flex-shrink-0",
              task.priority === "High" ? "bg-red-500/10 text-red-400" :
              task.priority === "Medium" ? "bg-amber-500/10 text-amber-400" :
              "bg-secondary text-muted-foreground"
            )}>{task.priority}</span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-2 ml-6.5">
          <StatusBadge label={sc.label} bg={sc.bg} dot={sc.dot} />
          <span className="text-[10px] font-mono text-muted-foreground">{formatDate(task.dueDate)}</span>
          {(task.assigneeNames as string[])?.[0] && (
            <span className="text-[10px] text-muted-foreground truncate capitalize">· {(task.assigneeNames as string[])[0]}</span>
          )}
        </div>
        {task.ventureLink && (
          <div className="mt-1.5 ml-6.5">
            <span className="text-[10px] text-primary/70 italic">{task.ventureLink}</span>
          </div>
        )}
      </motion.div>
    );
  };

  return (
    <DashboardLayout title="Tasks">
      <div className="p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6 pb-24 md:pb-6">
        {/* Metrics — clickable filter cards */}
        <div className="grid grid-cols-4 gap-2 sm:gap-3">
          {tasksQ.isLoading ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 sm:h-24 rounded-lg" />) : metricCards.map((m, i) => {
            const isActive = activeMetric === m.key;
            return (
              <motion.div
                key={m.key}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05, duration: 0.3 }}
                onClick={() => setActiveMetric(isActive ? null : m.key)}
                className={cn(
                  "bg-card border rounded-lg p-2 sm:p-4 cursor-pointer transition-all active:scale-[0.97]",
                  isActive ? `${m.activeColor} bg-card/80` : "border-border hover:border-primary/20"
                )}
              >
                <div className="flex items-center gap-1 sm:gap-2 mb-1 sm:mb-2">
                  {m.icon}
                  <span className="text-[8px] sm:text-[11px] uppercase tracking-[0.06em] text-muted-foreground font-medium truncate">{m.label}</span>
                </div>
                <span className={cn("text-base sm:text-2xl font-mono font-semibold block", m.color)}>{m.value}</span>
              </motion.div>
            );
          })}
        </div>
        <AnimatePresence>
          {activeMetric && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
              <div className="flex items-center gap-2 px-3 py-2 bg-primary/5 border border-primary/10 rounded-lg">
                <span className="text-xs text-primary font-medium">Showing: {metricCards.find(m => m.key === activeMetric)?.label}</span>
                <button onClick={() => setActiveMetric(null)} className="ml-auto text-xs text-muted-foreground hover:text-foreground"><X className="size-3.5" /></button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Overdue Warning Banner */}
        {severelyOverdue.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 flex items-center gap-3"
          >
            <AlertTriangle className="size-4 text-amber-400 flex-shrink-0" />
            <p className="text-xs text-amber-200">
              <span className="font-medium">{severelyOverdue.length} task{severelyOverdue.length !== 1 ? "s are" : " is"} overdue by 21+ days</span>
              <span className="text-amber-400/70"> — please review and action</span>
            </p>
          </motion.div>
        )}

        {/* Progress Bar */}
        {totalCount > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium">Progress</span>
              <span className="text-[10px] font-mono text-muted-foreground">
                {completedCount} of {totalCount} complete · {completionPct}%
              </span>
            </div>
            <div className="h-2 bg-secondary/50 rounded-full overflow-hidden flex">
              <div
                className="h-full bg-emerald-500 transition-all duration-500"
                style={{ width: `${completionPct}%` }}
              />
              <div
                className="h-full bg-red-500 transition-all duration-500"
                style={{ width: `${overduePct}%` }}
              />
            </div>
            <div className="flex items-center gap-4 text-[10px] text-muted-foreground">
              <span className="flex items-center gap-1"><span className="size-1.5 rounded-full bg-emerald-500" /> Complete ({completedCount})</span>
              <span className="flex items-center gap-1"><span className="size-1.5 rounded-full bg-red-500" /> Overdue ({overdueCount})</span>
              <span className="flex items-center gap-1"><span className="size-1.5 rounded-full bg-secondary" /> Open ({openCount})</span>
            </div>
          </div>
        )}

        {/* Search bar */}
        <div className="relative">
          <Search className="size-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search tasks..."
            className="h-9 min-h-[36px] text-xs pl-8 w-full"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground touch-manipulation">
              <X className="size-3.5" />
            </button>
          )}
        </div>

        {/* Filters — horizontal scroll on mobile */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 -mx-3 px-3 sm:mx-0 sm:px-0 scrollbar-hide">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-9 min-h-[36px] text-xs w-[110px] sm:w-[120px] flex-shrink-0"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All Status</SelectItem>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="overdue">Overdue</SelectItem>
              <SelectItem value="complete">Complete</SelectItem>
            </SelectContent>
          </Select>
          {isAdmin && (
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="h-9 min-h-[36px] text-xs w-[110px] sm:w-[120px] flex-shrink-0"><SelectValue placeholder="Priority" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Priority</SelectItem>
                {PRIORITIES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
          <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
            <SelectTrigger className="h-9 min-h-[36px] text-xs w-[120px] sm:w-[140px] flex-shrink-0"><SelectValue placeholder="Assignee" /></SelectTrigger>
            <SelectContent>
              {allAssignees.map(a => <SelectItem key={a} value={a}>{a === "All" ? "All Assignees" : a}</SelectItem>)}
            </SelectContent>
          </Select>
          {(search || statusFilter !== "All" || priorityFilter !== "All" || assigneeFilter !== "All") && (
            <Button variant="ghost" size="sm" className="text-xs h-9 min-h-[36px] flex-shrink-0 touch-manipulation" onClick={() => { setSearch(""); setStatusFilter("All"); setPriorityFilter("All"); setAssigneeFilter("All"); }}>
              <X className="size-3 mr-1" /> Clear
            </Button>
          )}
        </div>

        {/* View toggle + Add button */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 bg-secondary/50 rounded-lg p-0.5">
            <button onClick={() => setViewMode("card")} className={cn("p-1.5 sm:p-2 rounded-md transition-colors touch-manipulation", viewMode === "card" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground")}>
              <LayoutGrid className="size-4" />
            </button>
            <button onClick={() => setViewMode("table")} className={cn("p-1.5 sm:p-2 rounded-md transition-colors touch-manipulation hidden sm:block", viewMode === "table" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground")}>
              <List className="size-4" />
            </button>
            <button onClick={() => setViewMode("board")} className={cn("p-1.5 sm:p-2 rounded-md transition-colors touch-manipulation", viewMode === "board" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground")}>
              <Columns3 className="size-4" />
            </button>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-muted-foreground hidden sm:inline">{displayTasks.length} tasks</span>
            {isAdmin && (
              <Button size="sm" className="text-xs h-9 min-h-[36px] touch-manipulation" onClick={() => setAddOpen(true)}>
                <Plus className="size-3.5 mr-1" /> Add Task
              </Button>
            )}
          </div>
        </div>

        {/* Empty state */}
        {displayTasks.length === 0 && !tasksQ.isLoading && (
          <div className="p-12 text-center bg-card border border-border rounded-lg">
            <CheckCircle2 className="size-8 text-muted-foreground mx-auto mb-3 opacity-30" strokeWidth={1.5} />
            <p className="text-base font-medium text-foreground/80 mb-1">All clear</p>
            <p className="text-[13px] text-muted-foreground/40">No tasks assigned or pending</p>
          </div>
        )}

        {/* Card View (default, mobile-friendly) */}
        {viewMode === "card" && displayTasks.length > 0 && (
          <div className="space-y-2">
            <AnimatePresence>
              {displayTasks.map(task => <TaskCard key={task.id} task={task} />)}
            </AnimatePresence>
          </div>
        )}

        {/* Table View (desktop) */}
        {viewMode === "table" && displayTasks.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-card border border-border rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-8"></TableHead>
                    <TableHead className="text-[11px] uppercase tracking-[0.06em] font-medium text-muted-foreground">Task</TableHead>
                    <TableHead className="text-[11px] uppercase tracking-[0.06em] font-medium text-muted-foreground hidden md:table-cell">Due Date</TableHead>
                    {isAdmin && <TableHead className="text-[11px] uppercase tracking-[0.06em] font-medium text-muted-foreground">Priority</TableHead>}
                    <TableHead className="text-[11px] uppercase tracking-[0.06em] font-medium text-muted-foreground hidden lg:table-cell">Assignees</TableHead>
                    <TableHead className="text-[11px] uppercase tracking-[0.06em] font-medium text-muted-foreground hidden lg:table-cell">Venture</TableHead>
                    <TableHead className="text-[11px] uppercase tracking-[0.06em] font-medium text-muted-foreground">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayTasks.map(task => {
                    const rs = getTaskStatus(task);
                    const sc = STATUS_CONFIG[rs];
                    return (
                      <TableRow
                        key={task.id}
                        className={cn("cursor-pointer hover:bg-accent/30 active:bg-accent/40 touch-manipulation", task.status === "complete" && "opacity-50")}
                        onClick={() => setEditTaskId(task.id)}
                      >
                        <TableCell onClick={e => e.stopPropagation()}>
                          <Checkbox
                            checked={task.status === "complete"}
                            onCheckedChange={() => handleToggle(task.id)}
                            className="size-4"
                          />
                        </TableCell>
                        <TableCell>
                          <span className={cn("text-xs font-medium text-foreground", task.status === "complete" && "line-through")}>
                            {task.title}
                          </span>
                        </TableCell>
                        <TableCell className="text-xs font-mono text-muted-foreground hidden md:table-cell">{formatDate(task.dueDate)}</TableCell>
                        {isAdmin && (
                          <TableCell>
                            <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded",
                              task.priority === "High" ? "bg-red-500/10 text-red-400" :
                              task.priority === "Medium" ? "bg-amber-500/10 text-amber-400" :
                              "bg-secondary text-muted-foreground"
                            )}>{task.priority}</span>
                          </TableCell>
                        )}
                        <TableCell className="text-xs text-muted-foreground hidden lg:table-cell">{((task.assigneeNames || []) as string[]).join(", ") || "—"}</TableCell>
                        <TableCell className="text-xs text-primary/70 italic hidden lg:table-cell">{task.ventureLink || "—"}</TableCell>
                        <TableCell><StatusBadge label={sc.label} bg={sc.bg} dot={sc.dot} /></TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </motion.div>
        )}

        {/* Board View — horizontal scroll on mobile */}
        {viewMode === "board" && (
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-3 px-3 sm:mx-0 sm:px-0 sm:grid sm:grid-cols-3 sm:overflow-visible scrollbar-hide">
            {(["open", "overdue", "complete"] as const).map(col => {
              const colTasks = boardColumns[col];
              const colConfig = STATUS_CONFIG[col];
              return (
                <motion.div
                  key={col}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: col === "open" ? 0.1 : col === "overdue" ? 0.2 : 0.3 }}
                  className="bg-card/50 border border-border rounded-lg min-w-[280px] sm:min-w-0 flex-shrink-0"
                >
                  <div className="px-3 sm:px-4 py-3 border-b border-border flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={cn("size-2 rounded-full", colConfig.dot)} />
                      <span className="text-xs font-semibold text-foreground">{colConfig.label}</span>
                    </div>
                    <span className="text-[10px] font-mono text-muted-foreground">{colTasks.length}</span>
                  </div>
                  <div className="p-2 sm:p-3 space-y-2 min-h-[200px]">
                    <AnimatePresence>
                      {colTasks.map(task => <TaskCard key={task.id} task={task} />)}
                    </AnimatePresence>
                    {colTasks.length === 0 && (
                      <p className="text-[10px] text-muted-foreground text-center py-8">No tasks</p>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Task Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-sm">Create Task</DialogTitle>
            <DialogDescription className="text-[10px] font-mono">Add a new task to the system</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Task Title</Label>
              <Input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="Task title" className="mt-1 h-9 min-h-[36px] text-xs" />
            </div>
            <div className={cn("grid gap-3", isAdmin ? "grid-cols-2" : "grid-cols-1")}>
              <div>
                <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Due Date</Label>
                <Input type="date" value={newDue} onChange={e => setNewDue(e.target.value)} className="mt-1 h-9 min-h-[36px] text-xs" />
              </div>
              {isAdmin && (
                <div>
                  <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Priority</Label>
                  <Select value={newPriority} onValueChange={setNewPriority}>
                    <SelectTrigger className="mt-1 h-9 min-h-[36px] text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>{PRIORITIES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              )}
            </div>
            <div>
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Assignee</Label>
              <Select value={newAssignee} onValueChange={setNewAssignee}>
                <SelectTrigger className="mt-1 h-9 min-h-[36px] text-xs"><SelectValue placeholder="Select assignee" /></SelectTrigger>
                <SelectContent>
                  {team.map(m => <SelectItem key={m.id} value={m.name}>{m.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Linked Venture (optional)</Label>
              <Select value={newVentureId} onValueChange={setNewVentureId}>
                <SelectTrigger className="mt-1 h-9 min-h-[36px] text-xs"><SelectValue placeholder="Select venture" /></SelectTrigger>
                <SelectContent>
                  {ventures.map(v => <SelectItem key={v.id} value={String(v.id)}>{v.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button size="sm" className="text-xs h-9 min-h-[36px] w-full sm:w-auto touch-manipulation" onClick={handleAdd} disabled={createTask.isPending}>
              <Plus className="size-3.5 mr-1" /> Create Task
            </Button>
            <Button variant="ghost" size="sm" className="text-xs h-9 min-h-[36px] w-full sm:w-auto touch-manipulation" onClick={() => setAddOpen(false)}>Cancel</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Task Dialog */}
      <Dialog open={!!editTask} onOpenChange={open => !open && setEditTaskId(null)}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          {editTask && (
            <>
              <DialogHeader>
                <DialogTitle className="text-sm">{editTask.title}</DialogTitle>
                <DialogDescription className="text-[10px] font-mono">
                  Due {formatDate(editTask.dueDate)}{isAdmin ? ` · ${editTask.priority} priority` : ""}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3 py-2">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Status</span>
                  {(() => {
                    const rs = getTaskStatus(editTask);
                    const sc = STATUS_CONFIG[rs];
                    return <StatusBadge label={sc.label} bg={sc.bg} dot={sc.dot} />;
                  })()}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Assignees</span>
                  <span className="text-xs text-foreground">{((editTask.assigneeNames || []) as string[]).join(", ") || "Unassigned"}</span>
                </div>
                {editTask.ventureLink && (
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Venture</span>
                    <span className="text-xs text-primary">{editTask.ventureLink}</span>
                  </div>
                )}
                <div>
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium block mb-1">Reassign</span>
                  <Select onValueChange={val => handleReassign(editTask.id, val)}>
                    <SelectTrigger className="h-9 min-h-[36px] text-xs"><SelectValue placeholder="Select team member" /></SelectTrigger>
                    <SelectContent>
                      {team.map(m => <SelectItem key={m.id} value={m.name}>{m.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter className="flex-col sm:flex-row gap-2">
                <Button size="sm" className="text-xs h-9 min-h-[36px] w-full sm:w-auto touch-manipulation" onClick={() => { handleToggle(editTask.id); setEditTaskId(null); }}>
                  <CheckCircle2 className="size-3.5 mr-1" />
                  {editTask.status === "complete" ? "Reopen Task" : "Mark Complete"}
                </Button>
                <Button variant="ghost" size="sm" className="text-xs h-9 min-h-[36px] w-full sm:w-auto touch-manipulation" onClick={() => setEditTaskId(null)}>Close</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Confirm Uncomplete */}
      <AlertDialog open={!!confirmUncheck} onOpenChange={open => !open && setConfirmUncheck(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-sm">Reopen this task?</AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground">
              This will move the task back to your open tasks list.
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
