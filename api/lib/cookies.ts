import type { IncomingHttpHeaders } from "http";

export function getSessionCookieOptions(headers: IncomingHttpHeaders | Headers) {
  const isSecure = process.env.NODE_ENV === "production";
  
  return {
    httpOnly: true,
    path: "/",
    sameSite: "lax" as const,
    secure: isSecure,
    maxAge: 60 * 60 * 24 * 7,
  };
}