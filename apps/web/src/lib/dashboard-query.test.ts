import { prisma } from "@repo/db";
import { addDays } from "@repo/domain";
import { describe, expect, it } from "vitest";

import { createCustomer, createUser } from "../../test/factories";

import { loadDashboard } from "./dashboard-query";

// Wednesday 7 October 2026, mid-afternoon, local time.
const NOW = new Date(2026, 9, 7, 15, 30);
const daysAgo = (n: number) => addDays(NOW, -n);

/** An Order straight into Postgres, so its date and money are exact. */
let number = 0;
async function order(
  ownerId: string,
  customerId: string,
  o: {
    daysAgo: number;
    total: number;
    paid?: number;
    status?: "not_done" | "done";
  },
) {
  const paid = o.paid ?? 0;
  const created = await prisma.order.create({
    data: {
      ownerId,
      customerId,
      orderNumber: ++number,
      statusCode: o.status ?? "not_done",
      totalAgorot: o.total,
      depositAgorot: paid,
      paymentStatus: paid === 0 ? "unpaid" : paid >= o.total ? "paid" : "partial",
      createdAt: daysAgo(o.daysAgo),
    },
  });
  if (paid > 0) {
    await prisma.payment.create({
      data: { ownerId, orderId: created.id, amountAgorot: paid, paidAt: daysAgo(o.daysAgo) },
    });
  }
  return created;
}

describe("loadDashboard", () => {
  it("is empty for a new User", async () => {
    const user = await createUser();
    const d = await loadDashboard(user.id, NOW);
    expect(d.orderCount).toBe(0);
    expect(d.balanceDue.totalAgorot).toBe(0);
    expect(d.weeks).toHaveLength(4);
    expect(d.weeks.every((w) => w.ordered === 0 && w.collected === 0)).toBe(true);
  });

  it("counts what's owed, what's open and what's new, for this User only", async () => {
    const user = await createUser();
    const shop = await createCustomer(user.id, "Shop");
    const boutique = await createCustomer(user.id, "Boutique");

    await order(user.id, shop.id, { daysAgo: 0, total: 1000 }); // fresh, unpaid
    await order(user.id, shop.id, { daysAgo: 20, total: 1000, paid: 400 }); // aging, partial
    const oldest = await order(user.id, boutique.id, { daysAgo: 40, total: 500 }); // old, unpaid
    // Done and overpaid: not open, and not a credit against the rest.
    await order(user.id, boutique.id, { daysAgo: 10, total: 100, paid: 300, status: "done" });
    await order(user.id, boutique.id, { daysAgo: 3, total: 200, paid: 200, status: "done" });

    // Another User's data stays out.
    const other = await createUser();
    const theirs = await createCustomer(other.id);
    await order(other.id, theirs.id, { daysAgo: 1, total: 99_999 });

    const d = await loadDashboard(user.id, NOW);

    expect(d.orderCount).toBe(5);
    expect(d.balanceDue).toEqual({ totalAgorot: 2100, unpaidAgorot: 1500, partialAgorot: 600 });
    expect(d.open).toEqual({ count: 3, fresh: 1, aging: 1, old: 1 });
    expect(d.recent).toEqual({
      count: 2,
      orderedAgorot: 1200,
      previousCount: 1,
      perDay: [0, 0, 0, 1, 0, 0, 1],
    });
    expect(d.owed).toEqual([
      { customerId: shop.id, name: "Shop", owedAgorot: 1600 },
      { customerId: boutique.id, name: "Boutique", owedAgorot: 500 },
    ]);
    expect(d.openOrders.map((o) => o.id)[0]).toBe(oldest.id);
    expect(d.openOrders[0]).toMatchObject({ customerName: "Boutique", daysOpen: 40 });
    expect(d.openOrders).toHaveLength(3);
    // Weeks start on Monday: Sunday 4 October's order and payment are last week's.
    expect(d.weeks.slice(-2)).toEqual([
      { start: "2026-09-28", ordered: 200, collected: 200 },
      { start: "2026-10-05", ordered: 1000, collected: 0 },
    ]);
  });
});
