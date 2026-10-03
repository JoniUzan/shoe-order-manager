import { prisma } from "@repo/db";

import { expect, test } from "../../fixtures/index.ts";

import { OrderForm, OrderPage } from "./locators.ts";
import { orderPrerequisites } from "./setup.ts";

test("an order with Cartons of a Pack and Loose pairs", async ({ page, t, appLocale, user }) => {
  const { customer, model } = await orderPrerequisites(user.id);
  const form = new OrderForm(page, t);

  await form.gotoNew(appLocale);
  await form.pickCustomer(customer.name);
  await form.continue();
  await form.addModel(model.name);
  await expect(form.unitPrice()).toHaveValue("100");
  await form.addPack(1);
  await form.addCarton(); // 2 Cartons: 16 pairs
  await expect(form.packCount()).toHaveValue("2");
  await form.pairs(2).fill("1"); // + 1 Loose pair of size 40
  await form.closeModel();
  await expect(page.getByText("1,700.00").first()).toBeVisible();
  await form.save();

  await page.waitForURL(OrderPage.URL);
  const order = new OrderPage(page, t);
  await expect(order.heading(1)).toBeVisible();
  await expect(order.paymentBadge("unpaid")).toBeVisible();
  await expect(page.getByText("1,700.00").first()).toBeVisible();

  const saved = await prisma.order.findFirstOrThrow({
    where: { ownerId: user.id },
    include: { packs: true },
  });
  expect(saved.packs).toMatchObject([{ packName: "Mix", count: 2, curve: "38:3,39:2,40:3" }]);
});
