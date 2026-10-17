import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui/components/card";
import { Skeleton } from "@repo/ui/components/skeleton";
import { useTranslations } from "next-intl";

import { SkeletonSection } from "./skeleton-section";

/** An order's Payments card before its figures: real labels, grey money. */
export function PaymentsSkeleton() {
  const t = useTranslations("payments");
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
      </CardHeader>
      <CardContent>
        <SkeletonSection className="flex flex-col gap-4">
          <div className="flex flex-col gap-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">{t("total")}</span>
              <Skeleton className="h-3.5 w-20" />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">{t("paid")}</span>
              <Skeleton className="h-3.5 w-16" />
            </div>
            <div className="flex items-center justify-between border-t pt-2 text-base font-semibold">
              <span>{t("remaining")}</span>
              <Skeleton className="h-4 w-20" />
            </div>
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-8 w-28" />
            <Skeleton className="h-8 w-36" />
          </div>
          <div className="flex flex-col gap-2">
            <p className="text-xs font-medium text-muted-foreground">{t("history")}</p>
            {[88, 76, 92].map((w) => (
              <div key={w} className="flex h-9 items-center justify-between">
                <Skeleton className="h-3.5" style={{ width: w }} />
                <Skeleton className="h-3.5 w-16" />
              </div>
            ))}
          </div>
        </SkeletonSection>
      </CardContent>
    </Card>
  );
}

/** A Customer's details card before the Customer is read. */
export function CustomerDetailsSkeleton() {
  const t = useTranslations("customers");
  const labels = [t("contactName"), t("phone"), t("address"), t("notes")];
  return (
    <Card className="lg:col-span-1">
      <CardHeader>
        <CardTitle>{t("details")}</CardTitle>
      </CardHeader>
      <CardContent>
        <SkeletonSection className="flex flex-col gap-3 text-sm">
          {labels.map((label, i) => (
            <div key={label} className="flex flex-col gap-1">
              <span className="text-muted-foreground">{label}</span>
              <Skeleton className="h-3.5" style={{ width: [110, 96, 150, 120][i] }} />
            </div>
          ))}
        </SkeletonSection>
      </CardContent>
    </Card>
  );
}
