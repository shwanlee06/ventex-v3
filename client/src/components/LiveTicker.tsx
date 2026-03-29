// ============================================================================
// LiveTicker — Velocity Build: 36px scrolling agent signal strip
// Position: between KPI cards and Live presence bar on operator dashboard
// Operator only — never visible in client portal
// ============================================================================

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc";
import { getAgentConfig, resolveAgentKey } from "@/contexts/AgentContext";

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

interface LiveTickerProps {
  onEventClick?: () => void;
}

export default function LiveTicker({ onEventClick }: LiveTickerProps) {
  const { data: events = [] } = trpc.agents.list.useQuery(
    { limit: 20 },
    { refetchInterval: 30000 }
  );

  const tickerItems = useMemo(() => {
    if (!events || events.length === 0) return [];
    return events.slice(0, 12).map((e: any) => {
      const config = getAgentConfig(e.agentName);
      const key = resolveAgentKey(e.agentName);
      return {
        id: e.id,
        agentKey: key,
        label: config.label,
        color: config.color,
        message: e.message.length > 55 ? e.message.slice(0, 52) + "..." : e.message,
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
            Agent system initializing...
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
      <div className="flex items-center gap-1.5 px-4 flex-shrink-0 z-20 bg-card/50">
        <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
        <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-400 font-medium">LIVE</span>
        <span className="w-px h-3 bg-border/60 ml-1" />
      </div>

      {/* Fade edges */}
      <div className="absolute left-20 top-0 bottom-0 w-6 bg-gradient-to-r from-card/50 to-transparent z-10" />
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
            {/* Message */}
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
