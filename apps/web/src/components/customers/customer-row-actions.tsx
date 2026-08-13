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
} from "@repo/ui/components/alert-dialog";
import { Button } from "@repo/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@repo/ui/components/dropdown-menu";
import { ArrowUpRight, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Link, useRouter } from "@/i18n/navigation";
import { deleteCustomer } from "@/lib/actions/customers";

/**
 * Per-row menu on the customers list: act on a customer without leaving the
 * list. Deleting one that still has orders is refused by the action, and the
 * row stays put — the same rule the detail screen's delete button follows.
 */
export function CustomerRowActions({ id, name }: { id: string; name: string }) {
  const t = useTranslations("customers");
  const tc = useTranslations("common");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  // The dialog is a sibling of the menu, not a child: Radix unmounts menu
  // content on select, which would tear down a trigger nested inside it.
  const [confirming, setConfirming] = useState(false);

  function confirmDelete() {
    startTransition(async () => {
      const res = await deleteCustomer(id);
      if (res.ok) {
        toast.success(t("deleted"));
        setConfirming(false);
        // Stay on the list — unlike the detail screen, there's nowhere to go.
        router.refresh();
      } else if (res.error === "has_orders") {
        toast.error(t("errorHasOrders"));
      } else {
        toast.error(t("errorGeneric"));
      }
    });
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            // Grow the thumb target to ~44px without redrawing the control.
            className="relative size-8 text-muted-foreground before:absolute before:-inset-1.5 before:content-[''] data-[state=open]:bg-accent"
            aria-label={tc("actions")}
          >
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuItem asChild>
            <Link href={`/customers/${id}`}>
              <ArrowUpRight />
              {t("openCustomer")}
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href={`/customers/${id}/edit`}>
              <Pencil />
              {tc("edit")}
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onSelect={(e) => {
              e.preventDefault();
              setConfirming(true);
            }}
          >
            <Trash2 />
            {tc("delete")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={confirming} onOpenChange={setConfirming}>
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
                // Keep the dialog up until the action resolves.
                e.preventDefault();
                confirmDelete();
              }}
              disabled={pending}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {tc("delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
