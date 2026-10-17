import { Skeleton } from "@repo/ui/components/skeleton";

import { SkeletonSection, vary } from "./skeleton-section";

/** Rows of a name and an amount, ruled between, as in "who owes money". */
export function ListSkeleton({ rows }: { rows: number }) {
  return (
    <SkeletonSection className="flex flex-col">
      {Array.from({ length: rows }, (_, i) => (
        <div
          key={i}
          className="flex h-11 items-center justify-between gap-3 border-t border-(--hairline) first:border-t-0"
        >
          <Skeleton className="h-3.5" style={{ width: vary(i, 150) }} />
          <Skeleton className="h-3.5" style={{ width: vary(i + 3, 72) }} />
        </div>
      ))}
    </SkeletonSection>
  );
}
