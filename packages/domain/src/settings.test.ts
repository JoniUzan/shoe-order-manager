import { describe, expect, it } from "vitest";

import { customerSchema } from "./customer";
import {
  avatarSchema,
  emailChangeSchema,
  finishOnboardingSchema,
  PASSWORD_MIN,
  passwordChangeSchema,
  preferencesSchema,
  signupSchema,
} from "./settings";

describe("signupSchema", () => {
  it("trims and lower-cases the email", () => {
    const r = signupSchema.parse({
      name: " Dana ",
      email: " Dana@Example.COM ",
      password: "x".repeat(PASSWORD_MIN),
    });
    expect(r).toMatchObject({ name: "Dana", email: "dana@example.com" });
  });

  it("names each failing field", () => {
    const r = signupSchema.safeParse({ name: "", email: "nope", password: "short" });
    expect(r.error?.flatten().fieldErrors).toEqual({
      name: ["required"],
      email: ["email"],
      password: ["passwordTooShort"],
    });
  });
});

describe("account schemas", () => {
  it("password change must match", () => {
    const r = passwordChangeSchema.safeParse({
      currentPassword: "old",
      newPassword: "newpassword",
      confirmPassword: "different",
    });
    expect(r.error?.issues[0]).toMatchObject({
      message: "passwordMismatch",
      path: ["confirmPassword"],
    });
  });

  it("email change needs the current password", () => {
    const r = emailChangeSchema.safeParse({ email: "a@b.co", currentPassword: "" });
    expect(r.error?.issues[0]?.message).toBe("required");
  });

  it("preferences and avatars are closed sets", () => {
    expect(preferencesSchema.safeParse({ locale: "fr", theme: "dark" }).success).toBe(
      false,
    );
    expect(avatarSchema.safeParse({ avatar: "onyx" }).success).toBe(true);
    expect(avatarSchema.safeParse({ avatar: "gold" }).success).toBe(false);
  });

  it("finishing onboarding needs a business name", () => {
    expect(
      finishOnboardingSchema.safeParse({ businessName: "  " }).error?.issues[0]
        ?.message,
    ).toBe("required");
    expect(finishOnboardingSchema.parse({ businessName: "Shoes Ltd" })).toEqual({
      businessName: "Shoes Ltd",
    });
  });
});

describe("customerSchema", () => {
  it("needs a name; the rest may be blank", () => {
    expect(customerSchema.safeParse({ name: " " }).success).toBe(false);
    expect(customerSchema.parse({ name: "Store", phone: "" })).toEqual({
      name: "Store",
      phone: "",
    });
  });
});
