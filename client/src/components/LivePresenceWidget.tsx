/**
 * LivePresenceWidget — Shows who's currently active in the system.
 * Separates VENTEX operators (type=Internal, orgId=null) from client team members.
 * Polls team.liveStatuses every 15 seconds for real-time presence.
 */

import { trpc } from "@/lib/trpc";
import LiveStatusDot, { type LiveStatus } from "@/components/LiveStatusDot";
import { cn } from "@/lib/utils";
import { Users, Wifi, Shield, Building2, ChevronDown } from "lucide-react";
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

function sortByPresence(members: MemberEntry[]) {
  const order: Record<string, number> = { online: 0, away: 1, offline: 2, on_leave: 3, deactivated: 4 };
  return [...members].sort((a, b) => (order[a.liveStatus] ?? 5) - (order[b.liveStatus] ?? 5));
}

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

function AvatarStack({ members }: { members: MemberEntry[] }) {
  const online = members.filter((m) => m.liveStatus === "online").slice(0, 5);
  const extra = members.filter((m) => m.liveStatus === "online").length - 5;
  if (online.length === 0) return null;
  return (
    <div className="flex ml-2">
      {online.map((m, i) => (
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
      {extra > 0 && (
        <div className="size-6 rounded-full bg-secondary border-2 border-card flex items-center justify-center text-[9px] font-mono text-muted-foreground" style={{ marginLeft: -6, zIndex: 0 }}>
          +{extra}
        </div>
      )}
    </div>
  );
}

export default function LivePresenceWidget() {
  const liveQ = trpc.team.liveStatuses.useQuery(undefined, {
    refetchInterval: 15_000,
  });
  const [expanded, setExpanded] = useState(false);

  const { ventex, client } = useMemo(() => {
    if (!liveQ.data) return { ventex: [] as MemberEntry[], client: [] as MemberEntry[] };
    const all = liveQ.data
      .filter((m) => m.adminStatus !== "deactivated")
      .map((m) => ({
        id: m.id,
        name: m.name,
        type: m.type,
        liveStatus: m.liveStatus as LiveStatus,
        lastSeenAt: m.lastSeenAt,
      }));

    // VENTEX operators = type "Internal" (orgId null on server)
    const ventexMembers = sortByPresence(all.filter((m) => m.type === "Internal"));
    // Client team = everyone else (Advisor, External Partner, Contributor, Client, etc.)
    const clientMembers = sortByPresence(all.filter((m) => m.type !== "Internal"));

    return { ventex: ventexMembers, client: clientMembers };
  }, [liveQ.data]);

  const ventexOnline = ventex.filter((m) => m.liveStatus === "online").length;
  const clientOnline = client.filter((m) => m.liveStatus === "online").length;
  const totalOnline = ventexOnline + clientOnline;

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
      {/* Compact header — always visible */}
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
              {totalOnline} active
            </span>
          </div>
          <AvatarStack members={ventex} />
        </div>
        <div className="flex items-center gap-2">
          {totalOnline > 0 && (
            <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
          )}
          <ChevronDown className={cn("size-3.5 text-muted-foreground transition-transform duration-200", expanded && "rotate-180")} />
        </div>
      </button>

      {/* Expanded list — separated into VENTEX and Client sections */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="border-t border-border">
              {/* VENTEX Operators Section */}
              <div className="px-4 pt-3 pb-2">
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="size-3 text-amber-400/70" />
                  <span className="text-[10px] font-mono uppercase tracking-[0.1em] text-amber-400/70">
                    VENTEX Operators
                  </span>
                  <span className="text-[10px] font-mono text-muted-foreground/50">
                    {ventexOnline}/{ventex.length}
                  </span>
                </div>
                <div className="space-y-0.5">
                  {ventex.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-1.5 px-2">No operators</p>
                  ) : (
                    ventex.map((m) => <MemberRow key={m.id} m={m} />)
                  )}
                </div>
              </div>

              {/* Divider */}
              <div className="mx-4 border-t border-border/50" />

              {/* Client Team Section */}
              <div className="px-4 pt-3 pb-3">
                <div className="flex items-center gap-2 mb-2">
                  <Building2 className="size-3 text-blue-400/70" />
                  <span className="text-[10px] font-mono uppercase tracking-[0.1em] text-blue-400/70">
                    Client Team
                  </span>
                  <span className="text-[10px] font-mono text-muted-foreground/50">
                    {clientOnline}/{client.length}
                  </span>
                </div>
                <div className="space-y-0.5">
                  {client.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-1.5 px-2">No client members</p>
                  ) : (
                    client.map((m) => <MemberRow key={m.id} m={m} />)
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
