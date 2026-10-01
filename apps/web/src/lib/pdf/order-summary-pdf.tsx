import {
  buildOrderSummaryRows,
  computeOwedAgorot,
  formatMoney,
  type SummaryRow,
} from "@repo/domain";
import { Document, Page, Text, View } from "@react-pdf/renderer";

import {
  Cell,
  Footer,
  Header,
  mark,
  Note,
  SizeGrid,
  valueStyle,
  type PdfT,
} from "./parts";
import type { OrderPdfData } from "./order-pdf-data";
import { clean, directional, RULE, styles, type Directional } from "./theme";

/**
 * The Order summary (סיכום הזמנה): the Customer's copy of an order. One row
 * per model, color and unit price, pairs added up per size, and the cartons
 * each row is made of spelled out under it.
 */
export function OrderSummaryPdf({
  data,
  t,
  appName,
}: {
  data: OrderPdfData;
  t: PdfT;
  appName: string;
}) {
  const d = directional(data.locale === "he");
  const money = (agorot: number) => clean(formatMoney(agorot, data.locale));
  const summary = buildOrderSummaryRows(data.items, data.packs);
  const orderLabel = t("orderNumber", { number: data.orderNumber });
  // An order where no line has a color doesn't get an empty Color column.
  const hasColor = summary.rows.some((r) => r.color);

  return (
    <Document title={orderLabel} language={data.locale}>
      <Page size="A4" style={styles.page}>
        <Header
          d={d}
          t={t}
          business={data.business}
          appName={appName}
          showTaxId
        >
          <Text style={[styles.title, d.endText]}>{orderLabel}</Text>
          <Text style={[styles.muted, d.endText]}>{clean(data.date)}</Text>
        </Header>

        <View style={{ gap: 2, marginBottom: 21 }}>
          <Text style={[styles.label, d.text]}>{t("customer")}</Text>
          <Text
            style={[
              { fontSize: 11.5, fontWeight: 500 },
              valueStyle(d, data.customer.name),
            ]}
          >
            {data.customer.name}
          </Text>
          {data.customer.contactName && (
            <Text style={valueStyle(d, data.customer.contactName)}>
              {data.customer.contactName}
            </Text>
          )}
          {data.customer.phone && (
            <Text style={{ textAlign: d.rtl ? "right" : "left" }}>
              {data.customer.phone}
            </Text>
          )}
          {data.customer.address && (
            <Text style={valueStyle(d, data.customer.address)}>
              {data.customer.address}
            </Text>
          )}
        </View>

        <View style={[styles.th, { flexDirection: d.row }]}>
          <Cell width={COLS.item}>
            <Text style={[styles.label, d.text]}>{t("item")}</Text>
          </Cell>
          {hasColor && (
            <Cell width={COLS.color}>
              <Text style={[styles.label, d.text]}>{t("color")}</Text>
            </Cell>
          )}
          <Cell>
            <Text style={[styles.label, d.text]}>{t("sizes")}</Text>
          </Cell>
          <Cell width={COLS.pairs} align="center">
            <Text style={styles.label}>{t("pairs")}</Text>
          </Cell>
          <Cell width={COLS.unit}>
            <Text style={[styles.label, d.endText]}>{t("unitPrice")}</Text>
          </Cell>
          <Cell width={COLS.total}>
            <Text style={[styles.label, d.endText]}>{t("lineTotal")}</Text>
          </Cell>
        </View>

        {summary.rows.map((row, i) => (
          <SummaryLine
            key={i}
            d={d}
            t={t}
            row={row}
            money={money}
            hasColor={hasColor}
          />
        ))}

        <View
          style={[styles.tr, { flexDirection: d.row, borderBottomWidth: 0 }]}
          wrap={false}
        >
          <Cell width={hasColor ? COLS.itemAndColor : COLS.item}>
            <Text style={[{ fontWeight: 600 }, d.text]}>{t("total")}</Text>
          </Cell>
          <Cell>
            <Text style={[styles.muted, d.text]}>
              {summary.cartons > 0
                ? t("cartons", { count: summary.cartons })
                : ""}
            </Text>
          </Cell>
          <Cell width={COLS.pairs} align="center">
            <Text style={{ fontWeight: 600 }}>{summary.pairs}</Text>
          </Cell>
          <Cell width={COLS.money}>
            <Text> </Text>
          </Cell>
        </View>

        <View wrap={false} style={{ alignItems: d.end, marginTop: 6 }}>
          <View style={{ width: 195, gap: 5 }}>
            <TotalLine
              d={d}
              label={t("total")}
              value={money(data.totalAgorot)}
            />
            {data.depositAgorot > 0 && (
              <TotalLine
                d={d}
                label={t("paid")}
                value={money(data.depositAgorot)}
              />
            )}
            <View
              style={{ borderTopWidth: 1, borderTopColor: RULE, paddingTop: 6 }}
            >
              <TotalLine
                d={d}
                strong
                label={t("remaining")}
                value={money(
                  computeOwedAgorot(data.totalAgorot, data.depositAgorot),
                )}
              />
            </View>
          </View>
        </View>

        {data.notes && <Note d={d} label={t("notes")} text={data.notes} />}

        <Footer
          d={d}
          t={t}
          left={`${mark(d, data.business.businessName ?? appName)} · ${orderLabel}`}
        />
      </Page>
    </Document>
  );
}

/**
 * Column widths. The money columns fit "₪ 2,147,483.47" on one line: react-pdf
 * can't be told not to wrap, and a squeezed amount breaks inside the number
 * with a hyphen ("21,450.00-" / "₪").
 */
const COLS = {
  item: "18%",
  color: "9%",
  itemAndColor: "27%",
  pairs: "7%",
  unit: "14%",
  total: "17%",
  money: "31%",
};

function SummaryLine({
  d,
  t,
  row,
  money,
  hasColor,
}: {
  d: Directional;
  t: PdfT;
  row: SummaryRow;
  money: (agorot: number) => string;
  hasColor: boolean;
}) {
  // "2 cartons × Pack A · 1 carton × Pack B + 3 loose pairs"
  const cartons =
    row.packs.length > 0
      ? [
          row.packs
            .map((p) =>
              t("cartonLine", { count: p.count, name: mark(d, p.name) }),
            )
            .join(" · "),
          row.loosePairs > 0 ? t("looseLine", { count: row.loosePairs }) : null,
        ]
          .filter(Boolean)
          .join(" + ")
      : null;

  return (
    <View style={[styles.tr, { flexDirection: d.row }]} wrap={false}>
      <Cell width={COLS.item}>
        <View
          style={{
            flexDirection: d.row,
            flexWrap: "wrap",
            alignItems: "center",
            gap: 4,
          }}
        >
          <Text style={[{ fontWeight: 500 }, valueStyle(d, row.name)]}>
            {row.name}
          </Text>
          {row.custom && (
            <View
              style={{
                borderWidth: 1,
                borderColor: RULE,
                borderRadius: 8,
                paddingHorizontal: 4,
              }}
            >
              <Text
                style={[{ fontSize: 8, fontWeight: 500 }, styles.muted, d.text]}
              >
                {t("custom")}
              </Text>
            </View>
          )}
        </View>
      </Cell>
      {hasColor && (
        <Cell width={COLS.color}>
          <Text style={valueStyle(d, row.color ?? "")}>{row.color ?? ""}</Text>
        </Cell>
      )}
      <Cell>
        <SizeGrid d={d} t={t} sizes={row.sizes} columns={hasColor ? 6 : 7} />
        {cartons && (
          <Text style={[{ fontSize: 9, marginTop: 3 }, styles.muted, d.text]}>
            {cartons}
          </Text>
        )}
      </Cell>
      <Cell width={COLS.pairs} align="center">
        <Text>{row.pairs}</Text>
      </Cell>
      <Cell width={COLS.unit}>
        <Text style={d.endText}>{money(row.unitPriceAgorot)}</Text>
      </Cell>
      <Cell width={COLS.total}>
        <Text style={d.endText}>{money(row.totalAgorot)}</Text>
      </Cell>
    </View>
  );
}

function TotalLine({
  d,
  label,
  value,
  strong,
}: {
  d: Directional;
  label: string;
  value: string;
  strong?: boolean;
}) {
  const style = strong ? { fontSize: 12, fontWeight: 600 } : {};
  return (
    <View style={{ flexDirection: d.row, justifyContent: "space-between" }}>
      <Text style={[strong ? {} : styles.muted, style, d.text]}>{label}</Text>
      <Text style={[style, d.text]}>{value}</Text>
    </View>
  );
}
