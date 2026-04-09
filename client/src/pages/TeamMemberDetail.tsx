// ============================================================================
// Team Member Profile Page — Swiss Instrument design
// Shows: profile header, assigned ventures, tasks, activity log
// Uses LIVE DB data via tRPC queries
// ============================================================================

import DashboardLayout from "@/components/DashboardLayout";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc";
import { formatDate } from "@/lib/data";
import { useParams, useLocation } from "wouter";
import { motion } from "framer-motion";
import {
  ArrowLeft, User, Briefcase, Phone, MessageCircle, Send,
  ExternalLink, CheckCircle2, Clock, AlertTriangle, ListChecks,
  Activity, Building2, ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useMemo } from "react";
import { slugify } from "@/lib/slugify";

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { bg: string; text: string }> = {
    Active: { bg: "bg-emerald-500/10 border-emerald-500/20", text: "text-emerald-400" },
    Advisor: { bg: "bg-amber-500/10 border-amber-500/20", text: "text-amber-400" },
    Contributor: { bg: "bg-blue-500/10 border-blue-500/20", text: "text-blue-400" },
  };
  const c = config[status] || config["Active"];
  return (
    <span className={cn("inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium border", c.bg, c.text)}>
      {status}
    </span>
  );
}

function TypeBadge({ type }: { type: string }) {
  const config: Record<string, { bg: string; text: string }> = {
    Internal: { bg: "bg-emerald-500/10 border-emerald-500/20", text: "text-emerald-400" },
    "External Partner": { bg: "bg-blue-500/10 border-blue-500/20", text: "text-blue-400" },
    Advisor: { bg: "bg-amber-500/10 border-amber-500/20", text: "text-amber-400" },
  };
  const c = config[type] || config["Internal"];
  return (
    <span className={cn("inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium border", c.bg, c.text)}>
      {type}
    </span>
  );
}

function getTaskStatus(task: { status: string; dueDate?: string | null }) {
  if (task.status === "complete") return "complete";
  if (!task.dueDate) return "open";
  const due = new Date(task.dueDate);
  const now = new Date();
  const diffDays = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return "overdue";
  if (diffDays <= 3) return "due-soon";
  return "open";
}

const STATUS_CONFIG: Record<string, { label: string; bg: string; dot: string }> = {
  "complete": { label: "Complete", bg: "bg-emerald-500/10 text-emerald-400", dot: "bg-emerald-400" },
  "overdue": { label: "Overdue", bg: "bg-red-500/10 text-red-400", dot: "bg-red-400" },
  "due-soon": { label: "Due Soon", bg: "bg-amber-500/10 text-amber-400", dot: "bg-amber-400" },
  "open": { label: "Open", bg: "bg-secondary text-muted-foreground", dot: "bg-muted-foreground" },
};

export default function TeamMemberDetail() {
  const params = useParams<{ slug: string }>();
  const [, navigate] = useLocation();

  // Fetch member from DB by slug
  const memberQ = trpc.team.getBySlug.useQuery(
    { slug: params.slug || "" },
    { enabled: !!params.slug }
  );

  // Fetch tasks from DB
  const tasksQ = trpc.tasks.list.useQuery(undefined, { staleTime: 30000 });

  // Fetch venture assignments
  const assignmentsQ = trpc.team.ventureAssignments.useQuery(undefined, { staleTime: 30000 });

  // Fetch activity log
  const activityQ = trpc.activity.list.useQuery(
    { limit: 20, offset: 0 },
    { staleTime: 30000 }
  );

  const member = memberQ.data;
  const isLoading = memberQ.isLoading;

  // Find ventures where this member is assigned
  const assignedVentures = useMemo(() => {
    if (!member || !assignmentsQ.data) return [];
    const memberAssignments = assignmentsQ.data.filter(
      (a: any) => a.memberId === member.id
    );
    return memberAssignments.map((a: any) => ({
      id: a.ventureId,
      name: a.ventureName || "Unknown Venture",
      sector: a.ventureSector || "Others",
      status: "In progress",
      location: "",
    }));
  }, [member, assignmentsQ.data]);

  // Find tasks assigned to this member
  const memberTasks = useMemo(() => {
    if (!member || !tasksQ.data) return [];
    const memberName = member.name.toLowerCase();
    return tasksQ.data.filter((t: any) => {
      const assignees = t.assignees || t.assignee || "";
      if (typeof assignees === "string") {
        return assignees.toLowerCase().includes(memberName);
      }
      if (Array.isArray(assignees)) {
        return assignees.some((a: string) => a.toLowerCase().includes(memberName));
      }
      return false;
    });
  }, [member, tasksQ.data]);

  // Find activity logs related to this member
  const memberActivity = useMemo(() => {
    if (!member || !activityQ.data) return [];
    const memberName = member.name.toLowerCase();
    const firstName = member.name.split(" ")[0].toLowerCase();
    return (activityQ.data.items || activityQ.data)
      .filter((log: any) => {
        const detail = (log.detail || "").toLowerCase();
        const action = (log.action || "").toLowerCase();
        const userName = (log.userName || "").toLowerCase();
        return (
          detail.includes(memberName) ||
          detail.includes(firstName) ||
          userName.includes(memberName) ||
          userName.includes(firstName)
        );
      })
      .slice(0, 8);
  }, [member, activityQ.data]);

  const openTasks = memberTasks.filter((t: any) => t.status !== "complete");
  const completedTasks = memberTasks.filter((t: any) => t.status === "complete");

  if (isLoading) {
    return (
      <DashboardLayout title="Team Member" subtitle="ATLAS">
        <div className="p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6 pb-24 md:pb-6">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-48 rounded-lg" />
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <Skeleton className="h-64 rounded-lg" />
            <Skeleton className="h-64 rounded-lg" />
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!member) {
    return (
      <DashboardLayout title="Team Member" subtitle="ATLAS">
        <div className="p-6 flex flex-col items-center justify-center min-h-[60vh]">
          <p className="text-sm text-muted-foreground mb-4">Team member not found.</p>
          <Button variant="outline" size="sm" onClick={() => navigate("/team")}>
            <ArrowLeft className="size-3.5 mr-1" /> Back to Team
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const initials = member.name
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <DashboardLayout title={member.name} subtitle="TEAM MEMBER PROFILE">
      <div className="p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6 pb-24 md:pb-6">
        {/* Back button */}
        <motion.div
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.2 }}
        >
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-muted-foreground hover:text-foreground gap-1.5"
            onClick={() => navigate("/team")}
          >
            <ArrowLeft className="size-3.5" /> Back to Team
          </Button>
        </motion.div>

        {/* Profile Header */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="bg-card border-border p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              {/* Avatar */}
              <div className="flex items-center justify-center size-16 rounded-full bg-primary/10 border border-primary/20 flex-shrink-0">
                <span className="text-lg font-semibold text-primary font-mono">
                  {initials}
                </span>
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 flex-wrap">
                  <h1 className="text-xl font-semibold text-foreground">{member.name}</h1>
                  <StatusBadge status={member.status || "Active"} />
                  <TypeBadge type={member.type || "Internal"} />
                </div>
                <p className="text-sm text-muted-foreground mt-1">{member.role}</p>
                {member.memberFunction && (
                  <p className="text-xs text-muted-foreground font-mono mt-0.5">
                    {member.memberFunction}
                  </p>
                )}
              </div>

              {/* Contact buttons */}
              <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
                {member.whatsapp && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs gap-1.5 h-9 min-h-[36px] touch-manipulation"
                    onClick={() => window.open(`https://wa.me/${member.whatsapp?.replace(/[^0-9]/g, "")}`, "_blank")}
                  >
                    <Phone className="size-3.5" /> WhatsApp
                  </Button>
                )}
                {member.telegram && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs gap-1.5"
                    onClick={() => window.open(`https://t.me/${member.telegram?.replace("@", "")}`, "_blank")}
                  >
                    <Send className="size-3.5" /> Telegram
                  </Button>
                )}
              </div>
            </div>

            {/* Notes */}
            {member.notes && (
              <div className="mt-4 pt-4 border-t border-border">
                <p className="text-[10px] uppercase tracking-[0.06em] text-muted-foreground font-medium mb-1">
                  Notes
                </p>
                <p className="text-xs text-foreground leading-relaxed">{member.notes}</p>
              </div>
            )}

            {/* Stats row */}
            <div className="mt-4 pt-4 border-t border-border flex items-center gap-6">
              <div className="flex flex-col">
                <span className="text-lg font-semibold font-mono text-foreground">
                  {assignedVentures.length}
                </span>
                <span className="text-[10px] text-muted-foreground">Ventures</span>
              </div>
              <div className="flex flex-col">
                <span className="text-lg font-semibold font-mono text-foreground">
                  {openTasks.length}
                </span>
                <span className="text-[10px] text-muted-foreground">Open Tasks</span>
              </div>
              <div className="flex flex-col">
                <span className="text-lg font-semibold font-mono text-foreground">
                  {completedTasks.length}
                </span>
                <span className="text-[10px] text-muted-foreground">Completed</span>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Two-column layout */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* Assigned Ventures */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.3 }}
          >
            <Card className="bg-card border-border">
              <div className="p-4 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Building2 className="size-4 text-primary" />
                  <h2 className="text-sm font-semibold text-foreground">Assigned Ventures</h2>
                </div>
                <span className="text-[10px] font-mono text-muted-foreground">
                  {assignedVentures.length} ventures
                </span>
              </div>
              {assignedVentures.length === 0 ? (
                <div className="p-8 text-center">
                  <Building2 className="size-8 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground">No ventures assigned</p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {assignedVentures.map((v: any) => (
                    <div
                      key={v.id}
                      className="p-3 flex items-center justify-between cursor-pointer hover:bg-accent/30 transition-colors group"
                      onClick={() => navigate(`/ventures/${slugify(v.name)}`)}
                    >
                      <div>
                        <span className="text-xs font-medium text-foreground">{v.name}</span>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] font-mono text-muted-foreground">{v.sector}</span>
                          {v.location && v.location !== "TBD" && (
                            <span className="text-[10px] text-muted-foreground">{v.location}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            "text-[10px] font-medium px-1.5 py-0.5 rounded",
                            v.status === "In progress"
                              ? "bg-emerald-500/10 text-emerald-400"
                              : v.status === "On-Hold"
                              ? "bg-amber-500/10 text-amber-400"
                              : v.status === "Completed"
                              ? "bg-blue-500/10 text-blue-400"
                              : "bg-secondary text-muted-foreground"
                          )}
                        >
                          {v.status}
                        </span>
                        <ChevronRight className="size-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </motion.div>

          {/* Tasks */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.3 }}
          >
            <Card className="bg-card border-border">
              <div className="p-4 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ListChecks className="size-4 text-primary" />
                  <h2 className="text-sm font-semibold text-foreground">Tasks</h2>
                </div>
                <span className="text-[10px] font-mono text-muted-foreground">
                  {openTasks.length} open · {completedTasks.length} done
                </span>
              </div>
              {memberTasks.length === 0 ? (
                <div className="p-8 text-center">
                  <ListChecks className="size-8 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground">No tasks assigned</p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {[...memberTasks]
                    .sort((a: any, b: any) => (a.status === "complete" ? 1 : 0) - (b.status === "complete" ? 1 : 0))
                    .map((task: any) => {
                      const resolvedStatus = getTaskStatus(task);
                      const sc = STATUS_CONFIG[resolvedStatus];
                      return (
                        <div key={task.id} className="p-3">
                          <div className="flex items-center justify-between">
                            <span
                              className={cn(
                                "text-xs font-medium text-foreground",
                                task.status === "complete" && "line-through opacity-50"
                              )}
                            >
                              {task.title}
                            </span>
                            <span
                              className={cn(
                                "inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded",
                                sc.bg
                              )}
                            >
                              <span className={cn("size-1.5 rounded-full", sc.dot)} />
                              {sc.label}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            {task.dueDate && (
                              <span className="text-[10px] font-mono text-muted-foreground">
                                Due {formatDate(task.dueDate)}
                              </span>
                            )}
                            {task.priority && (
                              <span
                                className={cn(
                                  "text-[10px] font-medium px-1 py-0.5 rounded",
                                  task.priority === "High"
                                    ? "bg-red-500/10 text-red-400"
                                    : task.priority === "Medium"
                                    ? "bg-amber-500/10 text-amber-400"
                                    : "bg-secondary text-muted-foreground"
                                )}
                              >
                                {task.priority}
                              </span>
                            )}
                            {task.ventureLink && (
                              <span className="text-[10px] text-primary">{task.ventureLink}</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </Card>
          </motion.div>
        </div>

        {/* Activity Log */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.3 }}
        >
          <Card className="bg-card border-border">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="size-4 text-primary" />
                <h2 className="text-sm font-semibold text-foreground">Recent Activity</h2>
              </div>
              <span className="text-[10px] font-mono text-muted-foreground">
                {memberActivity.length} events
              </span>
            </div>
            {memberActivity.length === 0 ? (
              <div className="p-8 text-center">
                <Activity className="size-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">No recent activity</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {memberActivity.map((log: any) => (
                  <div key={log.id} className="p-3 flex gap-3">
                    <div className="size-1.5 rounded-full mt-1.5 flex-shrink-0 bg-primary/60" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-foreground">{log.action}</span>
                        <span className="text-[10px] font-mono text-muted-foreground">
                          {log.createdAt ? new Date(log.createdAt).toLocaleDateString() : ""}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">{log.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </motion.div>
      </div>
    </DashboardLayout>
  );
}
