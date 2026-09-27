import { curvePairs } from "@repo/domain";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@repo/ui/components/card";
import { getTranslations } from "next-intl/server";
import { Package } from "lucide-react";
import { Fragment, type ReactNode } from "react";

import { CurveText } from "@/components/catalog/curve-text";
import type { PackingSummary } from "@/lib/packing";

/**
 * The order as whoever packs it reads it: N boxes of each pack, then the loose
 * pairs. Only rendered for an order with at least one pack — without packs the
 * items table already says everything.
 *
 * One grid for the whole card (count · what · sizes), so the columns line up
 * across models and the eye can run straight down the counts.
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
        <div className="grid grid-cols-[auto_minmax(0,auto)_1fr] items-center gap-x-3 gap-y-2">
          {summary.groups.map((group, i) => {
            const pairs =
              group.packs.reduce(
                (sum, p) => sum + p.count * curvePairs(p.curve),
                0,
              ) + group.extras.reduce((sum, e) => sum + e.quantity, 0);
            return (
              <Fragment key={i}>
                <div
                  className={
                    i > 0
                      ? "col-span-full mt-2 flex items-baseline gap-2 border-t pt-4"
                      : "col-span-full flex items-baseline gap-2"
                  }
                >
                  <span className="font-medium">{group.name}</span>
                  {group.color && (
                    <span className="text-muted-foreground">{group.color}</span>
                  )}
                  <span className="ms-auto text-xs text-muted-foreground tabular-nums">
                    {t("pairsCount", { count: pairs })}
                  </span>
                </div>
                {group.packs.map((pack, k) => (
                  <Fragment key={k}>
                    <Count>{pack.count} ×</Count>
                    <span className="flex min-w-0 items-center gap-1.5 font-medium">
                      <Package className="size-4 shrink-0 text-muted-foreground" />
                      <span className="truncate">{pack.name}</span>
                    </span>
                    <Sizes>
                      <CurveText curve={pack.curve} />
                    </Sizes>
                  </Fragment>
                ))}
                {group.extras.length > 0 && (
                  <>
                    <Count>
                      {group.packs.length > 0 && "+"}
                      {group.extras.reduce((sum, e) => sum + e.quantity, 0)}
                    </Count>
                    <span className="text-muted-foreground">
                      {group.packs.length > 0
                        ? t("extraPairsLabel")
                        : t("pairsLabel")}
                    </span>
                    <Sizes>
                      <CurveText
                        curve={group.extras.map((e) => ({
                          size: e.size,
                          pairs: e.quantity,
                        }))}
                      />
                    </Sizes>
                  </>
                )}
              </Fragment>
            );
          })}
        </div>

        <div className="flex flex-wrap gap-x-8 gap-y-2 rounded-lg bg-muted/60 px-4 py-3">
          <Stat label={t("packsToPickLabel")} value={summary.packsToPick} />
          <Stat label={t("loosePairsLabel")} value={summary.loosePairs} />
        </div>
      </CardContent>
    </Card>
  );
}

function Count({ children }: { children: ReactNode }) {
  return (
    <span
      dir="ltr"
      className="rounded-md bg-muted px-2 py-0.5 text-center font-semibold tabular-nums"
    >
      {children}
    </span>
  );
}

/** On a phone the sizes drop under the name instead of squeezing beside it. */
function Sizes({ children }: { children: ReactNode }) {
  return (
    <span className="col-span-2 col-start-2 text-xs text-muted-foreground sm:col-span-1 sm:col-start-auto">
      <span dir="ltr" className="tabular-nums">
        {children}
      </span>
    </span>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-base font-semibold tabular-nums">{value}</span>
    </div>
  );
}
