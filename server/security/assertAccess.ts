/**
 * Tenant Access Assertion Helpers
 * 
 * Shared functions for verifying entity ownership across procedures.
 * These provide Layer 2 defense (entity-level) on top of Layer 1 (org-level middleware).
 */

import { TRPCError } from "@trpc/server";
import { eq, and } from "drizzle-orm";
import { getDb } from "../db";
import { orgVentureAccess, processTemplates } from "../../drizzle/schema";
import { isVentexTeam } from "./rbac";

type UserCtx = { role: string; organizationId?: number | null };

/**
 * Asserts that the current user has access to a specific venture.
 * VENTEX team always has access. Client users must belong to the venture's org.
 * Uses orgVentureAccess junction table (ventures don't have organizationId directly).
 * Throws TRPCError NOT_FOUND if access is denied (to avoid leaking entity existence).
 */
export async function assertVentureAccess(user: UserCtx, ventureId: number): Promise<void> {
  if (isVentexTeam(user)) return; // VENTEX team has global access

  if (!user.organizationId) {
    throw new TRPCError({ code: "FORBIDDEN", message: "No organization assigned" });
  }

  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

  // Check if the venture is assigned to the user's org via the junction table
  const [access] = await db
    .select({ organizationId: orgVentureAccess.organizationId })
    .from(orgVentureAccess)
    .where(
      and(
        eq(orgVentureAccess.ventureId, ventureId),
        eq(orgVentureAccess.organizationId, user.organizationId)
      )
    )
    .limit(1);

  if (!access) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Venture not found" });
  }
}

/**
 * Asserts that the current user has access to a specific process template.
 * Templates have organizationId directly on the row.
 */
export async function assertTemplateAccess(user: UserCtx, templateId: number): Promise<void> {
  if (isVentexTeam(user)) return;

  if (!user.organizationId) {
    throw new TRPCError({ code: "FORBIDDEN", message: "No organization assigned" });
  }

  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

  const [template] = await db
    .select({ organizationId: processTemplates.organizationId })
    .from(processTemplates)
    .where(eq(processTemplates.id, templateId))
    .limit(1);

  if (!template) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Template not found" });
  }

  if (template.organizationId !== user.organizationId) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Template not found" });
  }
}

/**
 * Asserts that the current user belongs to the specified organization.
 * VENTEX team always passes. Client users must match their own org.
 */
export function assertOrgAccess(user: UserCtx, organizationId: number): void {
  if (isVentexTeam(user)) return;

  if (!user.organizationId || user.organizationId !== organizationId) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
  }
}

/**
 * Asserts that the current user is a VENTEX team member.
 * Throws FORBIDDEN if not.
 */
export function assertVentexTeam(user: UserCtx): void {
  if (!isVentexTeam(user)) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Access restricted to VENTEX team" });
  }
}
