import { useTranslations } from "next-intl";

import { ListHeader } from "@/components/layout/list-header";
import { CustomersTableSkeleton } from "@/components/skeletons/list-skeletons";

export default function CustomersLoading() {
  const t = useTranslations("customers");
  return (
    <div className="flex flex-col gap-6">
      <ListHeader
        title={t("title")}
        subtitle={t("subtitle")}
        addHref="/customers/new"
        addLabel={t("add")}
      />
      <CustomersTableSkeleton />
    </div>
  );
}
