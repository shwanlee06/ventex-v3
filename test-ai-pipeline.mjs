// ============================================================================
// AI Pipeline End-to-End Test — Meridian Capital Group (Real Estate)
//
// Exercises:
//   1. Blueprint generation (LLM-powered)
//   2. Auto-apply blueprint to all 6 ventures
//   3. Health score recalculation
//   4. Overdue Agent (task scanning + draft comms)
//   5. Velocity Agent (stage advancement detection)
//   6. Distribution Sentinel
//   7. Orchestrator (cross-agent correlation)
//   8. Daily Brief generation (LLM-powered)
//   9. AI Observations generation (LLM-powered)
//   10. Smart Alerts generation
// ============================================================================
import "dotenv/config";
import { drizzle } from "drizzle-orm/mysql2";
import { eq, and, desc, inArray } from "drizzle-orm";
import * as schema from "./drizzle/schema.ts";

const db = drizzle(process.env.DATABASE_URL);

// ── Resolve org ID ──────────────────────────────────────────────────────
async function getOrgId() {
  const [org] = await db.select().from(schema.organizations)
    .where(eq(schema.organizations.slug, "meridian-capital-group")).limit(1);
  if (!org) throw new Error("Meridian Capital Group not found! Run seed-demo-client.mjs first.");
  return org.id;
}

async function getVentureIdsForOrg(orgId) {
  const rows = await db.select({ ventureId: schema.orgVentureAccess.ventureId })
    .from(schema.orgVentureAccess)
    .where(eq(schema.orgVentureAccess.organizationId, orgId));
  return rows.map(r => r.ventureId);
}

// ── Step 1: Generate Real Estate Blueprint ──────────────────────────────
async function step1_generateBlueprint(orgId) {
  console.log("\n═══════════════════════════════════════════════════════════════");
  console.log("  STEP 1: GENERATE REAL ESTATE BLUEPRINT (LLM)");
  console.log("═══════════════════════════════════════════════════════════════\n");

  // Check if blueprint already exists
  const [existing] = await db.select()
    .from(schema.processTemplates)
    .where(and(
      eq(schema.processTemplates.organizationId, orgId),
      eq(schema.processTemplates.sector, "Real Estate"),
    )).limit(1);

  if (existing) {
    console.log(`  ⚡ Blueprint already exists (id=${existing.id}, "${existing.blueprintName}")`);
    console.log(`     Source: ${existing.source}, Confidence: ${existing.confidence}`);
    const steps = await db.select().from(schema.processSteps)
      .where(eq(schema.processSteps.templateId, existing.id));
    console.log(`     Steps: ${steps.length}`);
    const stages = [...new Set(steps.map(s => s.stageName))];
    for (const stage of stages) {
      const stageSteps = steps.filter(s => s.stageName === stage);
      console.log(`       ${stage}: ${stageSteps.length} steps`);
    }
    return existing.id;
  }

  console.log("  🤖 Calling LLM to generate Real Estate blueprint...");
  const { invokeLLM } = await import("./server/_core/llm.ts");

  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content: `You are an expert at creating operational blueprints for UHNWI holding companies. Output ONLY valid JSON, no markdown.`,
      },
      {
        role: "user",
        content: `Generate a detailed operational blueprint for a UHNWI holding company running Real Estate ventures. This is their starting process — it will be refined based on their actual operations.

Return JSON:
{
  "sector": "Real Estate",
  "blueprintName": "Real Estate Operations Blueprint",
  "stages": [
    {
      "stage_name": "In Validation|In Fundraising|Active Ventures|Completed",
      "stage_order": 1,
      "typical_duration_days": 30,
      "steps": [
        {
          "order": 1,
          "name": "specific step name",
          "description": "what happens",
          "who_owns": "role",
          "is_blocking": true,
          "typical_days": 5,
          "output": "document or decision produced"
        }
      ],
      "decision_maker": "role",
      "gate_criteria": "what must be true to advance"
    }
  ]
}

Use these exact stage names: In Validation, In Fundraising, Active Ventures, Completed.
Include 4-8 specific steps per stage. Make steps realistic for Real Estate.`,
      },
    ],
  });

  const content = response.choices?.[0]?.message?.content;
  if (!content) {
    console.log("  ❌ LLM returned no content");
    return null;
  }

  let jsonStr = content;
  const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) jsonStr = jsonMatch[1];

  let blueprint;
  try {
    blueprint = JSON.parse(jsonStr.trim());
  } catch (e) {
    console.log("  ❌ Failed to parse LLM response as JSON:", e.message);
    console.log("  Raw response:", content.substring(0, 500));
    return null;
  }

  const stages = blueprint.stages || [];
  if (stages.length === 0) {
    console.log("  ❌ Blueprint has no stages");
    return null;
  }

  // Save template
  const [templateResult] = await db.insert(schema.processTemplates).values({
    organizationId: orgId,
    sector: "Real Estate",
    blueprintName: blueprint.blueprintName || "Real Estate Operations Blueprint",
    source: "auto_generated",
    extractionSource: "auto_generated",
    confidence: "Medium",
  });
  const templateId = templateResult.insertId;

  let stepCount = 0;
  for (const stage of stages) {
    const stageName = stage.stage_name || stage.stageName || "Unknown";
    const stageOrder = stage.stage_order || stage.stageOrder || 0;
    const steps = stage.steps || [];
    for (const step of steps) {
      await db.insert(schema.processSteps).values({
        templateId,
        stageName,
        stepName: step.name || step.stepName || "Unnamed Step",
        stepOrder: step.order || step.stepOrder || 0,
        stageOrder,
        isBlocking: step.is_blocking ?? step.isBlocking ?? false,
        whoOwns: step.who_owns || step.whoOwns || null,
        typicalDays: step.typical_days || step.estimatedDays || null,
        stepDescription: step.output || step.description || null,
      });
      stepCount++;
    }
  }

  console.log(`  ✅ Blueprint created (id=${templateId})`);
  console.log(`     Name: ${blueprint.blueprintName}`);
  console.log(`     Stages: ${stages.length}`);
  console.log(`     Total steps: ${stepCount}`);
  for (const stage of stages) {
    const steps = stage.steps || [];
    console.log(`       ${stage.stage_name || stage.stageName}: ${steps.length} steps`);
    for (const step of steps) {
      const blocking = step.is_blocking ? "🔒" : "  ";
      console.log(`         ${blocking} ${step.name || step.stepName} (${step.typical_days || "?"}d, ${step.who_owns || step.whoOwns || "?"})`);
    }
  }

  return templateId;
}

// ── Step 2: Auto-apply blueprint to ventures ────────────────────────────
async function step2_applyBlueprint(orgId, templateId) {
  console.log("\n═══════════════════════════════════════════════════════════════");
  console.log("  STEP 2: AUTO-APPLY BLUEPRINT TO ALL VENTURES");
  console.log("═══════════════════════════════════════════════════════════════\n");

  const steps = await db.select().from(schema.processSteps)
    .where(eq(schema.processSteps.templateId, templateId));

  const ventureIds = await getVentureIdsForOrg(orgId);
  const orgVentures = await db.select()
    .from(schema.ventures)
    .where(and(
      inArray(schema.ventures.id, ventureIds),
      eq(schema.ventures.sector, "Real Estate"),
    ));

  const STAGE_ORDER = {
    "In Validation": 1, "In Fundraising": 2, "Active Ventures": 3, "Completed": 4,
  };

  let appliedCount = 0;
  for (const venture of orgVentures) {
    // Check if already applied
    const [existing] = await db.select({ id: schema.ventureProcessTracking.id })
      .from(schema.ventureProcessTracking)
      .where(eq(schema.ventureProcessTracking.ventureId, venture.id))
      .limit(1);
    if (existing) {
      console.log(`  ⚡ ${venture.name} — already has tracking records`);
      continue;
    }

    let completedSteps = 0;
    let pendingSteps = 0;
    for (const step of steps) {
      const ventureStageOrder = STAGE_ORDER[venture.stage] || 0;
      const stepStageOrder = STAGE_ORDER[step.stageName] || 0;
      const isCompleted = stepStageOrder < ventureStageOrder;

      await db.insert(schema.ventureProcessTracking).values({
        ventureId: venture.id,
        templateId,
        stepId: step.id,
        stageName: step.stageName,
        stepName: step.stepName,
        stepOrder: step.stepOrder || 0,
        isBlocking: step.isBlocking,
        whoOwns: step.whoOwns,
        status: isCompleted ? "complete" : "pending",
        completedAt: isCompleted ? new Date() : null,
      });

      if (isCompleted) completedSteps++;
      else pendingSteps++;
    }

    console.log(`  ✅ ${venture.name} (${venture.stage}): ${completedSteps} complete, ${pendingSteps} pending`);
    appliedCount++;
  }

  console.log(`\n  Applied to ${appliedCount} ventures`);
  return appliedCount;
}

// ── Step 3: Recalculate health scores ───────────────────────────────────
async function step3_healthScores(orgId) {
  console.log("\n═══════════════════════════════════════════════════════════════");
  console.log("  STEP 3: RECALCULATE HEALTH SCORES");
  console.log("═══════════════════════════════════════════════════════════════\n");

  const ventureIds = await getVentureIdsForOrg(orgId);
  const orgVentures = await db.select().from(schema.ventures)
    .where(inArray(schema.ventures.id, ventureIds));

  for (const venture of orgVentures) {
    const ventureTasks = await db.select().from(schema.tasks)
      .where(eq(schema.tasks.ventureId, venture.id));
    const ventureRiskRows = await db.select().from(schema.ventureRisks)
      .where(eq(schema.ventureRisks.ventureId, venture.id));

    let score = 70;
    const completedTasks = ventureTasks.filter(t => t.status === "complete").length;
    const totalTasks = ventureTasks.length;
    if (totalTasks > 0) {
      const completionRate = completedTasks / totalTasks;
      score += Math.round(completionRate * 15);
    }
    const overdueTasks = ventureTasks.filter(t => {
      if (!t.dueDate || t.status === "complete") return false;
      return new Date(t.dueDate) < new Date();
    });
    score -= overdueTasks.length * 5;
    const activeRisks = ventureRiskRows.filter(r => r.status === "Monitoring");
    score -= activeRisks.length * 3;
    score = Math.max(0, Math.min(100, score));

    const oldScore = venture.healthScore;
    await db.update(schema.ventures).set({ healthScore: score })
      .where(eq(schema.ventures.id, venture.id));

    const delta = score - (oldScore || 0);
    const arrow = delta > 0 ? "↑" : delta < 0 ? "↓" : "→";
    console.log(`  ${venture.name}: ${oldScore} → ${score} ${arrow} (${totalTasks} tasks, ${overdueTasks.length} overdue, ${activeRisks.length} risks)`);
  }
}

// ── Step 4: Run Overdue Agent ───────────────────────────────────────────
async function step4_overdueAgent(orgId) {
  console.log("\n═══════════════════════════════════════════════════════════════");
  console.log("  STEP 4: RUN OVERDUE AGENT");
  console.log("═══════════════════════════════════════════════════════════════\n");

  const { runOverdueAgent } = await import("./server/routers/agents.ts");
  const signals = await runOverdueAgent(db, orgId);

  if (signals.length === 0) {
    console.log("  ℹ️  No overdue signals generated (tasks may have already been processed)");
  } else {
    console.log(`  ✅ ${signals.length} overdue signals generated:`);
    for (const s of signals) {
      const icon = s.severity === "critical" ? "🔴" : s.severity === "warning" ? "🟡" : "🔵";
      console.log(`    ${icon} [${s.agentName}] ${s.message}`);
    }
  }

  return signals;
}

// ── Step 5: Run Velocity Agent ──────────────────────────────────────────
async function step5_velocityAgent(orgId) {
  console.log("\n═══════════════════════════════════════════════════════════════");
  console.log("  STEP 5: RUN VELOCITY AGENT");
  console.log("═══════════════════════════════════════════════════════════════\n");

  const { runVelocityAgent } = await import("./server/routers/agents.ts");
  const signals = await runVelocityAgent(db, orgId);

  if (signals.length === 0) {
    console.log("  ℹ️  No velocity signals generated");
  } else {
    console.log(`  ✅ ${signals.length} velocity signals generated:`);
    for (const s of signals) {
      const icon = s.severity === "critical" ? "🔴" : s.severity === "warning" ? "🟡" : "🔵";
      console.log(`    ${icon} [${s.agentName}] ${s.message}`);
    }
  }

  return signals;
}

// ── Step 6: Run Distribution Sentinel ───────────────────────────────────
async function step6_distributionSentinel(orgId) {
  console.log("\n═══════════════════════════════════════════════════════════════");
  console.log("  STEP 6: RUN DISTRIBUTION SENTINEL");
  console.log("═══════════════════════════════════════════════════════════════\n");

  const { runDistributionSentinel } = await import("./server/routers/agents.ts");
  const signals = await runDistributionSentinel(db, orgId);

  if (signals.length === 0) {
    console.log("  ℹ️  No distribution signals generated");
  } else {
    console.log(`  ✅ ${signals.length} distribution signals generated:`);
    for (const s of signals) {
      const icon = s.severity === "critical" ? "🔴" : s.severity === "warning" ? "🟡" : "🔵";
      console.log(`    ${icon} [${s.agentName}] ${s.message}`);
    }
  }

  return signals;
}

// ── Step 7: Run Orchestrator ────────────────────────────────────────────
async function step7_orchestrator(orgId, allSubSignals) {
  console.log("\n═══════════════════════════════════════════════════════════════");
  console.log("  STEP 7: RUN ORCHESTRATOR (CROSS-AGENT CORRELATION)");
  console.log("═══════════════════════════════════════════════════════════════\n");

  const { runOrchestrator, persistSignals } = await import("./server/routers/agents.ts");
  const orchestratorSignals = await runOrchestrator(db, allSubSignals, orgId);

  const allSignals = [...allSubSignals, ...orchestratorSignals];
  await persistSignals(db, allSignals);

  console.log(`  ✅ Orchestrator generated ${orchestratorSignals.length} correlation signals`);
  console.log(`  📊 Total signals persisted: ${allSignals.length}`);

  for (const s of orchestratorSignals) {
    console.log(`    🧠 [${s.agentName}] ${s.message}`);
  }

  return allSignals;
}

// ── Step 8: Generate Daily Brief ────────────────────────────────────────
async function step8_dailyBrief(orgId) {
  console.log("\n═══════════════════════════════════════════════════════════════");
  console.log("  STEP 8: GENERATE DAILY BRIEF (LLM)");
  console.log("═══════════════════════════════════════════════════════════════\n");

  const { invokeLLM } = await import("./server/_core/llm.ts");

  // Gather context
  const ventureIds = await getVentureIdsForOrg(orgId);
  const allVentures = ventureIds.length > 0
    ? await db.select().from(schema.ventures).where(inArray(schema.ventures.id, ventureIds))
    : [];
  const allTasks = await db.select().from(schema.tasks).where(eq(schema.tasks.organizationId, orgId));
  const allSpvs = await db.select().from(schema.spvs).where(eq(schema.spvs.organizationId, orgId));
  const allDistributions = await db.select().from(schema.distributions).where(eq(schema.distributions.organizationId, orgId));
  const recentActivity = await db.select().from(schema.activityLog)
    .where(eq(schema.activityLog.organizationId, orgId))
    .orderBy(desc(schema.activityLog.createdAt)).limit(10);

  const overdueTasks = allTasks.filter(t => {
    if (!t.dueDate || t.status === "complete") return false;
    return new Date(t.dueDate) < new Date();
  });
  const activeVentures = allVentures.filter(v => v.status === "In progress");

  const contextSummary = `
Portfolio: ${allVentures.length} ventures (${activeVentures.length} active), ${allSpvs.length} SPVs
Tasks: ${allTasks.length} total, ${overdueTasks.length} overdue
Distributions: ${allDistributions.length} total
Active ventures: ${activeVentures.map(v => `${v.name} (${v.sector}, ${v.location}, health: ${v.healthScore})`).join("; ")}
Overdue tasks: ${overdueTasks.map(t => `"${t.title}" due ${t.dueDate}`).join("; ")}
Recent activity: ${recentActivity.slice(0, 5).map(a => `${a.action}: ${a.detail}`).join("; ")}
  `.trim();

  console.log("  🤖 Calling LLM to generate daily brief...\n");

  const result = await invokeLLM({
    messages: [
      {
        role: "system",
        content: `You are the AI intelligence officer for ATLAS, a multi-sector venture holding company. Generate a concise daily brief for the executive team. Be specific, actionable, and data-driven.`,
      },
      {
        role: "user",
        content: `Generate today's daily brief for Meridian Capital Group (Real Estate portfolio) based on this data:

${contextSummary}

Return JSON with:
- headline: one-line headline
- priorityItems: array of {type, description, venture, action, daysRemaining}
- portfolioHealth: "excellent"|"good"|"attention_needed"|"critical"
- recommendedActions: array of 3-5 specific actions
- winsThisWeek: array of 1-3 positive developments

Return ONLY valid JSON.`,
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "daily_brief",
        strict: true,
        schema: {
          type: "object",
          properties: {
            headline: { type: "string" },
            priorityItems: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  type: { type: "string" },
                  description: { type: "string" },
                  venture: { type: "string" },
                  action: { type: "string" },
                  daysRemaining: { type: "number" },
                },
                required: ["type", "description", "venture", "action", "daysRemaining"],
                additionalProperties: false,
              },
            },
            portfolioHealth: { type: "string" },
            recommendedActions: { type: "array", items: { type: "string" } },
            winsThisWeek: { type: "array", items: { type: "string" } },
          },
          required: ["headline", "priorityItems", "portfolioHealth", "recommendedActions", "winsThisWeek"],
          additionalProperties: false,
        },
      },
    },
  });

  const content = result.choices[0]?.message?.content;
  let brief;
  try {
    brief = JSON.parse(content);
  } catch {
    console.log("  ❌ Failed to parse daily brief JSON");
    console.log("  Raw:", content?.substring(0, 500));
    return null;
  }

  // Save to DB
  const today = new Date().toISOString().split("T")[0];
  await db.delete(schema.dailyBriefs).where(and(
    eq(schema.dailyBriefs.briefDate, today),
    eq(schema.dailyBriefs.organizationId, orgId),
  ));
  await db.insert(schema.dailyBriefs).values({
    organizationId: orgId,
    briefDate: today,
    headline: brief.headline,
    priorityItems: brief.priorityItems,
    portfolioHealth: brief.portfolioHealth,
    recommendedActions: brief.recommendedActions,
    winsThisWeek: brief.winsThisWeek,
  });

  console.log(`  📰 HEADLINE: ${brief.headline}`);
  console.log(`  🏥 Portfolio Health: ${brief.portfolioHealth}`);
  console.log(`\n  🔥 Priority Items:`);
  for (const item of brief.priorityItems || []) {
    console.log(`    [${item.type}] ${item.description}`);
    console.log(`      → ${item.action} (${item.venture})`);
  }
  console.log(`\n  ✅ Recommended Actions:`);
  for (const action of brief.recommendedActions || []) {
    console.log(`    • ${action}`);
  }
  console.log(`\n  🏆 Wins This Week:`);
  for (const win of brief.winsThisWeek || []) {
    console.log(`    🎉 ${win}`);
  }

  return brief;
}

// ── Step 9: Generate Smart Alerts ───────────────────────────────────────
async function step9_smartAlerts(orgId) {
  console.log("\n═══════════════════════════════════════════════════════════════");
  console.log("  STEP 9: GENERATE SMART ALERTS");
  console.log("═══════════════════════════════════════════════════════════════\n");

  const allTasks = await db.select().from(schema.tasks).where(eq(schema.tasks.organizationId, orgId));
  const ventureIds = await getVentureIdsForOrg(orgId);
  const allVentures = ventureIds.length > 0
    ? await db.select().from(schema.ventures).where(inArray(schema.ventures.id, ventureIds))
    : [];

  let alertCount = 0;
  for (const task of allTasks) {
    if (!task.dueDate || task.status === "complete") continue;
    const daysOverdue = Math.ceil((Date.now() - new Date(task.dueDate).getTime()) / (1000 * 60 * 60 * 24));
    if (daysOverdue > 0) {
      const venture = allVentures.find(v => v.id === task.ventureId);
      const [existing] = await db.select().from(schema.smartAlerts)
        .where(and(
          eq(schema.smartAlerts.entityType, "task"),
          eq(schema.smartAlerts.entityId, task.id),
          eq(schema.smartAlerts.alertType, "overdue_task"),
        )).limit(1);

      if (!existing) {
        await db.insert(schema.smartAlerts).values({
          organizationId: orgId,
          severity: daysOverdue > 7 ? "critical" : "warning",
          alertType: "overdue_task",
          message: `Task "${task.title}" is ${daysOverdue} days overdue${venture ? ` (${venture.name})` : ""}`,
          entityType: "task",
          entityId: task.id,
          entityName: task.title,
        });
        const icon = daysOverdue > 7 ? "🔴" : "🟡";
        console.log(`  ${icon} ${task.title} — ${daysOverdue} days overdue`);
        alertCount++;
      }
    }
  }

  console.log(`\n  ✅ ${alertCount} new smart alerts created`);
  return alertCount;
}

// ── Step 10: Generate AI Observations ───────────────────────────────────
async function step10_observations(orgId) {
  console.log("\n═══════════════════════════════════════════════════════════════");
  console.log("  STEP 10: GENERATE AI OBSERVATIONS (LLM)");
  console.log("═══════════════════════════════════════════════════════════════\n");

  const { invokeLLM } = await import("./server/_core/llm.ts");

  const ventureIds = await getVentureIdsForOrg(orgId);
  const allVentures = ventureIds.length > 0
    ? await db.select().from(schema.ventures).where(inArray(schema.ventures.id, ventureIds))
    : [];
  const allTasks = await db.select().from(schema.tasks).where(eq(schema.tasks.organizationId, orgId));
  const allTeam = await db.select().from(schema.teamMembers).where(eq(schema.teamMembers.organizationId, orgId));

  const context = `
Ventures: ${allVentures.map(v => `${v.name} (id:${v.id}, ${v.sector}, stage: ${v.stage}, status: ${v.status}, health: ${v.healthScore})`).join("; ")}
Tasks: ${allTasks.length} total, ${allTasks.filter(t => t.status !== "complete").length} open
Overdue: ${allTasks.filter(t => t.dueDate && t.status !== "complete" && new Date(t.dueDate) < new Date()).map(t => `"${t.title}" (${t.ventureLink})`).join("; ")}
Team: ${allTeam.map(t => `${t.name} (${t.role})`).join("; ")}
  `.trim();

  console.log("  🤖 Calling LLM to generate observations...\n");

  const result = await invokeLLM({
    messages: [
      {
        role: "system",
        content: `You are the AI intelligence officer for ATLAS. Generate 3-5 actionable observations about this Real Estate portfolio. Each observation should identify a pattern, risk, opportunity, or recommendation.`,
      },
      {
        role: "user",
        content: `Based on this Meridian Capital Group portfolio data, generate observations:

${context}

Return JSON with "observations" array, each with:
- observationType: "risk"|"opportunity"|"pattern"|"recommendation"|"anomaly"
- ventureId: number (use actual venture IDs from above) or 0 for portfolio-wide
- ventureName: string or empty
- observation: detailed observation text
- recommendedAction: what to do about it
- suggestedTaskTitle: a task title if one should be created, or empty string
- suggestedAssignee: team member name from list above, or empty string
- suggestedDueDays: number of days from now for the task, or 0

Return ONLY valid JSON.`,
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "observations",
        strict: true,
        schema: {
          type: "object",
          properties: {
            observations: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  observationType: { type: "string" },
                  ventureId: { type: "number" },
                  ventureName: { type: "string" },
                  observation: { type: "string" },
                  recommendedAction: { type: "string" },
                  suggestedTaskTitle: { type: "string" },
                  suggestedAssignee: { type: "string" },
                  suggestedDueDays: { type: "number" },
                },
                required: ["observationType", "ventureId", "ventureName", "observation", "recommendedAction", "suggestedTaskTitle", "suggestedAssignee", "suggestedDueDays"],
                additionalProperties: false,
              },
            },
          },
          required: ["observations"],
          additionalProperties: false,
        },
      },
    },
  });

  const content = result.choices[0]?.message?.content;
  let observations = [];
  try {
    const parsed = JSON.parse(content);
    observations = parsed.observations || [];
  } catch {
    console.log("  ❌ Failed to parse observations JSON");
    return 0;
  }

  let count = 0;
  for (const obs of observations) {
    await db.insert(schema.aiObservations).values({
      organizationId: orgId,
      observationType: obs.observationType || "recommendation",
      ventureId: obs.ventureId || null,
      ventureName: obs.ventureName || null,
      observation: obs.observation,
      recommendedAction: obs.recommendedAction || null,
      suggestedTaskTitle: obs.suggestedTaskTitle || null,
      suggestedAssignee: obs.suggestedAssignee || null,
      suggestedDueDays: obs.suggestedDueDays || 0,
    });
    const icon = obs.observationType === "risk" ? "⚠️" : obs.observationType === "opportunity" ? "💡" : "📊";
    console.log(`  ${icon} [${obs.observationType}] ${obs.observation}`);
    if (obs.recommendedAction) console.log(`     → ${obs.recommendedAction}`);
    if (obs.suggestedTaskTitle) console.log(`     📋 Suggested task: "${obs.suggestedTaskTitle}" → ${obs.suggestedAssignee || "unassigned"}`);
    console.log();
    count++;
  }

  console.log(`  ✅ ${count} AI observations generated and saved`);
  return count;
}

// ── MAIN ────────────────────────────────────────────────────────────────
async function main() {
  console.log("╔══════════════════════════════════════════════════════════════╗");
  console.log("║  ATLAS AI PIPELINE — END-TO-END TEST                       ║");
  console.log("║  Client: Meridian Capital Group                            ║");
  console.log("║  Sector: Real Estate                                       ║");
  console.log("╚══════════════════════════════════════════════════════════════╝");

  const orgId = await getOrgId();
  console.log(`\n  Organization ID: ${orgId}`);

  // Step 1: Generate blueprint
  const templateId = await step1_generateBlueprint(orgId);
  if (!templateId) {
    console.log("\n❌ Blueprint generation failed. Aborting.");
    process.exit(1);
  }

  // Step 2: Apply blueprint to ventures
  await step2_applyBlueprint(orgId, templateId);

  // Step 3: Health scores
  await step3_healthScores(orgId);

  // Step 4: Overdue agent
  const overdueSignals = await step4_overdueAgent(orgId);

  // Step 5: Velocity agent
  const velocitySignals = await step5_velocityAgent(orgId);

  // Step 6: Distribution sentinel
  const distSignals = await step6_distributionSentinel(orgId);

  // Step 7: Orchestrator
  const allSubSignals = [...overdueSignals, ...velocitySignals, ...distSignals];
  await step7_orchestrator(orgId, allSubSignals);

  // Step 8: Daily brief
  await step8_dailyBrief(orgId);

  // Step 9: Smart alerts
  await step9_smartAlerts(orgId);

  // Step 10: AI observations
  await step10_observations(orgId);

  // ── Final Summary ─────────────────────────────────────────────────────
  console.log("\n╔══════════════════════════════════════════════════════════════╗");
  console.log("║  ✅ AI PIPELINE TEST COMPLETE                              ║");
  console.log("╠══════════════════════════════════════════════════════════════╣");

  // Count what we generated
  const events = await db.select().from(schema.agentEvents)
    .where(eq(schema.agentEvents.organizationId, orgId));
  const drafts = await db.select().from(schema.agentDrafts)
    .where(eq(schema.agentDrafts.organizationId, orgId));
  const alerts = await db.select().from(schema.smartAlerts)
    .where(eq(schema.smartAlerts.organizationId, orgId));
  const obs = await db.select().from(schema.aiObservations)
    .where(eq(schema.aiObservations.organizationId, orgId));
  const briefs = await db.select().from(schema.dailyBriefs)
    .where(eq(schema.dailyBriefs.organizationId, orgId));
  const tracking = await db.select().from(schema.ventureProcessTracking)
    .where(inArray(schema.ventureProcessTracking.ventureId, await getVentureIdsForOrg(orgId)));

  console.log(`║  Agent Events:      ${String(events.length).padEnd(37)}║`);
  console.log(`║  Agent Drafts:      ${String(drafts.length).padEnd(37)}║`);
  console.log(`║  Smart Alerts:      ${String(alerts.length).padEnd(37)}║`);
  console.log(`║  AI Observations:   ${String(obs.length).padEnd(37)}║`);
  console.log(`║  Daily Briefs:      ${String(briefs.length).padEnd(37)}║`);
  console.log(`║  Process Tracking:  ${String(tracking.length).padEnd(37)}║`);
  console.log("╚══════════════════════════════════════════════════════════════╝");

  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Pipeline test failed:", err);
  process.exit(1);
});
