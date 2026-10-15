"use client";

import { Button } from "@repo/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@repo/ui/components/dropdown-menu";
import {
  ArrowUpRight,
  Check,
  Ellipsis,
  Pencil,
  Printer,
  RotateCcw,
  Trash,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { ConfirmDeleteDialog } from "@/components/data-table/confirm-delete-dialog";
import { Link, useRouter } from "@/i18n/navigation";
import { deleteOrder, setOrderStatus } from "@/lib/actions/orders";
import { orderPdfUrl, type PdfLocale } from "@/lib/pdf/urls";

/**
 * Per-row menu on the orders list: act on an order without leaving the list.
 * Reuses the same actions the detail screen's buttons call.
 */
export function OrderRowActions({
  id,
  orderNumber,
  statusCode,
}: {
  id: string;
  orderNumber: number;
  statusCode: string;
}) {
  const t = useTranslations("orders");
  const td = useTranslations("dashboard");
  const tc = useTranslations("common");
  const router = useRouter();
  const locale = useLocale() as PdfLocale;
  const [pending, startTransition] = useTransition();
  // The dialog is a sibling of the menu, not a child: Radix unmounts menu
  // content on select, which would tear down a trigger nested inside it.
  const [confirming, setConfirming] = useState(false);
  const isDone = statusCode === "done";

  function toggleStatus() {
    startTransition(async () => {
      const res = await setOrderStatus(id, isDone ? "not_done" : "done");
      if (res.ok) {
        toast.success(t("statusUpdated"));
        router.refresh();
      } else {
        toast.error(t("errorGeneric"));
      }
    });
  }

  function confirmDelete() {
    startTransition(async () => {
      const res = await deleteOrder(id);
      if (res.ok) {
        toast.success(t("deleted"));
        setConfirming(false);
        // Stay on the list — unlike the detail screen, there's nowhere to go.
        router.refresh();
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
            <Ellipsis />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuItem asChild>
            <Link href={`/orders/${id}`}>
              <ArrowUpRight />
              {td("openOrder")}
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href={`/orders/${id}/edit`}>
              <Pencil />
              {tc("edit")}
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={toggleStatus} disabled={pending}>
            {isDone ? <RotateCcw /> : <Check />}
            {isDone ? t("markNotDone") : t("markDone")}
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            {/* The Order summary in a new tab, where the browser prints it. */}
            <a href={orderPdfUrl(id, "summary", locale)} target="_blank" rel="noreferrer">
              <Printer />
              {td("print")}
            </a>
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
        description={t("deleteDescription", { number: orderNumber })}
        pending={pending}
        onConfirm={confirmDelete}
      />
    </>
  );
}
