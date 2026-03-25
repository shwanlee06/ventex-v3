// ============================================================================
// Overdue Alert Banner — Shows critical overdue tasks across all clients
// Designed for the ATLAS Command Center dashboard
// ============================================================================

import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc";
import {
  AlertTriangle,
  Clock,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Loader2,
  Bell,
  CheckCircle2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface OverdueAlertBannerProps {
  onNavigate: (path: string) => void;
}

function SeverityDot({ severity }: { severity: string }) {
  const color =
    severity === "critical" ? "bg-red-500" :
    severity === "warning" ? "bg-amber-500" :
    "bg-blue-500";
  return <span className={cn("size-1.5 rounded-full flex-shrink-0", color)} />;
}

export default function OverdueAlertBanner({ onNavigate }: OverdueAlertBannerProps) {
  const overdueByClientQ = trpc.tasks.overdueByClient.useQuery(undefined, {
    refetchInterval: 60000, // Refresh every minute
  });
  const scanAndNotify = trpc.tasks.scanAndNotify.useMutation({
    onSuccess: (result) => {
      if (result.notified > 0) {
        toast.success(`Sent ${result.notified} overdue notification${result.notified !== 1 ? "s" : ""}`);
      } else {
        toast.info("No overdue tasks to notify about");
      }
    },
    onError: (err) => toast.error(err.message),
  });

  const [expanded, setExpanded] = useState(false);

  const data = overdueByClientQ.data || [];

  // Aggregate stats
  const stats = useMemo(() => {
    const totalOverdue = data.reduce((s, d) => s + d.overdueCount, 0);
    const totalCritical = data.reduce((s, d) => s + d.criticalCount, 0);
    const clientsAffected = data.length;
    const maxDays = data.length > 0 ? Math.max(...data.map(d => d.maxDaysOverdue)) : 0;
    return { totalOverdue, totalCritical, clientsAffected, maxDays };
  }, [data]);

  // Don't render if no overdue tasks
  if (overdueByClientQ.isLoading) return null;
  if (stats.totalOverdue === 0) return null;

  const hasCritical = stats.totalCritical > 0;

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
      {/* ── Summary bar ────────────────────────────────────────────── */}
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
                {stats.totalCritical} critical
              </span>
            )}
          </div>
          <span className="text-[11px] text-muted-foreground">
            Across {stats.clientsAffected} client{stats.clientsAffected !== 1 ? "s" : ""} · longest overdue: {stats.maxDays} day{stats.maxDays !== 1 ? "s" : ""}
          </span>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <Button
            size="sm"
            variant="outline"
            className={cn(
              "h-7 text-[11px] gap-1",
              hasCritical ? "border-red-500/20 text-red-400 hover:bg-red-500/10" : "border-amber-500/20 text-amber-400 hover:bg-amber-500/10"
            )}
            onClick={(e) => {
              e.stopPropagation();
              scanAndNotify.mutate();
            }}
            disabled={scanAndNotify.isPending}
          >
            {scanAndNotify.isPending ? (
              <Loader2 className="size-3 animate-spin" />
            ) : (
              <Bell className="size-3" />
            )}
            Notify
          </Button>
          {expanded ? (
            <ChevronUp className="size-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="size-4 text-muted-foreground" />
          )}
        </div>
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
            <div className="border-t border-border/30 px-4 py-3 space-y-3">
              {data.map((client) => (
                <div
                  key={client.orgId}
                  className="bg-card/50 border border-border/50 rounded-lg p-3 hover:border-border transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    <button
                      onClick={() => onNavigate(`/clients/${client.orgSlug}`)}
                      className="flex items-center gap-2 text-sm font-medium text-foreground hover:text-primary transition-colors"
                    >
                      {client.orgName}
                      <ExternalLink className="size-3 opacity-50" />
                    </button>
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "text-[11px] font-mono font-medium px-1.5 py-0.5 rounded",
                        client.criticalCount > 0 ? "bg-red-500/10 text-red-400" : "bg-amber-500/10 text-amber-400"
                      )}>
                        {client.overdueCount} overdue
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    {client.overdueTasks.map((task) => (
                      <div
                        key={task.id}
                        className="flex items-center gap-2 text-xs"
                      >
                        <SeverityDot severity={task.severity} />
                        <span className="text-foreground truncate flex-1">{task.title}</span>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <Clock className="size-3 text-muted-foreground" />
                          <span className={cn(
                            "font-mono text-[11px]",
                            task.severity === "critical" ? "text-red-400" :
                            task.severity === "warning" ? "text-amber-400" :
                            "text-muted-foreground"
                          )}>
                            {task.daysOverdue}d
                          </span>
                        </div>
                        {task.priority === "High" && (
                          <span className="text-[9px] font-medium px-1 py-0.5 rounded bg-red-500/10 text-red-400">
                            HIGH
                          </span>
                        )}
                      </div>
                    ))}
                    {client.overdueCount > 5 && (
                      <span className="text-[10px] text-muted-foreground font-mono pl-4">
                        +{client.overdueCount - 5} more
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
