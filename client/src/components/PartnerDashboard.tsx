// ============================================================================
// Partner Dashboard — Dedicated view for partners
// Shows assigned ventures, tasks, and key metrics
// ============================================================================

import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import {
  Briefcase,
  Layers3,
  ListChecks,
  DollarSign,
  ChevronRight,
  AlertTriangle,
  CheckCircle2,
  Clock,
  TrendingUp,
  Activity,
} from "lucide-react";
import { motion } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useLocation } from "wouter";

interface PartnerDashboardProps {
  onNavigate: (path: string) => void;
}

export default function PartnerDashboard({ onNavigate }: PartnerDashboardProps) {
  const { user } = useAuth();
  const [, navigate] = useLocation();

  // Fetch ventures assigned to this partner
  const venturesQ = trpc.ventures.list.useQuery(undefined, { enabled: !!user });
  const tasksQ = trpc.tasks.list.useQuery(undefined, { enabled: !!user });

  const ventures = venturesQ.data ?? [];
  const tasks = tasksQ.data ?? [];

  const activeVentures = ventures.filter(v => v.status === "In progress" || v.status === "Active");
  const openTasks = tasks.filter(t => t.status !== "complete" && t.status !== "Complete");
  const overdueTasks = tasks.filter(t => {
    if (t.status === "complete" || t.status === "Complete") return false;
    if (!t.dueDate) return false;
    return new Date(t.dueDate) < new Date();
  });
  const completedTasks = tasks.filter(t => t.status === "complete" || t.status === "Complete");

  const isLoading = venturesQ.isLoading || tasksQ.isLoading;

  const STATS = [
    {
      label: "My Ventures",
      value: activeVentures.length,
      suffix: `of ${ventures.length}`,
      icon: <Layers3 className="size-4" />,
      color: "text-blue-400",
      bgColor: "bg-blue-500/10",
      onClick: () => navigate("/ventures"),
    },
    {
      label: "Open Tasks",
      value: openTasks.length,
      suffix: overdueTasks.length > 0 ? `${overdueTasks.length} overdue` : "on track",
      icon: <ListChecks className="size-4" />,
      color: overdueTasks.length > 0 ? "text-amber-400" : "text-emerald-400",
      bgColor: overdueTasks.length > 0 ? "bg-amber-500/10" : "bg-emerald-500/10",
      onClick: () => navigate("/tasks"),
    },
    {
      label: "Completed",
      value: completedTasks.length,
      suffix: tasks.length > 0 ? `${Math.round((completedTasks.length / tasks.length) * 100)}%` : "—",
      icon: <CheckCircle2 className="size-4" />,
      color: "text-emerald-400",
      bgColor: "bg-emerald-500/10",
      onClick: () => navigate("/tasks"),
    },
    {
      label: "Distributions",
      value: "—",
      suffix: "view all",
      icon: <DollarSign className="size-4" />,
      color: "text-primary",
      bgColor: "bg-primary/10",
      onClick: () => navigate("/distributions"),
    },
  ];

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Welcome header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-lg font-semibold text-foreground">
            Welcome back, {user?.name?.split(" ")[0] || "Partner"}
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Your portfolio overview and assigned ventures
          </p>
        </div>
        <Badge variant="outline" className="text-[10px] font-mono border-primary/30 text-primary">
          PARTNER
        </Badge>
      </motion.div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-lg" />
          ))
        ) : (
          STATS.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05, duration: 0.3 }}
              onClick={stat.onClick}
              className="bg-card border border-border rounded-lg p-4 flex flex-col gap-2 cursor-pointer hover:border-primary/30 hover:bg-card/80 transition-all group"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] uppercase tracking-[0.06em] text-muted-foreground font-medium">
                  {stat.label}
                </span>
                <div className={cn("flex items-center justify-center size-7 rounded-md", stat.bgColor)}>
                  <span className={stat.color}>{stat.icon}</span>
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-semibold tracking-tight text-foreground font-mono">
                  {stat.value}
                </span>
                <span className="text-[10px] text-muted-foreground font-mono">{stat.suffix}</span>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* Active Ventures */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">Active Ventures</h2>
          <Button
            variant="ghost"
            size="sm"
            className="text-xs h-7 gap-1"
            onClick={() => navigate("/ventures")}
          >
            View all <ChevronRight className="size-3" />
          </Button>
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-16 rounded-lg" />
            ))}
          </div>
        ) : activeVentures.length === 0 ? (
          <Card className="p-8 text-center bg-card border-border">
            <Layers3 className="size-8 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No active ventures assigned yet.</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Your ATLAS team will assign ventures to your portfolio.</p>
          </Card>
        ) : (
          <div className="bg-card border border-border rounded-xl divide-y divide-border">
            {activeVentures.slice(0, 6).map((v, i) => {
              const ventureTasks = tasks.filter(t => t.ventureId === v.id);
              const ventureOpen = ventureTasks.filter(t => t.status !== "complete" && t.status !== "Complete").length;
              const ventureOverdue = ventureTasks.filter(t => {
                if (t.status === "complete" || t.status === "Complete") return false;
                if (!t.dueDate) return false;
                return new Date(t.dueDate) < new Date();
              }).length;

              return (
                <motion.div
                  key={v.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 + i * 0.04, duration: 0.2 }}
                  onClick={() => navigate(`/ventures/${v.id}`)}
                  className="p-3 flex items-center justify-between cursor-pointer hover:bg-accent/30 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="size-2 rounded-full flex-shrink-0 bg-emerald-400" />
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-foreground truncate">{v.name}</p>
                      <p className="text-[10px] text-muted-foreground font-mono">
                        {v.sector || "—"} · {v.location || "—"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {ventureOverdue > 0 && (
                      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-red-500/10 text-red-400">
                        {ventureOverdue} overdue
                      </span>
                    )}
                    <span className="text-[10px] font-mono text-muted-foreground">
                      {ventureOpen} task{ventureOpen !== 1 ? "s" : ""}
                    </span>
                    <ChevronRight className="size-3.5 text-muted-foreground" />
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Overdue Tasks Alert */}
      {overdueTasks.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="p-4 bg-red-500/5 border-red-500/20">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="size-4 text-red-400" />
              <h3 className="text-sm font-semibold text-red-400">Overdue Tasks</h3>
              <span className="text-[10px] font-mono text-red-400/60">{overdueTasks.length} items</span>
            </div>
            <div className="space-y-2">
              {overdueTasks.slice(0, 5).map((task) => (
                <div
                  key={task.id}
                  onClick={() => navigate(`/tasks`)}
                  className="flex items-center justify-between py-1.5 cursor-pointer hover:bg-red-500/5 rounded px-2 -mx-2 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-xs text-foreground truncate">{task.title}</p>
                    <p className="text-[10px] text-muted-foreground font-mono">
                      Due {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : "—"}
                    </p>
                  </div>
                  <Clock className="size-3 text-red-400 flex-shrink-0" />
                </div>
              ))}
            </div>
          </Card>
        </motion.div>
      )}

      {/* Recent Activity */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Activity className="size-4 text-muted-foreground" />
            Recent Activity
          </h2>
        </div>
        <Card className="p-6 text-center bg-card border-border">
          <Activity className="size-6 text-muted-foreground/40 mx-auto mb-2" />
          <p className="text-xs text-muted-foreground">Activity feed coming soon.</p>
          <p className="text-[10px] text-muted-foreground/60 mt-1">
            You'll see venture updates, task completions, and distribution notices here.
          </p>
        </Card>
      </div>
    </div>
  );
}
