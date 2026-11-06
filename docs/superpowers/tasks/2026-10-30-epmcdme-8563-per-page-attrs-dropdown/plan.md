# EPMCDME-8563 Per-Page Combobox A11y (stock Dropdown, attrs only) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans. Steps use checkbox syntax.

**Goal:** Pagination "Per Page" selector exposes name "Show: items per page", role combobox, expanded state, and announces the selected value once.

**Architecture:** Fold the stash prototype (`git show 'stash@{0}^3:src/components/form/Select/AttrDropdown.tsx'`; never pop/apply the stash) into `src/components/form/Select/Select.tsx` behind the existing `a11yCombobox` flag, replacing the first-attempt workarounds. Stock PrimeReact Dropdown; attributes passed down via `pt` only; no key-handling code.

**Tech Stack:** React 18, PrimeReact Dropdown, Vitest + RTL.

**Spec:** requirements in the task brief and `technical-analysis.md` (same dir). No spec.md.

Commit per task using the repository's existing convention (prefix `EPMCDME-8563:`, never skip the pre-commit hook).

## Global Constraints

- Default path (`a11yCombobox` false) unchanged: input keeps `readonly`, no `aria-expanded`, listbox named "Option List", no `pt.list`, no `role=status` element at all.
- Keep `id` on the Dropdown root. Do NOT pass `inputId`. `getElementById('per-page')` integration tests stay untouched.
- Do NOT force `readOnly:false`. No new dependencies. Files: Select.tsx, Pagination.tsx, two test files.
- `aria-labelledby` wins over `ariaLabel`; existing `ariaLabel` prop behaviour on the default path is kept.
- Negative constraints honored: no readOnly:false, no inputId, no pop of stash, no key handling, no browser or whole-suite gate tasks (Task 1 and 2 respect each).
- Accepted limitation (record only): PrimeReact applies `pt.input` to both the focus input and the value text, so an unlabelled duplicate `role=combobox` exists (plus PrimeReact's hidden `<select>`) in browse mode; Tab reaches only the labelled input.

## Review Focus

- Live region exists (empty) before any change and is only filled after a selection; it must not be mounted together with its text (Task 1 test).
- `aria-controls` is absent while closed (Task 1 test).
- Default path unchanged for the other ~91 usages, including no `role=status` (Task 1 test).

---

### Task 1: Select a11yCombobox mode on stock Dropdown

**Files:**
- Modify: `src/components/form/Select/Select.tsx` (imports line 18; props doc lines 62-68; body lines 155-205; Dropdown JSX lines 225-290)
- Test: `src/components/form/Select/__tests__/Select.test.tsx` (`describe('a11yCombobox')`, lines 140-203)

**Interfaces:**
- Consumes: existing props `a11yCombobox`, `ariaLabelledBy`, `listboxLabel`, `ariaLabel`, `label`.
- Produces: Select behaviour that Task 2 asserts through Pagination; no prop changes.

- [ ] **Step 1: Rewrite the failing tests** in `describe('a11yCombobox')` (keep fixture `options`, `noop`):
  - Labelled combobox: render with `<span id="lbl">Show items</span>`, `a11yCombobox`, `ariaLabelledBy="lbl"`, `listboxLabel="Items per page"`. Assert `getByRole('combobox', { name: 'Show items' })` has `aria-expanded` false, still has `readonly`, no `aria-controls`. Do NOT assert exactly one combobox (duplicates accepted).
  - Click `#sel`: labelled combobox `aria-expanded` true and `aria-controls` equals the id of `getByRole('listbox', { hidden: true, name: 'Items per page' })`.
  - Trigger button: `document.querySelector('.p-dropdown-trigger')` has `aria-hidden="true"` and no `role` attribute.
  - Live region: before any change `screen.getByRole('status')` is present, has class `sr-only` and empty text content; open, click the second option (`fireEvent.click` on its `role=option`), then the same status element has text `${thatOption.label} selected`.
  - `aria-labelledby` wins: with both `ariaLabel="Pick"` and `ariaLabelledBy`, name is the labelled-by text.
  - Replace the "omits aria-controls without listboxLabel" test with the above (delete it).
  - Default path test: keep, and add `queryByRole('status')` null (no role=status element at all) and no `aria-hidden` on `.p-dropdown-trigger`.
- [ ] **Step 2:** Run `npx vitest run --project unit src/components/form/Select/__tests__/Select.test.tsx`. Expected: new a11yCombobox tests FAIL, default-path test passes.
- [ ] **Step 3: Implement in Select.tsx**
  - Remove: `setDropdownRef`/`dropdownRef`, both `useLayoutEffect`s, `listboxId`, `resolvedValueTemplate`, `pt.select`, `readOnly:false`, `role:'presentation'`, unused `useCallback`/`useLayoutEffect` imports. Restore `ref={ref}` and `valueTemplate={valueTemplate}`. Update the `a11yCombobox` JSDoc (readonly stays; trigger hidden; live region).
  - Add `const listId = useId()` and `const [announcement, setAnnouncement] = useState('')` (starts as '').
  - `handleChange`: when `a11yCombobox`, set `announcement` to `` `${label} selected` `` where label comes from `enhancedOptions.find(o => o.value === e.value)?.label` (compute after `enhancedOptions` is defined or inline; skip when not found).
  - Dropdown: add `aria-labelledby={a11yCombobox ? ariaLabelledBy : undefined}`; pass `ariaLabel={a11yCombobox && ariaLabelledBy ? undefined : ariaLabel}`.
  - `pt.input` stays a function; in a11yCombobox mode add `role: 'combobox'`, `aria-expanded: !!opts?.state?.overlayVisible`, `aria-controls: opts?.state?.overlayVisible ? listId : undefined` (no readOnly override, no aria-labelledby/aria-label here).
  - `pt.trigger`: add `'aria-hidden': true` in a11yCombobox mode only.
  - `pt.list`: `...(a11yCombobox && { list: { id: listId, 'aria-label': listboxLabel } })`.
  - Render, inside the root `div` after `FieldAnnouncer` (outside it), ALWAYS when `a11yCombobox` is on (never conditional on `announcement`, so the live region exists before its text changes): `<span role="status" className="sr-only">{announcement}</span>`. Not rendered at all when `a11yCombobox` is off.
- [ ] **Step 4:** Re-run the command from Step 2. Expected: all PASS.

Test-first: yes — labelled combobox keeps readonly, shows `aria-controls` only while open, trigger is `aria-hidden`, and the always-present empty `role=status` gets "<label> selected" only after selecting an option (and does not exist on the default path).

### Task 2: Pagination verification against the new Select

**Files:**
- Modify: `src/components/Pagination/Pagination.tsx` only if the design requires (it already has the 'Show:' label id, sr-only ' items per page', `id="per-page"`, `a11yCombobox`, `ariaLabelledBy`, `listboxLabel="Items per page"`; expected: no change)
- Test: `src/components/Pagination/__tests__/Pagination.test.tsx` (last test, lines 141-168)

**Interfaces:**
- Consumes: Task 1 Select behaviour.

- [ ] **Step 1: Rewrite the last test** (rename e.g. "exposes the per page selector as a named combobox with a named listbox"):
  - Replace `getAllByRole('combobox')).toHaveLength(1)` and the `not.toHaveAttribute('readonly')` assertion: use `getByRole('combobox', { name: /Show.*per page/i })`, assert `aria-expanded` 'false', and `readonly` present.
  - Click `#per-page` (root id kept); re-query the labelled combobox: `aria-expanded` 'true'; `aria-controls` matches the `Items per page` listbox id.
  - Keep: no `Option List` listbox, options length 4 with `aria-selected` true only for '24 items', posinset 2 / setsize 4, no button named 'Per Page'.
  - Status element is present with empty text before the click; click the second option; its text is "`<that option label>` selected".
- [ ] **Step 2:** Run `npx vitest run --project unit src/components/Pagination/__tests__/Pagination.test.tsx`. Expected: PASS (fails first if Task 1 not applied).

Test-first: yes — the labelled combobox keeps `readonly`, toggles `aria-expanded` and announces "<label> selected" through the pre-existing live region; the old "exactly one combobox" assertion is removed.
