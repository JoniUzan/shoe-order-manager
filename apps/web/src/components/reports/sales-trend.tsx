"use client";

import type { SalesPoint } from "@repo/domain";
import { ToggleGroup, ToggleGroupItem } from "@repo/ui/components/toggle-group";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { SalesChart, type SalesChartKind } from "@/components/charts/sales-chart";

const KINDS = ["area", "bars", "line"] as const;
/** Weeks shown: 3 months, 2 months, 1 month. */
const RANGES = [13, 8, 4] as const;

/** Ordered vs collected by week, with the chart kind and the range to pick. */
export function SalesTrend({ weeks }: { weeks: SalesPoint[] }) {
  const t = useTranslations("reports");
  const [kind, setKind] = useState<SalesChartKind>("bars");
  const [range, setRange] = useState<number>(13);

  return (
    <section className="surface-raised flex flex-col gap-4 rounded-card bg-card px-5 py-5 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <h2 className="text-[17px] font-semibold">{t("trendTitle")}</h2>
          <p className="text-sm text-muted-foreground">{t("trendByWeek")}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ToggleGroup
            type="single"
            variant="outline"
            size="sm"
            value={kind}
            onValueChange={(v) => v && setKind(v as SalesChartKind)}
            aria-label={t("kindLabel")}
          >
            {KINDS.map((k) => (
              <ToggleGroupItem key={k} value={k} className="px-3">
                {t(`kind_${k}`)}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
          <ToggleGroup
            type="single"
            variant="outline"
            size="sm"
            value={String(range)}
            onValueChange={(v) => v && setRange(Number(v))}
            aria-label={t("rangeLabel")}
          >
            {RANGES.map((r) => (
              <ToggleGroupItem key={r} value={String(r)} className="px-3">
                {t(`range_${r}`)}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>
      </div>
      <SalesChart data={weeks.slice(-range)} kind={kind} period="week" height={300} />
    </section>
  );
}
