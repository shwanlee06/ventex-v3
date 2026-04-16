import { z } from "zod";
import { publicProcedure, protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { distributions, activityLog, fxRates } from "../../drizzle/schema";
import { eq, desc, and } from "drizzle-orm";
import { isVentexTeam, logAudit } from "../security/rbac";
import { resolveOrgId } from "../security/orgScope";
import { createNotification, NOTIF_TYPES } from "../notificationHelper";
import { onDistributionScheduled } from "../intelligence/realtimeTriggers";

export const distributionsRouter = router({
  // List distributions — scoped by organizationId with cross-tenant isolation
  list: protectedProcedure
    .input(z.object({ organizationId: z.number().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return [];

      // Cross-tenant isolation: client users forced to their own org
      const effectiveOrgId = resolveOrgId(ctx.user, input?.organizationId);

      if (effectiveOrgId) {
        return db
          .select()
          .from(distributions)
          .where(eq(distributions.organizationId, effectiveOrgId))
          .orderBy(desc(distributions.createdAt));
      }

      // No org filter — only VENTEX team reaches here (resolveOrgId enforces this)
      return db.select().from(distributions).orderBy(desc(distributions.createdAt));
    }),

  create: protectedProcedure.input(z.object({
    name: z.string(),
    fund: z.string().optional(),
    amount: z.number(),
    currency: z.string().default("USD"),
    type: z.string().optional(),
    status: z.string().default("Scheduled"),
    method: z.string().optional(),
    notes: z.string().optional(),
    distributionDate: z.string().optional(),
    organizationId: z.number().optional(),
  })).mutation(async ({ input, ctx }) => {
    if (!isVentexTeam(ctx.user)) {
      throw new Error("Only VENTEX team can create distributions");
    }
    // WS9: Distribution tracking is display-only (no fund movement).
    // [LEGAL REVIEW REQUIRED] — If money movement is ever added, check enables_money_movement flag.
    // Current architecture: records distribution data only, does not initiate transfers.
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    await db.insert(distributions).values(input);
    await db.insert(activityLog).values({
      entityType: "distribution", entityName: input.name, action: "Distribution Created",
      detail: `Distribution "${input.name}" — $${input.amount.toLocaleString()} ${input.status}`, userName: ctx.user.name || "System",
      activitySource: "client_business", organizationId: input.organizationId ?? null,
    });

    await createNotification({
      type: input.status === "Paid" ? NOTIF_TYPES.DISTRIBUTION_PAID : NOTIF_TYPES.DISTRIBUTION_SCHEDULED,
      category: input.status === "Paid" ? "success" : "info",
      title: `Distribution: ${input.name}`,
      message: `$${input.amount.toLocaleString()} — ${input.status}`,
      entityType: "distribution",
      entityName: input.name,
      link: "/distributions",
      actorName: ctx.user.name || "System",
    });

    // Fire real-time trigger for velocity flywheel
    if (input.status === "Scheduled" && input.organizationId) {
      // Get the newly created distribution ID
      const [created] = await db.select({ id: distributions.id }).from(distributions)
        .where(eq(distributions.name, input.name)).orderBy(desc(distributions.createdAt)).limit(1);
      if (created) {
        onDistributionScheduled(
          input.organizationId, created.id, input.name,
          `$${input.amount.toLocaleString()} ${input.currency}`
        ).catch(() => {});
      }
    }

    return { success: true };
  }),

  update: protectedProcedure.input(z.object({
    id: z.number(),
    name: z.string().optional(),
    fund: z.string().optional(),
    amount: z.number().optional(),
    currency: z.string().optional(),
    type: z.string().optional(),
    status: z.string().optional(),
    method: z.string().optional(),
    notes: z.string().optional(),
    distributionDate: z.string().optional(),
    organizationId: z.number().optional(),
  })).mutation(async ({ input, ctx }) => {
    if (!isVentexTeam(ctx.user)) {
      throw new Error("Only VENTEX team can update distributions");
    }
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const { id, ...data } = input;
    await db.update(distributions).set(data).where(eq(distributions.id, id));
    const [updated] = await db.select().from(distributions).where(eq(distributions.id, id)).limit(1);
    if (updated) {
      await db.insert(activityLog).values({
        entityType: "distribution", entityId: id, entityName: updated.name,
        action: data.status === "Paid" ? "Distribution Paid" : "Distribution Updated",
        detail: `Distribution "${updated.name}" ${data.status ? `status → ${data.status}` : "updated"}`,
        userName: ctx.user.name || "System",
        activitySource: "client_business", organizationId: updated.organizationId ?? null,
      });
    }
    return { success: true };
  }),

  // FX Rate management — VENTEX team only
  listFxRates: protectedProcedure
    .input(z.object({ baseCurrency: z.string().default("USD") }).optional())
    .query(async ({ ctx, input }) => {
      if (!isVentexTeam(ctx.user)) throw new Error("Only VENTEX team can view FX rates");
      const db = await getDb();
      if (!db) return [];
      const base = input?.baseCurrency || "USD";
      return db.select().from(fxRates)
        .where(eq(fxRates.baseCurrency, base))
        .orderBy(desc(fxRates.createdAt))
        .limit(50);
    }),

  setFxRate: protectedProcedure
    .input(z.object({
      baseCurrency: z.string().default("USD"),
      targetCurrency: z.string(),
      rate: z.number().positive(),
      effectiveDate: z.string(),
      source: z.string().default("manual"),
    }))
    .mutation(async ({ input, ctx }) => {
      if (!isVentexTeam(ctx.user)) throw new Error("Only VENTEX team can set FX rates");
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db.insert(fxRates).values({
        baseCurrency: input.baseCurrency,
        targetCurrency: input.targetCurrency,
        rate: input.rate,
        inverseRate: 1 / input.rate,
        source: input.source,
        effectiveDate: input.effectiveDate,
      });
      await logAudit({
        userId: ctx.user.id,
        userName: ctx.user.name,
        action: "fx_rate_set",
        entityType: "fx_rate",
        entityName: input.targetCurrency,
        details: `Set ${input.baseCurrency}/${input.targetCurrency} = ${input.rate}`,
      });
      return { success: true };
    }),

  convertAmount: protectedProcedure
    .input(z.object({
      amount: z.number(),
      fromCurrency: z.string(),
      toCurrency: z.string(),
    }))
    .query(async ({ input }) => {
      if (input.fromCurrency === input.toCurrency) {
        return { convertedAmount: input.amount, rate: 1 };
      }
      const { getLatestRate } = await import("../currency");
      const rate = await getLatestRate(input.fromCurrency, input.toCurrency);
      if (rate === null) return { convertedAmount: null, rate: null, error: "No rate available" };
      return { convertedAmount: Math.round(input.amount * rate * 100) / 100, rate };
    }),

  supportedCurrencies: publicProcedure.query(async () => {
    const { SUPPORTED_CURRENCIES } = await import("../currency");
    return Object.entries(SUPPORTED_CURRENCIES).map(([code, meta]: [string, any]) => ({
      code,
      symbol: meta.symbol,
      name: meta.name,
      decimals: meta.decimals,
    }));
  }),

  // Metrics — scoped by org with cross-tenant isolation
  metrics: protectedProcedure
    .input(z.object({ organizationId: z.number().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return { total: 0, paid: 0, totalAmount: 0, paidAmount: 0 };

      // Cross-tenant isolation: client users forced to their own org
      const effectiveOrgId = resolveOrgId(ctx.user, input?.organizationId);

      let all;
      if (effectiveOrgId) {
        all = await db
          .select()
          .from(distributions)
          .where(eq(distributions.organizationId, effectiveOrgId));
      } else {
        all = await db.select().from(distributions);
      }

      return {
        total: all.length,
        paid: all.filter(d => d.status === "Paid").length,
        totalAmount: all.reduce((s, d) => s + (d.amount || 0), 0),
        paidAmount: all.filter(d => d.status === "Paid").reduce((s, d) => s + (d.amount || 0), 0),
      };
    }),
});
