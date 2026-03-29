/**
 * LivePresenceWidget — Shows who's currently active in the system.
 * Polls team.liveStatuses every 15 seconds for real-time presence.
 * "Online" = actively using the system (heartbeat within 5 min + user interaction)
 * "Away" = tab open but idle or heartbeat 5-30 min ago
 * "Offline" = no heartbeat for 30+ min or never logged in
 */

import { trpc } from "@/lib/trpc";
import LiveStatusDot, { type LiveStatus } from "@/components/LiveStatusDot";
import { cn } from "@/lib/utils";
import { Users, Wifi } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useMemo, useState } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

function formatLastActive(lastSeenAt: string | null): string {
  if (!lastSeenAt) return "Never connected";
  const diff = Date.now() - new Date(lastSeenAt).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Active now";
  if (mins < 5) return `Active ${mins}m ago`;
  if (mins < 60) return `Last seen ${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `Last seen ${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `Last seen ${days}d ago`;
}

export default function LivePresenceWidget() {
  const liveQ = trpc.team.liveStatuses.useQuery(undefined, {
    refetchInterval: 15_000, // poll every 15s
  });
  const [expanded, setExpanded] = useState(false);

  const members = useMemo(() => {
    if (!liveQ.data) return [];
    return liveQ.data
      .filter((m) => m.type === "Internal" && m.adminStatus !== "deactivated")
      .map((m) => ({
        id: m.id,
        name: m.name,
        liveStatus: m.liveStatus as LiveStatus,
        lastSeenAt: m.lastSeenAt,
      }))
      .sort((a, b) => {
        // Online first, then away, then offline
        const order: Record<string, number> = { online: 0, away: 1, offline: 2, on_leave: 3, deactivated: 4 };
        return (order[a.liveStatus] ?? 5) - (order[b.liveStatus] ?? 5);
      });
  }, [liveQ.data]);

  const onlineCount = members.filter((m) => m.liveStatus === "online").length;
  const awayCount = members.filter((m) => m.liveStatus === "away").length;
  const totalActive = onlineCount + awayCount;

  if (liveQ.isLoading) {
    return (
      <div className="bg-card border border-border rounded-xl p-3 flex items-center gap-3 animate-pulse">
        <div className="size-8 rounded-full bg-secondary" />
        <div className="h-3 w-24 bg-secondary rounded" />
      </div>
    );
  }

  return (
    <motion.div
      layout
      className="bg-card border border-border rounded-xl overflow-hidden"
    >
      {/* Compact header — always visible */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-3 flex items-center justify-between hover:bg-accent/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center size-8 rounded-lg bg-emerald-500/10">
            <Wifi className="size-4 text-emerald-400" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-foreground">Live</span>
            <span className="text-[11px] font-mono text-muted-foreground">
              {onlineCount} active{awayCount > 0 ? ` · ${awayCount} idle` : ""}
            </span>
          </div>
          {/* Stacked avatars for online users */}
          <div className="flex ml-2">
            {members
              .filter((m) => m.liveStatus === "online")
              .slice(0, 5)
              .map((m, i) => (
                <Tooltip key={m.id}>
                  <TooltipTrigger asChild>
                    <div className="relative" style={{ marginLeft: i === 0 ? 0 : -6, zIndex: 10 - i }}>
                      <div className="size-6 rounded-full bg-secondary border-2 border-card flex items-center justify-center text-[9px] font-medium text-foreground">
                        {m.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .slice(0, 2)}
                      </div>
                      <span className="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full bg-emerald-400 border-2 border-card" />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-xs">
                    <p className="font-medium">{m.name}</p>
                    <p className="text-muted-foreground">{formatLastActive(m.lastSeenAt)}</p>
                  </TooltipContent>
                </Tooltip>
              ))}
            {onlineCount > 5 && (
              <div className="size-6 rounded-full bg-secondary border-2 border-card flex items-center justify-center text-[9px] font-mono text-muted-foreground" style={{ marginLeft: -6, zIndex: 0 }}>
                +{onlineCount - 5}
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {totalActive > 0 && (
            <span className="flex items-center gap-1">
              <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
            </span>
          )}
          <Users className={cn("size-3.5 text-muted-foreground transition-transform", expanded && "rotate-180")} />
        </div>
      </button>

      {/* Expanded list */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 space-y-1 border-t border-border pt-2">
              {members.length === 0 ? (
                <p className="text-xs text-muted-foreground py-2 text-center">No team members found</p>
              ) : (
                members.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-accent/20 transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="relative">
                        <div className="size-6 rounded-full bg-secondary flex items-center justify-center text-[9px] font-medium text-foreground">
                          {m.name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                            .slice(0, 2)}
                        </div>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs font-medium text-foreground">{m.name}</span>
                        <span className="text-[9px] font-mono text-muted-foreground/60">
                          {formatLastActive(m.lastSeenAt)}
                        </span>
                      </div>
                    </div>
                    <LiveStatusDot
                      status={m.liveStatus}
                      lastSeenAt={m.lastSeenAt}
                      size="sm"
                      showLabel
                    />
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
