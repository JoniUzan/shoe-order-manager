import { prisma } from "@repo/db";

import { expect, test } from "../../fixtures/index.ts";
import { PaymentsCard } from "../payments/locators.ts";
import { orderWithPayments, unpaidOrder } from "../payments/setup.ts";

import { spinnerIn } from "./locators.ts";
import { holdServerActions } from "./setup.ts";

test("a pending button spins at its own width until the server answers", async ({
  page,
  t,
  appLocale,
  user,
}) => {
  const { order } = await unpaidOrder(user.id);
  const card = new PaymentsCard(page, t);
  await card.goto(appLocale, order.id);

  const button = card.markFullyPaid();
  const idle = await button.boundingBox();
  await expect(spinnerIn(button)).toHaveCount(0);

  const release = await holdServerActions(page);
  await button.click();

  await expect(button).toHaveAttribute("aria-busy", "true");
  await expect(button).toBeDisabled();
  await expect(spinnerIn(button)).toBeVisible();
  expect((await button.boundingBox())?.width).toBeCloseTo(idle!.width, 0);

  release();
  await expect(card.paymentBadge("paid")).toBeVisible();
  await expect(button).toBeHidden();
});

// AlertDialogAction renders its Button `asChild`: the spinner has to land
// inside the dialog's button, not beside it.
test("a pending dialog action spins inside its own button", async ({
  page,
  t,
  appLocale,
  user,
}) => {
  const { order } = await orderWithPayments(user.id);
  const card = new PaymentsCard(page, t);
  await card.goto(appLocale, order.id);
  await card.removeButtons("400.00").click();

  const dialog = card.confirmDialog();
  const confirm = dialog.getByRole("button", { name: t("common.delete") });
  const cancel = dialog.getByRole("button", { name: t("common.cancel") });
  const release = await holdServerActions(page);
  await confirm.click();

  await expect(confirm).toHaveAttribute("aria-busy", "true");
  await expect(spinnerIn(confirm)).toBeVisible();
  await expect(cancel).toBeDisabled();

  release();
  await expect(dialog).toBeHidden();
  await expect
    .poll(async () => prisma.payment.count({ where: { orderId: order.id } }))
    .toBe(1);
});
