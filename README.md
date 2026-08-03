# Shoe Order Manager

Order-management web app for a B2B wholesale shoe business — track customers, orders
(catalog + custom), payments, and share order confirmations. Hebrew (RTL) + English.

## Stack

- **Turborepo** (pnpm) monorepo
- **Next.js 16** (App Router) + **React 19** + **shadcn/ui** + **Tailwind CSS 4**
- **Prisma** ORM over **SQLite** (portable; migrates to Turso/libSQL later)
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
pnpm db:migrate       # create the SQLite db + run migrations
pnpm db:seed          # seed order statuses + admin user
pnpm dev              # http://localhost:3000
```

Copy `apps/web/.env.example` → `apps/web/.env.local` and set `DATABASE_URL` (absolute
path to `packages/db/prisma/dev.db`) and `AUTH_SECRET` (`openssl rand -base64 33`).

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
