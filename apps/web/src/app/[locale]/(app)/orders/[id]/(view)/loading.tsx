import { Skeleton } from "@repo/ui/components/skeleton";

import { PaymentsSkeleton } from "@/components/skeletons/detail-skeletons";
import { OrderItemsTableSkeleton } from "@/components/skeletons/list-skeletons";
import { PageHeaderSkeleton } from "@/components/skeletons/page-header-skeleton";
import { SkeletonSection } from "@/components/skeletons/skeleton-section";

export default function OrderLoading() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeaderSkeleton actions={4} />
      <SkeletonSection className="flex flex-wrap items-center gap-3">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-5.5 w-20 rounded-full" />
        <Skeleton className="h-5.5 w-20 rounded-full" />
      </SkeletonSection>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="min-w-0">
          <OrderItemsTableSkeleton />
        </div>
        <aside className="min-w-0">
          <PaymentsSkeleton />
        </aside>
      </div>
    </div>
  );
}
