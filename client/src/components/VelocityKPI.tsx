// ============================================================================
// VelocityKPI — Velocity Compression KPI card for ATLAS dashboard
// Shows avg days-in-stage, total advances, recent advance timeline
// ============================================================================

import { cn } from "@/lib/utils";
import { useAgents } from "@/contexts/AgentContext";
import { Zap, TrendingDown, ArrowRight, Clock } from "lucide-react";
import { motion } from "framer-motion";

function formatDays(days: number | null): string {
  if (days === null || days === undefined) return "—";
  if (days < 1) return "<1d";
  return `${Math.round(days)}d`;
}

function timeAgo(date: Date): string {
  const now = Date.now();
  const diff = now - new Date(date).getTime();
  const hours = Math.floor(diff / 3_600_000);
  if (hours < 1) return "just now";
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "yesterday";
  return `${days}d ago`;
}

export default function VelocityKPI() {
  const { velocityMetrics } = useAgents();

  if (!velocityMetrics) {
    return (
      <div className="bg-card border border-border rounded-lg p-4 animate-pulse">
        <div className="h-4 w-32 bg-secondary rounded mb-3" />
        <div className="h-8 w-16 bg-secondary rounded mb-2" />
        <div className="h-3 w-48 bg-secondary rounded" />
      </div>
    );
  }

  const { avgDays, totalAdvances, recentAdvances } = velocityMetrics;
  const hasData = totalAdvances > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="bg-card border border-border rounded-lg p-4"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center size-7 rounded-md bg-blue-500/10">
            <Zap className="size-4 text-blue-400" />
          </div>
          <span className="text-[11px] uppercase tracking-[0.06em] text-muted-foreground font-medium">
            Velocity Compression
          </span>
        </div>
        {hasData && (
          <div className="flex items-center gap-1">
            <TrendingDown className="size-3 text-emerald-400" />
            <span className="text-[10px] font-mono text-emerald-400">optimizing</span>
          </div>
        )}
      </div>

      {/* Main metric */}
      <div className="flex items-baseline gap-3 mb-4">
        <span className="text-3xl font-semibold tracking-tight text-foreground font-mono">
          {formatDays(avgDays)}
        </span>
        <div className="flex flex-col">
          <span className="text-[10px] text-muted-foreground">avg days per stage</span>
          <span className="text-[10px] font-mono text-muted-foreground">
            {totalAdvances} total advances
          </span>
        </div>
      </div>

      {/* Recent advances timeline */}
      {recentAdvances.length > 0 && (
        <div className="space-y-2 border-t border-border pt-3">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
            Recent Advances
          </span>
          {recentAdvances.slice(0, 4).map((adv, i) => (
            <motion.div
              key={adv.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05, duration: 0.2 }}
              className="flex items-center justify-between gap-2"
            >
              <div className="flex items-center gap-2 min-w-0">
                <ArrowRight className="size-3 text-blue-400 flex-shrink-0" />
                <span className="text-xs text-foreground truncate max-w-[140px]">
                  {adv.ventureName}
                </span>
                <span className="text-[10px] text-muted-foreground font-mono flex-shrink-0">
                  {adv.fromStage} → {adv.toStage}
                </span>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <Clock className="size-3 text-muted-foreground" />
                <span className="text-[10px] font-mono text-muted-foreground">
                  {adv.daysInStage}d
                </span>
                <span className="text-[9px] text-muted-foreground/50">
                  · {timeAgo(adv.advancedAt)}
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {!hasData && (
        <div className="text-center py-4">
          <p className="text-xs text-muted-foreground">No velocity data yet</p>
          <p className="text-[10px] text-muted-foreground/60 mt-1">
            Run the Velocity Agent to start tracking stage advances
          </p>
        </div>
      )}
    </motion.div>
  );
}
