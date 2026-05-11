/**
 * Data Lifecycle Management Router
 * 
 * Provides endpoints for:
 * - Manual lifecycle sweep trigger (admin only)
 * - Activity scores for dashboard prioritization
 * - Stale data summary for "Needs Attention" section
 * - Lifecycle configuration per org
 */

import { z } from "zod";
import { router } from "../_core/trpc";
import { protectedProcedure, adminProcedure } from "../_core/trpc";
import {
  runLifecycleSweep,
  calculateActivityScores,
  getStaleDataSummary,
  runTaskEscalation,
  runHealthSweep,
  runSmartArchiving,
} from "../dataLifecycle";

export const dataLifecycleRouter = router({
  /**
   * Get activity scores for all entities in the user's org.
   * Used by the dashboard to prioritize items.
   */
  activityScores: protectedProcedure
    .input(z.object({
      limit: z.number().min(1).max(100).default(50),
      tier: z.enum(["active", "fading", "stale", "dormant", "all"]).default("all"),
    }).optional())
    .query(async ({ ctx, input }) => {
      const orgId = ctx.user.organizationId;
      if (!orgId) return [];

      const scores = await calculateActivityScores(orgId);
      const limit = input?.limit ?? 50;
      const tier = input?.tier ?? "all";

      const filtered = tier === "all" ? scores : scores.filter(s => s.visibilityTier === tier);
      return filtered.slice(0, limit);
    }),

  /**
   * Get stale data summary for the dashboard "Needs Attention" section.
   */
  staleDataSummary: protectedProcedure
    .query(async ({ ctx }) => {
      const orgId = ctx.user.organizationId;
      if (!orgId) return { dormantVentures: 0, staleTasks: 0, staleSpvs: 0, totalNeedsAttention: 0, items: [] };

      return getStaleDataSummary(orgId);
    }),

  /**
   * Manually trigger a lifecycle sweep for the admin's org.
   * Admin only — useful for testing or immediate cleanup.
   */
  triggerSweep: adminProcedure
    .mutation(async ({ ctx }) => {
      const orgId = ctx.user.organizationId;
      if (!orgId) throw new Error("No organization");

      const result = await runLifecycleSweep(orgId, "Manual trigger");
      return result;
    }),

  /**
   * Manually trigger just task escalation.
   */
  triggerTaskEscalation: adminProcedure
    .mutation(async ({ ctx }) => {
      const orgId = ctx.user.organizationId;
      if (!orgId) throw new Error("No organization");

      return runTaskEscalation(orgId);
    }),

  /**
   * Manually trigger just the health sweep.
   */
  triggerHealthSweep: adminProcedure
    .mutation(async ({ ctx }) => {
      const orgId = ctx.user.organizationId;
      if (!orgId) throw new Error("No organization");

      return runHealthSweep(orgId);
    }),

  /**
   * Manually trigger just smart archiving.
   */
  triggerArchiving: adminProcedure
    .mutation(async ({ ctx }) => {
      const orgId = ctx.user.organizationId;
      if (!orgId) throw new Error("No organization");

      return runSmartArchiving(orgId);
    }),
});
