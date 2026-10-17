import { useTranslations } from "next-intl";

import { FormSkeleton } from "@/components/skeletons/form-skeleton";

export default function OrderFormLoading() {
  const t = useTranslations("orders");
  const tc = useTranslations("common");
  return (
    <FormSkeleton
      title={t("edit")}
      steps={[t("stepCustomer"), t("stepItems"), t("stepNotes"), t("stepReview")]}
      stepTitle={t("stepCustomer")}
      hint={t("stepCustomerHint")}
      submitLabel={tc("continue")}
      body="list"
    />
  );
}
