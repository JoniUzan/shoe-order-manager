import { prisma } from "@repo/db";

import { expect, test } from "../../fixtures/index.ts";

import { PaymentsCard } from "./locators.ts";
import { unpaidOrder } from "./setup.ts";

test("Payments move Paid, Balance and payment status", async ({ page, t, appLocale, user }) => {
  const { customer, order } = await unpaidOrder(user.id);
  const card = new PaymentsCard(page, t);

  await card.goto(appLocale, order.id);
  await expect(card.paymentBadge("unpaid")).toBeVisible();

  await card.record(300);
  await expect(card.dialog()).toBeHidden();
  await expect(card.paymentBadge("partial")).toBeVisible();
  await expect(page.getByText("700.00").first()).toBeVisible();

  // More than what's left is refused.
  await card.record(800);
  await expect(card.tooMuchError()).toBeVisible();
  await page.keyboard.press("Escape");

  await card.markFullyPaid().click();
  await expect(card.paymentBadge("paid")).toBeVisible();
  await expect(card.markFullyPaid()).toBeHidden();
  expect(await prisma.order.findUniqueOrThrow({ where: { id: order.id } })).toMatchObject({
    depositAgorot: 100_000,
    paymentStatus: "paid",
  });

  // The Customer's page shows it paid too.
  await page.goto(`/${appLocale}/customers/${customer.id}`);
  await expect(card.paymentBadge("paid")).toBeVisible();
});
