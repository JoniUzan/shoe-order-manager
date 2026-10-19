import { formatMoney } from "@repo/domain";
import { cn } from "@repo/ui/lib/utils";
import { ChevronRight } from "lucide-react";
import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";

import { GlassLink } from "@/components/dashboard/glass-link";
import type { DashboardStats } from "@/lib/dashboard-query";

/** Ink at three densities: the light-to-dark scale both count cards use. */
export const INK = ["bg-foreground/15", "bg-foreground/45", "bg-foreground"] as const;

/**
 * The dashboard's three cards, each a link to the list it counts: Balance
 * due, open Orders, and new Orders over the last 7 days. Under each number a
 * thin bar breaks it down. Glass, and they materialize once, one after another.
 */
export async function StatCards({
  locale,
  data,
}: {
  locale: string;
  data: DashboardStats;
}) {
  const t = await getTranslations({ locale, namespace: "dashboard" });
  const money = (agorot: number) => formatMoney(agorot, locale);
  const { balanceDue, open, recent } = data;

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <StatCard
        index={0}
        href="/orders?filter=unpaid"
        label={t("cardBalanceDue")}
      >
        <Big>{money(balanceDue.totalAgorot)}</Big>
        <Track
          parts={[
            {
              value: balanceDue.unpaidAgorot,
              className: "bg-tint-critical-bar",
            },
            {
              value: balanceDue.partialAgorot,
              className: "bg-tint-caution-bar",
            },
          ]}
        />
        <Key>
          <KeyItem
            dot="bg-tint-critical-bar"
            label={t("keyUnpaid")}
            value={money(balanceDue.unpaidAgorot)}
          />
          <KeyItem
            dot="bg-tint-caution-bar"
            label={t("keyPartial")}
            value={money(balanceDue.partialAgorot)}
          />
        </Key>
      </StatCard>

      <StatCard
        index={1}
        href="/orders?filter=open"
        label={t("cardOpenOrders")}
      >
        <Big>{open.count}</Big>
        <Track
          parts={[
            { value: open.fresh, className: INK[0] },
            { value: open.aging, className: INK[1] },
            { value: open.old, className: INK[2] },
          ]}
        />
        <Key>
          <KeyItem dot={INK[0]} label={t("ageFresh")} value={open.fresh} />
          <KeyItem dot={INK[1]} label={t("ageAging")} value={open.aging} />
          <KeyItem dot={INK[2]} label={t("ageOld")} value={open.old} />
        </Key>
      </StatCard>

      <StatCard index={2} href="/orders?filter=recent" label={t("cardRecent")}>
        {/* The totals sit beside the number, so this card has one key line
            under its bar, like the other two, and they all stay one height. */}
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <div className="flex items-baseline gap-2.5">
            <Big>{recent.count}</Big>
            <span className="text-muted-foreground">
              {t("ordersUnit", { count: recent.count })}
            </span>
          </div>
          <Key>
            <KeyItem
              label={t("keyOrdered")}
              value={money(recent.orderedAgorot)}
            />
            <KeyItem label={t("keyPrevious7")} value={recent.previousCount} />
          </Key>
        </div>
        {/* One cell per day, oldest first: in RTL today sits on the left, as
            the newest point does on every chart. */}
        <div className="flex h-2.5 gap-1.5" aria-hidden>
          {recent.perDay.map((n, i) => (
            <span
              key={i}
              className={cn("flex-1 rounded-full", INK[Math.min(n, 2)])}
            />
          ))}
        </div>
        {/* What a cell's shade means: orders that day. */}
        <Key>
          <KeyItem dot={INK[0]} label={t("dayNone")} />
          <KeyItem dot={INK[1]} label={t("dayOne")} />
          <KeyItem dot={INK[2]} label={t("dayMany")} />
        </Key>
      </StatCard>
    </div>
  );
}

function StatCard({
  index,
  href,
  label,
  children,
}: {
  index: number;
  href: string;
  label: string;
  children: ReactNode;
}) {
  return (
    <GlassLink
      stagger={index}
      href={href}
      className="group flex flex-col gap-3 px-6 py-5 outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
    >
      <CardLabel>{label}</CardLabel>
      {children}
    </GlassLink>
  );
}

/** A card's name and the chevron that says it opens a list. */
export function CardLabel({ children }: { children: ReactNode }) {
  return (
    <span className="flex items-center justify-between gap-2 text-sm font-medium text-muted-foreground">
      {children}
      <ChevronRight
        aria-hidden
        className="size-4.5 transition-[translate,color] duration-150 ease-(--ease-out-quint) rtl:rotate-180 group-hover:text-foreground pointer-fine:group-hover:translate-x-0.75 rtl:pointer-fine:group-hover:-translate-x-0.75"
      />
    </span>
  );
}

export function Big({ children }: { children: ReactNode }) {
  return (
    <span className="text-[32px] leading-[1.1] font-semibold tracking-[-0.02em] tabular-nums">
      {children}
    </span>
  );
}

/** A breakdown bar: each part as wide as its share. Empty parts are left out. */
export function Track({ parts }: { parts: { value: number; className: string }[] }) {
  return (
    <div className="glass-track" aria-hidden>
      {parts
        .filter((p) => p.value > 0)
        .map((p, i) => (
          <span
            key={i}
            className={p.className}
            style={{ flex: `${p.value} 1 0` }}
          />
        ))}
    </div>
  );
}

export function Key({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-wrap gap-x-3.5 gap-y-1 text-xs text-muted-foreground">
      {children}
    </div>
  );
}

export function KeyItem({
  dot,
  label,
  value,
}: {
  dot?: string;
  label: string;
  value?: ReactNode;
}) {
  return (
    <span className="flex items-center">
      {dot && (
        <i aria-hidden className={cn("me-1.5 size-2 rounded-[2px]", dot)} />
      )}
      {label}
      {value !== undefined && (
        <b className="ms-1 font-semibold text-foreground tabular-nums">{value}</b>
      )}
    </span>
  );
}
