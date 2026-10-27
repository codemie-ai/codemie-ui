# Reorder Scheduler Resource Type Filter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Show Resource Type filter options on the Schedulers page in the order All, Assistant, Workflow, Datasource (EPMCDME-15591).

**Architecture:** `RadioGroup` renders `definition.options` in array order, so swapping two entries in the static `RESOURCE_TYPE_OPTIONS` constant is the whole change. Filter state, URL handling and the API query use values, not positions.

**Tech Stack:** React 18, TypeScript, Vitest + React Testing Library (`unit` project).

**Requirements:** inline (sdlc-light, no spec). Analysis: `technical-analysis.md` in this directory.

Commit per task using the repository's existing convention.

## Acceptance criteria

- [ ] Resource Type options render in the order All, Assistant, Workflow, Datasource.
- [ ] All is checked when no Resource Type filter is applied (`values={{}}`).
- [ ] Selecting Assistant, Workflow or Datasource still applies `resourceType` = `'Assistant'` / `'Workflow'` / `'Datasource'`.
- [ ] Labels, values (`''` for All), URL/filter-state handling, pagination and other filters are unchanged.
- [ ] The same order appears in both User and Project scheduler views (single `SchedulerFilters` consumer).

## Global Constraints

- Values and labels stay `''`/All, `Assistant`, `Workflow`, `Datasource`. Only array order changes.
- `ALL_OPTION` stays first and stays the shared object. Do not touch `STATUS_OPTIONS` or `LAST_RUN_STATUS_OPTIONS`.
- Do not touch `SchedulersPage.tsx`, `src/store/schedulers.ts` or the shared `Filters`/`RadioGroup` components.

## Review Focus

- Other radio groups also have an `All` option, so the test must scope to `input[name="resourceType"]` and not to label text.

---

### Task 1: Reorder Resource Type options

**Files:**
- Modify: `src/pages/schedulers/SchedulerFilters.tsx:44-49`
- Test: `src/pages/schedulers/__tests__/SchedulerFilters.test.tsx`

Test-first: yes — a new unit test reads the `resourceType` radio inputs in DOM order, expects labels `['All', 'Assistant', 'Workflow', 'Datasource']` with All checked. It fails today because the current order is All, Workflow, Assistant, Datasource.

- [ ] **Step 1: Write the failing test.** Add it inside the existing `describe('SchedulerFilters')`. `RadioGroup` gives each input `name="resourceType"` and `inputId="resourceType-<index>"`, and `RadioButton` wraps it in a `<label htmlFor>` (`src/components/form/RadioButton/RadioButton.tsx:64-68`).

```tsx
it('renders Resource Type options in order All, Assistant, Workflow, Datasource with All selected', () => {
  const { container } = render(
    <SchedulerFilters filterOptions={filterOptions} values={{}} onApply={noop} />
  )
  const inputs = Array.from(
    container.querySelectorAll<HTMLInputElement>('input[name="resourceType"]')
  )
  const labels = inputs.map((input) => input.closest('label')?.textContent?.trim())
  expect(labels).toEqual(['All', 'Assistant', 'Workflow', 'Datasource'])
  expect(inputs[0]).toBeChecked()
  expect(inputs.slice(1).every((input) => !input.checked)).toBe(true)
})
```

If the label's `textContent` does not resolve, the fallback is `document.querySelector(`label[for="${input.id}"]`)`. Keep the assertion on order.

- [ ] **Step 2: Run the test and confirm it fails on the order.** `npx vitest run --project unit src/pages/schedulers/__tests__/SchedulerFilters.test.tsx`. Expected: FAIL. The received order is `['All', 'Workflow', 'Assistant', 'Datasource']`.
- [ ] **Step 3: Implement.** In `RESOURCE_TYPE_OPTIONS` (`SchedulerFilters.tsx:44-49`), move `{ label: 'Assistant', value: 'Assistant' }` above `{ label: 'Workflow', value: 'Workflow' }`. Change nothing else.
- [ ] **Step 4: Re-run the same command.** Expected: PASS. All three tests in the file are green.
