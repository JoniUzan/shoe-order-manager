import { GlassCard } from "@repo/ui/components/glass-card";
import { Skeleton } from "@repo/ui/components/skeleton";
import { useTranslations } from "next-intl";

import {
  CardLabel,
  INK,
  Key,
  KeyItem,
  Track,
} from "@/components/dashboard/stat-cards";

import { SkeletonSection } from "./skeleton-section";

/** A number the size of the cards' big figure (32px at 1.1). */
function BigSkeleton({ className }: { className: string }) {
  return <Skeleton className={`h-[35px] ${className}`} />;
}

/** A key line's figure, the height of its xs text. */
function Figure({ className = "w-12" }: { className?: string }) {
  return <Skeleton className={`ms-1 inline-block h-3 align-middle ${className}`} />;
}

/**
 * The dashboard's three cards before their numbers, from the cards' own parts:
 * real labels and keys, an empty track, grey figures.
 */
export function StatCardsSkeleton() {
  const t = useTranslations("dashboard");

  return (
    <SkeletonSection className="grid gap-4 md:grid-cols-3">
      <GlassCard className="flex flex-col gap-3 px-6 py-5">
        <CardLabel>{t("cardBalanceDue")}</CardLabel>
        <BigSkeleton className="w-52" />
        <Track parts={[]} />
        <Key>
          <KeyItem dot="bg-tint-critical-bar" label={t("keyUnpaid")} value={<Figure className="w-20" />} />
          <KeyItem dot="bg-tint-caution-bar" label={t("keyPartial")} value={<Figure className="w-20" />} />
        </Key>
      </GlassCard>

      <GlassCard className="flex flex-col gap-3 px-6 py-5">
        <CardLabel>{t("cardOpenOrders")}</CardLabel>
        <BigSkeleton className="w-14" />
        <Track parts={[]} />
        <Key>
          <KeyItem dot={INK[0]} label={t("ageFresh")} value={<Figure className="w-4" />} />
          <KeyItem dot={INK[1]} label={t("ageAging")} value={<Figure className="w-4" />} />
          <KeyItem dot={INK[2]} label={t("ageOld")} value={<Figure className="w-4" />} />
        </Key>
      </GlassCard>

      <GlassCard className="flex flex-col gap-3 px-6 py-5">
        <CardLabel>{t("cardRecent")}</CardLabel>
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <div className="flex items-center gap-2.5">
            <BigSkeleton className="w-6" />
            <span className="text-muted-foreground">{t("ordersUnit", { count: 2 })}</span>
          </div>
          <Key>
            <KeyItem label={t("keyOrdered")} value={<Figure className="w-14" />} />
            <KeyItem label={t("keyPrevious7")} value={<Figure className="w-4" />} />
          </Key>
        </div>
        <div className="flex h-2.5 gap-1.5" aria-hidden>
          {Array.from({ length: 7 }, (_, i) => (
            <span key={i} className={`flex-1 rounded-full ${INK[0]}`} />
          ))}
        </div>
        <Key>
          <KeyItem dot={INK[0]} label={t("dayNone")} />
          <KeyItem dot={INK[1]} label={t("dayOne")} />
          <KeyItem dot={INK[2]} label={t("dayMany")} />
        </Key>
      </GlassCard>
    </SkeletonSection>
  );
}
