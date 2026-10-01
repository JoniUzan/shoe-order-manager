import { CatalogForm } from "@/components/catalog/catalog-form";
import { requireUser } from "@/lib/session";

export default async function NewModelPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  await requireUser(locale);

  return <CatalogForm />;
}
