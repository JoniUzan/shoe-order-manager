"use client";

import { formatMoney } from "@repo/domain";
import { ToggleGroup, ToggleGroupItem } from "@repo/ui/components/toggle-group";
import { cn } from "@repo/ui/lib/utils";
import { Pencil } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import type { ReactNode } from "react";

import { useBlockText } from "@/components/orders/order-block-row";
import { customerLine, type PickerCustomer } from "@/components/orders/order-customer-picker";
import type { ModelOption } from "@/components/orders/order-form";
import { roomy } from "@/components/step-form/roomy";
import { blockAgorot, type OrderFormValues } from "@/lib/order-blocks";

const STATUSES = ["not_done", "done"] as const;

/**
 * The Review step: each part of the order in a row with "Edit", which opens
 * its step, and the Order status.
 */
export function OrderReview({
  values,
  customer,
  models,
  onEdit,
  onStatus,
}: {
  values: OrderFormValues;
  customer: PickerCustomer | undefined;
  models: ModelOption[];
  /** Opens a step: 0 Customer, 1 Items, 2 Notes. */
  onEdit: (step: 0 | 1 | 2) => void;
  onStatus: (code: string) => void;
}) {
  const t = useTranslations("orders");
  const ts = useTranslations("status");
  const locale = useLocale();
  const text = useBlockText(models);
  const line = customer ? customerLine(customer) : "";

  return (
    <dl className="flex flex-col divide-y divide-border">
      <Row label={t("customer")} onEdit={() => onEdit(0)}>
        {customer ? (
          <>
            <span className="font-semibold">{customer.name}</span>
            {line && <span className="text-[0.8125rem] text-muted-foreground">{line}</span>}
          </>
        ) : (
          <Empty />
        )}
      </Row>
      <Row label={t("items")} onEdit={() => onEdit(1)}>
        {values.blocks.length ? (
          values.blocks.map((block, i) => (
            <span key={i} className="flex items-baseline justify-between gap-3 text-sm">
              <span className="min-w-0">
                <bdi>{text.name(block)}</bdi>{" "}
                <span className="text-muted-foreground">· {text.line(block)}</span>
              </span>
              <span className="shrink-0 tabular-nums">
                {formatMoney(blockAgorot(block), locale)}
              </span>
            </span>
          ))
        ) : (
          <Empty />
        )}
      </Row>
      <Row label={t("notes")} onEdit={() => onEdit(2)}>
        {values.notes.trim() ? (
          <span className="text-sm whitespace-pre-line">{values.notes}</span>
        ) : (
          <Empty />
        )}
      </Row>
      <Row label={t("factoryNote")} onEdit={() => onEdit(2)}>
        {values.factoryNote.trim() ? (
          <>
            <span className="text-sm whitespace-pre-line">{values.factoryNote}</span>
            <span className="text-[0.8125rem] text-muted-foreground">{t("factoryNoteHint")}</span>
          </>
        ) : (
          <Empty />
        )}
      </Row>
      <div className="grid grid-cols-1 gap-2 py-4.5 @xl:grid-cols-[8.75rem_minmax(0,1fr)] @xl:items-center @xl:gap-4">
        <dt className="text-sm text-muted-foreground">{t("status")}</dt>
        <dd>
          <ToggleGroup
            type="single"
            value={values.statusCode}
            onValueChange={(v) => v && onStatus(v)}
            aria-label={t("status")}
            className="rounded-2xl border border-border bg-surface p-1"
          >
            {STATUSES.map((code) => (
              <ToggleGroupItem
                key={code}
                value={code}
                className={cn(
                  "h-10 rounded-xl px-4 text-sm data-[state=on]:bg-card data-[state=on]:font-medium data-[state=on]:shadow-[var(--shadow-raised)]",
                  roomy.press,
                )}
              >
                {ts(code)}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </dd>
      </div>
    </dl>
  );
}

function Row({
  label,
  onEdit,
  children,
}: {
  label: string;
  onEdit: () => void;
  children: ReactNode;
}) {
  const t = useTranslations("orders");
  const tc = useTranslations("common");
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-1.5 py-4.5 @xl:grid-cols-[8.75rem_minmax(0,1fr)_auto] @xl:items-start">
      <dt className="text-sm text-muted-foreground @xl:pt-0.5">{label}</dt>
      <dd className="col-span-2 row-start-2 flex min-w-0 flex-col gap-1.5 @xl:col-span-1 @xl:row-start-auto">
        {children}
      </dd>
      <button
        type="button"
        onClick={onEdit}
        aria-label={t("editSection", { section: label })}
        className={cn(
          "col-start-2 row-start-1 flex items-center gap-1.5 self-start rounded-md text-sm font-medium underline underline-offset-3",
          "outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 @xl:col-start-3",
          roomy.press,
        )}
      >
        <Pencil className="size-3.5" aria-hidden />
        {tc("edit")}
      </button>
    </div>
  );
}

function Empty() {
  const tc = useTranslations("common");
  return <span className="text-sm text-muted-foreground">{tc("none")}</span>;
}
