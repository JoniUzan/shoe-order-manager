# Authorization is app-level: every query is scoped by ownerId

Each User's data is isolated by filtering every read and write on `ownerId` in app code, not by Postgres row-level security. Prisma connects as one database role and bypasses RLS anyway, and keeping the rules out of the database keeps it portable (see ADR 0002). The consequence: a query without an `ownerId` filter is a data leak, and tables without their own `ownerId` (`SizePack`, `OrderPack`, `OrderItem`) are only ever reached through an owned parent.
