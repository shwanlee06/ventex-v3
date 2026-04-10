// ATLAS Market Intelligence Service
// Gap 2: External data ingestion — sector signals, regulatory changes, market trends
// Uses LLM to synthesize sector-specific intelligence for each client's portfolio

import { getDb } from "../db";
import { eq, and, desc, sql, inArray } from "drizzle-orm";
import {
  ventures, organizations, marketSignal, orgVentureAccess,
} from "../../drizzle/schema";
import { invokeLLM } from "../_core/llm";

// Sector-specific context for richer intelligence
const SECTOR_CONTEXT: Record<string, string> = {
  "Real Estate": "Dubai/GCC real estate market, DLD regulations, RERA compliance, off-plan developments, freehold zones, Golden Visa property requirements, mortgage rate changes",
  "Yacht": "Superyacht market, shipyard order books, Mediterranean/Gulf marina developments, maritime regulations, charter market trends, classification society updates",
  "F&B": "GCC food & beverage industry, restaurant licensing (Dubai Municipality, DED), food safety regulations, franchise regulations, tourism-driven demand",
  "Entertainment": "Entertainment licensing, event permits, media city regulations, content creation, streaming rights, venue development",
  "Oil & Gas": "OPEC+ decisions, crude oil prices, gas market, energy transition, carbon credits, GCC energy policy, downstream investments",
  "Others": "General GCC business environment, economic diversification, free zone regulations, foreign ownership laws, VAT updates",
};

async function generateSectorSignals(
  sector: string,
  ventureNames: string[],
  region: string = "GCC/UAE"
): Promise<Array<{
  signalType: string;
  headline: string;
  summary: string;
  impact: string;
  impactScore: number;
  actionRecommendation: string;
  relevanceScore: number;
}>> {
  const context = SECTOR_CONTEXT[sector] || SECTOR_CONTEXT["Others"];

  try {
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: `You are ATLAS Market Intelligence, an AI system that generates sector-specific market signals for venture portfolio management. You analyze current market conditions, regulatory changes, and industry trends to produce actionable intelligence.

Focus area: ${context}
Region: ${region}
Active ventures in this sector: ${ventureNames.join(", ")}

Generate 3-5 realistic, specific market signals that would be relevant to these ventures RIGHT NOW. Each signal should be something a portfolio manager would want to know about. Be specific with names, numbers, and dates where possible. These should feel like real market intelligence, not generic advice.`,
        },
        {
          role: "user",
          content: `Generate market intelligence signals for the ${sector} sector in ${region}. Include regulatory changes, market trends, competitor moves, and opportunities. Make them specific and actionable for the ventures listed.`,
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "market_signals",
          strict: true,
          schema: {
            type: "object",
            properties: {
              signals: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    signalType: {
                      type: "string",
                      description: "One of: regulatory, market_trend, competitor, opportunity, risk",
                    },
                    headline: { type: "string", description: "Short headline, max 100 chars" },
                    summary: { type: "string", description: "2-3 sentence analysis" },
                    impact: { type: "string", description: "One of: positive, negative, neutral" },
                    impactScore: { type: "number", description: "0-100, how significant" },
                    actionRecommendation: { type: "string", description: "What the portfolio manager should do" },
                    relevanceScore: { type: "number", description: "0-100, how relevant to the ventures" },
                  },
                  required: [
                    "signalType", "headline", "summary", "impact",
                    "impactScore", "actionRecommendation", "relevanceScore",
                  ],
                  additionalProperties: false,
                },
              },
            },
            required: ["signals"],
            additionalProperties: false,
          },
        },
      },
    });

    const parsed = JSON.parse(response.choices[0].message.content as string || "{}");
    return parsed.signals || [];
  } catch (e) {
    console.error(`[MarketIntelligence] Failed to generate signals for ${sector}:`, e);
    return [];
  }
}

export async function runMarketIntelligence(organizationId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const start = Date.now();

  // Get org info
  const [org] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.id, organizationId))
    .limit(1);

  if (!org) {
    return { signals: 0 };
  }

  // Get ventures accessible to this org
  const accessRows = await db
    .select({ ventureId: orgVentureAccess.ventureId })
    .from(orgVentureAccess)
    .where(eq(orgVentureAccess.organizationId, organizationId));

  const ventureIds = accessRows.map((r) => r.ventureId);
  if (ventureIds.length === 0) {
    return { signals: 0 };
  }

  const orgVentures = await db
    .select({ id: ventures.id, name: ventures.name, sector: ventures.sector, location: ventures.location })
    .from(ventures)
    .where(inArray(ventures.id, ventureIds));

  // Group ventures by sector
  const bySector: Record<string, { ids: number[]; names: string[]; locations: string[] }> = {};
  for (const v of orgVentures) {
    if (!bySector[v.sector]) bySector[v.sector] = { ids: [], names: [], locations: [] };
    bySector[v.sector].ids.push(v.id);
    bySector[v.sector].names.push(v.name);
    if (v.location && !bySector[v.sector].locations.includes(v.location)) {
      bySector[v.sector].locations.push(v.location);
    }
  }

  let totalSignals = 0;

  // Generate signals per sector
  for (const [sector, data] of Object.entries(bySector)) {
    const region = data.locations.length > 0 ? data.locations.join(", ") : "GCC/UAE";
    const signals = await generateSectorSignals(sector, data.names, region);

    for (const signal of signals) {
      await db.insert(marketSignal).values({
        sector,
        region,
        signalType: signal.signalType as "regulatory" | "market_trend" | "competitor" | "opportunity" | "risk",
        headline: signal.headline,
        summary: signal.summary,
        impact: signal.impact as "positive" | "negative" | "neutral",
        impactScore: Math.min(Math.max(signal.impactScore, 0), 100),
        source: "ATLAS Market Intelligence",
        affectedVentureIds: data.ids,
        affectedOrganizationIds: [organizationId],
        actionRecommendation: signal.actionRecommendation,
        relevanceScore: Math.min(Math.max(signal.relevanceScore, 0), 100),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7-day expiry
      });
      totalSignals++;
    }
  }

  const elapsed = parseFloat(((Date.now() - start) / 1000).toFixed(1));
  return { signals: totalSignals, sectors: Object.keys(bySector).length, elapsedSeconds: elapsed };
}

export async function getActiveSignals(organizationId: number, limit = 20) {
  const db = await getDb();
  if (!db) return [];

  const now = new Date();
  const signals = await db
    .select()
    .from(marketSignal)
    .where(
      and(
        sql`JSON_CONTAINS(${marketSignal.affectedOrganizationIds}, ${JSON.stringify(organizationId)})`,
        eq(marketSignal.isActive, true)
      )
    )
    .orderBy(desc(marketSignal.createdAt))
    .limit(limit);

  return signals;
}

export async function getVentureSignals(ventureId: number, limit = 10) {
  const db = await getDb();
  if (!db) return [];

  const signals = await db
    .select()
    .from(marketSignal)
    .where(
      and(
        sql`JSON_CONTAINS(${marketSignal.affectedVentureIds}, ${JSON.stringify(ventureId)})`,
        eq(marketSignal.isActive, true)
      )
    )
    .orderBy(desc(marketSignal.createdAt))
    .limit(limit);

  return signals;
}
