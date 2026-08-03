"use client";

import { Badge } from "@repo/ui/components/badge";
import { useTranslations } from "next-intl";

const PAYMENT_VARIANT: Record<
  string,
  "secondary" | "warning" | "success"
> = {
  unpaid: "secondary",
  partial: "warning",
  paid: "success",
};

export function PaymentBadge({ status }: { status: string }) {
  const t = useTranslations("payment");
  return (
    <Badge variant={PAYMENT_VARIANT[status] ?? "secondary"}>{t(status)}</Badge>
  );
}

export function OrderStatusBadge({ code }: { code: string }) {
  const t = useTranslations("status");
  return (
    <Badge variant={code === "done" ? "success" : "outline"}>{t(code)}</Badge>
  );
}
