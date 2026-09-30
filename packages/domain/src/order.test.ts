import { describe, expect, it } from "vitest";

import {
  computeBalanceAgorot,
  computeOwedAgorot,
  computePaymentStatus,
  computeTotalAgorot,
  lineTotalAgorot,
  MAX_LINE_PAIRS,
  MAX_PACK_COUNT,
  orderItemSchema,
  orderPackSchema,
  orderSchema,
  recalculateOrderTotals,
} from "./order";

describe("totals", () => {
  it("multiplies a line and sums an order", () => {
    expect(lineTotalAgorot({ quantity: 3, unitPriceAgorot: 12000 })).toBe(36000);
    expect(
      computeTotalAgorot([
        { quantity: 3, unitPriceAgorot: 12000 },
        { quantity: 2, unitPriceAgorot: 500 },
      ]),
    ).toBe(37000);
    expect(computeTotalAgorot([])).toBe(0);
  });

  it("balance can go negative, owed cannot", () => {
    expect(computeBalanceAgorot(1000, 1500)).toBe(-500);
    expect(computeOwedAgorot(1000, 1500)).toBe(0);
    expect(computeOwedAgorot(1000, 300)).toBe(700);
  });
});

describe("computePaymentStatus", () => {
  it.each([
    [0, 0, "unpaid"],
    [0, 100, "unpaid"],
    [1000, 0, "unpaid"],
    [1000, 1, "partial"],
    [1000, 999, "partial"],
    [1000, 1000, "paid"],
    [1000, 1200, "paid"],
  ])("total %d, paid %d → %s", (total, paid, status) => {
    expect(computePaymentStatus(total, paid)).toBe(status);
  });
});

describe("recalculateOrderTotals", () => {
  it("derives total, balance and status together", () => {
    expect(
      recalculateOrderTotals([{ quantity: 8, unitPriceAgorot: 10000 }], 30000),
    ).toEqual({
      totalAgorot: 80000,
      balanceAgorot: 50000,
      paymentStatus: "partial",
    });
  });
});

const catalogItem = {
  shoeModelId: "cmodel",
  size: "40",
  quantity: 2,
  unitPriceAgorot: 10000,
};

describe("orderItemSchema", () => {
  it("accepts a catalog item or a custom item", () => {
    expect(orderItemSchema.safeParse(catalogItem).success).toBe(true);
    expect(
      orderItemSchema.safeParse({
        ...catalogItem,
        shoeModelId: null,
        customDescription: "Red sandals",
      }).success,
    ).toBe(true);
  });

  it("refuses both or neither model and description", () => {
    const both = orderItemSchema.safeParse({
      ...catalogItem,
      customDescription: "x",
    });
    const neither = orderItemSchema.safeParse({
      ...catalogItem,
      shoeModelId: undefined,
    });
    for (const r of [both, neither]) {
      expect(r.success).toBe(false);
      expect(r.error?.issues[0]?.message).toBe("catalog_xor_custom");
    }
  });

  it("guards quantity", () => {
    const msg = (quantity: number) =>
      orderItemSchema.safeParse({ ...catalogItem, quantity }).error?.issues[0]
        ?.message;
    expect(msg(0)).toBe("quantity_positive");
    expect(msg(MAX_LINE_PAIRS + 1)).toBe("quantity_too_large");
    expect(msg(MAX_LINE_PAIRS)).toBeUndefined();
  });
});

describe("orderPackSchema", () => {
  const pack = { shoeModelId: "cmodel", unitPriceAgorot: 100, count: 2 };

  it("needs a catalog pack or an existing order pack", () => {
    expect(orderPackSchema.safeParse(pack).error?.issues[0]?.message).toBe(
      "pack_required",
    );
    expect(orderPackSchema.safeParse({ ...pack, sizePackId: "cp" }).success).toBe(
      true,
    );
    expect(
      orderPackSchema.safeParse({ ...pack, orderPackId: "cop" }).success,
    ).toBe(true);
  });

  it("guards the carton count", () => {
    const msg = (count: number) =>
      orderPackSchema.safeParse({ ...pack, sizePackId: "cp", count }).error
        ?.issues[0]?.message;
    expect(msg(0)).toBe("pack_count_positive");
    expect(msg(MAX_PACK_COUNT + 1)).toBe("pack_count_too_large");
  });
});

describe("orderSchema", () => {
  it("needs loose pairs or packs", () => {
    const r = orderSchema.safeParse({ customerId: "ccust" });
    expect(r.error?.issues[0]?.message).toBe("items_required");
  });

  it("accepts an order of only packs and defaults the status", () => {
    const r = orderSchema.parse({
      customerId: "ccust",
      packs: [
        { shoeModelId: "cmodel", sizePackId: "cp", unitPriceAgorot: 1, count: 1 },
      ],
    });
    expect(r.statusCode).toBe("not_done");
    expect(r.items).toEqual([]);
  });

  it("does not take depositAgorot from the form", () => {
    const r = orderSchema.parse({
      customerId: "ccust",
      items: [catalogItem],
      depositAgorot: 999,
    });
    expect(r).not.toHaveProperty("depositAgorot");
  });

  it("trims the factory note and caps it at 2000 characters", () => {
    const base = { customerId: "ccust", items: [catalogItem] };
    expect(orderSchema.parse({ ...base, factoryNote: "  soft sole " }).factoryNote).toBe(
      "soft sole",
    );
    expect(orderSchema.safeParse({ ...base, factoryNote: "x".repeat(2001) }).success).toBe(
      false,
    );
  });
});
