"use client";

import { Button } from "@repo/ui/components/button";
import { useTranslations } from "next-intl";
import { MessageCircle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

/**
 * Generates a PDF from the already-rendered invoice DOM (so Hebrew/RTL render
 * perfectly) and shares it as a file via the Web Share API — on a phone this
 * opens the share sheet, and picking WhatsApp attaches the PDF. Where file
 * sharing isn't supported (most desktops), it downloads the PDF and opens the
 * text WhatsApp link as a fallback.
 */
export function ShareOrderButton({
  targetId,
  fileName,
  shareTitle,
  shareText,
  fallbackWaUrl,
  label,
}: {
  targetId: string;
  fileName: string;
  shareTitle: string;
  shareText: string;
  fallbackWaUrl: string | null;
  label: string;
}) {
  const t = useTranslations("share");
  const [busy, setBusy] = useState(false);

  async function buildPdfBlob(): Promise<Blob> {
    const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
      import("html2canvas-pro"),
      import("jspdf"),
    ]);
    const el = document.getElementById(targetId);
    if (!el) throw new Error("invoice element not found");

    const canvas = await html2canvas(el, {
      scale: 2,
      backgroundColor: "#ffffff",
    });
    // JPEG keeps the file small (a few hundred KB) — fine for a white invoice.
    const imgData = canvas.toDataURL("image/jpeg", 0.92);

    const pdf = new jsPDF({ unit: "pt", format: "a4" });
    const margin = 24;
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const usableW = pageW - margin * 2;
    const imgH = (canvas.height * usableW) / canvas.width;

    let heightLeft = imgH;
    let position = margin;
    pdf.addImage(imgData, "JPEG", margin, position, usableW, imgH);
    heightLeft -= pageH - margin * 2;
    while (heightLeft > 0) {
      pdf.addPage();
      position = margin - (imgH - heightLeft);
      pdf.addImage(imgData, "JPEG", margin, position, usableW, imgH);
      heightLeft -= pageH - margin * 2;
    }
    return pdf.output("blob");
  }

  async function onShare() {
    setBusy(true);
    try {
      const blob = await buildPdfBlob();
      const file = new File([blob], fileName, { type: "application/pdf" });

      const canShareFile =
        typeof navigator !== "undefined" &&
        typeof navigator.canShare === "function" &&
        navigator.canShare({ files: [file] });

      if (canShareFile) {
        await navigator.share({ files: [file], title: shareTitle, text: shareText });
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        if (fallbackWaUrl) window.open(fallbackWaUrl, "_blank");
        toast.info(t("pdfFallback"));
      }
    } catch (err) {
      // The user dismissing the share sheet rejects with AbortError — ignore.
      if ((err as Error)?.name !== "AbortError") {
        toast.error(t("shareError"));
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button type="button" onClick={onShare} disabled={busy} size="sm">
      <MessageCircle className="size-4" />
      {busy ? t("generating") : label}
    </Button>
  );
}
