import { useTranslations } from "next-intl";

import { FormSkeleton } from "@/components/skeletons/form-skeleton";

export default function ModelFormLoading() {
  const t = useTranslations("catalog");
  const tc = useTranslations("common");
  return (
    <FormSkeleton
      title={t("edit")}
      steps={[t("stepDetails"), t("stepSizes"), t("stepPacks")]}
      stepTitle={t("stepDetails")}
      hint={t("stepDetailsHint")}
      submitLabel={tc("continue")}
    />
  );
}
