import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { ventures, spvs, tasks, teamMembers, distributions, orgVentureAccess } from "../../drizzle/schema";
import { like, and, eq, inArray } from "drizzle-orm";
import { resolveOrgId } from "../security/orgScope";
import { isVentexTeam, resolveVentureScope } from "../security/rbac";

export const searchRouter = router({
  global: protectedProcedure
    .input(z.object({
      query: z.string().min(1),
      organizationId: z.number().optional(),
    }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) return { ventures: [], spvs: [], tasks: [], team: [], distributions: [] };

      const effectiveOrgId = resolveOrgId(ctx.user, input.organizationId);

      const q = `%${input.query}%`;

      // Resolve venture IDs for org scoping
      let ventureIds: number[] | null = null;
      if (effectiveOrgId) {
        ventureIds = await resolveVentureScope(ctx.user, effectiveOrgId);
      }

      // Build scoped queries
      const ventureWhere = ventureIds
        ? and(like(ventures.name, q), inArray(ventures.id, ventureIds.length > 0 ? ventureIds : [0]))
        : like(ventures.name, q);

      const taskWhere = ventureIds
        ? and(like(tasks.title, q), inArray(tasks.ventureId, ventureIds.length > 0 ? ventureIds : [0]))
        : like(tasks.title, q);

      const distWhere = effectiveOrgId
        ? and(like(distributions.name, q), eq(distributions.organizationId, effectiveOrgId))
        : like(distributions.name, q);

      const [ventureResults, spvResults, taskResults, teamResults, distResults] = await Promise.all([
        db.select({ id: ventures.id, name: ventures.name, sector: ventures.sector, slug: ventures.slug, status: ventures.status })
          .from(ventures).where(ventureWhere).limit(5),
        db.select({ id: spvs.id, name: spvs.name, sector: spvs.sector, slug: spvs.slug, stage: spvs.stage })
          .from(spvs).where(like(spvs.name, q)).limit(5),
        db.select({ id: tasks.id, title: tasks.title, status: tasks.status, priority: tasks.priority })
          .from(tasks).where(taskWhere).limit(5),
        db.select({ id: teamMembers.id, name: teamMembers.name, role: teamMembers.role, slug: teamMembers.slug })
          .from(teamMembers).where(like(teamMembers.name, q)).limit(5),
        db.select({ id: distributions.id, name: distributions.name, amount: distributions.amount, status: distributions.status })
          .from(distributions).where(distWhere).limit(5),
      ]);

      return {
        ventures: ventureResults,
        spvs: spvResults,
        tasks: taskResults,
        team: teamResults,
        distributions: distResults,
      };
    }),
});
