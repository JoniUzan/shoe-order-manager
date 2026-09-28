"use server";

import { Prisma, prisma } from "@repo/db";
import {
  avatarSchema,
  businessSchema,
  emailChangeSchema,
  nameSchema,
  passwordChangeSchema,
  preferencesSchema,
  type AvatarInput,
  type BusinessInput,
  type EmailChangeInput,
  type NameInput,
  type PasswordChangeInput,
  type PreferencesInput,
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

/** Checks the user's current password — for changes to how they sign in. */
async function passwordMatches(userId: string, password: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { passwordHash: true },
  });
  if (!user) return null;
  return (
    !!user.passwordHash && (await verifyPassword(password, user.passwordHash))
  );
}

export async function updateName(
  input: NameInput,
): Promise<SettingsActionResult> {
  const userId = await requireUserId();
  const parsed = nameSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };

  const result = await prisma.user.updateMany({
    where: { id: userId },
    data: { name: parsed.data.name },
  });
  if (result.count === 0) return { ok: false, error: "not_found" };

  // The name shows in the sidebar on every page.
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function changeEmail(
  input: EmailChangeInput,
): Promise<SettingsActionResult> {
  const userId = await requireUserId();
  const parsed = emailChangeSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const data = parsed.data;

  const valid = await passwordMatches(userId, data.currentPassword);
  if (valid === null) return { ok: false, error: "not_found" };
  if (!valid) return { ok: false, error: "wrong_password" };

  try {
    await prisma.user.update({
      where: { id: userId },
      data: { email: data.email },
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

  const valid = await passwordMatches(userId, data.currentPassword);
  if (valid === null) return { ok: false, error: "not_found" };
  if (!valid) return { ok: false, error: "wrong_password" };

  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: await hashPassword(data.newPassword) },
  });

  revalidatePath("/", "layout");
  return { ok: true };
}

/** Saves the picked Avatar as its token (`orb:onyx`) in `User.image`. */
export async function updateAvatar(
  input: AvatarInput,
): Promise<SettingsActionResult> {
  const userId = await requireUserId();
  const parsed = avatarSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };

  const result = await prisma.user.updateMany({
    where: { id: userId },
    data: { image: `orb:${parsed.data.avatar}` },
  });
  if (result.count === 0) return { ok: false, error: "not_found" };

  // The avatar shows in the sidebar on every page.
  revalidatePath("/", "layout");
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

/**
 * Saves whichever business fields it's given — the settings save each field
 * on its own as the user leaves it.
 */
export async function updateBusiness(
  input: Partial<BusinessInput>,
): Promise<SettingsActionResult> {
  const userId = await requireUserId();
  const parsed = businessSchema.partial().safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };

  const data: Record<string, string | null> = {};
  for (const [key, value] of Object.entries(parsed.data)) {
    if (value !== undefined) data[key] = nullify(value);
  }

  const result = await prisma.user.updateMany({
    where: { id: userId },
    data,
  });
  if (result.count === 0) return { ok: false, error: "not_found" };

  // Printed on every order's invoice page; shown in the settings menu.
  revalidatePath("/", "layout");
  return { ok: true };
}
