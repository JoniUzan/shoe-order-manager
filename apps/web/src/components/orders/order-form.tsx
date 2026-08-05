"use client";

import {
  agorotToShekels,
  formatMoney,
  shekelsToAgorot,
  type OrderInput,
} from "@repo/domain";
import { Button } from "@repo/ui/components/button";
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
import { useLocale, useTranslations } from "next-intl";
import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { toast } from "sonner";

import { useRouter } from "@/i18n/navigation";
import { createOrder, updateOrder } from "@/lib/actions/orders";

export interface CustomerOption {
  id: string;
  name: string;
}
export interface ModelOption {
  id: string;
  name: string;
  defaultPriceAgorot: number | null;
}

interface LineForm {
  mode: "catalog" | "custom";
  shoeModelId: string;
  customDescription: string;
  size: string;
  color: string;
  quantity: string;
  unitPrice: string; // shekels
}

export interface OrderFormValues {
  customerId: string;
  notes: string;
  statusCode: string;
  depositAgorot: number;
  items: LineForm[];
}

const EMPTY_LINE: LineForm = {
  mode: "catalog",
  shoeModelId: "",
  customDescription: "",
  size: "",
  color: "",
  quantity: "1",
  unitPrice: "",
};

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
  const [pending, setPending] = useState(false);

  const form = useForm<OrderFormValues>({
    defaultValues: defaultValues ?? {
      customerId: "",
      notes: "",
      statusCode: "not_done",
      depositAgorot: 0,
      items: [{ ...EMPTY_LINE }],
    },
  });
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  const watchedItems = form.watch("items");
  const customerId = form.watch("customerId");

  const orderTotalAgorot = (watchedItems ?? []).reduce((sum, line) => {
    const qty = Number(line.quantity) || 0;
    const price = shekelsToAgorot(Number(line.unitPrice) || 0);
    return sum + qty * price;
  }, 0);

  async function onSubmit(values: OrderFormValues) {
    if (!values.customerId) {
      toast.error(t("errorNoCustomer"));
      return;
    }
    if (values.items.length === 0) {
      toast.error(t("errorNoItems"));
      return;
    }
    for (const line of values.items) {
      const hasRef =
        line.mode === "catalog" ? !!line.shoeModelId : !!line.customDescription.trim();
      if (!hasRef || !line.size.trim() || !(Number(line.quantity) > 0)) {
        toast.error(t("errorItemIncomplete"));
        return;
      }
    }

    const input: OrderInput = {
      customerId: values.customerId,
      notes: values.notes,
      statusCode: values.statusCode || "not_done",
      depositAgorot: values.depositAgorot ?? 0,
      items: values.items.map((line) => ({
        shoeModelId: line.mode === "catalog" ? line.shoeModelId : null,
        customDescription:
          line.mode === "custom" ? line.customDescription.trim() : null,
        size: line.size.trim(),
        color: line.color,
        quantity: Number(line.quantity),
        unitPriceAgorot: shekelsToAgorot(Number(line.unitPrice) || 0),
      })),
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

  function onModelChange(index: number, modelId: string) {
    form.setValue(`items.${index}.shoeModelId`, modelId);
    const model = models.find((m) => m.id === modelId);
    if (model?.defaultPriceAgorot != null && !watchedItems[index]?.unitPrice) {
      form.setValue(
        `items.${index}.unitPrice`,
        String(agorotToShekels(model.defaultPriceAgorot)),
      );
    }
  }

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      className="flex max-w-3xl flex-col gap-6"
    >
      {/* Customer */}
      <div className="flex max-w-sm flex-col gap-1.5">
        <Label>{t("customer")}</Label>
        <Select
          value={customerId}
          onValueChange={(v) => form.setValue("customerId", v)}
        >
          <SelectTrigger>
            <SelectValue placeholder={t("selectCustomer")} />
          </SelectTrigger>
          <SelectContent>
            {customers.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Line items */}
      <div className="flex flex-col gap-3">
        <Label>{t("items")}</Label>
        <div className="flex flex-col gap-3">
          {fields.map((field, index) => {
            const line = watchedItems?.[index];
            const mode = line?.mode ?? "catalog";
            const lineAgorot =
              (Number(line?.quantity) || 0) *
              shekelsToAgorot(Number(line?.unitPrice) || 0);
            return (
              <div
                key={field.id}
                className="flex flex-col gap-3 rounded-lg border p-3"
              >
                <div className="flex flex-wrap items-end gap-2">
                  <div className="flex w-28 flex-col gap-1">
                    <Label className="text-xs text-muted-foreground">
                      {t("lineType")}
                    </Label>
                    <Select
                      value={mode}
                      onValueChange={(v) =>
                        form.setValue(
                          `items.${index}.mode`,
                          v as "catalog" | "custom",
                        )
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="catalog">
                          {t("catalogItem")}
                        </SelectItem>
                        <SelectItem value="custom">{t("customItem")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex min-w-48 flex-1 flex-col gap-1">
                    <Label className="text-xs text-muted-foreground">
                      {mode === "catalog" ? t("model") : t("customDescription")}
                    </Label>
                    {mode === "catalog" ? (
                      <Select
                        value={line?.shoeModelId ?? ""}
                        onValueChange={(v) => onModelChange(index, v)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={t("selectModel")} />
                        </SelectTrigger>
                        <SelectContent>
                          {models.map((m) => (
                            <SelectItem key={m.id} value={m.id}>
                              {m.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input
                        {...form.register(`items.${index}.customDescription`)}
                      />
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-end gap-2">
                  <div className="flex w-20 flex-col gap-1">
                    <Label className="text-xs text-muted-foreground">
                      {t("size")}
                    </Label>
                    <Input {...form.register(`items.${index}.size`)} />
                  </div>
                  <div className="flex w-24 flex-col gap-1">
                    <Label className="text-xs text-muted-foreground">
                      {t("color")}
                    </Label>
                    <Input {...form.register(`items.${index}.color`)} />
                  </div>
                  <div className="flex w-20 flex-col gap-1">
                    <Label className="text-xs text-muted-foreground">
                      {t("quantity")}
                    </Label>
                    <Input
                      type="number"
                      min="1"
                      dir="ltr"
                      className="text-start"
                      {...form.register(`items.${index}.quantity`)}
                    />
                  </div>
                  <div className="flex w-28 flex-col gap-1">
                    <Label className="text-xs text-muted-foreground">
                      {t("unitPrice")} (₪)
                    </Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      dir="ltr"
                      className="text-start"
                      {...form.register(`items.${index}.unitPrice`)}
                    />
                  </div>
                  <div className="ms-auto flex items-center gap-3">
                    <span className="text-sm font-medium tabular-nums">
                      {formatMoney(lineAgorot, locale)}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      disabled={fields.length === 1}
                      onClick={() => remove(index)}
                      aria-label={tc("delete")}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          className="self-start"
          onClick={() => append({ ...EMPTY_LINE })}
        >
          <Plus className="size-4" />
          {t("addLine")}
        </Button>
      </div>

      {/* Notes + total */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="notes">{t("notes")}</Label>
        <Textarea id="notes" rows={2} {...form.register("notes")} />
      </div>

      <div className="flex items-center justify-between border-t pt-4">
        <span className="text-sm text-muted-foreground">{t("total")}</span>
        <span className="text-xl font-bold tabular-nums">
          {formatMoney(orderTotalAgorot, locale)}
        </span>
      </div>

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
