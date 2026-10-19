import { Skeleton } from "@repo/ui/components/skeleton";

import { TOP_SHOWN } from "@/lib/sales-trends-query";

import { SkeletonSection, vary } from "./skeleton-section";

const SHARE = [92, 74, 60, 46, 34, 24];

/** A RankBars card before its rows: the real title and description, and
 * TOP_SHOWN bars. */
export function RankBarsSkeleton({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <section className="surface-raised flex flex-col gap-2 rounded-card bg-card px-5 py-5 sm:px-6">
      <div className="flex flex-col gap-0.5 pb-1.5">
        <h2 className="text-[17px] font-semibold">{title}</h2>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <SkeletonSection className="flex flex-col">
        {SHARE.slice(0, TOP_SHOWN).map((share, i) => (
          <div
            key={i}
            className="grid h-8.5 grid-cols-[minmax(0,8rem)_minmax(0,1fr)_4.5rem] items-center gap-3"
          >
            <Skeleton className="h-3.5 max-w-full" style={{ width: vary(i, 110) }} />
            <Skeleton className="h-3.5 rounded-[4px]" style={{ width: `${share}%` }} />
            <Skeleton className="ms-auto h-3.5 w-10" />
          </div>
        ))}
      </SkeletonSection>
    </section>
  );
}
