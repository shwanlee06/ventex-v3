import { cn } from "@/lib/utils";
import { Bell, Search, User, Settings, LogOut } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { NotificationPanel, useNotifications } from "@/components/NotificationPanel";
import CommandPalette from "@/components/CommandPalette";
import { useState, useCallback, useMemo } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { endCurrentSession, logAction } from "@/lib/operatorSession";

interface TopbarProps {
  title: string;
  subtitle?: string;
}

export default function Topbar({ title, subtitle }: TopbarProps) {
  const { notifications, setNotifications, open: notifOpen, setOpen: setNotifOpen, unreadCount } = useNotifications();
  const [cmdOpen, setCmdOpen] = useState(false);
  const [, navigate] = useLocation();

  const operatorName = useMemo(() => {
    try { return localStorage.getItem("atlas_operator") || "ATLAS Admin"; } catch { return "ATLAS Admin"; }
  }, []);
  const initials = operatorName.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();

  const handleSignOut = useCallback(() => {
    endCurrentSession();
    localStorage.removeItem("atlas_operator");
    toast.info("Signed out — redirecting to landing");
    setTimeout(() => navigate("/"), 600);
  }, [navigate]);

  return (
    <>
      <header className="h-14 border-b border-border bg-background/80 backdrop-blur-sm flex items-center justify-between px-6 sticky top-0 z-30">
        <div className="flex flex-col">
          <h1 className="text-sm font-semibold tracking-tight text-foreground leading-tight">{title}</h1>
          {subtitle && (
            <p className="text-[11px] text-muted-foreground font-mono tracking-wide">{subtitle}</p>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* Search */}
          <button
            onClick={() => setCmdOpen(true)}
            className="flex items-center gap-2 h-8 px-3 rounded-md bg-secondary/50 text-muted-foreground text-xs hover:bg-secondary transition-colors"
          >
            <Search className="size-3.5" />
            <span className="hidden sm:inline">Search</span>
            <kbd className="hidden sm:inline text-[10px] font-mono bg-background/50 px-1.5 py-0.5 rounded border border-border">
              /
            </kbd>
          </button>

          {/* Notifications */}
          <button
            onClick={() => setNotifOpen(true)}
            className="relative flex items-center justify-center size-8 rounded-md hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
          >
            <Bell className="size-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 size-2 rounded-full bg-red-500" />
            )}
          </button>

          {/* User Avatar Dropdown */}
          <div className="flex items-center gap-2 pl-3 border-l border-border">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                  <Avatar className="size-7">
                    <AvatarFallback className="bg-primary/20 text-primary text-[10px] font-semibold">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="hidden sm:flex flex-col text-left">
                    <span className="text-xs font-medium text-foreground leading-tight">{operatorName}</span>
                    <span className="text-[10px] text-muted-foreground font-mono">ops@atlas.vc</span>
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => navigate("/profile")}>
                  <User className="size-4 mr-2" />
                  Profile
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/settings")}>
                  <Settings className="size-4 mr-2" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="text-red-400 focus:text-red-400">
                  <LogOut className="size-4 mr-2" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Panels */}
      <NotificationPanel
        open={notifOpen}
        onOpenChange={setNotifOpen}
        notifications={notifications}
        setNotifications={setNotifications}
      />
      <CommandPalette open={cmdOpen} onOpenChange={setCmdOpen} />
    </>
  );
}
