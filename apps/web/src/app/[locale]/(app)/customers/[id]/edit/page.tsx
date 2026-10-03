import { prisma } from "@repo/db";
import { notFound } from "next/navigation";

import { CustomerForm } from "@/components/customers/customer-form";
import { requireUser } from "@/lib/session";

export default async function EditCustomerPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  const user = await requireUser(locale);

  const customer = await prisma.customer.findFirst({
    where: { id, ownerId: user.id },
  });
  if (!customer) notFound();

  return (
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
  );
}
