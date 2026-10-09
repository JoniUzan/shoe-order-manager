@AGENTS.md

# web (Next.js 16 app)

The only deployable: App Router, React 19, Auth.js v5, next-intl.

## Layout

- `src/app/[locale]/` is the root (there is no `app/layout.tsx`). `(app)/` is everything behind
  login, and its layout loads the user and mounts the sidebar and `SettingsHost`. `(auth)/` holds
  login and sign-up. `app/api/orders/[id]/pdf/` serves an order's two PDFs.
- `src/lib/actions/*.ts`: Server Actions, one file per area. `src/lib/*-query.ts`: server-only
  reads, one definition per list or report. `src/components/<area>/`: app components (shared
  primitives come from `@repo/ui`).
- `src/proxy.ts` is the middleware (Next 16 renamed the convention). `params` and
  `searchParams` are Promises: `await` them.

## Reads

Server Components call `prisma` directly, filtered by `ownerId` (ADR 0003). A page starts with
`requireUser(locale)` from `lib/session.ts`: it redirects to login when there's no session **or**
when the session's user row is gone (a JWT can outlive a DB reset). List state (search, filter,
sort, page) lives in the URL; `lib/list-params.ts` whitelists every value before it reaches
Prisma, and nullable sort columns pass `nulls: "last"`. Text search uses
`contains` with `mode: "insensitive"`.

## Writes: Server Actions

Every action follows the same shape:

1. Get the owner id from `auth()` (the `requireOwnerId` helper at the top of each file).
2. Re-validate the input with the `@repo/domain` schema.
3. Scope every query by `ownerId`; reach `OrderItem` / `OrderPack` / `SizePack` through an
   owned parent.
4. Return `{ ok: true } | { ok: false, error: "<code>" }` for expected failures (not found,
   invalid, still referenced). Throw only for bugs. Deleting a record that's still used (a
   customer with orders, a model on an order item) is refused here and shown as a toast.
5. `revalidatePath` every view that shows the data.

Derived money (totals, paid, payment status) is recomputed on write. A transaction that reads an
order's payments and writes back a derived value first locks the order row (`lockOrder` in
`actions/payments.ts`) and runs its checks on values read after the lock (Postgres is
READ COMMITTED). `createOrder` assigns the next `orderNumber` in its transaction and retries on
P2002.

## Client forms

A create/edit form is built from `components/step-form/` (StepForm, `roomy`, `useAddedItem`); its
`CLAUDE.md` has the rules and the `stepped-form` skill the steps.

Validate on the client with the same domain schema the action uses (react-hook-form +
`zodResolver` in the simple forms). Submit with a plain `async` handler and a
`useState` pending flag, then call `router.push(...)` **after** the awaited action.
`router.push` after an `await` inside `startTransition` is dropped in production builds, and a
`router.refresh()` right after a push is redundant. `router` comes from `@/i18n/navigation`
(locale-aware).

## i18n and RTL

Locale is in the URL (`/he`, `/en`); `[locale]/layout.tsx` sets `<html dir>`. Server components
use `getTranslations({ locale, namespace })`, client components `useTranslations`. Every new
string goes into **both** `messages/en.json` and `messages/he.json` with the same key; use
the root `GLOSSARY.md` for Hebrew wording. Layout uses logical utilities only.

## Settings dialog

Opened by the URL hash, `#settings` or `#settings/<general|account|business>` (ADR 0005).
`SettingsHost` reads the hash; `components/settings/settings-hash.ts` opens it with
`pushState`, switches sections with `replaceState` and closes with `history.back()`. Change the
hash only through those helpers. A hash the browser changes by itself (a link to the same page
with `#settings/…`) is handed to Next's router by `HashSync` (`components/layout/hash-sync.tsx`),
or the next refresh drops it. Near-full-screen dialog on a computer, bottom drawer on a phone
(`useIsPhone`). Rows are `SettingSection` / `SettingRow`; text fields are `AutosaveInput` (saves
on blur). A language change does a full `window.location` load to the same page and hash. The
user's `locale` and `theme` are stored on `User`: login redirects to the saved locale, and
`ThemeSync` applies the saved theme once per load.

## Product images

`lib/storage.ts` is the only code that talks to object storage (S3 API, `S3_*` env; R2 in
production, the compose `storage` service locally). The catalog form crops a picked photo to a
square JPEG in the browser (`components/catalog/crop-image.ts`) and uploads it with
`uploadProductImage` when the model is saved; `createShoeModel`/`updateShoeModel` take the key,
check it is the User's own, and delete a replaced file after the write commits (ADR 0011).
Pages pass `imageUrl(key)` down; `ModelThumb` shows it, or the shoe outline without one. The
PDFs read the bytes with `getObject`, never the public URL. The S3 client sends checksums only
where an operation needs them, which R2 and the local server both accept. `pnpm storage:check`
(`scripts/check-storage.mts`) runs a probe object through the same module: write, read, public
fetch, delete. Run it with new storage settings before deploying them.

## Order PDFs

The Order summary and the Production sheet are built on the server with `@react-pdf/renderer`
(ADR 0007): layouts in `lib/pdf/`, row grouping in `@repo/domain`'s `document.ts`. react-pdf
lays text out LTR unless told otherwise, so a Hebrew `Text` takes `directional(rtl).text` and
rows `row-reverse`; a user-typed value inside a translated line goes through `mark()`. Look at
a layout change by rendering the PDF (`/api/orders/<id>/pdf?doc=…&lang=…`), not the web page.

## Auth

Auth.js v5 credentials provider with JWT sessions and the Prisma adapter, configured in
`lib/auth.ts`. Sign-up is open and rate-limited per IP through the `SignupAttempt` table.
The login page repeats `requireUser`'s user-exists check so a stale JWT can't loop between
login and the app.

## Tests

- **Server Actions** have an integration test next to them (`src/lib/actions/<area>.test.ts`),
  run by Vitest against the real `shoe_test` Postgres.
  - `test/setup.ts` mocks `@/lib/auth`, `next/cache` and `next/headers`.
  - Global setup also makes the `shoe-test` bucket on the local S3 server, so
    `docker compose up -d` has to be running.
  - `createUser()` from `test/factories.ts` makes a fresh User and signs in as them;
    `signInAs(id)` switches User. Each test makes its own data and never cleans up: `ownerId`
    scoping keeps tests apart.
  - A test that proves a lock fires the calls together with `Promise.all`.
- **Screens and flows** are covered by the E2E suites in `apps/e2e` (see its `CLAUDE.md`).
- `pnpm typecheck` and `pnpm lint` catch types, not behavior. The `browser-check` skill is for
  looking at a change by hand. A flow worth checking again later becomes a spec.
