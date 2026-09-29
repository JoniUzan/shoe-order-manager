# @repo/domain

The business rules as plain TypeScript: Zod schemas, money, totals, sizes and packs, phone
numbers, status and settings constants. Imported by the web app's client components and
server code alike.

## Rules for this package

- **Framework-free and DB-free.** Its only dependency is `zod`; `lib` is `ES2022` with no DOM.
  Anything that needs Prisma, Next or React belongs in `apps/web`. That is what lets client
  components import it.
- **Pure functions.** Totals and statuses are computed here from plain inputs; the Server
  Action loads rows, calls these, and writes the result (ADR 0002).
- **The Zod schema is the single source of truth for input.** The form validates with it and
  the Server Action re-validates the same schema. A new field or limit goes in the schema
  first. Cross-field rules Prisma can't express live here as `.refine`, e.g. a line item
  is a catalog `shoeModelId` **XOR** a `customDescription`.
- Every rule has a unit test in `src/<area>.test.ts` (Vitest). Coverage fails below 90%.
- One file per area, each with its own subpath export in `package.json` (`@repo/domain/money`
  and so on) plus a re-export in `src/index.ts`. A new file needs both.

## Where things are

- `money.ts`: agorot ⇄ shekels, `formatMoney`, `parseShekelInput`, `MAX_AGOROT` (the `Int`
  ceiling; writes check it and return a result instead of letting the insert throw).
- `order.ts`: order/item/pack schemas and `recalculateOrderTotals`. Use `computeOwedAgorot`
  (never below zero) wherever balances are summed or shown as debt; an overpaid order is
  settled, not a credit.
- `catalog.ts`: sizes (`parseSizes`/`serializeSizes`/`normalizeSize`) and pack curves
  (`parseCurve`/`serializeCurve`/`expandPack`). Stored sizes and curves only ever pass through
  these, so their canonical string form stays in one place.
- `status.ts`: order and payment status codes. Order statuses also live as DB rows, so
  `OrderStatusCode` is `string`, not a union.
- `phone.ts`: normalizing Israeli numbers for WhatsApp links. `settings.ts`: locales, themes,
  avatars, and the account/business/sign-up schemas.
