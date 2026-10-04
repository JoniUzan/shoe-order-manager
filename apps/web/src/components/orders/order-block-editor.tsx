"use client";

import { curvePairs, expandPack, normalizeSize } from "@repo/domain";
import { Button } from "@repo/ui/components/button";
import { Input } from "@repo/ui/components/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui/components/select";
import { cn } from "@repo/ui/lib/utils";
import { Minus, Package, Plus, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { Controller, type UseFormReturn } from "react-hook-form";

import { CurveText } from "@/components/catalog/curve-text";
import type { ModelOption } from "@/components/orders/order-form";
import { SuggestInput } from "@/components/orders/suggest-input";
import type { OrderBlocks } from "@/components/orders/use-order-blocks";
import { roomy } from "@/components/step-form/roomy";
import { StepForm } from "@/components/step-form/step-form";
import { useAddedItem } from "@/components/step-form/use-added-item";
import { Combobox, type ComboboxOption } from "@/components/ui/combobox";
import {
  activePacks,
  packCountOf,
  pairsOf,
  type BlockForm,
  type OrderFormValues,
} from "@/lib/order-blocks";
import type { ItemSuggestions } from "@/lib/item-suggestions";

/** The Combobox at the editor's size: a 48px field with a 16px corner. */
const PICKER = "h-12 rounded-2xl px-3.5 text-base md:h-12 md:text-base";

/**
 * What a block is: its model from the catalog, or a description for a Custom
 * item. In the editor card's header on a computer, as a field in the sheet.
 */
export function OrderBlockPicker({
  form,
  index,
  block,
  modelOptions,
  blocks,
  id,
  className,
}: {
  form: UseFormReturn<OrderFormValues>;
  index: number;
  block: BlockForm;
  modelOptions: ComboboxOption[];
  blocks: OrderBlocks;
  id?: string;
  className?: string;
}) {
  const t = useTranslations("orders");
  const errors = form.formState.errors.blocks?.[index];

  return block.mode === "catalog" ? (
    <Combobox
      id={id}
      options={modelOptions}
      value={block.shoeModelId}
      onChange={(v) => blocks.chooseModel(index, v)}
      placeholder={t("selectModel")}
      searchPlaceholder={t("searchModel")}
      emptyText={t("noMatches")}
      invalid={!!errors?.shoeModelId}
      className={cn(PICKER, className)}
    />
  ) : (
    <Input
      id={id}
      placeholder={t("customDescription")}
      aria-label={t("customDescription")}
      aria-invalid={!!errors?.customDescription}
      className={cn(roomy.field, className)}
      {...form.register(`blocks.${index}.customDescription`, {
        onChange: () => form.clearErrors(`blocks.${index}.customDescription`),
      })}
    />
  );
}

/** Pairs per size across the whole block: the Packs expanded plus the Loose pairs. */
function totalsBySize(block: BlockForm) {
  const totals = new Map<string, number>();
  for (const pack of activePacks(block)) {
    for (const s of expandPack(pack.curve, Math.max(0, packCountOf(pack))))
      totals.set(s.size, (totals.get(s.size) ?? 0) + s.quantity);
  }
  for (const row of block.rows) {
    const size = normalizeSize(row.size);
    if (size) totals.set(size, (totals.get(size) ?? 0) + Math.max(0, pairsOf(row)));
  }
  return totals;
}

/** The first problem in a block, to say under it in words: a red box among many is hard to find. */
export function blockError(form: UseFormReturn<OrderFormValues>, index: number) {
  const e = form.formState.errors.blocks?.[index];
  if (!e) return undefined;
  const rows = e.rows as
    | Array<{ size?: { message?: string }; pairs?: { message?: string } }>
    | undefined;
  const packs = e.packs as
    | Array<{ sizePackId?: { message?: string }; count?: { message?: string } }>
    | undefined;
  return (
    e.shoeModelId?.message ??
    e.customDescription?.message ??
    packs?.flatMap?.((p) => [p?.sizePackId?.message, p?.count?.message]).find(Boolean) ??
    rows?.flatMap?.((r) => [r?.size?.message, r?.pairs?.message]).find(Boolean) ??
    e.rows?.root?.message
  );
}

/**
 * A block's Packs with their Cartons, its Loose pairs by size, colour and
 * price: everything but the picker.
 */
export function OrderBlockFields({
  form,
  index,
  block,
  models,
  blocks,
  suggestions,
}: {
  form: UseFormReturn<OrderFormValues>;
  index: number;
  block: BlockForm;
  models: ModelOption[];
  blocks: OrderBlocks;
  suggestions: ItemSuggestions;
}) {
  const t = useTranslations("orders");
  const addedPack = useAddedItem();
  const addedSize = useAddedItem();
  const errors = form.formState.errors.blocks?.[index];
  const isCatalog = block.mode === "catalog";
  const catalogPacks = isCatalog ? blocks.modelPacks(block.shoeModelId) : [];
  // An old order can hold a Pack its model no longer offers.
  const showPacks = isCatalog && (catalogPacks.length > 0 || block.packs.length > 0);
  const takenPacks = new Set(block.packs.map((p) => p.sizePackId));
  const catalogSizes = new Set(
    isCatalog ? (models.find((m) => m.id === block.shoeModelId)?.sizes ?? []) : [],
  );
  const hasCartons = activePacks(block).some((p) => packCountOf(p) > 0);
  const totals = hasCartons ? totalsBySize(block) : null;
  const message = blockError(form, index);
  const error = message && (
    <p role="alert" className={cn("text-sm text-destructive", roomy.appear)}>
      {message}
    </p>
  );

  // Its Packs and sizes come from the model: nothing to fill in before it's picked.
  if (isCatalog && !block.shoeModelId) return error || null;

  return (
    <div className="flex flex-col gap-5">
      {showPacks && (
        <section className="flex flex-col gap-2.5">
          <h4 className="font-semibold">{t("packs")}</h4>
          {block.packs.map((pack, k) => {
            const packErrors = errors?.packs?.[k];
            const options = catalogPacks.filter(
              (p) => p.id === pack.sizePackId || !takenPacks.has(p.id),
            );
            const count = Math.max(0, packCountOf(pack));
            return (
              <div
                key={pack.orderPackId ?? `${k}-${pack.sizePackId}`}
                className={cn(
                  // Narrow (the phone's sheet): the Pack and ✕ on top, the
                  // Cartons under them. With room: one row.
                  "grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2.5 rounded-2xl bg-surface p-3",
                  "@lg:grid-cols-[minmax(0,1fr)_auto_auto]",
                  addedPack.className(k),
                )}
              >
                <div className="col-start-1 row-start-1 flex min-w-0 flex-col gap-1">
                  {pack.orderPackId ? (
                    // Already on the order: it keeps the name and curve it was
                    // sold with, so it can't be re-picked. Remove it and add
                    // another to change it.
                    <span className="flex h-12 min-w-0 items-center gap-2 ps-1 font-medium">
                      <Package className="size-4.5 shrink-0 text-muted-foreground" aria-hidden />
                      <span className="truncate">{pack.packName}</span>
                    </span>
                  ) : (
                    <Select
                      value={pack.sizePackId}
                      onValueChange={(v) => blocks.choosePack(index, k, v)}
                    >
                      <SelectTrigger
                        ref={addedPack.focusRef(k)}
                        aria-label={t("pack")}
                        aria-invalid={!!packErrors?.sizePackId}
                        className={cn(roomy.field, "w-full bg-card data-[size=default]:h-12")}
                      >
                        <SelectValue placeholder={t("selectPack")} />
                      </SelectTrigger>
                      <SelectContent>
                        {options.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  <span className="ps-1 text-[0.8125rem] text-muted-foreground">
                    {t("pairsPerCarton", { count: curvePairs(pack.curve) })}
                  </span>
                  {/* Its own line: sizes read left to right, and wrapped
                      inside a Hebrew line they'd come out of order. */}
                  {pack.curve.length > 0 && (
                    <div className="flex ps-1">
                      <span
                        dir="ltr"
                        className="text-[0.8125rem] text-muted-foreground tabular-nums"
                      >
                        <CurveText curve={pack.curve} />
                      </span>
                    </div>
                  )}
                </div>

                <div className="col-span-2 col-start-1 row-start-2 flex items-center gap-3 @lg:col-span-1 @lg:col-start-2 @lg:row-start-1 @lg:flex-col @lg:gap-1">
                  {/* − n + reads left to right; in Hebrew the + comes first, as drawn. */}
                  <div className="flex h-12 items-center rounded-[0.875rem] border border-input bg-card rtl:flex-row-reverse">
                    <button
                      type="button"
                      onClick={() => blocks.stepCartons(index, k, -1)}
                      disabled={count <= 1}
                      aria-label={t("removeCarton")}
                      className={cn(
                        "flex size-11 items-center justify-center rounded-[0.75rem] disabled:opacity-40",
                        roomy.press,
                      )}
                    >
                      <Minus className="size-4.5" aria-hidden />
                    </button>
                    <input
                      type="number"
                      min="1"
                      inputMode="numeric"
                      dir="ltr"
                      aria-label={t("packCount")}
                      aria-invalid={!!packErrors?.count}
                      className={cn(
                        "h-full w-10 bg-transparent text-center text-base font-semibold tabular-nums outline-none",
                        "[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none",
                        "aria-invalid:text-destructive",
                      )}
                      {...form.register(`blocks.${index}.packs.${k}.count`, {
                        onChange: () => form.clearErrors(`blocks.${index}.rows`),
                      })}
                    />
                    <button
                      type="button"
                      onClick={() => blocks.stepCartons(index, k, 1)}
                      aria-label={t("addCarton")}
                      className={cn(
                        "flex size-11 items-center justify-center rounded-[0.75rem]",
                        roomy.press,
                      )}
                    >
                      <Plus className="size-4.5" aria-hidden />
                    </button>
                  </div>
                  <span className="text-[0.8125rem] whitespace-nowrap text-muted-foreground">
                    {t("cartonsPairs", { count: count * curvePairs(pack.curve) })}
                  </span>
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    addedPack.reset();
                    blocks.removePack(index, k);
                  }}
                  aria-label={t("removePack", { name: pack.packName })}
                  className={cn(
                    "col-start-2 row-start-1 size-11 rounded-[0.875rem] @lg:col-start-3",
                    roomy.press,
                  )}
                >
                  <X className="size-4.5" aria-hidden />
                </Button>
              </div>
            );
          })}
          {catalogPacks.some((p) => !takenPacks.has(p.id)) && (
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                addedPack.add(block.packs.length);
                blocks.addPack(index);
              }}
              className={cn("h-10 self-start rounded-xl px-2.5", roomy.press)}
            >
              <Plus className="size-4" aria-hidden />
              {t("addPack")}
            </Button>
          )}
        </section>
      )}

      <section className="flex flex-col gap-2.5">
        <div className="flex items-baseline justify-between gap-3">
          <h4 className="font-semibold">{showPacks ? t("loosePairsLabel") : t("pairs")}</h4>
          {showPacks && (
            <span className="text-[0.8125rem] text-muted-foreground">{t("looseHint")}</span>
          )}
        </div>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(4.25rem,1fr))] gap-2">
          {block.rows.map((row, j) => {
            const size = normalizeSize(row.size);
            // The model's own sizes are fixed; a size added by hand (or any
            // size of a Custom item) is typed, and can be taken out again.
            const fixed = isCatalog && catalogSizes.has(row.size);
            const sizeField = form.register(`blocks.${index}.rows.${j}.size`);
            return (
              <div key={j} className={cn("flex flex-col gap-1", addedSize.className(j))}>
                {fixed ? (
                  <span className="flex h-7 items-center justify-center text-xs text-muted-foreground tabular-nums">
                    {row.size}
                  </span>
                ) : (
                  <div className="group relative">
                    <Input
                      {...sizeField}
                      ref={(el) => {
                        sizeField.ref(el);
                        addedSize.focusRef(j)(el);
                      }}
                      type="number"
                      step="0.5"
                      min="0"
                      inputMode="decimal"
                      dir="ltr"
                      aria-label={t("size")}
                      aria-invalid={!!errors?.rows?.[j]?.size}
                      className="h-7 rounded-lg px-1 text-center text-xs shadow-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        addedSize.reset();
                        blocks.removeSize(index, j);
                      }}
                      aria-label={t("removeSize", { size: row.size })}
                      // Always shown on touch, where there's no hover to reveal it.
                      className="absolute -end-1.5 -top-1.5 rounded-full border bg-background p-1 text-muted-foreground shadow-xs transition-opacity duration-150 ease-[ease] hover:text-foreground md:opacity-0 md:group-focus-within:opacity-100 md:group-hover:opacity-100"
                    >
                      <X className="size-3" aria-hidden />
                    </button>
                  </div>
                )}
                <Input
                  type="number"
                  min="0"
                  inputMode="numeric"
                  dir="ltr"
                  aria-label={t("pairs")}
                  aria-invalid={!!errors?.rows?.[j]?.pairs}
                  placeholder="0"
                  className={cn(
                    roomy.field,
                    "h-11 rounded-xl px-1 text-center font-medium placeholder:font-normal",
                    pairsOf(row) > 0 && "border-foreground/25",
                  )}
                  {...form.register(`blocks.${index}.rows.${j}.pairs`, {
                    // "No pairs anywhere" sits on the rows' root, and RHF only
                    // re-checks the field that changed: drop it as one is typed.
                    onChange: () => form.clearErrors(`blocks.${index}.rows`),
                  })}
                />
                {totals && (
                  <span className="text-center text-xs text-muted-foreground tabular-nums">
                    {t("sizeTotal", { count: totals.get(size) ?? 0 })}
                  </span>
                )}
              </div>
            );
          })}
          <div className="flex flex-col gap-1">
            <span aria-hidden className="h-7" />
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                addedSize.add(block.rows.length);
                blocks.addSize(index);
              }}
              aria-label={t("addSize")}
              className={cn(
                "h-11 rounded-xl border-[1.5px] border-dashed border-foreground/20 bg-transparent shadow-none",
                roomy.press,
              )}
            >
              <Plus className="size-4.5" aria-hidden />
            </Button>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3">
        <TextField form={form} index={index} name="color" label={t("color")} suggestions={suggestions} />
        <StepForm.Field label={t("pricePerPair")} htmlFor={`block-${index}-price`}>
          <Input
            id={`block-${index}-price`}
            type="number"
            min="0"
            step="0.01"
            inputMode="decimal"
            dir="ltr"
            className={cn(roomy.field, "text-start tabular-nums")}
            {...form.register(`blocks.${index}.unitPrice`)}
          />
        </StepForm.Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <TextField form={form} index={index} name="material" label={t("material")} suggestions={suggestions} />
        <TextField form={form} index={index} name="sole" label={t("sole")} suggestions={suggestions} />
      </div>

      {error}
    </div>
  );
}

/** A block's Color, Material or Sole: free text with this User's earlier values offered. */
function TextField({
  form,
  index,
  name,
  label,
  suggestions,
}: {
  form: UseFormReturn<OrderFormValues>;
  index: number;
  name: keyof ItemSuggestions;
  label: string;
  suggestions: ItemSuggestions;
}) {
  const id = `block-${index}-${name}`;
  return (
    <StepForm.Field label={label} htmlFor={id}>
      <Controller
        control={form.control}
        name={`blocks.${index}.${name}`}
        render={({ field }) => (
          <SuggestInput
            id={id}
            name={field.name}
            value={field.value}
            onChange={field.onChange}
            onBlur={field.onBlur}
            suggestions={suggestions[name]}
            maxLength={100}
            className={roomy.field}
          />
        )}
      />
    </StepForm.Field>
  );
}
