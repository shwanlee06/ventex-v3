import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useCallback, useState, useMemo } from "react";
import { useSSEInvalidation } from "@/hooks/useSSE";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { useAgents, getAgentConfig, resolveAgentKey, type AgentEvent, type AgentDraft } from "@/contexts/AgentContext";
import {
  Bell, BellRing, CheckCheck, Filter,
  AlertTriangle, Info, CheckCircle2, AlertCircle,
  FileText, ListChecks, Building2, Briefcase, DollarSign,
  Users, Brain, Bot, Shield, ArrowRight,
  Send, XCircle, Zap, Eye, RotateCcw,
} from "lucide-react";

const CATEGORY_CONFIG: Record<string, { dot: string; bg: string; icon: React.ReactNode; label: string }> = {
  critical: { dot: "bg-red-500", bg: "bg-red-500/10", icon: <AlertCircle className="size-3.5 text-red-400" />, label: "Critical" },
  warning: { dot: "bg-amber-500", bg: "bg-amber-500/10", icon: <AlertTriangle className="size-3.5 text-amber-400" />, label: "Warning" },
  success: { dot: "bg-emerald-500", bg: "bg-emerald-500/10", icon: <CheckCircle2 className="size-3.5 text-emerald-400" />, label: "Success" },
  info: { dot: "bg-blue-500", bg: "bg-blue-500/10", icon: <Info className="size-3.5 text-blue-400" />, label: "Info" },
};

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
  // Agent event types
  auto_action: <Zap className="size-3.5" />,
  stage_advance: <ArrowRight className="size-3.5" />,
  draft_generated: <FileText className="size-3.5" />,
  velocity_log: <Zap className="size-3.5" />,
  // Legacy types
  urgent: <AlertCircle className="size-3.5" />,
  meeting_brief: <FileText className="size-3.5" />,
  deadline: <AlertTriangle className="size-3.5" />,
};

const ACTION_BUTTONS: Record<string, { label: string; icon: React.ReactNode; variant: "default" | "outline" | "destructive" }> = {
  review_draft: { label: "Review Draft", icon: <Eye className="size-3" />, variant: "default" },
  send_draft: { label: "Send", icon: <Send className="size-3" />, variant: "default" },
  view_venture: { label: "View Venture", icon: <Building2 className="size-3" />, variant: "outline" },
  view_task: { label: "View Task", icon: <ListChecks className="size-3" />, variant: "outline" },
  view_distribution: { label: "View Distribution", icon: <DollarSign className="size-3" />, variant: "outline" },
  acknowledge: { label: "Acknowledge", icon: <CheckCircle2 className="size-3" />, variant: "outline" },
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

type TabKey = "all" | "agents" | "system";

interface NotificationPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NotificationPanel({ open, onOpenChange }: NotificationPanelProps) {
  const utils = trpc.useUtils();
  const [, navigate] = useLocation();
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>("all");
  const [draftModal, setDraftModal] = useState<AgentDraft | null>(null);
  const [editedBody, setEditedBody] = useState("");

  // System notifications
  const notifQ = trpc.notifications.list.useQuery(
    {
      limit: 50,
      ...(activeFilter ? { category: activeFilter as any } : {}),
    },
    { refetchInterval: 30_000 }
  );

  // SSE: instant refetch on notification events
  useSSEInvalidation("notification", () => {
    notifQ.refetch();
    utils.notifications.unreadCount.invalidate();
  });

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

  // Agent context
  let agentEvents: AgentEvent[] = [];
  let agentDrafts: AgentDraft[] = [];
  let markAgentRead: (ids: number[]) => void = () => {};
  let markAllAgentRead: () => void = () => {};
  let executeAction: (eventId: number, actionType: string) => void = () => {};
  let sendDraft: (draftId: number, editedBody?: string) => void = () => {};
  let dismissDraft: (draftId: number) => void = () => {};
  try {
    const agents = useAgents();
    agentEvents = agents.events;
    agentDrafts = agents.drafts;
    markAgentRead = agents.markRead;
    markAllAgentRead = agents.markAllRead;
    executeAction = agents.executeAction;
    sendDraft = agents.sendDraft;
    dismissDraft = agents.dismissDraft;
  } catch {
    // AgentProvider may not be mounted
  }

  const systemNotifications = notifQ.data?.items || [];
  const systemUnread = systemNotifications.filter((n: any) => !n.read).length;
  const agentUnread = agentEvents.filter(e => !e.isRead).length;

  // Merge all items for "all" tab
  const allItems = useMemo(() => {
    const sysItems = systemNotifications.map((n: any) => ({
      id: `sys-${n.id}`,
      source: "system" as const,
      title: n.title,
      message: n.message,
      severity: n.category || "info",
      type: n.type,
      read: n.read,
      createdAt: new Date(n.createdAt),
      link: n.link,
      actorName: n.actorName,
      entityName: n.entityName,
      raw: n,
    }));
    const agentItems = agentEvents.map(e => {
      const config = getAgentConfig(e.agentName);
      return {
        id: `agent-${e.id}`,
        source: "agent" as const,
        title: `${config.label}: ${e.eventType.replace(/_/g, " ")}`,
        message: e.message,
        severity: e.severity,
        type: e.eventType,
        read: e.isRead,
        createdAt: new Date(e.createdAt),
        link: null,
        actorName: config.label,
        entityName: e.agentEntityName,
        raw: e,
      };
    });

    let items = activeTab === "agents" ? agentItems
      : activeTab === "system" ? sysItems
      : [...sysItems, ...agentItems];

    // Sort by createdAt desc
    items.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    // Filter by severity
    if (activeFilter) {
      items = items.filter(i => i.severity === activeFilter);
    }

    return items;
  }, [systemNotifications, agentEvents, activeTab, activeFilter]);

  // Group by date
  const grouped = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today.getTime() - 86_400_000);
    const weekAgo = new Date(today.getTime() - 7 * 86_400_000);

    const groups: Record<string, typeof allItems> = { Today: [], Yesterday: [], "This Week": [], Earlier: [] };
    for (const item of allItems) {
      if (item.createdAt >= today) groups["Today"].push(item);
      else if (item.createdAt >= yesterday) groups["Yesterday"].push(item);
      else if (item.createdAt >= weekAgo) groups["This Week"].push(item);
      else groups["Earlier"].push(item);
    }

    return Object.entries(groups)
      .filter(([, items]) => items.length > 0)
      .map(([label, items]) => ({ label, items }));
  }, [allItems]);

  const handleItemClick = useCallback(
    (item: typeof allItems[0]) => {
      if (item.source === "system") {
        if (!item.read) markReadMut.mutate({ id: item.raw.id });
        if (item.link) {
          onOpenChange(false);
          navigate(item.link);
        }
      } else {
        if (!item.read) markAgentRead([item.raw.id]);
      }
    },
    [markReadMut, markAgentRead, navigate, onOpenChange]
  );

  const handleMarkAllRead = useCallback(() => {
    markAllReadMut.mutate();
    markAllAgentRead();
  }, [markAllReadMut, markAllAgentRead]);

  const handleAction = useCallback(
    (item: typeof allItems[0], actionType: string) => {
      if (item.source === "agent") {
        const event = item.raw as AgentEvent;
        if (actionType === "review_draft" && event.actionPayload) {
          // Find the draft and open modal
          const draftId = (event.actionPayload as any)?.draftId;
          const draft = agentDrafts.find(d => d.id === draftId);
          if (draft) {
            setEditedBody(draft.body);
            setDraftModal(draft);
          } else {
            toast.info("Draft not found — it may have been sent or dismissed already");
          }
        } else {
          executeAction(event.id, actionType);
          toast.success("Action executed");
        }
      }
    },
    [agentDrafts, executeAction]
  );

  const handleSendDraft = useCallback(() => {
    if (!draftModal) return;
    sendDraft(draftModal.id, editedBody !== draftModal.body ? editedBody : undefined);
    toast.success("Draft sent");
    setDraftModal(null);
  }, [draftModal, editedBody, sendDraft]);

  const handleDismissDraft = useCallback(() => {
    if (!draftModal) return;
    dismissDraft(draftModal.id);
    toast.info("Draft dismissed");
    setDraftModal(null);
  }, [draftModal, dismissDraft]);

  const totalUnread = systemUnread + agentUnread;

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-[420px] sm:max-w-[420px] !bg-background border-border p-0 flex flex-col">
          {/* Header */}
          <SheetHeader className="px-4 pt-4 pb-3 border-b border-border flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex items-center justify-center size-8 rounded-lg bg-primary/10">
                  {totalUnread > 0 ? (
                    <BellRing className="size-4 text-primary" />
                  ) : (
                    <Bell className="size-4 text-primary" />
                  )}
                </div>
                <div>
                  <SheetTitle className="text-sm font-semibold text-foreground">Notifications</SheetTitle>
                  <SheetDescription className="text-[10px] font-mono text-muted-foreground">
                    {totalUnread > 0 ? `${totalUnread} unread` : "All caught up"}
                  </SheetDescription>
                </div>
              </div>
              {totalUnread > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-primary h-7 px-2 gap-1"
                  onClick={handleMarkAllRead}
                >
                  <CheckCheck className="size-3" />
                  Mark all read
                </Button>
              )}
            </div>

            {/* Tab bar: All / Agents / System */}
            <div className="flex gap-1 mt-3 border-b border-border -mx-4 px-4">
              {(["all", "agents", "system"] as TabKey[]).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={cn(
                    "text-[11px] font-medium px-3 py-2 border-b-2 transition-colors capitalize",
                    activeTab === tab
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  )}
                >
                  {tab}
                  {tab === "agents" && agentUnread > 0 && (
                    <span className="ml-1 text-[9px] bg-red-500/15 text-red-400 px-1 rounded-full">{agentUnread}</span>
                  )}
                  {tab === "system" && systemUnread > 0 && (
                    <span className="ml-1 text-[9px] bg-blue-500/15 text-blue-400 px-1 rounded-full">{systemUnread}</span>
                  )}
                </button>
              ))}
            </div>

            {/* Severity filter pills */}
            <div className="flex gap-1.5 mt-2 flex-wrap">
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
              {Object.entries(CATEGORY_CONFIG).map(([key, cfg]) => (
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
                </button>
              ))}
            </div>
          </SheetHeader>

          {/* Notification list */}
          <div className="flex-1 overflow-y-auto">
            {allItems.length === 0 ? (
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
                  <div className="px-4 py-2 bg-secondary/30 border-b border-border">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {group.label}
                    </span>
                  </div>

                  {group.items.map((item) => {
                    const cat = CATEGORY_CONFIG[item.severity] || CATEGORY_CONFIG.info;
                    const typeIcon = TYPE_ICONS[item.type] || <Info className="size-3.5" />;
                    const isAgent = item.source === "agent";
                    const agentEvent = isAgent ? (item.raw as AgentEvent) : null;
                    const agentConfig = isAgent ? getAgentConfig(agentEvent!.agentName) : null;

                    return (
                      <div
                        key={item.id}
                        className={cn(
                          "w-full text-left px-4 py-3 flex gap-3 transition-all border-b border-border/50",
                          item.read
                            ? "opacity-50 hover:opacity-70 hover:bg-accent/30"
                            : "hover:bg-accent/50"
                        )}
                      >
                        {/* Icon */}
                        <button
                          onClick={() => handleItemClick(item)}
                          className={cn(
                            "flex items-center justify-center size-8 rounded-lg flex-shrink-0 mt-0.5",
                            isAgent && agentConfig ? agentConfig.bgColor : cat.bg
                          )}
                        >
                          {isAgent ? (
                            <span style={{ color: agentConfig?.color }}>{typeIcon}</span>
                          ) : (
                            typeIcon
                          )}
                        </button>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <button
                              onClick={() => handleItemClick(item)}
                              className={cn(
                                "text-xs font-medium leading-tight text-left",
                                item.read ? "text-muted-foreground" : "text-foreground"
                              )}
                            >
                              {item.title}
                            </button>
                            {!item.read && (
                              <span className={cn("size-2 rounded-full flex-shrink-0 mt-1", cat.dot)} />
                            )}
                          </div>

                          {item.message && (
                            <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2 leading-relaxed">
                              {item.message}
                            </p>
                          )}

                          {/* Agent action buttons */}
                          {isAgent && agentEvent?.actionType && !agentEvent.actionTaken && (
                            <div className="flex items-center gap-1.5 mt-2">
                              {agentEvent.actionType.split(",").map(action => {
                                const actionKey = action.trim();
                                const btnConfig = ACTION_BUTTONS[actionKey] || {
                                  label: actionKey.replace(/_/g, " "),
                                  icon: <Zap className="size-3" />,
                                  variant: "outline" as const,
                                };
                                return (
                                  <Button
                                    key={actionKey}
                                    variant={btnConfig.variant}
                                    size="sm"
                                    className="h-6 text-[10px] px-2 gap-1"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleAction(item, actionKey);
                                    }}
                                  >
                                    {btnConfig.icon}
                                    {btnConfig.label}
                                  </Button>
                                );
                              })}
                            </div>
                          )}

                          {/* Action taken indicator */}
                          {isAgent && agentEvent?.actionTaken && (
                            <div className="flex items-center gap-1 mt-1.5">
                              <CheckCircle2 className="size-3 text-emerald-400" />
                              <span className="text-[10px] text-emerald-400 font-mono">Action taken</span>
                            </div>
                          )}

                          <div className="flex items-center gap-2 mt-1.5">
                            <span className="text-[10px] font-mono text-muted-foreground">
                              {formatTimestamp(item.createdAt)}
                            </span>
                            {item.actorName && (
                              <>
                                <span className="text-[10px] text-muted-foreground/50">·</span>
                                <span className="text-[10px] text-muted-foreground">{item.actorName}</span>
                              </>
                            )}
                            {item.entityName && (
                              <>
                                <span className="text-[10px] text-muted-foreground/50">·</span>
                                <span className="text-[10px] text-muted-foreground truncate max-w-[120px]">
                                  {item.entityName}
                                </span>
                              </>
                            )}
                            {item.link && (
                              <ArrowRight className="size-3 text-muted-foreground/50 ml-auto flex-shrink-0" />
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Draft Preview Modal */}
      <Dialog open={!!draftModal} onOpenChange={(open) => !open && setDraftModal(null)}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-sm">
              <FileText className="size-4 text-purple-400" />
              Draft Preview
            </DialogTitle>
            <DialogDescription className="text-[11px]">
              {draftModal && (
                <>
                  <span className="font-medium">{draftModal.draftType.replace(/_/g, " ")}</span>
                  {draftModal.ventureName && (
                    <> · <span>{draftModal.ventureName}</span></>
                  )}
                  {draftModal.recipientName && (
                    <> · To: <span className="font-medium">{draftModal.recipientName}</span></>
                  )}
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          {draftModal && (
            <div className="space-y-3">
              {/* Subject */}
              <div>
                <label className="text-[10px] font-mono uppercase text-muted-foreground mb-1 block">Subject</label>
                <p className="text-xs font-medium text-foreground bg-secondary/30 rounded-md px-3 py-2">
                  {draftModal.subject}
                </p>
              </div>

              {/* Body — editable */}
              <div>
                <label className="text-[10px] font-mono uppercase text-muted-foreground mb-1 block">Body (editable)</label>
                <Textarea
                  value={editedBody}
                  onChange={(e) => setEditedBody(e.target.value)}
                  className="min-h-[160px] text-xs leading-relaxed resize-y"
                />
              </div>

              {/* Meta */}
              <div className="flex items-center gap-3 text-[10px] text-muted-foreground font-mono">
                <span>Created by: {draftModal.createdByAgent}</span>
                <span>·</span>
                <span>{formatTimestamp(draftModal.createdAt)}</span>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-1"
              onClick={handleDismissDraft}
            >
              <XCircle className="size-3" />
              Dismiss
            </Button>
            <Button
              size="sm"
              className="gap-1"
              onClick={handleSendDraft}
            >
              <Send className="size-3" />
              Send Draft
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

/**
 * Hook for notification state — used by Topbar for the bell badge.
 * Polls every 30 seconds for real-time unread count.
 */
export function useNotifications() {
  const countQ = trpc.notifications.unreadCount.useQuery(undefined, {
    refetchInterval: 30_000,
  });
  return { unreadCount: countQ.data || 0 };
}
