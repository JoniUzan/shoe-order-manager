import { prisma } from "@repo/db";

import { expect, login, PASSWORD, test } from "../../fixtures/index.ts";

import { SettingsDialog } from "./locators.ts";
import { storedUser } from "./setup.ts";

test("name and avatar save from Account", async ({ page, t, appLocale, user }) => {
  const settings = new SettingsDialog(page, t);
  await settings.open(appLocale, user.email, "account");

  await settings.nameField().fill("Dana Levi");
  await settings.nameField().press("Enter");
  await expect.poll(async () => (await storedUser(user.id)).name).toBe("Dana Levi");

  await settings.pickAvatar("onyx", 3);
  await expect.poll(async () => (await storedUser(user.id)).image).toBe("orb:onyx");
});

// #39: the `user` fixture lands on the Dashboard, so this goto only changes
// the hash, a fragment navigation the browser makes without Next. Next's
// router kept the hash-less URL, and the refresh after the save wrote it back,
// closing the dialog.
test("a save in settings opened by link on the Dashboard keeps the dialog open", async ({ page, t, appLocale, user }) => {
  const settings = new SettingsDialog(page, t);
  await expect(page).toHaveURL(new RegExp(`/${appLocale}$`));
  await settings.openByLink(appLocale, "account");

  await settings.nameField().fill("Dana Levi");
  await settings.nameField().press("Enter");
  // The Dashboard's greeting behind the dialog shows the new name once the
  // refresh from the save has landed.
  await expect(settings.dashboardGreeting("Dana Levi")).toBeVisible();
  await expect(page).toHaveURL(/#settings\/account$/);
  await expect(settings.nameField()).toBeVisible();

  await page.reload();
  await expect(settings.nameField()).toHaveValue("Dana Levi");
});

test("theme applies at once and is kept on the account", async ({ page, t, appLocale, user }) => {
  const settings = new SettingsDialog(page, t);
  await settings.open(appLocale, user.email, "general");
  await settings.pickTheme("dark");
  await expect(page.locator("html")).toHaveClass(/\bdark\b/);
  await expect.poll(async () => (await storedUser(user.id)).theme).toBe("dark");
});

test("switching language reloads into the other locale", async ({ page, t, appLocale, user }) => {
  const other = appLocale === "he" ? "en" : "he";
  const settings = new SettingsDialog(page, t);
  await settings.open(appLocale, user.email, "general");
  await settings.pickLanguage(other === "he" ? "עברית" : "English");

  await expect(page).toHaveURL(new RegExp(`/${other}#settings/general$`));
  await expect(page.locator("html")).toHaveAttribute("dir", other === "he" ? "rtl" : "ltr");
  await expect.poll(async () => (await storedUser(user.id)).locale).toBe(other);
});

test("password change needs the current one, then the new one logs in", async ({ page, t, appLocale, user }) => {
  const settings = new SettingsDialog(page, t);
  await settings.open(appLocale, user.email, "account");

  await settings.changePassword("not-my-password", "brand-new-pass");
  await expect(settings.wrongPassword()).toBeVisible();
  await page.keyboard.press("Escape");

  await settings.changePassword(PASSWORD, "brand-new-pass");
  await expect(settings.passwordSaved()).toBeVisible();

  await page.context().clearCookies();
  await login(page, appLocale, user.email, "brand-new-pass");
  await expect(page).toHaveURL(new RegExp(`/${appLocale}$`));
  expect(await prisma.user.count({ where: { id: user.id } })).toBe(1);
});
