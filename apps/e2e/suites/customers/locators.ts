import type { Page } from "@playwright/test";

import type { T } from "../../fixtures/index.ts";

/** The new/edit Customer form: one page on StepForm. */
export class CustomerForm {
  constructor(
    private page: Page,
    private t: T,
  ) {}

  async gotoNew(locale: string) {
    await this.page.goto(`/${locale}/customers/new`);
    await this.ready();
  }

  async gotoEdit(locale: string, id: string) {
    await this.page.goto(`/${locale}/customers/${id}/edit`);
    await this.ready();
  }

  /** Until it hydrates, react-hook-form writes saved values over anything typed. */
  async ready() {
    await this.page.locator("form[data-ready]").waitFor();
  }

  async fill(fields: { name?: string; contactName?: string; phone?: string; address?: string }) {
    for (const [id, value] of Object.entries(fields)) {
      if (value !== undefined) await this.page.fill(`#${id}`, value);
    }
  }

  nameRequired() {
    return this.page.getByText(this.t("validation.required"));
  }

  /** Enter in the name field: submits, like the Save button. */
  async pressEnterInName() {
    await this.page.locator("#name").press("Enter");
  }

  /** ✕ Cancel: a labelled button on a computer, an icon on a phone; same name. */
  async cancel() {
    await this.page.getByRole("button", { name: this.t("common.cancel"), exact: true }).click();
  }

  discardDialog() {
    return this.page.getByRole("alertdialog");
  }

  async keepEditing() {
    await this.discardDialog().getByRole("button", { name: this.t("common.keepEditing") }).click();
  }

  async discard() {
    await this.discardDialog().getByRole("button", { name: this.t("common.discard") }).click();
  }

  async save() {
    await this.page.getByRole("button", { name: this.t("customers.saveCustomer") }).click();
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

  /** Open the edit form, and wait for it to be ready for typing. */
  async edit() {
    await this.page.getByRole("link", { name: this.t("customers.edit") }).click();
    await this.page.locator("form[data-ready]").waitFor();
  }

  /** Open the "Delete customer?" dialog from the Customer's own Delete. */
  async openDelete() {
    // The Customer's own Delete opens a dialog; the order history has others.
    await this.page
      .getByRole("button", { name: this.t("common.delete") })
      .and(this.page.locator('[aria-haspopup="dialog"]'))
      .click();
  }

  deleteDialog() {
    return this.page.getByRole("alertdialog", { name: this.t("customers.deleteTitle") });
  }

  /** Delete or Cancel in the open "Delete customer?" dialog. */
  deleteAnswer(answer: "confirm" | "cancel") {
    const key = answer === "confirm" ? "common.delete" : "common.cancel";
    return this.deleteDialog().getByRole("button", { name: this.t(key) });
  }

  /** Delete, and confirm in the dialog. */
  async delete() {
    await this.openDelete();
    await this.deleteAnswer("confirm").click();
  }

  hasOrdersError() {
    return this.page.getByText(this.t("customers.errorHasOrders"));
  }

  /** The order history's filter tabs: all, open, unpaid. */
  filterTab(key: "filterAll" | "filterOpen" | "filterUnpaid") {
    return this.page.getByRole("tab", { name: this.t(`orders.${key}`) });
  }

  noMatch() {
    return this.page.getByText(this.t("dashboard.noMatch"));
  }

  /** The order history's footer, e.g. "1 orders". */
  rowCount(count: number) {
    // On a phone the count text matches twice; only one is shown.
    return this.page
      .getByText(this.t("dashboard.rowCount", { count }), { exact: true })
      .filter({ visible: true });
  }

  clearFiltersButton() {
    return this.page.getByRole("button", { name: this.t("list.clearFilters") });
  }
}
