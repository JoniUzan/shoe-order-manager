import { Skeleton } from "@repo/ui/components/skeleton";
import { useTranslations } from "next-intl";

import { SkeletonSection } from "./skeleton-section";

const HEIGHTS = [0.62, 0.84, 0.5, 0.74, 0.92, 0.58, 0.8, 0.68, 0.88, 0.54, 0.76, 0.96, 0.64];

/** Recharts' x axis under the plot: tick labels plus their 8px margin. */
const X_AXIS = 30;
/** The charts' top margin inside the plot. */
const TOP = 8;

/**
 * A chart's body before its data, in the same box as the real one: SalesChart's
 * legend (real labels, grey totals) when `legend`, then a plot exactly `height`
 * tall with the y axis on the reading side and the x labels under it. `bars`
 * draws `groups` columns, a pair each when `paired`; `area` a grey hill, for
 * the debt chart. Only the shape: the card and its title are drawn by the page.
 */
export function ChartSkeleton({
  groups,
  height,
  paired = true,
  shape = "bars",
  legend = true,
  totalWidth = "w-20",
}: {
  groups: number;
  height: number;
  paired?: boolean;
  shape?: "bars" | "area";
  legend?: boolean;
  /** A legend total's width: 13 weeks of sales run longer than 4. */
  totalWidth?: string;
}) {
  const t = useTranslations("charts");
  const plot = height - X_AXIS - TOP;

  return (
    <SkeletonSection className="flex flex-col gap-2.5">
      {legend && (
        <ul className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
          {[
            { label: t("ordered"), color: "var(--chart-1)" },
            { label: t("collected"), color: "var(--chart-3)" },
          ].map(({ label, color }) => (
            <li key={label} className="flex items-center gap-1.5">
              <span aria-hidden className="size-2.5 rounded-[3px]" style={{ background: color }} />
              <span className="text-muted-foreground">{label}</span>
              {/* As wide as a typical total, so it wraps where the real one does. */}
              <Skeleton className={`h-3.5 ${totalWidth}`} />
            </li>
          ))}
        </ul>
      )}
      <div className="flex" style={{ height }}>
        {/* The y axis: 48px wide, as in the charts. */}
        <div
          className="flex w-12 shrink-0 flex-col justify-between pe-2"
          style={{ paddingTop: TOP, paddingBottom: X_AXIS }}
        >
          {[0, 1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-2.5 w-8" />
          ))}
        </div>
        <div className="flex min-w-0 flex-1 flex-col" style={{ paddingTop: TOP }}>
          <div
            className="flex items-end justify-around gap-1.5 border-b border-(--hairline) px-1"
            style={{ height: plot }}
          >
            {shape === "area" ? (
              <svg
                aria-hidden
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
                className="size-full animate-pulse fill-skeleton motion-reduce:animate-none"
              >
                <polygon points="0,62 16,54 33,58 50,40 66,46 83,30 100,36 100,100 0,100" />
              </svg>
            ) : (
              Array.from({ length: groups }, (_, i) => {
                const h = HEIGHTS[i % HEIGHTS.length]! * (plot - 8);
                return (
                  <div key={i} className="flex flex-1 items-end justify-center gap-1">
                    <Skeleton className="w-full max-w-5 rounded-b-none" style={{ height: h }} />
                    {paired && (
                      <Skeleton
                        className="w-full max-w-5 rounded-b-none"
                        style={{ height: h * 0.7 }}
                      />
                    )}
                  </div>
                );
              })
            )}
          </div>
          <div className="flex flex-1 items-center justify-around">
            {Array.from({ length: Math.min(groups, 4) }, (_, i) => (
              <Skeleton key={i} className="h-3 w-10" />
            ))}
          </div>
        </div>
      </div>
    </SkeletonSection>
  );
}
