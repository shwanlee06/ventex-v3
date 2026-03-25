import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useCallback, useState, useMemo } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import {
  Bell, BellRing, CheckCheck, Trash2, Filter,
  AlertTriangle, Info, CheckCircle2, AlertCircle,
  FileText, ListChecks, Building2, Briefcase, DollarSign,
  Users, Brain, Bot, Shield, ArrowRight,
} from "lucide-react";

// ── Category config ──────────────────────────────────────────────────
const CATEGORY_CONFIG: Record<string, { dot: string; bg: string; icon: React.ReactNode; label: string }> = {
  critical: { dot: "bg-red-500", bg: "bg-red-500/10", icon: <AlertCircle className="size-3.5 text-red-400" />, label: "Critical" },
  warning: { dot: "bg-amber-500", bg: "bg-amber-500/10", icon: <AlertTriangle className="size-3.5 text-amber-400" />, label: "Warning" },
  success: { dot: "bg-emerald-500", bg: "bg-emerald-500/10", icon: <CheckCircle2 className="size-3.5 text-emerald-400" />, label: "Success" },
  info: { dot: "bg-blue-500", bg: "bg-blue-500/10", icon: <Info className="size-3.5 text-blue-400" />, label: "Info" },
};

// ── Type icons ───────────────────────────────────────────────────────
const TYPE_ICONS: Record<string, React.ReactNode> = {
  task_created: <ListChecks className="size-3.5" />,
  task_completed: <CheckCircle2 className="size-3.5" />,
  task_overdue: <AlertTriangle className="size-3.5" />,
  task_assigned: <ListChecks className="size-3.5" />,
  venture_status_change: <Building2 className="size-3.5" />,
  venture_health_drop: <AlertCircle className="size-3.5" />,
  venture_created: <Building2 className="size-3.5" />,
  spv_stage_change: <Briefcase className="size-3.5" />,
  spv_created: <Briefcase className="size-3.5" />,
  distribution_scheduled: <DollarSign className="size-3.5" />,
  distribution_paid: <DollarSign className="size-3.5" />,
  document_uploaded: <FileText className="size-3.5" />,
  document_analyzed: <Brain className="size-3.5" />,
  document_urgent: <AlertCircle className="size-3.5" />,
  deadline_detected: <AlertTriangle className="size-3.5" />,
  team_member_added: <Users className="size-3.5" />,
  team_member_removed: <Users className="size-3.5" />,
  ai_tasks_generated: <Brain className="size-3.5" />,
  ai_observation: <Brain className="size-3.5" />,
  daily_brief: <Bot className="size-3.5" />,
  smart_alert: <Shield className="size-3.5" />,
  // Legacy types
  urgent: <AlertCircle className="size-3.5" />,
  meeting_brief: <FileText className="size-3.5" />,
  deadline: <AlertTriangle className="size-3.5" />,
};

function formatTimestamp(d: string | Date): string {
  const date = new Date(d);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  if (diff < 60_000) return "Just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  if (diff < 172_800_000) return "Yesterday";
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
}

// Group notifications by date
function groupByDate(items: any[]): { label: string; items: any[] }[] {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86_400_000);
  const weekAgo = new Date(today.getTime() - 7 * 86_400_000);

  const groups: Record<string, any[]> = { Today: [], Yesterday: [], "This Week": [], Earlier: [] };

  for (const item of items) {
    const d = new Date(item.createdAt);
    if (d >= today) groups["Today"].push(item);
    else if (d >= yesterday) groups["Yesterday"].push(item);
    else if (d >= weekAgo) groups["This Week"].push(item);
    else groups["Earlier"].push(item);
  }

  return Object.entries(groups)
    .filter(([, items]) => items.length > 0)
    .map(([label, items]) => ({ label, items }));
}

interface NotificationPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NotificationPanel({ open, onOpenChange }: NotificationPanelProps) {
  const utils = trpc.useUtils();
  const [, navigate] = useLocation();
  const [activeFilter, setActiveFilter] = useState<string | null>(null);

  const notifQ = trpc.notifications.list.useQuery(
    {
      limit: 50,
      ...(activeFilter ? { category: activeFilter as any } : {}),
    },
    { refetchInterval: 30_000 } // Poll every 30 seconds
  );

  const markReadMut = trpc.notifications.markRead.useMutation({
    onSuccess: () => {
      utils.notifications.list.invalidate();
      utils.notifications.unreadCount.invalidate();
    },
  });
  const markAllReadMut = trpc.notifications.markAllRead.useMutation({
    onSuccess: () => {
      utils.notifications.list.invalidate();
      utils.notifications.unreadCount.invalidate();
      toast.success("All notifications marked as read");
    },
  });

  const notifications = notifQ.data?.items || [];
  const unreadCount = notifications.filter((n) => !n.read).length;
  const grouped = useMemo(() => groupByDate(notifications), [notifications]);

  // Category counts for filter pills
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { critical: 0, warning: 0, success: 0, info: 0 };
    for (const n of notifications) {
      const cat = n.category || "info";
      if (counts[cat] !== undefined) counts[cat]++;
    }
    return counts;
  }, [notifications]);

  const handleClick = useCallback(
    (n: any) => {
      if (!n.read) markReadMut.mutate({ id: n.id });
      if (n.link) {
        onOpenChange(false);
        navigate(n.link);
      }
    },
    [markReadMut, navigate, onOpenChange]
  );

  const markAllRead = useCallback(() => {
    markAllReadMut.mutate();
  }, [markAllReadMut]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[400px] sm:max-w-[400px] bg-card border-border p-0 flex flex-col">
        {/* Header */}
        <SheetHeader className="px-4 pt-4 pb-3 border-b border-border flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center size-8 rounded-lg bg-primary/10">
                {unreadCount > 0 ? (
                  <BellRing className="size-4 text-primary" />
                ) : (
                  <Bell className="size-4 text-primary" />
                )}
              </div>
              <div>
                <SheetTitle className="text-sm font-semibold text-foreground">Notifications</SheetTitle>
                <SheetDescription className="text-[10px] font-mono text-muted-foreground">
                  {unreadCount > 0 ? `${unreadCount} unread` : "All caught up"}
                </SheetDescription>
              </div>
            </div>
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-primary h-7 px-2 gap-1"
                onClick={markAllRead}
              >
                <CheckCheck className="size-3" />
                Mark all read
              </Button>
            )}
          </div>

          {/* Category filter pills */}
          <div className="flex gap-1.5 mt-3 flex-wrap">
            <button
              onClick={() => setActiveFilter(null)}
              className={cn(
                "text-[10px] font-medium px-2 py-1 rounded-full transition-colors",
                !activeFilter
                  ? "bg-primary/15 text-primary"
                  : "bg-secondary/50 text-muted-foreground hover:bg-secondary"
              )}
            >
              All
            </button>
            {Object.entries(CATEGORY_CONFIG).map(([key, cfg]) => {
              const count = categoryCounts[key] || 0;
              if (count === 0 && key !== "critical") return null;
              return (
                <button
                  key={key}
                  onClick={() => setActiveFilter(activeFilter === key ? null : key)}
                  className={cn(
                    "text-[10px] font-medium px-2 py-1 rounded-full transition-colors flex items-center gap-1",
                    activeFilter === key
                      ? `${cfg.bg} text-foreground`
                      : "bg-secondary/50 text-muted-foreground hover:bg-secondary"
                  )}
                >
                  <span className={cn("size-1.5 rounded-full", cfg.dot)} />
                  {cfg.label}
                  {count > 0 && <span className="text-[9px] opacity-70">({count})</span>}
                </button>
              );
            })}
          </div>
        </SheetHeader>

        {/* Notification list */}
        <div className="flex-1 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="p-12 text-center flex flex-col items-center gap-3">
              <div className="flex items-center justify-center size-12 rounded-full bg-secondary/50">
                <Bell className="size-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">No notifications</p>
                <p className="text-[10px] text-muted-foreground/70 mt-1">
                  {activeFilter ? "No notifications in this category" : "You're all caught up"}
                </p>
              </div>
            </div>
          ) : (
            grouped.map((group) => (
              <div key={group.label}>
                {/* Group header */}
                <div className="px-4 py-2 bg-secondary/30 border-b border-border">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {group.label}
                  </span>
                </div>

                {/* Items */}
                {group.items.map((n: any) => {
                  const cat = CATEGORY_CONFIG[n.category || "info"] || CATEGORY_CONFIG.info;
                  const typeIcon = TYPE_ICONS[n.type] || <Info className="size-3.5" />;

                  return (
                    <button
                      key={n.id}
                      onClick={() => handleClick(n)}
                      className={cn(
                        "w-full text-left px-4 py-3 flex gap-3 transition-all border-b border-border/50",
                        n.read
                          ? "opacity-50 hover:opacity-70 hover:bg-accent/30"
                          : "hover:bg-accent/50",
                        n.link && "cursor-pointer"
                      )}
                    >
                      {/* Icon */}
                      <div
                        className={cn(
                          "flex items-center justify-center size-8 rounded-lg flex-shrink-0 mt-0.5",
                          cat.bg
                        )}
                      >
                        {typeIcon}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <span
                            className={cn(
                              "text-xs font-medium leading-tight",
                              n.read ? "text-muted-foreground" : "text-foreground"
                            )}
                          >
                            {n.title}
                          </span>
                          {!n.read && (
                            <span className={cn("size-2 rounded-full flex-shrink-0 mt-1", cat.dot)} />
                          )}
                        </div>

                        {n.message && (
                          <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2 leading-relaxed">
                            {n.message}
                          </p>
                        )}

                        <div className="flex items-center gap-2 mt-1.5">
                          <span className="text-[10px] font-mono text-muted-foreground">
                            {formatTimestamp(n.createdAt)}
                          </span>
                          {n.actorName && (
                            <>
                              <span className="text-[10px] text-muted-foreground/50">·</span>
                              <span className="text-[10px] text-muted-foreground">{n.actorName}</span>
                            </>
                          )}
                          {n.entityName && (
                            <>
                              <span className="text-[10px] text-muted-foreground/50">·</span>
                              <span className="text-[10px] text-muted-foreground truncate max-w-[120px]">
                                {n.entityName}
                              </span>
                            </>
                          )}
                          {n.link && (
                            <ArrowRight className="size-3 text-muted-foreground/50 ml-auto flex-shrink-0" />
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

/**
 * Hook for notification state — used by Topbar for the bell badge.
 * Polls every 30 seconds for real-time unread count.
 */
export function useNotifications() {
  const countQ = trpc.notifications.unreadCount.useQuery(undefined, {
    refetchInterval: 30_000, // Poll every 30 seconds
  });
  return { unreadCount: countQ.data || 0 };
}
