// AI Chat Streaming Endpoint — SSE for real-time token delivery
// Uses LIVE database context — org-scoped when organizationId provided

import { Router, Request, Response } from "express";
import { ENV } from "../_core/env";
import { getDb } from "../db";
import {
  ventures, tasks, spvs, distributions, teamMembers,
  documentIntelligence, ventureRisks, dailyBriefs, smartAlerts,
  aiObservations, orgVentureAccess, organizations,
} from "../../drizzle/schema";
import { desc, eq, inArray } from "drizzle-orm";


/**
 * Build live context — optionally scoped to a specific organization.
 * When orgId is provided, only that client's ventures/tasks/SPVs/team are included.
 * When orgId is null/undefined, ALL data is included (admin global view).
 */
async function buildLiveContext(orgId?: number | null): Promise<string> {
  try {
    const db = await getDb();
    if (!db) return "[Database unavailable — answering from general knowledge only]";

    // Determine venture scope
    let ventureIds: number[] | null = null;
    let orgName: string | null = null;

    if (orgId) {
      const accessRows = await db.select({ ventureId: orgVentureAccess.ventureId })
        .from(orgVentureAccess)
        .where(eq(orgVentureAccess.organizationId, orgId));
      ventureIds = accessRows.map(r => r.ventureId);

      const [org] = await db.select({ name: organizations.name })
        .from(organizations)
        .where(eq(organizations.id, orgId))
        .limit(1);
      orgName = org?.name || null;
    }

    // Fetch data — scoped if ventureIds available
    const allVentures = ventureIds && ventureIds.length > 0
      ? await db.select().from(ventures).where(inArray(ventures.id, ventureIds))
      : ventureIds && ventureIds.length === 0
        ? []
        : await db.select().from(ventures);

    const allTasks = ventureIds && ventureIds.length > 0
      ? await db.select().from(tasks).where(inArray(tasks.ventureId, ventureIds))
      : ventureIds && ventureIds.length === 0
        ? []
        : await db.select().from(tasks);

    const allSpvs = orgId
      ? await db.select().from(spvs).where(eq(spvs.organizationId, orgId))
      : await db.select().from(spvs);

    const allDist = orgId
      ? await db.select().from(distributions).where(eq(distributions.organizationId, orgId))
      : await db.select().from(distributions);

    const allTeam = orgId
      ? await db.select().from(teamMembers).where(eq(teamMembers.organizationId, orgId))
      : await db.select().from(teamMembers);

    const recentDocs = await db.select().from(documentIntelligence)
      .where(eq(documentIntelligence.processingStatus, "completed"))
      .orderBy(desc(documentIntelligence.processedAt)).limit(10);

    const allRisks = await db.select().from(ventureRisks);

    const latestBrief = await db.select().from(dailyBriefs)
      .orderBy(desc(dailyBriefs.generatedAt)).limit(1);

    const alerts = await db.select().from(smartAlerts)
      .where(eq(smartAlerts.dismissed, 0)).limit(10);

    const observations = await db.select().from(aiObservations)
      .where(eq(aiObservations.dismissed, 0)).limit(5);

    const overdueTasks = allTasks.filter((t: any) => {
      if (!t.dueDate || t.status === "complete") return false;
      return new Date(t.dueDate) < new Date();
    });

    const activeVentures = allVentures.filter((v: any) => v.status === "In progress");
    const activeSpvs = allSpvs.filter((s: any) => s.stage === "Active deal" || s.stage === "In negotiation");

    const scopeLabel = orgName ? `CLIENT: ${orgName}` : "ALL CLIENTS (GLOBAL VIEW)";

    let context = `
=== LIVE PORTFOLIO DATA — ${scopeLabel} ===

VENTURES (${allVentures.length} total, ${activeVentures.length} active):
${allVentures.map((v: any) => `- ${v.name} | ${v.sector || v.theme || "N/A"} | ${v.location || "N/A"} | Status: ${v.status} | Health: ${v.healthScore || "N/A"}/100`).join("\n")}

TASKS (${allTasks.length} total, ${overdueTasks.length} overdue):
${allTasks.slice(0, 30).map((t: any) => `- [${t.status}] ${t.title}${t.dueDate ? ` (due: ${t.dueDate})` : ""}${t.priority ? ` [${t.priority}]` : ""}`).join("\n")}

SPVs (${allSpvs.length} total, ${activeSpvs.length} active):
${allSpvs.map((s: any) => `- ${s.name} | ${s.theme} | Stage: ${s.stage} | Priority: ${s.priority}`).join("\n")}

TEAM (${allTeam.length} members):
${allTeam.map((t: any) => `- ${t.name} (${t.role})`).join("\n")}

DISTRIBUTIONS: ${allDist.length} total, ${allDist.filter((d: any) => d.status === "Paid").length} paid
`;

    if (allRisks.length > 0) {
      context += `\nIDENTIFIED RISKS (${allRisks.length}):\n${allRisks.slice(0, 10).map((r: any) => `- [${r.status}] ${r.riskDescription}`).join("\n")}\n`;
    }

    if (recentDocs.length > 0) {
      context += `\nRECENT DOCUMENT INTELLIGENCE (${recentDocs.length} analyzed):\n${recentDocs.map((d: any) => `- [${d.documentType}] ${d.summary?.slice(0, 150)}`).join("\n")}\n`;
    }

    if (latestBrief.length > 0) {
      const brief = latestBrief[0];
      context += `\nLATEST DAILY BRIEF (${brief.briefDate}):\nHeadline: ${brief.headline}\nPortfolio Health: ${brief.portfolioHealth}\n`;
    }

    if (alerts.length > 0) {
      context += `\nACTIVE SMART ALERTS:\n${alerts.map((a: any) => `- [${a.severity}] ${a.message}`).join("\n")}\n`;
    }

    if (observations.length > 0) {
      context += `\nAI OBSERVATIONS:\n${observations.map((o: any) => `- [${o.observationType}] ${o.observation}`).join("\n")}\n`;
    }

    return context;
  } catch (e) {
    console.error("[AI Stream] Failed to build live context:", e);
    return "[Database query failed — answering from general knowledge only]";
  }
}

const BASE_SYSTEM_PROMPT = `You are the VENTEX Venture Intelligence Operations assistant.

You serve as an AI-powered operations assistant for a multi-sector venture holding company. The company manages ventures across Real Estate, F&B, Yacht, Entertainment, Oil & Gas, and other sectors.

Your capabilities:
1. Answer questions about venture operations, SPV pipeline, team, and distributions using LIVE DATA
2. Draft professional communications (LP updates, investor memos, internal briefs)
3. Provide strategic analysis and recommendations based on actual portfolio data
4. Help with task prioritization and operational planning
5. Analyze document intelligence findings and surface insights
6. Reference specific risks, deadlines, and action items from processed documents
7. Provide venture health assessments based on real metrics

Communication style:
- Professional, concise, and data-driven
- Use markdown formatting for structured responses
- When drafting emails or communications, mark them as requiring approval
- Reference specific ventures, SPVs, and team members by name when relevant
- Use tables for comparative data when appropriate
- When scoped to a specific client, focus answers on that client's portfolio only
- When in global view, provide cross-client comparisons and portfolio-wide insights

Important: Always use the live portfolio data provided below to answer questions accurately. Do not make up data.`;

const resolveApiUrl = () =>
  ENV.forgeApiUrl && ENV.forgeApiUrl.trim().length > 0
    ? `${ENV.forgeApiUrl.replace(/\/$/, "")}/v1/chat/completions`
    : "https://forge.manus.im/v1/chat/completions";

export const aiStreamRouter = Router();

aiStreamRouter.post("/api/ai/stream", async (req: Request, res: Response) => {
  const { messages, organizationId } = req.body;

  if (!messages || !Array.isArray(messages)) {
    res.status(400).json({ error: "messages array required" });
    return;
  }

  if (!ENV.forgeApiKey) {
    res.status(500).json({ error: "API key not configured" });
    return;
  }

  // Build live context from database — scoped to org if provided
  const liveContext = await buildLiveContext(organizationId || null);
  const systemPrompt = `${BASE_SYSTEM_PROMPT}\n\n${liveContext}`;

  // Set SSE headers
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  const llmMessages = [
    { role: "system", content: systemPrompt },
    ...messages.map((m: { role: string; content: string | Array<unknown> }) => ({
      role: m.role,
      content: m.content,
    })),
  ];

  try {
    const response = await fetch(resolveApiUrl(), {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${ENV.forgeApiKey}`,
      },
      body: JSON.stringify({
        model: "gemini-2.5-flash",
        messages: llmMessages,
        max_tokens: 4096,
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      res.write(
        `data: ${JSON.stringify({ error: `LLM error: ${response.status} ${errorText}` })}\n\n`
      );
      res.write("data: [DONE]\n\n");
      res.end();
      return;
    }

    const reader = response.body?.getReader();
    if (!reader) {
      res.write(
        `data: ${JSON.stringify({ error: "No response body" })}\n\n`
      );
      res.write("data: [DONE]\n\n");
      res.end();
      return;
    }

    const decoder = new TextDecoder();
    let buffer = "";

    // Track if client disconnects
    let clientDisconnected = false;
    req.on("close", () => {
      clientDisconnected = true;
      reader.cancel();
    });

    while (!clientDisconnected) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // Process complete SSE lines from the upstream
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        if (trimmed === "data: [DONE]") {
          res.write("data: [DONE]\n\n");
          continue;
        }

        if (trimmed.startsWith("data: ")) {
          const jsonStr = trimmed.slice(6);
          try {
            const chunk = JSON.parse(jsonStr);
            const delta = chunk.choices?.[0]?.delta;

            if (delta?.content) {
              res.write(
                `data: ${JSON.stringify({ content: delta.content })}\n\n`
              );
            }

            // Check for finish
            if (chunk.choices?.[0]?.finish_reason) {
              res.write(
                `data: ${JSON.stringify({ finish_reason: chunk.choices[0].finish_reason, model: chunk.model || "ventex-intelligence" })}\n\n`
              );
            }
          } catch {
            // Skip malformed JSON chunks
          }
        }
      }
    }

    // Process any remaining buffer
    if (buffer.trim()) {
      const trimmed = buffer.trim();
      if (trimmed === "data: [DONE]") {
        res.write("data: [DONE]\n\n");
      } else if (trimmed.startsWith("data: ")) {
        try {
          const chunk = JSON.parse(trimmed.slice(6));
          const delta = chunk.choices?.[0]?.delta;
          if (delta?.content) {
            res.write(
              `data: ${JSON.stringify({ content: delta.content })}\n\n`
            );
          }
        } catch {
          // Skip
        }
      }
    }

    if (!clientDisconnected) {
      res.write("data: [DONE]\n\n");
      res.end();
    }
  } catch (error) {
    console.error("[AI Stream] Error:", error);
    if (!res.writableEnded) {
      res.write(
        `data: ${JSON.stringify({ error: error instanceof Error ? error.message : "Stream failed" })}\n\n`
      );
      res.write("data: [DONE]\n\n");
      res.end();
    }
  }
});
