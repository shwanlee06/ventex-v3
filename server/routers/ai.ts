// AI Chat Router — Document-Aware Intelligence Agent

import { z } from "zod";
import { protectedProcedure, adminProcedure, router } from "../_core/trpc";
import { invokeLLM, type Message } from "../_core/llm";
import { enforceRateLimit } from "../security/rateLimit";
import { getDb } from "../db";
import {
  ventures, tasks, spvs, distributions, teamMembers,
  documentIntelligence, ventureRisks, dailyBriefs, smartAlerts,
  aiObservations, activityLog,
} from "../../drizzle/schema";
import { desc, eq } from "drizzle-orm";

async function buildLiveContext(): Promise<string> {
  try {
    const db = await getDb();
    if (!db) return "";

    const [allVentures, allTasks, allSpvs, allDist, allTeam, recentDocs, allRisks, latestBrief, alerts, observations] = await Promise.all([
      db.select().from(ventures),
      db.select().from(tasks),
      db.select().from(spvs),
      db.select().from(distributions),
      db.select().from(teamMembers),
      db.select().from(documentIntelligence).where(eq(documentIntelligence.processingStatus, "completed")).orderBy(desc(documentIntelligence.processedAt)).limit(10),
      db.select().from(ventureRisks),
      db.select().from(dailyBriefs).orderBy(desc(dailyBriefs.generatedAt)).limit(1),
      db.select().from(smartAlerts).where(eq(smartAlerts.dismissed, 0)).limit(10),
      db.select().from(aiObservations).where(eq(aiObservations.dismissed, 0)).limit(5),
    ]);

    const overdueTasks = allTasks.filter((t: any) => {
      if (!t.dueDate || t.status === "complete") return false;
      return new Date(t.dueDate) < new Date();
    });

    const activeVentures = allVentures.filter((v: any) => v.status === "In progress");
    const activeSpvs = allSpvs.filter((s: any) => s.stage === "Active deal" || s.stage === "In negotiation");

    let context = `
=== LIVE PORTFOLIO DATA ===

VENTURES (${allVentures.length} total, ${activeVentures.length} active):
${allVentures.map((v: any) => `- ${v.name} | ${v.sector} | ${v.location} | Status: ${v.status} | Health: ${v.healthScore || "N/A"}/100`).join("\n")}

TASKS (${allTasks.length} total, ${overdueTasks.length} overdue):
${allTasks.slice(0, 15).map((t: any) => `- [${t.status}] ${t.title}${t.dueDate ? ` (due: ${t.dueDate})` : ""}${t.priority ? ` [${t.priority}]` : ""}`).join("\n")}

SPVs (${allSpvs.length} total, ${activeSpvs.length} active):
${allSpvs.map((s: any) => `- ${s.name} | ${s.theme} | Stage: ${s.stage} | Priority: ${s.priority}`).join("\n")}

TEAM (${allTeam.length} members):
${allTeam.map((t: any) => `- ${t.name} (${t.role})`).join("\n")}

DISTRIBUTIONS: ${allDist.length} total, ${allDist.filter((d: any) => d.status === "Paid").length} paid

IDENTIFIED RISKS (${allRisks.length}):
${allRisks.slice(0, 10).map((r: any) => `- [${r.status}] ${r.riskDescription}`).join("\n")}
`;

    if (recentDocs.length > 0) {
      context += `\nRECENT DOCUMENT INTELLIGENCE (${recentDocs.length} analyzed):
${recentDocs.map((d: any) => `- [${d.documentType}] ${d.summary?.slice(0, 150)}`).join("\n")}
`;
    }

    if (latestBrief.length > 0) {
      const brief = latestBrief[0];
      context += `\nLATEST DAILY BRIEF (${brief.briefDate}):
Headline: ${brief.headline}
Portfolio Health: ${brief.portfolioHealth}
`;
    }

    if (alerts.length > 0) {
      context += `\nACTIVE SMART ALERTS:
${alerts.map((a: any) => `- [${a.severity}] ${a.message}`).join("\n")}
`;
    }

    if (observations.length > 0) {
      context += `\nAI OBSERVATIONS:
${observations.map((o: any) => `- [${o.observationType}] ${o.observation}`).join("\n")}
`;
    }

    return context;
  } catch (e) {
    console.error("Failed to build live context:", e);
    return "";
  }
}

const BASE_SYSTEM_PROMPT = `You are the ATLAS Venture Intelligence Operations assistant. You have LIVE access to the full portfolio database.

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
- When discussing documents, reference the specific findings from document intelligence

Important: Always use the live portfolio data provided below to answer questions accurately. Do not make up data.`;

const messageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string(),
});

export const aiRouter = router({
  // ATLAS-only: chat builds context from ALL ventures across all clients
  chat: adminProcedure
    .input(
      z.object({
        messages: z.array(messageSchema),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Rate limit: 30 AI calls per 10 minutes per user
      enforceRateLimit("aiChat", ctx.user.id);

      // Build live context from database
      const liveContext = await buildLiveContext();

      const systemPrompt = `${BASE_SYSTEM_PROMPT}

${liveContext}`;

      const llmMessages: Message[] = [
        { role: "system", content: systemPrompt },
        ...input.messages.map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        })),
      ];

      try {
        const result = await invokeLLM({
          messages: llmMessages,
          maxTokens: 4096,
        });

        const content = result.choices?.[0]?.message?.content;
        const textContent =
          typeof content === "string"
            ? content
            : Array.isArray(content)
              ? content
                  .filter((c) => c.type === "text")
                  .map((c) => (c as { type: "text"; text: string }).text)
                  .join("")
              : "I apologize, but I was unable to generate a response. Please try again.";

        // Check if the response contains a draft that needs approval
        const requiresApproval =
          textContent.toLowerCase().includes("draft") &&
          (textContent.toLowerCase().includes("email") ||
            textContent.toLowerCase().includes("memo") ||
            textContent.toLowerCase().includes("letter") ||
            textContent.toLowerCase().includes("approval"));

        return {
          content: textContent,
          requiresApproval,
          model: result.model || "atlas-intelligence",
        };
      } catch (error: unknown) {
        console.error("[AI Chat] Error:", error);
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        throw new Error(`AI response failed: ${errorMessage}`);
      }
    }),
});
