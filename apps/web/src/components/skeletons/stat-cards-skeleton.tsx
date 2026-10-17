import { GlassCard } from "@repo/ui/components/glass-card";
import { Skeleton } from "@repo/ui/components/skeleton";
import { useTranslations } from "next-intl";

import { SkeletonSection } from "./skeleton-section";

/** The dashboard's three cards before their numbers: real labels, grey figures. */
export function StatCardsSkeleton() {
  const t = useTranslations("dashboard");
  const cards = [
    { label: t("cardBalanceDue"), big: "w-36" },
    { label: t("cardOpenOrders"), big: "w-14" },
    { label: t("cardRecent"), big: "w-12" },
  ];

  return (
    <SkeletonSection className="grid gap-4 md:grid-cols-3">
      {cards.map((card) => (
        <GlassCard key={card.label} className="flex flex-col gap-3 px-6 py-5">
          <span className="text-sm font-medium text-muted-foreground">{card.label}</span>
          <Skeleton className={`h-[35px] ${card.big}`} />
          <Skeleton className="h-2.5 w-full rounded-full" />
          <div className="flex gap-3.5">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-3 w-14" />
            <Skeleton className="h-3 w-12" />
          </div>
        </GlassCard>
      ))}
    </SkeletonSection>
  );
}
