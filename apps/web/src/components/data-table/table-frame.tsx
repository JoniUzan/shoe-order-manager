"use client";

import { cn } from "@repo/ui/lib/utils";
import { useLocale } from "next-intl";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

/**
 * The bordered, scroll-aware box a table sits in.
 *
 * Split out of `DataTable` so the tables that are *not* list screens — order
 * line items, the report tables, a customer's order history — get the same
 * frame without the toolbar, the pager, or any URL state. It knows nothing
 * about rows; it watches its own overflow and draws the edges.
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
    const next = { start: x > 1, end: max - x > 1 };
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
