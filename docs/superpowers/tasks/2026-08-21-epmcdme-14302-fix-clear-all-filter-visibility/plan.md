# EPMCDME-14302: Fix "Clear All" Filter Visibility on Assistants Page

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Hide the "Clear all" button in the Assistants page Filters panel when no user-visible filter is active.

**Architecture:** The `areFiltersEmpty` useMemo in `AssistantFilters.tsx` currently passes the entire `filters` object (which always contains `sort_order: 'desc'`) to `checkEmptyFilters`, so the function always returns `false`. The fix narrows the check to only the user-visible filter keys (search, project, categories, created_by, shared, is_global), leaving sort fields out of scope.

**Tech Stack:** React 18, TypeScript 5, Vitest + React Testing Library

**Spec:** N/A (bug fix — requirements from EPMCDME-14302 ticket)

## Global Constraints

- Do NOT modify `checkEmptyFilters` in `src/utils/filters.ts` — it is a shared utility used elsewhere.
- Do NOT modify `FILTER_INITIAL_STATE` in `src/constants/assistants.ts`.
- The fix is confined to `AssistantFilters.tsx`.
- Commit message must carry the ticket prefix `EPMCDME-14302`.

---

## File Map

| File | Change |
|---|---|
| `src/pages/assistants/components/AssistantList/AssistantFilters/AssistantFilters.tsx` | Replace `areFiltersEmpty` useMemo — the only file that changes |
| `src/pages/assistants/components/AssistantList/AssistantFilters/__tests__/AssistantFilters.unit.test.tsx` | New unit test file covering the `areFiltersEmpty` behaviour |

---

### Task 1: Fix `areFiltersEmpty` and add a unit test

**Files:**
- Modify: `src/pages/assistants/components/AssistantList/AssistantFilters/AssistantFilters.tsx:54-56`
- Create: `src/pages/assistants/components/AssistantList/AssistantFilters/__tests__/AssistantFilters.unit.test.tsx`

**Interfaces:**
- Consumes: `AssistantFilters` type from `useAssistantFilters`, `checkEmptyFilters` from `@/utils/filters`
- Produces: `areFiltersEmpty: boolean` — `true` only when search/project/categories/created_by/shared/is_global are all empty/null

**Test-first: yes** — write a unit test that mounts `AssistantFilters` with a fully-default filter state and asserts the "Clear all" button is absent; then with `search: 'foo'` and asserts it is present.

- [ ] **Step 1: Write the failing tests**

Create `src/pages/assistants/components/AssistantList/AssistantFilters/__tests__/AssistantFilters.unit.test.tsx`:

```tsx
// Copyright 2026 EPAM Systems, Inc. ("EPAM")
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//

import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { FILTER_INITIAL_STATE } from '@/constants/assistants'

import AssistantFilters from '../AssistantFilters'

// Minimal mocks so the component can render without real stores/APIs
vi.mock('@/store/assistants', () => ({
  assistantsStore: { assistantCategories: [] },
}))
vi.mock('@/store/user', () => ({
  userStore: { loadAssistantsUsers: vi.fn().mockResolvedValue([]) },
}))
vi.mock('@/hooks/useProjectOptions', () => ({
  useProjectOptions: () => ({ projectOptions: [], loadProjectOptions: vi.fn() }),
}))
vi.mock('@/hooks/useResolvedProjectOptions', () => ({
  useResolvedProjectOptions: () => [],
}))
vi.mock('@/hooks/useDebounceApply', () => ({
  useDebouncedApply: vi.fn(),
}))

const defaultFilters = {
  ...FILTER_INITIAL_STATE,
  // sort_order: 'desc' is already in FILTER_INITIAL_STATE — the bug source
}

describe('AssistantFilters — Clear all visibility', () => {
  it('does NOT show "Clear all" when all user-visible filters are at their default state', () => {
    render(
      <AssistantFilters
        filters={defaultFilters}
        onFilterChange={vi.fn()}
        activeScope="visible_to_user"
      />,
    )
    expect(screen.queryByText(/clear all/i)).not.toBeInTheDocument()
  })

  it('shows "Clear all" when the search filter is non-empty', () => {
    render(
      <AssistantFilters
        filters={{ ...defaultFilters, search: 'my assistant' }}
        onFilterChange={vi.fn()}
        activeScope="visible_to_user"
      />,
    )
    expect(screen.getByText(/clear all/i)).toBeInTheDocument()
  })

  it('shows "Clear all" when a project filter is selected', () => {
    render(
      <AssistantFilters
        filters={{ ...defaultFilters, project: ['proj-1'] }}
        onFilterChange={vi.fn()}
        activeScope="visible_to_user"
      />,
    )
    expect(screen.getByText(/clear all/i)).toBeInTheDocument()
  })

  it('hides "Clear all" again after all user-visible filters are cleared (sort_order still desc)', () => {
    // Simulate what happens after the user presses Clear all:
    // sort_order stays 'desc', all user-visible filters return to default
    render(
      <AssistantFilters
        filters={{ ...defaultFilters, search: '', project: [], categories: [], created_by: '', shared: null, is_global: null }}
        onFilterChange={vi.fn()}
        activeScope="visible_to_user"
      />,
    )
    expect(screen.queryByText(/clear all/i)).not.toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run src/pages/assistants/components/AssistantList/AssistantFilters/__tests__/AssistantFilters.unit.test.tsx --reporter=verbose
```

Expected: first test FAILS (because "Clear all" IS currently visible with default filters — that's the bug).

- [ ] **Step 3: Apply the fix in `AssistantFilters.tsx`**

Replace lines 54–56 (the `areFiltersEmpty` useMemo) with:

```ts
const USER_VISIBLE_FILTER_KEYS: (keyof AssistantFiltersType)[] = [
  'search',
  'project',
  'categories',
  'created_by',
  'shared',
  'is_global',
]

const areFiltersEmpty = useMemo(() => {
  const userFilters = USER_VISIBLE_FILTER_KEYS.reduce(
    (acc, key) => {
      acc[key] = filters[key]
      return acc
    },
    {} as Partial<AssistantFiltersType>,
  )
  return checkEmptyFilters(userFilters)
}, [filters])
```

Place `USER_VISIBLE_FILTER_KEYS` outside the component (module-level constant, before the `AssistantFilters` function definition) so it is not recreated on each render.

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run src/pages/assistants/components/AssistantList/AssistantFilters/__tests__/AssistantFilters.unit.test.tsx --reporter=verbose
```

Expected: all 4 tests PASS.

- [ ] **Step 5: Run type-check to confirm no TypeScript errors**

```bash
npx tsc --noEmit
```

Expected: no errors related to the changed file.

- [ ] **Step 6: Commit**

```bash
git add src/pages/assistants/components/AssistantList/AssistantFilters/AssistantFilters.tsx \
        src/pages/assistants/components/AssistantList/AssistantFilters/__tests__/AssistantFilters.unit.test.tsx
git commit -m "fix(EPMCDME-14302): hide Clear all when no user-visible assistant filters are active"
```
