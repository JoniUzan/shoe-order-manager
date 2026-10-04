"use client";

import {
  formatMoney,
  MAX_LINE_PAIRS,
  MAX_PACK_COUNT,
  normalizeSize,
  shekelsToAgorot,
  type Curve,
  type OrderInput,
} from "@repo/domain";
import { Button } from "@repo/ui/components/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@repo/ui/components/drawer";
import { Textarea } from "@repo/ui/components/textarea";
import { useIsMobile } from "@repo/ui/hooks/use-mobile";
import { cn } from "@repo/ui/lib/utils";
import { Plus, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import {
  useCallback,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  useFieldArray,
  useForm,
  useWatch,
  type FieldErrors,
  type Resolver,
} from "react-hook-form";
import { toast } from "sonner";

import { ModelThumb } from "@/components/orders/model-thumb";
import {
  blockError,
  OrderBlockFields,
  OrderBlockPicker,
} from "@/components/orders/order-block-editor";
import {
  OrderBlockRow,
  useBlockText,
} from "@/components/orders/order-block-row";
import { OrderCustomerPicker } from "@/components/orders/order-customer-picker";
import { OrderFacts, orderTotals } from "@/components/orders/order-facts";
import { OrderReview } from "@/components/orders/order-review";
import { useOrderBlocks } from "@/components/orders/use-order-blocks";
import { roomy } from "@/components/step-form/roomy";
import { StepForm, useStepForm } from "@/components/step-form/step-form";
import { useAddedItem } from "@/components/step-form/use-added-item";
import type { IllustrationName } from "@/components/ui/illustration";
import { useRouter } from "@/i18n/navigation";
import { createOrder, updateOrder } from "@/lib/actions/orders";
import {
  activePacks,
  blockAgorot,
  blockPairs,
  EMPTY_BLOCK,
  packCountOf,
  pairsOf,
  type BlockForm,
  type OrderFormValues,
} from "@/lib/order-blocks";
import type { ItemSuggestions } from "@/lib/item-suggestions";

export type { OrderFormValues } from "@/lib/order-blocks";

export interface CustomerOption {
  id: string;
  name: string;
  phone: string | null;
  address: string | null;
}
export interface ModelOption {
  id: string;
  name: string;
  defaultPriceAgorot: number | null;
  sizes: string[];
  isActive: boolean;
  /** The Product image's URL, when the model has one. */
  imageUrl: string | null;
  /** The model's packs, in catalog order. */
  packs: { id: string; name: string; curve: Curve }[];
}

const STEPS = [
  { key: "Customer", illustration: "store" },
  { key: "Items", illustration: "shoe-box" },
  { key: "Notes", illustration: "checklist" },
  { key: "Review", illustration: "checklist" },
] as const satisfies readonly { key: string; illustration: IllustrationName }[];
const ITEMS = 1;
const LAST = STEPS.length - 1;

const EMPTY: OrderFormValues = {
  customerId: "",
  notes: "",
  factoryNote: "",
  statusCode: "not_done",
  blocks: [],
};

/** A block nothing has been entered in yet: closing it drops it. */
function isBlank(block: BlockForm) {
  return (
    !block.shoeModelId &&
    !block.customDescription.trim() &&
    !block.color.trim() &&
    !block.material.trim() &&
    !block.sole.trim() &&
    block.packs.length === 0 &&
    blockPairs(block) === 0
  );
}

const pickerId = (index: number) => `block-${index}-picker`;

/**
 * An Order in four steps: Customer, Items, Notes, Review. A new order walks
 * them in order; an existing one opens on Review and saves from any step.
 * Items are entered per model (a block); see `lib/order-blocks.ts`.
 */
export function OrderForm({
  customers,
  models,
  orderId,
  orderNumber,
  defaultValues,
  suggestions,
}: {
  customers: CustomerOption[];
  models: ModelOption[];
  /** Earlier values for a block's Color, Material and Sole. */
  suggestions: ItemSuggestions;
  orderId?: string;
  orderNumber?: number;
  defaultValues?: OrderFormValues;
}) {
  const t = useTranslations("orders");
  const tc = useTranslations("common");
  const locale = useLocale();
  const router = useRouter();
  const editing = orderId !== undefined;
  const isPhone = useIsMobile();
  const [pending, setPending] = useState(false);
  // Customers added from the Customer step's sheet, newest first.
  const [added, setAdded] = useState<CustomerOption[]>([]);
  const allCustomers = [...added, ...customers];

  /**
   * Validation runs as a resolver, not as `setError` calls in the submit
   * handler: `handleSubmit` won't run the handler while hand-set errors
   * remain, so fixing every field would leave Save doing nothing. A resolver
   * runs again on every attempt.
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
      // On the array itself: trigger("blocks") files it under blocks.root,
      // a whole-form check leaves it on blocks (see itemsError below).
      if (values.blocks.length === 0) fail("blocks", t("errorNoItems"));

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
          if (pairsOf(row) > MAX_LINE_PAIRS) {
            fail(
              `blocks.${i}.rows.${j}.pairs`,
              t("errorPairsTooMany", { max: MAX_LINE_PAIRS }),
            );
          }
        });
        activePacks(block).forEach((pack, k) => {
          if (!pack.orderPackId && !pack.sizePackId) {
            fail(`blocks.${i}.packs.${k}.sizePackId`, t("errorNoPack"));
          }
          const count = Number(pack.count);
          if (!Number.isInteger(count) || count < 1 || count > MAX_PACK_COUNT) {
            fail(
              `blocks.${i}.packs.${k}.count`,
              t("errorPackCount", { max: MAX_PACK_COUNT }),
            );
          } else if (pack.curve.some((c) => c.pairs * count > MAX_LINE_PAIRS)) {
            // Each size of a pack is still one order line, with the same cap.
            fail(
              `blocks.${i}.packs.${k}.count`,
              t("errorPairsTooMany", { max: MAX_LINE_PAIRS }),
            );
          }
        });
        if (blockPairs(block) <= 0) {
          fail(
            `blocks.${i}.rows.root`,
            activePacks(block).length > 0 ||
              !!models.find((m) => m.id === block.shoeModelId)?.packs.length
              ? t("errorNoPairsOrPacks")
              : t("errorNoPairs"),
          );
        }
      });

      return Object.keys(errors).length === 0
        ? { values, errors: {} }
        : { values: {}, errors };
    },
    [t, models],
  );

  const form = useForm<OrderFormValues>({
    resolver,
    defaultValues: defaultValues ?? EMPTY,
  });
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "blocks",
  });
  const values = useWatch({ control: form.control }) as OrderFormValues;
  const blocks = useOrderBlocks(form, models);
  const text = useBlockText(models);
  const errors = form.formState.errors;

  // The block being edited: inline on a computer, in a bottom sheet on a phone.
  const [open, setOpen] = useState<number | null>(null);
  const addedBlock = useAddedItem();
  // A block just added on a computer takes the focus in its picker. The
  // Combobox doesn't take a ref, so it's found by id once the card renders.
  const focusPicker = useRef(false);
  const focusOnMount = (el: HTMLElement | null, index: number) => {
    if (!el || !focusPicker.current) return;
    focusPicker.current = false;
    el.querySelector<HTMLElement>(`#${pickerId(index)}`)?.focus();
  };

  /** Drops block `i` if nothing was entered in it. Returns whether it did. */
  function dropIfBlank(i: number | null) {
    if (i === null) return false;
    const block = form.getValues(`blocks.${i}`);
    if (!block || !isBlank(block)) return false;
    remove(i);
    addedBlock.reset();
    return true;
  }

  // A block eases in once, when added: not again as it folds or reopens.
  function openBlock(i: number) {
    if (open === i) return;
    const dropped = dropIfBlank(open);
    addedBlock.reset();
    setOpen(dropped && open! < i ? i - 1 : i);
  }

  function closeBlock() {
    dropIfBlank(open);
    addedBlock.reset();
    setOpen(null);
  }

  function addBlock(mode: BlockForm["mode"]) {
    const at = fields.length - (dropIfBlank(open) ? 1 : 0);
    append(
      { ...EMPTY_BLOCK, mode, packs: [], rows: [] },
      { shouldFocus: false },
    );
    // "Add at least one" no longer applies.
    if (at === 0) form.clearErrors("blocks");
    addedBlock.add(at);
    focusPicker.current = true;
    setOpen(at);
  }

  function removeBlock(i: number) {
    remove(i);
    addedBlock.reset();
    setOpen(null);
  }

  /** After a failed check, open the first block with a problem (a phone shows it on the row). */
  function showBlockErrors() {
    const list = form.formState.errors.blocks;
    const i = Array.isArray(list) ? list.findIndex(Boolean) : -1;
    if (i >= 0 && !isPhone) setOpen(i);
  }

  const flow = useStepForm({
    editing,
    start: editing ? LAST : 0,
    steps: STEPS.map((s) => ({
      label: t(`step${s.key}`),
      canLeave:
        s.key === "Customer"
          ? () => form.trigger("customerId")
          : s.key === "Items"
            ? async () => {
                if (dropIfBlank(open)) setOpen(null);
                const ok = await form.trigger("blocks");
                if (ok) setOpen(null);
                else showBlockErrors();
                return ok;
              }
            : undefined,
    })),
  });

  // Nor when its step opens again: the blocks remount with the step.
  const [stepShown, setStepShown] = useState(flow.current);
  if (stepShown !== flow.current) {
    setStepShown(flow.current);
    addedBlock.reset();
  }

  async function save(values: OrderFormValues) {
    const input: OrderInput = {
      customerId: values.customerId,
      notes: values.notes,
      factoryNote: values.factoryNote,
      statusCode: values.statusCode || "not_done",
      // Loose pairs only. Sizes left blank or at zero never become line items.
      items: values.blocks.flatMap((block) =>
        block.rows
          .filter((row) => pairsOf(row) > 0 && normalizeSize(row.size))
          .map((row) => ({
            shoeModelId: block.mode === "catalog" ? block.shoeModelId : null,
            customDescription:
              block.mode === "custom" ? block.customDescription.trim() : null,
            // Normalised, as the catalog does: a typed "42.0" would otherwise
            // store beside the catalog's "42" as a second size.
            size: normalizeSize(row.size),
            color: block.color,
            material: block.material,
            sole: block.sole,
            quantity: pairsOf(row),
            unitPriceAgorot: shekelsToAgorot(Number(block.unitPrice) || 0),
          })),
      ),
      // Only which pack and how many: the server expands each pack from its
      // stored curve, so the per-size pairs are never taken from here.
      packs: values.blocks.flatMap((block) =>
        activePacks(block).map((pack) => ({
          orderPackId: pack.orderPackId,
          sizePackId: pack.sizePackId || undefined,
          shoeModelId: block.shoeModelId,
          color: block.color,
          material: block.material,
          sole: block.sole,
          unitPriceAgorot: shekelsToAgorot(Number(block.unitPrice) || 0),
          count: packCountOf(pack),
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
      toast.error(
        res.error === "total_too_large"
          ? t("errorTotalTooLarge")
          : t("errorGeneric"),
      );
      setPending(false);
    }
  }

  function onInvalid(errors: FieldErrors<OrderFormValues>) {
    toast.error(t("errorFixFields"));
    if (errors.customerId) {
      flow.goTo(0);
    } else if (errors.blocks) {
      flow.goTo(ITEMS);
      showBlockErrors();
    }
  }

  const itemsError = errors.blocks?.root?.message ?? errors.blocks?.message;
  const customer = allCustomers.find((c) => c.id === values.customerId);
  const totals = orderTotals(values);
  const openBlockValues = open !== null ? values.blocks[open] : undefined;
  const modelOptions = (() => {
    // An existing order may use a model since deactivated: it stays on the
    // order but isn't offered for new blocks.
    const used = new Set(
      values.blocks.map((b) => b.shoeModelId).filter(Boolean),
    );
    return models
      .filter((m) => m.isActive || used.has(m.id))
      .map((m) => ({
        value: m.id,
        label: m.name,
        hint:
          m.defaultPriceAgorot != null
            ? formatMoney(m.defaultPriceAgorot, locale)
            : undefined,
      }));
  })();

  return (
    <StepForm
      flow={flow}
      onSave={(e) => void form.handleSubmit(save, onInvalid)(e)}
      cancelHref={orderId ? `/orders/${orderId}` : "/orders"}
      dirty={form.formState.isDirty}
      pending={pending}
    >
      <StepForm.Header title={editing ? t("edit") : t("new")} />

      <StepForm.Pane>
        {STEPS.map((s, i) => (
          <StepForm.Step key={s.key} index={i}>
            <StepForm.StepHeader
              illustration={s.illustration}
              title={t(`step${s.key}`)}
              hint={t(`step${s.key}Hint`)}
            />

            {s.key === "Customer" && (
              <OrderCustomerPicker
                customers={allCustomers}
                value={values.customerId}
                onChange={(id) => {
                  form.setValue("customerId", id, { shouldDirty: true });
                  form.clearErrors("customerId");
                }}
                onCreate={(c) => setAdded((list) => [c, ...list])}
                error={errors.customerId?.message}
              />
            )}

            {s.key === "Items" && (
              <div className="flex flex-col gap-3">
                {fields.map((field, i) => {
                  const block = values.blocks[i];
                  if (!block) return null;
                  if (open === i && !isPhone) {
                    return (
                      <div
                        key={field.id}
                        ref={(el) => focusOnMount(el, i)}
                        className={cn(
                          "flex flex-col gap-5 rounded-[1.25rem] bg-card p-4 shadow-[var(--shadow-card)] ring-2 ring-foreground @xl:p-5",
                          addedBlock.className(i),
                        )}
                      >
                        <div className="flex items-center gap-3.5">
                          <ModelThumb src={text.image(block)} className="hidden @xl:flex" />
                          <OrderBlockPicker
                            id={pickerId(i)}
                            form={form}
                            index={i}
                            block={block}
                            modelOptions={modelOptions}
                            blocks={blocks}
                            className="min-w-0 flex-1"
                          />
                          <div className="hidden flex-col items-end @xl:flex">
                            <span className="font-semibold tabular-nums">
                              {formatMoney(blockAgorot(block), locale)}
                            </span>
                            <span className="text-[0.8125rem] text-muted-foreground">
                              {t("pairsCount", { count: blockPairs(block) })}
                            </span>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeBlock(i)}
                            aria-label={t("removeModelNamed", {
                              name: text.name(block),
                            })}
                            className={cn(
                              "size-11 rounded-[0.875rem]",
                              roomy.press,
                            )}
                          >
                            <X className="size-4.5" aria-hidden />
                          </Button>
                        </div>
                        <OrderBlockFields
                          form={form}
                          index={i}
                          block={block}
                          models={models}
                          blocks={blocks}
                          suggestions={suggestions}
                        />
                      </div>
                    );
                  }
                  return (
                    <OrderBlockRow
                      key={field.id}
                      block={block}
                      models={models}
                      error={blockError(form, i)}
                      onOpen={() => openBlock(i)}
                      className={addedBlock.className(i)}
                    />
                  );
                })}

                {fields.length === 0 && (
                  <p className="text-muted-foreground">{t("itemsEmptyStep")}</p>
                )}
                {itemsError && (
                  <p className={cn("text-sm text-destructive", roomy.appear)}>
                    {itemsError}
                  </p>
                )}

                <div className="flex gap-2.5">
                  <AddButton
                    onClick={() => addBlock("catalog")}
                    className="flex-1"
                  >
                    {t("addModel")}
                  </AddButton>
                  <AddButton onClick={() => addBlock("custom")}>
                    {t("addCustomItem")}
                  </AddButton>
                </div>
              </div>
            )}

            {s.key === "Notes" && (
              <div className="flex flex-col gap-5">
                <StepForm.Field label={t("notes")} htmlFor="notes">
                  <Textarea
                    id="notes"
                    rows={3}
                    className={cn(roomy.area, "resize-none")}
                    {...form.register("notes")}
                  />
                </StepForm.Field>
                <StepForm.Field label={t("factoryNote")} htmlFor="factoryNote">
                  <Textarea
                    id="factoryNote"
                    rows={3}
                    maxLength={2000}
                    aria-describedby="factoryNote-hint"
                    className={cn(roomy.area, "resize-none")}
                    {...form.register("factoryNote")}
                  />
                  <p
                    id="factoryNote-hint"
                    className="text-[0.8125rem] text-muted-foreground"
                  >
                    {t("factoryNoteHint")}
                  </p>
                </StepForm.Field>
              </div>
            )}

            {s.key === "Review" && (
              <OrderReview
                values={values}
                customer={customer}
                models={models}
                onEdit={(step) => flow.goTo(step)}
                onStatus={(code) =>
                  form.setValue("statusCode", code, { shouldDirty: true })
                }
              />
            )}
          </StepForm.Step>
        ))}
      </StepForm.Pane>

      {flow.current > 0 && (
        <StepForm.Summary
          label={
            <>
              {/* A Hebrew name in English text (or the reverse) keeps its own direction. */}
              <bdi>{customer?.name ?? t("selectCustomer")}</bdi> ·{" "}
              {t("pairsCount", { count: totals.pairs })}
            </>
          }
          value={
            <span className="tabular-nums">
              {formatMoney(totals.agorot, locale)}
            </span>
          }
        >
          <OrderFacts
            values={values}
            customer={customer}
            models={models}
            orderNumber={orderNumber}
          />
        </StepForm.Summary>
      )}
      <StepForm.Preview label={t("previewLabel")}>
        <OrderFacts
          values={values}
          customer={customer}
          models={models}
          orderNumber={orderNumber}
        />
      </StepForm.Preview>

      <StepForm.Actions
        saveLabel={t("saveOrder")}
        aside={
          totals.models > 0
            ? [
                t("modelsCount", { count: totals.models }),
                t("pairsCount", { count: totals.pairs }),
                t("cartonsCount", { count: totals.cartons }),
              ].join(" · ")
            : undefined
        }
      />

      {isPhone && (
        <Drawer open={open !== null} onOpenChange={(o) => !o && closeBlock()}>
          <DrawerContent className="max-h-[88dvh]">
            {open !== null && openBlockValues && (
              <>
                <DrawerHeader className="flex-row items-center gap-3 px-4 pt-3 pb-4 text-start">
                  <ModelThumb src={text.image(openBlockValues)} />
                  <div className="flex min-w-0 flex-1 flex-col">
                    <DrawerTitle className="truncate text-[1.0625rem]">
                      {text.name(openBlockValues)}
                    </DrawerTitle>
                    <DrawerDescription className="text-[0.8125rem]">
                      {t("pairsCount", { count: blockPairs(openBlockValues) })}{" "}
                      ·{" "}
                      <span className="tabular-nums">
                        {formatMoney(blockAgorot(openBlockValues), locale)}
                      </span>
                    </DrawerDescription>
                  </div>
                  <DrawerClose asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={tc("close")}
                      className="size-11 rounded-[0.875rem]"
                    >
                      <X className="size-5" aria-hidden />
                    </Button>
                  </DrawerClose>
                </DrawerHeader>
                <div className="flex flex-col gap-5 overflow-y-auto px-4 pb-2">
                  <StepForm.Field
                    label={
                      openBlockValues.mode === "catalog"
                        ? t("model")
                        : t("customDescription")
                    }
                    htmlFor={pickerId(open)}
                  >
                    <OrderBlockPicker
                      id={pickerId(open)}
                      form={form}
                      index={open}
                      block={openBlockValues}
                      modelOptions={modelOptions}
                      blocks={blocks}
                    />
                  </StepForm.Field>
                  <OrderBlockFields
                    form={form}
                    index={open}
                    block={openBlockValues}
                    models={models}
                    blocks={blocks}
                    suggestions={suggestions}
                  />
                </div>
                <DrawerFooter className="flex-row gap-2.5 px-4 pt-3 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => removeBlock(open)}
                    className={cn(roomy.button, roomy.raised)}
                  >
                    {t("removeModel")}
                  </Button>
                  <Button
                    type="button"
                    onClick={closeBlock}
                    className={cn(roomy.button, "flex-1")}
                  >
                    {t("doneModel")}
                  </Button>
                </DrawerFooter>
              </>
            )}
          </DrawerContent>
        </Drawer>
      )}
    </StepForm>
  );
}

/** A dashed button that adds to the order's list of models. */
function AddButton({
  onClick,
  className,
  children,
}: {
  onClick: () => void;
  className?: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex h-14 items-center justify-center gap-2 rounded-[1.25rem] border-[1.5px] border-dashed border-foreground/20 px-4 font-medium",
        "outline-none hover:bg-surface focus-visible:ring-[3px] focus-visible:ring-ring/50",
        roomy.press,
        className,
      )}
    >
      <Plus className="size-4.5" aria-hidden />
      {children}
    </button>
  );
}
