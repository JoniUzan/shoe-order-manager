"use client";

import { Button } from "@repo/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@repo/ui/components/dropdown-menu";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { ConfirmDeleteDialog } from "@/components/data-table/confirm-delete-dialog";
import { Link, useRouter } from "@/i18n/navigation";
import { deleteShoeModel } from "@/lib/actions/catalog";

/**
 * Per-row menu on the catalog list: act on a model without leaving the list.
 * Two items rather than the customers list's three — a model has no detail
 * screen, so editing it is the only place to open.
 *
 * Deleting one that is used in an order is refused by the action and the row
 * stays put. The Delete item stays enabled even when the row shows order lines:
 * the action is the authority on that, and letting you press it is what puts
 * the reason on screen.
 */
export function ModelRowActions({ id, name }: { id: string; name: string }) {
  const t = useTranslations("catalog");
  const tc = useTranslations("common");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  // The dialog is a sibling of the menu, not a child: Radix unmounts menu
  // content on select, which would tear down a trigger nested inside it.
  const [confirming, setConfirming] = useState(false);

  function confirmDelete() {
    startTransition(async () => {
      const res = await deleteShoeModel(id);
      if (res.ok) {
        toast.success(t("deleted"));
        setConfirming(false);
        router.refresh();
      } else if (res.error === "in_use") {
        toast.error(t("errorInUse"));
      } else {
        toast.error(t("errorGeneric"));
      }
    });
  }

  return (
    <>
      {/* Not modal — see the note in customer-row-actions.tsx: a modal menu
          closing into a dialog leaves the page inert once the dialog closes. */}
      <DropdownMenu modal={false}>
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
            <Link href={`/catalog/${id}/edit`}>
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
