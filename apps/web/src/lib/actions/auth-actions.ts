"use server";

import { prisma } from "@repo/db";
import { AuthError } from "next-auth";

import { signIn, signOut } from "@/lib/auth";

export async function signOutAction(formData: FormData): Promise<void> {
  const locale = String(formData.get("locale") ?? "he");
  await signOut({ redirectTo: `/${locale}/login` });
}

export type LoginState = "invalid" | "error" | undefined;

export async function authenticate(
  _prevState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const locale = String(formData.get("locale") ?? "he");
  const email = formData.get("email");
  // Land in the account's saved language, whichever one the login page was in.
  // Read before signing in (signIn throws the redirect); only a successful
  // sign-in follows it, so it tells a failed attempt nothing.
  const saved =
    typeof email === "string" && email
      ? await prisma.user.findUnique({
          where: { email },
          select: { locale: true },
        })
      : null;
  try {
    await signIn("credentials", {
      email,
      password: formData.get("password"),
      redirectTo: `/${saved?.locale ?? locale}`,
    });
    return undefined;
  } catch (error) {
    if (error instanceof AuthError) {
      return error.type === "CredentialsSignin" ? "invalid" : "error";
    }
    // Re-throw redirect (and any other) errors so Next can handle them.
    throw error;
  }
}
