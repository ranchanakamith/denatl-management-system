export const Session = { cookieName: "dental_session" } as const;
export const Paths = { oauthCallback: "/api/oauth/callback" } as const;
export const ErrorMessages = {
  unauthenticated: "Authentication required",
  unauthorized: "Unauthorized access",
} as const;
