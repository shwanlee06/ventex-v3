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
import { useAutoRefresh } from "@/hooks/useAutoRefresh";
import { useLocation } from "wouter";
import { useAgents, getAgentConfig, type AgentEvent, type AgentDraft } from "@/contexts/AgentContext";
import {
  Bell, BellRing, CheckCheck, ArrowRight,
  FileText, Send, XCircle, Eye,
} from "lucide-react";

// Severity indicators — minimal
const SEVERITY_DOT: Record<string, string> = {
  critical: "bg-red-500",
  warning: "bg-amber-500",
  success: "bg-emerald-500",
  info: "bg-blue-500",
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

interface NotificationPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NotificationPanel({ open, onOpenChange }: NotificationPanelProps) {
  const utils = trpc.useUtils();
  const notifPoll = useAutoRefresh(30_000);
  const [, navigate] = useLocation();
  const [draftModal, setDraftModal] = useState<AgentDraft | null>(null);
  const [editedBody, setEditedBody] = useState("");

  // System notifications — limited to 20
  const notifQ = trpc.notifications.list.useQuery(
    { limit: 20 },
    { refetchInterval: notifPoll }
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
  const totalUnread = systemUnread + agentUnread;

  // Unified list — merge system + agent, sort by time, take top 20
  const items = useMemo(() => {
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
      raw: n,
    }));
    const agentItems = agentEvents.slice(0, 10).map(e => {
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
        link: null as string | null,
        raw: e as any,
      };
    });

    return [...sysItems, ...agentItems]
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, 20);
  }, [systemNotifications, agentEvents]);

  const handleItemClick = useCallback(
    (item: typeof items[0]) => {
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
    (item: typeof items[0], actionType: string) => {
      if (item.source === "agent") {
        const event = item.raw as AgentEvent;
        if (actionType === "review_draft" && event.actionPayload) {
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

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-[380px] sm:max-w-[380px] !bg-background border-border p-0 flex flex-col">
          {/* Header — clean and minimal */}
          <SheetHeader className="px-4 pt-4 pb-3 border-b border-border flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex items-center justify-center size-7 rounded-lg bg-primary/10">
                  {totalUnread > 0 ? (
                    <BellRing className="size-3.5 text-primary" />
                  ) : (
                    <Bell className="size-3.5 text-primary" />
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
          </SheetHeader>

          {/* Notification list — single clean stream */}
          <div className="flex-1 overflow-y-auto">
            {items.length === 0 ? (
              <div className="p-12 text-center flex flex-col items-center gap-3">
                <div className="flex items-center justify-center size-12 rounded-full bg-secondary/50">
                  <Bell className="size-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">No notifications</p>
                  <p className="text-[10px] text-muted-foreground/70 mt-1">You're all caught up</p>
                </div>
              </div>
            ) : (
              <div className="divide-y divide-border/50">
                {items.map((item) => {
                  const severityDot = SEVERITY_DOT[item.severity] || SEVERITY_DOT.info;
                  const isAgent = item.source === "agent";
                  const agentEvent = isAgent ? (item.raw as AgentEvent) : null;

                  return (
                    <button
                      key={item.id}
                      onClick={() => handleItemClick(item)}
                      className={cn(
                        "w-full text-left px-4 py-3 flex gap-3 transition-colors",
                        item.read
                          ? "opacity-50 hover:opacity-70 hover:bg-accent/30"
                          : "hover:bg-accent/50"
                      )}
                    >
                      {/* Severity dot */}
                      <div className="flex-shrink-0 pt-1.5">
                        {!item.read && <span className={cn("block size-2 rounded-full", severityDot)} />}
                        {item.read && <span className="block size-2 rounded-full bg-transparent" />}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <p className={cn(
                          "text-xs font-medium leading-tight",
                          item.read ? "text-muted-foreground" : "text-foreground"
                        )}>
                          {item.title}
                        </p>

                        {item.message && (
                          <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">
                            {item.message}
                          </p>
                        )}

                        {/* Agent action button — single primary action only */}
                        {isAgent && agentEvent?.actionType && !agentEvent.actionTaken && (
                          <div className="mt-1.5">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-6 text-[10px] px-2 gap-1"
                              onClick={(e) => {
                                e.stopPropagation();
                                const primaryAction = agentEvent.actionType!.split(",")[0].trim();
                                handleAction(item, primaryAction);
                              }}
                            >
                              <Eye className="size-3" />
                              {agentEvent.actionType.split(",")[0].trim().replace(/_/g, " ")}
                            </Button>
                          </div>
                        )}

                        <span className="text-[10px] font-mono text-muted-foreground mt-1 block">
                          {formatTimestamp(item.createdAt)}
                        </span>
                      </div>

                      {/* Navigate arrow for linked items */}
                      {item.link && (
                        <ArrowRight className="size-3 text-muted-foreground/50 flex-shrink-0 mt-1.5" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Draft Preview Modal — kept for agent draft review */}
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
              <div>
                <label className="text-[10px] font-mono uppercase text-muted-foreground mb-1 block">Subject</label>
                <p className="text-xs font-medium text-foreground bg-secondary/30 rounded-md px-3 py-2">
                  {draftModal.subject}
                </p>
              </div>

              <div>
                <label className="text-[10px] font-mono uppercase text-muted-foreground mb-1 block">Body (editable)</label>
                <Textarea
                  value={editedBody}
                  onChange={(e) => setEditedBody(e.target.value)}
                  className="min-h-[160px] text-xs leading-relaxed resize-y"
                />
              </div>

              <div className="bg-amber-500/5 border border-amber-500/20 rounded-md px-3 py-2">
                <p className="text-[10px] text-amber-400/80 leading-relaxed">
                  ⚠️ This content was generated by AI ({draftModal.createdByAgent}). Review carefully before sending.
                </p>
              </div>

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
 */
export function useNotifications() {
  const notifPoll = useAutoRefresh(30_000);
  const countQ = trpc.notifications.unreadCount.useQuery(undefined, {
    refetchInterval: notifPoll,
  });
  return { unreadCount: countQ.data || 0 };
}
