"use server";

import { prisma } from "@repo/db";
import {
  finishOnboardingSchema,
  type FinishOnboardingInput,
} from "@repo/domain";
import { revalidatePath } from "next/cache";

import { auth } from "@/lib/auth";

export type FinishOnboardingResult =
  | { ok: true }
  | { ok: false; error: "invalid" | "not_found" | "unauthorized" };

/**
 * The welcome dialog's Finish: saves the business details (the name is
 * required here, unlike in Settings) and marks the User onboarded, in one
 * write. `onboardedAt` is set explicitly, so clearing the name later in
 * Settings doesn't bring the dialog back.
 */
export async function finishOnboarding(
  input: FinishOnboardingInput,
): Promise<FinishOnboardingResult> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "unauthorized" };
  const parsed = finishOnboardingSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const data = parsed.data;

  const result = await prisma.user.updateMany({
    where: { id: session.user.id },
    data: {
      businessName: data.businessName,
      businessPhone: data.businessPhone?.trim() || null,
      businessAddress: data.businessAddress?.trim() || null,
      businessTaxId: data.businessTaxId?.trim() || null,
      onboardedAt: new Date(),
    },
  });
  if (result.count === 0) return { ok: false, error: "not_found" };

  revalidatePath("/", "layout");
  return { ok: true };
}
