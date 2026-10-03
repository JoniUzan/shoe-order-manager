/**
 * The rows of an order's two PDFs, grouped from its line items.
 *
 * Both show pairs per size already added up, so nobody has to multiply a
 * pack's curve by its cartons to know how many 38s there are:
 *
 * - the Order summary (for the Customer) has one row per model, color and unit
 *   price, and says which cartons and loose pairs the row is made of;
 * - the Production sheet (for the factory) has one row per model and color,
 *   with no packs and no money.
 */

export interface DocumentItem {
  shoeModelId: string | null;
  /** The model's name, or the custom item's description. */
  name: string;
  sku: string | null;
  size: string;
  color: string | null;
  quantity: number;
  unitPriceAgorot: number;
  packId: string | null;
}

export interface DocumentPack {
  id: string;
  packName: string;
  count: number;
}

export interface SizePairs {
  size: string;
  pairs: number;
}

export interface SummaryRow {
  /** The catalog model, for its Product image; null for a custom item. */
  shoeModelId: string | null;
  name: string;
  color: string | null;
  custom: boolean;
  /** Every pair in the row, packs and loose, sizes ascending. */
  sizes: SizePairs[];
  /** The packs the row's cartons come from, in order-item order. */
  packs: { name: string; count: number }[];
  loosePairs: number;
  pairs: number;
  unitPriceAgorot: number;
  totalAgorot: number;
}

export interface ProductionRow {
  /** The catalog model, for its Product image; null for a custom item. */
  shoeModelId: string | null;
  name: string;
  sku: string | null;
  color: string | null;
  custom: boolean;
  sizes: SizePairs[];
  pairs: number;
}

export interface OrderSummaryRows {
  rows: SummaryRow[];
  cartons: number;
  pairs: number;
}

export interface ProductionRows {
  rows: ProductionRow[];
  pairs: number;
}

/** Same identity as the order form's blocks: a model, or a custom item's text. */
function identity(item: DocumentItem): string {
  return item.shoeModelId ?? `custom:${item.name}`;
}

function sortedSizes(bySize: Map<string, number>): SizePairs[] {
  return [...bySize]
    .map(([size, pairs]) => ({ size, pairs }))
    .sort((a, b) => Number(a.size) - Number(b.size));
}

function add(bySize: Map<string, number>, size: string, pairs: number) {
  bySize.set(size, (bySize.get(size) ?? 0) + pairs);
}

export function buildOrderSummaryRows(
  items: DocumentItem[],
  packs: DocumentPack[],
): OrderSummaryRows {
  const packById = new Map(packs.map((p) => [p.id, p]));
  const groups = new Map<
    string,
    Omit<SummaryRow, "sizes" | "pairs" | "totalAgorot"> & {
      bySize: Map<string, number>;
      packIds: Set<string>;
    }
  >();

  for (const item of items) {
    const key = `${identity(item)}\u0000${item.color ?? ""}\u0000${item.unitPriceAgorot}`;
    let group = groups.get(key);
    if (!group) {
      group = {
        shoeModelId: item.shoeModelId,
        name: item.name,
        color: item.color,
        custom: !item.shoeModelId,
        packs: [],
        loosePairs: 0,
        unitPriceAgorot: item.unitPriceAgorot,
        bySize: new Map(),
        packIds: new Set(),
      };
      groups.set(key, group);
    }
    add(group.bySize, item.size, item.quantity);

    const pack = item.packId ? packById.get(item.packId) : undefined;
    if (!pack) {
      group.loosePairs += item.quantity;
    } else if (!group.packIds.has(pack.id)) {
      group.packIds.add(pack.id);
      group.packs.push({ name: pack.packName, count: pack.count });
    }
  }

  const rows = [...groups.values()].map(({ bySize, packIds: _, ...g }) => {
    const sizes = sortedSizes(bySize);
    const pairs = sizes.reduce((n, s) => n + s.pairs, 0);
    return { ...g, sizes, pairs, totalAgorot: pairs * g.unitPriceAgorot };
  });
  return {
    rows,
    cartons: packs.reduce((n, p) => n + p.count, 0),
    pairs: rows.reduce((n, r) => n + r.pairs, 0),
  };
}

export function buildProductionRows(items: DocumentItem[]): ProductionRows {
  const groups = new Map<
    string,
    Omit<ProductionRow, "sizes" | "pairs"> & { bySize: Map<string, number> }
  >();
  for (const item of items) {
    const key = `${identity(item)}\u0000${item.color ?? ""}`;
    let group = groups.get(key);
    if (!group) {
      group = {
        shoeModelId: item.shoeModelId,
        name: item.name,
        sku: item.sku,
        color: item.color,
        custom: !item.shoeModelId,
        bySize: new Map(),
      };
      groups.set(key, group);
    }
    add(group.bySize, item.size, item.quantity);
  }

  const rows = [...groups.values()].map(({ bySize, ...g }) => {
    const sizes = sortedSizes(bySize);
    return { ...g, sizes, pairs: sizes.reduce((n, s) => n + s.pairs, 0) };
  });
  return { rows, pairs: rows.reduce((n, r) => n + r.pairs, 0) };
}

