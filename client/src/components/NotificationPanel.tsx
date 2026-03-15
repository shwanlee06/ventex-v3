import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useCallback } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

const TYPE_CONFIG: Record<string, { dot: string; border: string }> = {
  urgent: { dot: "bg-red-500", border: "border-red-500/20" },
  warning: { dot: "bg-amber-500", border: "border-amber-500/20" },
  info: { dot: "bg-blue-500", border: "border-blue-500/20" },
  success: { dot: "bg-emerald-500", border: "border-emerald-500/20" },
  overdue: { dot: "bg-red-500", border: "border-red-500/20" },
  task: { dot: "bg-amber-500", border: "border-amber-500/20" },
  system: { dot: "bg-blue-500", border: "border-blue-500/20" },
};

function formatTimestamp(d: string | Date): string {
  const date = new Date(d);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  if (diff < 60_000) return "Just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
}

interface NotificationPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NotificationPanel({ open, onOpenChange }: NotificationPanelProps) {
  const utils = trpc.useUtils();
  const notifQ = trpc.notifications.list.useQuery({ limit: 50 });
  const markReadMut = trpc.notifications.markRead.useMutation({
    onSuccess: () => utils.notifications.list.invalidate(),
  });
  const markAllReadMut = trpc.notifications.markAllRead.useMutation({
    onSuccess: () => utils.notifications.list.invalidate(),
  });

  const notifications = notifQ.data || [];
  const unreadCount = notifications.filter(n => !n.read).length;

  const markAllRead = useCallback(() => {
    markAllReadMut.mutate();
    toast.success("All notifications marked as read");
  }, [markAllReadMut]);

  const markRead = useCallback((id: number) => {
    markReadMut.mutate({ id });
  }, [markReadMut]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[380px] sm:max-w-[380px] bg-card border-border p-0">
        <SheetHeader className="px-4 pt-4 pb-3 border-b border-border">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-sm font-semibold text-foreground">Notifications</SheetTitle>
            {unreadCount > 0 && (
              <Button variant="ghost" size="sm" className="text-xs text-primary h-7 px-2" onClick={markAllRead}>
                Mark all read
              </Button>
            )}
          </div>
          <SheetDescription className="text-[10px] font-mono text-muted-foreground">
            {unreadCount} unread notification{unreadCount !== 1 ? "s" : ""}
          </SheetDescription>
        </SheetHeader>
        <div className="divide-y divide-border overflow-y-auto max-h-[calc(100vh-100px)]">
          {notifications.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-xs text-muted-foreground">No notifications yet.</p>
            </div>
          ) : (
            notifications.map((n) => {
              const cfg = TYPE_CONFIG[n.type] || TYPE_CONFIG.info;
              return (
                <button
                  key={n.id}
                  onClick={() => markRead(n.id)}
                  className={cn(
                    "w-full text-left px-4 py-3 flex gap-3 transition-colors hover:bg-accent/50",
                    n.read ? "opacity-50" : ""
                  )}
                >
                  <span className={cn("size-2 rounded-full mt-1.5 flex-shrink-0", cfg.dot)} />
                  <div className="flex-1 min-w-0">
                    <span className={cn("text-xs font-medium block", n.read ? "text-muted-foreground" : "text-foreground")}>
                      {n.title}
                    </span>
                    {n.message && (
                      <span className="text-[11px] text-muted-foreground block mt-0.5 truncate">{n.message}</span>
                    )}
                    <span className="text-[10px] font-mono text-muted-foreground mt-1 block">{formatTimestamp(n.createdAt)}</span>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

export function useNotifications() {
  const notifQ = trpc.notifications.list.useQuery({ limit: 50 });
  const notifications = notifQ.data || [];
  const unreadCount = notifications.filter(n => !n.read).length;
  return { unreadCount };
}
