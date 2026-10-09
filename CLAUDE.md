# CLAUDE.md

A Turborepo monorepo for a B2B wholesale **shoe order manager**: a User sells shoes to retail
stores (Customers) and tracks their orders and payments. Hebrew (RTL, the primary locale) +
English. Data lives in Postgres: Neon in production (used as plain Postgres), Docker locally.

The domain words (English and Hebrew) are in `GLOSSARY.md`. Each package has its own
`CLAUDE.md` with the rules for working inside it: `apps/web`, `apps/e2e`, `packages/db`,
`packages/domain`, `packages/ui`. The reasons behind the big design choices are
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
- **Chart colors are the user's reference hexes** (`--chart-1..6` in `packages/ui`), the same in
  light and dark, used exactly and never tuned. Ordered is blue, collected orange. Ordered and
  collected are never stacked: their sum means nothing.
- **RTL by construction**: Tailwind logical utilities only (`ms-`, `pe-`, `text-start`), and
  every string goes into both `messages/en.json` and `messages/he.json`.
- **cuid ids start with `c`.** When a browser check matches a detail URL, require that
  (`/orders/c[a-z0-9]{16,}$`) so `/orders/new` doesn't match.

## Terms

The domain glossary is @GLOSSARY.md: the English term, its Hebrew UI wording, and the words to
avoid. Use those words in code, UI copy, commits and conversation. The
`domain-modeling` skill (reached through `/grill-with-docs`) adds to it and to `docs/adr/`.

Where the code says it differently:
- `ownerId` is the User. Several people per business may come later (ADR 0003).
- `depositAgorot` is Paid, the sum of every Payment.
- Order status rows are `not_done` / `done`; Payment status is `unpaid` / `partial` / `paid`.

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
