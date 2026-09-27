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
| **Settings** | Your profile, password, saved language/theme, and the business details printed on orders |
| **Customers** | Add/edit/delete the stores you sell to; see each one's order history and balance |
| **Catalog** | Keep a list of shoe models (with a default price, size run and packs) to reuse in orders |
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
- Dev account: `admin@example.com` / `changeme123` — change it under **Settings → Password** before real use.
- After signing in you land in your saved language (see Settings), whichever login page you used.

## Settings
Open **Settings** from the account menu (click your name at the bottom of the sidebar). It opens as a
dialog over the page you're on; the address `/settings` (e.g. `/he/settings?tab=business`) also opens
it as a full page.
- **Profile** — your name and the email you sign in with (changing the email asks for your password).
- **Password** — change it (current password, new one of 8+ characters, confirm).
- **Preferences** — language and appearance (light / dark / system), saved to your account so every
  device opens the same way. The account menu's switches save here too.
- **Business** — business name, phone, address and tax ID (ח.פ / ע.מ), printed at the top of every
  order you print or send, and the business name opens the WhatsApp message.

## Customers (the stores you sell to)
- **List** — name, contact, phone, number of orders, and outstanding balance.
- **Add / edit** — name (required), contact person, phone, address, notes.
- **Customer page** — their details plus a full **order-history table**.
- **Delete** — with confirmation; blocked (with a message) if the customer still has orders.

## Catalog (shoe models)
- A reusable list of models you sell often, each with an optional **default price** and active/inactive flag.
- Add / edit / delete (delete is blocked if the model is used in an order).
- When building an order, picking a model **auto-fills its price**.
- **Packs (סדרות)** — up to 10 per model: a named box with a fixed number of pairs per size (e.g. *Standard pack*: 38×3, 39×2, 40×3). The pack's columns follow the model's size run; a size can't be removed from the run while a pack still uses it.

## Orders
- **Create / edit** with any number of line items. Each line is either:
  - a **catalog model** (pick from your catalog), or
  - a **custom item** (free text — for one-off/special pairs).
  Each line has size, color, quantity, and unit price, with **live line + order totals**.
- **Packs** — for a model with packs, take N of one or more packs plus extra single pairs; a total-per-size line shows what it all adds up to. Price stays per pair.
- **Packing summary** — an order with packs shows what to pick on the order page, the invoice and the WhatsApp text: "10 × Standard pack (38×3 · 39×2 · 40×3) + extra 41×1 — Packs to pick: 10 · Loose pairs: 1" (Hebrew: קרטונים לליקוט). An order keeps the pack as it was sold even if the catalog pack is later edited or deleted.
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
- **Hebrew (right-to-left)** and **English**, switchable from the account menu (click your name at the bottom of the sidebar); the whole layout (including which side the sidebar is on) flips for Hebrew.
- **Dark mode** — pick light / dark / system from the account menu's Theme submenu or Settings → Preferences.
- Money is shown in shekels (₪); the app stores it exactly (in agorot) so totals are always precise.

---

## Not built yet

- **M7 — Cloud (multi-device):** the database is moving to **Supabase** (Postgres) — done in code; the app itself still needs hosting (Vercel). Once both are live, that unlocks:
  - using it from **any device** (phone + computer) on the same account,
  - a **one-tap** "send the order as a link" over WhatsApp,
  - and adding **more users** (e.g. staff) — the data model already supports this.
- **Optional:** a sales **bar chart** on the Reports page.

## Running it (quick reference)

```bash
pnpm install
docker compose up -d   # local Postgres (copy the .env.example files first)
pnpm db:migrate   # set up the database (first time)
pnpm db:seed      # create the login account
pnpm dev          # http://localhost:3000
```
