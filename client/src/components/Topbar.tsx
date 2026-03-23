import { cn } from "@/lib/utils";
import { useAuth } from "@/_core/hooks/useAuth";
import { Bell, Search, User, Settings, LogOut, Building2 } from "lucide-react";
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

function isAtlasRole(role?: string): boolean {
  return role === "owner" || role === "admin";
}

export default function Topbar({ title, subtitle }: TopbarProps) {
  const { unreadCount } = useNotifications();
  const [notifOpen, setNotifOpen] = useState(false);
  const [cmdOpen, setCmdOpen] = useState(false);
  const [, navigate] = useLocation();
  const { user, logout } = useAuth();

  const isAtlas = isAtlasRole(user?.role);

  const displayName = useMemo(() => {
    if (user?.name) return user.name;
    try { return localStorage.getItem("atlas_operator") || "User"; } catch { return "User"; }
  }, [user?.name]);

  const initials = displayName.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();

  const roleLabel = useMemo(() => {
    if (!user?.role) return "";
    if (user.role === "owner") return "Owner";
    if (user.role === "admin") return "ATLAS Admin";
    return user.role.charAt(0).toUpperCase() + user.role.slice(1);
  }, [user?.role]);

  const handleSignOut = useCallback(async () => {
    endCurrentSession();
    localStorage.removeItem("atlas_operator");
    try {
      await logout();
    } catch {}
    toast.info("Signed out — redirecting to landing");
    setTimeout(() => navigate("/"), 600);
  }, [navigate, logout]);

  return (
    <>
      <header className="h-14 border-b border-border bg-background/80 backdrop-blur-sm flex items-center justify-between px-3 sm:px-6 sticky top-0 z-30">
        {/* Left: Title */}
        <div className="flex flex-col min-w-0">
          <h1 className="text-sm sm:text-base font-semibold tracking-tight text-foreground leading-tight truncate">{title}</h1>
          {subtitle && (
            <p className="text-[10px] sm:text-[11px] text-muted-foreground font-mono tracking-wide truncate">{subtitle}</p>
          )}
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1.5 sm:gap-3 flex-shrink-0">
          {/* Search — icon only on mobile, expanded on desktop */}
          <button
            onClick={() => setCmdOpen(true)}
            className="flex items-center justify-center gap-2 min-h-[44px] min-w-[44px] sm:h-9 sm:min-w-0 sm:px-3 rounded-lg sm:bg-secondary/50 text-muted-foreground text-xs hover:bg-secondary transition-colors"
          >
            <Search className="size-4 sm:size-3.5" />
            <span className="hidden sm:inline">Search</span>
            <kbd className="hidden lg:inline text-[10px] font-mono bg-background/50 px-1.5 py-0.5 rounded border border-border">
              /
            </kbd>
          </button>

          {/* Notifications */}
          <button
            onClick={() => setNotifOpen(true)}
            className="relative flex items-center justify-center min-h-[44px] min-w-[44px] rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
          >
            <Bell className="size-4" />
            {unreadCount > 0 && (
              <span className="absolute top-2 right-2 size-2.5 rounded-full bg-red-500 ring-2 ring-background" />
            )}
          </button>

          {/* User Avatar Dropdown */}
          <div className="flex items-center gap-2 pl-1.5 sm:pl-3 border-l border-border">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 hover:opacity-80 transition-opacity min-h-[44px]">
                  <Avatar className="size-8">
                    <AvatarFallback className={cn(
                      "text-[11px] font-semibold",
                      isAtlas ? "bg-primary/20 text-primary" : "bg-emerald-500/20 text-emerald-400"
                    )}>
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="hidden sm:flex flex-col text-left">
                    <span className="text-xs font-medium text-foreground leading-tight">{displayName}</span>
                    <span className="text-[10px] text-muted-foreground font-mono">
                      {roleLabel}
                    </span>
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <div className="px-2 py-1.5 sm:hidden">
                  <p className="text-xs font-medium text-foreground">{displayName}</p>
                  <p className="text-[10px] text-muted-foreground">{roleLabel}</p>
                </div>
                <DropdownMenuSeparator className="sm:hidden" />
                <DropdownMenuItem onClick={() => navigate("/profile")} className="min-h-[44px]">
                  <User className="size-4 mr-2" />
                  Profile
                </DropdownMenuItem>
                {isAtlas && (
                  <DropdownMenuItem onClick={() => navigate("/settings")} className="min-h-[44px]">
                    <Settings className="size-4 mr-2" />
                    Settings
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="text-red-400 focus:text-red-400 min-h-[44px]">
                  <LogOut className="size-4 mr-2" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Panels */}
      <NotificationPanel open={notifOpen} onOpenChange={setNotifOpen} />
      <CommandPalette open={cmdOpen} onOpenChange={setCmdOpen} />
    </>
  );
}
