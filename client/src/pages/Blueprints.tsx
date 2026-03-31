// ============================================================================
// Blueprints Page — Blueprint Intelligence Engine
// Three-layer architecture: System defaults → Client blueprints → Venture overrides
// ============================================================================
import DashboardLayout from "@/components/DashboardLayout";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import {
  Layers3,
  Plus,
  Sparkles,
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ChevronRight,
  ChevronDown,
  RefreshCw,
  Upload,
  MessageSquare,
  Shield,
  ShieldCheck,
  Archive,
  Pencil,
  Trash2,
  X,
  GripVertical,
  ArrowRight,
  Send,
  Bot,
  Copy,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "sonner";
import { useState, useMemo, useCallback, useRef, useEffect } from "react";

const SECTORS = [
  "Real Estate",
  "Yacht",
  "F&B",
  "Hospitality",
  "Oil & Gas",
  "Energy",
  "Entertainment",
  "Others",
];

const SOURCE_LABELS: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  system: { label: "System Default", icon: <Shield className="size-3" />, color: "text-blue-400 bg-blue-500/10" },
  document: { label: "Document", icon: <FileText className="size-3" />, color: "text-violet-400 bg-violet-500/10" },
  conversation: { label: "Conversation", icon: <MessageSquare className="size-3" />, color: "text-emerald-400 bg-emerald-500/10" },
  ai_generated: { label: "AI Generated", icon: <Sparkles className="size-3" />, color: "text-amber-400 bg-amber-500/10" },
  auto_generated: { label: "AI Generated", icon: <Sparkles className="size-3" />, color: "text-amber-400 bg-amber-500/10" },
  manual: { label: "Manual", icon: <Pencil className="size-3" />, color: "text-gray-400 bg-gray-500/10" },
};

const STATUS_STYLES: Record<string, { label: string; bg: string; text: string; icon: React.ReactNode }> = {
  draft: { label: "Draft", bg: "bg-amber-500/10", text: "text-amber-400", icon: <AlertCircle className="size-3" /> },
  confirmed: { label: "Confirmed", bg: "bg-emerald-500/10", text: "text-emerald-400", icon: <ShieldCheck className="size-3" /> },
  archived: { label: "Archived", bg: "bg-gray-500/10", text: "text-gray-400", icon: <Archive className="size-3" /> },
};

type Tab = "all" | "upload" | "conversation";

export default function BlueprintsPage() {
  const { organizations, activeOrg, activeOrgId } = useWorkspace();
  const [selectedOrgId, setSelectedOrgId] = useState<number | undefined>(activeOrgId);
  const [activeTab, setActiveTab] = useState<Tab>("all");
  const [expandedBp, setExpandedBp] = useState<number | null>(null);

  // Create dialog
  const [showCreate, setShowCreate] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createSector, setCreateSector] = useState("Real Estate");

  // Generate dialog
  const [showGenerate, setShowGenerate] = useState(false);
  const [generateSector, setGenerateSector] = useState("Real Estate");

  // Upload state
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadText, setUploadText] = useState("");
  const [isExtracting, setIsExtracting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Conversation state
  const [chatMessages, setChatMessages] = useState<Array<{ role: "user" | "assistant"; content: string }>>([]);
  const [chatInput, setChatInput] = useState("");
  const [isChatting, setIsChatting] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Step editor state
  const [editingStep, setEditingStep] = useState<number | null>(null);
  const [editStepName, setEditStepName] = useState("");
  const [editWhoOwns, setEditWhoOwns] = useState("");
  const [editDays, setEditDays] = useState("");
  const [editBlocking, setEditBlocking] = useState(false);

  const orgId = selectedOrgId || activeOrgId;

  // Fetch blueprints
  const {
    data: blueprints,
    isLoading,
    refetch,
  } = trpc.blueprints.list.useQuery(
    { organizationId: orgId! },
    { enabled: !!orgId }
  );

  // Fetch steps for expanded blueprint
  const {
    data: expandedData,
    isLoading: stepsLoading,
  } = trpc.blueprints.getTemplateWithSteps.useQuery(
    { templateId: expandedBp! },
    { enabled: !!expandedBp }
  );

  const utils = trpc.useUtils();

  // Mutations
  const generateMutation = trpc.blueprints.generateFromSector.useMutation({
    onSuccess: () => {
      toast.success("Blueprint generated");
      setShowGenerate(false);
      refetch();
    },
    onError: (err) => toast.error(err.message || "Generation failed"),
  });

  const createMutation = trpc.blueprints.create.useMutation({
    onSuccess: () => {
      toast.success("Blueprint created");
      setShowCreate(false);
      setCreateName("");
      refetch();
    },
    onError: (err) => toast.error(err.message || "Creation failed"),
  });

  const confirmMutation = trpc.blueprints.confirmTemplate.useMutation({
    onSuccess: () => {
      toast.success("Blueprint confirmed — agents will now use this blueprint");
      refetch();
      if (expandedBp) utils.blueprints.getTemplateWithSteps.invalidate({ templateId: expandedBp });
    },
    onError: (err) => toast.error(err.message),
  });

  const archiveMutation = trpc.blueprints.archiveTemplate.useMutation({
    onSuccess: () => {
      toast.success("Blueprint archived");
      setExpandedBp(null);
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const updateStepMutation = trpc.blueprints.updateStep.useMutation({
    onSuccess: () => {
      toast.success("Step updated");
      setEditingStep(null);
      if (expandedBp) utils.blueprints.getTemplateWithSteps.invalidate({ templateId: expandedBp });
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteStepMutation = trpc.blueprints.deleteStep.useMutation({
    onSuccess: () => {
      toast.success("Step removed");
      if (expandedBp) utils.blueprints.getTemplateWithSteps.invalidate({ templateId: expandedBp });
    },
    onError: (err) => toast.error(err.message),
  });

  const extractDocMutation = trpc.blueprints.extractFromDocument.useMutation({
    onSuccess: (data) => {
      toast.success(`Extracted ${data.stepsCreated} steps from document`);
      setUploadText("");
      setUploadFile(null);
      setActiveTab("all");
      refetch();
      setExpandedBp(data.templateId);
    },
    onError: (err) => toast.error(err.message),
  });

  const conversationMutation = trpc.blueprints.conversationExtract.useMutation({
    onSuccess: (data) => {
      setChatMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
      setIsChatting(false);
      if (data.isComplete && data.templateId) {
        toast.success("Blueprint extracted from conversation!");
        refetch();
        setExpandedBp(data.templateId);
        setTimeout(() => setActiveTab("all"), 500);
      }
    },
    onError: (err) => {
      toast.error(err.message);
      setIsChatting(false);
    },
  });

  const uploadDocMutation = trpc.blueprints.uploadAndExtract.useMutation({
    onSuccess: (data: any) => {
      setUploadText(data.extractedText);
      setIsExtracting(false);
      toast.success("Text extracted — review and confirm to create blueprint");
    },
    onError: (err: any) => {
      toast.error(err.message);
      setIsExtracting(false);
    },
  });

  // Handlers
  const handleFileUpload = useCallback(async (file: File) => {
    if (!orgId) return;
    setUploadFile(file);
    setIsExtracting(true);

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(",")[1];
      uploadDocMutation.mutate({
        fileBase64: base64,
        fileName: file.name,
        mimeType: file.type,
        organizationId: orgId,
      });
    };
    reader.readAsDataURL(file);
  }, [orgId, uploadDocMutation]);

  const handleExtractFromText = useCallback(() => {
    if (!orgId || !uploadText.trim()) return;
    extractDocMutation.mutate({
      documentText: uploadText.trim(),
      organizationId: orgId,
      sourceDocumentName: uploadFile?.name,
    });
  }, [orgId, uploadText, uploadFile, extractDocMutation]);

  const handleSendChat = useCallback(() => {
    if (!orgId || !chatInput.trim() || isChatting) return;
    const newMessages = [...chatMessages, { role: "user" as const, content: chatInput.trim() }];
    setChatMessages(newMessages);
    setChatInput("");
    setIsChatting(true);
    conversationMutation.mutate({
      messages: newMessages,
      organizationId: orgId,
    });
  }, [orgId, chatInput, chatMessages, isChatting, conversationMutation]);

  const handleEditStep = useCallback((step: any) => {
    setEditingStep(step.id);
    setEditStepName(step.stepName);
    setEditWhoOwns(step.whoOwns || "");
    setEditDays(step.typicalDays?.toString() || "");
    setEditBlocking(step.isBlocking);
  }, []);

  const handleSaveStep = useCallback(() => {
    if (!editingStep) return;
    updateStepMutation.mutate({
      stepId: editingStep,
      stepName: editStepName || undefined,
      whoOwns: editWhoOwns || undefined,
      estimatedDays: editDays ? parseInt(editDays) : undefined,
      isBlocking: editBlocking,
    });
  }, [editingStep, editStepName, editWhoOwns, editDays, editBlocking, updateStepMutation]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  const activeOrgs = useMemo(
    () => organizations.filter((o) => o.status === "active"),
    [organizations]
  );

  // Group steps by stage
  const groupedSteps = useMemo(() => {
    if (!expandedData?.steps) return [];
    const groups: Array<{ stageName: string; stageOrder: number; steps: any[] }> = [];
    for (const step of expandedData.steps) {
      let group = groups.find((g) => g.stageName === step.stageName);
      if (!group) {
        group = { stageName: step.stageName, stageOrder: step.stageOrder, steps: [] };
        groups.push(group);
      }
      group.steps.push(step);
    }
    return groups.sort((a, b) => a.stageOrder - b.stageOrder);
  }, [expandedData?.steps]);

  return (
    <DashboardLayout title="Blueprints" subtitle="INTELLIGENCE ENGINE">
      <div className="p-4 md:p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center size-9 rounded-lg bg-primary/10">
              <Layers3 className="size-5 text-primary" />
            </div>
            <div>
              <h1 className="text-base font-semibold text-foreground">
                Blueprint Intelligence
              </h1>
              <p className="text-xs text-muted-foreground">
                Three-layer process architecture for venture lifecycle management
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {activeOrgs.length > 1 && (
              <Select
                value={String(orgId || "")}
                onValueChange={(v) => setSelectedOrgId(Number(v))}
              >
                <SelectTrigger className="h-8 w-[180px] text-xs">
                  <SelectValue placeholder="Select client" />
                </SelectTrigger>
                <SelectContent>
                  {activeOrgs.map((org) => (
                    <SelectItem key={org.id} value={String(org.id)}>
                      {org.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

        {/* Tab bar */}
        {orgId && (
          <div className="flex items-center gap-1 border-b border-border pb-px">
            {[
              { key: "all" as Tab, label: "All Blueprints", icon: <Layers3 className="size-3.5" /> },
              { key: "upload" as Tab, label: "Upload Document", icon: <Upload className="size-3.5" /> },
              { key: "conversation" as Tab, label: "Conversation Extract", icon: <MessageSquare className="size-3.5" /> },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors border-b-2 -mb-px",
                  activeTab === tab.key
                    ? "border-primary text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}

            <div className="flex-1" />

            <div className="flex items-center gap-1.5 pb-1">
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-[11px] gap-1"
                onClick={() => setShowGenerate(true)}
                disabled={!orgId}
              >
                <Sparkles className="size-3" />
                Generate
              </Button>
              <Button
                size="sm"
                className="h-7 text-[11px] gap-1"
                onClick={() => setShowCreate(true)}
                disabled={!orgId}
              >
                <Plus className="size-3" />
                Create
              </Button>
            </div>
          </div>
        )}

        {/* No org selected */}
        {!orgId && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Layers3 className="size-12 text-muted-foreground/30 mb-4" />
            <h3 className="text-sm font-medium text-foreground mb-1">Select a client</h3>
            <p className="text-xs text-muted-foreground max-w-sm">
              Choose a client organization to view and manage their process blueprints.
            </p>
          </div>
        )}

        {/* ── TAB: All Blueprints ──────────────────────────────────────────── */}
        {orgId && activeTab === "all" && (
          <>
            {isLoading && (
              <div className="grid grid-cols-1 gap-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-24 rounded-lg" />
                ))}
              </div>
            )}

            {!isLoading && (!blueprints || blueprints.length === 0) && (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="flex items-center justify-center size-16 rounded-2xl bg-primary/5 mb-4">
                  <FileText className="size-8 text-muted-foreground/40" />
                </div>
                <h3 className="text-sm font-medium text-foreground mb-1">No blueprints yet</h3>
                <p className="text-xs text-muted-foreground max-w-sm mb-4">
                  Upload a document, have a conversation with ATLAS Concierge, or generate from a sector template.
                </p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="text-xs gap-1.5" onClick={() => setActiveTab("upload")}>
                    <Upload className="size-3.5" />
                    Upload Document
                  </Button>
                  <Button variant="outline" size="sm" className="text-xs gap-1.5" onClick={() => setActiveTab("conversation")}>
                    <MessageSquare className="size-3.5" />
                    Conversation
                  </Button>
                  <Button size="sm" className="text-xs gap-1.5" onClick={() => setShowGenerate(true)}>
                    <Sparkles className="size-3.5" />
                    Generate
                  </Button>
                </div>
              </div>
            )}

            {!isLoading && blueprints && blueprints.length > 0 && (
              <div className="space-y-2">
                {blueprints.map((bp, i) => {
                  const src = SOURCE_LABELS[bp.source || "document"] || SOURCE_LABELS.document;
                  const status = STATUS_STYLES[bp.status || "draft"] || STATUS_STYLES.draft;
                  const isExpanded = expandedBp === bp.id;

                  return (
                    <motion.div
                      key={bp.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.03, duration: 0.25 }}
                      className="bg-card border border-border rounded-lg overflow-hidden"
                    >
                      {/* Blueprint header row */}
                      <div
                        onClick={() => setExpandedBp(isExpanded ? null : bp.id)}
                        className="p-4 flex items-center gap-3 cursor-pointer hover:bg-accent/30 transition-colors"
                      >
                        <ChevronRight
                          className={cn(
                            "size-4 text-muted-foreground transition-transform flex-shrink-0",
                            isExpanded && "rotate-90"
                          )}
                        />

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-medium text-foreground truncate">
                              {bp.blueprintName}
                            </span>
                            <Badge variant="secondary" className={cn("text-[10px] px-1.5 py-0 gap-0.5 flex-shrink-0", src.color)}>
                              {src.icon}
                              {src.label}
                            </Badge>
                            <Badge variant="secondary" className={cn("text-[10px] px-1.5 py-0 gap-0.5 flex-shrink-0", status.bg, status.text)}>
                              {status.icon}
                              {status.label}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                            <span className="font-mono">{bp.sector}</span>
                            <span>·</span>
                            <span>{bp.refinementCount} refinements</span>
                            <span>·</span>
                            <span>{new Date(bp.createdAt).toLocaleDateString()}</span>
                          </div>
                        </div>

                        {/* Quick actions */}
                        <div className="flex items-center gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                          {bp.status === "draft" && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 w-7 p-0 text-emerald-400 hover:text-emerald-300"
                                    onClick={() => confirmMutation.mutate({ templateId: bp.id })}
                                    disabled={confirmMutation.isPending}
                                  >
                                    {confirmMutation.isPending ? (
                                      <Loader2 className="size-3.5 animate-spin" />
                                    ) : (
                                      <ShieldCheck className="size-3.5" />
                                    )}
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent side="bottom" className="text-xs">
                                  Confirm blueprint
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 w-7 p-0 text-muted-foreground hover:text-red-400"
                                  onClick={() => archiveMutation.mutate({ templateId: bp.id })}
                                  disabled={archiveMutation.isPending}
                                >
                                  <Archive className="size-3.5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent side="bottom" className="text-xs">
                                Archive blueprint
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      </div>

                      {/* Expanded: Steps editor */}
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                          >
                            <div className="border-t border-border px-4 py-3">
                              {stepsLoading ? (
                                <div className="space-y-2">
                                  {Array.from({ length: 3 }).map((_, i) => (
                                    <Skeleton key={i} className="h-12 rounded" />
                                  ))}
                                </div>
                              ) : groupedSteps.length === 0 ? (
                                <p className="text-xs text-muted-foreground py-4 text-center">
                                  No steps defined yet. Add steps to this blueprint.
                                </p>
                              ) : (
                                <div className="space-y-4">
                                  {groupedSteps.map((group) => (
                                    <div key={group.stageName}>
                                      <div className="flex items-center gap-2 mb-2">
                                        <div className="size-1.5 rounded-full bg-primary" />
                                        <span className="text-xs font-semibold text-foreground uppercase tracking-wider">
                                          {group.stageName}
                                        </span>
                                        <span className="text-[10px] font-mono text-muted-foreground">
                                          {group.steps.length} steps
                                        </span>
                                      </div>

                                      <div className="space-y-1 ml-3">
                                        {group.steps.map((step: any) => (
                                          <div
                                            key={step.id}
                                            className="flex items-center gap-2 py-1.5 px-2 rounded hover:bg-accent/20 transition-colors group/step"
                                          >
                                            {editingStep === step.id ? (
                                              // Inline editor
                                              <div className="flex-1 flex items-center gap-2 flex-wrap">
                                                <Input
                                                  value={editStepName}
                                                  onChange={(e) => setEditStepName(e.target.value)}
                                                  className="h-7 text-xs flex-1 min-w-[200px]"
                                                  placeholder="Step name"
                                                />
                                                <Input
                                                  value={editWhoOwns}
                                                  onChange={(e) => setEditWhoOwns(e.target.value)}
                                                  className="h-7 text-xs w-32"
                                                  placeholder="Owner"
                                                />
                                                <Input
                                                  value={editDays}
                                                  onChange={(e) => setEditDays(e.target.value)}
                                                  className="h-7 text-xs w-16"
                                                  placeholder="Days"
                                                  type="number"
                                                />
                                                <label className="flex items-center gap-1 text-[10px] text-muted-foreground">
                                                  <Checkbox
                                                    checked={editBlocking}
                                                    onCheckedChange={(v) => setEditBlocking(!!v)}
                                                    className="size-3"
                                                  />
                                                  Blocking
                                                </label>
                                                <Button size="sm" className="h-6 text-[10px] px-2" onClick={handleSaveStep}>
                                                  Save
                                                </Button>
                                                <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2" onClick={() => setEditingStep(null)}>
                                                  Cancel
                                                </Button>
                                              </div>
                                            ) : (
                                              // Display row
                                              <>
                                                <span className="text-[10px] font-mono text-muted-foreground w-5 text-right flex-shrink-0">
                                                  {step.stepOrder}
                                                </span>
                                                {step.isBlocking && (
                                                  <span className="text-[9px] font-bold text-red-400 bg-red-500/10 px-1 rounded flex-shrink-0">
                                                    BLOCK
                                                  </span>
                                                )}
                                                <span className="text-xs text-foreground flex-1 min-w-0 truncate">
                                                  {step.stepName}
                                                </span>
                                                {step.whoOwns && (
                                                  <span className="text-[10px] text-muted-foreground font-mono flex-shrink-0">
                                                    {step.whoOwns}
                                                  </span>
                                                )}
                                                {step.typicalDays && (
                                                  <span className="text-[10px] text-muted-foreground font-mono flex-shrink-0">
                                                    ~{step.typicalDays}d
                                                  </span>
                                                )}
                                                <div className="flex items-center gap-0.5 opacity-0 group-hover/step:opacity-100 transition-opacity flex-shrink-0">
                                                  <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-5 w-5 p-0"
                                                    onClick={() => handleEditStep(step)}
                                                  >
                                                    <Pencil className="size-3 text-muted-foreground" />
                                                  </Button>
                                                  <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-5 w-5 p-0"
                                                    onClick={() => deleteStepMutation.mutate({ stepId: step.id })}
                                                  >
                                                    <Trash2 className="size-3 text-muted-foreground hover:text-red-400" />
                                                  </Button>
                                                </div>
                                              </>
                                            )}
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* ── TAB: Upload Document ─────────────────────────────────────────── */}
        {orgId && activeTab === "upload" && (
          <div className="max-w-2xl mx-auto space-y-4">
            <div className="bg-card border border-border rounded-lg p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex items-center justify-center size-10 rounded-lg bg-violet-500/10">
                  <Upload className="size-5 text-violet-400" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-foreground">
                    Extract Blueprint from Document
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Upload a process document or paste text — ATLAS will extract a structured blueprint
                  </p>
                </div>
              </div>

              {/* File upload zone */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-primary/40 transition-colors mb-4"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileUpload(file);
                  }}
                />
                {isExtracting ? (
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="size-8 text-primary animate-spin" />
                    <span className="text-xs text-muted-foreground">
                      Extracting text from {uploadFile?.name}...
                    </span>
                  </div>
                ) : uploadFile ? (
                  <div className="flex flex-col items-center gap-2">
                    <FileText className="size-8 text-violet-400" />
                    <span className="text-xs text-foreground font-medium">{uploadFile.name}</span>
                    <span className="text-[10px] text-muted-foreground">Click to replace</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <Upload className="size-8 text-muted-foreground/40" />
                    <span className="text-xs text-muted-foreground">
                      Drop a file here or click to upload
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      PDF, DOC, TXT, or images supported
                    </span>
                  </div>
                )}
              </div>

              {/* Or paste text */}
              <div className="relative">
                <div className="absolute -top-2.5 left-4 bg-card px-2">
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                    Or paste text directly
                  </span>
                </div>
                <Textarea
                  value={uploadText}
                  onChange={(e) => setUploadText(e.target.value)}
                  placeholder="Paste process documentation, SOPs, or operational notes here..."
                  className="min-h-[200px] text-xs resize-y"
                />
              </div>

              <div className="flex justify-end mt-4">
                <Button
                  size="sm"
                  className="gap-1.5"
                  onClick={handleExtractFromText}
                  disabled={!uploadText.trim() || extractDocMutation.isPending}
                >
                  {extractDocMutation.isPending ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="size-3.5" />
                  )}
                  Extract Blueprint
                </Button>
              </div>
            </div>

            {/* Layer explanation */}
            <div className="bg-card/50 border border-border/50 rounded-lg p-4">
              <h3 className="text-xs font-semibold text-foreground mb-2">How it works</h3>
              <div className="space-y-2 text-[11px] text-muted-foreground">
                <div className="flex items-start gap-2">
                  <span className="text-primary font-mono font-bold">1.</span>
                  <span>Upload a document or paste text describing your venture process</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-primary font-mono font-bold">2.</span>
                  <span>ATLAS extracts stages, steps, owners, and timelines into a structured blueprint</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-primary font-mono font-bold">3.</span>
                  <span>Review and edit the extracted blueprint, then confirm to activate it</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-primary font-mono font-bold">4.</span>
                  <span>Agents will use your confirmed blueprint instead of sector defaults</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── TAB: Conversation Extract ────────────────────────────────────── */}
        {orgId && activeTab === "conversation" && (
          <div className="max-w-2xl mx-auto">
            <div className="bg-card border border-border rounded-lg overflow-hidden">
              <div className="p-4 border-b border-border flex items-center gap-3">
                <div className="flex items-center justify-center size-8 rounded-lg bg-emerald-500/10">
                  <Bot className="size-4 text-emerald-400" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-foreground">
                    ATLAS Concierge
                  </h2>
                  <p className="text-[10px] text-muted-foreground">
                    Describe your process — I'll build a blueprint from our conversation
                  </p>
                </div>
                {chatMessages.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="ml-auto h-7 text-[10px] gap-1 text-muted-foreground"
                    onClick={() => setChatMessages([])}
                  >
                    <RefreshCw className="size-3" />
                    Reset
                  </Button>
                )}
              </div>

              {/* Chat messages */}
              <ScrollArea className="h-[400px]">
                <div className="p-4 space-y-3">
                  {chatMessages.length === 0 && (
                    <div className="text-center py-12">
                      <MessageSquare className="size-10 text-muted-foreground/20 mx-auto mb-3" />
                      <p className="text-xs text-muted-foreground mb-1">
                        Start a conversation to build a blueprint
                      </p>
                      <p className="text-[10px] text-muted-foreground max-w-xs mx-auto">
                        Tell me about your venture process — what sector, what stages, what steps are involved?
                      </p>
                    </div>
                  )}

                  {chatMessages.map((msg, i) => (
                    <div
                      key={i}
                      className={cn(
                        "flex gap-2",
                        msg.role === "user" ? "justify-end" : "justify-start"
                      )}
                    >
                      {msg.role === "assistant" && (
                        <div className="size-6 rounded-full bg-emerald-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Bot className="size-3 text-emerald-400" />
                        </div>
                      )}
                      <div
                        className={cn(
                          "max-w-[80%] rounded-lg px-3 py-2 text-xs",
                          msg.role === "user"
                            ? "bg-primary text-primary-foreground"
                            : "bg-accent/50 text-foreground"
                        )}
                      >
                        {msg.content}
                      </div>
                    </div>
                  ))}

                  {isChatting && (
                    <div className="flex gap-2">
                      <div className="size-6 rounded-full bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                        <Bot className="size-3 text-emerald-400" />
                      </div>
                      <div className="bg-accent/50 rounded-lg px-3 py-2">
                        <Loader2 className="size-3 animate-spin text-muted-foreground" />
                      </div>
                    </div>
                  )}

                  <div ref={chatEndRef} />
                </div>
              </ScrollArea>

              {/* Chat input */}
              <div className="p-3 border-t border-border flex gap-2">
                <Input
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Describe your venture process..."
                  className="h-9 text-xs"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSendChat();
                    }
                  }}
                />
                <Button
                  size="sm"
                  className="h-9 px-3"
                  onClick={handleSendChat}
                  disabled={!chatInput.trim() || isChatting}
                >
                  <Send className="size-3.5" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Generate from Sector Dialog */}
      <Dialog open={showGenerate} onOpenChange={setShowGenerate}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base">Generate Blueprint</DialogTitle>
            <DialogDescription className="text-xs">
              Use AI to generate a standard process blueprint for the selected sector.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <label className="text-xs font-medium text-foreground mb-1.5 block">Sector</label>
              <Select value={generateSector} onValueChange={setGenerateSector}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SECTORS.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setShowGenerate(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              className="gap-1.5"
              onClick={() => {
                if (!orgId) return;
                generateMutation.mutate({ organizationId: orgId, sector: generateSector });
              }}
              disabled={generateMutation.isPending}
            >
              {generateMutation.isPending ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Sparkles className="size-3.5" />
              )}
              Generate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Blueprint Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base">Create Blueprint</DialogTitle>
            <DialogDescription className="text-xs">
              Create a new process blueprint manually. You can add stages and steps after creation.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <label className="text-xs font-medium text-foreground mb-1.5 block">Blueprint Name</label>
              <Input
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                placeholder="e.g. Real Estate Acquisition Process"
                className="h-9 text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-foreground mb-1.5 block">Sector</label>
              <Select value={createSector} onValueChange={setCreateSector}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SECTORS.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setShowCreate(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              className="gap-1.5"
              onClick={() => {
                if (!orgId || !createName.trim()) return;
                createMutation.mutate({ organizationId: orgId, name: createName.trim(), sector: createSector });
              }}
              disabled={createMutation.isPending || !createName.trim()}
            >
              {createMutation.isPending ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Plus className="size-3.5" />
              )}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
