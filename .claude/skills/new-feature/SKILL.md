---
name: new-feature
description: The path a feature takes through this repo, from schema to a checked screen. Use when adding a field, entity, screen, or Server Action, or when extending orders, customers, catalog, payments or settings.
---

# New feature

Work through the layers in order and finish each one before the next. The feature is done when
every applicable step below is ticked and the draft PR is open. For each step, read the
`CLAUDE.md` of the package it touches.

## 0. Before code

- New or redesigned UI: draw it on a Claude Design canvas and wait for the user's approval
  (root `CLAUDE.md`, "Design first for UI").
- Name things with the root `CLAUDE.md` Terms. A concept that isn't there gets a row added to
  the table in this PR, English and Hebrew.
- `git switch -c <branch>` and plan one commit per step below.

## 1. Data (`packages/db`)

- Model change in `prisma/models/<domain>.prisma`: `cuid()` ids, `Int` agorot for money,
  `ownerId` + `@@index([ownerId])` on anything a User owns, no DB-side logic.
- `pnpm db:migrate` with a descriptive name; export any new model type from both `src/index.ts`
  and `src/browser.ts`.
- Extend `prisma/seed-demo.ts` when demo data should show the feature.

## 2. Rules (`packages/domain`)

- The input's Zod schema, with limits and cross-field rules in `.refine`.
- Any derived value (totals, statuses) as a pure function here.
- Unit tests in `src/<area>.test.ts` for each rule and limit, in the same commit.

## 3. Server Action (`apps/web/src/lib/actions`)

- Re-validate with the schema, scope every query by `ownerId`, and return `{ ok }` /
  `{ ok: false, error }`.
- Derived money: recompute on write, and lock the order row first when reading payments to
  write a derived value.
- `revalidatePath` for every view that shows the data.
- An integration test in `<area>.test.ts` next to the action, in the same commit. It covers the
  success path, each `{ ok: false }` error, and another User getting `not_found` (see
  `apps/web/CLAUDE.md`, "Tests").

## 4. Reads and UI (`apps/web`)

- Server Component page: `requireUser(locale)` then an `ownerId`-scoped query (lists go through
  `lib/*-query.ts` and `list-params.ts`).
- Client form: same schema for validation, async submit, `router.push` after the await.
- Every string in both `messages/en.json` and `messages/he.json`; logical Tailwind utilities
  only.
- A new screen or flow gets a spec in its area's suite, `apps/e2e/suites/<area>/`, in the same
  commit. Controls it adds go in that suite's page objects (`apps/e2e/CLAUDE.md`).

## 5. Check and ship

1. `pnpm typecheck`, `pnpm lint`, `pnpm test:coverage` and `pnpm test:e2e` pass.
2. Run the `browser-check` skill on the new flow in `/he` and `/en` (and a phone viewport for
   dialogs or layout).
3. Update the `CLAUDE.md` whose rules the feature changed, and add an ADR in `docs/adr/` if you
   made a hard-to-reverse choice with a real alternative.
4. Push and open the PR with `gh pr create --draft`.
