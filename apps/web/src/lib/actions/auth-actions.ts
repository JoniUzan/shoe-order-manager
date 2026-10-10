"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";

/**
 * Ends this device's session (deletes its row and clears the cookie), then
 * returns to the login page in the current language.
 */
export async function signOutAction(formData: FormData): Promise<void> {
  const locale = String(formData.get("locale") ?? "he");
  await auth.api.signOut({ headers: await headers() });
  redirect(`/${locale}/login`);
}
