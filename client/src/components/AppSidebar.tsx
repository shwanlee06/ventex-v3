// ============================================================================
// AppSidebar — CRM-focused navigation
// ATLAS admin: clean command center nav for managing 30+ clients
// Client users: scoped portal with their own nav
// Mobile: bottom tab bar | Desktop: collapsible left rail
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
  MoreHorizontal,
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
} from "lucide-react";
import { useLocation, Link } from "wouter";
import { useState, useMemo } from "react";
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
}

// ── Admin nav: organized top-to-bottom by workflow ─────────────────────
// Grouped: Command → Intelligence → People → Operations → Admin
const ALL_NAV_ITEMS: NavItem[] = [
  // ─ Command ─
  { label: "Dashboard", href: "/dashboard", icon: <LayoutDashboard className="size-5" /> },
  { label: "Activity", href: "/activity", icon: <Activity className="size-5" /> },
  { label: "Oversight", href: "/oversight", icon: <Eye className="size-5" />, atlasOnly: true },
  // ─ Intelligence ─
  { label: "AI Concierge", href: "/agent", icon: <Bot className="size-5" />, atlasOnly: true },
  { label: "AI Agents", href: "/agents", icon: <Cpu className="size-5" />, atlasOnly: true },
  { label: "Blueprints", href: "/blueprints", icon: <Layers3 className="size-5" />, atlasOnly: true },
  // ─ People ─
  { label: "ATLAS Team", href: "/atlas-team", icon: <Shield className="size-5" />, atlasOnly: true },
  { label: "Client Contacts", href: "/team", icon: <Users className="size-5" />, atlasOnly: true },
  { label: "Onboard Client", href: "/onboarding", icon: <UserPlus className="size-5" />, atlasOnly: true },
  // ─ Operations ─
  { label: "Drafts", href: "/drafts", icon: <FileText className="size-5" />, atlasOnly: true },
  { label: "Settings", href: "/settings", icon: <Settings className="size-5" />, atlasOnly: true },
  // ─ Client-only nav items ─
  { label: "Ventures", href: "/ventures", icon: <Layers3 className="size-5" />, clientOnly: true },
  { label: "SPVs & Deals", href: "/spvs", icon: <Briefcase className="size-5" />, clientOnly: true },
  { label: "Tasks", href: "/tasks", icon: <ListChecks className="size-5" />, clientOnly: true },
  { label: "Distributions", href: "/distributions", icon: <DollarSign className="size-5" />, clientOnly: true },
  { label: "My Profile", href: "/profile", icon: <User className="size-5" />, clientOnly: true },
];



export default function AppSidebar() {
  const [location] = useLocation();
  const [expanded, setExpanded] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const { user } = useAuth();
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

  // Mobile: first 5 items in bottom bar, rest in "More" sheet
  const mobilePrimary = navItems.slice(0, 5);
  const mobileSecondary = navItems.slice(5);

  // Active check
  const isActive = (href: string) => {
    if (href === "/dashboard") return location === "/dashboard" || location.startsWith("/clients/");
    return location === href || location.startsWith(href + "/");
  };

  return (
    <>
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

      {/* ── Mobile Bottom Tab Bar ────────────────────────────────────── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-md border-t border-border">
        <div className="flex items-center justify-around h-16 px-1">
          {mobilePrimary.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center gap-0.5 py-1.5 px-2 rounded-lg transition-colors min-w-[56px]",
                  active ? "text-primary" : "text-muted-foreground"
                )}
              >
                <span className={cn("transition-transform", active && "scale-110")}>{item.icon}</span>
                <span className="text-[10px] font-medium">{item.label}</span>
              </Link>
            );
          })}
          {mobileSecondary.length > 0 && (
            <button
              onClick={() => setMoreOpen(true)}
              className="flex flex-col items-center gap-0.5 py-1.5 px-2 text-muted-foreground min-w-[56px]"
            >
              <MoreHorizontal className="size-5" />
              <span className="text-[10px] font-medium">More</span>
            </button>
          )}
        </div>
      </nav>

      {/* ── Mobile "More" Sheet ──────────────────────────────────────── */}
      <AnimatePresence>
        {moreOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="md:hidden fixed inset-0 bg-black/40 z-50"
              onClick={() => setMoreOpen(false)}
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border rounded-t-2xl"
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                <span className="text-sm font-semibold text-foreground">More</span>
                <button onClick={() => setMoreOpen(false)} className="p-1 rounded-md text-muted-foreground hover:text-foreground">
                  <X className="size-5" />
                </button>
              </div>
              <div className="p-3 space-y-1 pb-8">
                {mobileSecondary.map((item) => {
                  const active = isActive(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMoreOpen(false)}
                      className={cn(
                        "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors",
                        active ? "text-foreground border-l-2 border-foreground bg-transparent" : "text-muted-foreground/50 hover:text-muted-foreground/80 hover:bg-transparent border-l-2 border-transparent"
                      )}
                    >
                      {item.icon}
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
