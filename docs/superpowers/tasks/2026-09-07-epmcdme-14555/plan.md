# Fix Duplicate Initial Request on Project Management Page

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminate the duplicate `GET /v1/projects` request fired on initial page load when budget management is already enabled and a non-default `budget_assignment` filter is stored in localStorage.

**Architecture:** `previousBudgetFiltersRef` in `ProjectsManagementFull.tsx` is hardcoded to `'all'` values on init. When the component mounts with `isBudgetManagementEnabled = true` and a stored `'assigned'` filter, `hasBudgetFiltersChanged` is incorrectly `true`, so Effect 2 fires alongside Effect 1 with identical params. The fix is a one-line ref initialization correction. A regression test written first pins the RED/GREEN boundary.

**Tech Stack:** React 18, TypeScript, Vitest 1.6.1, React Testing Library.

**Spec:** Inline requirements.

## Global Constraints

- No new production dependencies.
- Commit per task using the repository's existing convention.

---

## Acceptance criteria

- [ ] Opening the Project Management page triggers only one initial request to the projects endpoint.
- [ ] No duplicate request for the same page, page size, budget inclusion, and assigned budget filter state.
- [ ] Project Management page data loads and displays correctly.
- [ ] Existing filters, pagination, and budget-related data remain functional.
- [ ] Regression test verifies no duplicate requests on initial load.

---

### Task 1: Regression test — initial load deduplication

**Files:**
- Create: `src/pages/settings/administration/projectsManagement/__tests__/ProjectsManagementFull.initialLoad.test.tsx`

**Interfaces:**
- Consumes: `projectsStore`, `userStore`, `getFilters` from `@/utils/filters`, `ProjectsManagementFull`
- Produces: two unit tests asserting `api.get` call count on mount and on budget filter change

Test-first: yes — `api.get` is called exactly once on mount when `useBudgetManagementEnabled = [true, true]` and stored `budget_assignment = 'assigned'`

- [ ] **Step 1: Write the test file**

Open with the Apache license header (identical to the one in `ProjectsManagementFull.search.test.tsx`). No local `vi.mock('valtio', ...)` — `setupTests.unit.ts` already mocks `useSnapshot` as `(store) => store`. No `MemoryRouter` wrapper — `useVueRouter` is mocked.

Copy these component mocks verbatim from `ProjectsManagementFull.search.test.tsx` — they are boilerplate: `SettingsLayout`, `Table`, `Button`, `InfoWarning`, `NavigationMore`, `NameLinkCell`, `BudgetSpendCell`, `ProjectModal`, `ConfirmationModal`, `ProjectResourceCounters`, `toaster`, `useVueRouter`, `useDebounceApply`.

Then add the following unique mocks and the test cases:

```tsx
import { act, render } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { getFilters } from '@/utils/filters'
import { projectsStore } from '@/store/projects'
import { userStore } from '@/store/user'
import ProjectsManagementFull from '../ProjectsManagementFull'

const mockGet = vi.fn()
vi.mock('@/utils/api', () => ({ default: { get: (...args: unknown[]) => mockGet(...args) } }))

// importOriginal spreads all real exports (including FILTER_ENTITY enum) and overrides only
// getFilters and setFilters — a plain factory would drop FILTER_ENTITY, crashing useProjectsFilters.
vi.mock('@/utils/filters', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/utils/filters')>()
  return { ...actual, getFilters: vi.fn(), setFilters: vi.fn() }
})

vi.mock('@/hooks/useFeatureFlags', () => ({
  useFeatureFlag: vi.fn(() => [false, true]),
  useUserManagementEnabled: vi.fn(() => [false, true]),
  useBudgetManagementEnabled: vi.fn(() => [true, true]), // already enabled on mount — reproduces bug
}))

vi.mock('@/components/form/Input', () => ({ default: () => null }))

// Component passes onChangeValue, not onChange. Identify by id, not by options sniffing.
let triggerBudgetChange: ((val: string) => void) | null = null
vi.mock('@/components/form/Select', () => ({
  default: ({ id, onChangeValue }: any) => {
    if (id === 'budget-assignment-filter') triggerBudgetChange = onChangeValue
    return null
  },
}))

// indexProjects does response.json() — a plain object has no .json() and throws into catch.
const mockResponse = { json: async () => ({ data: [], pagination: { page: 0, per_page: 10, total: 0 } }) }

beforeEach(() => {
  mockGet.mockReset() // vitest.config does not set clearMocks — reset to prevent cross-test accumulation
  mockGet.mockResolvedValue(mockResponse)
  vi.mocked(getFilters).mockReturnValue({ budget_assignment: 'assigned' } as any)
  triggerBudgetChange = null
  projectsStore.projects = []
  projectsStore.pagination = { page: 0, perPage: 10, totalPages: 0, totalCount: 0 } as any
  userStore.user = { platform_role: 'admin', isAdmin: true } as any
})

describe('ProjectsManagementFull — initial load deduplication', () => {
  it('fires api.get exactly once on mount when budget management is enabled and budget_assignment is assigned', async () => {
    await act(async () => { render(<ProjectsManagementFull />) })
    expect(mockGet).toHaveBeenCalledTimes(1)
  })

  it('fires api.get exactly once when budget assignment filter changes from all to assigned', async () => {
    vi.mocked(getFilters).mockReturnValue({ budget_assignment: 'all' } as any)
    await act(async () => { render(<ProjectsManagementFull />) })
    mockGet.mockReset()
    mockGet.mockResolvedValue(mockResponse)
    await act(async () => { triggerBudgetChange?.('assigned') })
    expect(mockGet).toHaveBeenCalledTimes(1)
  })
})
```

- [ ] **Step 2: Run the test to verify RED state**

Run: `npx vitest run --project unit ProjectsManagementFull.initialLoad`

Before the fix, Test 1 fails (duplicate request) and Test 2 passes (filter change still fires one request). After the fix, both pass. This is the required RED/GREEN split — do not accept a plan where Test 2 starts failing.

- [ ] **Step 3: Commit the failing test**

```bash
git add src/pages/settings/administration/projectsManagement/__tests__/ProjectsManagementFull.initialLoad.test.tsx
git commit -m "EPMCDME-14555: Add regression tests for initial-load request deduplication"
```

---

### Task 2: Fix `previousBudgetFiltersRef` initialization

**Files:**
- Modify: `src/pages/settings/administration/projectsManagement/ProjectsManagementFull.tsx:165-168`

**Interfaces:**
- Consumes: `budgetAssignmentFilter`, `budgetCategory` already destructured from `useProjectsFilters()` at line 155
- Produces: `previousBudgetFiltersRef` initialized from live state so `hasBudgetFiltersChanged` is `false` on mount when the stored filter matches the ref

Test-first: no

- [ ] **Step 1: Replace the hardcoded ref initializer**

`ProjectsManagementFull.tsx:165-168` — replace the two `'all'` string literals with the live variables:

```ts
// Initialized from live state so Effect 2's hasBudgetFiltersChanged is false on mount.
// Assumes the App.tsx gate renders this component only after configs are fetched,
// so isBudgetManagementEnabled is stable by first render.
const previousBudgetFiltersRef = useRef({
  budgetAssignmentFilter,
  budgetCategory,
})
```

- [ ] **Step 2: Run unit tests to verify GREEN**

Run: `npx vitest run --project unit`

Both Task 1 tests must pass. All pre-existing `ProjectsManagementFull` tests must continue to pass.

- [ ] **Step 3: Commit the fix and passing tests**

```bash
git add src/pages/settings/administration/projectsManagement/ProjectsManagementFull.tsx
git commit -m "EPMCDME-14555: Fix previousBudgetFiltersRef initialization to prevent duplicate requests"
```

---

*negative-constraints: The requirements impose no "must not" constraints beyond avoiding new dependencies. No task introduces a new npm dependency. No task alters the budget-filter-change path — Effect 2's comparison and update logic inside the `if (!hasBudgetFiltersChanged) return` block is untouched. No task modifies the `skipPaginationReloadRef` guard, the pagination effect, or any sort/search effect. The fix scope is exactly the ref initializer at lines 165–168.*
