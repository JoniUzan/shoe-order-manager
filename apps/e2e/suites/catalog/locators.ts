import type { Page } from "@playwright/test";

import type { T } from "../../fixtures/index.ts";

/** The new/edit Shoe model form, in three steps: details, sizes, Packs. */
export class ModelForm {
  constructor(
    private page: Page,
    private t: T,
  ) {}

  async gotoNew(locale: string) {
    await this.page.goto(`/${locale}/catalog/new`);
    await this.ready();
  }

  async gotoEdit(locale: string, id: string) {
    await this.page.goto(`/${locale}/catalog/${id}/edit`);
    await this.ready();
  }

  /**
   * Until the form hydrates its fields are the server's HTML, and
   * react-hook-form then writes the saved values in over anything typed:
   * an edit that typed too early saved "Runner 8ea5…Renamed 5e0b…".
   * StepForm marks itself ready once it runs in the browser.
   */
  private async ready() {
    await this.page.locator("form[data-ready]").waitFor();
  }

  async fill(fields: { name?: string; price?: string }) {
    if (fields.name !== undefined) await this.page.fill("#name", fields.name);
    if (fields.price !== undefined) await this.page.fill("#price", fields.price);
  }

  async generateSizes(from: number, to: number) {
    await this.page.getByLabel(this.t("catalog.sizesFrom")).fill(String(from));
    await this.page.getByLabel(this.t("catalog.sizesTo")).fill(String(to));
    await this.page.getByRole("button", { name: this.t("catalog.sizesGenerate") }).click();
  }

  /** Add a Pack with its curve, e.g. { 38: 3, 39: 2 }. */
  async addPack(name: string, curve: Record<string, number>) {
    await this.addEmptyPack();
    await this.packName().last().fill(name);
    await this.setPackPairs(curve);
  }

  async addEmptyPack() {
    await this.page.getByRole("button", { name: this.t("catalog.addPack") }).click();
  }

  /** Every Pack's name field, in order. */
  packName() {
    return this.page.getByLabel(this.t("catalog.packName"));
  }

  /** Pairs per size in the (last) Pack. */
  async setPackPairs(curve: Record<string, number>) {
    for (const [size, pairs] of Object.entries(curve)) {
      await this.page
        .getByLabel(this.t("catalog.packPairsFor", { size }))
        .last()
        .fill(String(pairs));
    }
  }

  /** The step forward. Each step's fields are only on the page while it shows. */
  async continue() {
    await this.page.getByRole("button", { name: this.t("common.continue") }).click();
  }

  /** A step's title, which shows while that step is open. */
  stepTitle(step: "Details" | "Sizes" | "Packs") {
    return this.page.getByRole("heading", { name: this.t(`catalog.step${step}`), exact: true });
  }

  nameRequired() {
    return this.page.getByText(this.t("validation.required"));
  }

  async save() {
    await this.page.getByRole("button", { name: this.t("common.save") }).click();
  }
}

/** The catalog list, with each model's row menu. */
export class CatalogList {
  constructor(
    private page: Page,
    private t: T,
  ) {}

  async goto(locale: string) {
    await this.page.goto(`/${locale}/catalog`);
  }

  row(name: string) {
    return this.page.getByRole("row").filter({ hasText: name });
  }

  /** Delete from the row menu, and confirm. */
  async delete(name: string) {
    await this.row(name).getByRole("button", { name: this.t("common.actions") }).click();
    await this.page.getByRole("menuitem", { name: this.t("common.delete") }).click();
    await this.page
      .getByRole("alertdialog")
      .getByRole("button", { name: this.t("common.delete") })
      .click();
  }

  inUseError() {
    return this.page.getByText(this.t("catalog.errorInUse"));
  }

  deleted() {
    return this.page.getByText(this.t("catalog.deleted"));
  }
}
