// ============================================================================
// Sector Pulse Panel — Upgrade 4
// Collapsible section showing per-sector health metrics
// Columns: Sector Name | Ventures | Avg Completion | Overdue | Status Bar
// ============================================================================

import { cn } from "@/lib/utils";
import { ChevronDown, ChevronUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useMemo } from "react";

interface VentureData {
  id: number;
  name: string;
  sector: string;
  completionRate: number;
  overdueTasks: number;
  healthScore: number;
  status: string;
}

interface SectorPulsePanelProps {
  ventures: VentureData[];
}

interface SectorRow {
  sector: string;
  ventureCount: number;
  avgCompletion: number;
  overdueCount: number;
  health: "green" | "amber" | "red" | "gray";
  healthLabel: string;
}

function getHealthColor(health: string): string {
  switch (health) {
    case "green": return "#4ADE80";
    case "amber": return "#F59E0B";
    case "red": return "#EF4444";
    default: return "rgba(255,255,255,0.15)";
  }
}

export default function SectorPulsePanel({ ventures }: SectorPulsePanelProps) {
  const [expanded, setExpanded] = useState(false);

  const sectorData = useMemo(() => {
    const map = new Map<string, VentureData[]>();
    for (const v of ventures) {
      const list = map.get(v.sector) || [];
      list.push(v);
      map.set(v.sector, list);
    }

    const rows: SectorRow[] = [];
    for (const [sector, vList] of Array.from(map)) {
      const avgCompletion = Math.round(vList.reduce((s: number, v: VentureData) => s + v.completionRate, 0) / vList.length);
      const overdueCount = vList.filter((v: VentureData) => v.overdueTasks > 0).length;
      const hasOnHold = vList.some((v: VentureData) => v.status === "On hold");

      let health: SectorRow["health"] = "green";
      let healthLabel = "On Track";

      if (overdueCount >= 3) {
        health = "red";
        healthLabel = "Critical";
      } else if (overdueCount > 0) {
        health = "amber";
        healthLabel = "At Risk";
      } else if (hasOnHold && avgCompletion === 0) {
        health = "amber";
        healthLabel = "On Hold";
      } else if (avgCompletion === 0 && vList.every((v: VentureData) => v.overdueTasks === 0 && v.healthScore < 50)) {
        health = "gray";
        healthLabel = "Inactive";
      }

      rows.push({ sector, ventureCount: vList.length, avgCompletion, overdueCount, health, healthLabel });
    }

    // Sort: red first, then amber, then green, then gray
    const order = { red: 0, amber: 1, green: 2, gray: 3 };
    rows.sort((a, b) => order[a.health] - order[b.health]);
    return rows;
  }, [ventures]);

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      {/* Header — always visible */}
      <div
        className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-accent/20 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-foreground">Sector Pulse</span>
          <span className="text-[10px] font-mono text-muted-foreground">
            {sectorData.length} sectors · {ventures.length} ventures
          </span>
        </div>
        {expanded ? (
          <ChevronUp className="size-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="size-4 text-muted-foreground" />
        )}
      </div>

      {/* Expandable content */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="border-t border-border/30">
              {/* Table header */}
              <div className="grid grid-cols-[1fr_80px_100px_80px_1fr] gap-3 px-4 py-2 text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                <span>Sector</span>
                <span className="text-center">Ventures</span>
                <span className="text-center">Avg Completion</span>
                <span className="text-center">Overdue</span>
                <span>Status</span>
              </div>

              {/* Rows */}
              {sectorData.map((row, i) => {
                const barColor = getHealthColor(row.health);
                return (
                  <motion.div
                    key={row.sector}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04, duration: 0.2 }}
                    className={cn(
                      "grid grid-cols-[1fr_80px_100px_80px_1fr] gap-3 px-4 py-2.5 items-center",
                      i < sectorData.length - 1 && "border-b border-border/20"
                    )}
                  >
                    {/* Sector name */}
                    <div className="flex items-center gap-2">
                      <div className="size-2 rounded-full flex-shrink-0" style={{ backgroundColor: barColor }} />
                      <span className="text-xs font-medium text-foreground">{row.sector}</span>
                    </div>

                    {/* Venture count */}
                    <span className="text-xs font-mono text-center text-muted-foreground">{row.ventureCount}</span>

                    {/* Avg completion */}
                    <span className="text-xs font-mono text-center text-muted-foreground">{row.avgCompletion}%</span>

                    {/* Overdue count */}
                    <span className={cn(
                      "text-xs font-mono text-center",
                      row.overdueCount > 0 ? "text-red-400 font-medium" : "text-muted-foreground"
                    )}>
                      {row.overdueCount}
                    </span>

                    {/* Status bar */}
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 rounded-full bg-secondary/50 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${Math.max(row.avgCompletion, 3)}%`,
                            backgroundColor: barColor,
                          }}
                        />
                      </div>
                      <span
                        className="text-[10px] font-medium min-w-[50px] text-right"
                        style={{ color: barColor }}
                      >
                        {row.healthLabel}
                      </span>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
