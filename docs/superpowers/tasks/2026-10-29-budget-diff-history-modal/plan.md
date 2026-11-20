# Budget Before/After/Difference in Project Activity History Modal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** In the project activity history modal's expanded event-detail rows, add a computed "Difference" row (budget_after − budget_before) with sign/color/direction, alongside the Budget before/after rows the existing generic row renderer already produces.

**Architecture:** A pure helper `getBudgetDifference` in the existing presentation-helper module reads two provisional attribute keys and returns a typed result or `null`. `renderExpandedRow` in the modal calls it and renders one extra row only when non-null. No other layer changes.

**Tech Stack:** React 18 + TypeScript, Vitest + React Testing Library.

**Spec:** No spec file for this flow (sdlc-light, requirements provided inline — captured below). Reuse `docs/superpowers/tasks/2026-10-29-budget-diff-history-modal/technical-analysis.md` for all codebase facts; do not re-research anything it already states.

## Global Constraints

- UI-only, additive: no API/store/filter/pagination/column-definition/backend/migration changes.
- Provisional contract (pending EPMCDME-14328): reads attribute keys `budget_before`/`budget_after` from `event.attributes`. Must be marked provisional in a code comment at the point of use.
- A value counts as present only when `typeof value === 'number' && Number.isFinite(value)`; any other case (missing, null, string, NaN, Infinity) means no Difference row — no fabrication, no crash.
- Zero is its own neutral case, not "missing" or "falsy".
- No new icon dependency. Use the plain Unicode glyphs `▲`/`▼`, never a PrimeIcons or lucide import.
- Color tokens: `text-success-primary` (positive), `text-failed-primary` (negative), `text-text-primary` (zero/neutral) — reuse exactly these existing tokens, no new ones.
- Reuse `formatCurrency` from `@/utils/currency` for the absolute-value formatting; do not reimplement currency formatting.
- Existing rows, the "No additional detail" empty state, filters, pagination, and all store/API calls stay byte-for-byte unchanged outside the one new row.

## Review Focus

- Both `budget_before` and `budget_after` present and numerically equal (zero diff) — must render as the neutral case, not be treated as "no diff available". Covered in Task 1.
- `budget_after` (or `budget_before`) missing from `attributes` — no Difference row, no thrown error. Covered in Task 1 and Task 2.
- A non-numeric value for either key (e.g. a string) — no Difference row, no thrown error. Covered in Task 1.
- `NaN`/`Infinity` for either key (arithmetically "numbers" in JS but not finite) — excluded by the `Number.isFinite` check, no Difference row. Covered in Task 1.
- `event.attributes` itself is `null` (a real shape per `Record<string, unknown> | null`) — no Difference row, no thrown error, and the existing "No additional detail" / other-attribute rows stay unaffected. Covered in Task 1 and Task 2.

## Acceptance criteria

- [ ] Expanded event rows that carry numeric `budget_before`/`budget_after` attributes show an additional "Difference" row computed as `budget_after - budget_before`.
- [ ] A positive difference renders with an explicit `+` sign and the `text-success-primary` color.
- [ ] A negative difference renders with an explicit `-` sign and the `text-failed-primary` color.
- [ ] A zero difference renders with no sign, neutral (`text-text-primary`) color, and is never treated as "missing".
- [ ] When `budget_before`/`budget_after` are missing, non-numeric, `NaN`, `Infinity`, or `attributes` is `null`, no Difference row is rendered and nothing throws.
- [ ] The existing attribute rows, "No additional detail" empty state, filters, pagination, and every store/API call are unchanged.
- [ ] No new icon dependency is added.

---

### Task 1: `getBudgetDifference` helper

**Files:**
- Modify: `src/utils/activityEventPresentation.tsx` (append after `getEventAttributeRows`, currently ending at line 105)
- Test: `src/utils/__tests__/activityEventPresentation.test.tsx` (append new `describe('getBudgetDifference', ...)` block)

**Interfaces:**
- Consumes: `formatCurrency(value: number): string` from `@/utils/currency` (already imported in this file at line 16); `PresentableActivityEvent` (same file, line 24).
- Produces (for Task 2 to consume):
  ```ts
  export interface BudgetDifferenceInfo {
    difference: number
    sign: '+' | '-' | ''
    colorClassName: string
    triangle: string
    formattedValue: string
  }
  export function getBudgetDifference(event: PresentableActivityEvent): BudgetDifferenceInfo | null
  ```

**Test-first: yes — `getBudgetDifference` does not exist yet; importing it fails the test file before Step 3.**

- [ ] **Step 1: Write the failing tests** in `src/utils/__tests__/activityEventPresentation.test.tsx`, importing `getBudgetDifference` alongside the existing imports:

```ts
describe('getBudgetDifference', () => {
  const base = { event_type: 'budget.updated', created_at: '2026-01-01' }

  it('returns a positive difference with + sign, success color, ▲ triangle', () => {
    expect(
      getBudgetDifference({ ...base, attributes: { budget_before: 100, budget_after: 150 } })
    ).toEqual({
      difference: 50,
      sign: '+',
      colorClassName: 'text-success-primary',
      triangle: '▲',
      formattedValue: '+$50.00',
    })
  })

  it('returns a negative difference with - sign, failed color, ▼ triangle', () => {
    expect(
      getBudgetDifference({ ...base, attributes: { budget_before: 150, budget_after: 100 } })
    ).toEqual({
      difference: -50,
      sign: '-',
      colorClassName: 'text-failed-primary',
      triangle: '▼',
      formattedValue: '-$50.00',
    })
  })

  it('preserves a zero difference as its own neutral case, not missing', () => {
    expect(
      getBudgetDifference({ ...base, attributes: { budget_before: 100, budget_after: 100 } })
    ).toEqual({
      difference: 0,
      sign: '',
      colorClassName: 'text-text-primary',
      triangle: '',
      formattedValue: '$0.00',
    })
  })

  it('returns null for every invalid shape — missing key, null attributes, non-numeric, NaN, Infinity — never throws', () => {
    expect(getBudgetDifference({ ...base, attributes: { budget_before: 100 } })).toBeNull()
    expect(getBudgetDifference({ ...base, attributes: null })).toBeNull()
    expect(
      getBudgetDifference({ ...base, attributes: { budget_before: 'N/A', budget_after: 150 } })
    ).toBeNull()
    expect(
      getBudgetDifference({ ...base, attributes: { budget_before: NaN, budget_after: 150 } })
    ).toBeNull()
    expect(
      getBudgetDifference({ ...base, attributes: { budget_before: 100, budget_after: Infinity } })
    ).toBeNull()
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run --project unit src/utils/__tests__/activityEventPresentation.test.tsx`
Expected: FAIL — `getBudgetDifference` is not exported / not a function.

- [ ] **Step 3: Implement `getBudgetDifference` in `src/utils/activityEventPresentation.tsx`**, directly below `getEventAttributeRows`:

```ts
// PROVISIONAL CONTRACT pending EPMCDME-14328 (backend budget-audit payload not yet defined):
// reads ad hoc numeric attribute keys `budget_before`/`budget_after`. Replace this reader
// once EPMCDME-14328 defines the real before/after payload shape.
export function getBudgetDifference(event: PresentableActivityEvent): BudgetDifferenceInfo | null {
  const before = event.attributes?.budget_before
  const after = event.attributes?.budget_after
  if (typeof before !== 'number' || !Number.isFinite(before)) return null
  if (typeof after !== 'number' || !Number.isFinite(after)) return null
  const difference = after - before
  if (difference > 0) {
    return {
      difference,
      sign: '+',
      colorClassName: 'text-success-primary',
      triangle: '▲',
      formattedValue: `+${formatCurrency(difference)}`,
    }
  }
  if (difference < 0) {
    return {
      difference,
      sign: '-',
      colorClassName: 'text-failed-primary',
      triangle: '▼',
      formattedValue: `-${formatCurrency(Math.abs(difference))}`,
    }
  }
  return {
    difference: 0,
    sign: '',
    colorClassName: 'text-text-primary',
    triangle: '',
    formattedValue: formatCurrency(0),
  }
}
```

Add the `BudgetDifferenceInfo` interface (shown in Interfaces above) directly above this function.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run --project unit src/utils/__tests__/activityEventPresentation.test.tsx`
Expected: PASS, all cases including the invalid-shape case.

- [ ] **Step 5: Commit**

Commit per task using the repository's existing convention (ticket `EPMCDME-14326`).

---

### Task 2: Render the Difference row in the modal

**Files:**
- Modify: `src/pages/settings/administration/projectsManagement/components/ProjectActivityHistoryModal.tsx:34-38` (import), `:106-121` (`renderExpandedRow`)
- Test: `src/pages/settings/administration/projectsManagement/components/__tests__/ProjectActivityHistoryModal.test.tsx` (append two `it`s inside the existing `describe('ProjectActivityHistoryModal', ...)` block, after the test at line 100)

**Interfaces:**
- Consumes from Task 1: `getBudgetDifference(event: PresentableActivityEvent): BudgetDifferenceInfo | null`, where `BudgetDifferenceInfo` has `{ difference, sign, colorClassName, triangle, formattedValue }`. `ActivityEventListItem` already satisfies `PresentableActivityEvent`'s shape (it already does, via the existing `getEventAttributeRows(item)` call on the same line).

**Test-first: yes — no "Difference" text exists in the expanded row until `renderExpandedRow` calls the Task 1 helper.**

- [ ] **Step 1: Write the failing tests**, using the existing `mockEventsResponse` helper (same file, line 51) as the pattern:

```tsx
it('renders a Difference row with the ▲ triangle and success color for a positive budget diff', async () => {
  ;(api.get as any).mockImplementation((path: string) =>
    path.includes('/metadata')
      ? { json: async () => ({ event_types: [], recording_enabled: true }) }
      : mockEventsResponse({
          data: [
            {
              id: '1',
              domain: 'budget',
              event_type: 'budget.updated',
              label: 'Budget updated',
              category: 'Budget',
              entity_label: 'Project budget',
              actor_name: 'Admin',
              actor_email: 'a@x.com',
              attributes: { budget_before: 100, budget_after: 150 },
              created_at: '2026-01-01T00:00:00Z',
            },
          ],
        })
  )
  render(<ProjectActivityHistoryModal projectName="proj-1" onHide={vi.fn()} />)
  expect(await screen.findByText('Budget updated')).toBeInTheDocument()
  await userEvent.click(screen.getByRole('button', { name: /expand/i }))
  expect(await screen.findByText('Difference')).toBeInTheDocument()
  expect(screen.getByText('▲ +$50.00')).toBeInTheDocument()
})

it('renders no Difference row when attributes carry no budget before/after pair', async () => {
  ;(api.get as any).mockImplementation((path: string) =>
    path.includes('/metadata')
      ? { json: async () => ({ event_types: [], recording_enabled: true }) }
      : mockEventsResponse()
  )
  render(<ProjectActivityHistoryModal projectName="proj-1" onHide={vi.fn()} />)
  await screen.findByText('Member added')
  await userEvent.click(screen.getByRole('button', { name: /expand/i }))
  await screen.findByText('viewer')
  expect(screen.queryByText('Difference')).not.toBeInTheDocument()
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run --project unit src/pages/settings/administration/projectsManagement/components/__tests__/ProjectActivityHistoryModal.test.tsx`
Expected: FAIL — "Difference" text not found for the first new test.

- [ ] **Step 3: Wire the helper into `renderExpandedRow`**
  - Add `getBudgetDifference` to the existing named import from `@/utils/activityEventPresentation` (line 34-38).
  - In `renderExpandedRow` (line 106-121), after computing `rows`, also compute `const budgetDifference = getBudgetDifference(item)`. Inside the non-empty branch, after the `rows.map(...)` block and before the closing `</div>`, add one more conditional row rendered only `budgetDifference && (...)`: a `<div className="flex gap-2 text-sm">` with a `<span className="text-text-quaternary min-w-[120px]">Difference</span>` label (matching the existing rows' label styling) and a value `<span className={budgetDifference.colorClassName}>{budgetDifference.triangle} {budgetDifference.formattedValue}</span>`.
  - Do not change the `!rows.length` empty-state branch, the `rows.map` block itself, or anything outside this function.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run --project unit src/pages/settings/administration/projectsManagement/components/__tests__/ProjectActivityHistoryModal.test.tsx`
Expected: PASS, both new tests and all pre-existing tests in the file.

- [ ] **Step 5: Commit**

Commit per task using the repository's existing convention (ticket `EPMCDME-14326`).
