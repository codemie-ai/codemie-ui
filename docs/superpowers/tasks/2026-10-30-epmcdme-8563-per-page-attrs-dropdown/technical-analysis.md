# Technical Research

**Task**: select dropdown pagination accessibility (EPMCDME-8563)
**Generated**: 2026-10-30
**Research path**: filesystem

---

## 1. Original Context

EPMCDME-8563 The "Per Page" combobox does not have an accessible state, role and name. Ticket steps are keyboard/Tab only (hover is out of scope). Expected: a clear name (e.g. "Show 10 items per page combobox"), the correct role, collapsed/expanded state, and the selected value announced accurately without redundancy. DESIGN (already decided, user-verified with NVDA): keep PrimeReact's stock Dropdown and pass accessibility attributes down only. Reference prototype is in `git stash@{0}` (message "EPMCDME-8563 prototypes: ...") as `src/components/form/Select/AttrDropdown.tsx`; read it with `git show 'stash@{0}^3:src/components/form/Select/AttrDropdown.tsx'` (untracked files live in the stash's third parent) — do NOT pop or apply the stash, and ignore NativeSelect.* and the Pagination comparison wiring in it. The design: Dropdown `inputId={id}`, `aria-labelledby` pointing at the 'Show:' label; `pt.input` as a function returning role='combobox', aria-expanded from state.overlayVisible, aria-controls (only while the overlay is visible) pointing at the list id; `pt.list` with the id and an aria-label ('Items per page'); the duplicate trigger button aria-hidden; PrimeReact's readOnly on the focus input KEPT (do not force readOnly:false — that made NVDA say 'edit'); a visually-hidden `role="status"` live region announcing '<label> selected' after a change so keyboard selection is announced. Fold it into the shared Select behind the existing opt-in `a11yCombobox` flag (only Pagination enables it; the other ~91 usages keep the default path), REPLACING the first-attempt workarounds currently on this branch (the post-render setAttribute role effect, the native click listener, readOnly:false, the aria-hidden valueTemplate/select hiding) — remove those. Pagination: the 'Show:' label gets an id plus an sr-only ' items per page' span; Select gets id='per-page', ariaLabelledBy and listboxLabel='Items per page'. Constraints: PrimeReact prod keyboard behaviour (Home/End, Tab commit, typeahead, Alt+Up) must stay as is because we do not touch the key handling; the known limitation is that PrimeReact applies pt.input to both the focus input and the value text so an unlabelled duplicate combobox exists in browse mode (accepted). Keep the change small (one file folded into Select plus Pagination plus tests); no new dependencies. NVDA output the user verified for the prototype: 'Show: items per page combo box 10 items collapsed opens list' / 'expanded' / '10 items 1 of 4' / 'Items per page list' / '20 items not selected 2 of 4' / '20 items selected' / back on the combobox '20 items collapsed opens list'. Repo rules: every commit prefixed EPMCDME-8563:, never skip the pre-commit hook, run npm ci before trusting gates, run gates individually, ask before adding dependencies. The earlier A11ySelect/floating-ui and native-select designs live on branch EPMCDME-8563_backup-a11yselect-rework and are NOT to be used. Browser feature verification: skip (user will check manually).

Note: the branch holds a FIRST-ATTEMPT implementation (commits 68eef64f1, c53635d42 on main a0e8f5cc1) in Select.tsx, Pagination.tsx and their tests.

---

## 2. Codebase Findings

### Existing Implementations
- `src/components/form/Select/Select.tsx` — shared wrapper over PrimeReact `Dropdown`; about 65 files use `<Select`. Only Pagination sets `a11yCombobox`.
- `src/components/Pagination/Pagination.tsx` — per-page selector.
- Prototype (stash@{0}^3) `AttrDropdown.tsx`, about 90 lines, stock Dropdown:
  - `inputId={id}` and `aria-labelledby` on `<Dropdown>`.
  - `pt.input` is a function returning role=combobox, `aria-expanded` from `o.state.overlayVisible`, and `aria-controls` only while the overlay is visible.
  - `pt.list = {id: useId(), 'aria-label': listboxLabel}`.
  - `pt.trigger` carries `aria-hidden`.
  - `<span role="status" className="sr-only">` announces `${option.label} selected`, set via `useState` in `handleChange`.

### What the first attempt added (to be replaced)
Select.tsx:
- New props `ariaLabelledBy`, `a11yCombobox` (default false) and `listboxLabel`. The existing `ariaLabel` prop stays.
- `dropdownRef` plus a `setDropdownRef` callback forwarding to the outer ref, used as `ref={setDropdownRef}`. This only supports the effects below.
- A `useLayoutEffect` (every render) calling `getFocusInput()?.setAttribute('role','combobox')`. Remove.
- A `useLayoutEffect` adding a native click listener on the focus input that toggles `show()`/`hide()` from `aria-expanded`. Remove.
- `listboxId = id ? \`${id}-listbox\` : undefined`.
- `resolvedValueTemplate`: an aria-hidden span for the label or placeholder when `a11yCombobox` and no `valueTemplate`. Remove; restore `valueTemplate={valueTemplate}`.
- `pt.select: {'aria-hidden': true}` when opted in. Remove.
- `pt.input` became a function. When opted in it adds `readOnly:false` (remove), `aria-expanded` (keep), `aria-controls` (only when visible AND `listboxLabel` set), `aria-labelledby`, and `aria-label` (only without `ariaLabelledBy`).
- `pt.trigger` gets `role:'presentation'` and `aria-hidden:true` when opted in. Keep `aria-hidden`, drop the role.
- `pt.list = {id: listboxId, 'aria-label': listboxLabel}` only when `listboxLabel` is set. Keep this idea.
- Imports `useCallback` and `useLayoutEffect` were added.
- Still missing: `inputId={id}`, `aria-labelledby` on the Dropdown, and the `role="status"` live region.

Pagination.tsx (already matches the design, can stay):
- A second `useId()` named `perPageLabelId`.
- The "Show:" div has `id={perPageLabelId}`; its text is `Show:<span className="sr-only"> items per page</span>`.
- Select gets `a11yCombobox`, `ariaLabelledBy={perPageLabelId}` and `listboxLabel="Items per page"`, with the existing `id="per-page"`.

### Architecture and Layers Affected
Shared form component (Select, over PrimeReact `pt` passthrough), feature component (Pagination), unit tests.

### Integration Points
- Callers rely on `document.getElementById('per-page')`:
  - `src/pages/settings/administration/projectsManagement/__tests__/ProjectMembersPerPageRefresh.integration.test.tsx`, lines 122-166.
  - `src/pages/integrations/__tests__/UserSettingsPagination.integration.test.tsx`, line 92.
  - `src/pages/settings/administration/projectsManagement/__tests__/CostCenterProjectsManager.test.tsx`, line 160 (per-page change test).
- Select is forwarded a `ref` to `Dropdown`.

### Patterns and Conventions
PrimeReact `pt` passthrough is used in Select. Repo rules: EPMCDME-8563: commit prefix, never skip the pre-commit hook, `npm ci` first, run gates individually, prettier/eslint run automatically via hook, no new dependencies.

---

## 3. Documentation Findings

### Guides and Architecture Docs
`.ai-run/guides/` exists (architecture, components, patterns, testing and others); `testing/testing-patterns.md` is the relevant testing guide. I did not read the guides in depth.

### Architectural Decisions
The design is fixed by the task: stock Dropdown with pass-down attributes only. The A11ySelect/floating-ui and native-select designs on `EPMCDME-8563_backup-a11yselect-rework` are not to be used.

### Derived Conventions
`stash@{0}` is the EPMCDME-8563 prototype stash; do not pop it.

---

## 4. Testing Landscape

### Existing Coverage
`src/components/form/Select/__tests__/Select.test.tsx`, `describe('a11yCombobox')`, 3 tests:
- One named combobox: a single combobox, `aria-expanded` false then true after click on `#sel`, `not.toHaveAttribute('readonly')` (contradicts the new design and must flip to keeping readonly), accessible name "Show items", no button, and a listbox named "Items per page".
- No `aria-controls` without `listboxLabel` (tied to the attempt's logic; will change).
- Default path keeps `readonly`, has no `aria-expanded`, and its listbox is named "Option List". Keep.

`src/components/Pagination/__tests__/Pagination.test.tsx`, last test (import `within` added):
- One combobox named /Show.*per page/, `aria-expanded` toggling, `not.toHaveAttribute('readonly')` (must change), no "Per Page" button.
- A listbox named /per page/; 4 options with `aria-selected`, `aria-posinset` 2 and `aria-setsize` 4.
- The "exactly one combobox" assertion contradicts the accepted duplicate-combobox limitation and must change.

### Testing Framework and Patterns
Vitest + React Testing Library, `unit` and `integration` projects (`vite.config.ts` `test.projects`), tests in `src/**/__tests__/`.

### Coverage Gaps
No test for the live-region announcement or for `inputId` on Select.

---

## 5. Configuration and Environment

### Environment Variables
None involved.

### Configuration Files
None involved.

### Feature Flags and Deployment Concerns
None. `a11yCombobox` is a component prop, not a runtime flag.

---

## 6. Risk Indicators

1. `id="per-page"` moving: today `id` lands on the Dropdown root. With `inputId={id}`, `#per-page` becomes the focus input. The existing integration tests click it and check `toHaveTextContent('20')`, which an input element fails. Speculative: keep the root id, use a different input id, or update those tests. Select's own test clicks `#sel` and has the same dependency.
2. Duplicate combobox: `pt.input` applies to both the focus input and the value span. Tests must expect two comboboxes, only one labelled.
3. `aria-controls` and `aria-labelledby`: the prototype always uses a `useId()` list id, while the attempt required `listboxLabel`. Settle the `ariaLabel` vs `ariaLabelledBy` precedence.
4. Live region placement: Select's root is `flex flex-col` with `FieldAnnouncer`. A sibling `role="status"` span may affect layout, though `sr-only` mitigates it.
5. Forwarded ref: removing `setDropdownRef` restores `ref={ref}`. Confirm nothing else depended on `dropdownRef`.
6. `listboxLabel` placement: it must go through `pt.list`, and the default path must not set `pt.list`. Recheck default-path role queries.

---

## 7. Summary for Complexity Assessment

Small change. Two source files change (`Select.tsx`, `Pagination.tsx`) plus their two test files. The first attempt is already on the branch, so the work replaces Select internals with the prototype design rather than building anew. There are no new dependencies and no config or env changes, and key handling is untouched.

Select has about 65 usage files, but only Pagination opts in, so the default path must stay unchanged. Novelty is low: the prototype is about 90 lines on stock PrimeReact `pt`.

Existing tests for the attempt need rewriting (the readonly and single-combobox assertions contradict the new design). The main risk is the `id="per-page"` move affecting integration tests that use `getElementById`.

---

## 8. External References

None named by the task. The stash prototype was read via `git show 'stash@{0}^3:src/components/form/Select/AttrDropdown.tsx'` without popping.
