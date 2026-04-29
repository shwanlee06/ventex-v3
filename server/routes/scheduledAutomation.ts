/**
 * Scheduled Automation Routes — /api/scheduled/*
 *
 * These endpoints are called by Manus scheduled tasks.
 * They use the platform's auto-injected cookie for auth (user role).
 *
 * Endpoints:
 *   POST /api/scheduled/pipeline-report   — Weekly pipeline summary
 *   POST /api/scheduled/stale-leads       — Flag stale investors
 *   POST /api/scheduled/email-finder      — Results from email research
 */

import { Router } from "express";
import { sdk } from "../_core/sdk";
import { notifyOwner } from "../_core/notification";
import {
  TABLES,
  getAllRecords,
  updateRecords,
  createPipelineTask,
  getStaleInvestors,
  getPipelineSummary,
  type InvestorFields,
} from "../airtable/client";

const router = Router();

// Auth middleware for scheduled tasks
async function authenticateScheduledTask(req: any, res: any, next: any) {
  try {
    const user = await sdk.authenticateRequest(req);
    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    // Scheduled tasks get "user" role, which is fine
    (req as any).user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Authentication failed" });
  }
}

// ─── POST /api/scheduled/pipeline-report ────────────────────────
router.post("/api/scheduled/pipeline-report", authenticateScheduledTask, async (req, res) => {
  try {
    const summary = await getPipelineSummary();

    // Get upcoming follow-ups (next 7 days)
    const allInvestors = await getAllRecords<InvestorFields>(TABLES.INVESTOR_POOL, {
      fields: ["Investor Name", "Pipeline Stage", "Priority", "Next Follow-Up", "Last Contacted", "Interest Level"],
    });

    const now = new Date();
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);

    const upcomingFollowUps = allInvestors.filter((r) => {
      const followUp = r.fields["Next Follow-Up"];
      if (!followUp) return false;
      const d = new Date(followUp);
      return d >= now && d <= nextWeek;
    });

    const overdueFollowUps = allInvestors.filter((r) => {
      const followUp = r.fields["Next Follow-Up"];
      if (!followUp) return false;
      return new Date(followUp) < now;
    });

    // Build report
    const stageLines = Object.entries(summary)
      .sort((a, b) => b[1] - a[1])
      .map(([stage, count]) => `  ${stage}: ${count}`)
      .join("\n");

    const followUpLines = upcomingFollowUps
      .map((r) => `  - ${r.fields["Investor Name"]} (${r.fields["Pipeline Stage"]}) - due ${r.fields["Next Follow-Up"]}`)
      .join("\n") || "  None scheduled";

    const overdueLines = overdueFollowUps
      .map((r) => `  - ${r.fields["Investor Name"]} (${r.fields["Pipeline Stage"]}) - was due ${r.fields["Next Follow-Up"]}`)
      .join("\n") || "  None";

    const report = `Weekly Investor Pipeline Report

Pipeline by Stage:
${stageLines}

Total investors: ${allInvestors.length}

Upcoming Follow-Ups (next 7 days): ${upcomingFollowUps.length}
${followUpLines}

Overdue Follow-Ups: ${overdueFollowUps.length}
${overdueLines}

Generated: ${new Date().toISOString().split("T")[0]}`;

    // Send notification to owner
    await notifyOwner({
      title: "Weekly Pipeline Report",
      content: report,
    });

    res.json({
      success: true,
      report,
      stats: {
        total: allInvestors.length,
        byStage: summary,
        upcomingFollowUps: upcomingFollowUps.length,
        overdueFollowUps: overdueFollowUps.length,
      },
    });
  } catch (err: any) {
    console.error("[Scheduled/PipelineReport] Error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/scheduled/stale-leads ────────────────────────────
router.post("/api/scheduled/stale-leads", authenticateScheduledTask, async (req, res) => {
  try {
    const staleDays = req.body?.staleDays || 10;
    const staleInvestors = await getStaleInvestors(staleDays);

    const results: string[] = [];

    for (const investor of staleInvestors) {
      const name = investor.fields["Investor Name"] || "Unknown";
      const stage = investor.fields["Pipeline Stage"] || "Unknown";
      const lastContacted = investor.fields["Last Contacted"] || "Never";

      // Create a follow-up task for each stale investor
      await createPipelineTask(investor.id, {
        title: `Follow up or nurture: ${name}`,
        type: "Follow-Up",
        dueDate: new Date(Date.now() + 3 * 86400000).toISOString().split("T")[0],
        description: `${name} has been in "${stage}" since ${lastContacted} (${staleDays}+ days). Either follow up or move to Nurture.`,
      });

      results.push(`${name} (${stage}, last contacted: ${lastContacted})`);
    }

    // Notify owner if there are stale leads
    if (results.length > 0) {
      await notifyOwner({
        title: `${results.length} Stale Leads Detected`,
        content: `The following investors have been stuck for ${staleDays}+ days without activity:\n\n${results.map((r) => `- ${r}`).join("\n")}\n\nFollow-up tasks have been created for each.`,
      });
    }

    res.json({
      success: true,
      staleCount: staleInvestors.length,
      staleDays,
      flagged: results,
    });
  } catch (err: any) {
    console.error("[Scheduled/StaleLeads] Error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/scheduled/email-finder ───────────────────────────
// This endpoint receives researched email results from the scheduled task agent
router.post("/api/scheduled/email-finder", authenticateScheduledTask, async (req, res) => {
  try {
    const { results } = req.body;

    if (!results || !Array.isArray(results)) {
      return res.status(400).json({ error: "Expected { results: [{ recordId, email, confidence }] }" });
    }

    const updates: Array<{ id: string; fields: Partial<InvestorFields> }> = [];
    const updated: string[] = [];

    for (const result of results) {
      if (result.recordId && result.email) {
        updates.push({
          id: result.recordId,
          fields: {
            "Contact Email": result.email,
            "Notes": `[Auto-found ${new Date().toISOString().split("T")[0]}] Email: ${result.email} (confidence: ${result.confidence || "medium"})`,
          },
        });
        updated.push(`${result.investorName || result.recordId}: ${result.email}`);
      }
    }

    if (updates.length > 0) {
      await updateRecords<InvestorFields>(TABLES.INVESTOR_POOL, updates);
    }

    // Notify owner
    if (updated.length > 0) {
      await notifyOwner({
        title: `${updated.length} Investor Emails Found`,
        content: `The email finder found contact emails for:\n\n${updated.map((u) => `- ${u}`).join("\n")}`,
      });
    }

    res.json({
      success: true,
      updatedCount: updates.length,
      updated,
    });
  } catch (err: any) {
    console.error("[Scheduled/EmailFinder] Error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

export const scheduledAutomationRouter = router;
