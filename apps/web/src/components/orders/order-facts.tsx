"use client";

import { formatMoney } from "@repo/domain";
import { useLocale, useTranslations } from "next-intl";

import { ModelThumb } from "@/components/orders/model-thumb";
import { cartonsOf, useBlockText } from "@/components/orders/order-block-row";
import { customerLine, type PickerCustomer } from "@/components/orders/order-customer-picker";
import type { ModelOption } from "@/components/orders/order-form";
import { StepForm } from "@/components/step-form/step-form";
import { blockAgorot, blockPairs, type OrderFormValues } from "@/lib/order-blocks";

/** The order's sums, as the preview, the summary bar and the buttons' row show them. */
export function orderTotals(values: OrderFormValues) {
  const blocks = values.blocks ?? [];
  return {
    models: blocks.length,
    pairs: blocks.reduce((n, b) => n + blockPairs(b), 0),
    cartons: blocks.reduce((n, b) => n + cartonsOf(b), 0),
    agorot: blocks.reduce((n, b) => n + blockAgorot(b), 0),
    notes: [values.notes, values.factoryNote].filter((s) => s?.trim()).length,
  };
}

/**
 * The order as it will read once saved: who it's for, each model with its
 * pairs and total, the counts for Picking, and the total. Inside the Preview
 * on a computer and the Summary bar on a phone.
 */
export function OrderFacts({
  values,
  customer,
  models,
  orderNumber,
}: {
  values: OrderFormValues;
  customer: PickerCustomer | undefined;
  models: ModelOption[];
  orderNumber?: number;
}) {
  const t = useTranslations("orders");
  const locale = useLocale();
  const text = useBlockText(models);
  const totals = orderTotals(values);
  const line = customer ? customerLine(customer) : "";

  return (
    <>
      <p className="-mb-3 text-[0.8125rem] text-muted-foreground">
        {orderNumber ? t("previewEditing", { number: orderNumber }) : t("previewUnsaved")}
      </p>
      <StepForm.PreviewTitle placeholder={t("selectCustomer")} subtitle={line || undefined}>
        {customer?.name}
      </StepForm.PreviewTitle>

      {values.blocks.length > 0 ? (
        <ul className="flex flex-col gap-3.5">
          {values.blocks.map((block, i) => (
            <li key={i} className="flex items-center gap-3">
              <ModelThumb className="size-11 rounded-xl md:size-11" />
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-sm font-medium">{text.name(block)}</span>
                <span className="text-[0.8125rem] text-muted-foreground">
                  {t("pairsCount", { count: blockPairs(block) })}
                </span>
              </div>
              <span className="text-sm tabular-nums">{formatMoney(blockAgorot(block), locale)}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">{t("previewNoItems")}</p>
      )}
      <hr className="border-border" />

      <StepForm.PreviewRows>
        <StepForm.PreviewRow label={t("pairs")}>
          <span className="tabular-nums">{totals.pairs}</span>
        </StepForm.PreviewRow>
        <StepForm.PreviewRow label={t("packsToPickLabel")}>
          <span className="tabular-nums">{totals.cartons}</span>
        </StepForm.PreviewRow>
        <StepForm.PreviewRow label={t("notes")}>
          <span className={totals.notes ? undefined : "text-muted-foreground"}>
            {t("notesCount", { count: totals.notes })}
          </span>
        </StepForm.PreviewRow>
      </StepForm.PreviewRows>

      <div className="flex items-center justify-between gap-4">
        <span className="font-semibold">{t("total")}</span>
        <span className="text-2xl font-semibold tabular-nums">
          {formatMoney(totals.agorot, locale)}
        </span>
      </div>
    </>
  );
}
