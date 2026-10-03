import path from "node:path";

import { Font, StyleSheet } from "@react-pdf/renderer";

/**
 * Fonts and styles shared by the order PDFs (ADR 0007).
 *
 * Rubik carries Hebrew, Latin, ₪ and × in one family, so a mixed line never
 * falls back to a second font. The weights are static instances cut from
 * Google Fonts' variable Rubik (OFL, see fonts/OFL.txt): react-pdf picks a
 * weight by file, not by variation axis.
 */
const FONTS = path.join(process.cwd(), "src/lib/pdf/fonts");

Font.register({
  family: "Rubik",
  fonts: [
    { src: path.join(FONTS, "Rubik-Regular.ttf"), fontWeight: 400 },
    { src: path.join(FONTS, "Rubik-Medium.ttf"), fontWeight: 500 },
    { src: path.join(FONTS, "Rubik-SemiBold.ttf"), fontWeight: 600 },
  ],
});
// Hyphenating "Production" into "Produc-tion" helps no one on an A4 page.
Font.registerHyphenationCallback((word) => [word]);

/** The app's ink tokens, flattened onto white paper (react-pdf has no oklch). */
export const INK = "#091717";
export const MUTED = "#495251";
export const RULE = "#b5b9b9";
export const HAIRLINE = "#e1e3e3";
export const BOX = "#c2c5c5";
/** The size band: ink at 6% on white. */
export const SHADE = "#f0f1f1";

/**
 * Direction-aware pieces. react-pdf runs the Unicode bidi algorithm per Text,
 * but its base direction defaults to LTR: a Hebrew line starting with a
 * number ("2 קרטונים") or ending in "₪" comes out scrambled unless the Text
 * says `direction: "rtl"`. Rows don't mirror on their own either, so RTL
 * rows are `row-reverse`.
 */
export function directional(rtl: boolean) {
  return {
    rtl,
    row: rtl ? ("row-reverse" as const) : ("row" as const),
    text: rtl
      ? ({ direction: "rtl", textAlign: "right" } as const)
      : ({} as const),
    /** Text pinned to the line's end: left in Hebrew, right in English. */
    endText: rtl
      ? ({ direction: "rtl", textAlign: "left" } as const)
      : ({ textAlign: "right" } as const),
    /** Flex items pushed to the reading end of a row. */
    start: rtl ? ("flex-end" as const) : ("flex-start" as const),
    end: rtl ? ("flex-start" as const) : ("flex-end" as const),
  };
}

export type Directional = ReturnType<typeof directional>;

/** Intl's Hebrew output carries bidi marks Rubik has no glyph for. */
export function clean(text: string): string {
  return text.replace(/[‎‏؜]/g, "");
}

export const styles = StyleSheet.create({
  page: {
    fontFamily: "Rubik",
    fontSize: 10.5,
    color: INK,
    paddingTop: 42,
    paddingBottom: 56,
    paddingHorizontal: 42,
    backgroundColor: "#ffffff",
  },
  muted: { color: MUTED },
  /** A row's Product image. */
  thumb: {
    width: 34,
    height: 34,
    borderRadius: 4,
    borderWidth: 0.75,
    borderColor: HAIRLINE,
    objectFit: "cover",
  },
  label: { fontSize: 9, fontWeight: 600, color: MUTED },
  title: { fontSize: 16.5, fontWeight: 600 },
  headerRule: {
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingBottom: 15,
    marginBottom: 21,
    borderBottomWidth: 1,
    borderBottomColor: RULE,
  },
  th: {
    paddingVertical: 6,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: RULE,
  },
  tr: {
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: HAIRLINE,
    alignItems: "center",
  },
  grid: {
    borderWidth: 1,
    borderColor: BOX,
    borderRadius: 4,
    overflow: "hidden",
  },
  gridRow: { alignItems: "stretch" },
  gridHead: {
    backgroundColor: SHADE,
    borderBottomWidth: 1,
    borderBottomColor: BOX,
  },
  gridLabel: {
    width: 28,
    paddingVertical: 3,
    paddingHorizontal: 4,
    fontSize: 7.5,
    color: MUTED,
  },
  gridCell: {
    width: 24,
    paddingVertical: 3,
    textAlign: "center",
  },
  gridSize: { fontSize: 9, fontWeight: 500, color: MUTED },
  gridPairs: { fontSize: 11, fontWeight: 600 },
  footer: {
    position: "absolute",
    bottom: 28,
    left: 42,
    right: 42,
    justifyContent: "space-between",
    fontSize: 9,
    color: MUTED,
  },
});
