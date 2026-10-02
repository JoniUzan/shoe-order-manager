import { prisma } from "@repo/db";

import { unique } from "../../fixtures/db.ts";
import { expect, test } from "../../fixtures/index.ts";

import { CatalogList, ModelForm } from "./locators.ts";
import { createModel, modelInUse } from "./setup.ts";

test("create a Shoe model with a size run and a Pack", async ({ page, t, appLocale, user }) => {
  const name = unique("Runner");
  const form = new ModelForm(page, t);
  await form.gotoNew(appLocale);
  await form.fill({ name, price: "100" });
  await form.continue();
  await form.generateSizes(38, 40);
  await form.continue();
  await form.addPack("Mix", { 38: 3, 39: 2, 40: 3 });
  await form.save();

  await expect(page).toHaveURL(new RegExp(`/${appLocale}/catalog$`));
  await expect(new CatalogList(page, t).row(name)).toBeVisible();
  const model = await prisma.shoeModel.findFirstOrThrow({
    where: { ownerId: user.id },
    include: { packs: true },
  });
  expect(model).toMatchObject({ name, sizes: "38,39,40", defaultPriceAgorot: 10_000 });
  expect(model.packs).toMatchObject([{ name: "Mix", curve: "38:3,39:2,40:3" }]);
});

test("edit a Pack's curve", async ({ page, t, appLocale, user }) => {
  const model = await createModel(user.id);
  const form = new ModelForm(page, t);
  await form.gotoEdit(appLocale, model.id);
  await form.continue();
  await form.continue();
  await form.setPackPairs({ 38: 4, 40: 0 });
  await form.save();

  await expect(page).toHaveURL(new RegExp(`/${appLocale}/catalog$`));
  const pack = await prisma.sizePack.findFirstOrThrow({ where: { shoeModelId: model.id } });
  expect(pack.curve).toBe("38:4,39:2");
});

test("a model used on an order can't be deleted; an unused one can", async ({ page, t, appLocale, user }) => {
  const used = await modelInUse(user.id);
  const unused = await createModel(user.id);
  const list = new CatalogList(page, t);
  await list.goto(appLocale);

  await list.delete(used.name);
  await expect(list.inUseError()).toBeVisible();
  await page.keyboard.press("Escape");

  await list.delete(unused.name);
  await expect(list.deleted()).toBeVisible();
  await expect(list.row(unused.name)).toBeHidden();
  expect(await prisma.shoeModel.count({ where: { ownerId: user.id } })).toBe(1);
});

test("a new model can't leave the details step without a name", async ({ page, t, appLocale, user }) => {
  const form = new ModelForm(page, t);
  await form.gotoNew(appLocale);
  await form.continue();
  await expect(form.nameRequired()).toBeVisible();
  await expect(form.stepTitle("Details")).toBeVisible();
  expect(await prisma.shoeModel.count({ where: { ownerId: user.id } })).toBe(0);

  await form.fill({ name: unique("Loafer") });
  await expect(form.nameRequired()).toBeHidden();
  await form.continue();
  await expect(form.stepTitle("Sizes")).toBeVisible();
});

test("an existing model saves from its first step", async ({ page, t, appLocale, user }) => {
  const model = await createModel(user.id);
  const name = unique("Renamed");
  const form = new ModelForm(page, t);
  await form.gotoEdit(appLocale, model.id);
  await form.fill({ name });
  await form.save();

  await expect(page).toHaveURL(new RegExp(`/${appLocale}/catalog$`));
  await expect
    .poll(async () => (await prisma.shoeModel.findUniqueOrThrow({ where: { id: model.id } })).name)
    .toBe(name);
});

test("a new Pack takes the focus, so typing names it", async ({ page, t, appLocale, user: _user }) => {
  const form = new ModelForm(page, t);
  await form.gotoNew(appLocale);
  await form.fill({ name: unique("Loafer") });
  await form.continue();
  await form.continue();
  await form.addEmptyPack();
  await expect(form.packName().last()).toBeFocused();
  // Typing a space used to press "Add Pack" again.
  await page.keyboard.type("Pack A");
  await expect(form.packName()).toHaveCount(1);
  await expect(form.packName().last()).toHaveValue("Pack A");
});

test("Enter in a field continues to the next step", async ({ page, t, appLocale, user }) => {
  const form = new ModelForm(page, t);
  await form.gotoNew(appLocale);
  await form.fill({ name: unique("Loafer") });
  await form.pressEnterInName();

  await expect(form.stepTitle("Sizes")).toBeVisible();
  expect(await prisma.shoeModel.count({ where: { ownerId: user.id } })).toBe(0);
});

test("a finished step can be opened again and keeps what was typed; one not reached is locked", async ({ page, t, appLocale, user: _user }) => {
  const name = unique("Loafer");
  const form = new ModelForm(page, t);
  await form.gotoNew(appLocale);
  await form.fill({ name });
  await form.continue();
  await expect(form.stepTitle("Sizes")).toBeVisible();
  expect(await form.canOpenFromBar("Packs")).toBe(false);

  await form.goToStep("Details");
  await expect(form.nameField()).toHaveValue(name);
});

test("Cancel leaves at once when nothing was typed", async ({ page, t, appLocale, user: _user }) => {
  const form = new ModelForm(page, t);
  await form.gotoNew(appLocale);
  await form.cancel();

  await expect(page).toHaveURL(new RegExp(`/${appLocale}/catalog$`));
});

test("Cancel asks first once something was typed", async ({ page, t, appLocale, user }) => {
  const name = unique("Loafer");
  const form = new ModelForm(page, t);
  await form.gotoNew(appLocale);
  await form.fill({ name });

  await form.cancel();
  await expect(form.discardDialog()).toBeVisible();
  await form.keepEditing();
  await expect(form.discardDialog()).toBeHidden();
  await expect(form.nameField()).toHaveValue(name);

  await form.cancel();
  await form.discard();
  await expect(page).toHaveURL(new RegExp(`/${appLocale}/catalog$`));
  expect(await prisma.shoeModel.count({ where: { ownerId: user.id } })).toBe(0);
});

test("a Pack that fails its check takes the save to the Packs step", async ({ page, t, appLocale, user }) => {
  const model = await createModel(user.id);
  const form = new ModelForm(page, t);
  await form.gotoEdit(appLocale, model.id);
  await form.goToStep("Packs");
  await form.packName().last().fill("");
  await form.goToStep("Details");
  await form.save();

  await expect(form.stepTitle("Packs")).toBeVisible();
  await expect(form.packNameError()).toBeVisible();
  const pack = await prisma.sizePack.findFirstOrThrow({ where: { shoeModelId: model.id } });
  expect(pack.name).toBe("Mix");
});

test("the Active switch is saved", async ({ page, t, appLocale, user }) => {
  const model = await createModel(user.id);
  const form = new ModelForm(page, t);
  await form.gotoEdit(appLocale, model.id);
  await form.setActive(false);
  await form.save();

  await expect(page).toHaveURL(new RegExp(`/${appLocale}/catalog$`));
  await expect
    .poll(async () => (await prisma.shoeModel.findUniqueOrThrow({ where: { id: model.id } })).isActive)
    .toBe(false);
});
