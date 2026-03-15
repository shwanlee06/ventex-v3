// ============================================================================
// Activity Log Page — /activity — LIVE DB DATA
// Full audit trail with entity-type filter, search, and clickable rows
// ============================================================================

import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import {
  Activity, Search, Filter, Building2, Briefcase, ListChecks, DollarSign,
  Users, Clock, ChevronDown,
} from "lucide-react";
import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
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

  // Group by date
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

  // Entity type counts
  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    entries.forEach(e => {
      counts[e.entityType] = (counts[e.entityType] || 0) + 1;
    });
    return counts;
  }, [entries]);

  return (
    <DashboardLayout title="Activity Log" subtitle="SYSTEM AUDIT TRAIL">
      <div className="p-4 md:p-6 space-y-6">
        {/* Summary bar */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {activityQ.isLoading ? (
            Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-lg" />)
          ) : (
            [
              { label: "Total", value: entries.length, icon: <Activity className="size-4 text-foreground" />, type: "all" },
              { label: "Ventures", value: typeCounts["venture"] || 0, icon: ENTITY_ICONS["venture"], type: "venture" },
              { label: "SPVs", value: typeCounts["spv"] || 0, icon: ENTITY_ICONS["spv"], type: "spv" },
              { label: "Tasks", value: typeCounts["task"] || 0, icon: ENTITY_ICONS["task"], type: "task" },
              { label: "Distributions", value: typeCounts["distribution"] || 0, icon: ENTITY_ICONS["distribution"], type: "distribution" },
              { label: "Team", value: typeCounts["team"] || 0, icon: ENTITY_ICONS["team"], type: "team" },
            ].map((m, i) => (
              <motion.button
                key={m.label}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                onClick={() => setTypeFilter(m.type)}
                className={cn(
                  "bg-card border rounded-lg p-3 text-left transition-all hover:border-primary/30",
                  typeFilter === m.type ? "border-primary/50 bg-primary/5" : "border-border"
                )}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  {m.icon}
                  <span className="text-[10px] uppercase tracking-[0.06em] text-muted-foreground font-medium">{m.label}</span>
                </div>
                <span className="text-lg font-mono font-semibold text-foreground">{m.value}</span>
              </motion.button>
            ))
          )}
        </div>

        {/* Search + filter */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search activity..."
              className="h-8 text-xs pl-8"
            />
          </div>
          <span className="text-[10px] font-mono text-muted-foreground">
            {filtered.length} entries
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
          <div className="space-y-6">
            {grouped.map(([dateLabel, items]) => (
              <div key={dateLabel}>
                <div className="flex items-center gap-3 mb-3">
                  <Clock className="size-3.5 text-muted-foreground" />
                  <span className="text-[11px] uppercase tracking-[0.06em] text-muted-foreground font-medium">{dateLabel}</span>
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
                        "bg-card border border-border rounded-lg p-3 flex items-start gap-3 border-l-2",
                        ENTITY_COLORS[entry.entityType] || "border-l-border"
                      )}
                    >
                      <div className="mt-0.5">
                        {ENTITY_ICONS[entry.entityType] || <Activity className="size-3.5 text-muted-foreground" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-foreground">{entry.action}</span>
                          {entry.entityName && (
                            <span className="text-[10px] font-mono text-primary">{entry.entityName}</span>
                          )}
                        </div>
                        {entry.detail && (
                          <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{entry.detail}</p>
                        )}
                        <div className="flex items-center gap-2 mt-1">
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
                <Button variant="outline" size="sm" className="text-xs" onClick={() => setShowCount(s => s + 50)}>
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
