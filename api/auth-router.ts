import * as cookie from "cookie";
import { Session } from "@contracts/constants";
import { getSessionCookieOptions } from "./lib/cookies";
import { createRouter, publicQuery } from "./middleware";
import { verifyToken } from "./local-auth-router";

export const authRouter = createRouter({
  me: publicQuery.query(async ({ ctx }) => {
    try {
      const authHeader = ctx.req.headers.get("x-auth-token");
      if (!authHeader) return null;

      const decoded = await verifyToken(authHeader);
      if (!decoded) return null;

      if (decoded.username === "dentist") {
        return { id: "dentist", name: "Dr. Dentist", username: "dentist" };
      }
      return null;
    } catch (error) {
      console.error("[Auth.me] Error:", error);
      return null;
    }
  }),

  logout: publicQuery.mutation(async ({ ctx }) => {
    try {
      const opts = getSessionCookieOptions(ctx.req.headers);
      ctx.resHeaders.append(
        "set-cookie",
        cookie.serialize(Session.cookieName, "", {
          httpOnly: opts.httpOnly,
          path: opts.path,
          sameSite: opts.sameSite?.toLowerCase() as "lax" | "none",
          secure: opts.secure,
          maxAge: 0,
        }),
      );
    } catch {
      // Ignore cookie errors
    }
    return { success: true };
  }),
});
