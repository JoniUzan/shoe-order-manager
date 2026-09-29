import type { Page } from "@playwright/test";

import type { T } from "../../fixtures/index.ts";

/** The Payments card on an order's page, and its record dialog. */
export class PaymentsCard {
  constructor(
    private page: Page,
    private t: T,
  ) {}

  async goto(locale: string, orderId: string) {
    await this.page.goto(`/${locale}/orders/${orderId}`);
  }

  dialog() {
    return this.page.getByRole("dialog");
  }

  async record(shekels: number) {
    await this.page.getByRole("button", { name: this.t("payments.record") }).click();
    await this.dialog().locator("#pay-amount").fill(String(shekels));
    await this.dialog().getByRole("button", { name: this.t("payments.record") }).click();
  }

  markFullyPaid() {
    return this.page.getByRole("button", { name: this.t("payments.markFullyPaid") });
  }

  /**
   * The remove button of each payment in the history, named "Remove payment
   * of ₪400.00". With `amount` (as the user reads it, e.g. "400.00"), only
   * that payment's button.
   */
  removeButtons(amount?: string) {
    const [before, after] = this.t("payments.remove", { amount: "\u0000" }).split("\u0000");
    const middle = amount ? `.*${escapeRegExp(amount)}.*` : ".+";
    return this.page.getByRole("button", {
      name: new RegExp(`^${escapeRegExp(before!)}${middle}${escapeRegExp(after!)}$`),
    });
  }

  /** The "Remove payment?" dialog the × opens. */
  confirmDialog() {
    return this.page.getByRole("alertdialog", { name: this.t("payments.removeTitle") });
  }

  /** Press the × on a payment, then Delete or Cancel in the dialog. */
  async remove(amount: string, answer: "confirm" | "cancel" = "confirm") {
    await this.removeButtons(amount).click();
    const key = answer === "confirm" ? "common.delete" : "common.cancel";
    await this.confirmDialog().getByRole("button", { name: this.t(key) }).click();
  }

  tooMuchError() {
    return this.page.getByText(this.t("payments.errorTooMuch"));
  }

  paymentBadge(status: "unpaid" | "partial" | "paid") {
    return this.page.getByText(this.t(`payment.${status}`), { exact: true }).first();
  }
}

function escapeRegExp(text: string) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
