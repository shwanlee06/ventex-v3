// ============================================================================
// Distributions Page — Mobile-First Responsive
// Card/table view, detail modals, new distribution form
// ============================================================================

import DashboardLayout from "@/components/DashboardLayout";
import StatusBadge from "@/components/StatusBadge";
import { cn } from "@/lib/utils";
import {
  DISTRIBUTIONS, DIST_STATUS_CONFIG, formatCurrency, formatDate,
  type Distribution,
} from "@/lib/data";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { motion, AnimatePresence } from "framer-motion";
import { DollarSign, Clock, XCircle, CheckCircle2, Plus, FileDown, LayoutGrid, List } from "lucide-react";
import { useState, useCallback, useEffect, useMemo } from "react";
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
import { logAction } from "@/lib/operatorSession";
import { loadDistributions, saveDistributions } from "@/lib/persistence";

export default function DistributionsPage() {
  const [distributions, setDistributionsRaw] = useState<Distribution[]>(() => loadDistributions(DISTRIBUTIONS));
  const setDistributions = useCallback((updater: Distribution[] | ((prev: Distribution[]) => Distribution[])) => {
    setDistributionsRaw(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      saveDistributions(next);
      return next;
    });
  }, []);
  const [distModal, setDistModal] = useState<Distribution | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"card" | "table">("card");

  const [newName, setNewName] = useState("");
  const [newFund, setNewFund] = useState("");
  const [newAmount, setNewAmount] = useState("");
  const [newDate, setNewDate] = useState("");
  const [newType, setNewType] = useState("Profit Share");
  const [newMethod, setNewMethod] = useState("Wire Transfer");
  const [newStatus, setNewStatus] = useState("Scheduled");
  const [newNotes, setNewNotes] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);

  const totalDistributed = distributions.reduce((sum, d) => sum + d.amount, 0);
  const paidAmount = distributions.filter(d => d.status === "Paid").reduce((sum, d) => sum + d.amount, 0);
  const scheduledAmount = distributions.filter(d => d.status === "Scheduled").reduce((sum, d) => sum + d.amount, 0);
  const cancelledAmount = distributions.filter(d => d.status === "Cancelled").reduce((sum, d) => sum + d.amount, 0);

  const fundBreakdown = useMemo(() => {
    return Object.entries(distributions.reduce((acc, d) => {
      acc[d.fund] = (acc[d.fund] || 0) + d.amount;
      return acc;
    }, {} as Record<string, number>));
  }, [distributions]);

  const handleAdd = useCallback(() => {
    if (!newName.trim()) { toast.error("Name is required"); return; }
    if (!newAmount.trim() || isNaN(Number(newAmount))) { toast.error("Valid amount is required"); return; }
    const nd: Distribution = {
      id: `rec_new_${Date.now()}`,
      name: newName.trim(),
      fund: newFund.trim() || "General Fund",
      amount: Number(newAmount),
      currency: "USD",
      date: newDate || new Date().toISOString().split("T")[0],
      type: newType,
      method: newMethod,
      status: newStatus as Distribution["status"],
      isPaid: newStatus === "Paid",
      ageDays: 0,
      notes: newNotes.trim() || undefined,
    };
    setDistributions(prev => [nd, ...prev]);
    setAddOpen(false);
    setNewName(""); setNewFund(""); setNewAmount(""); setNewDate(""); setNewNotes("");
    logAction("Distribution created", nd.name);
    toast.success(`Distribution "${nd.name}" added`);
  }, [newName, newFund, newAmount, newDate, newType, newMethod, newStatus, newNotes, setDistributions]);

  const metrics = [
    { label: "Total", value: formatCurrency(totalDistributed), icon: <DollarSign className="size-4 text-primary" />, sub: `${distributions.length} dist.` },
    { label: "Paid", value: formatCurrency(paidAmount), icon: <CheckCircle2 className="size-4 text-emerald-400" />, sub: `${distributions.filter(d => d.status === "Paid").length}` },
    { label: "Scheduled", value: formatCurrency(scheduledAmount), icon: <Clock className="size-4 text-blue-400" />, sub: `${distributions.filter(d => d.status === "Scheduled").length}` },
    { label: "Cancelled", value: formatCurrency(cancelledAmount), icon: <XCircle className="size-4 text-red-400" />, sub: `${distributions.filter(d => d.status === "Cancelled").length}` },
  ];

  return (
    <DashboardLayout title="Distributions" subtitle="LP PAYOUTS & DIVIDENDS">
      <div className="p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6 pb-24 md:pb-6">
        {/* Summary metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 sm:h-24 rounded-lg" />)
          ) : (
            metrics.map((m, i) => (
              <motion.div
                key={m.label}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05, duration: 0.3 }}
                className="bg-card border border-border rounded-lg p-3 sm:p-4"
              >
                <div className="flex items-center gap-1.5 sm:gap-2 mb-1 sm:mb-2">
                  {m.icon}
                  <span className="text-[9px] sm:text-[11px] uppercase tracking-[0.06em] text-muted-foreground font-medium">{m.label}</span>
                </div>
                <span className="text-base sm:text-2xl font-mono font-semibold text-foreground">{m.value}</span>
                <p className="text-[9px] sm:text-[10px] font-mono text-muted-foreground mt-0.5 sm:mt-1">{m.sub}</p>
              </motion.div>
            ))
          )}
        </div>

        {/* Actions bar */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1 bg-secondary/50 rounded-lg p-0.5">
            <button onClick={() => setViewMode("card")} className={cn("p-1.5 sm:p-2 rounded-md transition-colors touch-manipulation", viewMode === "card" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground")}>
              <LayoutGrid className="size-4" />
            </button>
            <button onClick={() => setViewMode("table")} className={cn("p-1.5 sm:p-2 rounded-md transition-colors touch-manipulation hidden sm:block", viewMode === "table" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground")}>
              <List className="size-4" />
            </button>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="text-xs h-9 min-h-[36px] touch-manipulation hidden sm:flex" onClick={() => { exportAllDistributionsPdf(distributions); toast.success("Summary PDF downloaded"); }}>
              <FileDown className="size-3.5 mr-1" /> Export
            </Button>
            <Button size="sm" className="text-xs h-9 min-h-[36px] touch-manipulation" onClick={() => setAddOpen(true)}>
              <Plus className="size-3.5 mr-1" /> New
            </Button>
          </div>
        </div>

        {/* Card View (mobile-friendly) */}
        {viewMode === "card" && !loading && (
          <div className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-sm font-semibold text-foreground">All Distributions</h2>
              <span className="text-[10px] font-mono text-emerald-400">{formatCurrency(totalDistributed)}</span>
            </div>
            {distributions.length === 0 ? (
              <div className="p-12 text-center bg-card border border-border rounded-lg">
                <DollarSign className="size-8 text-muted-foreground mx-auto mb-3 opacity-40" />
                <p className="text-sm text-muted-foreground">No distributions recorded yet.</p>
              </div>
            ) : (
              <AnimatePresence>
                {distributions.map((dist, i) => {
                  const dc = DIST_STATUS_CONFIG[dist.status];
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
                          <span className="text-xs font-medium text-foreground">{dist.name}</span>
                          <p className="text-[10px] text-muted-foreground mt-0.5">{dist.fund}</p>
                        </div>
                        <span className="text-sm font-mono font-semibold text-foreground flex-shrink-0">{formatCurrency(dist.amount)}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        {dc && <StatusBadge label={dc.label} bg={dc.bg} dot={dc.dot} />}
                        <span className="text-[10px] font-mono text-muted-foreground">{formatDate(dist.date)}</span>
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
            <div className="px-4 py-3 border-b border-border flex items-center justify-between">
              <h2 className="text-sm font-semibold text-foreground">All Distributions</h2>
              <span className="text-[10px] font-mono text-emerald-400">{formatCurrency(totalDistributed)} total</span>
            </div>
            {distributions.length === 0 ? (
              <div className="p-12 text-center">
                <DollarSign className="size-8 text-muted-foreground mx-auto mb-3 opacity-40" />
                <p className="text-sm text-muted-foreground">No distributions recorded yet.</p>
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
                      <TableHead className="text-[11px] uppercase tracking-[0.06em] font-medium text-muted-foreground hidden lg:table-cell">Type</TableHead>
                      <TableHead className="text-[11px] uppercase tracking-[0.06em] font-medium text-muted-foreground hidden lg:table-cell">Method</TableHead>
                      <TableHead className="text-[11px] uppercase tracking-[0.06em] font-medium text-muted-foreground">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {distributions.map(dist => {
                      const dc = DIST_STATUS_CONFIG[dist.status];
                      return (
                        <TableRow key={dist.id} className="cursor-pointer hover:bg-accent/30 active:bg-accent/40 touch-manipulation" onClick={() => setDistModal(dist)}>
                          <TableCell>
                            <div>
                              <span className="text-xs text-foreground font-medium">{dist.name}</span>
                              {dist.notes && <p className="text-[10px] text-muted-foreground mt-0.5 truncate max-w-[200px]">{dist.notes}</p>}
                            </div>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground hidden md:table-cell">{dist.fund}</TableCell>
                          <TableCell className="text-xs font-mono text-muted-foreground hidden md:table-cell">{formatDate(dist.date)}</TableCell>
                          <TableCell className="text-xs font-mono font-medium text-foreground">{formatCurrency(dist.amount)}</TableCell>
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

        {/* Fund breakdown */}
        {!loading && (
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
                      {distributions.filter(d => d.fund === fund).length} distribution(s)
                    </p>
                  </div>
                  <span className="text-sm font-mono font-semibold text-foreground flex-shrink-0">{formatCurrency(amount)}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </div>

      {/* Distribution Detail Modal */}
      <Dialog open={!!distModal} onOpenChange={(open) => !open && setDistModal(null)}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          {distModal && (
            <>
              <DialogHeader>
                <DialogTitle className="text-sm">{distModal.name}</DialogTitle>
                <DialogDescription className="text-[10px] font-mono">{distModal.fund}</DialogDescription>
              </DialogHeader>
              <div className="space-y-3 py-2">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium block mb-1">Amount</span>
                    <span className="text-sm font-mono font-semibold text-foreground">{formatCurrency(distModal.amount)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium block mb-1">Date</span>
                    <span className="text-xs font-mono text-foreground">{formatDate(distModal.date)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium block mb-1">Type</span>
                    <span className="text-xs text-foreground">{distModal.type}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium block mb-1">Method</span>
                    <span className="text-xs text-foreground">{distModal.method}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium block mb-1">Status</span>
                    {DIST_STATUS_CONFIG[distModal.status] && (
                      <StatusBadge label={DIST_STATUS_CONFIG[distModal.status].label} bg={DIST_STATUS_CONFIG[distModal.status].bg} dot={DIST_STATUS_CONFIG[distModal.status].dot} />
                    )}
                  </div>
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium block mb-1">Age</span>
                    <span className="text-xs font-mono text-foreground">{distModal.ageDays} days</span>
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
                <Button variant="outline" size="sm" className="text-xs h-9 min-h-[36px] w-full sm:w-auto touch-manipulation" onClick={() => { exportDistributionPdf(distModal); toast.success("PDF downloaded"); }}>
                  <FileDown className="size-3.5 mr-1" /> Export PDF
                </Button>
                <Button variant="ghost" size="sm" className="text-xs h-9 min-h-[36px] w-full sm:w-auto touch-manipulation" onClick={() => setDistModal(null)}>Close</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Add Distribution Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-sm">New Distribution</DialogTitle>
            <DialogDescription className="text-[10px] font-mono">Record a new distribution or payout</DialogDescription>
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
                <Label className="text-xs mb-1">Amount ($)</Label>
                <Input value={newAmount} onChange={(e) => setNewAmount(e.target.value)} placeholder="250000" type="number" className="h-9 min-h-[36px] text-xs" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs mb-1">Date</Label>
                <Input value={newDate} onChange={(e) => setNewDate(e.target.value)} type="date" className="h-9 min-h-[36px] text-xs" />
              </div>
              <div>
                <Label className="text-xs mb-1">Type</Label>
                <Select value={newType} onValueChange={setNewType}>
                  <SelectTrigger className="h-9 min-h-[36px] text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>{["Profit Share", "Return of Capital", "Dividend", "Interest", "Other"].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs mb-1">Method</Label>
                <Select value={newMethod} onValueChange={setNewMethod}>
                  <SelectTrigger className="h-9 min-h-[36px] text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>{["Wire Transfer", "ACH", "Check", "Crypto", "Other"].map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                </Select>
              </div>
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
            <Button size="sm" className="text-xs h-9 min-h-[36px] w-full sm:w-auto touch-manipulation" onClick={handleAdd}>
              <Plus className="size-3.5 mr-1" /> Add Distribution
            </Button>
            <Button variant="ghost" size="sm" className="text-xs h-9 min-h-[36px] w-full sm:w-auto touch-manipulation" onClick={() => setAddOpen(false)}>Cancel</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
