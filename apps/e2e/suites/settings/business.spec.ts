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
