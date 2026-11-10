# EPMCDME-15751 Projects management header overlap: plan

Commit per task using the repository's existing convention. No separate verification, review, or commit tasks: the calling flow runs the quality gates.

## Acceptance criteria

- On the Projects management page (`ProjectsManagementFull`), the "Cost center" header no longer renders over the "Budgets" header at the screenshot viewport.
- The root cause is fixed in the shared header `src/components/Table/TableColHeader.tsx`: a header label that does not fit its column wraps inside its own cell instead of overflowing.
- Sort icons on sortable headers stay visible and do not shrink or get pushed out of the cell when the column width is constrained.
- Headers whose label fits their column render with the same classes as before for the label; only constrained labels change layout.
- Other tables (Users management, Cost center projects manager, and every other `Table` caller) keep their current header behavior beyond what the root-cause fix requires.
- Before the change, the overlap is reproduced and recorded. After the change, the overlap is confirmed gone at the same viewport.

## Negative constraints

- The `<th>` default `text-nowrap` (`TableColHeader.tsx:99`) is kept for every header; the fix is on the label and icon elements inside the cell, not a global switch of the header default.
- No page-local width or class hack in `ProjectsManagementFull.tsx` or `CostCenterProjectsManager.tsx`; column percentages (`w-[8%]`, `w-[26%]`, etc.) are not changed.
- `UsersManagementPage.tsx` is not edited.
- `package-lock.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml` are not touched.

## Review Focus

- Sortable header (Name, Created) at a narrow width loses its sort icon. Pinned by the sort-icon assertion in Task 1.
- A short label in a wide column changes its class set or layout. Pinned by the unchanged-class assertion in Task 1.
- Non-sortable constrained header (Cost center) overflows into its neighbor. Pinned by the page-level assertion in Task 1.

## Tasks

### Task 1: Let constrained header labels wrap inside their cell

**Files:**
- Modify: `src/components/Table/TableColHeader.tsx:121-136` (label markup inside the `<th>`: the sortable `<button>` label span and the non-sortable `<span title>`; plus the `SortIcon` wrapper `<span className="inline-block ml-2 ...">` at lines 127-133)
- New test: `src/components/Table/__tests__/TableColHeader.test.tsx`
- New test: `src/pages/settings/administration/projectsManagement/__tests__/ProjectsManagementFull.costCenterHeader.test.tsx`

**Interfaces:**
- Consumes: `ColumnDefinition` from `@/types/table` (`headClassNames`, `headerNoWrap`, `sortable`, `label`); `TableColHeader` default export props `{ column, isFirst, isLast, sortProps? }`.
- Produces: no API change. Header `<th>` class list is unchanged; only the inner label element and sort-icon wrapper gain classes.

Steps:

1. Reproduce before the change. Open the Projects management page at the screenshot viewport and record the header row: whether "Cost center" overlaps "Budgets". If it does not reproduce, stop and return `needs_input` with the observed layout; do not guess at a fix.
2. Write the failing tests first.
   - `TableColHeader.test.tsx`: render `TableColHeader` inside a `<table><thead><tr>` wrapper with `sortable: true`, `headClassNames: 'w-[8%]'`, `label: 'Created'`, and a `sortProps` object. Assert the label `<span>` has class `min-w-0` and `whitespace-normal`, and the sort-icon wrapper span has class `shrink-0`. Also render a non-sortable column with `headClassNames: 'w-[8%]'`, label `'Cost center'`, and assert its label `<span>` has `whitespace-normal` and the `<th>` still has `text-nowrap`.
   - `ProjectsManagementFull.costCenterHeader.test.tsx`: copy the mock setup from `ProjectsManagementFull.initialLoad.test.tsx` but do not mock `@/components/Table`. Set `useBudgetManagementEnabled` to `[true, true]` and the cost-center flag to enabled so the column renders. Assert the `<th>` whose text is "Cost center" contains a label span with `whitespace-normal`, and the "Budgets" `<th>` is still rendered next to it.
   - Run both; confirm they fail.
3. Apply the fix in `TableColHeader.tsx`:
   - Add `min-w-0` and `whitespace-normal` to the label `<span>` in both branches (inside the sortable `<button>` and the non-sortable `<span title>`).
   - Add `shrink-0` to the `SortIcon` wrapper span so the icon keeps its size when the label wraps.
   - Leave the `<th>` class expression (lines 91-100) untouched, including the `headerNoWrap` branch.
   Because `whitespace-normal` only changes rendering when the label is wider than its cell, labels that fit keep their current layout.
4. Run the two new tests and confirm they pass. Run the existing `src/components/Table/__tests__/*.test.tsx` and `src/pages/settings/administration/projectsManagement/__tests__/ProjectsManagementFull*.test.tsx` and confirm they still pass.
5. Confirm at the step-1 viewport. Capture the header row again: "Cost center" wraps inside its cell, the sort icon on "Name" and "Created" remains visible, and nothing overlaps "Budgets". If overlap remains, stop and return `needs_input` with the before and after observations; do not widen columns without a decision.

Test-first: yes — `TableColHeader.test.tsx` asserts the label span carries `whitespace-normal` and the sort-icon wrapper carries `shrink-0`; `ProjectsManagementFull.costCenterHeader.test.tsx` asserts the "Cost center" label span carries `whitespace-normal`. Both fail before step 3 because the label span has no wrap class.

## Summary

- tasks: 1
- test_first: 1
