// ============================================================================
// Ventures Page — Organized by Client Sub-Sections for 30+ Clients
// ============================================================================

import DashboardLayout from "@/components/DashboardLayout";
import StatusBadge from "@/components/StatusBadge";
import { cn } from "@/lib/utils";
import { getThemeColor } from "@/lib/data";
import { trpc } from "@/lib/trpc";
import { motion, AnimatePresence } from "framer-motion";
import {
  Layers3, MapPin, ListChecks, AlertTriangle, Plus, X,
  ChevronDown, ChevronRight, Search, Building2, ChevronsUpDown,
} from "lucide-react";
import { useState, useMemo, useCallback } from "react";
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

interface VentureWithOrgs {
  id: number;
  name: string;
  slug: string;
  sector: string;
  location: string;
  stage: string;
  status: string;
  currentStatus: string | null;
  description: string | null;
  priority: string;
  createdAt: string | Date;
  organizations: { orgId: number; orgName: string; orgSlug: string }[];
}

interface ClientGroup {
  orgId: number | null;
  orgName: string;
  orgSlug: string;
  ventures: VentureWithOrgs[];
  activeCount: number;
  totalTasks: number;
  overdueTasks: number;
}

export default function VerticalsPage() {
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();

  // ── Live data ──────────────────────────────────────────────────────
  const venturesQ = trpc.ventures.listWithOrgs.useQuery();
  const tasksQ = trpc.tasks.list.useQuery();
  const allVentures = (venturesQ.data || []) as VentureWithOrgs[];
  const allTasks = tasksQ.data || [];
  const loading = venturesQ.isLoading;

  // ── Mutations ──────────────────────────────────────────────────────
  const createVenture = trpc.ventures.create.useMutation({
    onSuccess: () => {
      utils.ventures.listWithOrgs.invalidate();
      utils.ventures.list.invalidate();
      utils.activity.recent.invalidate();
      toast.success("Venture created");
    },
  });

  // ── State ──────────────────────────────────────────────────────────
  const [search, setSearch] = useState("");
  const [themeFilter, setThemeFilter] = useState("All");
  const [stageFilter, setStageFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [clientFilter, setClientFilter] = useState("All");
  const [collapsedClients, setCollapsedClients] = useState<Set<string>>(new Set());
  const [addOpen, setAddOpen] = useState(false);

  // Add form state
  const [newName, setNewName] = useState("");
  const [newTheme, setNewTheme] = useState("Real Estate");
  const [newLocation, setNewLocation] = useState("");
  const [newStage, setNewStage] = useState("In Validation");
  const [newDescription, setNewDescription] = useState("");

  // ── Derived data ───────────────────────────────────────────────────
  const now = useMemo(() => new Date(), []);

  // Get unique client names for filter
  const clientNames = useMemo(() => {
    const names = new Set<string>();
    for (const v of allVentures) {
      for (const org of v.organizations) {
        names.add(org.orgName);
      }
    }
    if (allVentures.some(v => v.organizations.length === 0)) {
      names.add("Unassigned");
    }
    return Array.from(names).sort();
  }, [allVentures]);

  // Filter ventures
  const filtered = useMemo(() => {
    return allVentures.filter(v => {
      if (search) {
        const q = search.toLowerCase();
        const matchesName = v.name.toLowerCase().includes(q);
        const matchesLocation = v.location.toLowerCase().includes(q);
        const matchesSector = v.sector.toLowerCase().includes(q);
        const matchesOrg = v.organizations.some(o => o.orgName.toLowerCase().includes(q));
        if (!matchesName && !matchesLocation && !matchesSector && !matchesOrg) return false;
      }
      if (themeFilter !== "All" && v.sector !== themeFilter) return false;
      if (stageFilter !== "All" && v.stage !== stageFilter) return false;
      if (statusFilter !== "All" && v.status !== statusFilter) return false;
      if (clientFilter !== "All") {
        if (clientFilter === "Unassigned") {
          if (v.organizations.length > 0) return false;
        } else {
          if (!v.organizations.some(o => o.orgName === clientFilter)) return false;
        }
      }
      return true;
    });
  }, [allVentures, search, themeFilter, stageFilter, statusFilter, clientFilter]);

  // Group by client
  const clientGroups = useMemo(() => {
    const groups = new Map<string, ClientGroup>();

    for (const v of filtered) {
      if (v.organizations.length === 0) {
        // Unassigned ventures
        const key = "__unassigned__";
        if (!groups.has(key)) {
          groups.set(key, { orgId: null, orgName: "Unassigned", orgSlug: "", ventures: [], activeCount: 0, totalTasks: 0, overdueTasks: 0 });
        }
        const g = groups.get(key)!;
        g.ventures.push(v);
        if (v.status === "In progress") g.activeCount++;
      } else {
        for (const org of v.organizations) {
          const key = String(org.orgId);
          if (!groups.has(key)) {
            groups.set(key, { orgId: org.orgId, orgName: org.orgName, orgSlug: org.orgSlug, ventures: [], activeCount: 0, totalTasks: 0, overdueTasks: 0 });
          }
          const g = groups.get(key)!;
          g.ventures.push(v);
          if (v.status === "In progress") g.activeCount++;
        }
      }
    }

    // Add task counts
    for (const g of Array.from(groups.values())) {
      const ventureIds = new Set(g.ventures.map((v: VentureWithOrgs) => v.id));
      const groupTasks = allTasks.filter(t => t.ventureId && ventureIds.has(t.ventureId));
      g.totalTasks = groupTasks.filter(t => t.status !== "complete").length;
      g.overdueTasks = groupTasks.filter(t => t.status !== "complete" && t.dueDate && new Date(t.dueDate) < now).length;
    }

    // Sort: assigned clients first (alphabetical), unassigned last
    return Array.from(groups.values()).sort((a, b) => {
      if (a.orgId === null) return 1;
      if (b.orgId === null) return -1;
      return a.orgName.localeCompare(b.orgName);
    });
  }, [filtered, allTasks, now]);

  // Global metrics
  const totalVentures = filtered.length;
  const activeVentures = filtered.filter(v => v.status === "In progress").length;
  const openTasks = allTasks.filter(t => t.status !== "complete").length;
  const overdueTasks = allTasks.filter(t => t.status !== "complete" && t.dueDate && new Date(t.dueDate) < now).length;

  // ── Handlers ───────────────────────────────────────────────────────
  const toggleClient = useCallback((key: string) => {
    setCollapsedClients(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const toggleAll = useCallback(() => {
    if (collapsedClients.size > 0) {
      setCollapsedClients(new Set());
    } else {
      setCollapsedClients(new Set(clientGroups.map(g => String(g.orgId ?? "__unassigned__"))));
    }
  }, [collapsedClients.size, clientGroups]);

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

  function getStatusClasses(status: string) {
    const isActive = status === "In progress";
    const isCompleted = status === "Completed";
    const isOnHold = status === "On-Hold";
    return {
      bg: isActive ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : isCompleted ? "bg-blue-500/10 text-blue-400 border-blue-500/20" : isOnHold ? "bg-amber-500/10 text-amber-400 border-amber-500/20" : "bg-secondary text-muted-foreground border-border",
      dot: isActive ? "bg-emerald-400" : isCompleted ? "bg-blue-400" : isOnHold ? "bg-amber-400" : "bg-muted-foreground",
    };
  }

  const summaryMetrics = [
    { label: "Total", value: totalVentures, icon: <Layers3 className="size-4 text-blue-400" /> },
    { label: "Active", value: activeVentures, icon: <MapPin className="size-4 text-emerald-400" /> },
    { label: "Open Tasks", value: openTasks, icon: <ListChecks className="size-4 text-amber-400" /> },
    { label: "Overdue", value: overdueTasks, icon: <AlertTriangle className="size-4 text-red-400" /> },
  ];

  const hasActiveFilters = themeFilter !== "All" || stageFilter !== "All" || statusFilter !== "All" || clientFilter !== "All" || search.length > 0;

  return (
    <DashboardLayout title="Ventures" subtitle="PORTFOLIO OVERVIEW">
      <div className="p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-5 pb-24 md:pb-6">
        {/* Summary metrics */}
        <div className="grid grid-cols-4 gap-2 sm:gap-3">
          {loading ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 sm:h-20 rounded-lg" />) : summaryMetrics.map((m, i) => (
            <motion.div
              key={m.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05, duration: 0.3 }}
              className="bg-card border border-border rounded-lg p-2.5 sm:p-4"
            >
              <div className="flex items-center gap-1.5 sm:gap-2 mb-1">
                {m.icon}
                <span className="text-[9px] sm:text-[11px] uppercase tracking-[0.06em] text-muted-foreground font-medium truncate">{m.label}</span>
              </div>
              <span className="text-lg sm:text-2xl font-mono font-semibold text-foreground">{m.value}</span>
            </motion.div>
          ))}
        </div>

        {/* Search + Filters bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search ventures, clients, locations..."
              className="h-9 pl-9 text-xs"
            />
          </div>
          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-hide">
            <Select value={clientFilter} onValueChange={setClientFilter}>
              <SelectTrigger className="h-9 min-h-[36px] text-xs w-[130px] flex-shrink-0">
                <Building2 className="size-3 mr-1 text-muted-foreground" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Clients</SelectItem>
                {clientNames.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={themeFilter} onValueChange={setThemeFilter}>
              <SelectTrigger className="h-9 min-h-[36px] text-xs w-[120px] flex-shrink-0"><SelectValue /></SelectTrigger>
              <SelectContent>
                {ALL_THEMES.map(t => <SelectItem key={t} value={t}>{t === "All" ? "All Sectors" : t}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-9 min-h-[36px] text-xs w-[120px] flex-shrink-0"><SelectValue /></SelectTrigger>
              <SelectContent>
                {ALL_STATUSES.map(s => <SelectItem key={s} value={s}>{s === "All" ? "All Statuses" : s}</SelectItem>)}
              </SelectContent>
            </Select>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" className="text-xs h-9 flex-shrink-0" onClick={() => { setThemeFilter("All"); setStageFilter("All"); setStatusFilter("All"); setClientFilter("All"); setSearch(""); }}>
                <X className="size-3 mr-1" /> Clear
              </Button>
            )}
          </div>
        </div>

        {/* Toolbar: collapse/expand + add */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={toggleAll}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronsUpDown className="size-3.5" />
              {collapsedClients.size > 0 ? "Expand all" : "Collapse all"}
            </button>
            <span className="text-[10px] font-mono text-muted-foreground">
              {clientGroups.length} client{clientGroups.length !== 1 ? "s" : ""} · {totalVentures} venture{totalVentures !== 1 ? "s" : ""}
            </span>
          </div>
          <Button size="sm" className="text-xs h-9 min-h-[36px]" onClick={() => setAddOpen(true)}>
            <Plus className="size-3.5 mr-1" /> Add Venture
          </Button>
        </div>

        {/* Loading state */}
        {loading && (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-10 rounded-lg" />
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pl-4">
                  {Array.from({ length: 3 }).map((_, j) => <Skeleton key={j} className="h-28 rounded-lg" />)}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && filtered.length === 0 && (
          <div className="p-12 text-center bg-card border border-border rounded-lg">
            <Layers3 className="size-8 text-muted-foreground mx-auto mb-3 opacity-40" />
            <p className="text-sm text-muted-foreground">No ventures match the current filters.</p>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" className="text-xs mt-2" onClick={() => { setThemeFilter("All"); setStageFilter("All"); setStatusFilter("All"); setClientFilter("All"); setSearch(""); }}>
                Clear filters
              </Button>
            )}
          </div>
        )}

        {/* Client sub-sections */}
        {!loading && clientGroups.map((group, gi) => {
          const key = String(group.orgId ?? "__unassigned__");
          const isCollapsed = collapsedClients.has(key);

          return (
            <motion.div
              key={key}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: gi * 0.04, duration: 0.25 }}
              className="space-y-2"
            >
              {/* Client section header */}
              <button
                onClick={() => toggleClient(key)}
                className="w-full flex items-center gap-3 py-2 px-3 rounded-lg bg-card/50 border border-border/50 hover:border-border hover:bg-card transition-all group"
              >
                <div className="flex items-center justify-center size-6 rounded bg-foreground/5">
                  {isCollapsed
                    ? <ChevronRight className="size-3.5 text-muted-foreground" />
                    : <ChevronDown className="size-3.5 text-muted-foreground" />
                  }
                </div>

                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <Building2 className="size-3.5 text-muted-foreground flex-shrink-0" />
                  <span className="text-sm font-medium text-foreground truncate">{group.orgName}</span>
                  <span className="text-[10px] font-mono text-muted-foreground flex-shrink-0">
                    {group.ventures.length} venture{group.ventures.length !== 1 ? "s" : ""}
                  </span>
                </div>

                <div className="flex items-center gap-4 flex-shrink-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-muted-foreground">Active</span>
                    <span className="text-xs font-mono font-medium text-emerald-400">{group.activeCount}</span>
                  </div>
                  {group.totalTasks > 0 && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-muted-foreground">Tasks</span>
                      <span className="text-xs font-mono font-medium text-amber-400">{group.totalTasks}</span>
                    </div>
                  )}
                  {group.overdueTasks > 0 && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-muted-foreground">Overdue</span>
                      <span className="text-xs font-mono font-medium text-red-400">{group.overdueTasks}</span>
                    </div>
                  )}
                  {group.orgSlug && (
                    <span
                      role="link"
                      tabIndex={0}
                      onClick={(e) => { e.stopPropagation(); navigate(`/clients/${group.orgSlug}`); }}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); navigate(`/clients/${group.orgSlug}`); } }}
                      className="text-[10px] text-primary/70 hover:text-primary transition-colors font-medium cursor-pointer"
                    >
                      View client →
                    </span>
                  )}
                </div>
              </button>

              {/* Ventures grid — collapsible */}
              <AnimatePresence initial={false}>
                {!isCollapsed && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2, ease: "easeInOut" }}
                    className="overflow-hidden"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 pl-0 sm:pl-2 pt-1">
                      {group.ventures.map((venture, vi) => {
                        const tc = getThemeColor(venture.sector);
                        const sc = getStatusClasses(venture.status);
                        const ventureTasks = allTasks.filter(t => t.ventureId === venture.id);
                        const ventureOpenTasks = ventureTasks.filter(t => t.status !== "complete").length;

                        return (
                          <motion.div
                            key={venture.id}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: vi * 0.02, duration: 0.2 }}
                            onClick={() => navigate(`/ventures/${venture.slug}`)}
                            className="bg-card border border-border rounded-lg p-3.5 cursor-pointer hover:border-primary/20 active:scale-[0.98] transition-all"
                          >
                            <div className="flex items-start justify-between mb-2">
                              <div className="min-w-0 flex-1">
                                <h3 className="text-sm font-medium text-foreground truncate">{venture.name}</h3>
                                <div className="flex items-center gap-2 mt-1">
                                  <div className="size-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: tc.color }} />
                                  <span className="text-[10px] font-medium" style={{ color: tc.color }}>{venture.sector}</span>
                                  <span className="text-[10px] font-mono text-muted-foreground">· {venture.location}</span>
                                </div>
                              </div>
                              <StatusBadge label={venture.status} bg={sc.bg} dot={sc.dot} />
                            </div>

                            {venture.currentStatus && (
                              <p className="text-[11px] text-muted-foreground mb-2 line-clamp-1">{venture.currentStatus}</p>
                            )}

                            <div className="flex items-center gap-4 pt-2 border-t border-border/50">
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
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>

      {/* Add Venture Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-sm">Add Venture</DialogTitle>
            <DialogDescription className="text-[10px] font-mono">Add a new venture to the portfolio</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-xs mb-1">Name</Label>
              <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Venture name" className="h-9 text-xs" />
            </div>
            <div>
              <Label className="text-xs mb-1">Sector</Label>
              <Select value={newTheme} onValueChange={setNewTheme}>
                <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ALL_THEMES.filter(t => t !== "All").map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs mb-1">Location</Label>
              <Input value={newLocation} onChange={(e) => setNewLocation(e.target.value)} placeholder="Country / City" className="h-9 text-xs" />
            </div>
            <div>
              <Label className="text-xs mb-1">Stage</Label>
              <Select value={newStage} onValueChange={setNewStage}>
                <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
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
            <Button size="sm" className="text-xs h-9 w-full sm:w-auto" onClick={handleAddVenture} disabled={createVenture.isPending}>
              <Plus className="size-3.5 mr-1" /> {createVenture.isPending ? "Adding..." : "Add Venture"}
            </Button>
            <Button variant="ghost" size="sm" className="text-xs h-9 w-full sm:w-auto" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
