import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";

import { prisma } from "@repo/db";
import { productImageKey } from "@repo/domain";
import { createTranslator } from "next-intl";
import { extractText, getDocumentProxy } from "unpdf";
import { describe, expect, it, vi } from "vitest";

import {
  createCustomer,
  createModel,
  createUser,
} from "../../../../../../test/factories";
import { signInAs } from "../../../../../../test/session";
import { putObject } from "@/lib/storage";
import en from "../../../../../../messages/en.json";
import he from "../../../../../../messages/he.json";

import { GET } from "./route";

// next-intl's server helpers need Next's request config; the route only asks
// for a translator in a given locale, which createTranslator gives directly.
vi.mock("next-intl/server", () => ({
  getTranslations: async ({
    locale,
    namespace,
  }: {
    locale: "he" | "en";
    namespace: string;
  }) =>
    createTranslator({
      locale,
      messages: locale === "he" ? he : en,
      namespace: namespace as "pdf",
    }),
}));

/**
 * Order #1 for "Rotem Shoes" (phone 050-7654321): 2 Cartons of "Mix"
 * (38×3 · 39×2 · 40×3) plus a loose 40, all at ₪100, with both kinds of note.
 */
async function setup() {
  const user = await createUser();
  await prisma.user.update({
    where: { id: user.id },
    data: { businessName: "Joni Shoes", businessTaxId: "514000000" },
  });
  const customer = await createCustomer(user.id, "Rotem Shoes");
  await prisma.customer.update({
    where: { id: customer.id },
    data: { phone: "050-7654321" },
  });
  const model = await createModel(user.id);
  const order = await prisma.order.create({
    data: {
      ownerId: user.id,
      customerId: customer.id,
      orderNumber: 1,
      totalAgorot: 17 * 10_000,
      depositAgorot: 5_000,
      notes: "Price agreed on the phone",
      factoryNote: "Soft sole",
      packs: { create: { packName: "Mix", curve: "38:3,39:2,40:3", count: 2 } },
    },
    include: { packs: true },
  });
  const packId = order.packs[0]!.id;
  await prisma.orderItem.createMany({
    data: [
      ["38", 6, packId],
      ["39", 4, packId],
      ["40", 6, packId],
      ["40", 1, null],
    ].map(([size, quantity, pack]) => ({
      orderId: order.id,
      shoeModelId: model.id,
      size: size as string,
      quantity: quantity as number,
      packId: pack as string | null,
      unitPriceAgorot: 10_000,
    })),
  });
  return { user, order, model };
}

/** Whether the PDF embeds a picture (pdfkit writes image XObjects uncompressed). */
async function hasImage(res: Response): Promise<boolean> {
  return Buffer.from(await res.arrayBuffer()).includes("/Subtype /Image");
}

function get(id: string, query: string) {
  return GET(new Request(`http://test/api/orders/${id}/pdf?${query}`), {
    params: Promise.resolve({ id }),
  });
}

async function text(res: Response): Promise<string> {
  const pdf = await getDocumentProxy(new Uint8Array(await res.arrayBuffer()));
  const { text } = await extractText(pdf, { mergePages: true });
  return text;
}

describe("GET /api/orders/:id/pdf", () => {
  it("gives the Customer prices, payments, notes and contact details", async () => {
    const { order } = await setup();
    const res = await get(order.id, "doc=summary&lang=en");
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("application/pdf");
    expect(res.headers.get("content-disposition")).toBe(
      'inline; filename="order-1.pdf"',
    );

    const body = await text(res);
    for (const expected of [
      "Order #1",
      "Joni Shoes",
      "514000000",
      "Rotem Shoes",
      "050-7654321",
      "₪1,700.00",
      "₪1,650.00",
      "2 cartons × Mix",
      "1 loose pair",
      "Price agreed on the phone",
    ]) {
      expect(body).toContain(expected);
    }
    expect(body).not.toContain("Soft sole");
  });

  it("gives the factory pairs and its note, and nothing about money or the Customer's contact", async () => {
    const { order } = await setup();
    const res = await get(order.id, "doc=production&lang=en&download=1");
    expect(res.headers.get("content-disposition")).toBe(
      'attachment; filename="production-1.pdf"',
    );

    const body = await text(res);
    for (const expected of [
      "Production sheet",
      "Order #1",
      "Rotem Shoes",
      "Total pairs",
      "17",
      "Soft sole",
    ]) {
      expect(body).toContain(expected);
    }
    for (const hidden of [
      "₪",
      "050-7654321",
      "514000000",
      "Mix",
      "carton",
      "Price agreed",
    ]) {
      expect(body).not.toContain(hidden);
    }
  });

  it("renders Hebrew", async () => {
    const { order } = await setup();
    const body = await text(await get(order.id, "doc=production&lang=he"));
    expect(body).toContain("דף ייצור");
    expect(body).toContain("הערה למפעל");
  });

  it("prints each model's Product image in both PDFs, and none when it has none", async () => {
    const { user, order, model } = await setup();
    for (const doc of ["summary", "production"]) {
      expect(await hasImage(await get(order.id, `doc=${doc}&lang=he`))).toBe(false);
    }

    const key = productImageKey(user.id, randomUUID());
    await putObject(key, await readFile("test/files/photo.jpg"), "image/jpeg");
    await prisma.shoeModel.update({ where: { id: model.id }, data: { imageKey: key } });
    for (const doc of ["summary", "production"]) {
      expect(await hasImage(await get(order.id, `doc=${doc}&lang=he`))).toBe(true);
    }
  });

  it("still renders when a model's image is gone from storage", async () => {
    const { user, order, model } = await setup();
    const key = productImageKey(user.id, randomUUID());
    await prisma.shoeModel.update({ where: { id: model.id }, data: { imageKey: key } });
    const res = await get(order.id, "doc=summary&lang=en");
    expect(res.status).toBe(200);
    expect(await hasImage(res)).toBe(false);
  });

  it("refuses a bad query, another User's order and no session", async () => {
    const { order } = await setup();
    expect((await get(order.id, "doc=invoice&lang=en")).status).toBe(400);
    expect((await get(order.id, "doc=summary&lang=fr")).status).toBe(400);

    await createUser();
    expect((await get(order.id, "doc=summary&lang=en")).status).toBe(404);

    signInAs(null);
    expect((await get(order.id, "doc=summary&lang=en")).status).toBe(401);
  });
});
