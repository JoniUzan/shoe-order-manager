import { prisma } from "@repo/db";
import { formatMoney } from "@repo/domain";
import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import { Card } from "@repo/ui/components/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/ui/components/table";
import { getTranslations } from "next-intl/server";
import { Footprints, Pencil, Plus } from "lucide-react";

import { DeleteModelButton } from "@/components/catalog/delete-model-button";
import { PageHeader } from "@/components/layout/page-header";
import { Link } from "@/i18n/navigation";
import { requireUser } from "@/lib/session";

export default async function CatalogPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const user = await requireUser(locale);
  const t = await getTranslations({ locale, namespace: "catalog" });

  const models = await prisma.shoeModel.findMany({
    where: { ownerId: user.id },
    orderBy: { name: "asc" },
  });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t("title")}
        subtitle={t("subtitle")}
        action={
          <Button asChild>
            <Link href="/catalog/new">
              <Plus className="size-4" />
              {t("add")}
            </Link>
          </Button>
        }
      />

      {models.length === 0 ? (
        <Card className="flex flex-col items-center justify-center gap-3 py-16 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-muted">
            <Footprints className="size-6 text-muted-foreground" />
          </div>
          <div className="space-y-1">
            <p className="font-medium">{t("empty")}</p>
            <p className="text-sm text-muted-foreground">{t("emptyHint")}</p>
          </div>
          <Button asChild className="mt-2">
            <Link href="/catalog/new">
              <Plus className="size-4" />
              {t("add")}
            </Link>
          </Button>
        </Card>
      ) : (
        <Card className="py-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("name")}</TableHead>
                <TableHead>{t("sku")}</TableHead>
                <TableHead className="text-end">{t("price")}</TableHead>
                <TableHead>{t("active")}</TableHead>
                <TableHead className="w-0" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {models.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="font-medium">{m.name}</TableCell>
                  <TableCell dir="ltr" className="text-start text-muted-foreground">
                    {m.sku ?? "—"}
                  </TableCell>
                  <TableCell className="text-end tabular-nums">
                    {m.defaultPriceAgorot != null
                      ? formatMoney(m.defaultPriceAgorot, locale)
                      : "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={m.isActive ? "success" : "secondary"}>
                      {m.isActive ? t("active") : t("inactive")}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-2">
                      <Button asChild variant="outline" size="icon-sm">
                        <Link href={`/catalog/${m.id}/edit`}>
                          <Pencil className="size-4" />
                        </Link>
                      </Button>
                      <DeleteModelButton
                        id={m.id}
                        name={m.name}
                        size="icon-sm"
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
