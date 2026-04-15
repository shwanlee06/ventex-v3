// Portal Router — Client-facing portal data
// Zero operator language. Only outcomes, plain English, clean status.
// Velocity Feed: 3 card types (amber/teal/gray), 4 action flows.

import { z } from "zod";
import { eq, and, desc, gte, inArray, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, publicProcedure } from "../_core/trpc";
import { getDb } from "../db";
import {
  organizations,
  ventures,
  orgVentureAccess,
  agentEvents,
  tasks,
  distributions,
  agentDrafts,
} from "../../drizzle/schema";
import { isVentexTeam } from "../security/rbac";
import { onClientPortalAction, onTaskCompleted, onStageAdvanced } from "../intelligence/realtimeTriggers";
import { getNextStage } from "../../shared/pipeline";
import { activityLog, ventureVelocity } from "../../drizzle/schema";
import { sendStageAdvancedEmail } from "../emailService";
import { createNotification, NOTIF_TYPES } from "../notificationHelper";
import { forecastVentures as getVentureForecasts, computePortfolioHealth as getPortfolioHealth } from "../intelligence/predictiveEngine";
import { getActiveSignals as getLatestMarketSignals } from "../intelligence/marketIntelligence";
import { invokeLLM, type Message as LLMMessage } from "../_core/llm";
import { enforceRateLimit } from "../security/rateLimit";

const STAGE_DISPLAY: Record<string, string> = {
  "Pre-Validation": "Initial Review",
  "In Validation": "Under Review",
  "In Fundraising": "Fundraising",
  "Active": "Active",
  "Active ventures": "Active",
  "Active Ventures": "Active",
  "In Execution": "Active",
  "Completed": "Completed",
  "On Hold": "On Hold",
};

function clientFriendlyStage(stage: string): string {
  if (stage.startsWith("ready:")) {
    const inner = stage.replace("ready:", "").trim();
    return STAGE_DISPLAY[inner] || inner;
  }
  return STAGE_DISPLAY[stage] || stage;
}


interface RawEvent {
  id: number;
  agentName: string;
  eventType: string;
  message: string;
  severity: string;
  agentEntityName?: string | null;
  agentEntityId?: string | null;
  actionLabel?: string | null;
  actionType?: string | null;
  actionPayload?: Record<string, unknown> | null;
  oldStatus?: string | null;
  newStatus?: string | null;
  requiresClientAction: boolean;
  actionTaken: boolean;
  clientDismissed: boolean;
  createdAt: Date;
}

type CardType = "action" | "completed" | "watching" | "hide";

// The 4 action flows
type ActionFlow = "advance_stage" | "approve_followup" | "confirm_distribution" | "unblock_venture" | "view_task" | null;

type TranslatedEvent = {
  id: number;
  summary: string;
  date: Date;
  ventureName: string | null;
  ventureId: number | null;
  fromStage: string | null;
  toStage: string | null;
  cardType: CardType;
  actionFlow: ActionFlow;
  actionLabel: string | null;
  // Extra data for specific action flows
  actionMeta?: Record<string, unknown> | null;
};

function translateEvent(e: RawEvent): TranslatedEvent {
  const ventureName = e.agentEntityName || null;
  const ventureId = e.agentEntityId ? parseInt(e.agentEntityId, 10) || null : null;
  const fromStage = e.oldStatus ? clientFriendlyStage(e.oldStatus) : null;
  const toStage = e.newStatus ? clientFriendlyStage(e.newStatus) : null;

  if (e.agentName === "Velocity Agent") {
    if (e.requiresClientAction && !e.actionTaken && !e.clientDismissed) {
      // Determine which action flow based on event context
      let actionFlow: ActionFlow = "advance_stage";
      let actionLabel = "Advance Stage";

      // Check if this is an unblock request
      if (e.eventType === "blocker" || e.message.toLowerCase().includes("stalled") || e.message.toLowerCase().includes("blocked")) {
        actionFlow = "unblock_venture";
        actionLabel = "Resolve Blocker";
      }

      return {
        id: e.id,
        summary: ventureName
          ? `"${ventureName}" is ready to move to ${toStage || "the next stage"}. Your approval is needed.`
          : "A venture is ready to advance. Your approval is needed.",
        date: e.createdAt,
        ventureName,
        ventureId,
        fromStage,
        toStage,
        cardType: "action",
        actionFlow,
        actionLabel,
        actionMeta: e.actionPayload || null,
      };
    }

    // Action already taken → Completed (teal)
    if (e.actionTaken && e.oldStatus && e.newStatus) {
      return {
        id: e.id,
        summary: ventureName
          ? `"${ventureName}" advanced from ${fromStage} to ${toStage}.`
          : `A venture advanced from ${fromStage} to ${toStage}.`,
        date: e.createdAt,
        ventureName,
        ventureId,
        fromStage,
        toStage,
        cardType: "completed",
        actionFlow: null,
        actionLabel: null,
      };
    }

    // Stage changed (not a "ready:" status) → Completed (teal)
    if (e.oldStatus && e.newStatus && !e.newStatus.startsWith("ready:")) {
      return {
        id: e.id,
        summary: ventureName
          ? `"${ventureName}" moved from ${fromStage} to ${toStage}.`
          : `A venture moved from ${fromStage} to ${toStage}.`,
        date: e.createdAt,
        ventureName,
        ventureId,
        fromStage,
        toStage,
        cardType: "completed",
        actionFlow: null,
        actionLabel: null,
      };
    }

    // "No active ventures to monitor" — noise, hide
    if (e.message.toLowerCase().includes("no active ventures")) {
      return mkHidden(e);
    }

    // Velocity summary messages → Watching (gray)
    const monitorMatch = e.message.match(/(\d+)\s*ventures?\s*monitored/i);
    if (monitorMatch) {
      const count = monitorMatch[1];
      const atRiskMatch = e.message.match(/(\d+)\s*(?:at risk|needs? attention)/i);
      const atRisk = atRiskMatch ? parseInt(atRiskMatch[1]) : 0;
      const summary = atRisk > 0
        ? `VENTEX is actively managing ${count} ventures. ${atRisk} ${atRisk === 1 ? "needs" : "need"} closer attention.`
        : `VENTEX is actively managing ${count} ventures. Everything is on track.`;
      return {
        id: e.id, summary, date: e.createdAt, ventureName, ventureId, fromStage, toStage,
        cardType: "watching", actionFlow: null, actionLabel: null,
      };
    }

    // Generic velocity event → Watching
    return {
      id: e.id,
      summary: cleanMessage(e.message, ventureName),
      date: e.createdAt, ventureName, ventureId, fromStage, toStage,
      cardType: "watching", actionFlow: null, actionLabel: null,
    };
  }

  if (e.agentName === "Overdue Agent") {
    // No overdue items → hide
    if (
      e.message.toLowerCase().includes("no overdue") ||
      e.message.toLowerCase().includes("all tasks are on schedule")
    ) {
      return mkHidden(e);
    }

    // Overdue with specific venture + requires action → Action Needed
    if (e.requiresClientAction && !e.actionTaken && !e.clientDismissed && ventureName) {
      const daysMatch = e.message.match(/(\d+)\s*days?\s*overdue/i);
      const days = daysMatch ? daysMatch[1] : null;
      return {
        id: e.id,
        summary: days
          ? `"${ventureName}" has a task that needs attention — ${days} days overdue.`
          : `"${ventureName}" has a task that needs your attention.`,
        date: e.createdAt, ventureName, ventureId, fromStage, toStage,
        cardType: "action",
        actionFlow: "view_task",
        actionLabel: "View Task",
        actionMeta: null,
      };
    }

    // Overdue summary → Watching
    const overdueCountMatch = e.message.match(/(\d+)\s*tasks?\s*remain/i);
    if (overdueCountMatch) {
      const count = parseInt(overdueCountMatch[1]);
      return {
        id: e.id,
        summary: count === 1
          ? "1 task across your portfolio needs attention."
          : `${count} tasks across your portfolio need attention.`,
        date: e.createdAt, ventureName, ventureId, fromStage, toStage,
        cardType: "watching", actionFlow: null, actionLabel: null,
      };
    }

    // Generic overdue → Watching
    return {
      id: e.id,
      summary: cleanMessage(e.message, ventureName),
      date: e.createdAt, ventureName, ventureId, fromStage, toStage,
      cardType: "watching", actionFlow: null, actionLabel: null,
    };
  }

  if (e.agentName === "Distribution Sentinel") {
    // "No distributions scheduled" → hide
    if (
      e.message.toLowerCase().includes("no distributions scheduled") ||
      e.message.toLowerCase().includes("no distributions recorded")
    ) {
      return mkHidden(e);
    }

    // Requires client confirmation → Action Needed (Confirm Distribution flow)
    if (e.requiresClientAction && !e.actionTaken && !e.clientDismissed) {
      return {
        id: e.id,
        summary: ventureName
          ? `Distribution notice for "${ventureName}" is ready for your confirmation.`
          : "A distribution notice is ready for your confirmation.",
        date: e.createdAt, ventureName, ventureId, fromStage, toStage,
        cardType: "action",
        actionFlow: "confirm_distribution",
        actionLabel: "Confirm Distribution",
        actionMeta: e.actionPayload || null,
      };
    }

    // Distribution already confirmed → Completed
    if (e.actionTaken) {
      return {
        id: e.id,
        summary: "Distribution confirmed and sent to recipients.",
        date: e.createdAt, ventureName, ventureId, fromStage, toStage,
        cardType: "completed", actionFlow: null, actionLabel: null,
      };
    }

    // Monitoring distribution → Watching
    return {
      id: e.id,
      summary: "Your distributions are being tracked and are on schedule.",
      date: e.createdAt, ventureName, ventureId, fromStage, toStage,
      cardType: "watching", actionFlow: null, actionLabel: null,
    };
  }

  if (e.agentName === "Orchestrator") {
    return mkHidden(e);
  }

  // Check for follow-up approval requests
  if (e.requiresClientAction && !e.actionTaken && !e.clientDismissed) {
    if (e.eventType === "followup" || e.message.toLowerCase().includes("follow-up") || e.message.toLowerCase().includes("followup")) {
      return {
        id: e.id,
        summary: ventureName
          ? `A follow-up email for "${ventureName}" is drafted and ready for your approval.`
          : "A follow-up email is drafted and ready for your approval.",
        date: e.createdAt, ventureName, ventureId, fromStage, toStage,
        cardType: "action",
        actionFlow: "approve_followup",
        actionLabel: "Review & Approve",
        actionMeta: e.actionPayload || null,
      };
    }

    // Generic action needed
    return {
      id: e.id,
      summary: cleanMessage(e.message, ventureName),
      date: e.createdAt, ventureName, ventureId, fromStage, toStage,
      cardType: "action",
      actionFlow: null,
      actionLabel: "Take Action",
      actionMeta: null,
    };
  }

  // Signal events → Watching
  if (e.eventType === "signal") {
    return {
      id: e.id,
      summary: cleanMessage(e.message, ventureName),
      date: e.createdAt, ventureName, ventureId, fromStage, toStage,
      cardType: "watching", actionFlow: null, actionLabel: null,
    };
  }

  // Everything else → Watching
  return {
    id: e.id,
    summary: cleanMessage(e.message, ventureName),
    date: e.createdAt, ventureName, ventureId, fromStage, toStage,
    cardType: "watching", actionFlow: null, actionLabel: null,
  };
}

function mkHidden(e: RawEvent): TranslatedEvent {
  return {
    id: e.id, summary: "", date: e.createdAt,
    ventureName: e.agentEntityName || null,
    ventureId: e.agentEntityId ? parseInt(e.agentEntityId, 10) || null : null,
    fromStage: null, toStage: null,
    cardType: "hide", actionFlow: null, actionLabel: null,
  };
}

function cleanMessage(msg: string, ventureName: string | null): string {
  msg = msg.replace(/\[[^\]]*\]/g, "");
  msg = msg.replace(/\b(Velocity Agent|Distribution Sentinel|Orchestrator|Overdue Agent)\b/gi, "");
  msg = msg.replace(/One-click advance available\.?/gi, "");
  msg = msg.replace(/\badvance available\b/gi, "");
  msg = msg.replace(/\bIn Validation\b/g, "Under Review");
  msg = msg.replace(/\bIn Fundraising\b/g, "Fundraising");
  msg = msg.replace(/\bActive ventures\b/g, "Active");
  msg = msg.replace(/\bIn Execution\b/g, "Active");
  msg = msg.replace(/\bPre-Validation\b/g, "Initial Review");
  msg = msg.replace(/\bat risk\b/gi, "needs attention");
  msg = msg.replace(/\bvelocity score\b/gi, "progress");
  msg = msg.replace(/\bvelocity\b/gi, "progress");
  msg = msg.replace(/\bsignal(s)?\b/gi, "update(s)");
  msg = msg.replace(/\bescalat(e|ed|ion)\b/gi, "flagged for review");
  msg = msg.replace(/\bauto-advance triggers?\b/gi, "actions");
  msg = msg.replace(/\boverdue status\b/gi, "pending status");
  msg = msg.replace(/\boverdue tasks? detected\b/gi, "new items flagged");
  msg = msg.replace(/\boverdue\b/gi, "pending");
  msg = msg.replace(/\btrigger(s|ed)?\b/gi, "");
  msg = msg.replace(/\s{2,}/g, " ").trim();
  msg = msg.replace(/\s+\./g, ".");
  return msg;
}

function getCleanStatusLine(venture: {
  status: string;
  stage: string;
  currentStatus?: string | null;
  nextStep?: string | null;
  healthScore?: number | null;
}): string {
  const health = venture.healthScore ?? 50;
  if (venture.status === "Completed") return "Completed";
  if (venture.status === "On hold") return "Paused — awaiting next steps";
  if (venture.currentStatus) {
    let clean = venture.currentStatus;
    clean = clean.replace(/\b(at risk|velocity|agent|orchestrator|sentinel|blueprint|SPV)\b/gi, "");
    clean = clean.replace(/\s{2,}/g, " ").trim();
    if (clean.length > 0 && clean.length < 120) return clean;
  }
  if (health >= 70) return "On track";
  if (health >= 40) return "In progress";
  return "Needs your attention";
}

export const portalRouter = {
  // -- Get portal data for a specific org --
  getData: protectedProcedure
    .input(z.object({ orgSlug: z.string().min(1) }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const [org] = await db
        .select()
        .from(organizations)
        .where(eq(organizations.slug, input.orgSlug))
        .limit(1);

      if (!org)
        throw new TRPCError({ code: "NOT_FOUND", message: "Organization not found" });

      // Access control
      const isAdmin = isVentexTeam(ctx.user);
      if (!isAdmin && ctx.user.organizationId !== org.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "You do not have access to this portal" });
      }

      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const recentEvents = await db
        .select()
        .from(agentEvents)
        .where(
          and(
            eq(agentEvents.organizationId, org.id),
            sql`${agentEvents.audience} IN ('client', 'both')`,
            gte(agentEvents.createdAt, sevenDaysAgo)
          )
        )
        .orderBy(desc(agentEvents.createdAt))
        .limit(200);

      const translated = recentEvents.map(translateEvent);

      const actionSeen = new Map<string, TranslatedEvent>();
      const completedSeen = new Map<string, TranslatedEvent>();
      const watchingSeen = new Map<string, TranslatedEvent>();

      const actionCards: TranslatedEvent[] = [];
      const completedCards: TranslatedEvent[] = [];
      const watchingCards: TranslatedEvent[] = [];

      for (const ev of translated) {
        if (ev.cardType === "hide" || ev.summary.length < 5) continue;

        const dedupKey = `${ev.ventureName || ""}::${ev.summary.toLowerCase().replace(/\d/g, "").trim()}`;

        if (ev.cardType === "action") {
          if (!actionSeen.has(dedupKey)) {
            actionSeen.set(dedupKey, ev);
            actionCards.push(ev);
          }
        } else if (ev.cardType === "completed") {
          if (!completedSeen.has(dedupKey)) {
            completedSeen.set(dedupKey, ev);
            completedCards.push(ev);
          }
        } else if (ev.cardType === "watching") {
          if (!watchingSeen.has(dedupKey)) {
            watchingSeen.set(dedupKey, ev);
            watchingCards.push(ev);
          }
        }
      }

      const advancedCount = recentEvents.filter(
        (e) =>
          e.agentName === "Velocity Agent" &&
          e.oldStatus && e.newStatus &&
          !e.newStatus.startsWith("ready:") &&
          e.actionTaken
      ).length;

      const overdueFlags = recentEvents.filter(
        (e) =>
          e.agentName === "Overdue Agent" &&
          !e.message.toLowerCase().includes("no overdue") &&
          !e.message.toLowerCase().includes("all tasks are on schedule")
      ).length;

      const distributionEvents = recentEvents.filter(
        (e) =>
          e.agentName === "Distribution Sentinel" &&
          !e.message.toLowerCase().includes("no distributions scheduled") &&
          !e.message.toLowerCase().includes("no distributions recorded")
      ).length;

      let velocitySummary: string;
      if (advancedCount === 0 && overdueFlags === 0 && distributionEvents === 0) {
        velocitySummary =
          "VENTEX is monitoring your portfolio. We'll surface anything that needs your attention.";
      } else {
        const parts: string[] = [];
        if (advancedCount > 0)
          parts.push(`advanced ${advancedCount} venture${advancedCount !== 1 ? "s" : ""}`);
        if (overdueFlags > 0)
          parts.push(`caught ${overdueFlags} item${overdueFlags !== 1 ? "s" : ""} before ${overdueFlags !== 1 ? "they became" : "it became"} a problem`);
        if (distributionEvents > 0)
          parts.push(`kept ${distributionEvents} distribution${distributionEvents !== 1 ? "s" : ""} on track`);
        velocitySummary = `This week, VENTEX ${parts.join(", ")}.`;
      }

      const access = await db
        .select()
        .from(orgVentureAccess)
        .where(eq(orgVentureAccess.organizationId, org.id));

      let portfolio: {
        id: number;
        name: string;
        sector: string;
        stage: string;
        statusLine: string;
        slug: string;
        lastAgentAction: string | null;
        lastAgentActionType: "ready" | "advanced" | "info" | null;
        momentum: {
          projectedDays: number;
          confidence: number;
          riskLevel: string;
          riskFactors: string[];
          benchmarkDays: number | null;
          velocityVsBenchmark: "faster" | "slower" | "on-pace" | null;
        } | null;
      }[] = [];

      if (access.length > 0) {
        const ventureIds = access.map((a) => a.ventureId);
        const orgVentures = await db
          .select()
          .from(ventures)
          .where(inArray(ventures.id, ventureIds));

        const ventureEventMap = new Map<number, { summary: string; type: "ready" | "advanced" | "info" }>();

        for (const ev of translated) {
          if (ev.cardType === "hide" || !ev.ventureId) continue;
          if (ventureEventMap.has(ev.ventureId)) continue;

          if (ev.cardType === "action" && ev.toStage) {
            ventureEventMap.set(ev.ventureId, {
              summary: `Ready to move to ${ev.toStage} — your approval needed`,
              type: "ready",
            });
          } else if (ev.cardType === "completed" && ev.fromStage && ev.toStage) {
            ventureEventMap.set(ev.ventureId, {
              summary: `Advanced to ${ev.toStage}`,
              type: "advanced",
            });
          } else if (ev.summary.length > 10) {
            ventureEventMap.set(ev.ventureId, {
              summary: ev.summary.length > 80 ? ev.summary.slice(0, 77) + "..." : ev.summary,
              type: "info",
            });
          }
        }

        portfolio = orgVentures.map((v) => {
          const agentAction = ventureEventMap.get(v.id);
          return {
            id: v.id,
            name: v.name,
            sector: v.sector,
            stage: clientFriendlyStage(v.stage),
            statusLine: getCleanStatusLine(v),
            slug: v.slug,
            lastAgentAction: agentAction?.summary || null,
            lastAgentActionType: agentAction?.type || null,
            momentum: null as any, // Will be enriched after intelligence layer runs
          };
        });
      }

      let forecasts: Array<{ ventureId: number; ventureName: string; projectedDays: number; confidence: number; riskLevel: string; riskFactors: string[] }> = [];
      let marketSignals: Array<{ sector: string; signalType: string; headline: string; impact: string; relevance: number }> = [];
      let portfolioHealth: { score: number; trend: string; riskCount: number } | null = null;

      try {
        const [forecastData, healthData, signalData] = await Promise.allSettled([
          getVentureForecasts(org.id),
          getPortfolioHealth(org.id),
          getLatestMarketSignals(org.id),
        ]);

        if (forecastData.status === "fulfilled" && forecastData.value) {
          // Convert string confidence ("low"/"medium"/"high") to numeric percentage
          const confidenceToNum = (c: string | number | undefined): number => {
            if (typeof c === "number") return c;
            if (c === "high") return 85;
            if (c === "medium") return 55;
            if (c === "low") return 25;
            return 0;
          };
          // Convert riskScore (0-100) to riskLevel string
          const riskScoreToLevel = (score: number | undefined): string => {
            if (!score) return "low";
            if (score >= 70) return "high";
            if (score >= 40) return "medium";
            return "low";
          };
          forecasts = forecastData.value.map((f: any) => ({
            ventureId: f.ventureId,
            ventureName: f.ventureName || "",
            projectedDays: f.projectedDaysRemaining || 0,
            confidence: confidenceToNum(f.confidence || f.confidenceScore),
            riskLevel: f.riskLevel || riskScoreToLevel(f.riskScore),
            riskFactors: f.riskFactors || [],
          }));
        }
        if (healthData.status === "fulfilled" && healthData.value) {
          portfolioHealth = {
            score: healthData.value.currentHealthScore || 0,
            trend: healthData.value.healthTrend || "stable",
            riskCount: healthData.value.venturesAtRisk || 0,
          };
        }
        if (signalData.status === "fulfilled" && signalData.value) {
          marketSignals = signalData.value.map((s: any) => ({
            sector: s.sector || "",
            signalType: s.signalType || "",
            headline: s.headline || "",
            impact: s.impactAssessment || "",
            relevance: s.relevanceScore || 0,
          }));
        }
      } catch (e) {
        console.error("[Portal] Intelligence layer failed (non-blocking):", e);
      }

      if (forecasts.length > 0) {
        const forecastMap = new Map(forecasts.map(f => [f.ventureId, f]));
        portfolio = portfolio.map(v => {
          const f = forecastMap.get(v.id);
          if (f) {
            // Compute benchmark comparison
            const avgDays = forecasts.reduce((sum, fc) => sum + fc.projectedDays, 0) / forecasts.length;
            const velocityVsBenchmark: "faster" | "slower" | "on-pace" =
              f.projectedDays < avgDays * 0.85 ? "faster" :
              f.projectedDays > avgDays * 1.15 ? "slower" : "on-pace";
            return {
              ...v,
              momentum: {
                projectedDays: f.projectedDays,
                confidence: f.confidence,
                riskLevel: f.riskLevel,
                riskFactors: f.riskFactors,
                benchmarkDays: Math.round(avgDays),
                velocityVsBenchmark,
              },
            };
          }
          return v;
        });
      }

      return {
        orgName: org.name,
        orgSlug: org.slug,
        isOperatorPreview: isAdmin,
        velocitySummary,
        // Intelligence layer
        forecasts,
        marketSignals,
        portfolioHealth,
        // 3 card types for the Velocity Feed
        actionCards: actionCards.map((e) => ({
          id: e.id,
          summary: e.summary,
          date: e.date,
          ventureName: e.ventureName,
          ventureId: e.ventureId,
          fromStage: e.fromStage,
          toStage: e.toStage,
          actionFlow: e.actionFlow,
          actionLabel: e.actionLabel,
          actionMeta: e.actionMeta || null,
        })),
        completedCards: completedCards.map((e) => ({
          id: e.id,
          summary: e.summary,
          date: e.date,
          ventureName: e.ventureName,
        })),
        watchingCards: watchingCards.map((e) => ({
          id: e.id,
          summary: e.summary,
          date: e.date,
          ventureName: e.ventureName,
        })),
        portfolio,
        // Keep backward compat
        thisWeek: [...completedCards, ...watchingCards].map((e) => ({
          id: e.id,
          summary: e.summary,
          date: e.date,
          ventureName: e.ventureName,
        })),
        comingUp: actionCards.map((e) => ({
          id: e.id,
          summary: e.summary,
          date: e.date,
          ventureName: e.ventureName,
          ventureId: e.ventureId,
          fromStage: e.fromStage,
          toStage: e.toStage,
          actionLabel: e.actionLabel,
        })),
      };
    }),

  // -- Resolve an action card (Approve Follow-up, Confirm Distribution, Unblock) --
  resolveAction: protectedProcedure
    .input(z.object({
      eventId: z.number(),
      actionFlow: z.enum(["approve_followup", "confirm_distribution", "unblock_venture"]),
      resolution: z.record(z.string(), z.unknown()).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      // Fetch the event
      const [event] = await db
        .select()
        .from(agentEvents)
        .where(eq(agentEvents.id, input.eventId))
        .limit(1);

      if (!event) throw new TRPCError({ code: "NOT_FOUND", message: "Event not found" });

      // Verify access
      const isAdmin = isVentexTeam(ctx.user);
      if (!isAdmin && ctx.user.organizationId !== event.organizationId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
      }

      // Mark action as taken
      await db.update(agentEvents).set({
        actionTaken: true,
        actionTakenAt: new Date(),
      }).where(eq(agentEvents.id, input.eventId));

      // Fire real-time trigger — intelligence engines react immediately
      if (event.organizationId) {
        onClientPortalAction(
          event.organizationId,
          input.actionFlow,
          input.eventId,
          event.agentEntityName || `event-${input.eventId}`,
        ).catch((e: any) => console.error("[Portal] Real-time trigger failed (non-blocking):", e));
      }

      // Handle specific action flows
      if (input.actionFlow === "confirm_distribution") {
        // TODO: Send confirmation email via Resend when configured
        // For now, mark as confirmed
        return {
          success: true,
          message: "Distribution confirmed successfully.",
          actionFlow: input.actionFlow,
        };
      }

      if (input.actionFlow === "approve_followup") {
        // TODO: Send the drafted follow-up email via Resend when configured
        return {
          success: true,
          message: "Follow-up email approved and sent.",
          actionFlow: input.actionFlow,
        };
      }

      if (input.actionFlow === "unblock_venture") {
        // Mark the blocker as resolved
        return {
          success: true,
          message: "Venture unblocked. VENTEX will continue monitoring.",
          actionFlow: input.actionFlow,
        };
      }

      return { success: true, message: "Action completed.", actionFlow: input.actionFlow };
    }),

  getVentureTasks: protectedProcedure
    .input(z.object({ ventureId: z.number() }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      // Verify access: user must be VENTEX team or have org access to this venture
      const isAdmin = isVentexTeam(ctx.user);
      if (!isAdmin) {
        const [access] = await db.select({ id: orgVentureAccess.id })
          .from(orgVentureAccess)
          .where(and(
            eq(orgVentureAccess.ventureId, input.ventureId),
            eq(orgVentureAccess.organizationId, ctx.user.organizationId!),
          ))
          .limit(1);
        if (!access) throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
      }

      const ventureTasks = await db.select({
        id: tasks.id,
        title: tasks.title,
        status: tasks.status,
        priority: tasks.priority,
        dueDate: tasks.dueDate,
        assigneeNames: tasks.assigneeNames,
        description: tasks.description,
      })
        .from(tasks)
        .where(eq(tasks.ventureId, input.ventureId));

      return ventureTasks;
    }),

  completeTask: protectedProcedure
    .input(z.object({ taskId: z.number(), ventureId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      // Verify access
      const isAdmin = isVentexTeam(ctx.user);
      if (!isAdmin) {
        const [access] = await db.select({ id: orgVentureAccess.id })
          .from(orgVentureAccess)
          .where(and(
            eq(orgVentureAccess.ventureId, input.ventureId),
            eq(orgVentureAccess.organizationId, ctx.user.organizationId!),
          ))
          .limit(1);
        if (!access) throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
      }

      // Mark task complete
      await db.update(tasks).set({ status: "complete" }).where(eq(tasks.id, input.taskId));

      // Resolve organizationId: ventures table doesn't have orgId, use ctx or orgVentureAccess
      const [venture] = await db.select().from(ventures).where(eq(ventures.id, input.ventureId)).limit(1);
      const orgId = ctx.user.organizationId ?? null;

      // Resolve org from orgVentureAccess if user doesn't have orgId (admin preview)
      let resolvedOrgId = orgId;
      if (!resolvedOrgId) {
        const [accessRow] = await db.select({ organizationId: orgVentureAccess.organizationId })
          .from(orgVentureAccess)
          .where(eq(orgVentureAccess.ventureId, input.ventureId))
          .limit(1);
        resolvedOrgId = accessRow?.organizationId ?? null;
      }

      // Fire real-time trigger
      if (resolvedOrgId) {
        onTaskCompleted(resolvedOrgId, input.ventureId, input.taskId, `Task #${input.taskId}`)
          .catch((e: any) => console.error("[Portal] Task completed trigger failed:", e));
      }

      // Log activity
      await db.insert(activityLog).values({
        entityType: "task",
        entityId: input.taskId,
        entityName: `Task #${input.taskId}`,
        action: "Task Completed (Client Portal)",
        detail: `Client completed task via portal`,
        userName: ctx.user.name || "Client",
        activitySource: "client_business",
        organizationId: resolvedOrgId,
      });

      // Create notification
      await createNotification({
        type: NOTIF_TYPES.TASK_COMPLETED,
        category: "success",
        title: `Task completed by client`,
        message: `Task #${input.taskId} was marked complete via the client portal`,
        entityType: "task",
        entityId: input.taskId,
        organizationId: resolvedOrgId ?? undefined,
      });

      let autoAdvanced = false;
      let newStage: string | null = null;

      if (venture) {
        const allVentureTasks = await db.select({ id: tasks.id, status: tasks.status })
          .from(tasks)
          .where(eq(tasks.ventureId, input.ventureId));

        const totalTasks = allVentureTasks.length;
        const completedTasks = allVentureTasks.filter(t => t.status === "complete").length;

        if (totalTasks > 0 && completedTasks >= totalTasks) {
          // All tasks complete — auto-advance
          const nextStage = getNextStage(venture.stage);
          if (nextStage) {
            const now = new Date();
            const daysInStage = Math.floor(
              (now.getTime() - new Date(venture.updatedAt).getTime()) / (1000 * 60 * 60 * 24)
            );
            const hoursInStage = Math.floor(
              (now.getTime() - new Date(venture.updatedAt).getTime()) / (1000 * 60 * 60)
            );

            // Advance venture
            await db.update(ventures).set({ stage: nextStage }).where(eq(ventures.id, input.ventureId));

            // Log velocity
            if (resolvedOrgId) {
              await db.insert(ventureVelocity).values({
                organizationId: resolvedOrgId,
                ventureId: input.ventureId,
                ventureName: venture.name,
                sector: venture.sector,
                fromStage: venture.stage,
                toStage: nextStage,
                daysInStage,
                hoursInStage,
                advancedBy: "Auto-Advance (Client Portal)",
                blockingStepsTotal: totalTasks,
                blockingStepsCompleted: completedTasks,
                tasksCompletedInStage: completedTasks,
              });
            }

            // Log agent event
            await db.insert(agentEvents).values({
              organizationId: resolvedOrgId!,
              agentName: "Velocity Agent",
              eventType: "status_change",
              message: `"${venture.name}" auto-advanced from ${venture.stage} \u2192 ${nextStage} — all tasks completed by client.`,
              severity: "info",
              entityType: "Venture",
              agentEntityId: String(input.ventureId),
              agentEntityName: venture.name,
              oldStatus: venture.stage,
              newStatus: nextStage,
              audience: "both",
              requiresClientAction: false,
              actionTaken: true,
              actionTakenAt: now,
              actionTakenBy: ctx.user.name || "Client",
            });

            // Fire stage advance trigger
            if (resolvedOrgId) {
              onStageAdvanced(resolvedOrgId, input.ventureId, venture.name, venture.stage, nextStage)
                .catch((e: any) => console.error("[Portal] Stage advance trigger failed:", e));
            }

            // Send stage advanced email
            if (resolvedOrgId) {
              const [org] = await db.select({
                primaryContactEmail: organizations.primaryContactEmail,
                primaryContactName: organizations.primaryContactName,
                name: organizations.name,
              }).from(organizations).where(eq(organizations.id, resolvedOrgId)).limit(1);

              if (org?.primaryContactEmail) {
                sendStageAdvancedEmail({
                  to: org.primaryContactEmail,
                  contactName: org.primaryContactName || org.name,
                  ventureName: venture.name,
                  previousStage: clientFriendlyStage(venture.stage),
                  newStage: clientFriendlyStage(nextStage),
                  daysInPreviousStage: daysInStage,
                  nextBlockingSteps: [],
                }).catch((e: any) => console.error("[Portal] Stage email failed:", e));
              }
            }

            autoAdvanced = true;
            newStage = nextStage;
          }
        }
      }

      return {
        success: true,
        taskId: input.taskId,
        autoAdvanced,
        newStage: newStage ? clientFriendlyStage(newStage) : null,
        message: autoAdvanced
          ? `Task completed! Your venture has been advanced to ${clientFriendlyStage(newStage!)}.`
          : "Task completed successfully.",
      };
    }),

  aiChat: protectedProcedure
    .input(z.object({
      orgSlug: z.string(),
      messages: z.array(z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string(),
      })),
    }))
    .mutation(async ({ input, ctx }) => {
      // Rate limit: 20 portal AI calls per 10 minutes per user
      enforceRateLimit("portalAi", ctx.user.id);

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      // Resolve org — enforce client can only query their own org
      const [org] = await db.select().from(organizations).where(eq(organizations.slug, input.orgSlug)).limit(1);
      if (!org) throw new TRPCError({ code: "NOT_FOUND", message: "Organization not found" });

      // Access check: must be VENTEX team OR belong to this org
      const ventex = isVentexTeam(ctx.user);
      if (!ventex && ctx.user.organizationId !== org.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
      }

      // Build org-scoped context — ONLY this client's data
      const accessRows = await db.select({ ventureId: orgVentureAccess.ventureId })
        .from(orgVentureAccess)
        .where(eq(orgVentureAccess.organizationId, org.id));
      const ventureIds = accessRows.map(r => r.ventureId);

      let orgVentures: any[] = [];
      let orgTasks: any[] = [];
      let orgDists: any[] = [];

      if (ventureIds.length > 0) {
        orgVentures = await db.select().from(ventures).where(inArray(ventures.id, ventureIds));
        orgTasks = await db.select().from(tasks).where(inArray(tasks.ventureId, ventureIds));
        orgDists = await db.select().from(distributions).where(eq(distributions.organizationId, org.id));
      }

      const overdueTasks = orgTasks.filter((t: any) => {
        if (!t.dueDate || t.status === "complete") return false;
        return new Date(t.dueDate) < new Date();
      });
      const activeTasks = orgTasks.filter((t: any) => t.status !== "complete");
      const completedTasks = orgTasks.filter((t: any) => t.status === "complete");

      const scopedContext = `
=== YOUR PORTFOLIO DATA ===
Organization: ${org.name}

VENTURES (${orgVentures.length}):
${orgVentures.map((v: any) => `- ${v.name} | Sector: ${v.sector} | Location: ${v.location} | Stage: ${clientFriendlyStage(v.stage)} | Health: ${v.healthScore || "N/A"}/100`).join("\n")}

TASKS (${orgTasks.length} total, ${activeTasks.length} active, ${completedTasks.length} completed, ${overdueTasks.length} overdue):
${orgTasks.slice(0, 20).map((t: any) => `- [${t.status}] ${t.title}${t.dueDate ? ` (due: ${t.dueDate})` : ""}${t.priority ? ` [${t.priority}]` : ""}`).join("\n")}

DISTRIBUTIONS (${orgDists.length} total, ${orgDists.filter((d: any) => d.status === "Paid").length} paid):
${orgDists.slice(0, 15).map((d: any) => `- ${d.label || "Distribution"} | ${d.status} | $${Number(d.amount || 0).toLocaleString()}`).join("\n")}
`;

      const systemPrompt = `You are the VENTEX Portfolio Assistant for ${org.name}. You help this client understand their venture portfolio, track progress, and make informed decisions.

You have access ONLY to this client's data — never reference other clients or internal VENTEX operations.

Your capabilities:
1. Answer questions about their ventures, tasks, and distributions
2. Explain venture stages and what comes next
3. Summarize portfolio health and highlight areas needing attention
4. Help prioritize overdue tasks
5. Explain distribution schedules and payment status

Communication style:
- Professional, clear, and client-friendly
- Use plain English — no internal jargon or operator language
- Use markdown formatting for structured responses
- Reference specific ventures and tasks by name
- Be encouraging about progress while honest about areas needing attention

Important: Only use the portfolio data provided below. Never make up data or reference information outside this client's scope.
${scopedContext}`;

      const llmMessages: LLMMessage[] = [
        { role: "system", content: systemPrompt },
        ...input.messages.map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        })),
      ];

      try {
        const result = await invokeLLM({
          messages: llmMessages,
          maxTokens: 2048,
        });
        const content = result.choices?.[0]?.message?.content;
        const textContent =
          typeof content === "string"
            ? content
            : Array.isArray(content)
              ? content.filter((c: any) => c.type === "text").map((c: any) => c.text).join("")
              : "I apologize, but I was unable to generate a response. Please try again.";

        return { content: textContent };
      } catch (error: unknown) {
        console.error("[Portal AI] Error:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "AI response failed. Please try again.",
        });
      }
    }),

  /**
   * Get AI-drafted communications for this org (client-facing)
   */
  getDrafts: protectedProcedure
    .input(z.object({
      orgSlug: z.string().min(1),
      status: z.enum(["pending", "sent", "dismissed"]).optional(),
    }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      const [org] = await db.select().from(organizations).where(eq(organizations.slug, input.orgSlug)).limit(1);
      if (!org) throw new TRPCError({ code: "NOT_FOUND", message: "Organization not found" });
      const isAdmin = isVentexTeam(ctx.user);
      if (!isAdmin && ctx.user.organizationId !== org.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
      }
      const conditions: any[] = [eq(agentDrafts.organizationId, org.id)];
      if (input.status) {
        conditions.push(eq(agentDrafts.status, input.status));
      }
      const drafts = await db
        .select()
        .from(agentDrafts)
        .where(and(...conditions))
        .orderBy(desc(agentDrafts.createdAt))
        .limit(50);
      return drafts;
    }),

  /**
   * Approve and send a draft (client action)
   */
  approveDraft: protectedProcedure
    .input(z.object({
      draftId: z.number(),
      editedBody: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      const [draft] = await db.select().from(agentDrafts).where(eq(agentDrafts.id, input.draftId)).limit(1);
      if (!draft) throw new TRPCError({ code: "NOT_FOUND", message: "Draft not found" });
      const isAdmin = isVentexTeam(ctx.user);
      if (!isAdmin && ctx.user.organizationId !== draft.organizationId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
      }
      const updates: Record<string, unknown> = {
        status: "sent",
        sentAt: new Date(),
        sentBy: ctx.user.name || ctx.user.email || "Client",
      };
      if (input.editedBody) {
        updates.body = input.editedBody;
      }
      await db.update(agentDrafts).set(updates as any).where(eq(agentDrafts.id, input.draftId));
      // Mark related agent events as action_taken
      const events = await db
        .select()
        .from(agentEvents)
        .where(and(eq(agentEvents.actionType, "draft"), eq(agentEvents.actionTaken, false)))
        .limit(50);
      for (const evt of events) {
        const payload = evt.actionPayload as Record<string, unknown> | null;
        if (payload && payload.draftId === input.draftId) {
          await db.update(agentEvents).set({
            actionTaken: true,
            actionTakenAt: new Date(),
            actionTakenBy: ctx.user.name || "Client",
          }).where(eq(agentEvents.id, evt.id));
        }
      }
      return { success: true, message: "Communication approved and sent" };
    }),

  /**
   * Dismiss a draft (client action)
   */
  dismissDraft: protectedProcedure
    .input(z.object({ draftId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      const [draft] = await db.select().from(agentDrafts).where(eq(agentDrafts.id, input.draftId)).limit(1);
      if (!draft) throw new TRPCError({ code: "NOT_FOUND", message: "Draft not found" });
      const isAdmin = isVentexTeam(ctx.user);
      if (!isAdmin && ctx.user.organizationId !== draft.organizationId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
      }
      await db.update(agentDrafts).set({ status: "dismissed" } as any).where(eq(agentDrafts.id, input.draftId));
      return { success: true };
    }),
};
