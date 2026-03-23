// ============================================================================
// AppSidebar — Mobile-first responsive navigation
// Mobile: bottom tab bar with 6 items + "More" sheet
// Desktop: collapsible left rail
// ============================================================================

import { cn } from "@/lib/utils";
import { THEME_COLORS } from "@/lib/data";
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
} from "lucide-react";
import { useLocation, Link } from "wouter";
import { useState } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { AnimatePresence, motion } from "framer-motion";

const ATLAS_LOGO_URL = "https://d2xsxph8kpxj0f.cloudfront.net/310519663421947072/TYkqBQavc4Sd5YvF3sSZqT/atlas-logo-G2SBqxAK64sZYAYmAZY9js.webp";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
}

const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: <LayoutDashboard className="size-5" /> },
  { label: "AI Agent", href: "/agent", icon: <Bot className="size-5" /> },
  { label: "Ventures", href: "/ventures", icon: <Layers3 className="size-5" /> },
  { label: "SPVs & Deals", href: "/spvs", icon: <Briefcase className="size-5" /> },
  { label: "Team", href: "/team", icon: <Users className="size-5" /> },
  { label: "Tasks", href: "/tasks", icon: <ListChecks className="size-5" /> },
  { label: "Distributions", href: "/distributions", icon: <DollarSign className="size-5" /> },
  { label: "Activity", href: "/activity", icon: <Activity className="size-5" /> },
  { label: "Security", href: "/security", icon: <Lock className="size-5" /> },
  { label: "Settings", href: "/settings", icon: <Shield className="size-5" /> },
];

// First 5 items shown in mobile bottom bar, rest in "More" sheet
const MOBILE_PRIMARY = NAV_ITEMS.slice(0, 5);
const MOBILE_SECONDARY = NAV_ITEMS.slice(5);

const THEME_DOTS = [
  { key: "Real Estate", abbr: "RE" },
  { key: "Yacht", abbr: "YT" },
  { key: "F&B", abbr: "FB" },
  { key: "Entertainment", abbr: "EN" },
  { key: "Oil & Gas", abbr: "OG" },
  { key: "Others", abbr: "OT" },
];

export default function AppSidebar() {
  const [location] = useLocation();
  const [expanded, setExpanded] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);

  const isActive = (href: string) =>
    location === href || (href !== "/dashboard" && location.startsWith(href));

  // Check if any secondary item is active (to highlight "More" tab)
  const secondaryActive = MOBILE_SECONDARY.some(item => isActive(item.href));

  return (
    <>
      {/* ========== Desktop sidebar ========== */}
      <motion.aside
        className="hidden md:flex flex-col h-screen fixed left-0 top-0 z-40 border-r border-border bg-sidebar"
        animate={{ width: expanded ? 240 : 64 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
      >
        {/* Logo */}
        <div className="flex items-center h-14 px-4 border-b border-border">
          <img
            src={ATLAS_LOGO_URL}
            alt="ATLAS"
            className="size-8 rounded-md flex-shrink-0"
          />
          <AnimatePresence>
            {expanded && (
              <motion.span
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.15 }}
                className="ml-3 text-sm font-semibold tracking-tight text-foreground whitespace-nowrap"
              >
                ATLAS
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        {/* Nav items */}
        <nav className="flex-1 flex flex-col gap-1 px-2 py-3 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
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

          {/* Theme dots */}
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
          {MOBILE_PRIMARY.map((item) => {
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

          {/* More button */}
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
        </div>
      </nav>

      {/* ========== Mobile "More" bottom sheet ========== */}
      <AnimatePresence>
        {moreOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="md:hidden fixed inset-0 z-[60] bg-black/50"
              onClick={() => setMoreOpen(false)}
            />
            {/* Sheet */}
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
                {MOBILE_SECONDARY.map((item) => {
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
