// ============================================================================
// Draft Center — The velocity loop. AI drafts communications, clients approve.
// ============================================================================

import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { useRoute } from "wouter";
import { getLoginUrl } from "@/const";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import {
  Send,
  Trash2,
  FileText,
  Mail,
  ChevronDown,
  Loader2,
  CheckCircle2,
  Clock,
  AlertCircle,
  Zap,
  Building2,
  Filter,
  Inbox,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import DashboardLayout from "@/components/DashboardLayout";
import { motion, AnimatePresence } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import { useState, useMemo } from "react";
import { toast } from "sonner";

const DRAFT_TYPE_CONFIG: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  follow_up: {
    label: "Follow-up",
    color: "text-amber-400",
    bg: "bg-amber-500/10 border-amber-500/20",
    icon: <Mail className="size-3.5" />,
  },
  lp_notice: {
    label: "LP Notice",
    color: "text-blue-400",
    bg: "bg-blue-500/10 border-blue-500/20",
    icon: <FileText className="size-3.5" />,
  },
  reminder: {
    label: "Reminder",
    color: "text-purple-400",
    bg: "bg-purple-500/10 border-purple-500/20",
    icon: <Clock className="size-3.5" />,
  },
  escalation: {
    label: "Escalation",
    color: "text-red-400",
    bg: "bg-red-500/10 border-red-500/20",
    icon: <AlertCircle className="size-3.5" />,
  },
  update: {
    label: "Update",
    color: "text-emerald-400",
    bg: "bg-emerald-500/10 border-emerald-500/20",
    icon: <Zap className="size-3.5" />,
  },
};

function friendlyDate(d: string | Date | null | undefined): string {
  if (!d) return "";
  try {
    return formatDistanceToNow(new Date(d), { addSuffix: true });
  } catch {
    return "";
  }
}

export default function DraftCenter() {
  const { user, loading: authLoading } = useAuth();
  const { activeOrg } = useWorkspace();
  const [, params] = useRoute("/clients/:slug/drafts");
  const orgSlug = params?.slug || activeOrg?.slug || "";

  const [filter, setFilter] = useState<"pending" | "sent" | "dismissed">("pending");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editedBody, setEditedBody] = useState("");

  const { data: drafts, isLoading } = trpc.portal.getDrafts.useQuery(
    { orgSlug, status: filter },
    { enabled: !!orgSlug }
  );

  const utils = trpc.useUtils();

  const approveMutation = trpc.portal.approveDraft.useMutation({
    onSuccess: () => {
      toast.success("Communication approved and sent");
      utils.portal.getDrafts.invalidate({ orgSlug });
      setExpandedId(null);
      setEditingId(null);
    },
    onError: (err) => toast.error(err.message || "Failed to send"),
  });

  const dismissMutation = trpc.portal.dismissDraft.useMutation({
    onSuccess: () => {
      toast.success("Draft dismissed");
      utils.portal.getDrafts.invalidate({ orgSlug });
      setExpandedId(null);
    },
    onError: (err) => toast.error(err.message || "Failed to dismiss"),
  });

  // Group drafts by venture
  const grouped = useMemo(() => {
    if (!drafts) return {};
    const groups: Record<string, typeof drafts> = {};
    for (const d of drafts) {
      const key = d.ventureName || "General";
      if (!groups[key]) groups[key] = [];
      groups[key].push(d);
    }
    return groups;
  }, [drafts]);

  const ventureNames = Object.keys(grouped).sort((a, b) => {
    if (a === "General") return 1;
    if (b === "General") return -1;
    return a.localeCompare(b);
  });

  const totalCount = drafts?.length || 0;

  // Auth guard
  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="size-5 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-muted-foreground text-sm">Sign in to access the Draft Center</p>
          <a href={getLoginUrl()}>
            <Button size="sm">Sign In</Button>
          </a>
        </div>
      </div>
    );
  }

  return (
    <DashboardLayout title="Draft Center" subtitle="AI Communications">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="mb-8"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="flex items-center justify-center size-10 rounded-lg bg-primary/10 border border-primary/20">
              <Mail className="size-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-foreground tracking-tight">
                Draft Center
              </h1>
              <p className="text-xs text-muted-foreground font-mono tracking-wide">
                AI-DRAFTED COMMUNICATIONS · REVIEW & APPROVE
              </p>
            </div>
          </div>

          {/* Explanation banner */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="mt-4 bg-card border border-border rounded-lg p-4"
          >
            <div className="flex items-start gap-3">
              <Zap className="size-4 text-primary mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm text-foreground leading-relaxed">
                  VENTEX AI monitors your ventures and drafts communications when action is needed —
                  follow-ups on overdue tasks, LP distribution notices, and escalation emails.
                  <span className="text-primary font-medium"> Review and approve to keep your ventures moving at velocity.</span>
                </p>
              </div>
            </div>
          </motion.div>
        </motion.div>

        {/* Filter tabs */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15 }}
          className="flex items-center gap-2 mb-6"
        >
          <button
            onClick={() => setFilter("pending")}
            className={cn(
              "px-3 py-1.5 rounded-md text-xs font-medium transition-all border",
              filter === "pending"
                ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                : "bg-transparent text-muted-foreground border-transparent hover:text-foreground"
            )}
          >
            <Clock className="size-3 inline mr-1.5 -mt-0.5" />
            Pending
            {filter === "pending" && totalCount > 0 && (
              <span className="ml-1.5 bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded text-[10px] font-mono">
                {totalCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setFilter("sent")}
            className={cn(
              "px-3 py-1.5 rounded-md text-xs font-medium transition-all border",
              filter === "sent"
                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                : "bg-transparent text-muted-foreground border-transparent hover:text-foreground"
            )}
          >
            <CheckCircle2 className="size-3 inline mr-1.5 -mt-0.5" />
            Sent
          </button>
          <button
            onClick={() => setFilter("dismissed")}
            className={cn(
              "px-3 py-1.5 rounded-md text-xs font-medium transition-all border",
              filter === "dismissed"
                ? "bg-secondary text-foreground border-border"
                : "bg-transparent text-muted-foreground border-transparent hover:text-foreground"
            )}
          >
            <Trash2 className="size-3 inline mr-1.5 -mt-0.5" />
            Dismissed
          </button>
        </motion.div>

        {/* Loading state */}
        {isLoading && (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-20 rounded-lg" />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!isLoading && totalCount === 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center py-20"
          >
            <div className="size-16 rounded-full bg-card border border-border flex items-center justify-center mb-4">
              <Inbox className="size-7 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground mb-1">
              {filter === "pending"
                ? "No pending drafts"
                : filter === "sent"
                ? "No sent communications yet"
                : "No dismissed drafts"}
            </p>
            <p className="text-xs text-muted-foreground/60">
              {filter === "pending"
                ? "AI agents will draft communications when your ventures need attention."
                : "Communications will appear here after review."}
            </p>
          </motion.div>
        )}

        {/* Grouped drafts by venture */}
        {!isLoading && totalCount > 0 && (
          <div className="space-y-6">
            {ventureNames.map((ventureName, gi) => {
              const vDrafts = grouped[ventureName];
              return (
                <motion.div
                  key={ventureName}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 + gi * 0.05, duration: 0.3 }}
                >
                  {/* Venture group header */}
                  <div className="flex items-center gap-2 mb-3">
                    <Building2 className="size-3.5 text-muted-foreground" />
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      {ventureName}
                    </span>
                    <span className="text-[10px] font-mono text-muted-foreground/60">
                      {vDrafts.length} draft{vDrafts.length !== 1 ? "s" : ""}
                    </span>
                  </div>

                  {/* Draft cards */}
                  <div className="space-y-2">
                    {vDrafts.map((draft, i) => {
                      const config = DRAFT_TYPE_CONFIG[draft.draftType] || DRAFT_TYPE_CONFIG.update;
                      const isExpanded = expandedId === draft.id;
                      const isEditing = editingId === draft.id;
                      const isBusy = approveMutation.isPending || dismissMutation.isPending;

                      return (
                        <motion.div
                          key={draft.id}
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.25 + gi * 0.05 + i * 0.03, duration: 0.25 }}
                          className={cn(
                            "bg-card border rounded-lg overflow-hidden transition-all",
                            draft.status === "pending"
                              ? "border-amber-500/15 hover:border-amber-500/30"
                              : draft.status === "sent"
                              ? "border-emerald-500/15"
                              : "border-border"
                          )}
                        >
                          {/* Draft header — click to expand */}
                          <button
                            onClick={() => setExpandedId(isExpanded ? null : draft.id)}
                            className="w-full p-4 flex items-start gap-3 text-left hover:bg-accent/20 transition-colors"
                          >
                            {/* Status dot */}
                            <div
                              className={cn(
                                "size-2 rounded-full mt-1.5 flex-shrink-0",
                                draft.status === "pending" ? "bg-amber-400" : draft.status === "sent" ? "bg-emerald-400" : "bg-muted-foreground/30"
                              )}
                            />

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap mb-1">
                                {/* Type badge */}
                                <span className={cn("inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded border", config.bg, config.color)}>
                                  {config.icon}
                                  {config.label}
                                </span>

                                {/* Urgency indicator for pending */}
                                {draft.status === "pending" && (
                                  <span className="text-[10px] font-mono text-amber-400/70">
                                    awaiting approval
                                  </span>
                                )}
                              </div>

                              {/* Subject */}
                              <p className="text-sm font-medium text-foreground truncate">
                                {draft.subject || "AI-drafted communication"}
                              </p>

                              {/* Recipient + time */}
                              <div className="flex items-center gap-3 mt-1">
                                {draft.recipientName && (
                                  <span className="text-[11px] text-muted-foreground">
                                    To: {draft.recipientName}
                                    {draft.recipientRole ? ` (${draft.recipientRole})` : ""}
                                  </span>
                                )}
                                <span className="text-[10px] text-muted-foreground/60 font-mono">
                                  {friendlyDate(draft.createdAt)}
                                </span>
                              </div>
                            </div>

                            <ChevronDown
                              className={cn(
                                "size-4 text-muted-foreground transition-transform flex-shrink-0 mt-1",
                                isExpanded && "rotate-180"
                              )}
                            />
                          </button>

                          {/* Expanded body + actions */}
                          <AnimatePresence>
                            {isExpanded && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.2 }}
                                className="overflow-hidden"
                              >
                                <div className="px-4 pb-4 border-t border-border pt-3">
                                  {/* Draft body */}
                                  {isEditing ? (
                                    <Textarea
                                      value={editedBody}
                                      onChange={(e) => setEditedBody(e.target.value)}
                                      className="min-h-[120px] bg-secondary/30 border-border text-sm mb-3"
                                    />
                                  ) : (
                                    <div className="bg-secondary/30 rounded-lg p-4 mb-3">
                                      <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                                        {draft.body}
                                      </p>
                                    </div>
                                  )}

                                  {/* Agent attribution */}
                                  {draft.createdByAgent && (
                                    <p className="text-[10px] text-muted-foreground/50 mb-3 font-mono">
                                      Drafted by {draft.createdByAgent} agent
                                    </p>
                                  )}

                                  {/* Action buttons */}
                                  {draft.status === "pending" && (
                                    <div className="flex items-center gap-2">
                                      <Button
                                        size="sm"
                                        className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20"
                                        disabled={isBusy}
                                        onClick={() => {
                                          approveMutation.mutate({
                                            draftId: draft.id,
                                            editedBody: isEditing ? editedBody : undefined,
                                          });
                                        }}
                                      >
                                        {approveMutation.isPending ? (
                                          <Loader2 className="size-3 animate-spin mr-1.5" />
                                        ) : (
                                          <Send className="size-3 mr-1.5" />
                                        )}
                                        Approve & Send
                                      </Button>

                                      {!isEditing ? (
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          className="text-muted-foreground hover:text-foreground"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setEditingId(draft.id);
                                            setEditedBody(draft.body);
                                          }}
                                        >
                                          <FileText className="size-3 mr-1.5" />
                                          Edit Before Sending
                                        </Button>
                                      ) : (
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          className="text-muted-foreground hover:text-foreground"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setEditingId(null);
                                            setEditedBody("");
                                          }}
                                        >
                                          Cancel Edit
                                        </Button>
                                      )}

                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="text-muted-foreground hover:text-red-400 ml-auto"
                                        disabled={isBusy}
                                        onClick={() => dismissMutation.mutate({ draftId: draft.id })}
                                      >
                                        <Trash2 className="size-3 mr-1.5" />
                                        Dismiss
                                      </Button>
                                    </div>
                                  )}

                                  {/* Sent confirmation */}
                                  {draft.status === "sent" && draft.sentAt && (
                                    <div className="flex items-center gap-2 text-emerald-400">
                                      <CheckCircle2 className="size-3.5" />
                                      <span className="text-xs">
                                        Sent {friendlyDate(draft.sentAt)} by {draft.sentBy || "Client"}
                                      </span>
                                    </div>
                                  )}

                                  {/* Dismissed */}
                                  {draft.status === "dismissed" && (
                                    <p className="text-xs text-muted-foreground/50">
                                      This draft was dismissed.
                                    </p>
                                  )}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </motion.div>
                      );
                    })}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
