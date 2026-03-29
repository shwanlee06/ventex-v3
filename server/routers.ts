import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { aiRouter } from "./routers/ai";
import { venturesRouter } from "./routers/ventures";
import { tasksRouter } from "./routers/tasks";
import { spvsRouter } from "./routers/spvs";
import { teamRouter } from "./routers/team";
import { distributionsRouter } from "./routers/distributions";
import { activityRouter } from "./routers/activity";
import { notificationsRouter } from "./routers/notifications";
import { searchRouter } from "./routers/search";
import { documentIntelligenceRouter } from "./routers/documentIntelligence";
import { intelligenceRouter } from "./routers/intelligence";
import { securityRouter } from "./routers/security";
import { accessRouter } from "./routers/access";
import { settingsRouter } from "./routers/settings";
import { organizationsRouter } from "./routers/organizations";
import { aiTasksRouter } from "./routers/aiTasks";
import { agentsRouter } from "./routers/agents";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),
  ai: aiRouter,
  ventures: venturesRouter,
  tasks: tasksRouter,
  spvs: spvsRouter,
  team: teamRouter,
  distributions: distributionsRouter,
  activity: activityRouter,
  notifications: notificationsRouter,
  search: searchRouter,
  docIntel: documentIntelligenceRouter,
  intelligence: intelligenceRouter,
  security: securityRouter,
  access: accessRouter,
  settings: settingsRouter,
  organizations: organizationsRouter,
  aiTasks: aiTasksRouter,
  agents: agentsRouter,
});

export type AppRouter = typeof appRouter;
