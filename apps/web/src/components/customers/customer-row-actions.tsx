"use client";

import { Button } from "@repo/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@repo/ui/components/dropdown-menu";
import { ArrowUpRight, Ellipsis, Pencil, Trash } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { ConfirmDeleteDialog } from "@/components/data-table/confirm-delete-dialog";
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
      {/* Not modal: a modal menu locks the page while it is open and hands the
          lock back when it closes. Selecting Delete closes it and opens the
          dialog in the same tick, and the two undo each other's cleanup —
          leaving the page inert (body pointer-events: none) after the dialog
          goes away. A row menu has nothing to gain from modality anyway. */}
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            // Grow the thumb target to ~44px without redrawing the control.
            className="relative size-8 text-muted-foreground before:absolute before:-inset-1.5 before:content-[''] data-[state=open]:bg-accent"
            aria-label={tc("actions")}
          >
            <Ellipsis />
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
            <Trash />
            {tc("delete")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ConfirmDeleteDialog
        open={confirming}
        onOpenChange={setConfirming}
        title={t("deleteTitle")}
        description={t("deleteDescription", { name })}
        pending={pending}
        onConfirm={confirmDelete}
      />
    </>
  );
}
