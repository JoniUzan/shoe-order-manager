import type { Page } from "@playwright/test";

import type { T } from "../../fixtures/index.ts";

/** The new/edit order form: one block per model, with Packs and a size grid. */
export class OrderForm {
  constructor(
    private page: Page,
    private t: T,
  ) {}

  async goto(locale: string) {
    await this.page.goto(`/${locale}/orders/new`);
  }

  async pickCustomer(name: string) {
    await this.page.getByRole("combobox", { name: this.t("orders.customer") }).click();
    await this.page.getByRole("option", { name }).click();
  }

  /** Pick the model of the block that's still empty. */
  async pickModel(name: string) {
    await this.page
      .getByRole("combobox")
      .filter({ hasText: this.t("orders.selectModel") })
      .click();
    await this.page.getByRole("option", { name }).click();
  }

  /** Add the next free Pack of the model and set how many Cartons. */
  async addPack(cartons: number) {
    await this.page.getByRole("button", { name: this.t("orders.addPack") }).click();
    await this.page.getByLabel(this.t("orders.packCount")).last().fill(String(cartons));
  }

  packCount() {
    return this.page.getByLabel(this.t("orders.packCount"));
  }

  /** The pairs box of the nth size column (0-based, in the model's run order). */
  pairs(column: number) {
    return this.page.getByLabel(this.t("orders.pairs"), { exact: true }).nth(column);
  }

  async setCustomItem(description: string) {
    await this.page.getByRole("radio", { name: this.t("orders.customItem") }).click();
    await this.page.getByPlaceholder(this.t("orders.customDescription")).fill(description);
  }

  async addSize(size: string, pairs: number) {
    await this.page.getByRole("button", { name: this.t("orders.addSize") }).click();
    await this.page.getByLabel(this.t("orders.size"), { exact: true }).last().fill(size);
    await this.pairs(-1).fill(String(pairs));
  }

  unitPrice() {
    return this.page.getByPlaceholder(this.t("orders.unitPrice"));
  }

  async save() {
    await this.page.getByRole("button", { name: this.t("common.save") }).click();
  }
}

/** An order's detail page. */
export class OrderPage {
  static readonly URL = /\/orders\/c[a-z0-9]{16,}$/;

  constructor(
    private page: Page,
    private t: T,
  ) {}

  async goto(locale: string, id: string) {
    await this.page.goto(`/${locale}/orders/${id}`);
  }

  heading(number: number) {
    return this.page.getByRole("heading", { name: this.t("orders.orderNumber", { number }) });
  }

  /** "Paid", "Partial", … badge text for a payment status. */
  paymentBadge(status: "unpaid" | "partial" | "paid") {
    return this.page.getByText(this.t(`payment.${status}`), { exact: true }).first();
  }

  statusBadge(code: "not_done" | "done") {
    return this.page.getByText(this.t(`status.${code}`), { exact: true }).first();
  }

  async edit() {
    await this.page.getByRole("link", { name: this.t("orders.edit") }).click();
  }
}
