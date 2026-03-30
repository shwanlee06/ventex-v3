// ============================================================================
// BlueprintExtractor — Document upload + Conversation extraction UI
// Two modes: (1) Upload document → LLM extracts blueprint → inline editor
//            (2) Chat with Concierge AI → builds blueprint through conversation
// ============================================================================
import { useState, useRef, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  Upload, MessageSquare, FileText, Loader2, Check,
  Shield, ChevronDown, ChevronRight, Send, Bot, User,
} from "lucide-react";

type ExtractedBlueprint = {
  blueprintName: string;
  sector: string;
  confidence: string;
  stages: Array<{
    stageName: string;
    stageOrder: number;
    steps: Array<{
      stepName: string;
      stepOrder: number;
      isBlocking: boolean;
      whoOwns: string | null;
      estimatedDays: number | null;
      evidence: string | null;
      confidence: string;
    }>;
  }>;
};

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

interface Props {
  organizationId: number;
  onComplete?: (templateId: number) => void;
}

export default function BlueprintExtractor({ organizationId, onComplete }: Props) {
  const [mode, setMode] = useState<"choose" | "document" | "conversation">("choose");
  const [extractedText, setExtractedText] = useState("");
  const [blueprint, setBlueprint] = useState<ExtractedBlueprint | null>(null);
  const [templateId, setTemplateId] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);
  const [expandedStages, setExpandedStages] = useState<Set<string>>(new Set());

  // Chat state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const extractMutation = trpc.blueprints.extractFromDocument.useMutation();
  const uploadMutation = trpc.blueprints.uploadAndExtract.useMutation();
  const conversationMutation = trpc.blueprints.conversationExtract.useMutation();

  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Document upload handler ──────────────────────────────────────────
  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.split(",")[1]);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const uploadResult = await uploadMutation.mutateAsync({
        fileBase64: base64,
        fileName: file.name,
        mimeType: file.type,
        organizationId,
      });

      setExtractedText(uploadResult.extractedText);
      toast.success(`Document uploaded: ${file.name}`);

      const extractResult = await extractMutation.mutateAsync({
        documentText: uploadResult.extractedText,
        organizationId,
        sourceDocumentUrl: uploadResult.fileUrl,
        sourceDocumentName: uploadResult.fileName,
      });

      setBlueprint(extractResult.blueprint);
      setTemplateId(extractResult.templateId);
      const stageNames = new Set<string>(
        (extractResult.blueprint.stages || []).map((s: any) => s.stageName as string)
      );
      setExpandedStages(stageNames);
      toast.success(`Blueprint extracted: ${extractResult.stepsCreated} steps found`);
    } catch (err: any) {
      toast.error(err.message || "Failed to extract blueprint");
    } finally {
      setUploading(false);
    }
  }, [organizationId, uploadMutation, extractMutation]);

  // ── Text paste extraction ────────────────────────────────────────────
  const handleTextExtract = useCallback(async () => {
    if (!extractedText.trim() || extractedText.length < 50) {
      toast.error("Please paste at least 50 characters of document text");
      return;
    }
    try {
      const result = await extractMutation.mutateAsync({
        documentText: extractedText,
        organizationId,
      });
      setBlueprint(result.blueprint);
      setTemplateId(result.templateId);
      const stageNames = new Set<string>(
        (result.blueprint.stages || []).map((s: any) => s.stageName as string)
      );
      setExpandedStages(stageNames);
      toast.success(`Blueprint extracted: ${result.stepsCreated} steps found`);
    } catch (err: any) {
      toast.error(err.message || "Failed to extract blueprint");
    }
  }, [extractedText, organizationId, extractMutation]);

  // ── Chat handler ─────────────────────────────────────────────────────
  const handleChatSend = useCallback(async () => {
    if (!chatInput.trim()) return;
    const newMsg: ChatMessage = { role: "user", content: chatInput.trim() };
    const updatedMessages = [...chatMessages, newMsg];
    setChatMessages(updatedMessages);
    setChatInput("");
    setChatLoading(true);
    try {
      const result = await conversationMutation.mutateAsync({
        messages: updatedMessages,
        organizationId,
      });
      setChatMessages(prev => [...prev, { role: "assistant", content: result.reply }]);
      if (result.isComplete && result.blueprint) {
        setBlueprint(result.blueprint);
        setTemplateId(result.templateId);
        const stageNames = new Set<string>(
          (result.blueprint.stages || []).map((s: any) => s.stageName as string)
        );
        setExpandedStages(stageNames);
        toast.success("Blueprint extracted from conversation!");
      }
    } catch (err: any) {
      toast.error(err.message || "Chat failed");
    } finally {
      setChatLoading(false);
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    }
  }, [chatInput, chatMessages, organizationId, conversationMutation]);

  const toggleStage = (stageName: string) => {
    setExpandedStages(prev => {
      const next = new Set(prev);
      if (next.has(stageName)) next.delete(stageName);
      else next.add(stageName);
      return next;
    });
  };

  // ── Mode chooser ─────────────────────────────────────────────────────
  if (mode === "choose") {
    return (
      <div className="space-y-4">
        <p className="text-xs text-muted-foreground">
          Choose how to create a process blueprint for this client's ventures.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            onClick={() => setMode("document")}
            className="bg-card border border-border rounded-lg p-5 text-left hover:border-primary/30 transition-all group"
          >
            <Upload className="size-5 text-primary mb-2" />
            <h3 className="text-sm font-medium text-foreground">Upload Document</h3>
            <p className="text-[10px] text-muted-foreground mt-1">
              Upload a process document, SOP, or regulatory guide. ATLAS will extract the blueprint automatically.
            </p>
          </button>
          <button
            onClick={() => {
              setMode("conversation");
              setChatMessages([{
                role: "assistant",
                content: "Hi! I'm ATLAS Concierge. I'll help you build a process blueprint through conversation. Let's start — what sector or industry is this blueprint for? (e.g., Real Estate, Yacht, F&B, Oil & Gas)",
              }]);
            }}
            className="bg-card border border-border rounded-lg p-5 text-left hover:border-primary/30 transition-all group"
          >
            <MessageSquare className="size-5 text-emerald-400 mb-2" />
            <h3 className="text-sm font-medium text-foreground">Describe in Conversation</h3>
            <p className="text-[10px] text-muted-foreground mt-1">
              Chat with ATLAS Concierge to describe your process. It will ask targeted questions and build the blueprint.
            </p>
          </button>
        </div>
      </div>
    );
  }

  // ── Document mode ────────────────────────────────────────────────────
  if (mode === "document" && !blueprint) {
    return (
      <div className="space-y-4">
        <button onClick={() => setMode("choose")} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
          &larr; Back to options
        </button>
        <div className="space-y-3">
          <div
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              "border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-primary/30 transition-colors",
              uploading && "pointer-events-none opacity-50"
            )}
          >
            {uploading ? (
              <Loader2 className="size-6 text-primary mx-auto animate-spin" />
            ) : (
              <Upload className="size-6 text-muted-foreground mx-auto" />
            )}
            <p className="text-xs text-muted-foreground mt-2">
              {uploading ? "Extracting blueprint..." : "Click to upload a document (PDF, DOCX, or image)"}
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
              onChange={handleFileUpload}
              className="hidden"
            />
          </div>
          <div className="flex items-center gap-2">
            <div className="h-px flex-1 bg-border" />
            <span className="text-[10px] text-muted-foreground">or paste text</span>
            <div className="h-px flex-1 bg-border" />
          </div>
          <Textarea
            value={extractedText}
            onChange={e => setExtractedText(e.target.value)}
            placeholder="Paste document text here (minimum 50 characters)..."
            className="min-h-[200px] text-xs font-mono"
          />
          <Button
            size="sm"
            onClick={handleTextExtract}
            disabled={extractMutation.isPending || extractedText.length < 50}
            className="w-full"
          >
            {extractMutation.isPending ? (
              <><Loader2 className="size-3 mr-1.5 animate-spin" /> Extracting...</>
            ) : (
              <><FileText className="size-3 mr-1.5" /> Extract Blueprint</>
            )}
          </Button>
        </div>
      </div>
    );
  }

  // ── Conversation mode ────────────────────────────────────────────────
  if (mode === "conversation" && !blueprint) {
    return (
      <div className="space-y-4">
        <button onClick={() => setMode("choose")} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
          &larr; Back to options
        </button>
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="h-[400px] overflow-y-auto p-4 space-y-3">
            {chatMessages.map((msg, i) => (
              <div key={i} className={cn("flex gap-2", msg.role === "user" ? "justify-end" : "justify-start")}>
                {msg.role === "assistant" && (
                  <div className="size-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Bot className="size-3 text-primary" />
                  </div>
                )}
                <div className={cn(
                  "max-w-[80%] rounded-lg px-3 py-2 text-xs",
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-accent text-accent-foreground"
                )}>
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                </div>
                {msg.role === "user" && (
                  <div className="size-6 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                    <User className="size-3 text-muted-foreground" />
                  </div>
                )}
              </div>
            ))}
            {chatLoading && (
              <div className="flex gap-2 justify-start">
                <div className="size-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Bot className="size-3 text-primary" />
                </div>
                <div className="bg-accent rounded-lg px-3 py-2">
                  <Loader2 className="size-3 animate-spin text-muted-foreground" />
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>
          <div className="border-t border-border p-3 flex gap-2">
            <Input
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && !e.shiftKey && handleChatSend()}
              placeholder="Describe your process..."
              className="text-xs"
              disabled={chatLoading}
            />
            <Button size="sm" onClick={handleChatSend} disabled={chatLoading || !chatInput.trim()}>
              <Send className="size-3" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ── Blueprint editor (shown after extraction) ────────────────────────
  if (blueprint) {
    return (
      <div className="space-y-4">
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-foreground">{blueprint.blueprintName}</h3>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[10px] font-mono text-muted-foreground">{blueprint.sector}</span>
                <span className={cn(
                  "text-[10px] font-medium px-1.5 py-0.5 rounded",
                  blueprint.confidence === "High" ? "bg-emerald-500/10 text-emerald-400" :
                  blueprint.confidence === "Medium" ? "bg-amber-500/10 text-amber-400" :
                  "bg-red-500/10 text-red-400"
                )}>
                  {blueprint.confidence} confidence
                </span>
              </div>
            </div>
            <span className="text-[10px] text-muted-foreground">
              {blueprint.stages.reduce((sum, s) => sum + s.steps.length, 0)} steps across {blueprint.stages.length} stages
            </span>
          </div>
        </div>

        <div className="space-y-2">
          {blueprint.stages.map((stage) => (
            <div key={stage.stageName} className="bg-card border border-border rounded-lg overflow-hidden">
              <button
                onClick={() => toggleStage(stage.stageName)}
                className="w-full flex items-center justify-between p-3 hover:bg-accent/20 transition-colors"
              >
                <div className="flex items-center gap-2">
                  {expandedStages.has(stage.stageName) ? (
                    <ChevronDown className="size-3 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="size-3 text-muted-foreground" />
                  )}
                  <span className="text-xs font-medium text-foreground">{stage.stageName}</span>
                  <span className="text-[10px] font-mono text-muted-foreground">{stage.steps.length} steps</span>
                </div>
                <span className="text-[10px] text-muted-foreground">
                  {stage.steps.filter(s => s.isBlocking).length} blocking
                </span>
              </button>
              {expandedStages.has(stage.stageName) && (
                <div className="border-t border-border divide-y divide-border">
                  {stage.steps.map((step, si) => (
                    <div key={si} className="p-3 flex items-start gap-3 text-xs">
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {step.isBlocking ? (
                          <Shield className="size-3 text-amber-400" />
                        ) : (
                          <Check className="size-3 text-muted-foreground" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-foreground">{step.stepName}</span>
                          <span className={cn(
                            "text-[9px] px-1 py-0.5 rounded",
                            step.confidence === "High" ? "bg-emerald-500/10 text-emerald-400" :
                            step.confidence === "Medium" ? "bg-amber-500/10 text-amber-400" :
                            "bg-red-500/10 text-red-400"
                          )}>
                            {step.confidence}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-[10px] text-muted-foreground">
                          {step.whoOwns && <span>Owner: {step.whoOwns}</span>}
                          {step.estimatedDays && <span>~{step.estimatedDays}d</span>}
                        </div>
                        {step.evidence && (
                          <p className="text-[10px] text-muted-foreground mt-1 italic">{step.evidence}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setBlueprint(null);
              setTemplateId(null);
              setMode("choose");
            }}
            className="text-xs"
          >
            Start Over
          </Button>
          {templateId && onComplete && (
            <Button size="sm" onClick={() => onComplete(templateId)} className="text-xs">
              <Check className="size-3 mr-1" /> Use This Blueprint
            </Button>
          )}
        </div>
      </div>
    );
  }

  return null;
}
