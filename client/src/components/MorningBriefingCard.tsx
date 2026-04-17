// F3-024: AI Morning Briefing Card
// Provides a daily summary of portfolio status and recommended actions

import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { Brain, ChevronDown, ChevronUp, AlertTriangle, CheckCircle2, TrendingUp, Zap } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface MorningBriefingCardProps {
  overdueTasks: number;
  clientsNeedingAttention: number;
  totalClients: number;
  totalOpenTasks: number;
  avgVelocity: number;
  overallCompletion: number;
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export default function MorningBriefingCard({
  overdueTasks,
  clientsNeedingAttention,
  totalClients,
  totalOpenTasks,
  avgVelocity,
  overallCompletion,
}: MorningBriefingCardProps) {
  const [expanded, setExpanded] = useState(false);

  const briefing = useMemo(() => {
    const items: { icon: typeof AlertTriangle; text: string; severity: "red" | "amber" | "green" }[] = [];

    // Overdue tasks alert
    if (overdueTasks > 0) {
      items.push({
        icon: AlertTriangle,
        text: `${overdueTasks} overdue task${overdueTasks > 1 ? "s" : ""} require immediate attention`,
        severity: "red",
      });
    }

    // Clients needing attention
    if (clientsNeedingAttention > 0) {
      items.push({
        icon: AlertTriangle,
        text: `${clientsNeedingAttention} of ${totalClients} client${totalClients > 1 ? "s" : ""} have overdue items`,
        severity: clientsNeedingAttention > totalClients / 2 ? "red" : "amber",
      });
    }

    // Velocity assessment
    if (avgVelocity >= 70) {
      items.push({
        icon: TrendingUp,
        text: `Portfolio velocity is strong at ${avgVelocity}% — maintain current pace`,
        severity: "green",
      });
    } else if (avgVelocity >= 40) {
      items.push({
        icon: Zap,
        text: `Portfolio velocity at ${avgVelocity}% — consider prioritizing stalled ventures`,
        severity: "amber",
      });
    } else {
      items.push({
        icon: AlertTriangle,
        text: `Portfolio velocity is low at ${avgVelocity}% — review blocked tasks and escalate`,
        severity: "red",
      });
    }

    // Completion rate
    if (overallCompletion >= 80) {
      items.push({
        icon: CheckCircle2,
        text: `${overallCompletion}% overall completion — strong execution across portfolio`,
        severity: "green",
      });
    } else if (overallCompletion >= 50) {
      items.push({
        icon: TrendingUp,
        text: `${overallCompletion}% overall completion — ${totalOpenTasks} tasks remaining`,
        severity: "amber",
      });
    }

    // All clear
    if (overdueTasks === 0 && clientsNeedingAttention === 0) {
      items.push({
        icon: CheckCircle2,
        text: "All clients on track — no overdue items across the portfolio",
        severity: "green",
      });
    }

    return items;
  }, [overdueTasks, clientsNeedingAttention, totalClients, totalOpenTasks, avgVelocity, overallCompletion]);

  const worstSeverity = briefing.some(b => b.severity === "red")
    ? "red"
    : briefing.some(b => b.severity === "amber")
    ? "amber"
    : "green";

  const borderColor = worstSeverity === "red"
    ? "border-red-500/30"
    : worstSeverity === "amber"
    ? "border-amber-500/30"
    : "border-emerald-500/30";

  const headerColor = worstSeverity === "red"
    ? "text-red-400"
    : worstSeverity === "amber"
    ? "text-amber-400"
    : "text-emerald-400";

  return (
    <div className={cn("bg-card border rounded-xl overflow-hidden transition-colors", borderColor)}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-accent/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className={cn("flex items-center justify-center size-8 rounded-lg bg-primary/10")}>
            <Brain className="size-4 text-primary" />
          </div>
          <div className="text-left">
            <p className="text-sm font-medium text-foreground">{getGreeting()} — Daily Briefing</p>
            <p className={cn("text-[11px] font-mono", headerColor)}>
              {worstSeverity === "red"
                ? `${briefing.filter(b => b.severity === "red").length} items need attention`
                : worstSeverity === "amber"
                ? "Some items to review"
                : "All systems nominal"}
            </p>
          </div>
        </div>
        {expanded ? (
          <ChevronUp className="size-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="size-4 text-muted-foreground" />
        )}
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-2 border-t border-border pt-3">
              {briefing.map((item, i) => {
                const Icon = item.icon;
                const color = item.severity === "red"
                  ? "text-red-400"
                  : item.severity === "amber"
                  ? "text-amber-400"
                  : "text-emerald-400";
                return (
                  <div key={i} className="flex items-start gap-2.5">
                    <Icon className={cn("size-3.5 mt-0.5 flex-shrink-0", color)} />
                    <span className="text-xs text-muted-foreground leading-relaxed">{item.text}</span>
                  </div>
                );
              })}
              <p className="text-[10px] text-muted-foreground/60 font-mono pt-1">
                Generated {new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })} — based on live portfolio data
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
