import { parseCurve, type Curve } from "@repo/domain";

/**
 * What whoever packs an order needs to pick: per model, colour and price, the
 * packs (N × a named box) and the loose pairs on top — rather than the flat
 * per-size lines, where a pack's pairs are spread over one row per size.
 *
 * Pure and framework-free so the order page, the invoice and the WhatsApp
 * text all read the same numbers.
 */

export interface PackingItem {
  packId: string | null;
  shoeModelId: string | null;
  /** The model's name, or the custom line's description. */
  name: string;
  size: string;
  color: string | null;
  quantity: number;
  unitPriceAgorot: number;
}

export interface PackingPack {
  id: string;
  packName: string;
  curve: string;
  count: number;
}

export interface PackingGroup {
  name: string;
  color: string | null;
  packs: { name: string; count: number; curve: Curve }[];
  /** Loose pairs by size, sizes ascending. */
  extras: { size: string; quantity: number }[];
}

export interface PackingSummary {
  groups: PackingGroup[];
  /** Boxes to take off the shelf: the sum of every pack's count. */
  packsToPick: number;
  /** Pairs not in any pack. */
  loosePairs: number;
}

export function buildPackingSummary(
  items: PackingItem[],
  packs: PackingPack[],
): PackingSummary {
  const packById = new Map(packs.map((p) => [p.id, p]));
  const placed = new Set<string>();
  const groups = new Map<
    string,
    PackingGroup & { extrasBySize: Map<string, number> }
  >();
  let loosePairs = 0;

  for (const item of items) {
    // Same identity as the order form's blocks (see order-blocks.ts).
    const identity = item.shoeModelId ?? `custom:${item.name}`;
    const key = `${identity}\u0000${item.color ?? ""}\u0000${item.unitPriceAgorot}`;
    let group = groups.get(key);
    if (!group) {
      group = {
        name: item.name,
        color: item.color,
        packs: [],
        extras: [],
        extrasBySize: new Map(),
      };
      groups.set(key, group);
    }

    const pack = item.packId ? packById.get(item.packId) : undefined;
    if (pack) {
      if (!placed.has(pack.id)) {
        placed.add(pack.id);
        group.packs.push({
          name: pack.packName,
          count: pack.count,
          curve: parseCurve(pack.curve),
        });
      }
      continue;
    }
    loosePairs += item.quantity;
    group.extrasBySize.set(
      item.size,
      (group.extrasBySize.get(item.size) ?? 0) + item.quantity,
    );
  }

  return {
    groups: [...groups.values()].map(({ extrasBySize, ...group }) => ({
      ...group,
      extras: [...extrasBySize]
        .map(([size, quantity]) => ({ size, quantity }))
        .sort((a, b) => Number(a.size) - Number(b.size)),
    })),
    packsToPick: packs.reduce((n, p) => n + p.count, 0),
    loosePairs,
  };
}

/** "41×1 · 42×2" */
export function formatExtras(extras: PackingGroup["extras"]): string {
  return extras.map((e) => `${e.size}×${e.quantity}`).join(" · ");
}
