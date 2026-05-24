import { authRouter } from "./auth-router";
import { slotRouter } from "./slot-router";
import { createRouter, publicQuery } from "./middleware";

export const appRouter = createRouter({
  ping: publicQuery.query(() => ({ ok: true, ts: Date.now() })),
  auth: authRouter,
  slot: slotRouter,
});

export type AppRouter = typeof appRouter;
