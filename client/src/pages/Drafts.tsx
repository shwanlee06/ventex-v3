// Draft Center — Client-facing: review, edit, send, or dismiss AI-generated comms
// Grouped by venture, searchable, with bulk actions

import DashboardLayout from "@/components/DashboardLayout";
import { cn } from "@/lib/utils";
import { useAgents, getAgentConfig, type AgentDraft } from "@/contexts/AgentContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
  Bot, CheckCircle2, Inbox, Filter,
  Building2, User, Mail, Search,
  ChevronDown, ChevronRight, Layers3,
  CheckSquare, Square, Trash2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useCallback, useMemo } from "react";
import { toast } from "sonner";

type TabKey = "pending" | "sent" | "dismissed";

const TABS: { key: TabKey; label: string; icon: React.ReactNode }[] = [
  { key: "pending", label: "Pending Review", icon: <Inbox className="size-4" /> },
  { key: "sent", label: "Sent", icon: <Send className="size-4" /> },
  { key: "dismissed", label: "Dismissed", icon: <XCircle className="size-4" /> },
];

const DRAFT_TYPE_LABELS: Record<string, string> = {
  follow_up: "Follow-Up",
  lp_notice: "LP Notice",
  status_update: "Status Update",
  reminder: "Reminder",
  escalation: "Escalation",
};

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
    case "follow_up": return <Mail className="size-3.5 text-blue-400" />;
    case "lp_notice": return <Building2 className="size-3.5 text-emerald-400" />;
    case "status_update": return <FileText className="size-3.5 text-purple-400" />;
    default: return <FileText className="size-3.5 text-muted-foreground" />;
  }
}

interface VentureGroup {
  ventureName: string;
  drafts: AgentDraft[];
}

export default function DraftsPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("pending");
  const [previewDraft, setPreviewDraft] = useState<AgentDraft | null>(null);
  const [editedBody, setEditedBody] = useState("");
  const [confirmDismiss, setConfirmDismiss] = useState<AgentDraft | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<AgentDraft | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [collapsedVentures, setCollapsedVentures] = useState<Set<string>>(new Set());
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [confirmBulkDismiss, setConfirmBulkDismiss] = useState(false);
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);

  let drafts: AgentDraft[] = [];
  let sendDraft: (id: number, body?: string) => void = () => {};
  let dismissDraft: (id: number) => void = () => {};
  let restoreDraft: (id: number) => void = () => {};
  let deleteDraft: (id: number) => void = () => {};
  let bulkDeleteDrafts: (ids: number[]) => void = () => {};
  try {
    const agents = useAgents();
    drafts = agents.drafts;
    sendDraft = agents.sendDraft;
    dismissDraft = agents.dismissDraft;
    restoreDraft = agents.restoreDraft;
    deleteDraft = agents.deleteDraft;
    bulkDeleteDrafts = agents.bulkDeleteDrafts;
  } catch {
    // AgentProvider not mounted
  }

  // Filter by tab, search, and type
  const filteredDrafts = useMemo(() => {
    let items = drafts.filter(d => {
      if (activeTab === "pending") return d.status === "pending";
      if (activeTab === "sent") return d.status === "sent";
      if (activeTab === "dismissed") return d.status === "dismissed";
      return false;
    });

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      items = items.filter(d =>
        d.subject?.toLowerCase().includes(q) ||
        d.ventureName?.toLowerCase().includes(q) ||
        d.recipientName?.toLowerCase().includes(q) ||
        d.body?.toLowerCase().includes(q)
      );
    }

    if (typeFilter) {
      items = items.filter(d => d.draftType === typeFilter);
    }

    items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return items;
  }, [drafts, activeTab, searchQuery, typeFilter]);

  // Group by venture
  const ventureGroups = useMemo<VentureGroup[]>(() => {
    const map = new Map<string, AgentDraft[]>();
    for (const d of filteredDrafts) {
      const key = d.ventureName || "General";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(d);
    }
    return Array.from(map.entries())
      .map(([ventureName, drafts]) => ({ ventureName, drafts }))
      .sort((a, b) => b.drafts.length - a.drafts.length);
  }, [filteredDrafts]);

  // Unique draft types in current tab
  const draftTypes = useMemo(() => {
    const types = new Set(filteredDrafts.map(d => d.draftType));
    return Array.from(types);
  }, [filteredDrafts]);

  const tabCounts = useMemo(() => ({
    pending: drafts.filter(d => d.status === "pending").length,
    sent: drafts.filter(d => d.status === "sent").length,
    dismissed: drafts.filter(d => d.status === "dismissed").length,
  }), [drafts]);

  const toggleVentureCollapse = useCallback((ventureName: string) => {
    setCollapsedVentures(prev => {
      const next = new Set(prev);
      if (next.has(ventureName)) next.delete(ventureName);
      else next.add(ventureName);
      return next;
    });
  }, []);

  const toggleSelect = useCallback((id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    if (selectedIds.size === filteredDrafts.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredDrafts.map(d => d.id)));
    }
  }, [selectedIds, filteredDrafts]);

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

  const handleDelete = useCallback(() => {
    if (!confirmDelete) return;
    deleteDraft(confirmDelete.id);
    toast.success("Draft permanently deleted");
    setConfirmDelete(null);
  }, [confirmDelete, deleteDraft]);

  const handleBulkDismiss = useCallback(() => {
    Array.from(selectedIds).forEach(id => {
      dismissDraft(id);
    });
    toast.info(`${selectedIds.size} drafts dismissed`);
    setSelectedIds(new Set());
    setConfirmBulkDismiss(false);
  }, [selectedIds, dismissDraft]);

  const handleBulkRestore = useCallback(() => {
    Array.from(selectedIds).forEach(id => {
      restoreDraft(id);
    });
    toast.success(`${selectedIds.size} drafts restored`);
    setSelectedIds(new Set());
  }, [selectedIds, restoreDraft]);

  const handleBulkDelete = useCallback(() => {
    bulkDeleteDrafts(Array.from(selectedIds));
    toast.success(`${selectedIds.size} drafts permanently deleted`);
    setSelectedIds(new Set());
    setConfirmBulkDelete(false);
  }, [selectedIds, bulkDeleteDrafts]);

  return (
    <DashboardLayout title="Draft Center" subtitle="AI-GENERATED COMMUNICATIONS">
      <div className="p-4 sm:p-5 md:p-6 space-y-4 pb-24 md:pb-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center size-10 rounded-xl bg-purple-500/10">
              <FileText className="size-5 text-purple-400" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-foreground">Draft Center</h2>
              <p className="text-xs text-muted-foreground">
                Review and approve AI-generated communications before they're sent
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
              onClick={() => { setActiveTab(tab.key); setSearchQuery(""); setTypeFilter(null); setSelectedIds(new Set()); }}
              className={cn(
                "flex items-center gap-2 px-3 sm:px-4 py-2.5 text-xs sm:text-sm font-medium transition-colors border-b-2 -mb-px whitespace-nowrap touch-manipulation",
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

        {/* Search + Filter bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
          <div className="relative flex-1 min-w-0 sm:min-w-[200px] sm:max-w-[360px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Search by venture, subject, or recipient..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-9 text-xs"
            />
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            {draftTypes.map(type => (
              <button
                key={type}
                onClick={() => setTypeFilter(typeFilter === type ? null : type)}
                className={cn(
                  "text-[10px] font-medium px-2.5 py-1.5 rounded-full transition-colors flex items-center gap-1",
                  typeFilter === type
                    ? "bg-primary/15 text-primary"
                    : "bg-secondary/50 text-muted-foreground hover:bg-secondary"
                )}
              >
                <DraftTypeIcon type={type} />
                {DRAFT_TYPE_LABELS[type] || type}
              </button>
            ))}
          </div>
        </div>

        {/* Bulk action bar */}
        {selectedIds.size > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 p-3 bg-primary/5 border border-primary/20 rounded-lg"
          >
            <span className="text-xs font-medium text-primary">
              {selectedIds.size} selected
            </span>
            <div className="flex-1" />
            {activeTab === "pending" && (
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-[11px] px-3 gap-1"
                onClick={() => setConfirmBulkDismiss(true)}
              >
                <XCircle className="size-3" />
                Dismiss Selected
              </Button>
            )}
            {activeTab === "dismissed" && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-[11px] px-3 gap-1"
                  onClick={handleBulkRestore}
                >
                  <RotateCcw className="size-3" />
                  Restore Selected
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-[11px] px-3 gap-1 text-red-400 border-red-500/30 hover:bg-red-500/10"
                  onClick={() => setConfirmBulkDelete(true)}
                >
                  <Trash2 className="size-3" />
                  Delete Selected
                </Button>
              </>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-[11px] px-2"
              onClick={() => setSelectedIds(new Set())}
            >
              Clear
            </Button>
          </motion.div>
        )}

        {/* Draft list — grouped by venture */}
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
                {searchQuery ? "No matching drafts" : `No ${activeTab === "pending" ? "pending" : activeTab} drafts`}
              </p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                {searchQuery
                  ? "Try adjusting your search or filters"
                  : activeTab === "pending"
                    ? "VENTEX AI will generate drafts as it works on your ventures"
                    : activeTab === "sent"
                      ? "Approved drafts will appear here"
                      : "Dismissed drafts will appear here"
                }
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Select all toggle */}
            {(activeTab === "pending" || activeTab === "dismissed") && filteredDrafts.length > 1 && (
              <button
                onClick={toggleSelectAll}
                className="flex items-center gap-2 text-[11px] text-muted-foreground hover:text-foreground transition-colors px-1"
              >
                {selectedIds.size === filteredDrafts.length ? (
                  <CheckSquare className="size-3.5 text-primary" />
                ) : (
                  <Square className="size-3.5" />
                )}
                {selectedIds.size === filteredDrafts.length ? "Deselect all" : "Select all"}
              </button>
            )}

            {ventureGroups.map((group) => {
              const isCollapsed = collapsedVentures.has(group.ventureName);
              return (
                <div key={group.ventureName} className="bg-card border border-border rounded-lg overflow-hidden">
                  {/* Venture group header */}
                  <button
                    onClick={() => toggleVentureCollapse(group.ventureName)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-accent/30 transition-colors"
                  >
                    {isCollapsed ? (
                      <ChevronRight className="size-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="size-4 text-muted-foreground" />
                    )}
                    <Layers3 className="size-4 text-primary/60" />
                    <span className="text-sm font-medium text-foreground">{group.ventureName}</span>
                    <span className="text-[10px] font-mono text-muted-foreground ml-auto">
                      {group.drafts.length} {group.drafts.length === 1 ? "draft" : "drafts"}
                    </span>
                  </button>

                  {/* Drafts within venture */}
                  <AnimatePresence initial={false}>
                    {!isCollapsed && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="divide-y divide-border border-t border-border">
                          {group.drafts.map((draft) => {
                            const config = getAgentConfig(draft.createdByAgent);
                            const isSelected = selectedIds.has(draft.id);
                            return (
                              <div
                                key={draft.id}
                                className={cn(
                                  "px-4 py-3 hover:bg-accent/20 transition-all group flex gap-3",
                                  isSelected && "bg-primary/5"
                                )}
                              >
                                {/* Selection checkbox */}
                                {(activeTab === "pending" || activeTab === "dismissed") && (
                                  <button
                                    onClick={() => toggleSelect(draft.id)}
                                    className="flex-shrink-0 mt-0.5"
                                  >
                                    {isSelected ? (
                                      <CheckSquare className="size-4 text-primary" />
                                    ) : (
                                      <Square className="size-4 text-muted-foreground/40 group-hover:text-muted-foreground" />
                                    )}
                                  </button>
                                )}

                                {/* Draft type icon */}
                                <div
                                  className="flex items-center justify-center size-8 rounded-lg flex-shrink-0 mt-0.5"
                                  style={{ backgroundColor: `${config.color}15` }}
                                >
                                  <DraftTypeIcon type={draft.draftType} />
                                </div>

                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-start justify-between gap-2">
                                    <div>
                                      <h3 className="text-xs font-medium text-foreground leading-tight">
                                        {draft.subject}
                                      </h3>
                                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                                        <span
                                          className="text-[10px] font-mono px-1.5 py-0.5 rounded"
                                          style={{ backgroundColor: `${config.color}15`, color: config.color }}
                                        >
                                          {config.label}
                                        </span>
                                        <span className="text-[10px] text-muted-foreground font-mono">
                                          {DRAFT_TYPE_LABELS[draft.draftType] || draft.draftType}
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
                                      </div>
                                    </div>
                                    <span className="text-[10px] font-mono text-muted-foreground flex-shrink-0">
                                      {formatTimestamp(draft.createdAt)}
                                    </span>
                                  </div>

                                  {/* Preview body */}
                                  <p className="text-[11px] text-muted-foreground mt-1.5 line-clamp-1 leading-relaxed">
                                    {draft.body}
                                  </p>

                                  {/* Actions */}
                                  <div className="flex items-center gap-2 mt-2">
                                    {activeTab === "pending" && (
                                      <>
                                        <Button
                                          size="sm"
                                          className="h-7 text-[11px] px-3 gap-1"
                                          onClick={() => handleOpenPreview(draft)}
                                        >
                                          <Eye className="size-3" />
                                          Review & Approve
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
                                      <>
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          className="h-7 text-[11px] px-3 gap-1"
                                          onClick={() => handleRestore(draft)}
                                        >
                                          <RotateCcw className="size-3" />
                                          Restore
                                        </Button>
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          className="h-7 text-[11px] px-3 gap-1 text-red-400 border-red-500/30 hover:bg-red-500/10"
                                          onClick={() => setConfirmDelete(draft)}
                                        >
                                          <Trash2 className="size-3" />
                                          Delete
                                        </Button>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Draft Preview Modal */}
      <Dialog open={!!previewDraft} onOpenChange={(open) => !open && setPreviewDraft(null)}>
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-sm">
              <FileText className="size-4 text-purple-400" />
              Review Draft
            </DialogTitle>
            <DialogDescription className="text-[11px]">
              {previewDraft && (
                <>
                  <span className="font-medium">{DRAFT_TYPE_LABELS[previewDraft.draftType] || previewDraft.draftType}</span>
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
                <span>Generated by: {previewDraft.createdByAgent}</span>
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
              Approve & Send
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

      {/* Delete confirmation (single) */}
      <AlertDialog open={!!confirmDelete} onOpenChange={(open) => !open && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-sm">Permanently delete this draft?</AlertDialogTitle>
            <AlertDialogDescription className="text-xs">
              This action cannot be undone. The draft will be permanently removed from the system.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="text-xs">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="text-xs bg-red-600 hover:bg-red-700 text-white"
              onClick={handleDelete}
            >
              Delete Permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk dismiss confirmation */}
      <AlertDialog open={confirmBulkDismiss} onOpenChange={setConfirmBulkDismiss}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-sm">Dismiss {selectedIds.size} drafts?</AlertDialogTitle>
            <AlertDialogDescription className="text-xs">
              These drafts will be moved to the Dismissed tab. You can restore them individually later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="text-xs">Cancel</AlertDialogCancel>
            <AlertDialogAction className="text-xs" onClick={handleBulkDismiss}>
              Dismiss All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk delete confirmation */}
      <AlertDialog open={confirmBulkDelete} onOpenChange={setConfirmBulkDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-sm">Permanently delete {selectedIds.size} drafts?</AlertDialogTitle>
            <AlertDialogDescription className="text-xs">
              This action cannot be undone. All selected drafts will be permanently removed from the system.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="text-xs">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="text-xs bg-red-600 hover:bg-red-700 text-white"
              onClick={handleBulkDelete}
            >
              Delete All Permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
