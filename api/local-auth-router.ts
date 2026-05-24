import { z } from "zod";
import { createRouter, publicQuery } from "./middleware";
import { SignJWT, jwtVerify } from "jose";

// Hardcoded dentist credentials - simple single-user system
const DENTIST_USER = {
  id: "dentist",
  username: "dentist",
  password: "dentist123",
  name: "Dr. Dentist",
};

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "dental-clinic-secret-key-2024"
);

export async function createToken(username: string): Promise<string> {
  return new SignJWT({ username })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(JWT_SECRET);
}

export async function verifyToken(
  token: string
): Promise<{ username: string } | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET, {
      clockTolerance: 60,
    });
    return payload as { username: string };
  } catch {
    return null;
  }
}

export const localAuthRouter = createRouter({
  login: publicQuery
    .input(
      z.object({
        username: z.string(),
        password: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      if (
        input.username === DENTIST_USER.username &&
        input.password === DENTIST_USER.password
      ) {
        const token = await createToken(DENTIST_USER.username);
        return {
          success: true,
          token,
          user: {
            id: DENTIST_USER.id,
            name: DENTIST_USER.name,
            username: DENTIST_USER.username,
          },
        };
      }
      return {
        success: false,
        token: null,
        user: null,
        message: "Invalid username or password",
      };
    }),

  me: publicQuery.query(async ({ ctx }) => {
    const authHeader = ctx.req.headers.get("x-auth-token");
    if (!authHeader) return null;

    const decoded = await verifyToken(authHeader);
    if (!decoded) return null;

    if (decoded.username === DENTIST_USER.username) {
      return {
        id: DENTIST_USER.id,
        name: DENTIST_USER.name,
        username: DENTIST_USER.username,
      };
    }
    return null;
  }),
});
