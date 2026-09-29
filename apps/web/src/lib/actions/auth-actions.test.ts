import { prisma } from "@repo/db";
import { CredentialsSignin } from "next-auth";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { createUser } from "../../../test/factories";

import { authenticate, signOutAction } from "./auth-actions";

import { signIn, signOut } from "@/lib/auth";

function form(fields: Record<string, string>) {
  const data = new FormData();
  for (const [k, v] of Object.entries(fields)) data.set(k, v);
  return data;
}

describe("authenticate", () => {
  beforeEach(() => vi.mocked(signIn).mockReset());

  it("lands in the account's saved language", async () => {
    const user = await createUser();
    await prisma.user.update({ where: { id: user.id }, data: { locale: "en" } });
    await authenticate(undefined, form({ email: user.email.toUpperCase(), password: "x", locale: "he" }));
    expect(signIn).toHaveBeenCalledWith("credentials", {
      email: user.email.toUpperCase(),
      password: "x",
      redirectTo: "/en",
    });
  });

  it("says invalid for wrong credentials and rethrows anything else", async () => {
    vi.mocked(signIn).mockRejectedValueOnce(new CredentialsSignin());
    expect(await authenticate(undefined, form({ email: "", password: "x" }))).toBe("invalid");
    const redirect = new Error("NEXT_REDIRECT");
    vi.mocked(signIn).mockRejectedValueOnce(redirect);
    await expect(authenticate(undefined, form({ email: "a@b.co" }))).rejects.toBe(redirect);
  });
});

describe("signOutAction", () => {
  it("returns to the login page in the current language", async () => {
    await signOutAction(form({ locale: "en" }));
    expect(signOut).toHaveBeenCalledWith({ redirectTo: "/en/login" });
  });
});
