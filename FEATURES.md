# Features

What the Shoe Order Manager can do today (v1). This is the user-facing feature
list; see `CLAUDE.md` for the technical architecture.

> **Status:** M0–M6 built, verified, and committed. M7 (cloud deploy for
> multi-device access) is the deliberate next step — see
> [Not built yet](#not-built-yet).

## At a glance

| Area | What you can do |
|---|---|
| **Login** | Secure email + password sign-in (one account for now) |
| **Customers** | Add/edit/delete the stores you sell to; see each one's order history and balance |
| **Catalog** | Keep a list of shoe models (with a default price) to reuse in orders |
| **Orders** | Create orders with catalog or custom items, sizes, colors, quantities, prices |
| **Payments** | Record payments (full or partial), track who still owes money |
| **Share** | Send the order as a **PDF over WhatsApp**, or print it |
| **Reports** | Who owes money, a customer's history, sales by month/week |
| **Dashboard** | Key numbers + who owes money + recent orders at a glance |
| **Languages** | Full **Hebrew (RTL)** and **English**, switch anytime |
| **Dark mode** | Light / dark / follow-the-system |

---

## Login
- Sign in with email + password. Sign out from the sidebar (bottom-left user menu).
- Dev account: `admin@example.com` / `changeme123` (change before real use).

## Customers (the stores you sell to)
- **List** — name, contact, phone, number of orders, and outstanding balance.
- **Add / edit** — name (required), contact person, phone, address, notes.
- **Customer page** — their details plus a full **order-history table**.
- **Delete** — with confirmation; blocked (with a message) if the customer still has orders.

## Catalog (shoe models)
- A reusable list of models you sell often, each with an optional **default price** and active/inactive flag.
- Add / edit / delete (delete is blocked if the model is used in an order).
- When building an order, picking a model **auto-fills its price**.

## Orders
- **Create / edit** with any number of line items. Each line is either:
  - a **catalog model** (pick from your catalog), or
  - a **custom item** (free text — for one-off/special pairs).
  Each line has size, color, quantity, and unit price, with **live line + order totals**.
- **Order list** with filters: All / Open / Unpaid. Each order has a running number (#1, #2, …).
- **Order page** — customer, line items, totals, and a **Done / Reopen** status toggle.
- Delete with confirmation.

## Payments
- **Record a payment** (amount + optional note) against an order — supports **partial payments** over time.
- **Mark fully paid** in one click.
- Payment **status** (Unpaid / Partial / Paid) and the balance update automatically; a **payment history** is kept, and any payment can be removed.

## Share an order
- **Send on WhatsApp** — turns the order into a **PDF** and, on a phone, opens the share sheet so you can send it into a WhatsApp chat as an attachment. Hebrew prints perfectly. *(On a computer it downloads the PDF and opens the WhatsApp text link, since phones are what attach files to WhatsApp.)*
- **Print / PDF** — a clean invoice you can print or Save as PDF.

## Reports
- **Who owes money** — every customer with an outstanding balance, biggest first, with a total.
- **By customer** — pick a customer to see their orders plus totals (ordered / owed).
- **Sales** — totals by **month or week**: number of orders, gross sales, amount collected, and outstanding.

## Dashboard
- Four key numbers (outstanding balance, open orders, total orders, customers),
  a **who-owes-money** list, and a **recent orders** table.

## Languages & appearance
- **Hebrew (right-to-left)** and **English**, switchable from the top bar or the user menu; the whole layout (including which side the sidebar is on) flips for Hebrew.
- **Dark mode** toggle in the top bar (light / dark / system).
- Money is shown in shekels (₪); the app stores it exactly (in agorot) so totals are always precise.

---

## Not built yet

- **M7 — Cloud (multi-device):** the app currently runs **locally** on one computer (its data lives in a local SQLite file). Moving to the cloud (Turso database + hosting) is a deliberate later step that unlocks:
  - using it from **any device** (phone + computer) on the same account,
  - a **one-tap** "send the order as a link" over WhatsApp,
  - and adding **more users** (e.g. staff) — the data model already supports this.
- **Optional:** a sales **bar chart** on the Reports page.

## Running it (quick reference)

```bash
pnpm install
pnpm db:migrate   # set up the database (first time)
pnpm db:seed      # create the login account
pnpm dev          # http://localhost:3000
```
