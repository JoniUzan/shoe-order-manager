import { useTranslations } from "next-intl";

import { ListHeader } from "@/components/layout/list-header";
import { OrdersTableSkeleton } from "@/components/skeletons/list-skeletons";

export default function OrdersLoading() {
  const t = useTranslations("orders");
  return (
    <div className="flex flex-col gap-6">
      <ListHeader
        title={t("title")}
        subtitle={t("subtitle")}
        addHref="/orders/new"
        addLabel={t("add")}
      />
      <OrdersTableSkeleton />
    </div>
  );
}
