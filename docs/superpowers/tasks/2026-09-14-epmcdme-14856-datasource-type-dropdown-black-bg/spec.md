# Spec: Datasource Type dropdown item gets a black background after Description textarea interaction (EPMCDME-14856)

## Problem

On the Create Data Source page, opening the "Datasource Type" dropdown, clicking into the
"Description" textarea, and reopening the dropdown leaves the previously-selected item (e.g.
"Git") with a solid black row background instead of the theme's normal selected/hover highlight.
Other rows render normally. Confirmed in dark theme.

## Confirmed facts (from source inspection, not the ticket)

- Component chain: `DataSourceForm.tsx` renders `DataSourceTypeSelector.tsx` (Datasource Type
  field) and the shared `Textarea` (Description field) as sibling fields.
  `DataSourceTypeSelector` wraps `src/components/form/Autocomplete/Autocomplete.tsx`, a thin
  wrapper around PrimeReact's `<AutoComplete>`.
- Item styling is defined entirely in `src/components/form/Autocomplete/ptPreset.ts`'s `item`
  pass-through (`pt`) callback. It conditions styling only on `context.selected` (applies
  `bg-surface-base-navigation`) plus a static `hover:bg-surface-specific-dropdown-hover`.
- Verified against PrimeReact's own `AutoCompletePanel` source
  (`node_modules/primereact/autocomplete/autocomplete.cjs.js`): the `context` object passed into
  the item `pt` callback is `{ selected, disabled }` only — there is no per-item "focused" or
  "highlighted" flag exposed to `pt.item` for this component. `DataSourceTypeSelector`'s
  `itemTemplate` is static markup with no local state that could explain the leak either.
- The app runs PrimeReact with `unstyled: false` (`src/constants/theme.ts`) and a global `pt`
  preset (`LaraReact`, `src/styles/presets/lara/`) that only overrides `inputswitch`, `tag`,
  `checkbox`, and `dropdown` — it has no `autocomplete` key, so nothing at the global-preset layer
  targets this component either.
- **Root cause is not yet pinned to an exact CSS rule or PrimeReact internal state.** The
  mechanism connecting "blur to the Description textarea, then reopen" to a black item background
  was not established by static reading and needs to be diagnosed in a running browser/test before
  a fix is written — see Approach.

## Approach

- Fix belongs in `src/components/form/Autocomplete/ptPreset.ts` (and, only if diagnosis shows it's
  necessary, `Autocomplete.tsx`'s event handling) — this is the shared component behind every
  Autocomplete consumer in the app, matching this codebase's existing per-component `pt`-override
  convention (see `ToolCallPolicyDropdown`, `IntegrationSelectDropdown` for the Select/Dropdown
  family). Fixing it here benefits all Autocomplete consumers, not just `DataSourceTypeSelector`.
- Diagnosis is part of implementation, not this spec: reproduce the exact sequence (open dropdown
  → focus Description textarea → reopen dropdown) and inspect the resolved DOM classes/computed
  style on the affected item to identify what causes the fallthrough to an unthemed/black
  appearance, before changing `ptPreset.ts`. Use `systematic-debugging` and write the reproducing
  test first (`test-driven-development`).
- Whatever the mechanism, the fix must ensure every reachable visual state of a list item —
  first open and after a blur-elsewhere/reopen cycle — resolves to one of the already-established
  semantic tokens (`bg-surface-base-navigation` selected, `hover:bg-surface-specific-dropdown-hover`
  hover, transparent/`text-text-primary` otherwise), never to PrimeReact's unstyled/default
  appearance.
- Do not touch `src/constants/theme.ts` / the global `LaraReact` preset unless diagnosis proves the
  leak originates there and cannot be closed from `ptPreset.ts` alone; if that happens, flag it as
  a scope escalation rather than expanding silently.

## Acceptance Criteria

1. Reproducing the exact steps (open Datasource Type dropdown → focus Description textarea →
   reopen dropdown) on the Create Data Source page no longer shows a black/unthemed background on
   any item, selected or not.
2. Every visible Autocomplete item background state (default, hover, selected, and after the
   blur/reopen cycle) resolves to an existing semantic Tailwind token — no raw/hex color and no
   PrimeReact default bleeding through.
3. A new automated regression test, using `src/test-utils/component-interactions/autocomplete.ts`
   helpers (not the Select/Dropdown-family `select.ts` helpers), drives
   `DataSourceTypeSelector`'s Autocomplete through: open → note the selected item's class list →
   blur to the Description textarea → reopen → assert the previously-selected item still carries
   the selected-token class and not an unstyled/default class.
4. No visual or behavioral regression to other PrimeReact dropdowns on the Create Data Source page
   or elsewhere (Select/Dropdown-family components are untouched; other Autocomplete consumers
   inherit the same, now-corrected, shared styling).

## Non-goals

- No redesign of the `Autocomplete` component's public API/props.
- No changes to `DataSourceForm`'s other fields or layout.
- No changes to the Select/Dropdown-family components (`ToolCallPolicyDropdown`,
  `IntegrationSelectDropdown`, `Select.tsx`) — a separate PrimeReact component family, not reported
  as affected.
- No changes to the global PrimeReact preset (`src/constants/theme.ts`, `LaraReact`) unless
  diagnosis proves the shared `ptPreset.ts` cannot fix it alone.
- No light-theme-specific investigation or styling pass. The bug is dark-theme-confirmed; because
  tokens are theme-aware pairs, the same fix should hold for light theme, but no separate
  light-theme audit is in scope.
- No fix to the unrelated hardcoded `bg-purple-600` "NEW" badge color noticed in
  `DataSourceTypeSelector`'s `itemTemplate` in passing — not part of this ticket.

## Testing

- Add the regression test described in Acceptance Criterion 3.
- Manual verification against the exact ticket repro steps, in dark theme, on the Create Data
  Source page.

## Open risks

- The exact mechanism producing the black background is unconfirmed; only the absence of an
  item-level "focused" `pt` hook was established. Implementation must diagnose the true cause
  (candidates: CSS layering/specificity between Tailwind and PrimeReact's `unstyled: false` base
  styling, or a stale/reused DOM node across panel close-reopen) before the token mapping can be
  trusted as complete.
- If diagnosis shows the leak originates in the global `primeReactPtOptions`/`LaraReact` preset
  rather than the component-local `ptPreset.ts`, the fix scope must expand beyond what's stated
  here — call this out explicitly if it happens.
