# EPMCDME-11777: Category Selector Display Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the empty-string sentinel in category Dropdown filters with `'all'` so PrimeReact renders "All categories" instead of blank.

**Architecture:** PrimeReact Dropdown treats `value: ''` as unselected. `BudgetsManagementPage` owns its state directly; `ProjectsManagementFull` delegates to `useProjectsFilters`. The `'all'` sentinel already exists for `budgetAssignmentFilterOptions` in the same file — apply the identical pattern to `budgetCategory`.

**Tech Stack:** React 18, TypeScript 5, PrimeReact 10.9.5 Dropdown (via shared `Select` wrapper), Valtio, Vitest + React Testing Library.

**Spec:** Inline requirements in task dispatch.

## Global Constraints

- No new dependencies.
- API must receive `null` when "All categories" is active, a specific `BudgetCategory` value otherwise — behavior unchanged.
- Commit per task using the repository's existing convention (ticket prefix `EPMCDME-11777`).

## Acceptance criteria

- Both pages show "All categories" in the category Select when no specific category is selected.
- Selecting a specific category shows its label.
- Budget filtering behavior is unchanged (API receives `null` when `'all'`, specific value otherwise).

---

### Task 1: Fix BudgetsManagementPage sentinel

**Files:**
- Modify: `src/pages/settings/administration/BudgetsManagementPage.tsx:96,111,128,269`
- Test: `src/pages/settings/administration/__tests__/BudgetsManagementPage.category.test.tsx` (new)

**Interfaces:**
- Produces: `categoryFilterOptions` with `value: 'all'`; `category` state typed `BudgetCategory | 'all'`

`Test-first: yes — category Select renders "All categories" on initial render (currently renders empty because value: '' matches no option)`

- [ ] **Step 1: Write the failing test**

Create `src/pages/settings/administration/__tests__/BudgetsManagementPage.category.test.tsx`. Add the Apache 2.0 license header matching the other files in this directory, then:

```tsx
import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

vi.mock('react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router')>()
  return { ...actual, useNavigate: () => vi.fn() }
})
vi.mock('valtio', () => ({
  proxy: (obj: unknown) => obj,
  useSnapshot: vi.fn((store: unknown) => store),
  subscribe: vi.fn(),
}))
vi.mock('@/router', () => ({ router: { state: { matches: [] }, navigate: vi.fn() } }))
vi.mock('@/hooks/useVueRouter', () => ({ router: { push: vi.fn() }, findRouteObject: vi.fn() }))
vi.mock('@/store/user', () => ({
  userStore: { user: { isAdmin: true, isMaintainer: true, isAuditor: true } },
}))
vi.mock('@/store/budgets', () => ({
  budgetsStore: {
    budgets: [],
    pagination: { page: 1, perPage: 20, pages: 1, totalCount: 0 },
    loading: false,
    syncing: false,
    listBudgets: vi.fn().mockResolvedValue(undefined),
  },
}))
vi.mock('@/utils/toaster', () => ({
  default: { error: vi.fn(), success: vi.fn(), info: vi.fn() },
}))
vi.mock('@/pages/settings/components/SettingsLayout', () => ({
  default: ({ content }: any) => <div>{content}</div>,
}))
vi.mock('@/components/form/Select', () => ({
  Select: ({ value, options }: any) => {
    const selected = options?.find((o: any) => o.value === value)
    return <div data-testid="category-select">{selected?.label ?? ''}</div>
  },
}))

import BudgetsManagementPage from '../BudgetsManagementPage'

describe('BudgetsManagementPage category filter', () => {
  it('shows "All categories" label on initial render', () => {
    render(<BudgetsManagementPage />)
    expect(screen.getByTestId('category-select')).toHaveTextContent('All categories')
  })
})
```

- [ ] **Step 2: Run test — confirm it fails**

```
npx vitest run src/pages/settings/administration/__tests__/BudgetsManagementPage.category.test.tsx
```

Expected: FAIL — `category-select` renders empty text.

- [ ] **Step 3: Apply four edits to BudgetsManagementPage.tsx**

  1. `BudgetsManagementPage.tsx:96` — `value: ''` → `value: 'all'` in `categoryFilterOptions`.
  2. `BudgetsManagementPage.tsx:111` — `useState<BudgetCategory | ''>('')` → `useState<BudgetCategory | 'all'>('all')`.
  3. `BudgetsManagementPage.tsx:128` — `category: category || null` → `category: category === 'all' ? null : category`.
  4. `BudgetsManagementPage.tsx:269` — `(value || '') as BudgetCategory | ''` → `(value ?? 'all') as BudgetCategory | 'all'`.

- [ ] **Step 4: Run test — confirm it passes**

```
npx vitest run src/pages/settings/administration/__tests__/BudgetsManagementPage.category.test.tsx
```

---

### Task 2: Fix useProjectsFilters sentinel

**Files:**
- Modify: `src/pages/settings/administration/projectsManagement/hooks/useProjectsFilters.ts:36-37,61,73,82-83`
- Modify: `src/pages/settings/administration/projectsManagement/hooks/__tests__/useProjectsFilters.test.ts:50`

**Interfaces:**
- Produces: `budgetCategory` typed `BudgetCategory | 'all'`; default `'all'`; `setBudgetCategory` accepts `BudgetCategory | 'all'`

`Test-first: yes — update the existing "returns default values" assertion from toBe('') to toBe('all'); that test fails until the hook is fixed`

- [ ] **Step 1: Update the failing test**

`useProjectsFilters.test.ts:50` — change `expect(result.current.budgetCategory).toBe('')` to `expect(result.current.budgetCategory).toBe('all')`.

- [ ] **Step 2: Run — confirm it fails**

```
npx vitest run src/pages/settings/administration/projectsManagement/hooks/__tests__/useProjectsFilters.test.ts
```

Expected: FAIL on "returns default values when nothing is stored".

- [ ] **Step 3: Update useProjectsFilters.ts**

  1. Lines 36-37: `parseBudgetCategory` return type and fallback: `BudgetCategory | 'all'`; unknown value maps to `'all'` instead of `''`.
  2. Line 61: state type annotation `BudgetCategory | ''` → `BudgetCategory | 'all'` (initial value flows from `parseBudgetCategory`, no literal change needed).
  3. Line 73: `if (budgetCategory)` → `if (budgetCategory !== 'all')` (prevents persisting the literal string `'all'` to localStorage).
  4. Lines 82-83: `handleSetBudgetCategory` parameter type `BudgetCategory | ''` → `BudgetCategory | 'all'`.

For reference, the updated `parseBudgetCategory`:
```ts
const parseBudgetCategory = (value: unknown): BudgetCategory | 'all' =>
  BUDGET_CATEGORY_OPTIONS.some((o) => o.value === value) ? (value as BudgetCategory) : 'all'
```

- [ ] **Step 4: Run — confirm all tests pass**

```
npx vitest run src/pages/settings/administration/projectsManagement/hooks/__tests__/useProjectsFilters.test.ts
```

---

### Task 3: Wire ProjectsManagementFull to the updated sentinel

**Files:**
- Modify: `src/pages/settings/administration/projectsManagement/ProjectsManagementFull.tsx:80,167,185,578`

`Test-first: no — the hook test (Task 2) covers default value and persistence; this task is mechanical UI wiring that the TypeScript compiler validates.`

Apply four edits:

1. `ProjectsManagementFull.tsx:80` — `value: ''` → `value: 'all'` in `budgetCategoryFilterOptions`.
2. `ProjectsManagementFull.tsx:167` — `budgetCategory: '' as BudgetCategory | ''` → `budgetCategory: 'all' as BudgetCategory | 'all'` in `previousBudgetFiltersRef` initial value.
3. `ProjectsManagementFull.tsx:185` — `budgetCategory: budgetCategory || null` → `budgetCategory: budgetCategory === 'all' ? null : budgetCategory`.
4. `ProjectsManagementFull.tsx:578` — `(value ?? '') as BudgetCategory | ''` → `(value ?? 'all') as BudgetCategory | 'all'`.

Then run `npx tsc --noEmit` and confirm no new type errors.

---

## Negative-constraints pass

- Requirements say "No placeholder needed" — no PrimeReact `placeholder` prop is added anywhere. ✓
- Requirements say API receives `null` when all, specific value otherwise — filter logic in Tasks 1 and 3 use `=== 'all' ? null : category`; the `||` truthy check that would erroneously pass `'all'` to the API is removed in both files. ✓
- `'all'` must not be persisted to localStorage — Task 2 Step 3 changes the persistence guard from `if (budgetCategory)` (which would store `'all'`) to `if (budgetCategory !== 'all')`. ✓
- No stated non-goals or "must not" constraints beyond the above.
