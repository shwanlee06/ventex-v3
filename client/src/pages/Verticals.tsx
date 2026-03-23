// ============================================================================
// Ventures Page — Swiss Instrument — LIVE DB — Mobile-First
// ============================================================================

import DashboardLayout from "@/components/DashboardLayout";
import StatusBadge from "@/components/StatusBadge";
import { cn } from "@/lib/utils";
import { getThemeColor, formatDate } from "@/lib/data";
import { trpc } from "@/lib/trpc";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { motion } from "framer-motion";
import { Layers3, MapPin, ListChecks, AlertTriangle, Plus, X, LayoutGrid, List } from "lucide-react";
import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";

const ALL_THEMES = ["All", "Real Estate", "F&B", "Yacht", "Entertainment", "Oil & Gas", "Others"];
const ALL_STAGES = ["All", "In Validation", "Active ventures", "In Fundraising", "On Hold"];
const ALL_STATUSES = ["All", "In progress", "On-Hold", "Completed"];

export default function VerticalsPage() {
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();

  // ── Live data ──────────────────────────────────────────────────────
  const venturesQ = trpc.ventures.list.useQuery();
  const tasksQ = trpc.tasks.list.useQuery();
  const allVentures = venturesQ.data || [];
  const allTasks = tasksQ.data || [];
  const loading = venturesQ.isLoading;

  // ── Mutations ──────────────────────────────────────────────────────
  const createVenture = trpc.ventures.create.useMutation({
    onSuccess: () => {
      utils.ventures.list.invalidate();
      utils.activity.recent.invalidate();
      toast.success("Venture created");
    },
  });

  // ── Filters ────────────────────────────────────────────────────────
  const [themeFilter, setThemeFilter] = useState("All");
  const [stageFilter, setStageFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [addOpen, setAddOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"card" | "table">("card");

  // Add form state
  const [newName, setNewName] = useState("");
  const [newTheme, setNewTheme] = useState("Real Estate");
  const [newLocation, setNewLocation] = useState("");
  const [newStage, setNewStage] = useState("In Validation");
  const [newDescription, setNewDescription] = useState("");

  const filtered = useMemo(() => {
    return allVentures.filter(v => {
      if (themeFilter !== "All" && v.sector !== themeFilter) return false;
      if (stageFilter !== "All" && v.stage !== stageFilter) return false;
      if (statusFilter !== "All" && v.status !== statusFilter) return false;
      return true;
    });
  }, [allVentures, themeFilter, stageFilter, statusFilter]);

  const now = new Date();
  const activeVentures = allVentures.filter(v => v.status === "In progress").length;
  const openTasks = allTasks.filter(t => t.status !== "complete").length;
  const overdueTasks = allTasks.filter(t => t.status !== "complete" && t.dueDate && new Date(t.dueDate) < now).length;

  const handleAddVenture = () => {
    if (!newName.trim()) { toast.error("Name is required"); return; }
    createVenture.mutate({
      name: newName.trim(),
      sector: newTheme,
      location: newLocation.trim() || "TBD",
      stage: newStage,
      status: "In progress",
      description: newDescription.trim() || undefined,
    });
    setAddOpen(false);
    setNewName(""); setNewLocation(""); setNewDescription("");
  };

  const summaryMetrics = [
    { label: "Total", value: filtered.length, icon: <Layers3 className="size-4 text-blue-400" /> },
    { label: "Active", value: activeVentures, icon: <MapPin className="size-4 text-emerald-400" /> },
    { label: "Open Tasks", value: openTasks, icon: <ListChecks className="size-4 text-amber-400" /> },
    { label: "Overdue", value: overdueTasks, icon: <AlertTriangle className="size-4 text-red-400" /> },
  ];

  function getStatusClasses(status: string) {
    const isActive = status === "In progress";
    const isCompleted = status === "Completed";
    const isOnHold = status === "On-Hold";
    return {
      bg: isActive ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : isCompleted ? "bg-blue-500/10 text-blue-400 border-blue-500/20" : isOnHold ? "bg-amber-500/10 text-amber-400 border-amber-500/20" : "bg-secondary text-muted-foreground border-border",
      dot: isActive ? "bg-emerald-400" : isCompleted ? "bg-blue-400" : isOnHold ? "bg-amber-400" : "bg-muted-foreground",
    };
  }

  return (
    <DashboardLayout title="Ventures" subtitle="PORTFOLIO OVERVIEW">
      <div className="p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6 pb-24 md:pb-6">
        {/* Summary metrics — compact on mobile */}
        <div className="grid grid-cols-4 gap-2 sm:gap-3">
          {loading ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 sm:h-24 rounded-lg" />) : summaryMetrics.map((m, i) => (
            <motion.div
              key={m.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05, duration: 0.3 }}
              className="bg-card border border-border rounded-lg p-2 sm:p-4"
            >
              <div className="flex items-center gap-1.5 sm:gap-2 mb-1 sm:mb-2">
                {m.icon}
                <span className="text-[9px] sm:text-[11px] uppercase tracking-[0.06em] text-muted-foreground font-medium truncate">{m.label}</span>
              </div>
              <span className="text-lg sm:text-2xl font-mono font-semibold text-foreground">{m.value}</span>
            </motion.div>
          ))}
        </div>

        {/* Filters — horizontal scroll on mobile */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 -mx-3 px-3 sm:mx-0 sm:px-0 scrollbar-hide">
          <Select value={themeFilter} onValueChange={setThemeFilter}>
            <SelectTrigger className="h-9 min-h-[36px] text-xs w-[120px] sm:w-[140px] flex-shrink-0"><SelectValue /></SelectTrigger>
            <SelectContent>
              {ALL_THEMES.map(t => <SelectItem key={t} value={t}>{t === "All" ? "All Sectors" : t}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={stageFilter} onValueChange={setStageFilter}>
            <SelectTrigger className="h-9 min-h-[36px] text-xs w-[120px] sm:w-[140px] flex-shrink-0"><SelectValue /></SelectTrigger>
            <SelectContent>
              {ALL_STAGES.map(s => <SelectItem key={s} value={s}>{s === "All" ? "All Stages" : s}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-9 min-h-[36px] text-xs w-[120px] sm:w-[140px] flex-shrink-0"><SelectValue /></SelectTrigger>
            <SelectContent>
              {ALL_STATUSES.map(s => <SelectItem key={s} value={s}>{s === "All" ? "All Statuses" : s}</SelectItem>)}
            </SelectContent>
          </Select>
          {(themeFilter !== "All" || stageFilter !== "All" || statusFilter !== "All") && (
            <Button variant="ghost" size="sm" className="text-xs h-9 min-h-[36px] flex-shrink-0 touch-manipulation" onClick={() => { setThemeFilter("All"); setStageFilter("All"); setStatusFilter("All"); }}>
              <X className="size-3 mr-1" /> Clear
            </Button>
          )}
        </div>

        {/* View toggle + Add button */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 bg-secondary/50 rounded-lg p-0.5">
            <button
              onClick={() => setViewMode("card")}
              className={cn("p-1.5 sm:p-2 rounded-md transition-colors touch-manipulation", viewMode === "card" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground")}
            >
              <LayoutGrid className="size-4" />
            </button>
            <button
              onClick={() => setViewMode("table")}
              className={cn("p-1.5 sm:p-2 rounded-md transition-colors touch-manipulation", viewMode === "table" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground")}
            >
              <List className="size-4" />
            </button>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-muted-foreground hidden sm:inline">{filtered.length} ventures</span>
            <Button size="sm" className="text-xs h-9 min-h-[36px] touch-manipulation" onClick={() => setAddOpen(true)}>
              <Plus className="size-3.5 mr-1" /> Add
            </Button>
          </div>
        </div>

        {/* Empty state */}
        {filtered.length === 0 && !loading && (
          <div className="p-12 text-center bg-card border border-border rounded-lg">
            <Layers3 className="size-8 text-muted-foreground mx-auto mb-3 opacity-40" />
            <p className="text-sm text-muted-foreground">No ventures match the current filters.</p>
            <Button variant="ghost" size="sm" className="text-xs mt-2 touch-manipulation" onClick={() => { setThemeFilter("All"); setStageFilter("All"); setStatusFilter("All"); }}>
              Clear filters
            </Button>
          </div>
        )}

        {/* Card View */}
        {viewMode === "card" && filtered.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filtered.map((venture, i) => {
              const tc = getThemeColor(venture.sector);
              const sc = getStatusClasses(venture.status);
              const ventureTasks = allTasks.filter(t => t.ventureId === venture.id);
              const ventureOpenTasks = ventureTasks.filter(t => t.status !== "complete").length;
              return (
                <motion.div
                  key={venture.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03, duration: 0.25 }}
                  onClick={() => navigate(`/ventures/${venture.slug}`)}
                  className="bg-card border border-border rounded-xl p-4 cursor-pointer hover:border-primary/20 active:scale-[0.98] transition-all touch-manipulation"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm font-medium text-foreground truncate">{venture.name}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="size-2 rounded-full flex-shrink-0" style={{ backgroundColor: tc.color }} />
                        <span className="text-[10px] font-medium" style={{ color: tc.color }}>{venture.sector}</span>
                        <span className="text-[10px] font-mono text-muted-foreground">· {venture.location}</span>
                      </div>
                    </div>
                    <StatusBadge label={venture.status} bg={sc.bg} dot={sc.dot} />
                  </div>

                  {venture.currentStatus && (
                    <p className="text-[11px] text-muted-foreground mb-3 line-clamp-2">{venture.currentStatus}</p>
                  )}

                  <div className="flex items-center gap-4 pt-3 border-t border-border">
                    <div className="flex flex-col">
                      <span className="text-[10px] text-muted-foreground">Stage</span>
                      <span className="text-xs font-medium text-foreground">{venture.stage}</span>
                    </div>
                    {ventureOpenTasks > 0 && (
                      <div className="flex flex-col">
                        <span className="text-[10px] text-muted-foreground">Tasks</span>
                        <span className="text-xs font-mono font-medium text-amber-400">{ventureOpenTasks} open</span>
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Table View — hidden on small mobile */}
        {viewMode === "table" && filtered.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.3 }}
            className="bg-card border border-border rounded-lg overflow-hidden"
          >
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="text-[11px] uppercase tracking-[0.06em] font-medium text-muted-foreground">Venture</TableHead>
                    <TableHead className="text-[11px] uppercase tracking-[0.06em] font-medium text-muted-foreground hidden sm:table-cell">Sector</TableHead>
                    <TableHead className="text-[11px] uppercase tracking-[0.06em] font-medium text-muted-foreground hidden md:table-cell">Location</TableHead>
                    <TableHead className="text-[11px] uppercase tracking-[0.06em] font-medium text-muted-foreground hidden lg:table-cell">Stage</TableHead>
                    <TableHead className="text-[11px] uppercase tracking-[0.06em] font-medium text-muted-foreground">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((venture) => {
                    const tc = getThemeColor(venture.sector);
                    const sc = getStatusClasses(venture.status);
                    return (
                      <TableRow
                        key={venture.id}
                        className="cursor-pointer hover:bg-accent/30 active:bg-accent/40 touch-manipulation"
                        onClick={() => navigate(`/ventures/${venture.slug}`)}
                      >
                        <TableCell>
                          <div>
                            <span className="text-xs text-foreground font-medium">{venture.name}</span>
                            {/* Show sector inline on mobile since column is hidden */}
                            <div className="flex items-center gap-1.5 mt-0.5 sm:hidden">
                              <div className="size-1.5 rounded-full" style={{ backgroundColor: tc.color }} />
                              <span className="text-[10px]" style={{ color: tc.color }}>{venture.sector}</span>
                              <span className="text-[10px] font-mono text-muted-foreground">· {venture.location}</span>
                            </div>
                            {venture.currentStatus && (
                              <p className="text-[10px] text-muted-foreground mt-0.5 truncate max-w-[200px] hidden md:block">{venture.currentStatus}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <div className="flex items-center gap-2">
                            <div className="size-2 rounded-full flex-shrink-0" style={{ backgroundColor: tc.color }} />
                            <span className="text-xs font-medium" style={{ color: tc.color }}>{venture.sector}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs font-mono text-muted-foreground hidden md:table-cell">{venture.location}</TableCell>
                        <TableCell className="text-xs text-muted-foreground hidden lg:table-cell">{venture.stage}</TableCell>
                        <TableCell>
                          <StatusBadge label={venture.status} bg={sc.bg} dot={sc.dot} />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </motion.div>
        )}
      </div>

      {/* Add Venture Dialog — full screen on mobile */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-sm">Add Venture</DialogTitle>
            <DialogDescription className="text-[10px] font-mono">Add a new venture to the portfolio</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-xs mb-1">Name</Label>
              <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Venture name" className="h-9 min-h-[36px] text-xs" />
            </div>
            <div>
              <Label className="text-xs mb-1">Sector</Label>
              <Select value={newTheme} onValueChange={setNewTheme}>
                <SelectTrigger className="h-9 min-h-[36px] text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ALL_THEMES.filter(t => t !== "All").map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs mb-1">Location</Label>
              <Input value={newLocation} onChange={(e) => setNewLocation(e.target.value)} placeholder="Country / City" className="h-9 min-h-[36px] text-xs" />
            </div>
            <div>
              <Label className="text-xs mb-1">Stage</Label>
              <Select value={newStage} onValueChange={setNewStage}>
                <SelectTrigger className="h-9 min-h-[36px] text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ALL_STAGES.filter(s => s !== "All").map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs mb-1">Description</Label>
              <Textarea value={newDescription} onChange={(e) => setNewDescription(e.target.value)} placeholder="Brief description..." className="text-xs min-h-[60px]" />
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button size="sm" className="text-xs h-9 min-h-[36px] w-full sm:w-auto touch-manipulation" onClick={handleAddVenture} disabled={createVenture.isPending}>
              <Plus className="size-3.5 mr-1" /> {createVenture.isPending ? "Adding..." : "Add Venture"}
            </Button>
            <Button variant="ghost" size="sm" className="text-xs h-9 min-h-[36px] w-full sm:w-auto touch-manipulation" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
