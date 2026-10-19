"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@repo/ui/components/alert-dialog";
import { Button } from "@repo/ui/components/button";
import { useTranslations } from "next-intl";
import { Trash } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { useRouter } from "@/i18n/navigation";
import { deleteCustomer } from "@/lib/actions/customers";

export function DeleteCustomerButton({
  id,
  name,
}: {
  id: string;
  name: string;
}) {
  const t = useTranslations("customers");
  const tc = useTranslations("common");
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function onConfirm() {
    setPending(true);
    let leaving = false;
    try {
      const res = await deleteCustomer(id);
      if (res.ok) {
        toast.success(t("deleted"));
        leaving = true;
        router.push("/customers");
      } else if (res.error === "has_orders") {
        toast.error(t("errorHasOrders"));
      } else {
        toast.error(t("errorGeneric"));
      }
    } finally {
      // A delete that went through keeps spinning until the list replaces
      // this page.
      if (!leaving) setPending(false);
    }
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Trash className="size-4" />
          {tc("delete")}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("deleteTitle")}</AlertDialogTitle>
          <AlertDialogDescription>
            {t("deleteDescription", { name })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>
            {tc("cancel")}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              // Keep the dialog up until the action resolves, so the spinner
              // shows and a refusal is reported over it.
              e.preventDefault();
              void onConfirm();
            }}
            loading={pending}
            variant="destructive"
          >
            {tc("delete")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
