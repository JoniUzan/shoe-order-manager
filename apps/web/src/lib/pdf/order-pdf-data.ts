import { prisma } from "@repo/db";
import type { DocumentItem, DocumentPack } from "@repo/domain";

import type { Business } from "./parts";
import type { PdfLocale } from "./urls";

/** Everything either PDF prints, read in one go and scoped by `ownerId`. */
export interface OrderPdfData {
  locale: PdfLocale;
  orderNumber: number;
  date: string;
  business: Business;
  customer: {
    name: string;
    contactName: string | null;
    phone: string | null;
    address: string | null;
  };
  items: DocumentItem[];
  packs: DocumentPack[];
  totalAgorot: number;
  depositAgorot: number;
  notes: string | null;
  factoryNote: string | null;
}

export async function loadOrderPdfData(
  ownerId: string,
  orderId: string,
  locale: PdfLocale,
): Promise<OrderPdfData | null> {
  const [order, business] = await Promise.all([
    prisma.order.findFirst({
      where: { id: orderId, ownerId },
      include: {
        customer: {
          select: { name: true, contactName: true, phone: true, address: true },
        },
        items: {
          orderBy: { id: "asc" },
          include: { shoeModel: { select: { name: true, sku: true } } },
        },
        packs: { select: { id: true, packName: true, count: true } },
      },
    }),
    prisma.user.findUnique({
      where: { id: ownerId },
      select: {
        businessName: true,
        businessAddress: true,
        businessPhone: true,
        businessTaxId: true,
      },
    }),
  ]);
  if (!order || !business) return null;

  return {
    locale,
    orderNumber: order.orderNumber,
    date: new Intl.DateTimeFormat(locale === "he" ? "he-IL" : "en-US", {
      dateStyle: "long",
    }).format(order.createdAt),
    business,
    customer: order.customer,
    items: order.items.map((it) => ({
      shoeModelId: it.shoeModelId,
      name: it.shoeModel?.name ?? it.customDescription ?? "",
      sku: it.shoeModel?.sku ?? null,
      size: it.size,
      color: it.color,
      quantity: it.quantity,
      unitPriceAgorot: it.unitPriceAgorot,
      packId: it.packId,
    })),
    packs: order.packs,
    totalAgorot: order.totalAgorot,
    depositAgorot: order.depositAgorot,
    notes: order.notes,
    factoryNote: order.factoryNote,
  };
}
