// ============================================================================
// AI Agent Page — Claude 4.6 Sonnet — STREAMING + MULTI-CHAT HISTORY
// ChatGPT-style: auto-titled conversations, new chat, switch, delete, download, view
// ============================================================================

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { cn } from "@/lib/utils";
import {
  METRICS, TASKS, SPVS, VENTURES, DISTRIBUTIONS, AGENT_LOGS,
  formatCurrency,
} from "@/lib/data";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Send, Bot, User, Sparkles, FileText, Mail, CalendarClock,
  CheckCircle2, XCircle, Layers3, Briefcase, ListChecks, Trash2,
  BarChart3, Users, Cpu, AlertTriangle, Search, Activity,
  MessageSquare, Paperclip, X, Download, Image, FileSpreadsheet,
  Plus, MoreHorizontal, Eye, PenLine,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { Streamdown } from "streamdown";
import { logAction } from "@/lib/operatorSession";

// ── Types ────────────────────────────────────────────────────────────────

interface Attachment {
  id: string;
  name: string;
  size: number;
  type: string;
  dataUrl: string;
  isImage: boolean;
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
  requiresApproval?: boolean;
  approved?: boolean;
  model?: string;
  isStreaming?: boolean;
  attachments?: Attachment[];
}

interface StoredMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: string;
  model?: string;
  requiresApproval?: boolean;
  approved?: boolean;
  attachments?: Attachment[];
}

interface ChatLog {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: StoredMessage[];
}

// ── Constants ────────────────────────────────────────────────────────────

const CHATS_INDEX_KEY = "atlas_chat_index";
const CHAT_PREFIX = "atlas_chat_";
const MAX_MESSAGES = 50;

// ── Storage helpers ─────────────────────────────────────────────────────

function loadChatIndex(): { id: string; title: string; createdAt: string; updatedAt: string }[] {
  try {
    const raw = localStorage.getItem(CHATS_INDEX_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch { return []; }
}

function saveChatIndex(index: { id: string; title: string; createdAt: string; updatedAt: string }[]) {
  try { localStorage.setItem(CHATS_INDEX_KEY, JSON.stringify(index)); } catch { /* full */ }
}

function loadChatMessages(chatId: string): ChatMessage[] {
  try {
    const raw = localStorage.getItem(CHAT_PREFIX + chatId);
    if (!raw) return [];
    const stored: StoredMessage[] = JSON.parse(raw);
    return stored.map(m => ({ ...m, timestamp: new Date(m.timestamp) }));
  } catch { return []; }
}

function saveChatMessages(chatId: string, messages: ChatMessage[]) {
  try {
    const stored: StoredMessage[] = messages
      .filter(m => !m.isStreaming)
      .slice(-MAX_MESSAGES)
      .map(m => ({
        id: m.id,
        role: m.role,
        content: m.content,
        timestamp: m.timestamp.toISOString(),
        model: m.model,
        requiresApproval: m.requiresApproval,
        approved: m.approved,
        attachments: m.attachments,
      }));
    localStorage.setItem(CHAT_PREFIX + chatId, JSON.stringify(stored));
  } catch { /* full */ }
}

function deleteChatStorage(chatId: string) {
  localStorage.removeItem(CHAT_PREFIX + chatId);
}

// Migrate old single-chat format to new multi-chat format
function migrateOldStorage(): string | null {
  try {
    const oldKey = "atlas_chat_history";
    const raw = localStorage.getItem(oldKey);
    if (!raw) return null;
    const stored: StoredMessage[] = JSON.parse(raw);
    if (stored.length === 0) return null;

    const chatId = `chat-${Date.now()}`;
    const firstUserMsg = stored.find(m => m.role === "user");
    const title = firstUserMsg
      ? firstUserMsg.content.slice(0, 40).replace(/\n/g, " ") + (firstUserMsg.content.length > 40 ? "..." : "")
      : "Previous conversation";
    const now = new Date().toISOString();

    localStorage.setItem(CHAT_PREFIX + chatId, raw);
    saveChatIndex([{ id: chatId, title, createdAt: stored[0]?.timestamp || now, updatedAt: stored[stored.length - 1]?.timestamp || now }]);
    localStorage.removeItem(oldKey);
    return chatId;
  } catch { return null; }
}

function generateTitle(firstMessage: string): string {
  // Strip attachment indicators and trim
  const clean = firstMessage.replace(/📎[\s\S]*$/, "").trim();
  if (!clean) return "New conversation";
  // Take first ~40 chars, break at word boundary
  if (clean.length <= 40) return clean;
  const truncated = clean.slice(0, 40);
  const lastSpace = truncated.lastIndexOf(" ");
  return (lastSpace > 20 ? truncated.slice(0, lastSpace) : truncated) + "...";
}

// ── Formatting helpers ──────────────────────────────────────────────────

function formatSessionDate(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const dayMs = 86400000;
  if (diff < dayMs && now.getDate() === date.getDate()) {
    return date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  }
  if (diff < dayMs * 2) {
    return `Yesterday ${date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}`;
  }
  return `${date.toLocaleDateString("en-GB", { month: "short", day: "numeric" })} · ${date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}`;
}

function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString("en-GB", { month: "short", day: "numeric" });
}

function isFromPreviousSession(date: Date): boolean {
  return new Date().getTime() - date.getTime() > 300000;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(type: string) {
  if (type.startsWith("image/")) return <Image className="size-3.5 text-purple-400" />;
  if (type === "application/pdf") return <FileText className="size-3.5 text-red-400" />;
  if (type.includes("spreadsheet") || type.includes("excel") || type.includes(".sheet"))
    return <FileSpreadsheet className="size-3.5 text-green-400" />;
  if (type.includes("word") || type.includes("document"))
    return <FileText className="size-3.5 text-blue-400" />;
  return <FileText className="size-3.5 text-muted-foreground" />;
}

// ── Quick actions ───────────────────────────────────────────────────────

const QUICK_ACTIONS = [
  { label: "Portfolio summary", icon: <FileText className="size-3.5" />, prompt: "Give me a portfolio summary across all ventures and SPVs." },
  { label: "Draft LP update", icon: <Mail className="size-3.5" />, prompt: "Draft a professional LP update email covering recent distributions and venture progress." },
  { label: "Open tasks review", icon: <CalendarClock className="size-3.5" />, prompt: "List all open tasks sorted by priority and due date." },
  { label: "SPV pipeline", icon: <BarChart3 className="size-3.5" />, prompt: "Show me the current SPV pipeline status and deal stages." },
  { label: "Team overview", icon: <Users className="size-3.5" />, prompt: "Give me a team overview with roles and responsibilities." },
  { label: "Latest activity", icon: <Activity className="size-3.5" />, prompt: "Show me the latest activity across all ventures, SPVs, and tasks." },
];

const SUGGESTED_ACTIONS = [
  { label: "Summarize all overdue tasks", icon: <AlertTriangle className="size-4 text-amber-400" />, prompt: "Summarize all overdue tasks" },
  { label: "Draft weekly ops report", icon: <FileText className="size-4 text-blue-400" />, prompt: "Draft weekly ops report" },
  { label: "Review Venezuela Mining Rights status", icon: <Search className="size-4 text-emerald-400" />, prompt: "Review Venezuela Mining Rights status" },
  { label: "Who is working on Nammos Watson Island?", icon: <Users className="size-4 text-purple-400" />, prompt: "Who is working on Nammos Watson Island?" },
];

const WELCOME_MSG: ChatMessage = {
  id: "sys-1",
  role: "assistant",
  content: `Hey — I'm your **ATLAS ops assistant**. What do you need?`,
  timestamp: new Date(),
  model: "claude-4.6-sonnet",
};

function buildPortfolioContext(): string {
  const venturesSummary = VENTURES.map(v => `${v.name} (${v.theme}, ${v.stage}, ${v.status}, ${v.location})`).join("; ");
  const spvsSummary = SPVS.map(s => `${s.name} (${s.theme}, ${s.stage}, Priority: ${s.priority}${s.currentStatus ? `, Status: ${s.currentStatus}` : ""})`).join("; ");
  const tasksSummary = TASKS.map(t => `${t.title} (${t.status}, ${t.priority}, Due: ${t.dueDate}, Assignees: ${t.assignees.join(", ") || "Unassigned"})`).join("; ");
  const distSummary = DISTRIBUTIONS.map(d => `${d.name}: ${formatCurrency(d.amount)} (${d.status}, ${d.type})`).join("; ");
  return `Current portfolio data:\nVentures (${VENTURES.length}): ${venturesSummary}\nSPVs (${SPVS.length}): ${spvsSummary}\nTasks (${TASKS.length}): ${tasksSummary}\nDistributions: ${distSummary}\nMetrics: Total Ventures=${METRICS.totalVentures}, Active=${METRICS.activeVentures}, Total SPVs=${METRICS.totalSPVs}, Active SPVs=${METRICS.activeSPVs}, Open Tasks=${METRICS.openTasks}, Total Distributions=${formatCurrency(METRICS.totalDistributions)}, Paid=${formatCurrency(METRICS.paidDistributions)}, Team=${METRICS.totalTeam}`;
}

// ── Stream AI response via SSE ──────────────────────────────────────────

async function streamChat(
  messages: { role: string; content: string | Array<unknown> }[],
  onChunk: (text: string) => void,
  onDone: (model: string) => void,
  onError: (error: string) => void,
  signal?: AbortSignal,
): Promise<void> {
  const response = await fetch("/api/ai/stream", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ messages }),
    signal,
  });
  if (!response.ok) throw new Error(`Stream request failed: ${response.status}`);
  const reader = response.body?.getReader();
  if (!reader) throw new Error("No response body");
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || !trimmed.startsWith("data: ")) continue;
      const data = trimmed.slice(6);
      if (data === "[DONE]") { onDone("claude-4.6-sonnet"); return; }
      try {
        const parsed = JSON.parse(data);
        if (parsed.error) { onError(parsed.error); return; }
        if (parsed.content) onChunk(parsed.content);
        if (parsed.finish_reason && parsed.model) onDone(parsed.model);
      } catch { /* skip */ }
    }
  }
}

// ── Component ───────────────────────────────────────────────────────────

export default function Agent() {
  // ── Multi-chat state ──────────────────────────────────────────────────
  const [chatIndex, setChatIndex] = useState<{ id: string; title: string; createdAt: string; updatedAt: string }[]>(() => {
    const existing = loadChatIndex();
    if (existing.length > 0) return existing;
    // Try migrating old format
    const migratedId = migrateOldStorage();
    if (migratedId) return loadChatIndex();
    return [];
  });

  const [activeChatId, setActiveChatId] = useState<string | null>(() => {
    const idx = loadChatIndex();
    return idx.length > 0 ? idx[0].id : null;
  });

  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const idx = loadChatIndex();
    if (idx.length > 0) {
      const loaded = loadChatMessages(idx[0].id);
      return loaded.length > 0 ? loaded : [WELCOME_MSG];
    }
    return [WELCOME_MSG];
  });

  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [viewingChatId, setViewingChatId] = useState<string | null>(null);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [renamingChatId, setRenamingChatId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const streamMsgIdRef = useRef<string>("");

  // ── Persist messages ──────────────────────────────────────────────────

  useEffect(() => {
    if (!isStreaming && activeChatId) {
      saveChatMessages(activeChatId, messages);
      // Update index timestamp
      setChatIndex(prev => {
        const updated = prev.map(c =>
          c.id === activeChatId ? { ...c, updatedAt: new Date().toISOString() } : c
        );
        saveChatIndex(updated);
        return updated;
      });
    }
  }, [messages, isStreaming, activeChatId]);

  // ── Viewing chat messages (read-only preview) ─────────────────────────

  const viewingMessages = useMemo(() => {
    if (!viewingChatId) return [];
    return loadChatMessages(viewingChatId);
  }, [viewingChatId]);

  const activeChat = chatIndex.find(c => c.id === activeChatId);

  // ── Chat management ───────────────────────────────────────────────────

  const createNewChat = useCallback(() => {
    if (isStreaming) return;
    const chatId = `chat-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const now = new Date().toISOString();
    const newEntry = { id: chatId, title: "New conversation", createdAt: now, updatedAt: now };

    setChatIndex(prev => {
      const updated = [newEntry, ...prev];
      saveChatIndex(updated);
      return updated;
    });
    setActiveChatId(chatId);
    setMessages([{ ...WELCOME_MSG, timestamp: new Date() }]);
    saveChatMessages(chatId, [{ ...WELCOME_MSG, timestamp: new Date() }]);
    setInput("");
    setAttachments([]);
    toast.success("New conversation started");
    logAction("New chat", "Created new conversation");
  }, [isStreaming]);

  const switchChat = useCallback((chatId: string) => {
    if (isStreaming) {
      toast.error("Wait for the current response to finish");
      return;
    }
    if (chatId === activeChatId) return;
    const loaded = loadChatMessages(chatId);
    setActiveChatId(chatId);
    setMessages(loaded.length > 0 ? loaded : [WELCOME_MSG]);
    setInput("");
    setAttachments([]);
    setViewingChatId(null);
  }, [isStreaming, activeChatId]);

  const deleteChat = useCallback((chatId: string) => {
    deleteChatStorage(chatId);
    setChatIndex(prev => {
      const updated = prev.filter(c => c.id !== chatId);
      saveChatIndex(updated);

      // If we deleted the active chat, switch to next available or create new
      if (chatId === activeChatId) {
        if (updated.length > 0) {
          const nextId = updated[0].id;
          const loaded = loadChatMessages(nextId);
          setActiveChatId(nextId);
          setMessages(loaded.length > 0 ? loaded : [WELCOME_MSG]);
        } else {
          setActiveChatId(null);
          setMessages([WELCOME_MSG]);
        }
      }
      return updated;
    });
    setDeleteConfirm(null);
    toast.info("Conversation deleted");
    logAction("Chat deleted", chatId);
  }, [activeChatId]);

  const downloadChat = useCallback((chatId: string) => {
    const entry = chatIndex.find(c => c.id === chatId);
    const msgs = loadChatMessages(chatId);
    if (msgs.length === 0) { toast.error("No messages to download"); return; }

    const lines = msgs.map(m => {
      const time = m.timestamp.toLocaleString();
      const role = m.role === "user" ? "You" : m.role === "assistant" ? "ATLAS AI" : "System";
      return `[${time}] ${role}:\n${m.content}\n`;
    });

    const content = `# ${entry?.title || "Conversation"}\n# Exported: ${new Date().toLocaleString()}\n\n${lines.join("\n---\n\n")}`;
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `atlas-chat-${entry?.title?.replace(/[^a-zA-Z0-9]/g, "-").slice(0, 30) || chatId}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Chat log downloaded");
    logAction("Chat downloaded", entry?.title || chatId);
  }, [chatIndex]);

  const renameChat = useCallback((chatId: string, newTitle: string) => {
    const trimmed = newTitle.trim();
    if (!trimmed) return;
    setChatIndex(prev => {
      const updated = prev.map(c => c.id === chatId ? { ...c, title: trimmed } : c);
      saveChatIndex(updated);
      return updated;
    });
    setRenamingChatId(null);
    setRenameValue("");
    toast.success("Chat renamed");
  }, []);

  // ── Scroll ────────────────────────────────────────────────────────────

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, isStreaming, scrollToBottom]);

  // ── File handling ─────────────────────────────────────────────────────

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).forEach(file => {
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`File too large — max 5MB per file (${file.name})`);
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        const isImage = file.type.startsWith("image/");
        setAttachments(prev => [
          ...prev,
          { id: `att-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, name: file.name, size: file.size, type: file.type, dataUrl, isImage },
        ]);
      };
      reader.readAsDataURL(file);
    });
    e.target.value = "";
  }, []);

  const removeAttachment = useCallback((id: string) => {
    setAttachments(prev => prev.filter(a => a.id !== id));
  }, []);

  // ── Send message ──────────────────────────────────────────────────────

  const sendMessage = useCallback(async (text: string) => {
    if ((!text.trim() && attachments.length === 0) || isStreaming) return;

    // If no active chat, create one
    let currentChatId = activeChatId;
    if (!currentChatId) {
      const chatId = `chat-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const now = new Date().toISOString();
      const title = generateTitle(text);
      const newEntry = { id: chatId, title, createdAt: now, updatedAt: now };
      setChatIndex(prev => {
        const updated = [newEntry, ...prev];
        saveChatIndex(updated);
        return updated;
      });
      setActiveChatId(chatId);
      currentChatId = chatId;
    }

    const currentAttachments = [...attachments];
    let displayContent = text.trim();
    if (currentAttachments.length > 0) {
      const fileNames = currentAttachments.map(a => a.name).join(", ");
      displayContent += displayContent ? `\n\n📎 ${fileNames}` : `📎 ${fileNames}`;
    }

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: displayContent,
      timestamp: new Date(),
      attachments: currentAttachments.length > 0 ? currentAttachments : undefined,
    };

    // Auto-title: if this is the first user message in a "New conversation", generate title
    const isFirstUserMsg = messages.filter(m => m.role === "user").length === 0;
    if (isFirstUserMsg && currentChatId) {
      const title = generateTitle(text);
      setChatIndex(prev => {
        const updated = prev.map(c => c.id === currentChatId ? { ...c, title } : c);
        saveChatIndex(updated);
        return updated;
      });
    }

    const assistantMsgId = `assistant-${Date.now()}`;
    streamMsgIdRef.current = assistantMsgId;

    const streamingMsg: ChatMessage = {
      id: assistantMsgId,
      role: "assistant",
      content: "",
      timestamp: new Date(),
      isStreaming: true,
      model: "claude-4.6-sonnet",
    };

    setMessages(prev => [...prev, userMsg, streamingMsg]);
    setInput("");
    setAttachments([]);
    setIsStreaming(true);
    logAction("AI chat", text.trim().slice(0, 50));

    if (textareaRef.current) textareaRef.current.style.height = "auto";

    // Build message history for API
    const allMsgs = [...messages, userMsg];
    const history = allMsgs
      .filter(m => m.role === "user" || m.role === "assistant")
      .slice(-10)
      .map(m => {
        const imgAttachments = m.attachments?.filter(a => a.isImage) || [];
        const docAttachments = m.attachments?.filter(a => !a.isImage) || [];
        let textContent = m.content;
        if (docAttachments.length > 0) {
          textContent += "\n" + docAttachments.map(a => `[Attached: ${a.name}]`).join("\n");
        }
        if (imgAttachments.length > 0 && m.role === "user") {
          const contentBlocks: Array<unknown> = [{ type: "text", text: textContent }];
          for (const img of imgAttachments) {
            const base64Data = img.dataUrl.split(",")[1];
            const mimeType = img.type || "image/png";
            contentBlocks.push({ type: "image_url", image_url: { url: `data:${mimeType};base64,${base64Data}` } });
          }
          return { role: m.role as string, content: contentBlocks };
        }
        return { role: m.role as string, content: textContent };
      });

    // Inject portfolio context
    if (history.length > 0) {
      const last = history[history.length - 1];
      if (typeof last.content === "string") {
        history[history.length - 1] = { ...last, content: `[Portfolio Context]\n${buildPortfolioContext()}\n\n[User Question]\n${last.content}` };
      } else if (Array.isArray(last.content)) {
        const blocks = last.content as Array<{ type: string; text?: string }>;
        const textBlock = blocks.find(b => b.type === "text");
        if (textBlock && textBlock.text) {
          textBlock.text = `[Portfolio Context]\n${buildPortfolioContext()}\n\n[User Question]\n${textBlock.text}`;
        }
      }
    }

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      await streamChat(
        history as { role: string; content: string | Array<unknown> }[],
        (chunk) => {
          setMessages(prev => prev.map(m => m.id === assistantMsgId ? { ...m, content: m.content + chunk } : m));
        },
        (model) => {
          setMessages(prev => prev.map(m =>
            m.id === assistantMsgId
              ? { ...m, isStreaming: false, model, requiresApproval: m.content.toLowerCase().includes("draft") && (m.content.toLowerCase().includes("email") || m.content.toLowerCase().includes("memo") || m.content.toLowerCase().includes("letter")) }
              : m
          ));
          setIsStreaming(false);
        },
        (error) => {
          setMessages(prev => prev.map(m =>
            m.id === assistantMsgId ? { ...m, content: `I encountered an error. Please try again.\n\n> ${error}`, isStreaming: false } : m
          ));
          setIsStreaming(false);
          toast.error("AI response failed");
        },
        controller.signal,
      );
    } catch (error) {
      if ((error as Error).name === "AbortError") return;
      console.error("[AI Stream] Error:", error);
      setMessages(prev => prev.map(m =>
        m.id === assistantMsgId
          ? { ...m, content: `I encountered an error processing your request. Please try again.\n\n> ${error instanceof Error ? error.message : "Unknown error"}`, isStreaming: false }
          : m
      ));
      setIsStreaming(false);
      toast.error("AI response failed — please try again");
    }
  }, [isStreaming, messages, attachments, activeChatId]);

  const stopStreaming = useCallback(() => {
    if (abortRef.current) { abortRef.current.abort(); abortRef.current = null; }
    setMessages(prev => prev.map(m => m.id === streamMsgIdRef.current ? { ...m, isStreaming: false } : m));
    setIsStreaming(false);
  }, []);

  const handleApprove = useCallback((msgId: string) => {
    setMessages(prev => prev.map(m => (m.id === msgId ? { ...m, approved: true } : m)));
    logAction("AI action approved", msgId);
    toast.success("Action approved — executing...");
  }, []);

  const handleReject = useCallback((msgId: string) => {
    setMessages(prev => prev.map(m => (m.id === msgId ? { ...m, approved: false } : m)));
    logAction("AI action rejected", msgId);
    toast.info("Action rejected");
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  // ── Date separator logic ──────────────────────────────────────────────
  let lastDateLabel = "";

  return (
    <DashboardLayout title="AI Agent" subtitle="CLAUDE 4.6 SONNET">
      <div className="flex flex-col lg:flex-row h-[calc(100vh-3.5rem)] overflow-hidden">
        {/* ── Left Sidebar ─────────────────────────────────────────────── */}
        <div className="w-full lg:w-80 border-b lg:border-b-0 lg:border-r border-border p-4 overflow-y-auto flex-shrink-0">
          <div className="space-y-5">
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-primary/5 border border-primary/20">
              <Cpu className="size-4 text-primary" />
              <div>
                <p className="text-[10px] font-mono text-primary font-semibold">CLAUDE 4.6 SONNET</p>
                <p className="text-[10px] text-muted-foreground">Streaming · Forge API</p>
              </div>
              <span className={cn("ml-auto size-2 rounded-full", isStreaming ? "bg-amber-400 animate-pulse" : "bg-green-400 animate-pulse")} />
            </div>

            <div>
              <h3 className="text-[11px] uppercase tracking-[0.06em] text-muted-foreground font-medium mb-2">Portfolio Context</h3>
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
            </div>

            {/* ── Chat History (ChatGPT-style) ───────────────────────────── */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-[11px] uppercase tracking-[0.06em] text-muted-foreground font-medium">Conversations</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-[10px] text-muted-foreground hover:text-foreground"
                  onClick={createNewChat}
                  disabled={isStreaming}
                >
                  <Plus className="size-3 mr-1" />
                  New Chat
                </Button>
              </div>

              {chatIndex.length === 0 ? (
                <div className="bg-card border border-border rounded-md p-3">
                  <p className="text-[10px] text-muted-foreground italic">No conversations yet. Start by asking a question or click "New Chat".</p>
                </div>
              ) : (
                <div className="space-y-1 max-h-[280px] overflow-y-auto">
                  {chatIndex.map(chat => (
                    <div
                      key={chat.id}
                      className={cn(
                        "group relative rounded-md border p-2.5 cursor-pointer transition-all",
                        chat.id === activeChatId
                          ? "bg-primary/5 border-primary/30 text-foreground"
                          : "bg-card border-border hover:bg-accent/30 hover:border-primary/20"
                      )}
                      onClick={() => switchChat(chat.id)}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <MessageSquare className={cn("size-3 flex-shrink-0", chat.id === activeChatId ? "text-primary" : "text-muted-foreground")} />
                          {renamingChatId === chat.id ? (
                            <input
                              autoFocus
                              value={renameValue}
                              onChange={e => setRenameValue(e.target.value)}
                              onKeyDown={e => {
                                if (e.key === "Enter") renameChat(chat.id, renameValue);
                                if (e.key === "Escape") { setRenamingChatId(null); setRenameValue(""); }
                              }}
                              onBlur={() => { renameChat(chat.id, renameValue); }}
                              onClick={e => e.stopPropagation()}
                              className="text-xs bg-transparent border-b border-primary/40 outline-none text-foreground w-full py-0"
                            />
                          ) : (
                            <span className="text-xs text-foreground truncate">{chat.title}</span>
                          )}
                        </div>

                        {/* Actions dropdown */}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
                            <button className="size-5 rounded flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-accent transition-all flex-shrink-0">
                              <MoreHorizontal className="size-3 text-muted-foreground" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-36">
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setViewingChatId(chat.id); }}>
                              <Eye className="size-3.5 mr-2" /> View
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setRenamingChatId(chat.id); setRenameValue(chat.title); }}>
                              <PenLine className="size-3.5 mr-2" /> Rename
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); downloadChat(chat.id); }}>
                              <Download className="size-3.5 mr-2" /> Download
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={(e) => { e.stopPropagation(); setDeleteConfirm(chat.id); }}
                              className="text-red-400 focus:text-red-400"
                            >
                              <Trash2 className="size-3.5 mr-2" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      <span className="text-[9px] font-mono text-muted-foreground ml-5 block mt-0.5">
                        {formatRelativeDate(chat.updatedAt)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <h3 className="text-[11px] uppercase tracking-[0.06em] text-muted-foreground font-medium mb-2">Suggested Actions</h3>
              <div className="space-y-2">
                {SUGGESTED_ACTIONS.map(action => (
                  <button
                    key={action.label}
                    onClick={() => sendMessage(action.prompt)}
                    disabled={isStreaming}
                    className="w-full text-left bg-card border border-border rounded-md p-3 hover:bg-accent/30 hover:border-primary/30 transition-all disabled:opacity-50 group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex-shrink-0">{action.icon}</div>
                      <span className="text-xs text-foreground group-hover:text-primary transition-colors">{action.label}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── Right Panel: Chat ────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col min-h-0">
          {/* Quick actions + active chat title */}
          <div className="flex items-center gap-2 px-4 py-3 border-b border-border overflow-x-auto">
            <Sparkles className="size-3.5 text-primary flex-shrink-0" />
            {QUICK_ACTIONS.map(action => (
              <button
                key={action.label}
                onClick={() => sendMessage(action.prompt)}
                disabled={isStreaming}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-secondary/50 text-xs text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors whitespace-nowrap border border-border disabled:opacity-50"
              >
                {action.icon}
                {action.label}
              </button>
            ))}
            <div className="ml-auto flex-shrink-0 flex items-center gap-1">
              {activeChat && (
                <span className="text-[10px] font-mono text-muted-foreground/60 truncate max-w-[120px] hidden xl:block">
                  {activeChat.title}
                </span>
              )}
            </div>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
            <AnimatePresence initial={false}>
              {messages.map((msg) => {
                let dateSeparator: React.ReactNode = null;
                if (isFromPreviousSession(msg.timestamp)) {
                  const dateLabel = formatSessionDate(msg.timestamp).split(" · ")[0] || formatSessionDate(msg.timestamp);
                  if (dateLabel !== lastDateLabel) {
                    lastDateLabel = dateLabel;
                    dateSeparator = (
                      <div className="flex items-center gap-3 py-2">
                        <div className="flex-1 h-px bg-border" />
                        <span className="text-[9px] font-mono text-muted-foreground/60 uppercase tracking-wider">{dateLabel}</span>
                        <div className="flex-1 h-px bg-border" />
                      </div>
                    );
                  }
                }

                return (
                  <div key={msg.id}>
                    {dateSeparator}
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2 }}
                      className={cn("flex gap-3", msg.role === "user" ? "justify-end" : "justify-start")}
                    >
                      {msg.role === "assistant" && (
                        <div className="flex-shrink-0 size-7 rounded-md bg-primary/10 flex items-center justify-center mt-0.5">
                          <Bot className={cn("size-4 text-primary", msg.isStreaming && "animate-pulse")} />
                        </div>
                      )}

                      <div className={cn(
                        "max-w-[85%] lg:max-w-[70%] rounded-lg px-4 py-3",
                        msg.role === "user" ? "bg-primary/10 text-foreground" : "bg-card border border-border text-foreground"
                      )}>
                        {msg.attachments && msg.attachments.length > 0 && (
                          <div className="flex flex-wrap gap-2 mb-2">
                            {msg.attachments.map(att => (
                              <div key={att.id} className="flex items-center gap-1.5 px-2 py-1 rounded bg-secondary/50 border border-border">
                                {att.isImage ? (
                                  <img src={att.dataUrl} alt={att.name} className="size-6 rounded object-cover" />
                                ) : (
                                  getFileIcon(att.type)
                                )}
                                <span className="text-[10px] text-muted-foreground truncate max-w-[100px]">{att.name}</span>
                              </div>
                            ))}
                          </div>
                        )}

                        {msg.role === "assistant" && msg.isStreaming && !msg.content ? (
                          <div className="flex items-center gap-2">
                            <div className="flex gap-1">
                              <span className="size-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "0ms" }} />
                              <span className="size-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "150ms" }} />
                              <span className="size-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "300ms" }} />
                            </div>
                            <span className="text-[10px] font-mono text-muted-foreground">Connecting to Claude 4.6 Sonnet...</span>
                          </div>
                        ) : (
                          <div className="text-sm leading-relaxed prose prose-invert prose-sm max-w-none [&_table]:text-xs [&_th]:px-2 [&_th]:py-1 [&_td]:px-2 [&_td]:py-1 [&_table]:border-border [&_th]:border-border [&_td]:border-border [&_h2]:text-sm [&_h2]:mt-3 [&_h2]:mb-1 [&_h3]:text-xs [&_h3]:mt-2 [&_h3]:mb-1 [&_li]:my-0 [&_ul]:my-1 [&_ol]:my-1 [&_p]:my-1 [&_blockquote]:border-primary/30 [&_blockquote]:bg-primary/5 [&_blockquote]:px-3 [&_blockquote]:py-2 [&_blockquote]:rounded">
                            <Streamdown>{msg.content}</Streamdown>
                            {msg.isStreaming && (
                              <span className="inline-block w-1.5 h-4 bg-primary/60 animate-pulse ml-0.5 align-text-bottom" />
                            )}
                          </div>
                        )}

                        <div className="flex items-center justify-between mt-2 gap-2 flex-wrap">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-mono text-muted-foreground">
                              {formatSessionDate(msg.timestamp)}
                            </span>
                            {msg.role === "assistant" && msg.model && !msg.isStreaming && (
                              <span className="text-[9px] font-mono text-primary/60 px-1.5 py-0.5 rounded bg-primary/5 border border-primary/10">
                                {msg.model}
                              </span>
                            )}
                            {msg.isStreaming && (
                              <span className="text-[9px] font-mono text-amber-400/80 px-1.5 py-0.5 rounded bg-amber-500/5 border border-amber-500/10">
                                streaming...
                              </span>
                            )}
                          </div>

                          {!msg.isStreaming && msg.requiresApproval && msg.approved === undefined && (
                            <div className="flex items-center gap-2">
                              <button onClick={() => handleApprove(msg.id)} className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors border border-emerald-500/20">
                                <CheckCircle2 className="size-3" /> Approve
                              </button>
                              <button onClick={() => handleReject(msg.id)} className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors border border-red-500/20">
                                <XCircle className="size-3" /> Reject
                              </button>
                            </div>
                          )}
                          {msg.approved === true && (
                            <span className="flex items-center gap-1 text-[10px] text-emerald-400"><CheckCircle2 className="size-3" /> Approved</span>
                          )}
                          {msg.approved === false && (
                            <span className="flex items-center gap-1 text-[10px] text-red-400"><XCircle className="size-3" /> Rejected</span>
                          )}
                        </div>
                      </div>

                      {msg.role === "user" && (
                        <div className="flex-shrink-0 size-7 rounded-md bg-secondary flex items-center justify-center mt-0.5">
                          <User className="size-4 text-muted-foreground" />
                        </div>
                      )}
                    </motion.div>
                  </div>
                );
              })}
            </AnimatePresence>
          </div>

          {/* Attachment preview chips */}
          {attachments.length > 0 && (
            <div className="px-4 pt-2 flex flex-wrap gap-2">
              {attachments.map(att => (
                <div key={att.id} className="flex items-center gap-2 px-2.5 py-1.5 rounded-md bg-secondary/50 border border-border">
                  {att.isImage ? (
                    <img src={att.dataUrl} alt={att.name} className="size-8 rounded object-cover" />
                  ) : (
                    getFileIcon(att.type)
                  )}
                  <div className="flex flex-col">
                    <span className="text-[11px] text-foreground truncate max-w-[120px]">{att.name}</span>
                    <span className="text-[9px] text-muted-foreground">{formatFileSize(att.size)}</span>
                  </div>
                  <button onClick={() => removeAttachment(att.id)} className="ml-1 text-muted-foreground hover:text-red-400 transition-colors">
                    <X className="size-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Input area */}
          <div className="border-t border-border p-4">
            <div className="flex items-end gap-2">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.gif,.webp"
                className="hidden"
                onChange={handleFileSelect}
              />
              <Button
                variant="ghost"
                size="icon"
                className="size-[44px] flex-shrink-0 text-muted-foreground hover:text-foreground"
                onClick={() => fileInputRef.current?.click()}
              >
                <Paperclip className="size-4" />
              </Button>
              <Textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask me anything about your ventures..."
                className="flex-1 min-h-[44px] max-h-[120px] resize-none bg-secondary/30 border-border text-sm"
                rows={1}
              />
              {isStreaming ? (
                <Button onClick={stopStreaming} variant="destructive" size="icon" className="size-[44px] flex-shrink-0">
                  <XCircle className="size-4" />
                </Button>
              ) : (
                <Button onClick={() => sendMessage(input)} disabled={!input.trim() && attachments.length === 0} size="icon" className="size-[44px] flex-shrink-0">
                  <Send className="size-4" />
                </Button>
              )}
            </div>
            <p className="text-[10px] text-muted-foreground mt-2 font-mono">
              Powered by Claude 4.6 Sonnet · Streaming enabled · 📎 Attach files · Enter to send · Shift+Enter for new line
            </p>
          </div>
        </div>
      </div>

      {/* ── Delete Confirmation Dialog ────────────────────────────────── */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-sm">Delete this conversation?</AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground">
              This cannot be undone. All messages in "{chatIndex.find(c => c.id === deleteConfirm)?.title}" will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="text-xs h-8">Cancel</AlertDialogCancel>
            <AlertDialogAction className="text-xs h-8 bg-red-600 hover:bg-red-700" onClick={() => deleteConfirm && deleteChat(deleteConfirm)}>
              Yes, delete conversation
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── View Chat Preview Dialog ─────────────────────────────────── */}
      <AlertDialog open={!!viewingChatId} onOpenChange={(open) => !open && setViewingChatId(null)}>
        <AlertDialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-sm flex items-center gap-2">
              <Eye className="size-4 text-primary" />
              {chatIndex.find(c => c.id === viewingChatId)?.title || "Conversation"}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-[10px] font-mono text-muted-foreground">
              {viewingMessages.length} messages · {chatIndex.find(c => c.id === viewingChatId)?.createdAt
                ? formatRelativeDate(chatIndex.find(c => c.id === viewingChatId)!.createdAt)
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex-1 overflow-y-auto space-y-3 py-2 max-h-[50vh]">
            {viewingMessages.map(msg => (
              <div key={msg.id} className={cn("flex gap-2", msg.role === "user" ? "justify-end" : "justify-start")}>
                {msg.role === "assistant" && (
                  <div className="flex-shrink-0 size-6 rounded-md bg-primary/10 flex items-center justify-center mt-0.5">
                    <Bot className="size-3 text-primary" />
                  </div>
                )}
                <div className={cn(
                  "max-w-[80%] rounded-lg px-3 py-2",
                  msg.role === "user" ? "bg-primary/10" : "bg-card border border-border"
                )}>
                  <div className="text-xs leading-relaxed text-foreground line-clamp-6">
                    <Streamdown>{msg.content}</Streamdown>
                  </div>
                  <span className="text-[9px] font-mono text-muted-foreground mt-1 block">
                    {formatSessionDate(msg.timestamp)}
                  </span>
                </div>
                {msg.role === "user" && (
                  <div className="flex-shrink-0 size-6 rounded-md bg-secondary flex items-center justify-center mt-0.5">
                    <User className="size-3 text-muted-foreground" />
                  </div>
                )}
              </div>
            ))}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel className="text-xs h-8">Close</AlertDialogCancel>
            {viewingChatId && viewingChatId !== activeChatId && (
              <AlertDialogAction
                className="text-xs h-8"
                onClick={() => { if (viewingChatId) { switchChat(viewingChatId); setViewingChatId(null); } }}
              >
                Open this conversation
              </AlertDialogAction>
            )}
            {viewingChatId && (
              <Button
                variant="outline"
                size="sm"
                className="text-xs h-8"
                onClick={() => { if (viewingChatId) downloadChat(viewingChatId); }}
              >
                <Download className="size-3 mr-1" /> Download
              </Button>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
