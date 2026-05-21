// Distributions Page — Per-Client Scoped via Workspace Context
// Card/table view, detail modals, new distribution form, multi-currency support

import DashboardLayout from "@/components/DashboardLayout";
import StatusBadge from "@/components/StatusBadge";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useAuth } from "@/_core/hooks/useAuth";
import { isVentexTeam } from "@/lib/ventex";
import { usePreviewMode } from "@/contexts/PreviewMode";
import {
  DIST_STATUS_CONFIG, formatCurrency, formatDate,
} from "@/lib/data";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { motion, AnimatePresence } from "framer-motion";
import { DollarSign, Clock, XCircle, CheckCircle2, Plus, FileDown, LayoutGrid, List, Loader2, GitCommitVertical, X, ArrowRightLeft, Settings2, Trash2 } from "lucide-react";
import { useState, useCallback, useMemo } from "react";
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
import { toast } from "sonner";
import { exportDistributionPdf, exportAllDistributionsPdf } from "@/lib/exportPdf";
import type { Distribution } from "@/lib/data";

// ─── Currency Display Helper ───────────────────────────────────────
function CurrencyBadge({ currency }: { currency: string }) {
  if (!currency || currency === "USD") return null;
  return (
    <span className="inline-flex items-center gap-0.5 text-[9px] font-mono px-1.5 py-0.5 rounded bg-primary/10 text-primary/80 border border-primary/10">
      {currency}
    </span>
  );
}

// ─── FX Rate Management Panel ──────────────────────────────────────
function FxRateManagement() {
  const fxQ = trpc.distributions.listFxRates.useQuery();
  const currQ = trpc.distributions.supportedCurrencies.useQuery();
  const setRate = trpc.distributions.setFxRate.useMutation({
    onSuccess: () => {
      fxQ.refetch();
      toast.success("FX rate saved");
      setNewTarget(""); setNewRate(""); setNewEffDate("");
    },
    onError: (err) => toast.error(err.message),
  });

  const [newTarget, setNewTarget] = useState("");
  const [newRate, setNewRate] = useState("");
  const [newEffDate, setNewEffDate] = useState("");

  const currencies = currQ.data || [];
  const rates = fxQ.data || [];

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-card border border-border rounded-lg">
      <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ArrowRightLeft className="size-4 text-primary" />
          <h2 className="text-sm font-semibold text-foreground">FX Rate Management</h2>
        </div>
        <span className="text-[10px] font-mono text-muted-foreground">{rates.length} rates</span>
      </div>

      {/* Add new rate */}
      <div className="p-4 border-b border-border">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div>
            <Label className="text-[10px] mb-1 text-muted-foreground">Target Currency</Label>
            <Select value={newTarget} onValueChange={setNewTarget}>
              <SelectTrigger className="h-9 min-h-[36px] text-xs"><SelectValue placeholder="Select..." /></SelectTrigger>
              <SelectContent>
                {currencies.filter(c => c.code !== "USD").map(c => (
                  <SelectItem key={c.code} value={c.code}>{c.code} — {c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-[10px] mb-1 text-muted-foreground">Rate (1 USD = ?)</Label>
            <Input value={newRate} onChange={(e) => setNewRate(e.target.value)} placeholder="e.g. 3.6725" type="number" step="0.0001" className="h-9 min-h-[36px] text-xs" />
          </div>
          <div>
            <Label className="text-[10px] mb-1 text-muted-foreground">Effective Date</Label>
            <Input value={newEffDate} onChange={(e) => setNewEffDate(e.target.value)} type="date" className="h-9 min-h-[36px] text-xs" />
          </div>
          <div className="flex items-end">
            <Button
              size="sm"
              className="text-xs h-9 min-h-[36px] w-full"
              disabled={!newTarget || !newRate || !newEffDate || setRate.isPending}
              onClick={() => {
                if (!newTarget || !newRate || !newEffDate) return;
                setRate.mutate({
                  baseCurrency: "USD",
                  targetCurrency: newTarget,
                  rate: Number(newRate),
                  effectiveDate: newEffDate,
                  source: "manual",
                });
              }}
            >
              {setRate.isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Plus className="size-3.5 mr-1" />}
              Set Rate
            </Button>
          </div>
        </div>
      </div>

      {/* Existing rates table */}
      {rates.length === 0 ? (
        <div className="p-8 text-center">
          <ArrowRightLeft className="size-6 text-muted-foreground mx-auto mb-2 opacity-40" />
          <p className="text-xs text-muted-foreground">No FX rates configured. Add rates above to enable multi-currency distributions.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-[10px] uppercase tracking-wider font-medium text-muted-foreground">Pair</TableHead>
                <TableHead className="text-[10px] uppercase tracking-wider font-medium text-muted-foreground">Rate</TableHead>
                <TableHead className="text-[10px] uppercase tracking-wider font-medium text-muted-foreground">Inverse</TableHead>
                <TableHead className="text-[10px] uppercase tracking-wider font-medium text-muted-foreground">Source</TableHead>
                <TableHead className="text-[10px] uppercase tracking-wider font-medium text-muted-foreground">Effective</TableHead>
                <TableHead className="text-[10px] uppercase tracking-wider font-medium text-muted-foreground">Added</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rates.map((r) => (
                <TableRow key={r.id} className="hover:bg-accent/20">
                  <TableCell className="text-xs font-mono font-medium text-foreground">
                    {r.baseCurrency}/{r.targetCurrency}
                  </TableCell>
                  <TableCell className="text-xs font-mono text-foreground">{r.rate.toFixed(4)}</TableCell>
                  <TableCell className="text-xs font-mono text-muted-foreground">{r.inverseRate.toFixed(6)}</TableCell>
                  <TableCell>
                    <span className={cn(
                      "text-[10px] font-medium px-1.5 py-0.5 rounded",
                      r.source === "manual" ? "bg-amber-500/10 text-amber-400" : "bg-emerald-500/10 text-emerald-400"
                    )}>
                      {r.source || "manual"}
                    </span>
                  </TableCell>
                  <TableCell className="text-xs font-mono text-muted-foreground">{r.effectiveDate}</TableCell>
                  <TableCell className="text-[10px] font-mono text-muted-foreground">
                    {r.createdAt ? new Date(r.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : ""}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </motion.div>
  );
}

// ─── Main Distributions Page ───────────────────────────────────────
export default function DistributionsPage() {
  const { activeOrg, activeOrgId, organizations } = useWorkspace();
  const { user } = useAuth();
  const { isPreviewMode } = usePreviewMode();
  const isAdmin = isVentexTeam(user) && !isPreviewMode;
  const [localOrgFilter, setLocalOrgFilter] = useState<number | undefined>(undefined);
  const [showAllClients, setShowAllClients] = useState(false);

  // Admin can override org filter to see all or specific client
  const effectiveOrgId = isAdmin && showAllClients ? undefined : (localOrgFilter ?? activeOrgId);

  // Fetch distributions scoped to effective org
  const distQ = trpc.distributions.list.useQuery(
    effectiveOrgId ? { organizationId: effectiveOrgId } : undefined,
    { enabled: true }
  );
  const currQ = trpc.distributions.supportedCurrencies.useQuery();
  const utils = trpc.useUtils();

  const createDist = trpc.distributions.create.useMutation({
    onSuccess: () => {
      distQ.refetch();
      setAddOpen(false);
      resetForm();
      toast.success("Distribution created");
    },
    onError: (err) => toast.error(err.message),
  });
  const deleteDist = trpc.distributions.delete.useMutation({
    onSuccess: () => {
      distQ.refetch();
      setDistModal(null);
      toast.success("Distribution deleted");
    },
    onError: (err) => toast.error(err.message || "Failed to delete distribution"),
  });

  const distributions = distQ.data || [];
  const loading = distQ.isLoading;
  const currencies = currQ.data || [];

  const [distModal, setDistModal] = useState<typeof distributions[number] | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"card" | "table" | "timeline">("card");
  const [activeMetric, setActiveMetric] = useState<string | null>(null);
  const [showFxPanel, setShowFxPanel] = useState(false);

  const [newName, setNewName] = useState("");
  const [newFund, setNewFund] = useState("");
  const [newAmount, setNewAmount] = useState("");
  const [newCurrency, setNewCurrency] = useState("USD");
  const [newDate, setNewDate] = useState("");
  const [newType, setNewType] = useState("Profit Share");
  const [newMethod, setNewMethod] = useState("Wire Transfer");
  const [newStatus, setNewStatus] = useState("Scheduled");
  const [newNotes, setNewNotes] = useState("");

  const resetForm = () => {
    setNewName(""); setNewFund(""); setNewAmount(""); setNewDate(""); setNewNotes("");
    setNewType("Profit Share"); setNewMethod("Wire Transfer"); setNewStatus("Scheduled");
    setNewCurrency("USD");
  };

  // Multi-currency aware summaries
  const formatMultiCurrency = (dists: typeof distributions) => {
    const byCurrency: Record<string, number> = {};
    for (const d of dists) {
      const cur = d.currency || "USD";
      byCurrency[cur] = (byCurrency[cur] || 0) + (d.amount || 0);
    }
    const entries = Object.entries(byCurrency).filter(([, v]) => v > 0);
    if (entries.length === 0) return formatCurrency(0);
    if (entries.length === 1) return formatCurrency(entries[0][1], entries[0][0]);
    return entries.map(([cur, amt]) => formatCurrency(amt, cur)).join(" + ");
  };
  const totalDistributed = distributions.reduce((sum, d) => sum + (d.amount || 0), 0);
  const paidAmount = distributions.filter(d => d.status === "Paid").reduce((sum, d) => sum + (d.amount || 0), 0);
  const scheduledAmount = distributions.filter(d => d.status === "Scheduled").reduce((sum, d) => sum + (d.amount || 0), 0);
  const cancelledAmount = distributions.filter(d => d.status === "Cancelled").reduce((sum, d) => sum + (d.amount || 0), 0);

  const fundBreakdown = useMemo(() => {
    return Object.entries(distributions.reduce((acc, d) => {
      const fund = d.fund || "General";
      acc[fund] = (acc[fund] || 0) + (d.amount || 0);
      return acc;
    }, {} as Record<string, number>));
  }, [distributions]);

  const handleAdd = useCallback(() => {
    if (!activeOrgId) { toast.error("Please select a client first"); return; }
    if (!newName.trim()) { toast.error("Name is required"); return; }
    if (!newAmount.trim() || isNaN(Number(newAmount))) { toast.error("Valid amount is required"); return; }
    createDist.mutate({
      name: newName.trim(),
      fund: newFund.trim() || "General Fund",
      amount: Number(newAmount),
      currency: newCurrency,
      type: newType,
      method: newMethod,
      status: newStatus,
      notes: newNotes.trim() || undefined,
      distributionDate: newDate || new Date().toISOString().split("T")[0],
      organizationId: activeOrgId,
    });
  }, [newName, newFund, newAmount, newCurrency, newDate, newType, newMethod, newStatus, newNotes, activeOrgId, createDist]);

  const metrics = [
    { key: "total", label: "Total", value: formatMultiCurrency(distributions), icon: <DollarSign className="size-4 text-primary" />, sub: `${distributions.length} dist.`, activeColor: "border-primary/50" },
    { key: "paid", label: "Paid", value: formatMultiCurrency(distributions.filter(d => d.status === "Paid")), icon: <CheckCircle2 className="size-4 text-emerald-400" />, sub: `${distributions.filter(d => d.status === "Paid").length}`, activeColor: "border-emerald-500/50" },
    { key: "scheduled", label: "Scheduled", value: formatMultiCurrency(distributions.filter(d => d.status === "Scheduled")), icon: <Clock className="size-4 text-blue-400" />, sub: `${distributions.filter(d => d.status === "Scheduled").length}`, activeColor: "border-blue-500/50" },
    { key: "cancelled", label: "Cancelled", value: formatMultiCurrency(distributions.filter(d => d.status === "Cancelled")), icon: <XCircle className="size-4 text-muted-foreground/50" />, sub: `${distributions.filter(d => d.status === "Cancelled").length}`, activeColor: "border-muted-foreground/30" },
  ];

  const displayDistributions = useMemo(() => {
    if (!activeMetric) return distributions;
    switch (activeMetric) {
      case "paid": return distributions.filter(d => d.status === "Paid");
      case "scheduled": return distributions.filter(d => d.status === "Scheduled");
      case "cancelled": return distributions.filter(d => d.status === "Cancelled");
      case "total": default: return distributions;
    }
  }, [activeMetric, distributions]);

  // Convert DB dist to local Distribution type for PDF export
  const toLocalDist = (d: typeof distributions[number]): Distribution => ({
    id: String(d.id),
    name: d.name,
    fund: d.fund || "General",
    amount: d.amount || 0,
    currency: d.currency || "USD",
    date: d.distributionDate || "",
    type: d.type || "",
    method: d.method || "",
    status: (d.status || "Scheduled") as Distribution["status"],
    isPaid: d.status === "Paid",
    ageDays: d.distributionDate ? Math.max(0, Math.floor((Date.now() - new Date(d.distributionDate).getTime()) / 86400000)) : 0,
    notes: d.notes || undefined,
  });

  const effectiveOrg = isAdmin && localOrgFilter ? organizations?.find(o => o.id === localOrgFilter) : activeOrg;
  const clientLabel = isAdmin && showAllClients ? "All Clients" : (effectiveOrg?.name || "All Clients");

  // Helper to format amount with currency badge
  const formatDistAmount = (dist: { amount: number | null; currency: string | null }) => {
    const cur = dist.currency || "USD";
    return formatCurrency(dist.amount || 0, cur);
  };

  return (
    <DashboardLayout title="Distributions" subtitle={`${clientLabel} · LP PAYOUTS & DIVIDENDS`}>
      <div className="p-4 sm:p-5 md:p-8 space-y-5 sm:space-y-8 pb-24 md:pb-8">

        {/* Client filter — admins can switch between All Clients and specific clients */}
        <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
          <span className="size-2 rounded-full bg-primary/50" />
          {isAdmin ? (
            <div className="flex items-center gap-2">
              <span>Showing distributions for</span>
              <Select
                value={showAllClients ? "__all__" : String(effectiveOrgId || "__all__")}
                onValueChange={(val) => {
                  if (val === "__all__") {
                    setShowAllClients(true);
                    setLocalOrgFilter(undefined);
                  } else {
                    setShowAllClients(false);
                    setLocalOrgFilter(Number(val));
                  }
                }}
              >
                <SelectTrigger className="h-7 w-auto min-w-[160px] text-xs bg-card border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All Clients</SelectItem>
                  {(organizations || []).map((org) => (
                    <SelectItem key={org.id} value={String(org.id)}>{org.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <span>Showing distributions for <span className="font-medium text-foreground">{clientLabel}</span></span>
          )}
        </div>

        {/* Summary metrics — clickable filter cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 sm:h-24 rounded-lg" />)
          ) : (
            metrics.map((m, i) => {
              const isActive = activeMetric === m.key;
              return (
                <motion.div
                  key={m.key}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05, duration: 0.3 }}
                  onClick={() => setActiveMetric(isActive ? null : m.key)}
                  className={cn(
                    "bg-card border rounded-xl p-4 sm:p-5 cursor-pointer transition-all active:scale-[0.97]",
                    isActive ? `${m.activeColor} bg-card/80` : "border-border hover:border-primary/20"
                  )}
                >
                  <div className="flex items-center gap-1 sm:gap-2 mb-1 sm:mb-2">
                    {m.icon}
                    <span className="text-[8px] sm:text-[11px] uppercase tracking-[0.06em] text-muted-foreground font-medium">{m.label}</span>
                  </div>
                  <span className="text-base sm:text-2xl font-mono font-semibold text-foreground block">{m.value}</span>
                  <p className="text-[9px] sm:text-[10px] font-mono text-muted-foreground mt-0.5 sm:mt-1">{m.sub}</p>
                </motion.div>
              );
            })
          )}
        </div>
        <AnimatePresence>
          {activeMetric && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
              <div className="flex items-center gap-2 px-3 py-2 bg-primary/5 border border-primary/10 rounded-lg">
                <span className="text-xs text-primary font-medium">Showing: {metrics.find(m => m.key === activeMetric)?.label}</span>
                <button onClick={() => setActiveMetric(null)} className="ml-auto text-xs text-muted-foreground hover:text-foreground"><X className="size-3.5" /></button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Actions bar */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1 bg-secondary/50 rounded-lg p-0.5">
            <button onClick={() => setViewMode("card")} className={cn("p-1.5 sm:p-2 rounded-md transition-colors touch-manipulation", viewMode === "card" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground")}>
              <LayoutGrid className="size-4" />
            </button>
            <button onClick={() => setViewMode("table")} className={cn("p-1.5 sm:p-2 rounded-md transition-colors touch-manipulation hidden sm:block", viewMode === "table" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground")}>
              <List className="size-4" />
            </button>
            <button onClick={() => setViewMode("timeline")} className={cn("p-1.5 sm:p-2 rounded-md transition-colors touch-manipulation", viewMode === "timeline" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground")}>
              <GitCommitVertical className="size-4" />
            </button>
          </div>
          <div className="flex items-center gap-2">
            {isAdmin && (
              <Button variant="outline" size="sm" className="text-xs h-9 min-h-[36px] touch-manipulation hidden sm:flex" onClick={() => setShowFxPanel(!showFxPanel)}>
                <ArrowRightLeft className="size-3.5 mr-1" /> FX Rates
              </Button>
            )}
            <Button variant="outline" size="sm" className="text-xs h-9 min-h-[36px] touch-manipulation hidden sm:flex" onClick={() => {
              const localDists = displayDistributions.map(toLocalDist);
              exportAllDistributionsPdf(localDists);
              toast.success("Summary PDF downloaded");
            }}>
              <FileDown className="size-3.5 mr-1" /> Export
            </Button>
            {isAdmin && (
              <Button size="sm" className="text-xs h-9 min-h-[36px] touch-manipulation" onClick={() => setAddOpen(true)}>
                <Plus className="size-3.5 mr-1" /> New
              </Button>
            )}
          </div>
        </div>

        {/* FX Rate Management Panel (admin only) */}
        <AnimatePresence>
          {showFxPanel && isAdmin && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
              <FxRateManagement />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Card View (mobile-friendly) */}
        {viewMode === "card" && !loading && (
          <div className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-sm font-semibold text-foreground">{clientLabel} Distributions</h2>
              <span className="text-[10px] font-mono text-emerald-400">{formatMultiCurrency(distributions)}</span>
            </div>
            {displayDistributions.length === 0 ? (
              <div className="p-12 text-center bg-card border border-border rounded-lg">
                <DollarSign className="size-8 text-muted-foreground mx-auto mb-3 opacity-40" />
                <p className="text-sm text-muted-foreground">No distributions recorded for this client.</p>
              </div>
            ) : (
              <AnimatePresence>
                {displayDistributions.map((dist, i) => {
                  const dc = DIST_STATUS_CONFIG[dist.status || "Scheduled"];
                  return (
                    <motion.div
                      key={dist.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ delay: i * 0.02 }}
                      className="bg-card border border-border rounded-xl p-3 cursor-pointer hover:border-primary/20 active:scale-[0.98] transition-all touch-manipulation"
                      onClick={() => setDistModal(dist)}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <span className="text-sm font-normal text-foreground/85">{dist.name}</span>
                          <p className="text-[12px] text-muted-foreground/45 mt-0.5">{dist.fund}</p>
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <span className="text-lg font-semibold text-foreground tabular-nums text-right">{formatDistAmount(dist)}</span>
                          <CurrencyBadge currency={dist.currency || "USD"} />
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        {dc && <StatusBadge label={dc.label} bg={dc.bg} dot={dc.dot} />}
                        <span className="text-[10px] font-mono text-muted-foreground">{dist.distributionDate ? formatDate(dist.distributionDate) : ""}</span>
                        <span className="text-[10px] text-muted-foreground">{dist.type}</span>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            )}
          </div>
        )}

        {/* Table View (desktop) */}
        {viewMode === "table" && !loading && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-card border border-border rounded-lg overflow-hidden">
            <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
              <h2 className="text-sm font-semibold text-foreground">{clientLabel} Distributions</h2>
              <span className="text-[10px] font-mono text-emerald-400">{formatMultiCurrency(distributions)} total</span>
            </div>
            {displayDistributions.length === 0 ? (
              <div className="p-12 text-center">
                <DollarSign className="size-8 text-muted-foreground mx-auto mb-3 opacity-40" />
                <p className="text-sm text-muted-foreground">No distributions recorded for this client.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="text-[11px] uppercase tracking-[0.06em] font-medium text-muted-foreground">Distribution</TableHead>
                      <TableHead className="text-[11px] uppercase tracking-[0.06em] font-medium text-muted-foreground hidden md:table-cell">Fund</TableHead>
                      <TableHead className="text-[11px] uppercase tracking-[0.06em] font-medium text-muted-foreground hidden md:table-cell">Date</TableHead>
                      <TableHead className="text-[11px] uppercase tracking-[0.06em] font-medium text-muted-foreground">Amount</TableHead>
                      <TableHead className="text-[11px] uppercase tracking-[0.06em] font-medium text-muted-foreground hidden md:table-cell">Currency</TableHead>
                      <TableHead className="text-[11px] uppercase tracking-[0.06em] font-medium text-muted-foreground hidden lg:table-cell">Type</TableHead>
                      <TableHead className="text-[11px] uppercase tracking-[0.06em] font-medium text-muted-foreground hidden lg:table-cell">Method</TableHead>
                      <TableHead className="text-[11px] uppercase tracking-[0.06em] font-medium text-muted-foreground">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {displayDistributions.map(dist => {
                      const dc = DIST_STATUS_CONFIG[dist.status || "Scheduled"];
                      return (
                        <TableRow key={dist.id} className="cursor-pointer hover:bg-accent/30 active:bg-accent/40 touch-manipulation" onClick={() => setDistModal(dist)}>
                          <TableCell>
                            <div>
                              <span className="text-xs text-foreground font-medium">{dist.name}</span>
                              {dist.notes && <p className="text-[10px] text-muted-foreground mt-0.5 truncate max-w-[200px]">{dist.notes}</p>}
                            </div>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground hidden md:table-cell">{dist.fund}</TableCell>
                          <TableCell className="text-xs font-mono text-muted-foreground hidden md:table-cell">{dist.distributionDate ? formatDate(dist.distributionDate) : ""}</TableCell>
                          <TableCell className="text-xs font-mono font-medium text-foreground">{formatDistAmount(dist)}</TableCell>
                          <TableCell className="hidden md:table-cell">
                            <CurrencyBadge currency={dist.currency || "USD"} />
                            {(!dist.currency || dist.currency === "USD") && <span className="text-[10px] font-mono text-muted-foreground">USD</span>}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground hidden lg:table-cell">{dist.type}</TableCell>
                          <TableCell className="text-xs text-muted-foreground hidden lg:table-cell">{dist.method}</TableCell>
                          <TableCell>{dc && <StatusBadge label={dc.label} bg={dc.bg} dot={dc.dot} />}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </motion.div>
        )}

        {/* Timeline View */}
        {viewMode === "timeline" && !loading && (
          <div className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-sm font-semibold text-foreground">Distribution Timeline</h2>
              <span className="text-[10px] font-mono text-muted-foreground">{displayDistributions.length} events</span>
            </div>
            {displayDistributions.length === 0 ? (
              <div className="p-12 text-center bg-card border border-border rounded-lg">
                <DollarSign className="size-8 text-muted-foreground mx-auto mb-3 opacity-40" />
                <p className="text-sm text-muted-foreground">No distributions recorded.</p>
              </div>
            ) : (
              <div className="relative">
                {/* Vertical timeline line */}
                <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />
                <div className="space-y-0">
                  {[...displayDistributions]
                    .sort((a, b) => {
                      const dateA = a.distributionDate ? new Date(a.distributionDate).getTime() : 0;
                      const dateB = b.distributionDate ? new Date(b.distributionDate).getTime() : 0;
                      return dateB - dateA;
                    })
                    .map((dist, i) => {
                      const dc = DIST_STATUS_CONFIG[dist.status || "Scheduled"];
                      const dotColor = dist.status === "Paid" ? "bg-emerald-400" : dist.status === "Cancelled" ? "bg-red-400" : "bg-blue-400";
                      const isPast = dist.distributionDate && new Date(dist.distributionDate) <= new Date();
                      return (
                        <motion.div
                          key={dist.id}
                          initial={{ opacity: 0, x: -12 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.03 }}
                          className="relative pl-10 py-3 cursor-pointer hover:bg-accent/10 rounded-lg transition-colors"
                          onClick={() => setDistModal(dist)}
                        >
                          {/* Timeline dot */}
                          <div className={cn(
                            "absolute left-2.5 top-4 size-3 rounded-full border-2 border-background z-10",
                            dotColor,
                            !isPast && "ring-2 ring-blue-400/30"
                          )} />
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-medium text-foreground">{dist.name}</span>
                                {dc && <StatusBadge label={dc.label} bg={dc.bg} dot={dc.dot} />}
                              </div>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-[10px] font-mono text-muted-foreground">
                                  {dist.distributionDate ? formatDate(dist.distributionDate) : "No date"}
                                </span>
                                <span className="text-[10px] text-muted-foreground">{dist.fund}</span>
                                <span className="text-[10px] text-muted-foreground">{dist.type}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5 flex-shrink-0">
                              <span className="text-sm font-mono font-semibold text-foreground">
                                {formatDistAmount(dist)}
                              </span>
                              <CurrencyBadge currency={dist.currency || "USD"} />
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Fund breakdown */}
        {!loading && fundBreakdown.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-card border border-border rounded-lg">
            <div className="px-3 sm:px-4 py-3 border-b border-border">
              <h2 className="text-sm font-semibold text-foreground">By Fund</h2>
            </div>
            <div className="p-3 sm:p-4 space-y-2 sm:space-y-3">
              {fundBreakdown.map(([fund, amount]) => (
                <div key={fund} className="flex items-center justify-between p-2.5 sm:p-3 bg-secondary/20 rounded-md">
                  <div className="min-w-0 flex-1">
                    <span className="text-xs font-medium text-foreground">{fund}</span>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {displayDistributions.filter(d => (d.fund || "General") === fund).length} distribution(s)
                    </p>
                  </div>
                  <span className="text-sm font-mono font-semibold text-foreground flex-shrink-0">{formatMultiCurrency(displayDistributions.filter(d => (d.fund || "General") === fund))}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </div>

      {/* Distribution Detail Modal */}
      <Dialog open={!!distModal} onOpenChange={(open) => !open && setDistModal(null)}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          {distModal && (() => {
            const dc = DIST_STATUS_CONFIG[distModal.status || "Scheduled"];
            const ageDays = distModal.distributionDate
              ? Math.max(0, Math.floor((Date.now() - new Date(distModal.distributionDate).getTime()) / 86400000))
              : 0;
            const cur = distModal.currency || "USD";
            return (
              <>
                <DialogHeader>
                  <DialogTitle className="text-sm">{distModal.name}</DialogTitle>
                  <DialogDescription className="text-[10px] font-mono">{distModal.fund}</DialogDescription>
                </DialogHeader>
                <div className="space-y-3 py-2">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium block mb-1">Amount</span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-mono font-semibold text-foreground">{formatCurrency(distModal.amount || 0, cur)}</span>
                        <CurrencyBadge currency={cur} />
                      </div>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium block mb-1">Date</span>
                      <span className="text-xs font-mono text-foreground">{distModal.distributionDate ? formatDate(distModal.distributionDate) : "N/A"}</span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium block mb-1">Type</span>
                      <span className="text-xs text-foreground">{distModal.type || "N/A"}</span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium block mb-1">Method</span>
                      <span className="text-xs text-foreground">{distModal.method || "N/A"}</span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium block mb-1">Status</span>
                      {dc && <StatusBadge label={dc.label} bg={dc.bg} dot={dc.dot} />}
                    </div>
                    <div>
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium block mb-1">Currency</span>
                      <span className="text-xs font-mono text-foreground">{cur}</span>
                    </div>
                  </div>
                  {distModal.notes && (
                    <div>
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium block mb-1">Notes</span>
                      <p className="text-xs text-foreground bg-secondary/30 rounded-md p-2">{distModal.notes}</p>
                    </div>
                  )}
                </div>
                <DialogFooter className="flex-col sm:flex-row gap-2">
                  <Button variant="outline" size="sm" className="text-xs h-9 min-h-[36px] w-full sm:w-auto touch-manipulation" onClick={() => {
                    exportDistributionPdf(toLocalDist(distModal));
                    toast.success("PDF downloaded");
                  }}>
                    <FileDown className="size-3.5 mr-1" /> Export PDF
                  </Button>
                  {isAdmin && (
                    <Button variant="outline" size="sm" className="text-xs h-9 min-h-[36px] w-full sm:w-auto touch-manipulation text-red-400 hover:text-red-300 hover:border-red-500/50" onClick={() => {
                      if (confirm("Delete this distribution permanently?")) {
                        deleteDist.mutate({ id: distModal.id });
                      }
                    }}>
                      <Trash2 className="size-3.5 mr-1" /> Delete
                    </Button>
                  )}
                  <Button variant="ghost" size="sm" className="text-xs h-9 min-h-[36px] w-full sm:w-auto touch-manipulation" onClick={() => setDistModal(null)}>Close</Button>
                </DialogFooter>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Add Distribution Dialog — with currency selector */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-sm">New Distribution</DialogTitle>
            <DialogDescription className="text-[10px] font-mono">
              Record a new distribution for {clientLabel}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-xs mb-1">Name</Label>
              <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. Q1 2026 Profit Share" className="h-9 min-h-[36px] text-xs" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs mb-1">Fund</Label>
                <Input value={newFund} onChange={(e) => setNewFund(e.target.value)} placeholder="e.g. SPV Alpha" className="h-9 min-h-[36px] text-xs" />
              </div>
              <div>
                <Label className="text-xs mb-1">Amount</Label>
                <Input value={newAmount} onChange={(e) => setNewAmount(e.target.value)} placeholder="250000" type="number" className="h-9 min-h-[36px] text-xs" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs mb-1">Currency</Label>
                <Select value={newCurrency} onValueChange={setNewCurrency}>
                  <SelectTrigger className="h-9 min-h-[36px] text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {currencies.length > 0 ? (
                      currencies.map(c => (
                        <SelectItem key={c.code} value={c.code}>
                          {c.symbol} {c.code}
                        </SelectItem>
                      ))
                    ) : (
                      <>
                        <SelectItem value="USD">$ USD</SelectItem>
                        <SelectItem value="EUR">€ EUR</SelectItem>
                        <SelectItem value="GBP">£ GBP</SelectItem>
                        <SelectItem value="AED">د.إ AED</SelectItem>
                        <SelectItem value="SAR">﷼ SAR</SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs mb-1">Date</Label>
                <Input value={newDate} onChange={(e) => setNewDate(e.target.value)} type="date" className="h-9 min-h-[36px] text-xs" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs mb-1">Type</Label>
                <Select value={newType} onValueChange={setNewType}>
                  <SelectTrigger className="h-9 min-h-[36px] text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>{["Profit Share", "Return of Capital", "Dividend", "Interest", "Other"].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs mb-1">Method</Label>
                <Select value={newMethod} onValueChange={setNewMethod}>
                  <SelectTrigger className="h-9 min-h-[36px] text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>{["Wire Transfer", "ACH", "Check", "Crypto", "Other"].map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs mb-1">Status</Label>
                <Select value={newStatus} onValueChange={setNewStatus}>
                  <SelectTrigger className="h-9 min-h-[36px] text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>{["Paid", "Scheduled", "Cancelled"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-xs mb-1">Notes</Label>
              <Textarea value={newNotes} onChange={(e) => setNewNotes(e.target.value)} placeholder="Optional notes..." className="text-xs min-h-[60px]" />
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button size="sm" className="text-xs h-9 min-h-[36px] w-full sm:w-auto touch-manipulation" onClick={handleAdd} disabled={createDist.isPending}>
              {createDist.isPending ? <Loader2 className="size-3.5 mr-1 animate-spin" /> : <Plus className="size-3.5 mr-1" />}
              Add Distribution
            </Button>
            <Button variant="ghost" size="sm" className="text-xs h-9 min-h-[36px] w-full sm:w-auto touch-manipulation" onClick={() => setAddOpen(false)}>Cancel</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
