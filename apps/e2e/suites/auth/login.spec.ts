import { AppShell } from "../../fixtures/shell.ts";
import { expect, PASSWORD, test } from "../../fixtures/index.ts";

import { LoginPage } from "./locators.ts";

const other = (locale: string) => (locale === "he" ? "en" : "he");

test("login lands in the account's saved language", async ({ page, t, appLocale, account }) => {
  const login = new LoginPage(page, t);
  // Signing in from the other language's login page.
  await login.goto(other(appLocale));
  await login.login(account.email.toUpperCase(), PASSWORD);
  await expect(page).toHaveURL(new RegExp(`/${appLocale}$`));
});

test("a wrong password is refused", async ({ page, t, appLocale, account, pageErrors }) => {
  const login = new LoginPage(page, t);
  await login.goto(appLocale);
  await login.login(account.email, "wrong-password");
  await expect(login.invalidCredentials()).toBeVisible();
  await expect(page).toHaveURL(/\/login$/);
  // The sign-in endpoint's 401, which the browser logs, is the refusal
  // itself; any other error still fails the test.
  const refusal = pageErrors.findIndex((e) => e.includes("status of 401"));
  expect(refusal).toBeGreaterThanOrEqual(0);
  pageErrors.splice(refusal, 1);
});

test("signing out returns to login and locks the app", async ({ page, t, appLocale, user }) => {
  await new AppShell(page, t).signOut(user.email);
  await expect(page).toHaveURL(new RegExp(`/${appLocale}/login$`));
  await page.goto(`/${appLocale}/orders`);
  await expect(page).toHaveURL(new RegExp(`/${appLocale}/login$`));
});

test("a logged-out visit to the app redirects to login", async ({ page, appLocale }) => {
  await page.goto(`/${appLocale}/customers`);
  await expect(page).toHaveURL(new RegExp(`/${appLocale}/login$`));
});
