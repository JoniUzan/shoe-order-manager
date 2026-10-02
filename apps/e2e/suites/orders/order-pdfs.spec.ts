import { readFile } from "node:fs/promises";

import { prisma } from "@repo/db";
import { extractText, getDocumentProxy } from "unpdf";

import { expect, test } from "../../fixtures/index.ts";

import { OrderForm, OrderPage } from "./locators.ts";
import { orderWithChangedPack } from "./setup.ts";

async function pdfText(path: string): Promise<string> {
  const pdf = await getDocumentProxy(new Uint8Array(await readFile(path)));
  return (await extractText(pdf, { mergePages: true })).text;
}

/** Order #1 (2 Cartons of "Mix" at ₪100) with a phone, a note and a Factory note. */
async function orderForPdfs(ownerId: string) {
  const { order } = await orderWithChangedPack(ownerId);
  await prisma.order.update({
    where: { id: order.id },
    data: { notes: "Paid half by bank transfer", factoryNote: "Soft sole" },
  });
  const customer = await prisma.customer.update({
    where: { id: order.customerId },
    data: { phone: "050-7654321" },
  });
  return { order, customer };
}

test("the Production sheet leaves out money, packs and the Customer's contact", async ({
  page,
  t,
  appLocale,
  user,
}) => {
  const { order, customer } = await orderForPdfs(user.id);
  const orderPage = new OrderPage(page, t);
  await orderPage.goto(appLocale, order.id);
  await orderPage.openPdfMenu();
  const text = await pdfText(await orderPage.downloadPdf("production"));

  expect(text).toContain(t("pdf.production"));
  expect(text).toContain(customer.name);
  expect(text).toContain("Soft sole");
  for (const hidden of ["₪", "050-7654321", "Mix", "Paid half"]) {
    expect(text).not.toContain(hidden);
  }
});

test("the Order summary, in the language picked in the menu", async ({
  page,
  t,
  appLocale,
  user,
}) => {
  const { order } = await orderForPdfs(user.id);
  const orderPage = new OrderPage(page, t);
  await orderPage.goto(appLocale, order.id);
  await orderPage.openPdfMenu();
  // The other language than the app's.
  await orderPage.pdfLanguage(appLocale === "he" ? "English" : "עברית");
  const text = await pdfText(await orderPage.downloadPdf("summary"));

  // A word with no digits in it: extracted Hebrew next to a number can come
  // out in visual order.
  expect(text).toContain(appLocale === "he" ? "Remaining" : "נותר לתשלום");
  expect(text).toContain("050-7654321");
  expect(text).toContain("Paid half by bank transfer");
  expect(text).toContain("1,600.00");
  expect(text).not.toContain("Soft sole");
});

test("the Factory note is written on the order form and shown on the order", async ({
  page,
  t,
  appLocale,
  user,
}) => {
  const { order } = await orderWithChangedPack(user.id);
  const orderPage = new OrderPage(page, t);
  await orderPage.goto(appLocale, order.id);
  await orderPage.edit();

  const form = new OrderForm(page, t);
  await form.ready();
  await form.editFromReview("notes");
  await form.factoryNote().fill("No logo on the lining");
  await form.save();
  await page.waitForURL(OrderPage.URL);

  await expect(page.getByText("No logo on the lining")).toBeVisible();
  const saved = await prisma.order.findUniqueOrThrow({ where: { id: order.id } });
  expect(saved.factoryNote).toBe("No logo on the lining");
});
