/**
 * Sanctions Screening Module — VENTEX Compliance
 *
 * Provides automated screening of entities (individuals and organizations)
 * against global sanctions lists. This module is designed to integrate with
 * external sanctions screening APIs (e.g., Dow Jones, Refinitiv World-Check,
 * ComplyAdvantage, Sanctions.io).
 *
 * IMPORTANT: This is a placeholder implementation. Before going live:
 * 1. Select and contract with a sanctions screening provider
 * 2. Implement the provider-specific API integration
 * 3. Configure webhook callbacks for ongoing monitoring
 * 4. Set up audit trail for all screening decisions
 * 5. Legal review of screening thresholds and escalation procedures
 */

import { getDb } from "../db";
import { organizations, contacts } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ScreeningRequest {
  entityType: "individual" | "organization";
  name: string;
  /** ISO-3166-1 alpha-2 country code */
  country?: string;
  /** Date of birth for individuals (YYYY-MM-DD) */
  dateOfBirth?: string;
  /** Registration number for organizations */
  registrationNumber?: string;
  /** Organization ID in VENTEX for audit trail */
  organizationId?: number;
}

export interface ScreeningMatch {
  listName: string;           // e.g., "OFAC SDN", "EU Consolidated", "UN Sanctions"
  matchScore: number;         // 0-100 confidence score
  matchedName: string;        // Name as it appears on the list
  matchType: "exact" | "fuzzy" | "alias";
  listSource: string;         // Provider-specific list identifier
  listDate: string;           // When the list was last updated
  details?: string;           // Additional context
}

export interface ScreeningResult {
  requestId: string;
  status: "clear" | "potential_match" | "confirmed_match" | "error";
  screenedAt: string;
  matches: ScreeningMatch[];
  provider: string;
  /** Whether manual review is required */
  requiresReview: boolean;
  /** Risk score: 0 (no risk) to 100 (confirmed match) */
  riskScore: number;
}

// ─── Configuration ───────────────────────────────────────────────────────────

/** Supported sanctions screening providers */
export type ScreeningProvider = "sanctions_io" | "complyadvantage" | "dow_jones" | "refinitiv" | "manual";

interface ProviderConfig {
  provider: ScreeningProvider;
  apiKey?: string;
  apiUrl?: string;
  /** Minimum match score to flag for review (0-100) */
  reviewThreshold: number;
  /** Minimum match score to auto-block (0-100) */
  blockThreshold: number;
  /** Lists to screen against */
  lists: string[];
}

const DEFAULT_CONFIG: ProviderConfig = {
  provider: "manual",
  reviewThreshold: 70,
  blockThreshold: 95,
  lists: [
    "OFAC_SDN",           // US Office of Foreign Assets Control
    "OFAC_CONSOLIDATED",  // US OFAC Consolidated
    "EU_CONSOLIDATED",    // EU Consolidated Sanctions
    "UN_SANCTIONS",       // United Nations Security Council
    "UK_HMT",            // UK HM Treasury
    "FATF_BLACKLIST",    // Financial Action Task Force
  ],
};

// ─── Core Screening Function ─────────────────────────────────────────────────

/**
 * Screen an entity against sanctions lists.
 *
 * In the placeholder implementation, this always returns "clear".
 * Replace the body with actual API calls when a provider is selected.
 */
export async function screenEntity(
  request: ScreeningRequest,
  config: ProviderConfig = DEFAULT_CONFIG
): Promise<ScreeningResult> {
  const requestId = `SCR-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  // ── Placeholder: Replace with actual provider API call ──
  if (config.provider === "manual") {
    return {
      requestId,
      status: "clear",
      screenedAt: new Date().toISOString(),
      matches: [],
      provider: "manual",
      requiresReview: false,
      riskScore: 0,
    };
  }

  // ── Example: sanctions.io integration (uncomment when ready) ──
  // if (config.provider === "sanctions_io") {
  //   const response = await fetch(`${config.apiUrl}/search`, {
  //     method: "POST",
  //     headers: {
  //       "Authorization": `Bearer ${config.apiKey}`,
  //       "Content-Type": "application/json",
  //     },
  //     body: JSON.stringify({
  //       name: request.name,
  //       type: request.entityType === "individual" ? "person" : "entity",
  //       country: request.country,
  //       date_of_birth: request.dateOfBirth,
  //       sources: config.lists,
  //       min_score: config.reviewThreshold,
  //     }),
  //   });
  //   const data = await response.json();
  //   // Map provider response to ScreeningResult...
  // }

  return {
    requestId,
    status: "clear",
    screenedAt: new Date().toISOString(),
    matches: [],
    provider: config.provider,
    requiresReview: false,
    riskScore: 0,
  };
}

// ─── Batch Screening ─────────────────────────────────────────────────────────

/**
 * Screen all contacts for an organization.
 * Returns screening results for each contact.
 */
export async function screenOrganizationContacts(
  organizationId: number
): Promise<{ contact: string; result: ScreeningResult }[]> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [org] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.id, organizationId))
    .limit(1);

  if (!org) throw new Error("Organization not found");

  const orgContacts = await db
    .select()
    .from(contacts)
    .where(eq(contacts.organizationId, organizationId));

  const results: { contact: string; result: ScreeningResult }[] = [];

  // Screen the organization itself
  const orgResult = await screenEntity({
    entityType: "organization",
    name: org.name,
    registrationNumber: org.registrationNumber || undefined,
    organizationId,
  });
  results.push({ contact: `[ORG] ${org.name}`, result: orgResult });

  // Screen each contact
  for (const contact of orgContacts) {
    const contactResult = await screenEntity({
      entityType: "individual",
      name: contact.name,
      organizationId,
    });
    results.push({ contact: contact.name, result: contactResult });
  }

  return results;
}

// ─── Screening Decision Helper ───────────────────────────────────────────────

/**
 * Determine the action to take based on screening results.
 */
export function getScreeningDecision(
  result: ScreeningResult,
  config: ProviderConfig = DEFAULT_CONFIG
): "proceed" | "review" | "block" {
  if (result.status === "error") return "review";
  if (result.riskScore >= config.blockThreshold) return "block";
  if (result.riskScore >= config.reviewThreshold) return "review";
  return "proceed";
}

// ─── Supported Lists Reference ───────────────────────────────────────────────

export const SANCTIONS_LISTS = {
  OFAC_SDN: "US OFAC Specially Designated Nationals",
  OFAC_CONSOLIDATED: "US OFAC Consolidated Sanctions",
  EU_CONSOLIDATED: "EU Consolidated Financial Sanctions",
  UN_SANCTIONS: "UN Security Council Consolidated List",
  UK_HMT: "UK HM Treasury Financial Sanctions",
  FATF_BLACKLIST: "FATF High-Risk Jurisdictions",
  FATF_GREYLIST: "FATF Jurisdictions Under Increased Monitoring",
  PEP: "Politically Exposed Persons",
  ADVERSE_MEDIA: "Adverse Media Screening",
} as const;
