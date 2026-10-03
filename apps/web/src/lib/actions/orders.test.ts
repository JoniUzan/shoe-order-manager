import { prisma } from "@repo/db";
import { MAX_AGOROT, type OrderInput } from "@repo/domain";
import { describe, expect, it } from "vitest";

import { createCustomer, createModel, createUser } from "../../../test/factories";

import {
  createOrder,
  deleteOrder,
  deleteOrders,
  setOrdersStatus,
  setOrderStatus,
  updateOrder,
} from "./orders";
import { recordPayment } from "./payments";

async function setup() {
  const user = await createUser();
  const customer = await createCustomer(user.id);
  const model = await createModel(user.id);
  const pack = model.packs[0]!;
  return { user, customer, model, pack };
}

type Setup = Awaited<ReturnType<typeof setup>>;

/** 2 Cartons of the 8-pair pack + 1 Loose pair, all at ₪100. */
function packOrder({ customer, model, pack }: Setup): OrderInput {
  return {
    customerId: customer.id,
    statusCode: "not_done",
    items: [{ shoeModelId: model.id, size: "40", quantity: 1, unitPriceAgorot: 10_000 }],
    packs: [
      { shoeModelId: model.id, sizePackId: pack.id, unitPriceAgorot: 10_000, count: 2 },
    ],
  };
}

async function created(input: OrderInput) {
  const r = await createOrder(input);
  if (!r.ok) throw new Error(`createOrder: ${r.error}`);
  return r.id;
}

describe("createOrder", () => {
  it("builds pack items from the stored curve and totals every pair", async () => {
    const s = await setup();
    const id = await created(packOrder(s));
    const order = await prisma.order.findUniqueOrThrow({
      where: { id },
      include: { packs: true, items: { orderBy: { size: "asc" } } },
    });
    // 2 × 8 pack pairs + 1 loose pair = 17 pairs × ₪100.
    expect(order.totalAgorot).toBe(170_000);
    expect(order.paymentStatus).toBe("unpaid");
    expect(order.isCustomOrder).toBe(false);
    expect(order.packs).toHaveLength(1);
    expect(order.packs[0]).toMatchObject({ packName: "Mix", curve: "38:3,39:2,40:3", count: 2 });
    const packItems = order.items.filter((i) => i.packId);
    expect(packItems.map((i) => [i.size, i.quantity])).toEqual([
      ["38", 6],
      ["39", 4],
      ["40", 6],
    ]);
  });

  it("numbers orders #1, #2, … per User", async () => {
    const a = await setup();
    const first = await created(packOrder(a));
    const second = await created(packOrder(a));
    const b = await setup();
    const other = await created(packOrder(b));
    const numbers = await prisma.order.findMany({
      where: { id: { in: [first, second, other] } },
      select: { id: true, orderNumber: true },
    });
    const byId = Object.fromEntries(numbers.map((o) => [o.id, o.orderNumber]));
    expect([byId[first], byId[second], byId[other]]).toEqual([1, 2, 1]);
  });

  it("two orders created at once still get distinct numbers", async () => {
    const s = await setup();
    const ids = await Promise.all([created(packOrder(s)), created(packOrder(s))]);
    const numbers = await prisma.order.findMany({
      where: { id: { in: ids } },
      select: { orderNumber: true },
      orderBy: { orderNumber: "asc" },
    });
    expect(numbers.map((n) => n.orderNumber)).toEqual([1, 2]);
  });

  it("marks an order with a custom item as a custom order", async () => {
    const s = await setup();
    const id = await created({
      customerId: s.customer.id,
      statusCode: "not_done",
      items: [{ customDescription: "Boots", size: "41", quantity: 1, unitPriceAgorot: 5 }],
      packs: [],
    });
    const order = await prisma.order.findUniqueOrThrow({ where: { id } });
    expect(order.isCustomOrder).toBe(true);
  });

  it("refuses another User's Customer, model or pack", async () => {
    const mine = await setup();
    const theirs = await setup(); // signed in as `theirs` now
    const input = packOrder(mine);
    expect(await createOrder(input)).toEqual({ ok: false, error: "invalid" });
    expect(
      await createOrder({ ...packOrder(theirs), items: input.items }),
    ).toEqual({ ok: false, error: "invalid" });
    expect(
      await createOrder({
        ...packOrder(theirs),
        packs: [{ ...packOrder(theirs).packs[0]!, sizePackId: mine.pack.id }],
      }),
    ).toEqual({ ok: false, error: "invalid" });
  });

  it("refuses invalid input, a pack on the wrong model and too large a total", async () => {
    const s = await setup();
    expect(await createOrder({ ...packOrder(s), items: [], packs: [] })).toEqual({
      ok: false,
      error: "invalid",
    });
    const other = await createModel(s.user.id);
    expect(
      await createOrder({
        ...packOrder(s),
        packs: [{ ...packOrder(s).packs[0]!, shoeModelId: other.id }],
      }),
    ).toEqual({ ok: false, error: "invalid" });
    expect(
      await createOrder({
        ...packOrder(s),
        packs: [{ ...packOrder(s).packs[0]!, orderPackId: "cnope", sizePackId: undefined }],
      }),
    ).toEqual({ ok: false, error: "invalid" });
    expect(
      await createOrder({
        ...packOrder(s),
        items: [{ ...packOrder(s).items[0]!, quantity: 99_999, unitPriceAgorot: MAX_AGOROT }],
      }),
    ).toEqual({ ok: false, error: "total_too_large" });
  });
});

describe("updateOrder", () => {
  it("keeps an existing pack's snapshot after the catalog pack changes", async () => {
    const s = await setup();
    const id = await created(packOrder(s));
    const orderPack = await prisma.orderPack.findFirstOrThrow({ where: { orderId: id } });
    await prisma.sizePack.update({ where: { id: s.pack.id }, data: { curve: "38:10" } });

    const r = await updateOrder(id, {
      ...packOrder(s),
      items: [],
      packs: [
        { orderPackId: orderPack.id, shoeModelId: s.model.id, unitPriceAgorot: 10_000, count: 3 },
      ],
    });
    expect(r).toEqual({ ok: true, id });
    const order = await prisma.order.findUniqueOrThrow({
      where: { id },
      include: { packs: true },
    });
    expect(order.packs[0]).toMatchObject({ curve: "38:3,39:2,40:3", count: 3 });
    expect(order.totalAgorot).toBe(3 * 8 * 10_000);
  });

  it("recomputes payment status against what's already paid", async () => {
    const s = await setup();
    const id = await created(packOrder(s));
    await recordPayment(id, 50_000);
    // Down to the single loose pair: ₪100, already more than covered.
    await updateOrder(id, { ...packOrder(s), packs: [] });
    const order = await prisma.order.findUniqueOrThrow({ where: { id } });
    expect(order).toMatchObject({
      totalAgorot: 10_000,
      depositAgorot: 50_000,
      paymentStatus: "paid",
    });
  });

  it("refuses a repeated pack, another User's order and invalid input", async () => {
    const s = await setup();
    const id = await created(packOrder(s));
    const orderPack = await prisma.orderPack.findFirstOrThrow({ where: { orderId: id } });
    const old = { orderPackId: orderPack.id, shoeModelId: s.model.id, unitPriceAgorot: 1, count: 1 };
    expect(await updateOrder(id, { ...packOrder(s), packs: [old, old] })).toEqual({
      ok: false,
      error: "invalid",
    });
    expect(
      await updateOrder(id, {
        ...packOrder(s),
        items: [{ ...packOrder(s).items[0]!, unitPriceAgorot: MAX_AGOROT }],
      }),
    ).toEqual({ ok: false, error: "total_too_large" });
    expect(await updateOrder(id, { ...packOrder(s), items: [], packs: [] })).toEqual({
      ok: false,
      error: "invalid",
    });
    expect(await updateOrder(id, { ...packOrder(s), customerId: "cnope" })).toEqual({
      ok: false,
      error: "invalid",
    });

    const other = await setup();
    expect(await updateOrder(id, packOrder(other))).toEqual({
      ok: false,
      error: "not_found",
    });
  });
});

describe("factory note", () => {
  it("saves it on create, changes it on update and clears a blank one", async () => {
    const s = await setup();
    const id = await created({ ...packOrder(s), notes: "₪ price talk", factoryNote: " soft sole " });
    expect(await prisma.order.findUniqueOrThrow({ where: { id } })).toMatchObject({
      notes: "₪ price talk",
      factoryNote: "soft sole",
    });

    await updateOrder(id, { ...packOrder(s), factoryNote: "no logo" });
    expect((await prisma.order.findUniqueOrThrow({ where: { id } })).factoryNote).toBe("no logo");

    await updateOrder(id, { ...packOrder(s), factoryNote: "   " });
    expect((await prisma.order.findUniqueOrThrow({ where: { id } })).factoryNote).toBeNull();
  });

  it("refuses one over 2000 characters", async () => {
    const s = await setup();
    expect(await createOrder({ ...packOrder(s), factoryNote: "x".repeat(2001) })).toEqual({
      ok: false,
      error: "invalid",
    });
  });
});

describe("status", () => {
  it("is saved by updateOrder, as the order form's Review step sends it", async () => {
    const s = await setup();
    const id = await created(packOrder(s));
    expect(await updateOrder(id, { ...packOrder(s), statusCode: "done" })).toEqual({ ok: true, id });
    const order = await prisma.order.findUniqueOrThrow({ where: { id } });
    expect(order.statusCode).toBe("done");
  });

  it("refuses a status that isn't in OrderStatus, on every path, instead of throwing", async () => {
    const s = await setup();
    const id = await created(packOrder(s));
    const bad = { ...packOrder(s), statusCode: "shipped" };
    expect(await createOrder(bad)).toEqual({ ok: false, error: "invalid" });
    expect(await updateOrder(id, bad)).toEqual({ ok: false, error: "invalid" });
    expect(await setOrderStatus(id, "shipped")).toEqual({ ok: false, error: "invalid" });
    const order = await prisma.order.findUniqueOrThrow({ where: { id } });
    expect(order.statusCode).toBe("not_done");
  });
});

describe("status and delete", () => {
  it("sets status and deletes, one or many, only for the owner", async () => {
    const s = await setup();
    const [a, b, c] = [
      await created(packOrder(s)),
      await created(packOrder(s)),
      await created(packOrder(s)),
    ];
    expect(await setOrderStatus(a, "done")).toEqual({ ok: true, id: a });
    expect(await setOrdersStatus([b, c], "done")).toEqual({ ok: true, count: 2 });
    expect(await setOrdersStatus([b], "shipped")).toEqual({ ok: false, error: "invalid" });
    expect(await setOrdersStatus([], "done")).toEqual({ ok: false, error: "invalid" });
    const statuses = await prisma.order.findMany({
      where: { id: { in: [a, b, c] } },
      select: { statusCode: true },
    });
    expect(statuses.every((o) => o.statusCode === "done")).toBe(true);

    await setup(); // someone else
    expect(await setOrderStatus(a, "not_done")).toEqual({ ok: false, error: "not_found" });
    expect(await deleteOrder(a)).toEqual({ ok: false, error: "not_found" });
    expect(await deleteOrders([a, b])).toEqual({ ok: true, count: 0 });

    const { signInAs } = await import("../../../test/session");
    signInAs(s.user.id);
    expect(await deleteOrder(a)).toEqual({ ok: true, id: a });
    expect(await deleteOrders([b, c])).toEqual({ ok: true, count: 2 });
    expect(await prisma.order.count({ where: { ownerId: s.user.id } })).toBe(0);
  });
});
