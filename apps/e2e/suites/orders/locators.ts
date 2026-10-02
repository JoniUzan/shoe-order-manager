import type { Page } from "@playwright/test";

import type { T } from "../../fixtures/index.ts";

const STEPS = ["Customer", "Items", "Notes", "Review"] as const;
type Step = (typeof STEPS)[number];

/**
 * The new/edit order form, in four steps: Customer, Items, Notes, Review.
 * One model is open at a time: inline on a computer, in a bottom sheet on a
 * phone, so close it (`closeModel`) before moving on.
 */
export class OrderForm {
  constructor(
    private page: Page,
    private t: T,
  ) {}

  async gotoNew(locale: string) {
    await this.page.goto(`/${locale}/orders/new`);
    await this.ready();
  }

  async gotoEdit(locale: string, id: string) {
    await this.page.goto(`/${locale}/orders/${id}/edit`);
    await this.ready();
  }

  /** Until it hydrates, react-hook-form writes saved values over anything typed. */
  async ready() {
    await this.page.locator("form[data-ready]").waitFor();
  }

  async pickCustomer(name: string) {
    await this.page
      .getByRole("radiogroup", { name: this.t("orders.customer") })
      .getByText(name, { exact: true })
      .click();
  }

  customerSearch() {
    return this.page.getByRole("searchbox", { name: this.t("orders.searchCustomer") });
  }

  /** Add a model from the catalog and pick it. */
  async addModel(name: string) {
    await this.page.getByRole("button", { name: this.t("orders.addModel") }).click();
    await this.page
      .getByRole("combobox")
      .filter({ hasText: this.t("orders.selectModel") })
      .click();
    await this.page.getByRole("option", { name }).click();
  }

  /** Add a Custom item and describe it. */
  async addCustomItem(description: string) {
    await this.page.getByRole("button", { name: this.t("orders.addCustomItem") }).click();
    await this.page.getByLabel(this.t("orders.customDescription")).last().fill(description);
  }

  /** Open a folded model to edit it. On a computer it may still be open from before. */
  async openModel(name: string) {
    const row = this.page.getByRole("button", { name: this.t("orders.editModel", { name }) });
    if (this.isPhone() || (await row.isVisible())) await row.click();
  }

  /** Add a model and leave it empty, without picking one. */
  async addEmptyModel() {
    await this.page.getByRole("button", { name: this.t("orders.addModel") }).click();
  }

  /** A folded model's row, by the name it shows (a placeholder until picked). */
  modelRow(name: string) {
    return this.page.getByRole("button", { name: this.t("orders.editModel", { name }) });
  }

  /** Remove a model: ✕ on its card on a computer, "Remove" in its sheet on a phone. */
  async removeModel(name: string) {
    await this.openModel(name);
    if (this.isPhone()) {
      await this.page.getByRole("button", { name: this.t("orders.removeModel"), exact: true }).click();
      await this.page.getByRole("dialog").waitFor({ state: "hidden" });
    } else {
      await this.page
        .getByRole("button", { name: this.t("orders.removeModelNamed", { name }) })
        .click();
    }
  }

  /**
   * Whether a long step stays in place: on a computer the window doesn't
   * scroll, the pane does, and the buttons are on screen; on a phone the page
   * scrolls by design and the buttons are a fixed bar that stays on screen.
   */
  async scrollsInPlace() {
    const primary = this.page.getByRole("button", { name: this.t("common.continue") });
    const onScreen = await primary.evaluate((el) => {
      const b = el.getBoundingClientRect();
      return b.top >= 0 && b.bottom <= window.innerHeight;
    });
    if (this.isPhone()) return onScreen;
    return this.page.evaluate((buttonsOnScreen) => {
      const area = document.querySelector("[data-slot=step-form-pane] > div")!;
      const windowScrolls = document.documentElement.scrollHeight > window.innerHeight;
      const paneScrolls = area.scrollHeight > area.clientHeight;
      return buttonsOnScreen && !windowScrolls && paneScrolls;
    }, onScreen);
  }

  /** Done with the open model: closes its sheet on a phone; on a computer it stays open. */
  async closeModel() {
    if (this.isPhone()) {
      await this.page.getByRole("button", { name: this.t("orders.doneModel") }).click();
      await this.page.getByRole("dialog").waitFor({ state: "hidden" });
    }
  }

  /** Add the next free Pack of the open model and set how many Cartons. */
  async addPack(cartons: number) {
    await this.page.getByRole("button", { name: this.t("orders.addPack") }).click();
    await this.packCount().last().fill(String(cartons));
  }

  packCount() {
    return this.page.getByLabel(this.t("orders.packCount"));
  }

  /** One Carton more of the open model's last Pack. */
  async addCarton() {
    await this.page.getByRole("button", { name: this.t("orders.addCarton") }).last().click();
  }

  /** The pairs box of the nth size column (0-based, in the model's run order). */
  pairs(column: number) {
    return this.page.getByLabel(this.t("orders.pairs"), { exact: true }).nth(column);
  }

  async addSize(size: string, pairs: number) {
    await this.page.getByRole("button", { name: this.t("orders.addSize") }).click();
    await this.page.getByLabel(this.t("orders.size"), { exact: true }).last().fill(size);
    await this.pairs(-1).fill(String(pairs));
  }

  unitPrice() {
    return this.page.getByLabel(this.t("orders.pricePerPair"));
  }

  factoryNote() {
    return this.page.getByLabel(this.t("orders.factoryNote"));
  }

  /** A field's or the step's error, by its words. */
  error(key: string, values?: Record<string, string | number>) {
    return this.page.getByText(this.t(key, values)).first();
  }

  /** The step forward. Each step's fields are only on the page while it shows. */
  async continue() {
    await this.page.getByRole("button", { name: this.t("common.continue") }).click();
  }

  /** A step's title, which shows while that step is open. */
  stepTitle(step: Step) {
    return this.page.getByRole("heading", { name: this.t(`orders.step${step}`), exact: true });
  }

  /**
   * Open a step the way the screen offers it: the step bar on a computer;
   * on a phone, which has no bar buttons, Back and Continue.
   */
  async goToStep(step: Step) {
    if (!this.isPhone()) {
      await this.barButton(step).click();
    } else {
      const target = STEPS.indexOf(step);
      for (let i = 0; i < STEPS.length; i++) {
        const at = await this.currentStep();
        if (at === target) break;
        await this.page
          .getByRole("button", { name: this.t(at > target ? "common.back" : "common.continue") })
          .first()
          .click();
        await this.stepTitle(STEPS[at + (at > target ? -1 : 1)]!).waitFor();
      }
    }
    await this.stepTitle(step).waitFor();
  }

  /** Whether the step bar can open `step`. Never on a phone: its bar has no buttons. */
  async canOpenFromBar(step: Step) {
    return !this.isPhone() && (await this.barButton(step).isEnabled());
  }

  /** "Edit" beside a part of the order on the Review step. */
  async editFromReview(section: "customer" | "items" | "notes") {
    await this.page
      .getByRole("button", {
        name: this.t("orders.editSection", { section: this.t(`orders.${section}`) }),
      })
      .click();
  }

  async setStatus(code: "not_done" | "done") {
    await this.page.getByRole("tab", { name: this.t(`status.${code}`), exact: true }).click();
  }

  private barButton(step: Step) {
    return this.page
      .getByRole("navigation", { name: this.t("common.steps") })
      .getByRole("button", { name: this.t(`orders.step${step}`) });
  }

  private async currentStep() {
    for (const [i, step] of STEPS.entries()) {
      if (await this.stepTitle(step).isVisible()) return i;
    }
    throw new Error("No step title on the page");
  }

  private isPhone() {
    return this.page.viewportSize()!.width < 768;
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

  /**
   * Save the order. A new one walks the remaining steps first (the primary
   * button reads Continue until Review); an existing one saves from any step.
   */
  async save() {
    const save = this.page.getByRole("button", { name: this.t("orders.saveOrder") });
    for (let i = 0; i < STEPS.length && !(await save.isVisible()); i++) {
      const at = await this.currentStep();
      await this.continue();
      await this.stepTitle(STEPS[at + 1]!).waitFor();
    }
    await save.click();
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

  markDone() {
    return this.page.getByRole("button", { name: this.t("orders.markDone") });
  }

  /** Open the PDF menu (a popover on a computer, a drawer on a phone). */
  async openPdfMenu() {
    await this.page.getByRole("button", { name: this.t("pdf.menu") }).click();
  }

  /** Pick the file's language inside the open PDF menu: a segmented control of radio labels. */
  async pdfLanguage(label: "עברית" | "English") {
    await this.page
      .getByRole("radiogroup", { name: this.t("pdf.language") })
      .getByText(label, { exact: true })
      .click();
  }

  /** Download one of the PDFs from the open menu; resolves to the saved file's path. */
  async downloadPdf(doc: "summary" | "production") {
    const download = this.page.waitForEvent("download");
    await this.page
      .getByRole("region", { name: this.t(`pdf.${doc}`) })
      .getByRole("button", { name: this.t("pdf.download") })
      .click();
    return (await download).path();
  }

  reopen() {
    return this.page.getByRole("button", { name: this.t("orders.markNotDone") });
  }
}

/** The orders list, with row selection and the bulk bar. */
export class OrdersList {
  constructor(
    private page: Page,
    private t: T,
  ) {}

  async goto(locale: string) {
    await this.page.goto(`/${locale}/orders`);
  }

  async select(orderNumber: number) {
    await this.page
      .getByRole("checkbox", { name: this.t("dashboard.selectRow", { number: orderNumber }) })
      .click();
  }

  async bulkMarkDone() {
    await this.page.getByRole("button", { name: this.t("orders.markDone") }).click();
  }

  /** Delete the selected orders, and confirm. */
  async bulkDelete() {
    await this.page.getByRole("button", { name: this.t("common.delete") }).click();
    await this.page
      .getByRole("alertdialog")
      .getByRole("button", { name: this.t("common.delete") })
      .click();
  }

  selection(count: number) {
    return this.page.getByText(this.t("dashboard.nSelected", { count }));
  }
}
