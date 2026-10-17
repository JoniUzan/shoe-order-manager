import { Card, CardContent } from "@repo/ui/components/card";
import { Skeleton } from "@repo/ui/components/skeleton";
import { useTranslations } from "next-intl";

import { ChartSkeleton } from "./chart-skeleton";
import { OrdersTableSkeleton } from "./list-skeletons";
import { RankBarsSkeleton } from "./rank-bars-skeleton";
import { SkeletonSection } from "./skeleton-section";

/** The sales tab's three trend cards, before the trends are read. */
export function SalesTrendsSkeleton() {
  const t = useTranslations("reports");
  return (
    <div className="flex flex-col gap-4">
      <section className="surface-raised flex flex-col gap-4 rounded-card bg-card px-5 py-5 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-col gap-0.5">
            <h2 className="text-[17px] font-semibold">{t("trendTitle")}</h2>
            <p className="text-sm text-muted-foreground">{t("trendByWeek")}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Skeleton className="h-8 w-36" />
            <Skeleton className="h-8 w-32" />
          </div>
        </div>
        <ChartSkeleton groups={13} height={300} />
      </section>
      <div className="grid gap-4 lg:grid-cols-2">
        <RankBarsSkeleton title={t("topModelsTitle")} description={t("topModelsDesc")} />
        <RankBarsSkeleton
          title={t("topCustomersTitle")}
          description={t("topCustomersDesc")}
        />
      </div>
      <section className="surface-raised flex flex-col gap-3 rounded-card bg-card px-5 py-5 sm:px-6">
        <div className="flex flex-col gap-0.5">
          <h2 className="text-[17px] font-semibold">{t("debtTitle")}</h2>
          <p className="text-sm text-muted-foreground">{t("debtDesc")}</p>
        </div>
        <ChartSkeleton groups={13} height={200} paired={false} />
      </section>
    </div>
  );
}

/**
 * The by-customer tab: the picker, then (once a Customer is picked) the three
 * tiles and their orders.
 */
export function CustomerReportSkeleton({ picked }: { picked: boolean }) {
  return (
    <div className="flex flex-col gap-4">
      <SkeletonSection>
        <Skeleton className="h-9 max-w-xs" />
      </SkeletonSection>
      {picked && (
        <>
          <SkeletonSection className="grid gap-4 sm:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <Card key={i}>
                <CardContent className="flex flex-col gap-2">
                  <Skeleton className="h-3.5 w-20" />
                  <Skeleton className="h-6 w-24" />
                </CardContent>
              </Card>
            ))}
          </SkeletonSection>
          <OrdersTableSkeleton scopedToCustomer />
        </>
      )}
    </div>
  );
}
