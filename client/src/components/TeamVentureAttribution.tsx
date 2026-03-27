// ============================================================================
// Team Venture Attribution — Upgrade 6
// Mini-table: Member Name | Ventures Assigned | Role Badge
// Replaces flat member list in ClientDetail bottom section
// ============================================================================

import { cn } from "@/lib/utils";
import { Users, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import { useMemo } from "react";
import { Button } from "@/components/ui/button";

interface TeamMember {
  id: number;
  name: string;
  type: string | null;
  title?: string | null;
  role?: string | null;
  memberFunction?: string | null;
  [key: string]: unknown;
}

interface VentureAssignment {
  id: number;
  ventureId: number;
  memberId: number;
  ventureName: string | null;
  ventureSector: string | null;
  memberName: string | null;
  memberRole: string | null;
  memberFunction: string | null;
  memberType: string | null;
  responsibility: string | null;
}

interface TeamVentureAttributionProps {
  members: TeamMember[];
  venturesByMember: Record<number, VentureAssignment[]>;
  onNavigateToTeam?: () => void;
}

const TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  "Internal": { bg: "bg-blue-500/10", text: "text-blue-400" },
  "External Partner": { bg: "bg-emerald-500/10", text: "text-emerald-400" },
  "Advisor": { bg: "bg-amber-500/10", text: "text-amber-400" },
};

export default function TeamVentureAttribution({
  members,
  venturesByMember,
  onNavigateToTeam,
}: TeamVentureAttributionProps) {
  const sortedMembers = useMemo(() => {
    return [...members].sort((a, b) => {
      const aCount = (venturesByMember[a.id] || []).length;
      const bCount = (venturesByMember[b.id] || []).length;
      return bCount - aCount;
    });
  }, [members, venturesByMember]);

  const totalAssignments = useMemo(() => {
    return members.reduce((sum, m) => sum + (venturesByMember[m.id] || []).length, 0);
  }, [members, venturesByMember]);

  return (
    <div className="bg-card border border-border rounded-xl p-4 sm:p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Users className="size-4 text-primary" />
          <span className="text-sm font-semibold text-foreground">Team Attribution</span>
          <span className="text-[10px] font-mono text-muted-foreground">
            {members.length} members · {totalAssignments} assignments
          </span>
        </div>
        {onNavigateToTeam && (
          <Button variant="ghost" size="sm" className="text-xs h-8 px-2 text-muted-foreground" onClick={onNavigateToTeam}>
            All <ChevronRight className="size-3 ml-0.5" />
          </Button>
        )}
      </div>

      {/* Attribution table */}
      <div className="space-y-0 divide-y divide-border/30">
        {sortedMembers.slice(0, 8).map((member, i) => {
          const ventures = venturesByMember[member.id] || [];
          const initials = member.name.split(" ").map(w => w[0]).join("").slice(0, 2);
          const typeStyle = TYPE_COLORS[member.type || "Internal"] || TYPE_COLORS["Internal"];

          return (
            <motion.div
              key={member.id}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04, duration: 0.2 }}
              className="py-2.5 flex items-center gap-3"
            >
              {/* Avatar */}
              <div className="size-7 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
                <span className="text-[9px] font-semibold text-primary">{initials}</span>
              </div>

              {/* Name + title */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-[12px] font-medium text-foreground truncate">{member.name}</span>
                  <span className={cn("text-[9px] font-medium px-1.5 py-0.5 rounded", typeStyle.bg, typeStyle.text)}>
                    {member.type}
                  </span>
                </div>
                {/* Venture assignments */}
                {ventures.length > 0 ? (
                  <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                    {ventures.slice(0, 3).map((va) => {
                      const vName = va.ventureName || "Unknown";
                      return (
                        <span
                          key={`${member.id}-${va.ventureId}`}
                          className="text-[10px] text-muted-foreground bg-secondary/50 px-1.5 py-0.5 rounded"
                        >
                          {vName.length > 18 ? vName.slice(0, 16) + "…" : vName}
                          {va.responsibility && (
                            <span className="text-primary/60 ml-1">({va.responsibility})</span>
                          )}
                        </span>
                      );
                    })}
                    {ventures.length > 3 && (
                      <span className="text-[10px] text-muted-foreground/60 font-mono">
                        +{ventures.length - 3}
                      </span>
                    )}
                  </div>
                ) : (
                  <span className="text-[10px] text-muted-foreground/40 italic">No ventures assigned</span>
                )}
              </div>

              {/* Count badge */}
              <div className="flex-shrink-0 text-right">
                <span className={cn(
                  "text-xs font-mono font-medium",
                  ventures.length > 0 ? "text-foreground" : "text-muted-foreground/40"
                )}>
                  {ventures.length}
                </span>
                <span className="text-[9px] text-muted-foreground block">ventures</span>
              </div>
            </motion.div>
          );
        })}
      </div>

      {sortedMembers.length > 8 && (
        <div className="mt-2 pt-2 border-t border-border/30 text-center">
          <span className="text-[10px] text-muted-foreground">
            +{sortedMembers.length - 8} more members
          </span>
        </div>
      )}
    </div>
  );
}
