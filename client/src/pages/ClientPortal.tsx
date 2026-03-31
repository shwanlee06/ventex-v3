// ============================================================================
// Client Portal — /portal/:orgSlug
// Premium, outcome-focused. Zero operator language.
// Velocity Feed: 3 card types — amber (action), teal (completed), gray (watching)
// ============================================================================

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
import { motion, AnimatePresence } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import { useState, useCallback } from "react";
import { toast } from "sonner";

// ── Sector icons ──────────────────────────────────────────────────────
const SECTOR_ICONS: Record<string, React.ReactNode> = {
  "Real Estate": <Building2 className="size-4" />,
  Yacht: <Ship className="size-4" />,
  "F&B": <UtensilsCrossed className="size-4" />,
  Entertainment: <Clapperboard className="size-4" />,
  "Oil & Gas": <Fuel className="size-4" />,
  Others: <Package className="size-4" />,
};

// ── Action flow icons ─────────────────────────────────────────────────
const ACTION_FLOW_ICONS: Record<string, React.ReactNode> = {
  advance_stage: <ArrowUpRight className="size-3 mr-1.5" />,
  approve_followup: <Send className="size-3 mr-1.5" />,
  confirm_distribution: <DollarSign className="size-3 mr-1.5" />,
  unblock_venture: <Unlock className="size-3 mr-1.5" />,
  view_task: <Eye className="size-3 mr-1.5" />,
};

// ── Stage progress ────────────────────────────────────────────────────
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

// ── Format date for display ───────────────────────────────────────────
function friendlyDate(d: Date | string | undefined): string {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d) : d;
  if (isNaN(date.getTime())) return "";
  return formatDistanceToNow(date, { addSuffix: true });
}

// ── Main Component ────────────────────────────────────────────────────
export default function ClientPortal() {
  const [, params] = useRoute("/portal/:orgSlug");
  const orgSlug = params?.orgSlug || "";
  const { user, loading: authLoading, logout } = useAuth();
  const [, navigate] = useLocation();
  const [advancingIds, setAdvancingIds] = useState<Set<number>>(new Set());
  const [resolvingIds, setResolvingIds] = useState<Set<number>>(new Set());
  const [watchingExpanded, setWatchingExpanded] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{
    eventId: number;
    actionFlow: string;
    actionLabel: string;
    ventureName: string | null;
    summary: string;
  } | null>(null);

  const { data, isLoading, error } = trpc.portal.getData.useQuery(
    { orgSlug },
    { enabled: !!orgSlug && !!user, retry: false }
  );

  const utils = trpc.useUtils();

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

  // ── Auth check ──────────────────────────────────────────────────────
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
              Managed by ATLAS
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
                            {isBusy ? "Advancing..." : "Advance Stage"}
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

                        {item.actionFlow === "view_task" && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-shrink-0 text-xs"
                            onClick={() => toast.info("Task view coming soon")}
                          >
                            {ACTION_FLOW_ICONS["view_task"]}
                            View Task
                          </Button>
                        )}

                        {!item.actionFlow && item.actionLabel && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-shrink-0 text-xs"
                            onClick={() => toast.info("Feature coming soon")}
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
              {completedCards.map((item, i) => (
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
                    {watchingCards.map((item, i) => (
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

        {/* ── Your Portfolio ───────────────────────────────────────── */}
        <motion.section
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {portfolio.map((v, i) => (
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
                </motion.div>
              ))}
            </div>
          )}
        </motion.section>

        {/* Footer */}
        <div className="pt-8 pb-12 text-center">
          <p className="text-[11px] text-muted-foreground/40">
            Managed by ATLAS · Powered by Aurovia
          </p>
        </div>
      </main>

      {/* ── Confirmation Dialog for non-advance actions ─────────────── */}
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
