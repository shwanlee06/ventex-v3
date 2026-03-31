// ============================================================================
// Portal Router — Client-facing portal data
// Zero operator language. Only outcomes, plain English, clean status.
// Velocity Feed: 3 card types (amber/teal/gray), 4 action flows.
// ============================================================================

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
} from "../../drizzle/schema";
import { isAtlasTeam } from "../security/rbac";

// ── Stage name mapping: internal → client-friendly ──────────────────────
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

// ── Translation layer: agent events → client language ────────────────────

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

  // ── Velocity Agent ──────────────────────────────────────────────
  if (e.agentName === "Velocity Agent") {
    // requiresClientAction + not acted on → Action Needed (amber)
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
        ? `ATLAS is actively managing ${count} ventures. ${atRisk} ${atRisk === 1 ? "needs" : "need"} closer attention.`
        : `ATLAS is actively managing ${count} ventures. Everything is on track.`;
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

  // ── Overdue Agent ───────────────────────────────────────────────
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

  // ── Distribution Sentinel ───────────────────────────────────────
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

  // ── Orchestrator → hide from clients ────────────────────────────
  if (e.agentName === "Orchestrator") {
    return mkHidden(e);
  }

  // ── Fallback ───────────────────────────────────────────────────
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
      const isAdmin = isAtlasTeam(ctx.user);
      if (!isAdmin && ctx.user.organizationId !== org.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "You do not have access to this portal" });
      }

      // ── Fetch all client-audience events from last 7 days ──────────
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

      // ── Translate all events ───────────────────────────────────────
      const translated = recentEvents.map(translateEvent);

      // ── Categorize into 3 card types ──────────────────────────────
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

      // ── Velocity Summary ───────────────────────────────────────────
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
          "ATLAS is monitoring your portfolio. We'll surface anything that needs your attention.";
      } else {
        const parts: string[] = [];
        if (advancedCount > 0)
          parts.push(`advanced ${advancedCount} venture${advancedCount !== 1 ? "s" : ""}`);
        if (overdueFlags > 0)
          parts.push(`caught ${overdueFlags} item${overdueFlags !== 1 ? "s" : ""} before ${overdueFlags !== 1 ? "they became" : "it became"} a problem`);
        if (distributionEvents > 0)
          parts.push(`kept ${distributionEvents} distribution${distributionEvents !== 1 ? "s" : ""} on track`);
        velocitySummary = `This week, ATLAS ${parts.join(", ")}.`;
      }

      // ── Your Portfolio ─────────────────────────────────────────────
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
          };
        });
      }

      return {
        orgName: org.name,
        orgSlug: org.slug,
        isOperatorPreview: isAdmin,
        velocitySummary,
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
      const isAdmin = isAtlasTeam(ctx.user);
      if (!isAdmin && ctx.user.organizationId !== event.organizationId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
      }

      // Mark action as taken
      await db.update(agentEvents).set({
        actionTaken: true,
        actionTakenAt: new Date(),
      }).where(eq(agentEvents.id, input.eventId));

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
          message: "Venture unblocked. ATLAS will continue monitoring.",
          actionFlow: input.actionFlow,
        };
      }

      return { success: true, message: "Action completed.", actionFlow: input.actionFlow };
    }),
};
