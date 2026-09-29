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
  await form.generateSizes(38, 40);
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
