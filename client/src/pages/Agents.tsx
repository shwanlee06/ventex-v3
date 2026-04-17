// Agents Page — AI Agent Monitoring Dashboard (Velocity Build)
// 2x2 agent cards with pause/resume, run now, severity bars, action buttons
// Signal history with action indicators

import DashboardLayout from "@/components/DashboardLayout";
import {
  useAgents, AGENT_CONFIG, resolveAgentKey, getAgentConfig,
  type AgentKey, type AgentEvent,
} from "@/contexts/AgentContext";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertTriangle, AlertCircle, Info, Play, Loader2,
  CheckCircle2, Eye, Clock, Zap, Brain, Pause, RotateCcw,
  FileText, ArrowRight, Shield, Send, XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { useState, useMemo, useCallback } from "react";
import { useLocation } from "wouter";


const SEVERITY_STYLES: Record<string, { icon: React.ReactNode; bg: string; text: string; border: string; color: string }> = {
  critical: {
    icon: <AlertCircle className="size-3.5" />,
    bg: "bg-red-500/10",
    text: "text-red-400",
    border: "border-red-500/20",
    color: "#EF4444",
  },
  warning: {
    icon: <AlertTriangle className="size-3.5" />,
    bg: "bg-amber-500/10",
    text: "text-amber-400",
    border: "border-amber-500/20",
    color: "#F59E0B",
  },
  success: {
    icon: <CheckCircle2 className="size-3.5" />,
    bg: "bg-emerald-500/10",
    text: "text-emerald-400",
    border: "border-emerald-500/20",
    color: "#4ADE80",
  },
  info: {
    icon: <Info className="size-3.5" />,
    bg: "bg-blue-500/10",
    text: "text-blue-400",
    border: "border-blue-500/20",
    color: "#3B82F6",
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

/** Returns true if the signal is older than 24 hours */
function isStaleSignal(date: Date): boolean {
  return (Date.now() - new Date(date).getTime()) > 24 * 60 * 60 * 1000;
}


function SeverityBar({ events }: { events: AgentEvent[] }) {
  const counts = useMemo(() => {
    const c = { critical: 0, warning: 0, success: 0, info: 0 };
    for (const e of events) {
      if (e.severity in c) c[e.severity as keyof typeof c]++;
    }
    return c;
  }, [events]);

  const total = events.length || 1;

  return (
    <div className="space-y-1.5">
      {/* Bar */}
      <div className="h-2 rounded-full bg-secondary/50 overflow-hidden flex">
        {counts.critical > 0 && (
          <div
            className="h-full bg-red-500 transition-all"
            style={{ width: `${(counts.critical / total) * 100}%` }}
          />
        )}
        {counts.warning > 0 && (
          <div
            className="h-full bg-amber-500 transition-all"
            style={{ width: `${(counts.warning / total) * 100}%` }}
          />
        )}
        {counts.success > 0 && (
          <div
            className="h-full bg-emerald-500 transition-all"
            style={{ width: `${(counts.success / total) * 100}%` }}
          />
        )}
        {counts.info > 0 && (
          <div
            className="h-full bg-blue-500 transition-all"
            style={{ width: `${(counts.info / total) * 100}%` }}
          />
        )}
      </div>
      {/* Legend */}
      <div className="flex items-center gap-3 text-[9px] font-mono text-muted-foreground">
        {counts.critical > 0 && (
          <span className="flex items-center gap-1"><span className="size-1.5 rounded-full bg-red-500" />{counts.critical} critical</span>
        )}
        {counts.warning > 0 && (
          <span className="flex items-center gap-1"><span className="size-1.5 rounded-full bg-amber-500" />{counts.warning} warning</span>
        )}
        {counts.success > 0 && (
          <span className="flex items-center gap-1"><span className="size-1.5 rounded-full bg-emerald-500" />{counts.success} success</span>
        )}
        {counts.info > 0 && (
          <span className="flex items-center gap-1"><span className="size-1.5 rounded-full bg-blue-500" />{counts.info} info</span>
        )}
      </div>
    </div>
  );
}


function AgentCard({
  agentKey,
  events,
  isRunning,
  isPaused,
  onRun,
  onTogglePause,
}: {
  agentKey: AgentKey;
  events: AgentEvent[];
  isRunning: boolean;
  isPaused: boolean;
  onRun: () => void;
  onTogglePause: () => void;
}) {
  const config = AGENT_CONFIG[agentKey];
  const latestEvent = events[0] || null;
  const latestSeverity = latestEvent ? SEVERITY_STYLES[latestEvent.severity] || SEVERITY_STYLES.info : SEVERITY_STYLES.info;
  const actionableCount = events.filter(e => e.actionType && !e.actionTaken).length;
  const draftCount = events.filter(e => e.eventType === "draft_generated" && !e.actionTaken).length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "bg-card border rounded-xl p-5 flex flex-col gap-4 group transition-all",
        isPaused ? "border-amber-500/30 opacity-70" : "border-border hover:border-primary/20"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="flex items-center justify-center size-9 rounded-lg relative"
            style={{ backgroundColor: `${config.color}15` }}
          >
            <Brain className="size-4" style={{ color: config.color }} />
            {isPaused && (
              <div className="absolute -top-1 -right-1 size-4 rounded-full bg-amber-500 flex items-center justify-center">
                <Pause className="size-2.5 text-white" />
              </div>
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-foreground">{config.label}</h3>
              {isPaused && (
                <Badge variant="outline" className="text-[9px] h-4 border-amber-500/30 text-amber-400">
                  PAUSED
                </Badge>
              )}
            </div>
            <p className="text-[10px] text-muted-foreground">{config.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <Button
            size="sm"
            variant="ghost"
            className="h-7 w-7 p-0"
            onClick={onTogglePause}
            title={isPaused ? "Resume agent" : "Pause agent"}
          >
            {isPaused ? (
              <Play className="size-3 text-emerald-400" />
            ) : (
              <Pause className="size-3 text-muted-foreground" />
            )}
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-[10px] gap-1"
            onClick={onRun}
            disabled={isRunning || isPaused}
          >
            {isRunning ? (
              <Loader2 className="size-3 animate-spin" />
            ) : (
              <Zap className="size-3" />
            )}
            Run Now
          </Button>
        </div>
      </div>

      {/* Stats row */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-1.5">
          <Zap className="size-3 text-muted-foreground" />
          <span className="text-xs font-mono text-foreground">{events.length}</span>
          <span className="text-[10px] text-muted-foreground">signals</span>
        </div>
        {actionableCount > 0 && (
          <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400 text-[10px] font-medium">
            <ArrowRight className="size-3" />
            {actionableCount} pending actions
          </div>
        )}
        {draftCount > 0 && (
          <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 text-[10px] font-medium">
            <FileText className="size-3" />
            {draftCount} drafts
          </div>
        )}
        {latestEvent && (
          <span className="text-[9px] font-mono text-muted-foreground/60 ml-auto">
            Last: {formatTimeAgo(latestEvent.createdAt)}
          </span>
        )}
      </div>

      {/* Severity distribution bar */}
      {events.length > 0 && <SeverityBar events={events} />}

      {/* Latest Signal */}
      {latestEvent && (
        <div className={cn("rounded-lg p-3 border", latestSeverity.bg, latestSeverity.border)}>
          <div className="flex items-center gap-1.5 mb-1">
            {latestSeverity.icon}
            <span className={cn("text-[10px] font-medium", latestSeverity.text)}>
              {latestEvent.severity} — {latestEvent.eventType.replace(/_/g, " ")}
            </span>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
            {latestEvent.message}
          </p>
        </div>
      )}
    </motion.div>
  );
}


export default function AgentsPage() {
  const {
    events, metrics, isLoading, isRunning,
    runAllAgents, runSingleAgent, markAllRead,
    executeAction,
  } = useAgents();
  const [, navigate] = useLocation();
  const [filterAgent, setFilterAgent] = useState<string>("all");
  const [filterSeverity, setFilterSeverity] = useState<string>("all");
  const [pausedAgents, setPausedAgents] = useState<Set<AgentKey>>(new Set());

  // Compute per-agent events
  const agentEvents = useMemo(() => {
    const data: Record<AgentKey, AgentEvent[]> = {
      overdue: [], velocity: [], distribution: [], orchestrator: [],
    };
    for (const event of events) {
      const key = resolveAgentKey(event.agentName);
      if (data[key]) data[key].push(event);
    }
    return data;
  }, [events]);

  // Filtered events for history
  const filteredEvents = useMemo(() => {
    let filtered = events;
    if (filterAgent !== "all") {
      filtered = filtered.filter(e => resolveAgentKey(e.agentName) === filterAgent);
    }
    if (filterSeverity !== "all") {
      filtered = filtered.filter(e => e.severity === filterSeverity);
    }
    return filtered;
  }, [events, filterAgent, filterSeverity]);

  const handleRunAll = useCallback(() => {
    runAllAgents();
    toast.info("Running all agents...");
  }, [runAllAgents]);

  const handleRunSingle = useCallback((key: AgentKey) => {
    if (pausedAgents.has(key)) {
      toast.warning(`${AGENT_CONFIG[key].label} is paused — resume it first`);
      return;
    }
    runSingleAgent(key);
    toast.info(`Running ${AGENT_CONFIG[key].label}...`);
  }, [runSingleAgent, pausedAgents]);

  const togglePause = useCallback((key: AgentKey) => {
    setPausedAgents(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
        toast.success(`${AGENT_CONFIG[key].label} resumed`);
      } else {
        next.add(key);
        toast.info(`${AGENT_CONFIG[key].label} paused`);
      }
      return next;
    });
  }, []);

  const handleAction = useCallback((event: AgentEvent, actionType: string) => {
    if (actionType === "review_draft") {
      navigate("/drafts");
    } else {
      executeAction(event.id, actionType);
      toast.success("Action executed");
    }
  }, [executeAction, navigate]);

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
                <span>{events.length} signals</span>
                <span>·</span>
                <span className="text-red-400">{metrics.critical} critical</span>
                <span>·</span>
                <span className="text-amber-400">{metrics.warning} warnings</span>
                <span>·</span>
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
              <Skeleton key={i} className="h-56 rounded-xl" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(Object.keys(AGENT_CONFIG) as AgentKey[]).map((key) => (
              <AgentCard
                key={key}
                agentKey={key}
                events={agentEvents[key]}
                isRunning={isRunning}
                isPaused={pausedAgents.has(key)}
                onRun={() => handleRunSingle(key)}
                onTogglePause={() => togglePause(key)}
              />
            ))}
          </div>
        )}

        {/* Signal History */}
        <div className="space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h2 className="text-sm font-semibold text-foreground">Signal History</h2>
            <div className="flex items-center gap-3">
              {/* Agent filter */}
              <div className="flex items-center gap-1">
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
              {/* Severity filter */}
              <div className="flex items-center gap-1 border-l border-border pl-3">
                {["all", "critical", "warning", "success", "info"].map((sev) => (
                  <button
                    key={sev}
                    onClick={() => setFilterSeverity(sev)}
                    className={cn(
                      "px-1.5 py-0.5 rounded text-[10px] font-mono transition-colors flex items-center gap-1",
                      filterSeverity === sev
                        ? sev === "all" ? "bg-primary/10 text-primary" : `${SEVERITY_STYLES[sev]?.bg} ${SEVERITY_STYLES[sev]?.text}`
                        : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                    )}
                  >
                    {sev !== "all" && <span className="size-1.5 rounded-full" style={{ backgroundColor: SEVERITY_STYLES[sev]?.color }} />}
                    {sev === "all" ? "All" : sev}
                  </button>
                ))}
              </div>
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
                    const hasAction = event.actionType && !event.actionTaken;
                    const actionTaken = event.actionTaken;

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
                            <span className="text-[9px] font-mono text-muted-foreground/60 bg-secondary/30 px-1 rounded">
                              {event.eventType.replace(/_/g, " ")}
                            </span>
                            <span className={cn("text-[9px] font-mono", isStaleSignal(event.createdAt) ? "text-amber-400/70" : "text-muted-foreground/60")}>
                              {formatTimeAgo(event.createdAt)}
                              {isStaleSignal(event.createdAt) && " · stale"}
                            </span>
                            {!event.isRead && (
                              <span className="size-1.5 rounded-full bg-primary flex-shrink-0" />
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                            {event.message}
                          </p>

                          {/* Entity info */}
                          {event.agentEntityName && (
                            <div className="flex items-center gap-1.5 mt-1.5">
                              <span className="text-[9px] text-muted-foreground/60 font-mono">
                                {event.entityType}: {event.agentEntityName}
                              </span>
                              {event.oldStatus && event.newStatus && (
                                <span className="text-[9px] font-mono text-muted-foreground/60">
                                  {event.oldStatus} → {event.newStatus}
                                </span>
                              )}
                            </div>
                          )}

                          {/* Action buttons */}
                          {hasAction && (
                            <div className="flex items-center gap-1.5 mt-2">
                              {event.actionType!.split(",").map(action => {
                                const actionKey = action.trim();
                                return (
                                  <Button
                                    key={actionKey}
                                    variant="outline"
                                    size="sm"
                                    className="h-6 text-[10px] px-2 gap-1"
                                    onClick={() => handleAction(event, actionKey)}
                                  >
                                    {actionKey === "review_draft" ? <FileText className="size-3" /> : <Zap className="size-3" />}
                                    {actionKey.replace(/_/g, " ")}
                                  </Button>
                                );
                              })}
                            </div>
                          )}

                          {/* Action taken indicator */}
                          {actionTaken && (
                            <div className="flex items-center gap-1 mt-1.5">
                              <CheckCircle2 className="size-3 text-emerald-400" />
                              <span className="text-[10px] text-emerald-400 font-mono">Action completed</span>
                            </div>
                          )}
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
