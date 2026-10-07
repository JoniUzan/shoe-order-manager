import { formatMoney } from "@repo/domain";
import { cn } from "@repo/ui/lib/utils";
import { ChevronRight } from "lucide-react";
import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";

import { GlassLink } from "@/components/dashboard/glass-link";
import type { Dashboard } from "@/lib/dashboard-query";

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
  data: Pick<Dashboard, "balanceDue" | "open" | "recent">;
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
            { value: open.fresh, className: "bg-foreground/15" },
            { value: open.aging, className: "bg-foreground/45" },
            { value: open.old, className: "bg-foreground" },
          ]}
        />
        <Key>
          <KeyItem label={t("ageFresh")} value={open.fresh} />
          <KeyItem label={t("ageAging")} value={open.aging} />
          <KeyItem label={t("ageOld")} value={open.old} />
        </Key>
      </StatCard>

      <StatCard index={2} href="/orders?filter=recent" label={t("cardRecent")}>
        <div className="flex items-baseline gap-2.5">
          <Big>{recent.count}</Big>
          <span className="text-muted-foreground">
            {t("ordersUnit", { count: recent.count })}
          </span>
        </div>
        {/* One cell per day, oldest first: in RTL today sits on the left, as
            the newest point does on every chart. */}
        <div className="flex h-2.5 gap-1.5" aria-hidden>
          {recent.perDay.map((n, i) => (
            <span
              key={i}
              className={cn(
                "flex-1 rounded-full",
                n === 0
                  ? "bg-foreground/15"
                  : n === 1
                    ? "bg-foreground/45"
                    : "bg-foreground",
              )}
            />
          ))}
        </div>
        <Key>
          <KeyItem
            label={t("keyOrdered")}
            value={money(recent.orderedAgorot)}
          />
          <KeyItem label={t("keyPrevious7")} value={recent.previousCount} />
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
      <span className="flex items-center justify-between gap-2 text-sm font-medium text-muted-foreground">
        {label}
        <ChevronRight
          aria-hidden
          className="size-4.5 transition-[translate,color] duration-150 ease-(--ease-out-quint) rtl:rotate-180 group-hover:text-foreground pointer-fine:group-hover:translate-x-0.75 rtl:pointer-fine:group-hover:-translate-x-0.75"
        />
      </span>
      {children}
    </GlassLink>
  );
}

function Big({ children }: { children: ReactNode }) {
  return (
    <span className="text-[32px] leading-[1.1] font-semibold tracking-[-0.02em] tabular-nums">
      {children}
    </span>
  );
}

/** A breakdown bar: each part as wide as its share. Empty parts are left out. */
function Track({ parts }: { parts: { value: number; className: string }[] }) {
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

function Key({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-wrap gap-x-3.5 gap-y-1 text-xs text-muted-foreground">
      {children}
    </div>
  );
}

function KeyItem({
  dot,
  label,
  value,
}: {
  dot?: string;
  label: string;
  value: ReactNode;
}) {
  return (
    <span className="flex items-center">
      {dot && (
        <i aria-hidden className={cn("me-1.5 size-2 rounded-[2px]", dot)} />
      )}
      {label}&nbsp;
      <b className="font-semibold text-foreground tabular-nums">{value}</b>
    </span>
  );
}
