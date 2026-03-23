// ============================================================================
// Client Dashboard — Clean, Spacious, Mobile-First
// Premium feel with generous whitespace and large touch targets
// ============================================================================

import { cn } from "@/lib/utils";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import {
  getThemeColor,
  formatCurrency,
  formatDate,
  formatTimestamp,
} from "@/lib/data";
import {
  Layers3,
  Briefcase,
  DollarSign,
  ArrowUpRight,
  ChevronRight,
  TrendingUp,
  Building2,
  Ship,
  UtensilsCrossed,
  Clapperboard,
  Fuel,
  Package,
  Clock,
} from "lucide-react";
import { motion } from "framer-motion";
import { useMemo } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { useWorkspace } from "@/contexts/WorkspaceContext";

const THEME_ICONS: Record<string, React.ReactNode> = {
  "Real Estate": <Building2 className="size-5" />,
  "Yacht": <Ship className="size-5" />,
  "F&B": <UtensilsCrossed className="size-5" />,
  "Entertainment": <Clapperboard className="size-5" />,
  "Oil & Gas": <Fuel className="size-5" />,
  "Others": <Package className="size-5" />,
};

interface ClientDashboardProps {
  onNavigate: (path: string) => void;
}

export default function ClientDashboard({ onNavigate }: ClientDashboardProps) {
  const { user } = useAuth();
  const { activeOrg } = useWorkspace();
  const orgFilter = activeOrg?.id ? { organizationId: activeOrg.id } : undefined;

  // ── Data queries (scoped by active org) ──────────────────────
  const venturesQ = trpc.ventures.list.useQuery(orgFilter);
  const spvsQ = trpc.spvs.list.useQuery(orgFilter);
  const distQ = trpc.distributions.list.useQuery(orgFilter);
  const activityQ = trpc.activity.recent.useQuery({ limit: 5, organizationId: activeOrg?.id });

  const pageLoading = venturesQ.isLoading;

  const allVentures = venturesQ.data || [];
  const allSpvs = spvsQ.data || [];
  const allDists = distQ.data || [];
  const activityLogs = activityQ.data || [];

  // Derived
  const totalDistAmount = allDists.reduce((s, d) => s + (d.amount || 0), 0);
  const paidDistAmount = allDists.filter(d => d.status === "Paid").reduce((s, d) => s + (d.amount || 0), 0);
  const scheduledDists = allDists.filter(d => d.status === "Scheduled");

  const venturesBySector = useMemo(() => {
    const map: Record<string, typeof allVentures> = {};
    for (const v of allVentures) {
      if (!map[v.sector]) map[v.sector] = [];
      map[v.sector].push(v);
    }
    return map;
  }, [allVentures]);

  const firstName = user?.name?.split(" ")[0] || "Partner";

  if (pageLoading) {
    return (
      <div className="client-portal px-5 py-6 sm:px-8 sm:py-8 space-y-6 pb-28 md:pb-8 max-w-3xl mx-auto">
        <Skeleton className="h-40 rounded-2xl" />
        <div className="grid grid-cols-3 gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-32 rounded-2xl" />
        <Skeleton className="h-32 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="client-portal px-5 py-6 sm:px-8 sm:py-8 space-y-6 sm:space-y-8 pb-28 md:pb-8 max-w-3xl mx-auto">

      {/* ── Hero Greeting ─────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="rounded-2xl border border-border bg-card p-6 sm:p-8"
      >
        <p className="text-[11px] uppercase tracking-widest text-muted-foreground mb-3 font-light">
          Welcome back
        </p>
        <h1 className="text-2xl sm:text-3xl font-light text-foreground tracking-tight">
          {firstName}
        </h1>
        <p className="text-sm text-muted-foreground mt-1 font-light">
          {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
        </p>

        <div className="mt-6 flex items-end gap-8">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1 font-light">Portfolio Value</p>
            <p className="text-2xl sm:text-3xl font-light text-foreground tabular-nums tracking-tight">
              {formatCurrency(totalDistAmount * 8)}
            </p>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <TrendingUp className="size-4 text-emerald-400" />
              <span className="text-lg font-light text-emerald-400 tabular-nums">+18.4%</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── Summary Row — 3 compact cards ─────────────────────────── */}
      <div className="grid grid-cols-3 gap-3">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.3 }}
          onClick={() => onNavigate("/ventures")}
          className="client-card cursor-pointer text-center py-4 px-3"
        >
          <p className="text-xl sm:text-2xl font-light text-foreground tabular-nums">
            {allVentures.filter(v => v.status === "In progress").length}
          </p>
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground mt-1 font-light">Ventures</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.3 }}
          onClick={() => onNavigate("/spvs")}
          className="client-card cursor-pointer text-center py-4 px-3"
        >
          <p className="text-xl sm:text-2xl font-light text-foreground tabular-nums">
            {allSpvs.filter(s => s.stage === "Active deal").length}
          </p>
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground mt-1 font-light">SPVs</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.3 }}
          onClick={() => onNavigate("/distributions")}
          className="client-card cursor-pointer text-center py-4 px-3"
        >
          <p className="text-xl sm:text-2xl font-light text-foreground tabular-nums">
            {formatCurrency(paidDistAmount)}
          </p>
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground mt-1 font-light">Distributed</p>
        </motion.div>
      </div>

      {/* ── Ventures — single column on mobile ────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[11px] uppercase tracking-widest text-muted-foreground font-light">Your Ventures</h2>
          <button
            onClick={() => onNavigate("/ventures")}
            className="text-[11px] text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
          >
            View all <ArrowUpRight className="size-3" />
          </button>
        </div>

        <div className="space-y-3">
          {allVentures.slice(0, 6).map((v, i) => {
            const tc = getThemeColor(v.sector);
            return (
              <motion.div
                key={v.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 + i * 0.04, duration: 0.3 }}
                onClick={() => onNavigate(`/ventures/${v.slug}`)}
                className="client-card cursor-pointer group flex items-center gap-4"
              >
                <div
                  className="size-11 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: `${tc.color}10` }}
                >
                  <span style={{ color: tc.color }}>
                    {THEME_ICONS[v.sector] || <Package className="size-5" />}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">{v.name}</h3>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{v.sector} · {v.location}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className={cn(
                    "text-[10px] font-medium px-2 py-1 rounded-full",
                    v.status === "In progress" ? "bg-emerald-500/10 text-emerald-400" :
                    v.status === "On-Hold" ? "bg-amber-500/10 text-amber-400" :
                    v.status === "Completed" ? "bg-blue-500/10 text-blue-400" :
                    "bg-secondary text-muted-foreground"
                  )}>
                    {v.status}
                  </span>
                  <ChevronRight className="size-4 text-muted-foreground/40" />
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* ── Distributions ─────────────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[11px] uppercase tracking-widest text-muted-foreground font-light">Distributions</h2>
          <button
            onClick={() => onNavigate("/distributions")}
            className="text-[11px] text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
          >
            View all <ArrowUpRight className="size-3" />
          </button>
        </div>

        <div className="space-y-3">
          {scheduledDists.length > 0 ? (
            scheduledDists.slice(0, 3).map((dist) => (
              <div
                key={dist.id}
                onClick={() => onNavigate("/distributions")}
                className="client-card cursor-pointer flex items-center justify-between"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{dist.name}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{dist.fund}</p>
                </div>
                <div className="text-right flex-shrink-0 ml-3">
                  <p className="text-base font-light text-foreground tabular-nums">{formatCurrency(dist.amount || 0)}</p>
                  <p className="text-[10px] text-muted-foreground">{dist.distributionDate ? formatDate(dist.distributionDate) : "Pending"}</p>
                </div>
              </div>
            ))
          ) : (
            <div className="client-card text-center py-8">
              <DollarSign className="size-6 text-muted-foreground/20 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground font-light">No upcoming distributions</p>
            </div>
          )}

          {/* Recent paid */}
          {allDists.filter(d => d.status === "Paid").slice(0, 2).map((dist) => (
            <div
              key={dist.id}
              onClick={() => onNavigate("/distributions")}
              className="client-card cursor-pointer flex items-center justify-between opacity-50"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{dist.name}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{dist.fund}</p>
              </div>
              <div className="text-right flex-shrink-0 ml-3">
                <p className="text-base font-light text-foreground tabular-nums">{formatCurrency(dist.amount || 0)}</p>
                <div className="flex items-center gap-1 justify-end">
                  <span className="size-1.5 rounded-full bg-emerald-400" />
                  <span className="text-[10px] text-emerald-400">Paid</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Recent Activity ───────────────────────────────────────── */}
      <div>
        <h2 className="text-[11px] uppercase tracking-widest text-muted-foreground font-light mb-4">Recent Activity</h2>
        <div className="space-y-0">
          {activityLogs.length > 0 ? (
            activityLogs.slice(0, 5).map((log, i) => {
              const tc = getThemeColor(log.sector || "Others");
              return (
                <div key={log.id} className="flex gap-4 py-3 border-b border-border/30 last:border-0">
                  <div className="flex flex-col items-center">
                    <div className="size-2 rounded-full mt-1.5" style={{ backgroundColor: tc.color }} />
                    {i < activityLogs.length - 1 && <div className="w-px flex-1 bg-border/30 mt-1" />}
                  </div>
                  <div className="min-w-0 flex-1 pb-1">
                    <p className="text-sm text-foreground">{log.action}</p>
                    {log.detail && <p className="text-[12px] text-muted-foreground mt-0.5 line-clamp-1">{log.detail}</p>}
                    <p className="text-[11px] text-muted-foreground/50 mt-1 flex items-center gap-1">
                      <Clock className="size-3" />
                      {formatTimestamp(log.createdAt instanceof Date ? log.createdAt.toISOString() : String(log.createdAt))}
                    </p>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="client-card text-center py-8">
              <Clock className="size-6 text-muted-foreground/20 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground font-light">No recent activity</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
