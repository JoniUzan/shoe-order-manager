import type { SizePairs } from "@repo/domain";
import { Text, View } from "@react-pdf/renderer";
import type { ReactNode } from "react";

import { HAIRLINE, RULE, styles, type Directional } from "./theme";

export interface Business {
  businessName: string | null;
  businessAddress: string | null;
  businessPhone: string | null;
  businessTaxId: string | null;
}

/** A translator bound to the `pdf` namespace in the PDF's language. */
export type PdfT = (
  key: string,
  values?: Record<string, string | number>,
) => string;

const HEBREW = /[\u0590-\u05ff]/;
const LATIN = /[a-z]/i;

/**
 * A user-typed value's own direction: that of its first letter, as the
 * Unicode bidi algorithm would pick for a paragraph of it alone. The PDF's
 * language only decides where the value is aligned.
 */
export function textDirection(text: string): "rtl" | "ltr" {
  for (const ch of text) {
    if (HEBREW.test(ch)) return "rtl";
    if (LATIN.test(ch)) return "ltr";
  }
  return "ltr";
}

/** Style for a user-typed value, aligned to the document's start (or end). */
export function valueStyle(d: Directional, text: string, end = false) {
  return {
    direction: textDirection(text),
    textAlign: d.rtl !== end ? ("right" as const) : ("left" as const),
  };
}

/**
 * Fence a user-typed value inside a translated line ("7 cartons × {name}",
 * "Customer: {name}") with the document's direction mark. Without it, a
 * Hebrew pack name in an English line pulls the number after it into its own
 * run ("7 cartons × 3 + סדרה א loose pairs"), and a Latin one does the same
 * in Hebrew. Unicode isolates would be the textbook fix, but react-pdf draws
 * FSI/PDI as stray glyphs; LRM/RLM it lays out invisibly.
 */
export function mark(d: Directional, value: string): string {
  const m = d.rtl ? "\u200f" : "\u200e";
  return `${m}${value}${m}`;
}

/**
 * Business details at the start, the document's own title block at the end.
 * The tax ID belongs on the Order summary only.
 */
export function Header({
  d,
  t,
  business,
  appName,
  showTaxId,
  children,
}: {
  d: Directional;
  t: PdfT;
  business: Business;
  /** Stands in for the business name until the User fills it in. */
  appName: string;
  showTaxId: boolean;
  children: ReactNode;
}) {
  return (
    <View style={[styles.headerRule, { flexDirection: d.row }]}>
      <View style={{ gap: 2 }}>
        <Text
          style={[
            styles.title,
            valueStyle(d, business.businessName ?? appName),
          ]}
        >
          {business.businessName ?? appName}
        </Text>
        {business.businessAddress && (
          <Text style={[styles.muted, valueStyle(d, business.businessAddress)]}>
            {business.businessAddress}
          </Text>
        )}
        {/* A phone number reads left to right even in a Hebrew header. */}
        {business.businessPhone && (
          <Text style={[styles.muted, { textAlign: d.rtl ? "right" : "left" }]}>
            {business.businessPhone}
          </Text>
        )}
        {showTaxId && business.businessTaxId && (
          <Text style={[styles.muted, d.text]}>
            {t("taxId")}: {business.businessTaxId}
          </Text>
        )}
      </View>
      <View style={{ gap: 2, alignItems: d.end }}>{children}</View>
    </View>
  );
}

/** Pairs per size, one box each, sizes ascending left to right in both languages. */
export function SizeBoxes({
  d,
  sizes,
}: {
  d: Directional;
  sizes: SizePairs[];
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 3,
        justifyContent: d.start,
      }}
    >
      {sizes.map((s) => (
        <View key={s.size} style={styles.box}>
          <Text style={styles.boxSize}>{s.size}</Text>
          <Text style={styles.boxPairs}>{s.pairs}</Text>
        </View>
      ))}
    </View>
  );
}

/** A table cell: a fixed share of the row, or the rest of it. */
export function Cell({
  width,
  align,
  children,
}: {
  width?: string;
  align?: "start" | "center" | "end";
  children: ReactNode;
}) {
  return (
    <View
      style={[
        width ? { width } : { flexGrow: 1, flexBasis: 0 },
        { paddingHorizontal: 3 },
        align === "center" ? { alignItems: "center" } : {},
      ]}
    >
      {children}
    </View>
  );
}

export function Footer({
  d,
  t,
  left,
}: {
  d: Directional;
  t: PdfT;
  left: string;
}) {
  return (
    <View fixed style={[styles.footer, { flexDirection: d.row }]}>
      <Text style={d.text}>{left}</Text>
      <Text
        style={d.text}
        render={({ pageNumber, totalPages }) =>
          t("page", { page: pageNumber, total: totalPages })
        }
      />
    </View>
  );
}

export function Note({
  d,
  label,
  text,
  boxed,
}: {
  d: Directional;
  label: string;
  text: string;
  boxed?: boolean;
}) {
  return (
    <View
      wrap={false}
      style={[
        { gap: 4, marginTop: 21 },
        boxed
          ? { padding: 12, borderWidth: 1, borderColor: RULE, borderRadius: 9 }
          : { paddingTop: 12, borderTopWidth: 1, borderTopColor: HAIRLINE },
      ]}
    >
      <Text style={[styles.label, d.text]}>{label}</Text>
      <Text style={valueStyle(d, text)}>{text}</Text>
    </View>
  );
}
