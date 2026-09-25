# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A Turborepo monorepo for a B2B wholesale **shoe order manager** (the owner sells shoes to
retail stores = "customers"). Single-user for now, Hebrew (RTL) + English. Data lives in
Postgres: Supabase in production (used as plain Postgres), Docker locally.

## Commands

```bash
pnpm install                 # install (root); postinstall build scripts are allow-listed in package.json#pnpm.onlyBuiltDependencies
pnpm dev                     # run the web app (turbo) — http://localhost:3000
pnpm --filter web dev        # run only the web app
pnpm build                   # build all packages (turbo)
pnpm typecheck               # tsc --noEmit across the workspace
pnpm lint                    # eslint across packages that define a lint task (currently: web)
pnpm --filter @repo/db typecheck   # typecheck a single package

# Database (Postgres via Prisma, in packages/db)
docker compose up -d         # local Postgres 16 on :5432 (matches the .env.example files)
pnpm db:migrate              # prisma migrate dev (create/apply migrations)
pnpm db:seed                 # seed OrderStatus rows + admin user
pnpm db:studio               # browse data
pnpm db:generate             # regenerate the Prisma client after schema edits
```

There is no test runner. **Flows are verified with a real browser** via `playwright-core`
(a dev dep, uses installed Chrome): write a throwaway `*.mjs` at the repo root using
`chromium.launch({ channel: "chrome" })`, run with `node`, then delete it. Typecheck/build/curl
do **not** catch client-navigation or hydration bugs — drive the actual form.

## Environment

- `apps/web/.env.local` and `packages/db/.env` (copy the `.env.example` next to each):
  `DATABASE_URL` + `DIRECT_URL`. Locally both are the Docker Postgres URL. On Supabase,
  `DATABASE_URL` is the **transaction pooler** (port 6543, `?pgbouncer=true&connection_limit=1`)
  and `DIRECT_URL` the **session pooler** (5432) — migrations can't run through the
  transaction pooler. The web app also needs `AUTH_SECRET` (`openssl rand -base64 33`) and
  `AUTH_TRUST_HOST=true`.
- Default dev login: `admin@example.com` / `changeme123` (override with `ADMIN_EMAIL`/`ADMIN_PASSWORD` before `db:seed`).

## Architecture

**Packages** (`@repo/*`, all private; follows Turborepo conventions — no root tsconfig, each
package extends `@repo/typescript-config`):
- `apps/web` — the only deployable. Next.js 16 App Router, React 19.
- `packages/db` — Prisma schema + client singleton + seed. Exports `prisma` and model types.
- `packages/domain` — framework-free: Zod schemas, money helpers, `recalculateOrderTotals`,
  phone normalization, status constants. Split from `db` so it's importable without the client.
- `packages/ui` — shadcn/ui (new-york) + the theme. Owns `src/styles/globals.css` (the app's
  `globals.css` just `@import`s it). Wildcard exports: `@repo/ui/components/*`, `@repo/ui/lib/*`,
  `@repo/ui/hooks/*`.
- `packages/config/*` — shared `typescript-config`, `eslint-config`.

**Request/data flow:**
- **Reads**: Server Components call `prisma` directly, always filtered by `ownerId`.
- **Writes**: Server Actions in `apps/web/src/lib/actions/*`. Each re-validates input with the
  `@repo/domain` Zod schema, scopes by `ownerId`, and returns a `{ ok }` result (no throwing for
  expected failures). `revalidatePath` after mutations.
- **Authorization is app-level** (every query scoped by `ownerId`), NOT Postgres RLS — Prisma
  bypasses RLS, and this keeps the DB portable.

**Auth**: Auth.js v5 (`next-auth@5 beta`) credentials + JWT sessions, Prisma adapter, config in
`apps/web/src/lib/auth.ts`. `requireUser(locale)` in `lib/session.ts` guards pages/actions and
**verifies the session user still exists in the DB** (a JWT can outlive its row, e.g. after a DB
reset) — redirecting to login instead of crashing. The login page does the same check to avoid a
redirect loop.

**i18n / RTL**: next-intl, locale in the URL (`/he`, `/en`). Root layout is
`app/[locale]/layout.tsx` (no `app/layout.tsx`); it sets `<html dir>` and the sidebar's side flips
by locale. Server components translate via `getTranslations({ locale, namespace })`; client via
`useTranslations`. **Use Tailwind logical utilities only** (`ms-`, `pe-`, `text-start`) so layout
flips automatically. Messages live in `apps/web/messages/{en,he}.json` — keep both in sync.

## Money & portable-schema rules (important)

- **All money is integer agorot** (`Int`, 1 ₪ = 100 agorot) — never floats. Convert at the UI
  edge with `@repo/domain/money` (`shekelsToAgorot`, `agorotToShekels`, `formatMoney`).
- The Prisma schema is deliberately kept **portable across Postgres hosts** (Supabase is used
  as plain Postgres — no Supabase Auth/RLS/storage): no DB triggers, no generated columns, no
  DB-side UUIDs (`@default(cuid())`), no DB date functions. Consequences that must be honored
  in app code:
  - Order/line totals + payment status are computed in **app code** (`recalculateOrderTotals`),
    not by a trigger. Order actions recompute on write; payment actions recompute in a `$transaction`.
  - `orderNumber` is a **per-owner running number assigned in `createOrder`'s transaction**
    (`@@unique([ownerId, orderNumber])`), not `autoincrement()`. Two creates at once can pick
    the same number; the loser gets P2002 and `createOrder` retries.
  - Report time-bucketing is done in JS, not `date_trunc`.
- **Postgres runs READ COMMITTED**, so a read inside `$transaction` does not block a concurrent
  writer. Any transaction that reads an order's payments/deposit and writes back a derived value
  first **touches the order row** (`update`/`updateMany` of `updatedAt`) to take its row lock,
  and runs its checks (e.g. "not more than what's left") on values read *after* the lock — see
  `lockOrder` in `actions/payments.ts` and `updateOrder`. Keep that pattern for new derived writes.
- Text search uses `contains` **with `mode: "insensitive"`** (Postgres `contains` is
  case-sensitive). Nullable sort columns pass `nulls: "last"` so empty values don't jump to
  the top when the direction flips.
- A line item is a catalog reference (`shoeModelId`) **XOR** free text (`customDescription`) —
  enforced in the Zod schema + Server Action, since Prisma can't declare the cross-column CHECK.
- **Packs** (UI: English "Pack/packs"; Hebrew "סדרה" for the definition, "קרטונים" for the
  count). `SizePack` is a model's pack (`curve` string `"38:3,39:2"`, see `parseCurve` /
  `serializeCurve` in `@repo/domain`); `OrderPack` is N of a pack on an order, with a
  **name + curve snapshot**. A pack's pairs are ordinary `OrderItem` rows (`packId` set,
  `quantity = count × pairs`), so totals/reports keep summing items. Neither pack table has an
  `ownerId`: always reach them through an owned parent (`shoeModel: { ownerId }` /
  `order: { ownerId }`). The order form sends only *which pack and how many*; the server builds
  the items from the stored curve (`resolvePacks` in `actions/orders.ts`).

## Conventions & gotchas

- **Next.js 16**: the middleware file is `src/proxy.ts` (the `middleware` convention is
  deprecated). `params` and `searchParams` are Promises — `await` them.
- **Client form → redirect pattern**: use a plain `async` submit handler with a `useState` pending
  flag, and call `router.push(...)` **after** the awaited action. Do NOT call `router.push` after
  an `await` inside `startTransition` — the navigation gets dropped in production builds. `router`
  comes from `@/i18n/navigation` (locale-aware). Don't chain `router.refresh()` right after a `push`.
- **Adding shadcn components**: `pnpm dlx shadcn@latest add <name> --cwd apps/web` — it routes
  primitives into `@repo/ui` via the two `components.json` files. The `use-mobile` hook may need to
  be created by hand.
- **cuid ids start with `c`** and are long; when matching detail URLs in tests, require that
  (e.g. `/orders/c[a-z0-9]{16,}$`) so `/orders/new` doesn't match.
- Deleting a referenced record is blocked in the action (customer with orders; shoe model used in
  an order item) and surfaced as a toast, rather than relying on FK behavior.
