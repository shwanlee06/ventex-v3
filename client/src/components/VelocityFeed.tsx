// Velocity Feed — Client-facing agent intelligence feed
// Three card types: ACTION NEEDED (amber) · COMPLETED (teal) · WATCHING (gray)
// Integrated with ClientActionModals for 4 action flows

import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { formatTimestamp } from "@/lib/data";
import {
  AlertTriangle,
  CheckCircle2,
  Eye,
  Bot,
  ArrowRight,
  X,
  ChevronDown,
  ChevronUp,
  Zap,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useMemo, useCallback } from "react";
import { useSSEInvalidation } from "@/hooks/useSSE";
import DataFreshness from "@/components/DataFreshness";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import ClientActionModal, { inferActionFlow, type ActionFlowType } from "@/components/ClientActionModals";

interface VelocityFeedProps {
  onNavigate: (path: string) => void;
}

interface FeedEvent {
  id: number;
  agentName: string;
  eventType: string;
  message: string;
  severity: string;
  entityType: string | null;
  agentEntityId: string | null;
  agentEntityName: string | null;
  oldStatus: string | null;
  newStatus: string | null;
  audience: string | null;
  requiresClientAction: boolean | null;
  clientDismissed: boolean | null;
  actionTaken: boolean | null;
  createdAt: Date | string;
}


function hasActionableEntity(event: FeedEvent): boolean {
  // Only show action buttons if the event links to a real entity
  return !!(event.agentEntityId || (event as any).actionPayload);
}


type CardType = "action_needed" | "completed" | "watching";

function classifyEvent(event: FeedEvent): CardType {
  if (event.actionTaken) return "completed";
  // Only show as action_needed if there's actually an actionable entity linked
  if (event.requiresClientAction && hasActionableEntity(event)) return "action_needed";
  return "watching";
}

const CARD_CONFIG: Record<CardType, {
  borderColor: string;
  icon: React.ReactNode;
  iconColor: string;
  label: string;
  labelColor: string;
  bgAccent: string;
}> = {
  action_needed: {
    borderColor: "border-l-amber-500",
    icon: <AlertTriangle className="size-4" />,
    iconColor: "text-amber-400",
    label: "ACTION NEEDED",
    labelColor: "text-amber-400",
    bgAccent: "bg-amber-500/5",
  },
  completed: {
    borderColor: "border-l-teal-500",
    icon: <CheckCircle2 className="size-4" />,
    iconColor: "text-teal-400",
    label: "COMPLETED",
    labelColor: "text-teal-400",
    bgAccent: "bg-teal-500/5",
  },
  watching: {
    borderColor: "border-l-zinc-600",
    icon: <Eye className="size-4" />,
    iconColor: "text-zinc-400",
    label: "UPDATE",
    labelColor: "text-zinc-500",
    bgAccent: "bg-zinc-500/5",
  },
};


function friendlyAgentName(agentName: string): string {
  const map: Record<string, string> = {
    "Overdue Agent": "Task Monitor",
    "Velocity Agent": "Progress Tracker",
    "Distribution Sentinel": "Distribution Monitor",
    "Orchestrator": "Portfolio Intelligence",
  };
  return map[agentName] || agentName;
}


function getActionText(event: FeedEvent): string | null {
  if (!hasActionableEntity(event)) return null;
  const msg = event.message.toLowerCase();
  if (msg.includes("follow") || msg.includes("draft")) return "Approve Follow-Up";
  if (msg.includes("distribution") || msg.includes("payment")) return "Confirm Distribution";
  if (msg.includes("stall") || msg.includes("stuck") || msg.includes("block")) return "Unblock Venture";
  if (msg.includes("overdue") || msg.includes("task")) return "Review Task";
  return "Take Action";
}


function FeedCard({
  event,
  onNavigate,
  onDismiss,
  onAction,
}: {
  event: FeedEvent;
  onNavigate: (path: string) => void;
  onDismiss: (id: number) => void;
  onAction: (eventId: number, message: string) => void;
}) {
  const cardType = classifyEvent(event);
  const config = CARD_CONFIG[cardType];
  const [expanded, setExpanded] = useState(cardType === "action_needed");

  // Build navigation link based on entity
  const entityLink = useMemo(() => {
    if (!event.entityType || !event.agentEntityId) return null;
    const type = event.entityType.toLowerCase();
    if (type === "venture") return `/ventures/${event.agentEntityId}`;
    if (type === "task") return `/tasks`;
    if (type === "spv") return `/spvs/${event.agentEntityId}`;
    if (type === "distribution") return `/distributions`;
    return null;
  }, [event]);

  const actionText = cardType === "action_needed" ? getActionText(event) : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8, height: 0 }}
      transition={{ duration: 0.25 }}
      className={cn(
        "rounded-xl border border-border border-l-[3px] overflow-hidden transition-all",
        config.borderColor,
        config.bgAccent,
      )}
    >
      <div className="p-4">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0 flex-1">
            <div className={cn("mt-0.5 flex-shrink-0", config.iconColor)}>
              {config.icon}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className={cn("text-[10px] font-medium tracking-wider uppercase", config.labelColor)}>
                  {config.label}
                </span>
                {/* Only show agent name for action_needed and completed, not for watching/update cards */}
                {cardType !== "watching" && (
                  <>
                    <span className="text-[10px] text-muted-foreground/50">·</span>
                    <span className="text-[10px] text-muted-foreground/50 flex items-center gap-1">
                      <Bot className="size-3" />
                      {friendlyAgentName(event.agentName)}
                    </span>
                  </>
                )}
              </div>
              <p className="text-sm text-foreground leading-relaxed">{event.message}</p>
              {event.agentEntityName && (
                <p className="text-[11px] text-muted-foreground mt-1">
                  {event.entityType}: <span className="text-foreground/80">{event.agentEntityName}</span>
                </p>
              )}
            </div>
          </div>

          {/* Dismiss / expand */}
          <div className="flex items-center gap-1 flex-shrink-0">
            {cardType === "watching" && (
              <button
                onClick={() => setExpanded(!expanded)}
                className="p-1 rounded-md text-muted-foreground/40 hover:text-muted-foreground transition-colors"
              >
                {expanded ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
              </button>
            )}
            {cardType !== "completed" && (
              <button
                onClick={() => onDismiss(event.id)}
                className="p-1 rounded-md text-muted-foreground/30 hover:text-muted-foreground transition-colors"
                title="Dismiss"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Expanded content / action buttons */}
        <AnimatePresence>
          {(expanded || cardType === "action_needed") && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <div className="flex items-center gap-2 mt-3 ml-7">
                {cardType === "action_needed" && actionText && (
                  <Button
                    size="sm"
                    className="h-7 text-[11px] bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 border border-amber-500/20 gap-1"
                    variant="ghost"
                    onClick={() => onAction(event.id, event.message)}
                  >
                    {actionText} <ArrowRight className="size-3" />
                  </Button>
                )}
                {entityLink && cardType === "completed" && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-[11px] text-teal-400 hover:text-teal-300 hover:bg-teal-500/10 gap-1 px-0"
                    onClick={() => onNavigate(entityLink)}
                  >
                    View Details <ArrowRight className="size-3" />
                  </Button>
                )}
                <span className="text-[10px] text-muted-foreground/40 ml-auto">
                  {formatTimestamp(event.createdAt instanceof Date ? event.createdAt.toISOString() : String(event.createdAt))}
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}


export default function VelocityFeed({ onNavigate }: VelocityFeedProps) {
  const { activeOrg } = useWorkspace();
  const [showAll, setShowAll] = useState(false);

  // Action modal state
  const [actionModal, setActionModal] = useState<{
    open: boolean;
    eventId: number | null;
    actionType: ActionFlowType | null;
  }>({ open: false, eventId: null, actionType: null });

  const feedQ = trpc.agents.clientFeed.useQuery(
    { organizationId: activeOrg?.id || 0, limit: 20 },
    { enabled: !!activeOrg?.id, refetchInterval: 30000 }
  );

  // SSE: instant refetch on feed_update events
  useSSEInvalidation("feed_update", () => feedQ.refetch());

  const utils = trpc.useUtils();

  const dismissMutation = trpc.agents.clientDismiss.useMutation({
    onSuccess: () => feedQ.refetch(),
  });

  // Broad cache invalidation after any client action
  const invalidateRelated = useCallback(() => {
    feedQ.refetch();
    // Invalidate all related data so dashboards, task lists, etc. refresh
    utils.tasks.invalidate();
    utils.distributions.invalidate();
    utils.ventures.invalidate();
    utils.agents.invalidate();
  }, [feedQ, utils]);

  const feedData = feedQ.data as { actionNeeded: FeedEvent[]; completed: FeedEvent[]; watching: FeedEvent[] } | undefined;
  const grouped = useMemo(() => ({
    actionNeeded: feedData?.actionNeeded || [],
    completed: feedData?.completed || [],
    watching: feedData?.watching || [],
  }), [feedData]);

  const events = useMemo(
    () => [...grouped.actionNeeded, ...grouped.completed, ...grouped.watching],
    [grouped]
  );

  const totalItems = events.length;
  const displayEvents = showAll ? events : events.slice(0, 6);

  // Handle action button click — open the appropriate modal
  const handleAction = useCallback((eventId: number, message: string) => {
    const flow = inferActionFlow(message);
    setActionModal({ open: true, eventId, actionType: flow });
  }, []);

  if (feedQ.isLoading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 mb-2">
          <Zap className="size-4 text-teal-400" />
          <span className="text-[11px] uppercase tracking-widest text-muted-foreground font-light">Velocity Feed</span>
        </div>
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
    );
  }

  // Empty state
  if (totalItems === 0) {
    return (
      <div className="rounded-2xl border border-border bg-card p-8 text-center">
        <div className="flex items-center justify-center gap-2 mb-3">
          <div className="relative">
            <Zap className="size-5 text-teal-400" />
            <span className="absolute -top-0.5 -right-0.5 size-2 rounded-full bg-teal-400 animate-pulse" />
          </div>
          <span className="text-[11px] uppercase tracking-widest text-muted-foreground font-light">Velocity Feed</span>
        </div>
        <p className="text-sm text-muted-foreground font-light">All clear — your portfolio is on track</p>
        <p className="text-[11px] text-muted-foreground/50 mt-1">ATLAS agents are monitoring your ventures</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Zap className="size-4 text-teal-400" />
            {grouped.actionNeeded.length > 0 && (
              <span className="absolute -top-0.5 -right-0.5 size-2 rounded-full bg-amber-400 animate-pulse" />
            )}
          </div>
          <span className="text-[11px] uppercase tracking-widest text-muted-foreground font-light">Velocity Feed</span>
          {grouped.actionNeeded.length > 0 && (
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
              {grouped.actionNeeded.length} action{grouped.actionNeeded.length > 1 ? "s" : ""} needed
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <DataFreshness updatedAt={feedQ.dataUpdatedAt} />
          <button
            onClick={() => onNavigate("/activity")}
            className="text-[11px] text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
          >
            See all activity <ArrowRight className="size-3" />
          </button>
        </div>
      </div>

      <div className="space-y-3">
        <AnimatePresence mode="popLayout">
          {/* Render in order: action_needed → completed → watching */}
          {displayEvents
            .sort((a, b) => {
              const order: Record<CardType, number> = { action_needed: 0, completed: 1, watching: 2 };
              const typeA = classifyEvent(a);
              const typeB = classifyEvent(b);
              if (order[typeA] !== order[typeB]) return order[typeA] - order[typeB];
              // Within same type, newest first
              return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
            })
            .map((event) => (
              <FeedCard
                key={event.id}
                event={event}
                onNavigate={onNavigate}
                onDismiss={(id) => dismissMutation.mutate({ eventId: id })}
                onAction={handleAction}
              />
            ))}
        </AnimatePresence>
      </div>

      {totalItems > 6 && !showAll && (
        <button
          onClick={() => setShowAll(true)}
          className="w-full mt-3 py-2 text-[11px] text-muted-foreground hover:text-foreground transition-colors border border-border/50 rounded-lg hover:border-border"
        >
          Show {totalItems - 6} more items
        </button>
      )}

      {/* Action Modal */}
      <ClientActionModal
        open={actionModal.open}
        onClose={() => setActionModal({ open: false, eventId: null, actionType: null })}
        eventId={actionModal.eventId}
        actionType={actionModal.actionType}
        onSuccess={invalidateRelated}
      />
    </div>
  );
}
