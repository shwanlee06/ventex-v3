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
  "In Validation": "Under Review",
  "In Fundraising": "Fundraising",
  "Active": "Active",
  "Active ventures": "Active",
  "Completed": "Completed",
  "On Hold": "On Hold",
};

function clientFriendlyStage(stage: string): string {
  return STAGE_DISPLAY[stage] || stage;
}

// ── Event types that should NEVER appear in the client portal ───────────
const BLOCKED_EVENT_TYPES = new Set([
  "agent_error",
  "scheduler_run",
  "config_change",
  "blueprint_generated",
  "blueprint_confirmed",
]);

// ── Action labels that are operator-only (should not show to clients) ───
const OPERATOR_ACTION_LABELS = new Set([
  "Advance Stage",
  "Review Blueprint",
  "Run Agent",
  "Configure",
  "Assign",
]);

// -- Plain English translation for agent events --
function translateEventToPlainEnglish(event: {
  eventType: string;
  message: string;
  agentEntityName?: string | null;
  actionLabel?: string | null;
  severity: string;
}): string {
  let msg = event.message;

  // Remove agent names and internal references
  msg = msg.replace(
    /\b(Velocity Agent|Distribution Sentinel|Orchestrator|Overdue Agent|Velocity Intelligence)\b/gi,
    "your team"
  );
  msg = msg.replace(/\b(agent|bot|scheduler|cron|pipeline)\b/gi, "");

  // ── STEP 1: Rewrite full-sentence patterns FIRST (before individual word replacements) ──

  // Rewrite "ready to advance" messages into client-friendly language
  msg = msg.replace(
    /has completed all \d+ tasks? in ([\w\s&-]+?) and is ready to advance to ([\w\s&-]+?)\./gi,
    (_, fromStage, toStage) => {
      const from = clientFriendlyStage(fromStage.trim());
      const to = clientFriendlyStage(toStage.trim());
      return `has completed the ${from} phase and is moving to ${to}.`;
    }
  );

  // Rewrite "X distributions monitored" messages
  msg = msg.replace(
    /\d+ scheduled distributions monitored\.?\s*All recently alerted\.?/gi,
    "Your distributions are being tracked and are on schedule."
  );

  // Rewrite "No overdue items detected"
  msg = msg.replace(
    /All tasks are on schedule\.?\s*No overdue items detected\.?/gi,
    "Everything is on track \u2014 no items need your attention right now."
  );

  // Remove operator-only phrases
  msg = msg.replace(/One-click advance available\.?/gi, "");
  msg = msg.replace(/\badvance available\b/gi, "");

  // Remove internal bracket references
  msg = msg.replace(/\[Client Blueprint[^\]]*\]/gi, "");
  msg = msg.replace(/\[System Blueprint[^\]]*\]/gi, "");
  msg = msg.replace(/\[Blueprint[^\]]*\]/gi, "");

  // ── STEP 2: Replace individual terms AFTER sentence rewrites ──

  // Replace internal stage names with client-friendly versions
  msg = msg.replace(/\bIn Validation\b/g, "Under Review");
  msg = msg.replace(/\bIn Fundraising\b/g, "Fundraising");
  msg = msg.replace(/\bActive ventures\b/g, "Active");

  // Replace operator-facing phrases with client-friendly language
  msg = msg.replace(/\bat risk\b/gi, "needs attention");
  msg = msg.replace(/\bvelocity score\b/gi, "progress");
  msg = msg.replace(/\bvelocity\b/gi, "progress");
  msg = msg.replace(/\bescalat(e|ed|ion)\b/gi, "flagged for review");
  msg = msg.replace(/\bnudge(d)?\b/gi, "reminder sent");
  msg = msg.replace(/\boverdue task(s)?\b/gi, "pending item(s)");
  msg = msg.replace(/\bsignal(s)?\b/gi, "update(s)");

  // Clean up double spaces, trailing periods, etc.
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
    // Strip internal jargon from currentStatus
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

      // ── Section 1: This Week ──────────────────────────────────
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
        .limit(30);

      // Deduplicate and filter: only show client-appropriate events
      const seen = new Set<string>();
      const thisWeek: {
        id: number;
        summary: string;
        date: Date | null;
        requiresAction: boolean;
        actionLabel: string | undefined;
        entityName: string | undefined;
      }[] = [];

      for (const e of recentEvents) {
        // Skip blocked event types
        if (BLOCKED_EVENT_TYPES.has(e.eventType)) continue;

        const summary = translateEventToPlainEnglish(e);

        // Skip if translated message is too short (stripped to nothing)
        if (summary.length < 10) continue;

        // Dedup key: ignore numbers/timestamps for comparison
        const dedupKey = summary.toLowerCase().replace(/\d/g, "").trim();
        if (seen.has(dedupKey)) continue;
        seen.add(dedupKey);

        // Determine if this event has a client-appropriate action
        const hasClientAction =
          e.requiresClientAction &&
          !e.actionTaken &&
          e.actionLabel != null &&
          !OPERATOR_ACTION_LABELS.has(e.actionLabel);

        thisWeek.push({
          id: e.id,
          summary,
          date: e.createdAt,
          requiresAction: hasClientAction,
          actionLabel: hasClientAction ? e.actionLabel! : undefined,
          entityName: e.agentEntityName || undefined,
        });
      }

      // ── Section 2: Your Portfolio ─────────────────────────────
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
      }[] = [];

      if (access.length > 0) {
        const ventureIds = access.map((a) => a.ventureId);
        const orgVentures = await db
          .select()
          .from(ventures)
          .where(inArray(ventures.id, ventureIds));

        portfolio = orgVentures.map((v) => ({
          id: v.id,
          name: v.name,
          sector: v.sector,
          stage: clientFriendlyStage(v.stage),
          statusLine: getCleanStatusLine(v),
          slug: v.slug,
        }));
      }

      // ── Section 3: Coming Up ──────────────────────────────────
      const upcomingTasks = await db
        .select()
        .from(tasks)
        .where(
          and(
            eq(tasks.organizationId, org.id),
            sql`${tasks.status} != 'complete'`
          )
        )
        .orderBy(tasks.dueDate)
        .limit(5);

      const comingUp = upcomingTasks.map((t) => ({
        id: t.id,
        title: t.title,
        dueDate: t.dueDate || undefined,
        ventureLink: t.ventureLink || undefined,
      }));

      return {
        orgName: org.name,
        orgSlug: org.slug,
        isOperatorPreview: isAdmin,
        thisWeek,
        portfolio,
        comingUp,
      };
    }),
};
