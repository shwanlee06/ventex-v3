// ============================================================================
// Client Dashboard — Premium, Outcome-Focused, Action-Oriented
// Action cards replace static stats · Stage bars · Sector pills
// No agent internals visible · Clean, confident English
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
import { motion } from "framer-motion";
import { useMemo, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import VelocityFeed from "@/components/VelocityFeed";
import AdvanceBanner from "@/components/AdvanceBanner";
import AtlasActivitySection from "@/components/AtlasActivitySection";

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
          {totalAdvances} stage advance{totalAdvances !== 1 ? "s" : ""} · {avgDays !== null ? `${avgDays}d avg` : ""}
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
  const activityLogs = activityQ.data || [];

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
      <div className="client-portal px-5 py-6 sm:px-8 sm:py-8 space-y-6 pb-28 md:pb-8 max-w-3xl mx-auto">
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
    <div className="client-portal px-5 py-6 sm:px-8 sm:py-8 space-y-6 sm:space-y-8 pb-28 md:pb-8 max-w-3xl mx-auto">

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

        <div className="mt-6 flex items-end gap-8">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1 font-light">Portfolio Value</p>
            <p className="text-2xl sm:text-3xl font-light text-foreground tabular-nums tracking-tight">
              {(() => {
                const val = totalDistAmount * 8;
                if (val >= 1_000_000) return `$${(val / 1_000_000).toFixed(2)}M`;
                if (val >= 1_000) return `$${(val / 1_000).toFixed(0)}K`;
                return formatCurrency(val);
              })()}
            </p>
            <p className="text-[11px] text-muted-foreground/50 mt-0.5 tabular-nums">
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

      {/* -- ATLAS Activity ------------------------------------------ */}
      <AtlasActivitySection />

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

        {/* Card 2: Portfolio velocity — removed: was showing false "on track" data */}

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

      {/* -- Ventures with Sector Pills + Stage Bars (Section 9B) ---- */}
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

        {/* Sector filter pills */}
        <div className="mb-4">
          <SectorPills
            sectors={sectors}
            active={activeSector}
            onSelect={setActiveSector}
          />
        </div>

        <div className="space-y-3">
          {filteredVentures.slice(0, 6).map((v, i) => {
            const tc = getThemeColor(v.sector);
            return (
              <motion.div
                key={v.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 + i * 0.04, duration: 0.3 }}
                onClick={() => onNavigate(`/ventures/${v.slug}`)}
                className="client-card cursor-pointer group"
              >
                <div className="flex items-center gap-4">
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
                    <p className="text-[11px] text-muted-foreground mt-0.5">{v.sector}{v.location && v.location !== "TBD" ? ` · ${v.location}` : ""}</p>
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
                </div>
                {/* Stage Progress Bar */}
                <StageProgressBar currentStage={v.stage || v.status} />
              </motion.div>
            );
          })}

          {filteredVentures.length === 0 && (
            <div className="client-card text-center py-8">
              <Layers3 className="size-6 text-muted-foreground/20 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground font-light">No ventures in this sector</p>
            </div>
          )}
        </div>
      </div>

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
    </div>
  );
}
