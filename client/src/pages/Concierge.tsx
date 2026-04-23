// AI Concierge — VENTEX Intelligence sidebar page
// Star-branded, full-featured AI chat with streaming, history, and tool execution

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { cn } from "@/lib/utils";
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
  Send, Paperclip, X, Plus, Trash2,
  MessageSquare, StopCircle, History, Sparkles,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { Streamdown } from "streamdown";
import { ScrollArea } from "@/components/ui/scroll-area";

const VENTEX_LOGO_URL = "https://d2xsxph8kpxj0f.cloudfront.net/310519663421947072/TYkqBQavc4Sd5YvF3sSZqT/ventex-logo-mark_1f534165.png";

/* ─── Local Storage ──────────────────────────────────────────────── */
const CHATS_INDEX_KEY = "ventex_concierge_index";
const CHAT_PREFIX = "ventex_concierge_";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  isStreaming?: boolean;
}

interface ChatIndexEntry {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

function loadChatIndex(): ChatIndexEntry[] {
  try { return JSON.parse(localStorage.getItem(CHATS_INDEX_KEY) || "[]"); } catch { return []; }
}
function saveChatIndex(index: ChatIndexEntry[]) {
  localStorage.setItem(CHATS_INDEX_KEY, JSON.stringify(index));
}
function loadChatMessages(chatId: string): ChatMessage[] {
  try { return JSON.parse(localStorage.getItem(CHAT_PREFIX + chatId) || "[]"); } catch { return []; }
}
function saveChatMessages(chatId: string, messages: ChatMessage[]) {
  const stored = messages.map(({ isStreaming, ...rest }) => rest).slice(-50);
  localStorage.setItem(CHAT_PREFIX + chatId, JSON.stringify(stored));
}
function deleteChatStorage(chatId: string) {
  localStorage.removeItem(CHAT_PREFIX + chatId);
}

/* ─── Streaming helper ───────────────────────────────────────────── */
async function streamChat(
  messages: { role: string; content: string }[],
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

/* ─── Suggestion cards ───────────────────────────────────────────── */
const SUGGESTIONS = [
  { label: "Portfolio overview", prompt: "Give me a full portfolio overview across all clients" },
  { label: "Overdue tasks", prompt: "Which tasks are overdue and need immediate attention?" },
  { label: "Create a task", prompt: "Help me create a new task" },
  { label: "Venture health", prompt: "Show me venture health scores and any red flags" },
];

/* ─── Component ──────────────────────────────────────────────────── */
export default function Concierge() {
  const [chatIndex, setChatIndex] = useState<ChatIndexEntry[]>(() => loadChatIndex());
  const [activeChatId, setActiveChatId] = useState<string | null>(() => {
    const idx = loadChatIndex();
    return idx.length > 0 ? idx[0].id : null;
  });
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const idx = loadChatIndex();
    return idx.length > 0 ? loadChatMessages(idx[0].id) : [];
  });
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const accumulatorRef = useRef("");

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Save messages when they change
  useEffect(() => {
    if (activeChatId && messages.length > 0) {
      saveChatMessages(activeChatId, messages);
    }
  }, [messages, activeChatId]);

  const createNewChat = useCallback(() => {
    const chatId = `conc-${Date.now()}`;
    const entry: ChatIndexEntry = {
      id: chatId,
      title: "New conversation",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const updated = [entry, ...chatIndex];
    setChatIndex(updated);
    saveChatIndex(updated);
    setActiveChatId(chatId);
    setMessages([]);
    setInput("");
  }, [chatIndex]);

  const switchChat = useCallback((chatId: string) => {
    setActiveChatId(chatId);
    setMessages(loadChatMessages(chatId));
    setShowHistory(false);
  }, []);

  const deleteChat = useCallback((chatId: string) => {
    deleteChatStorage(chatId);
    const updated = chatIndex.filter(c => c.id !== chatId);
    setChatIndex(updated);
    saveChatIndex(updated);
    if (activeChatId === chatId) {
      if (updated.length > 0) {
        setActiveChatId(updated[0].id);
        setMessages(loadChatMessages(updated[0].id));
      } else {
        setActiveChatId(null);
        setMessages([]);
      }
    }
    setDeleteTarget(null);
  }, [chatIndex, activeChatId]);

  const handleSend = useCallback(async (text?: string) => {
    const content = (text || input).trim();
    if (!content || isStreaming) return;

    let chatId = activeChatId;
    if (!chatId) {
      chatId = `conc-${Date.now()}`;
      const entry: ChatIndexEntry = {
        id: chatId,
        title: content.slice(0, 50),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      const updated = [entry, ...chatIndex];
      setChatIndex(updated);
      saveChatIndex(updated);
      setActiveChatId(chatId);
    }

    // Update title if first message
    if (messages.length === 0) {
      const updated = chatIndex.map(c =>
        c.id === chatId ? { ...c, title: content.slice(0, 50), updatedAt: new Date().toISOString() } : c
      );
      setChatIndex(updated);
      saveChatIndex(updated);
    }

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: "user",
      content,
      timestamp: new Date().toISOString(),
    };
    const assistantMsg: ChatMessage = {
      id: `a-${Date.now()}`,
      role: "assistant",
      content: "",
      timestamp: new Date().toISOString(),
      isStreaming: true,
    };

    const newMessages = [...messages, userMsg, assistantMsg];
    setMessages(newMessages);
    setInput("");
    setIsStreaming(true);
    accumulatorRef.current = "";

    const historyForApi = [...messages, userMsg].map(m => ({
      role: m.role,
      content: m.content,
    }));

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      await streamChat(
        historyForApi,
        (chunk) => {
          accumulatorRef.current += chunk;
          const accumulated = accumulatorRef.current;
          setMessages(prev => prev.map(m =>
            m.id === assistantMsg.id ? { ...m, content: accumulated } : m
          ));
        },
        () => {
          setMessages(prev => prev.map(m =>
            m.id === assistantMsg.id ? { ...m, isStreaming: false } : m
          ));
          setIsStreaming(false);
        },
        (error) => {
          setMessages(prev => prev.map(m =>
            m.id === assistantMsg.id ? { ...m, content: `Error: ${error}`, isStreaming: false } : m
          ));
          setIsStreaming(false);
        },
        controller.signal,
      );
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") {
        setMessages(prev => prev.map(m =>
          m.id === assistantMsg.id ? { ...m, isStreaming: false } : m
        ));
      } else {
        setMessages(prev => prev.map(m =>
          m.id === assistantMsg.id ? { ...m, content: "Connection error. Please try again.", isStreaming: false } : m
        ));
      }
      setIsStreaming(false);
    }
  }, [input, isStreaming, activeChatId, messages, chatIndex]);

  const handleStop = useCallback(() => {
    abortRef.current?.abort();
    setIsStreaming(false);
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  const clearAll = useCallback(() => {
    chatIndex.forEach(c => deleteChatStorage(c.id));
    setChatIndex([]);
    saveChatIndex([]);
    setActiveChatId(null);
    setMessages([]);
    setConfirmClear(false);
    toast.success("All conversations cleared");
  }, [chatIndex]);

  const hasMessages = messages.length > 0;

  return (
    <DashboardLayout title="AI Concierge" subtitle="VENTEX INTELLIGENCE">
      <div className="flex h-[calc(100vh-57px)]">
        {/* ── Main Chat Area ──────────────────────────────────────── */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header bar */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-border flex-shrink-0">
            <div className="flex items-center gap-3">
              <img src={VENTEX_LOGO_URL} alt="" className="size-7 rounded-md object-cover" />
              <div>
                <span className="text-sm font-medium text-foreground">VENTEX Intelligence</span>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="size-1.5 rounded-full bg-emerald-400" />
                  <span className="text-[10px] font-mono text-emerald-400">online</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowHistory(true)}
                className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground"
              >
                <History className="size-3.5 mr-1.5" />
                History
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={createNewChat}
                className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground"
              >
                <Plus className="size-3.5 mr-1.5" />
                New
              </Button>
              {hasMessages && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setConfirmClear(true)}
                  className="h-8 px-2.5 text-xs text-red-400/70 hover:text-red-400"
                >
                  <Trash2 className="size-3.5 mr-1.5" />
                  Clear
                </Button>
              )}
            </div>
          </div>

          {/* Messages area */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto">
            {!hasMessages ? (
              /* Empty state */
              <div className="flex flex-col items-center justify-center h-full px-6">
                <img src={VENTEX_LOGO_URL} alt="" className="size-16 rounded-xl object-cover mb-6 opacity-40" />
                <h2 className="text-lg font-medium text-foreground mb-1">VENTEX Intelligence</h2>
                <p className="text-sm text-muted-foreground mb-8 text-center max-w-md">
                  Your AI-powered operations assistant. Ask about portfolio status, create tasks, analyze ventures, or get strategic insights.
                </p>
                <div className="grid grid-cols-2 gap-2.5 max-w-lg w-full">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s.label}
                      onClick={() => handleSend(s.prompt)}
                      className="p-3 rounded-lg border border-border text-left hover:bg-accent/30 hover:border-primary/20 transition-all group"
                    >
                      <Sparkles className="size-3.5 text-primary/50 group-hover:text-primary mb-1.5 transition-colors" />
                      <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">{s.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              /* Messages */
              <div className="max-w-3xl mx-auto px-4 py-6 space-y-5">
                {messages.map((msg) => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                    className={cn(
                      "flex gap-3",
                      msg.role === "user" ? "justify-end" : "justify-start"
                    )}
                  >
                    {msg.role === "assistant" && (
                      <img src={VENTEX_LOGO_URL} alt="" className="size-7 rounded-md object-cover flex-shrink-0 mt-0.5" />
                    )}
                    <div
                      className={cn(
                        "max-w-[85%] rounded-lg px-4 py-3",
                        msg.role === "user"
                          ? "bg-primary/10 text-foreground"
                          : "bg-card border border-border text-foreground"
                      )}
                    >
                      {msg.role === "assistant" ? (
                        <div className="text-sm leading-relaxed prose prose-invert prose-sm max-w-none">
                          <Streamdown>{msg.content || (msg.isStreaming ? "..." : "")}</Streamdown>
                        </div>
                      ) : (
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                      )}
                      <span className="text-[9px] font-mono text-muted-foreground/50 mt-2 block">
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          {/* Input area */}
          <div className="border-t border-border px-4 py-3 flex-shrink-0">
            <div className="max-w-3xl mx-auto flex items-end gap-2">
              <Textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask VENTEX Intelligence anything..."
                className="flex-1 min-h-[44px] max-h-[120px] resize-none text-sm bg-card border-border"
                rows={1}
              />
              {isStreaming ? (
                <Button
                  onClick={handleStop}
                  size="sm"
                  variant="outline"
                  className="h-[44px] px-3 border-red-500/30 text-red-400 hover:bg-red-500/10"
                >
                  <StopCircle className="size-4" />
                </Button>
              ) : (
                <Button
                  onClick={() => handleSend()}
                  size="sm"
                  disabled={!input.trim()}
                  className="h-[44px] px-3"
                >
                  <Send className="size-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── History Sheet ─────────────────────────────────────────── */}
      <Sheet open={showHistory} onOpenChange={setShowHistory}>
        <SheetContent side="right" className="w-[320px] p-0">
          <SheetHeader className="px-4 py-3 border-b border-border">
            <SheetTitle className="text-sm">Conversation History</SheetTitle>
            <SheetDescription className="text-xs text-muted-foreground">
              {chatIndex.length} conversation{chatIndex.length !== 1 ? "s" : ""}
            </SheetDescription>
          </SheetHeader>
          <ScrollArea className="h-[calc(100vh-80px)]">
            <div className="p-2 space-y-0.5">
              {chatIndex.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <MessageSquare className="size-6 mb-2 opacity-40" />
                  <span className="text-xs">No conversations yet</span>
                </div>
              ) : (
                chatIndex.map((chat) => (
                  <div
                    key={chat.id}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2.5 rounded-md cursor-pointer group transition-colors",
                      activeChatId === chat.id
                        ? "bg-accent/60 text-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-accent/30"
                    )}
                    onClick={() => switchChat(chat.id)}
                  >
                    <MessageSquare className="size-3.5 flex-shrink-0 opacity-50" />
                    <div className="flex-1 min-w-0">
                      <span className="text-xs font-medium block truncate">{chat.title}</span>
                      <span className="text-[10px] text-muted-foreground font-mono">
                        {new Date(chat.updatedAt).toLocaleDateString()}
                      </span>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); setDeleteTarget(chat.id); }}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-500/10 hover:text-red-400 transition-all"
                    >
                      <Trash2 className="size-3" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>

      {/* ── Confirm Clear Dialog ──────────────────────────────────── */}
      <AlertDialog open={confirmClear} onOpenChange={setConfirmClear}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear all conversations?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete all conversation history. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={clearAll} className="bg-red-600 hover:bg-red-700">
              Clear All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Confirm Delete Dialog ─────────────────────────────────── */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete conversation?</AlertDialogTitle>
            <AlertDialogDescription>
              This conversation will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTarget && deleteChat(deleteTarget)}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
