"use client";

import {
  computeBalanceAgorot,
  formatMoney,
  shekelsToAgorot,
} from "@repo/domain";
import { Button } from "@repo/ui/components/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@repo/ui/components/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@repo/ui/components/dialog";
import { Input } from "@repo/ui/components/input";
import { Label } from "@repo/ui/components/label";
import { useLocale, useTranslations } from "next-intl";
import { CheckCircle2, Plus, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { useRouter } from "@/i18n/navigation";
import {
  deletePayment,
  markFullyPaid,
  recordPayment,
} from "@/lib/actions/payments";

interface PaymentRow {
  id: string;
  amountAgorot: number;
  paidAt: Date;
  note: string | null;
}

export function PaymentControls({
  orderId,
  totalAgorot,
  paidAgorot,
  payments,
}: {
  orderId: string;
  totalAgorot: number;
  paidAgorot: number;
  payments: PaymentRow[];
}) {
  const t = useTranslations("payments");
  const locale = useLocale();
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [pending, setPending] = useState(false);

  const remaining = computeBalanceAgorot(totalAgorot, paidAgorot);
  const dateFmt = new Intl.DateTimeFormat(locale === "he" ? "he-IL" : "en-US", {
    dateStyle: "medium",
  });

  async function onRecord() {
    const amountAgorot = amount.trim() ? shekelsToAgorot(Number(amount)) : 0;
    if (!(amountAgorot > 0)) {
      toast.error(t("errorAmount"));
      return;
    }
    setPending(true);
    const res = await recordPayment(orderId, amountAgorot, note);
    setPending(false);
    if (res.ok) {
      toast.success(t("recorded"));
      setAmount("");
      setNote("");
      setOpen(false);
      router.refresh();
    } else if (res.error === "too_much") {
      toast.error(t("errorTooMuch"));
    } else {
      toast.error(t("errorGeneric"));
    }
  }

  async function onMarkPaid() {
    setPending(true);
    const res = await markFullyPaid(orderId);
    setPending(false);
    if (res.ok) {
      toast.success(t("recorded"));
      router.refresh();
    } else {
      toast.error(t("errorGeneric"));
    }
  }

  async function onDelete(id: string) {
    const res = await deletePayment(id);
    if (res.ok) {
      toast.success(t("removed"));
      router.refresh();
    } else {
      toast.error(t("errorGeneric"));
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-col gap-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t("total")}</span>
            <span className="tabular-nums">
              {formatMoney(totalAgorot, locale)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t("paid")}</span>
            <span className="tabular-nums">
              {formatMoney(paidAgorot, locale)}
            </span>
          </div>
          <div className="flex justify-between border-t pt-2 text-base font-semibold">
            <span>{t("remaining")}</span>
            <span className="tabular-nums">
              {formatMoney(remaining, locale)}
            </span>
          </div>
        </div>

        {remaining > 0 && (
          <div className="flex flex-wrap gap-2">
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="size-4" />
                  {t("record")}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{t("record")}</DialogTitle>
                  <DialogDescription>
                    {t("remaining")}: {formatMoney(remaining, locale)}
                  </DialogDescription>
                </DialogHeader>
                <div className="flex flex-col gap-4 py-2">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="pay-amount">{t("amount")} (₪)</Label>
                    <Input
                      id="pay-amount"
                      type="number"
                      min="0"
                      step="0.01"
                      dir="ltr"
                      className="text-start"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="pay-note">{t("note")}</Label>
                    <Input
                      id="pay-note"
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={onRecord} disabled={pending}>
                    {t("record")}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Button
              variant="outline"
              size="sm"
              onClick={onMarkPaid}
              disabled={pending}
            >
              <CheckCircle2 className="size-4" />
              {t("markFullyPaid")}
            </Button>
          </div>
        )}

        {payments.length > 0 && (
          <div className="flex flex-col gap-2">
            <p className="text-xs font-medium text-muted-foreground">
              {t("history")}
            </p>
            <ul className="flex flex-col divide-y">
              {payments.map((p) => (
                <li
                  key={p.id}
                  className="flex items-center justify-between gap-2 py-2 text-sm"
                >
                  <div className="flex flex-col">
                    <span className="tabular-nums font-medium">
                      {formatMoney(p.amountAgorot, locale)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {dateFmt.format(p.paidAt)}
                      {p.note ? ` · ${p.note}` : ""}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => onDelete(p.id)}
                    aria-label={t("removed")}
                  >
                    <X className="size-4" />
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
