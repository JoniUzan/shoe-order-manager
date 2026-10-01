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
  }

  async gotoEdit(locale: string, id: string) {
    await this.page.goto(`/${locale}/catalog/${id}/edit`);
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
    await this.page.getByRole("button", { name: this.t("catalog.addPack") }).click();
    await this.page.getByLabel(this.t("catalog.packName")).last().fill(name);
    await this.setPackPairs(curve);
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
