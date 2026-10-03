# @repo/db

Prisma 7 schema, client and seeds. Exports `prisma` plus the model types.

## Schema

- Multi-file: `prisma/schema.prisma` holds only the generator and datasource; models live in
  `prisma/models/<domain>.prisma`. Put a new model in the file for its domain.
- Portable Postgres only (ADR 0002): ids are `@default(cuid())`, money is `Int` agorot
  (ADR 0001), enums are `String` columns with the allowed values in a comment and a constant in
  `@repo/domain`, and derived values are computed in app code. Two things are stored as strings
  on purpose: `ShoeModel.sizes` (`"36,37,38"`) and a pack's `curve` (`"38:3,39:2"`), always
  read and written through `@repo/domain`'s parse/serialize helpers.
- Every owned table carries `ownerId` (ADR 0003). `SizePack`, `OrderPack` and `OrderItem` have
  none; queries reach them through `shoeModel: { ownerId }` or `order: { ownerId }`.
- Order statuses are rows in `OrderStatus` (seeded), so a new stage is a seed row, not a
  migration.

## Changing the schema

1. Edit the model file, then `pnpm db:migrate` (from the root) with a descriptive name. Commit
   the generated `prisma/migrations/<timestamp>_<name>/` with the schema change.
2. Add any new model type to the export lists in **both** `src/index.ts` and `src/browser.ts`.
3. A new required column on an existing table needs a default or a data migration, since
   production has rows.

## Client and connections

- `prisma.config.ts` feeds the CLI `DIRECT_URL` (migrate, studio, seed); `src/client.ts` feeds
  the app `DATABASE_URL` through the node-postgres driver adapter. Prisma 7 reads no `.env`
  itself; `dotenv` loads it.
- Because the driver is node-postgres, Prisma 6's URL knobs (`pgbouncer=true`,
  `connection_limit`) do nothing. Pool size is `DATABASE_POOL_MAX` (set `1` on serverless);
  the URL's `sslmode` keeps TLS on. `.env.example` has both Neon URLs.
- `src/browser.ts` is what client bundles get: same names, a `prisma` that throws. Client
  components can then import constants from server query modules without pulling in `pg`.

## Seeds

- `pnpm db:seed` (`prisma/seed.ts`): order statuses + the admin user. Idempotent (upserts).
- `pnpm db:seed:demo` (`prisma/seed-demo.ts`): demo customers, catalog and orders.
