import { useTranslations } from "next-intl";

import { ListHeader } from "@/components/layout/list-header";
import { CatalogTableSkeleton } from "@/components/skeletons/list-skeletons";

export default function CatalogLoading() {
  const t = useTranslations("catalog");
  return (
    <div className="flex flex-col gap-6">
      <ListHeader
        title={t("title")}
        subtitle={t("subtitle")}
        addHref="/catalog/new"
        addLabel={t("add")}
      />
      <CatalogTableSkeleton />
    </div>
  );
}
