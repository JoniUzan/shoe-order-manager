import type { Page } from "@playwright/test";

import type { T } from "../../fixtures/index.ts";

/** The new/edit Customer form. */
export class CustomerForm {
  constructor(
    private page: Page,
    private t: T,
  ) {}

  async gotoNew(locale: string) {
    await this.page.goto(`/${locale}/customers/new`);
  }

  async fill(fields: { name?: string; contactName?: string; phone?: string; address?: string }) {
    for (const [id, value] of Object.entries(fields)) {
      if (value !== undefined) await this.page.fill(`#${id}`, value);
    }
  }

  async save() {
    await this.page.getByRole("button", { name: this.t("common.save") }).click();
  }
}

/** A Customer's page: details, order history, edit and delete. */
export class CustomerPage {
  static readonly URL = /\/customers\/c[a-z0-9]{16,}$/;

  constructor(
    private page: Page,
    private t: T,
  ) {}

  async goto(locale: string, id: string) {
    await this.page.goto(`/${locale}/customers/${id}`);
  }

  heading(name: string) {
    return this.page.getByRole("heading", { name });
  }

  async edit() {
    await this.page.getByRole("link", { name: this.t("customers.edit") }).click();
  }

  /** Delete, and confirm in the dialog. */
  async delete() {
    // The Customer's own Delete opens a dialog; the order history has others.
    await this.page
      .getByRole("button", { name: this.t("common.delete") })
      .and(this.page.locator('[aria-haspopup="dialog"]'))
      .click();
    await this.page
      .getByRole("alertdialog")
      .getByRole("button", { name: this.t("common.delete") })
      .click();
  }

  hasOrdersError() {
    return this.page.getByText(this.t("customers.errorHasOrders"));
  }
}
