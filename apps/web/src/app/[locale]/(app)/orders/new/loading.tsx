import { useTranslations } from "next-intl";

import { FormSkeleton } from "@/components/skeletons/form-skeleton";

export default function OrderFormLoading() {
  const t = useTranslations("orders");
  const tc = useTranslations("common");
  return (
    <FormSkeleton
      title={t("new")}
      steps={[t("stepCustomer"), t("stepItems"), t("stepNotes"), t("stepReview")]}
      illustration="store"
      stepTitle={t("stepCustomer")}
      hint={t("stepCustomerHint")}
      submitLabel={tc("continue")}
      fields={5}
    />
  );
}
