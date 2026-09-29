import { prisma } from "@repo/db";
import { beforeEach, describe, expect, it } from "vitest";

import { createCustomer, createUser } from "../../../test/factories";
import { signInAs } from "../../../test/session";

import { createOrder } from "./orders";
import { deletePayment, markFullyPaid, recordPayment } from "./payments";

/** A signed-in User with one order of 10 × ₪100 = ₪1,000 (100,000 agorot). */
async function orderOf1000() {
  const user = await createUser();
  const customer = await createCustomer(user.id);
  const created = await createOrder({
    customerId: customer.id,
    statusCode: "not_done",
    items: [
      { customDescription: "Sandals", size: "40", quantity: 10, unitPriceAgorot: 10_000 },
    ],
    packs: [],
  });
  if (!created.ok) throw new Error("order not created");
  return { user, orderId: created.id };
}

const money = (orderId: string) =>
  prisma.order.findUniqueOrThrow({
    where: { id: orderId },
    select: { totalAgorot: true, depositAgorot: true, paymentStatus: true },
  });

describe("payments", () => {
  let orderId: string;
  beforeEach(async () => {
    ({ orderId } = await orderOf1000());
  });

  it("partial then full payment updates Paid and payment status", async () => {
    expect(await recordPayment(orderId, 30_000, " first ")).toEqual({ ok: true });
    expect(await money(orderId)).toEqual({
      totalAgorot: 100_000,
      depositAgorot: 30_000,
      paymentStatus: "partial",
    });
    const payment = await prisma.payment.findFirstOrThrow({ where: { orderId } });
    expect(payment.note).toBe("first");

    expect(await markFullyPaid(orderId)).toEqual({ ok: true });
    expect(await money(orderId)).toMatchObject({
      depositAgorot: 100_000,
      paymentStatus: "paid",
    });
    // Nothing left, so a second "fully paid" adds no payment.
    await markFullyPaid(orderId);
    expect(await prisma.payment.count({ where: { orderId } })).toBe(2);
  });

  it("refuses more than the Balance and non-positive amounts", async () => {
    expect(await recordPayment(orderId, 100_001)).toEqual({
      ok: false,
      error: "too_much",
    });
    expect(await recordPayment(orderId, 0)).toEqual({ ok: false, error: "invalid" });
    expect(await recordPayment(orderId, Number.NaN)).toEqual({
      ok: false,
      error: "invalid",
    });
    expect(await money(orderId)).toMatchObject({ depositAgorot: 0, paymentStatus: "unpaid" });
  });

  it("deleting a payment recomputes Paid", async () => {
    await recordPayment(orderId, 40_000);
    await recordPayment(orderId, 60_000);
    const first = await prisma.payment.findFirstOrThrow({
      where: { orderId, amountAgorot: 40_000 },
    });
    expect(await deletePayment(first.id)).toEqual({ ok: true });
    expect(await money(orderId)).toMatchObject({
      depositAgorot: 60_000,
      paymentStatus: "partial",
    });
  });

  it("two payments racing on one order never overpay it (lockOrder)", async () => {
    // Each fits the Balance alone; together they'd pay ₪1,200 on ₪1,000.
    const results = await Promise.all([
      recordPayment(orderId, 60_000),
      recordPayment(orderId, 60_000),
    ]);
    expect(results.filter((r) => r.ok)).toHaveLength(1);
    expect(results).toContainEqual({ ok: false, error: "too_much" });
    expect(await money(orderId)).toMatchObject({
      depositAgorot: 60_000,
      paymentStatus: "partial",
    });
  });

  it("a double tap on 'fully paid' pays once", async () => {
    await recordPayment(orderId, 25_000);
    await Promise.all([markFullyPaid(orderId), markFullyPaid(orderId)]);
    const payments = await prisma.payment.findMany({ where: { orderId } });
    expect(payments.map((p) => p.amountAgorot).sort()).toEqual([25_000, 75_000]);
    expect(await money(orderId)).toMatchObject({ depositAgorot: 100_000 });
  });

  it("another User can't pay, settle or delete on this order", async () => {
    await recordPayment(orderId, 10_000);
    const payment = await prisma.payment.findFirstOrThrow({ where: { orderId } });
    await createUser(); // now signed in as someone else
    expect(await recordPayment(orderId, 1)).toEqual({ ok: false, error: "not_found" });
    expect(await markFullyPaid(orderId)).toEqual({ ok: false, error: "not_found" });
    expect(await deletePayment(payment.id)).toEqual({ ok: false, error: "not_found" });
    expect(await money(orderId)).toMatchObject({ depositAgorot: 10_000 });
  });

  it("needs a signed-in User", async () => {
    signInAs(null);
    await expect(recordPayment(orderId, 1)).rejects.toThrow("unauthorized");
  });
});
