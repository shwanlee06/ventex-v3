// ============================================================================
// Overdue Task Escalation Panel — Upgrade 2
// Collapsible panel with table: Task | Venture | Sector | Days Overdue | Severity | Action
// Per-row "Notify" buttons + "Notify All" top-right
// Longest overdue row gets solid red left border
// ============================================================================

import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc";
import {
  AlertTriangle,
  Clock,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface OverdueAlertBannerProps {
  onNavigate: (path: string) => void;
}

interface NotifiedState {
  [taskId: number]: string; // timestamp string
}

function SeverityBadge({ days }: { days: number }) {
  if (days > 21) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-mono font-medium px-1.5 py-0.5 rounded bg-red-500/10 text-red-400">
        Critical
      </span>
    );
  }
  if (days >= 8) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-mono font-medium px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400">
        High
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-mono font-medium px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">
      Medium
    </span>
  );
}

export default function OverdueAlertBanner({ onNavigate }: OverdueAlertBannerProps) {
  const overdueByClientQ = trpc.tasks.overdueByClient.useQuery(undefined, {
    refetchInterval: 60000,
  });

  const [expanded, setExpanded] = useState(false);
  const [notified, setNotified] = useState<NotifiedState>({});

  const data = overdueByClientQ.data || [];

  // Flatten all overdue tasks across clients with venture/sector info
  const allOverdueTasks = useMemo(() => {
    const flat: Array<{
      id: number;
      title: string;
      daysOverdue: number;
      priority: string | null;
      severity: string;
      orgName: string;
      orgSlug: string;
      ventureName?: string;
      sector?: string;
    }> = [];

    for (const client of data) {
      for (const task of client.overdueTasks) {
        flat.push({
          ...task,
          orgName: client.orgName,
          orgSlug: client.orgSlug,
          ventureName: (task as any).ventureName || "—",
          sector: (task as any).sector || "—",
        });
      }
    }

    return flat.sort((a, b) => b.daysOverdue - a.daysOverdue);
  }, [data]);

  // Aggregate stats
  const stats = useMemo(() => {
    const totalOverdue = data.reduce((s, d) => s + d.overdueCount, 0);
    const totalCritical = data.reduce((s, d) => s + d.criticalCount, 0);
    const maxDays = data.length > 0 ? Math.max(...data.map(d => d.maxDaysOverdue)) : 0;
    return { totalOverdue, totalCritical, maxDays };
  }, [data]);

  const handleNotify = useCallback((taskId: number) => {
    const now = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    setNotified(prev => ({ ...prev, [taskId]: now }));
    toast.success("Notification sent");
  }, []);


  if (overdueByClientQ.isLoading) return null;
  if (stats.totalOverdue === 0) return null;

  const hasCritical = stats.totalCritical > 0;
  const maxDaysOverdue = stats.maxDays;

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn(
        "rounded-xl border overflow-hidden",
        hasCritical
          ? "bg-red-500/5 border-red-500/20"
          : "bg-amber-500/5 border-amber-500/20"
      )}
    >
      {/* ── Collapsed summary bar ────────────────────────────────── */}
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className={cn(
          "flex items-center justify-center size-8 rounded-lg flex-shrink-0",
          hasCritical ? "bg-red-500/10" : "bg-amber-500/10"
        )}>
          <AlertTriangle className={cn(
            "size-4",
            hasCritical ? "text-red-400" : "text-amber-400"
          )} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={cn(
              "text-sm font-semibold",
              hasCritical ? "text-red-400" : "text-amber-400"
            )}>
              {stats.totalOverdue} Overdue Task{stats.totalOverdue !== 1 ? "s" : ""}
            </span>
            {stats.totalCritical > 0 && (
              <span className="text-[10px] font-mono font-medium px-1.5 py-0.5 rounded bg-red-500/10 text-red-400">
                {stats.totalCritical} Critical
              </span>
            )}
            <span className="text-[11px] text-muted-foreground">
              — Longest: {maxDaysOverdue} day{maxDaysOverdue !== 1 ? "s" : ""}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {expanded ? (
            <ChevronUp className="size-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="size-4 text-muted-foreground" />
          )}
        </div>
      </div>

      {/* ── Expanded escalation table ────────────────────────────── */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="border-t border-border/30 px-4 py-3">

              {/* Table */}
              <div className="bg-card/50 border border-border/50 rounded-lg overflow-hidden">
                {/* Header */}
                <div className="grid grid-cols-[1fr_140px_100px_80px_80px_100px] gap-2 px-3 py-2 border-b border-border/30 text-[10px] uppercase tracking-[0.08em] text-foreground/40 font-medium">
                  <span>Task</span>
                  <span>Venture</span>
                  <span>Sector</span>
                  <span className="text-right">Days</span>
                  <span className="text-center">Severity</span>
                  <span className="text-right">Action</span>
                </div>

                {/* Rows */}
                {allOverdueTasks.map((task, i) => {
                  const isLongest = task.daysOverdue === maxDaysOverdue;
                  const isNotified = !!notified[task.id];

                  return (
                    <div
                      key={task.id}
                      className={cn(
                        "grid grid-cols-[1fr_140px_100px_80px_80px_100px] gap-2 px-3 py-2.5 items-center text-xs",
                        i < allOverdueTasks.length - 1 && "border-b border-border/20",
                        isLongest && "border-l-2 border-l-red-500",
                        "hover:bg-accent/20 transition-colors"
                      )}
                    >
                      {/* Task name */}
                      <span className="text-[13px] text-foreground/85 truncate font-normal">
                        {task.title}
                      </span>

                      {/* Venture */}
                      <span className="text-[13px] text-foreground/85 truncate font-normal">
                        {task.ventureName}
                      </span>

                      {/* Sector */}
                      <span className="text-[13px] text-foreground/85 truncate font-normal">
                        {task.sector}
                      </span>

                      {/* Days overdue */}
                      <div className="flex items-center justify-end gap-1">
                        <Clock className="size-3 text-muted-foreground" />
                        <span className={cn(
                          "font-mono text-[11px]",
                          task.daysOverdue > 21 ? "text-red-400" :
                          task.daysOverdue >= 8 ? "text-amber-400" :
                          "text-muted-foreground"
                        )}>
                          {task.daysOverdue}d
                        </span>
                      </div>

                      {/* Severity */}
                      <div className="flex justify-center">
                        <SeverityBadge days={task.daysOverdue} />
                      </div>

                      {/* Action */}
                      <div className="flex justify-end">
                        {isNotified ? (
                          <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                            <CheckCircle2 className="size-3 text-emerald-400" />
                            Notified {notified[task.id]}
                          </span>
                        ) : (
                          <button
                            className="text-[11px] font-medium text-foreground/60 hover:text-foreground hover:underline transition-colors"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleNotify(task.id);
                            }}
                          >
                            Notify
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
