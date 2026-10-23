# e2e (Playwright suites)

End-to-end tests for `apps/web`, run against its production build (`next start` on :3100)
and the `shoe_test` database. `pnpm test:e2e` from the root builds `web` first. Locally,
`pnpm --filter e2e test:e2e` reuses a server already on :3100, and needs `docker compose up -d`
(Postgres and S3 storage).

## Layout

```
fixtures/        shared by every suite
  index.ts       test, expect, t, account (created, logged out), user (logged in), page-error guard
  db.ts          factories: createAccount, createCustomer, createModel, createOrder, unique()
  shell.ts       AppShell: sections and user menu (the tab bar and header avatar on a phone)
  i18n.ts        t(): the UI string in the project's locale, ICU-formatted like next-intl
suites/<area>/
  locators.ts    page objects
  setup.ts       this suite's prerequisites
  *.spec.ts      flows and assertions
```

## Rules

- **Page objects, one class per screen**, constructed with `(page, t)`. They hold locators and
  actions on that one screen (`pickCustomer(name)`, `addPack(cartons)`). Assertions and flows
  that cross screens stay in the spec. A spec never builds a locator from a selector itself.
- **Find controls by what the user reads**: role plus `t("ns.key")`, or a label. Use an `#id`
  only where the app gives one to a form field. No CSS classes. If a control has no accessible
  name, that's worth reporting as an app bug.
- **Only the feature under test goes through the UI.** `setup.ts` puts everything else straight
  into Postgres, owned by the test's own User. Tests share nothing and never clean up.
- **Every project runs every spec**: he and en, desktop and phone. A phone-only difference (a
  sheet, a menu instead of a nav) goes inside the page object.
- **Wait on outcomes**: a URL, visible text, or `expect.poll` on the database. Never use a
  fixed timeout, and never wait on a toast or the 2-second "saved" mark.
- **A page that streams** (ADR 0012) has its text in the DOM twice for a moment: a skeleton's
  real label, or content parked hidden until React swaps it in. A page object's `goto` for such
  a page ends with `streamed(page)`, which waits until no skeleton is left.
- The `pageErrors` fixture fails a test on any page error or console error.
- A known app bug stays in the suite as `test.fixme`, with a comment saying why.
- The package is `"type": "module"` because Prisma's client only loads as ESM. Imports use the
  `.ts` extension.
