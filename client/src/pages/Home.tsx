// ============================================================================
// Dashboard Page — Swiss Instrument design
// Top metrics bar, venture vertical cards (5), live agent activity feed
// Near-black surfaces, gold accent, DM Sans/Mono, 0.5px borders
// ============================================================================

import DashboardLayout from "@/components/DashboardLayout";
import StatusBadge from "@/components/StatusBadge";
import { cn } from "@/lib/utils";
import {
  METRICS,
  VERTICALS,
  AGENT_LOGS,
  VERTICAL_COLORS,
  formatTimestamp,
  type TaskStatus,
} from "@/lib/data";
import {
  Activity,
  Clock,
  Users,
  AlertTriangle,
  Building2,
  Ship,
  Hotel,
  UtensilsCrossed,
  Zap,
  ArrowUpRight,
} from "lucide-react";
import { motion } from "framer-motion";

const VERTICAL_ICONS: Record<string, React.ReactNode> = {
  "real-estate": <Building2 className="size-4" />,
  "yachts": <Ship className="size-4" />,
  "hospitality": <Hotel className="size-4" />,
  "fnb": <UtensilsCrossed className="size-4" />,
  "energy": <Zap className="size-4" />,
};

const METRIC_CARDS = [
  { label: "Tasks Automated", value: METRICS.tasksAutomatedThisWeek, suffix: "this week", icon: <Activity className="size-4" />, color: "text-blue-400" },
  { label: "Hours Reclaimed", value: METRICS.hoursReclaimed, suffix: "this week", icon: <Clock className="size-4" />, color: "text-emerald-400" },
  { label: "Active Clients", value: METRICS.activeClients, suffix: "beta", icon: <Users className="size-4" />, color: "text-primary" },
  { label: "Compliance Alerts", value: METRICS.complianceAlerts, suffix: "action needed", icon: <AlertTriangle className="size-4" />, color: "text-red-400" },
];

export default function Home() {
  return (
    <DashboardLayout title="Dashboard" subtitle="ATLAS VENTURE OPS">
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

        {/* Main content: Verticals grid + Activity feed */}
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-6">
          {/* Venture Verticals Grid */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-foreground">Venture Verticals</h2>
              <span className="text-[10px] font-mono text-muted-foreground">5 active</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {VERTICALS.map((v, i) => {
                const vc = VERTICAL_COLORS[v.key];
                const statusCounts = v.tasks.reduce(
                  (acc, t) => {
                    acc[t.status] = (acc[t.status] || 0) + 1;
                    return acc;
                  },
                  {} as Record<TaskStatus, number>
                );

                return (
                  <motion.div
                    key={v.key}
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
                          style={{ backgroundColor: `${vc.color}15` }}
                        >
                          <span style={{ color: vc.color }}>{VERTICAL_ICONS[v.key]}</span>
                        </div>
                        <span className="text-sm font-medium text-foreground">{v.label}</span>
                      </div>
                      <ArrowUpRight className="size-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>

                    {/* Task statuses */}
                    <div className="space-y-1.5 mb-3">
                      {v.tasks.map((t) => (
                        <div key={t.id} className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground truncate max-w-[160px]">
                            {t.title}
                          </span>
                          <StatusBadge status={t.status} />
                        </div>
                      ))}
                    </div>

                    {/* Footer metrics */}
                    <div className="flex items-center gap-4 pt-3 border-t border-border">
                      <div className="flex flex-col">
                        <span className="text-xs font-mono font-medium text-foreground">{v.tasksPerWeek}</span>
                        <span className="text-[10px] text-muted-foreground">tasks/wk</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs font-mono font-medium text-foreground">{v.hoursSavedPerMonth}h</span>
                        <span className="text-[10px] text-muted-foreground">saved/mo</span>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* Agent Activity Feed */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-foreground">Agent Activity</h2>
              <div className="flex items-center gap-1.5">
                <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[10px] font-mono text-emerald-400">live</span>
              </div>
            </div>

            <div className="bg-card border border-border rounded-lg divide-y divide-border">
              {AGENT_LOGS.map((log, i) => {
                const vc = VERTICAL_COLORS[log.vertical];
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
                      style={{ backgroundColor: vc.color }}
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
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
