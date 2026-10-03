import { prisma } from "@repo/db";
import {
  agorotToShekels,
  isSizeFormat,
  parseCurve,
  parseSizes,
} from "@repo/domain";
import { notFound } from "next/navigation";

import { CatalogForm } from "@/components/catalog/catalog-form";
import { requireUser } from "@/lib/session";
import { imageUrl } from "@/lib/storage";

export default async function EditModelPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  const user = await requireUser(locale);

  const model = await prisma.shoeModel.findFirst({
    where: { id, ownerId: user.id },
    include: {
      packs: {
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        select: { id: true, name: true, curve: true },
      },
    },
  });
  if (!model) notFound();
  const url = imageUrl(model.imageKey);

  return (
    <CatalogForm
      modelId={model.id}
      defaultImage={model.imageKey && url ? { key: model.imageKey, url } : null}
      defaultValues={{
        name: model.name,
        sku: model.sku ?? "",
        description: model.description ?? "",
        price:
          model.defaultPriceAgorot != null
            ? String(agorotToShekels(model.defaultPriceAgorot))
            : "",
        sizes: parseSizes(model.sizes),
        sizeFormat: isSizeFormat(model.sizeFormat) ? model.sizeFormat : "eu",
        isActive: model.isActive,
        packs: model.packs.map((pack) => ({
          id: pack.id,
          name: pack.name,
          pairs: Object.fromEntries(
            parseCurve(pack.curve).map((c) => [c.size, String(c.pairs)]),
          ),
        })),
      }}
    />
  );
}
