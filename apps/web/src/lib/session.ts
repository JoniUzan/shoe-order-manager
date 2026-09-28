import { prisma } from "@repo/db";
import { redirect } from "next/navigation";

import { auth } from "./auth";

/**
 * Require an authenticated user in a server component / action.
 *
 * Verifies the session's user still exists in the database (a JWT can outlive
 * the row it references — e.g. after a DB reset), so a stale session redirects
 * to login instead of causing a foreign-key crash downstream. Returns the
 * fresh user for ownerId scoping.
 */
export async function requireUser(locale: string) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect(`/${locale}/login`);
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    // Also everything the settings dialog (in every page's layout) and the
    // printed order show, so neither needs a second read that could find the
    // row gone.
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
}

export async function getCurrentUser() {
  const session = await auth();
  if (!session?.user?.id) return null;
  return prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, name: true, email: true },
  });
}
