import { renderToBuffer } from "@react-pdf/renderer";
import { getTranslations } from "next-intl/server";

import { auth } from "@/lib/auth";
import { OrderSummaryPdf } from "@/lib/pdf/order-summary-pdf";
import { loadOrderPdfData } from "@/lib/pdf/order-pdf-data";
import { ProductionSheetPdf } from "@/lib/pdf/production-sheet-pdf";
import {
  orderPdfFileName,
  PDF_DOCS,
  PDF_LOCALES,
  type PdfDoc,
  type PdfLocale,
} from "@/lib/pdf/urls";

/**
 * GET /api/orders/:id/pdf?doc=summary|production&lang=he|en[&download=1]
 *
 * One order's Order summary or Production sheet as a real PDF (ADR 0007).
 * Outside `[locale]` because the file's language is the menu's choice, not
 * the app's; scoped by `ownerId` like every read (ADR 0003).
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) return new Response(null, { status: 401 });

  const { id } = await params;
  const search = new URL(request.url).searchParams;
  const doc = search.get("doc");
  const lang = search.get("lang");
  if (
    !PDF_DOCS.includes(doc as PdfDoc) ||
    !PDF_LOCALES.includes(lang as PdfLocale)
  ) {
    return new Response(null, { status: 400 });
  }

  const data = await loadOrderPdfData(session.user.id, id, lang as PdfLocale);
  if (!data) return new Response(null, { status: 404 });

  const [t, ta] = await Promise.all([
    getTranslations({ locale: lang as PdfLocale, namespace: "pdf" }),
    getTranslations({ locale: lang as PdfLocale, namespace: "app" }),
  ]);
  const props = { data, t, appName: ta("name") };
  const file = await renderToBuffer(
    doc === "summary" ? (
      <OrderSummaryPdf {...props} />
    ) : (
      <ProductionSheetPdf {...props} />
    ),
  );

  const disposition = search.get("download") === "1" ? "attachment" : "inline";
  return new Response(new Uint8Array(file), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${disposition}; filename="${orderPdfFileName(doc as PdfDoc, data.orderNumber)}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
