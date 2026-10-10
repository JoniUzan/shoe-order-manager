# @repo/auth

The one Better Auth config (`authOptions`), ADR 0009. Each app mounts it with its own plugins:
the web app adds `nextCookies()` in `apps/web/src/lib/auth.ts`, and the future `apps/api` will
add the bearer/Expo plugins for mobile. Both then share the same Users and Sessions.

## Rules for this package

- **No app framework here.** Nothing Next- or Fastify-specific; that's the mounting app's job.
- **The tables are Better Auth's shape** (`packages/db/prisma/models/auth.prisma`). Its
  runtime schema check fails on a missing column, or on a required column we add with no
  default. A new auth field goes in `user.additionalFields` and in the Prisma model together.
- **Ids are Prisma's cuid** (`generateId: false`), like every other table.
- **The rate limiter only guards HTTP requests to the auth endpoints.** A server-side
  `auth.api.*` call skips it, so anything that must be rate-limited is called over HTTP
  (the web forms use the auth client). `AUTH_RATE_LIMIT=off` turns it off, for e2e only.
- **Only `PUBLIC_AUTH_PATHS` answer over HTTP.** The `before` hook 404s every other endpoint,
  including ones a Better Auth upgrade adds. Add a path there only when a feature calls it
  (password reset, the mobile bearer plugin); the test walks every endpoint and checks the list.
- **Sign-up input is checked with `@repo/domain`'s `signupSchema`** in the `before` hook, the
  same schema the form uses.
- Tested over HTTP against the test database in `apps/web/src/lib/auth.test.ts`.
