// ============================================================================
// VelocityKPI — 3-Tier Velocity Compression card for ATLAS dashboard
// Tier 0: No advances → empty state with prompt
// Tier 1: 1–2 advances → basic metrics + recent list
// Tier 2: 3+ advances → full sparkline + compression trend + stage breakdown
// ============================================================================

import { cn } from "@/lib/utils";
import { useAgents } from "@/contexts/AgentContext";
import {
  Zap,
  TrendingDown,
  TrendingUp,
  ArrowRight,
  Clock,
  Activity,
  BarChart3,
  Minus,
} from "lucide-react";
import { motion } from "framer-motion";
import { useMemo } from "react";

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

// ── Mini Sparkline ──────────────────────────────────────────────────────

function Sparkline({ values, className }: { values: number[]; className?: string }) {
  if (values.length < 2) return null;

  const width = 120;
  const height = 32;
  const padding = 2;
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = max - min || 1;

  const points = values.map((v, i) => ({
    x: padding + (i / (values.length - 1)) * (width - padding * 2),
    y: padding + (1 - (v - min) / range) * (height - padding * 2),
  }));

  const pathD = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(" ");

  // Gradient fill area
  const areaD = `${pathD} L ${points[points.length - 1].x.toFixed(1)} ${height} L ${points[0].x.toFixed(1)} ${height} Z`;

  // Determine trend color
  const isImproving = values.length >= 2 && values[values.length - 1] <= values[0];

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className={cn("overflow-visible", className)}
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id="sparkFill" x1="0" y1="0" x2="0" y2="1">
          <stop
            offset="0%"
            stopColor={isImproving ? "rgb(52, 211, 153)" : "rgb(251, 191, 36)"}
            stopOpacity="0.2"
          />
          <stop
            offset="100%"
            stopColor={isImproving ? "rgb(52, 211, 153)" : "rgb(251, 191, 36)"}
            stopOpacity="0"
          />
        </linearGradient>
      </defs>
      <path d={areaD} fill="url(#sparkFill)" />
      <path
        d={pathD}
        fill="none"
        stroke={isImproving ? "rgb(52, 211, 153)" : "rgb(251, 191, 36)"}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Last point dot */}
      <circle
        cx={points[points.length - 1].x}
        cy={points[points.length - 1].y}
        r="2.5"
        fill={isImproving ? "rgb(52, 211, 153)" : "rgb(251, 191, 36)"}
      />
    </svg>
  );
}

// ── Stage Breakdown Bar ─────────────────────────────────────────────────

function StageBreakdown({ advances }: { advances: any[] }) {
  const stageStats = useMemo(() => {
    const map: Record<string, { count: number; totalDays: number }> = {};
    for (const adv of advances) {
      const key = `${adv.fromStage} → ${adv.toStage}`;
      if (!map[key]) map[key] = { count: 0, totalDays: 0 };
      map[key].count += 1;
      map[key].totalDays += adv.daysInStage;
    }
    return Object.entries(map)
      .map(([transition, stats]) => ({
        transition,
        count: stats.count,
        avgDays: Math.round(stats.totalDays / stats.count),
      }))
      .sort((a, b) => b.count - a.count);
  }, [advances]);

  if (stageStats.length === 0) return null;

  return (
    <div className="space-y-1.5">
      {stageStats.slice(0, 3).map((s) => (
        <div key={s.transition} className="flex items-center justify-between gap-2">
          <span className="text-[10px] text-muted-foreground truncate max-w-[160px]">
            {s.transition}
          </span>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-[10px] font-mono text-foreground">{s.avgDays}d avg</span>
            <span className="text-[9px] text-muted-foreground/60">{s.count}x</span>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Main Component ──────────────────────────────────────────────────────

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

  // Determine tier
  const tier = totalAdvances === 0 ? 0 : totalAdvances <= 2 ? 1 : 2;

  // Sparkline data (days per advance, chronological order)
  const sparklineValues = useMemo(() => {
    if (!recentAdvances || recentAdvances.length < 2) return [];
    return [...recentAdvances].reverse().map((a: any) => a.daysInStage);
  }, [recentAdvances]);

  // Compression trend
  const compressionTrend = useMemo(() => {
    if (!recentAdvances || recentAdvances.length < 2) return null;
    const sorted = [...recentAdvances].reverse();
    const firstHalf = sorted.slice(0, Math.ceil(sorted.length / 2));
    const secondHalf = sorted.slice(Math.ceil(sorted.length / 2));
    const avgFirst = firstHalf.reduce((s: number, a: any) => s + a.daysInStage, 0) / firstHalf.length;
    const avgSecond = secondHalf.reduce((s: number, a: any) => s + a.daysInStage, 0) / secondHalf.length;
    if (avgFirst === 0) return null;
    const pct = Math.round(((avgFirst - avgSecond) / avgFirst) * 100);
    return { pct, improving: pct > 0 };
  }, [recentAdvances]);

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
        {tier >= 1 && (
          <div className="flex items-center gap-1">
            {compressionTrend?.improving ? (
              <>
                <TrendingDown className="size-3 text-emerald-400" />
                <span className="text-[10px] font-mono text-emerald-400">
                  {compressionTrend.pct}% faster
                </span>
              </>
            ) : compressionTrend && !compressionTrend.improving ? (
              <>
                <TrendingUp className="size-3 text-amber-400" />
                <span className="text-[10px] font-mono text-amber-400">
                  {Math.abs(compressionTrend.pct)}% slower
                </span>
              </>
            ) : (
              <>
                <Activity className="size-3 text-blue-400" />
                <span className="text-[10px] font-mono text-blue-400">tracking</span>
              </>
            )}
          </div>
        )}
      </div>

      {/* ── TIER 0: Empty State ──────────────────────────────────── */}
      {tier === 0 && (
        <div className="text-center py-6">
          <div className="flex items-center justify-center size-10 rounded-xl bg-secondary/30 mx-auto mb-3">
            <BarChart3 className="size-5 text-muted-foreground/40" />
          </div>
          <p className="text-xs text-muted-foreground">No velocity data yet</p>
          <p className="text-[10px] text-muted-foreground/60 mt-1">
            Run the Velocity Agent to start tracking stage advances
          </p>
        </div>
      )}

      {/* ── TIER 1: Basic Metrics (1–2 advances) ────────────────── */}
      {tier === 1 && (
        <>
          {/* Main metric */}
          <div className="flex items-baseline gap-3 mb-4">
            <span className="text-3xl font-semibold tracking-tight text-foreground font-mono">
              {formatDays(avgDays)}
            </span>
            <div className="flex flex-col">
              <span className="text-[10px] text-muted-foreground">avg days per stage</span>
              <span className="text-[10px] font-mono text-muted-foreground">
                {totalAdvances} advance{totalAdvances !== 1 ? "s" : ""}
              </span>
            </div>
          </div>

          {/* Recent advances */}
          {recentAdvances.length > 0 && (
            <div className="space-y-2 border-t border-border pt-3">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                Recent Advances
              </span>
              {recentAdvances.slice(0, 3).map((adv: any, i: number) => (
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
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <Clock className="size-3 text-muted-foreground" />
                    <span className="text-[10px] font-mono text-muted-foreground">
                      {adv.daysInStage}d
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ── TIER 2: Full Dashboard (3+ advances) ────────────────── */}
      {tier === 2 && (
        <>
          {/* Main metric row with sparkline */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-baseline gap-3">
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
            {/* Sparkline */}
            {sparklineValues.length >= 2 && (
              <Sparkline values={sparklineValues} className="w-[100px] h-[28px]" />
            )}
          </div>

          {/* Stage breakdown */}
          <div className="border-t border-border pt-3 mb-3">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
              Stage Transitions
            </span>
            <div className="mt-2">
              <StageBreakdown advances={recentAdvances} />
            </div>
          </div>

          {/* Recent advances (compact) */}
          <div className="border-t border-border pt-3">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
              Latest
            </span>
            <div className="mt-2 space-y-1.5">
              {recentAdvances.slice(0, 5).map((adv: any, i: number) => (
                <motion.div
                  key={adv.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04, duration: 0.2 }}
                  className="flex items-center justify-between gap-2"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <ArrowRight className="size-3 text-blue-400 flex-shrink-0" />
                    <span className="text-xs text-foreground truncate max-w-[120px]">
                      {adv.ventureName}
                    </span>
                    <span className="text-[10px] text-muted-foreground font-mono flex-shrink-0">
                      {adv.fromStage} → {adv.toStage}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
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
          </div>
        </>
      )}
    </motion.div>
  );
}
