-- The order statuses every database needs before its first order. They were
-- seed rows; as a migration, production, previews and CI get them from the
-- same `migrate deploy`. A database seeded before this keeps its rows.
-- A new status later is a new migration like this one.
INSERT INTO "OrderStatus" ("code", "labelEn", "labelHe", "sortOrder", "isTerminal") VALUES
  ('not_done', 'Not done', 'לא הושלם', 10, false),
  ('done', 'Done', 'הושלם', 20, true)
ON CONFLICT ("code") DO NOTHING;
