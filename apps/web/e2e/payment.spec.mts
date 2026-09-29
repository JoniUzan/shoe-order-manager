import { prisma } from "@repo/db";

import { expect, test } from "./fixtures.mjs";

test("Payments move Paid, Balance and payment status", async ({ page, t, appLocale, user }) => {
  // An order of ₪1,000 made straight in the database; this spec is about paying it.
  const customer = await prisma.customer.create({
    data: { ownerId: user.id, name: "Paying store" },
  });
  const order = await prisma.order.create({
    data: {
      ownerId: user.id,
      customerId: customer.id,
      orderNumber: 1,
      totalAgorot: 100_000,
      items: {
        create: { customDescription: "Sandals", size: "40", quantity: 10, unitPriceAgorot: 10_000 },
      },
    },
  });

  await page.goto(`/${appLocale}/orders/${order.id}`);
  await expect(page.getByText(t("payment.unpaid")).first()).toBeVisible();

  // A partial payment.
  await page.getByRole("button", { name: t("payments.record") }).click();
  const dialog = page.getByRole("dialog");
  await dialog.locator("#pay-amount").fill("300");
  await dialog.getByRole("button", { name: t("payments.record") }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByText(t("payment.partial")).first()).toBeVisible();
  await expect(page.getByText("700.00").first()).toBeVisible();

  // More than what's left is refused.
  await page.getByRole("button", { name: t("payments.record") }).click();
  await dialog.locator("#pay-amount").fill("800");
  await dialog.getByRole("button", { name: t("payments.record") }).click();
  await expect(page.getByText(t("payments.errorTooMuch"))).toBeVisible();
  await page.keyboard.press("Escape");

  // Settle the rest.
  await page.getByRole("button", { name: t("payments.markFullyPaid") }).click();
  await expect(page.getByText(t("payment.paid"), { exact: true }).first()).toBeVisible();
  await expect(page.getByRole("button", { name: t("payments.markFullyPaid") })).toBeHidden();

  const saved = await prisma.order.findUniqueOrThrow({ where: { id: order.id } });
  expect(saved).toMatchObject({ depositAgorot: 100_000, paymentStatus: "paid" });

  // The Customer's page shows the order as paid too.
  await page.goto(`/${appLocale}/customers/${customer.id}`);
  await expect(page.getByText(t("payment.paid"), { exact: true }).first()).toBeVisible();
});
