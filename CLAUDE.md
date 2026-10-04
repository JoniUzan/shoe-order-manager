# CLAUDE.md

A Turborepo monorepo for a B2B wholesale **shoe order manager**: a User sells shoes to retail
stores (Customers) and tracks their orders and payments. Hebrew (RTL, the primary locale) +
English. Data lives in Postgres: Neon in production (used as plain Postgres), Docker locally.

Each package has its own `CLAUDE.md` with the rules for working inside it: `apps/web`,
`apps/e2e`, `packages/db`, `packages/domain`, `packages/ui`. The reasons behind the big design choices are
in `docs/adr/`; hosting, auth and the planned mobile app are ADRs 0008–0010, Product images ADR 0011.

## Commands

```bash
pnpm install                 # postinstall build scripts are allow-listed in package.json#pnpm.onlyBuiltDependencies
pnpm dev                     # the web app on http://localhost:3000
pnpm typecheck               # tsc --noEmit across the workspace
pnpm lint                    # eslint (web)
pnpm build                   # build everything
pnpm test                    # unit + integration tests (integration needs docker compose up)
pnpm test:coverage           # the same, failing below the coverage floors
pnpm test:e2e                # build, then Playwright on :3100 in he/en × desktop/phone

docker compose up -d         # local Postgres 17 on :5432 + S3 storage for images on :8333
docker compose --profile studio up -d   # + pgAdmin on http://localhost:5050 (no login)
pnpm db:migrate              # create/apply migrations (prisma migrate dev)
pnpm db:seed                 # order statuses + admin user; db:seed:demo adds demo data
pnpm db:generate             # regenerate the Prisma client after schema edits
pnpm storage:check           # prove image storage works: write, read, public fetch, delete (--env <file>)
pnpm storage:reset           # delete every local Product image (empties the product-images bucket)
pnpm dev:reset               # wipe the local database and images, re-migrate and re-seed
```

Tests come in three layers (ADR 0006), and a change adds tests at the layer it touches:
- **Unit:** `packages/domain/src/*.test.ts`, for domain rules.
- **Integration:** `apps/web/src/lib/actions/*.test.ts`, for Server Actions. They run against a
  separate `shoe_test` database that the tests create and migrate themselves.
- **E2E:** `apps/e2e/suites/<area>/`, for screens and flows (see `apps/e2e/CLAUDE.md`).

CI (`.github/workflows/test.yml`) runs all three on every push. The `browser-check` skill stays
for looking at a change by hand. For a new feature from schema to screen, follow the
`new-feature` skill.

## Environment

`apps/web/.env.local` and `packages/db/.env`, each copied from the `.env.example` next to it:
`DATABASE_URL` + `DIRECT_URL` (the same Docker URL twice locally), plus `AUTH_SECRET`
(`openssl rand -base64 33`), `AUTH_TRUST_HOST=true` and the `S3_*` / `IMAGE_BASE_URL` storage
block (as in the example) for the web app. Dev login:
`admin@example.com` / `changeme123` (override with `ADMIN_EMAIL`/`ADMIN_PASSWORD` before
`db:seed`).

## Architecture

- `apps/web`: the only deployable. Next.js 16 App Router, React 19, Auth.js v5, next-intl.
- `apps/e2e`: the Playwright suites, run against `web`'s production build. Never deployed.
- `packages/db`: Prisma 7 schema, client, seeds.
- `packages/domain`: framework-free Zod schemas and business rules (money, totals, sizes,
  packs). Split from `db` so client components can import it.
- `packages/ui`: shadcn/ui primitives and the theme.
- `packages/config/*`: shared `typescript-config` and `eslint-config`. No root tsconfig.

Reads are Server Components calling `prisma` directly; writes are Server Actions in
`apps/web/src/lib/actions/`. Both scope every query by `ownerId`: authorization lives in app
code, not in Postgres RLS (ADR 0003).

## Rules that hold everywhere

- **Money is integer agorot** (1 ₪ = 100 agorot), never floats. Convert at the UI edge with
  `@repo/domain/money` (ADR 0001).
- **The schema stays portable** (ADR 0002): no triggers, generated columns, DB-side UUIDs or DB
  date functions. Totals, paid amount and payment status are computed in app code on write;
  `orderNumber` is assigned per User in `createOrder`'s transaction; report time buckets are
  computed in JS.
- **Derived writes lock the order row first.** Postgres runs READ COMMITTED, so a transaction
  that reads an order's payments and writes a derived value back first touches the order row
  and checks values read after that lock (`lockOrder` in `actions/payments.ts`).
- **Images are stored by key** (ADRs 0008, 0011): the database holds the object key, and
  `imageUrl()` in `apps/web/src/lib/storage.ts` adds `IMAGE_BASE_URL` at render time. Storage is
  reached only through the S3 API.
- **Packs are line items with a snapshot** (ADR 0004). The order form sends which pack and how
  many; the server builds the items from the stored curve.
- **RTL by construction**: Tailwind logical utilities only (`ms-`, `pe-`, `text-start`), and
  every string goes into both `messages/en.json` and `messages/he.json`.
- **cuid ids start with `c`.** When a browser check matches a detail URL, require that
  (`/orders/c[a-z0-9]{16,}$`) so `/orders/new` doesn't match.

## Terms

Use these words in code, UI copy, commits and conversation. Hebrew is the UI wording.

| Term | Hebrew | Meaning | Avoid |
|---|---|---|---|
| **User** | | A person who signs in and runs one business; owns all their data. `ownerId` in code. Several people per business may come later (ADR 0003). | owner, account, tenant |
| **Customer** | לקוח | A retail store that buys from the User. Never signs in. | client, store (as the entity) |
| **Business details** | פרטי העסק | The User's name, phone, address and tax ID, printed on every order and WhatsApp message. | |
| **Shoe model** | דגם | A catalog entry: name, SKU, default price, size run. The catalog (קטלוג) is all of them. | |
| **Product image** | תמונת מוצר | The one photo of a Shoe model, shown in the catalog, the order form, the order page and both PDFs. | image (alone: that's the User's avatar) |
| **Pack** | סדרה | A shoe model's fixed pairs-per-size, e.g. 38×3, 39×2, 40×3 (its **curve**). | series, set |
| **Cartons** | קרטונים | How many of a pack an order takes. | packs (for the count) |
| **Loose pairs** | זוגות בודדים | Pairs ordered outside any pack. | extra items |
| **Material** | חומר | What a line item's upper is made of (e.g. leather, synthetic), chosen per order block like color. | upper, fabric |
| **Sole** | סוליה | What a line item's sole is made of (e.g. rubber, EVA), chosen per order block like color. Neither Material nor Sole changes the price, and neither reaches the Customer (not on the Order summary or WhatsApp). | material sole |
| **Order** | הזמנה | What a Customer buys, numbered per User (#1, #2, …). | invoice |
| **Line item** | שורה / פריט | One size of one model (or a free-text item) with quantity and unit price. | |
| **Custom item** | מותאם | A line item described in free text instead of a catalog model. An order with any custom item is a **custom order**. | |
| **Order status** | סטטוס | Fulfilment stage: `not_done` / `done` (rows, so more can be added). | |
| **Payment** | תשלום | One amount a Customer paid toward an order. | |
| **Paid** | שולם | The sum of an order's Payments. The column `depositAgorot` and the UI label "מקדמה" mean this same total, not only an up-front payment. | deposit (as a separate concept) |
| **Balance** | יתרה | Total minus Paid; what's still owed (never below zero when shown as debt). | |
| **Payment status** | | `unpaid` / `partial` / `paid`, derived from total and Paid. | |
| **Order summary** | סיכום הזמנה | An Order as a PDF for its Customer: pairs per size, cartons, prices, totals, Paid and Balance. | invoice |
| **Production sheet** | דף ייצור | An Order as sent to the factory: the pairs per model, color and size of every line item, with no packs or cartons, no prices, totals or payments, and only the Customer's name. Not an Order of its own. | factory order, factory invoice |
| **Factory note** | הערה למפעל | An Order's note meant for the factory. Printed only on the Production sheet; the regular notes never reach the factory. | |
| **Picking** | ליקוט | Gathering an order's cartons and loose pairs for delivery. | packing |
| **Sign-up** | הרשמה | Creating a User; open to anyone. | register |
| **Onboarding** | | The welcome dialog after Sign-up: language, name/avatar/theme, then Business details. | setup wizard |

## How we work

- **Branch + draft PR.** Feature work goes on its own branch and is opened with
  `gh pr create --draft`; the billed review action skips drafts, and the user marks the PR
  ready. Split the work into one commit per logical section, each one typechecking on its own
  (new files land unused first, the consumer switches over last). The user reviews by
  reading the commit list.
- **Design first for UI.** A new or redesigned screen is drawn on a Claude Design canvas first
  (the app's real tokens, Hebrew RTL first, desktop + phone + dark) and built only after the
  user approves it. The user often points at claude.ai's UI as the reference. Small fixes to
  shipped UI skip this.

## Next.js 16 / Prisma 7

Both have breaking changes from what you may know. `apps/web/AGENTS.md` points at the bundled
Next docs; `packages/db/CLAUDE.md` covers the Prisma 7 driver adapter.
