# StepForm

The app's create/edit form: a shadcn-style compound component. `catalog/catalog-form.tsx` is the
reference build; read it next to this file (`orders/order-form.tsx` for a list of records and a
Summary). The step-by-step for a new form is the
`stepped-form` skill.

## Anatomy

```tsx
const flow = useStepForm({
  editing,
  steps: [{ label: t("stepDetails"), canLeave: () => form.trigger("name") }, …],
});

<StepForm flow={flow} onSave={(e) => void form.handleSubmit(save, onInvalid)(e)}
  cancelHref="/catalog" dirty={form.formState.isDirty} pending={pending}>
  <StepForm.Header title={editing ? t("edit") : t("new")} />
  <StepForm.Pane>
    <StepForm.Step index={0}>
      <StepForm.StepHeader illustration="sneaker" title={…} hint={…} />
      <StepForm.Field label={…} htmlFor="name" error={…}><Input className={roomy.field} … /></StepForm.Field>
    </StepForm.Step>
  </StepForm.Pane>
  <StepForm.Preview label={…}>
    <StepForm.PreviewImage>…</StepForm.PreviewImage>
    <StepForm.PreviewTitle placeholder={…} subtitle={…}>{name}</StepForm.PreviewTitle>
    <StepForm.PreviewRows><StepForm.PreviewRow label={…}>{value}</StepForm.PreviewRow></StepForm.PreviewRows>
  </StepForm.Preview>
  <StepForm.Actions saveLabel={tc("save")} />
</StepForm>
```

- **State lives in the form** (`useStepForm`), so the form's own code can move it: a failed save
  calls `flow.goTo(i)` on the step with the problem. Parts read it from context
  (`useStepFormContext` inside the tree).
- **Each part places itself by grid slot**, so JSX order is free. The Preview gets its column
  only when it's rendered and the content panel is wide enough: layout inside follows the room
  the sidebar leaves, so size things with container queries (`@xl:`, `@5xl:`), not window
  breakpoints.
- **Submit continues** until the form can save (`flow.saves`): new records walk the steps in
  order, existing ones save from any step. Enter in a field does what the primary button says.
- **Where it opens:** step 0, or `useStepForm({ start })`; an existing order opens on Review.
- **Summary** stands in for the Preview where there's no room for it (phones, narrow panels):
  a bar under the header reading a name and a total that opens to the same facts. Put it
  before `Preview` in JSX: it hides itself when a later Preview sibling has its column.
- **A one-page form** (the Customer form): `steps: []`. The bar disappears and Actions shows
  only Save. Skip `Step` and put the content straight in `Pane`.
- **Actions** picks Back / Continue / Save from the state; `aside` puts a short line (the
  order's counts) at the row's start on a computer. Compose `<StepForm.Back />`,
  `<StepForm.Next />`, `<StepForm.Submit>` inside `<StepForm.Actions>` only for a different set.
- The forms sit inside the app layout with the sidebar (a full-screen version was rejected).
  On a computer the page holding a form is held to the window's height (the app layout's
  `SidebarInset`), the pane is a card filling the space left, and a step longer than that
  scrolls inside the pane, with the buttons staying put. The scroll area is an inner box,
  inset from the card's rounded corners and `relative`, so absolutely placed children (sr-only
  radios) can't hang off it and make the window scroll too. On a phone the pane isn't a card, the
  page scrolls, and the actions are a fixed bottom bar.

## Controls inside a step

Use `roomy` (`roomy.ts`) for every control a step builds itself: `field` (48px, 16px corner,
16px text, no number spinners), `area`, `label`, `button` (52px phone / 44px computer), `raised`
(secondary), `press`, `scrollbar` (transparent track, thumb in the text colour). Fields sit on the card without a fill of their own. Every string goes
into both `messages/*.json`; Hebrew wording from the root `CLAUDE.md` Terms.

A list the user adds to (Packs, order lines) uses `useAddedItem`: the item just added takes the
focus and eases in. Without it the cursor stays on the "Add" button and a typed space adds a
second item. When the hook lives above the step (the order form's models), `reset()` it when
the step changes and when an item folds or opens, or the item eases in again each time.

A list whose items are too big to show open at once (the Order's models) folds each item to
a row and opens one at a time: inline on a computer, in a bottom `Drawer` on a phone
(`orders/order-form.tsx`). An item left empty is dropped when it closes. The sheet is outside
the `<form>` and its `@container`, so its fields get the narrow layout.

## Motion

Emil Kowalski's rules (the `emil-design-eng` skill; load it before adding motion). Every motion
here has a named job, stays under 300ms, animates `transform`/`opacity` only, and keeps its fade
under reduced motion while dropping the movement.

| Moment | Recipe | Lives in |
|---|---|---|
| Step change | slides 12px from the side you move toward (`slide-in-from-end-3` forward, `-start-3` back; they flip in RTL) + fade, 200ms `ease-out-quint`, entry only | `Step` |
| Step illustration | grows from 96% with its step | `StepHeader` |
| Step bar | ink fill `scale-x` from the start edge, 300ms `ease-in-out-quint`, a transition; dot colours 200ms `ease`; ✓ enters from 90% | `Header` |
| Item added | `roomy.enter`: from 97%, −4px, opacity 0, 200ms `ease-out-quint` | `useAddedItem` |
| Items generated together | `roomy.cascade` + `cascadeDelay(i, count)`: 30ms apart, squeezed so the wave spans ≤300ms | e.g. `size-list-input.tsx` |
| Summary bar opens | content `roomy.appear`, chevron turns 180° in 200ms `ease-out-quint`; no height animation (the step below would slide) | `Summary` |
| Press | `scale(0.97)` while pressed, 150ms, enabled controls only | `roomy.button` / `roomy.press` |
| Error line | `roomy.appear`: from −4px + fade, 150ms | `Field` |

Reasons, so new motion stays in family:
- **Entry only, no exits**: an exit makes every Continue wait. The Order form is used tens of
  times a day.
- **Transitions over keyframes** for anything the user can retrigger quickly (they retarget
  mid-way); `@starting-style` (`starting:`) gives an entry transition without JS.
- **`@starting-style` plays on every insertion**, and a step's content remounts each time the
  step opens. Gate entering styles to the user's action (`useAddedItem`, a `live` flag set by the
  action) so existing items stay still on open and in edit mode.
- Kept out on purpose: smooth scroll between steps, animated preview numbers, idle or bobbing
  illustrations, celebrations on save.

Tailwind v4 facts that bit us:
- `scale-*` sets the CSS `scale` property, so transition `scale`, not `transform`.
- There is no bare `ease` utility; write `ease-[ease]`.
- `tw-animate-css` claims `delay-*` for animation delay; set a transition delay with
  `[transition-delay:…]`.

## Checking motion

A Claude in Chrome tab in the background freezes animations at frame 0 (`document.visibilityState`
is `hidden`), so measure motion in the `browser-check` script instead: slow it to 10% and sample
`getComputedStyle` (opacity, `scale`, `translate`) or take frames.

```js
const cdp = await page.context().newCDPSession(page);
await cdp.send("Animation.enable");
await cdp.send("Animation.setPlaybackRate", { playbackRate: 0.1 }); // 200ms -> 2s
```

The dev server sometimes keeps a stale `messages/*.json` and reports a new string as missing;
`pnpm --filter web build` and the e2e suite give the real answer.
