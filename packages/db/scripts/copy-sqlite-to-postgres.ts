/**
 * One-time copy of the old local SQLite database into Postgres (Supabase).
 *
 *   pnpm --filter @repo/db copy-from-sqlite [path/to/dev.db]
 *
 * Reads the SQLite file read-only (Node's built-in `node:sqlite`, Node 22+) and
 * writes every row, ids included, into the Postgres database named by
 * DIRECT_URL (falling back to DATABASE_URL). Run `prisma migrate deploy`
 * against that database first, and do NOT seed it: the copy refuses to run
 * into a database that already holds users or business data, so it can never
 * duplicate or overwrite anything. Everything goes in one transaction, then
 * row counts and money totals are compared between the two databases.
 */
import { resolve } from "node:path";
import { existsSync } from "node:fs";

import { Prisma, PrismaClient } from "@prisma/client";

// Like the Prisma CLI, read packages/db/.env; a variable already set in the
// shell wins. A missing file is fine when both URLs come from the shell.
try {
  process.loadEnvFile(".env");
} catch {}

// Parents before children, so every foreign key already has its target.
const MODELS = [
  "OrderStatus",
  "User",
  "Account",
  "Session",
  "VerificationToken",
  "Customer",
  "ShoeModel",
  "Order",
  "OrderItem",
  "Payment",
] as const;
type ModelName = (typeof MODELS)[number];

// Tables that must be empty in the target. OrderStatus is lookup data that
// `migrate deploy` doesn't create but `db:seed` does, so it's allowed and the
// copy skips codes that already exist.
const MUST_BE_EMPTY = MODELS.filter((m) => m !== "OrderStatus");

const BATCH = 500;

type Row = Record<string, unknown>;

// Prisma's SQLite provider stores DateTime as epoch milliseconds and Boolean
// as 0/1; Postgres wants real dates and booleans. Everything else is as-is.
function convert(model: ModelName, row: Row): Row {
  const fields = Prisma.dmmf.datamodel.models.find(
    (m) => m.name === model,
  )!.fields;
  const out: Row = {};
  for (const f of fields) {
    if (f.kind !== "scalar") continue;
    const v = row[f.name];
    if (v === null || v === undefined) out[f.name] = null;
    else if (f.type === "DateTime")
      out[f.name] = new Date(
        typeof v === "string" && /^\d+$/.test(v)
          ? Number(v)
          : (v as string | number),
      );
    else if (f.type === "Boolean") out[f.name] = Boolean(Number(v));
    else if (f.type === "Int") out[f.name] = Number(v);
    else out[f.name] = v;
  }
  return out;
}

// The delegate for a model name, e.g. "OrderItem" -> prisma.orderItem.
function delegate(
  client: Prisma.TransactionClient | PrismaClient,
  model: ModelName,
) {
  const key = model[0]!.toLowerCase() + model.slice(1);
  return (
    client as unknown as Record<
      string,
      {
        count(): Promise<number>;
        createMany(args: {
          data: Row[];
          skipDuplicates?: boolean;
        }): Promise<{ count: number }>;
      }
    >
  )[key]!;
}

async function main() {
  const file = resolve(process.argv[2] ?? "prisma/dev.db");
  if (!existsSync(file)) throw new Error(`SQLite file not found: ${file}`);

  const url = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
  if (!url?.startsWith("postgres")) {
    throw new Error(
      "DIRECT_URL / DATABASE_URL must point at the Postgres database.",
    );
  }

  // Imported here, not at the top, so an older Node gets this message rather
  // than an unexplained ERR_UNKNOWN_BUILTIN_MODULE.
  const { DatabaseSync } = await import("node:sqlite").catch(() => {
    throw new Error(
      `Needs Node 22.5 or newer for node:sqlite (this is ${process.version}).`,
    );
  });
  const sqlite = new DatabaseSync(file, { readOnly: true });
  const prisma = new PrismaClient({ datasourceUrl: url });

  try {
    for (const model of MUST_BE_EMPTY) {
      const n = await delegate(prisma, model).count();
      if (n > 0) {
        throw new Error(
          `Target already has ${n} ${model} row(s). The copy only runs into a freshly ` +
            `migrated, unseeded database, so it can't duplicate data. Nothing was written.`,
        );
      }
    }

    const source = new Map<ModelName, Row[]>();
    for (const model of MODELS) {
      const rows = sqlite.prepare(`SELECT * FROM "${model}"`).all() as Row[];
      source.set(
        model,
        rows.map((r) => convert(model, r)),
      );
    }

    await prisma.$transaction(
      async (tx) => {
        for (const model of MODELS) {
          const rows = source.get(model)!;
          for (let i = 0; i < rows.length; i += BATCH) {
            await delegate(tx, model).createMany({
              data: rows.slice(i, i + BATCH),
              skipDuplicates: model === "OrderStatus",
            });
          }
          console.log(`  copied ${String(rows.length).padStart(5)} ${model}`);
        }
      },
      { timeout: 120_000, maxWait: 20_000 },
    );

    // Verify: every table's count, plus the money, must match exactly.
    let ok = true;
    for (const model of MODELS) {
      const want = source.get(model)!.length;
      const got = await delegate(prisma, model).count();
      const match = model === "OrderStatus" ? got >= want : got === want;
      if (!match) {
        ok = false;
        console.error(`✗ ${model}: SQLite ${want}, Postgres ${got}`);
      }
    }
    const sqliteMoney = sqlite
      .prepare(
        `SELECT (SELECT COALESCE(SUM(totalAgorot),0) FROM "Order") AS total,
                (SELECT COALESCE(SUM(amountAgorot),0) FROM "Payment") AS paid`,
      )
      .get() as { total: number; paid: number };
    const [orders, payments] = await Promise.all([
      prisma.order.aggregate({ _sum: { totalAgorot: true } }),
      prisma.payment.aggregate({ _sum: { amountAgorot: true } }),
    ]);
    const pgTotal = orders._sum.totalAgorot ?? 0;
    const pgPaid = payments._sum.amountAgorot ?? 0;
    if (
      pgTotal !== Number(sqliteMoney.total) ||
      pgPaid !== Number(sqliteMoney.paid)
    ) {
      ok = false;
      console.error(
        `✗ money: SQLite orders ${sqliteMoney.total} / payments ${sqliteMoney.paid}, ` +
          `Postgres orders ${pgTotal} / payments ${pgPaid} (agorot)`,
      );
    }
    if (!ok) throw new Error("Verification failed — see the lines above.");
    console.log(
      `✓ Verified: all row counts match; orders ₪${pgTotal / 100}, payments ₪${pgPaid / 100}.`,
    );
  } finally {
    sqlite.close();
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
