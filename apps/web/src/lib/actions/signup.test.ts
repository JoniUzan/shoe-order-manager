import { prisma } from "@repo/db";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { uniqueEmail } from "../../../test/factories";
import { newIp } from "../../../test/session";

import { signUp } from "./signup";

import { signIn } from "@/lib/auth";
import { verifyPassword } from "@/lib/password";

function form(fields: Record<string, string>) {
  const data = new FormData();
  for (const [k, v] of Object.entries(fields)) data.set(k, v);
  return data;
}

const valid = () => ({ name: "Dana", email: uniqueEmail(), password: "password123", locale: "en" });

describe("signUp", () => {
  beforeEach(() => {
    newIp();
    vi.mocked(signIn).mockClear();
  });

  it("creates a User that isn't onboarded yet and signs them in", async () => {
    const input = valid();
    await signUp(undefined, form({ ...input, email: input.email.toUpperCase() }));
    const user = await prisma.user.findUniqueOrThrow({ where: { email: input.email } });
    expect(user).toMatchObject({ name: "Dana", locale: "en", onboardedAt: null });
    expect(await verifyPassword(input.password, user.passwordHash!)).toBe(true);
    expect(signIn).toHaveBeenCalledWith("credentials", {
      email: input.email,
      password: input.password,
      redirectTo: "/en",
    });
  });

  it("returns field errors and refuses a taken email in any case", async () => {
    expect(await signUp(undefined, form({ name: "", email: "x", password: "1" }))).toEqual({
      fieldErrors: { name: "required", email: "email", password: "passwordTooShort" },
    });
    const input = valid();
    await signUp(undefined, form(input));
    expect(
      await signUp(undefined, form({ ...input, email: input.email.toUpperCase() })),
    ).toEqual({ fieldErrors: { email: "emailTaken" } });
  });

  it("rate-limits an IP after 5 attempts in an hour", async () => {
    for (let i = 0; i < 5; i++) {
      await signUp(undefined, form({ ...valid(), locale: "xx" }));
    }
    expect(await signUp(undefined, form(valid()))).toEqual({ error: "rate_limited" });
    // Unknown locales fall back to Hebrew.
    expect(signIn).toHaveBeenLastCalledWith(
      "credentials",
      expect.objectContaining({ redirectTo: "/he" }),
    );
  });
});
