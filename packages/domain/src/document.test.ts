import { describe, expect, it } from "vitest";

import {
  buildOrderSummaryRows,
  buildProductionRows,
  type DocumentItem,
} from "./document";

function item(over: Partial<DocumentItem>): DocumentItem {
  return {
    shoeModelId: "dana",
    name: "Dana",
    sku: "DN-204",
    size: "38",
    color: "Black",
    quantity: 1,
    unitPriceAgorot: 12000,
    packId: null,
    ...over,
  };
}

// 2 cartons of 38:3,39:2,40:3 plus a loose 41 at the same price, a 42 at a
// higher price, another model, and a custom item.
const packs = [{ id: "p1", packName: "Pack A", count: 2 }];
const items: DocumentItem[] = [
  item({ size: "38", quantity: 6, packId: "p1" }),
  item({ size: "39", quantity: 4, packId: "p1" }),
  item({ size: "40", quantity: 6, packId: "p1" }),
  item({ size: "41", quantity: 1 }),
  item({ size: "42", quantity: 2, unitPriceAgorot: 13500 }),
  item({ shoeModelId: "roni", name: "Roni", sku: null, color: "Beige", size: "40", quantity: 2, unitPriceAgorot: 15000 }),
  item({ shoeModelId: "roni", name: "Roni", sku: null, color: "Beige", size: "38", quantity: 1, unitPriceAgorot: 15000 }),
  item({ shoeModelId: null, name: "Gold slipper", sku: null, color: "Gold", size: "39", quantity: 2, unitPriceAgorot: 18000 }),
];

describe("buildOrderSummaryRows", () => {
  const summary = buildOrderSummaryRows(items, packs);

  it("groups by model, color and unit price", () => {
    expect(summary.rows.map((r) => [r.name, r.color, r.unitPriceAgorot])).toEqual([
      ["Dana", "Black", 12000],
      ["Dana", "Black", 13500],
      ["Roni", "Beige", 15000],
      ["Gold slipper", "Gold", 18000],
    ]);
  });

  it("adds pack and loose pairs per size, sizes ascending", () => {
    const [dana, , roni] = summary.rows;
    expect(dana!.sizes).toEqual([
      { size: "38", pairs: 6 },
      { size: "39", pairs: 4 },
      { size: "40", pairs: 6 },
      { size: "41", pairs: 1 },
    ]);
    expect(roni!.sizes.map((s) => s.size)).toEqual(["38", "40"]);
  });

  it("names each pack once and counts the loose pairs", () => {
    const [dana, dana42] = summary.rows;
    expect(dana!.packs).toEqual([{ name: "Pack A", count: 2 }]);
    expect(dana!.loosePairs).toBe(1);
    expect(dana42!.packs).toEqual([]);
    expect(dana42!.loosePairs).toBe(2);
  });

  it("totals each row and the order", () => {
    expect(summary.rows.map((r) => [r.pairs, r.totalAgorot])).toEqual([
      [17, 204000],
      [2, 27000],
      [3, 45000],
      [2, 36000],
    ]);
    expect(summary.pairs).toBe(24);
    expect(summary.cartons).toBe(2);
  });

  it("marks custom items", () => {
    expect(summary.rows.map((r) => r.custom)).toEqual([false, false, false, true]);
  });

  it("keeps each row's model, for its Product image", () => {
    expect(summary.rows.map((r) => r.shoeModelId === null)).toEqual([
      false,
      false,
      false,
      true,
    ]);
  });

  it("keeps two custom items with different text apart", () => {
    const rows = buildOrderSummaryRows(
      [
        item({ shoeModelId: null, name: "A", color: null }),
        item({ shoeModelId: null, name: "B", color: null }),
      ],
      [],
    ).rows;
    expect(rows.map((r) => r.name)).toEqual(["A", "B"]);
  });

  it("treats an item whose pack is missing as loose", () => {
    const rows = buildOrderSummaryRows([item({ packId: "gone", quantity: 3 })], []).rows;
    expect(rows[0]!.loosePairs).toBe(3);
    expect(rows[0]!.packs).toEqual([]);
  });
});

describe("buildProductionRows", () => {
  const production = buildProductionRows(items);

  it("groups by model and color only, ignoring price", () => {
    expect(production.rows.map((r) => [r.name, r.color])).toEqual([
      ["Dana", "Black"],
      ["Roni", "Beige"],
      ["Gold slipper", "Gold"],
    ]);
  });

  it("merges every pair of a model and color into one size run", () => {
    expect(production.rows[0]!.sizes).toEqual([
      { size: "38", pairs: 6 },
      { size: "39", pairs: 4 },
      { size: "40", pairs: 6 },
      { size: "41", pairs: 1 },
      { size: "42", pairs: 2 },
    ]);
    expect(production.rows.map((r) => r.pairs)).toEqual([19, 3, 2]);
    expect(production.pairs).toBe(24);
  });

  it("keeps each row's model, null for a custom item", () => {
    expect(production.rows.map((r) => r.shoeModelId === null)).toEqual([
      false,
      false,
      true,
    ]);
  });

  it("carries the SKU and the custom flag", () => {
    expect(production.rows.map((r) => [r.sku, r.custom])).toEqual([
      ["DN-204", false],
      [null, false],
      [null, true],
    ]);
  });

  it("is empty for an order without items", () => {
    expect(buildProductionRows([])).toEqual({ rows: [], pairs: 0 });
  });
});
