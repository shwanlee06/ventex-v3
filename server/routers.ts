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
});

export type AppRouter = typeof appRouter;
