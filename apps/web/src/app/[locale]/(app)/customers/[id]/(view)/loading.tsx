import { useTranslations } from "next-intl";

import { CustomerDetailsSkeleton } from "@/components/skeletons/detail-skeletons";
import { OrdersTableSkeleton } from "@/components/skeletons/list-skeletons";
import { PageHeaderSkeleton } from "@/components/skeletons/page-header-skeleton";

export default function CustomerLoading() {
  const t = useTranslations("customers");
  return (
    <div className="flex flex-col gap-6">
      <PageHeaderSkeleton actions={2} />
      <div className="grid gap-6 lg:grid-cols-3">
        <CustomerDetailsSkeleton />
        <div className="flex min-w-0 flex-col gap-3 lg:col-span-2">
          <h3 className="text-sm font-medium text-muted-foreground">{t("orderHistory")}</h3>
          <OrdersTableSkeleton scopedToCustomer />
        </div>
      </div>
    </div>
  );
}
