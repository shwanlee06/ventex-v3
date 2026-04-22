// ============================================================================
// Portal AI Concierge — Floating chat widget for client portal
// Premium private-banking aesthetic. Org-scoped data only.
// ============================================================================
import { useState, useRef, useEffect, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sparkles,
  Send,
  X,
  Minimize2,
  Trash2,
  MessageSquare,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Streamdown } from "streamdown";
import { toast } from "sonner";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
}

interface PortalConciergeProps {
  orgSlug: string;
  orgName: string;
}

const STORAGE_KEY_PREFIX = "ventex_portal_chat_";

export default function PortalConcierge({ orgSlug, orgName }: PortalConciergeProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const storageKey = `${STORAGE_KEY_PREFIX}${orgSlug}`;

  const aiChat = trpc.portal.aiChat.useMutation();

  // Load messages from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        setMessages(
          parsed.map((m: any) => ({
            ...m,
            timestamp: new Date(m.timestamp),
            isStreaming: false,
          }))
        );
      }
    } catch {
      // ignore
    }
  }, [storageKey]);

  // Save messages to localStorage
  useEffect(() => {
    if (messages.length > 0 && !messages.some((m) => m.isStreaming)) {
      const toStore = messages.slice(-30).map(({ isStreaming, ...rest }) => rest);
      localStorage.setItem(storageKey, JSON.stringify(toStore));
    }
  }, [messages, storageKey]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      const el = scrollRef.current.querySelector("[data-radix-scroll-area-viewport]");
      if (el) {
        el.scrollTop = el.scrollHeight;
      }
    }
  }, [messages, isOpen]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 200);
    }
  }, [isOpen]);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || isLoading) return;

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: "user",
      content: text,
      timestamp: new Date(),
    };

    const assistantMsg: ChatMessage = {
      id: `a-${Date.now()}`,
      role: "assistant",
      content: "",
      timestamp: new Date(),
      isStreaming: true,
    };

    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setInput("");
    setIsLoading(true);

    try {
      const history = messages
        .filter((m) => !m.isStreaming)
        .slice(-10)
        .map((m) => ({ role: m.role, content: m.content }));

      const result = await aiChat.mutateAsync({
        orgSlug,
        messages: [...history, { role: "user" as const, content: text }],
      });

      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantMsg.id
            ? { ...m, content: result.content, isStreaming: false }
            : m
        )
      );
    } catch (err: any) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantMsg.id
            ? {
                ...m,
                content: "I apologize, but I was unable to process your request. Please try again.",
                isStreaming: false,
              }
            : m
        )
      );
      toast.error("AI response failed");
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, messages, orgSlug, aiChat]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const clearChat = () => {
    setMessages([]);
    localStorage.removeItem(storageKey);
    toast.success("Conversation cleared");
  };

  const unreadCount = 0; // Could track unread assistant messages

  return (
    <>
      {/* Floating trigger button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
            onClick={() => setIsOpen(true)}
            className="fixed bottom-6 right-6 z-50 size-14 rounded-full bg-emerald-500 hover:bg-emerald-400 text-white shadow-lg shadow-emerald-500/25 flex items-center justify-center transition-colors group"
            title="AI Concierge"
          >
            <Sparkles className="size-6 group-hover:scale-110 transition-transform" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 size-5 rounded-full bg-red-500 text-[10px] font-bold flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="fixed bottom-6 right-6 z-50 w-[380px] h-[560px] rounded-2xl border border-border/40 bg-background/95 backdrop-blur-xl shadow-2xl shadow-black/20 flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border/30 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="size-9 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                  <Sparkles className="size-4.5 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground">
                    AI Concierge
                  </h3>
                  <p className="text-[10px] text-muted-foreground/60">
                    {orgName} Portfolio Assistant
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {messages.length > 0 && (
                  <button
                    onClick={clearChat}
                    className="size-8 rounded-lg flex items-center justify-center text-muted-foreground/40 hover:text-red-400 hover:bg-red-500/10 transition-all"
                    title="Clear conversation"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="size-8 rounded-lg flex items-center justify-center text-muted-foreground/40 hover:text-foreground hover:bg-white/[0.06] transition-all"
                  title="Close"
                >
                  <Minimize2 className="size-3.5" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <ScrollArea ref={scrollRef} className="flex-1 min-h-0">
              <div className="px-5 py-4 space-y-4">
                {messages.length === 0 && (
                  <div className="text-center py-12">
                    <div className="size-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
                      <MessageSquare className="size-6 text-emerald-400/60" />
                    </div>
                    <h4 className="text-sm font-semibold text-foreground mb-1.5">
                      How can I help?
                    </h4>
                    <p className="text-xs text-muted-foreground/60 max-w-[240px] mx-auto leading-relaxed">
                      Ask about your ventures, tasks, distributions, or portfolio health.
                    </p>
                    <div className="mt-5 space-y-2">
                      {[
                        "What's the status of my portfolio?",
                        "Which tasks need attention?",
                        "Summarize my distributions",
                      ].map((suggestion) => (
                        <button
                          key={suggestion}
                          onClick={() => {
                            setInput(suggestion);
                            setTimeout(() => inputRef.current?.focus(), 50);
                          }}
                          className="block w-full text-left text-[11px] text-muted-foreground/50 hover:text-emerald-400 px-3 py-2 rounded-lg border border-border/20 hover:border-emerald-500/20 hover:bg-emerald-500/5 transition-all"
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={cn(
                      "flex",
                      msg.role === "user" ? "justify-end" : "justify-start"
                    )}
                  >
                    <div
                      className={cn(
                        "max-w-[85%] rounded-2xl px-4 py-2.5",
                        msg.role === "user"
                          ? "bg-emerald-500/15 text-foreground"
                          : "bg-white/[0.04] text-foreground border border-border/20"
                      )}
                    >
                      {msg.role === "assistant" ? (
                        msg.isStreaming && !msg.content ? (
                          <div className="flex items-center gap-1.5 py-1">
                            <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse [animation-delay:150ms]" />
                            <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse [animation-delay:300ms]" />
                          </div>
                        ) : (
                          <div className="text-xs leading-relaxed [&_p]:mb-2 [&_ul]:ml-4 [&_ul]:list-disc [&_li]:mb-1 [&_strong]:font-semibold [&_h1]:text-sm [&_h1]:font-semibold [&_h1]:mb-2 [&_h2]:text-xs [&_h2]:font-semibold [&_h2]:mb-1.5 [&_h3]:text-xs [&_h3]:font-semibold [&_h3]:mb-1">
                            <Streamdown>{msg.content}</Streamdown>
                          </div>
                        )
                      ) : (
                        <p className="text-xs leading-relaxed">{msg.content}</p>
                      )}
                      <span className="text-[9px] text-muted-foreground/30 mt-1 block">
                        {msg.timestamp.toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            {/* Input */}
            <div className="px-4 pb-4 pt-2 border-t border-border/20 flex-shrink-0">
              <div className="flex items-end gap-2">
                <Textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask about your portfolio..."
                  className="flex-1 min-h-[40px] max-h-[100px] resize-none text-xs bg-white/[0.04] border-border/20 rounded-xl focus:border-emerald-500/30 focus:ring-emerald-500/10 placeholder:text-muted-foreground/30"
                  rows={1}
                  disabled={isLoading}
                />
                <Button
                  size="icon"
                  onClick={handleSend}
                  disabled={!input.trim() || isLoading}
                  className="size-10 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white flex-shrink-0 disabled:opacity-30"
                >
                  <Send className="size-4" />
                </Button>
              </div>
              <p className="text-[9px] text-muted-foreground/30 mt-2 text-center">
                Powered by VENTEX Intelligence
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
