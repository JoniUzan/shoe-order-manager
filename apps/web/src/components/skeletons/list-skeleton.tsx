import { Skeleton } from "@repo/ui/components/skeleton";

import { SkeletonSection, vary } from "./skeleton-section";

/** Rows of a name and an amount, ruled between, as in "who owes money". */
export function ListSkeleton({ rows }: { rows: number }) {
  return (
    <SkeletonSection className="flex flex-col">
      {Array.from({ length: rows }, (_, i) => (
        // The rule sits outside the 44px row, as the real list's does.
        <div key={i} className="border-t border-(--hairline) first:border-t-0">
          <div className="flex h-11 items-center justify-between gap-3">
            <Skeleton className="h-3.5" style={{ width: vary(i, 150) }} />
            <Skeleton className="h-3.5" style={{ width: vary(i + 3, 88) }} />
          </div>
        </div>
      ))}
    </SkeletonSection>
  );
}
