import { prisma } from "@repo/db";
import type { DocumentItem, DocumentPack } from "@repo/domain";

import { getObject } from "@/lib/storage";

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
  /** Each catalog model's Product image (JPEG bytes), by shoeModelId. */
  images: Map<string, Buffer>;
}

/**
 * The order's Product images, read from storage rather than their public
 * URLs so the server never fetches itself. One missing or unreadable image
 * only leaves its row without a picture; the PDF still renders.
 */
async function loadImages(
  models: { id: string; imageKey: string | null }[],
): Promise<Map<string, Buffer>> {
  const images = new Map<string, Buffer>();
  await Promise.all(
    models.map(async ({ id, imageKey }) => {
      if (!imageKey) return;
      const bytes = await getObject(imageKey).catch((error: unknown) => {
        console.error(`pdf: could not read ${imageKey}`, error);
        return null;
      });
      if (bytes) images.set(id, Buffer.from(bytes));
    }),
  );
  return images;
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
          include: {
            shoeModel: { select: { id: true, name: true, sku: true, imageKey: true } },
          },
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

  const models = new Map(
    order.items.flatMap((it) => (it.shoeModel ? [[it.shoeModel.id, it.shoeModel]] : [])),
  );
  const images = await loadImages([...models.values()]);

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
      material: it.material,
      sole: it.sole,
      quantity: it.quantity,
      unitPriceAgorot: it.unitPriceAgorot,
      packId: it.packId,
    })),
    packs: order.packs,
    totalAgorot: order.totalAgorot,
    depositAgorot: order.depositAgorot,
    notes: order.notes,
    factoryNote: order.factoryNote,
    images,
  };
}
