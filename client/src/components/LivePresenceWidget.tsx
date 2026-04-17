/**
 * LivePresenceWidget — Shows VENTEX operator presence only.
 * Client team presence is their own concern, not shown here.
 * Polls team.liveStatuses every 15 seconds for real-time presence.
 */

import { trpc } from "@/lib/trpc";
import LiveStatusDot, { type LiveStatus } from "@/components/LiveStatusDot";
import { cn } from "@/lib/utils";
import { Wifi, Shield, ChevronDown } from "lucide-react";
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

type MemberEntry = {
  id: number;
  name: string;
  liveStatus: LiveStatus;
  lastSeenAt: string | null;
};

function MemberRow({ m }: { m: MemberEntry }) {
  return (
    <div className="flex items-center justify-between py-2 px-2.5 rounded-lg hover:bg-accent/20 transition-colors">
      <div className="flex items-center gap-2.5">
        <div className="relative">
          <div className="size-7 rounded-full bg-secondary flex items-center justify-center text-[10px] font-medium text-foreground">
            {m.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
          </div>
        </div>
        <div className="flex flex-col">
          <span className="text-xs font-medium text-foreground">{m.name}</span>
          <span className="text-[9px] font-mono text-muted-foreground/60">
            {formatLastActive(m.lastSeenAt)}
          </span>
        </div>
      </div>
      <LiveStatusDot status={m.liveStatus} lastSeenAt={m.lastSeenAt} size="sm" showLabel />
    </div>
  );
}

export default function LivePresenceWidget() {
  const liveQ = trpc.team.liveStatuses.useQuery(undefined, {
    refetchInterval: 10_000, // 10s polling for real-time presence
  });
  const [expanded, setExpanded] = useState(false);

  // Only show VENTEX operators (type=Internal)
  const operators = useMemo(() => {
    if (!liveQ.data) return [] as MemberEntry[];
    const order: Record<string, number> = { online: 0, away: 1, offline: 2, on_leave: 3, deactivated: 4 };
    return liveQ.data
      .filter((m) => m.type === "Internal" && m.adminStatus !== "deactivated")
      .map((m) => ({
        id: m.id,
        name: m.name,
        liveStatus: m.liveStatus as LiveStatus,
        lastSeenAt: m.lastSeenAt,
      }))
      .sort((a, b) => (order[a.liveStatus] ?? 5) - (order[b.liveStatus] ?? 5));
  }, [liveQ.data]);

  const onlineCount = operators.filter((m) => m.liveStatus === "online").length;

  if (liveQ.isLoading) {
    return (
      <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3 animate-pulse">
        <div className="size-8 rounded-full bg-secondary" />
        <div className="h-3 w-24 bg-secondary rounded" />
      </div>
    );
  }

  return (
    <motion.div layout className="bg-card border border-border rounded-xl overflow-hidden">
      {/* Compact header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-3.5 flex items-center justify-between hover:bg-accent/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center size-8 rounded-lg bg-emerald-500/10">
            <Wifi className="size-4 text-emerald-400" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-foreground">Live</span>
            <span className="text-[11px] font-mono text-muted-foreground">
              {onlineCount}/{operators.length} online
            </span>
          </div>
          {/* Stacked avatars for online operators */}
          <div className="flex ml-2">
            {operators
              .filter((m) => m.liveStatus === "online")
              .slice(0, 5)
              .map((m, i) => (
                <Tooltip key={m.id}>
                  <TooltipTrigger asChild>
                    <div className="relative" style={{ marginLeft: i === 0 ? 0 : -6, zIndex: 10 - i }}>
                      <div className="size-6 rounded-full bg-secondary border-2 border-card flex items-center justify-center text-[9px] font-medium text-foreground">
                        {m.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
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
          </div>
        </div>
        <div className="flex items-center gap-2">
          {onlineCount > 0 && (
            <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
          )}
          <ChevronDown className={cn("size-3.5 text-muted-foreground transition-transform duration-200", expanded && "rotate-180")} />
        </div>
      </button>

      {/* Expanded — VENTEX operators only */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="border-t border-border px-4 pt-3 pb-3">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="size-3 text-amber-400/70" />
                <span className="text-[10px] font-mono uppercase tracking-[0.1em] text-amber-400/70">
                  VENTEX Operators
                </span>
                <span className="text-[10px] font-mono text-muted-foreground/50">
                  {onlineCount}/{operators.length}
                </span>
              </div>
              <div className="space-y-0.5">
                {operators.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-1.5 px-2">No operators</p>
                ) : (
                  operators.map((m) => <MemberRow key={m.id} m={m} />)
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
