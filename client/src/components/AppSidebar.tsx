// ============================================================================
// AppSidebar — Swiss Instrument design
// Fixed left rail, collapsible, gold accent on active, DM Sans typography
// Venture themes from Airtable data
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
  { label: "Dashboard", href: "/dashboard", icon: <LayoutDashboard className="size-[18px]" /> },
  { label: "AI Agent", href: "/agent", icon: <Bot className="size-[18px]" /> },
  { label: "Ventures", href: "/ventures", icon: <Layers3 className="size-[18px]" /> },
  { label: "SPVs & Deals", href: "/spvs", icon: <Briefcase className="size-[18px]" /> },
  { label: "Team", href: "/team", icon: <Users className="size-[18px]" /> },
  { label: "Tasks", href: "/tasks", icon: <ListChecks className="size-[18px]" /> },
  { label: "Distributions", href: "/distributions", icon: <DollarSign className="size-[18px]" /> },
  { label: "Activity", href: "/activity", icon: <Activity className="size-[18px]" /> },
  { label: "Security", href: "/security", icon: <Lock className="size-[18px]" /> },
  { label: "Settings", href: "/settings", icon: <Shield className="size-[18px]" /> },
];

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

  return (
    <>
      {/* Desktop sidebar */}
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
        <nav className="flex-1 flex flex-col gap-1 px-2 py-3">
          {NAV_ITEMS.map((item) => {
            const isActive = location === item.href || (item.href !== "/dashboard" && location.startsWith(item.href));
            return (
              <Tooltip key={item.href}>
                <TooltipTrigger asChild>
                  <Link href={item.href}>
                    <div
                      className={cn(
                        "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors duration-150 relative group",
                        isActive
                          ? "bg-primary/10 text-primary"
                          : "text-muted-foreground hover:text-foreground hover:bg-accent"
                      )}
                    >
                      {isActive && (
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

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-sidebar border-t border-border flex items-center justify-around h-14 px-2">
        {NAV_ITEMS.slice(0, 5).map((item) => {
          const isActive = location === item.href || (item.href !== "/dashboard" && location.startsWith(item.href));
          return (
            <Link key={item.href} href={item.href}>
              <div
                className={cn(
                  "flex flex-col items-center gap-0.5 px-3 py-1 rounded-md transition-colors",
                  isActive ? "text-primary" : "text-muted-foreground"
                )}
              >
                {item.icon}
                <span className="text-[10px] font-medium">{item.label}</span>
              </div>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
