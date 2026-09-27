"use client";

import {
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
import { useTranslations } from "next-intl";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import {
  PackEditor,
  packCurve,
  packErrors,
  type PackFormValue,
} from "@/components/catalog/pack-editor";
import { SizeListInput } from "@/components/catalog/size-list-input";
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
  const [pending, setPending] = useState(false);
  // Pack errors are derived from the live values (see packErrors) and only
  // shown once a save has been tried, so a half-typed pack isn't shouted at.
  const [showPackErrors, setShowPackErrors] = useState(false);

  const form = useForm<FormValues>({
    defaultValues: defaultValues ?? EMPTY,
  });

  async function onSubmit(values: FormValues) {
    if (packErrors(values.packs, values.sizes).some(Boolean)) {
      setShowPackErrors(true);
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

  const isActive = form.watch("isActive");
  const sizes = form.watch("sizes");
  const sizeFormat = form.watch("sizeFormat");
  const packs = form.watch("packs");

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      // Native constraint validation is off because it silently vetoes submit.
      // The size range's from/to boxes are `type=number` scratch fields that are
      // never submitted, but a `badInput` residue in one of them — typing "-"
      // or "e" — made the whole form fail checkValidity(), so Save did nothing
      // at all: no toast, no message, and the browser's tooltip pointing at a
      // throwaway field. Validation is react-hook-form's job here.
      noValidate
      className="flex max-w-xl flex-col gap-5"
    >
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
        <Label htmlFor="sizes">{t("sizes")}</Label>
        <p className="text-xs text-muted-foreground">{t("sizesHelp")}</p>

        <div className="flex max-w-56 flex-col gap-1">
          <label
            htmlFor="sizeFormat"
            className="text-xs text-muted-foreground"
          >
            {t("sizeFormat")}
          </label>
          <Select
            value={sizeFormat}
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

        <SizeListInput
          id="sizes"
          value={sizes}
          onChange={(next) => form.setValue("sizes", next, { shouldDirty: true })}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>{t("packs")}</Label>
        <p className="text-xs text-muted-foreground">{t("packsHelp")}</p>
        <PackEditor
          value={packs}
          sizes={sizes}
          showErrors={showPackErrors}
          onChange={(next) => form.setValue("packs", next, { shouldDirty: true })}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="description">{t("description")}</Label>
        <Textarea id="description" rows={3} {...form.register("description")} />
      </div>

      <label className="flex items-center gap-2">
        <Checkbox
          checked={isActive}
          onCheckedChange={(v) => form.setValue("isActive", v === true)}
        />
        <span className="text-sm font-medium">{t("active")}</span>
      </label>

      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {tc("save")}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={pending}
          onClick={() => router.back()}
        >
          {tc("cancel")}
        </Button>
      </div>
    </form>
  );
}
