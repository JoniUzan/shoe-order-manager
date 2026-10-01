"use client";

import {
  formatMoney,
  shekelsToAgorot,
  SIZE_FORMATS,
  type ShoeModelInput,
  type SizeFormat,
} from "@repo/domain";
import { Checkbox } from "@repo/ui/components/checkbox";
import { Input } from "@repo/ui/components/input";
import { Label } from "@repo/ui/components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui/components/select";
import { Textarea } from "@repo/ui/components/textarea";
import { cn } from "@repo/ui/lib/utils";
import { ImagePlus } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState, type FormEvent, type ReactNode } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";

import { CurveText } from "@/components/catalog/curve-text";
import {
  PackEditor,
  packCurve,
  packErrors,
  type PackFormValue,
} from "@/components/catalog/pack-editor";
import { SizeListInput } from "@/components/catalog/size-list-input";
import {
  roomy,
  StepActions,
  StepFlow,
  StepHeader,
} from "@/components/form-steps/form-steps";
import { Illustration, type IllustrationName } from "@/components/ui/illustration";
import { useRouter } from "@/i18n/navigation";
import { createShoeModel, updateShoeModel } from "@/lib/actions/catalog";

export interface FormValues {
  name: string;
  sku: string;
  description: string;
  price: string; // shekels, as typed
  sizes: string[];
  sizeFormat: SizeFormat;
  isActive: boolean;
  packs: PackFormValue[];
}

const EMPTY: FormValues = {
  name: "",
  sku: "",
  description: "",
  price: "",
  sizes: [],
  sizeFormat: "eu",
  isActive: true,
  packs: [],
};

const STEPS = [
  { key: "Details", illustration: "sneaker" },
  { key: "Sizes", illustration: "shoe-box" },
  { key: "Packs", illustration: "carton" },
] as const satisfies readonly { key: string; illustration: IllustrationName }[];
const LAST = STEPS.length - 1;

/**
 * A Shoe model in three steps: details, size run, Packs. A new model walks
 * them in order (a finished step can be revisited); an existing one can jump
 * to any step and save from any of them.
 */
export function CatalogForm({
  modelId,
  defaultValues,
}: {
  modelId?: string;
  defaultValues?: FormValues;
}) {
  const t = useTranslations("catalog");
  const tv = useTranslations("validation");
  const tc = useTranslations("common");
  const router = useRouter();
  const editing = modelId !== undefined;
  const [pending, setPending] = useState(false);
  const [step, setStep] = useState(0);
  // The furthest step reached, so the step bar can return to it.
  const [reached, setReached] = useState(editing ? LAST : 0);
  // Pack errors are derived from the live values (see packErrors) and only
  // shown once a save has been tried, so a half-typed pack isn't shouted at.
  const [showPackErrors, setShowPackErrors] = useState(false);

  const form = useForm<FormValues>({
    defaultValues: defaultValues ?? EMPTY,
  });
  const values = useWatch({ control: form.control }) as FormValues;

  function goTo(next: number) {
    setStep(next);
    setReached((r) => Math.max(r, next));
  }

  async function next() {
    // Only the details step has a required field; the size run and Packs may
    // be left empty.
    if (step === 0 && !(await form.trigger("name"))) return;
    goTo(step + 1);
  }

  async function save(values: FormValues) {
    if (packErrors(values.packs, values.sizes).some(Boolean)) {
      setShowPackErrors(true);
      goTo(LAST);
      toast.error(t("errorPacks"));
      return;
    }
    const priceText = values.price.trim();
    const input: ShoeModelInput = {
      name: values.name.trim(),
      sku: values.sku,
      description: values.description,
      defaultPriceAgorot: priceText ? shekelsToAgorot(Number(priceText)) : null,
      sizes: values.sizes,
      sizeFormat: values.sizeFormat,
      isActive: values.isActive,
      packs: values.packs.map((pack) => ({
        id: pack.id,
        name: pack.name.trim(),
        curve: packCurve(pack),
      })),
    };
    setPending(true);
    const res = modelId
      ? await updateShoeModel(modelId, input)
      : await createShoeModel(input);
    if (res.ok) {
      toast.success(modelId ? t("updated") : t("created"));
      router.push("/catalog");
    } else {
      toast.error(t("errorGeneric"));
      setPending(false);
    }
  }

  // The primary button submits, so Enter in a field continues until the form
  // can save. A missing name can only be on the details step: go there.
  function onSubmit(e: FormEvent<HTMLFormElement>) {
    if (!editing && step < LAST) {
      e.preventDefault();
      void next();
      return;
    }
    void form.handleSubmit(save, () => goTo(0))(e);
  }

  const current = STEPS[step]!;
  const nameError = form.formState.errors.name;

  return (
    <form
      onSubmit={onSubmit}
      // Native constraint validation is off because it silently vetoes submit.
      // The size range's from/to boxes are `type=number` scratch fields that are
      // never submitted, but a `badInput` residue in one of them — typing "-"
      // or "e" — made the whole form fail checkValidity(), so Save did nothing
      // at all: no toast, no message, and the browser's tooltip pointing at a
      // throwaway field. Validation is react-hook-form's job here.
      noValidate
    >
      <StepFlow
        title={editing ? t("edit") : t("new")}
        steps={STEPS.map((s) => ({ label: t(`step${s.key}`) }))}
        current={step}
        reachable={(i) => i <= reached}
        onSelect={goTo}
        cancelHref="/catalog"
        dirty={form.formState.isDirty}
        preview={<ModelPreview values={values} />}
        actions={
          <StepActions
            first={step === 0}
            last={step === LAST}
            editing={editing}
            pending={pending}
            onBack={() => goTo(step - 1)}
            onContinue={next}
            saveLabel={tc("save")}
          />
        }
      >
        <StepHeader
          illustration={current.illustration}
          title={t(`step${current.key}`)}
          hint={t(`step${current.key}Hint`)}
        />

        {step === 0 && (
          <div className="flex flex-col gap-5 @xl:grid @xl:grid-cols-[13.75rem_minmax(0,1fr)] @xl:items-start @xl:gap-7">
            <ImageSlot />
            <div className="flex flex-col gap-4.5">
              <Field label={t("name")} htmlFor="name">
                <Input
                  id="name"
                  placeholder={t("namePlaceholder")}
                  aria-invalid={!!nameError}
                  className={roomy.field}
                  {...form.register("name", {
                    required: true,
                    // Clear "required" as soon as it's fixed; without a submit
                    // react-hook-form would wait for the next Continue.
                    onChange: () => {
                      if (form.formState.errors.name) void form.trigger("name");
                    },
                  })}
                />
                {nameError && <p className="text-sm text-destructive">{tv("required")}</p>}
              </Field>

              <div className="grid grid-cols-2 gap-3 md:gap-4">
                <Field label={t("sku")} htmlFor="sku">
                  <Input
                    id="sku"
                    dir="ltr"
                    className={cn(roomy.field, "text-start")}
                    {...form.register("sku")}
                  />
                </Field>
                <Field label={`${t("price")} (₪)`} htmlFor="price">
                  <Input
                    id="price"
                    type="number"
                    min="0"
                    step="0.01"
                    inputMode="decimal"
                    dir="ltr"
                    className={cn(roomy.field, "text-start tabular-nums")}
                    {...form.register("price")}
                  />
                </Field>
              </div>

              <Field label={t("description")} htmlFor="description">
                <Textarea
                  id="description"
                  rows={3}
                  className={cn(roomy.area, "resize-none")}
                  {...form.register("description")}
                />
              </Field>

              <label className="flex min-h-11 items-center gap-3">
                <Checkbox
                  checked={values.isActive}
                  onCheckedChange={(v) =>
                    form.setValue("isActive", v === true, { shouldDirty: true })
                  }
                  className="size-5"
                />
                <span className="font-medium">{t("active")}</span>
              </label>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="flex flex-col gap-5">
            <Field label={t("sizeFormat")} htmlFor="sizeFormat" className="max-w-64">
              <Select
                value={values.sizeFormat}
                onValueChange={(v) =>
                  form.setValue("sizeFormat", v as SizeFormat, { shouldDirty: true })
                }
              >
                <SelectTrigger
                  id="sizeFormat"
                  className={cn(roomy.field, "w-full data-[size=default]:h-12")}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SIZE_FORMATS.map((f) => (
                    <SelectItem key={f} value={f}>
                      {t(`sizeFormat_${f}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Label htmlFor="sizes" className="sr-only">
              {t("sizes")}
            </Label>
            <SizeListInput
              id="sizes"
              value={values.sizes}
              onChange={(next) => form.setValue("sizes", next, { shouldDirty: true })}
            />
          </div>
        )}

        {step === 2 && (
          <div className="flex flex-col gap-5">
            <PackEditor
              value={values.packs}
              sizes={values.sizes}
              showErrors={showPackErrors}
              onChange={(next) => form.setValue("packs", next, { shouldDirty: true })}
            />
          </div>
        )}
      </StepFlow>
    </form>
  );
}

function Field({
  label,
  htmlFor,
  className,
  children,
}: {
  label: string;
  htmlFor: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <Label htmlFor={htmlFor} className={roomy.label}>
        {label}
      </Label>
      {children}
    </div>
  );
}

/**
 * Where the Product image will be uploaded. Until uploads land it only holds
 * the place, so the step already has its final shape.
 */
function ImageSlot() {
  const t = useTranslations("catalog");
  return (
    <div
      className={cn(
        "flex h-24 flex-col items-center justify-center gap-1.5 rounded-[1.25rem] px-4 text-center",
        "border-[1.5px] border-dashed border-foreground/20 text-muted-foreground",
        "@xl:aspect-square @xl:h-auto @xl:gap-2.5",
      )}
    >
      <ImagePlus className="size-6 md:size-7" aria-hidden />
      <span className="font-medium text-foreground">{t("productImage")}</span>
      <span className="text-[0.8125rem]">{t("productImageSoon")}</span>
    </div>
  );
}

/** The model as it will read in the catalog, filled in as the steps are. */
function ModelPreview({ values }: { values: FormValues }) {
  const t = useTranslations("catalog");
  const locale = useLocale();
  const price = values.price.trim();
  const sizes = values.sizes;
  const packs = values.packs.filter((p) => p.name.trim());

  return (
    <aside
      aria-label={t("preview")}
      className="flex flex-col gap-4 rounded-card bg-card p-5 shadow-[var(--shadow-card)]"
    >
      {/* The Product image's place; the step illustration until there is one. */}
      <div className="flex aspect-square w-full items-center justify-center rounded-[1.125rem] border border-border bg-surface">
        <Illustration name="sneaker" sizes="320px" className="size-3/5 md:size-3/5" />
      </div>
      <div className="flex min-w-0 flex-col gap-0.5">
        <p className="truncate text-[1.375rem] font-semibold">
          {values.name.trim() || <span className="text-muted-foreground">{t("new")}</span>}
        </p>
        {values.sku && (
          <p dir="ltr" className="truncate text-start text-[0.8125rem] text-muted-foreground">
            {values.sku}
          </p>
        )}
      </div>
      <hr className="border-border" />
      <dl className="flex flex-col gap-2 text-sm">
        <PreviewRow label={t("price")}>
          {price ? (
            <span className="tabular-nums">
              {formatMoney(shekelsToAgorot(Number(price)), locale)}
            </span>
          ) : null}
        </PreviewRow>
        <PreviewRow label={t("sizes")}>
          {sizes.length ? (
            <span dir="ltr" className="tabular-nums">
              {sizes[0]}–{sizes[sizes.length - 1]}
            </span>
          ) : null}
        </PreviewRow>
        <PreviewRow label={t("packs")} empty={t("previewNoPacks")}>
          {packs.length ? (
            <ul className="flex flex-col items-end gap-2">
              {packs.map((p, i) => (
                <li key={p.id ?? i} className="flex flex-col items-end">
                  <span className="font-medium">{p.name}</span>
                  {/* Sizes read left to right in both languages, like the order grid. */}
                  <span dir="ltr" className="text-muted-foreground">
                    <CurveText curve={packCurve(p)} />
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
        </PreviewRow>
      </dl>
    </aside>
  );
}

function PreviewRow({
  label,
  empty,
  children,
}: {
  label: string;
  empty?: string;
  children: ReactNode;
}) {
  const t = useTranslations("catalog");
  return (
    <div className="flex items-start justify-between gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-end">
        {children ?? <span className="text-muted-foreground">{empty ?? t("previewNotSet")}</span>}
      </dd>
    </div>
  );
}
