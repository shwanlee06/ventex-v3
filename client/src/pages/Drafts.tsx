// ============================================================================
// Draft Center — Review, edit, send, or dismiss agent-generated communications
// Tabs: Pending | Sent | Dismissed
// ============================================================================

import DashboardLayout from "@/components/DashboardLayout";
import { cn } from "@/lib/utils";
import { useAgents, getAgentConfig, type AgentDraft } from "@/contexts/AgentContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import {
  FileText, Send, XCircle, Eye, RotateCcw,
  Bot, Clock, CheckCircle2, Inbox, Filter,
  Building2, User, Mail, Loader2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useCallback, useMemo } from "react";
import { toast } from "sonner";

type TabKey = "pending" | "sent" | "dismissed";

const TABS: { key: TabKey; label: string; icon: React.ReactNode }[] = [
  { key: "pending", label: "Pending", icon: <Inbox className="size-4" /> },
  { key: "sent", label: "Sent", icon: <Send className="size-4" /> },
  { key: "dismissed", label: "Dismissed", icon: <XCircle className="size-4" /> },
];

function formatTimestamp(d: string | Date): string {
  const date = new Date(d);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  if (diff < 60_000) return "Just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function DraftTypeIcon({ type }: { type: string }) {
  switch (type) {
    case "follow_up_email": return <Mail className="size-3.5 text-blue-400" />;
    case "lp_notice": return <Building2 className="size-3.5 text-emerald-400" />;
    case "status_update": return <FileText className="size-3.5 text-purple-400" />;
    default: return <FileText className="size-3.5 text-muted-foreground" />;
  }
}

export default function DraftsPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("pending");
  const [previewDraft, setPreviewDraft] = useState<AgentDraft | null>(null);
  const [editedBody, setEditedBody] = useState("");
  const [confirmDismiss, setConfirmDismiss] = useState<AgentDraft | null>(null);
  const [agentFilter, setAgentFilter] = useState<string | null>(null);

  let drafts: AgentDraft[] = [];
  let sendDraft: (id: number, body?: string) => void = () => {};
  let dismissDraft: (id: number) => void = () => {};
  let restoreDraft: (id: number) => void = () => {};
  try {
    const agents = useAgents();
    drafts = agents.drafts;
    sendDraft = agents.sendDraft;
    dismissDraft = agents.dismissDraft;
    restoreDraft = agents.restoreDraft;
  } catch {
    // AgentProvider not mounted
  }

  // Filter by tab
  const filteredDrafts = useMemo(() => {
    let items = drafts.filter(d => {
      if (activeTab === "pending") return d.status === "pending";
      if (activeTab === "sent") return d.status === "sent";
      if (activeTab === "dismissed") return d.status === "dismissed";
      return false;
    });

    if (agentFilter) {
      items = items.filter(d => d.createdByAgent === agentFilter);
    }

    // Sort by createdAt desc
    items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return items;
  }, [drafts, activeTab, agentFilter]);

  // Unique agents in current tab
  const agentNames = useMemo(() => {
    const names = new Set(filteredDrafts.map(d => d.createdByAgent));
    return Array.from(names);
  }, [filteredDrafts]);

  const tabCounts = useMemo(() => ({
    pending: drafts.filter(d => d.status === "pending").length,
    sent: drafts.filter(d => d.status === "sent").length,
    dismissed: drafts.filter(d => d.status === "dismissed").length,
  }), [drafts]);

  const handleOpenPreview = useCallback((draft: AgentDraft) => {
    setEditedBody(draft.body);
    setPreviewDraft(draft);
  }, []);

  const handleSend = useCallback(() => {
    if (!previewDraft) return;
    sendDraft(previewDraft.id, editedBody !== previewDraft.body ? editedBody : undefined);
    toast.success("Draft sent successfully");
    setPreviewDraft(null);
  }, [previewDraft, editedBody, sendDraft]);

  const handleDismiss = useCallback(() => {
    if (!confirmDismiss) return;
    dismissDraft(confirmDismiss.id);
    toast.info("Draft dismissed");
    setConfirmDismiss(null);
    setPreviewDraft(null);
  }, [confirmDismiss, dismissDraft]);

  const handleRestore = useCallback((draft: AgentDraft) => {
    restoreDraft(draft.id);
    toast.success("Draft restored to pending");
  }, [restoreDraft]);

  return (
    <DashboardLayout title="Draft Center" subtitle="AGENT-GENERATED COMMUNICATIONS">
      <div className="p-4 sm:p-5 md:p-6 space-y-5 pb-24 md:pb-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center size-10 rounded-xl bg-purple-500/10">
              <FileText className="size-5 text-purple-400" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-foreground">Draft Center</h2>
              <p className="text-xs text-muted-foreground">
                Review and manage agent-generated communications
              </p>
            </div>
          </div>
          <Badge variant="outline" className="text-[10px] font-mono gap-1">
            <Bot className="size-3" />
            {tabCounts.pending} pending
          </Badge>
        </div>

        {/* Tab bar */}
        <div className="flex items-center gap-1 border-b border-border">
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => { setActiveTab(tab.key); setAgentFilter(null); }}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px",
                activeTab === tab.key
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              {tab.icon}
              {tab.label}
              {tabCounts[tab.key] > 0 && (
                <span className={cn(
                  "text-[10px] font-mono px-1.5 py-0.5 rounded-full",
                  activeTab === tab.key ? "bg-primary/15 text-primary" : "bg-secondary text-muted-foreground"
                )}>
                  {tabCounts[tab.key]}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Agent filter pills */}
        {agentNames.length > 1 && (
          <div className="flex gap-1.5 flex-wrap">
            <button
              onClick={() => setAgentFilter(null)}
              className={cn(
                "text-[10px] font-medium px-2 py-1 rounded-full transition-colors flex items-center gap-1",
                !agentFilter ? "bg-primary/15 text-primary" : "bg-secondary/50 text-muted-foreground hover:bg-secondary"
              )}
            >
              <Filter className="size-3" />
              All agents
            </button>
            {agentNames.map(name => {
              const config = getAgentConfig(name);
              return (
                <button
                  key={name}
                  onClick={() => setAgentFilter(agentFilter === name ? null : name)}
                  className={cn(
                    "text-[10px] font-medium px-2 py-1 rounded-full transition-colors flex items-center gap-1",
                    agentFilter === name
                      ? `${config.bgColor} text-foreground`
                      : "bg-secondary/50 text-muted-foreground hover:bg-secondary"
                  )}
                >
                  <span className="size-1.5 rounded-full" style={{ backgroundColor: config.color }} />
                  {config.label}
                </button>
              );
            })}
          </div>
        )}

        {/* Draft list */}
        {filteredDrafts.length === 0 ? (
          <div className="p-16 text-center flex flex-col items-center gap-3">
            <div className="flex items-center justify-center size-14 rounded-full bg-secondary/50">
              {activeTab === "pending" ? (
                <Inbox className="size-6 text-muted-foreground" />
              ) : activeTab === "sent" ? (
                <Send className="size-6 text-muted-foreground" />
              ) : (
                <XCircle className="size-6 text-muted-foreground" />
              )}
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                No {activeTab} drafts
              </p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                {activeTab === "pending"
                  ? "Run agents to generate new draft communications"
                  : activeTab === "sent"
                    ? "Sent drafts will appear here"
                    : "Dismissed drafts will appear here"
                }
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <AnimatePresence mode="popLayout">
              {filteredDrafts.map((draft, i) => {
                const config = getAgentConfig(draft.createdByAgent);
                return (
                  <motion.div
                    key={draft.id}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ delay: i * 0.03, duration: 0.2 }}
                    className="bg-card border border-border rounded-lg p-4 hover:border-primary/20 transition-all group"
                  >
                    <div className="flex items-start gap-3">
                      {/* Agent icon */}
                      <div
                        className="flex items-center justify-center size-9 rounded-lg flex-shrink-0 mt-0.5"
                        style={{ backgroundColor: `${config.color}15` }}
                      >
                        <DraftTypeIcon type={draft.draftType} />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h3 className="text-sm font-medium text-foreground leading-tight">
                              {draft.subject}
                            </h3>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded" style={{ backgroundColor: `${config.color}15`, color: config.color }}>
                                {config.label}
                              </span>
                              <span className="text-[10px] text-muted-foreground font-mono">
                                {draft.draftType.replace(/_/g, " ")}
                              </span>
                              {draft.recipientName && (
                                <>
                                  <span className="text-[10px] text-muted-foreground/50">·</span>
                                  <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                    <User className="size-3" />
                                    {draft.recipientName}
                                  </span>
                                </>
                              )}
                              {draft.ventureName && (
                                <>
                                  <span className="text-[10px] text-muted-foreground/50">·</span>
                                  <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                    <Building2 className="size-3" />
                                    {draft.ventureName}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                          <span className="text-[10px] font-mono text-muted-foreground flex-shrink-0">
                            {formatTimestamp(draft.createdAt)}
                          </span>
                        </div>

                        {/* Preview body */}
                        <p className="text-xs text-muted-foreground mt-2 line-clamp-2 leading-relaxed">
                          {draft.body}
                        </p>

                        {/* Actions */}
                        <div className="flex items-center gap-2 mt-3">
                          {activeTab === "pending" && (
                            <>
                              <Button
                                size="sm"
                                className="h-7 text-[11px] px-3 gap-1"
                                onClick={() => handleOpenPreview(draft)}
                              >
                                <Eye className="size-3" />
                                Review & Send
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 text-[11px] px-3 gap-1"
                                onClick={() => setConfirmDismiss(draft)}
                              >
                                <XCircle className="size-3" />
                                Dismiss
                              </Button>
                            </>
                          )}
                          {activeTab === "sent" && (
                            <div className="flex items-center gap-1.5">
                              <CheckCircle2 className="size-3.5 text-emerald-400" />
                              <span className="text-[11px] text-emerald-400 font-medium">
                                Sent {draft.sentAt ? formatTimestamp(draft.sentAt) : ""}
                              </span>
                            </div>
                          )}
                          {activeTab === "dismissed" && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-[11px] px-3 gap-1"
                              onClick={() => handleRestore(draft)}
                            >
                              <RotateCcw className="size-3" />
                              Restore
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Draft Preview Modal */}
      <Dialog open={!!previewDraft} onOpenChange={(open) => !open && setPreviewDraft(null)}>
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-sm">
              <FileText className="size-4 text-purple-400" />
              Draft Preview
            </DialogTitle>
            <DialogDescription className="text-[11px]">
              {previewDraft && (
                <>
                  <span className="font-medium">{previewDraft.draftType.replace(/_/g, " ")}</span>
                  {previewDraft.ventureName && (
                    <> · <span>{previewDraft.ventureName}</span></>
                  )}
                  {previewDraft.recipientName && (
                    <> · To: <span className="font-medium">{previewDraft.recipientName}</span></>
                  )}
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          {previewDraft && (
            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-mono uppercase text-muted-foreground mb-1 block">Subject</label>
                <p className="text-xs font-medium text-foreground bg-secondary/30 rounded-md px-3 py-2">
                  {previewDraft.subject}
                </p>
              </div>
              <div>
                <label className="text-[10px] font-mono uppercase text-muted-foreground mb-1 block">Body (editable)</label>
                <Textarea
                  value={editedBody}
                  onChange={(e) => setEditedBody(e.target.value)}
                  className="min-h-[180px] text-xs leading-relaxed resize-y"
                />
              </div>
              <div className="flex items-center gap-3 text-[10px] text-muted-foreground font-mono">
                <span>Created by: {previewDraft.createdByAgent}</span>
                <span>·</span>
                <span>{formatTimestamp(previewDraft.createdAt)}</span>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-1"
              onClick={() => {
                setConfirmDismiss(previewDraft);
              }}
            >
              <XCircle className="size-3" />
              Dismiss
            </Button>
            <Button
              size="sm"
              className="gap-1"
              onClick={handleSend}
            >
              <Send className="size-3" />
              Send Draft
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dismiss confirmation */}
      <AlertDialog open={!!confirmDismiss} onOpenChange={(open) => !open && setConfirmDismiss(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-sm">Dismiss this draft?</AlertDialogTitle>
            <AlertDialogDescription className="text-xs">
              This draft will be moved to the Dismissed tab. You can restore it later if needed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="text-xs">Cancel</AlertDialogCancel>
            <AlertDialogAction className="text-xs" onClick={handleDismiss}>
              Dismiss
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
