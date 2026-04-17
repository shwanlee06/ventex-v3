// Oversight Page — Operator Oversight Feed with 48h Auto-Escalation
// Cross-client view of what agents did, what clients acted on, what's stuck

import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { useSSEInvalidation } from "@/hooks/useSSE";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Eye,
  Filter,
  RefreshCw,
  Shield,
  Loader2,
  ChevronDown,
  Bell,
  Zap,
  ArrowUpRight,
} from "lucide-react";
import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { useLocation } from "wouter";

function friendlyTime(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

const SEVERITY_CONFIG = {
  critical: { bg: "bg-red-500/10", text: "text-red-400", dot: "bg-red-400", label: "Critical" },
  warning: { bg: "bg-amber-500/10", text: "text-amber-400", dot: "bg-amber-400", label: "Warning" },
  info: { bg: "bg-blue-500/10", text: "text-blue-400", dot: "bg-blue-400", label: "Info" },
  normal: { bg: "bg-emerald-500/10", text: "text-emerald-400", dot: "bg-emerald-400", label: "Normal" },
  resolved: { bg: "bg-secondary", text: "text-muted-foreground", dot: "bg-muted-foreground", label: "Resolved" },
};

export default function OversightPage() {
  const [, navigate] = useLocation();
  const [severityFilter, setSeverityFilter] = useState<"all" | "critical" | "warning" | "info">("all");
  const [hoursBack, setHoursBack] = useState(720);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  const bulkResolveMut = trpc.agents.bulkResolve.useMutation({
    onSuccess: (data) => {
      toast.success(`Resolved ${data.count} events`);
      setSelectedIds(new Set());
      refetchRef.current?.();
    },
    onError: () => toast.error("Failed to resolve events"),
  });
  // Store refetch in ref so mutation callback can access it
  const refetchRef = { current: null as (() => void) | null };

  const { data, isLoading, refetch, isRefetching } = trpc.agents.enhancedOversight.useQuery(
    { severity: severityFilter, hoursBack, limit: 200 },
    { refetchInterval: 30000 }
  );

  const { data: escalationStats } = trpc.agents.escalationStats.useQuery(
    undefined,
    { refetchInterval: 60000 }
  );

  // Wire refetch for bulk resolve callback
  refetchRef.current = refetch;

  // SSE real-time updates
  useSSEInvalidation("agent_activity", () => { refetch(); });

  const items = data?.items ?? [];
  const stats = data?.stats ?? { total: 0, unactioned: 0, critical: 0, pending: 0, resolved: 0 };

  // Compute total action-required items for the stats display
  const totalActionRequired = stats.unactioned;

  // Group items by escalation level
  const grouped = useMemo(() => {
    const critical = items.filter(i => i.escalationLevel === "critical");
    const warning = items.filter(i => i.escalationLevel === "warning");
    const normal = items.filter(i => i.escalationLevel === "normal");
    const resolved = items.filter(i => i.escalationLevel === "resolved");
    return { critical, warning, normal, resolved };
  }, [items]);

  // Unresolved items for bulk select
  const unresolvedItems = useMemo(() => items.filter(i => !i.actionTaken), [items]);

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const selectAllUnresolved = () => {
    setSelectedIds(new Set(unresolvedItems.map(i => i.id)));
  };

  return (
    <DashboardLayout title="Oversight" subtitle="OPERATOR OVERSIGHT FEED">
      <div className="p-4 md:p-6 space-y-6">
        {/* ── Stats Bar ─────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-lg" />
            ))
          ) : (
            <>
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0, duration: 0.3 }}
                className="bg-card border border-border rounded-lg p-4 flex flex-col gap-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] uppercase tracking-[0.06em] text-muted-foreground font-medium">
                    Total Events
                  </span>
                  <Zap className="size-4 text-blue-400 opacity-60" />
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-semibold tracking-tight text-foreground font-mono">
                    {stats.total}
                  </span>
                  <span className="text-[10px] text-muted-foreground font-mono">{stats.unactioned} unactioned</span>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05, duration: 0.3 }}
                className="bg-card border border-red-500/20 rounded-lg p-4 flex flex-col gap-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] uppercase tracking-[0.06em] text-red-400 font-medium">
                    Escalated (48h+)
                  </span>
                  <AlertTriangle className="size-4 text-red-400 opacity-60" />
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-semibold tracking-tight text-red-400 font-mono">
                    {stats.critical}
                  </span>
                  <span className="text-[10px] text-muted-foreground font-mono">critical</span>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1, duration: 0.3 }}
                className="bg-card border border-border rounded-lg p-4 flex flex-col gap-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] uppercase tracking-[0.06em] text-muted-foreground font-medium">
                    Pending (24h+)
                  </span>
                  <Bell className="size-4 text-amber-400 opacity-60" />
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-semibold tracking-tight text-foreground font-mono">
                    {stats.pending}
                  </span>
                  <span className="text-[10px] text-muted-foreground font-mono">nudge sent</span>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15, duration: 0.3 }}
                className="bg-card border border-border rounded-lg p-4 flex flex-col gap-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] uppercase tracking-[0.06em] text-muted-foreground font-medium">
                    Resolved
                  </span>
                  <CheckCircle2 className="size-4 text-emerald-400 opacity-60" />
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-semibold tracking-tight text-emerald-400 font-mono">
                    {stats.resolved}
                  </span>
                  <span className="text-[10px] text-muted-foreground font-mono">actioned</span>
                </div>
              </motion.div>
            </>
          )}
        </div>

        {/* ── Filters ───────────────────────────────────────────────── */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Select value={severityFilter} onValueChange={(v) => setSeverityFilter(v as any)}>
              <SelectTrigger className="w-[140px] h-8 text-xs">
                <Filter className="size-3 mr-1.5" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Severity</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="warning">Warning</SelectItem>
                <SelectItem value="info">Info</SelectItem>
              </SelectContent>
            </Select>

            <Select value={String(hoursBack)} onValueChange={(v) => setHoursBack(Number(v))}>
              <SelectTrigger className="w-[120px] h-8 text-xs">
                <Clock className="size-3 mr-1.5" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="24">Last 24h</SelectItem>
                <SelectItem value="48">Last 48h</SelectItem>
                <SelectItem value="72">Last 72h</SelectItem>
                <SelectItem value="168">Last 7d</SelectItem>
                <SelectItem value="720">Last 30d</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            {selectedIds.size > 0 && (
              <Button
                variant="default"
                size="sm"
                onClick={() => bulkResolveMut.mutate({ eventIds: Array.from(selectedIds) })}
                disabled={bulkResolveMut.isPending}
                className="h-8 text-xs"
              >
                {bulkResolveMut.isPending ? <Loader2 className="size-3 animate-spin mr-1.5" /> : <CheckCircle2 className="size-3 mr-1.5" />}
                Resolve {selectedIds.size} Selected
              </Button>
            )}
            {unresolvedItems.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={selectedIds.size > 0 ? () => setSelectedIds(new Set()) : selectAllUnresolved}
                className="h-8 text-xs"
              >
                {selectedIds.size > 0 ? "Deselect All" : `Select All (${unresolvedItems.length})`}
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isRefetching}
              className="h-8 text-xs"
            >
              {isRefetching ? <Loader2 className="size-3 animate-spin mr-1.5" /> : <RefreshCw className="size-3 mr-1.5" />}
              Refresh
            </Button>
          </div>
        </div>

        {/* ── Critical Escalations ──────────────────────────────────── */}
        {grouped.critical.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="size-4 text-red-400" />
              <h2 className="text-sm font-semibold text-red-400">
                Critical Escalations ({grouped.critical.length})
              </h2>
              <span className="text-[10px] font-mono text-red-400/60">48h+ unactioned</span>
            </div>
            <div className="bg-card border border-red-500/20 rounded-lg divide-y divide-border">
              {grouped.critical.map((item, i) => (
                <EventRow key={item.id} item={item} index={i} navigate={navigate} selected={selectedIds.has(item.id)} onToggle={() => toggleSelect(item.id)} />
              ))}
            </div>
          </div>
        )}

        {/* ── Warning (24h+) ────────────────────────────────────── */}
        {grouped.warning.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Clock className="size-4 text-amber-400" />
              <h2 className="text-sm font-semibold text-amber-400">
                Pending Nudge ({grouped.warning.length})
              </h2>
              <span className="text-[10px] font-mono text-amber-400/60">24-48h unactioned</span>
            </div>
            <div className="bg-card border border-amber-500/20 rounded-lg divide-y divide-border">
              {grouped.warning.map((item, i) => (
                <EventRow key={item.id} item={item} index={i} navigate={navigate} selected={selectedIds.has(item.id)} onToggle={() => toggleSelect(item.id)} />
              ))}
            </div>
          </div>
        )}

        {/* ── Normal / Recent ───────────────────────────────────────── */}
        {grouped.normal.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Zap className="size-4 text-foreground" />
              <h2 className="text-sm font-semibold text-foreground">
                Recent Activity ({grouped.normal.length})
              </h2>
            </div>
            <div className="bg-card border border-border rounded-lg divide-y divide-border">
              {grouped.normal.map((item, i) => (
                <EventRow key={item.id} item={item} index={i} navigate={navigate} selected={selectedIds.has(item.id)} onToggle={() => toggleSelect(item.id)} />
              ))}
            </div>
          </div>
        )}

        {/* ── Resolved ──────────────────────────────────────────────── */}
        {grouped.resolved.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="size-4 text-emerald-400" />
              <h2 className="text-sm font-semibold text-muted-foreground">
                Resolved ({grouped.resolved.length})
              </h2>
            </div>
            <div className="bg-card border border-border rounded-lg divide-y divide-border">
              {grouped.resolved.slice(0, 10).map((item, i) => (
                <EventRow key={item.id} item={item} index={i} navigate={navigate} selected={selectedIds.has(item.id)} onToggle={() => toggleSelect(item.id)} />
              ))}
            </div>
          </div>
        )}

        {/* ── Empty State ───────────────────────────────────────────── */}
        {!isLoading && items.length === 0 && (
          <div className="bg-card border border-border rounded-lg p-12 text-center">
            <Eye className="size-10 text-muted-foreground/30 mx-auto mb-3" />
            <h3 className="text-sm font-medium text-foreground mb-1">All Clear</h3>
            <p className="text-xs text-muted-foreground">
              No agent events in the last {hoursBack} hours. The system is running smoothly.
            </p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

function EventRow({
  item,
  index,
  navigate,
  selected,
  onToggle,
}: {
  item: any;
  index: number;
  navigate: (path: string) => void;
  selected?: boolean;
  onToggle?: () => void;
}) {
  const sc = SEVERITY_CONFIG[item.escalationLevel as keyof typeof SEVERITY_CONFIG] || SEVERITY_CONFIG.normal;

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.03, duration: 0.25 }}
      className={cn("p-3 flex items-start gap-3 hover:bg-accent/30 transition-colors cursor-pointer", selected && "bg-primary/5")}
      onClick={() => {
        if (item.entityType === "venture" && item.agentEntityId) {
          toast.info(`Navigating to venture ${item.agentEntityName || item.agentEntityId}`);
        } else {
          toast.info(`${item.agentName}: ${item.message}`);
        }
      }}
    >
      {/* Selection checkbox */}
      {onToggle && !item.actionTaken && (
        <button
          onClick={(e) => { e.stopPropagation(); onToggle(); }}
          className={cn(
            "size-4 rounded border flex-shrink-0 mt-0.5 flex items-center justify-center transition-colors",
            selected ? "bg-primary border-primary" : "border-border hover:border-primary/50"
          )}
        >
          {selected && <CheckCircle2 className="size-3 text-primary-foreground" />}
        </button>
      )}
      {/* Severity dot */}
      <div className={cn("size-2 rounded-full mt-1.5 flex-shrink-0", sc.dot)} />

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-medium text-foreground">{item.agentName}</span>
          <Badge variant="outline" className={cn("text-[9px] px-1.5 py-0", sc.bg, sc.text)}>
            {item.severity}
          </Badge>
          {item.orgName && item.orgName !== "System" && (
            <span className="text-[10px] font-mono text-muted-foreground">
              {item.orgName}
            </span>
          )}
          <span className="text-[10px] font-mono text-muted-foreground ml-auto flex-shrink-0">
            {friendlyTime(item.createdAt)}
          </span>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{item.message}</p>
        {item.agentEntityName && (
          <div className="flex items-center gap-1.5 mt-1">
            <span className="text-[10px] text-muted-foreground/60">{item.entityType}:</span>
            <span className="text-[10px] font-medium text-foreground/80">{item.agentEntityName}</span>
          </div>
        )}
        {/* Action indicator */}
        {item.actionType && !item.actionTaken && (
          <div className="flex items-center gap-1.5 mt-1.5">
            <ArrowUpRight className="size-3 text-primary" />
            <span className="text-[10px] font-medium text-primary">{item.actionLabel || "Action required"}</span>
          </div>
        )}
        {item.actionTaken && (
          <div className="flex items-center gap-1.5 mt-1.5">
            <CheckCircle2 className="size-3 text-emerald-400" />
            <span className="text-[10px] text-emerald-400">
              Actioned by {item.actionTakenBy || "operator"} {item.actionTakenAt ? friendlyTime(item.actionTakenAt) : ""}
            </span>
          </div>
        )}
      </div>
    </motion.div>
  );
}
