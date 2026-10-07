"use client";

import { formatMoney, formatMoneyCompact, type SalesPoint } from "@repo/domain";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@repo/ui/components/chart";
import { cn } from "@repo/ui/lib/utils";
import { useLocale, useTranslations } from "next-intl";
import {
  Area,
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
} from "recharts";

export type { SalesPoint };

export type SalesChartKind = "area" | "bars" | "line";

const SERIES = ["ordered", "collected"] as const;

/**
 * Ordered against collected, side by side. The two are never stacked: they
 * are different questions about the same money, so their sum means nothing.
 * Ordered is blue and collected orange (`--chart-1`, `--chart-3`).
 */
export function SalesChart({
  data,
  kind,
  period,
  height = 250,
}: {
  data: SalesPoint[];
  kind: SalesChartKind;
  period: "day" | "week";
  height?: number;
}) {
  const t = useTranslations("charts");
  const locale = useLocale();
  const isRtl = locale === "he";

  const config = {
    ordered: { label: t("ordered"), color: "var(--chart-1)" },
    collected: { label: t("collected"), color: "var(--chart-3)" },
  } satisfies ChartConfig;

  const shortDate = (value: string) =>
    // "YYYY-MM-DD" alone parses as UTC midnight, the day before west of it
    new Date(`${value}T00:00`).toLocaleDateString(locale, {
      month: "short",
      day: "numeric",
    });
  const periodLabel = (value: string) =>
    period === "week" ? t("weekOf", { date: shortDate(value) }) : shortDate(value);

  const totals = SERIES.map((key) => ({
    key,
    total: data.reduce((sum, p) => sum + p[key], 0),
  }));
  // A grouped bar's first series sits on the reading side: in RTL the bars
  // inside a band still run left to right, so the order flips with the axis.
  const order = isRtl ? [...SERIES].reverse() : SERIES;

  return (
    <div className="flex flex-col gap-2.5">
      <ul className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
        {totals.map(({ key, total }) => (
          <li key={key} className="flex items-center gap-1.5">
            <span
              aria-hidden
              className="size-2.5 rounded-[3px]"
              style={{ background: config[key].color }}
            />
            <span className="text-muted-foreground">{config[key].label}</span>
            <span className="font-semibold tabular-nums">
              {formatMoney(total, locale)}
            </span>
          </li>
        ))}
      </ul>
      {/* The SVG is drawn left to right in both languages (RTL is done by
          reversing the axis). Under the page's RTL its axis labels would
          anchor at their far edge and run into the plot. */}
      <ChartContainer
        config={config}
        className={cn(
          "aspect-auto w-full [&_.recharts-surface]:[direction:ltr]",
          // Hebrew dates read right to left; centered, they stay in place.
          isRtl && "[&_.recharts-xAxis_text]:[direction:rtl]",
        )}
        style={{ height }}
      >
        <ComposedChart
          data={data}
          margin={{ top: 8, left: 0, right: 0, bottom: 0 }}
          barGap={2}
          barCategoryGap="36%"
        >
          <CartesianGrid vertical={false} />
          <XAxis
            dataKey="start"
            // RTL reads right-to-left: the newest period belongs on the left
            reversed={isRtl}
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            minTickGap={24}
            tickFormatter={shortDate}
          />
          <YAxis
            orientation={isRtl ? "right" : "left"}
            tickLine={false}
            axisLine={false}
            width={48}
            tickCount={5}
            tickFormatter={(v: number) => formatMoneyCompact(v, locale)}
          />
          <ChartTooltip
            cursor={
              kind === "bars"
                ? { fill: "var(--hairline)", radius: 6 }
                : { stroke: "var(--muted-foreground)", strokeWidth: 1 }
            }
            content={(props) => (
              <ChartTooltipContent
                active={props.active}
                label={props.label}
                // Ordered first, as in the legend, whatever order the bars are drawn in
                payload={[...(props.payload ?? [])].sort(
                  (a, b) =>
                    SERIES.indexOf(a.dataKey as (typeof SERIES)[number]) -
                    SERIES.indexOf(b.dataKey as (typeof SERIES)[number]),
                )}
                labelFormatter={(value) => periodLabel(String(value))}
                formatter={(value, name) => (
                  <>
                    {/* A custom formatter replaces the row, color mark included. */}
                    <span
                      aria-hidden
                      className="size-2.5 shrink-0 rounded-[2px]"
                      style={{ background: `var(--color-${name})` }}
                    />
                    <span className="text-muted-foreground">
                      {config[name as keyof typeof config]?.label}
                    </span>
                    <span className="ms-auto font-medium tabular-nums">
                      {formatMoney(Number(value), locale)}
                    </span>
                  </>
                )}
                indicator="dot"
              />
            )}
          />
          {kind === "bars" &&
            order.map((key) => (
              <Bar
                key={key}
                dataKey={key}
                fill={`var(--color-${key})`}
                radius={[4, 4, 0, 0]}
                maxBarSize={21}
              />
            ))}
          {kind === "area" &&
            SERIES.map((key) => (
              <Area
                key={key}
                dataKey={key}
                type="linear"
                fill={`var(--color-${key})`}
                fillOpacity={0.18}
                stroke={`var(--color-${key})`}
                strokeWidth={2}
                activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--card)" }}
              />
            ))}
          {kind === "line" &&
            SERIES.map((key) => (
              <Line
                key={key}
                dataKey={key}
                type="linear"
                stroke={`var(--color-${key})`}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--card)" }}
              />
            ))}
        </ComposedChart>
      </ChartContainer>
    </div>
  );
}
