// LiveTicker — Agent Action Strip
// Shows what agents DID, not what humans should do.
// Position: between KPI cards and Live presence bar on operator dashboard
// Operator only — never visible in client portal
// Uses AgentContext to avoid duplicate agents.list polling

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { useAgents, getAgentConfig, resolveAgentKey } from "@/contexts/AgentContext";

const SEVERITY_DOT: Record<string, string> = {
  critical: "bg-red-400",
  warning: "bg-amber-400",
  info: "bg-teal-400",
};

function timeAgo(date: Date): string {
  const now = Date.now();
  const diff = now - new Date(date).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

/**
 * Rewrite agent messages to describe what the agent DID.
 * Remove "assigning" language, remove human-directed instructions.
 * Format: "[Agent] — [past-tense action on specific entity]"
 */
function rewriteMessage(message: string, agentLabel: string): string {
  // Strip leading agent name prefix if present
  let cleaned = message
    .replace(/^(Velocity Agent|Compliance Agent|Finance Agent|Operations Agent|Overdue Agent|Orchestrator):\s*/i, "")
    .trim();

  // Remove "assigning" language patterns
  cleaned = cleaned
    .replace(/\bby assigning\b.*$/i, "")
    .replace(/\bAddress the (\d+) overdue tasks? immediately\b/i, `Sent follow-up on $1 overdue task(s)`)
    .replace(/\bAddress\s+/i, "Acted on ")
    .replace(/\bassigning\b/gi, "processing")
    .replace(/\bAssign\b/gi, "Processed")
    .replace(/\bshould\s+/gi, "")
    .replace(/\bneeds?\s+to\s+/gi, "")
    .replace(/\bplease\s+/gi, "")
    .trim();

  // If message is empty after cleaning, provide a generic action
  if (!cleaned || cleaned.length < 5) {
    cleaned = "Completed scheduled check";
  }

  // Capitalize first letter
  cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);

  // Truncate
  if (cleaned.length > 60) {
    cleaned = cleaned.slice(0, 57) + "...";
  }

  return cleaned;
}

interface LiveTickerProps {
  onEventClick?: () => void;
}

export default function LiveTicker({ onEventClick }: LiveTickerProps) {
  // Use shared AgentContext instead of separate trpc.agents.list.useQuery
  const agents = useAgents();
  const events = agents.events;

  const tickerItems = useMemo(() => {
    if (!events || events.length === 0) return [];
    // Filter out noise — only show events where agents actually DID something
    const NOISE_PATTERNS = [
      /no active ventures/i,
      /no distributions scheduled/i,
      /all tasks are on schedule/i,
      /no overdue items/i,
      /no action required/i,
      /standing by/i,
      /nothing to report/i,
      /no.*detected/i,
      /completed scheduled check/i,
    ];
    const actionableEvents = events.filter((e: any) => {
      const msg = e.message || "";
      return !NOISE_PATTERNS.some(p => p.test(msg));
    });
    // If no actionable events, show nothing (empty ticker will render "standing by")
    if (actionableEvents.length === 0) return [];
    return actionableEvents.slice(0, 12).map((e: any) => {
      const config = getAgentConfig(e.agentName);
      const key = resolveAgentKey(e.agentName);
      return {
        id: e.id,
        agentKey: key,
        label: config.label,
        color: config.color,
        message: rewriteMessage(e.message, config.label),
        severity: e.severity as string,
        time: e.createdAt,
      };
    });
  }, [events]);

  if (tickerItems.length === 0) {
    return (
      <div className="w-full h-9 bg-card/50 border-b border-border/50 flex items-center px-4 overflow-hidden">
        <div className="flex items-center gap-2">
          <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse flex-shrink-0" />
          <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-400 font-medium">LIVE</span>
          <span className="w-px h-3 bg-border/60 mx-1" />
          <span className="text-[10px] font-mono text-muted-foreground/60">
            Agents standing by — no recent actions
          </span>
        </div>
      </div>
    );
  }

  // Duplicate items for seamless scroll loop
  const doubled = [...tickerItems, ...tickerItems];

  return (
    <div
      className="w-full h-9 bg-card/50 border-b border-border/50 flex items-center overflow-hidden relative cursor-pointer"
      onClick={onEventClick}
    >
      {/* LIVE indicator */}
      <div className="flex items-center gap-1.5 px-2 sm:px-4 flex-shrink-0 z-20 bg-card/80 backdrop-blur-sm">
        <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
        <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-400 font-medium">LIVE</span>
        <span className="w-px h-3 bg-border/60 ml-1" />
      </div>

      {/* Fade edges */}
      <div className="absolute left-16 sm:left-20 top-0 bottom-0 w-6 bg-gradient-to-r from-card/80 to-transparent z-10" />
      <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-card/50 to-transparent z-10" />

      {/* Scrolling marquee */}
      <div className="flex animate-ticker whitespace-nowrap">
        {doubled.map((item, i) => (
          <div
            key={`${item.id}-${i}`}
            className="inline-flex items-center gap-1.5 px-3 flex-shrink-0"
          >
            {/* Severity dot */}
            <span
              className={cn(
                "size-1.5 rounded-full flex-shrink-0",
                SEVERITY_DOT[item.severity] || "bg-teal-400"
              )}
            />
            {/* Agent name */}
            <span
              className="text-[10px] font-mono font-medium flex-shrink-0"
              style={{ color: item.color }}
            >
              {item.label.toUpperCase().slice(0, 12)}
            </span>
            {/* Separator */}
            <span className="text-[10px] text-muted-foreground/40">—</span>
            {/* Action description (past tense, what agent DID) */}
            <span className="text-[10px] text-muted-foreground truncate max-w-[280px]">
              {item.message}
            </span>
            {/* Time ago */}
            <span className="text-[9px] text-muted-foreground/40 font-mono flex-shrink-0">
              · {timeAgo(item.time)}
            </span>
            {/* Item separator */}
            <span className="text-[9px] text-muted-foreground/20 font-mono flex-shrink-0 mx-2">·</span>
          </div>
        ))}
      </div>
    </div>
  );
}
