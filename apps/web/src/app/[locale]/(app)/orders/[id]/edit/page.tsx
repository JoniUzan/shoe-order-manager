import { prisma } from "@repo/db";
import { agorotToShekels } from "@repo/domain";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";

import { OrderForm } from "@/components/orders/order-form";
import { PageHeader } from "@/components/layout/page-header";
import { requireUser } from "@/lib/session";

export default async function EditOrderPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  const user = await requireUser(locale);
  const t = await getTranslations({ locale, namespace: "orders" });

  const [order, customers, models] = await Promise.all([
    prisma.order.findFirst({
      where: { id, ownerId: user.id },
      include: { items: { orderBy: { id: "asc" } } },
    }),
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
  if (!order) notFound();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("edit")} />
      <OrderForm
        orderId={order.id}
        customers={customers}
        models={models}
        defaultValues={{
          customerId: order.customerId,
          notes: order.notes ?? "",
          statusCode: order.statusCode,
          depositAgorot: order.depositAgorot,
          items: order.items.map((it) => ({
            mode: it.shoeModelId ? "catalog" : "custom",
            shoeModelId: it.shoeModelId ?? "",
            customDescription: it.customDescription ?? "",
            size: it.size,
            color: it.color ?? "",
            quantity: String(it.quantity),
            unitPrice: String(agorotToShekels(it.unitPriceAgorot)),
          })),
        }}
      />
    </div>
  );
}
