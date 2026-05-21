// Principal Decision Queue — with bulk select/approve/reject
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import {
  CheckCircle2,
  Clock,
  Loader2,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  XCircle,
  Zap,
  CheckCheck,
  Square,
  CheckSquare,
  MinusSquare,
} from "lucide-react";
import { useState, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
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

type DecisionItem = {
  id: number;
  type: "event" | "draft" | "distribution";
  category: "distribution" | "stage_advance" | "task_escalation" | "agent_action";
  title: string;
  description: string;
  severity: string;
  agentName: string;
  entityName?: string;
  createdAt: Date | string;
};

export default function Decisions() {
  const [rejectDialog, setRejectDialog] = useState<{ mode: "single"; item: DecisionItem } | { mode: "bulk" } | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const { data, isLoading, refetch } = trpc.agents.pendingApprovals.useQuery({});

  // Single mutations
  const approveEventMutation = trpc.agents.approveEvent.useMutation({
    onSuccess: () => { toast.success("Decision approved"); refetch(); },
    onError: (err: any) => toast.error(err.message),
  });
  const rejectEventMutation = trpc.agents.rejectEvent.useMutation({
    onSuccess: () => { toast.success("Decision rejected"); refetch(); setRejectDialog(null); setRejectReason(""); },
    onError: (err: any) => toast.error(err.message),
  });
  const approveDraftMutation = trpc.agents.approveDraft.useMutation({
    onSuccess: () => { toast.success("Draft approved & sent"); refetch(); },
    onError: (err: any) => toast.error(err.message),
  });
  const rejectDraftMutation = trpc.agents.rejectDraft.useMutation({
    onSuccess: () => { toast.success("Draft rejected"); refetch(); setRejectDialog(null); setRejectReason(""); },
    onError: (err: any) => toast.error(err.message),
  });

  // Bulk mutations
  const bulkApproveMutation = trpc.agents.bulkApprove.useMutation({
    onSuccess: (result) => {
      toast.success(`${result.approved} approved${result.failed > 0 ? `, ${result.failed} failed` : ""}`);
      setSelected(new Set());
      refetch();
    },
    onError: (err: any) => toast.error(err.message),
  });
  const bulkRejectMutation = trpc.agents.bulkReject.useMutation({
    onSuccess: (result) => {
      toast.success(`${result.rejected} rejected${result.failed > 0 ? `, ${result.failed} failed` : ""}`);
      setSelected(new Set());
      setRejectDialog(null);
      setRejectReason("");
      refetch();
    },
    onError: (err: any) => toast.error(err.message),
  });

  const approvePending = approveEventMutation.isPending || approveDraftMutation.isPending || bulkApproveMutation.isPending;
  const rejectPending = rejectEventMutation.isPending || rejectDraftMutation.isPending || bulkRejectMutation.isPending;

  // Transform data into unified decision items
  const decisions: DecisionItem[] = useMemo(() => {
    if (!data) return [];
    const items: DecisionItem[] = [];

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
        createdAt: event.createdAt,
      });
    }

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
        createdAt: draft.createdAt,
      });
    }

    // Sort: critical first, then by date
    return items.sort((a, b) => {
      const severityOrder = { critical: 0, warning: 1, info: 2 };
      const aSev = severityOrder[a.severity as keyof typeof severityOrder] ?? 2;
      const bSev = severityOrder[b.severity as keyof typeof severityOrder] ?? 2;
      if (aSev !== bSev) return aSev - bSev;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [data]);

  // Selection helpers
  const itemKey = (item: DecisionItem) => `${item.type}-${item.id}`;

  const toggleSelect = useCallback((item: DecisionItem) => {
    setSelected(prev => {
      const next = new Set(prev);
      const key = itemKey(item);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    if (selected.size === decisions.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(decisions.map(itemKey)));
    }
  }, [decisions, selected.size]);

  const selectedItems = useMemo(() => {
    return decisions.filter(d => selected.has(itemKey(d)));
  }, [decisions, selected]);

  const handleApprove = (item: DecisionItem) => {
    if (item.type === "draft") {
      approveDraftMutation.mutate({ draftId: item.id });
    } else {
      approveEventMutation.mutate({ eventId: item.id });
    }
  };

  const handleReject = () => {
    if (!rejectReason.trim()) {
      toast.error("Please provide a reason for rejection");
      return;
    }
    if (rejectDialog?.mode === "bulk") {
      bulkRejectMutation.mutate({
        items: selectedItems.map(i => ({ id: i.id, type: i.type as "event" | "draft" })),
        reason: rejectReason,
      });
    } else if (rejectDialog?.mode === "single") {
      const item = rejectDialog.item;
      if (item.type === "draft") {
        rejectDraftMutation.mutate({ draftId: item.id, reason: rejectReason });
      } else {
        rejectEventMutation.mutate({ eventId: item.id, reason: rejectReason });
      }
    }
  };

  const handleBulkApprove = () => {
    if (selectedItems.length === 0) return;
    bulkApproveMutation.mutate({
      items: selectedItems.map(i => ({ id: i.id, type: i.type as "event" | "draft" })),
    });
  };

  const handleBulkReject = () => {
    if (selectedItems.length === 0) return;
    setRejectDialog({ mode: "bulk" });
  };

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

  const isAllSelected = decisions.length > 0 && selected.size === decisions.length;
  const isSomeSelected = selected.size > 0 && selected.size < decisions.length;

  return (
    <DashboardLayout title="Decision Queue" subtitle="PRINCIPAL CONFIRMATIONS">
      <div className="p-4 md:p-6 space-y-4">
        {/* Header with summary + bulk actions */}
        {!isLoading && decisions.length > 0 && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* Select all toggle */}
              <button
                onClick={toggleSelectAll}
                className="text-muted-foreground hover:text-foreground transition-colors"
                title={isAllSelected ? "Deselect all" : "Select all"}
              >
                {isAllSelected ? (
                  <CheckSquare className="size-4 text-primary" />
                ) : isSomeSelected ? (
                  <MinusSquare className="size-4 text-primary" />
                ) : (
                  <Square className="size-4" />
                )}
              </button>

              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Clock className="size-3.5" />
                <span>
                  {selected.size > 0
                    ? `${selected.size} of ${decisions.length} selected`
                    : `${decisions.length} pending ${decisions.length === 1 ? "decision" : "decisions"}`
                  }
                </span>
                {decisions.some(d => d.severity === "critical") && selected.size === 0 && (
                  <>
                    <span className="text-muted-foreground/50">·</span>
                    <span className="text-red-400">{decisions.filter(d => d.severity === "critical").length} critical</span>
                  </>
                )}
              </div>
            </div>

            {/* Bulk action buttons — show when items are selected */}
            {selected.size > 0 && (
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs text-red-400 border-red-500/30 hover:bg-red-500/10 h-7"
                  onClick={handleBulkReject}
                  disabled={rejectPending}
                >
                  <XCircle className="size-3.5 mr-1" />
                  Reject {selected.size}
                </Button>
                <Button
                  size="sm"
                  className="text-xs bg-emerald-600 hover:bg-emerald-700 h-7"
                  onClick={handleBulkApprove}
                  disabled={approvePending}
                >
                  {bulkApproveMutation.isPending ? (
                    <Loader2 className="size-3.5 mr-1 animate-spin" />
                  ) : (
                    <CheckCheck className="size-3.5 mr-1" />
                  )}
                  Approve {selected.size}
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Decision list */}
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-lg" />)}
          </div>
        ) : decisions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <CheckCircle2 className="size-10 text-emerald-400 mb-4" />
            <h3 className="text-base font-semibold text-foreground mb-1">All Clear</h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              No pending decisions. You'll be notified when new items require your attention.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {decisions.map((item) => {
              const key = itemKey(item);
              const isSelected = selected.has(key);

              return (
                <div
                  key={key}
                  className={cn(
                    "bg-card border rounded-lg p-4 transition-all",
                    item.severity === "critical" ? "border-red-500/30" : "border-border",
                    isSelected && "border-primary/50 bg-primary/5"
                  )}
                >
                  <div className="flex items-start justify-between gap-4">
                    {/* Left: Checkbox + Content */}
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      {/* Selection checkbox */}
                      <button
                        onClick={() => toggleSelect(item)}
                        className="mt-0.5 flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {isSelected ? (
                          <CheckSquare className="size-4 text-primary" />
                        ) : (
                          <Square className="size-4" />
                        )}
                      </button>

                      <div className={cn("mt-0.5 flex-shrink-0", getCategoryColor(item.category))}>
                        {getCategoryIcon(item.category)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-sm font-medium text-foreground">{item.title}</span>
                          {item.severity === "critical" && (
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-red-500/10 text-red-400">
                              Critical
                            </span>
                          )}
                        </div>
                        {item.entityName && (
                          <span className="text-[11px] text-muted-foreground font-mono block">{item.entityName}</span>
                        )}
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{item.description}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-[10px] text-muted-foreground font-mono">
                            {friendlyTime(item.createdAt)}
                          </span>
                          <span className="text-[10px] text-muted-foreground/50">·</span>
                          <span className="text-[10px] text-muted-foreground font-mono">{item.agentName}</span>
                        </div>
                      </div>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs text-red-400 border-red-500/30 hover:bg-red-500/10 h-8"
                        onClick={() => setRejectDialog({ mode: "single", item })}
                        disabled={rejectPending}
                      >
                        <XCircle className="size-3.5 mr-1" />
                        Reject
                      </Button>
                      <Button
                        size="sm"
                        className="text-xs bg-emerald-600 hover:bg-emerald-700 h-8"
                        onClick={() => handleApprove(item)}
                        disabled={approvePending}
                      >
                        {approvePending ? (
                          <Loader2 className="size-3.5 mr-1 animate-spin" />
                        ) : (
                          <CheckCircle2 className="size-3.5 mr-1" />
                        )}
                        Approve
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Reject Dialog — handles both single and bulk */}
      <Dialog open={!!rejectDialog} onOpenChange={() => { setRejectDialog(null); setRejectReason(""); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {rejectDialog?.mode === "bulk"
                ? `Reject ${selected.size} Decisions`
                : "Reject Decision"
              }
            </DialogTitle>
            <DialogDescription>
              {rejectDialog?.mode === "bulk"
                ? `Provide a reason for rejecting ${selected.size} selected items.`
                : `Provide a reason for rejecting: ${rejectDialog?.mode === "single" ? rejectDialog.item.title : ""}`
              }
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Reason for rejection..."
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            className="min-h-[100px]"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => { setRejectDialog(null); setRejectReason(""); }}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={rejectPending || !rejectReason.trim()}
            >
              {rejectPending ? <Loader2 className="size-4 animate-spin mr-1" /> : null}
              {rejectDialog?.mode === "bulk" ? `Reject ${selected.size}` : "Reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
