# Shoe Order Manager

Order-management web app for a B2B wholesale shoe business — track customers, orders
(catalog + custom), payments, and share order confirmations. Hebrew (RTL) + English.

## Stack

- **Turborepo** (pnpm) monorepo
- **Next.js 16** (App Router) + **React 19** + **shadcn/ui** + **Tailwind CSS 4**
- **Prisma** ORM over **Postgres** (Neon in production, Docker locally)
- **Better Auth** (email/password), **next-intl** (he/en, RTL), dark mode

## Structure

```
apps/web              Next.js app (the only deployable)
packages/auth         Better Auth config (shared with the future mobile API)
packages/db           Prisma schema, client, seed
packages/domain       Zod schemas, money (agorot) + order-totals logic
packages/ui           shadcn/ui components + theme
packages/config/*     shared typescript / eslint config
```

## Getting started

```bash
pnpm install
docker compose up -d  # local Postgres 17 on :5432 + S3 storage for images on :8333
pnpm db:migrate       # run migrations
pnpm db:seed          # seed the admin user
pnpm dev              # http://localhost:3000
```

Copy `packages/db/.env.example` → `packages/db/.env` and `apps/web/.env.example` →
`apps/web/.env.local` (the local `DATABASE_URL` / `DIRECT_URL` are already filled in), and
set `AUTH_SECRET` (`openssl rand -base64 33`).

To browse the local database, `docker compose --profile studio up -d` also starts pgAdmin on
http://localhost:5050 with no login screen and the local database already registered
(`pnpm db:studio` works too).

To start over locally, `pnpm dev:reset` wipes the database and the Product images, then
re-applies the migrations and the seed (`pnpm db:seed:demo` after it for demo data).
`pnpm storage:reset` deletes only the images. `pnpm storage:check` checks that image storage
works (pass `--env <file>` to try R2 credentials before putting them in Vercel).

### Neon (production database)

Neon is used as **plain Postgres** (ADR 0008), so moving to any other Postgres host later is a
`pg_dump` / `pg_restore` plus a new `DATABASE_URL`.

1. Create a project in `eu-central-1`; from **Connect** take the two URLs:
   `DATABASE_URL` = the pooled connection (host ends in `-pooler`), `DIRECT_URL` = the direct
   one, used by the Prisma CLI (migrations, studio, seed). Both with `?sslmode=verify-full`
   (the app connects through node-postgres; Prisma 6's `pgbouncer=true&connection_limit=1` no
   longer apply). On Vercel also set `DATABASE_POOL_MAX=1`.
2. With those in `packages/db/.env`: `pnpm --filter @repo/db migrate:deploy`, then
   `pnpm db:seed` (and `pnpm db:seed:demo` for demo data).

Default login (dev): `admin@example.com` / `changeme123` — override with
`ADMIN_EMAIL` / `ADMIN_PASSWORD` before running `pnpm db:seed`.

## Scripts

| Command | Description |
|---|---|
| `pnpm dev` | Run the app |
| `pnpm build` | Build all packages |
| `pnpm typecheck` | Typecheck the workspace |
| `pnpm db:studio` | Browse the database (Prisma Studio) |
| `pnpm db:migrate` / `pnpm db:seed` | Migrate / seed |
