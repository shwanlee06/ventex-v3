// ============================================================================
// ATLAS Agents Page — 2x2 Agent Cards + Signal History
// ============================================================================

import DashboardLayout from "@/components/DashboardLayout";
import { useAgents } from "@/contexts/AgentContext";
import { cn } from "@/lib/utils";
import {
  AlertCircle,
  AlertTriangle,
  Info,
  CheckCircle2,
  Bot,
  Activity,
  Zap,
  Clock,
  RefreshCw,
  Shield,
  Eye,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";

// ── Agent config ───────────────────────────────────────
// Map DB display names → short keys used in AGENT_CONFIG
const DB_NAME_TO_KEY: Record<string, string> = {
  "Overdue Agent": "overdue",
  "Venture Agent": "venture",
  "Distribution Sentinel": "distribution",
  "Orchestrator": "orchestrator",
};

function resolveAgentKey(agentName: string): string {
  return DB_NAME_TO_KEY[agentName] ?? agentName;
}

const AGENT_CONFIG: Record<string, {
  icon: React.ReactNode;
  label: string;
  description: string;
  interval: string;
  color: string;
  bgColor: string;
}> = {
  overdue: {
    icon: <AlertTriangle className="size-5" />,
    label: "Overdue Scanner",
    description: "Monitors task deadlines and escalates overdue items by severity tier",
    interval: "60s",
    color: "text-red-400",
    bgColor: "bg-red-500/10",
  },
  venture: {
    icon: <Activity className="size-5" />,
    label: "Venture Monitor",
    description: "Tracks venture health metrics, completion rates, and stalled progress",
    interval: "120s",
    color: "text-blue-400",
    bgColor: "bg-blue-500/10",
  },
  distribution: {
    icon: <Zap className="size-5" />,
    label: "Distribution Tracker",
    description: "Monitors payment schedules, upcoming distributions, and anomalies",
    interval: "300s",
    color: "text-emerald-400",
    bgColor: "bg-emerald-500/10",
  },
  orchestrator: {
    icon: <Bot className="size-5" />,
    label: "Orchestrator",
    description: "Synthesizes signals from all agents and generates strategic recommendations",
    interval: "180s",
    color: "text-purple-400",
    bgColor: "bg-purple-500/10",
  },
};

const SEVERITY_CONFIG: Record<string, { icon: React.ReactNode; color: string; bg: string; label: string }> = {
  critical: {
    icon: <AlertCircle className="size-3.5" />,
    color: "text-red-400",
    bg: "bg-red-500/10 border-red-500/20",
    label: "Critical",
  },
  warning: {
    icon: <AlertTriangle className="size-3.5" />,
    color: "text-amber-400",
    bg: "bg-amber-500/10 border-amber-500/20",
    label: "Warning",
  },
  info: {
    icon: <Info className="size-3.5" />,
    color: "text-blue-400",
    bg: "bg-blue-500/10 border-blue-500/20",
    label: "Info",
  },
  success: {
    icon: <CheckCircle2 className="size-3.5" />,
    color: "text-emerald-400",
    bg: "bg-emerald-500/10 border-emerald-500/20",
    label: "Success",
  },
};

function formatTime(d: Date | string): string {
  const date = new Date(d);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

function formatFullTime(d: Date | string): string {
  const date = new Date(d);
  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export default function Agents() {
  const { agentStatuses, events, isOperator, markRead, markAllRead } = useAgents();
  const [filterAgent, setFilterAgent] = useState<string | null>(null);
  const [filterSeverity, setFilterSeverity] = useState<string | null>(null);

  const agentNames = ["overdue", "venture", "distribution", "orchestrator"];

  // Filter events
  const filteredEvents = events.filter((e) => {
    if (filterAgent && resolveAgentKey(e.agentName) !== filterAgent) return false;
    if (filterSeverity && e.severity !== filterSeverity) return false;
    return true;
  });

  // Count events per agent today
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const eventsToday = (agentName: string) =>
    events.filter(
      (e) => resolveAgentKey(e.agentName) === agentName && new Date(e.createdAt).getTime() >= todayStart.getTime()
    ).length;

  // Unread count
  const unreadCount = events.filter((e) => !e.isRead).length;

  return (
    <DashboardLayout title="Agents" subtitle="ATLAS INTELLIGENCE LAYER">
      <div className="p-4 sm:p-5 md:p-6 space-y-6 pb-24 md:pb-6">

        {/* ── Header ────────────────────────────────────────── */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center size-10 rounded-xl bg-primary/10">
              <Shield className="size-5 text-primary" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-foreground">Agent Command</h1>
              <p className="text-xs text-muted-foreground">
                4 autonomous agents monitoring your portfolio
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => markAllRead()}
                className="text-xs gap-1.5"
              >
                <Eye className="size-3.5" />
                Mark all read ({unreadCount})
              </Button>
            )}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
              <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[11px] font-mono text-emerald-400 font-medium">
                All agents active
              </span>
            </div>
          </div>
        </div>

        {/* ── 2x2 Agent Cards ───────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {agentNames.map((name) => {
            const config = AGENT_CONFIG[name];
            const status = agentStatuses.find(s => s.name === name);
            const todayCount = eventsToday(name);
            const lastEvent = events.find((e) => resolveAgentKey(e.agentName) === name);

            return (
              <div
                key={name}
                className={cn(
                  "bg-card border border-border rounded-xl p-4 space-y-3",
                  "hover:border-primary/20 transition-all cursor-default"
                )}
              >
                {/* Card header */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={cn("flex items-center justify-center size-9 rounded-lg", config.bgColor)}>
                      <span className={config.color}>{config.icon}</span>
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-foreground">{config.label}</h3>
                      <p className="text-[11px] text-muted-foreground mt-0.5">{config.description}</p>
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-[10px] font-mono",
                      status?.status === "running" || status?.status === "active"
                        ? "border-emerald-500/30 text-emerald-400"
                        : "border-border text-muted-foreground"
                    )}
                  >
                    {status?.status === "running" ? (
                      <span className="flex items-center gap-1">
                        <Loader2 className="size-3 animate-spin" />
                        Running
                      </span>
                    ) : status?.status === "active" ? (
                      "Active"
                    ) : (
                      "Idle"
                    )}
                  </Badge>
                </div>

                {/* Stats row */}
                <div className="flex items-center gap-4 pt-2 border-t border-border">
                  <div className="flex items-center gap-1.5">
                    <Clock className="size-3 text-muted-foreground" />
                    <span className="text-[11px] font-mono text-muted-foreground">
                      {status?.lastRun ? formatTime(new Date(status.lastRun)) : "Never"}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <RefreshCw className="size-3 text-muted-foreground" />
                    <span className="text-[11px] font-mono text-muted-foreground">
                      Every {config.interval}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 ml-auto">
                    <Activity className="size-3 text-muted-foreground" />
                    <span className="text-[11px] font-mono text-foreground font-medium">
                      {todayCount} today
                    </span>
                  </div>
                </div>

                {/* Last signal preview */}
                {lastEvent && (
                  <div className={cn(
                    "rounded-lg border px-3 py-2",
                    SEVERITY_CONFIG[lastEvent.severity]?.bg || "bg-secondary border-border"
                  )}>
                    <div className="flex items-start gap-2">
                      <span className={cn("mt-0.5", SEVERITY_CONFIG[lastEvent.severity]?.color)}>
                        {SEVERITY_CONFIG[lastEvent.severity]?.icon}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] text-foreground line-clamp-2">{lastEvent.message}</p>
                        <span className="text-[10px] font-mono text-muted-foreground mt-1 block">
                          {formatTime(lastEvent.createdAt)}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* ── Signal History ─────────────────────────────────── */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">Signal History</h2>
            <span className="text-[10px] font-mono text-muted-foreground">
              {filteredEvents.length} signals
            </span>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant={filterAgent === null ? "default" : "outline"}
              size="sm"
              className="text-[11px] h-7"
              onClick={() => setFilterAgent(null)}
            >
              All agents
            </Button>
            {agentNames.map((name) => {
              const config = AGENT_CONFIG[name];
              return (
                <Button
                  key={name}
                  variant={filterAgent === name ? "default" : "outline"}
                  size="sm"
                  className="text-[11px] h-7 gap-1"
                  onClick={() => setFilterAgent(filterAgent === name ? null : name)}
                >
                  <span className={filterAgent === name ? "" : config.color}>
                    {config.icon}
                  </span>
                  {config.label.split(" ")[0]}
                </Button>
              );
            })}

            <div className="w-px h-5 bg-border mx-1" />

            {["critical", "warning", "info", "success"].map((sev) => {
              const config = SEVERITY_CONFIG[sev];
              return (
                <Button
                  key={sev}
                  variant={filterSeverity === sev ? "default" : "outline"}
                  size="sm"
                  className="text-[11px] h-7 gap-1"
                  onClick={() => setFilterSeverity(filterSeverity === sev ? null : sev)}
                >
                  <span className={filterSeverity === sev ? "" : config.color}>
                    {config.icon}
                  </span>
                  {config.label}
                </Button>
              );
            })}
          </div>

          {/* Event list */}
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            {filteredEvents.length === 0 ? (
              <div className="p-8 text-center">
                <Bot className="size-8 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">No signals yet</p>
                <p className="text-xs text-muted-foreground/70 mt-1">
                  Agents are scanning — signals will appear here as they detect events
                </p>
              </div>
            ) : (
              <ScrollArea className="max-h-[600px]">
                <div className="divide-y divide-border">
                  {filteredEvents.map((event) => {
                    const sev = SEVERITY_CONFIG[event.severity] || SEVERITY_CONFIG.info;
                    const agent = AGENT_CONFIG[resolveAgentKey(event.agentName)] || AGENT_CONFIG.orchestrator;

                    return (
                      <div
                        key={event.id}
                        className={cn(
                          "px-4 py-3 flex items-start gap-3 transition-colors",
                          !event.isRead && "bg-primary/[0.02]",
                          "hover:bg-accent/30"
                        )}
                        onClick={() => {
                          if (!event.isRead) markRead(event.id);
                        }}
                      >
                        {/* Severity icon */}
                        <span className={cn("mt-0.5 flex-shrink-0", sev.color)}>
                          {sev.icon}
                        </span>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className={cn("text-[10px] font-mono font-medium px-1.5 py-0.5 rounded", agent.bgColor, agent.color)}>
                              {agent.label.split(" ")[0]}
                            </span>
                            <Badge
                              variant="outline"
                              className={cn("text-[9px] font-mono h-4", sev.bg)}
                            >
                              <span className={sev.color}>{sev.label}</span>
                            </Badge>
                            {!event.isRead && (
                              <span className="size-1.5 rounded-full bg-primary flex-shrink-0" />
                            )}
                          </div>
                          <p className="text-xs text-foreground leading-relaxed">
                            {event.message}
                          </p>
                          {event.entityName && (
                            <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2">
                              {event.entityName}
                            </p>
                          )}
                        </div>

                        {/* Timestamp */}
                        <span className="text-[10px] font-mono text-muted-foreground flex-shrink-0 mt-0.5">
                          {formatFullTime(event.createdAt)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
