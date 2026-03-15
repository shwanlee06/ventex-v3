// ============================================================================
// Ventures Page — Swiss Instrument — FULLY INTERACTIVE
// Filters, clickable row drawers, Add Venture dialog, task checkboxes
// ============================================================================

import DashboardLayout from "@/components/DashboardLayout";
import StatusBadge from "@/components/StatusBadge";
import { cn } from "@/lib/utils";
import {
  VENTURES,
  TASKS,
  TEAM,
  STATUS_CONFIG,
  getThemeColor,
  getTaskStatusFromDate,
  formatDate,
  type Venture,
  type Task,
} from "@/lib/data";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { motion } from "framer-motion";
import { Layers3, MapPin, ListChecks, AlertTriangle, Plus, X, ArrowUpRight, CheckCircle2 } from "lucide-react";
import { useState, useCallback, useMemo } from "react";
import { toast } from "sonner";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";

const ALL_THEMES = ["All", "Real Estate", "F&B", "Yacht", "Entertainment", "Oil & Gas", "Others"];
const ALL_STAGES = ["All", "In Validation", "Active ventures", "In Fundraising", "On Hold"];
const ALL_STATUSES = ["All", "In progress", "On-Hold", "Completed"];

export default function VerticalsPage() {
  const [ventures, setVentures] = useState<Venture[]>([...VENTURES]);
  const [tasks, setTasks] = useState<Task[]>([...TASKS]);
  const [themeFilter, setThemeFilter] = useState("All");
  const [stageFilter, setStageFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [drawerVenture, setDrawerVenture] = useState<Venture | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [taskModal, setTaskModal] = useState<Task | null>(null);

  // Add form state
  const [newName, setNewName] = useState("");
  const [newTheme, setNewTheme] = useState("Real Estate");
  const [newLocation, setNewLocation] = useState("");
  const [newStage, setNewStage] = useState("In Validation");

  const filtered = useMemo(() => {
    return ventures.filter(v => {
      if (v.name === "Unknown Venture") return false;
      if (themeFilter !== "All" && v.theme !== themeFilter) return false;
      if (stageFilter !== "All" && v.stage !== stageFilter) return false;
      if (statusFilter !== "All" && v.status !== statusFilter) return false;
      return true;
    });
  }, [ventures, themeFilter, stageFilter, statusFilter]);

  const activeVentures = ventures.filter(v => v.status === "In progress").length;
  const openTasks = tasks.filter(t => t.status === "open").length;
  const overdueTasks = tasks.filter(t => getTaskStatusFromDate(t) === "overdue").length;

  const handleAddVenture = useCallback(() => {
    if (!newName.trim()) { toast.error("Name is required"); return; }
    const nv: Venture = {
      id: `rec_new_${Date.now()}`,
      name: newName.trim(),
      theme: newTheme as Venture["theme"],
      stage: newStage as Venture["stage"],
      status: "In progress",
      location: newLocation.trim() || "TBD",
    };
    setVentures(prev => [nv, ...prev]);
    setAddOpen(false);
    setNewName(""); setNewLocation("");
    toast.success(`Venture "${nv.name}" added`);
  }, [newName, newTheme, newStage, newLocation]);

  const handleTaskToggle = useCallback((taskId: string) => {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: "complete" as const } : t));
    toast.success("Task marked complete");
  }, []);

  const ventureRelatedTasks = drawerVenture
    ? tasks.filter(t => t.ventureLink && drawerVenture.name.includes(t.ventureLink.split(" - ")[0]))
    : [];

  const summaryMetrics = [
    { label: "Total Ventures", value: filtered.length, icon: <Layers3 className="size-4 text-blue-400" /> },
    { label: "Active Ventures", value: activeVentures, icon: <MapPin className="size-4 text-emerald-400" /> },
    { label: "Open Tasks", value: openTasks, icon: <ListChecks className="size-4 text-amber-400" /> },
    { label: "Overdue Tasks", value: overdueTasks, icon: <AlertTriangle className="size-4 text-red-400" /> },
  ];

  return (
    <DashboardLayout title="Ventures" subtitle="PORTFOLIO OVERVIEW">
      <div className="p-4 md:p-6 space-y-6">
        {/* Summary metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {summaryMetrics.map((m, i) => (
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
              <span className="text-2xl font-mono font-semibold text-foreground">{m.value}</span>
            </motion.div>
          ))}
        </div>

        {/* Filters + Add button */}
        <div className="flex flex-wrap items-center gap-3">
          <Select value={themeFilter} onValueChange={setThemeFilter}>
            <SelectTrigger className="h-8 text-xs w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {ALL_THEMES.map(t => <SelectItem key={t} value={t}>{t === "All" ? "All Sectors" : t}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={stageFilter} onValueChange={setStageFilter}>
            <SelectTrigger className="h-8 text-xs w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {ALL_STAGES.map(s => <SelectItem key={s} value={s}>{s === "All" ? "All Stages" : s}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-8 text-xs w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {ALL_STATUSES.map(s => <SelectItem key={s} value={s}>{s === "All" ? "All Statuses" : s}</SelectItem>)}
            </SelectContent>
          </Select>
          {(themeFilter !== "All" || stageFilter !== "All" || statusFilter !== "All") && (
            <Button variant="ghost" size="sm" className="text-xs h-8" onClick={() => { setThemeFilter("All"); setStageFilter("All"); setStatusFilter("All"); }}>
              <X className="size-3 mr-1" /> Clear
            </Button>
          )}
          <div className="ml-auto">
            <Button size="sm" className="text-xs h-8" onClick={() => setAddOpen(true)}>
              <Plus className="size-3.5 mr-1" /> Add Venture
            </Button>
          </div>
        </div>

        {/* Ventures Table — clickable rows */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.3 }}
          className="bg-card border border-border rounded-lg overflow-hidden"
        >
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">All Ventures</h2>
            <span className="text-[10px] font-mono text-muted-foreground">{filtered.length} ventures</span>
          </div>

          {filtered.length === 0 ? (
            <div className="p-12 text-center">
              <Layers3 className="size-8 text-muted-foreground mx-auto mb-3 opacity-40" />
              <p className="text-sm text-muted-foreground">No ventures match the current filters.</p>
              <Button variant="ghost" size="sm" className="text-xs mt-2" onClick={() => { setThemeFilter("All"); setStageFilter("All"); setStatusFilter("All"); }}>
                Clear filters
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-[11px] uppercase tracking-[0.06em] font-medium text-muted-foreground">Venture</TableHead>
                  <TableHead className="text-[11px] uppercase tracking-[0.06em] font-medium text-muted-foreground">Sector</TableHead>
                  <TableHead className="text-[11px] uppercase tracking-[0.06em] font-medium text-muted-foreground">Location</TableHead>
                  <TableHead className="text-[11px] uppercase tracking-[0.06em] font-medium text-muted-foreground">Stage</TableHead>
                  <TableHead className="text-[11px] uppercase tracking-[0.06em] font-medium text-muted-foreground">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((venture) => {
                  const tc = getThemeColor(venture.theme);
                  const isActive = venture.status === "In progress";
                  const isCompleted = venture.status === "Completed";
                  const isOnHold = venture.status === "On-Hold";
                  return (
                    <TableRow
                      key={venture.id}
                      className="cursor-pointer hover:bg-accent/30"
                      onClick={() => setDrawerVenture(venture)}
                    >
                      <TableCell>
                        <div>
                          <span className="text-xs text-foreground font-medium">{venture.name}</span>
                          {venture.currentStatus && (
                            <p className="text-[10px] text-muted-foreground mt-0.5 truncate max-w-[200px]">{venture.currentStatus}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="size-2 rounded-full flex-shrink-0" style={{ backgroundColor: tc.color }} />
                          <span className="text-xs font-medium" style={{ color: tc.color }}>{venture.theme}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs font-mono text-muted-foreground">{venture.location}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{venture.stage}</TableCell>
                      <TableCell>
                        <StatusBadge
                          label={venture.status}
                          bg={isActive ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : isCompleted ? "bg-blue-500/10 text-blue-400 border-blue-500/20" : isOnHold ? "bg-amber-500/10 text-amber-400 border-amber-500/20" : "bg-secondary text-muted-foreground border-border"}
                          dot={isActive ? "bg-emerald-400" : isCompleted ? "bg-blue-400" : isOnHold ? "bg-amber-400" : "bg-muted-foreground"}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </motion.div>

        {/* All Tasks — with checkboxes */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.3 }}
          className="bg-card border border-border rounded-lg overflow-hidden"
        >
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">All Tasks</h2>
            <span className="text-[10px] font-mono text-muted-foreground">{tasks.length} tasks</span>
          </div>

          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-8"></TableHead>
                <TableHead className="text-[11px] uppercase tracking-[0.06em] font-medium text-muted-foreground">Task</TableHead>
                <TableHead className="text-[11px] uppercase tracking-[0.06em] font-medium text-muted-foreground">Due Date</TableHead>
                <TableHead className="text-[11px] uppercase tracking-[0.06em] font-medium text-muted-foreground">Priority</TableHead>
                <TableHead className="text-[11px] uppercase tracking-[0.06em] font-medium text-muted-foreground">Assignees</TableHead>
                <TableHead className="text-[11px] uppercase tracking-[0.06em] font-medium text-muted-foreground">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tasks.map((task) => {
                const resolvedStatus = getTaskStatusFromDate(task);
                const sc = STATUS_CONFIG[resolvedStatus];
                return (
                  <TableRow key={task.id} className={cn(task.status === "complete" && "opacity-50")}>
                    <TableCell>
                      <Checkbox
                        checked={task.status === "complete"}
                        onCheckedChange={() => handleTaskToggle(task.id)}
                        className="size-3.5"
                      />
                    </TableCell>
                    <TableCell>
                      <button onClick={() => setTaskModal(task)} className="text-left">
                        <span className={cn("text-xs text-foreground font-medium hover:text-primary transition-colors", task.status === "complete" && "line-through")}>{task.title}</span>
                        {task.ventureLink && (
                          <p className="text-[10px] text-muted-foreground mt-0.5">{task.ventureLink}</p>
                        )}
                      </button>
                    </TableCell>
                    <TableCell className="text-xs font-mono text-muted-foreground">{formatDate(task.dueDate)}</TableCell>
                    <TableCell>
                      <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded", task.priority === "High" ? "bg-red-500/10 text-red-400" : task.priority === "Medium" ? "bg-amber-500/10 text-amber-400" : "bg-secondary text-muted-foreground")}>
                        {task.priority}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {task.assignees.length > 0 ? task.assignees.join(", ") : "—"}
                    </TableCell>
                    <TableCell>
                      <StatusBadge label={sc.label} bg={sc.bg} dot={sc.dot} />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </motion.div>
      </div>

      {/* Venture Detail Drawer */}
      <Sheet open={!!drawerVenture} onOpenChange={(open) => !open && setDrawerVenture(null)}>
        <SheetContent side="right" className="w-[420px] sm:max-w-[420px] bg-card border-border p-0">
          {drawerVenture && (
            <>
              <SheetHeader className="px-4 pt-4 pb-3 border-b border-border">
                <div className="flex items-center gap-2">
                  <div className="size-2 rounded-full" style={{ backgroundColor: getThemeColor(drawerVenture.theme).color }} />
                  <SheetTitle className="text-sm font-semibold">{drawerVenture.name}</SheetTitle>
                </div>
                <SheetDescription className="text-[10px] font-mono text-muted-foreground">
                  {drawerVenture.theme} · {drawerVenture.location} · {drawerVenture.stage}
                </SheetDescription>
              </SheetHeader>
              <ScrollArea className="h-[calc(100vh-140px)]">
                <div className="p-4 space-y-4">
                  {/* Status */}
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium block mb-1">Status</span>
                    <span className={cn(
                      "text-xs font-medium px-2 py-1 rounded",
                      drawerVenture.status === "In progress" ? "bg-emerald-500/10 text-emerald-400" :
                      drawerVenture.status === "On-Hold" ? "bg-amber-500/10 text-amber-400" :
                      drawerVenture.status === "Completed" ? "bg-blue-500/10 text-blue-400" :
                      "bg-secondary text-muted-foreground"
                    )}>
                      {drawerVenture.status}
                    </span>
                  </div>

                  {drawerVenture.currentStatus && (
                    <div>
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium block mb-1">Current Status</span>
                      <p className="text-xs text-foreground bg-secondary/30 rounded-md p-2">{drawerVenture.currentStatus}</p>
                    </div>
                  )}

                  {drawerVenture.nextStep && (
                    <div>
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium block mb-1">Next Step</span>
                      <p className="text-xs text-foreground bg-secondary/30 rounded-md p-2">{drawerVenture.nextStep}</p>
                    </div>
                  )}

                  {drawerVenture.nextMilestone && (
                    <div>
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium block mb-1">Next Milestone</span>
                      <p className="text-xs font-mono text-foreground">{formatDate(drawerVenture.nextMilestone)}</p>
                    </div>
                  )}

                  {drawerVenture.priority && (
                    <div>
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium block mb-1">Priority</span>
                      <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded", drawerVenture.priority === "High" ? "bg-red-500/10 text-red-400" : drawerVenture.priority === "Medium" ? "bg-amber-500/10 text-amber-400" : "bg-secondary text-muted-foreground")}>
                        {drawerVenture.priority}
                      </span>
                    </div>
                  )}

                  {/* Related Tasks */}
                  {ventureRelatedTasks.length > 0 && (
                    <div>
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium block mb-2">Related Tasks</span>
                      <div className="space-y-2">
                        {ventureRelatedTasks.map(t => {
                          const rs = getTaskStatusFromDate(t);
                          const sc = STATUS_CONFIG[rs];
                          return (
                            <div key={t.id} className="flex items-center justify-between bg-secondary/20 rounded-md p-2">
                              <div className="flex items-center gap-2">
                                <Checkbox
                                  checked={t.status === "complete"}
                                  onCheckedChange={() => handleTaskToggle(t.id)}
                                  className="size-3"
                                />
                                <span className={cn("text-xs", t.status === "complete" ? "line-through text-muted-foreground" : "text-foreground")}>{t.title}</span>
                              </div>
                              <StatusBadge label={sc.label} bg={sc.bg} dot={sc.dot} />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Add Venture Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm">Add Venture</DialogTitle>
            <DialogDescription className="text-[10px] font-mono">Add a new venture to the portfolio</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-xs mb-1">Name</Label>
              <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Venture name" className="h-8 text-xs" />
            </div>
            <div>
              <Label className="text-xs mb-1">Sector</Label>
              <Select value={newTheme} onValueChange={setNewTheme}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ALL_THEMES.filter(t => t !== "All").map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs mb-1">Location</Label>
              <Input value={newLocation} onChange={(e) => setNewLocation(e.target.value)} placeholder="Country / City" className="h-8 text-xs" />
            </div>
            <div>
              <Label className="text-xs mb-1">Stage</Label>
              <Select value={newStage} onValueChange={setNewStage}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ALL_STAGES.filter(s => s !== "All").map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button size="sm" className="text-xs" onClick={handleAddVenture}>
              <Plus className="size-3.5 mr-1" /> Add Venture
            </Button>
            <Button variant="ghost" size="sm" className="text-xs" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Task Detail Modal */}
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
                  {(() => { const rs = getTaskStatusFromDate(taskModal); const sc = STATUS_CONFIG[rs]; return <StatusBadge label={sc.label} bg={sc.bg} dot={sc.dot} />; })()}
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
                  <Select onValueChange={(val) => {
                    setTasks(prev => prev.map(t => t.id === taskModal.id ? { ...t, assignees: [val] } : t));
                    toast.success(`Task reassigned to ${val}`);
                    setTaskModal(null);
                  }}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select team member" /></SelectTrigger>
                    <SelectContent>
                      {TEAM.map(m => <SelectItem key={m.id} value={m.name}>{m.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button size="sm" className="text-xs" onClick={() => { handleTaskToggle(taskModal.id); setTaskModal(null); }}>
                  <CheckCircle2 className="size-3.5 mr-1" /> Mark Complete
                </Button>
                <Button variant="ghost" size="sm" className="text-xs" onClick={() => setTaskModal(null)}>Close</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
