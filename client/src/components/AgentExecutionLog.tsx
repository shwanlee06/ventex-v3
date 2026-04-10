// Agent Execution Log — Timestamped action feed showing what agents DID
// Format: [Agent Name] [Timestamp] Action description — outcome
// The proof that ATLAS is executing, not just watching.

import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useMemo } from "react";
import {
  Activity,
  Bot,
  Mail,
  ArrowUpRight,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ChevronDown,
  ChevronUp,
  Filter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

// Agent color mapping
const AGENT_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  "Overdue Agent":    { bg: "bg-red-500/10",    text: "text-red-400",    dot: "bg-red-400" },
  "Velocity Agent":   { bg: "bg-blue-500/10",   text: "text-blue-400",   dot: "bg-blue-400" },
  "Orchestrator":     { bg: "bg-purple-500/10",  text: "text-purple-400", dot: "bg-purple-400" },
  "Compliance Agent": { bg: "bg-amber-500/10",   text: "text-amber-400",  dot: "bg-amber-400" },
  "Distribution Agent": { bg: "bg-emerald-500/10", text: "text-emerald-400", dot: "bg-emerald-400" },
};

const ACTION_ICONS: Record<string, React.ReactNode> = {
  notify:   <Mail className="size-3.5" />,
  advance:  <ArrowUpRight className="size-3.5" />,
  draft:    <FileText className="size-3.5" />,
  escalate: <AlertTriangle className="size-3.5" />,
};

function getAgentStyle(agentName: string) {
  return AGENT_COLORS[agentName] || { bg: "bg-muted", text: "text-muted-foreground", dot: "bg-muted-foreground" };
}

function formatLogTime(date: Date | string | null) {
  if (!date) return "";
  const d = new Date(date);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;

  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" }) +
    " " + d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false });
}

function formatLogTimeFull(date: Date | string | null) {
  if (!date) return "";
  const d = new Date(date);
  return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }) +
    " UTC · " + d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

interface AgentExecutionLogProps {
  organizationId?: number;
  limit?: number;
  compact?: boolean;
}

export default function AgentExecutionLog({ organizationId, limit = 25, compact = false }: AgentExecutionLogProps) {
  const [expanded, setExpanded] = useState(!compact);
  const [filterAgent, setFilterAgent] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  // Fetch agent events — these are real execution records
  const eventsQ = trpc.agents.listEvents.useQuery(
    { organizationId: organizationId || 0, limit: 100 },
    { enabled: !!organizationId, refetchInterval: 30_000 }
  );

  // Also fetch across all orgs for ATLAS admin view
  const allEventsQ = trpc.agents.listEvents.useQuery(
    { organizationId: 0, limit: 100 },
    { enabled: !organizationId, refetchInterval: 30_000 }
  );

  const events = organizationId ? (eventsQ.data || []) : (allEventsQ.data || []);
  const isLoading = organizationId ? eventsQ.isLoading : allEventsQ.isLoading;

  // Get unique agent names for filter
  const agentNames = useMemo(() => {
    const names = new Set(events.map(e => e.agentName));
    return Array.from(names).sort();
  }, [events]);

  // Filter events
  const filteredEvents = useMemo(() => {
    let filtered = events;
    if (filterAgent) {
      filtered = filtered.filter(e => e.agentName === filterAgent);
    }
    return showAll ? filtered : filtered.slice(0, limit);
  }, [events, filterAgent, showAll, limit]);

  // Stats
  const stats = useMemo(() => {
    const now = new Date();
    const last24h = events.filter(e => {
      const created = new Date(e.createdAt);
      return now.getTime() - created.getTime() < 86400000;
    });
    return {
      total: events.length,
      last24h: last24h.length,
      byAgent: agentNames.reduce((acc, name) => {
        acc[name] = events.filter(e => e.agentName === name).length;
        return acc;
      }, {} as Record<string, number>),
    };
  }, [events, agentNames]);

  if (isLoading) {
    return (
      <div className="bg-card border border-border rounded-lg p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Skeleton className="size-4 rounded" />
          <Skeleton className="h-4 w-40" />
        </div>
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-12 rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      {/* Header */}
      <div
        className={cn(
          "flex items-center justify-between p-4 border-b border-border",
          compact && "cursor-pointer hover:bg-accent/30 transition-colors"
        )}
        onClick={compact ? () => setExpanded(!expanded) : undefined}
      >
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center size-7 rounded-md bg-primary/10">
            <Activity className="size-4 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">Agent Execution Log</h3>
            <p className="text-[10px] text-muted-foreground">
              {stats.last24h > 0
                ? `${stats.last24h} actions in the last 24h · ${stats.total} total`
                : events.length > 0
                  ? `${stats.total} recorded actions`
                  : "No agent actions recorded yet"
              }
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {events.length > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[10px] font-mono text-emerald-400">live</span>
            </div>
          )}
          {compact && (
            expanded ? <ChevronUp className="size-4 text-muted-foreground" /> : <ChevronDown className="size-4 text-muted-foreground" />
          )}
        </div>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={compact ? { height: 0, opacity: 0 } : false}
            animate={{ height: "auto", opacity: 1 }}
            exit={compact ? { height: 0, opacity: 0 } : undefined}
            transition={{ duration: 0.2 }}
          >
            {/* Agent filter chips */}
            {agentNames.length > 1 && (
              <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border overflow-x-auto">
                <Filter className="size-3 text-muted-foreground flex-shrink-0" />
                <button
                  onClick={() => setFilterAgent(null)}
                  className={cn(
                    "text-[10px] px-2 py-0.5 rounded-full transition-colors whitespace-nowrap",
                    !filterAgent ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground hover:text-foreground"
                  )}
                >
                  All ({stats.total})
                </button>
                {agentNames.map(name => {
                  const style = getAgentStyle(name);
                  return (
                    <button
                      key={name}
                      onClick={() => setFilterAgent(filterAgent === name ? null : name)}
                      className={cn(
                        "text-[10px] px-2 py-0.5 rounded-full transition-colors whitespace-nowrap",
                        filterAgent === name ? `${style.bg} ${style.text}` : "bg-muted text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {name} ({stats.byAgent[name] || 0})
                    </button>
                  );
                })}
              </div>
            )}

            {/* Event list */}
            <div className="divide-y divide-border max-h-[420px] overflow-y-auto">
              {filteredEvents.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 px-4">
                  <Bot className="size-8 text-muted-foreground/30 mb-3" />
                  <p className="text-sm text-muted-foreground">No agent actions recorded yet</p>
                  <p className="text-[11px] text-muted-foreground/60 mt-1">
                    Agent actions will appear here as they execute
                  </p>
                </div>
              ) : (
                filteredEvents.map((event, i) => {
                  const style = getAgentStyle(event.agentName);
                  const icon = ACTION_ICONS[event.actionType || ""] || <Bot className="size-3.5" />;

                  return (
                    <motion.div
                      key={event.id}
                      initial={{ opacity: 0, x: -4 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.02, duration: 0.2 }}
                      className="px-4 py-3 hover:bg-accent/20 transition-colors group"
                    >
                      <div className="flex gap-3">
                        {/* Timeline dot */}
                        <div className="flex flex-col items-center pt-1">
                          <div className={cn("size-2 rounded-full flex-shrink-0", style.dot)} />
                          {i < filteredEvents.length - 1 && (
                            <div className="w-px flex-1 bg-border mt-1" />
                          )}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded", style.bg, style.text)}>
                              {event.agentName}
                            </span>
                            <span className="text-[10px] font-mono text-muted-foreground">
                              {formatLogTime(event.createdAt)}
                            </span>
                            {event.actionType && (
                              <span className="text-muted-foreground/50">
                                {icon}
                              </span>
                            )}
                          </div>

                          <p className="text-xs text-foreground mt-1 leading-relaxed">
                            {event.message}
                          </p>

                          {event.agentEntityName && (
                            <p className="text-[10px] text-muted-foreground mt-0.5">
                              {event.entityType ? `${event.entityType}: ` : ""}{event.agentEntityName}
                              {event.oldStatus && event.newStatus && (
                                <span className="ml-1">
                                  · {event.oldStatus} → {event.newStatus}
                                </span>
                              )}
                            </p>
                          )}

                          {/* Full timestamp on hover */}
                          <p className="text-[9px] text-muted-foreground/40 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            {formatLogTimeFull(event.createdAt)}
                          </p>
                        </div>

                        {/* Outcome indicator */}
                        <div className="flex-shrink-0 pt-1">
                          {event.actionTaken ? (
                            <CheckCircle2 className="size-3.5 text-emerald-400" />
                          ) : event.severity === "critical" ? (
                            <AlertTriangle className="size-3.5 text-red-400" />
                          ) : (
                            <Clock className="size-3.5 text-muted-foreground/30" />
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </div>

            {/* Show more */}
            {events.length > limit && !showAll && (
              <div className="p-3 border-t border-border">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-[11px] text-muted-foreground hover:text-foreground"
                  onClick={() => setShowAll(true)}
                >
                  Show all {events.length} actions
                </Button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
