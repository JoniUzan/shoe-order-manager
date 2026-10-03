"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { customerSchema, type CustomerInput } from "@repo/domain";
import { Button } from "@repo/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@repo/ui/components/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@repo/ui/components/drawer";
import { useIsMobile } from "@repo/ui/hooks/use-mobile";
import { cn } from "@repo/ui/lib/utils";
import { CheckIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState, type FormEvent } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { CustomerFields, EMPTY_CUSTOMER } from "@/components/customers/customer-fields";
import { roomy } from "@/components/step-form/roomy";
import { createCustomer } from "@/lib/actions/customers";

export interface CreatedCustomer {
  id: string;
  name: string;
  phone: string | null;
  address: string | null;
}

/**
 * A new Customer without leaving the page (the order form's Customer step):
 * a dialog on a computer, a bottom sheet on a phone. Saving creates the
 * Customer and hands it back; the page underneath keeps everything typed.
 */
export function NewCustomerSheet({
  open,
  onOpenChange,
  defaultName,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Starts the name, e.g. from what was typed in a search that found nothing. */
  defaultName?: string;
  onCreated: (customer: CreatedCustomer) => void;
}) {
  const t = useTranslations("customers");
  const tc = useTranslations("common");
  const isPhone = useIsMobile();
  const [pending, setPending] = useState(false);

  const form = useForm<CustomerInput>({
    resolver: zodResolver(customerSchema),
    defaultValues: EMPTY_CUSTOMER,
  });

  // Each opening starts afresh.
  useEffect(() => {
    if (open) form.reset({ ...EMPTY_CUSTOMER, name: defaultName ?? "" });
  }, [open, defaultName, form]);

  async function save(values: CustomerInput) {
    setPending(true);
    const res = await createCustomer(values);
    setPending(false);
    if (!res.ok) {
      toast.error(t("errorGeneric"));
      return;
    }
    toast.success(t("created"));
    const clean = (s?: string) => s?.trim() || null;
    onCreated({
      id: res.id,
      name: values.name.trim(),
      phone: clean(values.phone),
      address: clean(values.address),
    });
    onOpenChange(false);
  }

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    // The sheet is portalled out of the order's <form> in the page, but not
    // out of React's tree: without this the submit would reach the order
    // form too, and continue it.
    e.stopPropagation();
    void form.handleSubmit(save)(e);
  }

  const body = (
    <form
      onSubmit={onSubmit}
      noValidate
      className="flex min-h-0 flex-col gap-6 @container"
    >
      {/* Inset by the focus ring, so the scroll box doesn't clip it. */}
      <div className={cn("min-h-0 overflow-y-auto px-4 py-1 md:-mx-1 md:px-1", roomy.scrollbar)}>
        <CustomerFields form={form} idPrefix="new-customer-" />
      </div>
      <div className="flex gap-2.5 border-t px-4 pt-3 pb-[max(1.5rem,env(safe-area-inset-bottom))] md:justify-end md:gap-3 md:border-0 md:p-0">
        <Button
          type="button"
          variant="outline"
          disabled={pending}
          onClick={() => onOpenChange(false)}
          className={cn(roomy.button, roomy.raised, "hidden md:inline-flex")}
        >
          {tc("cancel")}
        </Button>
        <Button
          type="submit"
          disabled={pending}
          className={cn(roomy.button, "flex-1 md:min-w-40 md:flex-none")}
        >
          <CheckIcon className="size-4.5" aria-hidden />
          {t("saveCustomer")}
        </Button>
      </div>
    </form>
  );

  if (isPhone) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="max-h-[88dvh]">
          <DrawerHeader className="px-4 pt-3 pb-4 text-start">
            <DrawerTitle className="text-[1.0625rem]">{t("new")}</DrawerTitle>
            <DrawerDescription className="text-[0.8125rem]">
              {t("formHint")}
            </DrawerDescription>
          </DrawerHeader>
          {body}
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-4rem)] grid-rows-[auto_minmax(0,1fr)] gap-6 rounded-card bg-card p-8 sm:max-w-2xl">
        <DialogHeader className="gap-1">
          <DialogTitle className="text-2xl font-semibold">{t("new")}</DialogTitle>
          <DialogDescription className="text-base">{t("formHint")}</DialogDescription>
        </DialogHeader>
        {body}
      </DialogContent>
    </Dialog>
  );
}
