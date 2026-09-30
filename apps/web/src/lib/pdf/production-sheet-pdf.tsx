import { buildProductionRows } from "@repo/domain";
import { Document, Page, Text, View } from "@react-pdf/renderer";

import {
  Cell,
  Footer,
  Header,
  mark,
  Note,
  SizeBoxes,
  valueStyle,
  type PdfT,
} from "./parts";
import type { OrderPdfData } from "./order-pdf-data";
import { clean, directional, styles } from "./theme";

/**
 * The Production sheet (דף ייצור): an order as sent to the factory. One row
 * per model and color with pairs per size. Deliberately absent: packs, every
 * price and total, payments, the regular notes, and everything about the
 * Customer but their name.
 */
export function ProductionSheetPdf({
  data,
  t,
  appName,
}: {
  data: OrderPdfData;
  t: PdfT;
  appName: string;
}) {
  const d = directional(data.locale === "he");
  const { rows, pairs } = buildProductionRows(data.items);
  // An order where no line has a color doesn't get an empty Color column.
  const hasColor = rows.some((r) => r.color);
  const title = t("production");
  const orderLabel = t("orderNumber", { number: data.orderNumber });

  return (
    <Document title={`${title} · ${orderLabel}`} language={data.locale}>
      <Page size="A4" style={styles.page}>
        <Header
          d={d}
          t={t}
          business={data.business}
          appName={appName}
          showTaxId={false}
        >
          <Text style={[styles.title, d.endText]}>{title}</Text>
          <Text style={[styles.muted, d.endText]}>
            {orderLabel} · {clean(data.date)}
          </Text>
          <Text style={d.endText}>
            {t("customerLine", { name: mark(d, data.customer.name) })}
          </Text>
        </Header>

        <View style={[styles.th, { flexDirection: d.row }]}>
          <Cell width="24%">
            <Text style={[styles.label, d.text]}>{t("model")}</Text>
          </Cell>
          {hasColor && (
            <Cell width="12%">
              <Text style={[styles.label, d.text]}>{t("color")}</Text>
            </Cell>
          )}
          <Cell>
            <Text style={[styles.label, d.text]}>{t("sizes")}</Text>
          </Cell>
          <Cell width="10%" align="center">
            <Text style={styles.label}>{t("pairs")}</Text>
          </Cell>
        </View>

        {rows.map((row, i) => (
          <View
            key={i}
            style={[styles.tr, { flexDirection: d.row }]}
            wrap={false}
          >
            <Cell width="24%">
              <Text style={[{ fontWeight: 500 }, valueStyle(d, row.name)]}>
                {row.name}
              </Text>
              {row.custom ? (
                <Text style={[{ fontSize: 9 }, styles.muted, d.text]}>
                  {t("custom")}
                </Text>
              ) : (
                row.sku && (
                  <Text
                    style={[
                      { fontSize: 9 },
                      styles.muted,
                      valueStyle(d, row.sku),
                    ]}
                  >
                    {row.sku}
                  </Text>
                )
              )}
            </Cell>
            {hasColor && (
              <Cell width="12%">
                <Text style={valueStyle(d, row.color ?? "")}>
                  {row.color ?? ""}
                </Text>
              </Cell>
            )}
            <Cell>
              <SizeBoxes d={d} sizes={row.sizes} />
            </Cell>
            <Cell width="10%" align="center">
              <Text style={{ fontSize: 12, fontWeight: 600 }}>{row.pairs}</Text>
            </Cell>
          </View>
        ))}

        <View
          style={[styles.tr, { flexDirection: d.row, borderBottomWidth: 0 }]}
          wrap={false}
        >
          <Cell>
            <Text style={[{ fontWeight: 600 }, d.text]}>{t("totalPairs")}</Text>
          </Cell>
          <Cell width="10%" align="center">
            <Text style={{ fontSize: 13.5, fontWeight: 600 }}>{pairs}</Text>
          </Cell>
        </View>

        {data.factoryNote && (
          <Note d={d} boxed label={t("factoryNote")} text={data.factoryNote} />
        )}

        <Footer
          d={d}
          t={t}
          left={`${mark(d, data.business.businessName ?? appName)} · ${title} · ${orderLabel}`}
        />
      </Page>
    </Document>
  );
}
