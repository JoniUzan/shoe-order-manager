import { prisma } from "@repo/db";

import { uniqueEmail } from "../../fixtures/db.ts";
import { expect, PASSWORD, test } from "../../fixtures/index.ts";

import { SignupPage, WelcomeDialog } from "./locators.ts";
import { ownSignupBucket } from "./setup.ts";

test("Sign-up, then Onboarding, lands on Home", async ({ page, t, appLocale }) => {
  await ownSignupBucket(page);
  const email = uniqueEmail();

  const signup = new SignupPage(page, t);
  await signup.goto(appLocale);
  await signup.signUp("Dana", email, PASSWORD);

  const welcome = new WelcomeDialog(page, t);
  await expect(welcome.step(1)).toBeVisible();
  await welcome.continue();
  await expect(welcome.step(2)).toBeVisible();
  await welcome.continue();
  await expect(welcome.step(3)).toBeVisible();

  // Finish needs a business name.
  await welcome.finish();
  await expect(welcome.businessNameMissing()).toBeVisible();
  await welcome.businessName().fill("Dana Shoes");
  await welcome.finish();

  await expect(welcome.root()).toBeHidden();
  await expect(page).toHaveURL(new RegExp(`/${appLocale}$`));
  const user = await prisma.user.findUniqueOrThrow({ where: { email } });
  expect(user.businessName).toBe("Dana Shoes");
  expect(user.onboardedAt).toBeInstanceOf(Date);
});
