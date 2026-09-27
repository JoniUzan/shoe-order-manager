import { prisma } from "@repo/db";
import {
  agorotToShekels,
  isSizeFormat,
  parseCurve,
  parseSizes,
} from "@repo/domain";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";

import { CatalogForm } from "@/components/catalog/catalog-form";
import { PageHeader } from "@/components/layout/page-header";
import { requireUser } from "@/lib/session";

export default async function EditModelPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  const user = await requireUser(locale);
  const t = await getTranslations({ locale, namespace: "catalog" });

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

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("edit")} />
      <CatalogForm
        modelId={model.id}
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
    </div>
  );
}
