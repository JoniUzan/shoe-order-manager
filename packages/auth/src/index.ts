import { prisma } from "@repo/db";
import { LOCALES, signupSchema } from "@repo/domain";
import type { BetterAuthOptions } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { APIError, createAuthMiddleware } from "better-auth/api";

const DAY = 60 * 60 * 24;

/**
 * The one Better Auth config (ADR 0009). Each app mounts it with its own
 * plugins: the web app adds Next's cookie helper, and the future `apps/api`
 * adds bearer tokens for mobile. Both then read and write the same Users and
 * Sessions.
 *
 * Sessions are rows, not stateless cookies, so a password change can end the
 * other devices' sessions and a mobile token can be checked the same way.
 * The cookie cache saves the session query on most web requests, at the cost
 * of a revoked web session living on for up to its 5 minutes.
 */
export const authOptions = {
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  // Prisma assigns the ids (`@default(cuid())`), like every other table:
  // app-side, and they start with `c` (ADR 0002).
  advanced: {
    database: { generateId: false },
    // Vercel sets both to the client's address; x-real-ip first, as the old
    // sign-up throttle read it.
    ipAddress: { ipAddressHeaders: ["x-real-ip", "x-forwarded-for"] },
  },
  emailAndPassword: { enabled: true, minPasswordLength: 8, maxPasswordLength: 200 },
  user: {
    additionalFields: {
      // Chosen on the sign-up page, then where every sign-in lands.
      locale: { type: "string", required: false, defaultValue: "he", input: true },
    },
  },
  session: {
    expiresIn: 30 * DAY,
    // Renewed at most once a day while in use, so it rolls.
    updateAge: DAY,
    cookieCache: { enabled: true, maxAge: 5 * 60 },
  },
  // Counts live in Postgres: serverless instances share no memory. The limiter
  // runs only on HTTP requests to the auth endpoints, which is why the sign-in
  // and sign-up forms call those instead of Server Actions.
  rateLimit: {
    enabled: process.env.AUTH_RATE_LIMIT !== "off",
    storage: "database",
    customRules: {
      "/sign-in/email": { window: 15 * 60, max: 10 },
      "/sign-up/email": { window: 60 * 60, max: 5 },
    },
  },
  hooks: {
    // The form checks this too, but a request can skip the form.
    before: createAuthMiddleware(async (ctx) => {
      if (ctx.path !== "/sign-up/email") return;
      const parsed = signupSchema.safeParse(ctx.body);
      const locale = ctx.body?.locale;
      if (
        !parsed.success ||
        (locale !== undefined && !(LOCALES as readonly string[]).includes(locale))
      ) {
        throw new APIError("BAD_REQUEST", { message: "Invalid sign-up" });
      }
    }),
  },
} satisfies BetterAuthOptions;
