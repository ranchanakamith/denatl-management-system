import { localAuthRouter } from "./local-auth-router";
import { appointmentRouter } from "./appointment-router";
import { createRouter, publicQuery } from "./middleware";

export const appRouter = createRouter({
  ping: publicQuery.query(() => ({ ok: true, ts: Date.now() })),
  auth: localAuthRouter,
  appointment: appointmentRouter,
});

export type AppRouter = typeof appRouter;
