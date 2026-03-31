// ============================================================================
// Portal Router — Client-facing portal data
// Zero operator language. Only outcomes, plain English, clean status.
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
} from "../../drizzle/schema";
import { isAtlasTeam } from "../security/rbac";

// ── Stage name mapping: internal → client-friendly ──────────────────────
const STAGE_DISPLAY: Record<string, string> = {
  "Pre-Validation": "Initial Review",
  "In Validation": "Under Review",
  "In Fundraising": "Fundraising",
  "Active": "Active",
  "Active ventures": "Active",
  "In Execution": "Active",
  "Completed": "Completed",
  "On Hold": "On Hold",
};

function clientFriendlyStage(stage: string): string {
  // Handle "ready:StageName" format from newStatus
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

type TranslatedEvent = {
  id: number;
  summary: string;
  date: Date;
  ventureName: string | null;
  ventureId: number | null;
  fromStage: string | null;
  toStage: string | null;
  requiresAction: boolean;
  actionLabel: string | null;
  section: "thisWeek" | "comingUp" | "hide";
};

function translateEvent(e: RawEvent): TranslatedEvent {
  const ventureName = e.agentEntityName || null;
  const ventureId = e.agentEntityId ? parseInt(e.agentEntityId, 10) || null : null;
  const fromStage = e.oldStatus ? clientFriendlyStage(e.oldStatus) : null;
  const toStage = e.newStatus ? clientFriendlyStage(e.newStatus) : null;

  // ── Velocity Agent ──────────────────────────────────────────────
  if (e.agentName === "Velocity Agent") {
    // requiresClientAction = true → "Ready to advance" → goes to Coming Up
    if (e.requiresClientAction && !e.actionTaken && !e.clientDismissed) {
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
        requiresAction: true,
        actionLabel: "Advance Stage",
        section: "comingUp",
      };
    }

    // Stage actually changed (not a "ready:" status) → This Week
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
        requiresAction: false,
        actionLabel: null,
        section: "thisWeek",
      };
    }

    // "No active ventures to monitor" — noise, hide
    if (e.message.toLowerCase().includes("no active ventures")) {
      return { id: e.id, summary: "", date: e.createdAt, ventureName, ventureId, fromStage, toStage, requiresAction: false, actionLabel: null, section: "hide" };
    }

    // Velocity summary messages ("X ventures monitored...") → rewrite to client language
    const monitorMatch = e.message.match(/(\d+)\s*ventures?\s*monitored/i);
    if (monitorMatch) {
      const count = monitorMatch[1];
      const atRiskMatch = e.message.match(/(\d+)\s*(?:at risk|needs? attention)/i);
      const atRisk = atRiskMatch ? parseInt(atRiskMatch[1]) : 0;
      const summary = atRisk > 0
        ? `ATLAS is actively managing ${count} ventures. ${atRisk} ${atRisk === 1 ? "needs" : "need"} closer attention.`
        : `ATLAS is actively managing ${count} ventures. Everything is on track.`;
      return {
        id: e.id,
        summary,
        date: e.createdAt,
        ventureName,
        ventureId,
        fromStage,
        toStage,
        requiresAction: false,
        actionLabel: null,
        section: "thisWeek",
      };
    }

    // Generic velocity event — show in This Week with cleaned message
    return {
      id: e.id,
      summary: cleanMessage(e.message, ventureName),
      date: e.createdAt,
      ventureName,
      ventureId,
      fromStage,
      toStage,
      requiresAction: false,
      actionLabel: null,
      section: "thisWeek",
    };
  }

  // ── Overdue Agent ───────────────────────────────────────────────
  if (e.agentName === "Overdue Agent") {
    // No overdue items → hide entirely (noise)
    if (
      e.message.toLowerCase().includes("no overdue") ||
      e.message.toLowerCase().includes("all tasks are on schedule")
    ) {
      return { id: e.id, summary: "", date: e.createdAt, ventureName, ventureId, fromStage, toStage, requiresAction: false, actionLabel: null, section: "hide" };
    }

    // Overdue summary messages ("X tasks remain in overdue status") → rewrite
    const overdueCountMatch = e.message.match(/(\d+)\s*tasks?\s*remain/i);
    if (overdueCountMatch) {
      const count = parseInt(overdueCountMatch[1]);
      return {
        id: e.id,
        summary: count === 1
          ? "1 task across your portfolio needs attention."
          : `${count} tasks across your portfolio need attention.`,
        date: e.createdAt,
        ventureName,
        ventureId,
        fromStage,
        toStage,
        requiresAction: false,
        actionLabel: null,
        section: "thisWeek",
      };
    }

    // Has overdue items with specific venture → Coming Up with action
    if (ventureName) {
      // Try to extract days overdue from message
      const daysMatch = e.message.match(/(\d+)\s*days?\s*overdue/i);
      const days = daysMatch ? daysMatch[1] : null;
      return {
        id: e.id,
        summary: days
          ? `"${ventureName}" has a task that needs attention — ${days} days overdue.`
          : `"${ventureName}" has a task that needs your attention.`,
        date: e.createdAt,
        ventureName,
        ventureId,
        fromStage,
        toStage,
        requiresAction: true,
        actionLabel: "View Task",
        section: "comingUp",
      };
    }

    // Generic overdue message
    return {
      id: e.id,
      summary: cleanMessage(e.message, ventureName),
      date: e.createdAt,
      ventureName,
      ventureId,
      fromStage,
      toStage,
      requiresAction: false,
      actionLabel: null,
      section: "thisWeek",
    };
  }

  // ── Distribution Sentinel ───────────────────────────────────────
  if (e.agentName === "Distribution Sentinel") {
    // "No distributions scheduled" → hide
    if (
      e.message.toLowerCase().includes("no distributions scheduled") ||
      e.message.toLowerCase().includes("no distributions recorded")
    ) {
      return { id: e.id, summary: "", date: e.createdAt, ventureName, ventureId, fromStage, toStage, requiresAction: false, actionLabel: null, section: "hide" };
    }

    // Meaningful distribution update → This Week
    return {
      id: e.id,
      summary: "Your distributions are being tracked and are on schedule.",
      date: e.createdAt,
      ventureName,
      ventureId,
      fromStage,
      toStage,
      requiresAction: false,
      actionLabel: null,
      section: "thisWeek",
    };
  }

  // ── Orchestrator → hide from clients (operator-only) ────────────
  if (e.agentName === "Orchestrator") {
    return { id: e.id, summary: "", date: e.createdAt, ventureName, ventureId, fromStage, toStage, requiresAction: false, actionLabel: null, section: "hide" };
  }

  // ── Fallback: show cleaned message in This Week ─────────────────
  return {
    id: e.id,
    summary: cleanMessage(e.message, ventureName),
    date: e.createdAt,
    ventureName,
    ventureId,
    fromStage,
    toStage,
    requiresAction: false,
    actionLabel: null,
    section: "thisWeek",
  };
}

function cleanMessage(msg: string, ventureName: string | null): string {
  // Remove square bracket content
  msg = msg.replace(/\[[^\]]*\]/g, "");
  // Remove agent names
  msg = msg.replace(/\b(Velocity Agent|Distribution Sentinel|Orchestrator|Overdue Agent)\b/gi, "");
  // Remove operator phrases
  msg = msg.replace(/One-click advance available\.?/gi, "");
  msg = msg.replace(/\badvance available\b/gi, "");
  // Replace internal stage names
  msg = msg.replace(/\bIn Validation\b/g, "Under Review");
  msg = msg.replace(/\bIn Fundraising\b/g, "Fundraising");
  msg = msg.replace(/\bActive ventures\b/g, "Active");
  msg = msg.replace(/\bIn Execution\b/g, "Active");
  msg = msg.replace(/\bPre-Validation\b/g, "Initial Review");
  // Replace operator jargon
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
  // Clean up whitespace
  msg = msg.replace(/\s{2,}/g, " ").trim();
  msg = msg.replace(/\. \./g, ".");
  msg = msg.replace(/\s+\./g, ".");
  return msg;
}

// -- Clean status line for ventures (no internal jargon) --
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
    clean = clean.replace(
      /\b(at risk|velocity|agent|orchestrator|sentinel|blueprint|SPV)\b/gi,
      ""
    );
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
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database unavailable",
        });

      // Resolve org by slug
      const [org] = await db
        .select()
        .from(organizations)
        .where(eq(organizations.slug, input.orgSlug))
        .limit(1);

      if (!org)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Organization not found",
        });

      // Access control: Atlas team can view any portal, client users only their own org
      const isAdmin = isAtlasTeam(ctx.user);
      if (!isAdmin && ctx.user.organizationId !== org.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have access to this portal",
        });
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

      // ── Deduplicate ────────────────────────────────────────────────
      // Same venture + same summary text → keep only the most recent
      const thisWeekSeen = new Map<string, TranslatedEvent>();
      const comingUpSeen = new Map<string, TranslatedEvent>();

      const thisWeek: TranslatedEvent[] = [];
      const comingUp: TranslatedEvent[] = [];

      for (const ev of translated) {
        if (ev.section === "hide" || ev.summary.length < 5) continue;

        const dedupKey = `${ev.ventureName || ""}::${ev.summary.toLowerCase().replace(/\d/g, "").trim()}`;

        if (ev.section === "comingUp") {
          if (!comingUpSeen.has(dedupKey)) {
            comingUpSeen.set(dedupKey, ev);
            comingUp.push(ev);
          }
        } else if (ev.section === "thisWeek") {
          if (!thisWeekSeen.has(dedupKey)) {
            thisWeekSeen.set(dedupKey, ev);
            thisWeek.push(ev);
          }
        }
      }

      // ── Velocity Summary ───────────────────────────────────────────
      const advancedCount = recentEvents.filter(
        (e) =>
          e.agentName === "Velocity Agent" &&
          e.oldStatus &&
          e.newStatus &&
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
          parts.push(
            `advanced ${advancedCount} venture${advancedCount !== 1 ? "s" : ""}`
          );
        if (overdueFlags > 0)
          parts.push(
            `caught ${overdueFlags} item${overdueFlags !== 1 ? "s" : ""} before ${overdueFlags !== 1 ? "they became" : "it became"} a problem`
          );
        if (distributionEvents > 0)
          parts.push(
            `kept ${distributionEvents} distribution${distributionEvents !== 1 ? "s" : ""} on track`
          );
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

        // Get last agent event per venture for the card annotation
        const ventureEventMap = new Map<number, { summary: string; type: "ready" | "advanced" | "info" }>();

        for (const ev of translated) {
          if (ev.section === "hide" || !ev.ventureId) continue;
          if (ventureEventMap.has(ev.ventureId)) continue; // already have most recent (events sorted desc)

          if (ev.requiresAction && ev.toStage) {
            ventureEventMap.set(ev.ventureId, {
              summary: `Ready to move to ${ev.toStage} — your approval needed`,
              type: "ready",
            });
          } else if (ev.fromStage && ev.toStage && !ev.requiresAction) {
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
        thisWeek: thisWeek.map((e) => ({
          id: e.id,
          summary: e.summary,
          date: e.date,
          ventureName: e.ventureName,
        })),
        portfolio,
        comingUp: comingUp.map((e) => ({
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
};
