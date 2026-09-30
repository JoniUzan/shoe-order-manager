---
name: domain-modeling
description: Build and sharpen this repo's domain model. Use when discussing its terminology, editing the Terms table in the root CLAUDE.md, or recording or editing an ADR in docs/adr/.
---

# Domain modeling

Actively build and sharpen the domain model while designing: challenge terms, invent edge-case
scenarios, and write the vocabulary and decisions down the moment they settle. Merely *reading*
the Terms for vocabulary is not this skill; this one is for when the model changes.

Adapted from Matt Pocock's `domain-modeling` (MIT, see `../grilling/LICENSE`). Upstream writes a
`GLOSSARY.md`; this repo already keeps its glossary as the **Terms** table in the root
`CLAUDE.md`, so that table is the glossary. Don't create a `GLOSSARY.md`.

## Where things live

- **Glossary:** the `## Terms` table in `/CLAUDE.md`: `Term | Hebrew | Meaning | Avoid`.
- **Decisions:** `docs/adr/NNNN-slug.md`, one per decision.
- **The model in code:** `packages/db/prisma/models/*.prisma` (entities), `packages/domain/src/`
  (rules and derived values), `apps/web/messages/he.json` (the Hebrew the UI actually shows).

## During the session

### Challenge against the Terms

When the user uses a word that conflicts with the Terms (or with an _Avoid_ entry), call it out
right away: "The Terms say a Pack's count is Cartons, and 'packs' is on the Avoid list. Do you
mean Cartons here?"

### Sharpen fuzzy language

When a word is vague or overloaded, propose the precise one: "You said 'account'. Do you mean
the User (who signs in) or the Customer (a store that never signs in)?"

### Discuss concrete scenarios

Test relationships with specific scenarios that probe the edges: an order that is fully paid and
then gets another line item; a pack edited after an order used it; a Customer deleted while they
still owe a Balance.

### Cross-reference with code

When the user says how something works, check the schema, the domain rules and the Server
Actions. If they disagree, say so: "`payments.ts` recomputes Paid from every Payment, but you
just described the deposit as a separate amount. Which one is right?"

### Update the Terms inline

When a term is settled, edit the Terms table right away, not at the end. One row per term:

- **Term:** bold, English, as used in code and conversation.
- **Hebrew:** the UI wording. Check `he.json` for what the app already says, and ask the user
  when there's no Hebrew word yet. Never invent one.
- **Meaning:** one or two sentences on what it *is*. A code name (`ownerId`, `depositAgorot`)
  goes in only when the code name differs from the term.
- **Avoid:** the synonyms not to use, comma-separated.

Only terms specific to this business go in, never general programming concepts. The table is a
glossary: no implementation details, specs or scratch notes. When a term is renamed, tell the
user which code and message keys still use the old word. Rename them only if they ask.

### Offer ADRs sparingly

Offer an ADR only when all three are true:

1. **Hard to reverse:** changing your mind later costs something real.
2. **Surprising without context:** a future reader would ask "why is it like this?"
3. **A real trade-off:** there were real alternatives and one was picked for reasons.

If any one is missing, skip it. Most sessions produce no ADR.

## ADR format

Match the existing ones in `docs/adr/`. Take the next number after the highest one there.

```md
# {The decision, stated as a sentence}

{One or two paragraphs: the context, what was decided, and why. Name the code it shapes
(functions, columns, packages) so a reader can find it.}

## Considered options

- {A rejected alternative}: {why it lost}.
```

`## Considered options` is optional; include it only when the rejected options are worth
remembering. A new ADR that changes a rule in a `CLAUDE.md` also updates that `CLAUDE.md`,
the way the root "Rules that hold everywhere" cite their ADRs.
