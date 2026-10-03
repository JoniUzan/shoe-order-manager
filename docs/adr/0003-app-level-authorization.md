# Authorization is app-level: every query is scoped by ownerId

Each User's data is isolated by filtering every read and write on `ownerId` in app code, not by Postgres row-level security. Prisma connects as one database role and bypasses RLS anyway, and keeping the rules out of the database keeps it portable (see ADR 0002). The consequence: a query without an `ownerId` filter is a data leak, and tables without their own `ownerId` (`SizePack`, `OrderPack`, `OrderItem`) are only ever reached through an owned parent.

Later, one business may have several people working in it, not only the User who runs it. That's
not built, and we deliberately don't build it ahead of time. When it's needed, a Business entity
takes over ownership: each existing User gets a Business of their own, `ownerId` is copied into a
`businessId` on every owned table, the Business details move off `User` onto it, and Users become
its members with roles (Better Auth's organization plugin, ADR 0009). Scoping stays where it is,
in app code, with the business id in place of `ownerId`. That keeps the change mechanical. The
term for a non-owner member is chosen then.
