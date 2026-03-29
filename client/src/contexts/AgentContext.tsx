// ============================================================================
// Agent Context — Provides agent events and metrics to the entire app
// ============================================================================

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { trpc } from "@/lib/trpc";

// ── Agent Config ────────────────────────────────────────────────────────

export const AGENT_CONFIG = {
  overdue: {
    key: "overdue",
    label: "Overdue Agent",
    dbName: "Overdue Agent",
    color: "#EF4444",
    bgColor: "bg-red-500/10",
    textColor: "text-red-400",
    description: "Monitors task deadlines and escalates overdue items",
  },
  venture: {
    key: "venture",
    label: "Venture Agent",
    dbName: "Venture Agent",
    color: "#3B82F6",
    bgColor: "bg-blue-500/10",
    textColor: "text-blue-400",
    description: "Tracks venture portfolio health and risk signals",
  },
  distribution: {
    key: "distribution",
    label: "Distribution Sentinel",
    dbName: "Distribution Sentinel",
    color: "#10B981",
    bgColor: "bg-emerald-500/10",
    textColor: "text-emerald-400",
    description: "Monitors distribution flows and payment anomalies",
  },
  orchestrator: {
    key: "orchestrator",
    label: "Orchestrator",
    dbName: "Orchestrator",
    color: "#A855F7",
    bgColor: "bg-purple-500/10",
    textColor: "text-purple-400",
    description: "Synthesizes sub-agent signals into executive briefings",
  },
} as const;

export type AgentKey = keyof typeof AGENT_CONFIG;

// Map DB display names to short keys
const DB_NAME_TO_KEY: Record<string, AgentKey> = {
  "Overdue Agent": "overdue",
  "Venture Agent": "venture",
  "Distribution Sentinel": "distribution",
  "Orchestrator": "orchestrator",
};

export function resolveAgentKey(agentName: string): AgentKey {
  return DB_NAME_TO_KEY[agentName] ?? (agentName.toLowerCase() as AgentKey);
}

export function getAgentConfig(agentName: string) {
  const key = resolveAgentKey(agentName);
  return AGENT_CONFIG[key] ?? AGENT_CONFIG.orchestrator;
}

// ── Context ─────────────────────────────────────────────────────────────

interface AgentEvent {
  id: number;
  agentName: string;
  eventType: string;
  message: string;
  severity: string;
  entityType: string | null;
  agentEntityId: string | null;
  agentEntityName: string | null;
  oldStatus: string | null;
  newStatus: string | null;
  isRead: boolean;
  createdAt: Date;
}

interface AgentMetrics {
  total: number;
  unread: number;
  critical: number;
  warning: number;
  byAgent: Record<string, number>;
}

interface AgentContextValue {
  events: AgentEvent[];
  metrics: AgentMetrics | undefined;
  isLoading: boolean;
  isRunning: boolean;
  runAllAgents: () => void;
  runSingleAgent: (agentName: AgentKey) => void;
  markRead: (ids: number[]) => void;
  markAllRead: () => void;
  refetch: () => void;
}

const AgentContext = createContext<AgentContextValue | null>(null);

// ── Provider ────────────────────────────────────────────────────────────

export function AgentProvider({ children }: { children: ReactNode }) {
  const utils = trpc.useUtils();

  const { data: events = [], isLoading: eventsLoading } = trpc.agents.list.useQuery(
    { limit: 50 },
    { refetchInterval: 60000 }
  );

  const { data: metrics, isLoading: metricsLoading } = trpc.agents.metrics.useQuery(
    undefined,
    { refetchInterval: 60000 }
  );

  const runAll = trpc.agents.runAll.useMutation({
    onSuccess: () => {
      utils.agents.list.invalidate();
      utils.agents.metrics.invalidate();
    },
  });

  const runSingle = trpc.agents.runSingle.useMutation({
    onSuccess: () => {
      utils.agents.list.invalidate();
      utils.agents.metrics.invalidate();
    },
  });

  const markReadMut = trpc.agents.markRead.useMutation({
    onSuccess: () => {
      utils.agents.list.invalidate();
      utils.agents.metrics.invalidate();
    },
  });

  const markAllReadMut = trpc.agents.markAllRead.useMutation({
    onSuccess: () => {
      utils.agents.list.invalidate();
      utils.agents.metrics.invalidate();
    },
  });

  const value = useMemo<AgentContextValue>(
    () => ({
      events: events as AgentEvent[],
      metrics: metrics as AgentMetrics | undefined,
      isLoading: eventsLoading || metricsLoading,
      isRunning: runAll.isPending || runSingle.isPending,
      runAllAgents: () => runAll.mutate(),
      runSingleAgent: (agentName: AgentKey) => runSingle.mutate({ agentName }),
      markRead: (ids: number[]) => markReadMut.mutate({ ids }),
      markAllRead: () => markAllReadMut.mutate(),
      refetch: () => {
        utils.agents.list.invalidate();
        utils.agents.metrics.invalidate();
      },
    }),
    [events, metrics, eventsLoading, metricsLoading, runAll, runSingle, markReadMut, markAllReadMut, utils]
  );

  return <AgentContext.Provider value={value}>{children}</AgentContext.Provider>;
}

// ── Hook ────────────────────────────────────────────────────────────────

export function useAgents() {
  const ctx = useContext(AgentContext);
  if (!ctx) throw new Error("useAgents must be used within AgentProvider");
  return ctx;
}
