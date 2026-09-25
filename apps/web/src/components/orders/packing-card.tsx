import { formatCurve } from "@repo/domain";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@repo/ui/components/card";
import { getTranslations } from "next-intl/server";
import { Package } from "lucide-react";

import { formatExtras, type PackingSummary } from "@/lib/packing";

/**
 * The order as whoever packs it reads it: N boxes of each pack, then the loose
 * pairs. Only rendered for an order with at least one pack — without packs the
 * items table already says everything.
 */
export async function PackingCard({
  summary,
  locale,
}: {
  summary: PackingSummary;
  locale: string;
}) {
  const t = await getTranslations({ locale, namespace: "orders" });

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("packing")}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 text-sm">
        {summary.groups.map((group, i) => (
          <div key={i} className="flex flex-col gap-1">
            <p className="font-medium">
              {group.color ? `${group.name} — ${group.color}` : group.name}
            </p>
            {group.packs.map((pack, k) => (
              <p key={k} className="flex flex-wrap items-center gap-x-2 ps-2">
                <Package className="size-4 shrink-0 text-muted-foreground" />
                <span className="font-medium">
                  {t("packLine", { count: pack.count, name: pack.name })}
                </span>
                <span
                  dir="ltr"
                  className="text-xs text-muted-foreground tabular-nums"
                >
                  ({formatCurve(pack.curve)})
                </span>
              </p>
            ))}
            {group.extras.length > 0 && (
              <p className="ps-2 text-muted-foreground">
                {group.packs.length > 0 ? t("extraLine") : t("looseLine")}{" "}
                <span dir="ltr" className="text-foreground tabular-nums">
                  {formatExtras(group.extras)}
                </span>
              </p>
            )}
          </div>
        ))}
        <p className="border-t pt-3 font-semibold">
          {t("packsToPick", { count: summary.packsToPick })}
          <span className="px-2 text-muted-foreground">·</span>
          {t("loosePairs", { count: summary.loosePairs })}
        </p>
      </CardContent>
    </Card>
  );
}
