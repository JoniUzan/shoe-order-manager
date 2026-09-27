"use server";

import { Prisma, prisma } from "@repo/db";
import {
  businessSchema,
  passwordChangeSchema,
  preferencesSchema,
  profileSchema,
  type BusinessInput,
  type PasswordChangeInput,
  type PreferencesInput,
  type ProfileInput,
} from "@repo/domain";
import { revalidatePath } from "next/cache";

import { auth } from "@/lib/auth";
import { hashPassword, verifyPassword } from "@/lib/password";

async function requireUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("unauthorized");
  return session.user.id;
}

/** Trim a string field; empty becomes null for optional DB columns. */
function nullify(value?: string): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export type SettingsActionResult =
  | { ok: true }
  | {
      ok: false;
      error:
        | "invalid"
        | "not_found"
        | "wrong_password"
        | "email_taken";
    };

export async function updateProfile(
  input: ProfileInput,
): Promise<SettingsActionResult> {
  const userId = await requireUserId();
  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const data = parsed.data;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, passwordHash: true },
  });
  if (!user) return { ok: false, error: "not_found" };

  // The email is the login, so changing it asks for the password first.
  if (data.email !== user.email) {
    const valid =
      !!user.passwordHash &&
      !!data.currentPassword &&
      (await verifyPassword(data.currentPassword, user.passwordHash));
    if (!valid) return { ok: false, error: "wrong_password" };
  }

  try {
    await prisma.user.update({
      where: { id: userId },
      data: { name: data.name, email: data.email },
    });
  } catch (e) {
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === "P2002"
    ) {
      return { ok: false, error: "email_taken" };
    }
    throw e;
  }

  // The name and email show in the sidebar on every page.
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function changePassword(
  input: PasswordChangeInput,
): Promise<SettingsActionResult> {
  const userId = await requireUserId();
  const parsed = passwordChangeSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const data = parsed.data;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { passwordHash: true },
  });
  if (!user) return { ok: false, error: "not_found" };

  const valid =
    !!user.passwordHash &&
    (await verifyPassword(data.currentPassword, user.passwordHash));
  if (!valid) return { ok: false, error: "wrong_password" };

  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: await hashPassword(data.newPassword) },
  });
  return { ok: true };
}

/**
 * Saves the language and/or theme on the account, so a new device (or a
 * fresh sign-in) opens the way the user left it. Takes either one alone —
 * the account menu's quick switches send just the one they changed.
 */
export async function updatePreferences(
  input: Partial<PreferencesInput>,
): Promise<SettingsActionResult> {
  const userId = await requireUserId();
  const parsed = preferencesSchema.partial().safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };

  const result = await prisma.user.updateMany({
    where: { id: userId },
    data: parsed.data,
  });
  if (result.count === 0) return { ok: false, error: "not_found" };

  revalidatePath("/", "layout");
  return { ok: true };
}

export async function updateBusiness(
  input: BusinessInput,
): Promise<SettingsActionResult> {
  const userId = await requireUserId();
  const parsed = businessSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const data = parsed.data;

  const result = await prisma.user.updateMany({
    where: { id: userId },
    data: {
      businessName: nullify(data.businessName),
      businessPhone: nullify(data.businessPhone),
      businessAddress: nullify(data.businessAddress),
      businessTaxId: nullify(data.businessTaxId),
    },
  });
  if (result.count === 0) return { ok: false, error: "not_found" };

  // Printed on every order's invoice page.
  revalidatePath("/print", "layout");
  return { ok: true };
}
