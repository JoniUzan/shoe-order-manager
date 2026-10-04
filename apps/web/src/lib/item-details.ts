/**
 * A line item's Color, Material and Sole as one muted line ("Black · Leather ·
 * Rubber"), the way the order page and Picking show them. Blank parts drop out.
 */
export function itemDetails(item: {
  color: string | null;
  material: string | null;
  sole: string | null;
}): string {
  return [item.color, item.material, item.sole]
    .map((v) => v?.trim())
    .filter(Boolean)
    .join(" · ");
}
