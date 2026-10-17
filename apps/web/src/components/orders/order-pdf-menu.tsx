"use client";

import { Button } from "@repo/ui/components/button";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@repo/ui/components/drawer";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@repo/ui/components/popover";
import { ChevronDown, Download, FileText, Printer, Share2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";

import { Segmented } from "@/components/settings/segmented";
import { useIsPhone } from "@/components/settings/use-is-phone";
import { LOCALE_LABELS } from "@/i18n/routing";
import {
  orderPdfFileName,
  orderPdfUrl,
  PDF_LOCALES,
  type PdfDoc,
  type PdfLocale,
} from "@/lib/pdf/urls";

type Action = "share" | "download" | "print";

/**
 * The order page's PDF button: the Order summary for the Customer or the
 * Production sheet for the factory, each to share, download or print, in a
 * language picked here (the app's by default, never remembered). A popover
 * on a computer, a bottom drawer on a phone. The files come from
 * /api/orders/:id/pdf (ADR 0007).
 */
export function OrderPdfMenu({
  orderId,
  orderNumber,
  summaryShareText,
  customerWhatsAppUrl,
}: {
  orderId: string;
  orderNumber: number;
  /** The WhatsApp caption for the Order summary: what was ordered and what's owed. */
  summaryShareText: string;
  /** A chat with the Customer, for computers that can't share a file. */
  customerWhatsAppUrl: string | null;
}) {
  const t = useTranslations("pdf");
  const tOrders = useTranslations("orders");
  const appLocale = useLocale() as PdfLocale;
  const isPhone = useIsPhone();
  const [open, setOpen] = useState(false);
  const [locale, setLocale] = useState<PdfLocale>(appLocale);
  const [busy, setBusy] = useState<`${PdfDoc}:${Action}` | null>(null);

  function openChange(next: boolean) {
    setOpen(next);
    // A new visit to the menu starts on the app's language again.
    if (next) setLocale(appLocale);
  }

  async function share(doc: PdfDoc) {
    const res = await fetch(orderPdfUrl(orderId, doc, locale));
    if (!res.ok) throw new Error(`pdf ${res.status}`);
    const blob = await res.blob();
    const file = new File([blob], orderPdfFileName(doc, orderNumber), {
      type: "application/pdf",
    });
    const title =
      doc === "summary"
        ? tOrders("orderNumber", { number: orderNumber })
        : `${t("production")} — ${tOrders("orderNumber", { number: orderNumber })}`;

    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title,
          // The Production sheet goes with its title only: nothing about prices.
          text: doc === "summary" ? summaryShareText : title,
        });
      } catch (err) {
        // Closing the share sheet rejects with AbortError: not a failure.
        if ((err as Error).name !== "AbortError") throw err;
      }
      return;
    }
    // Most computers can't share a file: save it, and for the Customer open
    // their chat to attach it in.
    save(URL.createObjectURL(blob), file.name);
    if (doc === "summary" && customerWhatsAppUrl) {
      window.open(customerWhatsAppUrl, "_blank");
      toast.info(t("downloaded"));
    }
  }

  function save(href: string, name: string) {
    const a = document.createElement("a");
    a.href = href;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    if (href.startsWith("blob:")) URL.revokeObjectURL(href);
  }

  async function run(doc: PdfDoc, action: Action) {
    if (action === "print") {
      // The browser's PDF viewer prints the very file that gets sent.
      window.open(orderPdfUrl(orderId, doc, locale), "_blank");
      return setOpen(false);
    }
    if (action === "download") {
      save(
        orderPdfUrl(orderId, doc, locale, true),
        orderPdfFileName(doc, orderNumber),
      );
      return setOpen(false);
    }
    setBusy(`${doc}:share`);
    try {
      await share(doc);
      setOpen(false);
    } catch {
      toast.error(t("shareError"));
    } finally {
      setBusy(null);
    }
  }

  const body = (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm text-muted-foreground">{t("language")}</span>
        <Segmented<PdfLocale>
          name={`pdf-language-${orderId}`}
          label={t("language")}
          value={locale}
          onChange={setLocale}
          labelled
          options={PDF_LOCALES.map((l) => ({
            value: l,
            label: LOCALE_LABELS[l],
          }))}
        />
      </div>
      <DocSection
        title={t("summary")}
        hint={t("summaryHint")}
        doc="summary"
        busy={busy}
        onAction={run}
      />
      <div className="h-px bg-border" />
      <DocSection
        title={t("production")}
        hint={t("productionHint")}
        doc="production"
        busy={busy}
        onAction={run}
      />
    </div>
  );

  const trigger = (
    <Button
      variant="outline"
      size="sm"
      aria-expanded={open}
      onClick={isPhone ? () => openChange(true) : undefined}
      className="aria-expanded:bg-accent"
    >
      <FileText className="size-4" />
      {t("menu")}
      <ChevronDown className="size-4" />
    </Button>
  );

  if (isPhone) {
    return (
      <>
        {trigger}
        <Drawer open={open} onOpenChange={openChange}>
          <DrawerContent>
            <DrawerHeader className="text-start">
              <DrawerTitle>{t("menu")}</DrawerTitle>
            </DrawerHeader>
            <div className="px-4 pb-8">{body}</div>
          </DrawerContent>
        </Drawer>
      </>
    );
  }

  return (
    <Popover open={open} onOpenChange={openChange}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent align="end" className="w-[22rem] rounded-2xl p-4">
        {body}
      </PopoverContent>
    </Popover>
  );
}

function DocSection({
  title,
  hint,
  doc,
  busy,
  onAction,
}: {
  title: string;
  hint: string;
  doc: PdfDoc;
  busy: string | null;
  onAction: (doc: PdfDoc, action: Action) => void;
}) {
  const t = useTranslations("pdf");
  const actions: { action: Action; label: string; icon: ReactNode }[] = [
    { action: "share", label: t("share"), icon: <Share2 /> },
    { action: "download", label: t("download"), icon: <Download /> },
    { action: "print", label: t("print"), icon: <Printer /> },
  ];

  return (
    <section aria-label={title} className="flex flex-col gap-2.5">
      <div>
        <h3 className="text-[15px] font-semibold">{title}</h3>
        <p className="text-sm text-muted-foreground">{hint}</p>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {actions.map(({ action, label, icon }) => {
          const pending = busy === `${doc}:${action}`;
          return (
            <Button
              key={action}
              type="button"
              variant="outline"
              loading={pending}
              loadingLabel={t("generating")}
              disabled={busy !== null}
              onClick={() => onAction(doc, action)}
              className="h-14 flex-col gap-1 text-[13px] [&_svg]:size-[18px]"
            >
              {icon}
              {label}
            </Button>
          );
        })}
      </div>
    </section>
  );
}
