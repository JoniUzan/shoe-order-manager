import { describe, expect, it } from "vitest";

import { signOutAction } from "./auth-actions";

import { auth } from "@/lib/auth";

function form(fields: Record<string, string>) {
  const data = new FormData();
  for (const [k, v] of Object.entries(fields)) data.set(k, v);
  return data;
}

describe("signOutAction", () => {
  it("ends the session and returns to the login page in the current language", async () => {
    await expect(signOutAction(form({ locale: "en" }))).rejects.toMatchObject({
      digest: expect.stringContaining(";/en/login;"),
    });
    expect(auth.api.signOut).toHaveBeenCalled();
  });
});
