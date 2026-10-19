import { Skeleton } from "@repo/ui/components/skeleton";

import { PageHeaderSkeleton } from "@/components/skeletons/page-header-skeleton";
import { SkeletonSection } from "@/components/skeletons/skeleton-section";

/**
 * Only the header and the badges. Whether a packing card sits above the items
 * depends on the order, so a body drawn here would jump on every order with
 * packs; the body's own skeletons arrive with the page (ADR 0012).
 */
export default function OrderLoading() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeaderSkeleton actions={4} />
      <SkeletonSection className="flex flex-wrap items-center gap-3">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-5.5 w-20 rounded-full" />
        <Skeleton className="h-5.5 w-20 rounded-full" />
      </SkeletonSection>
    </div>
  );
}
