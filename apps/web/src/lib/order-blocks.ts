import { agorotToShekels, shekelsToAgorot } from "@repo/domain";

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

export interface BlockForm {
  mode: "catalog" | "custom";
  shoeModelId: string;
  customDescription: string;
  color: string;
  unitPrice: string; // shekels
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
  rows: [],
};

/** Truncating: a pair is countable, "2.5" is a typo, not half a pair. */
export const pairsOf = (row: SizeRow) => Math.trunc(Number(row.pairs)) || 0;

export const blockPairs = (block: BlockForm) =>
  block.rows.reduce((n, row) => n + Math.max(0, pairsOf(row)), 0);

export const blockAgorot = (block: BlockForm) =>
  blockPairs(block) * shekelsToAgorot(Number(block.unitPrice) || 0);

export interface StoredItem {
  shoeModelId: string | null;
  customDescription: string | null;
  size: string;
  color: string | null;
  quantity: number;
  unitPriceAgorot: number;
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
 */
export function groupItemsIntoBlocks(
  items: StoredItem[],
  sizesByModelId: Map<string, string[]>,
): BlockForm[] {
  const groups = new Map<string, { item: StoredItem; pairsBySize: Map<string, number> }>();

  for (const item of items) {
    const identity = item.shoeModelId ?? `custom:${item.customDescription ?? ""}`;
    // NUL-delimited: two of the three parts are free text, so a printable
    // separator could be forged. Joined on a space, {"Sandal", "blue x"} and
    // {"Sandal blue", "x"} would collide at the same price and merge two
    // unrelated line items into one block.
    const key = `${identity}\u0000${item.color ?? ""}\u0000${item.unitPriceAgorot}`;
    let group = groups.get(key);
    if (!group) {
      group = { item, pairsBySize: new Map() };
      groups.set(key, group);
    }
    // Same size twice in one group shouldn't happen, but summing beats
    // silently keeping only the last one.
    group.pairsBySize.set(
      item.size,
      (group.pairsBySize.get(item.size) ?? 0) + item.quantity,
    );
  }

  return [...groups.values()].map(({ item, pairsBySize }) => {
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
      rows: [...catalogSizes, ...extras].map((size) => ({
        size,
        pairs: pairsBySize.has(size) ? String(pairsBySize.get(size)) : "",
      })),
    };
  });
}
