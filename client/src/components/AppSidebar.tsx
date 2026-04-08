// ============================================================================
// AppSidebar — CRM-focused navigation
// ATLAS admin: clean command center nav for managing 30+ clients
// Client users: scoped portal with their own nav
// Mobile: slide-out drawer from hamburger | Desktop: collapsible left rail
// ============================================================================

import { cn } from "@/lib/utils";
import { useAuth } from "@/_core/hooks/useAuth";
import { isAtlasTeam } from "@/lib/atlas";
import { usePreviewMode } from "@/contexts/PreviewMode";
import { useWorkspace } from "@/contexts/WorkspaceContext";
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
  User,
  Plus,
  Loader2,
  Settings,
  Shield,
  Cpu,
  FileText,
  UserPlus,
  Eye,
  Menu,
  LogOut,
} from "lucide-react";
import { useLocation, Link } from "wouter";
import { useState, useMemo, useEffect } from "react";
import { toast } from "sonner";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { AnimatePresence, motion } from "framer-motion";

const ATLAS_LOGO_URL = "https://d2xsxph8kpxj0f.cloudfront.net/310519663421947072/TYkqBQavc4Sd5YvF3sSZqT/atlas-logo-G2SBqxAK64sZYAYmAZY9js.webp";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  atlasOnly?: boolean;
  clientOnly?: boolean;
  group?: string;
}

// ── Admin nav: organized top-to-bottom by workflow ─────────────────────
const ALL_NAV_ITEMS: NavItem[] = [
  // ─ Command ─
  { label: "Dashboard", href: "/dashboard", icon: <LayoutDashboard className="size-5" />, group: "Command" },
  { label: "Activity", href: "/activity", icon: <Activity className="size-5" />, group: "Command" },
  { label: "Oversight", href: "/oversight", icon: <Eye className="size-5" />, atlasOnly: true, group: "Command" },
  // ─ Intelligence ─
  { label: "AI Concierge", href: "/agent", icon: <Bot className="size-5" />, atlasOnly: true, group: "Intelligence" },
  { label: "AI Agents", href: "/agents", icon: <Cpu className="size-5" />, atlasOnly: true, group: "Intelligence" },
  { label: "Blueprints", href: "/blueprints", icon: <Layers3 className="size-5" />, atlasOnly: true, group: "Intelligence" },
  // ─ People ─
  { label: "ATLAS Team", href: "/atlas-team", icon: <Shield className="size-5" />, atlasOnly: true, group: "People" },
  { label: "Client Contacts", href: "/team", icon: <Users className="size-5" />, atlasOnly: true, group: "People" },
  { label: "Onboard Client", href: "/onboarding", icon: <UserPlus className="size-5" />, atlasOnly: true, group: "People" },
  // ─ Operations ─
  { label: "Drafts", href: "/drafts", icon: <FileText className="size-5" />, group: "Operations" },
  { label: "Settings", href: "/settings", icon: <Settings className="size-5" />, atlasOnly: true, group: "Operations" },
  // ─ Client-only nav items ─
  { label: "Ventures", href: "/ventures", icon: <Layers3 className="size-5" />, clientOnly: true, group: "Portfolio" },
  { label: "SPVs & Deals", href: "/spvs", icon: <Briefcase className="size-5" />, clientOnly: true, group: "Portfolio" },
  { label: "Tasks", href: "/tasks", icon: <ListChecks className="size-5" />, clientOnly: true, group: "Portfolio" },
  { label: "Distributions", href: "/distributions", icon: <DollarSign className="size-5" />, clientOnly: true, group: "Portfolio" },
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

  // In preview mode, treat admin/owner as client
  const isAtlas = isPreviewMode ? false : isAtlasTeam(user);

  // Filter nav items based on role
  const navItems = useMemo(() => {
    return ALL_NAV_ITEMS.filter((item) => {
      if (item.atlasOnly && !isAtlas) return false;
      if (item.clientOnly && isAtlas) return false;
      return true;
    });
  }, [isAtlas]);

  // Group nav items for mobile drawer
  const navGroups = useMemo(() => {
    const groups: { label: string; items: NavItem[] }[] = [];
    const seen = new Set<string>();
    for (const item of navItems) {
      const g = item.group || "Other";
      if (!seen.has(g)) {
        seen.add(g);
        groups.push({ label: g, items: [] });
      }
      groups.find(gr => gr.label === g)!.items.push(item);
    }
    return groups;
  }, [navItems]);

  // Active check
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
      localStorage.removeItem("atlas_operator");
      await logout();
    } catch {}
    toast.info("Signed out");
  };

  return (
    <>
      {/* ── Mobile Hamburger Button (fixed top-left) ──────────────────── */}
      <button
        onClick={() => setMobileOpen(true)}
        className="md:hidden fixed top-3 left-3 z-40 flex items-center justify-center size-11 rounded-xl border border-border text-foreground shadow-lg active:scale-95 transition-transform"
        style={{ backgroundColor: 'var(--card)' }}
        aria-label="Open navigation"
      >
        <Menu className="size-5" />
      </button>

      {/* ── Desktop Sidebar ──────────────────────────────────────────── */}
      <aside
        className={cn(
          "hidden md:flex flex-col h-screen bg-card border-r border-border transition-all duration-300 ease-in-out flex-shrink-0 z-30",
          expanded ? "w-[220px]" : "w-[68px]"
        )}
      >
        {/* Logo */}
        <div className={cn(
          "flex items-center h-14 border-b border-border px-3 flex-shrink-0",
          expanded ? "justify-between" : "justify-center"
        )}>
          <Link href="/dashboard" className="flex items-center gap-2.5 min-w-0">
            <img
              src={ATLAS_LOGO_URL}
              alt="ATLAS"
              className="size-8 rounded-lg object-cover flex-shrink-0"
            />
            {expanded && (
              <div className="flex flex-col min-w-0">
                <span className="text-[13px] font-semibold text-foreground tracking-wide truncate">ATLAS</span>
                <span className="text-[9px] text-muted-foreground font-mono tracking-widest uppercase truncate">by Aurovia</span>
              </div>
            )}
          </Link>
          {expanded && (
            <button
              onClick={() => setExpanded(false)}
              className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors flex-shrink-0"
            >
              <ChevronLeft className="size-4" />
            </button>
          )}
        </div>

        {/* Nav items */}
        <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
          {navItems.map((item) => {
            const active = isActive(item.href);
            return expanded ? (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-all",
                  active
                    ? "text-foreground border-l-2 border-foreground bg-transparent"
                    : "text-muted-foreground/50 hover:text-muted-foreground/80 hover:bg-transparent border-l-2 border-transparent"
                )}
              >
                <span className="flex-shrink-0">{item.icon}</span>
                <span className="truncate">{item.label}</span>
              </Link>
            ) : (
              <Tooltip key={item.href} delayDuration={0}>
                <TooltipTrigger asChild>
                  <Link
                    href={item.href}
                    className={cn(
                      "flex items-center justify-center p-2.5 rounded-lg transition-all",
                      active
                        ? "text-foreground border-l-2 border-foreground bg-transparent"
                        : "text-muted-foreground/35 hover:text-muted-foreground/70 hover:bg-transparent border-l-2 border-transparent"
                    )}
                  >
                    {item.icon}
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right" className="text-xs">
                  {item.label}
                </TooltipContent>
              </Tooltip>
            );
          })}
        </nav>

        {/* Quick client list — admin only */}
        {isAtlas && expanded && (
          <div className="px-2 pb-2 border-t border-border pt-2">
            <div className="flex items-center justify-between px-2 mb-1.5">
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

            <div className="space-y-0.5 max-h-[180px] overflow-y-auto">
              {organizations.filter(o => o.status === "active").slice(0, 10).map((org) => {
                const active = location === `/clients/${org.slug}`;
                return (
                  <Link
                    key={org.id}
                    href={`/clients/${org.slug}`}
                    className={cn(
                      "flex items-center gap-2 px-2 py-1.5 rounded-md text-[12px] transition-colors",
                      active
                        ? "text-foreground border-l-2 border-foreground bg-transparent"
                        : "text-muted-foreground/50 hover:text-muted-foreground/80 hover:bg-transparent border-l-2 border-transparent"
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

        {/* Expand button + user */}
        <div className="border-t border-border p-2 flex-shrink-0">
          {!expanded ? (
            <div className="space-y-1">
              <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => setExpanded(true)}
                    className="flex items-center justify-center p-2.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors w-full"
                  >
                    <ChevronRight className="size-5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right" className="text-xs">Expand sidebar</TooltipContent>
              </Tooltip>
              <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                  <Link
                    href="/profile"
                    className="flex items-center justify-center p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
                  >
                    <div className="size-7 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-[10px] font-semibold text-primary">
                        {user?.name?.split(" ").map(w => w[0]).join("").slice(0, 2) || "?"}
                      </span>
                    </div>
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right" className="text-xs">{user?.name || "Profile"}</TooltipContent>
              </Tooltip>
            </div>
          ) : (
            <Link
              href="/profile"
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
            >
              <div className="size-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <span className="text-[10px] font-semibold text-primary">
                  {user?.name?.split(" ").map(w => w[0]).join("").slice(0, 2) || "?"}
                </span>
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
              transition={{ duration: 0.2 }}
              className="md:hidden fixed inset-0 bg-black/50 z-50"
              onClick={() => setMobileOpen(false)}
            />

            {/* Drawer */}
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 280 }}
              className="md:hidden fixed inset-y-0 left-0 z-50 w-[300px] border-r border-border flex flex-col"
              style={{ backgroundColor: 'var(--card)' }}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-5 border-b border-border">
                <Link href="/dashboard" onClick={() => setMobileOpen(false)} className="flex items-center gap-3">
                  <img
                    src={ATLAS_LOGO_URL}
                    alt="ATLAS"
                    className="size-10 rounded-xl object-cover"
                  />
                  <div className="flex flex-col">
                    <span className="text-base font-semibold text-foreground tracking-wide">ATLAS</span>
                    <span className="text-[10px] text-muted-foreground font-mono tracking-widest uppercase">by Aurovia</span>
                  </div>
                </Link>
                <button
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center justify-center size-10 rounded-xl text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
                >
                  <X className="size-5" />
                </button>
              </div>

              {/* Nav groups */}
              <nav className="flex-1 overflow-y-auto py-4 px-3">
                {navGroups.map((group, gi) => (
                  <div key={group.label} className={cn(gi > 0 && "mt-5")}>
                    <span className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-[0.12em] px-3 mb-2 block">
                      {group.label}
                    </span>
                    <div className="space-y-1">
                      {group.items.map((item) => {
                        const active = isActive(item.href);
                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                              "flex items-center gap-4 px-4 py-3.5 rounded-xl text-[15px] font-medium transition-all",
                              active
                                ? "text-foreground bg-primary/10 border-l-[3px] border-primary"
                                : "text-muted-foreground hover:text-foreground hover:bg-accent/30 border-l-[3px] border-transparent"
                            )}
                          >
                            <span className={cn(
                              "flex-shrink-0 transition-colors",
                              active ? "text-primary" : ""
                            )}>
                              {item.icon}
                            </span>
                            <span>{item.label}</span>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </nav>

              {/* User section at bottom */}
              <div className="border-t border-border p-4 space-y-3">
                <Link
                  href="/profile"
                  className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-accent/30 transition-colors"
                >
                  <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-semibold text-primary">
                      {user?.name?.split(" ").map(w => w[0]).join("").slice(0, 2) || "?"}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <span className="text-sm font-medium text-foreground block truncate">{user?.name || "User"}</span>
                    <span className="text-xs text-muted-foreground block truncate">{user?.email}</span>
                  </div>
                </Link>
                <button
                  onClick={handleSignOut}
                  className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-medium text-red-400 hover:bg-red-500/10 transition-colors"
                >
                  <LogOut className="size-5" />
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
