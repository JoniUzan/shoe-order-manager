# Shoe Order Manager

A wholesale shoe business's order book: the business sells shoes to retail stores and tracks
their orders and payments. Hebrew is the UI wording, given after each term.

## Language

### People

**User**:
A person who signs in and runs one business; all their Customers, catalog and Orders belong to
them alone.
_Avoid_: Owner, account, tenant

**Customer** (לקוח):
A retail store that buys from the User. Never signs in.
_Avoid_: Client, store (as the entity)

**Business details** (פרטי העסק):
The User's own name, phone, address and tax ID, printed on every Order and WhatsApp message.

### Joining

**Sign-up** (הרשמה):
Creating a User; open to anyone.
_Avoid_: Register

**Onboarding**:
The welcome dialog after Sign-up: language, then name, avatar and theme, then Business details.
_Avoid_: Setup wizard

### Catalog

**Shoe model** (דגם):
A catalog entry: name, SKU, default price and size run. The catalog (קטלוג) is all of them.

**Product image** (תמונת מוצר):
The one photo of a Shoe model, shown wherever the model appears, including both PDFs.
_Avoid_: Image (alone: that's the User's avatar)

**Pack** (סדרה):
A Shoe model's fixed pairs-per-size, e.g. 38×3, 39×2, 40×3; that spread is its **curve**.
_Avoid_: Series, set

### Ordering

**Order** (הזמנה):
What a Customer buys, numbered per User (#1, #2, …).
_Avoid_: Invoice

**Line item** (שורה / פריט):
One size of one Shoe model (or a Custom item) with a quantity and a unit price.

**Cartons** (קרטונים):
How many of a Pack an Order takes.
_Avoid_: Packs (for the count)

**Loose pairs** (זוגות בודדים):
Pairs ordered outside any Pack.
_Avoid_: Extra items

**Custom item** (מותאם):
A Line item described in free text instead of a Shoe model. An Order with any Custom item is a
**custom order**.

**Material** (חומר):
What a Line item's upper is made of (e.g. leather, synthetic), chosen per order block like color.
_Avoid_: Upper, fabric

**Sole** (סוליה):
What a Line item's sole is made of (e.g. rubber, EVA), chosen per order block like color.
_Avoid_: Material sole

### Fulfilment

**Order status** (סטטוס):
An Order's fulfilment stage: not done or done. More stages may be added.

**Open order** (הזמנה פתוחה):
An Order whose Order status is not done: still to be made or delivered.
_Avoid_: Unpaid order

**Picking** (ליקוט):
Gathering an Order's Cartons and Loose pairs for delivery.
_Avoid_: Packing

**Production sheet** (דף ייצור):
An Order as sent to the factory: pairs per model, color and size, with only the Customer's name.
Not an Order of its own.
_Avoid_: Factory order, factory invoice

**Factory note** (הערה למפעל):
An Order's note meant for the factory, printed only on the Production sheet.

### Money

**Payment** (תשלום):
One amount a Customer paid toward an Order.

**Paid** (שולם):
The sum of an Order's Payments.
_Avoid_: Deposit (as a separate concept)

**Balance** (יתרה):
An Order's total minus Paid: what's still owed. Never below zero when shown as debt.

**Payment status**:
Unpaid, partial or paid, derived from an Order's total and Paid.

**Order summary** (סיכום הזמנה):
An Order as a PDF for its Customer: pairs per size, Cartons, prices, totals, Paid and Balance.
_Avoid_: Invoice

## Relationships

- A **User** has many **Customers**, **Shoe models** and **Orders**; each belongs to exactly one User
- A **Shoe model** has at most one **Product image** and any number of **Packs**
- An **Order** belongs to one **Customer** and has many **Line items** and **Payments**
- An Order takes a **Pack** as **Cartons**; each carton becomes Line items copied from the Pack's
  curve at that moment, so a later edit to the Pack doesn't change the Order
- **Paid**, **Balance** and **Payment status** all follow from an Order's total and its Payments
- An Order prints two ways: the **Order summary** for the Customer and the **Production sheet**
  for the factory

## Flagged ambiguities

- "מקדמה" (deposit) in the UI means **Paid**, the total of all Payments, not only an up-front
  payment.
- An **Open order** is about fulfilment, not money: an unpaid Order can be done, and a fully paid
  one can still be open.
- **Material**, **Sole** and the **Factory note** are factory-side only: they never reach the
  Customer (not on the Order summary or WhatsApp), and Material and Sole don't change the price.
- The Production sheet leaves out Packs, Cartons, prices, totals and Payments.
