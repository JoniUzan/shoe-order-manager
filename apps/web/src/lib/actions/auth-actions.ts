"use server";

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
  try {
    await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirectTo: `/${locale}`,
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
