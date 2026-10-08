import { prisma } from "@repo/db";
import { parseCurve, parseSizes } from "@repo/domain";
import { Button } from "@repo/ui/components/button";
import { Card } from "@repo/ui/components/card";
import { getTranslations } from "next-intl/server";
import { Plus, Users } from "lucide-react";

import { OrderForm } from "@/components/orders/order-form";
import { PageHeader } from "@/components/layout/page-header";
import { Link } from "@/i18n/navigation";
import { loadItemSuggestions } from "@/lib/item-suggestions";
import { requireUser } from "@/lib/session";
import { imageUrl } from "@/lib/storage";

export default async function NewOrderPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ customer?: string | string[] }>;
}) {
  const { locale } = await params;
  const { customer } = await searchParams;
  const user = await requireUser(locale);
  const t = await getTranslations({ locale, namespace: "orders" });
  const tCustomers = await getTranslations({ locale, namespace: "customers" });

  const [customers, models, suggestions] = await Promise.all([
    prisma.customer.findMany({
      where: { ownerId: user.id },
      orderBy: { name: "asc" },
      select: { id: true, name: true, phone: true, address: true },
    }),
    prisma.shoeModel.findMany({
      where: { ownerId: user.id, isActive: true },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        defaultPriceAgorot: true,
        sizes: true,
        isActive: true,
        imageKey: true,
        packs: {
          select: { id: true, name: true, curve: true },
          orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        },
      },
    }),
    loadItemSuggestions(user.id),
  ]);

  if (customers.length > 0) {
    // Started from a Customer's page: only one of this User's own Customers
    // is taken; anything else starts the order with no Customer.
    const chosen = customers.find((c) => c.id === customer)?.id;
    return (
      <OrderForm
        customers={customers}
        customerId={chosen}
        suggestions={suggestions}
        models={models.map((m) => ({
          ...m,
          imageUrl: imageUrl(m.imageKey),
          sizes: parseSizes(m.sizes),
          packs: m.packs.map((p) => ({ ...p, curve: parseCurve(p.curve) })),
        }))}
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("new")} />
      <Card className="flex flex-col items-center justify-center gap-3 py-16 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-muted">
            <Users className="size-6 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground">{t("noCustomers")}</p>
          <Button asChild className="mt-2">
            <Link href="/customers/new">
              <Plus className="size-4" />
              {tCustomers("add")}
            </Link>
          </Button>
      </Card>
    </div>
  );
}
