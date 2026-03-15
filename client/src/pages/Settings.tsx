// ============================================================================
// SPVs & Deals Page — LIVE DB DATA
// Row modals, priority cycling, stage updates, New Deal form, distributions
// ============================================================================

import DashboardLayout from "@/components/DashboardLayout";
import StatusBadge from "@/components/StatusBadge";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { motion } from "framer-motion";
import {
  Briefcase, DollarSign, TrendingUp, TrendingDown, Plus, X, ArrowUpDown,
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
  "Real Estate": "#3b82f6",
  "Yacht": "#06b6d4",
  "F&B": "#f59e0b",
  "Entertainment": "#a855f7",
  "Oil & Gas": "#ef4444",
  "Others": "#6b7280",
  "TBD": "#6b7280",
};

function formatCurrency(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toLocaleString()}`;
}

function formatDate(d: string | null | undefined): string {
  if (!d) return "—";
  const date = new Date(d);
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export default function SettingsPage() {
  const utils = trpc.useUtils();

  // ── Live data ──────────────────────────────────────────────────────
  const spvsQ = trpc.spvs.list.useQuery();
  const distQ = trpc.distributions.list.useQuery();
  const distMetricsQ = trpc.distributions.metrics.useQuery();

  const spvsList = spvsQ.data || [];
  const distList = distQ.data || [];
  const distMetrics = distMetricsQ.data || { total: 0, paid: 0, totalAmount: 0, paidAmount: 0 };

  // ── Mutations ──────────────────────────────────────────────────────
  const createSpv = trpc.spvs.create.useMutation({
    onSuccess: () => { utils.spvs.list.invalidate(); utils.spvs.metrics.invalidate(); utils.activity.recent.invalidate(); },
  });
  const updateSpv = trpc.spvs.update.useMutation({
    onSuccess: () => { utils.spvs.list.invalidate(); utils.spvs.metrics.invalidate(); utils.activity.recent.invalidate(); },
  });

  // ── State ──────────────────────────────────────────────────────────
  const [stageFilter, setStageFilter] = useState("All");
  const [sectorFilter, setSectorFilter] = useState("All");
  const [spvModalId, setSpvModalId] = useState<number | null>(null);
  const [distModalId, setDistModalId] = useState<number | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  // Add form
  const [newName, setNewName] = useState("");
  const [newSector, setNewSector] = useState("Oil & Gas");
  const [newPriority, setNewPriority] = useState("Medium");
  const [newStage, setNewStage] = useState("In negotiation");
  const [newNotes, setNewNotes] = useState("");

  // ── Computed ───────────────────────────────────────────────────────
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

  // ── Handlers ───────────────────────────────────────────────────────
  const cyclePriority = useCallback((id: number) => {
    const spv = spvsList.find(s => s.id === id);
    if (!spv) return;
    const next = PRIORITY_CYCLE[spv.priority || "Medium"] || "Medium";
    updateSpv.mutate({ id, priority: next });
    toast.info(`Priority changed to ${next}`);
  }, [spvsList, updateSpv]);

  const updateStage = useCallback((id: number, stage: string) => {
    updateSpv.mutate({ id, stage });
    toast.success(`Stage updated to ${stage}`);
    setSpvModalId(null);
  }, [updateSpv]);

  const handleAddDeal = useCallback(() => {
    if (!newName.trim()) { toast.error("Name is required"); return; }
    createSpv.mutate({
      name: newName.trim(),
      sector: newSector,
      priority: newPriority,
      stage: newStage,
      currentStatus: newNotes.trim() || undefined,
    });
    setAddOpen(false);
    setNewName(""); setNewNotes("");
    toast.success(`Deal "${newName.trim()}" added`);
  }, [newName, newSector, newPriority, newStage, newNotes, createSpv]);

  return (
    <DashboardLayout title="SPVs & Deals" subtitle="DEAL PIPELINE & DISTRIBUTIONS">
      <div className="p-4 md:p-6 space-y-6">
        {/* Summary metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {spvsQ.isLoading ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-lg" />) : [
            { label: "Total SPVs", value: filtered.length, icon: <Briefcase className="size-4 text-blue-400" /> },
            { label: "Active Deals", value: activeSPVs, icon: <TrendingUp className="size-4 text-emerald-400" /> },
            { label: "Total Distributed", value: formatCurrency(distMetrics.totalAmount), icon: <DollarSign className="size-4 text-primary" /> },
            { label: "Paid Out", value: formatCurrency(distMetrics.paidAmount), icon: <TrendingDown className="size-4 text-amber-400" /> },
          ].map((m, i) => (
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

        {/* Filters + Add */}
        <div className="flex flex-wrap items-center gap-3">
          <Select value={stageFilter} onValueChange={setStageFilter}>
            <SelectTrigger className="h-8 text-xs w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {ALL_STAGES.map(s => <SelectItem key={s} value={s}>{s === "All" ? "All Stages" : s}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={sectorFilter} onValueChange={setSectorFilter}>
            <SelectTrigger className="h-8 text-xs w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {ALL_SECTORS.map(t => <SelectItem key={t} value={t}>{t === "All" ? "All Sectors" : t}</SelectItem>)}
            </SelectContent>
          </Select>
          {(stageFilter !== "All" || sectorFilter !== "All") && (
            <Button variant="ghost" size="sm" className="text-xs h-8" onClick={() => { setStageFilter("All"); setSectorFilter("All"); }}>
              <X className="size-3 mr-1" /> Clear
            </Button>
          )}
          <div className="ml-auto">
            <Button size="sm" className="text-xs h-8" onClick={() => setAddOpen(true)}>
              <Plus className="size-3.5 mr-1" /> New Deal
            </Button>
          </div>
        </div>

        {/* SPVs Table — clickable rows, priority cycling */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.3 }}
          className="bg-card border border-border rounded-lg overflow-hidden"
        >
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">All SPVs & Deals</h2>
            <span className="text-[10px] font-mono text-muted-foreground">{filtered.length} deals</span>
          </div>

          {filtered.length === 0 ? (
            <div className="p-12 text-center">
              <Briefcase className="size-8 text-muted-foreground mx-auto mb-3 opacity-40" />
              <p className="text-sm text-muted-foreground">No deals match the current filters.</p>
              <Button variant="ghost" size="sm" className="text-xs mt-2" onClick={() => { setStageFilter("All"); setSectorFilter("All"); }}>Clear filters</Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-[11px] uppercase tracking-[0.06em] font-medium text-muted-foreground">SPV Name</TableHead>
                  <TableHead className="text-[11px] uppercase tracking-[0.06em] font-medium text-muted-foreground">Sector</TableHead>
                  <TableHead className="text-[11px] uppercase tracking-[0.06em] font-medium text-muted-foreground">
                    <div className="flex items-center gap-1">Priority <ArrowUpDown className="size-3" /></div>
                  </TableHead>
                  <TableHead className="text-[11px] uppercase tracking-[0.06em] font-medium text-muted-foreground">Stage</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((spv) => {
                  const color = THEME_COLORS[spv.sector || "Others"] || "#6b7280";
                  const sc = SPV_STAGE_CONFIG[spv.stage || "Active deal"];
                  return (
                    <TableRow key={spv.id} className="cursor-pointer hover:bg-accent/30">
                      <TableCell onClick={() => setSpvModalId(spv.id)}>
                        <div>
                          <span className="text-xs text-foreground font-medium">{spv.name}</span>
                          {spv.currentStatus && (
                            <p className="text-[10px] text-muted-foreground mt-0.5 truncate max-w-[200px]">{spv.currentStatus}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell onClick={() => setSpvModalId(spv.id)}>
                        <div className="flex items-center gap-2">
                          <div className="size-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                          <span className="text-xs" style={{ color }}>{spv.sector || "TBD"}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <button
                          onClick={(e) => { e.stopPropagation(); cyclePriority(spv.id); }}
                          className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded cursor-pointer hover:opacity-80 transition-opacity",
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
          )}
        </motion.div>

        {/* Distributions Table — clickable rows */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.3 }}
          className="bg-card border border-border rounded-lg overflow-hidden"
        >
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">Distributions</h2>
            <span className="text-[10px] font-mono text-emerald-400">{formatCurrency(distMetrics.totalAmount)} total</span>
          </div>

          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-[11px] uppercase tracking-[0.06em] font-medium text-muted-foreground">Distribution</TableHead>
                <TableHead className="text-[11px] uppercase tracking-[0.06em] font-medium text-muted-foreground">Fund</TableHead>
                <TableHead className="text-[11px] uppercase tracking-[0.06em] font-medium text-muted-foreground">Date</TableHead>
                <TableHead className="text-[11px] uppercase tracking-[0.06em] font-medium text-muted-foreground">Amount</TableHead>
                <TableHead className="text-[11px] uppercase tracking-[0.06em] font-medium text-muted-foreground">Type</TableHead>
                <TableHead className="text-[11px] uppercase tracking-[0.06em] font-medium text-muted-foreground">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {distList.map((dist) => {
                const dc = DIST_STATUS_CONFIG[dist.status || "Scheduled"];
                return (
                  <TableRow key={dist.id} className="cursor-pointer hover:bg-accent/30" onClick={() => setDistModalId(dist.id)}>
                    <TableCell>
                      <div>
                        <span className="text-xs text-foreground font-medium">{dist.name}</span>
                        {dist.notes && <p className="text-[10px] text-muted-foreground mt-0.5 truncate max-w-[200px]">{dist.notes}</p>}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{dist.fund || "—"}</TableCell>
                    <TableCell className="text-xs font-mono text-muted-foreground">{formatDate(dist.distributionDate)}</TableCell>
                    <TableCell className="text-xs font-mono font-medium text-foreground">{formatCurrency(dist.amount || 0)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{dist.type || "—"}</TableCell>
                    <TableCell>{dc && <StatusBadge label={dc.label} bg={dc.bg} dot={dc.dot} />}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </motion.div>
      </div>

      {/* SPV Detail Modal */}
      <Dialog open={!!spvModal} onOpenChange={(open) => !open && setSpvModalId(null)}>
        <DialogContent className="sm:max-w-md">
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
                    className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded cursor-pointer",
                      spvModal.priority === "High" ? "bg-red-500/10 text-red-400" :
                      spvModal.priority === "Medium" ? "bg-amber-500/10 text-amber-400" :
                      "bg-secondary text-muted-foreground"
                    )}
                  >
                    {spvModal.priority} (click to cycle)
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
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ALL_STAGES.filter(s => s !== "All").map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Link href={`/spvs/${spvModal.slug}`}>
                  <Button variant="outline" size="sm" className="text-xs">View full details →</Button>
                </Link>
                <Button variant="ghost" size="sm" className="text-xs" onClick={() => setSpvModalId(null)}>Close</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Distribution Detail Modal */}
      <Dialog open={!!distModal} onOpenChange={(open) => !open && setDistModalId(null)}>
        <DialogContent className="sm:max-w-md">
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
                <Button variant="ghost" size="sm" className="text-xs" onClick={() => setDistModalId(null)}>Close</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Add Deal Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm">New Deal</DialogTitle>
            <DialogDescription className="text-[10px] font-mono">Add a new SPV or deal to the pipeline</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-xs mb-1">Name</Label>
              <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Deal name" className="h-8 text-xs" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs mb-1">Sector</Label>
                <Select value={newSector} onValueChange={setNewSector}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ALL_SECTORS.filter(t => t !== "All").map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs mb-1">Priority</Label>
                <Select value={newPriority} onValueChange={setNewPriority}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["Low", "Medium", "High"].map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
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
              <Label className="text-xs mb-1">Notes</Label>
              <Textarea value={newNotes} onChange={(e) => setNewNotes(e.target.value)} placeholder="Current status or notes..." className="text-xs min-h-[60px]" />
            </div>
          </div>
          <DialogFooter>
            <Button size="sm" className="text-xs" onClick={handleAddDeal} disabled={createSpv.isPending}>
              <Plus className="size-3.5 mr-1" /> Add Deal
            </Button>
            <Button variant="ghost" size="sm" className="text-xs" onClick={() => setAddOpen(false)}>Cancel</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
