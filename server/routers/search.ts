import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { ventures, spvs, tasks, teamMembers, distributions } from "../../drizzle/schema";
import { like, sql } from "drizzle-orm";

export const searchRouter = router({
  global: publicProcedure.input(z.object({ query: z.string().min(1) })).query(async ({ input }) => {
    const db = await getDb();
    if (!db) return { ventures: [], spvs: [], tasks: [], team: [], distributions: [] };
    
    const q = `%${input.query}%`;
    
    const [ventureResults, spvResults, taskResults, teamResults, distResults] = await Promise.all([
      db.select({ id: ventures.id, name: ventures.name, sector: ventures.sector, slug: ventures.slug, status: ventures.status })
        .from(ventures).where(like(ventures.name, q)).limit(5),
      db.select({ id: spvs.id, name: spvs.name, sector: spvs.sector, slug: spvs.slug, stage: spvs.stage })
        .from(spvs).where(like(spvs.name, q)).limit(5),
      db.select({ id: tasks.id, title: tasks.title, status: tasks.status, priority: tasks.priority })
        .from(tasks).where(like(tasks.title, q)).limit(5),
      db.select({ id: teamMembers.id, name: teamMembers.name, role: teamMembers.role, slug: teamMembers.slug })
        .from(teamMembers).where(like(teamMembers.name, q)).limit(5),
      db.select({ id: distributions.id, name: distributions.name, amount: distributions.amount, status: distributions.status })
        .from(distributions).where(like(distributions.name, q)).limit(5),
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
