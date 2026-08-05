import { prisma } from "@repo/db";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";

import { CustomerForm } from "@/components/customers/customer-form";
import { PageHeader } from "@/components/layout/page-header";
import { requireUser } from "@/lib/session";

export default async function EditCustomerPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  const user = await requireUser(locale);
  const t = await getTranslations({ locale, namespace: "customers" });

  const customer = await prisma.customer.findFirst({
    where: { id, ownerId: user.id },
  });
  if (!customer) notFound();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("edit")} />
      <CustomerForm
        customerId={customer.id}
        defaultValues={{
          name: customer.name,
          contactName: customer.contactName ?? "",
          phone: customer.phone ?? "",
          address: customer.address ?? "",
          notes: customer.notes ?? "",
        }}
      />
    </div>
  );
}
