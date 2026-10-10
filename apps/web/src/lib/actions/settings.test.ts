import { prisma } from "@repo/db";
import { describe, expect, it } from "vitest";

import { createUser, PASSWORD, uniqueEmail } from "../../../test/factories";
import { sessionToken, signInAs } from "../../../test/session";

import { finishOnboarding } from "./onboarding";
import {
  changeEmail,
  changePassword,
  updateAvatar,
  updateBusiness,
  updateName,
  updatePreferences,
} from "./settings";

import { passwordMatches } from "@/lib/password";

const me = (id: string) => prisma.user.findUniqueOrThrow({ where: { id } });

describe("account settings", () => {
  it("saves name, avatar, preferences and business details", async () => {
    const user = await createUser();
    expect(await updateName({ name: " Dana " })).toEqual({ ok: true });
    expect(await updateAvatar({ avatar: "onyx" })).toEqual({ ok: true });
    expect(await updatePreferences({ theme: "dark" })).toEqual({ ok: true });
    expect(await updateBusiness({ businessName: "Shoes", businessPhone: " " })).toEqual({
      ok: true,
    });
    expect(await me(user.id)).toMatchObject({
      name: "Dana",
      image: "orb:onyx",
      theme: "dark",
      locale: "he",
      businessName: "Shoes",
      businessPhone: null,
    });

    expect(await updateName({ name: "" })).toEqual({ ok: false, error: "invalid" });
    expect(await updateAvatar({ avatar: "gold" as never })).toEqual({ ok: false, error: "invalid" });
    expect(await updatePreferences({ locale: "fr" as never })).toEqual({
      ok: false,
      error: "invalid",
    });
    expect(await updateBusiness({ businessName: "x".repeat(201) })).toEqual({
      ok: false,
      error: "invalid",
    });
  });

  it("changes email only with the right password and a free address", async () => {
    const user = await createUser({ password: true });
    const other = await createUser();
    signInAs(user.id);
    const email = uniqueEmail();

    expect(await changeEmail({ email, currentPassword: "wrong" })).toEqual({
      ok: false,
      error: "wrong_password",
    });
    expect(
      await changeEmail({ email: other.email.toUpperCase(), currentPassword: PASSWORD }),
    ).toEqual({ ok: false, error: "email_taken" });
    expect(await changeEmail({ email: "nope", currentPassword: PASSWORD })).toEqual({
      ok: false,
      error: "invalid",
    });
    expect(await changeEmail({ email, currentPassword: PASSWORD })).toEqual({ ok: true });
    expect((await me(user.id)).email).toBe(email);
  });

  it("changes the password and signs out every other device", async () => {
    const user = await createUser({ password: true });
    const expiresAt = new Date(Date.now() + 86_400_000);
    await prisma.session.createMany({
      data: [
        { userId: user.id, token: sessionToken(user.id), expiresAt },
        { userId: user.id, token: `other-${user.id}`, expiresAt },
      ],
    });
    const input = { currentPassword: PASSWORD, newPassword: "newpass123", confirmPassword: "newpass123" };
    expect(await changePassword({ ...input, currentPassword: "wrong" })).toEqual({
      ok: false,
      error: "wrong_password",
    });
    expect(await changePassword({ ...input, confirmPassword: "x" })).toEqual({
      ok: false,
      error: "invalid",
    });
    expect(await changePassword(input)).toEqual({ ok: true });
    expect(await passwordMatches(user.id, "newpass123")).toBe(true);
    expect(await passwordMatches(user.id, PASSWORD)).toBe(false);
    const left = await prisma.session.findMany({ where: { userId: user.id } });
    expect(left.map((s) => s.token)).toEqual([sessionToken(user.id)]);
  });

  it("answers not_found when the User is gone", async () => {
    const user = await createUser({ password: true });
    await prisma.user.delete({ where: { id: user.id } });
    expect(await updateName({ name: "x" })).toEqual({ ok: false, error: "not_found" });
    expect(await changePassword({ currentPassword: PASSWORD, newPassword: "newpass123", confirmPassword: "newpass123" })).toEqual({ ok: false, error: "not_found" });
    expect(await finishOnboarding({ businessName: "x" })).toEqual({ ok: false, error: "not_found" });
  });
});

describe("finishOnboarding", () => {
  it("needs a business name and sets onboardedAt", async () => {
    const user = await createUser();
    await prisma.user.update({ where: { id: user.id }, data: { onboardedAt: null } });
    expect(await finishOnboarding({ businessName: " " })).toEqual({ ok: false, error: "invalid" });
    expect(await finishOnboarding({ businessName: "Shoes", businessTaxId: " 123 " })).toEqual({
      ok: true,
    });
    const after = await me(user.id);
    expect(after).toMatchObject({ businessName: "Shoes", businessTaxId: "123" });
    expect(after.onboardedAt).toBeInstanceOf(Date);
  });

  it("answers unauthorized when signed out", async () => {
    signInAs(null);
    expect(await finishOnboarding({ businessName: "x" })).toEqual({
      ok: false,
      error: "unauthorized",
    });
  });
});
