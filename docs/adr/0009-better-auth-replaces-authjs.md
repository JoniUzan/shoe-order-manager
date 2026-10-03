# Better Auth replaces Auth.js before launch

The app signs in with Auth.js v5 (`next-auth@5.0.0-beta`), which never left beta. Since September
2025 the Better Auth team maintains it: security fixes continue, and new projects are pointed at
Better Auth. Auth.js is also built around browser cookies. The planned native app (ADR 0010)
needs token sessions, and Better Auth supports them directly with its Expo and bearer plugins,
against the same Prisma database. We switch before launch, in a PR of its own, while there are
no real Users or sessions to migrate.

Better Auth is a library in our app, like Auth.js, not a hosted service. Users stay in our
Postgres, and ADR 0003 doesn't change: sessions only say who the User is, and every query is
still scoped by `ownerId` in app code. Its config lives in a shared `packages/auth`. The web app
mounts it with cookie sessions, and `apps/api` mounts it with bearer tokens for mobile, so both
see the same Users and sessions.

Considered: keeping Auth.js and hand-writing a token endpoint for mobile (more of our own code
on a library in maintenance). Also hosted auth (Clerk, Supabase Auth), which puts Users outside
our database and against ADR 0002's portability. Email is used only for password reset at first,
sent with Resend once the app has a domain.
