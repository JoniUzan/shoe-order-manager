import { prisma } from "@repo/db";

import { expect, test } from "../../fixtures/index.ts";

import { OrderForm, OrderPage } from "./locators.ts";
import { orderWithMaterials } from "./setup.ts";

test("Material and Sole, picked from earlier orders, reach the order page", async ({
  page,
  t,
  appLocale,
  user,
}) => {
  const { customer, model } = await orderWithMaterials(user.id);
  const form = new OrderForm(page, t);

  await form.gotoNew(appLocale);
  await form.pickCustomer(customer.name);
  await form.continue();
  await form.addModel(model.name);
  await form.pairs(0).fill("2");
  await form.color().fill("Black");
  await form.material().fill("Lea");
  await form.suggestion("Leather").click();
  await expect(form.material()).toHaveValue("Leather");
  await form.sole().fill("Rubber"); // Not offered: kept as typed.
  await form.closeModel();
  await form.save();

  await page.waitForURL(OrderPage.URL);
  const order = new OrderPage(page, t);
  await expect(order.itemDetails("Black · Leather · Rubber")).toBeVisible();

  const items = await prisma.orderItem.findMany({
    where: { order: { ownerId: user.id, orderNumber: 2 } },
    select: { material: true, sole: true },
  });
  expect(items).toEqual([{ material: "Leather", sole: "Rubber" }]);
});

test("the Sole field offers earlier values matching what's typed", async ({
  page,
  t,
  appLocale,
  user,
}) => {
  const { customer, model } = await orderWithMaterials(user.id);
  const form = new OrderForm(page, t);

  await form.gotoNew(appLocale);
  await form.pickCustomer(customer.name);
  await form.continue();
  await form.addModel(model.name);
  await form.sole().fill("ev");
  await expect(form.suggestion("EVA")).toBeVisible();
  await form.sole().press("ArrowDown");
  await form.sole().press("Enter");
  await expect(form.sole()).toHaveValue("EVA");
  await expect(form.suggestion("EVA")).toBeHidden();
});
