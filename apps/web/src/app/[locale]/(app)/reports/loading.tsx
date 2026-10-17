import { useTranslations } from "next-intl";

import { PageHeader } from "@/components/layout/page-header";
import { OwedTableSkeleton } from "@/components/skeletons/list-skeletons";

/**
 * The header and the tabs, then the default tab's table. The tab in the URL
 * isn't known here; once the page runs, its own sections stream (ADR 0012).
 */
export default function ReportsLoading() {
  const t = useTranslations("reports");
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("title")} subtitle={t("subtitle")} />
      <div className="flex gap-1 border-b">
        {[t("tabOwed"), t("tabByCustomer"), t("tabSales")].map((label) => (
          <span
            key={label}
            className="inline-flex h-8 items-center border-b-2 border-transparent px-3 text-sm font-medium text-muted-foreground"
          >
            {label}
          </span>
        ))}
      </div>
      <OwedTableSkeleton />
    </div>
  );
}
