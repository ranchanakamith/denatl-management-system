import type { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";
import { verifyToken } from "./local-auth-router";

export type LocalUser = {
  id: string;
  name: string;
  username: string;
};

export type TrpcContext = {
  req: Request;
  resHeaders: Headers;
  user?: LocalUser;
};

export async function createContext(
  opts: FetchCreateContextFnOptions,
): Promise<TrpcContext> {
  const ctx: TrpcContext = { req: opts.req, resHeaders: opts.resHeaders };

  try {
    const token = opts.req.headers.get("x-auth-token");
    if (token) {
      const decoded = await verifyToken(token);
      if (decoded && decoded.username === "dentist") {
        ctx.user = {
          id: "dentist",
          name: "Dr. Dentist",
          username: "dentist",
        };
      }
    }
  } catch {
    // Auth is optional
  }

  return ctx;
}
