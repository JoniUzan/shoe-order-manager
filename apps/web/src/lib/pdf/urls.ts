/**
 * The order PDFs' addresses. Kept apart from the loader so the order page's
 * client menu can build them without importing Prisma.
 */

export const PDF_DOCS = ["summary", "production"] as const;
export type PdfDoc = (typeof PDF_DOCS)[number];
export const PDF_LOCALES = ["he", "en"] as const;
export type PdfLocale = (typeof PDF_LOCALES)[number];

/** Where the order page's PDF menu fetches, downloads or opens a file. */
export function orderPdfUrl(
  orderId: string,
  doc: PdfDoc,
  locale: PdfLocale,
  download = false,
): string {
  const params = new URLSearchParams({ doc, lang: locale });
  if (download) params.set("download", "1");
  return `/api/orders/${orderId}/pdf?${params}`;
}

export function orderPdfFileName(doc: PdfDoc, orderNumber: number): string {
  return doc === "summary"
    ? `order-${orderNumber}.pdf`
    : `production-${orderNumber}.pdf`;
}
