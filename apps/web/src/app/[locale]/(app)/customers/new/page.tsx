import { getTranslations } from "next-intl/server";

import { CustomerForm } from "@/components/customers/customer-form";
import { PageHeader } from "@/components/layout/page-header";
import { requireUser } from "@/lib/session";

export default async function NewCustomerPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  await requireUser(locale);
  const t = await getTranslations({ locale, namespace: "customers" });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("new")} />
      <CustomerForm />
    </div>
  );
}
