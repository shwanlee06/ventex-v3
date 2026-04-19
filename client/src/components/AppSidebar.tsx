// AppSidebar — Clean, minimal navigation
// Desktop: slim collapsible rail | Mobile: clean slide-out from topbar

import { cn } from "@/lib/utils";
import { useAuth } from "@/_core/hooks/useAuth";
import { isVentexTeam, isPartner } from "@/lib/ventex";
import { usePreviewMode } from "@/contexts/PreviewMode";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useAgents } from "@/contexts/AgentContext";
import { trpc } from "@/lib/trpc";
import {
  LayoutDashboard,
  Bot,
  Layers3,
  Briefcase,
  ChevronLeft,
  ChevronRight,
  Users,
  DollarSign,
  ListChecks,
  Activity,
  X,
  Building2,
  Plus,
  Loader2,
  Settings,
  Shield,
  Cpu,
  FileText,
  Gauge,
  UserPlus,
  Eye,
  Menu,
  LogOut,
  Mail,
} from "lucide-react";
import { useLocation, Link } from "wouter";
import { useState, useMemo, useEffect } from "react";
import { toast } from "sonner";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { AnimatePresence, motion } from "framer-motion";

const VENTEX_LOGO_URL = "https://d2xsxph8kpxj0f.cloudfront.net/310519663421947072/TYkqBQavc4Sd5YvF3sSZqT/ventex-logo-mark_1f534165.png";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  ventexOnly?: boolean;
  clientOnly?: boolean;
  partnerOnly?: boolean;
  partnerVisible?: boolean;
  group?: string; // group label for sidebar sections
  badgeKey?: string; // key for dynamic badge count
}

const ALL_NAV_ITEMS: NavItem[] = [
  // Operations
  { label: "Dashboard", href: "/dashboard", icon: <LayoutDashboard className="size-[18px]" />, group: "Operations" },
  { label: "Activity", href: "/activity", icon: <Activity className="size-[18px]" />, group: "Operations" },
  { label: "Oversight", href: "/oversight", icon: <Eye className="size-[18px]" />, ventexOnly: true, group: "Operations" },

  // Intelligence
  { label: "AI Concierge", href: "/agent", icon: <Bot className="size-[18px]" />, ventexOnly: true, group: "Intelligence" },
  { label: "AI Agents", href: "/agents", icon: <Cpu className="size-[18px]" />, ventexOnly: true, group: "Intelligence" },
  { label: "Blueprints", href: "/blueprints", icon: <Layers3 className="size-[18px]" />, ventexOnly: true, group: "Intelligence" },
  { label: "Diagnostics", href: "/diagnostics", icon: <Gauge className="size-[18px]" />, ventexOnly: true, group: "Intelligence" },
  // Admin
  { label: "VENTEX Team", href: "/ventex-team", icon: <Shield className="size-[18px]" />, ventexOnly: true, group: "Admin" },
  { label: "Client Contacts", href: "/team", icon: <Users className="size-[18px]" />, ventexOnly: true, group: "Admin" },
  { label: "Onboard Client", href: "/onboarding", icon: <UserPlus className="size-[18px]" />, ventexOnly: true, group: "Admin" },
  { label: "Settings", href: "/settings", icon: <Settings className="size-[18px]" />, ventexOnly: true, group: "Admin" },
  // Partner-only
  { label: "My Portfolio", href: "/partner", icon: <Briefcase className="size-[18px]" />, partnerOnly: true },
  { label: "Ventures", href: "/ventures", icon: <Layers3 className="size-[18px]" />, partnerOnly: true },
  { label: "Tasks", href: "/tasks", icon: <ListChecks className="size-[18px]" />, partnerOnly: true },
  { label: "Distributions", href: "/distributions", icon: <DollarSign className="size-[18px]" />, partnerOnly: true },
  // Client-only
  { label: "Ventures", href: "/ventures", icon: <Layers3 className="size-[18px]" />, clientOnly: true },
  { label: "Draft Center", href: "/drafts", icon: <Mail className="size-[18px]" />, clientOnly: true, badgeKey: "pendingDrafts" },
  { label: "SPVs & Deals", href: "/spvs", icon: <Briefcase className="size-[18px]" />, clientOnly: true },
  { label: "Tasks", href: "/tasks", icon: <ListChecks className="size-[18px]" />, clientOnly: true },
  { label: "Distributions", href: "/distributions", icon: <DollarSign className="size-[18px]" />, clientOnly: true },
];

export default function AppSidebar() {
  const [location] = useLocation();
  const [expanded, setExpanded] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, logout } = useAuth();
  const { isPreviewMode } = usePreviewMode();
  const { organizations, refetchOrgs } = useWorkspace();
  const [showAddClient, setShowAddClient] = useState(false);
  const [newClientName, setNewClientName] = useState("");
  const [addingClient, setAddingClient] = useState(false);

  // Draft badge count for client sidebar
  const agentCtx = useAgents();
  const pendingDraftCount = agentCtx?.pendingDraftCount ?? 0;

  const badgeCounts: Record<string, number> = {
    pendingDrafts: pendingDraftCount,
  };

  const createOrg = trpc.organizations.create.useMutation({
    onSuccess: (created) => {
      toast.success(`Client "${created.name}" created`);
      setNewClientName("");
      setShowAddClient(false);
      setAddingClient(false);
      refetchOrgs();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to create client");
      setAddingClient(false);
    },
  });

  const handleAddClient = () => {
    const name = newClientName.trim();
    if (!name) return;
    setAddingClient(true);
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    createOrg.mutate({ name, slug });
  };

  const isVentex = isPreviewMode ? false : isVentexTeam(user);
  const isPartnerUser = isPreviewMode ? false : isPartner(user);

  const navItems = useMemo(() => {
    return ALL_NAV_ITEMS.filter((item) => {
      if (item.partnerOnly) return isPartnerUser;
      if (item.ventexOnly && !isVentex) return false;
      if (item.clientOnly && (isVentex || isPartnerUser)) return false;
      return true;
    });
  }, [isVentex, isPartnerUser]);

  const isActive = (href: string) => {
    if (href === "/dashboard") return location === "/dashboard" || location.startsWith("/clients/");
    return location === href || location.startsWith(href + "/");
  };

  // Close mobile drawer on navigation
  useEffect(() => {
    setMobileOpen(false);
  }, [location]);

  // Lock body scroll when mobile drawer is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  const handleSignOut = async () => {
    try {
      localStorage.removeItem("ventex_operator");
      await logout();
    } catch {}
    toast.info("Signed out");
  };

  const initials = user?.name?.split(" ").map(w => w[0]).join("").slice(0, 2) || "?";

  return (
    <>
      {/* ── Mobile Hamburger — embedded in topbar area ──────────────── */}
      <button
        onClick={() => setMobileOpen(true)}
        className="md:hidden fixed top-3.5 left-3.5 z-40 flex items-center justify-center size-9 rounded-lg text-muted-foreground hover:text-foreground transition-colors"
        aria-label="Open navigation"
      >
        <Menu className="size-5" />
      </button>

      {/* ── Desktop Sidebar ──────────────────────────────────────────── */}
      <aside
        className={cn(
          "hidden md:flex flex-col h-screen border-r border-border transition-all duration-200 ease-out flex-shrink-0 z-30",
          expanded ? "w-[220px]" : "w-[60px]"
        )}
        style={{ backgroundColor: 'var(--background)' }}
      >
        {/* Logo */}
        <div className={cn(
          "flex items-center h-14 border-b border-border flex-shrink-0",
          expanded ? "px-4 justify-between" : "justify-center"
        )}>
          <Link href="/dashboard" className="flex items-center gap-2.5 min-w-0">
            <img
              src={VENTEX_LOGO_URL}
              alt="VENTEX"
              className="size-7 rounded-md object-cover flex-shrink-0"
            />
            {expanded && (
              <span className="text-[14px] font-medium text-foreground" style={{ letterSpacing: '0.08em' }}>VENTEX</span>
            )}
          </Link>
          {expanded && (
            <button
              onClick={() => setExpanded(false)}
              className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronLeft className="size-4" />
            </button>
          )}
        </div>

        {/* Nav — grouped by section */}
        <nav className="flex-1 py-3 px-2 overflow-y-auto">
          {(() => {
            let lastGroup = "";
            return navItems.map((item) => {
              const active = isActive(item.href);
              const showGroupLabel = expanded && isVentex && item.group && item.group !== lastGroup;
              if (item.group) lastGroup = item.group;
              return (
                <div key={item.href}>
                  {showGroupLabel && (
                    <div className={cn(
                      "px-3 pt-5 pb-1.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/50",
                      item.group === "Operations" && "pt-1"
                    )}>
                      {item.group}
                    </div>
                  )}
                  {expanded ? (
                    <Link
                      href={item.href}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2.5 rounded-md text-[13px] transition-colors",
                        active
                          ? "text-foreground bg-accent/60 font-medium"
                          : "text-muted-foreground hover:text-foreground hover:bg-accent/30"
                      )}
                    >
                      <span className="flex-shrink-0">{item.icon}</span>
                      <span className="truncate flex-1">{item.label}</span>
                      {item.badgeKey && badgeCounts[item.badgeKey] > 0 && (
                        <span className="ml-auto flex-shrink-0 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-amber-500/20 text-amber-400 text-[10px] font-mono font-semibold px-1">
                          {badgeCounts[item.badgeKey]}
                        </span>
                      )}
                    </Link>
                  ) : (
                    <Tooltip delayDuration={0}>
                      <TooltipTrigger asChild>
                        <Link
                          href={item.href}
                          className={cn(
                            "flex items-center justify-center p-2.5 rounded-md transition-colors relative",
                            active
                              ? "text-foreground bg-accent/60"
                              : "text-muted-foreground hover:text-foreground hover:bg-accent/30"
                          )}
                        >
                          {item.icon}
                          {item.badgeKey && badgeCounts[item.badgeKey] > 0 && (
                            <span className="absolute -top-0.5 -right-0.5 min-w-[14px] h-[14px] flex items-center justify-center rounded-full bg-amber-500 text-[8px] font-bold text-black px-0.5">
                              {badgeCounts[item.badgeKey]}
                            </span>
                          )}
                        </Link>
                      </TooltipTrigger>
                      <TooltipContent side="right" className="text-xs">
                        {item.label}
                      </TooltipContent>
                    </Tooltip>
                  )}
                </div>
              );
            });
          })()}
        </nav>

        {/* Client list — admin expanded only */}
        {isVentex && expanded && (
          <div className="px-2 pb-2 border-t border-border pt-2">
            <div className="flex items-center justify-between px-2 mb-1">
              <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Clients</span>
              <button
                onClick={() => setShowAddClient(!showAddClient)}
                className="p-0.5 rounded text-muted-foreground hover:text-foreground transition-colors"
              >
                <Plus className="size-3.5" />
              </button>
            </div>

            {showAddClient && (
              <div className="px-1 mb-2">
                <div className="flex gap-1">
                  <input
                    type="text"
                    placeholder="Client name..."
                    value={newClientName}
                    onChange={(e) => setNewClientName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAddClient()}
                    className="flex-1 h-7 px-2 text-[11px] bg-background border border-border rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/30"
                    autoFocus
                  />
                  <button
                    onClick={handleAddClient}
                    disabled={addingClient || !newClientName.trim()}
                    className="h-7 px-2 rounded-md bg-primary text-primary-foreground text-[11px] font-medium disabled:opacity-50 hover:bg-primary/90 transition-colors"
                  >
                    {addingClient ? <Loader2 className="size-3 animate-spin" /> : "Add"}
                  </button>
                </div>
              </div>
            )}

            <div className="space-y-0.5 max-h-[160px] overflow-y-auto">
              {organizations.filter(o => o.status === "active").slice(0, 10).map((org) => {
                const active = location === `/clients/${org.slug}`;
                return (
                  <Link
                    key={org.id}
                    href={`/clients/${org.slug}`}
                    className={cn(
                      "flex items-center gap-2 px-2 py-1.5 rounded-md text-[12px] transition-colors",
                      active
                        ? "text-foreground bg-accent/60"
                        : "text-muted-foreground hover:text-foreground hover:bg-accent/30"
                    )}
                  >
                    <Building2 className="size-3.5 flex-shrink-0" />
                    <span className="truncate">{org.name}</span>
                  </Link>
                );
              })}
              {organizations.filter(o => o.status === "active").length > 10 && (
                <Link
                  href="/dashboard"
                  className="flex items-center gap-2 px-2 py-1.5 rounded-md text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                >
                  View all →
                </Link>
              )}
            </div>
          </div>
        )}

        {/* Bottom: expand toggle + user */}
        <div className="border-t border-border p-1.5 flex-shrink-0">
          {!expanded ? (
            <div className="space-y-0.5">
              <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => setExpanded(true)}
                    className="flex items-center justify-center p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent/30 transition-colors w-full"
                  >
                    <ChevronRight className="size-[18px]" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right" className="text-xs">Expand</TooltipContent>
              </Tooltip>
              <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                  <Link
                    href="/profile"
                    className="flex items-center justify-center p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent/30 transition-colors"
                  >
                    <div className="size-6 rounded-full bg-primary/15 flex items-center justify-center">
                      <span className="text-[9px] font-semibold text-primary">{initials}</span>
                    </div>
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right" className="text-xs">{user?.name || "Profile"}</TooltipContent>
              </Tooltip>
            </div>
          ) : (
            <Link
              href="/profile"
              className="flex items-center gap-2.5 px-2.5 py-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent/30 transition-colors"
            >
              <div className="size-6 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0">
                <span className="text-[9px] font-semibold text-primary">{initials}</span>
              </div>
              <div className="min-w-0">
                <span className="text-[12px] font-medium text-foreground block truncate">{user?.name || "User"}</span>
                <span className="text-[10px] text-muted-foreground block truncate">{user?.email}</span>
              </div>
            </Link>
          )}
        </div>
      </aside>

      {/* ── Mobile Slide-Out Drawer ─────────────────────────────────── */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="md:hidden fixed inset-0 z-50"
              style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
              onClick={() => setMobileOpen(false)}
            />

            {/* Drawer */}
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="md:hidden fixed inset-y-0 left-0 z-50 w-[280px] border-r border-border flex flex-col"
              style={{ backgroundColor: 'var(--background)' }}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-4 h-14 border-b border-border flex-shrink-0">
                <Link href="/dashboard" onClick={() => setMobileOpen(false)} className="flex items-center gap-2.5">
                  <img
                    src={VENTEX_LOGO_URL}
                    alt="VENTEX"
                    className="size-7 rounded-md object-cover"
                  />
                  <span className="text-[15px] font-medium text-foreground" style={{ letterSpacing: '0.08em' }}>VENTEX</span>
                </Link>
                <button
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center justify-center size-8 rounded-md text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="size-4" />
                </button>
              </div>

              {/* Nav — grouped by section */}
              <nav className="flex-1 overflow-y-auto py-2 px-2">
                {(() => {
                  let lastGroup = "";
                  return navItems.map((item) => {
                    const active = isActive(item.href);
                    const showGroupLabel = isVentex && item.group && item.group !== lastGroup;
                    if (item.group) lastGroup = item.group;
                    return (
                      <div key={item.href}>
                        {showGroupLabel && (
                          <div className={cn(
                            "px-3 pt-4 pb-1 text-[9px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/50",
                            item.group === "Operations" && "pt-1"
                          )}>
                            {item.group}
                          </div>
                        )}
                        <Link
                          href={item.href}
                          className={cn(
                            "flex items-center gap-3 px-3 py-2.5 rounded-md text-[14px] transition-colors",
                            active
                              ? "text-foreground bg-accent/60 font-medium"
                              : "text-muted-foreground hover:text-foreground hover:bg-accent/30"
                          )}
                        >
                          <span className={cn("flex-shrink-0", active && "text-primary")}>{item.icon}</span>
                          <span>{item.label}</span>
                        </Link>
                      </div>
                    );
                  });
                })()}
              </nav>

              {/* User — minimal */}
              <div className="border-t border-border p-3 flex-shrink-0">
                <Link
                  href="/profile"
                  className="flex items-center gap-2.5 px-2 py-2 rounded-md hover:bg-accent/30 transition-colors"
                >
                  <div className="size-8 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0">
                    <span className="text-[11px] font-semibold text-primary">{initials}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-[13px] font-medium text-foreground block truncate">{user?.name || "User"}</span>
                    <span className="text-[11px] text-muted-foreground block truncate">{user?.email}</span>
                  </div>
                </Link>
                <button
                  onClick={handleSignOut}
                  className="flex items-center gap-2.5 w-full px-3 py-2 mt-1 rounded-md text-[13px] text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors"
                >
                  <LogOut className="size-[18px]" />
                  Sign Out
                </button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
