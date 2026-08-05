import { prisma } from "@repo/db";
import { Button } from "@repo/ui/components/button";
import { Card } from "@repo/ui/components/card";
import { getTranslations } from "next-intl/server";
import { Plus, Users } from "lucide-react";

import { OrderForm } from "@/components/orders/order-form";
import { PageHeader } from "@/components/layout/page-header";
import { Link } from "@/i18n/navigation";
import { requireUser } from "@/lib/session";

export default async function NewOrderPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const user = await requireUser(locale);
  const t = await getTranslations({ locale, namespace: "orders" });
  const tCustomers = await getTranslations({ locale, namespace: "customers" });

  const [customers, models] = await Promise.all([
    prisma.customer.findMany({
      where: { ownerId: user.id },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.shoeModel.findMany({
      where: { ownerId: user.id, isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, defaultPriceAgorot: true },
    }),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("new")} />
      {customers.length === 0 ? (
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
      ) : (
        <OrderForm customers={customers} models={models} />
      )}
    </div>
  );
}
