
import { CustomerForm } from "@/components/customers/customer-form";
import { requireUser } from "@/lib/session";

export default async function NewCustomerPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  await requireUser(locale);

  return <CustomerForm />;
}
