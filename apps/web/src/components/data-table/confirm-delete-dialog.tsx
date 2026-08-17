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
import { useTranslations } from "next-intl";

/**
 * The "are you sure" a row menu puts in front of a delete.
 *
 * Mount it as a *sibling* of the menu, not inside it: Radix unmounts menu
 * content on select, which would tear down a trigger nested in it. That is why
 * this takes `open`/`onOpenChange` instead of owning a trigger.
 */
export function ConfirmDeleteDialog({
  open,
  onOpenChange,
  title,
  description,
  pending,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  /** Keeps both buttons disabled while the action is in flight. */
  pending: boolean;
  onConfirm: () => void;
}) {
  const tc = useTranslations("common");

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>{tc("cancel")}</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              // Keep the dialog up until the action resolves — it is the only
              // thing on screen that can report a refusal.
              e.preventDefault();
              onConfirm();
            }}
            disabled={pending}
            variant="destructive"
          >
            {tc("delete")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
