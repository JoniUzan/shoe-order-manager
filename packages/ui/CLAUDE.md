# @repo/ui

shadcn/ui primitives (new-york style, Radix, lucide icons) and the whole theme. Imported as
`@repo/ui/components/<name>`, `@repo/ui/lib/utils`, `@repo/ui/hooks/<name>`.

## What lives here

- **Primitives only**: the shadcn components, plus the few hooks and helpers they need.
  Components that know about orders, customers or translations live in
  `apps/web/src/components/<area>/`.
- **The theme**: `src/styles/globals.css` holds the Tailwind v4 setup, every color token for
  light and dark, and the base layer. The app's own `globals.css` only imports it. Its header
  comment is the design brief: read it before touching a color.

## Adding or changing a component

- Add from the repo root with `pnpm dlx shadcn@latest add <name> --cwd apps/web`. The two
  `components.json` files send primitives here and app components to `apps/web`. The
  `use-mobile` hook sometimes has to be created by hand.
- Edits to a generated component are ours now; keep them, and re-apply them if a component is
  re-added.
- Use Tailwind **logical** utilities (`ms-`, `pe-`, `start-`, `text-start`) so every component
  flips for Hebrew RTL on its own. Directional icons (chevrons, arrows) need `rtl:rotate-180`
  or a mirrored pair.

## Design rules

- One font family: the system stack with Rubik carrying Hebrew. Align numbers with
  `tabular-nums`.
- Color is rationed as listed at the top of `globals.css`: teal `--primary` for one action per
  screen, `--destructive` only for irreversible actions, `--tint-*` only for payment state,
  `--chart-*` only for chart series. Everything else stays ink on paper, and gradients stay where they already are (card sheen,
  ambient light, chart fills, the sign-up wash).
- `.glass-card` (`GlassCard`) is the dashboard's material and nowhere else; the rest of the
  app stays `.surface-raised`.
- New or redesigned UI is designed on a Claude Design canvas and approved before it's built
  (see the root `CLAUDE.md`).
