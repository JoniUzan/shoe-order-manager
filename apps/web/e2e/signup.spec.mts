import { randomUUID } from "node:crypto";

import { prisma } from "@repo/db";

import { expect, PASSWORD, test } from "./fixtures.mjs";

test("Sign-up, then Onboarding, lands on Home", async ({ page, t, appLocale }) => {
  // Sign-up is rate-limited per IP; the app trusts x-real-ip (set by Vercel),
  // so each run gets its own bucket.
  await page.setExtraHTTPHeaders({ "x-real-ip": `e2e-${randomUUID()}` });
  const email = `e2e-${randomUUID()}@example.com`;

  await page.goto(`/${appLocale}/signup`);
  await page.fill("#signup-name", "Dana");
  await page.fill("#signup-email", email);
  await page.fill("#signup-password", PASSWORD);
  await page.getByRole("button", { name: t("auth.createAccount") }).click();

  const dialog = page.getByRole("dialog");
  await expect(dialog.getByText(t("onboarding.stepOf", { step: 1, total: 3 }))).toBeVisible();
  await dialog.getByRole("button", { name: t("onboarding.continue") }).click();
  await expect(dialog.getByText(t("onboarding.stepOf", { step: 2, total: 3 }))).toBeVisible();
  await dialog.getByRole("button", { name: t("onboarding.continue") }).click();
  await expect(dialog.getByText(t("onboarding.stepOf", { step: 3, total: 3 }))).toBeVisible();

  // Finish needs a business name.
  await dialog.getByRole("button", { name: t("onboarding.finish") }).click();
  await expect(dialog.getByText(t("onboarding.businessNameMissing"))).toBeVisible();
  await dialog.locator("#welcome-businessName").fill("Dana Shoes");
  await dialog.getByRole("button", { name: t("onboarding.finish") }).click();

  await expect(dialog).toBeHidden();
  await expect(page).toHaveURL(new RegExp(`/${appLocale}$`));
  const user = await prisma.user.findUniqueOrThrow({ where: { email } });
  expect(user.businessName).toBe("Dana Shoes");
  expect(user.onboardedAt).toBeInstanceOf(Date);
});
