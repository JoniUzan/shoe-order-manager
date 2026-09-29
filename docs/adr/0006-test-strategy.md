# Tests hit real Postgres, and each test makes its own User

Server Actions are tested against a real Postgres database (`shoe_test`), not a mocked Prisma.
The rules worth testing live there: `ownerId` scoping, the `orderNumber` retry on P2002, and
the `lockOrder` row lock under READ COMMITTED. A mock would pass all of them while the real
database broke them.

Tests are kept apart by data, not by cleanup. Each test creates its own User. Every query is
already scoped by `ownerId` (ADR 0003), so tests can't see each other's data, run in parallel,
and never truncate. As a side effect, every test also checks the scoping. We ruled out wrapping
each test in a transaction: the actions open their own `$transaction`, and a race test needs
two real connections.

Actions are called as they ship, with `vi.mock` standing in for `@/lib/auth`, `next/cache` and
`next/headers`. We didn't split each action into a thin wrapper plus an `ownerId`-taking core
only to make it testable.

E2E specs run against `next build && next start`, the same build that ships, not `next dev`.
Coverage counts unit and integration tests only: measuring lines through the Next bundle under
Playwright was too fragile to be worth it. E2E proves flows, not lines. Coverage floors only
ever go up.
