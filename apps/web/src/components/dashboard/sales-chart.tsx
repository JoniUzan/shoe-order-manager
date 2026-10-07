"use client";

import {
  Card,
  CardAction,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/ui/components/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui/components/select";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@repo/ui/components/toggle-group";
import { useTranslations } from "next-intl";
import { useState } from "react";

import {
  SalesChart as Chart,
  type SalesPoint,
} from "@/components/charts/sales-chart";

export type { SalesPoint };

export function SalesChart({ data }: { data: SalesPoint[] }) {
  const t = useTranslations("dashboard");
  const [range, setRange] = useState("90d");

  const days = range === "7d" ? 7 : range === "30d" ? 30 : 90;
  const filtered = data.slice(-days);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("chartTitle")}</CardTitle>
        <CardDescription>{t("chartDesc", { days })}</CardDescription>
        <CardAction>
          <ToggleGroup
            type="single"
            value={range}
            onValueChange={(v) => v && setRange(v)}
            variant="outline"
            className="hidden *:data-[slot=toggle-group-item]:px-3! @[46rem]/card:flex"
          >
            <ToggleGroupItem value="90d">{t("range90")}</ToggleGroupItem>
            <ToggleGroupItem value="30d">{t("range30")}</ToggleGroupItem>
            <ToggleGroupItem value="7d">{t("range7")}</ToggleGroupItem>
          </ToggleGroup>
          <Select value={range} onValueChange={setRange}>
            <SelectTrigger
              size="sm"
              className="w-36 @[46rem]/card:hidden"
              aria-label={t("chartRangeLabel")}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="90d">{t("range90")}</SelectItem>
              <SelectItem value="30d">{t("range30")}</SelectItem>
              <SelectItem value="7d">{t("range7")}</SelectItem>
            </SelectContent>
          </Select>
        </CardAction>
      </CardHeader>
      <div className="px-2 sm:px-6">
        <Chart data={filtered} kind="area" period="day" />
      </div>
    </Card>
  );
}
