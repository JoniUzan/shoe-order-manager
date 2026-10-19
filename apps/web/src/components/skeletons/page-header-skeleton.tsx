import { Skeleton } from "@repo/ui/components/skeleton";

import { SkeletonSection } from "./skeleton-section";

/**
 * A PageHeader whose title is data (an order's number, a Customer's name),
 * for the route's `loading.tsx`. Headers with a fixed title draw it for real.
 */
export function PageHeaderSkeleton({ actions = 0 }: { actions?: number }) {
  return (
    <SkeletonSection className="flex flex-wrap items-start justify-between gap-4">
      <div className="flex flex-col gap-2 pt-0.5">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-4 w-28" />
      </div>
      {actions > 0 && (
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: actions }, (_, i) => (
            <Skeleton key={i} className="h-8 w-24" />
          ))}
        </div>
      )}
    </SkeletonSection>
  );
}
