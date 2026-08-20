"use client";

import { cn } from "@repo/ui/lib/utils";
import { useLocale } from "next-intl";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

/**
 * The app's table standard: the bordered box, the cell rhythm, and the fades
 * that admit there is more table off-screen.
 *
 * Everything a table looks like — and nothing about what is in it — lives here,
 * so the reports, the order line items and the three list screens can't drift
 * apart again. `DataTable` adds the toolbar and the pager on top.
 */
export function TableFrame({
  children,
  isPending = false,
  className,
  watch,
}: {
  children: ReactNode;
  /** Dims the frame while new rows are on their way. */
  isPending?: boolean;
  className?: string;
  /**
   * Anything that can change the table's width without resizing the frame —
   * a new page of rows, a hidden column. The ResizeObserver misses those.
   */
  watch?: unknown;
}) {
  const locale = useLocale();
  const isRtl = locale === "he";

  // A table wider than the phone silently hides the money columns behind a
  // clipped edge — it looks finished when it isn't. These flags drive a fade
  // at whichever edge still has content behind it.
  const tableWrap = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ start: false, end: false });

  const measureEdges = useCallback(() => {
    const el = tableWrap.current?.querySelector<HTMLElement>(
      '[data-slot="table-container"]',
    );
    if (!el) return;
    // Chrome reports a negative scrollLeft in RTL; distance is what matters.
    const x = Math.abs(el.scrollLeft);
    const max = el.scrollWidth - el.clientWidth;
    // A couple of pixels is sub-pixel rounding, not content. Fading over the
    // last column to promise two hidden pixels is worse than the two pixels.
    const next = { start: x > 2, end: max - x > 2 };
    // Bail out when nothing moved. `watch` is usually a fresh array literal, so
    // the effect below re-runs on every render — handing back a new object each
    // time would render again and never settle.
    setEdges((prev) =>
      prev.start === next.start && prev.end === next.end ? prev : next,
    );
  }, []);

  // The listener and observer outlive the rows: on a list screen `rows` is a
  // new array on every navigation, so watching it here would tear the pair
  // down and rebuild them on every page, sort and keystroke. The effect below
  // re-measures instead.
  useEffect(() => {
    const el = tableWrap.current?.querySelector<HTMLElement>(
      '[data-slot="table-container"]',
    );
    if (!el) return;
    measureEdges();
    el.addEventListener("scroll", measureEdges, { passive: true });
    const ro = new ResizeObserver(measureEdges);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", measureEdges);
      ro.disconnect();
    };
  }, [measureEdges]);

  // New rows or a hidden column can change the overflow without resizing the
  // container — a wider name on this page, one column fewer on the next.
  useEffect(measureEdges, [watch, measureEdges]);

  return (
    <div
      ref={tableWrap}
      className={cn(
        "relative overflow-hidden rounded-card border transition-opacity duration-150",
        // The cell rhythm, declared once. Two things depend on the 12px:
        // `SortHeader` pulls its button out by the button's own 10px so the
        // heading sits on the same edge as the figures under it — with a
        // narrower cell that button would hang past the table and register as
        // 2px of overflow, which is exactly what used to keep the end fade lit
        // over the money column. And the row height has to be stated, or a
        // table whose last cell holds no button (every report) collapses to
        // shorter than its own header.
        // `py-0` hands the row's height entirely to `h-12`, so a cell holding a
        // button measures the same as one holding a word — otherwise the three
        // list screens sit a pixel taller than the reports, which is how they
        // drifted apart in the first place. Every cell is `whitespace-nowrap`,
        // so nothing wraps into the edge it gives up.
        "[&_td]:px-3 [&_td]:py-0 [&_th]:px-3 [&_tbody_tr]:h-12",
        isPending && "opacity-60",
        className,
      )}
    >
      {(["start", "end"] as const).map((side) =>
        edges[side] ? (
          <div
            key={side}
            aria-hidden
            className={cn(
              "pointer-events-none absolute inset-y-0 z-10 w-12",
              side === "start" ? "start-0" : "end-0",
            )}
            style={{
              background: `linear-gradient(to ${
                (side === "end") === isRtl ? "right" : "left"
              }, var(--background), transparent)`,
            }}
          />
        ) : null,
      )}
      {children}
    </div>
  );
}
