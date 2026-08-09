"use client";

import { formatMoney } from "@repo/domain";
import {
  Card,
  CardAction,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/ui/components/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@repo/ui/components/chart";
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
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts";

export type SalesPoint = {
  /** ISO day, e.g. "2026-08-08" */
  date: string;
  /** agorot ordered that day */
  ordered: number;
  /** agorot collected that day */
  collected: number;
};

export function SalesChart({ data }: { data: SalesPoint[] }) {
  const t = useTranslations("dashboard");
  const locale = useLocale();
  const isRtl = locale === "he";
  const [range, setRange] = useState("90d");

  const chartConfig = {
    ordered: { label: t("seriesOrdered"), color: "var(--chart-1)" },
    collected: { label: t("seriesCollected"), color: "var(--chart-3)" },
  } satisfies ChartConfig;

  const days = range === "7d" ? 7 : range === "30d" ? 30 : 90;
  const filtered = data.slice(-days);

  const shortDate = (value: string) =>
    new Date(value).toLocaleDateString(locale, {
      month: "short",
      day: "numeric",
    });

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
      <div className="px-2 pt-4 sm:px-6 sm:pt-6">
        <ChartContainer config={chartConfig} className="aspect-auto h-[250px] w-full">
          <AreaChart data={filtered}>
            <defs>
              <linearGradient id="fillOrdered" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-ordered)" stopOpacity={0.85} />
                <stop offset="95%" stopColor="var(--color-ordered)" stopOpacity={0.06} />
              </linearGradient>
              <linearGradient id="fillCollected" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-collected)" stopOpacity={0.7} />
                <stop offset="95%" stopColor="var(--color-collected)" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date"
              // RTL reads right-to-left: the newest day belongs on the left
              reversed={isRtl}
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={32}
              tickFormatter={shortDate}
            />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  labelFormatter={(value) => shortDate(String(value))}
                  formatter={(value, name) => (
                    <>
                      <span className="text-muted-foreground">
                        {chartConfig[name as keyof typeof chartConfig]?.label}
                      </span>
                      <span className="ms-auto font-medium tabular-nums">
                        {formatMoney(Number(value), locale)}
                      </span>
                    </>
                  )}
                  indicator="dot"
                />
              }
            />
            <Area
              dataKey="collected"
              type="natural"
              fill="url(#fillCollected)"
              stroke="var(--color-collected)"
              stackId="a"
            />
            <Area
              dataKey="ordered"
              type="natural"
              fill="url(#fillOrdered)"
              stroke="var(--color-ordered)"
              stackId="a"
            />
          </AreaChart>
        </ChartContainer>
      </div>
    </Card>
  );
}
