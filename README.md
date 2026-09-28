# Shoe Order Manager

Order-management web app for a B2B wholesale shoe business — track customers, orders
(catalog + custom), payments, and share order confirmations. Hebrew (RTL) + English.

## Stack

- **Turborepo** (pnpm) monorepo
- **Next.js 16** (App Router) + **React 19** + **shadcn/ui** + **Tailwind CSS 4**
- **Prisma** ORM over **Postgres** (Supabase in production, Docker locally)
- **Auth.js v5** (email/password), **next-intl** (he/en, RTL), dark mode

## Structure

```
apps/web              Next.js app (the only deployable)
packages/db           Prisma schema, client, seed
packages/domain       Zod schemas, money (agorot) + order-totals logic
packages/ui           shadcn/ui components + theme
packages/config/*     shared typescript / eslint config
```

## Getting started

```bash
pnpm install
docker compose up -d  # local Postgres 17 on localhost:5432
pnpm db:migrate       # run migrations
pnpm db:seed          # seed order statuses + admin user
pnpm dev              # http://localhost:3000
```

Copy `packages/db/.env.example` → `packages/db/.env` and `apps/web/.env.example` →
`apps/web/.env.local` (the local `DATABASE_URL` / `DIRECT_URL` are already filled in), and
set `AUTH_SECRET` (`openssl rand -base64 33`).

To browse the local database, `docker compose --profile studio up -d` also starts pgAdmin on
http://localhost:5050 with no login screen and the local database already registered
(`pnpm db:studio` works too).

### Supabase (production database)

Supabase is used as **plain Postgres** — no Supabase Auth, RLS or storage — so moving to
any other Postgres host later is a `pg_dump` / `pg_restore` plus a new `DATABASE_URL`.

1. Create a project; from **Connect → ORMs → Prisma** take the two URLs:
   `DATABASE_URL` = transaction pooler (port 6543, with `?pgbouncer=true&connection_limit=1`),
   `DIRECT_URL` = session pooler (port 5432), used only by migrations.
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
