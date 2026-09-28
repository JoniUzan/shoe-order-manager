"use server";

import { Prisma, prisma } from "@repo/db";
import { LOCALES, signupSchema, type LocaleCode } from "@repo/domain";
import { headers } from "next/headers";

import { signIn } from "@/lib/auth";
import { hashPassword } from "@/lib/password";

/** At most this many sign-ups per IP in `WINDOW_MS`. */
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 60 * 60 * 1000;

type Field = "name" | "email" | "password";

export type SignupState =
  | {
      /** A message key per field (`settings.errors`). */
      fieldErrors?: Partial<Record<Field, string>>;
      error?: "rate_limited" | "error";
    }
  | undefined;

async function clientIp() {
  const h = await headers();
  return (
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    h.get("x-real-ip") ||
    "unknown"
  );
}

/**
 * Counts this attempt against the IP and says whether it's over the limit.
 * In Postgres, since serverless instances share no memory; rows past the
 * window are cleared here, in app code (no DB job or trigger).
 *
 * Insert first, then count including this attempt — not count, then insert.
 * Counting first let a burst of parallel requests all read "under the limit"
 * before any of them had inserted. This way each request's count holds every
 * attempt committed before it plus its own, so the (MAX + 1)th and later
 * always see more than MAX, however the requests interleave, with no lock.
 * A burst may turn away a few more than strictly needed; never fewer.
 */
async function overLimit(ip: string): Promise<boolean> {
  const since = new Date(Date.now() - WINDOW_MS);
  await prisma.signupAttempt.deleteMany({ where: { createdAt: { lt: since } } });
  await prisma.signupAttempt.create({ data: { ip } });
  const recent = await prisma.signupAttempt.count({
    where: { ip, createdAt: { gte: since } },
  });
  return recent > MAX_ATTEMPTS;
}

/**
 * Creates a User — their own, empty business — and signs them in. The app
 * then opens onboarding, since `onboardedAt` is still unset.
 */
export async function signUp(
  _prev: SignupState,
  formData: FormData,
): Promise<SignupState> {
  const raw = String(formData.get("locale") ?? "");
  const locale: LocaleCode = (LOCALES as readonly string[]).includes(raw)
    ? (raw as LocaleCode)
    : "he";

  const parsed = signupSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    const fieldErrors: Partial<Record<Field, string>> = {};
    for (const issue of parsed.error.issues) {
      const field = issue.path[0] as Field;
      fieldErrors[field] ??= issue.message;
    }
    return { fieldErrors };
  }
  const { name, email, password } = parsed.data;

  if (await overLimit(await clientIp())) return { error: "rate_limited" };

  // `email` is unique as stored; this also catches a differently-cased twin.
  const taken = await prisma.user.findFirst({
    where: { email: { equals: email, mode: "insensitive" } },
    select: { id: true },
  });
  if (taken) return { fieldErrors: { email: "emailTaken" } };

  try {
    await prisma.user.create({
      data: {
        name,
        email,
        passwordHash: await hashPassword(password),
        locale,
      },
    });
  } catch (e) {
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === "P2002"
    ) {
      return { fieldErrors: { email: "emailTaken" } };
    }
    throw e;
  }

  // Throws the redirect on success. The app sees onboardedAt unset and
  // opens the welcome dialog on its first step.
  await signIn("credentials", { email, password, redirectTo: `/${locale}` });
  return { error: "error" };
}
