// ═══════════════════════════════════════════════════════════════════════════
// ATLAS Predictive Analytics Engine
// Gap 1: Stage forecasting, bottleneck detection, risk scoring, portfolio health
// ═══════════════════════════════════════════════════════════════════════════

import { getDb } from "../db";
import { eq, and, desc, sql, isNotNull, gte } from "drizzle-orm";
import {
  ventures, tasks, ventureVelocity, ventureProcessTracking,
  clientVelocityBenchmarks, processSteps, teamMembers, ventureTeam,
  ventureForecast, portfolioHealthTrajectory, resourceContentionAlert,
  spvs,
} from "../../drizzle/schema";
import { invokeLLM } from "../_core/llm";

// ── Benchmark Calculator ────────────────────────────────────────────────
// Computes sector/stage averages from historical venture_velocity data
export async function computeBenchmarks(organizationId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const velocityData = await db
    .select({
      sector: ventureVelocity.sector,
      fromStage: ventureVelocity.fromStage,
      daysInStage: ventureVelocity.daysInStage,
    })
    .from(ventureVelocity)
    .where(eq(ventureVelocity.organizationId, organizationId));

  // Group by sector + stage
  const groups: Record<string, number[]> = {};
  for (const row of velocityData) {
    const key = `${row.sector || "Unknown"}::${row.fromStage}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(row.daysInStage);
  }

  const benchmarks: Array<{
    sector: string;
    stage: string;
    avgDays: number;
    fastest: number;
    slowest: number;
    sampleCount: number;
  }> = [];

  for (const [key, days] of Object.entries(groups)) {
    const [sector, stage] = key.split("::");
    const sorted = days.sort((a, b) => a - b);
    benchmarks.push({
      sector,
      stage,
      avgDays: Math.round(sorted.reduce((a, b) => a + b, 0) / sorted.length),
      fastest: sorted[0],
      slowest: sorted[sorted.length - 1],
      sampleCount: sorted.length,
    });
  }

  // Upsert benchmarks
  for (const b of benchmarks) {
    const existing = await db
      .select()
      .from(clientVelocityBenchmarks)
      .where(
        and(
          eq(clientVelocityBenchmarks.organizationId, organizationId),
          eq(clientVelocityBenchmarks.sector, b.sector),
          eq(clientVelocityBenchmarks.stage, b.stage)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(clientVelocityBenchmarks)
        .set({
          avgDaysToAdvance: b.avgDays,
          fastestDays: b.fastest,
          slowestDays: b.slowest,
          sampleCount: b.sampleCount,
          lastCalculated: new Date(),
        })
        .where(eq(clientVelocityBenchmarks.id, existing[0].id));
    } else {
      await db.insert(clientVelocityBenchmarks).values({
        organizationId,
        sector: b.sector,
        stage: b.stage,
        avgDaysToAdvance: b.avgDays,
        fastestDays: b.fastest,
        slowestDays: b.slowest,
        sampleCount: b.sampleCount,
      });
    }
  }

  return benchmarks;
}

// ── Stage Duration Forecaster ───────────────────────────────────────────
// For each active venture, project when the current stage will complete
export async function forecastVentures(organizationId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const orgVentures = await db
    .select()
    .from(ventures)
    .where(and(eq(ventures.status, "In progress")));

  // Get benchmarks for this org
  const benchmarks = await db
    .select()
    .from(clientVelocityBenchmarks)
    .where(eq(clientVelocityBenchmarks.organizationId, organizationId));

  const benchmarkMap: Record<string, typeof benchmarks[0]> = {};
  for (const b of benchmarks) {
    benchmarkMap[`${b.sector}::${b.stage}`] = b;
  }

  // Get all open tasks per venture
  const openTasks = await db
    .select({
      ventureId: tasks.ventureId,
      taskId: tasks.id,
      title: tasks.title,
      status: tasks.status,
      dueDate: tasks.dueDate,
      assigneeNames: tasks.assigneeNames,
    })
    .from(tasks)
    .where(
      and(
        eq(tasks.organizationId, organizationId),
        sql`${tasks.status} != 'complete'`
      )
    );

  const tasksByVenture: Record<number, typeof openTasks> = {};
  for (const t of openTasks) {
    if (!t.ventureId) continue;
    if (!tasksByVenture[t.ventureId]) tasksByVenture[t.ventureId] = [];
    tasksByVenture[t.ventureId].push(t);
  }

  // Get blocking process steps
  const blockingSteps = await db
    .select()
    .from(ventureProcessTracking)
    .where(
      and(
        eq(ventureProcessTracking.isBlocking, true),
        sql`${ventureProcessTracking.status} != 'complete'`
      )
    );

  const blockingByVenture: Record<number, typeof blockingSteps> = {};
  for (const s of blockingSteps) {
    if (!blockingByVenture[s.ventureId]) blockingByVenture[s.ventureId] = [];
    blockingByVenture[s.ventureId].push(s);
  }

  // Get team assignments for resource contention
  const teamAssignments = await db
    .select({
      ventureId: ventureTeam.ventureId,
      memberId: ventureTeam.memberId,
    })
    .from(ventureTeam);

  const forecasts: Array<typeof ventureForecast.$inferInsert> = [];

  for (const v of orgVentures) {
    const benchmark = benchmarkMap[`${v.sector}::${v.stage}`];
    const vTasks = tasksByVenture[v.id] || [];
    const vBlocking = blockingByVenture[v.id] || [];
    const overdueTasks = vTasks.filter(
      (t) => t.dueDate && new Date(t.dueDate) < new Date()
    );

    // Calculate days in current stage
    const lastAdvance = await db
      .select()
      .from(ventureVelocity)
      .where(eq(ventureVelocity.ventureId, v.id))
      .orderBy(desc(ventureVelocity.advancedAt))
      .limit(1);

    const stageStartDate = lastAdvance.length > 0
      ? lastAdvance[0].advancedAt
      : v.createdAt;
    const daysInStage = Math.floor(
      (Date.now() - new Date(stageStartDate).getTime()) / (1000 * 60 * 60 * 24)
    );

    // Risk scoring (0-100)
    let riskScore = 30; // baseline
    const riskFactors: string[] = [];

    // Factor 1: Overdue tasks
    if (overdueTasks.length > 0) {
      riskScore += Math.min(overdueTasks.length * 10, 30);
      riskFactors.push(`${overdueTasks.length} overdue task(s)`);
    }

    // Factor 2: Blocking steps incomplete
    if (vBlocking.length > 0) {
      riskScore += Math.min(vBlocking.length * 8, 25);
      riskFactors.push(`${vBlocking.length} blocking step(s) incomplete`);
    }

    // Factor 3: Over benchmark
    if (benchmark && benchmark.avgDaysToAdvance) {
      const deviation = daysInStage - benchmark.avgDaysToAdvance;
      if (deviation > 0) {
        const pctOver = Math.round((deviation / benchmark.avgDaysToAdvance) * 100);
        riskScore += Math.min(pctOver / 3, 20);
        riskFactors.push(`${pctOver}% over sector benchmark (${benchmark.avgDaysToAdvance}d avg)`);
      }
    }

    // Factor 4: No recent activity
    const daysSinceUpdate = Math.floor(
      (Date.now() - new Date(v.updatedAt).getTime()) / (1000 * 60 * 60 * 24)
    );
    if (daysSinceUpdate > 14) {
      riskScore += 15;
      riskFactors.push(`No activity for ${daysSinceUpdate} days`);
    }

    riskScore = Math.min(riskScore, 100);

    // Project completion
    const benchmarkDays = benchmark?.avgDaysToAdvance || null;
    let projectedDaysRemaining: number | null = null;
    let projectedAdvanceDate: Date | null = null;

    if (benchmarkDays) {
      // Weighted projection: benchmark + current pace adjustment
      const remainingByBenchmark = Math.max(benchmarkDays - daysInStage, 0);
      const riskMultiplier = 1 + (riskScore - 30) / 100; // higher risk = longer projection
      projectedDaysRemaining = Math.round(remainingByBenchmark * riskMultiplier);
      if (projectedDaysRemaining <= 0) projectedDaysRemaining = 1;
      projectedAdvanceDate = new Date(
        Date.now() + projectedDaysRemaining * 24 * 60 * 60 * 1000
      );
    }

    // Deviation from benchmark
    const deviationPercent = benchmarkDays
      ? Math.round(((daysInStage - benchmarkDays) / benchmarkDays) * 100)
      : null;

    // Bottleneck detection
    let bottleneckStepName: string | null = null;
    let bottleneckOwner: string | null = null;
    let bottleneckDaysStuck: number | null = null;

    if (vBlocking.length > 0) {
      // Find the oldest incomplete blocking step
      const oldest = vBlocking.sort((a, b) => {
        const aStart = a.startedAt ? new Date(a.startedAt).getTime() : new Date(a.createdAt).getTime();
        const bStart = b.startedAt ? new Date(b.startedAt).getTime() : new Date(b.createdAt).getTime();
        return aStart - bStart;
      })[0];
      bottleneckStepName = oldest.stepName;
      bottleneckOwner = oldest.whoOwns || null;
      bottleneckDaysStuck = Math.floor(
        (Date.now() - new Date(oldest.startedAt || oldest.createdAt).getTime()) / (1000 * 60 * 60 * 24)
      );
    }

    // Confidence based on sample size
    const sampleSize = benchmark?.sampleCount || 0;
    const confidence = sampleSize >= 10 ? "high" : sampleSize >= 3 ? "medium" : "low";

    // Deal close probability for SPV-linked ventures
    let dealCloseProbability: number | null = null;
    const linkedSpv = await db
      .select()
      .from(spvs)
      .where(eq(spvs.organizationId, organizationId))
      .limit(1);

    if (linkedSpv.length > 0) {
      // Simple heuristic: lower risk = higher close probability
      dealCloseProbability = Math.max(100 - riskScore, 10);
    }

    forecasts.push({
      organizationId,
      ventureId: v.id,
      ventureName: v.name,
      sector: v.sector,
      currentStage: v.stage,
      projectedAdvanceDate,
      projectedDaysRemaining,
      benchmarkDays,
      deviationPercent,
      riskScore,
      riskFactors,
      bottleneckStepName,
      bottleneckOwner,
      bottleneckDaysStuck,
      confidence,
      sampleSize,
      dealCloseProbability,
      dealRiskFactors: riskFactors.length > 0 ? riskFactors : null,
      narrative: null, // filled by LLM below
      recommendedActions: null,
    });
  }

  // Generate LLM narratives for high-risk ventures
  const highRisk = forecasts.filter((f) => f.riskScore! >= 60);
  if (highRisk.length > 0) {
    try {
      const prompt = highRisk
        .map(
          (f) =>
            `Venture: ${f.ventureName} (${f.sector}), Stage: ${f.currentStage}, Risk: ${f.riskScore}/100, Factors: ${(f.riskFactors || []).join(", ")}, Days in stage: ${f.benchmarkDays ? `${f.deviationPercent}% vs benchmark` : "no benchmark"}, Bottleneck: ${f.bottleneckStepName || "none"}`
        )
        .join("\n");

      const response = await invokeLLM({
        messages: [
          {
            role: "system",
            content:
              "You are ATLAS, an AI venture intelligence system. For each venture below, write a 2-sentence forecast narrative and 2-3 specific recommended actions. Return JSON array: [{ventureName, narrative, recommendedActions: string[]}]. Be direct and actionable.",
          },
          { role: "user", content: prompt },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "forecasts",
            strict: true,
            schema: {
              type: "object",
              properties: {
                items: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      ventureName: { type: "string" },
                      narrative: { type: "string" },
                      recommendedActions: {
                        type: "array",
                        items: { type: "string" },
                      },
                    },
                    required: ["ventureName", "narrative", "recommendedActions"],
                    additionalProperties: false,
                  },
                },
              },
              required: ["items"],
              additionalProperties: false,
            },
          },
        },
      });

      const parsed = JSON.parse(response.choices[0].message.content as string || "{}");
      if (parsed.items) {
        for (const item of parsed.items) {
          const match = forecasts.find((f) => f.ventureName === item.ventureName);
          if (match) {
            match.narrative = item.narrative;
            match.recommendedActions = item.recommendedActions;
          }
        }
      }
    } catch (e) {
      console.error("[PredictiveEngine] LLM narrative generation failed:", e);
    }
  }

  // Persist forecasts
  for (const f of forecasts) {
    await db.insert(ventureForecast).values(f);
  }

  return forecasts;
}

// ── Portfolio Health Trajectory ─────────────────────────────────────────
export async function computePortfolioHealth(organizationId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Get latest forecasts
  const latestForecasts = await db
    .select()
    .from(ventureForecast)
    .where(eq(ventureForecast.organizationId, organizationId))
    .orderBy(desc(ventureForecast.calculatedAt))
    .limit(100);

  // Deduplicate to latest per venture
  const byVenture: Record<number, typeof latestForecasts[0]> = {};
  for (const f of latestForecasts) {
    if (!byVenture[f.ventureId]) byVenture[f.ventureId] = f;
  }
  const currentForecasts = Object.values(byVenture);

  if (currentForecasts.length === 0) {
    return null;
  }

  const onTrack = currentForecasts.filter((f) => f.riskScore < 40).length;
  const atRisk = currentForecasts.filter((f) => f.riskScore >= 40 && f.riskScore < 70).length;
  const delayed = currentForecasts.filter((f) => f.riskScore >= 70).length;

  const avgRisk =
    currentForecasts.reduce((sum, f) => sum + f.riskScore, 0) / currentForecasts.length;
  const currentHealth = Math.round(100 - avgRisk);

  // Project 30-day health based on trend
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const oldForecasts = await db
    .select()
    .from(ventureForecast)
    .where(
      and(
        eq(ventureForecast.organizationId, organizationId),
        gte(ventureForecast.calculatedAt, thirtyDaysAgo)
      )
    )
    .orderBy(ventureForecast.calculatedAt)
    .limit(500);

  let projectedHealth30d = currentHealth;
  let healthTrend: "improving" | "stable" | "declining" | "critical" = "stable";

  if (oldForecasts.length > 10) {
    // Compare first half vs second half average risk
    const mid = Math.floor(oldForecasts.length / 2);
    const firstHalf = oldForecasts.slice(0, mid);
    const secondHalf = oldForecasts.slice(mid);
    const firstAvg = firstHalf.reduce((s: number, f: typeof oldForecasts[0]) => s + f.riskScore, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((s: number, f: typeof oldForecasts[0]) => s + f.riskScore, 0) / secondHalf.length;
    const riskDelta: number = secondAvg - firstAvg;

    if (riskDelta < -5) {
      healthTrend = "improving";
      projectedHealth30d = Math.min(currentHealth + 10, 100);
    } else if (riskDelta > 10) {
      healthTrend = currentHealth < 30 ? "critical" : "declining";
      projectedHealth30d = Math.max(currentHealth - 15, 0);
    } else {
      healthTrend = "stable";
      projectedHealth30d = currentHealth;
    }
  }

  // Resource contention detection
  const memberTaskCounts = await db
    .select({
      memberId: ventureTeam.memberId,
    })
    .from(ventureTeam);

  // Count blocking tasks per team member
  const memberBlocking: Record<number, { name: string; count: number; ventures: string[] }> = {};
  // Simplified: check tasks assigned to each member
  const allOpenTasks = await db
    .select()
    .from(tasks)
    .where(
      and(
        eq(tasks.organizationId, organizationId),
        sql`${tasks.status} != 'complete'`
      )
    );

  for (const t of allOpenTasks) {
    const assigneeIds = t.assigneeIds || [];
    const assigneeNames = t.assigneeNames || [];
    for (let i = 0; i < assigneeIds.length; i++) {
      const mid = assigneeIds[i] as number;
      if (!memberBlocking[mid]) {
        memberBlocking[mid] = { name: assigneeNames[i] || `Member ${mid}`, count: 0, ventures: [] };
      }
      memberBlocking[mid].count++;
      if (t.ventureLink && !memberBlocking[mid].ventures.includes(t.ventureLink)) {
        memberBlocking[mid].ventures.push(t.ventureLink);
      }
    }
  }

  const overloaded = Object.entries(memberBlocking)
    .filter(([, v]) => v.count >= 5)
    .map(([, v]) => ({
      name: v.name,
      blockingTasks: v.count,
      ventures: v.ventures,
    }));

  // Generate executive summary via LLM
  let executiveSummary = "";
  let topRisks: string[] = [];
  let topOpportunities: string[] = [];

  try {
    const highRiskVentures = currentForecasts
      .filter((f) => f.riskScore >= 60)
      .map((f) => `${f.ventureName} (risk: ${f.riskScore}, factors: ${(f.riskFactors || []).join(", ")})`);

    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content:
            "You are ATLAS, writing a portfolio health executive summary for a client. Be concise, professional, and actionable. Return JSON.",
        },
        {
          role: "user",
          content: `Portfolio: ${currentForecasts.length} ventures, Health: ${currentHealth}/100, Trend: ${healthTrend}, On track: ${onTrack}, At risk: ${atRisk}, Delayed: ${delayed}, Overloaded team: ${overloaded.length} members. High risk ventures: ${highRiskVentures.join("; ") || "none"}`,
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "health_summary",
          strict: true,
          schema: {
            type: "object",
            properties: {
              executiveSummary: { type: "string" },
              topRisks: { type: "array", items: { type: "string" } },
              topOpportunities: { type: "array", items: { type: "string" } },
            },
            required: ["executiveSummary", "topRisks", "topOpportunities"],
            additionalProperties: false,
          },
        },
      },
    });

    const parsed = JSON.parse(response.choices[0].message.content as string || "{}");
    executiveSummary = parsed.executiveSummary || "";
    topRisks = parsed.topRisks || [];
    topOpportunities = parsed.topOpportunities || [];
  } catch (e) {
    console.error("[PredictiveEngine] Portfolio summary LLM failed:", e);
    executiveSummary = `Portfolio health: ${currentHealth}/100 (${healthTrend}). ${onTrack} on track, ${atRisk} at risk, ${delayed} delayed.`;
  }

  // Persist
  const record = {
    organizationId,
    currentHealthScore: currentHealth,
    projectedHealthScore30d: projectedHealth30d,
    healthTrend,
    venturesOnTrack: onTrack,
    venturesAtRisk: atRisk,
    venturesDelayed: delayed,
    overloadedMembers: overloaded.length > 0 ? overloaded : null,
    executiveSummary,
    topRisks,
    topOpportunities,
  };

  await db.insert(portfolioHealthTrajectory).values(record);

  // Persist resource contention alerts
  for (const o of overloaded) {
    const riskLevel =
      o.blockingTasks >= 10 ? "critical" : o.blockingTasks >= 7 ? "high" : "medium";
    await db.insert(resourceContentionAlert).values({
      organizationId,
      memberId: 0, // simplified
      memberName: o.name,
      blockingTaskCount: o.blockingTasks,
      ventureNames: o.ventures,
      riskLevel,
      recommendation: `Consider reassigning ${Math.ceil(o.blockingTasks / 3)} tasks from ${o.name} to reduce bottleneck risk across ${o.ventures.length} venture(s).`,
    });
  }

  return { ...record, overloadedMembers: overloaded };
}

// ── Master Run — called by agent scheduler ──────────────────────────────
export async function runPredictiveEngine(organizationId: number) {
  console.log(`[PredictiveEngine] Running for org ${organizationId}`);
  const start = Date.now();

  const benchmarks = await computeBenchmarks(organizationId);
  const forecasts = await forecastVentures(organizationId);
  const health = await computePortfolioHealth(organizationId);

  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  console.log(
    `[PredictiveEngine] Complete: ${forecasts.length} forecasts, ${benchmarks.length} benchmarks in ${elapsed}s`
  );

  return {
    benchmarks: benchmarks.length,
    forecasts: forecasts.length,
    health,
    elapsedSeconds: parseFloat(elapsed),
  };
}
