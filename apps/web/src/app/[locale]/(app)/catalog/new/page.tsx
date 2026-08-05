import { getTranslations } from "next-intl/server";

import { CatalogForm } from "@/components/catalog/catalog-form";
import { PageHeader } from "@/components/layout/page-header";
import { requireUser } from "@/lib/session";

export default async function NewModelPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  await requireUser(locale);
  const t = await getTranslations({ locale, namespace: "catalog" });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("new")} />
      <CatalogForm />
    </div>
  );
}
