import { randomUUID } from "node:crypto";

import { expect, test } from "./fixtures.mjs";

const ORDER_URL = /\/orders\/c[a-z0-9]{16,}$/;

test("an order with Cartons of a Pack and Loose pairs", async ({ page, t, appLocale, user }) => {
  const suffix = randomUUID().slice(0, 8);
  const customerName = `Store ${suffix}`;
  const modelName = `Runner ${suffix}`;

  // A Customer.
  await page.goto(`/${appLocale}/customers/new`);
  await page.fill("#name", customerName);
  await page.getByRole("button", { name: t("common.save") }).click();
  await page.waitForURL(/\/customers\/c[a-z0-9]{16,}$/);

  // A Shoe model sized 38–40, ₪100, with the Pack 38×3 · 39×2 · 40×3.
  await page.goto(`/${appLocale}/catalog/new`);
  await page.fill("#name", modelName);
  await page.fill("#price", "100");
  await page.getByLabel(t("catalog.sizesFrom")).fill("38");
  await page.getByLabel(t("catalog.sizesTo")).fill("40");
  await page.getByRole("button", { name: t("catalog.sizesGenerate") }).click();
  await page.getByRole("button", { name: t("catalog.addPack") }).click();
  await page.getByLabel(t("catalog.packName")).fill("Mix");
  for (const [size, pairs] of [["38", "3"], ["39", "2"], ["40", "3"]]) {
    await page.getByLabel(t("catalog.packPairsFor", { size: size! })).fill(pairs!);
  }
  await page.getByRole("button", { name: t("common.save") }).click();
  await page.waitForURL(new RegExp(`/${appLocale}/catalog$`));

  // The order: 2 Cartons (16 pairs) + 1 Loose pair of size 40.
  await page.goto(`/${appLocale}/orders/new`);
  await page.getByRole("combobox", { name: t("orders.customer") }).click();
  await page.getByRole("option", { name: customerName }).click();
  await page.getByRole("combobox").filter({ hasText: t("orders.selectModel") }).click();
  await page.getByRole("option", { name: modelName }).click();
  await page.getByRole("button", { name: t("orders.addPack") }).click();
  await page.getByLabel(t("orders.packCount")).fill("2");
  await page.getByLabel(t("orders.pairs"), { exact: true }).nth(2).fill("1");
  await expect(page.getByText("1,700.00").first()).toBeVisible();

  await page.getByRole("button", { name: t("common.save") }).click();
  await page.waitForURL(ORDER_URL);
  await expect(
    page.getByRole("heading", { name: t("orders.orderNumber", { number: 1 }) }),
  ).toBeVisible();
  await expect(page.getByText(t("payment.unpaid")).first()).toBeVisible();
  await expect(page.getByText("1,700.00").first()).toBeVisible();
  expect(user.id).toBeTruthy();
});
