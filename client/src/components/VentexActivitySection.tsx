// VENTEX Activity Section — Client Portal
// Weekly summary of what VENTEX agents have done for this client.
// Shows recent agent actions in plain English, no internal jargon.

import { trpc } from "@/lib/trpc";
import { formatTimestamp } from "@/lib/data";
import { motion } from "framer-motion";
import { Activity, CheckCircle2, ArrowRight, Bell, FileText, TrendingUp } from "lucide-react";
import { useMemo } from "react";
import { Skeleton } from "@/components/ui/skeleton";

// Map internal action types to client-friendly descriptions
function getActionIcon(actionType: string | null) {
  switch (actionType) {
    case "advance": return <TrendingUp className="size-3.5 text-emerald-400" />;
    case "notify": return <Bell className="size-3.5 text-blue-400" />;
    case "draft": return <FileText className="size-3.5 text-amber-400" />;
    case "escalate": return <ArrowRight className="size-3.5 text-red-400" />;
    default: return <Activity className="size-3.5 text-muted-foreground" />;
  }
}

function getClientFriendlyAction(event: {
  actionType: string | null;
  message: string;
  agentEntityName?: string | null;
}): string {
  // Strip agent names and internal jargon, return plain English
  const name = event.agentEntityName || "your venture";
  switch (event.actionType) {
    case "advance":
      return `Moved ${name} forward to the next stage`;
    case "notify":
      return `Sent a reminder about ${name}`;
    case "draft":
      return `Prepared a document for ${name}`;
    case "escalate":
      return `Flagged an issue with ${name} for review`;
    default:
      // Clean up the message — remove agent names like "Velocity Agent:"
      return event.message
        .replace(/^(Velocity Agent|Compliance Agent|Finance Agent|Operations Agent):\s*/i, "")
        .replace(/\[.*?\]/g, "")
        .trim() || `Updated ${name}`;
  }
}

export default function VentexActivitySection() {
  const feedQ = trpc.agents.clientFeed.useQuery(
    { limit: 20 },
    { refetchInterval: 60000 }
  );

  // Get events from the last 7 days
  const weeklyEvents = useMemo(() => {
    if (!feedQ.data) return [];
    const allEvents = [
      ...(feedQ.data.completed || []),
      ...(feedQ.data.watching || []),
      ...(feedQ.data.actionNeeded || []),
    ];
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    return allEvents
      .filter(e => new Date(e.createdAt) >= oneWeekAgo)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5);
  }, [feedQ.data]);

  const totalThisWeek = weeklyEvents.length;

  if (feedQ.isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-20 rounded-xl" />
      </div>
    );
  }

  // Don't show if no activity
  if (totalThisWeek === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15, duration: 0.3 }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h2 className="text-[11px] uppercase tracking-widest text-muted-foreground font-light">
            VENTEX Activity
          </h2>
          <span className="text-[10px] font-mono text-muted-foreground/60">this week</span>
        </div>
        <div className="flex items-center gap-1.5">
          <CheckCircle2 className="size-3 text-emerald-400" />
          <span className="text-[10px] font-mono text-emerald-400">{totalThisWeek} action{totalThisWeek !== 1 ? "s" : ""}</span>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card divide-y divide-border/50 overflow-hidden">
        {weeklyEvents.map((event, i) => (
          <motion.div
            key={event.id}
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 + i * 0.04, duration: 0.25 }}
            className="px-4 py-3 flex items-start gap-3"
          >
            <div className="mt-0.5 flex-shrink-0">
              {getActionIcon(event.actionType)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-foreground leading-relaxed">
                {getClientFriendlyAction(event)}
              </p>
              <p className="text-[10px] text-muted-foreground/60 font-mono mt-0.5">
                {formatTimestamp(event.createdAt instanceof Date ? event.createdAt.toISOString() : event.createdAt)}
              </p>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
