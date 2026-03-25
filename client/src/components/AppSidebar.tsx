// ============================================================================
// AppSidebar — Role-based navigation
// ATLAS team (owner/admin): full navigation with all pages
// Client users: scoped portal with limited navigation
// Mobile: bottom tab bar | Desktop: collapsible left rail
// ============================================================================

import { cn } from "@/lib/utils";
import { useAuth } from "@/_core/hooks/useAuth";
import { usePreviewMode } from "@/contexts/PreviewMode";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { THEME_COLORS } from "@/lib/data";
import { trpc } from "@/lib/trpc";
import {
  LayoutDashboard,
  Bot,
  Layers3,
  Briefcase,
  Shield,
  Lock,
  ChevronLeft,
  ChevronRight,
  Users,
  DollarSign,
  ListChecks,
  Activity,
  MoreHorizontal,
  X,
  KeyRound,
  Building2,
  FileText,
  User,
  Plus,
  Loader2,
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
  atlasOnly?: boolean; // Only visible to ATLAS team (owner/admin)
  clientOnly?: boolean; // Only visible to client users
}

// Full navigation — items marked atlasOnly are hidden from clients
const ALL_NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: <LayoutDashboard className="size-5" /> },
  { label: "AI Agent", href: "/agent", icon: <Bot className="size-5" />, atlasOnly: true },
  { label: "Ventures", href: "/ventures", icon: <Layers3 className="size-5" />, clientOnly: true },
  { label: "SPVs & Deals", href: "/spvs", icon: <Briefcase className="size-5" /> },
  { label: "People", href: "/team", icon: <Users className="size-5" />, atlasOnly: true },
  { label: "Tasks", href: "/tasks", icon: <ListChecks className="size-5" /> },
  { label: "Distributions", href: "/distributions", icon: <DollarSign className="size-5" /> },
  { label: "Activity", href: "/activity", icon: <Activity className="size-5" /> },
  { label: "Security", href: "/security", icon: <Lock className="size-5" />, atlasOnly: true },
  { label: "Access", href: "/access", icon: <KeyRound className="size-5" />, atlasOnly: true },
  { label: "Settings", href: "/settings", icon: <Shield className="size-5" />, atlasOnly: true },
  { label: "My Profile", href: "/profile", icon: <User className="size-5" />, clientOnly: true },
];

const THEME_DOTS = [
  { key: "Real Estate", abbr: "RE" },
  { key: "Yacht", abbr: "YT" },
  { key: "F&B", abbr: "FB" },
  { key: "Entertainment", abbr: "EN" },
  { key: "Oil & Gas", abbr: "OG" },
  { key: "Others", abbr: "OT" },
];

/** Check if user is ATLAS internal team */
function isAtlasRole(role?: string): boolean {
  return role === "owner" || role === "admin";
}

export default function AppSidebar() {
  const [location] = useLocation();
  const [expanded, setExpanded] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const { user } = useAuth();
  const { isPreviewMode } = usePreviewMode();
  const { organizations, activeOrg, setActiveOrg, refetchOrgs } = useWorkspace();
  const [orgDropdownOpen, setOrgDropdownOpen] = useState(false);
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
  const isAtlas = isPreviewMode ? false : isAtlasRole(user?.role);

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

  const isActive = (href: string) =>
    location === href || (href !== "/dashboard" && location.startsWith(href)) ||
    (href === "/dashboard" && location.startsWith("/clients/"));

  const secondaryActive = mobileSecondary.some(item => isActive(item.href));

  // Sidebar header text
  const sidebarTitle = isAtlas ? "ATLAS" : (user?.name?.split(" ")[0] || "Portal");

  return (
    <>
      {/* ========== Desktop sidebar ========== */}
      <motion.aside
        className="hidden md:flex flex-col h-screen fixed left-0 top-0 z-40 border-r border-border bg-sidebar"
        animate={{ width: expanded ? 240 : 64 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
      >
        {/* Logo / Branding */}
        <div className="flex items-center h-14 px-4 border-b border-border">
          {isAtlas ? (
            <img
              src={ATLAS_LOGO_URL}
              alt="ATLAS"
              className="size-8 rounded-md flex-shrink-0"
            />
          ) : (
            <div className="size-8 rounded-md flex-shrink-0 bg-primary/10 flex items-center justify-center">
              <Building2 className="size-4 text-primary" />
            </div>
          )}
          <AnimatePresence>
            {expanded && (
              <motion.div
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.15 }}
                className="ml-3 overflow-hidden"
              >
                <span className="text-sm font-semibold tracking-tight text-foreground whitespace-nowrap block">
                  {sidebarTitle}
                </span>
                {isAtlas ? (
                  <button
                    onClick={(e) => { e.stopPropagation(); setOrgDropdownOpen(!orgDropdownOpen); }}
                    className="text-[10px] text-muted-foreground font-mono whitespace-nowrap block hover:text-foreground transition-colors flex items-center gap-1"
                  >
                    {activeOrg?.name || "Select Client"}
                    <svg className={cn("size-3 transition-transform", orgDropdownOpen && "rotate-180")} viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 5l3 3 3-3" /></svg>
                  </button>
                ) : (
                  <span className="text-[10px] text-muted-foreground font-mono whitespace-nowrap block">
                    Client Portal
                  </span>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Client workspace dropdown */}
        <AnimatePresence>
          {expanded && orgDropdownOpen && isAtlas && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.15 }}
              className="border-b border-border overflow-hidden"
            >
              <div className="p-2 space-y-1">
                <p className="text-[9px] uppercase tracking-[0.1em] text-muted-foreground px-2 py-1 font-medium">Client Workspaces</p>
                {organizations.map((org) => (
                  <button
                    key={org.id}
                    onClick={() => { setActiveOrg(org); setOrgDropdownOpen(false); }}
                    className={cn(
                      "w-full flex items-center gap-2 px-2 py-2 rounded-md text-xs transition-colors",
                      activeOrg?.id === org.id
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:text-foreground hover:bg-accent"
                    )}
                  >
                    <div className="size-6 rounded-md bg-accent flex items-center justify-center flex-shrink-0">
                      <Building2 className="size-3" />
                    </div>
                    <div className="text-left min-w-0">
                      <span className="block truncate font-medium">{org.name}</span>
                      <span className="block text-[10px] text-muted-foreground font-mono">{org.ventureCount} ventures</span>
                    </div>
                    {activeOrg?.id === org.id && (
                      <div className="ml-auto size-1.5 rounded-full bg-primary flex-shrink-0" />
                    )}
                  </button>
                ))}
                {organizations.length === 0 && (
                  <p className="text-[10px] text-muted-foreground px-2 py-2">No client workspaces yet</p>
                )}

                {/* Add Client */}
                {!showAddClient ? (
                  <button
                    onClick={() => setShowAddClient(true)}
                    className="w-full flex items-center gap-2 px-2 py-2 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                  >
                    <div className="size-6 rounded-md bg-accent/50 border border-dashed border-border flex items-center justify-center flex-shrink-0">
                      <Plus className="size-3" />
                    </div>
                    <span className="font-medium">Add Client</span>
                  </button>
                ) : (
                  <div className="px-2 py-2 space-y-2">
                    <input
                      type="text"
                      value={newClientName}
                      onChange={(e) => setNewClientName(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleAddClient()}
                      placeholder="Client name..."
                      autoFocus
                      className="w-full px-2 py-1.5 text-xs bg-accent/50 border border-border rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                    <div className="flex gap-1">
                      <button
                        onClick={handleAddClient}
                        disabled={!newClientName.trim() || addingClient}
                        className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-[10px] font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 transition-colors"
                      >
                        {addingClient ? <Loader2 className="size-3 animate-spin" /> : "Create"}
                      </button>
                      <button
                        onClick={() => { setShowAddClient(false); setNewClientName(""); }}
                        className="px-2 py-1.5 text-[10px] font-medium text-muted-foreground hover:text-foreground rounded-md hover:bg-accent transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Nav items */}
        <nav className="flex-1 flex flex-col gap-1 px-2 py-3 overflow-y-auto">
          {navItems.map((item) => {
            const active = isActive(item.href);
            return (
              <Tooltip key={item.href}>
                <TooltipTrigger asChild>
                  <Link href={item.href}>
                    <div
                      className={cn(
                        "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors duration-150 relative group",
                        active
                          ? "bg-primary/10 text-primary"
                          : "text-muted-foreground hover:text-foreground hover:bg-accent"
                      )}
                    >
                      {active && (
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-5 bg-primary rounded-r" />
                      )}
                      <span className="flex-shrink-0">{item.icon}</span>
                      <AnimatePresence>
                        {expanded && (
                          <motion.span
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.1 }}
                            className="whitespace-nowrap font-medium"
                          >
                            {item.label}
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </div>
                  </Link>
                </TooltipTrigger>
                {!expanded && (
                  <TooltipContent side="right" className="text-xs">
                    {item.label}
                  </TooltipContent>
                )}
              </Tooltip>
            );
          })}

          {/* Theme dots — ATLAS team only */}
          {isAtlas && (
            <div className="mt-4 pt-4 border-t border-border">
              <AnimatePresence>
                {expanded && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground px-3 mb-2 font-medium"
                  >
                    Sectors
                  </motion.p>
                )}
              </AnimatePresence>
              <div className={cn("flex gap-2 px-3", expanded ? "flex-col gap-1" : "flex-col items-center")}>
                {THEME_DOTS.map((v) => {
                  const tc = THEME_COLORS[v.key];
                  return (
                    <div key={v.key} className="flex items-center gap-3">
                      <div
                        className="size-[6px] rounded-full flex-shrink-0"
                        style={{ backgroundColor: tc?.color || "#888" }}
                      />
                      <AnimatePresence>
                        {expanded && (
                          <motion.span
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="text-xs text-muted-foreground"
                          >
                            {tc?.label || v.key}
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Client portal info */}
          {!isAtlas && expanded && (
            <div className="mt-4 pt-4 border-t border-border px-3">
              <p className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground mb-2 font-medium">
                Your Access
              </p>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="size-1.5 rounded-full bg-emerald-400" />
                  <span className="text-xs text-muted-foreground">
                    {user?.role === "manager" ? "Manager" : user?.role === "client" ? "Client" : user?.role === "viewer" ? "Viewer" : "User"} Access
                  </span>
                </div>
              </div>
            </div>
          )}
        </nav>

        {/* Expand toggle */}
        <div className="px-2 py-3 border-t border-border">
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center justify-center w-full h-8 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            {expanded ? <ChevronLeft className="size-4" /> : <ChevronRight className="size-4" />}
          </button>
        </div>
      </motion.aside>

      {/* ========== Mobile bottom tab bar ========== */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-sidebar/95 backdrop-blur-md border-t border-border"
        style={{ paddingBottom: "max(0.25rem, env(safe-area-inset-bottom))" }}
      >
        <div className="flex items-center justify-around px-1 pt-1">
          {mobilePrimary.map((item) => {
            const active = isActive(item.href);
            return (
              <Link key={item.href} href={item.href}>
                <button
                  className={cn(
                    "flex flex-col items-center justify-center gap-0.5 min-w-[56px] min-h-[48px] rounded-lg transition-colors",
                    active ? "text-primary" : "text-muted-foreground active:text-foreground"
                  )}
                >
                  <span className={cn("transition-transform", active && "scale-110")}>{item.icon}</span>
                  <span className={cn("text-[10px] font-medium leading-tight", active && "font-semibold")}>
                    {item.label.length > 8 ? item.label.slice(0, 7) + "…" : item.label}
                  </span>
                </button>
              </Link>
            );
          })}

          {/* More button — only if there are secondary items */}
          {mobileSecondary.length > 0 && (
            <button
              onClick={() => setMoreOpen(true)}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 min-w-[56px] min-h-[48px] rounded-lg transition-colors",
                secondaryActive ? "text-primary" : "text-muted-foreground active:text-foreground"
              )}
            >
              <MoreHorizontal className="size-5" />
              <span className="text-[10px] font-medium leading-tight">More</span>
            </button>
          )}
        </div>
      </nav>

      {/* ========== Mobile "More" bottom sheet ========== */}
      <AnimatePresence>
        {moreOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="md:hidden fixed inset-0 z-[60] bg-black/50"
              onClick={() => setMoreOpen(false)}
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="md:hidden fixed bottom-0 left-0 right-0 z-[61] bg-card rounded-t-2xl border-t border-border"
              style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                <span className="text-sm font-semibold text-foreground">More</span>
                <button
                  onClick={() => setMoreOpen(false)}
                  className="flex items-center justify-center size-8 rounded-full bg-secondary text-muted-foreground"
                >
                  <X className="size-4" />
                </button>
              </div>
              <div className="grid grid-cols-3 gap-2 p-4">
                {mobileSecondary.map((item) => {
                  const active = isActive(item.href);
                  return (
                    <Link key={item.href} href={item.href}>
                      <button
                        onClick={() => setMoreOpen(false)}
                        className={cn(
                          "flex flex-col items-center justify-center gap-2 p-4 rounded-xl transition-colors min-h-[80px]",
                          active
                            ? "bg-primary/10 text-primary"
                            : "bg-secondary/50 text-muted-foreground active:bg-secondary"
                        )}
                      >
                        {item.icon}
                        <span className="text-xs font-medium">{item.label}</span>
                      </button>
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
