/**
 * Demo data seed — NOT part of `db:seed`.
 *
 * Generates ~4 months of plausible wholesale history (stores, catalog, orders,
 * partial and full payments) so charts and reports have something honest to
 * draw. Everything it creates is tagged so `--reset` can remove exactly what
 * this script made and nothing else.
 *
 *   pnpm db:seed:demo            add demo history
 *   pnpm db:seed:demo -- --reset remove it again
 *
 * Deterministic: same seed, same data, so screenshots are reproducible.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/** Marker written into notes so demo records stay removable. */
const TAG = "[demo]";

/** Mulberry32 — small deterministic PRNG (Math.random would break reruns). */
function rng(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = rng(20260809);
const pick = <T>(xs: readonly T[]): T => xs[Math.floor(rand() * xs.length)]!;
const between = (min: number, max: number) =>
  min + Math.floor(rand() * (max - min + 1));

const STORES = [
  ["נעלי בן־ארי", "רמלה", "אבי בן־ארי", "052-4417820"],
  ["בוטיק שגב", "כפר סבא", "מיכל שגב", "054-7723189"],
  ["שוז אנד מור", "חיפה", "רונן כהן", "050-3318874"],
  ["נעלי אלמוג", "באר שבע", "שירן אלמוג", "053-9942017"],
  ["סטודיו פאשן", "תל אביב", "נועה ברששת", "054-2298431"],
  ["הנעל הלבנה", "ירושלים", "יוסי מזרחי", "052-8830145"],
  ["קמע נעליים", "פתח תקווה", "דנה קמע", "050-7719923"],
  ["צעד ראשון", "נתניה", "איתי גולן", "054-6612287"],
  ["בית הנעל אשדוד", "אשדוד", "מאיר לוי", "052-3390761"],
  ["אופנת רגב", "ראשון לציון", "ליאת רגב", "053-4428890"],
  ["נעלי הדר", "רעננה", "הדר שמעוני", "050-9917342"],
  ["סטפ אין", "מודיעין", "עומר פרץ", "054-8823410"],
  ["נעלי רויאל", "בני ברק", "שמואל פרידמן", "052-7714498"],
  ["הסנדלר הקטן", "זכרון יעקב", "טל אבידן", "050-2237719"],
] as const;

const MODELS = [
  ["מוקסין קלאסי", "MOC-100", 14000],
  ["סניקרס עור לבן", "SNK-220", 19500],
  ["מגף חורף גבוה", "BOT-410", 28000],
  ["סנדל שטח", "SND-050", 9500],
  ["נעלי ערב עקב", "EVE-330", 24000],
  ["לואפר קלאסי", "LOF-180", 17000],
  ["נעלי בד יומיומי", "CNV-070", 8000],
  ["מגף צ׳לסי", "CHL-390", 26500],
  ["נעלי ריצה קלות", "RUN-260", 21000],
  ["כפכף אורתופדי", "ORT-030", 11000],
] as const;

/**
 * Size runs and packs (סדרות) for a few models, so order lines can take N
 * packs. Curves are pairs per size across the run — a typical wholesale box.
 */
const WOMEN = ["36", "37", "38", "39", "40", "41"];
const MEN = ["40", "41", "42", "43", "44", "45"];
const PACKS: Record<string, { sizes: string[]; packs: [string, number[]][] }> = {
  "SNK-220": { sizes: WOMEN, packs: [["סדרה א׳", [1, 2, 3, 3, 2, 1]]] },
  "EVE-330": {
    sizes: WOMEN,
    packs: [
      ["סדרה א׳", [1, 2, 3, 3, 2, 1]],
      ["סדרה ב׳", [0, 1, 2, 2, 1, 0]],
    ],
  },
  "CHL-390": { sizes: MEN, packs: [["סדרה א׳", [1, 2, 2, 2, 2, 1]]] },
  "RUN-260": {
    sizes: MEN,
    packs: [
      ["סדרה א׳", [1, 2, 2, 2, 2, 1]],
      ["סדרה ב׳", [0, 1, 2, 2, 1, 0]],
    ],
  },
};
/** "38:3,39:2" — the canonical curve string (serializeCurve in @repo/domain). */
const curveOf = (sizes: string[], pairs: number[]) =>
  sizes
    .map((size, i) => [size, pairs[i] ?? 0] as const)
    .filter(([, n]) => n > 0)
    .map(([size, n]) => `${size}:${n}`)
    .join(",");

const COLORS = ["שחור", "לבן", "חום", "בז׳", "אפור", "נייבי", "בורדו", "טאופ"];
const SIZES = ["36", "37", "38", "39", "40", "41", "42", "43", "44", "45"];
const CUSTOM = [
  "דגם מיוחד לפי בקשת הלקוחה",
  "הזמנה חוזרת — מידות חסרות",
  "דגם תצוגה לחלון הראווה",
  "סדרה מוגבלת, עור איטלקי",
  "תיקון והחלפה מהמשלוח הקודם",
];
const METHODS = ["מזומן", "העברה בנקאית", "צ׳ק", "אשראי"];

async function reset(ownerId: string) {
  const demoCustomers = await prisma.customer.findMany({
    where: { ownerId, notes: { contains: TAG } },
    select: { id: true },
  });
  const ids = demoCustomers.map((c) => c.id);
  if (ids.length === 0) {
    console.log("No demo data found.");
    return;
  }
  const orders = await prisma.order.findMany({
    where: { ownerId, customerId: { in: ids } },
    select: { id: true },
  });
  const orderIds = orders.map((o) => o.id);

  // OrderPack rows go with their order, SizePack rows with their model (both
  // cascade in the schema).
  await prisma.payment.deleteMany({ where: { orderId: { in: orderIds } } });
  await prisma.orderItem.deleteMany({ where: { orderId: { in: orderIds } } });
  await prisma.order.deleteMany({ where: { id: { in: orderIds } } });
  await prisma.customer.deleteMany({ where: { id: { in: ids } } });
  await prisma.shoeModel.deleteMany({
    where: { ownerId, description: { contains: TAG } },
  });
  console.log(
    `✓ Removed ${orderIds.length} demo orders and ${ids.length} demo stores`,
  );
}

async function main() {
  const owner = await prisma.user.findFirst({ orderBy: { createdAt: "asc" } });
  if (!owner) {
    console.error("No user found — run `pnpm db:seed` first.");
    process.exit(1);
  }

  if (process.argv.includes("--reset")) {
    await reset(owner.id);
    return;
  }

  const existing = await prisma.customer.count({
    where: { ownerId: owner.id, notes: { contains: TAG } },
  });
  if (existing > 0) {
    console.error(
      `Demo data already present (${existing} stores). Run with --reset first.`,
    );
    process.exit(1);
  }

  const customers = [];
  for (const [name, city, contactName, phone] of STORES) {
    customers.push(
      await prisma.customer.create({
        data: {
          ownerId: owner.id,
          name: `${name}, ${city}`,
          contactName,
          phone,
          address: city,
          notes: TAG,
        },
      }),
    );
  }
  console.log(`✓ ${customers.length} stores`);

  const models = [];
  for (const [name, sku, price] of MODELS) {
    const packed = PACKS[sku];
    models.push(
      await prisma.shoeModel.create({
        data: {
          ownerId: owner.id,
          name,
          sku,
          defaultPriceAgorot: price,
          description: TAG,
          isActive: true,
          sizes: packed ? packed.sizes.join(",") : null,
          packs: packed
            ? {
                create: packed.packs.map(([packName, pairs], i) => ({
                  name: packName,
                  curve: curveOf(packed.sizes, pairs),
                  sortOrder: i,
                })),
              }
            : undefined,
        },
        include: { packs: { orderBy: { sortOrder: "asc" } } },
      }),
    );
  }
  const packedModels = models.filter((m) => m.packs.length > 0);
  console.log(
    `✓ ${models.length} catalog models (${packedModels.length} with packs)`,
  );

  const last = await prisma.order.findFirst({
    where: { ownerId: owner.id },
    orderBy: { orderNumber: "desc" },
    select: { orderNumber: true },
  });
  let orderNumber = (last?.orderNumber ?? 0) + 1;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const DAYS = 120;
  let created = 0;
  let payments = 0;

  for (let d = DAYS; d >= 0; d--) {
    const day = new Date(today);
    day.setDate(day.getDate() - d);

    // Israeli work week: Sun–Thu busy, Fri light, Sat closed.
    const dow = day.getDay();
    if (dow === 6) continue;
    const base = dow === 5 ? 0.35 : 1;
    // A gentle ramp so the trend isn't flat noise.
    const ramp = 0.65 + (1 - d / DAYS) * 0.7;
    const expected = base * ramp * 1.15;
    const count = rand() < expected - Math.floor(expected)
      ? Math.floor(expected) + 1
      : Math.floor(expected);

    for (let i = 0; i < count; i++) {
      const customer = pick(customers);
      const createdAt = new Date(day);
      createdAt.setHours(between(9, 18), between(0, 59), 0, 0);

      const lineCount = between(1, 5);
      const items = [];
      const packs = [];
      let total = 0;
      for (let l = 0; l < lineCount; l++) {
        // About 30% of lines (0.72 catalog × 0.42) take 1–10 packs of a
        // model that has them, some with a few extra pairs on top.
        if (rand() < 0.72 && rand() < 0.42) {
          const model = pick(packedModels);
          const pack = pick(model.packs);
          const count = between(1, 10);
          const unit =
            Math.round(
              ((model.defaultPriceAgorot ?? 15000) * (0.9 + rand() * 0.25)) / 50,
            ) * 50;
          const color = pick(COLORS);
          const packItems = pack.curve.split(",").map((part) => {
            const [size, pairs] = part.split(":");
            return {
              shoeModelId: model.id,
              customDescription: null,
              size: size!,
              color,
              quantity: Number(pairs) * count,
              unitPriceAgorot: unit,
            };
          });
          packs.push({
            sizePackId: pack.id,
            packName: pack.name,
            curve: pack.curve,
            count,
            items: packItems,
          });
          total += packItems.reduce((n, it) => n + it.quantity * unit, 0);
          if (rand() < 0.4) {
            const sizes = model.sizes!.split(",");
            const quantity = between(1, 3);
            total += unit * quantity;
            items.push({
              shoeModelId: model.id,
              customDescription: null,
              size: pick(sizes),
              color,
              quantity,
              unitPriceAgorot: unit,
            });
          }
          continue;
        }
        const quantity = between(1, 12);
        const useCatalog = rand() < 0.72;
        const model = pick(models);
        // Wholesale haggling: a little drift around the list price.
        const unit = useCatalog
          ? Math.round(
              (model.defaultPriceAgorot ?? 15000) * (0.9 + rand() * 0.25) / 50,
            ) * 50
          : between(80, 300) * 100;
        total += unit * quantity;
        items.push({
          shoeModelId: useCatalog ? model.id : null,
          customDescription: useCatalog ? null : pick(CUSTOM),
          size: pick(SIZES),
          color: pick(COLORS),
          quantity,
          unitPriceAgorot: unit,
        });
      }

      // Payment behaviour: most settle, some drip, some never.
      const roll = rand();
      const age = d;
      let deposit = 0;
      const paymentRows: { amountAgorot: number; paidAt: Date; method: string }[] =
        [];
      if (roll < 0.58 && age > 3) {
        deposit = total;
        const paidAt = new Date(createdAt);
        paidAt.setDate(paidAt.getDate() + between(0, Math.min(30, age)));
        paymentRows.push({ amountAgorot: total, paidAt, method: pick(METHODS) });
      } else if (roll < 0.8) {
        const part = Math.round((total * (0.2 + rand() * 0.5)) / 100) * 100;
        deposit = Math.min(part, total);
        const paidAt = new Date(createdAt);
        paidAt.setDate(paidAt.getDate() + between(1, Math.min(21, age || 1)));
        paymentRows.push({
          amountAgorot: deposit,
          paidAt,
          method: pick(METHODS),
        });
      }

      // Mirrors computePaymentStatus in @repo/domain (kept inline so the db
      // package stays dependency-free).
      const paymentStatus =
        total <= 0 || deposit <= 0
          ? "unpaid"
          : deposit >= total
            ? "paid"
            : "partial";

      const order = await prisma.order.create({
        data: {
          ownerId: owner.id,
          customerId: customer.id,
          orderNumber: orderNumber++,
          statusCode: age > 14 || rand() < 0.4 ? "done" : "not_done",
          isCustomOrder: items.some((it) => it.customDescription !== null),
          notes: rand() < 0.15 ? "לאסוף מהמחסן ביום ראשון" : null,
          totalAgorot: total,
          depositAgorot: deposit,
          paymentStatus,
          createdAt,
          updatedAt: createdAt,
          items: { create: items },
        },
      });
      for (const { items: packItems, ...pack } of packs) {
        await prisma.orderPack.create({
          data: {
            orderId: order.id,
            ...pack,
            items: {
              create: packItems.map((it) => ({ orderId: order.id, ...it })),
            },
          },
        });
      }
      created++;

      for (const p of paymentRows) {
        await prisma.payment.create({
          data: {
            ownerId: owner.id,
            orderId: order.id,
            amountAgorot: p.amountAgorot,
            paidAt: p.paidAt,
            method: p.method,
            note: null,
          },
        });
        payments++;
      }
    }
  }

  console.log(`✓ ${created} orders over ${DAYS} days, ${payments} payments`);
  const outstanding = await prisma.order.findMany({
    where: { ownerId: owner.id, paymentStatus: { not: "paid" } },
    select: { totalAgorot: true, depositAgorot: true },
  });
  const owed = outstanding.reduce(
    (s, o) => s + Math.max(0, o.totalAgorot - o.depositAgorot),
    0,
  );
  console.log(`  outstanding: ₪${(owed / 100).toLocaleString("en-US")}`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
