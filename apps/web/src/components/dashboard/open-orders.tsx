import { formatMoney } from "@repo/domain";
import { Card } from "@repo/ui/components/card";
import { getTranslations } from "next-intl/server";

import { PaymentBadge } from "@/components/orders/badges";
import { Link } from "@/i18n/navigation";
import type { OpenOrderRow } from "@/lib/dashboard-query";

/**
 * The open Orders, oldest first: what still has to go out. A solid card, not
 * glass: it's a working list. A table on a computer, two-line rows on a phone.
 */
export async function OpenOrders({
  locale,
  rows,
  total,
}: {
  locale: string;
  rows: OpenOrderRow[];
  total: number;
}) {
  const t = await getTranslations({ locale, namespace: "dashboard" });
  const opened = (iso: string) =>
    new Date(iso).toLocaleDateString(locale, { day: "numeric", month: "numeric" });
  const cols = "md:grid-cols-[4.5rem_minmax(0,1.6fr)_5rem_6rem_8rem_7rem]";

  return (
    <Card className="gap-0 overflow-hidden py-0">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 px-5 pt-4.5 pb-2 sm:px-6">
        <h2 className="text-[17px] font-semibold">
          {t("openTitle")}{" "}
          <span className="font-normal text-muted-foreground">· {t("openOldestFirst")}</span>
        </h2>
        {total > 0 && (
          <Link
            href="/orders?filter=open"
            className="text-sm font-medium text-primary hover:underline"
          >
            {t("openAll", { count: total })}
          </Link>
        )}
      </div>

      {rows.length === 0 ? (
        <p className="px-6 pt-4 pb-8 text-center text-sm text-muted-foreground">
          {t("openEmpty")}
        </p>
      ) : (
        <>
          <div
            aria-hidden
            className={`hidden h-10 items-center gap-3 px-6 text-xs text-muted-foreground md:grid ${cols}`}
          >
            <span>{t("colOrder")}</span>
            <span>{t("colCustomer")}</span>
            <span>{t("colOpened")}</span>
            <span>{t("colOpenFor")}</span>
            <span>{t("colPayment")}</span>
            <span>{t("colTotal")}</span>
          </div>
          <ul className="pb-1">
            {rows.map((r) => (
              <li key={r.id} className="border-t">
                <Link
                  href={`/orders/${r.id}`}
                  aria-label={t("openRowLabel", { number: r.orderNumber, customer: r.customerName })}
                  className={`grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 px-5 py-3 transition-colors duration-150 hover:bg-muted sm:px-6 md:h-13 md:py-0 ${cols}`}
                >
                  <span className="hidden font-semibold tabular-nums md:block">#{r.orderNumber}</span>
                  <span className="truncate font-semibold md:font-normal">{r.customerName}</span>
                  <span className="hidden text-muted-foreground tabular-nums md:block">
                    {opened(r.createdAt)}
                  </span>
                  <span className="hidden tabular-nums md:block">
                    {t("daysOpen", { count: r.daysOpen })}
                  </span>
                  {/* On a phone: total beside the name, then number · age and the badge. */}
                  <span className="text-end font-semibold tabular-nums md:order-last md:text-start">
                    {formatMoney(r.totalAgorot, locale)}
                  </span>
                  <span className="text-sm text-muted-foreground tabular-nums md:hidden">
                    #{r.orderNumber} · {t("openFor", { days: t("daysOpen", { count: r.daysOpen }) })}
                  </span>
                  <span className="justify-self-end md:justify-self-start">
                    <PaymentBadge status={r.paymentStatus} />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </Card>
  );
}
