// ============================================================================
// Distributions Page — Swiss Instrument — FULLY INTERACTIVE
// Dedicated distributions view with detail modals and summary cards
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
import { motion } from "framer-motion";
import { DollarSign, TrendingUp, Clock, XCircle, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export default function DistributionsPage() {
  const [distModal, setDistModal] = useState<Distribution | null>(null);

  const totalDistributed = DISTRIBUTIONS.reduce((sum, d) => sum + d.amount, 0);
  const paidAmount = DISTRIBUTIONS.filter(d => d.status === "Paid").reduce((sum, d) => sum + d.amount, 0);
  const scheduledAmount = DISTRIBUTIONS.filter(d => d.status === "Scheduled").reduce((sum, d) => sum + d.amount, 0);
  const cancelledAmount = DISTRIBUTIONS.filter(d => d.status === "Cancelled").reduce((sum, d) => sum + d.amount, 0);

  const metrics = [
    { label: "Total Distributed", value: formatCurrency(totalDistributed), icon: <DollarSign className="size-4 text-primary" />, sub: `${DISTRIBUTIONS.length} distributions` },
    { label: "Paid", value: formatCurrency(paidAmount), icon: <CheckCircle2 className="size-4 text-emerald-400" />, sub: `${DISTRIBUTIONS.filter(d => d.status === "Paid").length} paid` },
    { label: "Scheduled", value: formatCurrency(scheduledAmount), icon: <Clock className="size-4 text-blue-400" />, sub: `${DISTRIBUTIONS.filter(d => d.status === "Scheduled").length} upcoming` },
    { label: "Cancelled", value: formatCurrency(cancelledAmount), icon: <XCircle className="size-4 text-red-400" />, sub: `${DISTRIBUTIONS.filter(d => d.status === "Cancelled").length} cancelled` },
  ];

  return (
    <DashboardLayout title="Distributions" subtitle="LP PAYOUTS & DIVIDENDS">
      <div className="p-4 md:p-6 space-y-6">
        {/* Summary metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {metrics.map((m, i) => (
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
              <p className="text-[10px] font-mono text-muted-foreground mt-1">{m.sub}</p>
            </motion.div>
          ))}
        </div>

        {/* Distributions Table */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.3 }}
          className="bg-card border border-border rounded-lg overflow-hidden"
        >
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">All Distributions</h2>
            <span className="text-[10px] font-mono text-emerald-400">{formatCurrency(totalDistributed)} total</span>
          </div>

          {DISTRIBUTIONS.length === 0 ? (
            <div className="p-12 text-center">
              <DollarSign className="size-8 text-muted-foreground mx-auto mb-3 opacity-40" />
              <p className="text-sm text-muted-foreground">No distributions recorded yet.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-[11px] uppercase tracking-[0.06em] font-medium text-muted-foreground">Distribution</TableHead>
                  <TableHead className="text-[11px] uppercase tracking-[0.06em] font-medium text-muted-foreground">Fund</TableHead>
                  <TableHead className="text-[11px] uppercase tracking-[0.06em] font-medium text-muted-foreground">Date</TableHead>
                  <TableHead className="text-[11px] uppercase tracking-[0.06em] font-medium text-muted-foreground">Amount</TableHead>
                  <TableHead className="text-[11px] uppercase tracking-[0.06em] font-medium text-muted-foreground">Type</TableHead>
                  <TableHead className="text-[11px] uppercase tracking-[0.06em] font-medium text-muted-foreground">Method</TableHead>
                  <TableHead className="text-[11px] uppercase tracking-[0.06em] font-medium text-muted-foreground">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {DISTRIBUTIONS.map((dist) => {
                  const dc = DIST_STATUS_CONFIG[dist.status];
                  return (
                    <TableRow key={dist.id} className="cursor-pointer hover:bg-accent/30" onClick={() => setDistModal(dist)}>
                      <TableCell>
                        <div>
                          <span className="text-xs text-foreground font-medium">{dist.name}</span>
                          {dist.notes && <p className="text-[10px] text-muted-foreground mt-0.5 truncate max-w-[200px]">{dist.notes}</p>}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{dist.fund}</TableCell>
                      <TableCell className="text-xs font-mono text-muted-foreground">{formatDate(dist.date)}</TableCell>
                      <TableCell className="text-xs font-mono font-medium text-foreground">{formatCurrency(dist.amount)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{dist.type}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{dist.method}</TableCell>
                      <TableCell>{dc && <StatusBadge label={dc.label} bg={dc.bg} dot={dc.dot} />}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </motion.div>

        {/* Fund breakdown */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.3 }}
          className="bg-card border border-border rounded-lg"
        >
          <div className="px-4 py-3 border-b border-border">
            <h2 className="text-sm font-semibold text-foreground">By Fund</h2>
          </div>
          <div className="p-4 space-y-3">
            {Object.entries(DISTRIBUTIONS.reduce((acc, d) => {
              acc[d.fund] = (acc[d.fund] || 0) + d.amount;
              return acc;
            }, {} as Record<string, number>)).map(([fund, amount]) => (
              <div key={fund} className="flex items-center justify-between p-3 bg-secondary/20 rounded-md">
                <div>
                  <span className="text-xs font-medium text-foreground">{fund}</span>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {DISTRIBUTIONS.filter(d => d.fund === fund).length} distribution(s)
                  </p>
                </div>
                <span className="text-sm font-mono font-semibold text-foreground">{formatCurrency(amount)}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Distribution Detail Modal */}
      <Dialog open={!!distModal} onOpenChange={(open) => !open && setDistModal(null)}>
        <DialogContent className="sm:max-w-md">
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
              <DialogFooter>
                <Button variant="ghost" size="sm" className="text-xs" onClick={() => setDistModal(null)}>Close</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
