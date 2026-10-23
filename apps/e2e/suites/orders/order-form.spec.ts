import { prisma } from "@repo/db";

import { unique } from "../../fixtures/db.ts";
import { expect, test } from "../../fixtures/index.ts";

import { OrderForm, OrderPage } from "./locators.ts";
import { createCustomer, orderPrerequisites, orderWithChangedPack } from "./setup.ts";

test("a new order can't leave the Customer step without a Customer", async ({ page, t, appLocale, user }) => {
  const { customer } = await orderPrerequisites(user.id);
  const form = new OrderForm(page, t);
  await form.gotoNew(appLocale);
  await form.continue();
  await expect(form.error("orders.errorNoCustomer")).toBeVisible();
  await expect(form.stepTitle("Customer")).toBeVisible();

  await form.pickCustomer(customer.name);
  await expect(form.error("orders.errorNoCustomer")).toBeHidden();
  await form.continue();
  await expect(form.stepTitle("Items")).toBeVisible();
});

test("the Items step needs a model, and a model needs pairs", async ({ page, t, appLocale, user }) => {
  const { customer, model } = await orderPrerequisites(user.id);
  const form = new OrderForm(page, t);
  await form.gotoNew(appLocale);
  await form.pickCustomer(customer.name);
  await form.continue();

  await form.continue();
  await expect(form.error("orders.errorNoItems")).toBeVisible();
  await expect(form.stepTitle("Items")).toBeVisible();

  await form.addModel(model.name);
  await form.closeModel();
  await form.continue();
  await expect(form.error("orders.errorNoPairsOrPacks")).toBeVisible();
  await expect(form.stepTitle("Items")).toBeVisible();
  expect(await prisma.order.count({ where: { ownerId: user.id } })).toBe(0);
});

test("Enter in the Customer search picks the only match and continues", async ({ page, t, appLocale, user }) => {
  const { customer } = await orderPrerequisites(user.id);
  const form = new OrderForm(page, t);
  await form.gotoNew(appLocale);
  await form.customerSearch().fill(customer.name);
  await form.customerSearch().press("Enter");

  await expect(form.stepTitle("Items")).toBeVisible();
  await form.goToStep("Customer");
  await expect(page.getByRole("radio", { checked: true })).toHaveCount(1);
});

test("a new Customer is added from the Customer step and picked", async ({ page, t, appLocale, user }) => {
  await orderPrerequisites(user.id);
  const name = unique("New store");
  const form = new OrderForm(page, t);
  await form.gotoNew(appLocale);

  // The search that found nothing starts the name.
  await form.customerSearch().fill(name);
  await form.newCustomer();
  await expect(form.newCustomerName()).toHaveValue(name);

  await form.newCustomerName().fill("");
  await form.saveNewCustomer();
  await expect(form.newCustomerSheet().getByText(t("validation.required"))).toBeVisible();

  await form.newCustomerName().fill(name);
  await form.saveNewCustomer();
  await expect(form.newCustomerSheet()).toBeHidden();
  // Saving the sheet doesn't submit the order form under it.
  await expect(form.stepTitle("Customer")).toBeVisible();
  await expect(form.pickedCustomer()).toHaveAccessibleName(new RegExp(name));
  await expect
    .poll(() => prisma.customer.count({ where: { ownerId: user.id, name } }))
    .toBe(1);

  await form.continue();
  await expect(form.stepTitle("Items")).toBeVisible();
});

test("a finished step can be opened again and keeps what was typed; one not reached is locked", async ({ page, t, appLocale, user }) => {
  const { customer, model } = await orderPrerequisites(user.id);
  const form = new OrderForm(page, t);
  await form.gotoNew(appLocale);
  await form.pickCustomer(customer.name);
  await form.continue();
  await form.addModel(model.name);
  await form.pairs(0).fill("4");
  await form.closeModel();
  expect(await form.canOpenFromBar("Notes")).toBe(false);

  await form.goToStep("Customer");
  await form.goToStep("Items");
  await form.openModel(model.name);
  await expect(form.pairs(0)).toHaveValue("4");
});

test("Cancel leaves at once when nothing was typed", async ({ page, t, appLocale, user }) => {
  await orderPrerequisites(user.id);
  const form = new OrderForm(page, t);
  await form.gotoNew(appLocale);
  await form.cancel();

  await expect(page).toHaveURL(new RegExp(`/${appLocale}/orders$`));
});

test("Cancel asks first once something was chosen", async ({ page, t, appLocale, user }) => {
  const { customer } = await orderPrerequisites(user.id);
  const form = new OrderForm(page, t);
  await form.gotoNew(appLocale);
  await form.pickCustomer(customer.name);

  await form.cancel();
  await expect(form.discardDialog()).toBeVisible();
  await form.keepEditing();
  await expect(form.discardDialog()).toBeHidden();
  await expect(page.getByRole("radio", { checked: true })).toHaveCount(1);

  await form.cancel();
  await form.discard();
  await expect(page).toHaveURL(new RegExp(`/${appLocale}/orders$`));
  expect(await prisma.order.count({ where: { ownerId: user.id } })).toBe(0);
});

test("an existing order opens on Review and saves from there", async ({ page, t, appLocale, user }) => {
  const { order } = await orderWithChangedPack(user.id);
  const form = new OrderForm(page, t);
  await form.gotoEdit(appLocale, order.id);
  await expect(form.stepTitle("Review")).toBeVisible();
  await form.setStatus("done");
  await form.save();

  await page.waitForURL(OrderPage.URL);
  await expect
    .poll(async () => (await prisma.order.findUniqueOrThrow({ where: { id: order.id } })).statusCode)
    .toBe("done");
});

test("a model that fails its check takes the save to the Items step", async ({ page, t, appLocale, user }) => {
  const { order, model } = await orderWithChangedPack(user.id);
  const form = new OrderForm(page, t);
  await form.gotoEdit(appLocale, order.id);
  await form.goToStep("Items");
  await form.openModel(model.name);
  await form.packCount().fill("0");
  await form.closeModel();
  await form.goToStep("Customer");
  await form.save();

  await expect(form.stepTitle("Items")).toBeVisible();
  await expect(form.error("orders.errorPackCount", { max: 999 })).toBeVisible();
  const pack = await prisma.orderPack.findFirstOrThrow({ where: { orderId: order.id } });
  expect(pack.count).toBe(2);
});

test("a long step scrolls inside its pane: the window stays put and the buttons stay on screen", async ({ page, t, appLocale, user }) => {
  // Enough Customers to overflow the pane. Their hidden radios once hung off
  // the pane and made the whole window scroll, hiding the buttons.
  for (let i = 0; i < 25; i++) await createCustomer(user.id);
  const form = new OrderForm(page, t);
  await form.gotoNew(appLocale);
  await expect(form.stepTitle("Customer")).toBeVisible();

  expect(await form.scrollsInPlace()).toBe(true);
});

test("a model left empty is dropped, and a model can be removed", async ({ page, t, appLocale, user }) => {
  const { customer, model } = await orderPrerequisites(user.id);
  const form = new OrderForm(page, t);
  await form.gotoNew(appLocale);
  await form.pickCustomer(customer.name);
  await form.continue();
  await form.addModel(model.name);
  await form.pairs(0).fill("2");
  await form.closeModel();

  await form.addEmptyModel();
  await form.closeModel();
  await form.continue();
  // The empty one was dropped rather than failing "Choose a model".
  await expect(form.stepTitle("Notes")).toBeVisible();
  await form.goToStep("Items");
  await expect(form.modelRow(t("orders.selectModel"))).toHaveCount(0);

  await form.removeModel(model.name);
  await expect(form.error("orders.itemsEmptyStep")).toBeVisible();
  await form.continue();
  await expect(form.error("orders.errorNoItems")).toBeVisible();
});

test("a picked model shows its fields at once, in a sheet that's already full height", async ({ page, t, appLocale, user }) => {
  const { customer, model } = await orderPrerequisites(user.id);
  const form = new OrderForm(page, t);
  await form.gotoNew(appLocale);
  await form.pickCustomer(customer.name);
  await form.continue();

  await form.addEmptyModel();
  await expect.poll(() => form.modelSheetFullHeight()).toBe(true);

  await form.pickModel(model.name);
  // On screen as they are, without scrolling to them or opening the model again.
  await expect(form.pairs(0)).toBeInViewport();
  await expect(form.unitPrice()).toBeInViewport();
  expect(await form.modelSheetFullHeight()).toBe(true);
});
