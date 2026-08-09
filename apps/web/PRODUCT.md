# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

**Primary: the owner-operator of a B2B wholesale shoe business** — one person who sells
shoes to retail stores. "Customers" in this product always means *stores that buy*, never
end consumers.

They work the same account across three real scenes:

- **Laptop/desktop at the office** — entering orders after a visit, recording payments,
  chasing balances, running reports.
- **Phone, in the field** — standing in a customer's store, writing the order while the
  buyer is still talking, often one-handed.
- **Phone, evening/off-hours** — quick checks: who owes money, did that order get paid,
  resend a confirmation.

**Secondary: additional accounts are expected.** The data model is already per-owner
scoped (`ownerId` on every record) so a second seller or an assistant can be added; this
is anticipated, not yet built.

**Language: Hebrew and English are both genuinely used by people inside the app** — not a
Hebrew app with an English courtesy translation. Hebrew is RTL. Both locales are
first-class and must stay at parity.

## Product Purpose

One place where a wholesale order is **written, priced, confirmed to the store, and
tracked until it is paid**.

It replaced *all* of what came before it, at once: the paper order pad, spreadsheets,
orders living inside WhatsApp threads and the phone's notes app, and a commercial
order/invoicing tool that did not fit how this business actually works.

Success looks like: an order captured completely while the buyer is still in front of
you, a confirmation in the store's hands minutes later, and never being unsure who owes
what.

## Positioning

A neighboring product could copy the CRUD. What it could not truthfully copy:

- **The two jobs that must be effortless are order capture and sending the confirmation** —
  the whole product is tuned around those two, not around inventory, accounting, or CRM.
- **The catalog is optional, not a gate.** A line item is a catalog model *or* free text.
  One-off and special pairs are first-class, because that is how this trade sells.
- **WhatsApp is the channel of record** to stores — the confirmation is a PDF the store
  keeps, not a login they have to accept.
- **Hebrew RTL is a primary layout**, designed alongside English rather than retrofitted.
- **Built for one operator across three devices**, not for a team that shares a desk.

## Operating Context

- **Three usage scenes** (office desktop, in-store phone, evening phone) — every core task
  must be completable in all three, including one-handed on a phone in a shop.
- **The confirmation leaves the app.** "Send on WhatsApp" renders the order to PDF and
  opens the share sheet on a phone (on desktop it downloads the PDF and opens the WhatsApp
  text link). There is also a print/Save-as-PDF invoice view. Hebrew must render correctly
  in both.
- **Orders carry a human-friendly running number** per owner (#1, #2, …) used when talking
  to a store.
- **Money is shekels (₪)**, stored exactly as integer agorot. Sizes are free text ("42",
  "42.5", "US 9") because size systems differ per supplier.
- **Runs locally today** on a single machine over SQLite. Cloud (Turso + hosting) is the
  deliberate next step and is what unlocks true multi-device use, a one-tap shareable order
  link, and additional users.

## Capabilities and Constraints

Built and in use (see `FEATURES.md` for the full user-facing list):

- **Customers** — stores with contact, phone, address, notes; order history and outstanding
  balance per store. Deletion is blocked while orders exist.
- **Catalog** — reusable shoe models with an optional default price and an active flag;
  picking one auto-fills its price. Deletion blocked once used in an order.
- **Orders** — any number of line items, each a catalog model **XOR** free text, with size,
  color, quantity, unit price and live line/order totals. List filters: All / Open / Unpaid.
  Done / Reopen status toggle.
- **Payments** — partial payments over time, one-click mark-fully-paid, payment history,
  removable payments. Payment status (unpaid / partial / paid) and balance are derived.
- **Reports** — who owes money, per-customer history, sales by month or week.
- **Dashboard** — four key numbers, who-owes-money, recent orders.
- **Hebrew (RTL) + English**, light/dark/system.

Constraints that bind future work:

- Totals, balances, and payment status are **computed in app code**, never stored by hand
  and never derived by the database.
- Order statuses are a lookup table meant to be **extended by adding rows** (new / in
  production / ready / delivered), not by changing an enum.
- Single currency (₪). No VAT handling, no legal invoice numbering, no tax-document claims.
- No sales chart yet (explicitly deferred).

**Terminology:** "customer" = a retail store; "order", not "invoice"; "catalog" = the
shoe models this business sells; money in shekels, stored in agorot.

## Brand Commitments

- Working name: **Shoe Order Manager** (no confirmed final brand name).
- **Hebrew/English parity is binding** — no surface ships in one locale only, and Hebrew is
  designed as RTL, not mirrored as an afterthought.
- No logo, wordmark, brand palette, typography, or identity assets have been established.

## Evidence on Hand

- Real artifacts: `README.md`, `FEATURES.md`, the Prisma schema, and the working app.
- **No real customer data, order data, photography, logos, testimonials, case studies,
  press, pricing, or usage metrics exist.** The database holds seeded/dev data only.
  Future work must not fabricate any of these — including invented store names, revenue
  figures, or screenshots presented as real usage.

## Product Principles

1. **Capture beats completeness.** An order must be enterable while someone is talking.
   Anything beyond customer + one line item is optional at entry time.
2. **Hebrew is not a translation.** RTL is a primary layout; both locales ship together
   and stay in sync.
3. **The numbers must always be trustworthy.** Money is exact, totals and balances are
   derived, never hand-typed, and always reconcile with the payment history.
4. **The confirmation is the handshake.** What leaves the app — the PDF, the WhatsApp
   share, the printed page — is as much the interface as any screen, and is the only part
   the store ever sees.
5. **One operator, three devices.** Every core task must be doable at a desk *and*
   one-handed on a phone in a shop.

## Accessibility & Inclusion

No formal conformance standard has been established. Product-specific needs that are real:

- **RTL correctness** across every surface, including printed/PDF output.
- **Field conditions** — one-handed phone use, generous touch targets, and legibility in
  shop lighting for the order-entry and confirmation paths.
- **Dark mode** is in genuine use (evening phone checks), not decorative.
