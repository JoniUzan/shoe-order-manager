"use client";

import { cn } from "@repo/ui/lib/utils";
import { useLocale, useTranslations } from "next-intl";

/** The four business fields, as the form holding them has them. */
export type BusinessValues = {
  businessName: string;
  businessPhone: string;
  businessAddress: string;
  businessTaxId: string;
};

/**
 * The top of a printed order, drawn as it will come out: always on paper
 * (light), whatever the app's theme. It follows the business details as
 * they're typed — in the welcome dialog and in Settings → Business.
 */
export function OrderHeaderPreview({
  values,
  compact,
  className,
}: {
  values: BusinessValues;
  /** Just the business lines, without the sketch of the order below them. */
  compact: boolean;
  className?: string;
}) {
  const t = useTranslations("businessPreview");
  const locale = useLocale();
  const name = values.businessName.trim();
  const contact = [values.businessPhone, values.businessAddress]
    .map((v) => v.trim())
    .filter(Boolean);
  const today = new Intl.DateTimeFormat(locale === "he" ? "he-IL" : "en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date());

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <span className="text-[13px] text-muted-foreground">{t("label")}</span>
      <div
        aria-hidden
        className={cn(
          "flex flex-col gap-2.5 rounded-[18px] border border-[#091717]/10 bg-[#fbfaf4] text-[#091717] shadow-[0_4px_12px_rgba(0,0,0,.08),0_18px_40px_rgba(0,0,0,.06)]",
          compact ? "px-4.5 py-4" : "px-6.5 py-6",
        )}
      >
        <div className="flex min-w-0 flex-col gap-1">
          <span
            className={cn(
              "truncate font-semibold tracking-tight",
              compact ? "text-[19px]" : "text-2xl",
              !name && "text-[#091717]/30",
            )}
          >
            {name || t("namePlaceholder")}
          </span>
          <span className="truncate text-[13px] text-[#091717]/65">
            {contact.length ? contact.join(" · ") : "—"}
          </span>
          {!compact && values.businessTaxId.trim() && (
            <span className="text-[13px] text-[#091717]/65">
              {t("taxId", { id: values.businessTaxId.trim() })}
            </span>
          )}
        </div>
        {!compact && (
          <>
            <div className="my-1.5 h-px bg-[#091717]/10" />
            <div className="flex justify-between text-sm">
              <span className="font-semibold">{t("order")}</span>
              <span className="text-[#091717]/65 tabular-nums">{today}</span>
            </div>
            <div className="h-2 w-[55%] rounded bg-[#091717]/7" />
            <div className="mt-2 mb-0.5 h-px bg-[#091717]/10" />
            <div className="grid grid-cols-4 gap-2.5">
              {Array.from({ length: 12 }, (_, i) => (
                <div
                  key={i}
                  className={cn(
                    "h-2 rounded",
                    i < 4 ? "bg-[#091717]/12" : "bg-[#091717]/6",
                  )}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
