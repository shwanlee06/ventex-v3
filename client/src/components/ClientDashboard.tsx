// ============================================================================
// Client Dashboard — Luxury UHNWI/HNWI Portal
// Spacious, premium, mobile-first design
// Gold accents, generous whitespace, large typography
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
  FileText,
} from "lucide-react";
import { motion } from "framer-motion";
import { useMemo } from "react";
import { Skeleton } from "@/components/ui/skeleton";

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

  // ── Data queries ──────────────────────────────────────────────────
  const venturesQ = trpc.ventures.list.useQuery();
  const spvsQ = trpc.spvs.list.useQuery();
  const distQ = trpc.distributions.list.useQuery();
  const activityQ = trpc.activity.recent.useQuery({ limit: 6 });

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
      <div className="client-portal p-5 sm:p-8 space-y-8 pb-28 md:pb-8">
        <Skeleton className="h-36 rounded-2xl" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-2xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="client-portal p-5 sm:p-8 space-y-8 pb-28 md:pb-8 max-w-5xl mx-auto">

      {/* ── Hero Greeting ─────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-card via-card to-secondary/30 p-6 sm:p-8"
      >
        <div className="relative z-10">
          <p className="client-heading text-[10px] sm:text-xs text-muted-foreground mb-2">
            Welcome back
          </p>
          <h1 className="text-2xl sm:text-3xl font-light text-foreground tracking-tight mb-1">
            {firstName}
          </h1>
          <p className="text-sm text-muted-foreground font-light">
            Your portfolio overview as of {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
          </p>

          <div className="mt-6 flex items-end gap-8 sm:gap-12">
            <div>
              <p className="client-heading text-[10px] text-muted-foreground mb-1">Portfolio Value</p>
              <p className="client-value text-3xl sm:text-4xl text-foreground">
                {formatCurrency(totalDistAmount * 8)}
              </p>
            </div>
            <div>
              <p className="client-heading text-[10px] text-muted-foreground mb-1">Performance</p>
              <div className="flex items-center gap-1.5">
                <TrendingUp className="size-4 text-emerald-400" />
                <span className="client-value text-lg text-emerald-400">+18.4%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Decorative element */}
        <div className="absolute top-0 right-0 w-48 h-48 opacity-[0.03]">
          <svg viewBox="0 0 200 200" fill="none">
            <circle cx="100" cy="100" r="80" stroke="currentColor" strokeWidth="0.5" className="text-foreground" />
            <circle cx="100" cy="100" r="60" stroke="currentColor" strokeWidth="0.5" className="text-foreground" />
            <circle cx="100" cy="100" r="40" stroke="currentColor" strokeWidth="0.5" className="text-foreground" />
          </svg>
        </div>
      </motion.div>

      {/* ── Summary Cards ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.4 }}
          onClick={() => onNavigate("/ventures")}
          className="client-card cursor-pointer"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="size-10 rounded-xl gold-bg flex items-center justify-center">
              <Layers3 className="size-5 gold-accent" />
            </div>
            <ChevronRight className="size-4 text-muted-foreground" />
          </div>
          <p className="client-heading text-[10px] text-muted-foreground mb-1">Active Ventures</p>
          <p className="client-value text-2xl text-foreground">{allVentures.filter(v => v.status === "In progress").length}</p>
          <p className="text-xs text-muted-foreground mt-1">{allVentures.length} total across {Object.keys(venturesBySector).length} sectors</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.4 }}
          onClick={() => onNavigate("/spvs")}
          className="client-card cursor-pointer"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="size-10 rounded-xl gold-bg flex items-center justify-center">
              <Briefcase className="size-5 gold-accent" />
            </div>
            <ChevronRight className="size-4 text-muted-foreground" />
          </div>
          <p className="client-heading text-[10px] text-muted-foreground mb-1">SPVs & Deals</p>
          <p className="client-value text-2xl text-foreground">{allSpvs.filter(s => s.stage === "Active deal").length}</p>
          <p className="text-xs text-muted-foreground mt-1">{allSpvs.length} total vehicles</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.4 }}
          onClick={() => onNavigate("/distributions")}
          className="client-card cursor-pointer"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="size-10 rounded-xl gold-bg flex items-center justify-center">
              <DollarSign className="size-5 gold-accent" />
            </div>
            <ChevronRight className="size-4 text-muted-foreground" />
          </div>
          <p className="client-heading text-[10px] text-muted-foreground mb-1">Distributions</p>
          <p className="client-value text-2xl text-foreground">{formatCurrency(paidDistAmount)}</p>
          <p className="text-xs text-muted-foreground mt-1">{formatCurrency(totalDistAmount - paidDistAmount)} pending</p>
        </motion.div>
      </div>

      {/* ── Venture Cards ─────────────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="client-heading text-xs text-muted-foreground">Your Ventures</h2>
          <button
            onClick={() => onNavigate("/ventures")}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
          >
            View all <ArrowUpRight className="size-3" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {allVentures.slice(0, 6).map((v, i) => {
            const tc = getThemeColor(v.sector);
            return (
              <motion.div
                key={v.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + i * 0.06, duration: 0.4 }}
                onClick={() => onNavigate(`/ventures/${v.slug}`)}
                className="client-card cursor-pointer group"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="size-10 rounded-xl flex items-center justify-center"
                      style={{ backgroundColor: `${tc.color}12` }}
                    >
                      <span style={{ color: tc.color }}>
                        {THEME_ICONS[v.sector] || <Package className="size-5" />}
                      </span>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">{v.name}</h3>
                      <p className="text-[11px] text-muted-foreground">{v.sector} · {v.location}</p>
                    </div>
                  </div>
                  <ArrowUpRight className="size-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>

                <div className="flex items-center gap-3">
                  <span className={cn(
                    "text-[11px] font-medium px-2.5 py-1 rounded-full",
                    v.status === "In progress" ? "bg-emerald-500/10 text-emerald-400" :
                    v.status === "On-Hold" ? "bg-amber-500/10 text-amber-400" :
                    v.status === "Completed" ? "bg-blue-500/10 text-blue-400" :
                    "bg-secondary text-muted-foreground"
                  )}>
                    {v.status}
                  </span>
                  <span className="text-[11px] text-muted-foreground">{v.stage}</span>
                </div>

                {v.currentStatus && (
                  <p className="text-xs text-muted-foreground mt-3 leading-relaxed line-clamp-2">{v.currentStatus}</p>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* ── Bottom Row: Upcoming Distributions + Recent Activity ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Distributions */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.4 }}
        >
          <h2 className="client-heading text-xs text-muted-foreground mb-4">Upcoming Distributions</h2>
          <div className="space-y-3">
            {scheduledDists.length > 0 ? (
              scheduledDists.map((dist) => (
                <div
                  key={dist.id}
                  onClick={() => onNavigate("/distributions")}
                  className="client-card cursor-pointer flex items-center justify-between"
                >
                  <div>
                    <p className="text-sm font-medium text-foreground">{dist.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{dist.fund}</p>
                  </div>
                  <div className="text-right">
                    <p className="client-value text-lg text-foreground">{formatCurrency(dist.amount || 0)}</p>
                    <p className="text-[11px] text-muted-foreground">{dist.distributionDate ? formatDate(dist.distributionDate) : "—"}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="client-card text-center py-8">
                <DollarSign className="size-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No upcoming distributions</p>
              </div>
            )}

            {/* Recent paid */}
            {allDists.filter(d => d.status === "Paid").slice(0, 2).map((dist) => (
              <div
                key={dist.id}
                onClick={() => onNavigate("/distributions")}
                className="client-card cursor-pointer flex items-center justify-between opacity-60"
              >
                <div>
                  <p className="text-sm font-medium text-foreground">{dist.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{dist.fund}</p>
                </div>
                <div className="text-right">
                  <p className="client-value text-lg text-foreground">{formatCurrency(dist.amount || 0)}</p>
                  <div className="flex items-center gap-1 justify-end">
                    <span className="size-1.5 rounded-full bg-emerald-400" />
                    <span className="text-[11px] text-emerald-400">Paid</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Recent Activity */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55, duration: 0.4 }}
        >
          <h2 className="client-heading text-xs text-muted-foreground mb-4">Recent Activity</h2>
          <div className="space-y-0">
            {activityLogs.length > 0 ? (
              activityLogs.slice(0, 6).map((log, i) => {
                const tc = getThemeColor(log.sector || "Others");
                return (
                  <div key={log.id} className="flex gap-4 py-3 border-b border-border/50 last:border-0">
                    <div className="flex flex-col items-center">
                      <div className="size-2.5 rounded-full mt-1" style={{ backgroundColor: tc.color }} />
                      {i < activityLogs.length - 1 && <div className="w-px flex-1 bg-border/50 mt-1" />}
                    </div>
                    <div className="min-w-0 flex-1 pb-1">
                      <p className="text-sm text-foreground">{log.action}</p>
                      {log.detail && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{log.detail}</p>}
                      <p className="text-[11px] text-muted-foreground/60 mt-1 flex items-center gap-1">
                        <Clock className="size-3" />
                        {formatTimestamp(log.createdAt instanceof Date ? log.createdAt.toISOString() : String(log.createdAt))}
                      </p>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="client-card text-center py-8">
                <Clock className="size-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No recent activity</p>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
