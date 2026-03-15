import React, { useState, useRef, useCallback } from "react";
import {
  View, Text, FlatList, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, SafeAreaView, KeyboardAvoidingView, Platform, ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  VENTURES, SPVS, TASKS, DISTRIBUTIONS, METRICS, formatCurrency,
} from "../../lib/data";

const C = {
  bg: "#0a0a0a", card: "#111111", border: "#222222",
  text: "#ffffff", textSec: "#888888", primary: "#3b82f6",
  green: "#22c55e", amber: "#f59e0b", red: "#ef4444",
};

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

const QUICK_ACTIONS = [
  { label: "Portfolio summary", prompt: "Give me a portfolio summary across all ventures and SPVs." },
  { label: "Draft LP update", prompt: "Draft a professional LP update email." },
  { label: "Open tasks", prompt: "List all open tasks sorted by priority." },
  { label: "Latest activity", prompt: "Show me the latest activity across all ventures." },
];

function buildContext(): string {
  const v = VENTURES.map(v => `${v.name} (${v.theme}, ${v.status})`).join("; ");
  const s = SPVS.map(s => `${s.name} (${s.stage}, ${s.priority})`).join("; ");
  const t = TASKS.map(t => `${t.title} (${t.status}, ${t.priority})`).join("; ");
  return `Portfolio: ${METRICS.totalVentures} ventures, ${METRICS.totalSPVs} SPVs, ${METRICS.openTasks} open tasks, ${formatCurrency(METRICS.paidDistributions)} distributed.\nVentures: ${v}\nSPVs: ${s}\nTasks: ${t}`;
}

const WELCOME: Message = {
  id: "welcome",
  role: "assistant",
  content: "Hey — I'm your ATLAS ops assistant. What do you need?",
  timestamp: new Date(),
};

export default function AgentScreen() {
  const [messages, setMessages] = useState<Message[]>([WELCOME]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || loading) return;

    const userMsg: Message = {
      id: `u-${Date.now()}`,
      role: "user",
      content: text.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    // Build message history
    const history = [...messages, userMsg]
      .filter((m) => m.role === "user" || m.role === "assistant")
      .slice(-8)
      .map((m) => ({ role: m.role, content: m.content }));

    // Inject context
    if (history.length > 0) {
      const last = history[history.length - 1];
      history[history.length - 1] = {
        ...last,
        content: `[Context]\n${buildContext()}\n\n[Question]\n${last.content}`,
      };
    }

    try {
      const response = await fetch("/api/ai/stream", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ messages: history }),
      });

      if (!response.ok) throw new Error("Request failed");

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No body");

      const decoder = new TextDecoder();
      let buffer = "";
      let fullContent = "";
      const assistantId = `a-${Date.now()}`;

      const assistantMsg: Message = {
        id: assistantId,
        role: "assistant",
        content: "",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMsg]);

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
          if (data === "[DONE]") break;

          try {
            const parsed = JSON.parse(data);
            if (parsed.content) {
              fullContent += parsed.content;
              setMessages((prev) =>
                prev.map((m) => m.id === assistantId ? { ...m, content: fullContent } : m)
              );
            }
          } catch {}
        }
      }
    } catch (error) {
      const errMsg: Message = {
        id: `e-${Date.now()}`,
        role: "assistant",
        content: "Sorry, I encountered an error. Please try again.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setLoading(false);
    }
  }, [loading, messages]);

  return (
    <SafeAreaView style={s.safe}>
      <KeyboardAvoidingView
        style={s.container}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={90}
      >
        {/* Header */}
        <View style={s.header}>
          <Ionicons name="sparkles" size={18} color={C.primary} />
          <Text style={s.headerTitle}>AI Agent</Text>
          <View style={s.modelBadge}>
            <Text style={s.modelText}>claude-4.6-sonnet</Text>
          </View>
        </View>

        {/* Messages */}
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={s.messageList}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          renderItem={({ item }) => (
            <View style={[s.messageBubble, item.role === "user" ? s.userBubble : s.assistantBubble]}>
              <Text style={[s.messageText, item.role === "user" ? s.userText : s.assistantText]}>
                {item.content}
              </Text>
              <Text style={s.messageTime}>
                {item.timestamp.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
              </Text>
            </View>
          )}
        />

        {/* Quick actions */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.quickActions}>
          {QUICK_ACTIONS.map((action) => (
            <TouchableOpacity
              key={action.label}
              style={s.quickChip}
              onPress={() => sendMessage(action.prompt)}
              disabled={loading}
              activeOpacity={0.7}
            >
              <Text style={s.quickChipText}>{action.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Input */}
        <View style={s.inputBar}>
          <TextInput
            style={s.textInput}
            value={input}
            onChangeText={setInput}
            placeholder="Ask me anything about your ventures..."
            placeholderTextColor={C.textSec}
            multiline
            maxLength={2000}
          />
          {loading ? (
            <ActivityIndicator color={C.primary} style={s.sendBtn} />
          ) : (
            <TouchableOpacity
              style={[s.sendBtn, !input.trim() && s.sendBtnDisabled]}
              onPress={() => sendMessage(input)}
              disabled={!input.trim()}
            >
              <Ionicons name="send" size={18} color={input.trim() ? C.primary : C.textSec} />
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  container: { flex: 1 },
  header: {
    flexDirection: "row", alignItems: "center", gap: 8,
    paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.border,
  },
  headerTitle: { fontSize: 16, fontWeight: "800", color: C.text, flex: 1 },
  modelBadge: { paddingHorizontal: 8, paddingVertical: 3, backgroundColor: `${C.primary}15`, borderRadius: 4 },
  modelText: { fontSize: 9, fontWeight: "600", color: C.primary, fontVariant: ["tabular-nums"] },
  messageList: { padding: 16, paddingBottom: 8 },
  messageBubble: { maxWidth: "82%" as any, marginBottom: 12, padding: 12, borderRadius: 12 },
  userBubble: { alignSelf: "flex-end", backgroundColor: "#ffffff", borderBottomRightRadius: 4 },
  assistantBubble: { alignSelf: "flex-start", backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderBottomLeftRadius: 4 },
  messageText: { fontSize: 14, lineHeight: 20 },
  userText: { color: "#111111" },
  assistantText: { color: C.text },
  messageTime: { fontSize: 9, color: C.textSec, marginTop: 6, alignSelf: "flex-end" },
  quickActions: { paddingHorizontal: 16, paddingVertical: 8, maxHeight: 44 },
  quickChip: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 4,
    backgroundColor: C.card, borderWidth: 1, borderColor: C.border, marginRight: 8,
  },
  quickChipText: { fontSize: 11, fontWeight: "600", color: C.textSec },
  inputBar: {
    flexDirection: "row", alignItems: "flex-end", gap: 8,
    paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: 1, borderTopColor: C.border,
  },
  textInput: {
    flex: 1, fontSize: 14, color: C.text, maxHeight: 100,
    backgroundColor: C.card, borderRadius: 8, borderWidth: 1, borderColor: C.border,
    paddingHorizontal: 14, paddingVertical: 10,
  },
  sendBtn: { padding: 10 },
  sendBtnDisabled: { opacity: 0.4 },
});
