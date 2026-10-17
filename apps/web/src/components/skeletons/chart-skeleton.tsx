import { Skeleton } from "@repo/ui/components/skeleton";

import { SkeletonSection } from "./skeleton-section";

const HEIGHTS = [0.62, 0.84, 0.5, 0.74, 0.92, 0.58, 0.8, 0.68, 0.88, 0.54, 0.76, 0.96, 0.64];

/**
 * A chart's body before its data: `groups` columns of bars on a baseline, a
 * pair per column when the chart sets ordered beside collected. Only the
 * shape: the card and its title are drawn by the page.
 */
export function ChartSkeleton({
  groups,
  height,
  paired = true,
}: {
  groups: number;
  height: number;
  paired?: boolean;
}) {
  return (
    <SkeletonSection className="flex flex-col gap-2">
      <div
        className="flex items-end justify-around gap-1.5 border-b border-(--hairline) px-1"
        style={{ height }}
      >
        {Array.from({ length: groups }, (_, i) => {
          const h = HEIGHTS[i % HEIGHTS.length]! * (height - 16);
          return (
            <div key={i} className="flex flex-1 items-end justify-center gap-1">
              <Skeleton
                className="w-full max-w-6 rounded-b-none"
                style={{ height: h }}
              />
              {paired && (
                <Skeleton
                  className="w-full max-w-6 rounded-b-none"
                  style={{ height: h * 0.7 }}
                />
              )}
            </div>
          );
        })}
      </div>
      <div className="flex justify-around">
        {Array.from({ length: Math.min(groups, 4) }, (_, i) => (
          <Skeleton key={i} className="h-3 w-10" />
        ))}
      </div>
    </SkeletonSection>
  );
}
