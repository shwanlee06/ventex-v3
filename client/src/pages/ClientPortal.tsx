// ============================================================================
// Client Portal — Premium Private-Banking-Grade Experience
// Zero operator language. Outcomes only. Luxury wealth management feel.
// ============================================================================

import { useAuth } from "@/_core/hooks/useAuth";
import { hardLogout } from "@/lib/hardLogout";
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { useRoute, useLocation } from "wouter";
import { getLoginUrl } from "@/const";
import {
  Briefcase,
  ArrowRight,
  Clock,
  CheckCircle2,
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
  Users,
  Shield,
  TrendingUp,
  Activity,
  Mail,
  ChevronRight,
  Sparkles,
  BarChart3,
  Globe,
  Bell,
  BellOff,
  Moon,
  Sun,
  Settings,
  MessageSquare,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
// PortalConcierge removed — AI Concierge is now a dedicated tab
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Streamdown } from "streamdown";
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
import { formatDistanceToNow, format } from "date-fns";
import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { toast } from "sonner";

// ── Constants ──────────────────────────────────────────────────────────────

const SECTOR_ICONS: Record<string, React.ReactNode> = {
  "Real Estate": <Building2 className="size-4" />,
  Yacht: <Ship className="size-4" />,
  "F&B": <UtensilsCrossed className="size-4" />,
  Entertainment: <Clapperboard className="size-4" />,
  "Oil & Gas": <Fuel className="size-4" />,
  Others: <Package className="size-4" />,
};

const ACTION_FLOW_ICONS: Record<string, React.ReactNode> = {
  advance_stage: <ArrowUpRight className="size-3.5 mr-1.5" />,
  approve_followup: <Send className="size-3.5 mr-1.5" />,
  confirm_distribution: <DollarSign className="size-3.5 mr-1.5" />,
  unblock_venture: <Unlock className="size-3.5 mr-1.5" />,
  view_task: <Eye className="size-3.5 mr-1.5" />,
};

const STAGES = ["Initial Review", "Under Review", "Fundraising", "Active", "Completed"];

// ── Helpers ────────────────────────────────────────────────────────────────

function friendlyDate(d: Date | string | undefined): string {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d) : d;
  if (isNaN(date.getTime())) return "";
  return formatDistanceToNow(date, { addSuffix: true });
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

// ── Sub-components ─────────────────────────────────────────────────────────

function StageProgress({ stage }: { stage: string }) {
  const idx = STAGES.indexOf(stage);
  const activeIdx = idx >= 0 ? idx : 0;
  return (
    <div className="flex items-center gap-1.5">
      {STAGES.map((s, i) => (
        <div key={s} className="flex items-center gap-1.5 flex-1">
          <div
            className={cn(
              "h-1 rounded-full flex-1 transition-all duration-700",
              i < activeIdx
                ? "bg-emerald-500/80"
                : i === activeIdx
                  ? "bg-emerald-400"
                  : "bg-white/[0.06]"
            )}
          />
        </div>
      ))}
    </div>
  );
}

function MetricCard({
  label,
  value,
  sub,
  icon,
  accent = "emerald",
  delay = 0,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ReactNode;
  accent?: "emerald" | "amber" | "blue" | "primary";
  delay?: number;
}) {
  const accentMap = {
    emerald: "from-emerald-500/8 to-transparent border-emerald-500/10",
    amber: "from-amber-500/8 to-transparent border-amber-500/10",
    blue: "from-blue-500/8 to-transparent border-blue-500/10",
    primary: "from-primary/8 to-transparent border-primary/10",
  };
  const iconMap = {
    emerald: "text-emerald-400",
    amber: "text-amber-400",
    blue: "text-blue-400",
    primary: "text-primary",
  };
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
      className={cn(
        "relative overflow-hidden bg-gradient-to-br rounded-xl border p-5",
        accentMap[accent]
      )}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground/70 font-medium mb-2">
            {label}
          </p>
          <p className="text-2xl font-semibold tracking-tight text-foreground font-[family-name:var(--font-display)]">
            {value}
          </p>
          {sub && (
            <p className="text-[11px] text-muted-foreground mt-1">{sub}</p>
          )}
        </div>
        <div className={cn("opacity-50", iconMap[accent])}>{icon}</div>
      </div>
    </motion.div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────

export default function ClientPortal(
  props: {
    orgSlug?: string;
    useDashboard?: boolean;
    params?: { orgSlug?: string };
  } = {}
) {
  const { orgSlug: propOrgSlug, useDashboard = false } = props;
  const [, params] = useRoute("/portal/:orgSlug");
  const orgSlug = propOrgSlug || params?.orgSlug || "";
  const { user, loading: authLoading, logout } = useAuth();
  const [, navigate] = useLocation();

  // State
  const [advancingIds, setAdvancingIds] = useState<Set<number>>(new Set());
  const [resolvingIds, setResolvingIds] = useState<Set<number>>(new Set());
  const [watchingExpanded, setWatchingExpanded] = useState(false);
  const [showAllCompleted, setShowAllCompleted] = useState(false);
  const [showAllWatching, setShowAllWatching] = useState(false);
  const [showAllPortfolio, setShowAllPortfolio] = useState(false);
  const [showAllForecasts, setShowAllForecasts] = useState(false);
  const [showAllSignals, setShowAllSignals] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "portfolio" | "intelligence" | "concierge" | "settings">("overview");
  const [confirmDialog, setConfirmDialog] = useState<{
    eventId: number;
    actionFlow: string;
    actionLabel: string;
    ventureName: string | null;
    summary: string;
  } | null>(null);
  const [taskDrawer, setTaskDrawer] = useState<{
    ventureId: number;
    ventureName: string;
  } | null>(null);
  const [completingTaskIds, setCompletingTaskIds] = useState<Set<number>>(new Set());

  // ── AI Concierge State ──────────────────────────────────────────────────
  const [conciergeMessages, setConciergeMessages] = useState<Array<{ id: string; role: "user" | "assistant"; content: string; timestamp: Date; isStreaming?: boolean }>>([]);
  const [conciergeInput, setConciergeInput] = useState("");
  const [conciergeLoading, setConciergeLoading] = useState(false);
  const conciergeScrollRef = useRef<HTMLDivElement>(null);
  const conciergeInputRef = useRef<HTMLTextAreaElement>(null);
  const conciergeStorageKey = `ventex_portal_chat_${orgSlug}`;
  const aiChat = trpc.portal.aiChat.useMutation();

  // Data
  const { data: drafts } = trpc.portal.getDrafts.useQuery(
    { orgSlug, status: "pending" },
    { enabled: !!orgSlug && !!user }
  );

  const { data, isLoading, error } = trpc.portal.getData.useQuery(
    { orgSlug },
    { enabled: !!orgSlug && !!user, retry: false }
  );

  const utils = trpc.useUtils();

  const { data: ventureTasks, isLoading: tasksLoading } =
    trpc.portal.getVentureTasks.useQuery(
      { ventureId: taskDrawer?.ventureId ?? 0 },
      { enabled: !!taskDrawer }
    );

  // Notification preferences
  const { data: notifPrefs, isLoading: notifPrefsLoading } =
    trpc.portal.getNotificationPreferences.useQuery(undefined, {
      enabled: !!user,
    });

  const updateNotifPrefsMutation =
    trpc.portal.updateNotificationPreferences.useMutation({
      onSuccess: () => {
        toast.success("Notification preferences updated");
        utils.portal.getNotificationPreferences.invalidate();
      },
      onError: (err) =>
        toast.error(err.message || "Failed to update preferences"),
    });

  // Mutations
  const completeTaskMutation = trpc.portal.completeTask.useMutation({
    onSuccess: (result) => {
      if (result.autoAdvanced) {
        toast.success(result.message, { duration: 5000 });
        setTaskDrawer(null);
      } else {
        toast.success("Task completed");
      }
      utils.portal.getData.invalidate({ orgSlug });
      utils.portal.getVentureTasks.invalidate({
        ventureId: taskDrawer?.ventureId ?? 0,
      });
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
      completeTaskMutation.mutate({
        taskId,
        ventureId: taskDrawer.ventureId,
      });
    },
    [taskDrawer, completeTaskMutation]
  );

  const advanceMutation = trpc.agents.clientAdvanceStage.useMutation({
    onSuccess: (result) => {
      toast.success(`"${result.ventureName}" advanced to ${result.toStage}`, {
        duration: 4000,
      });
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
        actionFlow: actionFlow as
          | "approve_followup"
          | "confirm_distribution"
          | "unblock_venture",
      });
    },
    [resolveActionMutation]
  );

  // ── AI Concierge Effects & Handlers ────────────────────────────────────

  // Load concierge messages from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(conciergeStorageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        setConciergeMessages(parsed.map((m: any) => ({ ...m, timestamp: new Date(m.timestamp), isStreaming: false })));
      }
    } catch { /* ignore */ }
  }, [conciergeStorageKey]);

  // Save concierge messages to localStorage
  useEffect(() => {
    if (conciergeMessages.length > 0 && !conciergeMessages.some(m => m.isStreaming)) {
      const toStore = conciergeMessages.slice(-30).map(({ isStreaming, ...rest }) => rest);
      localStorage.setItem(conciergeStorageKey, JSON.stringify(toStore));
    }
  }, [conciergeMessages, conciergeStorageKey]);

  // Auto-scroll concierge
  useEffect(() => {
    if (conciergeScrollRef.current) {
      const el = conciergeScrollRef.current.querySelector("[data-radix-scroll-area-viewport]");
      if (el) el.scrollTop = el.scrollHeight;
    }
  }, [conciergeMessages]);

  // Focus concierge input when tab is active
  useEffect(() => {
    if (activeTab === "concierge" && conciergeInputRef.current) {
      setTimeout(() => conciergeInputRef.current?.focus(), 200);
    }
  }, [activeTab]);

  const handleConciergeSend = useCallback(async () => {
    const text = conciergeInput.trim();
    if (!text || conciergeLoading) return;

    const userMsg = { id: `u-${Date.now()}`, role: "user" as const, content: text, timestamp: new Date() };
    const assistantMsg = { id: `a-${Date.now()}`, role: "assistant" as const, content: "", timestamp: new Date(), isStreaming: true };

    setConciergeMessages(prev => [...prev, userMsg, assistantMsg]);
    setConciergeInput("");
    setConciergeLoading(true);

    try {
      const history = conciergeMessages.filter(m => !m.isStreaming).slice(-10).map(m => ({ role: m.role, content: m.content }));
      const result = await aiChat.mutateAsync({ orgSlug, messages: [...history, { role: "user" as const, content: text }] });
      setConciergeMessages(prev => prev.map(m => m.id === assistantMsg.id ? { ...m, content: result.content, isStreaming: false } : m));
    } catch {
      setConciergeMessages(prev => prev.map(m => m.id === assistantMsg.id ? { ...m, content: "I apologize, but I was unable to process your request. Please try again.", isStreaming: false } : m));
      toast.error("AI response failed");
    } finally {
      setConciergeLoading(false);
    }
  }, [conciergeInput, conciergeLoading, conciergeMessages, orgSlug, aiChat]);

  const handleConciergeKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleConciergeSend(); }
  };

  const clearConciergeChat = () => {
    setConciergeMessages([]);
    localStorage.removeItem(conciergeStorageKey);
    toast.success("Conversation cleared");
  };

  // ── Auth / Loading / Error States ──────────────────────────────────────

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="size-12 rounded-full border-2 border-emerald-500/20 border-t-emerald-400 animate-spin" />
          </div>
          <p className="text-xs text-muted-foreground tracking-wider uppercase">
            Loading your portal
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-6 max-w-sm px-6"
        >
          <div className="size-16 rounded-2xl bg-gradient-to-br from-emerald-500/10 to-transparent border border-emerald-500/20 flex items-center justify-center mx-auto">
            <Shield className="size-7 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-foreground font-[family-name:var(--font-display)] mb-2">
              Secure Access Required
            </h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Sign in to access your portfolio and venture updates.
            </p>
          </div>
          <Button
            asChild
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white border-0 h-11"
          >
            <a href={getLoginUrl()}>Sign In to Continue</a>
          </Button>
        </motion.div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12">
          <Skeleton className="h-6 w-48 mb-1" />
          <Skeleton className="h-4 w-32 mb-10" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-xl" />
            ))}
          </div>
          <div className="space-y-4">
            <Skeleton className="h-48 rounded-xl" />
            <Skeleton className="h-64 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-6 max-w-sm px-6"
        >
          <div className="size-16 rounded-2xl bg-gradient-to-br from-red-500/10 to-transparent border border-red-500/20 flex items-center justify-center mx-auto">
            <AlertCircle className="size-7 text-red-400" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-foreground font-[family-name:var(--font-display)] mb-2">
              Unable to Load Portal
            </h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {error.message === "You do not have access to this portal"
                ? "You don't have permission to view this portal."
                : "Something went wrong. Please try again later."}
            </p>
          </div>
          <Button variant="outline" onClick={() => navigate("/")}>
            Go Home
          </Button>
        </motion.div>
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
    assignedTeam,
  } = data;

  // Derived metrics
  const activeVentures = portfolio.filter(
    (v) => v.stage !== "Completed"
  ).length;
  const completedVentures = portfolio.filter(
    (v) => v.stage === "Completed"
  ).length;
  const pendingActions = actionCards.length;
  const healthScore = portfolioHealth?.score ?? 0;

  // ── Tab Navigation ─────────────────────────────────────────────────────

  const tabs = [
    { id: "overview" as const, label: "Overview", icon: <Activity className="size-3.5" /> },
    { id: "portfolio" as const, label: "Portfolio", icon: <Briefcase className="size-3.5" /> },
    { id: "intelligence" as const, label: "Intelligence", icon: <Sparkles className="size-3.5" /> },
    { id: "concierge" as const, label: "AI Concierge", icon: <MessageSquare className="size-3.5" /> },
    { id: "settings" as const, label: "Settings", icon: <Shield className="size-3.5" /> },
  ];

  // ── Render Action Button ───────────────────────────────────────────────

  function renderActionButton(item: (typeof actionCards)[0]) {
    const isAdvancing = item.ventureId ? advancingIds.has(item.ventureId) : false;
    const isResolving = resolvingIds.has(item.id);
    const isBusy = isAdvancing || isResolving;

    if (item.actionFlow === "advance_stage" && item.ventureId) {
      return (
        <Button
          size="sm"
          className="min-h-[44px] sm:min-h-0 touch-manipulation bg-emerald-600 hover:bg-emerald-500 text-white border-0 text-xs font-medium"
          disabled={isBusy}
          onClick={() => handleAdvance(item.ventureId!, item.id)}
        >
          {isBusy ? (
            <Loader2 className="size-3.5 animate-spin mr-1.5" />
          ) : (
            ACTION_FLOW_ICONS["advance_stage"]
          )}
          {isBusy ? "Advancing..." : "Approve Advance"}
        </Button>
      );
    }

    if (item.actionFlow === "approve_followup") {
      return (
        <Button
          size="sm"
          className="min-h-[44px] sm:min-h-0 touch-manipulation bg-emerald-600 hover:bg-emerald-500 text-white border-0 text-xs font-medium"
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
      );
    }

    if (item.actionFlow === "confirm_distribution") {
      return (
        <Button
          size="sm"
          className="min-h-[44px] sm:min-h-0 touch-manipulation bg-emerald-600 hover:bg-emerald-500 text-white border-0 text-xs font-medium"
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
      );
    }

    if (item.actionFlow === "unblock_venture") {
      return (
        <Button
          size="sm"
          className="min-h-[44px] sm:min-h-0 touch-manipulation bg-amber-600 hover:bg-amber-500 text-white border-0 text-xs font-medium"
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
      );
    }

    if (item.actionFlow === "view_task" && item.ventureId) {
      return (
        <Button
          size="sm"
          variant="outline"
          className="min-h-[44px] sm:min-h-0 touch-manipulation text-xs border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/10"
          onClick={() =>
            setTaskDrawer({
              ventureId: item.ventureId!,
              ventureName: item.ventureName || "Venture",
            })
          }
        >
          {ACTION_FLOW_ICONS["view_task"]}
          Review Tasks
        </Button>
      );
    }

    if (!item.actionFlow && item.actionLabel) {
      return (
        <Button
          size="sm"
          variant="outline"
          className="min-h-[44px] sm:min-h-0 touch-manipulation text-xs"
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
      );
    }

    return null;
  }

  // ══════════════════════════════════════════════════════════════════════════
  // PORTAL CONTENT
  // ══════════════════════════════════════════════════════════════════════════

  const portalContent = (
    <>
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 pb-28 sm:pb-12">
        {/* ── Hero Greeting ───────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <p className="text-xs text-muted-foreground/60 uppercase tracking-[0.12em] mb-1">
            {format(new Date(), "EEEE, MMMM d, yyyy")}
          </p>
          <h1 className="text-2xl sm:text-3xl font-semibold text-foreground font-[family-name:var(--font-display)] tracking-tight">
            {getGreeting()}, {user.name?.split(" ")[0] || "there"}
          </h1>
        </motion.div>

        {/* ── Key Metrics ─────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
          <MetricCard
            label="Active Ventures"
            value={activeVentures}
            sub={`${completedVentures} completed`}
            icon={<Briefcase className="size-5" />}
            accent="emerald"
            delay={0.1}
          />
          <MetricCard
            label="Portfolio Health"
            value={healthScore > 0 ? `${healthScore}` : "--"}
            sub={portfolioHealth?.trend === "improving" ? "Trending up" : portfolioHealth?.trend === "declining" ? "Needs attention" : "Stable"}
            icon={<TrendingUp className="size-5" />}
            accent={healthScore >= 70 ? "emerald" : healthScore >= 40 ? "amber" : "amber"}
            delay={0.15}
          />
          <MetricCard
            label="Action Items"
            value={pendingActions}
            sub={pendingActions === 0 ? "All clear" : "Needs your review"}
            icon={<Activity className="size-5" />}
            accent={pendingActions > 0 ? "amber" : "emerald"}
            delay={0.2}
          />
          <MetricCard
            label="Your Team"
            value={assignedTeam?.length || 0}
            sub="VENTEX operators"
            icon={<Users className="size-5" />}
            accent="blue"
            delay={0.25}
          />
        </div>

        {/* ── Tab Navigation ──────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="flex items-center gap-1 mb-8 border-b border-border/50 overflow-x-auto"
        >
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-2 px-4 py-3 text-xs font-medium transition-all relative whitespace-nowrap",
                activeTab === tab.id
                  ? "text-emerald-400"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {tab.icon}
              {tab.label}
              {tab.id === "overview" && pendingActions > 0 && (
                <span className="size-1.5 rounded-full bg-amber-400 animate-pulse" />
              )}
              {activeTab === tab.id && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute bottom-0 left-0 right-0 h-[2px] bg-emerald-400"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
                />
              )}
            </button>
          ))}
        </motion.div>

        {/* ── Velocity Summary ────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.4 }}
          className="relative overflow-hidden rounded-xl border border-emerald-500/10 bg-gradient-to-r from-emerald-500/[0.04] via-transparent to-transparent p-5 mb-8"
        >
          <div className="flex items-start gap-3.5">
            <div className="flex-shrink-0 size-8 rounded-lg bg-emerald-500/10 flex items-center justify-center mt-0.5">
              <Zap className="size-4 text-emerald-400" />
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-[0.08em] text-emerald-400/70 font-medium mb-1">
                Weekly Intelligence Brief
              </p>
              <p className="text-sm text-foreground/80 leading-relaxed">
                {velocitySummary}
              </p>
            </div>
          </div>
        </motion.div>

        {/* ══════════════════════════════════════════════════════════
            OVERVIEW TAB
            ══════════════════════════════════════════════════════════ */}
        {activeTab === "overview" && (
          <div className="space-y-8">
            {/* ── Action Needed (amber) ──────────────────────────── */}
            {actionCards.length > 0 && (
              <motion.section
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
              >
                <div className="flex items-center gap-2.5 mb-4">
                  <div className="size-6 rounded-md bg-amber-500/10 flex items-center justify-center">
                    <AlertCircle className="size-3.5 text-amber-400" />
                  </div>
                  <h2 className="text-sm font-semibold text-foreground">
                    Action Needed
                  </h2>
                  <span className="ml-auto text-[10px] font-medium text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full">
                    {actionCards.length}
                  </span>
                </div>

                <div className="space-y-2">
                  <AnimatePresence mode="popLayout">
                    {actionCards.map((item, i) => (
                      <motion.div
                        key={item.id}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 8, height: 0 }}
                        transition={{ delay: i * 0.04, duration: 0.3 }}
                        className="group relative overflow-hidden rounded-xl border border-amber-500/15 bg-gradient-to-r from-amber-500/[0.03] to-transparent p-5"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                          <div className="flex-1 min-w-0">
                            {item.ventureName && (
                              <h3 className="text-sm font-medium text-foreground mb-1.5">
                                {item.ventureName}
                              </h3>
                            )}
                            <p className="text-sm text-muted-foreground leading-relaxed">
                              {item.summary}
                            </p>
                            <div className="flex items-center gap-3 mt-2.5">
                              {item.fromStage && item.toStage && (
                                <span className="text-[10px] text-muted-foreground/60 font-mono bg-white/[0.03] px-2 py-0.5 rounded">
                                  {item.fromStage} → {item.toStage}
                                </span>
                              )}
                              <span className="text-[10px] text-muted-foreground/40">
                                {friendlyDate(item.date ?? undefined)}
                              </span>
                            </div>
                          </div>
                          <div className="flex sm:block mt-1 sm:mt-0 flex-shrink-0">
                            {renderActionButton(item)}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </motion.section>
            )}

            {/* ── Completed (emerald) ────────────────────────────── */}
            {completedCards.length > 0 && (
              <motion.section
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05, duration: 0.4 }}
              >
                <div className="flex items-center gap-2.5 mb-4">
                  <div className="size-6 rounded-md bg-emerald-500/10 flex items-center justify-center">
                    <CheckCircle2 className="size-3.5 text-emerald-400" />
                  </div>
                  <h2 className="text-sm font-semibold text-foreground">
                    Recently Completed
                  </h2>
                  <span className="ml-auto text-[10px] text-muted-foreground">
                    {completedCards.length} update{completedCards.length !== 1 ? "s" : ""}
                  </span>
                </div>

                <div className="rounded-xl border border-emerald-500/10 overflow-hidden divide-y divide-border/30">
                  {(showAllCompleted
                    ? completedCards
                    : completedCards.slice(0, 5)
                  ).map((item, i) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, x: -6 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 + i * 0.03, duration: 0.25 }}
                      className="p-4 flex items-start gap-3.5 hover:bg-emerald-500/[0.02] transition-colors"
                    >
                      <div className="size-1.5 rounded-full mt-2 flex-shrink-0 bg-emerald-400/60" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-foreground/80 leading-relaxed">
                          {item.summary}
                        </p>
                        <div className="flex items-center gap-3 mt-1.5">
                          {item.ventureName && (
                            <span className="text-[10px] text-muted-foreground">
                              {item.ventureName}
                            </span>
                          )}
                          <span className="text-[10px] text-muted-foreground/40">
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
                    className="mt-2 w-full text-center text-[11px] text-muted-foreground hover:text-emerald-400 transition-colors py-2"
                  >
                    {showAllCompleted
                      ? "Show less"
                      : `Show all ${completedCards.length} updates`}
                  </button>
                )}
              </motion.section>
            )}

            {/* ── Watching (collapsed) ───────────────────────────── */}
            {watchingCards.length > 0 && (
              <motion.section
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1, duration: 0.4 }}
              >
                <button
                  onClick={() => setWatchingExpanded(!watchingExpanded)}
                  className="flex items-center gap-2.5 mb-4 w-full text-left group"
                >
                  <div className="size-6 rounded-md bg-white/[0.04] flex items-center justify-center">
                    <Eye className="size-3.5 text-muted-foreground/50" />
                  </div>
                  <h2 className="text-sm font-semibold text-muted-foreground">
                    Monitoring
                  </h2>
                  <span className="text-[10px] text-muted-foreground/40 ml-auto mr-1">
                    {watchingCards.length} item{watchingCards.length !== 1 ? "s" : ""}
                  </span>
                  <ChevronDown
                    className={cn(
                      "size-3.5 text-muted-foreground/40 transition-transform duration-300",
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
                      transition={{ duration: 0.3 }}
                      className="overflow-hidden"
                    >
                      <div className="rounded-xl border border-border/30 overflow-hidden divide-y divide-border/20">
                        {(showAllWatching
                          ? watchingCards
                          : watchingCards.slice(0, 5)
                        ).map((item, i) => (
                          <div
                            key={item.id}
                            className="p-3.5 flex items-start gap-3"
                          >
                            <div className="size-1.5 rounded-full mt-2 flex-shrink-0 bg-muted-foreground/20" />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs text-muted-foreground leading-relaxed">
                                {item.summary}
                              </p>
                              <div className="flex items-center gap-3 mt-1">
                                {item.ventureName && (
                                  <span className="text-[10px] text-muted-foreground/50">
                                    {item.ventureName}
                                  </span>
                                )}
                                <span className="text-[10px] text-muted-foreground/30">
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
                          className="w-full text-center text-[11px] text-muted-foreground hover:text-foreground transition-colors py-2"
                        >
                          {showAllWatching
                            ? "Show less"
                            : `Show all ${watchingCards.length} items`}
                        </button>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.section>
            )}

            {/* ── All Clear ──────────────────────────────────────── */}
            {actionCards.length === 0 &&
              completedCards.length === 0 &&
              watchingCards.length === 0 && (
                <motion.section
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center py-12"
                >
                  <div className="size-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
                    <CheckCircle2 className="size-6 text-emerald-400" />
                  </div>
                  <h3 className="text-sm font-semibold text-foreground mb-1">
                    All Clear
                  </h3>
                  <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                    Nothing needs your attention right now. VENTEX is monitoring
                    your portfolio and will notify you when something comes up.
                  </p>
                </motion.section>
              )}

            {/* ── Draft Communications Widget ────────────────────── */}
            {drafts && drafts.length > 0 && (
              <motion.section
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.12, duration: 0.4 }}
              >
                <button
                  onClick={() => navigate("/drafts")}
                  className="w-full rounded-xl border border-amber-500/15 bg-gradient-to-r from-amber-500/[0.03] to-transparent p-5 hover:border-amber-500/25 transition-all group text-left"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="size-10 rounded-xl bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                      <Mail className="size-4.5 text-amber-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-foreground">
                          {drafts.length} pending communication
                          {drafts.length !== 1 ? "s" : ""}
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        AI-drafted communications awaiting your review
                      </p>
                    </div>
                    <ArrowRight className="size-4 text-muted-foreground/40 group-hover:text-amber-400 transition-colors" />
                  </div>
                </button>
              </motion.section>
            )}

            {/* ── Your Team ──────────────────────────────────────── */}
            {assignedTeam && assignedTeam.length > 0 && (
              <motion.section
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15, duration: 0.4 }}
              >
                <div className="flex items-center gap-2.5 mb-4">
                  <div className="size-6 rounded-md bg-blue-500/10 flex items-center justify-center">
                    <Users className="size-3.5 text-blue-400" />
                  </div>
                  <h2 className="text-sm font-semibold text-foreground">
                    Your VENTEX Team
                  </h2>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
                  {assignedTeam.map(
                    (
                      member: {
                        id: number;
                        name: string;
                        role: string | null;
                        photoUrl: string | null;
                        avatarUrl: string | null;
                      },
                      i: number
                    ) => (
                      <motion.div
                        key={member.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 + i * 0.04, duration: 0.3 }}
                        className="rounded-xl border border-border/30 bg-gradient-to-br from-white/[0.02] to-transparent p-4 flex items-center gap-3"
                      >
                        {member.avatarUrl || member.photoUrl ? (
                          <img
                            src={member.avatarUrl || member.photoUrl || ""}
                            alt={member.name}
                            className="size-10 rounded-full object-cover border border-border/30"
                          />
                        ) : (
                          <div className="size-10 rounded-full bg-gradient-to-br from-emerald-500/15 to-blue-500/15 border border-emerald-500/20 flex items-center justify-center">
                            <span className="text-xs font-semibold text-emerald-400">
                              {member.name
                                .split(" ")
                                .map((n) => n[0])
                                .join("")
                                .slice(0, 2)}
                            </span>
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-foreground truncate">
                            {member.name}
                          </p>
                          {member.role && (
                            <p className="text-[10px] text-muted-foreground truncate">
                              {member.role}
                            </p>
                          )}
                        </div>
                      </motion.div>
                    )
                  )}
                </div>
              </motion.section>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════
            PORTFOLIO TAB
            ══════════════════════════════════════════════════════════ */}
        {activeTab === "portfolio" && (
          <div className="space-y-8">
            {/* Portfolio Health Score */}
            {portfolioHealth && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-xl border border-border/30 bg-gradient-to-r from-white/[0.02] to-transparent p-6"
              >
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground/60 font-medium mb-1">
                      Portfolio Health Score
                    </p>
                    <div className="flex items-baseline gap-2">
                      <span
                        className={cn(
                          "text-4xl font-bold font-[family-name:var(--font-display)] tracking-tight",
                          portfolioHealth.score >= 80
                            ? "text-emerald-400"
                            : portfolioHealth.score >= 60
                              ? "text-amber-400"
                              : "text-red-400"
                        )}
                      >
                        {portfolioHealth.score}
                      </span>
                      <span className="text-sm text-muted-foreground/40">
                        / 100
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div
                      className={cn(
                        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium",
                        portfolioHealth.trend === "improving"
                          ? "bg-emerald-500/10 text-emerald-400"
                          : portfolioHealth.trend === "declining"
                            ? "bg-red-500/10 text-red-400"
                            : "bg-white/[0.04] text-muted-foreground"
                      )}
                    >
                      {portfolioHealth.trend === "improving"
                        ? "↑"
                        : portfolioHealth.trend === "declining"
                          ? "↓"
                          : "→"}{" "}
                      {portfolioHealth.trend}
                    </div>
                    {portfolioHealth.riskCount > 0 && (
                      <p className="text-[11px] text-amber-400 mt-1.5">
                        {portfolioHealth.riskCount} venture
                        {portfolioHealth.riskCount !== 1 ? "s" : ""} at risk
                      </p>
                    )}
                  </div>
                </div>
                <div className="w-full bg-white/[0.04] rounded-full h-2">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{
                      width: `${Math.min(portfolioHealth.score, 100)}%`,
                    }}
                    transition={{ delay: 0.3, duration: 0.8, ease: "easeOut" }}
                    className={cn(
                      "h-2 rounded-full",
                      portfolioHealth.score >= 80
                        ? "bg-emerald-400"
                        : portfolioHealth.score >= 60
                          ? "bg-amber-400"
                          : "bg-red-400"
                    )}
                  />
                </div>
              </motion.div>
            )}

            {/* Venture Cards */}
            {portfolio.length === 0 ? (
              <div className="text-center py-16">
                <div className="size-14 rounded-2xl bg-white/[0.04] flex items-center justify-center mx-auto mb-4">
                  <Briefcase className="size-6 text-muted-foreground/40" />
                </div>
                <p className="text-sm text-muted-foreground">
                  Your portfolio is being set up. We'll have your ventures ready
                  shortly.
                </p>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2.5 mb-4">
                  <div className="size-6 rounded-md bg-emerald-500/10 flex items-center justify-center">
                    <Briefcase className="size-3.5 text-emerald-400" />
                  </div>
                  <h2 className="text-sm font-semibold text-foreground">
                    Your Ventures
                  </h2>
                  <span className="ml-auto text-[10px] text-muted-foreground">
                    {portfolio.length} venture
                    {portfolio.length !== 1 ? "s" : ""}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {(showAllPortfolio
                    ? portfolio
                    : portfolio.slice(0, 6)
                  ).map((v, i) => (
                    <motion.div
                      key={v.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{
                        delay: 0.05 + i * 0.04,
                        duration: 0.35,
                      }}
                      className="group rounded-xl border border-border/30 bg-gradient-to-br from-white/[0.02] to-transparent p-5 hover:border-emerald-500/20 transition-all duration-300"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground/60">
                            {SECTOR_ICONS[v.sector] || (
                              <Package className="size-4" />
                            )}
                          </span>
                          <span className="text-[11px] text-muted-foreground/60">
                            {v.sector}
                          </span>
                        </div>
                        <ChevronRight className="size-3.5 text-muted-foreground/20 group-hover:text-emerald-400/60 transition-all" />
                      </div>

                      <h3 className="text-sm font-medium text-foreground mb-1">
                        {v.name}
                      </h3>
                      <p className="text-xs text-muted-foreground mb-3">
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
                                : "text-muted-foreground/60"
                          )}
                        >
                          {v.lastAgentAction}
                        </p>
                      )}

                      <div className="space-y-2">
                        <StageProgress stage={v.stage} />
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-muted-foreground/50">
                            {v.stage}
                          </span>
                        </div>
                      </div>

                      {/* Momentum */}
                      {v.momentum && (
                        <div className="mt-3 pt-3 border-t border-border/20">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-1.5">
                              <Zap
                                className={cn(
                                  "size-3",
                                  v.momentum.velocityVsBenchmark === "faster"
                                    ? "text-emerald-400"
                                    : v.momentum.velocityVsBenchmark ===
                                        "slower"
                                      ? "text-red-400"
                                      : "text-amber-400"
                                )}
                              />
                              <span className="text-[10px] font-medium text-foreground">
                                {v.momentum.projectedDays}d projected
                              </span>
                            </div>
                            <span
                              className={cn(
                                "text-[9px] font-medium px-1.5 py-0.5 rounded-full",
                                v.momentum.velocityVsBenchmark === "faster"
                                  ? "bg-emerald-500/10 text-emerald-400"
                                  : v.momentum.velocityVsBenchmark === "slower"
                                    ? "bg-red-500/10 text-red-400"
                                    : "bg-amber-500/10 text-amber-400"
                              )}
                            >
                              {v.momentum.velocityVsBenchmark === "faster"
                                ? "↑ Ahead"
                                : v.momentum.velocityVsBenchmark === "slower"
                                  ? "↓ Behind"
                                  : "→ On pace"}
                              {v.momentum.benchmarkDays
                                ? ` vs ${v.momentum.benchmarkDays}d avg`
                                : ""}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-white/[0.04] rounded-full h-1">
                              <div
                                className={cn(
                                  "h-1 rounded-full transition-all duration-500",
                                  v.momentum.confidence >= 70
                                    ? "bg-emerald-400"
                                    : v.momentum.confidence >= 40
                                      ? "bg-amber-400"
                                      : "bg-red-400"
                                )}
                                style={{
                                  width: `${Math.min(v.momentum.confidence, 100)}%`,
                                }}
                              />
                            </div>
                            <span className="text-[9px] font-mono text-muted-foreground/50">
                              {v.momentum.confidence}%
                            </span>
                          </div>
                          {v.momentum.riskLevel !== "low" &&
                            v.momentum.riskFactors.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1.5">
                                {v.momentum.riskFactors
                                  .slice(0, 2)
                                  .map((rf: string, j: number) => (
                                    <span
                                      key={j}
                                      className="text-[9px] px-1.5 py-0.5 rounded bg-red-500/5 text-red-400/70"
                                    >
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
                    className="mt-3 w-full text-center text-[11px] text-muted-foreground hover:text-emerald-400 transition-colors py-2.5 border border-border/20 rounded-xl hover:border-emerald-500/20"
                  >
                    {showAllPortfolio
                      ? "Show less"
                      : `View all ${portfolio.length} ventures`}
                  </button>
                )}
              </>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════
            INTELLIGENCE TAB
            ══════════════════════════════════════════════════════════ */}
        {activeTab === "intelligence" && (
          <div className="space-y-8">
            {/* Venture Forecasts */}
            {forecasts && forecasts.length > 0 && (
              <motion.section
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div className="flex items-center gap-2.5 mb-4">
                  <div className="size-6 rounded-md bg-blue-500/10 flex items-center justify-center">
                    <BarChart3 className="size-3.5 text-blue-400" />
                  </div>
                  <h2 className="text-sm font-semibold text-foreground">
                    Venture Forecasts
                  </h2>
                  <span className="ml-auto text-[10px] text-muted-foreground/50">
                    AI-projected timelines
                  </span>
                </div>
                <div className="space-y-2.5">
                  {(showAllForecasts
                    ? forecasts
                    : forecasts.slice(0, 6)
                  ).map((f: any, i: number) => (
                    <motion.div
                      key={f.ventureId}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.04, duration: 0.3 }}
                      className="rounded-xl border border-border/30 bg-gradient-to-r from-white/[0.02] to-transparent p-5"
                    >
                      <div className="flex items-start justify-between mb-2.5">
                        <div>
                          <h3 className="text-sm font-medium text-foreground">
                            {f.ventureName}
                          </h3>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Projected:{" "}
                            <span className="font-mono text-foreground/70">
                              {f.projectedDays}
                            </span>{" "}
                            days to next stage
                          </p>
                        </div>
                        <div
                          className={cn(
                            "px-2 py-0.5 rounded-full text-[10px] font-medium",
                            f.riskLevel === "low"
                              ? "bg-emerald-500/10 text-emerald-400"
                              : f.riskLevel === "medium"
                                ? "bg-amber-500/10 text-amber-400"
                                : "bg-red-500/10 text-red-400"
                          )}
                        >
                          {f.riskLevel} risk
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex-1 bg-white/[0.04] rounded-full h-1.5">
                          <div
                            className="h-1.5 rounded-full bg-blue-400/60 transition-all"
                            style={{
                              width: `${Math.min(f.confidence, 100)}%`,
                            }}
                          />
                        </div>
                        <span className="text-[10px] font-mono text-muted-foreground/50">
                          {f.confidence}% confidence
                        </span>
                      </div>
                      {f.riskFactors && f.riskFactors.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2.5">
                          {f.riskFactors
                            .slice(0, 3)
                            .map((rf: string, j: number) => (
                              <span
                                key={j}
                                className="text-[10px] px-1.5 py-0.5 rounded bg-white/[0.03] text-muted-foreground/60"
                              >
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
                    className="mt-3 w-full text-center text-[11px] text-muted-foreground hover:text-blue-400 transition-colors py-2.5 border border-border/20 rounded-xl hover:border-blue-500/20"
                  >
                    {showAllForecasts
                      ? "Show less"
                      : `View all ${forecasts.length} forecasts`}
                  </button>
                )}
              </motion.section>
            )}

            {/* Market Intelligence */}
            {marketSignals && marketSignals.length > 0 && (
              <motion.section
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 }}
              >
                <div className="flex items-center gap-2.5 mb-4">
                  <div className="size-6 rounded-md bg-purple-500/10 flex items-center justify-center">
                    <Globe className="size-3.5 text-purple-400" />
                  </div>
                  <h2 className="text-sm font-semibold text-foreground">
                    Market Intelligence
                  </h2>
                  <span className="ml-auto text-[10px] text-muted-foreground/50">
                    Sector signals
                  </span>
                </div>
                <div className="space-y-2.5">
                  {(showAllSignals
                    ? marketSignals
                    : marketSignals.slice(0, 5)
                  ).map((s: any, i: number) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 + i * 0.04, duration: 0.3 }}
                      className="rounded-xl border border-border/30 bg-gradient-to-r from-white/[0.02] to-transparent p-5"
                    >
                      <div className="flex items-start justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground/50">
                            {SECTOR_ICONS[s.sector] || (
                              <Package className="size-4" />
                            )}
                          </span>
                          <span className="text-[11px] text-muted-foreground/60">
                            {s.sector}
                          </span>
                          <span
                            className={cn(
                              "text-[10px] px-1.5 py-0.5 rounded",
                              s.signalType === "opportunity"
                                ? "bg-emerald-500/10 text-emerald-400"
                                : s.signalType === "risk"
                                  ? "bg-red-500/10 text-red-400"
                                  : s.signalType === "regulatory"
                                    ? "bg-amber-500/10 text-amber-400"
                                    : "bg-white/[0.04] text-muted-foreground"
                            )}
                          >
                            {s.signalType}
                          </span>
                        </div>
                        <span className="text-[10px] font-mono text-muted-foreground/40">
                          {s.relevance}% relevant
                        </span>
                      </div>
                      <h3 className="text-sm font-medium text-foreground mb-1">
                        {s.headline}
                      </h3>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {s.impact}
                      </p>
                    </motion.div>
                  ))}
                </div>
                {marketSignals.length > 5 && (
                  <button
                    onClick={() => setShowAllSignals(!showAllSignals)}
                    className="mt-3 w-full text-center text-[11px] text-muted-foreground hover:text-purple-400 transition-colors py-2.5 border border-border/20 rounded-xl hover:border-purple-500/20"
                  >
                    {showAllSignals
                      ? "Show less"
                      : `View all ${marketSignals.length} signals`}
                  </button>
                )}
              </motion.section>
            )}

            {/* Empty Intelligence */}
            {(!forecasts || forecasts.length === 0) &&
              (!marketSignals || marketSignals.length === 0) && (
                <div className="text-center py-16">
                  <div className="size-14 rounded-2xl bg-white/[0.04] flex items-center justify-center mx-auto mb-4">
                    <Sparkles className="size-6 text-muted-foreground/40" />
                  </div>
                  <h3 className="text-sm font-semibold text-foreground mb-1">
                    Intelligence Building
                  </h3>
                  <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                    VENTEX is gathering market data and building forecasts for
                    your portfolio. Check back soon.
                  </p>
                </div>
              )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════
            AI CONCIERGE TAB
            ══════════════════════════════════════════════════════════ */}
        {activeTab === "concierge" && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col h-[calc(100vh-220px)] min-h-[500px]"
          >
            {/* Concierge Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="size-12 rounded-xl bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 flex items-center justify-center border border-emerald-500/20">
                  <img
                    src="https://d2xsxph8kpxj0f.cloudfront.net/310519663421947072/TYkqBQavc4Sd5YvF3sSZqT/ventex-logo-mark_1f534165.png"
                    alt="VENTEX"
                    className="size-7 rounded object-contain"
                  />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-foreground tracking-tight">
                    VENTEX Intelligence
                  </h2>
                  <p className="text-xs text-muted-foreground/60 mt-0.5">
                    Your portfolio assistant · Ask anything about your ventures
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {conciergeMessages.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearConciergeChat}
                    className="text-xs text-muted-foreground/50 hover:text-red-400 gap-1.5"
                  >
                    <Trash2 className="size-3.5" />
                    Clear
                  </Button>
                )}
                <div className="flex items-center gap-1.5">
                  <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[10px] font-mono text-emerald-400/80">online</span>
                </div>
              </div>
            </div>

            {/* Chat Area */}
            <div className="flex-1 min-h-0 rounded-2xl border border-border/30 bg-gradient-to-b from-white/[0.02] to-transparent flex flex-col overflow-hidden">
              <ScrollArea ref={conciergeScrollRef} className="flex-1 min-h-0">
                <div className="px-6 py-5 space-y-5">
                  {conciergeMessages.length === 0 && (
                    <div className="text-center py-16">
                      <div className="size-20 rounded-2xl bg-gradient-to-br from-emerald-500/15 to-emerald-600/5 flex items-center justify-center mx-auto mb-6 border border-emerald-500/10">
                        <img
                          src="https://d2xsxph8kpxj0f.cloudfront.net/310519663421947072/TYkqBQavc4Sd5YvF3sSZqT/ventex-logo-mark_1f534165.png"
                          alt="VENTEX"
                          className="size-10 rounded object-contain"
                        />
                      </div>
                      <h3 className="text-lg font-semibold text-foreground mb-2">
                        How can I help you today?
                      </h3>
                      <p className="text-sm text-muted-foreground/50 max-w-md mx-auto leading-relaxed mb-8">
                        I can answer questions about your ventures, analyze portfolio health, check task statuses, and help you take action on your portfolio.
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg mx-auto">
                        {[
                          { text: "What's the status of my portfolio?", icon: <Activity className="size-4" /> },
                          { text: "Which tasks need my attention?", icon: <Zap className="size-4" /> },
                          { text: "Summarize my distributions", icon: <DollarSign className="size-4" /> },
                          { text: "Show me venture health scores", icon: <TrendingUp className="size-4" /> },
                        ].map((suggestion) => (
                          <button
                            key={suggestion.text}
                            onClick={() => { setConciergeInput(suggestion.text); setTimeout(() => conciergeInputRef.current?.focus(), 50); }}
                            className="flex items-center gap-3 text-left text-xs text-muted-foreground/60 hover:text-emerald-400 px-4 py-3.5 rounded-xl border border-border/20 hover:border-emerald-500/20 hover:bg-emerald-500/5 transition-all group"
                          >
                            <span className="text-muted-foreground/30 group-hover:text-emerald-400/60 transition-colors">{suggestion.icon}</span>
                            {suggestion.text}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {conciergeMessages.map((msg) => (
                    <div key={msg.id} className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}>
                      <div className={cn("flex items-start gap-3 max-w-[80%]", msg.role === "user" ? "flex-row-reverse" : "flex-row")}>
                        {msg.role === "assistant" && (
                          <div className="size-8 rounded-lg bg-gradient-to-br from-emerald-500/15 to-emerald-600/5 flex items-center justify-center flex-shrink-0 mt-0.5 border border-emerald-500/10">
                            <img
                              src="https://d2xsxph8kpxj0f.cloudfront.net/310519663421947072/TYkqBQavc4Sd5YvF3sSZqT/ventex-logo-mark_1f534165.png"
                              alt="V"
                              className="size-4.5 rounded object-contain"
                            />
                          </div>
                        )}
                        <div className={cn(
                          "rounded-2xl px-4 py-3",
                          msg.role === "user"
                            ? "bg-emerald-500/15 text-foreground rounded-br-md"
                            : "bg-white/[0.04] text-foreground border border-border/20 rounded-bl-md"
                        )}>
                          {msg.role === "assistant" ? (
                            msg.isStreaming && !msg.content ? (
                              <div className="flex items-center gap-1.5 py-1">
                                <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse [animation-delay:150ms]" />
                                <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse [animation-delay:300ms]" />
                              </div>
                            ) : (
                              <div className="text-sm leading-relaxed [&_p]:mb-2 [&_ul]:ml-4 [&_ul]:list-disc [&_li]:mb-1 [&_strong]:font-semibold [&_h1]:text-base [&_h1]:font-semibold [&_h1]:mb-2 [&_h2]:text-sm [&_h2]:font-semibold [&_h2]:mb-1.5 [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:mb-1">
                                <Streamdown>{msg.content}</Streamdown>
                              </div>
                            )
                          ) : (
                            <p className="text-sm leading-relaxed">{msg.content}</p>
                          )}
                          <span className="text-[9px] text-muted-foreground/30 mt-1.5 block">
                            {msg.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>

              {/* Input Area */}
              <div className="px-5 pb-5 pt-3 border-t border-border/20 flex-shrink-0">
                <div className="flex items-end gap-3">
                  <Textarea
                    ref={conciergeInputRef}
                    value={conciergeInput}
                    onChange={(e) => setConciergeInput(e.target.value)}
                    onKeyDown={handleConciergeKeyDown}
                    placeholder="Ask about your portfolio, ventures, or tasks..."
                    className="flex-1 min-h-[44px] max-h-[120px] resize-none text-sm bg-white/[0.04] border-border/20 rounded-xl focus:border-emerald-500/30 focus:ring-emerald-500/10 placeholder:text-muted-foreground/30"
                    rows={1}
                    disabled={conciergeLoading}
                  />
                  <Button
                    onClick={handleConciergeSend}
                    disabled={!conciergeInput.trim() || conciergeLoading}
                    className="h-11 px-5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white flex-shrink-0 disabled:opacity-30 gap-2"
                  >
                    {conciergeLoading ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Send className="size-4" />
                    )}
                    Send
                  </Button>
                </div>
                <p className="text-[10px] text-muted-foreground/30 mt-3 text-center">
                  Powered by VENTEX Intelligence · Responses are based on your portfolio data
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* ══════════════════════════════════════════════════════════
            SETTINGS TAB
            ══════════════════════════════════════════════════════════ */}
        {activeTab === "settings" && (
          <div className="space-y-8">
            {/* Notification Preferences */}
            <motion.section
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="flex items-center gap-2.5 mb-6">
                <div className="size-6 rounded-md bg-emerald-500/10 flex items-center justify-center">
                  <Bell className="size-3.5 text-emerald-400" />
                </div>
                <h2 className="text-sm font-semibold text-foreground">
                  Notification Preferences
                </h2>
              </div>

              {notifPrefsLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} className="h-14 rounded-lg" />
                  ))}
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Channels */}
                  <div className="space-y-1">
                    <h3 className="text-xs font-medium text-muted-foreground/70 uppercase tracking-[0.08em] mb-3">
                      Delivery Channels
                    </h3>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between p-4 rounded-xl border border-border/30 bg-white/[0.02]">
                        <div className="flex items-center gap-3">
                          <div className="size-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                            <Bell className="size-4 text-blue-400" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-foreground">Push Notifications</p>
                            <p className="text-[11px] text-muted-foreground/60">Receive alerts on your device</p>
                          </div>
                        </div>
                        <Switch
                          checked={notifPrefs?.pushEnabled ?? true}
                          onCheckedChange={(checked) =>
                            updateNotifPrefsMutation.mutate({ pushEnabled: checked })
                          }
                        />
                      </div>
                      <div className="flex items-center justify-between p-4 rounded-xl border border-border/30 bg-white/[0.02]">
                        <div className="flex items-center gap-3">
                          <div className="size-8 rounded-lg bg-violet-500/10 flex items-center justify-center">
                            <Mail className="size-4 text-violet-400" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-foreground">Email Notifications</p>
                            <p className="text-[11px] text-muted-foreground/60">Receive summaries via email</p>
                          </div>
                        </div>
                        <Switch
                          checked={notifPrefs?.emailEnabled ?? true}
                          onCheckedChange={(checked) =>
                            updateNotifPrefsMutation.mutate({ emailEnabled: checked })
                          }
                        />
                      </div>
                    </div>
                  </div>

                  {/* Categories */}
                  <div className="space-y-1">
                    <h3 className="text-xs font-medium text-muted-foreground/70 uppercase tracking-[0.08em] mb-3">
                      Notification Categories
                    </h3>
                    <div className="space-y-2">
                      {[
                        {
                          key: "actionItems" as const,
                          label: "Action Items",
                          desc: "Stage advances, approvals needed",
                          icon: <Zap className="size-4 text-amber-400" />,
                          iconBg: "bg-amber-500/10",
                        },
                        {
                          key: "distributions" as const,
                          label: "Distributions",
                          desc: "Distribution confirmations, payments",
                          icon: <DollarSign className="size-4 text-emerald-400" />,
                          iconBg: "bg-emerald-500/10",
                        },
                        {
                          key: "stageAdvances" as const,
                          label: "Stage Advances",
                          desc: "Venture stage changes and milestones",
                          icon: <ArrowUpRight className="size-4 text-blue-400" />,
                          iconBg: "bg-blue-500/10",
                        },
                        {
                          key: "marketSignals" as const,
                          label: "Market Signals",
                          desc: "Intelligence and market alerts",
                          icon: <Globe className="size-4 text-cyan-400" />,
                          iconBg: "bg-cyan-500/10",
                        },
                        {
                          key: "teamUpdates" as const,
                          label: "Team Updates",
                          desc: "Team member changes and assignments",
                          icon: <Users className="size-4 text-violet-400" />,
                          iconBg: "bg-violet-500/10",
                        },
                        {
                          key: "agentActivity" as const,
                          label: "AI Agent Activity",
                          desc: "Autonomous task completions",
                          icon: <Activity className="size-4 text-rose-400" />,
                          iconBg: "bg-rose-500/10",
                        },
                      ].map((cat) => (
                        <div
                          key={cat.key}
                          className="flex items-center justify-between p-4 rounded-xl border border-border/30 bg-white/[0.02]"
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={cn(
                                "size-8 rounded-lg flex items-center justify-center",
                                cat.iconBg
                              )}
                            >
                              {cat.icon}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-foreground">
                                {cat.label}
                              </p>
                              <p className="text-[11px] text-muted-foreground/60">
                                {cat.desc}
                              </p>
                            </div>
                          </div>
                          <Switch
                            checked={
                              notifPrefs?.[cat.key] ??
                              (cat.key === "teamUpdates" ||
                              cat.key === "agentActivity"
                                ? false
                                : true)
                            }
                            onCheckedChange={(checked) =>
                              updateNotifPrefsMutation.mutate({
                                [cat.key]: checked,
                              })
                            }
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Quiet Hours */}
                  <div className="space-y-1">
                    <h3 className="text-xs font-medium text-muted-foreground/70 uppercase tracking-[0.08em] mb-3">
                      Quiet Hours
                    </h3>
                    <div className="p-4 rounded-xl border border-border/30 bg-white/[0.02]">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="size-8 rounded-lg bg-indigo-500/10 flex items-center justify-center">
                          <Moon className="size-4 text-indigo-400" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            Do Not Disturb
                          </p>
                          <p className="text-[11px] text-muted-foreground/60">
                            Pause push notifications during set hours (UTC)
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 pl-11">
                        <div className="flex items-center gap-2">
                          <label className="text-[11px] text-muted-foreground/60">From</label>
                          <input
                            type="time"
                            className="bg-white/[0.04] border border-border/30 rounded-lg px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-emerald-500/30"
                            value={notifPrefs?.quietHoursStart || ""}
                            onChange={(e) =>
                              updateNotifPrefsMutation.mutate({
                                quietHoursStart: e.target.value || null,
                              })
                            }
                          />
                        </div>
                        <span className="text-muted-foreground/30">—</span>
                        <div className="flex items-center gap-2">
                          <label className="text-[11px] text-muted-foreground/60">To</label>
                          <input
                            type="time"
                            className="bg-white/[0.04] border border-border/30 rounded-lg px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-emerald-500/30"
                            value={notifPrefs?.quietHoursEnd || ""}
                            onChange={(e) =>
                              updateNotifPrefsMutation.mutate({
                                quietHoursEnd: e.target.value || null,
                              })
                            }
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Account Info */}
                  <div className="space-y-1">
                    <h3 className="text-xs font-medium text-muted-foreground/70 uppercase tracking-[0.08em] mb-3">
                      Account
                    </h3>
                    <div className="p-4 rounded-xl border border-border/30 bg-white/[0.02]">
                      <div className="flex items-center gap-3">
                        <div className="size-10 rounded-full bg-emerald-500/10 flex items-center justify-center">
                          <span className="text-sm font-semibold text-emerald-400">
                            {(user?.name || user?.email || "?").charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            {user?.name || "Client User"}
                          </p>
                          <p className="text-[11px] text-muted-foreground/60">
                            {user?.email || "No email on file"}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </motion.section>
          </div>
        )}

        {/* ── Footer ──────────────────────────────────────────────── */}
        <div className="pt-12 pb-8 text-center space-y-3">
          <div className="flex items-center justify-center gap-2 text-muted-foreground/30">
            <div className="h-px w-12 bg-border/30" />
            <Shield className="size-3.5" />
            <div className="h-px w-12 bg-border/30" />
          </div>
          <p className="text-[11px] text-muted-foreground/40">
            Need help? Contact your VENTEX relationship manager or reach us at{" "}
            <a
              href="mailto:support@ventex.io"
              className="text-emerald-400/50 hover:text-emerald-400 transition-colors"
            >
              support@ventex.io
            </a>
          </p>
          <div className="flex items-center justify-center gap-2 mt-1">
            <img
              src="https://d2xsxph8kpxj0f.cloudfront.net/310519663421947072/TYkqBQavc4Sd5YvF3sSZqT/ventex-logo-mark_1f534165.png"
              alt="VENTEX"
              className="size-4 rounded-sm object-cover opacity-25"
            />
            <p className="text-[10px] text-muted-foreground/25">
              Managed by VENTEX · Powered by Aurovia
            </p>
          </div>
        </div>
      </main>

      {/* ── Task Drawer ──────────────────────────────────────────── */}
      <Sheet
        open={!!taskDrawer}
        onOpenChange={(open) => !open && setTaskDrawer(null)}
      >
        <SheetContent className="w-full sm:max-w-md bg-background border-border">
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
                <p className="text-sm text-muted-foreground">
                  No tasks for this venture yet.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {/* Progress bar */}
                {(() => {
                  const total = ventureTasks.length;
                  const done = ventureTasks.filter(
                    (t) => t.status === "complete"
                  ).length;
                  const pct =
                    total > 0 ? Math.round((done / total) * 100) : 0;
                  return (
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs text-muted-foreground">
                          {done} of {total} tasks complete
                        </span>
                        <span
                          className={cn(
                            "text-xs font-mono font-medium",
                            pct === 100
                              ? "text-emerald-400"
                              : pct >= 50
                                ? "text-amber-400"
                                : "text-muted-foreground"
                          )}
                        >
                          {pct}%
                        </span>
                      </div>
                      <div className="w-full bg-white/[0.04] rounded-full h-1.5">
                        <div
                          className={cn(
                            "h-1.5 rounded-full transition-all duration-500",
                            pct === 100
                              ? "bg-emerald-400"
                              : pct >= 50
                                ? "bg-amber-400"
                                : "bg-emerald-400/60"
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
                  const isOverdue =
                    task.dueDate &&
                    new Date(task.dueDate) < new Date() &&
                    !isComplete;

                  return (
                    <div
                      key={task.id}
                      className={cn(
                        "rounded-xl border p-3.5 transition-all",
                        isComplete
                          ? "border-emerald-500/15 bg-emerald-500/[0.03]"
                          : isOverdue
                            ? "border-red-500/15 bg-red-500/[0.03]"
                            : "border-border/30 bg-white/[0.01] hover:border-emerald-500/15"
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <div className="pt-0.5">
                          {isCompleting ? (
                            <Loader2 className="size-4 animate-spin text-emerald-400" />
                          ) : (
                            <Checkbox
                              checked={isComplete}
                              disabled={isComplete || isCompleting}
                              onCheckedChange={() =>
                                handleCompleteTask(task.id)
                              }
                              className={cn(
                                "border-muted-foreground/30",
                                isComplete &&
                                  "border-emerald-400 bg-emerald-400 text-white"
                              )}
                            />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p
                            className={cn(
                              "text-sm font-medium leading-snug",
                              isComplete
                                ? "text-muted-foreground line-through"
                                : "text-foreground"
                            )}
                          >
                            {task.title}
                          </p>
                          {task.description && (
                            <p className="text-xs text-muted-foreground/60 mt-0.5 line-clamp-2">
                              {task.description}
                            </p>
                          )}
                          <div className="flex items-center gap-3 mt-1.5">
                            {task.priority && (
                              <span
                                className={cn(
                                  "text-[10px] px-1.5 py-0.5 rounded font-medium",
                                  task.priority === "High"
                                    ? "bg-red-500/10 text-red-400"
                                    : task.priority === "Medium"
                                      ? "bg-amber-500/10 text-amber-400"
                                      : "bg-white/[0.04] text-muted-foreground"
                                )}
                              >
                                {task.priority}
                              </span>
                            )}
                            {task.dueDate && (
                              <span
                                className={cn(
                                  "text-[10px] flex items-center gap-1",
                                  isOverdue
                                    ? "text-red-400"
                                    : "text-muted-foreground/50"
                                )}
                              >
                                <Clock className="size-3" />
                                {isOverdue
                                  ? "Overdue"
                                  : friendlyDate(task.dueDate)}
                              </span>
                            )}
                            {task.assigneeNames && (
                              <span className="text-[10px] text-muted-foreground/40">
                                {task.assigneeNames}
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

      {/* ── Confirmation Dialog ───────────────────────────────────── */}
      <Dialog
        open={!!confirmDialog}
        onOpenChange={(open) => !open && setConfirmDialog(null)}
      >
        {confirmDialog && (
          <DialogContent className="w-[calc(100%-2rem)] sm:max-w-md">
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
                className="min-h-[44px] sm:min-h-0 touch-manipulation"
                onClick={() => setConfirmDialog(null)}
                disabled={resolvingIds.has(confirmDialog.eventId)}
              >
                Cancel
              </Button>
              <Button
                className="min-h-[44px] sm:min-h-0 touch-manipulation bg-emerald-600 hover:bg-emerald-500 text-white border-0"
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

      {/* ── Mobile Bottom Nav ─────────────────────────────────────── */}
      <div className="fixed bottom-0 left-0 right-0 sm:hidden z-20">
        <div
          className="border-t border-border/30 px-2 py-2 flex items-center justify-around"
          style={{ backgroundColor: "oklch(8% .003 264)" }}
        >
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex flex-col items-center gap-1 px-4 py-1.5 rounded-lg transition-all",
                activeTab === tab.id
                  ? "text-emerald-400"
                  : "text-muted-foreground/50"
              )}
            >
              {tab.icon}
              <span className="text-[9px] font-medium">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>
    </>
  );

  // ── Wrapper ────────────────────────────────────────────────────────────

  if (useDashboard) {
    return (
      <DashboardLayout title={orgName} subtitle="MANAGED BY VENTEX">
        <div className="p-5 md:p-8">{portalContent}</div>
      </DashboardLayout>
    );
  }

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
      <header className="border-b border-border/30 bg-background/80 backdrop-blur-xl sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div
            className="cursor-pointer group flex items-center gap-3"
            onClick={() => navigate(`/portal/${orgSlug}`)}
            title="Return to dashboard"
          >
            <img
              src="https://d2xsxph8kpxj0f.cloudfront.net/310519663421947072/TYkqBQavc4Sd5YvF3sSZqT/ventex-logo-mark_1f534165.png"
              alt="VENTEX"
              className="size-8 rounded-md object-cover flex-shrink-0"
            />
            <div>
              <h1 className="text-base font-semibold text-foreground tracking-tight group-hover:text-emerald-400 transition-colors font-[family-name:var(--font-display)]">
                {orgName}
              </h1>
              <p className="text-[10px] text-muted-foreground/40 mt-0.5 uppercase tracking-[0.1em]">
                Managed by VENTEX
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[11px] text-muted-foreground/50 hidden sm:block">
              {user.name || user.email}
            </span>
            <a
              href="/sign-out"
              className="inline-flex items-center justify-center text-muted-foreground/40 hover:text-foreground h-8 w-8 p-0 rounded-md no-underline"
            >
              <LogOut className="size-4" />
            </a>
          </div>
        </div>
      </header>

      {portalContent}
    </div>
  );
}
