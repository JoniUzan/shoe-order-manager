---
name: stepped-form
description: Build or redesign a create/edit form (order, customer, catalog or any new record) on the shared StepForm component, with its layout and motion. Use when making a form, splitting one into steps, or restyling an existing form.
---

# Stepped form

The rules (anatomy, `roomy`, the motion recipes and their reasons) are in
`apps/web/src/components/step-form/CLAUDE.md`. Read it first, then `catalog/catalog-form.tsx`,
the reference build. The form is done when every step below is complete.

## 1. Design

- The screen is on the Claude Design canvas (https://claude.ai/artifact/11jJoEreqLrZUSvaeEittK,
  "משולב" rows) and approved. A screen with no board gets one drawn and approved first (root
  `CLAUDE.md`, "Design first for UI").
- List each step: its label, illustration (`ILLUSTRATIONS` in `components/ui/illustration.tsx`),
  hint, fields and `canLeave` check. A one-page form has no steps.

Done when every field on the board has a step and every step has its four facts.

## 2. Compose

- `useStepForm({ steps, editing })` in the form, then `<StepForm flow={flow}>` with Header,
  Pane, a `Step` per step, Preview if the board has one, and Actions.
- Every control the form builds itself uses `roomy`; lists the user adds to use `useAddedItem`;
  generated groups use `roomy.cascade` + `cascadeDelay`.
- Something two forms would both need goes into `step-form/` as a part or helper (with a line in
  its `CLAUDE.md`), and the second form reuses it. The form file keeps only its fields, its save
  and its preview's facts.
- New motion follows the `emil-design-eng` skill and gets a row in the Motion table.

Done when the form file imports its frame, buttons and step bar from `step-form/` and defines
none of its own.

## 3. Pages and tests

- The page renders the form directly under the app layout: no `PageHeader` (the form's Header is
  the title row).
- The area's e2e page object copies the catalog one (`apps/e2e/suites/catalog/locators.ts`):
  every `goto` waits for `form[data-ready]` (typing before hydration gets mixed with the saved
  values), plus `continue()`, `stepTitle()`, `goToStep()` (the bar on a computer, Back/Continue
  on a phone) and the Cancel/discard actions.
- Its specs cover what the catalog suite covers for this form: walking the steps, a missing
  required field, Enter continuing, a finished step reopening with its values, Cancel with and
  without changes, a failed save landing on its step, and saving an existing record from its
  first step.

Done when `pnpm typecheck`, `pnpm lint` and the area's e2e suite pass in all four projects.

## 4. Check

- Run the form in Chrome (Claude in Chrome or `browser-check`) in `/he` and `/en`, at 1440 and
  1280 with the sidebar, at a 390px phone, and in dark: every step, a real save, edit mode, the
  discard dialog.
- Measure the motion slowed to 10% (the snippet in the `CLAUDE.md`): direction in RTL and LTR,
  only new items entering, nothing playing on first load or in edit mode.

Done when every flow above has run with no page errors and you've reported what you saw.
