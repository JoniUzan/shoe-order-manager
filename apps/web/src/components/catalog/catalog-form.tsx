"use client";

import {
  formatMoney,
  shekelsToAgorot,
  SIZE_FORMATS,
  type ShoeModelInput,
  type SizeFormat,
} from "@repo/domain";
import { Input } from "@repo/ui/components/input";
import { Label } from "@repo/ui/components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui/components/select";
import { Switch } from "@repo/ui/components/switch";
import { Textarea } from "@repo/ui/components/textarea";
import { cn } from "@repo/ui/lib/utils";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useForm, useWatch, type UseFormReturn } from "react-hook-form";
import { toast } from "sonner";

import { CurveText } from "@/components/catalog/curve-text";
import {
  PackEditor,
  packCurve,
  packErrors,
  type PackFormValue,
} from "@/components/catalog/pack-editor";
import {
  ProductImageField,
  type ProductImageValue,
} from "@/components/catalog/product-image-field";
import { SizeListInput } from "@/components/catalog/size-list-input";
import { ShoeOutline } from "@/components/orders/model-thumb";
import { roomy } from "@/components/step-form/roomy";
import { StepForm, useStepForm } from "@/components/step-form/step-form";
import type { IllustrationName } from "@/components/ui/illustration";
import { useRouter } from "@/i18n/navigation";
import {
  createShoeModel,
  updateShoeModel,
  uploadProductImage,
} from "@/lib/actions/catalog";

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

export const EMPTY: FormValues = {
  name: "",
  sku: "",
  description: "",
  price: "",
  sizes: [],
  sizeFormat: "eu",
  isActive: true,
  packs: [],
};

export const STEPS = [
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
  defaultImage = null,
}: {
  modelId?: string;
  defaultValues?: FormValues;
  /** The stored Product image, when the model has one. */
  defaultImage?: { key: string; url: string } | null;
}) {
  const t = useTranslations("catalog");
  const tc = useTranslations("common");
  const router = useRouter();
  const editing = modelId !== undefined;
  const [pending, setPending] = useState(false);
  // Pack errors are derived from the live values (see packErrors) and only
  // shown once a save has been tried, so a half-typed pack isn't shouted at.
  const [showPackErrors, setShowPackErrors] = useState(false);
  // Kept outside react-hook-form: it holds a Blob, and the form only needs
  // to know whether it changed.
  const [image, setImage] = useState<ProductImageValue>(
    defaultImage && { kind: "stored", ...defaultImage },
  );
  // The last upload, so a save retried after a failure doesn't upload the
  // same photo twice.
  const uploaded = useRef<{ blob: Blob; key: string } | null>(null);

  // A picked image's object URL lives until it is replaced or the form goes.
  useEffect(() => {
    if (image?.kind !== "new") return;
    return () => URL.revokeObjectURL(image.url);
  }, [image]);

  const form = useForm<FormValues>({
    defaultValues: defaultValues ?? EMPTY,
  });
  const values = useWatch({ control: form.control }) as FormValues;

  const flow = useStepForm({
    editing,
    steps: STEPS.map((s) => ({
      label: t(`step${s.key}`),
      // Only the details step has a required field; the size run and Packs
      // may be left empty.
      canLeave: s.key === "Details" ? () => form.trigger("name") : undefined,
    })),
  });

  async function save(values: FormValues) {
    if (packErrors(values.packs, values.sizes).some(Boolean)) {
      setShowPackErrors(true);
      flow.goTo(LAST);
      toast.error(t("errorPacks"));
      return;
    }
    setPending(true);
    const imageKey = await saveImage();
    if (imageKey === false) {
      toast.error(t("productImageUploadFailed"));
      setPending(false);
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
      ...(imageKey !== undefined && { imageKey }),
    };
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

  /**
   * The `imageKey` to save: a new image's key once it's uploaded, null to
   * remove the stored one, undefined to leave it; false when the upload
   * failed.
   */
  async function saveImage(): Promise<string | null | undefined | false> {
    if (image === null) return defaultImage ? null : undefined;
    if (image.kind === "stored") return undefined;
    if (uploaded.current?.blob === image.blob) return uploaded.current.key;
    const data = new FormData();
    data.set("image", image.blob, "product.jpg");
    const res = await uploadProductImage(data).catch(() => null);
    if (!res?.ok) return false;
    uploaded.current = { blob: image.blob, key: res.key };
    return res.key;
  }

  const imageChanged = image === null ? defaultImage !== null : image.kind === "new";

  return (
    <StepForm
      flow={flow}
      // A missing name can only be on the details step: go there.
      onSave={(e) => void form.handleSubmit(save, () => flow.goTo(0))(e)}
      cancelHref="/catalog"
      dirty={form.formState.isDirty || imageChanged}
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
            {s.key === "Details" && (
              <CatalogDetails form={form} image={image} onImage={setImage} />
            )}

            {s.key === "Sizes" && (
              <div className="flex flex-col gap-5">
                <StepForm.Field label={t("sizeFormat")} htmlFor="sizeFormat" className="max-w-64">
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
                </StepForm.Field>
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

            {s.key === "Packs" && (
              <PackEditor
                value={values.packs}
                sizes={values.sizes}
                showErrors={showPackErrors}
                onChange={(next) => form.setValue("packs", next, { shouldDirty: true })}
              />
            )}
          </StepForm.Step>
        ))}
      </StepForm.Pane>

      <ModelPreview values={values} imageUrl={image?.url ?? null} />

      <StepForm.Actions saveLabel={tc("save")} />
    </StepForm>
  );
}

/**
 * The details step's body: the Product image beside the name, SKU and price,
 * description and Active. Also drawn, inert, by the form's skeleton.
 */
export function CatalogDetails({
  form,
  image,
  onImage,
  imageField,
  idPrefix = "",
}: {
  form: UseFormReturn<FormValues>;
  image: ProductImageValue;
  onImage: (next: ProductImageValue) => void;
  /** In place of the image picker: the skeleton's grey image. */
  imageField?: ReactNode;
  /** Keeps the skeleton's copy from sharing the real fields' ids. */
  idPrefix?: string;
}) {
  const t = useTranslations("catalog");
  const tv = useTranslations("validation");
  const isActive = useWatch({ control: form.control, name: "isActive" });
  const nameError = form.formState.errors.name;

  return (
    <div className="flex flex-col gap-5 @xl:grid @xl:grid-cols-[13.75rem_minmax(0,1fr)] @xl:items-start @xl:gap-7">
      {imageField ?? <ProductImageField value={image} onChange={onImage} />}
      <div className="flex flex-col gap-4.5">
        <StepForm.Field
          label={t("name")}
          htmlFor={`${idPrefix}name`}
          error={nameError ? tv("required") : undefined}
        >
          <Input
            id={`${idPrefix}name`}
            placeholder={t("namePlaceholder")}
            aria-invalid={!!nameError}
            className={roomy.field}
            {...form.register("name", {
              required: true,
              // Clear "required" as soon as it's fixed; without a
              // submit react-hook-form would wait for the next
              // Continue.
              onChange: () => {
                if (form.formState.errors.name) void form.trigger("name");
              },
            })}
          />
        </StepForm.Field>

        <div className="grid grid-cols-2 gap-3 md:gap-4">
          <StepForm.Field label={t("sku")} htmlFor={`${idPrefix}sku`}>
            <Input
              id={`${idPrefix}sku`}
              dir="ltr"
              className={cn(roomy.field, "text-start")}
              {...form.register("sku")}
            />
          </StepForm.Field>
          <StepForm.Field label={`${t("price")} (₪)`} htmlFor={`${idPrefix}price`}>
            <Input
              id={`${idPrefix}price`}
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              dir="ltr"
              className={cn(roomy.field, "text-start tabular-nums")}
              {...form.register("price")}
            />
          </StepForm.Field>
        </div>

        <StepForm.Field label={t("description")} htmlFor={`${idPrefix}description`}>
          <Textarea
            id={`${idPrefix}description`}
            rows={3}
            className={cn(roomy.area, "resize-none")}
            {...form.register("description")}
          />
        </StepForm.Field>

        <label className="flex min-h-11 items-center gap-3">
          <Switch
            size="lg"
            checked={isActive}
            onCheckedChange={(v) =>
              form.setValue("isActive", v, { shouldDirty: true })
            }
          />
          <span className="font-medium">{t("active")}</span>
        </label>
      </div>
    </div>
  );
}

/** The model as it will read in the catalog, filled in as the steps are. */
export function ModelPreview({
  values,
  imageUrl,
}: {
  values: FormValues;
  imageUrl: string | null;
}) {
  const t = useTranslations("catalog");
  const locale = useLocale();
  const price = values.price.trim();
  const sizes = values.sizes;
  const packs = values.packs.filter((p) => p.name.trim());

  return (
    <StepForm.Preview label={t("preview")}>
      <StepForm.PreviewImage>
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- already a small square JPEG
          <img src={imageUrl} alt="" className="size-full object-cover" />
        ) : (
          // The same outline as a model without a Product image anywhere else.
          <ShoeOutline className="size-2/5 text-muted-foreground opacity-70" />
        )}
      </StepForm.PreviewImage>
      <StepForm.PreviewTitle
        placeholder={t("new")}
        subtitle={
          values.sku ? (
            <span dir="ltr" className="block text-start">
              {values.sku}
            </span>
          ) : undefined
        }
      >
        {values.name.trim()}
      </StepForm.PreviewTitle>
      <StepForm.PreviewRows>
        <StepForm.PreviewRow label={t("price")}>
          {price ? (
            <span className="tabular-nums">
              {formatMoney(shekelsToAgorot(Number(price)), locale)}
            </span>
          ) : undefined}
        </StepForm.PreviewRow>
        <StepForm.PreviewRow label={t("sizes")}>
          {sizes.length ? (
            <span dir="ltr" className="tabular-nums">
              {sizes[0]}–{sizes[sizes.length - 1]}
            </span>
          ) : undefined}
        </StepForm.PreviewRow>
        <StepForm.PreviewRow label={t("packs")} empty={t("previewNoPacks")}>
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
          ) : undefined}
        </StepForm.PreviewRow>
      </StepForm.PreviewRows>
    </StepForm.Preview>
  );
}
