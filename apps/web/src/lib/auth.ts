import { authOptions } from "@repo/auth";
import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { headers } from "next/headers";

/**
 * The shared config (`@repo/auth`) mounted for the web app. `nextCookies`
 * lets a Server Action that calls `auth.api` (sign-out) set the cookie.
 */
export const auth = betterAuth({ ...authOptions, plugins: [nextCookies()] });

/** This request's session and User, or null when signed out. */
export async function getSession() {
  return auth.api.getSession({ headers: await headers() });
}
