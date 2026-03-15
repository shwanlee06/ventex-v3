// ============================================================================
// AI Agent Page — Swiss Instrument design
// Split layout: left = pending approvals + context metrics, right = chat
// Quick-action buttons, typing indicator, human-in-the-loop approve
// ============================================================================

import { useState, useRef, useEffect, useCallback } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import StatusBadge from "@/components/StatusBadge";
import { cn } from "@/lib/utils";
import { METRICS, COMPLIANCE_ITEMS, VERTICAL_COLORS, AGENT_CONTEXT, formatDate } from "@/lib/data";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Send,
  Bot,
  User,
  Sparkles,
  FileText,
  Mail,
  CalendarClock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Activity,
  Clock,
  Users,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
  requiresApproval?: boolean;
  approved?: boolean;
}

const QUICK_ACTIONS = [
  { label: "Weekly ops summary", icon: <FileText className="size-3.5" />, prompt: "Give me a weekly operations summary across all verticals." },
  { label: "Draft vendor email", icon: <Mail className="size-3.5" />, prompt: "Draft a professional email to our vendor regarding the pending invoice reconciliation for Real Estate Q1." },
  { label: "Compliance deadlines", icon: <CalendarClock className="size-3.5" />, prompt: "List all upcoming compliance deadlines across all verticals, sorted by urgency." },
];

const INITIAL_MESSAGES: ChatMessage[] = [
  {
    id: "sys-1",
    role: "assistant",
    content: "Good afternoon. I'm your ATLAS Venture Ops assistant. I have context on all 5 verticals, 2 active clients, and 3 compliance alerts requiring attention.\n\nHow can I help you today?",
    timestamp: new Date(),
  },
];

// Simulated responses
const SIMULATED_RESPONSES: Record<string, string> = {
  "weekly ops summary": `**Weekly Operations Summary — Week 11, 2026**

**Overall Performance:**
- 247 tasks automated across all verticals
- 61 hours reclaimed for client teams
- 3 compliance items requiring immediate attention

**Real Estate:**
- 3 lease renewals in pipeline (2 pending, 1 completed)
- Q1 vendor invoices fully reconciled (12 invoices, £284K total)
- Fire safety certificate for 42 Mayfair scheduled for Apr 15

**Yachts:**
- **ALERT:** Crew certification overdue 8 days on M/Y Solaris — escalation recommended
- Insurance renewal automated for Apr 1
- Monaco dock reservation confirmed

**Hospitality:**
- H&S inspection prep underway for Apr 3
- Staff rota for week 12 pending approval
- Feb guest feedback analysis completed — NPS score: 72

**F&B:**
- Liquor license renewal due Mar 31 — application drafted
- POS integration agent deployment at 78% completion
- Spring menu cost analysis completed — 4.2% margin improvement identified

**Energy:**
- Solar array maintenance scheduled for Mar 25
- Grid compliance audit pending for Apr 10
- Q1 output report generated — 12% above forecast`,

  "draft vendor email": `Here's a draft vendor email for your review:

---

**Subject:** Q1 Invoice Reconciliation — Real Estate Portfolio

Dear [Vendor Name],

I hope this message finds you well. I'm writing regarding the Q1 2026 invoice reconciliation for our real estate portfolio.

Our automated review has identified 12 invoices totaling £284,000 that have been processed and reconciled. We'd like to confirm the following:

1. All line items match the agreed service schedules
2. The payment terms remain Net 30 as per our contract
3. Any outstanding credits from Q4 2025 have been applied

Could you please confirm receipt and verify the reconciliation summary attached? We'd appreciate your response by March 20th to ensure timely processing.

Best regards,
ATLAS Operations Team

---

**⚠️ This is a draft email. Would you like me to send it?** This action requires your approval.`,

  "compliance deadlines": `**Compliance Deadlines — Sorted by Urgency**

| Priority | Vertical | Item | Due Date | Status |
|----------|----------|------|----------|--------|
| 🔴 OVERDUE | Yachts | Crew certification — M/Y Solaris | Mar 6 | 8 days overdue |
| 🟡 URGENT | Real Estate | Lease compliance — Belgravia | Mar 28 | 14 days remaining |
| 🟡 URGENT | F&B | Liquor license renewal | Mar 31 | 17 days remaining |
| 🟠 UPCOMING | Hospitality | H&S inspection | Apr 3 | 20 days remaining |
| 🟠 UPCOMING | Energy | Grid compliance audit | Apr 10 | 27 days remaining |
| ⚪ SCHEDULED | Real Estate | Fire safety cert — 42 Mayfair | Apr 15 | 32 days remaining |
| ⚪ SCHEDULED | Yachts | Flag state inspection — M/Y Solaris | Apr 20 | 37 days remaining |
| ⚪ SCHEDULED | Hospitality | Food hygiene rating renewal | May 1 | 48 days remaining |

**Recommended Actions:**
1. **Immediate:** Escalate M/Y Solaris crew certification — 8 days overdue
2. **This week:** Review Belgravia lease compliance documentation
3. **Next week:** Submit F&B liquor license renewal application`,
};

function getSimulatedResponse(input: string): { content: string; requiresApproval: boolean } {
  const lower = input.toLowerCase();
  if (lower.includes("summary") || lower.includes("ops")) {
    return { content: SIMULATED_RESPONSES["weekly ops summary"], requiresApproval: false };
  }
  if (lower.includes("email") || lower.includes("vendor") || lower.includes("draft")) {
    return { content: SIMULATED_RESPONSES["draft vendor email"], requiresApproval: true };
  }
  if (lower.includes("compliance") || lower.includes("deadline")) {
    return { content: SIMULATED_RESPONSES["compliance deadlines"], requiresApproval: false };
  }
  return {
    content: `I've analyzed your request. Based on current portfolio data:\n\n- **247 tasks** automated this week across 5 verticals\n- **3 compliance alerts** require attention\n- **2 active clients** (Meridian Holdings live, Solaris Group onboarding)\n\nCould you be more specific about which vertical or task you'd like me to focus on? I can provide detailed breakdowns for Real Estate, Yachts, Hospitality, F&B, or Energy.`,
    requiresApproval: false,
  };
}

export default function Agent() {
  const [messages, setMessages] = useState<ChatMessage[]>(INITIAL_MESSAGES);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping, scrollToBottom]);

  const sendMessage = useCallback((text: string) => {
    if (!text.trim()) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: text.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    // Simulate response delay
    setTimeout(() => {
      const response = getSimulatedResponse(text);
      const assistantMsg: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: response.content,
        timestamp: new Date(),
        requiresApproval: response.requiresApproval,
      };
      setMessages((prev) => [...prev, assistantMsg]);
      setIsTyping(false);
    }, 1500 + Math.random() * 1000);
  }, []);

  const handleApprove = (msgId: string) => {
    setMessages((prev) =>
      prev.map((m) => (m.id === msgId ? { ...m, approved: true } : m))
    );
  };

  const handleReject = (msgId: string) => {
    setMessages((prev) =>
      prev.map((m) => (m.id === msgId ? { ...m, approved: false } : m))
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const pendingAlerts = COMPLIANCE_ITEMS.filter((c) => c.status === "overdue" || c.status === "pending").slice(0, 3);

  return (
    <DashboardLayout title="AI Agent" subtitle="CLAUDE-POWERED OPS ASSISTANT">
      <div className="flex flex-col lg:flex-row h-[calc(100vh-3.5rem)] overflow-hidden">
        {/* Left panel: Context + Approvals */}
        <div className="w-full lg:w-80 border-b lg:border-b-0 lg:border-r border-border p-4 overflow-y-auto flex-shrink-0">
          {/* Agent context metrics */}
          <div className="space-y-4">
            <h3 className="text-[11px] uppercase tracking-[0.06em] text-muted-foreground font-medium">
              Agent Context
            </h3>
            <div className="grid grid-cols-3 lg:grid-cols-1 gap-2">
              <div className="bg-card border border-border rounded-md p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Activity className="size-3.5 text-blue-400" />
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Tasks</span>
                </div>
                <span className="text-lg font-mono font-semibold text-foreground">{METRICS.tasksAutomatedThisWeek}</span>
              </div>
              <div className="bg-card border border-border rounded-md p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Clock className="size-3.5 text-emerald-400" />
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Hours</span>
                </div>
                <span className="text-lg font-mono font-semibold text-foreground">{METRICS.hoursReclaimed}</span>
              </div>
              <div className="bg-card border border-border rounded-md p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Users className="size-3.5 text-primary" />
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Clients</span>
                </div>
                <span className="text-lg font-mono font-semibold text-foreground">{METRICS.activeClients}</span>
              </div>
            </div>

            {/* Pending alerts */}
            <div className="mt-6">
              <h3 className="text-[11px] uppercase tracking-[0.06em] text-muted-foreground font-medium mb-3">
                Compliance Alerts
              </h3>
              <div className="space-y-2">
                {pendingAlerts.map((alert) => {
                  const vc = VERTICAL_COLORS[alert.vertical];
                  return (
                    <div key={alert.id} className="bg-card border border-border rounded-md p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="size-1.5 rounded-full" style={{ backgroundColor: vc.color }} />
                        <span className="text-[10px] font-mono text-muted-foreground">{vc.label}</span>
                        <StatusBadge status={alert.status} className="ml-auto" />
                      </div>
                      <p className="text-xs text-foreground">{alert.item}</p>
                      <p className="text-[10px] font-mono text-muted-foreground mt-1">Due {formatDate(alert.dueDate)}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Right panel: Chat */}
        <div className="flex-1 flex flex-col min-h-0">
          {/* Quick actions */}
          <div className="flex items-center gap-2 px-4 py-3 border-b border-border overflow-x-auto">
            <Sparkles className="size-3.5 text-primary flex-shrink-0" />
            {QUICK_ACTIONS.map((action) => (
              <button
                key={action.label}
                onClick={() => sendMessage(action.prompt)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-secondary/50 text-xs text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors whitespace-nowrap border border-border"
              >
                {action.icon}
                {action.label}
              </button>
            ))}
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
                    <div className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</div>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-[10px] font-mono text-muted-foreground">
                        {msg.timestamp.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                      </span>

                      {/* Approval buttons */}
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

            {/* Typing indicator */}
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
                  <div className="flex gap-1">
                    <span className="size-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="size-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="size-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "300ms" }} />
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
                placeholder="Ask the agent anything..."
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
              Destructive actions require approval before execution
            </p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
