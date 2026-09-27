"use server";

import { Prisma, prisma } from "@repo/db";
import {
  passwordChangeSchema,
  profileSchema,
  type PasswordChangeInput,
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
