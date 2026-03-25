// ============================================================================
// Activity Log Page — /activity — Split View: ATLAS Ops vs Client Business
// ============================================================================

import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity, Search, Building2, Briefcase, ListChecks, DollarSign,
  Users, Clock, ChevronDown, X, Shield, FileText, Bot,
  ArrowUpRight, Filter,
} from "lucide-react";
import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

// ── Icons & Colors ──────────────────────────────────────────────────────

const ENTITY_ICONS: Record<string, React.ReactNode> = {
  venture: <Building2 className="size-3.5 text-blue-400" />,
  spv: <Briefcase className="size-3.5 text-emerald-400" />,
  task: <ListChecks className="size-3.5 text-amber-400" />,
  distribution: <DollarSign className="size-3.5 text-primary" />,
  team: <Users className="size-3.5 text-purple-400" />,
  organization: <Building2 className="size-3.5 text-rose-400" />,
  document: <FileText className="size-3.5 text-cyan-400" />,
};

const ENTITY_COLORS: Record<string, string> = {
  venture: "border-l-blue-400",
  spv: "border-l-emerald-400",
  task: "border-l-amber-400",
  distribution: "border-l-primary",
  team: "border-l-purple-400",
  organization: "border-l-rose-400",
  document: "border-l-cyan-400",
};

// Source-specific styling
const SOURCE_STYLES = {
  atlas_ops: {
    label: "ATLAS Operations",
    shortLabel: "ATLAS Ops",
    icon: <Shield className="size-4" />,
    color: "text-primary",
    bgActive: "bg-primary/10 border-primary/40",
    dotColor: "bg-primary",
    description: "Internal admin actions — team management, client onboarding, system configuration",
  },
  client_business: {
    label: "Client Business",
    shortLabel: "Business",
    icon: <Building2 className="size-4" />,
    color: "text-blue-400",
    bgActive: "bg-blue-500/10 border-blue-400/40",
    dotColor: "bg-blue-400",
    description: "Venture progress, task work, SPV deals, distributions, file uploads",
  },
  system: {
    label: "System / AI",
    shortLabel: "System",
    icon: <Bot className="size-4" />,
    color: "text-cyan-400",
    bgActive: "bg-cyan-500/10 border-cyan-400/40",
    dotColor: "bg-cyan-400",
    description: "Automated actions — document analysis, AI task generation, scheduled jobs",
  },
};

type SourceKey = "all" | "atlas_ops" | "client_business" | "system";

// ── Helpers ─────────────────────────────────────────────────────────────

function formatTimestamp(d: string | Date): string {
  const date = new Date(d);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  if (diff < 60_000) return "Just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  if (diff < 604_800_000) return `${Math.floor(diff / 86_400_000)}d ago`;
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function getSourceBadge(source: string | null) {
  if (source === "atlas_ops") return { label: "ATLAS", className: "bg-primary/15 text-primary border-primary/30" };
  if (source === "client_business") return { label: "Business", className: "bg-blue-500/15 text-blue-400 border-blue-400/30" };
  if (source === "system") return { label: "System", className: "bg-cyan-500/15 text-cyan-400 border-cyan-400/30" };
  return { label: "Other", className: "bg-secondary text-muted-foreground border-border" };
}

// ── Main Component ──────────────────────────────────────────────────────

export default function ActivityLog() {
  const activityQ = trpc.activity.recent.useQuery({ limit: 300 });
  const entries = activityQ.data || [];

  const [sourceFilter, setSourceFilter] = useState<SourceKey>("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showCount, setShowCount] = useState(50);

  // ── Source counts ───────────────────────────────────────────────────
  const sourceCounts = useMemo(() => {
    const counts = { atlas_ops: 0, client_business: 0, system: 0, other: 0 };
    entries.forEach(e => {
      const src = (e as any).activitySource;
      if (src === "atlas_ops") counts.atlas_ops++;
      else if (src === "client_business") counts.client_business++;
      else if (src === "system") counts.system++;
      else counts.other++;
    });
    return counts;
  }, [entries]);

  // ── Filtered entries ────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let result = entries;

    // Source filter
    if (sourceFilter !== "all") {
      result = result.filter(e => (e as any).activitySource === sourceFilter);
    }

    // Type filter
    if (typeFilter !== "all") {
      result = result.filter(e => e.entityType === typeFilter);
    }

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(e =>
        e.action.toLowerCase().includes(q) ||
        (e.detail && e.detail.toLowerCase().includes(q)) ||
        (e.entityName && e.entityName.toLowerCase().includes(q))
      );
    }
    return result;
  }, [entries, sourceFilter, typeFilter, searchQuery]);

  const displayed = filtered.slice(0, showCount);
  const hasMore = filtered.length > showCount;

  // ── Group by date ───────────────────────────────────────────────────
  const grouped = useMemo(() => {
    const groups: Record<string, typeof displayed> = {};
    displayed.forEach(entry => {
      const date = new Date(entry.createdAt);
      const key = date.toLocaleDateString("en-GB", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });
      if (!groups[key]) groups[key] = [];
      groups[key].push(entry);
    });
    return Object.entries(groups);
  }, [displayed]);

  // ── Entity type counts (within current source filter) ──────────────
  const typeCounts = useMemo(() => {
    const base = sourceFilter !== "all"
      ? entries.filter(e => (e as any).activitySource === sourceFilter)
      : entries;
    const counts: Record<string, number> = {};
    base.forEach(e => {
      counts[e.entityType] = (counts[e.entityType] || 0) + 1;
    });
    return counts;
  }, [entries, sourceFilter]);

  const typeChips = [
    { label: "All", type: "all", icon: <Activity className="size-3" /> },
    { label: "Ventures", type: "venture", icon: <Building2 className="size-3" /> },
    { label: "SPVs", type: "spv", icon: <Briefcase className="size-3" /> },
    { label: "Tasks", type: "task", icon: <ListChecks className="size-3" /> },
    { label: "Dist.", type: "distribution", icon: <DollarSign className="size-3" /> },
    { label: "Team", type: "team", icon: <Users className="size-3" /> },
  ];

  return (
    <DashboardLayout title="Activity Log" subtitle="SYSTEM AUDIT TRAIL">
      <div className="p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-5 pb-24 md:pb-6">

        {/* ── Source Tabs — Primary split ─────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
          {/* All */}
          <motion.button
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={() => { setSourceFilter("all"); setTypeFilter("all"); }}
            className={cn(
              "bg-card border rounded-lg p-3 text-left transition-all touch-manipulation active:scale-[0.97]",
              sourceFilter === "all" ? "border-foreground/30 bg-foreground/5" : "border-border hover:border-foreground/20"
            )}
          >
            <div className="flex items-center gap-1.5 mb-1.5">
              <Activity className="size-3.5 text-foreground" />
              <span className="text-[10px] uppercase tracking-[0.06em] text-muted-foreground font-medium">All Activity</span>
            </div>
            <span className="text-xl font-mono font-semibold text-foreground">{entries.length}</span>
          </motion.button>

          {/* ATLAS Ops */}
          <motion.button
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.03 }}
            onClick={() => { setSourceFilter("atlas_ops"); setTypeFilter("all"); }}
            className={cn(
              "bg-card border rounded-lg p-3 text-left transition-all touch-manipulation active:scale-[0.97]",
              sourceFilter === "atlas_ops" ? SOURCE_STYLES.atlas_ops.bgActive : "border-border hover:border-primary/20"
            )}
          >
            <div className="flex items-center gap-1.5 mb-1.5">
              <Shield className="size-3.5 text-primary" />
              <span className="text-[10px] uppercase tracking-[0.06em] text-muted-foreground font-medium">ATLAS Ops</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-mono font-semibold text-foreground">{sourceCounts.atlas_ops}</span>
              <span className="text-[10px] font-mono text-primary">admin</span>
            </div>
          </motion.button>

          {/* Client Business */}
          <motion.button
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.06 }}
            onClick={() => { setSourceFilter("client_business"); setTypeFilter("all"); }}
            className={cn(
              "bg-card border rounded-lg p-3 text-left transition-all touch-manipulation active:scale-[0.97]",
              sourceFilter === "client_business" ? SOURCE_STYLES.client_business.bgActive : "border-border hover:border-blue-400/20"
            )}
          >
            <div className="flex items-center gap-1.5 mb-1.5">
              <Building2 className="size-3.5 text-blue-400" />
              <span className="text-[10px] uppercase tracking-[0.06em] text-muted-foreground font-medium">Business</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-mono font-semibold text-foreground">{sourceCounts.client_business}</span>
              <span className="text-[10px] font-mono text-blue-400">ventures</span>
            </div>
          </motion.button>

          {/* System / AI */}
          <motion.button
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.09 }}
            onClick={() => { setSourceFilter("system"); setTypeFilter("all"); }}
            className={cn(
              "bg-card border rounded-lg p-3 text-left transition-all touch-manipulation active:scale-[0.97]",
              sourceFilter === "system" ? SOURCE_STYLES.system.bgActive : "border-border hover:border-cyan-400/20"
            )}
          >
            <div className="flex items-center gap-1.5 mb-1.5">
              <Bot className="size-3.5 text-cyan-400" />
              <span className="text-[10px] uppercase tracking-[0.06em] text-muted-foreground font-medium">System</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-mono font-semibold text-foreground">{sourceCounts.system}</span>
              <span className="text-[10px] font-mono text-cyan-400">auto</span>
            </div>
          </motion.button>
        </div>

        {/* ── Source description ──────────────────────────────────────── */}
        <AnimatePresence mode="wait">
          {sourceFilter !== "all" && (
            <motion.div
              key={sourceFilter}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-lg border text-xs",
                sourceFilter === "atlas_ops" ? "bg-primary/5 border-primary/20 text-primary" :
                sourceFilter === "client_business" ? "bg-blue-500/5 border-blue-400/20 text-blue-400" :
                "bg-cyan-500/5 border-cyan-400/20 text-cyan-400"
              )}>
                {SOURCE_STYLES[sourceFilter].icon}
                <span>{SOURCE_STYLES[sourceFilter].description}</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Entity type sub-filters + search ───────────────────────── */}
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
          <div className="flex gap-1 overflow-x-auto pb-1 -mx-3 px-3 sm:mx-0 sm:px-0 scrollbar-hide flex-shrink-0">
            {typeChips.map(chip => {
              const count = chip.type === "all"
                ? (sourceFilter !== "all" ? entries.filter(e => (e as any).activitySource === sourceFilter).length : entries.length)
                : (typeCounts[chip.type] || 0);
              if (chip.type !== "all" && count === 0) return null;
              return (
                <button
                  key={chip.type}
                  onClick={() => setTypeFilter(chip.type)}
                  className={cn(
                    "flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium whitespace-nowrap transition-all touch-manipulation",
                    typeFilter === chip.type
                      ? "bg-foreground/10 text-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-foreground/5"
                  )}
                >
                  {chip.icon}
                  <span>{chip.label}</span>
                  <span className="font-mono text-[9px] opacity-60">{count}</span>
                </button>
              );
            })}
          </div>

          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search activity..."
              className="h-8 min-h-[32px] text-xs pl-8"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground touch-manipulation">
                <X className="size-3.5" />
              </button>
            )}
          </div>

          <span className="text-[10px] font-mono text-muted-foreground whitespace-nowrap self-center hidden sm:block">
            {filtered.length} entries
          </span>
        </div>

        {/* ── Timeline ────────────────────────────────────────────────── */}
        {activityQ.isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-lg" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-card border border-border rounded-lg p-12 text-center">
            <Activity className="size-8 text-muted-foreground mx-auto mb-3 opacity-40" />
            <p className="text-sm text-muted-foreground">No activity entries match your filters.</p>
            {sourceFilter !== "all" && (
              <Button variant="outline" size="sm" className="mt-3 text-xs" onClick={() => { setSourceFilter("all"); setTypeFilter("all"); }}>
                Show all activity
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-5 sm:space-y-6">
            {grouped.map(([dateLabel, items]) => (
              <div key={dateLabel}>
                <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                  <Clock className="size-3.5 text-muted-foreground flex-shrink-0" />
                  <span className="text-[10px] sm:text-[11px] uppercase tracking-[0.06em] text-muted-foreground font-medium truncate">{dateLabel}</span>
                  <div className="flex-1 h-px bg-border" />
                </div>
                <div className="space-y-1">
                  {items.map((entry, i) => {
                    const source = (entry as any).activitySource as string | null;
                    const badge = getSourceBadge(source);
                    return (
                      <motion.div
                        key={entry.id}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.02, duration: 0.2 }}
                        className={cn(
                          "bg-card border border-border rounded-lg p-3 flex items-start gap-2.5 sm:gap-3 border-l-2",
                          ENTITY_COLORS[entry.entityType] || "border-l-border"
                        )}
                      >
                        <div className="mt-0.5 flex-shrink-0">
                          {ENTITY_ICONS[entry.entityType] || <Activity className="size-3.5 text-muted-foreground" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start sm:items-center gap-1.5 sm:gap-2 flex-col sm:flex-row">
                            <span className="text-xs font-medium text-foreground">{entry.action}</span>
                            {entry.entityName && (
                              <span className="text-[10px] font-mono text-primary truncate max-w-[200px]">{entry.entityName}</span>
                            )}
                            {/* Source badge — only show in "all" view */}
                            {sourceFilter === "all" && (
                              <span className={cn(
                                "text-[9px] font-medium px-1.5 py-0.5 rounded border inline-flex items-center gap-1 flex-shrink-0",
                                badge.className
                              )}>
                                {badge.label}
                              </span>
                            )}
                          </div>
                          {entry.detail && (
                            <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2 sm:truncate">{entry.detail}</p>
                          )}
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <span className="text-[10px] font-mono text-muted-foreground">{formatTimestamp(entry.createdAt)}</span>
                            {entry.userName && (
                              <span className="text-[10px] text-muted-foreground">by {entry.userName}</span>
                            )}
                            {entry.sector && (
                              <span className="text-[10px] px-1 py-0.5 rounded bg-secondary text-muted-foreground">{entry.sector}</span>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            ))}

            {hasMore && (
              <div className="text-center">
                <Button variant="outline" size="sm" className="text-xs h-9 min-h-[36px] touch-manipulation" onClick={() => setShowCount(s => s + 50)}>
                  <ChevronDown className="size-3.5 mr-1" /> Load more ({filtered.length - showCount} remaining)
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
