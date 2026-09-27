import {
  agorotToShekels,
  curvePairs,
  parseCurve,
  shekelsToAgorot,
  type Curve,
} from "@repo/domain";

/**
 * The order form's shape. Not the storage shape.
 *
 * Orders are stored flat — one `OrderItem` per size — but they are *entered*
 * per model: the same shoe recurs across a run of sizes, and repeating the
 * model, colour and price on every size was the bulk of the old form's work.
 * A block is that unit; it flattens back to individual items on save and is
 * reassembled by `groupItemsIntoBlocks` on edit.
 *
 * Lives outside the form component so a Server Component can reassemble blocks
 * without pulling a "use client" module into the server graph.
 */

/** One size column: the size itself, and how many pairs of it. */
export interface SizeRow {
  size: string;
  pairs: string; // as typed
}

/**
 * N packs of one pack (Hebrew: קרטונים of a סדרה). Only the count is typed;
 * the name and curve are shown, never sent — the server expands the pack
 * from the stored curve itself.
 */
export interface PackRow {
  /** Set for a pack already saved on this order (edit). */
  orderPackId?: string;
  /** The catalog pack. "" until one is chosen; may be "" on an old pack
   *  whose catalog pack has since been deleted. */
  sizePackId: string;
  packName: string;
  curve: Curve;
  count: string; // as typed
}

export interface BlockForm {
  mode: "catalog" | "custom";
  shoeModelId: string;
  customDescription: string;
  color: string;
  unitPrice: string; // shekels
  /** Packs taken of this model (catalog blocks only). */
  packs: PackRow[];
  /** Loose pairs per size — on top of the packs, when there are any. */
  rows: SizeRow[];
}

export interface OrderFormValues {
  customerId: string;
  notes: string;
  statusCode: string;
  blocks: BlockForm[];
}

export const EMPTY_BLOCK: BlockForm = {
  mode: "catalog",
  shoeModelId: "",
  customDescription: "",
  color: "",
  unitPrice: "",
  packs: [],
  rows: [],
};

/** Truncating: a pair is countable, "2.5" is a typo, not half a pair. */
export const pairsOf = (row: SizeRow) => Math.trunc(Number(row.pairs)) || 0;

export const packCountOf = (pack: PackRow) => Math.trunc(Number(pack.count)) || 0;

/** Packs count only on a catalog block; a custom line can't have them. */
export const activePacks = (block: BlockForm) =>
  block.mode === "catalog" ? block.packs : [];

export const loosePairs = (block: BlockForm) =>
  block.rows.reduce((n, row) => n + Math.max(0, pairsOf(row)), 0);

export const packPairs = (block: BlockForm) =>
  activePacks(block).reduce(
    (n, pack) => n + Math.max(0, packCountOf(pack)) * curvePairs(pack.curve),
    0,
  );

/** Every pair in the block: the packs' and the loose ones. */
export const blockPairs = (block: BlockForm) =>
  loosePairs(block) + packPairs(block);

export const blockAgorot = (block: BlockForm) =>
  blockPairs(block) * shekelsToAgorot(Number(block.unitPrice) || 0);

export interface StoredItem {
  /** The pack this row is part of; null for loose pairs. */
  packId: string | null;
  shoeModelId: string | null;
  customDescription: string | null;
  size: string;
  color: string | null;
  quantity: number;
  unitPriceAgorot: number;
}

export interface StoredPack {
  id: string;
  sizePackId: string | null;
  packName: string;
  curve: string;
  count: number;
}

/**
 * Reassemble stored items into the blocks they were entered as.
 *
 * Two items merge into one block when they share model (or description),
 * colour *and* price — the three things a block holds once. That is a real
 * behaviour change: items that happened to match are now edited together.
 *
 * The size columns are the model's catalog run first, in catalog order, then
 * any size the order actually uses that the catalog no longer lists — so
 * removing a size from the catalog can never silently drop it from an existing
 * order.
 *
 * Items with a `packId` are a pack's pairs, not loose ones: they rebuild that
 * pack (from its own saved snapshot) on the block with the same model, colour
 * and price, creating the block if the order has no loose pairs of it.
 */
export function groupItemsIntoBlocks(
  items: StoredItem[],
  sizesByModelId: Map<string, string[]>,
  packs: StoredPack[] = [],
): BlockForm[] {
  const groups = new Map<
    string,
    { item: StoredItem; pairsBySize: Map<string, number>; packs: PackRow[] }
  >();
  const packById = new Map(packs.map((p) => [p.id, p]));
  const placed = new Set<string>();

  for (const item of items) {
    const identity = item.shoeModelId ?? `custom:${item.customDescription ?? ""}`;
    // NUL-delimited: two of the three parts are free text, so a printable
    // separator could be forged. Joined on a space, {"Sandal", "blue x"} and
    // {"Sandal blue", "x"} would collide at the same price and merge two
    // unrelated line items into one block.
    const key = `${identity}\u0000${item.color ?? ""}\u0000${item.unitPriceAgorot}`;
    let group = groups.get(key);
    if (!group) {
      group = { item, pairsBySize: new Map(), packs: [] };
      groups.set(key, group);
    }
    // A pack row whose pack wasn't passed in falls through as loose pairs
    // rather than vanishing from the form (and from the next save).
    const pack = item.packId ? packById.get(item.packId) : undefined;
    if (pack) {
      if (!placed.has(pack.id)) {
        placed.add(pack.id);
        group.packs.push({
          orderPackId: pack.id,
          sizePackId: pack.sizePackId ?? "",
          packName: pack.packName,
          curve: parseCurve(pack.curve),
          count: String(pack.count),
        });
      }
      continue;
    }
    // Same size twice in one group shouldn't happen, but summing beats
    // silently keeping only the last one.
    group.pairsBySize.set(
      item.size,
      (group.pairsBySize.get(item.size) ?? 0) + item.quantity,
    );
  }

  return [...groups.values()].map(({ item, pairsBySize, packs }) => {
    const catalogSizes = item.shoeModelId
      ? (sizesByModelId.get(item.shoeModelId) ?? [])
      : [];
    const extras = [...pairsBySize.keys()].filter((s) => !catalogSizes.includes(s));

    return {
      mode: item.shoeModelId ? "catalog" : "custom",
      shoeModelId: item.shoeModelId ?? "",
      customDescription: item.customDescription ?? "",
      color: item.color ?? "",
      unitPrice: String(agorotToShekels(item.unitPriceAgorot)),
      packs,
      rows: [...catalogSizes, ...extras].map((size) => ({
        size,
        pairs: pairsBySize.has(size) ? String(pairsBySize.get(size)) : "",
      })),
    };
  });
}
