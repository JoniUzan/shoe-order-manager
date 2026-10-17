"use client";

import type { CustomerInput } from "@repo/domain";
import { Skeleton } from "@repo/ui/components/skeleton";
import { cn } from "@repo/ui/lib/utils";
import { useTranslations } from "next-intl";
import { Fragment, type ReactNode } from "react";
import { useForm } from "react-hook-form";

import {
  CatalogDetails,
  EMPTY as EMPTY_MODEL,
  ModelPreview,
  STEPS as MODEL_STEPS,
  type FormValues as ModelFormValues,
} from "@/components/catalog/catalog-form";
import { ProductImageSkeleton } from "@/components/catalog/product-image-field";
import { CustomerFields, EMPTY_CUSTOMER } from "@/components/customers/customer-fields";
import {
  CUSTOMER_ROW,
  CustomerAvatar,
  CustomerSearch,
  NewCustomerRow,
} from "@/components/orders/order-customer-picker";
import { OrderFacts } from "@/components/orders/order-facts";
import { EMPTY as EMPTY_ORDER, STEPS as ORDER_STEPS } from "@/components/orders/order-form";
import { ReviewRow, StatusRow } from "@/components/orders/order-review";
import { StepForm } from "@/components/step-form/step-form";

import { vary } from "./skeleton-section";

/*
 * The forms before their route's data arrives, for the form routes'
 * `loading.tsx`. Each is the real form's own parts (StepForm's Header,
 * Pane, StepHeader, Summary, Preview and Actions, and the steps' own fields)
 * on the step the real form opens on, inert, with the buttons disabled. A new
 * record has no data, so its form is drawn as it opens; a saved one greys
 * every value, and lists (the Customers to pick from) are grey rows.
 */

const noop = () => {};

/** A word of grey inside a line of text: the line keeps its height. */
function Grey({ width, className }: { width: number | string; className?: string }) {
  return (
    <span
      data-slot="skeleton"
      aria-hidden
      className={cn(
        "inline-block h-[0.75em] max-w-full animate-pulse rounded-md bg-skeleton align-middle motion-reduce:animate-none",
        className,
      )}
      style={{ width }}
    />
  );
}

/** A translated line with each number in it grey, like "‌2 models · 22 pairs". */
function greyNumbers(text: string): ReactNode {
  return text.split(/(\d[\d,.]*)/).map((part, i) =>
    i % 2 ? <Grey key={i} width={`${Math.max(part.length, 1) * 0.6}em`} /> : (
      <Fragment key={i}>{part}</Fragment>
    ),
  );
}

/** A new order on its Customer step, an existing one on Review. */
export function OrderFormSkeleton({ editing }: { editing: boolean }) {
  const t = useTranslations("orders");
  const start = editing ? ORDER_STEPS.length - 1 : 0;
  const step = ORDER_STEPS[start]!;

  return (
    <StepForm.Skeleton
      steps={ORDER_STEPS.map((s) => t(`step${s.key}`))}
      editing={editing}
      start={start}
      grey={editing}
    >
      <StepForm.Header title={editing ? t("edit") : t("new")} />
      <StepForm.Pane>
        <StepForm.Step index={start}>
          <StepForm.StepHeader
            illustration={step.illustration}
            title={t(`step${step.key}`)}
            hint={t(`step${step.key}Hint`)}
          />
          {editing ? <OrderReviewSkeleton /> : <CustomerPickerSkeleton />}
        </StepForm.Step>
      </StepForm.Pane>

      {editing && (
        <StepForm.Summary
          label={
            <>
              <Grey width="6.5rem" /> · {greyNumbers(t("pairsCount", { count: 22 }))}
            </>
          }
          value={<Grey width="4.5rem" />}
        >
          {null}
        </StepForm.Summary>
      )}
      <StepForm.Preview label={t("previewLabel")}>
        {editing ? (
          <OrderFactsSkeleton />
        ) : (
          <OrderFacts values={EMPTY_ORDER} customer={undefined} models={[]} />
        )}
      </StepForm.Preview>

      <StepForm.Actions
        saveLabel={t("saveOrder")}
        aside={
          editing
            ? greyNumbers(
                [
                  t("modelsCount", { count: 2 }),
                  t("pairsCount", { count: 22 }),
                  t("cartonsCount", { count: 2 }),
                ].join(" · "),
              )
            : undefined
        }
      />
    </StepForm.Skeleton>
  );
}

/** The Customer step: the search, grey Customers, and "New customer". */
function CustomerPickerSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      <CustomerSearch />
      <div className="flex flex-col gap-1">
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className={CUSTOMER_ROW}>
            <CustomerAvatar>
              <Grey width="0.6em" />
            </CustomerAvatar>
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="font-medium">
                <Grey width={vary(i, 150)} />
              </span>
              <span className="text-[0.8125rem]">
                <Grey width={vary(i + 3, 190)} />
              </span>
            </span>
          </div>
        ))}
        <NewCustomerRow onClick={noop} />
      </div>
    </div>
  );
}

/** The Review step: each part's row with Edit, values grey. */
function OrderReviewSkeleton() {
  const t = useTranslations("orders");
  return (
    <dl className="flex flex-col divide-y divide-border">
      <ReviewRow label={t("customer")} onEdit={noop}>
        <span className="font-semibold">
          <Grey width="8rem" />
        </span>
        <span className="text-[0.8125rem]">
          <Grey width="12rem" />
        </span>
      </ReviewRow>
      <ReviewRow label={t("items")} onEdit={noop}>
        {[0, 1].map((i) => (
          <span key={i} className="flex items-baseline justify-between gap-3 text-sm">
            <Grey width={vary(i, 240)} />
            <Grey width="4rem" />
          </span>
        ))}
      </ReviewRow>
      <ReviewRow label={t("notes")} onEdit={noop}>
        <span className="text-sm">
          <Grey width="9rem" />
        </span>
      </ReviewRow>
      <ReviewRow label={t("factoryNote")} onEdit={noop}>
        <span className="text-sm">
          <Grey width="7rem" />
        </span>
      </ReviewRow>
      <StatusRow value={undefined} onChange={noop} />
    </dl>
  );
}

/** OrderFacts for a saved order, values grey. */
function OrderFactsSkeleton() {
  const t = useTranslations("orders");
  return (
    <>
      <p className="-mb-3 text-[0.8125rem] text-muted-foreground">
        {greyNumbers(t("previewEditing", { number: 12 }))}
      </p>
      <StepForm.PreviewTitle placeholder="" subtitle={<Grey width="11rem" />}>
        <Grey width="8rem" />
      </StepForm.PreviewTitle>
      <ul className="flex flex-col gap-3.5">
        {[0, 1].map((i) => (
          <li key={i} className="flex items-center gap-3">
            <Skeleton className="size-11 shrink-0 rounded-xl" />
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="text-sm font-medium">
                <Grey width={vary(i, 110)} />
              </span>
              <span className="text-[0.8125rem]">
                <Grey width={vary(i + 2, 150)} />
              </span>
            </div>
            <span className="text-sm">
              <Grey width="4rem" />
            </span>
          </li>
        ))}
      </ul>
      <hr className="border-border" />
      <StepForm.PreviewRows>
        {[t("pairs"), t("packsToPickLabel"), t("notes")].map((label) => (
          <StepForm.PreviewRow key={label} label={label}>
            <Grey width="2.5rem" />
          </StepForm.PreviewRow>
        ))}
      </StepForm.PreviewRows>
      <div className="flex items-center justify-between gap-4">
        <span className="font-semibold">{t("total")}</span>
        <span className="text-2xl font-semibold">
          <Grey width="6.5rem" />
        </span>
      </div>
    </>
  );
}

/** A Shoe model on its details step. */
export function CatalogFormSkeleton({ editing }: { editing: boolean }) {
  const t = useTranslations("catalog");
  const tc = useTranslations("common");
  const form = useForm<ModelFormValues>({ defaultValues: EMPTY_MODEL });
  const step = MODEL_STEPS[0];

  return (
    <StepForm.Skeleton
      steps={MODEL_STEPS.map((s) => t(`step${s.key}`))}
      editing={editing}
      grey={editing}
    >
      <StepForm.Header title={editing ? t("edit") : t("new")} />
      <StepForm.Pane>
        <StepForm.Step index={0}>
          <StepForm.StepHeader
            illustration={step.illustration}
            title={t(`step${step.key}`)}
            hint={t(`step${step.key}Hint`)}
          />
          <CatalogDetails
            form={form}
            image={null}
            onImage={noop}
            imageField={editing ? <ProductImageSkeleton /> : undefined}
          />
        </StepForm.Step>
      </StepForm.Pane>
      {editing ? (
        <StepForm.Preview label={t("preview")}>
          <StepForm.PreviewImage>
            <Skeleton className="size-full rounded-none" />
          </StepForm.PreviewImage>
          <StepForm.PreviewTitle placeholder="" subtitle={<Grey width="5rem" />}>
            <Grey width="9rem" />
          </StepForm.PreviewTitle>
          <StepForm.PreviewRows>
            {[t("price"), t("sizes"), t("packs")].map((label, i) => (
              <StepForm.PreviewRow key={label} label={label}>
                <Grey width={vary(i, 72)} />
              </StepForm.PreviewRow>
            ))}
          </StepForm.PreviewRows>
        </StepForm.Preview>
      ) : (
        <ModelPreview values={EMPTY_MODEL} imageUrl={null} />
      )}
      <StepForm.Actions saveLabel={tc("save")} />
    </StepForm.Skeleton>
  );
}

/** A Customer, on one page. */
export function CustomerFormSkeleton({ editing }: { editing: boolean }) {
  const t = useTranslations("customers");
  const form = useForm<CustomerInput>({ defaultValues: EMPTY_CUSTOMER });

  return (
    <StepForm.Skeleton steps={[]} editing={editing} grey={editing}>
      <StepForm.Header title={editing ? t("edit") : t("new")} />
      <StepForm.Pane>
        <StepForm.StepHeader
          illustration="store"
          title={editing ? t("edit") : t("new")}
          hint={editing ? t("editHint") : t("formHint")}
        />
        <CustomerFields form={form} idPrefix="skeleton-" />
      </StepForm.Pane>
      <StepForm.Actions saveLabel={t("saveCustomer")} />
    </StepForm.Skeleton>
  );
}
