// ============================================================================
// AI Concierge — Premium, minimal interface for UHNWI/HNWI clients
// Clean, understated, private-banking aesthetic
// ============================================================================

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { cn } from "@/lib/utils";
// Live data is now injected server-side via buildLiveContext() in aiStream.ts
// No more hardcoded data imports needed for AI context
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Send, User, FileText, Paperclip, X, Download,
  Image, FileSpreadsheet, Plus, MoreHorizontal, Trash2,
  MessageSquare, PenLine, StopCircle, History, Sparkles,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { Streamdown } from "streamdown";
import { logAction } from "@/lib/operatorSession";
import { ScrollArea } from "@/components/ui/scroll-area";

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
  attachments?: Attachment[];
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
        id: m.id, role: m.role, content: m.content,
        timestamp: m.timestamp.toISOString(), model: m.model,
        attachments: m.attachments,
      }));
    localStorage.setItem(CHAT_PREFIX + chatId, JSON.stringify(stored));
  } catch { /* full */ }
}

function deleteChatStorage(chatId: string) {
  localStorage.removeItem(CHAT_PREFIX + chatId);
}

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
  const clean = firstMessage.replace(/📎[\s\S]*$/, "").trim();
  if (!clean) return "New conversation";
  if (clean.length <= 40) return clean;
  const truncated = clean.slice(0, 40);
  const lastSpace = truncated.lastIndexOf(" ");
  return (lastSpace > 20 ? truncated.slice(0, lastSpace) : truncated) + "...";
}

// ── Formatting ──────────────────────────────────────────────────────────

function formatTime(date: Date): string {
  return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function formatRelative(dateStr: string): string {
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
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(type: string) {
  if (type.startsWith("image/")) return <Image className="size-3.5 text-muted-foreground" />;
  if (type === "application/pdf") return <FileText className="size-3.5 text-muted-foreground" />;
  if (type.includes("spreadsheet") || type.includes("excel") || type.includes(".sheet"))
    return <FileSpreadsheet className="size-3.5 text-muted-foreground" />;
  return <FileText className="size-3.5 text-muted-foreground" />;
}

// ── Suggestions (understated) ───────────────────────────────────────────

const SUGGESTIONS = [
  "Portfolio overview",
  "Open tasks",
  "Draft LP update",
  "SPV pipeline status",
];

const WELCOME_MSG: ChatMessage = {
  id: "sys-1",
  role: "assistant",
  content: "Good to see you. How can I help today?",
  timestamp: new Date(),
};

// Portfolio context is now built server-side from live DB data in aiStream.ts

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
  if (!response.ok) throw new Error(`Request failed: ${response.status}`);
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
      if (data === "[DONE]") { onDone("assistant"); return; }
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
  const [chatIndex, setChatIndex] = useState<{ id: string; title: string; createdAt: string; updatedAt: string }[]>(() => {
    const existing = loadChatIndex();
    if (existing.length > 0) return existing;
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
  const [historyOpen, setHistoryOpen] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [renamingChatId, setRenamingChatId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const streamMsgIdRef = useRef<string>("");

  const activeChat = chatIndex.find(c => c.id === activeChatId);
  const hasMessages = messages.filter(m => m.role === "user").length > 0;

  // ── Persist ──────────────────────────────────────────────────────────

  useEffect(() => {
    if (!isStreaming && activeChatId) {
      saveChatMessages(activeChatId, messages);
      setChatIndex(prev => {
        const updated = prev.map(c =>
          c.id === activeChatId ? { ...c, updatedAt: new Date().toISOString() } : c
        );
        saveChatIndex(updated);
        return updated;
      });
    }
  }, [messages, isStreaming, activeChatId]);

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
    setHistoryOpen(false);
  }, [isStreaming]);

  const switchChat = useCallback((chatId: string) => {
    if (isStreaming) return;
    if (chatId === activeChatId) { setHistoryOpen(false); return; }
    const loaded = loadChatMessages(chatId);
    setActiveChatId(chatId);
    setMessages(loaded.length > 0 ? loaded : [WELCOME_MSG]);
    setInput("");
    setAttachments([]);
    setHistoryOpen(false);
  }, [isStreaming, activeChatId]);

  const deleteChat = useCallback((chatId: string) => {
    deleteChatStorage(chatId);
    setChatIndex(prev => {
      const updated = prev.filter(c => c.id !== chatId);
      saveChatIndex(updated);
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
  }, [activeChatId]);

  const downloadChat = useCallback((chatId: string) => {
    const entry = chatIndex.find(c => c.id === chatId);
    const msgs = loadChatMessages(chatId);
    if (msgs.length === 0) return;
    const lines = msgs.map(m => {
      const time = m.timestamp.toLocaleString();
      const role = m.role === "user" ? "You" : "ATLAS";
      return `[${time}] ${role}:\n${m.content}\n`;
    });
    const content = `${entry?.title || "Conversation"}\nExported: ${new Date().toLocaleString()}\n\n${lines.join("\n---\n\n")}`;
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `atlas-${entry?.title?.replace(/[^a-zA-Z0-9]/g, "-").slice(0, 30) || chatId}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Exported");
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
        toast.error(`File too large — max 5 MB`);
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
      displayContent += displayContent ? `\n\n${fileNames}` : fileNames;
    }

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: displayContent,
      timestamp: new Date(),
      attachments: currentAttachments.length > 0 ? currentAttachments : undefined,
    };

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
    };

    setMessages(prev => [...prev, userMsg, streamingMsg]);
    setInput("");
    setAttachments([]);
    setIsStreaming(true);
    logAction("AI chat", text.trim().slice(0, 50));

    if (textareaRef.current) textareaRef.current.style.height = "auto";

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

    // Portfolio context is now injected server-side via buildLiveContext()
    // No client-side context injection needed

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      await streamChat(
        history as { role: string; content: string | Array<unknown> }[],
        (chunk) => {
          setMessages(prev => prev.map(m => m.id === assistantMsgId ? { ...m, content: m.content + chunk } : m));
        },
        () => {
          setMessages(prev => prev.map(m =>
            m.id === assistantMsgId ? { ...m, isStreaming: false } : m
          ));
          setIsStreaming(false);
        },
        (error) => {
          setMessages(prev => prev.map(m =>
            m.id === assistantMsgId ? { ...m, content: "I wasn't able to process that. Please try again.", isStreaming: false } : m
          ));
          setIsStreaming(false);
        },
        controller.signal,
      );
    } catch (error) {
      if ((error as Error).name === "AbortError") return;
      setMessages(prev => prev.map(m =>
        m.id === assistantMsgId ? { ...m, content: "Something went wrong. Please try again.", isStreaming: false } : m
      ));
      setIsStreaming(false);
    }
  }, [isStreaming, messages, attachments, activeChatId]);

  const stopStreaming = useCallback(() => {
    if (abortRef.current) { abortRef.current.abort(); abortRef.current = null; }
    setMessages(prev => prev.map(m => m.id === streamMsgIdRef.current ? { ...m, isStreaming: false } : m));
    setIsStreaming(false);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  return (
    <DashboardLayout title="Concierge" subtitle="ATLAS INTELLIGENCE">
      <div className="flex flex-col h-[calc(100vh-3.5rem)] overflow-hidden">

        {/* ── Minimal top bar ──────────────────────────────────────── */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-border/50">
          <div className="flex items-center gap-3">
            <div className="size-8 rounded-full bg-foreground/5 flex items-center justify-center">
              <Sparkles className="size-4 text-foreground/70" />
            </div>
            <div>
              <span className="text-sm text-foreground tracking-tight" style={{ fontFamily: '"Bodoni Moda", "Didot", Georgia, serif', fontWeight: 500 }}>
                {activeChat?.title || "New conversation"}
              </span>
              {isStreaming && (
                <span className="ml-2 text-[10px] text-muted-foreground/60 tracking-wide">typing</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground gap-1.5"
              onClick={() => setHistoryOpen(true)}
            >
              <History className="size-3.5" />
              <span className="hidden sm:inline">History</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground gap-1.5"
              onClick={createNewChat}
              disabled={isStreaming}
            >
              <Plus className="size-3.5" />
              <span className="hidden sm:inline">New</span>
            </Button>
          </div>
        </div>

        {/* ── Messages ─────────────────────────────────────────────── */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto">
          <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 space-y-6">

            {/* Welcome state — shown when no user messages yet */}
            {!hasMessages && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                className="pt-12 sm:pt-20 pb-8"
              >
                <div className="flex justify-center mb-6">
                  <div className="size-12 rounded-full bg-foreground/5 flex items-center justify-center">
                <span className="text-2xl font-light text-foreground/30 tracking-widest">A</span>
                  </div>
                </div>
                <p className="text-center text-foreground/80 text-lg font-light tracking-tight">
                  How can I assist you?
                </p>
                <div className="flex flex-wrap justify-center gap-2 mt-8">
                  {SUGGESTIONS.map(s => (
                    <button
                      key={s}
                      onClick={() => sendMessage(s)}
                      className="px-4 py-2 rounded-full text-xs text-muted-foreground border border-border/60 hover:border-foreground/20 hover:text-foreground transition-all duration-200"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Message thread */}
            <AnimatePresence initial={false}>
              {messages.filter(m => hasMessages || m.role !== "assistant" || m.id !== "sys-1").map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, ease: "easeOut" }}
                  className={cn(
                    "flex gap-3",
                    msg.role === "user" ? "justify-end" : "justify-start"
                  )}
                >
                  {msg.role === "assistant" && (
                    <div className="flex-shrink-0 size-7 rounded-full bg-foreground/5 flex items-center justify-center mt-1">
                      <Sparkles className={cn("size-3.5 text-foreground/50", msg.isStreaming && "animate-pulse")} />
                    </div>
                  )}

                  <div className={cn(
                    "max-w-[85%] sm:max-w-[75%]",
                    msg.role === "user"
                      ? "rounded-2xl rounded-br-sm bg-foreground/[0.06] px-4 py-3"
                      : "px-1 py-1"
                  )}>
                    {/* Attachments */}
                    {msg.attachments && msg.attachments.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        {msg.attachments.map(att => (
                          <div key={att.id} className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-foreground/[0.04] border border-border/40">
                            {att.isImage ? (
                              <img src={att.dataUrl} alt={att.name} className="size-5 rounded object-cover" />
                            ) : (
                              getFileIcon(att.type)
                            )}
                            <span className="text-[10px] text-muted-foreground truncate max-w-[80px]">{att.name}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Content */}
                    {msg.role === "assistant" && msg.isStreaming && !msg.content ? (
                      <div className="flex items-center gap-1.5 py-2">
                        <span className="size-1 rounded-full bg-foreground/30 animate-pulse" />
                        <span className="size-1 rounded-full bg-foreground/30 animate-pulse" style={{ animationDelay: "200ms" }} />
                        <span className="size-1 rounded-full bg-foreground/30 animate-pulse" style={{ animationDelay: "400ms" }} />
                      </div>
                    ) : (
                      <div className={cn(
                        "text-sm leading-relaxed",
                        msg.role === "assistant"
                          ? "prose prose-invert prose-sm max-w-none [&_table]:text-xs [&_th]:px-2 [&_th]:py-1 [&_td]:px-2 [&_td]:py-1 [&_table]:border-border [&_th]:border-border [&_td]:border-border [&_h2]:text-sm [&_h2]:mt-3 [&_h2]:mb-1 [&_h3]:text-xs [&_h3]:mt-2 [&_h3]:mb-1 [&_li]:my-0 [&_ul]:my-1 [&_ol]:my-1 [&_p]:my-1 [&_blockquote]:border-foreground/10 [&_blockquote]:bg-foreground/[0.03] [&_blockquote]:px-3 [&_blockquote]:py-2 [&_blockquote]:rounded"
                          : "text-foreground"
                      )}>
                        <Streamdown>{msg.content}</Streamdown>
                        {msg.isStreaming && (
                          <span className="inline-block w-0.5 h-4 bg-foreground/40 animate-pulse ml-0.5 align-text-bottom" />
                        )}
                      </div>
                    )}

                    {/* Timestamp — subtle */}
                    {!msg.isStreaming && msg.role !== "system" && (
                      <span className="text-[10px] text-muted-foreground/40 mt-1.5 block">
                        {formatTime(msg.timestamp)}
                      </span>
                    )}
                  </div>

                  {msg.role === "user" && (
                    <div className="flex-shrink-0 size-7 rounded-full bg-foreground/5 flex items-center justify-center mt-1">
                      <User className="size-3.5 text-foreground/50" />
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>

        {/* ── Attachment preview ────────────────────────────────────── */}
        {attachments.length > 0 && (
          <div className="max-w-2xl mx-auto w-full px-4 sm:px-6 pt-2">
            <div className="flex flex-wrap gap-2">
              {attachments.map(att => (
                <div key={att.id} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-foreground/[0.04] border border-border/40">
                  {att.isImage ? (
                    <img src={att.dataUrl} alt={att.name} className="size-6 rounded object-cover" />
                  ) : (
                    getFileIcon(att.type)
                  )}
                  <span className="text-[11px] text-muted-foreground truncate max-w-[100px]">{att.name}</span>
                  <button onClick={() => removeAttachment(att.id)} className="text-muted-foreground/40 hover:text-foreground transition-colors">
                    <X className="size-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Input area ───────────────────────────────────────────── */}
        <div className="max-w-2xl mx-auto w-full px-4 sm:px-6 py-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] mb-16 md:mb-0">
          <div className="flex items-end gap-2 bg-foreground/[0.03] border border-border/50 rounded-xl px-3 py-2 focus-within:border-foreground/15 transition-colors">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.gif,.webp"
              className="hidden"
              onChange={handleFileSelect}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex-shrink-0 size-8 flex items-center justify-center text-muted-foreground/50 hover:text-foreground/70 transition-colors touch-manipulation"
            >
              <Paperclip className="size-4" />
            </button>
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything..."
              className="flex-1 min-h-[36px] max-h-[120px] resize-none bg-transparent border-0 shadow-none text-sm placeholder:text-muted-foreground/40 focus-visible:ring-0 p-0 py-1"
              rows={1}
            />
            {isStreaming ? (
              <button
                onClick={stopStreaming}
                className="flex-shrink-0 size-8 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors touch-manipulation"
              >
                <StopCircle className="size-4" />
              </button>
            ) : (
              <button
                onClick={() => sendMessage(input)}
                disabled={!input.trim() && attachments.length === 0}
                className="flex-shrink-0 size-8 flex items-center justify-center text-muted-foreground/50 hover:text-foreground/70 disabled:opacity-30 transition-colors touch-manipulation"
              >
                <Send className="size-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── History drawer ──────────────────────────────────────────── */}
      <Sheet open={historyOpen} onOpenChange={setHistoryOpen}>
        <SheetContent side="right" className="w-full sm:w-[360px] sm:max-w-[360px] bg-card border-border p-0">
          <SheetHeader className="px-4 pt-4 pb-3 border-b border-border">
            <div className="flex items-center justify-between">
              <SheetTitle className="text-sm font-medium">Conversations</SheetTitle>
              <SheetDescription className="sr-only">Chat history</SheetDescription>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs text-muted-foreground gap-1"
                onClick={createNewChat}
              >
                <Plus className="size-3" />
                New
              </Button>
            </div>
          </SheetHeader>
          <ScrollArea className="h-[calc(100vh-80px)]">
            <div className="p-2 space-y-0.5">
              {chatIndex.length === 0 ? (
                <div className="text-center py-12">
                  <MessageSquare className="size-6 mx-auto mb-2 text-muted-foreground/30" />
                  <p className="text-xs text-muted-foreground/60">No conversations yet</p>
                </div>
              ) : (
                chatIndex.map(chat => (
                  <div
                    key={chat.id}
                    className={cn(
                      "group flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors",
                      chat.id === activeChatId
                        ? "bg-foreground/[0.06]"
                        : "hover:bg-foreground/[0.03]"
                    )}
                    onClick={() => switchChat(chat.id)}
                  >
                    <div className="flex-1 min-w-0">
                      {renamingChatId === chat.id ? (
                        <input
                          autoFocus
                          value={renameValue}
                          onChange={e => setRenameValue(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === "Enter") renameChat(chat.id, renameValue);
                            if (e.key === "Escape") { setRenamingChatId(null); setRenameValue(""); }
                          }}
                          onBlur={() => renameChat(chat.id, renameValue)}
                          onClick={e => e.stopPropagation()}
                          className="text-xs bg-transparent border-b border-foreground/20 outline-none text-foreground w-full py-0"
                        />
                      ) : (
                        <span className="text-xs text-foreground truncate block">{chat.title}</span>
                      )}
                      <span className="text-[10px] text-muted-foreground/50 mt-0.5 block">
                        {formatRelative(chat.updatedAt)}
                      </span>
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
                        <button className="size-6 rounded flex items-center justify-center opacity-0 group-hover:opacity-100 text-muted-foreground/50 hover:text-foreground transition-all">
                          <MoreHorizontal className="size-3.5" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-36">
                        <DropdownMenuItem className="text-xs gap-2" onClick={(e) => {
                          e.stopPropagation();
                          setRenamingChatId(chat.id);
                          setRenameValue(chat.title);
                        }}>
                          <PenLine className="size-3" /> Rename
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-xs gap-2" onClick={(e) => {
                          e.stopPropagation();
                          downloadChat(chat.id);
                        }}>
                          <Download className="size-3" /> Export
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-xs gap-2 text-red-400 focus:text-red-400" onClick={(e) => {
                          e.stopPropagation();
                          setDeleteConfirm(chat.id);
                        }}>
                          <Trash2 className="size-3" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>

      {/* ── Delete Confirmation ─────────────────────────────────────── */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-sm">Delete conversation?</AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground">
              This will permanently remove all messages in this conversation.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="text-xs h-8">Cancel</AlertDialogCancel>
            <AlertDialogAction className="text-xs h-8 bg-red-600 hover:bg-red-700" onClick={() => deleteConfirm && deleteChat(deleteConfirm)}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
