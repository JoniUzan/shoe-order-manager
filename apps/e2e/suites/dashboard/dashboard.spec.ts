import { createCustomer } from "../../fixtures/db.ts";
import { expect, test } from "../../fixtures/index.ts";
import { OrderForm } from "../orders/locators.ts";

import { DashboardPage, QuickActions } from "./locators.ts";
import { businessWithOrders } from "./setup.ts";

test("a new business sees only Get started", async ({ page, t, appLocale, user }) => {
  const dashboard = new DashboardPage(page, t);
  await dashboard.goto(appLocale);
  await expect(dashboard.getStarted()).toBeVisible();
  await expect(dashboard.card("cardBalanceDue")).toHaveCount(0);
  expect(user.id).toBeTruthy();
});

test("the cards count what's owed, open and new, and open their lists", async ({
  page,
  t,
  appLocale,
  user,
}) => {
  const { customer, open } = await businessWithOrders(user.id);
  const dashboard = new DashboardPage(page, t);
  await dashboard.goto(appLocale);

  await expect(dashboard.card("cardBalanceDue")).toContainText("1,300.00");
  await expect(dashboard.card("cardOpenOrders")).toContainText("1");
  await expect(dashboard.card("cardRecent")).toContainText("1,000.00");
  await expect(dashboard.openOrder(open.orderNumber, customer.name)).toBeVisible();

  await dashboard.card("cardOpenOrders").click();
  await expect(page).toHaveURL(/\/orders\?filter=open$/);
  await expect(page.getByRole("row").filter({ hasText: customer.name })).toHaveCount(1);

  await dashboard.goto(appLocale);
  await dashboard.card("cardRecent").click();
  await expect(page).toHaveURL(/\/orders\?filter=recent$/);
  await expect(page.getByRole("row").filter({ hasText: customer.name })).toHaveCount(1);
});

test("New order from a Customer's page starts with that Customer", async ({
  page,
  t,
  appLocale,
  user,
}) => {
  const customer = await createCustomer(user.id);
  await page.goto(`/${appLocale}/customers/${customer.id}`);

  await new QuickActions(page, t).start("newOrder");

  await expect(page).toHaveURL(new RegExp(`/orders/new\\?customer=${customer.id}$`));
  const form = new OrderForm(page, t);
  await form.ready();
  await expect(form.stepTitle("Items")).toBeVisible();
  await expect(page.getByText(customer.name).first()).toBeVisible();
});

test("the quick-action button stays off the forms", async ({ page, t, appLocale, user }) => {
  await createCustomer(user.id);
  const quick = new QuickActions(page, t);
  await page.goto(`/${appLocale}/orders`);
  await expect(quick.button()).toBeVisible();
  await new OrderForm(page, t).gotoNew(appLocale);
  await expect(quick.button()).toHaveCount(0);
});
