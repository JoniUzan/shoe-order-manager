# Pages stream their sections behind skeletons

A page used to do every read at its top and render nothing until the slowest one came back, behind
one spinner (`(app)/loading.tsx`). Now each route has its own `loading.tsx` drawn in the shape of
the page, and inside a page each section that needs data is an async Server Component behind its
own `<Suspense>`, with a skeleton of that section as the fallback. The header, tabs and actions
render at once; the stat cards, a chart, a table each appear when their own query does.

What stays at the top of a page, before anything streams:

- `requireUser(locale)`. It is wrapped in React `cache()`, so each section calls it again for free.
- **The record a detail page is about.** The order or Customer is fetched first so a missing id
  still ends in `notFound()` and the header has its title, number and badges. Only what hangs off
  it (items, payments, the Customer's orders) streams.
- **Anything that chooses the page's layout.** The dashboard counts orders, Customers and models
  first: a new business gets `GetStarted` or the no-orders card, never a dashboard skeleton that
  turns into something else.

Forms are not split: a form is one unit, so its route's `loading.tsx` is the whole story. The
dashboard's `loading.tsx` is only a header's shape, for the same reason it counts first.

**A `loading.tsx` covers every route under it**, and on a navigation the outermost new one shows.
So the list and detail pages sit in route groups with their own (`orders/(list)/`,
`orders/[id]/(view)/`, `(home)/`): otherwise `/orders/new` would open on the orders list's
skeleton, and an order's edit form on the order page's.

**Skeletons are drawn from the real layout.** The pieces live in `components/skeletons/` and use
the same frames as the content (`TableFrame`, `GlassCard`, `Card`). Text that comes from the
translation files (a card's title, a table's column headings, a form step's name) is drawn for
real; only data is grey. A skeleton appears after 150ms, so a fast response never flashes, pulses
unless the User asks for reduced motion, and its fill is `--skeleton` (ink at 7%, 9% in dark):
shadcn's `bg-accent` is the same colour as the surface in dark and vanishes on a glass card.

**Filtering, sorting and paging keep the old rows.** List state lives in the URL and changes inside
a transition, and React keeps an already-shown Suspense boundary on screen during a transition, so
the old table stays, dimmed by `TableFrame`'s `isPending`, until the new one is ready. The
boundaries are not keyed by search params: a skeleton on every keystroke would make the table jump.

**Empty is not an error.** A section with no data shows its empty state, as before. A section whose
query throws is not caught in place: the error goes to `app/[locale]/error.tsx` and the whole page
is replaced by the error page. A failed query never reads as "no payments yet".

## Considered options

- **One generic skeleton for every route.** Rejected: a skeleton is worth having when it looks like
  what is about to appear.
- **`loading.tsx` only, no boundaries inside pages.** Simpler, but the page still waits for its
  slowest query; the dashboard's chart would hold back its stat cards.
- **An error card per section.** Rejected by the User: on a real error they want the error page and
  nothing else, not part of a page that looks finished.
