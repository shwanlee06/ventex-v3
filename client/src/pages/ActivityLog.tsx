// ============================================================================
// Activity Log Page — /activity — Mobile-First
// ============================================================================

import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import {
  Activity, Search, Building2, Briefcase, ListChecks, DollarSign,
  Users, Clock, ChevronDown, X,
} from "lucide-react";
import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

const ENTITY_ICONS: Record<string, React.ReactNode> = {
  venture: <Building2 className="size-3.5 text-blue-400" />,
  spv: <Briefcase className="size-3.5 text-emerald-400" />,
  task: <ListChecks className="size-3.5 text-amber-400" />,
  distribution: <DollarSign className="size-3.5 text-primary" />,
  team: <Users className="size-3.5 text-purple-400" />,
};

const ENTITY_COLORS: Record<string, string> = {
  venture: "border-l-blue-400",
  spv: "border-l-emerald-400",
  task: "border-l-amber-400",
  distribution: "border-l-primary",
  team: "border-l-purple-400",
};

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

export default function ActivityLog() {
  const activityQ = trpc.activity.recent.useQuery({ limit: 200 });
  const entries = activityQ.data || [];

  const [typeFilter, setTypeFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showCount, setShowCount] = useState(50);

  const filtered = useMemo(() => {
    let result = entries;
    if (typeFilter !== "all") {
      result = result.filter(e => e.entityType === typeFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(e =>
        e.action.toLowerCase().includes(q) ||
        (e.detail && e.detail.toLowerCase().includes(q)) ||
        (e.entityName && e.entityName.toLowerCase().includes(q))
      );
    }
    return result;
  }, [entries, typeFilter, searchQuery]);

  const displayed = filtered.slice(0, showCount);
  const hasMore = filtered.length > showCount;

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

  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    entries.forEach(e => {
      counts[e.entityType] = (counts[e.entityType] || 0) + 1;
    });
    return counts;
  }, [entries]);

  const filterChips = [
    { label: "All", value: entries.length, type: "all", icon: <Activity className="size-3.5 text-foreground" /> },
    { label: "Ventures", value: typeCounts["venture"] || 0, type: "venture", icon: ENTITY_ICONS["venture"] },
    { label: "SPVs", value: typeCounts["spv"] || 0, type: "spv", icon: ENTITY_ICONS["spv"] },
    { label: "Tasks", value: typeCounts["task"] || 0, type: "task", icon: ENTITY_ICONS["task"] },
    { label: "Dist.", value: typeCounts["distribution"] || 0, type: "distribution", icon: ENTITY_ICONS["distribution"] },
    { label: "Team", value: typeCounts["team"] || 0, type: "team", icon: ENTITY_ICONS["team"] },
  ];

  return (
    <DashboardLayout title="Activity Log" subtitle="SYSTEM AUDIT TRAIL">
      <div className="p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6 pb-24 md:pb-6">
        {/* Filter chips — horizontal scroll on mobile */}
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-3 px-3 sm:mx-0 sm:px-0 scrollbar-hide">
          {activityQ.isLoading ? (
            Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-14 w-24 rounded-lg flex-shrink-0" />)
          ) : (
            filterChips.map((m, i) => (
              <motion.button
                key={m.label}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                onClick={() => setTypeFilter(m.type)}
                className={cn(
                  "bg-card border rounded-lg p-2.5 sm:p-3 text-left transition-all flex-shrink-0 min-w-[80px] sm:min-w-0 sm:flex-1 touch-manipulation active:scale-[0.97]",
                  typeFilter === m.type ? "border-primary/50 bg-primary/5" : "border-border hover:border-primary/30"
                )}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  {m.icon}
                  <span className="text-[9px] sm:text-[10px] uppercase tracking-[0.06em] text-muted-foreground font-medium">{m.label}</span>
                </div>
                <span className="text-base sm:text-lg font-mono font-semibold text-foreground">{m.value}</span>
              </motion.button>
            ))
          )}
        </div>

        {/* Search */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search activity..."
              className="h-9 min-h-[36px] text-xs pl-8"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground touch-manipulation">
                <X className="size-3.5" />
              </button>
            )}
          </div>
          <span className="text-[10px] font-mono text-muted-foreground whitespace-nowrap">
            {filtered.length}
          </span>
        </div>

        {/* Timeline */}
        {activityQ.isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-lg" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-card border border-border rounded-lg p-12 text-center">
            <Activity className="size-8 text-muted-foreground mx-auto mb-3 opacity-40" />
            <p className="text-sm text-muted-foreground">No activity entries match your filters.</p>
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
                  {items.map((entry, i) => (
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
                            <span className="text-[10px] font-mono text-primary">{entry.entityName}</span>
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
                  ))}
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
