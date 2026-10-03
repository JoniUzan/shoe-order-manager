# Supabase is used as plain Postgres, and the schema stays portable

Status: partly superseded by ADR 0008. Production Postgres is Neon, not Supabase; the portability rules below still hold.

Production runs on Supabase, but only its Postgres: no Supabase Auth, RLS, storage or edge functions, and the schema uses no triggers, generated columns, DB-side UUIDs or DB date functions. Moving to any other Postgres host is then a `pg_dump` / `pg_restore` and a new `DATABASE_URL`. The price is that logic a database would normally own lives in app code: order totals and payment status (`recalculateOrderTotals`, recomputed on every write), the per-owner `orderNumber` (assigned in `createOrder`'s transaction, retried on a unique-constraint clash), and report time buckets (computed in JS instead of `date_trunc`).
