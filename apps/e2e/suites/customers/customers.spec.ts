import { prisma } from "@repo/db";

import { unique } from "../../fixtures/db.ts";
import { expect, test } from "../../fixtures/index.ts";

import { CustomerForm, CustomerPage } from "./locators.ts";
import { createCustomer, customerWithDoneOrder, customerWithOrder } from "./setup.ts";

test("create a Customer, then edit it", async ({ page, t, appLocale, user }) => {
  const name = unique("Store");
  const form = new CustomerForm(page, t);
  await form.gotoNew(appLocale);
  await form.fill({ name, contactName: "Dana", phone: "050-1234567" });
  await form.save();

  await page.waitForURL(CustomerPage.URL);
  const customerPage = new CustomerPage(page, t);
  await expect(customerPage.heading(name)).toBeVisible();
  await expect(page.getByText("050-1234567")).toBeVisible();

  await customerPage.edit();
  await form.fill({ name: `${name} 2` });
  await form.save();
  await page.waitForURL(CustomerPage.URL);
  await expect(customerPage.heading(`${name} 2`)).toBeVisible();
  const saved = await prisma.customer.findFirstOrThrow({ where: { ownerId: user.id } });
  expect(saved).toMatchObject({ name: `${name} 2`, contactName: "Dana" });
});

test("a Customer with orders can't be deleted", async ({ page, t, appLocale, user }) => {
  const customer = await customerWithOrder(user.id);
  const customerPage = new CustomerPage(page, t);
  await customerPage.goto(appLocale, customer.id);
  await customerPage.delete();
  await expect(customerPage.hasOrdersError()).toBeVisible();
  expect(await prisma.customer.count({ where: { id: customer.id } })).toBe(1);
});

test("a Customer without orders is deleted", async ({ page, t, appLocale, user }) => {
  const customer = await createCustomer(user.id);
  const customerPage = new CustomerPage(page, t);
  await customerPage.goto(appLocale, customer.id);
  await customerPage.delete();
  await expect(page).toHaveURL(new RegExp(`/${appLocale}/customers$`));
  expect(await prisma.customer.count({ where: { id: customer.id } })).toBe(0);
});

test("a filter that matches no orders keeps the toolbar and can be cleared", async ({
  page,
  t,
  appLocale,
  user,
}) => {
  const customer = await customerWithDoneOrder(user.id);
  const customerPage = new CustomerPage(page, t);
  await customerPage.goto(appLocale, customer.id);

  await customerPage.filterTab("filterOpen").click();
  await expect(page).toHaveURL(/[?&]filter=open/);
  await expect(customerPage.noMatch()).toBeVisible();
  await expect(customerPage.filterTab("filterOpen")).toBeVisible();

  await customerPage.clearFiltersButton().click();
  await expect(page).not.toHaveURL(/filter=/);
  await expect(customerPage.filterTab("filterAll")).toHaveAttribute("aria-selected", "true");
  await expect(customerPage.noMatch()).toBeHidden();
  await expect(customerPage.rowCount(1)).toBeVisible();
});

test("a Customer can't be saved without a name", async ({ page, t, appLocale, user }) => {
  const form = new CustomerForm(page, t);
  await form.gotoNew(appLocale);
  await form.fill({ contactName: "Dana" });
  await form.save();
  await expect(form.nameRequired()).toBeVisible();
  await expect(page).toHaveURL(new RegExp(`/${appLocale}/customers/new$`));

  await form.fill({ name: unique("Store") });
  await expect(form.nameRequired()).toBeHidden();
  expect(await prisma.customer.count({ where: { ownerId: user.id } })).toBe(0);
});

test("Enter in a field saves the Customer", async ({ page, t, appLocale, user }) => {
  const name = unique("Store");
  const form = new CustomerForm(page, t);
  await form.gotoNew(appLocale);
  await form.fill({ name });
  await form.pressEnterInName();

  await page.waitForURL(CustomerPage.URL);
  await expect(new CustomerPage(page, t).heading(name)).toBeVisible();
  expect(await prisma.customer.count({ where: { ownerId: user.id } })).toBe(1);
});

test("Cancel leaves at once when nothing was typed", async ({ page, t, appLocale, user }) => {
  const form = new CustomerForm(page, t);
  await form.gotoNew(appLocale);
  await form.cancel();
  await expect(page).toHaveURL(new RegExp(`/${appLocale}/customers$`));

  // Editing, it goes back to the Customer.
  const customer = await createCustomer(user.id);
  await form.gotoEdit(appLocale, customer.id);
  await form.cancel();
  await expect(page).toHaveURL(new RegExp(`/${appLocale}/customers/${customer.id}$`));
});

test("Cancel asks first once something was typed", async ({ page, t, appLocale, user }) => {
  const form = new CustomerForm(page, t);
  await form.gotoNew(appLocale);
  await form.fill({ name: "Half typed" });

  await form.cancel();
  await expect(form.discardDialog()).toBeVisible();
  await form.keepEditing();
  await expect(form.discardDialog()).toBeHidden();
  await expect(page.locator("#name")).toHaveValue("Half typed");

  await form.cancel();
  await form.discard();
  await expect(page).toHaveURL(new RegExp(`/${appLocale}/customers$`));
  expect(await prisma.customer.count({ where: { ownerId: user.id } })).toBe(0);
});
