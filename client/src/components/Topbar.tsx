import { cn } from "@/lib/utils";
import { useAuth } from "@/_core/hooks/useAuth";
import { isVentexTeam } from "@/lib/ventex";
import { usePreviewMode } from "@/contexts/PreviewMode";
import { useAgents } from "@/contexts/AgentContext";
import { Bell, Search, User, Settings, LogOut, Eye, EyeOff, X, Building2 } from "lucide-react";
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
import ClientSwitcher from "@/components/ClientSwitcher";
import { useState, useCallback, useMemo } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { endCurrentSession } from "@/lib/operatorSession";
import { hardLogout } from "@/lib/hardLogout";

interface TopbarProps {
  title: string;
  subtitle?: string;
}


export default function Topbar({ title, subtitle }: TopbarProps) {
  const { unreadCount } = useNotifications();
  const [notifOpen, setNotifOpen] = useState(false);
  const [cmdOpen, setCmdOpen] = useState(false);
  const [clientSwitcherOpen, setClientSwitcherOpen] = useState(false);
  const [, navigate] = useLocation();
  const { user, logout } = useAuth();
  const { isPreviewMode, togglePreview, exitPreview } = usePreviewMode();

  // Agent context for severity-based bell badge
  let criticalUnread = 0;
  let warningUnread = 0;
  try {
    const agents = useAgents();
    criticalUnread = agents.criticalUnread;
    warningUnread = agents.warningUnread;
  } catch {
    // AgentProvider may not be mounted yet
  }

  const isReallyVentex = isVentexTeam(user);
  const isVentex = isPreviewMode ? false : isReallyVentex;

  const displayName = useMemo(() => {
    if (isPreviewMode) return "Client Preview";
    if (user?.name) return user.name;
    try { return localStorage.getItem("ventex_operator") || "User"; } catch { return "User"; }
  }, [user?.name, isPreviewMode]);

  const initials = displayName.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();

  const roleLabel = useMemo(() => {
    if (isPreviewMode) return "Viewing as Client";
    if (!user?.role) return "";
    if (user.role === "owner") return "Platform Admin";
    if (user.role === "admin") return "VENTEX Operator";
    if (user.role === "partner") return "Partner";
    return user.role.charAt(0).toUpperCase() + user.role.slice(1);
  }, [user?.role, isPreviewMode]);

  const handleSignOut = useCallback(() => {
    endCurrentSession();
    hardLogout("/");
  }, []);

  const handleTogglePreview = useCallback(() => {
    if (isPreviewMode) {
      exitPreview();
      toast.info("Exited client preview — back to VENTEX admin view");
    } else {
      togglePreview();
      toast.info("Entered client preview — viewing as a client would see it");
      navigate("/dashboard");
    }
  }, [isPreviewMode, togglePreview, exitPreview, navigate]);

  // Severity-based bell badge
  const totalBadge = unreadCount + criticalUnread;
  const bellBadgeColor = criticalUnread > 0
    ? "bg-red-500 animate-pulse"
    : warningUnread > 0
      ? "bg-amber-500"
      : totalBadge > 0
        ? "bg-primary"
        : "";

  return (
    <>
      {/* CL-FIX 13 — Preview mode banner: dark bg, amber bottom border */}
      {isPreviewMode && (
        <div className="px-4 py-2 flex items-center justify-between z-40 relative" style={{ background: 'rgba(0,0,0,0.85)', borderBottom: '1px solid #f59e0b' }}>
          <div className="flex items-center gap-2">
            <Eye className="size-4 text-amber-400" />
            <span className="text-[13px] font-medium text-amber-400">
              CLIENT PREVIEW MODE
            </span>
            <span className="text-[13px] text-white/60 hidden sm:inline">
              — You are viewing the app as a client would see it
            </span>
          </div>
          <button
            onClick={handleTogglePreview}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-medium text-white transition-colors min-h-[32px] hover:bg-white/10" style={{ border: '1px solid rgba(255,255,255,0.4)', borderRadius: '6px', background: 'transparent' }}
          >
            <X className="size-3" />
            <span className="hidden sm:inline">Exit Preview</span>
          </button>
        </div>
      )}

      <header className="h-16 border-b border-border flex items-center justify-between pl-12 pr-4 md:pl-6 md:pr-6 sticky top-0 z-30" style={{ backgroundColor: 'var(--background)' }}>
        {/* Left: Title + subtitle */}
        <div className="flex flex-col justify-center min-w-0">
          <h1 className="text-[16px] font-medium text-foreground leading-tight truncate" style={{ letterSpacing: '0.03em' }}>{title}</h1>
          {subtitle && (
            <p className="text-[10px] font-normal uppercase tracking-[0.12em] text-muted-foreground leading-tight truncate">{subtitle}</p>
          )}
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 sm:gap-3.5 flex-shrink-0">
          {/* Client Switcher — only visible to real VENTEX team */}
          {isReallyVentex && !isPreviewMode && (
            <button
              onClick={() => setClientSwitcherOpen(true)}
              className="flex items-center justify-center gap-1.5 min-h-[44px] min-w-[44px] sm:h-9 sm:min-w-0 sm:px-3 rounded-lg sm:bg-secondary/50 text-muted-foreground text-xs hover:bg-secondary hover:text-foreground transition-colors"
              title="Switch client context"
            >
              <Building2 className="size-4" />
              <span className="hidden sm:inline">Clients</span>
            </button>
          )}

          {/* Preview toggle — only visible to real VENTEX team */}
          {isReallyVentex && (
            <button
              onClick={handleTogglePreview}
              className={cn(
                "flex items-center justify-center gap-1.5 min-h-[44px] min-w-[44px] sm:h-9 sm:min-w-0 sm:px-3 rounded-lg text-xs transition-colors",
                isPreviewMode
                  ? "bg-amber-500/20 text-amber-400 hover:bg-amber-500/30"
                  : "sm:bg-secondary/50 text-muted-foreground hover:bg-secondary hover:text-foreground"
              )}
              title={isPreviewMode ? "Exit client preview" : "Preview as client"}
            >
              {isPreviewMode ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              <span className="hidden sm:inline">{isPreviewMode ? "Exit" : "Preview"}</span>
            </button>
          )}



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

          {/* Notifications — severity-based badge */}
          <button
            onClick={() => setNotifOpen(true)}
            className="relative flex items-center justify-center min-h-[44px] min-w-[44px] rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
          >
            <Bell className="size-4" />
            {totalBadge > 0 && (
              <span key={totalBadge} className={cn(
                "absolute top-2 right-2 size-2.5 rounded-full ring-2 ring-background badge-animate",
                bellBadgeColor
              )} />
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
                      isPreviewMode
                        ? "bg-amber-500/20 text-amber-400"
                        : isVentex
                          ? "bg-primary/20 text-primary"
                          : "bg-emerald-500/20 text-emerald-400"
                    )}>
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="hidden sm:flex flex-col text-left">
                    <span className="text-xs font-medium text-foreground leading-tight">{displayName}</span>
                    <span className={cn(
                      "text-[10px] font-mono",
                      isPreviewMode ? "text-amber-400" : "text-muted-foreground"
                    )}>
                      {roleLabel}
                    </span>
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <div className="px-2 py-1.5 sm:hidden">
                  <p className="text-xs font-medium text-foreground">{displayName}</p>
                  <p className={cn("text-[10px]", isPreviewMode ? "text-amber-400" : "text-muted-foreground")}>{roleLabel}</p>
                </div>
                <DropdownMenuSeparator className="sm:hidden" />
                <DropdownMenuItem onClick={() => navigate("/profile")} className="min-h-[44px]">
                  <User className="size-4 mr-2" />
                  Profile
                </DropdownMenuItem>
                {isVentex && (
                  <DropdownMenuItem onClick={() => navigate("/settings")} className="min-h-[44px]">
                    <Settings className="size-4 mr-2" />
                    Settings
                  </DropdownMenuItem>
                )}
                {isReallyVentex && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleTogglePreview} className="min-h-[44px]">
                      {isPreviewMode ? (
                        <>
                          <EyeOff className="size-4 mr-2 text-amber-400" />
                          <span className="text-amber-400">Exit Preview</span>
                        </>
                      ) : (
                        <>
                          <Eye className="size-4 mr-2" />
                          Preview as Client
                        </>
                      )}
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuSeparator />
                <a
                  href="/sign-out"
                  className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm text-red-400 hover:bg-accent hover:text-red-400 min-h-[44px] outline-none no-underline"
                >
                  <LogOut className="size-4 mr-2" />
                  Sign out
                </a>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Panels */}
      <NotificationPanel open={notifOpen} onOpenChange={setNotifOpen} />
      <CommandPalette open={cmdOpen} onOpenChange={setCmdOpen} />
      <ClientSwitcher open={clientSwitcherOpen} onOpenChange={setClientSwitcherOpen} />
    </>
  );
}
