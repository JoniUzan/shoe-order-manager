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

**How it's set up** (decided when switching, October 2026). Sessions are rows in Postgres, not
stateless cookies: the mobile app's bearer token will be checked against the same table, and a
password change can end every other session. Sessions last 30 days and renew while in use. A
5-minute cookie cache saves the session query on most web requests, so a revoked web session
can live on for up to those 5 minutes. Passwords use Better Auth's own hashing (scrypt), on the
User's `credential` Account. Ids stay Prisma's cuid, like every other table. Sign-in and sign-up
are rate-limited per IP by Better Auth's limiter, with its counters in Postgres (serverless
instances share no memory), which replaced our own sign-up throttle. That limiter only runs on
HTTP requests to the auth endpoints, so the login and sign-up forms call those endpoints instead
of Server Actions. Production has no seeded admin: the first User signs up.
