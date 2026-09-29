import { prisma } from "@repo/db";

import { unique } from "../../fixtures/db.ts";
import { expect, test } from "../../fixtures/index.ts";

import { CustomerForm, CustomerPage } from "./locators.ts";
import { createCustomer, customerWithOrder } from "./setup.ts";

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
