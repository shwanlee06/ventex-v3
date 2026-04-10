// ATLAS Continuous Learning Engine
// Gap 3: Feedback loops, outcome tracking, recommendation calibration
// Tracks whether agent recommendations were followed and what happened

import { getDb } from "../db";
import { eq, and, desc, sql, gte, isNotNull } from "drizzle-orm";
import {
  agentEvents, recommendationOutcome, agentPerformance,
  ventureVelocity, ventures,
} from "../../drizzle/schema";
import { invokeLLM } from "../_core/llm";

// Matches agent recommendations to what actually happened
export async function trackOutcomes(organizationId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");


  // Get agent events that had recommendations but no outcome tracked yet
  const untrackedEvents = await db
    .select()
    .from(agentEvents)
    .where(
      and(
        eq(agentEvents.organizationId, organizationId),
        isNotNull(agentEvents.actionType),
        sql`${agentEvents.id} NOT IN (SELECT agentEventId FROM recommendation_outcome WHERE agentEventId IS NOT NULL)`
      )
    )
    .orderBy(desc(agentEvents.createdAt))
    .limit(100);

  let tracked = 0;

  for (const event of untrackedEvents) {
    const wasActedUpon = event.actionTaken === true;

    // Determine client action
    let clientAction: "accepted" | "rejected" | "modified" | "ignored" | "deferred" = "ignored";
    if (wasActedUpon) {
      clientAction = "accepted";
    } else if (event.clientDismissed) {
      clientAction = "rejected";
    }

    // Calculate time to action (if acted upon)
    let actionTakenAt: Date | null = null;
    if (wasActedUpon && event.actionTakenAt) {
      actionTakenAt = new Date(event.actionTakenAt);
    }

    // Determine outcome quality based on what happened after
    let outcomeType: "positive" | "negative" | "neutral" | "pending" = "pending";
    let outcomeDescription = "Outcome not yet determined";
    let outcomeMetric: number | null = null;

    const eventVentureId = event.agentEntityId ? parseInt(event.agentEntityId) : null;
    if (eventVentureId) {
      const subsequentAdvances = await db
        .select()
        .from(ventureVelocity)
        .where(
          and(
            eq(ventureVelocity.ventureId, eventVentureId),
            gte(ventureVelocity.advancedAt, event.createdAt)
          )
        )
        .limit(1);

      if (subsequentAdvances.length > 0) {
        if (wasActedUpon) {
          outcomeType = "positive";
          outcomeDescription = `Recommendation followed. Venture advanced to ${subsequentAdvances[0].toStage} in ${subsequentAdvances[0].daysInStage} days.`;
          outcomeMetric = subsequentAdvances[0].daysInStage;
        } else {
          outcomeType = "neutral";
          outcomeDescription = `Recommendation not followed, but venture advanced to ${subsequentAdvances[0].toStage}.`;
        }
      } else {
        const daysSinceEvent = Math.floor(
          (Date.now() - new Date(event.createdAt).getTime()) / (1000 * 60 * 60 * 24)
        );
        if (daysSinceEvent > 14) {
          if (!wasActedUpon) {
            outcomeType = "negative";
            outcomeDescription = `Recommendation not followed. No progress in ${daysSinceEvent} days.`;
            outcomeMetric = daysSinceEvent;
          } else {
            outcomeType = "neutral";
            outcomeDescription = `Recommendation followed but no stage advance in ${daysSinceEvent} days.`;
          }
        }
      }
    }

    // Persist outcome
    await db.insert(recommendationOutcome).values({
      organizationId,
      agentEventId: event.id,
      agentName: event.agentName,
      recommendationType: event.actionType || "general",
      recommendationSummary: event.message || "",
      clientAction,
      actionTakenAt,
      outcomeType,
      outcomeDescription,
      outcomeMetric,
      ventureId: event.agentEntityId ? parseInt(event.agentEntityId) || null : null,
      sector: null,
    });
    tracked++;
  }

  return tracked;
}

export async function computeAgentPerformance(organizationId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");


  const agentNames = ["overdue", "velocity", "distribution", "orchestrator"];
  const results: Array<typeof agentPerformance.$inferInsert> = [];
  const periodEnd = new Date();
  const periodStart = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  for (const agentName of agentNames) {
    const outcomes = await db
      .select()
      .from(recommendationOutcome)
      .where(
        and(
          eq(recommendationOutcome.organizationId, organizationId),
          eq(recommendationOutcome.agentName, agentName)
        )
      );

    if (outcomes.length === 0) continue;

    const total = outcomes.length;
    const accepted = outcomes.filter((o) => o.clientAction === "accepted").length;
    const rejected = outcomes.filter((o) => o.clientAction === "rejected").length;
    const ignored = outcomes.filter((o) => o.clientAction === "ignored").length;
    const positive = outcomes.filter((o) => o.outcomeType === "positive").length;
    const negative = outcomes.filter((o) => o.outcomeType === "negative").length;

    const acceptanceRate = Math.round((accepted / total) * 100);
    const resolved = outcomes.filter((o) => o.outcomeType !== "pending");
    const accuracyRate = resolved.length > 0
      ? Math.round((positive / resolved.length) * 100)
      : null;

    // Client trust score: weighted composite
    const trustScore = Math.round(
      (acceptanceRate * 0.4) + ((accuracyRate || 50) * 0.4) + (Math.min(total, 50) * 0.4)
    );

    // Severity bias detection
    let severityBias: "over_alerts" | "under_alerts" | "calibrated" = "calibrated";
    if (ignored > total * 0.5) severityBias = "over_alerts";
    else if (negative > positive && resolved.length >= 5) severityBias = "under_alerts";

    // Generate calibration notes via LLM
    let recommendedCalibration = "";
    if (total >= 5) {
      try {
        const negativeExamples = outcomes
          .filter((o) => o.outcomeType === "negative")
          .slice(0, 3)
          .map((o) => `- ${o.recommendationType}: "${o.recommendationSummary}" → ${o.outcomeDescription}`)
          .join("\n");

        const response = await invokeLLM({
          messages: [
            {
              role: "system",
              content: "You are ATLAS AI calibration system. Analyze agent performance and suggest 2-3 specific tuning improvements in 2-3 sentences. Be concise.",
            },
            {
              role: "user",
              content: `Agent: ${agentName}\nTotal: ${total}, Accepted: ${accepted}, Ignored: ${ignored}\nAccuracy: ${accuracyRate}%, Bias: ${severityBias}\nNegative outcomes:\n${negativeExamples || "None"}`,
            },
          ],
        });

        recommendedCalibration = response.choices[0].message.content as string || "";
      } catch (e) {
        console.error(`[ContinuousLearning] Calibration LLM failed for ${agentName}:`, e);
      }
    }

    const record = {
      organizationId,
      agentName,
      totalRecommendations: total,
      acceptedCount: accepted,
      rejectedCount: rejected,
      ignoredCount: ignored,
      positiveOutcomes: positive,
      negativeOutcomes: negative,
      acceptanceRate,
      accuracyRate,
      clientTrustScore: trustScore,
      severityBias,
      recommendedCalibration: recommendedCalibration || null,
      periodStart,
      periodEnd,
    };

    await db.insert(agentPerformance).values(record);
    results.push(record);
  }

  return results;
}

export async function runContinuousLearning(organizationId: number) {
  const start = Date.now();

  const tracked = await trackOutcomes(organizationId);
  const performance = await computeAgentPerformance(organizationId);

  return {
    outcomesTracked: tracked,
    agentReports: performance.length,
    elapsedSeconds: parseFloat(((Date.now() - start) / 1000).toFixed(1)),
  };
}

export async function getAgentPerformanceSummary(organizationId: number) {
  const db = await getDb();
  if (!db) return [];

  const allRecords = await db
    .select()
    .from(agentPerformance)
    .where(eq(agentPerformance.organizationId, organizationId))
    .orderBy(desc(agentPerformance.calculatedAt))
    .limit(20);

  // Deduplicate to latest per agent
  const byAgent: Record<string, typeof allRecords[0]> = {};
  for (const r of allRecords) {
    if (!byAgent[r.agentName]) byAgent[r.agentName] = r;
  }

  return Object.values(byAgent);
}
