// ============================================================================
// AI Agent Page — Claude 4.6 Sonnet — LIVE AI RESPONSES
// Quick actions, clickable task cards, Enter-to-send, Clear chat, Markdown
// ============================================================================

import { useState, useRef, useEffect, useCallback } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import StatusBadge from "@/components/StatusBadge";
import { cn } from "@/lib/utils";
import {
  METRICS,
  TASKS,
  SPVS,
  VENTURES,
  DISTRIBUTIONS,
  STATUS_CONFIG,
  getThemeColor,
  getTaskStatusFromDate,
  formatDate,
  formatCurrency,
  type Task,
} from "@/lib/data";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  Send, Bot, User, Sparkles, FileText, Mail, CalendarClock,
  CheckCircle2, XCircle, Layers3, Briefcase, ListChecks, Trash2,
  BarChart3, Users, Cpu,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { Streamdown } from "streamdown";
import { trpc } from "@/lib/trpc";
import { logAction } from "@/lib/operatorSession";

interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
  requiresApproval?: boolean;
  approved?: boolean;
  model?: string;
}

const QUICK_ACTIONS = [
  { label: "Portfolio summary", icon: <FileText className="size-3.5" />, prompt: "Give me a portfolio summary across all ventures and SPVs." },
  { label: "Draft LP update", icon: <Mail className="size-3.5" />, prompt: "Draft a professional LP update email covering recent distributions and venture progress." },
  { label: "Open tasks review", icon: <CalendarClock className="size-3.5" />, prompt: "List all open tasks sorted by priority and due date." },
  { label: "SPV pipeline", icon: <BarChart3 className="size-3.5" />, prompt: "Show me the current SPV pipeline status and deal stages." },
  { label: "Team overview", icon: <Users className="size-3.5" />, prompt: "Give me a team overview with roles and responsibilities." },
];

const INITIAL_MESSAGES: ChatMessage[] = [
  {
    id: "sys-1",
    role: "assistant",
    content: `Good afternoon. I'm your **ATLAS Venture Ops** assistant, powered by **Claude 4.6 Sonnet**. I have context on **${VENTURES.length} ventures** across 6 sectors, **${SPVS.length} SPVs**, and **${TASKS.filter(t => t.status === "open").length} open tasks**.\n\nRecent highlights:\n- **${formatCurrency(METRICS.paidDistributions)}** in distributions paid\n- **${SPVS.filter(s => s.stage === "Active deal").length}** active SPV deals\n- **${TASKS.filter(t => t.priority === "High").length}** high-priority task(s) pending\n\nHow can I help you today?`,
    timestamp: new Date(),
    model: "claude-4.6-sonnet",
  },
];

// Build context string to inject with user messages
function buildPortfolioContext(): string {
  const venturesSummary = VENTURES.map(v => `${v.name} (${v.theme}, ${v.stage}, ${v.status}, ${v.location})`).join("; ");
  const spvsSummary = SPVS.map(s => `${s.name} (${s.theme}, ${s.stage}, Priority: ${s.priority}${s.currentStatus ? `, Status: ${s.currentStatus}` : ""})`).join("; ");
  const tasksSummary = TASKS.map(t => `${t.title} (${t.status}, ${t.priority}, Due: ${t.dueDate}, Assignees: ${t.assignees.join(", ") || "Unassigned"})`).join("; ");
  const distSummary = DISTRIBUTIONS.map(d => `${d.name}: ${formatCurrency(d.amount)} (${d.status}, ${d.type})`).join("; ");

  return `Current portfolio data:
Ventures (${VENTURES.length}): ${venturesSummary}
SPVs (${SPVS.length}): ${spvsSummary}
Tasks (${TASKS.length}): ${tasksSummary}
Distributions: ${distSummary}
Metrics: Total Ventures=${METRICS.totalVentures}, Active=${METRICS.activeVentures}, Total SPVs=${METRICS.totalSPVs}, Active SPVs=${METRICS.activeSPVs}, Open Tasks=${METRICS.openTasks}, Total Distributions=${formatCurrency(METRICS.totalDistributions)}, Paid=${formatCurrency(METRICS.paidDistributions)}, Team=${METRICS.totalTeam}`;
}

export default function Agent() {
  const [messages, setMessages] = useState<ChatMessage[]>(INITIAL_MESSAGES);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [taskModal, setTaskModal] = useState<Task | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const chatMutation = trpc.ai.chat.useMutation();

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping, scrollToBottom]);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isTyping) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: text.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);
    logAction("AI chat", text.trim().slice(0, 50));

    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    try {
      // Build message history for context (last 10 messages + portfolio context on first user msg)
      const history = [...messages, userMsg]
        .filter(m => m.role === "user" || m.role === "assistant")
        .slice(-10)
        .map(m => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        }));

      // Inject portfolio context into the first user message
      if (history.length > 0) {
        const firstUserIdx = history.findIndex(m => m.role === "user");
        if (firstUserIdx === history.length - 1) {
          // This is the latest message, inject context
          history[history.length - 1] = {
            ...history[history.length - 1],
            content: `[Portfolio Context]\n${buildPortfolioContext()}\n\n[User Question]\n${history[history.length - 1].content}`,
          };
        }
      }

      const result = await chatMutation.mutateAsync({ messages: history });

      const assistantMsg: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: result.content,
        timestamp: new Date(),
        requiresApproval: result.requiresApproval,
        model: result.model,
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (error) {
      console.error("[AI Chat] Error:", error);
      const errorMsg: ChatMessage = {
        id: `error-${Date.now()}`,
        role: "assistant",
        content: `I encountered an error processing your request. Please try again.\n\n> ${error instanceof Error ? error.message : "Unknown error"}`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMsg]);
      toast.error("AI response failed — please try again");
    } finally {
      setIsTyping(false);
    }
  }, [isTyping, messages, chatMutation]);

  const handleApprove = useCallback((msgId: string) => {
    setMessages((prev) =>
      prev.map((m) => (m.id === msgId ? { ...m, approved: true } : m))
    );
    logAction("AI action approved", msgId);
    toast.success("Action approved — executing...");
  }, []);

  const handleReject = useCallback((msgId: string) => {
    setMessages((prev) =>
      prev.map((m) => (m.id === msgId ? { ...m, approved: false } : m))
    );
    logAction("AI action rejected", msgId);
    toast.info("Action rejected");
  }, []);

  const clearChat = useCallback(() => {
    setMessages(INITIAL_MESSAGES);
    toast.info("Chat cleared");
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const openTasks = TASKS.filter(t => t.status === "open").sort((a, b) => {
    const p: Record<string, number> = { High: 0, Medium: 1, Low: 2 };
    return (p[a.priority] ?? 2) - (p[b.priority] ?? 2);
  }).slice(0, 4);

  return (
    <DashboardLayout title="AI Agent" subtitle="CLAUDE 4.6 SONNET">
      <div className="flex flex-col lg:flex-row h-[calc(100vh-3.5rem)] overflow-hidden">
        {/* Left panel: Context */}
        <div className="w-full lg:w-80 border-b lg:border-b-0 lg:border-r border-border p-4 overflow-y-auto flex-shrink-0">
          <div className="space-y-4">
            {/* Model badge */}
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-primary/5 border border-primary/20">
              <Cpu className="size-4 text-primary" />
              <div>
                <p className="text-[10px] font-mono text-primary font-semibold">CLAUDE 4.6 SONNET</p>
                <p className="text-[10px] text-muted-foreground">Live AI · Forge API</p>
              </div>
              <span className="ml-auto size-2 rounded-full bg-green-400 animate-pulse" />
            </div>

            <h3 className="text-[11px] uppercase tracking-[0.06em] text-muted-foreground font-medium">
              Portfolio Context
            </h3>
            <div className="grid grid-cols-3 lg:grid-cols-1 gap-2">
              <div className="bg-card border border-border rounded-md p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Layers3 className="size-3.5 text-blue-400" />
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Ventures</span>
                </div>
                <span className="text-lg font-mono font-semibold text-foreground">{METRICS.totalVentures}</span>
              </div>
              <div className="bg-card border border-border rounded-md p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Briefcase className="size-3.5 text-emerald-400" />
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wide">SPVs</span>
                </div>
                <span className="text-lg font-mono font-semibold text-foreground">{METRICS.totalSPVs}</span>
              </div>
              <div className="bg-card border border-border rounded-md p-3">
                <div className="flex items-center gap-2 mb-1">
                  <ListChecks className="size-3.5 text-amber-400" />
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Open Tasks</span>
                </div>
                <span className="text-lg font-mono font-semibold text-foreground">{METRICS.openTasks}</span>
              </div>
            </div>

            {/* Open Tasks — clickable */}
            <div className="mt-6">
              <h3 className="text-[11px] uppercase tracking-[0.06em] text-muted-foreground font-medium mb-3">
                Priority Tasks
              </h3>
              <div className="space-y-2">
                {openTasks.map((task) => {
                  const resolvedStatus = getTaskStatusFromDate(task);
                  const sc = STATUS_CONFIG[resolvedStatus];
                  return (
                    <button
                      key={task.id}
                      onClick={() => setTaskModal(task)}
                      className="w-full text-left bg-card border border-border rounded-md p-3 hover:bg-accent/30 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded", task.priority === "High" ? "bg-red-500/10 text-red-400" : "bg-amber-500/10 text-amber-400")}>
                          {task.priority}
                        </span>
                        <StatusBadge label={sc.label} bg={sc.bg} dot={sc.dot} />
                      </div>
                      <p className="text-xs text-foreground mt-1">{task.title}</p>
                      <p className="text-[10px] font-mono text-muted-foreground mt-1">Due {formatDate(task.dueDate)}</p>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Right panel: Chat */}
        <div className="flex-1 flex flex-col min-h-0">
          {/* Quick actions + Clear */}
          <div className="flex items-center gap-2 px-4 py-3 border-b border-border overflow-x-auto">
            <Sparkles className="size-3.5 text-primary flex-shrink-0" />
            {QUICK_ACTIONS.map((action) => (
              <button
                key={action.label}
                onClick={() => sendMessage(action.prompt)}
                disabled={isTyping}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-secondary/50 text-xs text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors whitespace-nowrap border border-border disabled:opacity-50"
              >
                {action.icon}
                {action.label}
              </button>
            ))}
            <div className="ml-auto flex-shrink-0">
              <button
                onClick={clearChat}
                className="flex items-center gap-1 px-2 py-1.5 rounded-md text-[10px] text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors"
              >
                <Trash2 className="size-3" />
                Clear
              </button>
            </div>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
            <AnimatePresence initial={false}>
              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  className={cn(
                    "flex gap-3",
                    msg.role === "user" ? "justify-end" : "justify-start"
                  )}
                >
                  {msg.role === "assistant" && (
                    <div className="flex-shrink-0 size-7 rounded-md bg-primary/10 flex items-center justify-center mt-0.5">
                      <Bot className="size-4 text-primary" />
                    </div>
                  )}

                  <div
                    className={cn(
                      "max-w-[85%] lg:max-w-[70%] rounded-lg px-4 py-3",
                      msg.role === "user"
                        ? "bg-primary/10 text-foreground"
                        : "bg-card border border-border text-foreground"
                    )}
                  >
                    <div className="text-sm leading-relaxed prose prose-invert prose-sm max-w-none [&_table]:text-xs [&_th]:px-2 [&_th]:py-1 [&_td]:px-2 [&_td]:py-1 [&_table]:border-border [&_th]:border-border [&_td]:border-border [&_h2]:text-sm [&_h2]:mt-3 [&_h2]:mb-1 [&_h3]:text-xs [&_h3]:mt-2 [&_h3]:mb-1 [&_li]:my-0 [&_ul]:my-1 [&_ol]:my-1 [&_p]:my-1 [&_blockquote]:border-primary/30 [&_blockquote]:bg-primary/5 [&_blockquote]:px-3 [&_blockquote]:py-2 [&_blockquote]:rounded">
                      <Streamdown>{msg.content}</Streamdown>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono text-muted-foreground">
                          {msg.timestamp.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                        {msg.role === "assistant" && msg.model && (
                          <span className="text-[9px] font-mono text-primary/60 px-1.5 py-0.5 rounded bg-primary/5 border border-primary/10">
                            {msg.model}
                          </span>
                        )}
                      </div>

                      {msg.requiresApproval && msg.approved === undefined && (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleApprove(msg.id)}
                            className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors border border-emerald-500/20"
                          >
                            <CheckCircle2 className="size-3" />
                            Approve
                          </button>
                          <button
                            onClick={() => handleReject(msg.id)}
                            className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors border border-red-500/20"
                          >
                            <XCircle className="size-3" />
                            Reject
                          </button>
                        </div>
                      )}
                      {msg.approved === true && (
                        <span className="flex items-center gap-1 text-[10px] text-emerald-400">
                          <CheckCircle2 className="size-3" /> Approved
                        </span>
                      )}
                      {msg.approved === false && (
                        <span className="flex items-center gap-1 text-[10px] text-red-400">
                          <XCircle className="size-3" /> Rejected
                        </span>
                      )}
                    </div>
                  </div>

                  {msg.role === "user" && (
                    <div className="flex-shrink-0 size-7 rounded-md bg-secondary flex items-center justify-center mt-0.5">
                      <User className="size-4 text-muted-foreground" />
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>

            {isTyping && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex gap-3"
              >
                <div className="size-7 rounded-md bg-primary/10 flex items-center justify-center">
                  <Bot className="size-4 text-primary" />
                </div>
                <div className="bg-card border border-border rounded-lg px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                      <span className="size-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="size-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="size-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                    <span className="text-[10px] font-mono text-muted-foreground">Claude 4.6 Sonnet is thinking...</span>
                  </div>
                </div>
              </motion.div>
            )}
          </div>

          {/* Input area */}
          <div className="border-t border-border p-4">
            <div className="flex items-end gap-2">
              <Textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask Claude about ventures, SPVs, tasks, distributions..."
                className="flex-1 min-h-[44px] max-h-[120px] resize-none bg-secondary/30 border-border text-sm"
                rows={1}
              />
              <Button
                onClick={() => sendMessage(input)}
                disabled={!input.trim() || isTyping}
                size="icon"
                className="size-[44px] flex-shrink-0"
              >
                <Send className="size-4" />
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground mt-2 font-mono">
              Powered by Claude 4.6 Sonnet · Enter to send · Shift+Enter for new line · Destructive actions require approval
            </p>
          </div>
        </div>
      </div>

      {/* Task Detail Modal */}
      <Dialog open={!!taskModal} onOpenChange={(open) => !open && setTaskModal(null)}>
        <DialogContent className="sm:max-w-md">
          {taskModal && (
            <>
              <DialogHeader>
                <DialogTitle className="text-sm">{taskModal.title}</DialogTitle>
                <DialogDescription className="text-[10px] font-mono">
                  Due {formatDate(taskModal.dueDate)} · {taskModal.priority} priority
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3 py-2">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Status</span>
                  {(() => { const rs = getTaskStatusFromDate(taskModal); const sc = STATUS_CONFIG[rs]; return <StatusBadge label={sc.label} bg={sc.bg} dot={sc.dot} />; })()}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Assignees</span>
                  <span className="text-xs text-foreground">{taskModal.assignees.join(", ") || "Unassigned"}</span>
                </div>
                {taskModal.ventureLink && (
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Venture</span>
                    <span className="text-xs text-primary">{taskModal.ventureLink}</span>
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button size="sm" className="text-xs" onClick={() => {
                  sendMessage(`Tell me about the task "${taskModal.title}" and suggest next steps.`);
                  setTaskModal(null);
                }}>
                  <Sparkles className="size-3.5 mr-1" /> Ask Claude
                </Button>
                <Button variant="ghost" size="sm" className="text-xs" onClick={() => setTaskModal(null)}>Close</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
