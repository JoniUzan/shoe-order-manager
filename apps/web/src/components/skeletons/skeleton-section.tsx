import { cn } from "@repo/ui/lib/utils";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";

/**
 * The outside of every skeleton (ADR 0012): held back 150ms so a fast
 * response never flashes grey, marked busy, and read out once as "Loading…".
 */
export function SkeletonSection({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  const t = useTranslations("common");
  return (
    <div aria-busy="true" className={cn("skeleton-reveal", className)}>
      <span className="sr-only">{t("loading")}</span>
      {children}
    </div>
  );
}

/**
 * A bar's width for row `i`: the same list for every skeleton, so rows read as
 * text of different lengths and a skeleton never shifts between renders.
 */
export function vary(i: number, widest: number) {
  const SHARE = [0.86, 0.62, 1, 0.7, 0.9, 0.55, 0.78, 0.95, 0.66, 0.82];
  return Math.round(widest * SHARE[i % SHARE.length]!);
}
