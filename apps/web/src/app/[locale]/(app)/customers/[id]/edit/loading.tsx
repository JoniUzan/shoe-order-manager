import { useTranslations } from "next-intl";

import { FormSkeleton } from "@/components/skeletons/form-skeleton";

export default function CustomerFormLoading() {
  const t = useTranslations("customers");
  return (
    <FormSkeleton
      title={t("edit")}
      steps={[]}
      illustration="store"
      stepTitle={t("edit")}
      hint={t("editHint")}
      submitLabel={t("saveCustomer")}
    />
  );
}
