// Client Portal — /portal/:orgSlug
// Premium, outcome-focused. Zero operator language.
// Velocity Feed: 3 card types — amber (action), teal (completed), gray (watching)

import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { useRoute, useLocation } from "wouter";
import { getLoginUrl } from "@/const";
import {
  CalendarDays,
  Briefcase,
  ArrowRight,
  Clock,
  CheckCircle2,
  ChevronRight,
  ChevronDown,
  Building2,
  Ship,
  UtensilsCrossed,
  Clapperboard,
  Fuel,
  Package,
  AlertCircle,
  Loader2,
  LogOut,
  Zap,
  ArrowUpRight,
  Eye,
  Send,
  DollarSign,
  Unlock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { motion, AnimatePresence } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import { useState, useCallback, useEffect } from "react";
import { toast } from "sonner";
import { FileText, Mail, Trash2 } from "lucide-react";

const SECTOR_ICONS: Record<string, React.ReactNode> = {
  "Real Estate": <Building2 className="size-4" />,
  Yacht: <Ship className="size-4" />,
  "F&B": <UtensilsCrossed className="size-4" />,
  Entertainment: <Clapperboard className="size-4" />,
  "Oil & Gas": <Fuel className="size-4" />,
  Others: <Package className="size-4" />,
};

const ACTION_FLOW_ICONS: Record<string, React.ReactNode> = {
  advance_stage: <ArrowUpRight className="size-3 mr-1.5" />,
  approve_followup: <Send className="size-3 mr-1.5" />,
  confirm_distribution: <DollarSign className="size-3 mr-1.5" />,
  unblock_venture: <Unlock className="size-3 mr-1.5" />,
  view_task: <Eye className="size-3 mr-1.5" />,
};

const STAGES = ["Initial Review", "Under Review", "Fundraising", "Active", "Completed"];

function StageIndicator({ stage }: { stage: string }) {
  const idx = STAGES.indexOf(stage);
  const activeIdx = idx >= 0 ? idx : 0;
  return (
    <div className="flex items-center gap-1">
      {STAGES.map((s, i) => (
        <div
          key={s}
          className={cn(
            "h-1 rounded-full flex-1 transition-all",
            i < activeIdx
              ? "bg-emerald-500"
              : i === activeIdx
                ? "bg-primary"
                : "bg-secondary/40"
          )}
          style={{ minWidth: 12 }}
        />
      ))}
    </div>
  );
}

function friendlyDate(d: Date | string | undefined): string {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d) : d;
  if (isNaN(date.getTime())) return "";
  return formatDistanceToNow(date, { addSuffix: true });
}

export default function ClientPortal() {
  const [, params] = useRoute("/portal/:orgSlug");
  const orgSlug = params?.orgSlug || "";
  const { user, loading: authLoading, logout } = useAuth();
  const [, navigate] = useLocation();
  const [advancingIds, setAdvancingIds] = useState<Set<number>>(new Set());
  const [resolvingIds, setResolvingIds] = useState<Set<number>>(new Set());
  const [watchingExpanded, setWatchingExpanded] = useState(false);
  const [showAllCompleted, setShowAllCompleted] = useState(false);
  const [showAllWatching, setShowAllWatching] = useState(false);
  const [showAllPortfolio, setShowAllPortfolio] = useState(false);
  const [showAllForecasts, setShowAllForecasts] = useState(false);
  const [showAllSignals, setShowAllSignals] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{
    eventId: number;
    actionFlow: string;
    actionLabel: string;
    ventureName: string | null;
    summary: string;
  } | null>(null);
  const [taskDrawer, setTaskDrawer] = useState<{ ventureId: number; ventureName: string } | null>(null);
  const [completingTaskIds, setCompletingTaskIds] = useState<Set<number>>(new Set());


  // Draft Center state
  const [draftFilter, setDraftFilter] = useState<"pending" | "sent" | undefined>("pending");
  const [expandedDraft, setExpandedDraft] = useState<number | null>(null);
  const { data: drafts, isLoading: draftsLoading } = trpc.portal.getDrafts.useQuery(
    { orgSlug, status: draftFilter },
    { enabled: !!orgSlug && !!user }
  );
  const approveDraftMutation = trpc.portal.approveDraft.useMutation({
    onSuccess: () => {
      toast.success("Communication approved and sent");
      utils.portal.getDrafts.invalidate({ orgSlug });
      setExpandedDraft(null);
    },
    onError: (err) => toast.error(err.message || "Failed to send"),
  });
  const dismissDraftMutation = trpc.portal.dismissDraft.useMutation({
    onSuccess: () => {
      toast.success("Draft dismissed");
      utils.portal.getDrafts.invalidate({ orgSlug });
      setExpandedDraft(null);
    },
    onError: (err) => toast.error(err.message || "Failed to dismiss"),
  });


  const { data, isLoading, error } = trpc.portal.getData.useQuery(
    { orgSlug },
    { enabled: !!orgSlug && !!user, retry: false }
  );

  const utils = trpc.useUtils();

  // Task drawer query — only fires when drawer is open
  const { data: ventureTasks, isLoading: tasksLoading } = trpc.portal.getVentureTasks.useQuery(
    { ventureId: taskDrawer?.ventureId ?? 0 },
    { enabled: !!taskDrawer }
  );

  const completeTaskMutation = trpc.portal.completeTask.useMutation({
    onSuccess: (result) => {
      if (result.autoAdvanced) {
        toast.success(result.message, { duration: 5000 });
        setTaskDrawer(null);
      } else {
        toast.success("Task completed");
      }
      utils.portal.getData.invalidate({ orgSlug });
      utils.portal.getVentureTasks.invalidate({ ventureId: taskDrawer?.ventureId ?? 0 });
    },
    onError: (err) => toast.error(err.message || "Failed to complete task"),
    onSettled: (_data, _err, variables) => {
      setCompletingTaskIds((prev) => {
        const next = new Set(prev);
        next.delete(variables.taskId);
        return next;
      });
    },
  });

  const handleCompleteTask = useCallback(
    (taskId: number) => {
      if (!taskDrawer) return;
      setCompletingTaskIds((prev) => new Set(prev).add(taskId));
      completeTaskMutation.mutate({ taskId, ventureId: taskDrawer.ventureId });
    },
    [taskDrawer, completeTaskMutation]
  );

  const advanceMutation = trpc.agents.clientAdvanceStage.useMutation({
    onSuccess: (result) => {
      toast.success(
        `"${result.ventureName}" advanced to ${result.toStage}`,
        { duration: 4000 }
      );
      utils.portal.getData.invalidate({ orgSlug });
    },
    onError: (err) => {
      toast.error(err.message || "Failed to advance venture");
    },
    onSettled: (_data, _err, variables) => {
      setAdvancingIds((prev) => {
        const next = new Set(prev);
        next.delete(variables.ventureId);
        return next;
      });
    },
  });

  const resolveActionMutation = trpc.portal.resolveAction.useMutation({
    onSuccess: (result) => {
      toast.success(result.message, { duration: 4000 });
      utils.portal.getData.invalidate({ orgSlug });
      setConfirmDialog(null);
    },
    onError: (err) => {
      toast.error(err.message || "Action failed");
    },
    onSettled: (_data, _err, variables) => {
      setResolvingIds((prev) => {
        const next = new Set(prev);
        next.delete(variables.eventId);
        return next;
      });
    },
  });

  const handleAdvance = useCallback(
    (ventureId: number, eventId: number) => {
      setAdvancingIds((prev) => new Set(prev).add(ventureId));
      advanceMutation.mutate({ ventureId, eventId });
    },
    [advanceMutation]
  );

  const handleResolveAction = useCallback(
    (eventId: number, actionFlow: string) => {
      setResolvingIds((prev) => new Set(prev).add(eventId));
      resolveActionMutation.mutate({
        eventId,
        actionFlow: actionFlow as "approve_followup" | "confirm_distribution" | "unblock_venture",
      });
    },
    [resolveActionMutation]
  );

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <h1 className="text-xl font-semibold text-foreground">
            Sign in to continue
          </h1>
          <p className="text-sm text-muted-foreground">
            Access your portfolio and updates
          </p>
          <Button asChild>
            <a href={getLoginUrl()}>Sign In</a>
          </Button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-4xl mx-auto px-4 py-12">
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-4 w-40 mb-10" />
          <div className="space-y-6">
            <Skeleton className="h-16 rounded-xl" />
            <Skeleton className="h-48 rounded-xl" />
            <Skeleton className="h-64 rounded-xl" />
            <Skeleton className="h-40 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <AlertCircle className="size-8 text-destructive mx-auto" />
          <h1 className="text-xl font-semibold text-foreground">
            Unable to load portal
          </h1>
          <p className="text-sm text-muted-foreground max-w-md">
            {error.message === "You do not have access to this portal"
              ? "You don't have permission to view this portal."
              : "Something went wrong. Please try again later."}
          </p>
          <Button variant="outline" onClick={() => navigate("/")}>
            Go Home
          </Button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const {
    orgName,
    isOperatorPreview,
    velocitySummary,
    actionCards,
    completedCards,
    watchingCards,
    portfolio,
    forecasts,
    marketSignals,
    portfolioHealth,
  } = data;

  return (
    <div className="min-h-screen bg-background">
      {/* Operator preview banner */}
      {isOperatorPreview && (
        <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 text-center">
          <span className="text-xs font-medium text-amber-400">
            Operator Preview Mode
          </span>
        </div>
      )}

      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-foreground tracking-tight">
              {orgName}
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Managed by VENTEX
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground hidden sm:block">
              {user.name || user.email}
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-foreground"
              onClick={() => logout()}
            >
              <LogOut className="size-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        {/* ── Velocity Summary ─────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="bg-card/50 border border-border/50 rounded-xl px-5 py-4 flex items-start gap-3"
        >
          <Zap className="size-4 text-primary mt-0.5 flex-shrink-0" />
          <p className="text-sm text-muted-foreground leading-relaxed">
            {velocitySummary}
          </p>
        </motion.div>

        {/* ════════════════════════════════════════════════════════════
            VELOCITY FEED — 3 card types: amber → teal → gray
            ════════════════════════════════════════════════════════════ */}

        {/* ── COMING UP (amber) ─────────────────────────────────── */}
        {actionCards.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="flex items-center gap-2 mb-4">
              <AlertCircle className="size-4 text-amber-400" />
              <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">
                Action Needed
              </h2>
              <span className="text-[11px] text-amber-400 ml-auto font-medium">
                {actionCards.length} item{actionCards.length !== 1 ? "s" : ""}
              </span>
            </div>

            <div className="space-y-2">
              <AnimatePresence mode="popLayout">
                {actionCards.map((item, i) => {
                  const isAdvancing = item.ventureId
                    ? advancingIds.has(item.ventureId)
                    : false;
                  const isResolving = resolvingIds.has(item.id);
                  const isBusy = isAdvancing || isResolving;

                  return (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 8, height: 0 }}
                      transition={{ delay: i * 0.03, duration: 0.2 }}
                      className="bg-card border border-amber-500/20 rounded-xl p-4"
                    >
                      <div className="flex items-start gap-3">
                        <div className="size-2 rounded-full bg-amber-400 mt-2 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          {item.ventureName && (
                            <h3 className="text-sm font-medium text-foreground mb-1">
                              {item.ventureName}
                            </h3>
                          )}
                          <p className="text-sm text-muted-foreground leading-relaxed">
                            {item.summary}
                          </p>
                          <div className="flex items-center gap-3 mt-2">
                            {item.fromStage && item.toStage && (
                              <span className="text-[11px] text-muted-foreground/70 font-mono">
                                {item.fromStage} → {item.toStage}
                              </span>
                            )}
                            <span className="text-[11px] text-muted-foreground/50">
                              {friendlyDate(item.date ?? undefined)}
                            </span>
                          </div>
                        </div>

                        {/* Action button — route to correct flow */}
                        {item.actionFlow === "advance_stage" && item.ventureId && (
                          <Button
                            size="sm"
                            className="flex-shrink-0 bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20"
                            disabled={isBusy}
                            onClick={() => handleAdvance(item.ventureId!, item.id)}
                          >
                            {isBusy ? (
                              <Loader2 className="size-3 animate-spin mr-1.5" />
                            ) : (
                              ACTION_FLOW_ICONS["advance_stage"]
                            )}
                            {isBusy ? "Advancing..." : "Advance Status"}
                          </Button>
                        )}

                        {item.actionFlow === "approve_followup" && (
                          <Button
                            size="sm"
                            className="flex-shrink-0 bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20"
                            disabled={isBusy}
                            onClick={() =>
                              setConfirmDialog({
                                eventId: item.id,
                                actionFlow: "approve_followup",
                                actionLabel: "Approve & Send",
                                ventureName: item.ventureName,
                                summary: item.summary,
                              })
                            }
                          >
                            {ACTION_FLOW_ICONS["approve_followup"]}
                            Review & Approve
                          </Button>
                        )}

                        {item.actionFlow === "confirm_distribution" && (
                          <Button
                            size="sm"
                            className="flex-shrink-0 bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20"
                            disabled={isBusy}
                            onClick={() =>
                              setConfirmDialog({
                                eventId: item.id,
                                actionFlow: "confirm_distribution",
                                actionLabel: "Confirm Distribution",
                                ventureName: item.ventureName,
                                summary: item.summary,
                              })
                            }
                          >
                            {ACTION_FLOW_ICONS["confirm_distribution"]}
                            Confirm
                          </Button>
                        )}

                        {item.actionFlow === "unblock_venture" && (
                          <Button
                            size="sm"
                            className="flex-shrink-0 bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20"
                            disabled={isBusy}
                            onClick={() =>
                              setConfirmDialog({
                                eventId: item.id,
                                actionFlow: "unblock_venture",
                                actionLabel: "Unblock Venture",
                                ventureName: item.ventureName,
                                summary: item.summary,
                              })
                            }
                          >
                            {ACTION_FLOW_ICONS["unblock_venture"]}
                            Resolve
                          </Button>
                        )}

                        {item.actionFlow === "view_task" && item.ventureId && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-shrink-0 text-xs"
                            onClick={() => setTaskDrawer({ ventureId: item.ventureId!, ventureName: item.ventureName || "Venture" })}
                          >
                            {ACTION_FLOW_ICONS["view_task"]}
                            View Tasks
                          </Button>
                        )}

                        {!item.actionFlow && item.actionLabel && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-shrink-0 text-xs"
                            onClick={() => {
                              if (item.ventureId) {
                                toast.info(`Navigating to ${item.ventureName || "venture"}...`);
                              } else {
                                toast.info(`${item.actionLabel}: ${item.summary}`);
                              }
                            }}
                          >
                            {item.actionLabel}
                            <ArrowRight className="size-3 ml-1" />
                          </Button>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </motion.section>
        )}

        {/* ── COMPLETED (teal) ────────────────────────────────────── */}
        {completedCards.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05, duration: 0.3 }}
          >
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle2 className="size-4 text-emerald-400" />
              <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">
                Completed
              </h2>
              <span className="text-[11px] text-muted-foreground ml-auto">
                {completedCards.length} update{completedCards.length !== 1 ? "s" : ""}
              </span>
            </div>

            <div className="bg-card border border-emerald-500/15 rounded-xl divide-y divide-border">
              {(showAllCompleted ? completedCards : completedCards.slice(0, 5)).map((item, i) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 + i * 0.03, duration: 0.2 }}
                  className="p-4 flex items-start gap-3"
                >
                  <div className="size-1.5 rounded-full mt-2 flex-shrink-0 bg-emerald-400" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground leading-relaxed">
                      {item.summary}
                    </p>
                    <div className="flex items-center gap-3 mt-1.5">
                      {item.ventureName && (
                        <span className="text-[11px] text-muted-foreground">
                          {item.ventureName}
                        </span>
                      )}
                      <span className="text-[11px] text-muted-foreground/60">
                        {friendlyDate(item.date ?? undefined)}
                      </span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
            {completedCards.length > 5 && (
              <button
                onClick={() => setShowAllCompleted(!showAllCompleted)}
                className="mt-2 w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors py-2"
              >
                {showAllCompleted ? "Show less" : `Show all ${completedCards.length} completed updates`}
              </button>
            )}
          </motion.section>
        )}

        {/* ── WATCHING (gray, collapsed by default) ───────────────── */}
        {watchingCards.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.3 }}
          >
            <button
              onClick={() => setWatchingExpanded(!watchingExpanded)}
              className="flex items-center gap-2 mb-4 w-full text-left group"
            >
              <Eye className="size-4 text-muted-foreground/60" />
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                Watching
              </h2>
              <span className="text-[11px] text-muted-foreground/60 ml-auto mr-1">
                {watchingCards.length} item{watchingCards.length !== 1 ? "s" : ""}
              </span>
              <ChevronDown
                className={cn(
                  "size-3.5 text-muted-foreground/60 transition-transform",
                  watchingExpanded && "rotate-180"
                )}
              />
            </button>

            <AnimatePresence>
              {watchingExpanded && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="bg-card border border-border/50 rounded-xl divide-y divide-border/50">
                    {(showAllWatching ? watchingCards : watchingCards.slice(0, 5)).map((item, i) => (
                      <div
                        key={item.id}
                        className="p-3 flex items-start gap-3"
                      >
                        <div className="size-1.5 rounded-full mt-2 flex-shrink-0 bg-muted-foreground/30" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            {item.summary}
                          </p>
                          <div className="flex items-center gap-3 mt-1">
                            {item.ventureName && (
                              <span className="text-[10px] text-muted-foreground/60">
                                {item.ventureName}
                              </span>
                            )}
                            <span className="text-[10px] text-muted-foreground/40">
                              {friendlyDate(item.date ?? undefined)}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  {watchingCards.length > 5 && (
                    <button
                      onClick={() => setShowAllWatching(!showAllWatching)}
                      className="w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors py-2"
                    >
                      {showAllWatching ? "Show less" : `Show all ${watchingCards.length} watching items`}
                    </button>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.section>
        )}

        {/* ── All Clear (no action cards) ─────────────────────────── */}
        {actionCards.length === 0 && completedCards.length === 0 && watchingCards.length === 0 && (
          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05, duration: 0.3 }}
          >
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle2 className="size-4 text-emerald-400" />
              <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">
                All Clear
              </h2>
            </div>
            <div className="bg-card border border-border rounded-xl p-6 text-center">
              <p className="text-sm text-muted-foreground">
                Nothing needs your attention right now. We'll let you know when
                something comes up.
              </p>
            </div>
          </motion.section>
        )}
        {/* ── AI Communications (Draft Center) ──────────────────── */}
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12, duration: 0.3 }}
        >
          <div className="flex items-center gap-2 mb-4">
            <Mail className="size-4 text-primary" />
            <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">
              AI Communications
            </h2>
            {drafts && drafts.length > 0 && draftFilter === "pending" && (
              <span className="text-[11px] text-amber-400 ml-auto font-medium">
                {drafts.length} pending
              </span>
            )}
          </div>

          {/* Filter tabs */}
          <div className="flex items-center gap-2 mb-4">
            <button
              onClick={() => setDraftFilter("pending")}
              className={cn(
                "text-xs px-3 py-1.5 rounded-full transition-colors",
                draftFilter === "pending"
                  ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                  : "text-muted-foreground hover:text-foreground bg-secondary/30"
              )}
            >
              Pending Review
            </button>
            <button
              onClick={() => setDraftFilter("sent")}
              className={cn(
                "text-xs px-3 py-1.5 rounded-full transition-colors",
                draftFilter === "sent"
                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                  : "text-muted-foreground hover:text-foreground bg-secondary/30"
              )}
            >
              Sent
            </button>
          </div>

          {draftsLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 2 }).map((_, i) => (
                <Skeleton key={i} className="h-16 rounded-xl" />
              ))}
            </div>
          ) : !drafts || drafts.length === 0 ? (
            <div className="bg-card border border-border rounded-xl p-5 text-center">
              <FileText className="size-5 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-xs text-muted-foreground">
                {draftFilter === "pending"
                  ? "No pending communications. AI agents will draft follow-ups when action is needed."
                  : "No sent communications yet."}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {drafts.map((draft, i) => (
                <motion.div
                  key={draft.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03, duration: 0.2 }}
                  className={cn(
                    "bg-card border rounded-xl transition-all",
                    draft.status === "pending"
                      ? "border-amber-500/20 hover:border-amber-500/30"
                      : "border-border"
                  )}
                >
                  <button
                    onClick={() => setExpandedDraft(expandedDraft === draft.id ? null : draft.id)}
                    className="w-full text-left p-4"
                  >
                    <div className="flex items-start gap-3">
                      <div className={cn(
                        "size-2 rounded-full mt-2 flex-shrink-0",
                        draft.status === "pending" ? "bg-amber-400" : "bg-emerald-400"
                      )} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className={cn(
                            "text-[10px] px-1.5 py-0.5 rounded font-medium",
                            draft.draftType === "follow_up" ? "bg-amber-500/10 text-amber-400" :
                            draft.draftType === "lp_notice" ? "bg-blue-500/10 text-blue-400" :
                            "bg-muted text-muted-foreground"
                          )}>
                            {draft.draftType === "follow_up" ? "Follow-up" :
                             draft.draftType === "lp_notice" ? "LP Notice" :
                             draft.draftType}
                          </span>
                          {draft.ventureName && (
                            <span className="text-[10px] text-muted-foreground">
                              {draft.ventureName}
                            </span>
                          )}
                        </div>
                        <p className="text-sm font-medium text-foreground truncate">
                          {draft.subject || "AI-drafted communication"}
                        </p>
                        <div className="flex items-center gap-3 mt-1">
                          {draft.recipientName && (
                            <span className="text-[10px] text-muted-foreground">
                              To: {draft.recipientName}
                              {draft.recipientRole ? ` (${draft.recipientRole})` : ""}
                            </span>
                          )}
                          <span className="text-[10px] text-muted-foreground/50">
                            {friendlyDate(draft.createdAt)}
                          </span>
                        </div>
                      </div>
                      <ChevronDown className={cn(
                        "size-4 text-muted-foreground transition-transform flex-shrink-0",
                        expandedDraft === draft.id && "rotate-180"
                      )} />
                    </div>
                  </button>

                  <AnimatePresence>
                    {expandedDraft === draft.id && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="px-4 pb-4 border-t border-border pt-3">
                          <div className="bg-secondary/30 rounded-lg p-3 mb-3">
                            <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                              {draft.body}
                            </p>
                          </div>
                          {draft.status === "pending" && (
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20"
                                disabled={approveDraftMutation.isPending}
                                onClick={() => approveDraftMutation.mutate({ draftId: draft.id })}
                              >
                                {approveDraftMutation.isPending ? (
                                  <Loader2 className="size-3 animate-spin mr-1.5" />
                                ) : (
                                  <Send className="size-3 mr-1.5" />
                                )}
                                Approve & Send
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-muted-foreground hover:text-foreground"
                                disabled={dismissDraftMutation.isPending}
                                onClick={() => dismissDraftMutation.mutate({ draftId: draft.id })}
                              >
                                <Trash2 className="size-3 mr-1.5" />
                                Dismiss
                              </Button>
                            </div>
                          )}
                          {draft.status === "sent" && draft.sentAt && (
                            <p className="text-[10px] text-emerald-400">
                              Sent {friendlyDate(draft.sentAt)} by {draft.sentBy || "Client"}
                            </p>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))}
            </div>
          )}
        </motion.section>

        {/* ── Your Portfolio ─────────────────────────────────────────── */}        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.3 }}
        >
          <div className="flex items-center gap-2 mb-4">
            <Briefcase className="size-4 text-primary" />
            <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">
              Your Portfolio
            </h2>
            {portfolio.length > 0 && (
              <span className="text-[11px] text-muted-foreground ml-auto">
                {portfolio.length} venture{portfolio.length !== 1 ? "s" : ""}
              </span>
            )}
          </div>

          {portfolio.length === 0 ? (
            <div className="bg-card border border-border rounded-xl p-6 text-center">
              <p className="text-sm text-muted-foreground">
                Your portfolio is being set up. We'll have your ventures ready
                shortly.
              </p>
            </div>
          ) : (
            <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {(showAllPortfolio ? portfolio : portfolio.slice(0, 6)).map((v, i) => (
                <motion.div
                  key={v.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 + i * 0.03, duration: 0.25 }}
                  className="bg-card border border-border rounded-xl p-4 hover:border-primary/20 transition-colors group"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">
                        {SECTOR_ICONS[v.sector] || (
                          <Package className="size-4" />
                        )}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {v.sector}
                      </span>
                    </div>
                    <ChevronRight className="size-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>

                  <h3 className="text-sm font-medium text-foreground mb-1">
                    {v.name}
                  </h3>

                  <p className="text-xs text-muted-foreground mb-2">
                    {v.statusLine}
                  </p>

                  {v.lastAgentAction && (
                    <p
                      className={cn(
                        "text-[11px] mb-3 leading-snug",
                        v.lastAgentActionType === "ready"
                          ? "text-amber-400"
                          : v.lastAgentActionType === "advanced"
                            ? "text-emerald-400"
                            : "text-muted-foreground/70"
                      )}
                    >
                      {v.lastAgentAction}
                    </p>
                  )}

                  <div className="space-y-1.5">
                    <StageIndicator stage={v.stage} />
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-muted-foreground/60">
                        {v.stage}
                      </span>
                    </div>
                  </div>

                  {/* ── Momentum Indicator ── */}
                  {v.momentum && (
                    <div className="mt-3 pt-3 border-t border-border">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-1.5">
                          <Zap className={cn(
                            "size-3",
                            v.momentum.velocityVsBenchmark === "faster" ? "text-emerald-400" :
                            v.momentum.velocityVsBenchmark === "slower" ? "text-red-400" :
                            "text-amber-400"
                          )} />
                          <span className="text-[10px] font-medium text-foreground">
                            {v.momentum.projectedDays}d projected
                          </span>
                        </div>
                        <span className={cn(
                          "text-[9px] font-medium px-1.5 py-0.5 rounded-full",
                          v.momentum.velocityVsBenchmark === "faster" ? "bg-emerald-500/10 text-emerald-400" :
                          v.momentum.velocityVsBenchmark === "slower" ? "bg-red-500/10 text-red-400" :
                          "bg-amber-500/10 text-amber-400"
                        )}>
                          {v.momentum.velocityVsBenchmark === "faster" ? "↑ Ahead" :
                           v.momentum.velocityVsBenchmark === "slower" ? "↓ Behind" :
                           "→ On pace"}
                          {v.momentum.benchmarkDays ? ` vs ${v.momentum.benchmarkDays}d avg` : ""}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-muted rounded-full h-1">
                          <div
                            className={cn(
                              "h-1 rounded-full transition-all duration-500",
                              v.momentum.confidence >= 70 ? "bg-emerald-400" :
                              v.momentum.confidence >= 40 ? "bg-amber-400" : "bg-red-400"
                            )}
                            style={{ width: `${Math.min(v.momentum.confidence, 100)}%` }}
                          />
                        </div>
                        <span className="text-[9px] font-mono text-muted-foreground">
                          {v.momentum.confidence}%
                        </span>
                      </div>
                      {v.momentum.riskLevel !== "low" && v.momentum.riskFactors.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {v.momentum.riskFactors.slice(0, 2).map((rf: string, j: number) => (
                            <span key={j} className="text-[9px] px-1.5 py-0.5 rounded bg-red-500/5 text-red-400/80">
                              {rf}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
            {portfolio.length > 6 && (
              <button
                onClick={() => setShowAllPortfolio(!showAllPortfolio)}
                className="mt-3 w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors py-2 border border-border/50 rounded-lg hover:border-border"
              >
                {showAllPortfolio ? "Show less" : `View all ${portfolio.length} ventures`}
              </button>
            )}
            </>)}
          
        </motion.section>

        {/* ── Portfolio Health Score ─────────────────────────────── */}
        {portfolioHealth && (
          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.3 }}
          >
            <div className="flex items-center gap-2 mb-4">
              <Zap className="size-4 text-primary" />
              <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">
                Portfolio Health
              </h2>
            </div>
            <div className="bg-card border border-border rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="flex items-baseline gap-2">
                    <span className={cn(
                      "text-3xl font-bold font-mono tracking-tight",
                      portfolioHealth.score >= 80 ? "text-emerald-400" :
                      portfolioHealth.score >= 60 ? "text-amber-400" : "text-red-400"
                    )}>
                      {portfolioHealth.score}
                    </span>
                    <span className="text-xs text-muted-foreground">/100</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Overall portfolio health score
                  </p>
                </div>
                <div className="text-right">
                  <div className={cn(
                    "inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-medium",
                    portfolioHealth.trend === "improving" ? "bg-emerald-500/10 text-emerald-400" :
                    portfolioHealth.trend === "declining" ? "bg-red-500/10 text-red-400" :
                    "bg-muted text-muted-foreground"
                  )}>
                    {portfolioHealth.trend === "improving" ? "↑" : portfolioHealth.trend === "declining" ? "↓" : "→"}
                    {portfolioHealth.trend}
                  </div>
                  {portfolioHealth.riskCount > 0 && (
                    <p className="text-[11px] text-amber-400 mt-1">
                      {portfolioHealth.riskCount} venture{portfolioHealth.riskCount !== 1 ? "s" : ""} at risk
                    </p>
                  )}
                </div>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div
                  className={cn(
                    "h-2 rounded-full transition-all duration-500",
                    portfolioHealth.score >= 80 ? "bg-emerald-400" :
                    portfolioHealth.score >= 60 ? "bg-amber-400" : "bg-red-400"
                  )}
                  style={{ width: `${Math.min(portfolioHealth.score, 100)}%` }}
                />
              </div>
            </div>
          </motion.section>
        )}

        {/* ── Venture Forecasts ────────────────────────────────────── */}
        {forecasts && forecasts.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.3 }}
          >
            <div className="flex items-center gap-2 mb-4">
              <Clock className="size-4 text-primary" />
              <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">
                Venture Forecasts
              </h2>
              <span className="text-[11px] text-muted-foreground ml-auto">
                AI-projected timelines
              </span>
            </div>
            <div className="space-y-2">
              {(showAllForecasts ? forecasts : forecasts.slice(0, 6)).map((f: any, i: number) => (
                <motion.div
                  key={f.ventureId}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + i * 0.04, duration: 0.25 }}
                  className="bg-card border border-border rounded-xl p-4"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="text-sm font-medium text-foreground">{f.ventureName}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Projected: <span className="font-mono">{f.projectedDays}</span> days to next status
                      </p>
                    </div>
                    <div className={cn(
                      "px-2 py-0.5 rounded-full text-[10px] font-medium",
                      f.riskLevel === "low" ? "bg-emerald-500/10 text-emerald-400" :
                      f.riskLevel === "medium" ? "bg-amber-500/10 text-amber-400" :
                      "bg-red-500/10 text-red-400"
                    )}>
                      {f.riskLevel} risk
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 bg-muted rounded-full h-1.5">
                      <div
                        className="h-1.5 rounded-full bg-primary/60 transition-all"
                        style={{ width: `${Math.min(f.confidence, 100)}%` }}
                      />
                    </div>
                    <span className="text-[10px] font-mono text-muted-foreground">
                      {f.confidence}% confidence
                    </span>
                  </div>
                  {f.riskFactors && f.riskFactors.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {f.riskFactors.slice(0, 3).map((rf: string, j: number) => (
                        <span key={j} className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                          {rf}
                        </span>
                      ))}
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
            {forecasts.length > 6 && (
              <button
                onClick={() => setShowAllForecasts(!showAllForecasts)}
                className="mt-3 w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors py-2 border border-border/50 rounded-lg hover:border-border"
              >
                {showAllForecasts ? "Show less" : `View all ${forecasts.length} forecasts`}
              </button>
            )}
          </motion.section>
        )}

        {/* ── Market Intelligence ──────────────────────────────────── */}
        {marketSignals && marketSignals.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.3 }}
          >
            <div className="flex items-center gap-2 mb-4">
              <ArrowUpRight className="size-4 text-primary" />
              <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">
                Market Intelligence
              </h2>
              <span className="text-[11px] text-muted-foreground ml-auto">
                Sector signals
              </span>
            </div>
            <div className="space-y-2">
              {(showAllSignals ? marketSignals : marketSignals.slice(0, 5)).map((s: any, i: number) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.35 + i * 0.04, duration: 0.25 }}
                  className="bg-card border border-border rounded-xl p-4"
                >
                  <div className="flex items-start justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">
                        {SECTOR_ICONS[s.sector] || <Package className="size-4" />}
                      </span>
                      <span className="text-[11px] text-muted-foreground">{s.sector}</span>
                      <span className={cn(
                        "text-[10px] px-1.5 py-0.5 rounded",
                        s.signalType === "opportunity" ? "bg-emerald-500/10 text-emerald-400" :
                        s.signalType === "risk" ? "bg-red-500/10 text-red-400" :
                        s.signalType === "regulatory" ? "bg-amber-500/10 text-amber-400" :
                        "bg-muted text-muted-foreground"
                      )}>
                        {s.signalType}
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-muted-foreground">
                      {s.relevance}% relevant
                    </span>
                  </div>
                  <h3 className="text-sm font-medium text-foreground mb-1">{s.headline}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{s.impact}</p>
                </motion.div>
              ))}
            </div>
            {marketSignals.length > 5 && (
              <button
                onClick={() => setShowAllSignals(!showAllSignals)}
                className="mt-3 w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors py-2 border border-border/50 rounded-lg hover:border-border"
              >
                {showAllSignals ? "Show less" : `View all ${marketSignals.length} signals`}
              </button>
            )}
          </motion.section>
        )}

        {/* Footer */}
        <div className="pt-8 pb-12 text-center">
          <p className="text-[11px] text-muted-foreground/40">
            Managed by VENTEX · Powered by Aurovia
          </p>
        </div>
      </main>

      {/* ── Task Drawer ─────────────────────────────────────────────── */}
      <Sheet open={!!taskDrawer} onOpenChange={(open) => !open && setTaskDrawer(null)}>
        <SheetContent className="sm:max-w-md bg-background border-border">
          <SheetHeader>
            <SheetTitle className="text-base font-semibold text-foreground">
              {taskDrawer?.ventureName}
            </SheetTitle>
            <SheetDescription className="text-xs text-muted-foreground">
              Complete tasks to move this venture forward
            </SheetDescription>
          </SheetHeader>

          <ScrollArea className="h-[calc(100vh-120px)] mt-4 pr-2">
            {tasksLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 rounded-lg" />
                ))}
              </div>
            ) : !ventureTasks || ventureTasks.length === 0 ? (
              <div className="text-center py-12">
                <CheckCircle2 className="size-8 text-emerald-400 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">No tasks for this venture yet.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {/* Progress bar */}
                {(() => {
                  const total = ventureTasks.length;
                  const done = ventureTasks.filter(t => t.status === "complete").length;
                  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
                  return (
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs text-muted-foreground">
                          {done} of {total} tasks complete
                        </span>
                        <span className={cn(
                          "text-xs font-mono font-medium",
                          pct === 100 ? "text-emerald-400" : pct >= 50 ? "text-amber-400" : "text-muted-foreground"
                        )}>
                          {pct}%
                        </span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-1.5">
                        <div
                          className={cn(
                            "h-1.5 rounded-full transition-all duration-500",
                            pct === 100 ? "bg-emerald-400" : pct >= 50 ? "bg-amber-400" : "bg-primary/60"
                          )}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      {pct === 100 && (
                        <p className="text-[11px] text-emerald-400 mt-1.5 flex items-center gap-1">
                          <Zap className="size-3" />
                          All tasks complete — venture will auto-advance
                        </p>
                      )}
                    </div>
                  );
                })()}

                {/* Task list */}
                {ventureTasks.map((task) => {
                  const isComplete = task.status === "complete";
                  const isCompleting = completingTaskIds.has(task.id);
                  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && !isComplete;

                  return (
                    <div
                      key={task.id}
                      className={cn(
                        "rounded-lg border p-3 transition-all",
                        isComplete
                          ? "border-emerald-500/20 bg-emerald-500/5"
                          : isOverdue
                            ? "border-red-500/20 bg-red-500/5"
                            : "border-border bg-card hover:border-primary/20"
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <div className="pt-0.5">
                          {isCompleting ? (
                            <Loader2 className="size-4 animate-spin text-primary" />
                          ) : (
                            <Checkbox
                              checked={isComplete}
                              disabled={isComplete || isCompleting}
                              onCheckedChange={() => handleCompleteTask(task.id)}
                              className={cn(
                                "border-muted-foreground/40",
                                isComplete && "border-emerald-400 bg-emerald-400 text-white"
                              )}
                            />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={cn(
                            "text-sm font-medium leading-snug",
                            isComplete ? "text-muted-foreground line-through" : "text-foreground"
                          )}>
                            {task.title}
                          </p>
                          {task.description && (
                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                              {task.description}
                            </p>
                          )}
                          <div className="flex items-center gap-3 mt-1.5">
                            {task.priority && (
                              <span className={cn(
                                "text-[10px] px-1.5 py-0.5 rounded font-medium",
                                task.priority === "High" ? "bg-red-500/10 text-red-400" :
                                task.priority === "Medium" ? "bg-amber-500/10 text-amber-400" :
                                "bg-muted text-muted-foreground"
                              )}>
                                {task.priority}
                              </span>
                            )}
                            {task.dueDate && (
                              <span className={cn(
                                "text-[10px] flex items-center gap-1",
                                isOverdue ? "text-red-400" : "text-muted-foreground"
                              )}>
                                <Clock className="size-3" />
                                {isOverdue ? "Overdue" : friendlyDate(task.dueDate)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </SheetContent>
      </Sheet>

      {/* ── Confirmation Dialog for non-advance actions ───────────── */}
      <Dialog
        open={!!confirmDialog}
        onOpenChange={(open) => !open && setConfirmDialog(null)}
      >
        {confirmDialog && (
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-base">
                {confirmDialog.actionLabel}
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground mt-2">
                {confirmDialog.ventureName && (
                  <span className="font-medium text-foreground block mb-1">
                    {confirmDialog.ventureName}
                  </span>
                )}
                {confirmDialog.summary}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="mt-4 gap-2">
              <Button
                variant="outline"
                onClick={() => setConfirmDialog(null)}
                disabled={resolvingIds.has(confirmDialog.eventId)}
              >
                Cancel
              </Button>
              <Button
                className="bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20"
                disabled={resolvingIds.has(confirmDialog.eventId)}
                onClick={() =>
                  handleResolveAction(
                    confirmDialog.eventId,
                    confirmDialog.actionFlow
                  )
                }
              >
                {resolvingIds.has(confirmDialog.eventId) ? (
                  <Loader2 className="size-3 animate-spin mr-1.5" />
                ) : null}
                {resolvingIds.has(confirmDialog.eventId)
                  ? "Processing..."
                  : confirmDialog.actionLabel}
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>


    </div>
  );
}
