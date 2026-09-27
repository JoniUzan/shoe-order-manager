import { Fragment } from "react";
import type { Curve } from "@repo/domain";

/**
 * A pack's sizes as "38×3 · 39×2", with the size in semibold so it reads
 * apart from the quantity. The HTML twin of `formatCurve` (which plain-text
 * outputs like WhatsApp still use).
 */
export function CurveText({
  curve,
  separator = " · ",
}: {
  curve: Curve;
  separator?: string;
}) {
  return curve.map((c, i) => (
    <Fragment key={c.size}>
      {i > 0 && separator}
      <span className="font-semibold">{c.size}</span>×{c.pairs}
    </Fragment>
  ));
}
