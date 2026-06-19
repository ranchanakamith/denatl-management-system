import { createRouter } from "./middleware";
import { appointmentRouter } from "./appointment-router";
import { slotRouter } from "./slot-router";
import { localAuthRouter } from "./local-auth-router";
import { authRouter } from "./auth-router";

export const appRouter = createRouter({
  appointment: appointmentRouter,
  slot: slotRouter,
  auth: authRouter,
  localAuth: localAuthRouter,
});

export type AppRouter = typeof appRouter;
