import { prisma } from "@repo/db";

import { expect, test } from "../../fixtures/index.ts";

import { OrderForm, OrderPage, OrdersList } from "./locators.ts";
import { createCustomer, orderWithChangedPack, threeOrders } from "./setup.ts";

test("a custom item makes a custom order", async ({ page, t, appLocale, user }) => {
  const customer = await createCustomer(user.id);
  const form = new OrderForm(page, t);
  await form.gotoNew(appLocale);
  await form.pickCustomer(customer.name);
  await form.continue();
  await form.addCustomItem("Red boots");
  await form.unitPrice().fill("250");
  await form.addSize("41", 2);
  await form.closeModel();
  await expect(page.getByText("500.00").first()).toBeVisible();
  await form.save();

  await page.waitForURL(OrderPage.URL);
  const order = await prisma.order.findFirstOrThrow({
    where: { ownerId: user.id },
    include: { items: true },
  });
  expect(order).toMatchObject({ isCustomOrder: true, totalAgorot: 50_000 });
  expect(order.items).toMatchObject([
    { customDescription: "Red boots", size: "41", quantity: 2, shoeModelId: null },
  ]);
});

test("editing an order keeps the Pack it was sold with", async ({ page, t, appLocale, user }) => {
  const { order, model } = await orderWithChangedPack(user.id);
  const orderPage = new OrderPage(page, t);
  await orderPage.goto(appLocale, order.id);
  await orderPage.edit();

  const form = new OrderForm(page, t);
  await form.ready();
  await form.editFromReview("items");
  await form.openModel(model.name);
  await form.packCount().fill("3");
  await form.closeModel();
  await form.save();
  await page.waitForURL(OrderPage.URL);

  const saved = await prisma.order.findUniqueOrThrow({
    where: { id: order.id },
    include: { packs: true },
  });
  // Still 8 pairs a Carton, not the catalog's 10 now.
  expect(saved.packs).toMatchObject([{ curve: "38:3,39:2,40:3", count: 3 }]);
  expect(saved.totalAgorot).toBe(3 * 8 * 10_000);
});

test("mark an order done, then reopen it", async ({ page, t, appLocale, user }) => {
  const { order } = await orderWithChangedPack(user.id);
  const orderPage = new OrderPage(page, t);
  await orderPage.goto(appLocale, order.id);
  await expect(orderPage.statusBadge("not_done")).toBeVisible();

  await orderPage.markDone().click();
  await expect(orderPage.statusBadge("done")).toBeVisible();
  await orderPage.reopen().click();
  await expect(orderPage.statusBadge("not_done")).toBeVisible();
});

test("an order in the list opens its page, by number or by row", async ({ page, t, appLocale, user }) => {
  await threeOrders(user.id);
  const [, second, third] = await prisma.order.findMany({
    where: { ownerId: user.id },
    orderBy: { orderNumber: "asc" },
  });
  const list = new OrdersList(page, t);
  const orderPage = new OrderPage(page, t);

  await list.goto(appLocale);
  await list.orderLink(2).click();
  await page.waitForURL(new RegExp(`/orders/${second!.id}$`));
  await expect(orderPage.heading(2)).toBeVisible();

  await list.goto(appLocale);
  await list.clickRow(3);
  await page.waitForURL(new RegExp(`/orders/${third!.id}$`));
  await expect(orderPage.heading(3)).toBeVisible();
});

test("Payments sit beside the items on a computer, under them on a phone", async ({
  page,
  t,
  appLocale,
  user,
  isMobile,
}) => {
  const { order } = await orderWithChangedPack(user.id);
  const orderPage = new OrderPage(page, t);
  await orderPage.goto(appLocale, order.id);
  await expect(orderPage.itemsTable()).toBeVisible();
  await expect(orderPage.paymentsTitle()).toBeVisible();

  const table = await orderPage.itemsTable().boundingBox();
  const payments = await orderPage.paymentsTitle().boundingBox();
  expect(table && payments).toBeTruthy();
  if (isMobile) {
    expect(payments!.y).toBeGreaterThan(table!.y + table!.height);
  } else {
    expect(payments!.y).toBeLessThan(table!.y + table!.height);
    const beside =
      payments!.x + payments!.width <= table!.x || payments!.x >= table!.x + table!.width;
    expect(beside).toBe(true);
  }
});

test("bulk: mark selected orders done, then delete them", async ({ page, t, appLocale, user }) => {
  await threeOrders(user.id);
  const list = new OrdersList(page, t);
  await list.goto(appLocale);
  await list.select(1);
  await list.select(2);
  await expect(list.selection(2)).toBeVisible();

  await list.bulkMarkDone();
  await expect
    .poll(() => prisma.order.count({ where: { ownerId: user.id, statusCode: "done" } }))
    .toBe(2);

  // A bulk update clears the selection.
  await list.select(1);
  await list.select(2);
  await list.bulkDelete();
  await expect.poll(() => prisma.order.count({ where: { ownerId: user.id } })).toBe(1);
  const left = await prisma.order.findFirstOrThrow({ where: { ownerId: user.id } });
  expect(left.orderNumber).toBe(3);
});
