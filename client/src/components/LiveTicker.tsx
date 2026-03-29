import { useAgents } from "@/contexts/AgentContext";
import { cn } from "@/lib/utils";
import {
  AlertCircle, AlertTriangle, Info, CheckCircle2,
  Bot, Activity, Zap,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

// ── Severity config ────────────────────────────────────
const SEVERITY_CONFIG: Record<string, { icon: React.ReactNode; color: string; bg: string; pulse: boolean }> = {
  critical: {
    icon: <AlertCircle className="size-3" />,
    color: "text-red-400",
    bg: "bg-red-500/10",
    pulse: true,
  },
  warning: {
    icon: <AlertTriangle className="size-3" />,
    color: "text-amber-400",
    bg: "bg-amber-500/10",
    pulse: false,
  },
  info: {
    icon: <Info className="size-3" />,
    color: "text-blue-400",
    bg: "bg-blue-500/10",
    pulse: false,
  },
  success: {
    icon: <CheckCircle2 className="size-3" />,
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
    pulse: false,
  },
};

// ── Agent name config ──────────────────────────────────
const AGENT_LABELS: Record<string, { icon: React.ReactNode; label: string }> = {
  overdue: { icon: <AlertTriangle className="size-3" />, label: "Overdue" },
  venture: { icon: <Activity className="size-3" />, label: "Venture" },
  distribution: { icon: <Zap className="size-3" />, label: "Distribution" },
  orchestrator: { icon: <Bot className="size-3" />, label: "Orchestrator" },
};

// Map DB display names → short keys
const DB_NAME_TO_KEY: Record<string, string> = {
  "Overdue Agent": "overdue",
  "Venture Agent": "venture",
  "Distribution Sentinel": "distribution",
  "Orchestrator": "orchestrator",
};

function resolveAgentKey(agentName: string): string {
  return DB_NAME_TO_KEY[agentName] ?? agentName;
}

function formatTime(d: Date | string): string {
  const date = new Date(d);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
}

export default function LiveTicker() {
  const { isOperator, events } = useAgents();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isPaused, setIsPaused] = useState(false);

  // Only show to operators
  if (!isOperator) return null;

  // Get the 10 most recent events
  const recentEvents = events.slice(0, 10);

  if (recentEvents.length === 0) {
    return (
      <div className="bg-card/50 border-b border-border px-4 py-2 flex items-center gap-2">
        <div className="flex items-center gap-1.5">
          <Bot className="size-3 text-muted-foreground" />
          <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">
            Agent Ticker
          </span>
        </div>
        <span className="text-[10px] text-muted-foreground/70">
          Waiting for agent signals...
        </span>
        <div className="ml-auto flex items-center gap-1.5">
          <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[10px] font-mono text-emerald-400">live</span>
        </div>
      </div>
    );
  }

  return (
    <div
      className="bg-card/50 border-b border-border px-4 py-1.5 flex items-center gap-3 overflow-hidden"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Label */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <Bot className="size-3 text-primary" />
        <span className="text-[10px] font-mono text-primary uppercase tracking-wider font-semibold">
          Live
        </span>
      </div>

      {/* Divider */}
      <div className="w-px h-4 bg-border flex-shrink-0" />

      {/* Scrolling ticker */}
      <div className="flex-1 overflow-hidden relative" ref={scrollRef}>
        <div
          className={cn(
            "flex gap-4 items-center",
            !isPaused && recentEvents.length > 3 && "animate-ticker"
          )}
        >
          {recentEvents.map((event) => {
            const sev = SEVERITY_CONFIG[event.severity] || SEVERITY_CONFIG.info;
            const agent = AGENT_LABELS[resolveAgentKey(event.agentName)] || { icon: <Bot className="size-3" />, label: event.agentName };

            return (
              <div
                key={event.id}
                className="flex items-center gap-2 flex-shrink-0 group"
              >
                {/* Severity icon */}
                <span className={cn(sev.color, sev.pulse && "animate-pulse")}>
                  {sev.icon}
                </span>

                {/* Agent badge */}
                <span className="text-[10px] font-mono text-muted-foreground bg-secondary/50 px-1.5 py-0.5 rounded">
                  {agent.label}
                </span>

                {/* Message (truncated) */}
                <span className="text-[11px] text-foreground max-w-[280px] truncate">
                  {event.message}
                </span>

                {/* Time */}
                <span className="text-[10px] font-mono text-muted-foreground/70">
                  {formatTime(event.createdAt)}
                </span>

                {/* Separator dot */}
                <span className="size-1 rounded-full bg-border" />
              </div>
            );
          })}
        </div>
      </div>

      {/* Live indicator */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
        <span className="text-[10px] font-mono text-emerald-400">live</span>
      </div>
    </div>
  );
}
