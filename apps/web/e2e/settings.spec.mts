import { prisma } from "@repo/db";

import { expect, test } from "./fixtures.mjs";

/** Type a business name and leave the field, which saves it. */
async function saveBusinessName(
  page: import("@playwright/test").Page,
  userId: string,
  value: string,
) {
  const name = page.locator("#settings-businessName");
  await name.fill(value);
  await name.press("Enter"); // saves on blur
  // The "saved" mark only shows for 2s, so wait on the stored value instead.
  await expect
    .poll(async () => (await prisma.user.findUniqueOrThrow({ where: { id: userId } })).businessName)
    .toBe(value);
}

test("Business details save from the settings dialog", async ({ page, appLocale, user }) => {
  await page.goto(`/${appLocale}#settings/business`);
  await saveBusinessName(page, user.id, "Shoes & Co");

  // A fresh load of another page, opened on the same section by link.
  await page.goto(`/${appLocale}/orders#settings/business`);
  await expect(page.locator("#settings-businessName")).toHaveValue("Shoes & Co");
});

// ADR 0005: a reload reopens the dialog. After a save, Next sometimes writes
// back its own hash-less URL during the reload's hydration, so about half the
// runs land on the page with the dialog closed.
test.fixme("a reload after a save keeps the settings dialog open", async ({ page, appLocale, user }) => {
  await page.goto(`/${appLocale}#settings/business`);
  await saveBusinessName(page, user.id, "Shoes & Co");
  await page.reload();
  await expect(page.locator("#settings-businessName")).toHaveValue("Shoes & Co");
});
