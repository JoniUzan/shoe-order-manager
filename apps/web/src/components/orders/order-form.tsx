"use client";

import {
  agorotToShekels,
  formatMoney,
  normalizeSize,
  shekelsToAgorot,
  type OrderInput,
} from "@repo/domain";
import { Button } from "@repo/ui/components/button";
import { Input } from "@repo/ui/components/input";
import { Label } from "@repo/ui/components/label";
import { Textarea } from "@repo/ui/components/textarea";
import { ToggleGroup, ToggleGroupItem } from "@repo/ui/components/toggle-group";
import { cn } from "@repo/ui/lib/utils";
import { useLocale, useTranslations } from "next-intl";
import { Plus, Trash2, X } from "lucide-react";
import { useCallback, useId, useState } from "react";
import {
  useFieldArray,
  useForm,
  type FieldErrors,
  type Resolver,
} from "react-hook-form";
import { toast } from "sonner";

import { Combobox } from "@/components/ui/combobox";
import { useRouter } from "@/i18n/navigation";
import { createOrder, updateOrder } from "@/lib/actions/orders";
import {
  blockAgorot,
  blockPairs,
  EMPTY_BLOCK,
  pairsOf,
  type OrderFormValues,
  type SizeRow,
} from "@/lib/order-blocks";

export type { OrderFormValues } from "@/lib/order-blocks";

export interface CustomerOption {
  id: string;
  name: string;
}
export interface ModelOption {
  id: string;
  name: string;
  defaultPriceAgorot: number | null;
  sizes: string[];
  isActive: boolean;
}

export function OrderForm({
  customers,
  models,
  orderId,
  defaultValues,
}: {
  customers: CustomerOption[];
  models: ModelOption[];
  orderId?: string;
  defaultValues?: OrderFormValues;
}) {
  const t = useTranslations("orders");
  const tc = useTranslations("common");
  const locale = useLocale();
  const router = useRouter();
  const uid = useId();
  const [pending, setPending] = useState(false);

  /**
   * Validation runs as a resolver rather than as `setError` calls inside the
   * submit handler. `handleSubmit` refuses to invoke the handler while
   * `formState.errors` is non-empty, so hand-set errors would wedge the form:
   * the user fixes every field and Save silently does nothing. A resolver is
   * re-run on every attempt, and RHF then re-validates on change so each error
   * clears as its field is corrected.
   */
  const resolver = useCallback<Resolver<OrderFormValues>>(
    (values) => {
      const errors: FieldErrors<OrderFormValues> = {};
      const fail = (path: string, message: string) => {
        const keys = path.split(".");
        let node: Record<string, unknown> = errors as Record<string, unknown>;
        keys.forEach((key, i) => {
          if (i === keys.length - 1) {
            node[key] = { type: "validate", message };
            return;
          }
          node[key] ??= /^\d+$/.test(keys[i + 1]!) ? [] : {};
          node = node[key] as Record<string, unknown>;
        });
      };

      if (!values.customerId) fail("customerId", t("errorNoCustomer"));

      values.blocks.forEach((block, i) => {
        if (block.mode === "catalog" && !block.shoeModelId) {
          fail(`blocks.${i}.shoeModelId`, t("errorNoModel"));
        }
        if (block.mode === "custom" && !block.customDescription.trim()) {
          fail(`blocks.${i}.customDescription`, t("errorNoDescription"));
        }
        block.rows.forEach((row, j) => {
          if (pairsOf(row) > 0 && !normalizeSize(row.size)) {
            fail(`blocks.${i}.rows.${j}.size`, t("errorNoSize"));
          }
          if (Number(row.pairs) < 0) {
            fail(`blocks.${i}.rows.${j}.pairs`, t("errorPairsNegative"));
          }
        });
        if (blockPairs(block) <= 0) {
          fail(`blocks.${i}.rows.root`, t("errorNoPairs"));
        }
      });

      return Object.keys(errors).length === 0
        ? { values, errors: {} }
        : { values: {}, errors };
    },
    [t],
  );

  const form = useForm<OrderFormValues>({
    resolver,
    defaultValues: defaultValues ?? {
      customerId: "",
      notes: "",
      statusCode: "not_done",
      blocks: [{ ...EMPTY_BLOCK, rows: [] }],
    },
  });
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "blocks",
  });

  const blocks = form.watch("blocks") ?? [];
  const customerId = form.watch("customerId");
  const errors = form.formState.errors;

  const orderTotalAgorot = blocks.reduce((sum, b) => sum + blockAgorot(b), 0);
  const orderPairs = blocks.reduce((sum, b) => sum + blockPairs(b), 0);

  const customerOptions = customers.map((c) => ({ value: c.id, label: c.name }));
  // The edit page has to pass deactivated models too, or an order already using
  // one would lose its block. They must not be freshly *pickable* though, so
  // the options exclude them unless this order already references them.
  const referenced = new Set(blocks.map((b) => b.shoeModelId).filter(Boolean));
  const modelOptions = models
    .filter((m) => m.isActive || referenced.has(m.id))
    .map((m) => ({
      value: m.id,
      label: m.name,
      hint:
        m.defaultPriceAgorot != null
          ? formatMoney(m.defaultPriceAgorot, locale)
          : undefined,
    }));

  /**
   * Rewriting the whole rows array is the only way to add or drop a column, so
   * it must start from the *live* values. `blocks` here is a render snapshot,
   * and an event handler can easily run before React has re-rendered after the
   * last keystroke — writing that snapshot back would silently reset pairs the
   * user had already typed, while the uncontrolled inputs kept showing them.
   */
  function currentRows(index: number): SizeRow[] {
    return form.getValues(`blocks.${index}.rows`) ?? [];
  }

  function setRows(index: number, rows: SizeRow[]) {
    form.setValue(`blocks.${index}.rows`, rows, { shouldDirty: true });
    // Errors are keyed by row index and RHF does not shift them on a plain
    // setValue. Removing column 0 would otherwise leave its error pointing at
    // whatever column slid into that slot, painting a correctly-filled box red
    // until the next submit.
    form.clearErrors(`blocks.${index}.rows`);
  }

  function onModelChange(index: number, modelId: string) {
    const model = models.find((m) => m.id === modelId);
    form.setValue(`blocks.${index}.shoeModelId`, modelId, { shouldDirty: true });
    form.clearErrors(`blocks.${index}.shoeModelId`);

    if (
      model?.defaultPriceAgorot != null &&
      !form.getValues(`blocks.${index}.unitPrice`)
    ) {
      form.setValue(
        `blocks.${index}.unitPrice`,
        String(agorotToShekels(model.defaultPriceAgorot)),
      );
    }

    const catalogSizes = model?.sizes ?? [];
    const current = currentRows(index);
    // Nothing typed yet → adopt the new model's run wholesale. Once quantities
    // exist, swapping the model must not throw them away, so only the sizes
    // this model adds get appended.
    if (current.every((row) => pairsOf(row) <= 0)) {
      setRows(index, catalogSizes.map((size) => ({ size, pairs: "" })));
    } else {
      // Compared normalised, so a hand-typed "42.0" is recognised as the
      // catalog's "42" instead of being appended as a second column.
      const seen = new Set(current.map((row) => normalizeSize(row.size)));
      setRows(index, [
        ...current,
        ...catalogSizes
          .filter((size) => !seen.has(size))
          .map((size) => ({ size, pairs: "" })),
      ]);
    }
  }

  function onModeChange(index: number, mode: "catalog" | "custom") {
    form.setValue(`blocks.${index}.mode`, mode, { shouldDirty: true });
    form.clearErrors(`blocks.${index}`);
  }

  function addSize(index: number) {
    setRows(index, [...currentRows(index), { size: "", pairs: "" }]);
  }

  function removeSize(index: number, j: number) {
    setRows(
      index,
      currentRows(index).filter((_, k) => k !== j),
    );
  }

  async function onSubmit(values: OrderFormValues) {
    const input: OrderInput = {
      customerId: values.customerId,
      notes: values.notes,
      statusCode: values.statusCode || "not_done",
      // Sizes left blank or at zero never become line items.
      items: values.blocks.flatMap((block) =>
        block.rows
          .filter((row) => pairsOf(row) > 0 && normalizeSize(row.size))
          .map((row) => ({
            shoeModelId: block.mode === "catalog" ? block.shoeModelId : null,
            customDescription:
              block.mode === "custom" ? block.customDescription.trim() : null,
            // Normalised on the way out, exactly as the catalog path does.
            // Without it an ad-hoc "42.0" column stores alongside a catalog
            // "42" as a separate size, so re-editing the order shows two
            // columns for the same shoe and the invoice reads "EU 42.0".
            size: normalizeSize(row.size),
            color: block.color,
            quantity: pairsOf(row),
            unitPriceAgorot: shekelsToAgorot(Number(block.unitPrice) || 0),
          })),
      ),
    };

    setPending(true);
    const res = orderId
      ? await updateOrder(orderId, input)
      : await createOrder(input);
    if (res.ok) {
      toast.success(orderId ? t("updated") : t("created"));
      router.push(`/orders/${res.id}`);
    } else {
      toast.error(t("errorGeneric"));
      setPending(false);
    }
  }

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit, () =>
        toast.error(t("errorFixFields")),
      )}
      // See the note on the catalog form: a `badInput` residue in any
      // `type=number` box (typing "e" in a price or pairs cell) made
      // checkValidity() false and killed submit with no feedback whatsoever.
      // The resolver owns validation.
      noValidate
      // pb leaves room for the sticky bar so the last block is never trapped
      // underneath it.
      className="flex max-w-4xl flex-col gap-6 pb-28 md:pb-0"
    >
      {/* Customer */}
      <div className="flex max-w-sm flex-col gap-1.5">
        <Label htmlFor={`${uid}-customer`}>{t("customer")}</Label>
        <Combobox
          id={`${uid}-customer`}
          options={customerOptions}
          value={customerId}
          onChange={(v) => {
            form.setValue("customerId", v, { shouldDirty: true });
            form.clearErrors("customerId");
          }}
          placeholder={t("selectCustomer")}
          searchPlaceholder={t("searchCustomer")}
          emptyText={t("noMatches")}
          invalid={!!errors.customerId}
          describedBy={errors.customerId ? `${uid}-customer-error` : undefined}
        />
        {errors.customerId && (
          <p id={`${uid}-customer-error`} className="text-sm text-destructive">
            {errors.customerId.message}
          </p>
        )}
      </div>

      {/* Blocks */}
      <div className="flex flex-col gap-3">
        <Label>{t("items")}</Label>

        {fields.map((field, index) => {
          const block = blocks[index];
          if (!block) return null;
          const blockErrors = errors.blocks?.[index];
          const isCatalog = block.mode === "catalog";

          return (
            <div
              key={field.id}
              className="surface-glass overflow-hidden rounded-card bg-card"
            >
              {/* Block header: what is being ordered, and for how much */}
              <div className="flex flex-wrap items-center gap-2 border-b p-3">
                <ToggleGroup
                  type="single"
                  size="sm"
                  value={block.mode}
                  onValueChange={(v) =>
                    v && onModeChange(index, v as "catalog" | "custom")
                  }
                  aria-label={t("lineType")}
                >
                  <ToggleGroupItem value="catalog" className="h-11 px-3 md:h-8">
                    {t("catalogItem")}
                  </ToggleGroupItem>
                  <ToggleGroupItem value="custom" className="h-11 px-3 md:h-8">
                    {t("customItem")}
                  </ToggleGroupItem>
                </ToggleGroup>

                <div className="min-w-52 flex-1">
                  {isCatalog ? (
                    <Combobox
                      options={modelOptions}
                      value={block.shoeModelId}
                      onChange={(v) => onModelChange(index, v)}
                      placeholder={t("selectModel")}
                      searchPlaceholder={t("searchModel")}
                      emptyText={t("noMatches")}
                      invalid={!!blockErrors?.shoeModelId}
                    />
                  ) : (
                    <Input
                      className="h-11 md:h-9"
                      placeholder={t("customDescription")}
                      aria-invalid={!!blockErrors?.customDescription}
                      {...form.register(`blocks.${index}.customDescription`)}
                    />
                  )}
                </div>

                <Input
                  className="h-11 w-28 md:h-9"
                  placeholder={t("color")}
                  {...form.register(`blocks.${index}.color`)}
                />
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  inputMode="decimal"
                  dir="ltr"
                  className="h-11 w-28 text-end md:h-9"
                  placeholder={t("unitPrice")}
                  {...form.register(`blocks.${index}.unitPrice`)}
                />

                <div className="ms-auto flex items-center gap-3">
                  <span className="text-xs text-muted-foreground">
                    {t("pairsCount", { count: blockPairs(block) })}
                  </span>
                  <span className="font-semibold tabular-nums">
                    {formatMoney(blockAgorot(block), locale)}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    disabled={fields.length === 1}
                    onClick={() => remove(index)}
                    aria-label={tc("delete")}
                    className="size-11 md:size-9"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>

              {/* Size run. Scrolls inside itself so the page never scrolls sideways. */}
              <div className="overflow-x-auto p-3">
                <div className="flex items-start gap-2">
                  <div className="flex shrink-0 flex-col gap-1.5 pe-1 text-xs text-muted-foreground">
                    <span className="flex h-11 items-center md:h-8">
                      {t("size")}
                    </span>
                    <span className="flex h-11 items-center md:h-9">
                      {t("pairs")}
                    </span>
                  </div>

                  {block.rows.map((row, j) => (
                    <div
                      key={j}
                      className="flex shrink-0 flex-col items-center gap-1.5"
                    >
                      <div className="group relative">
                        <Input
                          // Sizes are numeric in every supported format, so an
                          // ad-hoc column cannot be free text either.
                          type="number"
                          step="0.5"
                          min="0"
                          inputMode="decimal"
                          dir="ltr"
                          className="h-11 w-16 px-1 text-center text-xs text-muted-foreground md:h-8"
                          aria-label={t("size")}
                          aria-invalid={!!blockErrors?.rows?.[j]?.size}
                          {...form.register(`blocks.${index}.rows.${j}.size`)}
                        />
                        <button
                          type="button"
                          onClick={() => removeSize(index, j)}
                          aria-label={t("removeSize", { size: row.size })}
                          // Always visible on touch — there is no hover to
                          // reveal it with, and the column is otherwise only
                          // removable by blanking its pairs.
                          className="absolute -end-1.5 -top-1.5 rounded-full border bg-background p-1.5 text-muted-foreground shadow-xs transition-opacity hover:text-foreground md:opacity-0 md:focus-visible:opacity-100 md:group-hover:opacity-100"
                        >
                          <X className="size-3" />
                        </button>
                      </div>
                      <Input
                        type="number"
                        min="0"
                        inputMode="numeric"
                        dir="ltr"
                        className={cn(
                          "h-11 w-16 px-1 text-center font-medium md:h-9",
                          pairsOf(row) > 0 && "border-foreground/25",
                        )}
                        aria-label={t("pairs")}
                        aria-invalid={!!blockErrors?.rows?.[j]?.pairs}
                        {...form.register(`blocks.${index}.rows.${j}.pairs`, {
                          // "no pairs anywhere" lives on the rows array's root,
                          // and RHF only revalidates the field that changed —
                          // so without this the message keeps accusing a block
                          // the user has already filled in. Clearing the array
                          // path drops the root error with it; any real
                          // per-cell error is restored by the next resolver run.
                          onChange: () =>
                            form.clearErrors(`blocks.${index}.rows`),
                        })}
                      />
                    </div>
                  ))}

                  {/* A column of its own rather than a nudged button: the
                      spacer takes the size row's height, which lands the
                      control exactly on the pairs row at every breakpoint. A
                      fixed margin aligned with neither row. */}
                  <div className="flex shrink-0 flex-col items-center gap-1.5">
                    <span aria-hidden className="h-11 md:h-8" />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => addSize(index)}
                      aria-label={t("addSize")}
                      className="size-11 md:size-9"
                    >
                      <Plus className="size-4" />
                    </Button>
                  </div>
                </div>
              </div>

              {(() => {
                // The resolver also writes per-cell errors at rows.j.size /
                // rows.j.pairs. Those only painted a red border before, leaving
                // the user to find the offending box among ten identical 64px
                // cells — so surface the first one here too.
                const cell = (blockErrors?.rows as
                  | Array<{ size?: { message?: string }; pairs?: { message?: string } }>
                  | undefined)
                  ?.flatMap?.((r) => [r?.size?.message, r?.pairs?.message])
                  .find(Boolean);
                const message =
                  blockErrors?.shoeModelId?.message ??
                  blockErrors?.customDescription?.message ??
                  cell ??
                  blockErrors?.rows?.root?.message;
                return message ? (
                  <p className="border-t px-3 py-2 text-sm text-destructive">
                    {message}
                  </p>
                ) : null;
              })()}
            </div>
          );
        })}

        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-11 self-start md:h-8"
          onClick={() => append({ ...EMPTY_BLOCK, rows: [] })}
        >
          <Plus className="size-4" />
          {t("addModel")}
        </Button>
      </div>

      {/* Notes */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${uid}-notes`}>{t("notes")}</Label>
        <Textarea id={`${uid}-notes`} rows={2} {...form.register("notes")} />
      </div>

      {/* Total + actions. Sticky on phones so committing never needs a scroll;
          from md up it sits inline where the page ends. */}
      <div
        className={cn(
          "fixed inset-x-0 bottom-0 z-20 border-t bg-background/85 p-3 backdrop-blur-md",
          "md:static md:mt-0 md:border-0 md:bg-transparent md:p-0 md:backdrop-blur-none",
        )}
      >
        <div className="mx-auto flex max-w-4xl flex-col gap-3">
          <div className="flex items-center justify-between md:border-t md:pt-4">
            <span className="text-sm text-muted-foreground">
              {t("totalWithPairs", { count: orderPairs })}
            </span>
            <span className="text-xl font-bold tabular-nums">
              {formatMoney(orderTotalAgorot, locale)}
            </span>
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={pending} className="h-11 md:h-9">
              {tc("save")}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={() => router.back()}
              className="h-11 md:h-9"
            >
              {tc("cancel")}
            </Button>
          </div>
        </div>
      </div>
    </form>
  );
}
