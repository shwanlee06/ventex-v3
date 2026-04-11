// SPVs & Deals Page — LIVE DB — Mobile-First

import DashboardLayout from "@/components/DashboardLayout";
import StatusBadge from "@/components/StatusBadge";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { isVentexTeam } from "@/lib/ventex";
import { usePreviewMode } from "@/contexts/PreviewMode";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { motion, AnimatePresence } from "framer-motion";
import {
  Briefcase, DollarSign, TrendingUp, TrendingDown, Plus, X, ArrowUpDown, LayoutGrid, List,
} from "lucide-react";
import { useState, useCallback, useMemo } from "react";
import { toast } from "sonner";
import { Link } from "wouter";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";

const ALL_STAGES = ["All", "Active deal", "In negotiation", "Closed deal", "Dropped deal"];
const ALL_SECTORS = ["All", "Oil & Gas", "Yacht", "Others", "Entertainment", "TBD", "Real Estate", "F&B"];
const PRIORITY_CYCLE: Record<string, string> = { Low: "Medium", Medium: "High", High: "Low" };

const SPV_STAGE_CONFIG: Record<string, { label: string; bg: string; dot: string }> = {
  "Active deal": { label: "Active", bg: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20", dot: "bg-emerald-400" },
  "In negotiation": { label: "Negotiating", bg: "bg-blue-500/10 text-blue-400 border-blue-500/20", dot: "bg-blue-400" },
  "Closed deal": { label: "Closed", bg: "bg-primary/10 text-primary border-primary/20", dot: "bg-primary" },
  "Dropped deal": { label: "Dropped", bg: "bg-red-500/10 text-red-400 border-red-500/20", dot: "bg-red-400" },
};

const DIST_STATUS_CONFIG: Record<string, { label: string; bg: string; dot: string }> = {
  "Paid": { label: "Paid", bg: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20", dot: "bg-emerald-400" },
  "Scheduled": { label: "Scheduled", bg: "bg-blue-500/10 text-blue-400 border-blue-500/20", dot: "bg-blue-400" },
  "Cancelled": { label: "Cancelled", bg: "bg-red-500/10 text-red-400 border-red-500/20", dot: "bg-red-400" },
  "Pending": { label: "Pending", bg: "bg-amber-500/10 text-amber-400 border-amber-500/20", dot: "bg-amber-400" },
};

const THEME_COLORS: Record<string, string> = {
  "Real Estate": "#3b82f6", "Yacht": "#06b6d4", "F&B": "#f59e0b",
  "Entertainment": "#a855f7", "Oil & Gas": "#ef4444", "Others": "#6b7280", "TBD": "#6b7280",
};

function formatCurrency(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toLocaleString()}`;
}

function formatDate(d: string | null | undefined): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export default function SettingsPage() {
  const { user } = useAuth();
  const { isPreviewMode } = usePreviewMode();
  const isVentex = isVentexTeam(user) && !isPreviewMode;
  const utils = trpc.useUtils();

  const spvsQ = trpc.spvs.list.useQuery();
  const distQ = trpc.distributions.list.useQuery();
  const distMetricsQ = trpc.distributions.metrics.useQuery();

  const spvsList = spvsQ.data || [];
  const distList = distQ.data || [];
  const distMetrics = distMetricsQ.data || { total: 0, paid: 0, totalAmount: 0, paidAmount: 0 };

  const createSpv = trpc.spvs.create.useMutation({
    onSuccess: () => { utils.spvs.list.invalidate(); utils.spvs.metrics.invalidate(); utils.activity.recent.invalidate(); },
  });
  const updateSpv = trpc.spvs.update.useMutation({
    onSuccess: () => { utils.spvs.list.invalidate(); utils.spvs.metrics.invalidate(); utils.activity.recent.invalidate(); },
  });

  const [stageFilter, setStageFilter] = useState("All");
  const [sectorFilter, setSectorFilter] = useState("All");
  const [spvModalId, setSpvModalId] = useState<number | null>(null);
  const [distModalId, setDistModalId] = useState<number | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"card" | "table">("card");
  const [activeMetric, setActiveMetric] = useState<string | null>(null);

  const [newName, setNewName] = useState("");
  const [newSector, setNewSector] = useState("Oil & Gas");
  const [newPriority, setNewPriority] = useState("Medium");
  const [newStage, setNewStage] = useState("In negotiation");
  const [newNotes, setNewNotes] = useState("");

  const filtered = useMemo(() => {
    return spvsList.filter(s => {
      if (stageFilter !== "All" && s.stage !== stageFilter) return false;
      if (sectorFilter !== "All" && s.sector !== sectorFilter) return false;
      return true;
    });
  }, [spvsList, stageFilter, sectorFilter]);

  const activeSPVs = spvsList.filter(s => s.stage === "Active deal").length;
  const spvModal = spvModalId ? spvsList.find(s => s.id === spvModalId) : null;
  const distModal = distModalId ? distList.find(d => d.id === distModalId) : null;

  const cyclePriority = useCallback((id: number) => {
    const spv = spvsList.find(s => s.id === id);
    if (!spv) return;
    const next = PRIORITY_CYCLE[spv.priority || "Medium"] || "Medium";
    updateSpv.mutate({ id, priority: next });
    toast.info(`Priority → ${next}`);
  }, [spvsList, updateSpv]);

  const updateStage = useCallback((id: number, stage: string) => {
    updateSpv.mutate({ id, stage });
    toast.success(`Stage → ${stage}`);
    setSpvModalId(null);
  }, [updateSpv]);

  const handleAddDeal = useCallback(() => {
    if (!newName.trim()) { toast.error("Name is required"); return; }
    createSpv.mutate({ name: newName.trim(), sector: newSector, priority: newPriority, stage: newStage, currentStatus: newNotes.trim() || undefined });
    setAddOpen(false);
    setNewName(""); setNewNotes("");
    toast.success(`Deal "${newName.trim()}" added`);
  }, [newName, newSector, newPriority, newStage, newNotes, createSpv]);

  const summaryMetrics = [
    { key: "total", label: "SPVs", value: filtered.length, icon: <Briefcase className="size-4 text-blue-400" />, activeColor: "border-blue-500/50" },
    { key: "active", label: "Active", value: activeSPVs, icon: <TrendingUp className="size-4 text-emerald-400" />, activeColor: "border-emerald-500/50" },
    { key: "distributed", label: "Distributed", value: formatCurrency(distMetrics.totalAmount), icon: <DollarSign className="size-4 text-primary" />, activeColor: "border-primary/50" },
    { key: "paid", label: "Paid", value: formatCurrency(distMetrics.paidAmount), icon: <TrendingDown className="size-4 text-amber-400" />, activeColor: "border-amber-500/50" },
  ];

  const displaySpvs = useMemo(() => {
    if (!activeMetric) return filtered;
    switch (activeMetric) {
      case "active": return filtered.filter(s => s.stage === "Active deal");
      case "total": default: return filtered;
    }
  }, [activeMetric, filtered]);

  return (
    <DashboardLayout title="SPVs & Deals" subtitle="DEAL PIPELINE & DISTRIBUTIONS">
      <div className="p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6 pb-24 md:pb-6">
        {/* Summary metrics — clickable filter cards */}
        <div className="grid grid-cols-4 gap-2 sm:gap-3">
          {spvsQ.isLoading ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 sm:h-24 rounded-lg" />) : summaryMetrics.map((m, i) => {
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
                <span className="text-base sm:text-2xl font-mono font-semibold text-foreground block">{m.value}</span>
              </motion.div>
            );
          })}
        </div>
        <AnimatePresence>
          {activeMetric && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
              <div className="flex items-center gap-2 px-3 py-2 bg-primary/5 border border-primary/10 rounded-lg">
                <span className="text-xs text-primary font-medium">Showing: {summaryMetrics.find(m => m.key === activeMetric)?.label}</span>
                <button onClick={() => setActiveMetric(null)} className="ml-auto text-xs text-muted-foreground hover:text-foreground"><X className="size-3.5" /></button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Filters — horizontal scroll on mobile */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 -mx-3 px-3 sm:mx-0 sm:px-0 scrollbar-hide">
          <Select value={stageFilter} onValueChange={setStageFilter}>
            <SelectTrigger className="h-9 min-h-[36px] text-xs w-[120px] sm:w-[140px] flex-shrink-0"><SelectValue /></SelectTrigger>
            <SelectContent>
              {ALL_STAGES.map(s => <SelectItem key={s} value={s}>{s === "All" ? "All Stages" : s}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={sectorFilter} onValueChange={setSectorFilter}>
            <SelectTrigger className="h-9 min-h-[36px] text-xs w-[120px] sm:w-[140px] flex-shrink-0"><SelectValue /></SelectTrigger>
            <SelectContent>
              {ALL_SECTORS.map(t => <SelectItem key={t} value={t}>{t === "All" ? "All Sectors" : t}</SelectItem>)}
            </SelectContent>
          </Select>
          {(stageFilter !== "All" || sectorFilter !== "All") && (
            <Button variant="ghost" size="sm" className="text-xs h-9 min-h-[36px] flex-shrink-0 touch-manipulation" onClick={() => { setStageFilter("All"); setSectorFilter("All"); }}>
              <X className="size-3 mr-1" /> Clear
            </Button>
          )}
        </div>

        {/* View toggle + Add */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 bg-secondary/50 rounded-lg p-0.5">
            <button onClick={() => setViewMode("card")} className={cn("p-1.5 sm:p-2 rounded-md transition-colors touch-manipulation", viewMode === "card" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground")}>
              <LayoutGrid className="size-4" />
            </button>
            <button onClick={() => setViewMode("table")} className={cn("p-1.5 sm:p-2 rounded-md transition-colors touch-manipulation", viewMode === "table" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground")}>
              <List className="size-4" />
            </button>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-muted-foreground hidden sm:inline">{displaySpvs.length} deals</span>
            <Button size="sm" className="text-xs h-9 min-h-[36px] touch-manipulation" onClick={() => setAddOpen(true)}>
              <Plus className="size-3.5 mr-1" /> New Deal
            </Button>
          </div>
        </div>

        {/* Empty state */}
        {displaySpvs.length === 0 && !spvsQ.isLoading && (
          <div className="p-12 text-center bg-card border border-border rounded-lg">
            <Briefcase className="size-8 text-muted-foreground mx-auto mb-3 opacity-40" />
            {spvsList.length === 0 && !isVentex ? (
              <>
                <p className="text-sm text-muted-foreground">No SPVs have been set up for your portfolio yet.</p>
                <p className="text-[11px] text-muted-foreground/60 mt-1">Your VENTEX team will create SPVs as deals progress.</p>
              </>
            ) : spvsList.length === 0 && isVentex ? (
              <>
                <p className="text-sm text-muted-foreground">No SPVs yet.</p>
                <Button variant="ghost" size="sm" className="text-xs mt-2 touch-manipulation gap-1" onClick={() => setAddOpen(true)}>
                  <Plus className="size-3" /> Add first SPV
                </Button>
              </>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">No deals match the current filters.</p>
                <Button variant="ghost" size="sm" className="text-xs mt-2 touch-manipulation" onClick={() => { setStageFilter("All"); setSectorFilter("All"); }}>Clear filters</Button>
              </>
            )}
          </div>
        )}

        {/* Card View */}
        {viewMode === "card" && displaySpvs.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {displaySpvs.map((spv, i) => {
              const color = THEME_COLORS[spv.sector || "Others"] || "#6b7280";
              const sc = SPV_STAGE_CONFIG[spv.stage || "Active deal"];
              return (
                <motion.div
                  key={spv.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03, duration: 0.25 }}
                  onClick={() => setSpvModalId(spv.id)}
                  className="bg-card border border-border rounded-xl p-4 cursor-pointer hover:border-primary/20 active:scale-[0.98] transition-all touch-manipulation"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm font-medium text-foreground truncate">{spv.name}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="size-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                        <span className="text-[10px] font-medium" style={{ color }}>{spv.sector && spv.sector !== "TBD" ? spv.sector : "Unclassified"}</span>
                      </div>
                    </div>
                    {sc && <StatusBadge label={sc.label} bg={sc.bg} dot={sc.dot} />}
                  </div>

                  {spv.currentStatus && (
                    <p className="text-[11px] text-muted-foreground mb-3 line-clamp-2">{spv.currentStatus}</p>
                  )}

                  <div className="flex items-center gap-4 pt-3 border-t border-border">
                    <button
                      onClick={(e) => { e.stopPropagation(); cyclePriority(spv.id); }}
                      className={cn("text-[10px] font-medium px-2 py-1 rounded cursor-pointer hover:opacity-80 transition-opacity touch-manipulation",
                        spv.priority === "High" ? "bg-red-500/10 text-red-400" :
                        spv.priority === "Medium" ? "bg-amber-500/10 text-amber-400" :
                        "bg-secondary text-muted-foreground"
                      )}
                    >
                      {spv.priority}
                    </button>
                    {spv.nextStep && (
                      <span className="text-[10px] text-muted-foreground truncate flex-1">Next: {spv.nextStep}</span>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Table View */}
        {viewMode === "table" && displaySpvs.length > 0 && (
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
                    <TableHead className="text-[11px] uppercase tracking-[0.06em] font-medium text-muted-foreground">Deal</TableHead>
                    <TableHead className="text-[11px] uppercase tracking-[0.06em] font-medium text-muted-foreground hidden sm:table-cell">Sector</TableHead>
                    <TableHead className="text-[11px] uppercase tracking-[0.06em] font-medium text-muted-foreground">
                      <div className="flex items-center gap-1">Priority <ArrowUpDown className="size-3" /></div>
                    </TableHead>
                    <TableHead className="text-[11px] uppercase tracking-[0.06em] font-medium text-muted-foreground">Stage</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displaySpvs.map((spv) => {
                    const color = THEME_COLORS[spv.sector || "Others"] || "#6b7280";
                    const sc = SPV_STAGE_CONFIG[spv.stage || "Active deal"];
                    return (
                      <TableRow key={spv.id} className="cursor-pointer hover:bg-accent/30 active:bg-accent/40 touch-manipulation">
                        <TableCell onClick={() => setSpvModalId(spv.id)}>
                          <div>
                            <span className="text-xs text-foreground font-medium">{spv.name}</span>
                            <div className="flex items-center gap-1.5 mt-0.5 sm:hidden">
                              <div className="size-1.5 rounded-full" style={{ backgroundColor: color }} />
                              <span className="text-[10px]" style={{ color }}>{spv.sector && spv.sector !== "TBD" ? spv.sector : "Unclassified"}</span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell onClick={() => setSpvModalId(spv.id)} className="hidden sm:table-cell">
                          <div className="flex items-center gap-2">
                            <div className="size-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                            <span className="text-xs" style={{ color }}>{spv.sector && spv.sector !== "TBD" ? spv.sector : "Unclassified"}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <button
                            onClick={(e) => { e.stopPropagation(); cyclePriority(spv.id); }}
                            className={cn("text-[10px] font-medium px-2 py-1 rounded cursor-pointer hover:opacity-80 transition-opacity touch-manipulation",
                              spv.priority === "High" ? "bg-red-500/10 text-red-400" :
                              spv.priority === "Medium" ? "bg-amber-500/10 text-amber-400" :
                              "bg-secondary text-muted-foreground"
                            )}
                          >
                            {spv.priority}
                          </button>
                        </TableCell>
                        <TableCell onClick={() => setSpvModalId(spv.id)}>
                          {sc && <StatusBadge label={sc.label} bg={sc.bg} dot={sc.dot} />}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </motion.div>
        )}

        {/* Distributions Section */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.3 }}
          className="bg-card border border-border rounded-lg overflow-hidden"
        >
          <div className="px-3 sm:px-4 py-3 border-b border-border flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">Distributions</h2>
            <span className="text-[10px] font-mono text-emerald-400">{formatCurrency(distMetrics.totalAmount)} total</span>
          </div>

          {/* Mobile: card list / Desktop: table */}
          <div className="sm:hidden divide-y divide-border">
            {distList.map((dist) => {
              const dc = DIST_STATUS_CONFIG[dist.status || "Scheduled"];
              return (
                <div
                  key={dist.id}
                  onClick={() => setDistModalId(dist.id)}
                  className="p-3 cursor-pointer active:bg-accent/30 touch-manipulation"
                >
                  <div className="flex items-start justify-between mb-1.5">
                    <span className="text-xs font-medium text-foreground">{dist.name}</span>
                    {dc && <StatusBadge label={dc.label} bg={dc.bg} dot={dc.dot} />}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono font-medium text-foreground">{formatCurrency(dist.amount || 0)}</span>
                    <span className="text-[10px] font-mono text-muted-foreground">{formatDate(dist.distributionDate)}</span>
                    <span className="text-[10px] text-muted-foreground">{dist.fund || "—"}</span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="hidden sm:block overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-[11px] uppercase tracking-[0.06em] font-medium text-muted-foreground">Distribution</TableHead>
                  <TableHead className="text-[11px] uppercase tracking-[0.06em] font-medium text-muted-foreground">Fund</TableHead>
                  <TableHead className="text-[11px] uppercase tracking-[0.06em] font-medium text-muted-foreground">Date</TableHead>
                  <TableHead className="text-[11px] uppercase tracking-[0.06em] font-medium text-muted-foreground">Amount</TableHead>
                  <TableHead className="text-[11px] uppercase tracking-[0.06em] font-medium text-muted-foreground hidden md:table-cell">Type</TableHead>
                  <TableHead className="text-[11px] uppercase tracking-[0.06em] font-medium text-muted-foreground">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {distList.map((dist) => {
                  const dc = DIST_STATUS_CONFIG[dist.status || "Scheduled"];
                  return (
                    <TableRow key={dist.id} className="cursor-pointer hover:bg-accent/30 active:bg-accent/40 touch-manipulation" onClick={() => setDistModalId(dist.id)}>
                      <TableCell>
                        <span className="text-xs text-foreground font-medium">{dist.name}</span>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{dist.fund || "—"}</TableCell>
                      <TableCell className="text-xs font-mono text-muted-foreground">{formatDate(dist.distributionDate)}</TableCell>
                      <TableCell className="text-xs font-mono font-medium text-foreground">{formatCurrency(dist.amount || 0)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground hidden md:table-cell">{dist.type || "—"}</TableCell>
                      <TableCell>{dc && <StatusBadge label={dc.label} bg={dc.bg} dot={dc.dot} />}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </motion.div>
      </div>

      {/* SPV Detail Modal */}
      <Dialog open={!!spvModal} onOpenChange={(open) => !open && setSpvModalId(null)}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          {spvModal && (
            <>
              <DialogHeader>
                <DialogTitle className="text-sm">{spvModal.name}</DialogTitle>
                <DialogDescription className="text-[10px] font-mono">{spvModal.sector} · {spvModal.stage}</DialogDescription>
              </DialogHeader>
              <div className="space-y-3 py-2">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Priority</span>
                  <button
                    onClick={() => cyclePriority(spvModal.id)}
                    className={cn("text-[10px] font-medium px-2 py-1 rounded cursor-pointer touch-manipulation",
                      spvModal.priority === "High" ? "bg-red-500/10 text-red-400" :
                      spvModal.priority === "Medium" ? "bg-amber-500/10 text-amber-400" :
                      "bg-secondary text-muted-foreground"
                    )}
                  >
                    {spvModal.priority} (tap to cycle)
                  </button>
                </div>
                {spvModal.currentStatus && (
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium block mb-1">Current Status</span>
                    <p className="text-xs text-foreground bg-secondary/30 rounded-md p-2">{spvModal.currentStatus}</p>
                  </div>
                )}
                {spvModal.nextStep && (
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium block mb-1">Next Step</span>
                    <p className="text-xs text-foreground bg-secondary/30 rounded-md p-2">{spvModal.nextStep}</p>
                  </div>
                )}
                <div>
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium block mb-1">Update Stage</span>
                  <Select value={spvModal.stage || "Active deal"} onValueChange={(val) => updateStage(spvModal.id, val)}>
                    <SelectTrigger className="h-9 min-h-[36px] text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ALL_STAGES.filter(s => s !== "All").map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter className="flex-col sm:flex-row gap-2">
                <Link href={`/spvs/${spvModal.slug}`}>
                  <Button variant="outline" size="sm" className="text-xs h-9 min-h-[36px] w-full sm:w-auto touch-manipulation">View full details</Button>
                </Link>
                <Button variant="ghost" size="sm" className="text-xs h-9 min-h-[36px] w-full sm:w-auto touch-manipulation" onClick={() => setSpvModalId(null)}>Close</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Distribution Detail Modal */}
      <Dialog open={!!distModal} onOpenChange={(open) => !open && setDistModalId(null)}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          {distModal && (
            <>
              <DialogHeader>
                <DialogTitle className="text-sm">{distModal.name}</DialogTitle>
                <DialogDescription className="text-[10px] font-mono">{distModal.fund || "—"}</DialogDescription>
              </DialogHeader>
              <div className="space-y-3 py-2">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium block mb-1">Amount</span>
                    <span className="text-sm font-mono font-semibold text-foreground">{formatCurrency(distModal.amount || 0)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium block mb-1">Date</span>
                    <span className="text-xs font-mono text-foreground">{formatDate(distModal.distributionDate)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium block mb-1">Type</span>
                    <span className="text-xs text-foreground">{distModal.type || "—"}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium block mb-1">Method</span>
                    <span className="text-xs text-foreground">{distModal.method || "—"}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium block mb-1">Status</span>
                    {DIST_STATUS_CONFIG[distModal.status || "Scheduled"] && (
                      <StatusBadge
                        label={DIST_STATUS_CONFIG[distModal.status || "Scheduled"].label}
                        bg={DIST_STATUS_CONFIG[distModal.status || "Scheduled"].bg}
                        dot={DIST_STATUS_CONFIG[distModal.status || "Scheduled"].dot}
                      />
                    )}
                  </div>
                </div>
                {distModal.notes && (
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium block mb-1">Notes</span>
                    <p className="text-xs text-foreground bg-secondary/30 rounded-md p-2">{distModal.notes}</p>
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button variant="ghost" size="sm" className="text-xs h-9 min-h-[36px] w-full sm:w-auto touch-manipulation" onClick={() => setDistModalId(null)}>Close</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Add Deal Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-sm">New Deal</DialogTitle>
            <DialogDescription className="text-[10px] font-mono">Add a new SPV or deal to the pipeline</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-xs mb-1">Name</Label>
              <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Deal name" className="h-9 min-h-[36px] text-xs" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs mb-1">Sector</Label>
                <Select value={newSector} onValueChange={setNewSector}>
                  <SelectTrigger className="h-9 min-h-[36px] text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ALL_SECTORS.filter(t => t !== "All").map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs mb-1">Priority</Label>
                <Select value={newPriority} onValueChange={setNewPriority}>
                  <SelectTrigger className="h-9 min-h-[36px] text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["Low", "Medium", "High"].map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
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
              <Label className="text-xs mb-1">Notes</Label>
              <Textarea value={newNotes} onChange={(e) => setNewNotes(e.target.value)} placeholder="Current status or notes..." className="text-xs min-h-[60px]" />
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button size="sm" className="text-xs h-9 min-h-[36px] w-full sm:w-auto touch-manipulation" onClick={handleAddDeal} disabled={createSpv.isPending}>
              <Plus className="size-3.5 mr-1" /> Add Deal
            </Button>
            <Button variant="ghost" size="sm" className="text-xs h-9 min-h-[36px] w-full sm:w-auto touch-manipulation" onClick={() => setAddOpen(false)}>Cancel</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
