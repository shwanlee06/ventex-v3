import React, { createContext, useContext, useEffect, useRef, useCallback, useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";

// ── Types ──────────────────────────────────────────────
interface AgentStatus {
  name: string;
  displayName: string;
  icon: string;
  status: "active" | "running" | "idle" | "error";
  lastRun: number | null;
  lastSignal: string | null;
  intervalMs: number;
  eventsToday: number;
  isPaused: boolean;
}

interface AgentEvent {
  id: number;
  agentName: string;
  eventType: string;
  message: string;
  severity: string;
  entityType: string | null;
  entityId: string | null;
  entityName: string | null;
  oldStatus: string | null;
  newStatus: string | null;
  isRead: boolean;
  createdAt: Date;
}

interface UnreadCounts {
  total: number;
  critical: number;
  warning: number;
  info: number;
}

interface AgentContextValue {
  isOperator: boolean;
  agentStatuses: AgentStatus[];
  events: AgentEvent[];
  unreadCounts: UnreadCounts;
  isLoading: boolean;
  markRead: (eventId: number) => void;
  markAllRead: () => void;
  togglePause: (agentName: string) => void;
  runAgent: (agentName: string) => void;
  refetchEvents: () => void;
}

const defaultUnread: UnreadCounts = { total: 0, critical: 0, warning: 0, info: 0 };

const AgentContext = createContext<AgentContextValue>({
  isOperator: false,
  agentStatuses: [],
  events: [],
  unreadCounts: defaultUnread,
  isLoading: true,
  markRead: () => {},
  markAllRead: () => {},
  togglePause: () => {},
  runAgent: () => {},
  refetchEvents: () => {},
});

export function useAgents() {
  return useContext(AgentContext);
}

// ── Agent intervals (ms) ───────────────────────────────
const AGENT_INTERVALS: Record<string, number> = {
  overdue: 60_000,
  venture: 120_000,
  distribution: 300_000,
  orchestrator: 180_000,
};

// ── Provider ───────────────────────────────────────────
export function AgentProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const isOperator = useMemo(() => {
    if (!user) return false;
    return ["owner", "admin", "partner"].includes(user.role);
  }, [user]);

  // Only fetch data if operator
  const statusesQuery = trpc.agents.statuses.useQuery(undefined, {
    enabled: isOperator,
    refetchInterval: 30_000,
    refetchOnWindowFocus: false,
  });

  const eventsQuery = trpc.agents.events.useQuery(
    { limit: 50, offset: 0 },
    {
      enabled: isOperator,
      refetchInterval: 15_000,
      refetchOnWindowFocus: false,
    }
  );

  const unreadQuery = trpc.agents.unreadCounts.useQuery(undefined, {
    enabled: isOperator,
    refetchInterval: 15_000,
    refetchOnWindowFocus: false,
  });

  const utils = trpc.useUtils();

  // Mutations
  const runMutation = trpc.agents.run.useMutation({
    onSuccess: () => {
      utils.agents.statuses.invalidate();
      utils.agents.events.invalidate();
      utils.agents.unreadCounts.invalidate();
    },
  });

  const togglePauseMutation = trpc.agents.togglePause.useMutation({
    onSuccess: () => {
      utils.agents.statuses.invalidate();
    },
  });

  const markReadMutation = trpc.agents.markRead.useMutation({
    onSuccess: () => {
      utils.agents.events.invalidate();
      utils.agents.unreadCounts.invalidate();
    },
  });

  const markAllReadMutation = trpc.agents.markAllRead.useMutation({
    onSuccess: () => {
      utils.agents.events.invalidate();
      utils.agents.unreadCounts.invalidate();
    },
  });

  // ── Polling: run agents on their intervals ───────────
  const intervalsRef = useRef<Map<string, ReturnType<typeof setInterval>>>(new Map());

  useEffect(() => {
    if (!isOperator) return;

    // Set up intervals for each agent
    for (const [agentName, intervalMs] of Object.entries(AGENT_INTERVALS)) {
      if (intervalsRef.current.has(agentName)) continue;

      const id = setInterval(() => {
        runMutation.mutate({ agentName });
      }, intervalMs);

      intervalsRef.current.set(agentName, id);
    }

    // Run all agents once on mount (staggered)
    const agents = Object.keys(AGENT_INTERVALS);
    agents.forEach((agentName, i) => {
      setTimeout(() => {
        runMutation.mutate({ agentName });
      }, i * 2000); // stagger by 2s each
    });

    return () => {
      for (const id of Array.from(intervalsRef.current.values())) {
        clearInterval(id);
      }
      intervalsRef.current.clear();
    };
  }, [isOperator]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Context value ────────────────────────────────────
  const value = useMemo<AgentContextValue>(() => ({
    isOperator,
    agentStatuses: statusesQuery.data ?? [],
    events: eventsQuery.data?.events ?? [],
    unreadCounts: unreadQuery.data ?? defaultUnread,
    isLoading: statusesQuery.isLoading || eventsQuery.isLoading,
    markRead: (eventId: number) => markReadMutation.mutate({ eventId }),
    markAllRead: () => markAllReadMutation.mutate(),
    togglePause: (agentName: string) => togglePauseMutation.mutate({ agentName }),
    runAgent: (agentName: string) => runMutation.mutate({ agentName }),
    refetchEvents: () => {
      utils.agents.events.invalidate();
      utils.agents.unreadCounts.invalidate();
    },
  }), [
    isOperator,
    statusesQuery.data,
    statusesQuery.isLoading,
    eventsQuery.data,
    eventsQuery.isLoading,
    unreadQuery.data,
    markReadMutation,
    markAllReadMutation,
    togglePauseMutation,
    runMutation,
    utils,
  ]);

  return (
    <AgentContext.Provider value={value}>
      {children}
    </AgentContext.Provider>
  );
}
