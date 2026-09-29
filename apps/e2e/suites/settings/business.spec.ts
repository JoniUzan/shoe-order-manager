import { expect, test } from "../../fixtures/index.ts";

import { SettingsDialog } from "./locators.ts";
import { storedUser } from "./setup.ts";

test("Business details save from the settings dialog", async ({ page, t, appLocale, user }) => {
  const settings = new SettingsDialog(page, t);
  await settings.open(appLocale, "business");
  await settings.fillAndLeave("businessName", "Shoes & Co");
  // The "saved" mark only shows for 2s, so wait on the stored value.
  await expect.poll(async () => (await storedUser(user.id)).businessName).toBe("Shoes & Co");

  // A fresh load of another page, opened on the same section by link.
  await settings.open(appLocale, "business", "/orders");
  await expect(settings.businessField("businessName")).toHaveValue("Shoes & Co");
});

// ADR 0005: a reload reopens the dialog. After a save, Next sometimes writes
// back its own hash-less URL during the reload's hydration, so about half the
// runs land on the page with the dialog closed.
test.fixme("a reload after a save keeps the settings dialog open", async ({ page, t, appLocale, user }) => {
  const settings = new SettingsDialog(page, t);
  await settings.open(appLocale, "business");
  await settings.fillAndLeave("businessName", "Shoes & Co");
  await expect.poll(async () => (await storedUser(user.id)).businessName).toBe("Shoes & Co");
  await page.reload();
  await expect(settings.businessField("businessName")).toHaveValue("Shoes & Co");
});
