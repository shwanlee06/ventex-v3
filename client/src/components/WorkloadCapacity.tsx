// ============================================================================
// Workload Capacity — Shows task workload per ATLAS team member
// Designed for the ATLAS Team page
// ============================================================================

import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc";
import {
  BarChart3,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Loader2,
  ChevronDown,
  ChevronUp,
  User,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useMemo } from "react";
import { Skeleton } from "@/components/ui/skeleton";

function CapacityBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; bg: string; text: string }> = {
    available: { label: "Available", bg: "bg-emerald-500/10", text: "text-emerald-400" },
    busy: { label: "Busy", bg: "bg-amber-500/10", text: "text-amber-400" },
    overloaded: { label: "Overloaded", bg: "bg-red-500/10", text: "text-red-400" },
  };
  const c = config[status] || config.available;
  return (
    <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded", c.bg, c.text)}>
      {c.label}
    </span>
  );
}

function CompletionBar({ rate }: { rate: number }) {
  const color = rate >= 70 ? "#4ADE80" : rate >= 40 ? "#F59E0B" : "#EF4444";
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-1.5 rounded-full bg-secondary overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${rate}%`, backgroundColor: color }}
        />
      </div>
      <span className="text-[10px] font-mono text-muted-foreground">{rate}%</span>
    </div>
  );
}

export default function WorkloadCapacity() {
  const workloadQ = trpc.tasks.workloadSummary.useQuery(undefined, {
    refetchInterval: 60000,
  });
  const [expanded, setExpanded] = useState(true);

  const data = workloadQ.data || [];

  // Aggregate stats
  const stats = useMemo(() => {
    const totalAssigned = data.reduce((s, d) => s + d.assigned, 0);
    const totalOverdue = data.reduce((s, d) => s + d.overdue, 0);
    const overloaded = data.filter(d => d.capacityStatus === "overloaded").length;
    const available = data.filter(d => d.capacityStatus === "available").length;
    return { totalAssigned, totalOverdue, overloaded, available };
  }, [data]);

  if (workloadQ.isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-10 rounded-lg" />
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-lg" />)}
        </div>
      </div>
    );
  }

  if (data.length === 0) return null;

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      {/* ── Header ──────────────────────────────────────────────────── */}
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-accent/20 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center justify-center size-7 rounded-md bg-blue-500/10 flex-shrink-0">
          <BarChart3 className="size-4 text-blue-400" />
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-sm font-semibold text-foreground">Workload Capacity</span>
          <div className="flex items-center gap-3 mt-0.5">
            <span className="text-[10px] text-muted-foreground font-mono">
              {stats.totalAssigned} tasks assigned
            </span>
            {stats.totalOverdue > 0 && (
              <span className="text-[10px] text-red-400 font-mono flex items-center gap-1">
                <AlertTriangle className="size-2.5" />
                {stats.totalOverdue} overdue
              </span>
            )}
            {stats.overloaded > 0 && (
              <span className="text-[10px] text-amber-400 font-mono">
                {stats.overloaded} overloaded
              </span>
            )}
          </div>
        </div>
        {expanded ? (
          <ChevronUp className="size-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="size-4 text-muted-foreground" />
        )}
      </div>

      {/* ── Expanded detail ─────────────────────────────────────────── */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="border-t border-border">
              {/* Column headers */}
              <div className="grid grid-cols-[1fr_60px_60px_60px_80px_80px] gap-2 px-4 py-2 text-[10px] uppercase tracking-wider text-muted-foreground font-medium border-b border-border/50">
                <span>Member</span>
                <span className="text-center">Assigned</span>
                <span className="text-center">Done</span>
                <span className="text-center">Overdue</span>
                <span className="text-center">Completion</span>
                <span className="text-center">Capacity</span>
              </div>

              {/* Rows */}
              {data.map((member, i) => (
                <motion.div
                  key={member.memberId}
                  initial={{ opacity: 0, x: -4 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.03, duration: 0.2 }}
                  className="grid grid-cols-[1fr_60px_60px_60px_80px_80px] gap-2 px-4 py-2.5 items-center hover:bg-accent/20 transition-colors border-b border-border/30 last:border-0"
                >
                  {/* Member name */}
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="size-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-[9px] font-semibold text-primary">
                        {member.memberName.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                      </span>
                    </div>
                    <span className="text-xs font-medium text-foreground truncate">{member.memberName}</span>
                  </div>

                  {/* Assigned */}
                  <span className="text-xs font-mono text-foreground text-center">{member.assigned}</span>

                  {/* Completed */}
                  <span className="text-xs font-mono text-emerald-400 text-center">{member.completed}</span>

                  {/* Overdue */}
                  <span className={cn(
                    "text-xs font-mono text-center",
                    member.overdue > 0 ? "text-red-400" : "text-muted-foreground"
                  )}>
                    {member.overdue > 0 ? member.overdue : "—"}
                  </span>

                  {/* Completion rate */}
                  <div className="flex justify-center">
                    <CompletionBar rate={member.completionRate} />
                  </div>

                  {/* Capacity status */}
                  <div className="flex justify-center">
                    <CapacityBadge status={member.capacityStatus} />
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
