import { prisma } from "@repo/db";

import { expect, test } from "../../fixtures/index.ts";
import { CustomerPage } from "../customers/locators.ts";
import { customerWithOrder } from "../customers/setup.ts";
import { OrderPage } from "../orders/locators.ts";
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
  // Fully in only after its 150ms delay and 200ms fade.
  await expect(spinnerIn(button)).toHaveCSS("opacity", "1");
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
  // Fully in only after its 150ms delay and 200ms fade.
  await expect(spinnerIn(confirm)).toHaveCSS("opacity", "1");
  await expect(cancel).toBeDisabled();

  release();
  await expect(dialog).toBeHidden();
  await expect
    .poll(async () => prisma.payment.count({ where: { orderId: order.id } }))
    .toBe(1);
});

// Radix closes an AlertDialog on its action's click unless the handler stops
// it; the delete dialogs have to stay up for the spinner to be seen at all.
test("deleting an order keeps its dialog up and spinning until it's gone", async ({
  page,
  t,
  appLocale,
  user,
}) => {
  const { order } = await unpaidOrder(user.id);
  const orderPage = new OrderPage(page, t);
  await orderPage.goto(appLocale, order.id);
  await orderPage.openDelete();

  const confirm = orderPage.deleteAnswer("confirm");
  const release = await holdServerActions(page);
  await confirm.click();

  await expect(confirm).toHaveAttribute("aria-busy", "true");
  await expect(spinnerIn(confirm)).toBeVisible();
  // Fully in only after its 150ms delay and 200ms fade.
  await expect(spinnerIn(confirm)).toHaveCSS("opacity", "1");
  // A dialog that closed on the click would be gone by now (it fades for 200ms).
  await expect(orderPage.deleteDialog()).toBeVisible();
  await expect(orderPage.deleteAnswer("cancel")).toBeDisabled();

  release();
  await expect(page).toHaveURL(new RegExp(`/${appLocale}/orders$`));
  await expect
    .poll(async () => prisma.order.count({ where: { id: order.id } }))
    .toBe(0);
});

test("a refused customer delete leaves its dialog up and ready again", async ({
  page,
  t,
  appLocale,
  user,
}) => {
  const customer = await customerWithOrder(user.id);
  const customerPage = new CustomerPage(page, t);
  await customerPage.goto(appLocale, customer.id);
  await customerPage.openDelete();

  const confirm = customerPage.deleteAnswer("confirm");
  const release = await holdServerActions(page);
  await confirm.click();

  await expect(confirm).toHaveAttribute("aria-busy", "true");
  await expect(spinnerIn(confirm)).toBeVisible();
  // Fully in only after its 150ms delay and 200ms fade.
  await expect(spinnerIn(confirm)).toHaveCSS("opacity", "1");
  await expect(customerPage.deleteDialog()).toBeVisible();

  release();
  await expect(confirm).not.toHaveAttribute("aria-busy", "true");
  await expect(confirm).toBeEnabled();
  await expect(customerPage.deleteDialog()).toBeVisible();
  expect(await prisma.customer.count({ where: { id: customer.id } })).toBe(1);
});
