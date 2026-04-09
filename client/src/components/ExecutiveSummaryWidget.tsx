// ============================================================================
// Executive Summary Widget — Shows key leadership team members with real data
// Pulls from team.listInternal and displays CEO, CFO, COO, etc.
// ============================================================================

import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc";
import { Users, Crown, ChevronRight, Mail, Phone } from "lucide-react";
import { motion } from "framer-motion";
import { useMemo, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { useLocation } from "wouter";

// Executive-level roles to highlight (order matters)
const EXEC_ROLES = [
  "CEO", "Chief Executive Officer",
  "CFO", "Chief Financial Officer",
  "COO", "Chief Operating Officer",
  "CTO", "Chief Technology Officer",
  "Managing Director", "Director",
  "Partner", "General Partner",
  "Head of Operations", "Head of Finance",
  "VP", "Vice President",
];

function isExecutive(role: string | null | undefined): boolean {
  if (!role) return false;
  const r = role.toLowerCase();
  return EXEC_ROLES.some(exec => r.includes(exec.toLowerCase()));
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map(w => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export default function ExecutiveSummaryWidget() {
  const teamQ = trpc.team.listInternal.useQuery();
  const [, navigate] = useLocation();

  const executives = useMemo(() => {
    if (!teamQ.data) return [];
    // Filter to executive-level roles, sorted by sortOrder
    const execs = teamQ.data
      .filter(m => m.status === "Active" && (isExecutive(m.role) || isExecutive(m.memberFunction)))
      .sort((a, b) => (a.sortOrder ?? 100) - (b.sortOrder ?? 100));
    return execs.slice(0, 5); // Show top 5
  }, [teamQ.data]);

  const totalInternal = teamQ.data?.filter(m => m.status === "Active").length ?? 0;

  if (teamQ.isLoading) {
    return <Skeleton className="h-32 rounded-xl" />;
  }

  if (executives.length === 0) {
    return null; // Don't show widget if no executives found
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.15 }}
      className="bg-card border border-border rounded-xl overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/30">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center size-7 rounded-md bg-primary/10">
            <Crown className="size-4 text-primary" />
          </div>
          <span className="text-sm font-semibold text-foreground">Leadership Team</span>
          <span className="text-[10px] font-mono text-muted-foreground">
            {executives.length} exec{executives.length !== 1 ? "s" : ""} · {totalInternal} total
          </span>
        </div>
        <button
          onClick={() => navigate("/atlas-team")}
          className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
        >
          View all <ChevronRight className="size-3" />
        </button>
      </div>

      {/* Executive cards */}
      <div className="p-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-2">
        {executives.map((exec, i) => (
          <motion.div
            key={exec.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 + i * 0.04, duration: 0.2 }}
            onClick={() => navigate(`/atlas-team/${exec.id}`)}
            className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent/30 transition-colors cursor-pointer group"
          >
            {/* Avatar */}
            {exec.avatarUrl || exec.photoUrl ? (
              <img
                src={exec.avatarUrl || exec.photoUrl || ""}
                alt={exec.name}
                className="size-9 rounded-full object-cover flex-shrink-0 border border-border"
              />
            ) : (
              <div className="size-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 border border-border">
                <span className="text-xs font-medium text-primary">{getInitials(exec.name)}</span>
              </div>
            )}

            {/* Info */}
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-foreground truncate group-hover:text-primary transition-colors">
                {exec.name}
              </p>
              <p className="text-[10px] text-muted-foreground truncate">
                {exec.role || exec.memberFunction || "Executive"}
              </p>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
