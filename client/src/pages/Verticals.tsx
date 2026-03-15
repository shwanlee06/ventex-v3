// ============================================================================
// Ventures Page — Swiss Instrument — LIVE DB DATA
// Filters, clickable row drawers, Add Venture dialog, task checkboxes
// ============================================================================

import DashboardLayout from "@/components/DashboardLayout";
import StatusBadge from "@/components/StatusBadge";
import { cn } from "@/lib/utils";
import {
  STATUS_CONFIG,
  getThemeColor,
  formatDate,
} from "@/lib/data";
import { trpc } from "@/lib/trpc";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { motion } from "framer-motion";
import { Layers3, MapPin, ListChecks, AlertTriangle, Plus, X } from "lucide-react";
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
          {loading ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-lg" />) : summaryMetrics.map((m, i) => (
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
                  const tc = getThemeColor(venture.sector);
                  const isActive = venture.status === "In progress";
                  const isCompleted = venture.status === "Completed";
                  const isOnHold = venture.status === "On-Hold";
                  return (
                    <TableRow
                      key={venture.id}
                      className="cursor-pointer hover:bg-accent/30"
                      onClick={() => navigate(`/ventures/${venture.slug}`)}
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
                          <span className="text-xs font-medium" style={{ color: tc.color }}>{venture.sector}</span>
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
      </div>

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
            <div>
              <Label className="text-xs mb-1">Description</Label>
              <Textarea value={newDescription} onChange={(e) => setNewDescription(e.target.value)} placeholder="Brief description..." className="text-xs min-h-[60px]" />
            </div>
          </div>
          <DialogFooter>
            <Button size="sm" className="text-xs" onClick={handleAddVenture} disabled={createVenture.isPending}>
              <Plus className="size-3.5 mr-1" /> {createVenture.isPending ? "Adding..." : "Add Venture"}
            </Button>
            <Button variant="ghost" size="sm" className="text-xs" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
