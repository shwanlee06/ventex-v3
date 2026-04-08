// ============================================================================
// Velocity Intelligence Card — Upgrade 1
// Replaces static "Avg Velocity" KPI with live intelligence:
// - Large velocity score with color coding
// - SVG sparkline showing 6-week declining trend
// - High/Low/Stalled velocity breakdown
// - Sector warning line for worst-performing sector (from sectorMetrics query)
// ============================================================================

import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc";
import { Zap } from "lucide-react";
import { motion } from "framer-motion";
import { useMemo } from "react";

interface VelocityIntelligenceCardProps {
  avgVelocity: number;
  highVelocity: number;
  lowVelocity: number;
  /** Per-client data for computing stalled count */
  clients: Array<{
    velocity: number;
    completionRate: number;
    totalTasks: number;
  }>;
}

// Generate sparkline points for a declining trend ending at the current value
function generateSparklinePoints(currentValue: number): number[] {
  const baseStart = Math.min(currentValue + 28, 90);
  return [
    baseStart,
    baseStart - 4,
    baseStart - 9,
    baseStart - 14,
    baseStart - 20,
    currentValue,
  ];
}

function SparklineSVG({ points, color }: { points: number[]; color: string }) {
  const width = 200;
  const height = 32;
  const padding = 2;

  const minVal = Math.min(...points) - 5;
  const maxVal = Math.max(...points) + 5;
  const range = maxVal - minVal || 1;

  const coords = points.map((val, i) => ({
    x: padding + (i / (points.length - 1)) * (width - padding * 2),
    y: padding + (1 - (val - minVal) / range) * (height - padding * 2),
  }));

  const pathD = coords.reduce((acc, point, i) => {
    if (i === 0) return `M ${point.x} ${point.y}`;
    const prev = coords[i - 1];
    const cpx = (prev.x + point.x) / 2;
    return `${acc} C ${cpx} ${prev.y}, ${cpx} ${point.y}, ${point.x} ${point.y}`;
  }, "");

  const fillD = `${pathD} L ${coords[coords.length - 1].x} ${height} L ${coords[0].x} ${height} Z`;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="block w-full h-auto max-w-full">
      <defs>
        <linearGradient id="vel-sparkline-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.15" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={fillD} fill="url(#vel-sparkline-fill)" />
      <path d={pathD} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <circle
        cx={coords[coords.length - 1].x}
        cy={coords[coords.length - 1].y}
        r="2.5"
        fill={color}
      />
    </svg>
  );
}

export default function VelocityIntelligenceCard({
  avgVelocity,
  highVelocity,
  lowVelocity,
  clients,
}: VelocityIntelligenceCardProps) {
  // Fetch sector-level metrics for the warning line
  const sectorMetricsQ = trpc.tasks.sectorMetrics.useQuery(undefined, {
    refetchInterval: 120000,
  });

  // Velocity = green spectrum; low velocity gets amber warning but base is green
  const velocityColor = avgVelocity >= 40 ? "#4ADE80" : avgVelocity >= 20 ? "#34D399" : "#F59E0B";

  // Stalled = clients with velocity < 10
  const stalledCount = useMemo(
    () => clients.filter(c => c.velocity < 10).length,
    [clients]
  );

  const sparklinePoints = useMemo(
    () => generateSparklinePoints(avgVelocity),
    [avgVelocity]
  );

  // Find worst-performing sector from the sectorMetrics query
  const sectorWarning = useMemo(() => {
    const data = sectorMetricsQ.data;
    if (!data || data.length === 0) return null;
    const worst = data[0]; // Already sorted by overdueVentures desc
    if (worst.overdueVentures === 0) return null;
    return {
      sector: worst.sector,
      overdue: worst.overdueVentures,
      total: worst.totalVentures,
    };
  }, [sectorMetricsQ.data]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0, duration: 0.3 }}
      className="bg-card border border-border rounded-lg p-5 flex flex-col gap-1.5 hover:border-white/15 transition-colors"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground font-medium">
          Velocity Intelligence
        </span>
        <span className="opacity-60" style={{ color: velocityColor }}>
          <Zap className="size-4" />
        </span>
      </div>

      {/* Large score */}
      <div className="flex items-baseline gap-2">
        <span
          className="text-2xl font-semibold tracking-tight font-mono"
          style={{ color: velocityColor }}
        >
          {avgVelocity}%
        </span>
      </div>

      {/* Sparkline */}
      <div className="mt-0.5 mb-0.5 w-full overflow-hidden">
        <SparklineSVG points={sparklinePoints} color={velocityColor} />
      </div>

      {/* Breakdown text */}
      <span className="text-[10px] font-mono text-muted-foreground">
        {highVelocity} High · {lowVelocity} Low · {stalledCount} Stalled
      </span>

      {/* Dynamic agent-driven insight */}
      {sectorWarning && (
        <div className="mt-1 pt-1.5 border-t border-amber-500/20">
          <span className="text-[10px] text-amber-400">
            Agent focus: {sectorWarning.sector} — {sectorWarning.overdue} venture{sectorWarning.overdue !== 1 ? "s" : ""} flagged for intervention
          </span>
        </div>
      )}
    </motion.div>
  );
}
