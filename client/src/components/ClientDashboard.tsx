// Client Dashboard — Premium, Outcome-Focused, Action-Oriented
// Action cards replace static stats · Stage bars · Sector pills
// No agent internals visible · Clean, confident English

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
  ArrowRight,
  ChevronRight,
  TrendingUp,
  Building2,
  Ship,
  UtensilsCrossed,
  Clapperboard,
  Fuel,
  Package,
  Clock,
  AlertTriangle,
  ListChecks,
  CheckCircle2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useMemo, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import VelocityFeed from "@/components/VelocityFeed";
import AdvanceBanner from "@/components/AdvanceBanner";
import VentexActivitySection from "@/components/VentexActivitySection";

const SECTOR_COLORS: Record<string, string> = {
  "Real Estate": "#3B82F6",
  "Yacht": "#06B6D4",
  "F&B": "#F59E0B",
  "Entertainment": "#8B5CF6",
  "Oil & Gas": "#EF4444",
  "Others": "#6B7280",
};

function getSectorColor(sector: string): string {
  return SECTOR_COLORS[sector] || SECTOR_COLORS["Others"];
}

function PieChart({ slices }: { slices: { label: string; value: number; color: string }[] }) {
  const total = slices.reduce((s, sl) => s + sl.value, 0);
  if (total === 0) return null;

  let cumAngle = -90; // start from top
  const paths = slices.map((sl) => {
    const pct = sl.value / total;
    const angle = pct * 360;
    const startAngle = cumAngle;
    const endAngle = cumAngle + angle;
    cumAngle = endAngle;

    const startRad = (startAngle * Math.PI) / 180;
    const endRad = (endAngle * Math.PI) / 180;
    const x1 = 100 + 80 * Math.cos(startRad);
    const y1 = 100 + 80 * Math.sin(startRad);
    const x2 = 100 + 80 * Math.cos(endRad);
    const y2 = 100 + 80 * Math.sin(endRad);
    const largeArc = angle > 180 ? 1 : 0;

    // For single-slice, draw a full circle
    if (pct >= 0.999) {
      return (
        <circle key={sl.label} cx="100" cy="100" r="80" fill={sl.color} />
      );
    }

    return (
      <path
        key={sl.label}
        d={`M 100 100 L ${x1} ${y1} A 80 80 0 ${largeArc} 1 ${x2} ${y2} Z`}
        fill={sl.color}
        className="transition-opacity hover:opacity-80"
      />
    );
  });

  return (
    <svg viewBox="0 0 200 200" className="w-full h-full">
      {paths}
      {/* Inner circle for donut effect */}
      <circle cx="100" cy="100" r="50" className="fill-card" />
    </svg>
  );
}

const THEME_ICONS: Record<string, React.ReactNode> = {
  "Real Estate": <Building2 className="size-5" />,
  "Yacht": <Ship className="size-5" />,
  "F&B": <UtensilsCrossed className="size-5" />,
  "Entertainment": <Clapperboard className="size-5" />,
  "Oil & Gas": <Fuel className="size-5" />,
  "Others": <Package className="size-5" />,
};

// -- Stage Progress Bar --------------------------------------------------

const VENTURE_STAGES = ["In Validation", "In Fundraising", "Active", "Completed"];

function StageProgressBar({ currentStage }: { currentStage: string }) {
  const currentIndex = VENTURE_STAGES.indexOf(currentStage);

  return (
    <div className="flex items-center gap-1 mt-3">
      {VENTURE_STAGES.map((stage, i) => {
        const isCompleted = i < currentIndex;
        const isCurrent = i === currentIndex;
        return (
          <div key={stage} className="flex items-center gap-1 flex-1">
            <div
              className={cn(
                "h-1.5 rounded-full flex-1 transition-all",
                isCompleted ? "bg-emerald-500" :
                isCurrent ? "bg-primary" :
                "bg-secondary/50"
              )}
            />
            {i < VENTURE_STAGES.length - 1 && (
              <div className="size-0.5 rounded-full bg-border/50 flex-shrink-0" />
            )}
          </div>
        );
      })}
    </div>
  );
}

// -- Sector Filter Pills -------------------------------------------------

function SectorPills({
  sectors,
  active,
  onSelect,
}: {
  sectors: { name: string; count: number }[];
  active: string | null;
  onSelect: (name: string | null) => void;
}) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <button
        onClick={() => onSelect(null)}
        className={cn(
          "px-3 py-1.5 rounded-full text-[11px] font-medium transition-all",
          !active
            ? "bg-primary/10 text-primary border border-primary/20"
            : "bg-secondary/30 text-muted-foreground hover:text-foreground border border-transparent"
        )}
      >
        All ({sectors.reduce((s, sec) => s + sec.count, 0)})
      </button>
      {sectors.map((sec) => {
        const tc = getThemeColor(sec.name);
        const isActive = active === sec.name;
        return (
          <button
            key={sec.name}
            onClick={() => onSelect(isActive ? null : sec.name)}
            className={cn(
              "px-3 py-1.5 rounded-full text-[11px] font-medium transition-all flex items-center gap-1.5",
              isActive
                ? "border border-primary/20"
                : "bg-secondary/30 text-muted-foreground hover:text-foreground border border-transparent"
            )}
            style={isActive ? { backgroundColor: `${tc.color}15`, color: tc.color } : undefined}
          >
            {sec.name} ({sec.count})
          </button>
        );
      })}
    </div>
  );
}

// -- Advance Banner Section ------------------------------------------------

function AdvanceBannerSection() {
  const { activeOrg } = useWorkspace();
  const feedQ = trpc.agents.clientFeed.useQuery(
    activeOrg?.id ? { organizationId: activeOrg.id } : undefined
  );

  const readyVentures = useMemo(() => {
    if (!feedQ.data) return [];
    const { actionNeeded } = feedQ.data;
    return actionNeeded
      .filter((e: any) => {
        const payload = (e.actionPayload || {}) as Record<string, unknown>;
        return e.actionType === "advance" && payload.nextStage;
      })
      .map((e: any) => {
        const payload = (e.actionPayload || {}) as Record<string, unknown>;
        return {
          eventId: e.id,
          ventureId: Number(payload.ventureId || e.agentEntityId),
          ventureName: String(payload.ventureName || e.agentEntityName || "Venture"),
          currentStage: String(payload.currentStage || e.oldStatus || ""),
          nextStage: String(payload.nextStage || ""),
          daysInStage: Number(payload.daysInStage || 0),
          completedTasks: Number(payload.completedTasks || 0),
          isCapitalStage: Boolean(payload.isCapitalStage),
        };
      });
  }, [feedQ.data]);

  if (readyVentures.length === 0) return null;

  return <AdvanceBanner readyVentures={readyVentures} />;
}

// -- Your Progress Section (Mechanic 3) ---------------------------------------

function YourProgressSection() {
  const { activeOrg } = useWorkspace();
  const velocityQ = trpc.agents.velocityMetrics.useQuery(
    activeOrg?.id ? { organizationId: activeOrg.id } : undefined
  );

  const metrics = velocityQ.data;
  const recentAdvances = metrics?.recentAdvances ?? [];

  // Group advances by venture for per-venture progress
  // NOTE: useMemo must always be called (React hooks rule) — guard with empty array instead of early return
  const ventureProgress = useMemo(() => {
    if (recentAdvances.length === 0) return [];
    const map: Record<string, { name: string; advances: number; lastStage: string; avgDays: number; totalDays: number }> = {};
    for (const adv of recentAdvances) {
      const key = String(adv.ventureId);
      if (!map[key]) {
        map[key] = { name: adv.ventureName, advances: 0, lastStage: adv.toStage, avgDays: 0, totalDays: 0 };
      }
      map[key].advances += 1;
      map[key].totalDays += adv.daysInStage;
      map[key].lastStage = adv.toStage;
    }
    return Object.values(map)
      .map(v => ({ ...v, avgDays: Math.round(v.totalDays / v.advances) }))
      .sort((a, b) => b.advances - a.advances);
  }, [recentAdvances]);

  // Early return AFTER all hooks
  if (!metrics || metrics.totalAdvances === 0) return null;

  const { avgDays, totalAdvances } = metrics;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-[11px] uppercase tracking-widest text-muted-foreground font-light">Your Progress</h2>
        <span className="text-[10px] font-mono text-muted-foreground">
          {totalAdvances} status advance{totalAdvances !== 1 ? "s" : ""} · {avgDays !== null ? `${avgDays}d avg` : ""}
        </span>
      </div>

      <div className="space-y-2">
        {ventureProgress.slice(0, 5).map((vp) => (
          <div
            key={vp.name}
            className="client-card flex items-center justify-between"
          >
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-foreground truncate">{vp.name}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Current: {vp.lastStage} · {vp.advances} advance{vp.advances !== 1 ? "s" : ""}
              </p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0 ml-3">
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(vp.advances, 5) }).map((_, i) => (
                  <div
                    key={i}
                    className="size-1.5 rounded-full bg-emerald-400"
                  />
                ))}
                {vp.advances > 5 && (
                  <span className="text-[9px] text-muted-foreground ml-0.5">+{vp.advances - 5}</span>
                )}
              </div>
              <span className="text-[10px] font-mono text-muted-foreground">{vp.avgDays}d avg</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// -- Main Component ------------------------------------------------------

interface ClientDashboardProps {
  onNavigate: (path: string) => void;
}

export default function ClientDashboard({ onNavigate }: ClientDashboardProps) {
  const { user } = useAuth();
  const { activeOrg } = useWorkspace();
  const orgFilter = activeOrg?.id ? { organizationId: activeOrg.id } : undefined;
  const [activeSector, setActiveSector] = useState<string | null>(null);
  const [showPortfolioBreakdown, setShowPortfolioBreakdown] = useState(false);

  // -- Data queries (scoped by active org) ----------------------
  const venturesQ = trpc.ventures.list.useQuery(orgFilter);
  const spvsQ = trpc.spvs.list.useQuery(orgFilter);
  const distQ = trpc.distributions.list.useQuery(orgFilter);
  const tasksQ = trpc.tasks.list.useQuery(orgFilter);
  const activityQ = trpc.activity.recent.useQuery({ limit: 5, organizationId: activeOrg?.id });

  const pageLoading = venturesQ.isLoading;

  const allVentures = venturesQ.data || [];
  const allSpvs = spvsQ.data || [];
  const allDists = distQ.data || [];
  const allTasks = tasksQ.data || [];
  const activityLogsRaw: (typeof activityQ.data extends (infer T)[] | undefined ? (T & { activitySource?: string }) : never)[] = activityQ.data || [];
  // Filter out internal ops and system entries for client view
  const activityLogs = activityLogsRaw.filter(e => {
    const src = e.activitySource;
    return src !== "atlas_ops" && src !== "system";
  });

  // Derived stats
  const totalDistAmount = allDists.reduce((s, d) => s + (d.amount || 0), 0);
  const paidDistAmount = allDists.filter(d => d.status === "Paid").reduce((s, d) => s + (d.amount || 0), 0);
  const scheduledDists = allDists.filter(d => d.status === "Scheduled");
  const nextDist = scheduledDists[0];

  // Task stats
  const overdueTasks = allTasks.filter(t => {
    if (t.status === "complete") return false;
    if (!t.dueDate) return false;
    return new Date(t.dueDate) < new Date();
  });
  const openTasks = allTasks.filter(t => t.status !== "complete");
  const taskSectors = useMemo(() => {
    // Tasks don't have sector directly, derive from venture link
    return "";
  }, [overdueTasks]);

  // Sectors
  const sectors = useMemo(() => {
    const map: Record<string, number> = {};
    for (const v of allVentures) {
      map[v.sector] = (map[v.sector] || 0) + 1;
    }
    return Object.entries(map)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [allVentures]);

  // Filtered ventures
  const filteredVentures = useMemo(() => {
    if (!activeSector) return allVentures;
    return allVentures.filter(v => v.sector === activeSector);
  }, [allVentures, activeSector]);

  const clientName = user?.name || "Partner";

  if (pageLoading) {
    return (
      <div className="client-portal px-3 sm:px-5 md:px-8 py-6 sm:py-8 space-y-6 pb-28 md:pb-8 max-w-3xl mx-auto">
        <Skeleton className="h-40 rounded-2xl" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-32 rounded-2xl" />
        <Skeleton className="h-32 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="client-portal px-3 sm:px-5 md:px-8 py-6 sm:py-8 space-y-6 sm:space-y-8 pb-28 md:pb-8 max-w-3xl mx-auto">

      {/* -- Hero Greeting ------------------------------------------- */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="rounded-2xl border border-border bg-card p-6 sm:p-8"
      >
        <p className="text-[11px] uppercase tracking-widest text-muted-foreground mb-3 font-light">
          Welcome back
        </p>
        <h1 className="text-2xl sm:text-3xl font-light text-foreground tracking-tight capitalize">
          {clientName}
        </h1>
        <p className="text-sm text-muted-foreground mt-1 font-light">
          {new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
        </p>

        <button
          onClick={() => setShowPortfolioBreakdown(true)}
          className="mt-6 flex items-end gap-6 sm:gap-8 w-full text-left group cursor-pointer hover:opacity-90 transition-opacity"
        >
          <div>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1 font-light">Active Ventures</p>
            <p className="text-2xl sm:text-3xl font-light text-foreground tabular-nums tracking-tight">
              {allVentures.filter(v => v.status === "In progress").length}
            </p>
            <p className="text-[11px] text-muted-foreground/50 mt-0.5">
              of {allVentures.length} total
            </p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1 font-light">Distributed</p>
            <p className="text-2xl sm:text-3xl font-light text-emerald-400 tabular-nums tracking-tight">
              {paidDistAmount >= 1_000_000 ? `$${(paidDistAmount / 1_000_000).toFixed(1)}M` : formatCurrency(paidDistAmount)}
            </p>
            <p className="text-[11px] text-muted-foreground/50 mt-0.5">
              {scheduledDists.length > 0 ? `${scheduledDists.length} upcoming` : "all settled"}
            </p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1 font-light">Open Tasks</p>
            <p className="text-2xl sm:text-3xl font-light text-foreground tabular-nums tracking-tight">
              {openTasks.length}
            </p>
            <p className="text-[11px] text-muted-foreground/50 mt-0.5">
              {overdueTasks.length > 0 ? `${overdueTasks.length} overdue` : "on track"}
            </p>
          </div>
          {allSpvs.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1 font-light">SPVs</p>
              <p className="text-2xl sm:text-3xl font-light text-foreground tabular-nums tracking-tight">
                {allSpvs.length}
              </p>
              <p className="text-[11px] text-muted-foreground/50 mt-0.5">
                {allSpvs.filter((s: any) => s.stage === "Active deal").length} active
              </p>
            </div>
          )}
          <span className="text-[10px] text-muted-foreground/40 ml-auto group-hover:text-muted-foreground transition-colors hidden sm:block">Tap for breakdown</span>
        </button>
      </motion.div>

      {/* -- VENTEX Activity ------------------------------------------ */}
      <VentexActivitySection />

      {/* -- Action Cards (Section 9A) ----------------------------- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Card 1: Tasks need attention */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.3 }}
          className="client-card relative overflow-hidden"
        >
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-amber-500 rounded-l-2xl" />
          <div className="pl-4 py-4 pr-4">
            <div className="flex items-center gap-2 mb-2">
              <ListChecks className="size-4 text-amber-400" />
              <span className="text-xs font-medium text-foreground">
                {openTasks.length} task{openTasks.length !== 1 ? "s" : ""} need attention
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed mb-3">
              {overdueTasks.length > 0
                ? `${overdueTasks.length} overdue · ${openTasks.length - overdueTasks.length} open${taskSectors ? ` across ${taskSectors}` : ""}`
                : `${openTasks.length} open tasks across your ventures`
              }
            </p>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-[11px] text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 gap-1 px-0"
              onClick={() => onNavigate("/tasks")}
            >
              Review Tasks <ArrowRight className="size-3" />
            </Button>
          </div>
        </motion.div>

        {/* Card 2: AI Drafts ready for review */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.3 }}
          className="client-card relative overflow-hidden"
        >
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500 rounded-l-2xl" />
          <div className="pl-4 py-4 pr-4">
            <div className="flex items-center gap-2 mb-2">
              <Briefcase className="size-4 text-blue-400" />
              <span className="text-xs font-medium text-foreground">
                {allVentures.length} venture{allVentures.length !== 1 ? "s" : ""} in portfolio
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed mb-3">
              {allVentures.filter(v => v.status === "In progress").length} active across {sectors.length} sector{sectors.length !== 1 ? "s" : ""}
            </p>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-[11px] text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 gap-1 px-0"
              onClick={() => onNavigate("/ventures")}
            >
              View Ventures <ArrowRight className="size-3" />
            </Button>
          </div>
        </motion.div>

        {/* Card 3: Distributions */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.3 }}
          className="client-card relative overflow-hidden"
        >
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500 rounded-l-2xl" />
          <div className="pl-4 py-4 pr-4">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="size-4 text-emerald-400" />
              <span className="text-xs font-medium text-foreground">
                {formatCurrency(paidDistAmount)} distributed
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed mb-3">
              {nextDist
                ? `Next: ${nextDist.name} · ${formatCurrency(nextDist.amount || 0)}${nextDist.distributionDate ? ` · ${formatDate(nextDist.distributionDate)}` : ""}`
                : "No upcoming distributions scheduled"
              }
            </p>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-[11px] text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 gap-1 px-0"
              onClick={() => onNavigate("/distributions")}
            >
              View Distributions <ArrowRight className="size-3" />
            </Button>
          </div>
        </motion.div>
      </div>

      {/* -- Advance Banners (Mode B — ready to advance) ---------------- */}
      <AdvanceBannerSection />

      {/* -- Velocity Feed ------------------------------------------------- */}
      <VelocityFeed onNavigate={onNavigate} />

      {/* Ventures section removed — available via dedicated Ventures tab */}

      {/* -- Distributions ------------------------------------------- */}
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

        {/* Summary pills (Section 9D preview) */}
        <div className="flex items-center gap-2 mb-4">
          <span className="px-3 py-1 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
            <CheckCircle2 className="size-3" />
            Received {formatCurrency(paidDistAmount)}
          </span>
          {scheduledDists.length > 0 && (
            <span className="px-3 py-1 rounded-full text-[11px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-1">
              <Clock className="size-3" />
              Upcoming {formatCurrency(scheduledDists.reduce((s, d) => s + (d.amount || 0), 0))}
            </span>
          )}
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
      {/* -- Your Progress (Mechanic 3) ---------------------------------- */}
      <YourProgressSection />
      {/* -- Recent Activity ----------------------------------------- */}
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

      {/* -- Portfolio Breakdown Dialog -------------------------------- */}
      <Dialog open={showPortfolioBreakdown} onOpenChange={setShowPortfolioBreakdown}>
        <DialogContent className="sm:max-w-md bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold text-foreground">
              Portfolio Breakdown
            </DialogTitle>
          </DialogHeader>

          {(() => {
            // Build sector allocation from ventures
            const sectorMap: Record<string, { count: number; value: number }> = {};
            // Use total distribution amount as portfolio metric (real data)
            for (const v of allVentures) {
              if (!sectorMap[v.sector]) sectorMap[v.sector] = { count: 0, value: 0 };
              sectorMap[v.sector].count += 1;
            }
            // Show venture count per sector (real data)
            const totalVentureCount = allVentures.length || 1;
            const sectorEntries = Object.entries(sectorMap)
              .sort((a, b) => b[1].count - a[1].count);

            const pieSlices = sectorEntries.map(([sector, data]) => ({
              label: sector,
              value: data.count,
              color: getSectorColor(sector),
            }));

            return (
              <div className="space-y-6">
                {/* Total ventures */}
                <div className="text-center">
                  <p className="text-3xl font-light text-foreground tabular-nums tracking-tight">
                    {allVentures.length} Ventures
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">{allVentures.filter(v => v.status === "In progress").length} active across {sectorEntries.length} sectors</p>
                </div>

                {/* Pie chart */}
                <div className="flex justify-center">
                  <div className="size-48">
                    <PieChart slices={pieSlices} />
                  </div>
                </div>

                {/* Legend / breakdown list */}
                <div className="space-y-2">
                  {sectorEntries.map(([sector, data]) => {
                    const pct = totalVentureCount > 0 ? ((data.count / totalVentureCount) * 100).toFixed(1) : "0";
                    return (
                      <div key={sector} className="flex items-center justify-between py-2 border-b border-border/30 last:border-0">
                        <div className="flex items-center gap-3">
                          <div
                            className="size-3 rounded-full flex-shrink-0"
                            style={{ backgroundColor: getSectorColor(sector) }}
                          />
                          <div>
                            <p className="text-sm font-medium text-foreground">{sector}</p>
                            <p className="text-[11px] text-muted-foreground">
                              {data.count} venture{data.count !== 1 ? "s" : ""}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-foreground tabular-nums">
                            {data.count} venture{data.count !== 1 ? "s" : ""}
                          </p>
                          <p className="text-[11px] text-muted-foreground tabular-nums">{pct}%</p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Distribution summary */}
                <div className="bg-secondary/30 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-muted-foreground">Total Distributed</span>
                    <span className="text-sm font-medium text-emerald-400 tabular-nums">{formatCurrency(paidDistAmount)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Upcoming</span>
                    <span className="text-sm font-medium text-amber-400 tabular-nums">
                      {formatCurrency(scheduledDists.reduce((s, d) => s + (d.amount || 0), 0))}
                    </span>
                  </div>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
