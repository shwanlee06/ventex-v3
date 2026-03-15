// ============================================================================
// Tasks Page — Standalone /tasks — Full task management
// Kanban-style columns, filters, add/edit, checkboxes, assignee management
// ============================================================================

import DashboardLayout from "@/components/DashboardLayout";
import StatusBadge from "@/components/StatusBadge";
import { cn } from "@/lib/utils";
import {
  TASKS, TEAM, VENTURES, STATUS_CONFIG, getTaskStatusFromDate,
  formatDate, type Task, type TaskStatus,
} from "@/lib/data";
import { logAction } from "@/lib/operatorSession";
import { motion, AnimatePresence } from "framer-motion";
import {
  ListChecks, Plus, Filter, CheckCircle2, Clock, AlertTriangle,
  Calendar, User, ChevronDown, Search, X, ArrowUpRight,
} from "lucide-react";
import { useState, useCallback, useMemo, useEffect } from "react";
import { useLocation, Link } from "wouter";
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
const ALL_ASSIGNEES = ["All", ...Array.from(new Set(TASKS.flatMap(t => t.assignees)))].filter(Boolean);

export default function TasksPage() {
  const [, navigate] = useLocation();
  const [tasks, setTasks] = useState<Task[]>([...TASKS]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [priorityFilter, setPriorityFilter] = useState("All");
  const [assigneeFilter, setAssigneeFilter] = useState("All");
  const [viewMode, setViewMode] = useState<"table" | "board">("table");

  // Modals
  const [addOpen, setAddOpen] = useState(false);
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [confirmUncheck, setConfirmUncheck] = useState<string | null>(null);

  // Add form
  const [newTitle, setNewTitle] = useState("");
  const [newDue, setNewDue] = useState("");
  const [newPriority, setNewPriority] = useState("Medium");
  const [newAssignee, setNewAssignee] = useState("");
  const [newVenture, setNewVenture] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 400);
    return () => clearTimeout(timer);
  }, []);

  // Filtered tasks
  const filtered = useMemo(() => {
    return tasks.filter(t => {
      const resolved = getTaskStatusFromDate(t);
      if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false;
      if (statusFilter === "open" && resolved !== "open") return false;
      if (statusFilter === "complete" && resolved !== "complete") return false;
      if (statusFilter === "overdue" && resolved !== "overdue") return false;
      if (priorityFilter !== "All" && t.priority !== priorityFilter) return false;
      if (assigneeFilter !== "All" && !t.assignees.includes(assigneeFilter)) return false;
      return true;
    });
  }, [tasks, search, statusFilter, priorityFilter, assigneeFilter]);

  // Metrics
  const openCount = tasks.filter(t => getTaskStatusFromDate(t) === "open").length;
  const overdueCount = tasks.filter(t => getTaskStatusFromDate(t) === "overdue").length;
  const completeCount = tasks.filter(t => t.status === "complete").length;
  const totalCount = tasks.length;

  // Board columns
  const boardColumns = useMemo(() => ({
    open: filtered.filter(t => getTaskStatusFromDate(t) === "open"),
    overdue: filtered.filter(t => getTaskStatusFromDate(t) === "overdue"),
    complete: filtered.filter(t => t.status === "complete"),
  }), [filtered]);

  // Handlers
  const handleToggle = useCallback((taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    if (task.status === "complete") {
      setConfirmUncheck(taskId);
    } else {
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: "complete" as const } : t));
      logAction("Task completed", task.title);
      toast.success("Task marked complete");
    }
  }, [tasks]);

  const confirmUncomplete = useCallback(() => {
    if (!confirmUncheck) return;
    setTasks(prev => prev.map(t => t.id === confirmUncheck ? { ...t, status: "open" as const } : t));
    toast.info("Task reopened");
    setConfirmUncheck(null);
  }, [confirmUncheck]);

  const handleAdd = useCallback(() => {
    if (!newTitle.trim()) { toast.error("Task title is required"); return; }
    const t: Task = {
      id: `task-${Date.now()}`,
      title: newTitle.trim(),
      status: "open",
      dueDate: newDue || new Date().toISOString().split("T")[0],
      priority: newPriority,
      assignees: newAssignee ? [newAssignee] : [],
      ventureLink: newVenture || undefined,
    };
    setTasks(prev => [t, ...prev]);
    setAddOpen(false);
    setNewTitle(""); setNewDue(""); setNewPriority("Medium"); setNewAssignee(""); setNewVenture("");
    logAction("Task created", t.title);
    toast.success("Task created");
  }, [newTitle, newDue, newPriority, newAssignee, newVenture]);

  const handleReassign = useCallback((taskId: string, assignee: string) => {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, assignees: [assignee] } : t));
    logAction("Task reassigned", `Reassigned to ${assignee}`);
    toast.success(`Task reassigned to ${assignee}`);
    setEditTask(null);
  }, []);

  const metrics = [
    { label: "Total Tasks", value: totalCount, icon: <ListChecks className="size-4 text-blue-400" />, color: "text-blue-400" },
    { label: "Open", value: openCount, icon: <Clock className="size-4 text-amber-400" />, color: "text-amber-400" },
    { label: "Overdue", value: overdueCount, icon: <AlertTriangle className="size-4 text-red-400" />, color: "text-red-400" },
    { label: "Completed", value: completeCount, icon: <CheckCircle2 className="size-4 text-emerald-400" />, color: "text-emerald-400" },
  ];

  // ── Task Card (for board view) ──────────────────────────────────────────
  const TaskCard = ({ task }: { task: Task }) => {
    const rs = getTaskStatusFromDate(task);
    const sc = STATUS_CONFIG[rs];
    return (
      <motion.div
        layout
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        className="bg-card border border-border rounded-lg p-3 cursor-pointer hover:border-primary/30 transition-all"
        onClick={() => setEditTask(task)}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-2">
            <Checkbox
              checked={task.status === "complete"}
              onCheckedChange={() => handleToggle(task.id)}
              className="size-3.5 mt-0.5"
              onClick={(e) => e.stopPropagation()}
            />
            <span className={cn("text-xs font-medium text-foreground leading-tight", task.status === "complete" && "line-through opacity-50")}>
              {task.title}
            </span>
          </div>
          <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded flex-shrink-0",
            task.priority === "High" ? "bg-red-500/10 text-red-400" :
            task.priority === "Medium" ? "bg-amber-500/10 text-amber-400" :
            "bg-secondary text-muted-foreground"
          )}>{task.priority}</span>
        </div>
        <div className="flex items-center gap-2 mt-2 ml-6">
          <span className="text-[10px] font-mono text-muted-foreground">{formatDate(task.dueDate)}</span>
          {task.assignees[0] && (
            <span className="text-[10px] text-muted-foreground">· {task.assignees[0]}</span>
          )}
        </div>
        {task.ventureLink && (
          <div className="mt-1.5 ml-6">
            <span className="text-[10px] text-primary/70 italic">{task.ventureLink}</span>
          </div>
        )}
      </motion.div>
    );
  };

  return (
    <DashboardLayout title="Tasks" subtitle="TASK MANAGEMENT">
      <div className="p-4 md:p-6 space-y-6">
        {/* Metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {loading ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-lg" />) : metrics.map((m, i) => (
            <motion.div
              key={m.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05, duration: 0.3 }}
              className="bg-card border border-border rounded-lg p-4"
            >
              <div className="flex items-center gap-2 mb-2">
                {m.icon}
                <span className="text-[11px] uppercase tracking-[0.06em] text-muted-foreground font-medium">{m.label}</span>
              </div>
              <span className={cn("text-2xl font-mono font-semibold", m.color)}>{m.value}</span>
            </motion.div>
          ))}
        </div>

        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="size-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search tasks..."
              className="h-8 text-xs pl-8 w-[200px]"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-8 text-xs w-[120px]"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All Status</SelectItem>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="overdue">Overdue</SelectItem>
              <SelectItem value="complete">Complete</SelectItem>
            </SelectContent>
          </Select>
          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="h-8 text-xs w-[120px]"><SelectValue placeholder="Priority" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All Priority</SelectItem>
              {PRIORITIES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
            <SelectTrigger className="h-8 text-xs w-[140px]"><SelectValue placeholder="Assignee" /></SelectTrigger>
            <SelectContent>
              {ALL_ASSIGNEES.map(a => <SelectItem key={a} value={a}>{a === "All" ? "All Assignees" : a}</SelectItem>)}
            </SelectContent>
          </Select>
          {(search || statusFilter !== "All" || priorityFilter !== "All" || assigneeFilter !== "All") && (
            <Button variant="ghost" size="sm" className="text-xs h-8" onClick={() => { setSearch(""); setStatusFilter("All"); setPriorityFilter("All"); setAssigneeFilter("All"); }}>
              <X className="size-3 mr-1" /> Clear
            </Button>
          )}
          <div className="ml-auto flex items-center gap-2">
            <div className="flex border border-border rounded-md overflow-hidden">
              <button
                onClick={() => setViewMode("table")}
                className={cn("px-3 py-1.5 text-[10px] font-medium transition-colors", viewMode === "table" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground")}
              >
                Table
              </button>
              <button
                onClick={() => setViewMode("board")}
                className={cn("px-3 py-1.5 text-[10px] font-medium transition-colors", viewMode === "board" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground")}
              >
                Board
              </button>
            </div>
            <Button size="sm" className="text-xs h-8" onClick={() => setAddOpen(true)}>
              <Plus className="size-3.5 mr-1" /> Add Task
            </Button>
          </div>
        </div>

        {/* Table View */}
        {viewMode === "table" && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-card border border-border rounded-lg overflow-hidden">
            <div className="px-4 py-3 border-b border-border flex items-center justify-between">
              <h2 className="text-sm font-semibold text-foreground">All Tasks</h2>
              <span className="text-[10px] font-mono text-muted-foreground">{filtered.length} tasks</span>
            </div>
            {filtered.length === 0 ? (
              <div className="p-12 text-center">
                <ListChecks className="size-8 text-muted-foreground mx-auto mb-3 opacity-40" />
                <p className="text-sm text-muted-foreground">No tasks match the current filters.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-8"></TableHead>
                    <TableHead className="text-[11px] uppercase tracking-[0.06em] font-medium text-muted-foreground">Task</TableHead>
                    <TableHead className="text-[11px] uppercase tracking-[0.06em] font-medium text-muted-foreground">Due Date</TableHead>
                    <TableHead className="text-[11px] uppercase tracking-[0.06em] font-medium text-muted-foreground">Priority</TableHead>
                    <TableHead className="text-[11px] uppercase tracking-[0.06em] font-medium text-muted-foreground">Assignees</TableHead>
                    <TableHead className="text-[11px] uppercase tracking-[0.06em] font-medium text-muted-foreground">Venture</TableHead>
                    <TableHead className="text-[11px] uppercase tracking-[0.06em] font-medium text-muted-foreground">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(task => {
                    const rs = getTaskStatusFromDate(task);
                    const sc = STATUS_CONFIG[rs];
                    return (
                      <TableRow
                        key={task.id}
                        className={cn("cursor-pointer hover:bg-accent/30", task.status === "complete" && "opacity-50")}
                        onClick={() => setEditTask(task)}
                      >
                        <TableCell onClick={e => e.stopPropagation()}>
                          <Checkbox
                            checked={task.status === "complete"}
                            onCheckedChange={() => handleToggle(task.id)}
                            className="size-3.5"
                          />
                        </TableCell>
                        <TableCell>
                          <span className={cn("text-xs font-medium text-foreground", task.status === "complete" && "line-through")}>
                            {task.title}
                          </span>
                        </TableCell>
                        <TableCell className="text-xs font-mono text-muted-foreground">{formatDate(task.dueDate)}</TableCell>
                        <TableCell>
                          <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded",
                            task.priority === "High" ? "bg-red-500/10 text-red-400" :
                            task.priority === "Medium" ? "bg-amber-500/10 text-amber-400" :
                            "bg-secondary text-muted-foreground"
                          )}>{task.priority}</span>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">{task.assignees.join(", ") || "—"}</TableCell>
                        <TableCell className="text-xs text-primary/70 italic">{task.ventureLink || "—"}</TableCell>
                        <TableCell><StatusBadge label={sc.label} bg={sc.bg} dot={sc.dot} /></TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </motion.div>
        )}

        {/* Board View */}
        {viewMode === "board" && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {(["open", "overdue", "complete"] as const).map(col => {
              const colTasks = boardColumns[col];
              const colConfig = STATUS_CONFIG[col];
              return (
                <motion.div
                  key={col}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: col === "open" ? 0.1 : col === "overdue" ? 0.2 : 0.3 }}
                  className="bg-card/50 border border-border rounded-lg"
                >
                  <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={cn("size-2 rounded-full", colConfig.dot)} />
                      <span className="text-xs font-semibold text-foreground">{colConfig.label}</span>
                    </div>
                    <span className="text-[10px] font-mono text-muted-foreground">{colTasks.length}</span>
                  </div>
                  <div className="p-3 space-y-2 min-h-[200px]">
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

      {/* ── Add Task Dialog ────────────────────────────────────────────────── */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm">Create Task</DialogTitle>
            <DialogDescription className="text-[10px] font-mono">Add a new task to the system</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Task Title</Label>
              <Input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="Task title" className="mt-1 h-8 text-xs" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Due Date</Label>
                <Input type="date" value={newDue} onChange={e => setNewDue(e.target.value)} className="mt-1 h-8 text-xs" />
              </div>
              <div>
                <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Priority</Label>
                <Select value={newPriority} onValueChange={setNewPriority}>
                  <SelectTrigger className="mt-1 h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>{PRIORITIES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Assignee</Label>
              <Select value={newAssignee} onValueChange={setNewAssignee}>
                <SelectTrigger className="mt-1 h-8 text-xs"><SelectValue placeholder="Select assignee" /></SelectTrigger>
                <SelectContent>
                  {TEAM.map(m => <SelectItem key={m.id} value={m.name}>{m.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Linked Venture (optional)</Label>
              <Select value={newVenture} onValueChange={setNewVenture}>
                <SelectTrigger className="mt-1 h-8 text-xs"><SelectValue placeholder="Select venture" /></SelectTrigger>
                <SelectContent>
                  {VENTURES.filter(v => v.name !== "Unknown Venture").map(v => <SelectItem key={v.id} value={v.name}>{v.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button size="sm" className="text-xs" onClick={handleAdd}>
              <Plus className="size-3.5 mr-1" /> Create Task
            </Button>
            <Button variant="ghost" size="sm" className="text-xs" onClick={() => setAddOpen(false)}>Cancel</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Edit Task Dialog ───────────────────────────────────────────────── */}
      <Dialog open={!!editTask} onOpenChange={open => !open && setEditTask(null)}>
        <DialogContent className="sm:max-w-md">
          {editTask && (
            <>
              <DialogHeader>
                <DialogTitle className="text-sm">{editTask.title}</DialogTitle>
                <DialogDescription className="text-[10px] font-mono">
                  Due {formatDate(editTask.dueDate)} · {editTask.priority} priority
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3 py-2">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Status</span>
                  {(() => {
                    const rs = getTaskStatusFromDate(editTask);
                    const sc = STATUS_CONFIG[rs];
                    return <StatusBadge label={sc.label} bg={sc.bg} dot={sc.dot} />;
                  })()}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Assignees</span>
                  <span className="text-xs text-foreground">{editTask.assignees.join(", ") || "Unassigned"}</span>
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
                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select team member" /></SelectTrigger>
                    <SelectContent>
                      {TEAM.map(m => <SelectItem key={m.id} value={m.name}>{m.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button size="sm" className="text-xs" onClick={() => { handleToggle(editTask.id); setEditTask(null); }}>
                  <CheckCircle2 className="size-3.5 mr-1" />
                  {editTask.status === "complete" ? "Reopen Task" : "Mark Complete"}
                </Button>
                <Button variant="ghost" size="sm" className="text-xs" onClick={() => setEditTask(null)}>Close</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Confirm Uncomplete ─────────────────────────────────────────────── */}
      <AlertDialog open={!!confirmUncheck} onOpenChange={open => !open && setConfirmUncheck(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-sm">Reopen this task?</AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground">
              This will move the task back to your open tasks list.
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
