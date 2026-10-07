import { prisma } from "@repo/db";
import { parseCurve, parseSizes } from "@repo/domain";
import { notFound } from "next/navigation";

import { OrderForm } from "@/components/orders/order-form";
import { groupItemsIntoBlocks } from "@/lib/order-blocks";
import { loadItemSuggestions } from "@/lib/item-suggestions";
import { requireUser } from "@/lib/session";
import { imageUrl } from "@/lib/storage";

export default async function EditOrderPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  const user = await requireUser(locale);

  const [order, customers, models, suggestions] = await Promise.all([
    prisma.order.findFirst({
      where: { id, ownerId: user.id },
      include: { items: { orderBy: { id: "asc" } }, packs: true },
    }),
    prisma.customer.findMany({
      where: { ownerId: user.id },
      orderBy: { name: "asc" },
      select: { id: true, name: true, phone: true, address: true },
    }),
    // A model the order uses may since have been deactivated; it still has to
    // appear here or editing the order would silently drop that block.
    prisma.shoeModel.findMany({
      where: { ownerId: user.id },
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
  if (!order) notFound();

  const modelOptions = models.map((m) => ({
    ...m,
    imageUrl: imageUrl(m.imageKey),
    sizes: parseSizes(m.sizes),
    packs: m.packs.map((p) => ({ ...p, curve: parseCurve(p.curve) })),
  }));
  const sizesByModelId = new Map(modelOptions.map((m) => [m.id, m.sizes]));

  return (
    <OrderForm
        orderId={order.id}
        orderNumber={order.orderNumber}
        customers={customers}
        models={modelOptions}
        suggestions={suggestions}
        defaultValues={{
          customerId: order.customerId,
          notes: order.notes ?? "",
          factoryNote: order.factoryNote ?? "",
          statusCode: order.statusCode,
          blocks: groupItemsIntoBlocks(
            order.items,
            sizesByModelId,
            order.packs,
          ),
        }}
      />
  );
}
