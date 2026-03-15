// ============================================================================
// Dashboard Page — Swiss Instrument design
// Real Airtable data: Ventures by theme, SPVs, Tasks, Team, Distributions
// ============================================================================

import DashboardLayout from "@/components/DashboardLayout";
import StatusBadge from "@/components/StatusBadge";
import { cn } from "@/lib/utils";
import {
  METRICS,
  VENTURES_BY_THEME,
  SPVS,
  TASKS,
  AGENT_LOGS,
  DISTRIBUTIONS,
  THEME_COLORS,
  STATUS_CONFIG,
  SPV_STAGE_CONFIG,
  getThemeColor,
  getTaskStatusFromDate,
  formatTimestamp,
  formatCurrency,
} from "@/lib/data";
import {
  Layers3,
  Briefcase,
  ListChecks,
  Users,
  DollarSign,
  ArrowUpRight,
  Building2,
  Ship,
  UtensilsCrossed,
  Clapperboard,
  Fuel,
  Package,
  TrendingUp,
} from "lucide-react";
import { motion } from "framer-motion";

const THEME_ICONS: Record<string, React.ReactNode> = {
  "Real Estate": <Building2 className="size-4" />,
  "Yacht": <Ship className="size-4" />,
  "F&B": <UtensilsCrossed className="size-4" />,
  "Entertainment": <Clapperboard className="size-4" />,
  "Oil & Gas": <Fuel className="size-4" />,
  "Others": <Package className="size-4" />,
};

const METRIC_CARDS = [
  { label: "Active Ventures", value: METRICS.activeVentures, suffix: `of ${METRICS.totalVentures}`, icon: <Layers3 className="size-4" />, color: "text-blue-400" },
  { label: "Active SPVs", value: METRICS.activeSPVs, suffix: `of ${METRICS.totalSPVs}`, icon: <Briefcase className="size-4" />, color: "text-emerald-400" },
  { label: "Open Tasks", value: METRICS.openTasks, suffix: `${METRICS.completedTasks} done`, icon: <ListChecks className="size-4" />, color: "text-amber-400" },
  { label: "Distributions", value: formatCurrency(METRICS.paidDistributions), suffix: "paid", icon: <DollarSign className="size-4" />, color: "text-primary" },
];

export default function Home() {
  return (
    <DashboardLayout title="Dashboard" subtitle="ROYALTON VENTURE HOLDING">
      <div className="p-4 md:p-6 space-y-6">
        {/* Metrics Bar */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {METRIC_CARDS.map((m, i) => (
            <motion.div
              key={m.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05, duration: 0.3, ease: "easeOut" }}
              className="bg-card border border-border rounded-lg p-4 flex flex-col gap-2"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] uppercase tracking-[0.06em] text-muted-foreground font-medium">
                  {m.label}
                </span>
                <span className={cn("opacity-60", m.color)}>{m.icon}</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-semibold tracking-tight text-foreground font-mono">
                  {m.value}
                </span>
                <span className="text-[10px] text-muted-foreground font-mono">{m.suffix}</span>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Main content: Ventures by theme + Activity feed */}
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-6">
          {/* Venture Sectors Grid */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-foreground">Venture Sectors</h2>
              <span className="text-[10px] font-mono text-muted-foreground">{Object.keys(VENTURES_BY_THEME).length} sectors · {METRICS.totalVentures} ventures</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {Object.entries(VENTURES_BY_THEME).map(([theme, ventures], i) => {
                const tc = getThemeColor(theme);
                const activeCount = ventures.filter(v => v.status === "In progress").length;

                return (
                  <motion.div
                    key={theme}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 + i * 0.05, duration: 0.3, ease: "easeOut" }}
                    className="bg-card border border-border rounded-lg p-4 hover:border-border/80 transition-colors group"
                  >
                    {/* Header */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div
                          className="flex items-center justify-center size-7 rounded-md"
                          style={{ backgroundColor: `${tc.color}15` }}
                        >
                          <span style={{ color: tc.color }}>{THEME_ICONS[theme] || <Package className="size-4" />}</span>
                        </div>
                        <span className="text-sm font-medium text-foreground">{theme}</span>
                      </div>
                      <ArrowUpRight className="size-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>

                    {/* Venture list */}
                    <div className="space-y-1.5 mb-3">
                      {ventures.slice(0, 4).map((v) => (
                        <div key={v.id} className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground truncate max-w-[160px]">
                            {v.name}
                          </span>
                          <span className="text-[10px] font-mono text-muted-foreground">{v.location}</span>
                        </div>
                      ))}
                      {ventures.length > 4 && (
                        <span className="text-[10px] text-muted-foreground font-mono">+{ventures.length - 4} more</span>
                      )}
                    </div>

                    {/* Footer metrics */}
                    <div className="flex items-center gap-4 pt-3 border-t border-border">
                      <div className="flex flex-col">
                        <span className="text-xs font-mono font-medium text-foreground">{ventures.length}</span>
                        <span className="text-[10px] text-muted-foreground">ventures</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs font-mono font-medium text-foreground">{activeCount}</span>
                        <span className="text-[10px] text-muted-foreground">active</span>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Active SPVs */}
            <div className="mt-6">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-foreground">Active SPVs & Deals</h2>
                <span className="text-[10px] font-mono text-muted-foreground">{SPVS.length} total</span>
              </div>
              <div className="bg-card border border-border rounded-lg divide-y divide-border">
                {SPVS.filter(s => s.stage === "Active deal" || s.stage === "In negotiation").slice(0, 5).map((spv, i) => {
                  const tc = getThemeColor(spv.theme);
                  const sc = SPV_STAGE_CONFIG[spv.stage];
                  return (
                    <motion.div
                      key={spv.id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 + i * 0.05, duration: 0.25 }}
                      className="p-3 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <div className="size-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: tc.color }} />
                        <div>
                          <span className="text-xs font-medium text-foreground">{spv.name}</span>
                          <span className="text-[10px] font-mono text-muted-foreground ml-2">{spv.theme}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded", spv.priority === "High" ? "bg-red-500/10 text-red-400" : spv.priority === "Medium" ? "bg-amber-500/10 text-amber-400" : "bg-secondary text-muted-foreground")}>
                          {spv.priority}
                        </span>
                        <StatusBadge label={sc?.label || spv.stage} bg={sc?.bg} dot={sc?.dot} />
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right column: Activity + Recent Tasks + Distributions */}
          <div className="space-y-4">
            {/* Agent Activity Feed */}
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-foreground">Recent Activity</h2>
              <div className="flex items-center gap-1.5">
                <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[10px] font-mono text-emerald-400">live</span>
              </div>
            </div>

            <div className="bg-card border border-border rounded-lg divide-y divide-border">
              {AGENT_LOGS.map((log, i) => {
                const tc = getThemeColor(log.theme);
                return (
                  <motion.div
                    key={log.id}
                    initial={{ opacity: 0, x: 8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 + i * 0.08, duration: 0.25, ease: "easeOut" }}
                    className="p-3 flex gap-3"
                  >
                    <div
                      className="size-1.5 rounded-full mt-1.5 flex-shrink-0"
                      style={{ backgroundColor: tc.color }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-foreground">{log.action}</span>
                        <span className="text-[10px] font-mono text-muted-foreground">
                          {formatTimestamp(log.timestamp)}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">{log.detail}</p>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Open Tasks */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-foreground">Open Tasks</h2>
                <span className="text-[10px] font-mono text-muted-foreground">{TASKS.filter(t => t.status === "open").length} open</span>
              </div>
              <div className="bg-card border border-border rounded-lg divide-y divide-border">
                {TASKS.filter(t => t.status !== "complete").slice(0, 5).map((task, i) => {
                  const resolvedStatus = getTaskStatusFromDate(task);
                  const sc = STATUS_CONFIG[resolvedStatus];
                  return (
                    <div key={task.id} className="p-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-foreground truncate max-w-[200px]">{task.title}</span>
                        <StatusBadge label={sc.label} bg={sc.bg} dot={sc.dot} />
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] font-mono text-muted-foreground">Due {task.dueDate}</span>
                        {task.assignees.length > 0 && (
                          <span className="text-[10px] text-muted-foreground">· {task.assignees[0]}</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Distributions Summary */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-foreground">Distributions</h2>
                <span className="text-[10px] font-mono text-emerald-400">
                  <TrendingUp className="size-3 inline mr-1" />
                  {formatCurrency(METRICS.totalDistributions)} total
                </span>
              </div>
              <div className="bg-card border border-border rounded-lg divide-y divide-border">
                {DISTRIBUTIONS.map((dist) => (
                  <div key={dist.id} className="p-3 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-medium text-foreground">{dist.name}</span>
                      <p className="text-[10px] font-mono text-muted-foreground mt-0.5">{dist.fund}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-mono font-medium text-foreground">{formatCurrency(dist.amount)}</span>
                      <p className={cn("text-[10px] font-mono mt-0.5", dist.status === "Paid" ? "text-emerald-400" : dist.status === "Cancelled" ? "text-red-400" : "text-blue-400")}>
                        {dist.status}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
