import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useState, useCallback } from "react";
import { toast } from "sonner";

interface Notification {
  id: string;
  type: "urgent" | "warning" | "info" | "success";
  text: string;
  read: boolean;
}

const INITIAL_NOTIFICATIONS: Notification[] = [
  { id: "n1", type: "urgent", text: "Crew certification overdue — M/Y Solaris, 8 days past due. Urgent.", read: false },
  { id: "n2", type: "warning", text: "F&B license renewal due in 3 days — Nammos Lebanon, expires Mar 31", read: false },
  { id: "n3", type: "urgent", text: "Task overdue — Nammos Watson Island deck, 17 days past due", read: false },
  { id: "n4", type: "info", text: "AI Agent completed weekly ops report — 247 tasks automated", read: false },
  { id: "n5", type: "success", text: "Distribution paid — $250K Q4 2025 profit share sent to LPs", read: false },
  { id: "n6", type: "info", text: "Workshop scheduled — Zarka City vision statement, Anton coordinating", read: false },
];

const TYPE_CONFIG = {
  urgent: { dot: "bg-red-500", border: "border-red-500/20" },
  warning: { dot: "bg-amber-500", border: "border-amber-500/20" },
  info: { dot: "bg-blue-500", border: "border-blue-500/20" },
  success: { dot: "bg-emerald-500", border: "border-emerald-500/20" },
};

interface NotificationPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  notifications: Notification[];
  setNotifications: React.Dispatch<React.SetStateAction<Notification[]>>;
}

export function NotificationPanel({ open, onOpenChange, notifications, setNotifications }: NotificationPanelProps) {
  const unreadCount = notifications.filter(n => !n.read).length;

  const markAllRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    toast.success("All notifications marked as read");
  }, [setNotifications]);

  const markRead = useCallback((id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    const notif = notifications.find(n => n.id === id);
    if (notif) toast.info(notif.text);
  }, [setNotifications, notifications]);

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
          {notifications.map((n) => {
            const cfg = TYPE_CONFIG[n.type];
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
                <span className={cn("text-xs leading-relaxed", n.read ? "text-muted-foreground" : "text-foreground")}>
                  {n.text}
                </span>
              </button>
            );
          })}
        </div>
      </SheetContent>
    </Sheet>
  );
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>(INITIAL_NOTIFICATIONS);
  const [open, setOpen] = useState(false);
  const unreadCount = notifications.filter(n => !n.read).length;
  return { notifications, setNotifications, open, setOpen, unreadCount };
}
