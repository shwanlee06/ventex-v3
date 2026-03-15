// ============================================================================
// SPV Detail Page — /spvs/:slug — LIVE DB DATA
// Shows SPV info, linked ventures, team, notes, stage management
// ============================================================================

import DashboardLayout from "@/components/DashboardLayout";
import StatusBadge from "@/components/StatusBadge";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc";
import { motion } from "framer-motion";
import {
  ArrowLeft, Briefcase, Users, Link2, Building2, Edit2, Save, X,
} from "lucide-react";
import { useState, useCallback } from "react";
import { useRoute, Link, useLocation } from "wouter";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";

const ALL_STAGES = ["Active deal", "In negotiation", "Closed deal", "Dropped deal"];

const SPV_STAGE_CONFIG: Record<string, { label: string; bg: string; dot: string }> = {
  "Active deal": { label: "Active", bg: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20", dot: "bg-emerald-400" },
  "In negotiation": { label: "Negotiating", bg: "bg-blue-500/10 text-blue-400 border-blue-500/20", dot: "bg-blue-400" },
  "Closed deal": { label: "Closed", bg: "bg-primary/10 text-primary border-primary/20", dot: "bg-primary" },
  "Dropped deal": { label: "Dropped", bg: "bg-red-500/10 text-red-400 border-red-500/20", dot: "bg-red-400" },
};

const THEME_COLORS: Record<string, string> = {
  "Real Estate": "#3b82f6", "Yacht": "#06b6d4", "F&B": "#f59e0b",
  "Entertainment": "#a855f7", "Oil & Gas": "#ef4444", "Others": "#6b7280", "TBD": "#6b7280",
};

export default function SpvDetail() {
  const [, params] = useRoute("/spvs/:slug");
  const [, navigate] = useLocation();
  const slug = params?.slug || "";
  const utils = trpc.useUtils();

  // ── Live data ──────────────────────────────────────────────────────
  const spvQ = trpc.spvs.getBySlug.useQuery({ slug }, { enabled: !!slug });
  const spv = spvQ.data;

  const linkedVenturesQ = trpc.spvs.getLinkedVentures.useQuery(
    { spvId: spv?.id || 0 },
    { enabled: !!spv }
  );
  const spvTeamQ = trpc.spvs.getTeam.useQuery(
    { spvId: spv?.id || 0 },
    { enabled: !!spv }
  );
  const allVenturesQ = trpc.ventures.list.useQuery();
  const allTeamQ = trpc.team.list.useQuery();

  const linkedVentures = linkedVenturesQ.data || [];
  const spvTeam = spvTeamQ.data || [];
  const allVentures = allVenturesQ.data || [];
  const allTeam = allTeamQ.data || [];

  // ── Mutations ──────────────────────────────────────────────────────
  const updateSpv = trpc.spvs.update.useMutation({
    onSuccess: () => { utils.spvs.getBySlug.invalidate({ slug }); utils.activity.recent.invalidate(); },
  });
  const linkVenture = trpc.spvs.linkVenture.useMutation({
    onSuccess: () => { utils.spvs.getLinkedVentures.invalidate({ spvId: spv?.id || 0 }); },
  });
  const unlinkVenture = trpc.spvs.unlinkVenture.useMutation({
    onSuccess: () => { utils.spvs.getLinkedVentures.invalidate({ spvId: spv?.id || 0 }); },
  });
  const assignTeam = trpc.spvs.assignTeam.useMutation({
    onSuccess: () => { utils.spvs.getTeam.invalidate({ spvId: spv?.id || 0 }); },
  });
  const removeTeam = trpc.spvs.removeTeam.useMutation({
    onSuccess: () => { utils.spvs.getTeam.invalidate({ spvId: spv?.id || 0 }); },
  });

  // ── State ──────────────────────────────────────────────────────────
  const [editing, setEditing] = useState(false);
  const [editNotes, setEditNotes] = useState("");
  const [editNextStep, setEditNextStep] = useState("");
  const [linkVentureOpen, setLinkVentureOpen] = useState(false);
  const [assignTeamOpen, setAssignTeamOpen] = useState(false);

  // ── Handlers ───────────────────────────────────────────────────────
  const startEdit = useCallback(() => {
    if (!spv) return;
    setEditNotes(spv.currentStatus || "");
    setEditNextStep(spv.nextStep || "");
    setEditing(true);
  }, [spv]);

  const saveEdit = useCallback(() => {
    if (!spv) return;
    updateSpv.mutate({
      id: spv.id,
      currentStatus: editNotes || undefined,
      nextStep: editNextStep || undefined,
    });
    setEditing(false);
    toast.success("SPV updated");
  }, [spv, editNotes, editNextStep, updateSpv]);

  const handleStageChange = useCallback((stage: string) => {
    if (!spv) return;
    updateSpv.mutate({ id: spv.id, stage });
    toast.success(`Stage updated to ${stage}`);
  }, [spv, updateSpv]);

  const handlePriorityCycle = useCallback(() => {
    if (!spv) return;
    const cycle: Record<string, string> = { Low: "Medium", Medium: "High", High: "Low" };
    const next = cycle[spv.priority || "Medium"] || "Medium";
    updateSpv.mutate({ id: spv.id, priority: next });
    toast.info(`Priority changed to ${next}`);
  }, [spv, updateSpv]);

  // ── Loading / Not Found ────────────────────────────────────────────
  if (spvQ.isLoading) {
    return (
      <DashboardLayout title="SPV Detail" subtitle="LOADING...">
        <div className="p-6 space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-64 w-full" />
        </div>
      </DashboardLayout>
    );
  }

  if (!spv) {
    return (
      <DashboardLayout title="SPV Not Found" subtitle="ERROR">
        <div className="p-6 text-center">
          <Briefcase className="size-12 text-muted-foreground mx-auto mb-4 opacity-40" />
          <p className="text-sm text-muted-foreground mb-4">This SPV could not be found.</p>
          <Link href="/spvs">
            <Button variant="outline" size="sm" className="text-xs"><ArrowLeft className="size-3.5 mr-1" /> Back to SPVs</Button>
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  const sc = SPV_STAGE_CONFIG[spv.stage || "Active deal"];
  const color = THEME_COLORS[spv.sector || "Others"] || "#6b7280";

  // Ventures not yet linked
  const linkedVentureIds = new Set(linkedVentures.map(v => v.ventureId));
  const availableVentures = allVentures.filter(v => !linkedVentureIds.has(v.id));

  // Team not yet assigned
  const assignedMemberIds = new Set(spvTeam.map(t => t.memberId));
  const availableTeam = allTeam.filter(m => !assignedMemberIds.has(m.id));

  return (
    <DashboardLayout title={spv.name} subtitle="SPV DETAIL">
      <div className="p-4 md:p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Link href="/spvs">
            <Button variant="ghost" size="sm" className="text-xs h-8">
              <ArrowLeft className="size-3.5 mr-1" /> Back
            </Button>
          </Link>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card border border-border rounded-lg p-6"
        >
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-lg font-semibold text-foreground">{spv.name}</h1>
              <div className="flex items-center gap-3 mt-1">
                <div className="flex items-center gap-1.5">
                  <div className="size-2 rounded-full" style={{ backgroundColor: color }} />
                  <span className="text-xs" style={{ color }}>{spv.sector || "TBD"}</span>
                </div>
                {sc && <StatusBadge label={sc.label} bg={sc.bg} dot={sc.dot} />}
                <button
                  onClick={handlePriorityCycle}
                  className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded cursor-pointer",
                    spv.priority === "High" ? "bg-red-500/10 text-red-400" :
                    spv.priority === "Medium" ? "bg-amber-500/10 text-amber-400" :
                    "bg-secondary text-muted-foreground"
                  )}
                >
                  {spv.priority} priority
                </button>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Select value={spv.stage || "Active deal"} onValueChange={handleStageChange}>
                <SelectTrigger className="h-8 text-xs w-[160px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ALL_STAGES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
              {!editing ? (
                <Button variant="outline" size="sm" className="text-xs h-8" onClick={startEdit}>
                  <Edit2 className="size-3.5 mr-1" /> Edit
                </Button>
              ) : (
                <div className="flex gap-1">
                  <Button size="sm" className="text-xs h-8" onClick={saveEdit} disabled={updateSpv.isPending}>
                    <Save className="size-3.5 mr-1" /> Save
                  </Button>
                  <Button variant="ghost" size="sm" className="text-xs h-8" onClick={() => setEditing(false)}>
                    <X className="size-3.5" />
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Notes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium block mb-1">Current Status</span>
              {editing ? (
                <Textarea value={editNotes} onChange={e => setEditNotes(e.target.value)} className="text-xs min-h-[80px]" />
              ) : (
                <p className="text-xs text-foreground bg-secondary/30 rounded-md p-3 min-h-[80px]">
                  {spv.currentStatus || "No status notes yet."}
                </p>
              )}
            </div>
            <div>
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium block mb-1">Next Step</span>
              {editing ? (
                <Textarea value={editNextStep} onChange={e => setEditNextStep(e.target.value)} className="text-xs min-h-[80px]" />
              ) : (
                <p className="text-xs text-foreground bg-secondary/30 rounded-md p-3 min-h-[80px]">
                  {spv.nextStep || "No next steps defined."}
                </p>
              )}
            </div>
          </div>
        </motion.div>

        {/* Linked Ventures */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-card border border-border rounded-lg"
        >
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Building2 className="size-4 text-blue-400" />
              <h2 className="text-sm font-semibold text-foreground">Linked Ventures</h2>
              <span className="text-[10px] font-mono text-muted-foreground">{linkedVentures.length}</span>
            </div>
            <Button variant="outline" size="sm" className="text-xs h-7" onClick={() => setLinkVentureOpen(true)}>
              <Link2 className="size-3 mr-1" /> Link
            </Button>
          </div>
          <div className="divide-y divide-border">
            {linkedVentures.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-xs text-muted-foreground">No ventures linked to this SPV yet.</p>
              </div>
            ) : (
              linkedVentures.map(v => (
                <div key={v.id} className="px-4 py-3 flex items-center justify-between">
                  <Link href={`/ventures/${v.ventureSlug}`}>
                    <span className="text-xs font-medium text-foreground hover:text-primary transition-colors cursor-pointer">
                      {v.ventureName}
                    </span>
                  </Link>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-muted-foreground">{v.ventureSector}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs h-6 px-2 text-red-400 hover:text-red-300"
                      onClick={() => {
                        unlinkVenture.mutate({ spvId: spv.id, ventureId: v.ventureId });
                        toast.info("Venture unlinked");
                      }}
                    >
                      <X className="size-3" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </motion.div>

        {/* Team */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-card border border-border rounded-lg"
        >
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="size-4 text-emerald-400" />
              <h2 className="text-sm font-semibold text-foreground">Team</h2>
              <span className="text-[10px] font-mono text-muted-foreground">{spvTeam.length}</span>
            </div>
            <Button variant="outline" size="sm" className="text-xs h-7" onClick={() => setAssignTeamOpen(true)}>
              <Users className="size-3 mr-1" /> Assign
            </Button>
          </div>
          <div className="divide-y divide-border">
            {spvTeam.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-xs text-muted-foreground">No team members assigned yet.</p>
              </div>
            ) : (
              spvTeam.map(m => (
                <div key={m.id} className="px-4 py-3 flex items-center justify-between">
                  <Link href={`/team/${m.memberSlug}`}>
                    <div className="cursor-pointer">
                      <span className="text-xs font-medium text-foreground hover:text-primary transition-colors">{m.memberName}</span>
                      <span className="text-[10px] text-muted-foreground ml-2">{m.memberRole}</span>
                    </div>
                  </Link>
                  <div className="flex items-center gap-2">
                    {m.responsibility && (
                      <span className="text-[10px] text-muted-foreground italic">{m.responsibility}</span>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs h-6 px-2 text-red-400 hover:text-red-300"
                      onClick={() => {
                        removeTeam.mutate({ spvId: spv.id, memberId: m.memberId });
                        toast.info("Team member removed");
                      }}
                    >
                      <X className="size-3" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </motion.div>
      </div>

      {/* Link Venture Dialog */}
      <Dialog open={linkVentureOpen} onOpenChange={setLinkVentureOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm">Link Venture</DialogTitle>
            <DialogDescription className="text-[10px] font-mono">Select a venture to link to this SPV</DialogDescription>
          </DialogHeader>
          <div className="max-h-[300px] overflow-y-auto divide-y divide-border">
            {availableVentures.length === 0 ? (
              <p className="p-4 text-xs text-muted-foreground text-center">All ventures are already linked.</p>
            ) : (
              availableVentures.map(v => (
                <button
                  key={v.id}
                  onClick={() => {
                    linkVenture.mutate({ spvId: spv.id, ventureId: v.id });
                    toast.success(`Linked ${v.name}`);
                    setLinkVentureOpen(false);
                  }}
                  className="w-full text-left px-4 py-3 hover:bg-accent/30 transition-colors"
                >
                  <span className="text-xs font-medium text-foreground">{v.name}</span>
                  <span className="text-[10px] text-muted-foreground ml-2">{v.sector}</span>
                </button>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Assign Team Dialog */}
      <Dialog open={assignTeamOpen} onOpenChange={setAssignTeamOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm">Assign Team Member</DialogTitle>
            <DialogDescription className="text-[10px] font-mono">Select a team member to assign to this SPV</DialogDescription>
          </DialogHeader>
          <div className="max-h-[300px] overflow-y-auto divide-y divide-border">
            {availableTeam.length === 0 ? (
              <p className="p-4 text-xs text-muted-foreground text-center">All team members are already assigned.</p>
            ) : (
              availableTeam.map(m => (
                <button
                  key={m.id}
                  onClick={() => {
                    assignTeam.mutate({ spvId: spv.id, memberId: m.id });
                    toast.success(`Assigned ${m.name}`);
                    setAssignTeamOpen(false);
                  }}
                  className="w-full text-left px-4 py-3 hover:bg-accent/30 transition-colors"
                >
                  <span className="text-xs font-medium text-foreground">{m.name}</span>
                  <span className="text-[10px] text-muted-foreground ml-2">{m.role}</span>
                </button>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
