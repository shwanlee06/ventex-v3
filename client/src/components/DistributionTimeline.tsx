// Distribution Timeline — Upgrade 5
// Vertical timeline with summary pills (Paid/Upcoming) + chronological entries
// Each entry: left dot + connecting line + right content card

import { cn } from "@/lib/utils";
import { DollarSign, CheckCircle2, Clock } from "lucide-react";
import { motion } from "framer-motion";
import { useMemo } from "react";

interface Distribution {
  id: number;
  spvName: string | null;
  amount: number | null;
  status: string;
  date: string | Date | null;
  quarter?: string | null;
}

interface DistributionTimelineProps {
  distributions: Distribution[];
}

function formatAmount(amount: number): string {
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `$${Math.round(amount / 1_000)}K`;
  return `$${amount.toLocaleString()}`;
}

function formatDate(d: string | Date | null): string {
  if (!d) return "—";
  const date = new Date(d);
  const year = date.getFullYear();
  const month = date.getMonth();
  const quarter = Math.floor(month / 3) + 1;
  return `Q${quarter} ${year}`;
}

export default function DistributionTimeline({ distributions }: DistributionTimelineProps) {
  const { paid, upcoming, entries } = useMemo(() => {
    const paidDists = distributions.filter(d => d.status === "Paid");
    const upcomingDists = distributions.filter(d => d.status !== "Paid");

    const paidTotal = paidDists.reduce((s, d) => s + (d.amount || 0), 0);
    const upcomingTotal = upcomingDists.reduce((s, d) => s + (d.amount || 0), 0);

    // Sort chronologically
    const sorted = [...distributions].sort((a, b) => {
      const da = a.date ? new Date(a.date).getTime() : 0;
      const db = b.date ? new Date(b.date).getTime() : 0;
      return da - db;
    });

    return {
      paid: paidTotal,
      upcoming: upcomingTotal,
      entries: sorted,
    };
  }, [distributions]);

  if (distributions.length === 0) {
    return (
      <div className="bg-card border border-border rounded-xl p-4 sm:p-5">
        <div className="flex items-center gap-2 mb-3">
          <DollarSign className="size-4 text-primary" />
          <span className="text-sm font-semibold text-foreground">Distributions</span>
        </div>
        <p className="text-sm text-muted-foreground text-center py-4">No distributions recorded</p>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-xl p-4 sm:p-5">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <DollarSign className="size-4 text-primary" />
        <span className="text-sm font-semibold text-foreground">Distributions</span>
      </div>

      {/* Summary pills */}
      <div className="flex items-center gap-2 mb-5">
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
          <CheckCircle2 className="size-3 text-emerald-400" />
          <span className="text-[11px] font-medium text-emerald-400">
            Paid {formatAmount(paid)}
          </span>
        </div>
        {upcoming > 0 && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20">
            <Clock className="size-3 text-amber-400" />
            <span className="text-[11px] font-medium text-amber-400">
              Upcoming {formatAmount(upcoming)}
            </span>
          </div>
        )}
      </div>

      {/* Timeline */}
      <div className="relative pl-6">
        {/* Vertical line */}
        <div className="absolute left-[7px] top-2 bottom-2 w-px bg-border" />

        <div className="space-y-4">
          {entries.map((entry, i) => {
            const isPaid = entry.status === "Paid";
            const dotColor = isPaid ? "#4ADE80" : "#F59E0B";

            return (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.08, duration: 0.25 }}
                className="relative"
              >
                {/* Dot */}
                <div
                  className={cn(
                    "absolute -left-6 top-3 size-3.5 rounded-full border-2 z-10",
                    isPaid
                      ? "bg-emerald-400 border-emerald-400/30"
                      : "bg-amber-400 border-amber-400/30 animate-pulse"
                  )}
                  style={{ boxShadow: `0 0 8px ${dotColor}30` }}
                />

                {/* Content card */}
                <div
                  className={cn(
                    "border rounded-lg p-3",
                    isPaid
                      ? "bg-card border-border"
                      : "bg-amber-500/5 border-amber-500/20"
                  )}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-mono text-muted-foreground">
                      {formatDate(entry.date)}
                    </span>
                    <span
                      className={cn(
                        "text-[10px] font-medium px-1.5 py-0.5 rounded",
                        isPaid
                          ? "bg-emerald-500/10 text-emerald-400"
                          : "bg-amber-500/10 text-amber-400"
                      )}
                    >
                      {isPaid ? "PAID" : "UPCOMING"}
                    </span>
                  </div>
                  <div className="text-xs font-medium text-foreground">
                    {entry.spvName || "Unknown Fund"}
                  </div>
                  <div className="text-sm font-semibold font-mono text-foreground mt-1">
                    {entry.amount ? `$${entry.amount.toLocaleString()}` : "—"}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
