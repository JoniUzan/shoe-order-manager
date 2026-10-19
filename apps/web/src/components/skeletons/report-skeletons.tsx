import { Card, CardContent } from "@repo/ui/components/card";
import { Skeleton } from "@repo/ui/components/skeleton";
import { ToggleGroup, ToggleGroupItem } from "@repo/ui/components/toggle-group";
import { useTranslations } from "next-intl";

import { ChartSkeleton } from "./chart-skeleton";
import { OrdersTableSkeleton } from "./list-skeletons";
import { RankBarsSkeleton } from "./rank-bars-skeleton";
import { SkeletonSection } from "./skeleton-section";

/** The sales tab's three trend cards, before the trends are read. */
export function SalesTrendsSkeleton() {
  const t = useTranslations("reports");
  const [changeBefore, changeAfter = ""] = t("debtChange", { amount: "\u0000" }).split("\u0000");
  return (
    <div className="flex flex-col gap-4">
      <section className="surface-raised flex flex-col gap-4 rounded-card bg-card px-5 py-5 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-col gap-0.5">
            <h2 className="text-[17px] font-semibold">{t("trendTitle")}</h2>
            <p className="text-sm text-muted-foreground">{t("trendByWeek")}</p>
          </div>
          {/* SalesTrend's own pickers, at their defaults and inert. */}
          <div className="flex flex-wrap gap-2">
            <ToggleGroup type="single" variant="outline" size="sm" value="bars" disabled>
              {(["area", "bars", "line"] as const).map((k) => (
                <ToggleGroupItem key={k} value={k} className="px-3">
                  {t(`kind_${k}`)}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
            <ToggleGroup type="single" variant="outline" size="sm" value="13" disabled>
              {([13, 8, 4] as const).map((r) => (
                <ToggleGroupItem key={r} value={String(r)} className="px-3">
                  {t(`range_${r}`)}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>
        </div>
        <ChartSkeleton groups={13} height={300} totalWidth="w-28" />
      </section>
      <div className="grid gap-4 lg:grid-cols-2">
        <RankBarsSkeleton title={t("topModelsTitle")} description={t("topModelsDesc")} />
        <RankBarsSkeleton
          title={t("topCustomersTitle")}
          description={t("topCustomersDesc")}
        />
      </div>
      <section className="surface-raised flex flex-col gap-3 rounded-card bg-card px-5 py-5 sm:px-6">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <div className="flex flex-col gap-0.5">
            <h2 className="text-[17px] font-semibold">{t("debtTitle")}</h2>
            <p className="text-sm text-muted-foreground">{t("debtDesc")}</p>
          </div>
          {/* DebtChart's figures as text with grey amounts, so the baseline and
              the wrapping are the real ones. */}
          <div className="flex items-baseline gap-2.5">
            <span className="text-[22px] font-semibold">
              {"\u200b"}
              <Skeleton className="inline-block h-6 w-32 align-middle" />
            </span>
            <span className="text-sm text-muted-foreground">
              {changeBefore}
              <Skeleton className="inline-block h-3.5 w-24 align-middle" />
              {changeAfter}
            </span>
          </div>
        </div>
        <ChartSkeleton groups={13} height={200} shape="area" legend={false} />
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
