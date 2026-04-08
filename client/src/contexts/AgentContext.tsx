// ============================================================================
// Agent Context — Velocity Build: Full agent state management
// Events, drafts, velocity metrics, agent statuses, action execution
// ============================================================================

import { createContext, useContext, useMemo, useCallback, type ReactNode } from "react";
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
    icon: "AlertTriangle",
    description: "Monitors task deadlines, auto-marks overdue, drafts follow-up communications",
  },
  velocity: {
    key: "velocity",
    label: "Velocity Agent",
    dbName: "Velocity Agent",
    color: "#3B82F6",
    bgColor: "bg-blue-500/10",
    textColor: "text-blue-400",
    icon: "Zap",
    description: "Detects ventures ready to advance, auto-advances stages, tracks velocity compression",
  },
  distribution: {
    key: "distribution",
    label: "Distribution Sentinel",
    dbName: "Distribution Sentinel",
    color: "#10B981",
    bgColor: "bg-emerald-500/10",
    textColor: "text-emerald-400",
    icon: "DollarSign",
    description: "Monitors scheduled distributions, fires reminders, drafts LP notices",
  },
  orchestrator: {
    key: "orchestrator",
    label: "Orchestrator",
    dbName: "Orchestrator",
    color: "#A855F7",
    bgColor: "bg-purple-500/10",
    textColor: "text-purple-400",
    icon: "Brain",
    description: "Reads all agent outputs, generates portfolio-level executive intelligence",
  },
} as const;

export type AgentKey = keyof typeof AGENT_CONFIG;
export const AGENT_KEYS = Object.keys(AGENT_CONFIG) as AgentKey[];

// Map DB display names to short keys
const DB_NAME_TO_KEY: Record<string, AgentKey> = {
  "Overdue Agent": "overdue",
  "Venture Agent": "velocity",
  "Velocity Agent": "velocity",
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

// ── Types ──────────────────────────────────────────────────────────────

export interface AgentEvent {
  id: number;
  agentName: string;
  eventType: string;
  message: string;
  severity: string;
  actionType: string | null;
  actionLabel: string | null;
  actionPayload: Record<string, unknown> | null;
  entityType: string | null;
  agentEntityId: string | null;
  agentEntityName: string | null;
  oldStatus: string | null;
  newStatus: string | null;
  isRead: boolean;
  actionTaken: boolean;
  actionTakenAt: Date | null;
  actionTakenBy: string | null;
  createdAt: Date;
}

export interface AgentDraft {
  id: number;
  ventureId: number | null;
  ventureName: string | null;
  draftType: string;
  subject: string;
  body: string;
  recipientName: string | null;
  recipientRole: string | null;
  status: string;
  createdByAgent: string;
  sentAt: Date | null;
  sentBy: string | null;
  createdAt: Date;
}

export interface AgentMetrics {
  total: number;
  unread: number;
  critical: number;
  warning: number;
  draftsGenerated: number;
  byAgent: Record<string, number>;
}

export interface VelocityMetrics {
  avgDays: number | null;
  totalAdvances: number;
  recentAdvances: Array<{
    id: number;
    ventureId: number | null;
    ventureName: string;
    sector: string | null;
    fromStage: string;
    toStage: string;
    daysInStage: number;
    advancedBy: string;
    advancedAt: Date;
  }>;
}

export interface AgentStatus {
  key: AgentKey;
  label: string;
  eventsToday: number;
  draftsToday: number;
  lastSignal: string | null;
  lastSeverity: string | null;
  lastRunAt: Date | null;
  severityBreakdown: { critical: number; warning: number; info: number };
}

interface AgentContextValue {
  // Events
  events: AgentEvent[];
  metrics: AgentMetrics | undefined;
  isLoading: boolean;
  isRunning: boolean;

  // Agent operations
  runAllAgents: () => void;
  runSingleAgent: (agentName: AgentKey) => void;
  markRead: (ids: number[]) => void;
  markAllRead: () => void;
  executeAction: (eventId: number, actionType: string) => void;
  refetch: () => void;

  // Drafts
  drafts: AgentDraft[];
  pendingDraftCount: number;
  sendDraft: (draftId: number, editedBody?: string) => void;
  dismissDraft: (draftId: number) => void;
  restoreDraft: (draftId: number) => void;
  deleteDraft: (draftId: number) => void;
  bulkDeleteDrafts: (draftIds: number[]) => void;
  isSendingDraft: boolean;

  // Velocity
  velocityMetrics: VelocityMetrics | undefined;

  // Agent statuses (computed)
  agentStatuses: AgentStatus[];

  // Unread with action (for bell badge)
  unreadWithAction: AgentEvent[];
  criticalUnread: number;
  warningUnread: number;
}

const AgentContext = createContext<AgentContextValue | null>(null);

// ── Provider ────────────────────────────────────────────────────────────

export function AgentProvider({ children }: { children: ReactNode }) {
  const utils = trpc.useUtils();

  // ── Queries ──────────────────────────────────────────────────────────

  const { data: events = [], isLoading: eventsLoading } = trpc.agents.list.useQuery(
    { limit: 100 },
    { refetchInterval: 30000 }
  );

  const { data: metrics, isLoading: metricsLoading } = trpc.agents.metrics.useQuery(
    undefined,
    { refetchInterval: 30000 }
  );

  const { data: drafts = [] } = trpc.agents.listDrafts.useQuery(
    { limit: 100 },
    { refetchInterval: 30000 }
  );

  const { data: velocityMetrics } = trpc.agents.velocityMetrics.useQuery(
    undefined,
    { refetchInterval: 60000 }
  );

  // ── Invalidation helper ──────────────────────────────────────────────

  const invalidateAll = useCallback(() => {
    utils.agents.list.invalidate();
    utils.agents.metrics.invalidate();
    utils.agents.listDrafts.invalidate();
    utils.agents.velocityMetrics.invalidate();
  }, [utils]);

  // ── Mutations ────────────────────────────────────────────────────────

  const runAll = trpc.agents.runAll.useMutation({ onSuccess: invalidateAll });
  const runSingle = trpc.agents.runSingle.useMutation({ onSuccess: invalidateAll });
  const markReadMut = trpc.agents.markRead.useMutation({ onSuccess: invalidateAll });
  const markAllReadMut = trpc.agents.markAllRead.useMutation({ onSuccess: invalidateAll });
  const executeActionMut = trpc.agents.executeAction.useMutation({ onSuccess: invalidateAll });
  const sendDraftMut = trpc.agents.sendDraft.useMutation({ onSuccess: invalidateAll });
  const dismissDraftMut = trpc.agents.dismissDraft.useMutation({ onSuccess: invalidateAll });
  const restoreDraftMut = trpc.agents.restoreDraft.useMutation({ onSuccess: invalidateAll });
  const deleteDraftMut = trpc.agents.deleteDraft.useMutation({ onSuccess: invalidateAll });
  const bulkDeleteDraftsMut = trpc.agents.bulkDeleteDrafts.useMutation({ onSuccess: invalidateAll });

  // ── Computed values ──────────────────────────────────────────────────

  const pendingDraftCount = useMemo(
    () => (drafts as AgentDraft[]).filter(d => d.status === "pending").length,
    [drafts]
  );

  const unreadWithAction = useMemo(
    () => (events as AgentEvent[]).filter(e => !e.isRead && e.actionType),
    [events]
  );

  const criticalUnread = useMemo(
    () => (events as AgentEvent[]).filter(e => !e.isRead && e.severity === "critical").length,
    [events]
  );

  const warningUnread = useMemo(
    () => (events as AgentEvent[]).filter(e => !e.isRead && e.severity === "warning").length,
    [events]
  );

  // Compute per-agent statuses
  const agentStatuses = useMemo<AgentStatus[]>(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    return AGENT_KEYS.map(key => {
      const config = AGENT_CONFIG[key];
      const agentEvents = (events as AgentEvent[]).filter(
        e => resolveAgentKey(e.agentName) === key
      );
      const todayEvents = agentEvents.filter(
        e => new Date(e.createdAt) >= todayStart
      );
      const agentDrafts = (drafts as AgentDraft[]).filter(
        d => resolveAgentKey(d.createdByAgent) === key && new Date(d.createdAt) >= todayStart
      );

      const latest = agentEvents[0]; // Already sorted by createdAt desc

      return {
        key,
        label: config.label,
        eventsToday: todayEvents.length,
        draftsToday: agentDrafts.length,
        lastSignal: latest?.message ?? null,
        lastSeverity: latest?.severity ?? null,
        lastRunAt: latest ? new Date(latest.createdAt) : null,
        severityBreakdown: {
          critical: todayEvents.filter(e => e.severity === "critical").length,
          warning: todayEvents.filter(e => e.severity === "warning").length,
          info: todayEvents.filter(e => e.severity === "info").length,
        },
      };
    });
  }, [events, drafts]);

  // ── Context value ────────────────────────────────────────────────────

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
      executeAction: (eventId: number, actionType: string) =>
        executeActionMut.mutate({ eventId, actionType }),
      refetch: invalidateAll,

      drafts: drafts as AgentDraft[],
      pendingDraftCount,
      sendDraft: (draftId: number, editedBody?: string) =>
        sendDraftMut.mutate({ draftId, editedBody }),
      dismissDraft: (draftId: number) => dismissDraftMut.mutate({ draftId }),
      restoreDraft: (draftId: number) => restoreDraftMut.mutate({ draftId }),
      deleteDraft: (draftId: number) => deleteDraftMut.mutate({ draftId }),
      bulkDeleteDrafts: (draftIds: number[]) => bulkDeleteDraftsMut.mutate({ draftIds }),
      isSendingDraft: sendDraftMut.isPending,

      velocityMetrics: velocityMetrics as VelocityMetrics | undefined,

      agentStatuses,
      unreadWithAction,
      criticalUnread,
      warningUnread,
    }),
    [
      events, metrics, eventsLoading, metricsLoading,
      runAll, runSingle, markReadMut, markAllReadMut, executeActionMut,
      invalidateAll, drafts, pendingDraftCount,
      sendDraftMut, dismissDraftMut, restoreDraftMut, deleteDraftMut, bulkDeleteDraftsMut,
      velocityMetrics, agentStatuses, unreadWithAction,
      criticalUnread, warningUnread,
    ]
  );

  return <AgentContext.Provider value={value}>{children}</AgentContext.Provider>;
}

// ── Hook ────────────────────────────────────────────────────────────────

export function useAgents() {
  const ctx = useContext(AgentContext);
  if (!ctx) throw new Error("useAgents must be used within AgentProvider");
  return ctx;
}
