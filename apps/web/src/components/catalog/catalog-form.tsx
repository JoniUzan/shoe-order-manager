"use client";

import {
  formatMoney,
  shekelsToAgorot,
  SIZE_FORMATS,
  type ShoeModelInput,
  type SizeFormat,
} from "@repo/domain";
import { Button } from "@repo/ui/components/button";
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
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState, type ReactNode } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { CurveText } from "@/components/catalog/curve-text";
import {
  PackEditor,
  packCurve,
  packErrors,
  type PackFormValue,
} from "@/components/catalog/pack-editor";
import { SizeListInput } from "@/components/catalog/size-list-input";
import { StepBar, StepHeader } from "@/components/form-steps/form-steps";
import type { IllustrationName } from "@/components/ui/illustration";
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
  // The furthest step reached, so Back and the step bar can return to it.
  const [reached, setReached] = useState(editing ? LAST : 0);
  // Pack errors are derived from the live values (see packErrors) and only
  // shown once a save has been tried, so a half-typed pack isn't shouted at.
  const [showPackErrors, setShowPackErrors] = useState(false);

  const form = useForm<FormValues>({
    defaultValues: defaultValues ?? EMPTY,
  });

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

  async function onSubmit(values: FormValues) {
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

  const values = form.watch();
  const current = STEPS[step]!;
  const canSave = editing || step === LAST;

  return (
    <form
      // A missing name can only be on the details step: take the user there.
      onSubmit={form.handleSubmit(onSubmit, () => goTo(0))}
      // Native constraint validation is off because it silently vetoes submit.
      // The size range's from/to boxes are `type=number` scratch fields that are
      // never submitted, but a `badInput` residue in one of them — typing "-"
      // or "e" — made the whole form fail checkValidity(), so Save did nothing
      // at all: no toast, no message, and the browser's tooltip pointing at a
      // throwaway field. Validation is react-hook-form's job here.
      noValidate
      className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]"
    >
      <div className="flex min-w-0 flex-col gap-6">
        <StepBar
          steps={STEPS.map((s) => t(`step${s.key}`))}
          current={step}
          reachable={(i) => i <= reached}
          onSelect={goTo}
        />

        <section className="flex flex-col gap-7 rounded-card bg-surface p-5 md:p-10">
          <StepHeader
            illustration={current.illustration}
            title={t(`step${current.key}`)}
            hint={t(`step${current.key}Hint`)}
          />

          {step === 0 && (
            <div className="flex flex-col gap-5">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="name">{t("name")}</Label>
                <Input
                  id="name"
                  placeholder={t("namePlaceholder")}
                  aria-invalid={!!form.formState.errors.name}
                  {...form.register("name", { required: true })}
                />
                {form.formState.errors.name && (
                  <p className="text-sm text-destructive">{tv("required")}</p>
                )}
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="sku">{t("sku")}</Label>
                  <Input id="sku" dir="ltr" className="text-start" {...form.register("sku")} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="price">{t("price")} (₪)</Label>
                  <Input
                    id="price"
                    type="number"
                    min="0"
                    step="0.01"
                    dir="ltr"
                    className="text-start"
                    {...form.register("price")}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="description">{t("description")}</Label>
                <Textarea id="description" rows={3} {...form.register("description")} />
              </div>

              <label className="flex items-center gap-2">
                <Checkbox
                  checked={values.isActive}
                  onCheckedChange={(v) => form.setValue("isActive", v === true)}
                />
                <span className="text-sm font-medium">{t("active")}</span>
              </label>
            </div>
          )}

          {step === 1 && (
            <div className="flex flex-col gap-4">
              <p className="text-sm text-muted-foreground">{t("sizesHelp")}</p>

              <div className="flex max-w-56 flex-col gap-1">
                <label htmlFor="sizeFormat" className="text-xs text-muted-foreground">
                  {t("sizeFormat")}
                </label>
                <Select
                  value={values.sizeFormat}
                  onValueChange={(v) =>
                    form.setValue("sizeFormat", v as SizeFormat, { shouldDirty: true })
                  }
                >
                  <SelectTrigger id="sizeFormat" className="h-11 md:h-9">
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
              </div>

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
            <div className="flex flex-col gap-4">
              <p className="text-sm text-muted-foreground">{t("packsHelp")}</p>
              <PackEditor
                value={values.packs}
                sizes={values.sizes}
                showErrors={showPackErrors}
                onChange={(next) => form.setValue("packs", next, { shouldDirty: true })}
              />
            </div>
          )}
        </section>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button
            type="button"
            variant="ghost"
            disabled={pending}
            onClick={() => router.back()}
          >
            {tc("cancel")}
          </Button>
          <div className="flex gap-3">
            {step > 0 && (
              <Button
                type="button"
                variant="outline"
                disabled={pending}
                onClick={() => goTo(step - 1)}
              >
                <ChevronLeft className="rtl:rotate-180" aria-hidden />
                {tc("back")}
              </Button>
            )}
            {step < LAST && (
              <Button
                type="button"
                variant={canSave ? "outline" : "default"}
                disabled={pending}
                onClick={next}
              >
                {tc("continue")}
                <ChevronRight className="rtl:rotate-180" aria-hidden />
              </Button>
            )}
            {canSave && (
              <Button type="submit" disabled={pending}>
                {tc("save")}
              </Button>
            )}
          </div>
        </div>
      </div>

      <ModelPreview values={values} />
    </form>
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
      className="sticky top-6 hidden flex-col gap-4 rounded-card bg-card p-6 shadow-card lg:flex"
    >
      <div className="flex flex-col gap-0.5">
        <p className="truncate text-xl font-semibold">
          {values.name.trim() || <span className="text-muted-foreground">{t("new")}</span>}
        </p>
        {values.sku && (
          <p dir="ltr" className="text-start text-sm text-muted-foreground">
            {values.sku}
          </p>
        )}
      </div>
      <hr className="border-border" />
      <dl className="flex flex-col gap-2.5 text-sm">
        <PreviewRow label={t("price")}>
          {price ? formatMoney(shekelsToAgorot(Number(price)), locale) : null}
        </PreviewRow>
        <PreviewRow label={t("sizes")}>
          {sizes.length ? (
            <span dir="ltr">
              {sizes[0]}–{sizes[sizes.length - 1]}
            </span>
          ) : null}
        </PreviewRow>
        <PreviewRow label={t("packs")}>
          {packs.length ? (
            <ul className="flex flex-col items-end gap-1">
              {packs.map((p, i) => (
                <li key={p.id ?? i}>
                  <span className="font-medium">{p.name}</span>{" "}
                  <span className="text-muted-foreground">
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

function PreviewRow({ label, children }: { label: string; children: ReactNode }) {
  const t = useTranslations("catalog");
  return (
    <div className="flex items-start justify-between gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-end">
        {children ?? <span className="text-muted-foreground">{t("previewNotSet")}</span>}
      </dd>
    </div>
  );
}
