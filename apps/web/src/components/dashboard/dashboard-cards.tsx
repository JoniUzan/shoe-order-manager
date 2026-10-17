import { GlassCard } from "@repo/ui/components/glass-card";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";

import { Link } from "@/i18n/navigation";

/**
 * The dashboard's two glass cards, frame and title only. The page puts the
 * chart or the list inside (streamed, ADR 0012); `loading.tsx` puts their
 * skeletons in the same frames.
 */

export function ChartCard({ children }: { children: ReactNode }) {
  const t = useTranslations("dashboard");
  return (
    <GlassCard className="flex min-w-0 flex-col gap-3 px-5 pt-5 pb-4 sm:px-6">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <div className="flex flex-col gap-0.5">
          <h2 className="text-[17px] font-semibold">{t("chartTitle")}</h2>
          <p className="text-sm text-muted-foreground">{t("chartDesc")}</p>
        </div>
        <Link
          href="/reports?tab=sales"
          className="text-sm font-medium text-primary hover:underline"
        >
          {t("chartFull")}
        </Link>
      </div>
      {children}
    </GlassCard>
  );
}

export function OwedCard({ children }: { children: ReactNode }) {
  const t = useTranslations("dashboard");
  return (
    <GlassCard className="flex flex-col px-5 pt-5 pb-3 sm:px-6">
      <div className="flex items-baseline justify-between gap-3 pb-2">
        <h2 className="text-[17px] font-semibold">{t("owedTitle")}</h2>
        <Link href="/reports" className="text-sm text-muted-foreground hover:text-foreground">
          {t("owedAll")}
        </Link>
      </div>
      {children}
    </GlassCard>
  );
}

/** The heading over the dashboard's orders table. */
export function OrdersSectionTitle() {
  const t = useTranslations("nav");
  return <h2 className="text-lg font-semibold">{t("orders")}</h2>;
}
