import { prisma } from "@repo/db";
import { redirect } from "next/navigation";
import { cache } from "react";

import { auth } from "./auth";

/**
 * Require an authenticated user in a server component / action.
 *
 * Verifies the session's user still exists in the database (a JWT can outlive
 * the row it references — e.g. after a DB reset), so a stale session redirects
 * to login instead of causing a foreign-key crash downstream. Returns the
 * fresh user for ownerId scoping.
 *
 * Wrapped in React `cache()` so the `(app)` layout and the page it wraps share
 * one session + user read per server request instead of each doing its own.
 * A redirect (which throws) is cached too and re-thrown to later callers, so
 * they redirect the same way. Outside a React render the cache is a no-op, so
 * nothing relies on a second call within one request seeing fresher data.
 */
export const requireUser = cache(async function requireUser(locale: string) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect(`/${locale}/login`);
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    // Also the business details the settings dialog (in every page's layout)
    // shows, so it needs no second read that could find the row gone.
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      locale: true,
      theme: true,
      onboardedAt: true,
      businessName: true,
      businessPhone: true,
      businessAddress: true,
      businessTaxId: true,
    },
  });
  if (!user) {
    redirect(`/${locale}/login`);
  }

  return user;
});

export async function getCurrentUser() {
  const session = await auth();
  if (!session?.user?.id) return null;
  return prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, name: true, email: true },
  });
}
