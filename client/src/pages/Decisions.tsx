// Principal Decision Queue — Single page for all pending approvals/confirmations
// Shows: distribution confirmations, stage advance approvals, agent event approvals
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Shield,
  Loader2,
  DollarSign,
  TrendingUp,
  FileCheck,
  Layers3,
  ArrowRight,
  XCircle,
  CheckCheck,
  Timer,
  Zap,
} from "lucide-react";
import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

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

function daysWaiting(d: Date | string): number {
  const date = typeof d === "string" ? new Date(d) : d;
  return Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
}

type DecisionItem = {
  id: number;
  type: "event" | "draft" | "distribution";
  category: "distribution" | "stage_advance" | "task_escalation" | "agent_action";
  title: string;
  description: string;
  severity: string;
  agentName: string;
  entityName?: string;
  entityType?: string;
  createdAt: Date | string;
  daysWaiting: number;
  actionPayload?: Record<string, unknown>;
  confidenceScore?: number | null;
};

export default function Decisions() {
  const [filter, setFilter] = useState<"all" | "distribution" | "stage_advance" | "task_escalation" | "agent_action">("all");
  const [rejectDialog, setRejectDialog] = useState<DecisionItem | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [batchMode, setBatchMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  const { data, isLoading, refetch } = trpc.agents.pendingApprovals.useQuery({});
  const approveMutation = trpc.agents.approveEvent.useMutation({
    onSuccess: () => {
      toast.success("Decision approved");
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });
  const rejectMutation = trpc.agents.rejectEvent.useMutation({
    onSuccess: () => {
      toast.success("Decision rejected");
      refetch();
      setRejectDialog(null);
      setRejectReason("");
    },
    onError: (err) => toast.error(err.message),
  });

  // Transform data into unified decision items
  const decisions: DecisionItem[] = useMemo(() => {
    if (!data) return [];
    const items: DecisionItem[] = [];

    // Agent events requiring approval
    for (const event of data.events || []) {
      let category: DecisionItem["category"] = "agent_action";
      if (event.entityType === "distribution" || event.actionType === "escalate" && event.agentName === "Distribution Sentinel") {
        category = "distribution";
      } else if (event.actionType === "advance" || event.agentName === "Velocity Agent") {
        category = "stage_advance";
      } else if (event.agentName === "Overdue Agent") {
        category = "task_escalation";
      }

      items.push({
        id: event.id,
        type: "event",
        category,
        title: event.actionLabel || event.agentName,
        description: event.message,
        severity: event.severity,
        agentName: event.agentName,
        entityName: event.agentEntityName || undefined,
        entityType: event.entityType || undefined,
        createdAt: event.createdAt,
        daysWaiting: daysWaiting(event.createdAt),
        actionPayload: event.actionPayload || undefined,
        confidenceScore: event.confidenceScore,
      });
    }

    // Drafts requiring approval
    for (const draft of data.drafts || []) {
      items.push({
        id: draft.id,
        type: "draft",
        category: "agent_action",
        title: draft.subject || "Agent Draft",
        description: draft.body || "",
        severity: "info",
        agentName: draft.createdByAgent || "Agent",
        entityName: draft.ventureName || undefined,
        entityType: draft.draftType || undefined,
        createdAt: draft.createdAt,
        daysWaiting: daysWaiting(draft.createdAt),
        confidenceScore: draft.confidenceScore,
      });
    }

    // Sort by severity (critical first) then by date
    return items.sort((a, b) => {
      const severityOrder = { critical: 0, warning: 1, info: 2 };
      const aSev = severityOrder[a.severity as keyof typeof severityOrder] ?? 2;
      const bSev = severityOrder[b.severity as keyof typeof severityOrder] ?? 2;
      if (aSev !== bSev) return aSev - bSev;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [data]);

  const filteredDecisions = filter === "all" ? decisions : decisions.filter(d => d.category === filter);

  const handleApprove = async (item: DecisionItem) => {
    approveMutation.mutate({ eventId: item.id });
  };

  const handleReject = async () => {
    if (!rejectDialog || !rejectReason.trim()) {
      toast.error("Please provide a reason for rejection");
      return;
    }
    rejectMutation.mutate({ eventId: rejectDialog.id, reason: rejectReason });
  };

  const handleBatchApprove = async () => {
    const items = filteredDecisions.filter(d => selectedIds.has(d.id));
    for (const item of items) {
      await approveMutation.mutateAsync({ eventId: item.id });
    }
    setSelectedIds(new Set());
    setBatchMode(false);
    toast.success(`${items.length} decisions approved`);
  };

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const stats = useMemo(() => ({
    total: decisions.length,
    critical: decisions.filter(d => d.severity === "critical").length,
    distributions: decisions.filter(d => d.category === "distribution").length,
    staleOver3Days: decisions.filter(d => d.daysWaiting >= 3).length,
  }), [decisions]);

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "distribution": return <DollarSign className="size-4" />;
      case "stage_advance": return <TrendingUp className="size-4" />;
      case "task_escalation": return <AlertTriangle className="size-4" />;
      default: return <Zap className="size-4" />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "distribution": return "text-emerald-400";
      case "stage_advance": return "text-blue-400";
      case "task_escalation": return "text-amber-400";
      default: return "text-purple-400";
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case "critical": return <Badge variant="destructive" className="text-[10px]">Critical</Badge>;
      case "warning": return <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20 text-[10px]">Warning</Badge>;
      default: return <Badge variant="secondary" className="text-[10px]">Info</Badge>;
    }
  };

  return (
    <DashboardLayout title="Decision Queue" subtitle="PRINCIPAL CONFIRMATIONS">
      <div className="p-4 md:p-6 space-y-6">
        {/* Stats Bar */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-lg" />)
          ) : (
            <>
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-card border border-border rounded-lg p-4 flex flex-col gap-1"
              >
                <span className="text-[11px] uppercase tracking-wider text-muted-foreground">Pending</span>
                <span className="text-2xl font-semibold font-mono text-foreground">{stats.total}</span>
                <span className="text-[10px] text-muted-foreground">decisions awaiting</span>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 }}
                className="bg-card border border-border rounded-lg p-4 flex flex-col gap-1"
              >
                <span className="text-[11px] uppercase tracking-wider text-red-400">Critical</span>
                <span className="text-2xl font-semibold font-mono text-red-400">{stats.critical}</span>
                <span className="text-[10px] text-muted-foreground">require immediate action</span>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-card border border-border rounded-lg p-4 flex flex-col gap-1"
              >
                <span className="text-[11px] uppercase tracking-wider text-emerald-400">Distributions</span>
                <span className="text-2xl font-semibold font-mono text-emerald-400">{stats.distributions}</span>
                <span className="text-[10px] text-muted-foreground">pending confirmation</span>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="bg-card border border-border rounded-lg p-4 flex flex-col gap-1"
              >
                <span className="text-[11px] uppercase tracking-wider text-amber-400">Stale</span>
                <span className="text-2xl font-semibold font-mono text-amber-400">{stats.staleOver3Days}</span>
                <span className="text-[10px] text-muted-foreground">waiting 3+ days</span>
              </motion.div>
            </>
          )}
        </div>

        {/* Filters & Batch Actions */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            {(["all", "distribution", "stage_advance", "task_escalation", "agent_action"] as const).map(f => (
              <Button
                key={f}
                variant={filter === f ? "default" : "outline"}
                size="sm"
                className="text-xs"
                onClick={() => setFilter(f)}
              >
                {f === "all" ? "All" : f.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}
              </Button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            {batchMode && selectedIds.size > 0 && (
              <Button size="sm" onClick={handleBatchApprove} className="text-xs bg-emerald-600 hover:bg-emerald-700">
                <CheckCheck className="size-3.5 mr-1" />
                Approve {selectedIds.size} Selected
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              className="text-xs"
              onClick={() => { setBatchMode(!batchMode); setSelectedIds(new Set()); }}
            >
              {batchMode ? "Cancel Batch" : "Batch Mode"}
            </Button>
          </div>
        </div>

        {/* Decision Cards */}
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-lg" />)}
          </div>
        ) : filteredDecisions.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-20 text-center"
          >
            <CheckCircle2 className="size-12 text-emerald-400 mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">All Clear</h3>
            <p className="text-sm text-muted-foreground max-w-md">
              No pending decisions. All confirmations have been processed. The system will alert you when new items require your attention.
            </p>
          </motion.div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence mode="popLayout">
              {filteredDecisions.map((item, i) => (
                <motion.div
                  key={`${item.type}-${item.id}`}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ delay: i * 0.03, duration: 0.2 }}
                  className={cn(
                    "bg-card border rounded-lg p-4 transition-all",
                    item.severity === "critical" ? "border-red-500/30" : "border-border",
                    batchMode && selectedIds.has(item.id) && "ring-2 ring-primary/50",
                    item.daysWaiting >= 3 && "border-l-2 border-l-amber-500"
                  )}
                >
                  <div className="flex items-start justify-between gap-4">
                    {/* Left: Content */}
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      {batchMode && (
                        <input
                          type="checkbox"
                          checked={selectedIds.has(item.id)}
                          onChange={() => toggleSelect(item.id)}
                          className="mt-1 size-4 rounded border-border"
                        />
                      )}
                      <div className={cn("mt-0.5", getCategoryColor(item.category))}>
                        {getCategoryIcon(item.category)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="text-sm font-medium text-foreground">{item.title}</span>
                          {getSeverityBadge(item.severity)}
                          {item.daysWaiting >= 3 && (
                            <Badge variant="outline" className="text-[10px] text-amber-400 border-amber-500/30">
                              <Timer className="size-3 mr-0.5" />
                              {item.daysWaiting}d waiting
                            </Badge>
                          )}
                        </div>
                        {item.entityName && (
                          <span className="text-xs text-muted-foreground font-mono">{item.entityName}</span>
                        )}
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{item.description}</p>
                        <div className="flex items-center gap-3 mt-2">
                          <span className="text-[10px] text-muted-foreground">
                            <Clock className="size-3 inline mr-0.5" />
                            {friendlyTime(item.createdAt)}
                          </span>
                          <span className="text-[10px] text-muted-foreground font-mono">{item.agentName}</span>
                          {item.confidenceScore != null && (
                            <span className="text-[10px] text-muted-foreground">
                              AI Confidence: {item.confidenceScore}%
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right: Actions */}
                    {!batchMode && (
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs text-red-400 border-red-500/30 hover:bg-red-500/10"
                          onClick={() => setRejectDialog(item)}
                          disabled={rejectMutation.isPending}
                        >
                          <XCircle className="size-3.5 mr-1" />
                          Reject
                        </Button>
                        <Button
                          size="sm"
                          className="text-xs bg-emerald-600 hover:bg-emerald-700"
                          onClick={() => handleApprove(item)}
                          disabled={approveMutation.isPending}
                        >
                          {approveMutation.isPending ? (
                            <Loader2 className="size-3.5 mr-1 animate-spin" />
                          ) : (
                            <CheckCircle2 className="size-3.5 mr-1" />
                          )}
                          Approve
                        </Button>
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Reject Dialog */}
      <Dialog open={!!rejectDialog} onOpenChange={() => setRejectDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Decision</DialogTitle>
            <DialogDescription>
              Provide a reason for rejecting: {rejectDialog?.title}
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Reason for rejection..."
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            className="min-h-[100px]"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialog(null)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={rejectMutation.isPending || !rejectReason.trim()}
            >
              {rejectMutation.isPending ? <Loader2 className="size-4 animate-spin mr-1" /> : null}
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
