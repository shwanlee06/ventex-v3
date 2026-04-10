// Venture Health Matrix — Upgrade 3
// Scatter plot: X = Completion %, Y = Days since last activity (inverted)
// Dot color: green = Healthy, amber = At Risk, red = Critical/Overdue
// Dot size: proportional to overdue task count

import { cn } from "@/lib/utils";
import { useMemo, useState } from "react";
import { motion } from "framer-motion";

interface VentureData {
  id: number;
  name: string;
  sector: string;
  stage: string;
  completionRate: number;
  overdueTasks: number;
  healthScore: number;
  totalTasks: number;
  lastActivityDaysAgo?: number;
}

interface VentureHealthMatrixProps {
  ventures: VentureData[];
  onVentureClick?: (slug: string) => void;
}

// Compute days since last activity (simulated from health score + overdue)
function estimateDaysSinceActivity(v: VentureData): number {
  if (v.overdueTasks > 0) return Math.min(v.overdueTasks * 8 + 10, 55);
  if (v.totalTasks === 0 && v.completionRate === 0) return 45;
  if (v.healthScore >= 70) return Math.max(2, 15 - Math.floor(v.healthScore / 10));
  return Math.max(20, 60 - v.healthScore);
}

function getVentureColor(v: VentureData): string {
  if (v.overdueTasks > 0) return "#EF4444"; // red
  if (v.healthScore >= 70) return "#4ADE80"; // green
  return "#F59E0B"; // amber
}

function getDotRadius(v: VentureData): number {
  if (v.overdueTasks > 0) return 8 + v.overdueTasks * 2;
  if (v.totalTasks === 0) return 5;
  return 6;
}

export default function VentureHealthMatrix({ ventures, onVentureClick }: VentureHealthMatrixProps) {
  const [hoveredId, setHoveredId] = useState<number | null>(null);

  // Chart dimensions
  const width = 800;
  const height = 420;
  const padding = { top: 30, right: 30, bottom: 50, left: 60 };
  const plotW = width - padding.left - padding.right;
  const plotH = height - padding.top - padding.bottom;

  const plotData = useMemo(() => {
    return ventures.map(v => ({
      ...v,
      daysSinceActivity: v.lastActivityDaysAgo ?? estimateDaysSinceActivity(v),
      color: getVentureColor(v),
      radius: getDotRadius(v),
    }));
  }, [ventures]);

  // Scale functions
  const xScale = (val: number) => padding.left + (val / 100) * plotW;
  const yScale = (val: number) => padding.top + (val / 60) * plotH; // 0 at top (recent), 60 at bottom (old)

  // Grid lines
  const xTicks = [0, 25, 50, 75, 100];
  const yTicks = [0, 15, 30, 45, 60];

  const hoveredVenture = plotData.find(v => v.id === hoveredId);

  return (
    <div className="bg-card border border-border rounded-xl p-4 sm:p-5">
      <div className="relative w-full overflow-x-auto">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full min-w-[600px]"
          style={{ maxHeight: "420px" }}
        >
          {/* Background */}
          <rect x={padding.left} y={padding.top} width={plotW} height={plotH} fill="rgba(255,255,255,0.02)" rx="4" />

          {/* Grid lines */}
          {xTicks.map(tick => (
            <g key={`x-${tick}`}>
              <line
                x1={xScale(tick)} y1={padding.top}
                x2={xScale(tick)} y2={padding.top + plotH}
                stroke="rgba(255,255,255,0.06)" strokeDasharray="3,3"
              />
              <text
                x={xScale(tick)} y={height - 12}
                textAnchor="middle" fill="rgba(255,255,255,0.35)"
                fontSize="10" fontFamily="monospace"
              >
                {tick}%
              </text>
            </g>
          ))}
          {yTicks.map(tick => (
            <g key={`y-${tick}`}>
              <line
                x1={padding.left} y1={yScale(tick)}
                x2={padding.left + plotW} y2={yScale(tick)}
                stroke="rgba(255,255,255,0.06)" strokeDasharray="3,3"
              />
              <text
                x={padding.left - 8} y={yScale(tick) + 3}
                textAnchor="end" fill="rgba(255,255,255,0.35)"
                fontSize="10" fontFamily="monospace"
              >
                {tick}d
              </text>
            </g>
          ))}

          {/* Axis labels */}
          <text
            x={padding.left + plotW / 2} y={height - 0}
            textAnchor="middle" fill="rgba(255,255,255,0.4)"
            fontSize="11" fontFamily="system-ui"
          >
            Completion %
          </text>
          <text
            x={14} y={padding.top + plotH / 2}
            textAnchor="middle" fill="rgba(255,255,255,0.4)"
            fontSize="11" fontFamily="system-ui"
            transform={`rotate(-90, 14, ${padding.top + plotH / 2})`}
          >
            Days Since Activity
          </text>

          {/* Quadrant labels */}
          <text x={padding.left + 8} y={padding.top + 16} fill="rgba(74,222,128,0.25)" fontSize="9" fontFamily="system-ui">
            Active & Early
          </text>
          <text x={padding.left + plotW - 8} y={padding.top + 16} textAnchor="end" fill="rgba(74,222,128,0.25)" fontSize="9" fontFamily="system-ui">
            Active & Complete
          </text>
          <text x={padding.left + 8} y={padding.top + plotH - 8} fill="rgba(239,68,68,0.25)" fontSize="9" fontFamily="system-ui">
            Stalled & Early
          </text>
          <text x={padding.left + plotW - 8} y={padding.top + plotH - 8} textAnchor="end" fill="rgba(245,158,11,0.25)" fontSize="9" fontFamily="system-ui">
            Stalled & Complete
          </text>

          {/* Data points */}
          {plotData.map((v, i) => {
            const cx = xScale(v.completionRate);
            const cy = yScale(v.daysSinceActivity);
            const isHovered = hoveredId === v.id;
            const isHollow = v.totalTasks === 0 && v.overdueTasks === 0;

            return (
              <g
                key={v.id}
                onMouseEnter={() => setHoveredId(v.id)}
                onMouseLeave={() => setHoveredId(null)}
                className="cursor-pointer"
                onClick={() => onVentureClick?.(`/ventures/${(v as any).slug || v.id}`)}
              >
                <circle
                  cx={cx} cy={cy}
                  r={isHovered ? v.radius + 2 : v.radius}
                  fill={isHollow ? "transparent" : v.color}
                  stroke={v.color}
                  strokeWidth={isHollow ? 1.5 : 0}
                  opacity={isHovered ? 1 : 0.75}
                  style={{ transition: "all 0.15s ease" }}
                />
                {/* Label for hovered or overdue ventures */}
                {(isHovered || v.overdueTasks > 0) && (
                  <text
                    x={cx} y={cy - v.radius - 4}
                    textAnchor="middle"
                    fill={isHovered ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.5)"}
                    fontSize={isHovered ? "10" : "8"}
                    fontFamily="system-ui"
                    fontWeight={isHovered ? "500" : "400"}
                  >
                    {v.name.length > 20 ? v.name.slice(0, 18) + "…" : v.name}
                  </text>
                )}
              </g>
            );
          })}
        </svg>

        {/* Tooltip */}
        {hoveredVenture && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute top-2 right-2 bg-popover border border-border rounded-lg p-3 shadow-lg z-10 min-w-[200px]"
          >
            <div className="text-xs font-semibold text-foreground mb-1.5">{hoveredVenture.name}</div>
            <div className="space-y-1 text-[11px]">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Sector</span>
                <span className="text-foreground">{hoveredVenture.sector}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Stage</span>
                <span className="text-foreground">{hoveredVenture.stage}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Completion</span>
                <span className="text-foreground font-mono">{hoveredVenture.completionRate}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Overdue Tasks</span>
                <span className={cn("font-mono", hoveredVenture.overdueTasks > 0 ? "text-red-400" : "text-foreground")}>
                  {hoveredVenture.overdueTasks}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Days Inactive</span>
                <span className="text-foreground font-mono">{hoveredVenture.daysSinceActivity}d</span>
              </div>
            </div>
            <div className="mt-2 flex items-center gap-1.5">
              <div
                className="size-2 rounded-full"
                style={{ backgroundColor: hoveredVenture.color }}
              />
              <span className="text-[10px] text-muted-foreground">
                {hoveredVenture.overdueTasks > 0 ? "Critical" : hoveredVenture.healthScore >= 70 ? "Healthy" : "At Risk"}
              </span>
            </div>
          </motion.div>
        )}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-3 pt-3 border-t border-border/30">
        <div className="flex items-center gap-1.5">
          <div className="size-2.5 rounded-full bg-[#4ADE80]" />
          <span className="text-[10px] text-muted-foreground">Healthy</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="size-2.5 rounded-full bg-[#F59E0B]" />
          <span className="text-[10px] text-muted-foreground">At Risk</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="size-2.5 rounded-full bg-[#EF4444]" />
          <span className="text-[10px] text-muted-foreground">Overdue</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="size-2.5 rounded-full border border-[#F59E0B]" />
          <span className="text-[10px] text-muted-foreground">No Tasks</span>
        </div>
        <span className="text-[10px] text-muted-foreground/50 ml-auto">Dot size = overdue count</span>
      </div>
    </div>
  );
}
