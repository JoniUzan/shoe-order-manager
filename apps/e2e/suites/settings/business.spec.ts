import { expect, test } from "../../fixtures/index.ts";

import { SettingsDialog } from "./locators.ts";
import { storedUser } from "./setup.ts";

test("Business details save from the settings dialog", async ({ page, t, appLocale, user }) => {
  const settings = new SettingsDialog(page, t);
  await settings.open(appLocale, user.email, "business");
  await settings.fillAndLeave("businessName", "Shoes & Co");
  // The "saved" mark only shows for 2s, so wait on the stored value.
  await expect.poll(async () => (await storedUser(user.id)).businessName).toBe("Shoes & Co");
  await expect(settings.businessField("businessName")).toBeVisible();

  // A fresh load of another page, opened on the same section by link.
  await settings.openByLink(appLocale, "business", "/orders");
  await expect(settings.businessField("businessName")).toHaveValue("Shoes & Co");
});

// ADR 0005: a link or a reload opens the dialog from the hash. Next's router
// never adopts that hash (only pushState/replaceState(null) URLs), so after the
// next Server Action it writes back its own hash-less URL: the first save
// closes the dialog, and a reload after a save often lands without it.
test.fixme("a save in settings opened by link keeps the dialog open", async ({ page, t, appLocale, user }) => {
  const settings = new SettingsDialog(page, t);
  await settings.openByLink(appLocale, "business");
  await settings.fillAndLeave("businessName", "Shoes & Co");
  await expect.poll(async () => (await storedUser(user.id)).businessName).toBe("Shoes & Co");
  await page.waitForTimeout(1000); // the write-back lands after the refresh
  await expect(page).toHaveURL(/#settings\/business$/);
  await page.reload();
  await expect(settings.businessField("businessName")).toHaveValue("Shoes & Co");
});
