// ============================================================================
// Agents Page — AI Agent Monitoring Dashboard
// 2x2 agent cards + signal history feed + run controls
// ============================================================================

import DashboardLayout from "@/components/DashboardLayout";
import { useAgents, AGENT_CONFIG, resolveAgentKey, getAgentConfig, type AgentKey } from "@/contexts/AgentContext";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertTriangle, AlertCircle, Info, Play, Loader2,
  CheckCircle2, Eye, Clock, Zap, Brain,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { useState, useMemo } from "react";

// ── Severity Helpers ────────────────────────────────────────────────────

const SEVERITY_STYLES: Record<string, { icon: React.ReactNode; bg: string; text: string; border: string }> = {
  critical: {
    icon: <AlertCircle className="size-3.5" />,
    bg: "bg-red-500/10",
    text: "text-red-400",
    border: "border-red-500/20",
  },
  warning: {
    icon: <AlertTriangle className="size-3.5" />,
    bg: "bg-amber-500/10",
    text: "text-amber-400",
    border: "border-amber-500/20",
  },
  info: {
    icon: <Info className="size-3.5" />,
    bg: "bg-blue-500/10",
    text: "text-blue-400",
    border: "border-blue-500/20",
  },
};

function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - new Date(date).getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHrs = Math.floor(diffMins / 60);
  if (diffHrs < 24) return `${diffHrs}h ago`;
  const diffDays = Math.floor(diffHrs / 24);
  return `${diffDays}d ago`;
}

// ── Agent Card ──────────────────────────────────────────────────────────

function AgentCard({
  agentKey,
  eventCount,
  latestMessage,
  latestSeverity,
  isRunning,
  onRun,
}: {
  agentKey: AgentKey;
  eventCount: number;
  latestMessage: string | null;
  latestSeverity: string | null;
  isRunning: boolean;
  onRun: () => void;
}) {
  const config = AGENT_CONFIG[agentKey];
  const severity = latestSeverity ? SEVERITY_STYLES[latestSeverity] : SEVERITY_STYLES.info;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card border border-border rounded-xl p-5 flex flex-col gap-4 group hover:border-primary/20 transition-all"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="flex items-center justify-center size-9 rounded-lg"
            style={{ backgroundColor: `${config.color}15` }}
          >
            <Brain className="size-4" style={{ color: config.color }} />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">{config.label}</h3>
            <p className="text-[10px] text-muted-foreground">{config.description}</p>
          </div>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-[10px] gap-1"
          onClick={onRun}
          disabled={isRunning}
        >
          {isRunning ? (
            <Loader2 className="size-3 animate-spin" />
          ) : (
            <Play className="size-3" />
          )}
          Run
        </Button>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5">
          <Zap className="size-3 text-muted-foreground" />
          <span className="text-xs font-mono text-foreground">{eventCount}</span>
          <span className="text-[10px] text-muted-foreground">signals</span>
        </div>
        {latestSeverity && (
          <div className={cn("flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium", severity.bg, severity.text)}>
            {severity.icon}
            {latestSeverity}
          </div>
        )}
      </div>

      {/* Latest Signal */}
      {latestMessage && (
        <div className="bg-secondary/30 rounded-lg p-3 border border-border/50">
          <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
            {latestMessage}
          </p>
        </div>
      )}
    </motion.div>
  );
}

// ── Main Page ───────────────────────────────────────────────────────────

export default function AgentsPage() {
  const { events, metrics, isLoading, isRunning, runAllAgents, runSingleAgent, markAllRead } = useAgents();
  const [filterAgent, setFilterAgent] = useState<string>("all");

  // Compute per-agent data
  const agentData = useMemo(() => {
    const data: Record<AgentKey, { count: number; latestMessage: string | null; latestSeverity: string | null }> = {
      overdue: { count: 0, latestMessage: null, latestSeverity: null },
      venture: { count: 0, latestMessage: null, latestSeverity: null },
      distribution: { count: 0, latestMessage: null, latestSeverity: null },
      orchestrator: { count: 0, latestMessage: null, latestSeverity: null },
    };

    for (const event of events) {
      const key = resolveAgentKey(event.agentName);
      if (data[key]) {
        data[key].count++;
        if (!data[key].latestMessage) {
          data[key].latestMessage = event.message;
          data[key].latestSeverity = event.severity;
        }
      }
    }

    return data;
  }, [events]);

  // Filtered events
  const filteredEvents = useMemo(() => {
    if (filterAgent === "all") return events;
    return events.filter((e) => resolveAgentKey(e.agentName) === filterAgent);
  }, [events, filterAgent]);

  const handleRunAll = () => {
    runAllAgents();
    toast.info("Running all agents...");
  };

  const handleRunSingle = (key: AgentKey) => {
    runSingleAgent(key);
    toast.info(`Running ${AGENT_CONFIG[key].label}...`);
  };

  return (
    <DashboardLayout title="AI Agents" subtitle="INTELLIGENCE MONITORING">
      <div className="p-4 sm:p-5 md:p-6 space-y-6 pb-24 md:pb-6">
        {/* Header Bar */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[10px] font-mono text-emerald-400">LIVE</span>
            </div>
            {metrics && (
              <div className="flex items-center gap-3 text-[10px] font-mono text-muted-foreground">
                <span>{metrics.total} signals</span>
                <span>•</span>
                <span className="text-red-400">{metrics.critical} critical</span>
                <span>•</span>
                <span className="text-amber-400">{metrics.warning} warnings</span>
                <span>•</span>
                <span>{metrics.unread} unread</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-[10px]"
              onClick={() => { markAllRead(); toast.success("All signals marked as read"); }}
            >
              <Eye className="size-3 mr-1" />
              Mark All Read
            </Button>
            <Button
              size="sm"
              className="h-7 text-[10px] gap-1"
              onClick={handleRunAll}
              disabled={isRunning}
            >
              {isRunning ? <Loader2 className="size-3 animate-spin" /> : <Play className="size-3" />}
              Run All Agents
            </Button>
          </div>
        </div>

        {/* Agent Cards Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-48 rounded-xl" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(Object.keys(AGENT_CONFIG) as AgentKey[]).map((key) => (
              <AgentCard
                key={key}
                agentKey={key}
                eventCount={agentData[key].count}
                latestMessage={agentData[key].latestMessage}
                latestSeverity={agentData[key].latestSeverity}
                isRunning={isRunning}
                onRun={() => handleRunSingle(key)}
              />
            ))}
          </div>
        )}

        {/* Signal History */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">Signal History</h2>
            <div className="flex items-center gap-1.5">
              {["all", ...Object.keys(AGENT_CONFIG)].map((key) => (
                <button
                  key={key}
                  onClick={() => setFilterAgent(key)}
                  className={cn(
                    "px-2 py-0.5 rounded text-[10px] font-mono transition-colors",
                    filterAgent === key
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                  )}
                >
                  {key === "all" ? "All" : AGENT_CONFIG[key as AgentKey].label.split(" ")[0]}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl divide-y divide-border overflow-hidden">
            {filteredEvents.length === 0 ? (
              <div className="p-8 text-center">
                <Brain className="size-8 text-muted-foreground mx-auto mb-3 opacity-40" />
                <p className="text-sm text-muted-foreground">
                  No agent signals yet. Click "Run All Agents" to generate intelligence.
                </p>
              </div>
            ) : (
              <ScrollArea className="max-h-[500px]">
                <AnimatePresence>
                  {filteredEvents.map((event, i) => {
                    const config = getAgentConfig(event.agentName);
                    const severity = SEVERITY_STYLES[event.severity] ?? SEVERITY_STYLES.info;

                    return (
                      <motion.div
                        key={event.id}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.02, duration: 0.2 }}
                        className={cn(
                          "p-3 sm:p-4 flex gap-3 hover:bg-accent/30 transition-colors",
                          !event.isRead && "bg-primary/[0.02]"
                        )}
                      >
                        <div
                          className="size-2 rounded-full mt-1.5 flex-shrink-0"
                          style={{ backgroundColor: config.color }}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span
                              className="text-[10px] font-mono font-medium"
                              style={{ color: config.color }}
                            >
                              {config.label}
                            </span>
                            <div className={cn("flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px]", severity.bg, severity.text)}>
                              {severity.icon}
                              {event.severity}
                            </div>
                            <span className="text-[9px] font-mono text-muted-foreground/60">
                              {formatTimeAgo(event.createdAt)}
                            </span>
                            {!event.isRead && (
                              <span className="size-1.5 rounded-full bg-primary flex-shrink-0" />
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                            {event.message}
                          </p>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </ScrollArea>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
