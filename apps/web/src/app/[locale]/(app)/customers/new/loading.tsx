import { useTranslations } from "next-intl";

import { FormSkeleton } from "@/components/skeletons/form-skeleton";

export default function CustomerFormLoading() {
  const t = useTranslations("customers");
  return (
    <FormSkeleton
      title={t("new")}
      steps={[]}
      stepTitle={t("new")}
      hint={t("formHint")}
      submitLabel={t("saveCustomer")}
    />
  );
}
