# Table Accessible Name (EPMCDME-8542) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the three ticket-named tables (Integrations' User/Project settings, Data Sources, Workflow Executions) an accessible name so a screen reader announces more than "table, N rows, M columns".

**Architecture:** Add one optional `ariaLabel?: string` prop to the shared `Table` component that sets `aria-label` on its `<table>` element; pass a distinct label from each of the four call sites. No other caller of `Table` changes.

**Tech Stack:** React 18, TypeScript, Vitest + React Testing Library.

**Spec:** Requirements text supplied inline for ticket EPMCDME-8542 (no spec.md); technical analysis at `docs/superpowers/tasks/2026-10-06-epmcdme-8542/technical-analysis.md`.

## Acceptance criteria

- [ ] `Table.tsx` accepts an optional accessible-name prop that sets `aria-label` on the rendered `<table>`.
- [ ] UserSettings and ProjectSettings tables (Integrations page) get distinct names ("User integrations" / "Project integrations").
- [ ] DataSourcesPage table gets its own name ("Data sources").
- [ ] WorkflowExecutionsTable gets its own name ("Workflow executions").
- [ ] No other existing caller of `Table` is touched; no default label is forced on callers that omit the prop.
- [ ] `TableCardList.tsx` is not modified.
- [ ] A regression test exercises the real `aria-label` output (not a `() => null` mock) for each of the three tables.

## Global Constraints

- `ariaLabel` prop is optional; omitting it must not change any existing caller's rendered output (no default string).
- Only these files get the new prop wired in: `UserSettings.tsx`, `ProjectSettings.tsx`, `DataSourcesPage.tsx`, `WorkflowExecutionsTable.tsx`.
- Reuse plain `aria-label` — the pattern already used in `BulkActions.tsx` / `TableCell.tsx` — do not introduce `aria-labelledby`/`<caption>`.
- Commit per task using the repository's existing ticket-prefixed commit convention.

## Review Focus

- A caller of `Table` that never passes `ariaLabel` must render with no `aria-label` attribute at all (not `aria-label="undefined"`).
- The two Integrations sub-tables must not accidentally share one label string (copy-paste risk between UserSettings/ProjectSettings).
- `DataSourcesPage.accessibility.test.tsx`'s existing `vi.mock('@/components/Table', () => ({ default: () => null }))` must stop being a no-op mock for this concern — the fix must replace it with a mock that renders `aria-label`, not just add an unrelated assertion.
- `TableCardList.tsx` (mobile fallback) must stay untouched — confirm no step edits it.
- `WorkflowExecutionsTable.tsx` has no existing test file; the new test must mock its other dependencies enough to render without errors.

---

### Task 1: Add `ariaLabel` prop to `Table`

**Files:**
- Modify: `src/components/Table/Table.tsx:53-80` (add `ariaLabel?: string` to `TableProps`), `:82-109` (destructure it), `:220-227` (add `aria-label={ariaLabel}` on the `<table>`)
- Test: `src/components/Table/__tests__/Table.test.tsx` (new)

**Interfaces:**
- Produces: `TableProps.ariaLabel?: string`, applied as `<table aria-label={ariaLabel} ...>`.

- [ ] **Step 1: Write the failing test**

```tsx
it('sets aria-label on the table when ariaLabel is provided', () => {
  render(<Table items={[]} columnDefinitions={[]} ariaLabel="Widgets" />)
  expect(screen.getByRole('table', { name: 'Widgets' })).toBeInTheDocument()
})

it('renders no aria-label when ariaLabel is omitted', () => {
  render(<Table items={[]} columnDefinitions={[]} />)
  expect(screen.getByRole('table')).not.toHaveAttribute('aria-label')
})
```

- [ ] **Step 2: Run `npx vitest run --project unit src/components/Table/__tests__/Table.test.tsx` — expect FAIL (prop not recognized / no aria-label).**
- [ ] **Step 3: Add `ariaLabel?: string` to `TableProps`, destructure it, add `aria-label={ariaLabel}` on the `<table>` element.**
- [ ] **Step 4: Re-run the same command — expect PASS.**
- [ ] **Step 5: Commit.**

Test-first: yes — table renders with/without `aria-label` depending on the new prop.

---

### Task 2: Wire distinct labels for the Integrations page tables

**Files:**
- Modify: `src/pages/integrations/components/UserSettings/UserSettings.tsx:225-232` (add `ariaLabel="User integrations"`)
- Modify: `src/pages/integrations/components/ProjectSettings/ProjectSettings.tsx:249-256` (add `ariaLabel="Project integrations"`)
- Modify: `src/pages/integrations/components/UserSettings/__tests__/UserSettings.accessibility.test.tsx:100-111` (replace the `() => null` `Table` mock with one that renders `<table aria-label={ariaLabel}>{...rows...}</table>`, keeping the existing row/alias rendering it already relies on)
- Test: same file — add an assertion

**Interfaces:**
- Consumes: `Table`'s `ariaLabel` prop from Task 1.

- [ ] **Step 1: In `UserSettings.accessibility.test.tsx`, extend the `Table` mock to accept and render `ariaLabel` on a `<table>` wrapper around the existing mocked row markup, then add:**

```tsx
it('names the table "User integrations"', () => {
  render(<UserSettings tableColumns={[]} portalSidebarRef={{ current: null }} />)
  expect(screen.getByRole('table', { name: 'User integrations' })).toBeInTheDocument()
})
```

- [ ] **Step 2: Run `npx vitest run --project unit UserSettings.accessibility.test.tsx` — expect FAIL (no `ariaLabel` passed yet).**
- [ ] **Step 3: Add `ariaLabel="User integrations"` to the `<Table>` call in `UserSettings.tsx:225`, and `ariaLabel="Project integrations"` to `ProjectSettings.tsx:249`.**
- [ ] **Step 4: Re-run — expect PASS.**
- [ ] **Step 5: Commit.**

Test-first: yes — table gains the name "User integrations" only once the prop is wired.

---

### Task 3: Wire the Data Sources table label and fix its mocked test

**Files:**
- Modify: `src/pages/dataSources/DataSourcesPage.tsx:182-192` (add `ariaLabel="Data sources"`)
- Modify: `src/pages/dataSources/__tests__/DataSourcesPage.accessibility.test.tsx:86-88` (replace `vi.mock('@/components/Table', () => ({ default: () => null }))` with a mock rendering `<table aria-label={props.ariaLabel} />`)

**Interfaces:**
- Consumes: `Table`'s `ariaLabel` prop from Task 1.

- [ ] **Step 1: Update the `Table` mock in the test file to render `aria-label`, then add:**

```tsx
it('names the table "Data sources"', () => {
  render(<DataSourcesPage />)
  expect(screen.getByRole('table', { name: 'Data sources' })).toBeInTheDocument()
})
```

- [ ] **Step 2: Run `npx vitest run --project unit DataSourcesPage.accessibility.test.tsx` — expect FAIL.**
- [ ] **Step 3: Add `ariaLabel="Data sources"` to `<Table<DataSource> ...>` at `DataSourcesPage.tsx:182`.**
- [ ] **Step 4: Re-run — expect PASS (existing `aria-live` test in this file keeps passing unchanged).**
- [ ] **Step 5: Commit.**

Test-first: yes — closes the exact gap the analysis flagged (the old `() => null` mock caught nothing).

---

### Task 4: Wire the Workflow Executions table label and add its test

**Files:**
- Modify: `src/pages/workflows/components/WorkflowExecutionsTable.tsx:139-146` (add `ariaLabel="Workflow executions"`)
- Test: `src/pages/workflows/components/__tests__/WorkflowExecutionsTable.accessibility.test.tsx` (new)

**Interfaces:**
- Consumes: `Table`'s `ariaLabel` prop from Task 1.

- [ ] **Step 1: Write a new test file mocking `@/components/Table` as a stub rendering `<table aria-label={props.ariaLabel} />`, plus whatever store/hook mocks the component needs to render (model on `UserSettings.accessibility.test.tsx`'s mock shape):**

```tsx
it('names the table "Workflow executions"', () => {
  render(<WorkflowExecutionsTable {...requiredProps} />)
  expect(screen.getByRole('table', { name: 'Workflow executions' })).toBeInTheDocument()
})
```

- [ ] **Step 2: Run `npx vitest run --project unit WorkflowExecutionsTable.accessibility.test.tsx` — expect FAIL.**
- [ ] **Step 3: Add `ariaLabel="Workflow executions"` to `<Table ...>` at `WorkflowExecutionsTable.tsx:139`.**
- [ ] **Step 4: Re-run — expect PASS.**
- [ ] **Step 5: Commit.**

Test-first: yes — no prior test exists for this component; this one is a straight regression test for the ticket's third named table.

---

## Self-Review

- **Spec coverage:** All 6 acceptance criteria map to a task (Task 1 → criterion 1; Task 2 → criterion 2 Integrations bullet; Task 3 → Data Sources bullet + the flagged mocked-test gap; Task 4 → Workflow Details bullet; criteria 3/4 — scope limits — are structural, honored by touching only the 4 named call sites and never `TableCardList.tsx`).
- **Negative constraints:** (a) no other `Table` caller gets `ariaLabel` — no task touches settings/administration/scheduler/analytics/katas tables; (b) `TableCardList.tsx` is never listed in any task's Files section; (c) the prop stays optional with no default, verified by Task 1's second test case; (d) only `aria-label` is used, never `aria-labelledby`/`<caption>`.
- **Type consistency:** `ariaLabel?: string` name and shape used identically across Tasks 1–4.
