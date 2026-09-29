# Shoe Order Manager

A wholesale shoe business's order book: the business sells shoes to retail stores and tracks their orders and payments.

## Language

### People and accounts

**User**:
A person who signs in; each User runs exactly one business, and all their data (customers, catalog, orders) belongs to them alone.
_Avoid_: Owner (only as the code's `ownerId`), account, tenant

**Customer**:
A retail store that buys from a User. Never signs in.
_Avoid_: Client, user, store (as a noun for the entity)

**Business details**:
The User's own business name, phone, address and tax ID, printed at the top of every order the User prints or sends on WhatsApp.

### Joining

**Sign-up**:
Creating a new User with name, email and password; open to anyone. Ends with the User signed in.
_Avoid_: Register, onboarding

**Onboarding**:
The welcome dialog shown after Sign-up, where the User picks Language, then their name, Avatar and Theme together ("Make it yours"), then enters Business details. Each step saves as it goes.
_Avoid_: Sign-up, setup wizard

**Avatar**:
One of a set of preset orbs the User picks to represent themselves; if they never pick, they get the orb generated from their email. Not an uploaded photo.

## Relationships

- A **User** has many **Customers**; a **Customer** belongs to exactly one **User**
- **Sign-up** creates a **User**; **Onboarding** follows it and only edits that User's preferences and **Business details**

## Flagged ambiguities

- "Preferences" was used as a step name — resolved: it is the umbrella for Language, Theme and Avatar, not a separate step.
