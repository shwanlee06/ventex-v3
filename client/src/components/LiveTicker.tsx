// ============================================================================
// LiveTicker — Scrolling horizontal ticker strip for agent intelligence signals
// Displays on the dashboard below the top bar
// ============================================================================

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc";
import { getAgentConfig, resolveAgentKey } from "@/contexts/AgentContext";
import { AlertTriangle, Info, AlertCircle } from "lucide-react";

const SEVERITY_ICON: Record<string, React.ReactNode> = {
  critical: <AlertCircle className="size-3 text-red-400 flex-shrink-0" />,
  warning: <AlertTriangle className="size-3 text-amber-400 flex-shrink-0" />,
  info: <Info className="size-3 text-blue-400 flex-shrink-0" />,
};

export default function LiveTicker() {
  const { data: events = [] } = trpc.agents.list.useQuery(
    { limit: 20 },
    { refetchInterval: 60000 }
  );

  const tickerItems = useMemo(() => {
    if (!events || events.length === 0) return [];
    // Take the 10 most recent events
    return events.slice(0, 10).map((e: any) => {
      const config = getAgentConfig(e.agentName);
      return {
        id: e.id,
        agentKey: resolveAgentKey(e.agentName),
        label: config.label,
        color: config.color,
        message: e.message.length > 120 ? e.message.slice(0, 117) + "..." : e.message,
        severity: e.severity,
        time: new Date(e.createdAt),
      };
    });
  }, [events]);

  if (tickerItems.length === 0) {
    return (
      <div className="w-full bg-card/50 border-b border-border/50 py-1.5 px-4 overflow-hidden">
        <div className="flex items-center gap-2">
          <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse flex-shrink-0" />
          <span className="text-[10px] font-mono text-muted-foreground">
            ATLAS INTELLIGENCE — No signals yet. Run agents to generate intelligence.
          </span>
        </div>
      </div>
    );
  }

  // Duplicate items for seamless scroll loop
  const doubled = [...tickerItems, ...tickerItems];

  return (
    <div className="w-full bg-card/50 border-b border-border/50 py-1.5 overflow-hidden relative">
      {/* Fade edges */}
      <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-card/50 to-transparent z-10" />
      <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-card/50 to-transparent z-10" />

      <div className="flex animate-ticker whitespace-nowrap">
        {doubled.map((item, i) => (
          <div
            key={`${item.id}-${i}`}
            className="inline-flex items-center gap-1.5 px-3 flex-shrink-0"
          >
            <span
              className="size-1.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: item.color }}
            />
            <span
              className="text-[10px] font-mono font-medium flex-shrink-0"
              style={{ color: item.color }}
            >
              {item.label.toUpperCase().slice(0, 12)}
            </span>
            {SEVERITY_ICON[item.severity]}
            <span className="text-[10px] text-muted-foreground truncate max-w-[280px]">
              {item.message}
            </span>
            <span className="text-[9px] text-muted-foreground/50 font-mono flex-shrink-0 mx-1">•</span>
          </div>
        ))}
      </div>
    </div>
  );
}
