import { fileURLToPath } from "node:url";

import { prisma } from "@repo/db";

import { unique } from "../../fixtures/db.ts";
import { expect, test } from "../../fixtures/index.ts";

import { CatalogList, ModelForm } from "./locators.ts";
import { createModel } from "./setup.ts";

/** An 800×500 photo: the stored image should be its centre, 500×500. */
const LANDSCAPE = fileURLToPath(new URL("../../fixtures/files/landscape.jpg", import.meta.url));

const stored = (key: string) => fetch(`${process.env.IMAGE_BASE_URL}/${key}`);

/** A JPEG's width and height, read from its start-of-frame segment. */
function jpegSize(bytes: Uint8Array): { width: number; height: number } {
  let i = 2;
  while (i < bytes.length) {
    const marker = bytes[i + 1]!;
    const length = (bytes[i + 2]! << 8) | bytes[i + 3]!;
    // SOF0–SOF15, except DHT (C4), JPG (C8) and DAC (CC).
    if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
      return {
        height: (bytes[i + 5]! << 8) | bytes[i + 6]!,
        width: (bytes[i + 7]! << 8) | bytes[i + 8]!,
      };
    }
    i += 2 + length;
  }
  throw new Error("no JPEG frame");
}

test("a new model saves its Product image, cropped to a square", async ({ page, t, appLocale, user }) => {
  const name = unique("Runner");
  const form = new ModelForm(page, t);
  await form.gotoNew(appLocale);
  await form.pickImage(LANDSCAPE);
  await expect(form.image()).toBeVisible();
  await form.fill({ name });
  await form.continue();
  await form.continue();
  await form.save();

  await expect(page).toHaveURL(new RegExp(`/${appLocale}/catalog$`));
  await expect(new CatalogList(page, t).row(name)).toBeVisible();
  const model = await prisma.shoeModel.findFirstOrThrow({ where: { ownerId: user.id } });
  expect(model.imageKey).toMatch(new RegExp(`^products/${user.id}/`));
  const res = await stored(model.imageKey!);
  expect(res.headers.get("content-type")).toBe("image/jpeg");
  expect(jpegSize(new Uint8Array(await res.arrayBuffer()))).toEqual({ width: 500, height: 500 });
});

test("replacing and removing a Product image deletes the old file", async ({ page, t, appLocale, user }) => {
  const model = await createModel(user.id);
  const form = new ModelForm(page, t);
  await form.gotoEdit(appLocale, model.id);
  await form.pickImage(LANDSCAPE);
  await form.save();
  await expect(page).toHaveURL(new RegExp(`/${appLocale}/catalog$`));
  const imageKey = async () =>
    (await prisma.shoeModel.findUniqueOrThrow({ where: { id: model.id } })).imageKey;
  const first = await imageKey();
  expect(first).not.toBeNull();

  await form.gotoEdit(appLocale, model.id);
  await expect(form.image()).toBeVisible();
  await form.pickImage(LANDSCAPE);
  await form.save();
  await expect.poll(imageKey).not.toBe(first);
  expect((await stored(first!)).status).toBe(404);
  const second = await imageKey();

  await form.gotoEdit(appLocale, model.id);
  await form.removeImage();
  await expect(form.image()).toBeHidden();
  await form.save();
  await expect.poll(imageKey).toBeNull();
  expect((await stored(second!)).status).toBe(404);
});
