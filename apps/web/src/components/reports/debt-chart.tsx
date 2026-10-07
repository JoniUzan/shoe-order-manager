"use client";

import { formatMoney, formatMoneyCompact, type DebtPoint } from "@repo/domain";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@repo/ui/components/chart";
import { cn } from "@repo/ui/lib/utils";
import { useLocale, useTranslations } from "next-intl";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";

/** The Balance due at each week's end, in purple (`--chart-4`). */
export function DebtChart({ data }: { data: DebtPoint[] }) {
  const t = useTranslations("reports");
  const tc = useTranslations("charts");
  const locale = useLocale();
  const isRtl = locale === "he";
  const config = {
    debt: { label: t("debtSeries"), color: "var(--chart-4)" },
  } satisfies ChartConfig;

  const shortDate = (value: string) =>
    new Date(`${value}T00:00`).toLocaleDateString(locale, {
      month: "short",
      day: "numeric",
    });
  const now = data.at(-1)?.debt ?? 0;
  const change = now - (data[0]?.debt ?? 0);
  const signed = `${change > 0 ? "+" : change < 0 ? "−" : ""}${formatMoney(Math.abs(change), locale)}`;

  return (
    <section className="surface-raised flex flex-col gap-3 rounded-card bg-card px-5 py-5 sm:px-6">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <h2 className="text-[17px] font-semibold">{t("debtTitle")}</h2>
          <p className="text-sm text-muted-foreground">{t("debtDesc")}</p>
        </div>
        <div className="flex items-baseline gap-2.5">
          <span className="text-[22px] font-semibold tabular-nums">
            {formatMoney(now, locale)}
          </span>
          <span className="text-sm text-muted-foreground tabular-nums">
            {t("debtChange", { amount: signed })}
          </span>
        </div>
      </div>
      {/* Drawn left to right, as SalesChart is, so RTL labels stay off the plot. */}
      <ChartContainer
        config={config}
        className={cn(
          "aspect-auto h-[200px] w-full [&_.recharts-surface]:[direction:ltr]",
          // Hebrew dates read right to left; centered, they stay in place.
          isRtl && "[&_.recharts-xAxis_text]:[direction:rtl]",
        )}
      >
        <AreaChart data={data} margin={{ top: 8, left: 0, right: 0, bottom: 0 }}>
          <CartesianGrid vertical={false} />
          <XAxis
            dataKey="start"
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
            tickCount={4}
            tickFormatter={(v: number) => formatMoneyCompact(v, locale)}
          />
          <ChartTooltip
            cursor={{ stroke: "var(--muted-foreground)", strokeWidth: 1 }}
            content={
              <ChartTooltipContent
                labelFormatter={(value) => tc("weekOf", { date: shortDate(String(value)) })}
                formatter={(value) => (
                  <>
                    <span
                      aria-hidden
                      className="size-2.5 shrink-0 rounded-[2px] bg-(--color-debt)"
                    />
                    <span className="text-muted-foreground">{config.debt.label}</span>
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
            dataKey="debt"
            type="linear"
            fill="var(--color-debt)"
            fillOpacity={0.18}
            stroke="var(--color-debt)"
            strokeWidth={2}
            activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--card)" }}
          />
        </AreaChart>
      </ChartContainer>
    </section>
  );
}
