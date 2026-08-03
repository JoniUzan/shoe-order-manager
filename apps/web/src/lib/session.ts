import { redirect } from "next/navigation";

import { auth } from "./auth";

/**
 * Require an authenticated user in a server component / action.
 * Redirects to the localized login page when there is no session.
 * Returns the user (guaranteed to have an id) for ownerId scoping.
 */
export async function requireUser(locale: string) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect(`/${locale}/login`);
  }
  return session.user;
}

export async function getCurrentUser() {
  const session = await auth();
  return session?.user ?? null;
}
