# Fix Project Filter Display Name After Page Refresh (EPMCDME-13520) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the project filter chip showing the technical project name instead of the display name after page refresh, when a system-level admin has a non-roster project selected.

**Architecture:** Wire `useProjectDisplayNames` (already used in `ProjectNameCell`, `AssistantDetails`, `SkillDetails`) into the three filter components that were missing the call. Each component derives `resolvedProjectOptions` — the roster options supplemented with display-name-resolved entries for any saved filter values absent from the roster — and passes those to `Filters.tsx` so `getHiddenOptions` never creates a technical-name synthetic fallback. Tests follow TDD order: write the failing integration test first, then implement the fix.

**Tech Stack:** React 18, Valtio, Vitest 1.6.1, @testing-library/react 16, PrimeReact MultiSelect

---

### File Structure

| File | Change |
|---|---|
| `src/pages/assistants/components/AssistantList/AssistantFilters/AssistantFilters.tsx` | Add `useProjectDisplayNames`, derive `resolvedProjectOptions`, swap `options` in project filter definition |
| `src/pages/skills/components/SkillsFilters.tsx` | Same symmetric fix |
| `src/pages/workflows/components/WorkflowsFilters.tsx` | Same fix; source values come from `initialFilterValues.project` |
| `src/pages/assistants/__tests__/AssistantsListPage.integration.test.tsx` | Add resolved-state + fallback-state tests |
| `src/pages/skills/__tests__/SkillsListPage.integration.test.tsx` | New file — first integration test for this page |
| `src/pages/workflows/__tests__/WorkflowsListPage.integration.test.tsx` | Update `display_name: null` fixture, add new display-name-restore test |

---

### Task 1: Write failing AssistantsListPage integration tests

**Test-first: yes — `shows project display name in filter chip on refresh` fails because the chip currently renders `non-roster-proj` instead of `Non Roster Project`**

**Files:**
- Modify: `src/pages/assistants/__tests__/AssistantsListPage.integration.test.tsx`

- [ ] **Step 1: Add the import for `projectDisplayNamesStore` at the top of the file**

After the existing import block, add:

```typescript
import { projectDisplayNamesStore } from '@/store/projectDisplayNames'
```

- [ ] **Step 2: Append the new test suite at the end of the outer `describe` block (before the closing `})`)**

```typescript
  describe('Project filter display name', () => {
    beforeEach(() => {
      // Prevent display-name cache and localStorage from leaking across tests.
      projectDisplayNamesStore.cache = {}
      localStorage.clear()
    })

    it('shows project display name in filter chip on refresh (resolved state)', async () => {
      // storage.put(userId, key, filters) writes localStorage key `${userId}_${key}`
      // where key = `${FILTERS_PREFIX}_${entityKey}` = `filters_assistants.visible_to_user`
      // Full key: `test-user-id_filters_assistants.visible_to_user`
      localStorage.setItem(
        'test-user-id_filters_assistants.visible_to_user',
        JSON.stringify({ project: ['non-roster-proj'] })
      )

      // Admin user with no roster projects.
      // getAdminProjects('') short-circuits (search.length < 3) and returns only
      // roster projects — an empty array here — so non-roster-proj is absent from options.
      mockAPI('GET', 'v1/user', {
        user_id: 'test-user-id',
        email: 'test@example.com',
        name: 'Test User',
        username: 'testuser',
        is_admin: true,
        is_maintainer: false,
        user_type: 'INTERNAL',
        applications: [],
        projects: [],
      })

      // projectDisplayNamesStore.ensure('non-roster-proj') fetches this endpoint.
      mockAPI('GET', 'v1/projects/non-roster-proj', {
        name: 'non-roster-proj',
        display_name: 'Non Roster Project',
      })

      renderPage('/assistants')

      await waitFor(() => {
        expect(screen.getByText('Non Roster Project')).toBeInTheDocument()
      })
    })

    it('shows technical name when display name unavailable (fallback state)', async () => {
      // Same localStorage seed as above.
      localStorage.setItem(
        'test-user-id_filters_assistants.visible_to_user',
        JSON.stringify({ project: ['non-roster-proj'] })
      )

      mockAPI('GET', 'v1/user', {
        user_id: 'test-user-id',
        email: 'test@example.com',
        name: 'Test User',
        username: 'testuser',
        is_admin: true,
        is_maintainer: false,
        user_type: 'INTERNAL',
        applications: [],
        projects: [],
      })

      // display_name: null → ensure() caches '' → projectDisplayNames.get() returns
      // undefined → label falls back to technical name. Tests graceful degradation.
      mockAPI('GET', 'v1/projects/non-roster-proj', {
        name: 'non-roster-proj',
        display_name: null,
      })

      renderPage('/assistants')

      await waitFor(() => {
        expect(screen.getByText('non-roster-proj')).toBeInTheDocument()
      })
    })
  })
```

- [ ] **Step 3: Run the resolved-state test to confirm RED**

```bash
npx vitest run --project integration src/pages/assistants/__tests__/AssistantsListPage.integration.test.tsx -t "shows project display name in filter chip on refresh"
```

Expected: FAIL — `Unable to find an element with the text: Non Roster Project`. The chip currently shows `non-roster-proj`.

- [ ] **Step 4: Run the fallback-state test to confirm it is already GREEN (no fix needed for degradation)**

```bash
npx vitest run --project integration src/pages/assistants/__tests__/AssistantsListPage.integration.test.tsx -t "shows technical name when display name unavailable"
```

Expected: PASS — fallback to technical name already works before the fix.

---

### Task 2: Fix AssistantFilters — wire `useProjectDisplayNames`

**Test-first: no — tests were written in Task 1**

**Files:**
- Modify: `src/pages/assistants/components/AssistantList/AssistantFilters/AssistantFilters.tsx`

- [ ] **Step 1: Add the `useProjectDisplayNames` import**

In `AssistantFilters.tsx`, add after the last import line:

```typescript
import { useProjectDisplayNames } from '@/hooks/useProjectDisplayNames'
```

- [ ] **Step 2: Add the hook call and `resolvedProjectOptions` useMemo**

Inside the `AssistantFilters` component body, after the line `const [isLoadingProjects, setIsLoadingProjects] = useState(false)`, add:

```typescript
const projectDisplayNames = useProjectDisplayNames(filters.project ?? [])

const resolvedProjectOptions = useMemo(() => {
  const existing = new Set(projectOptions.map((o) => o.value))
  const extras = (filters.project ?? [])
    .filter((name): name is string => !!name && !existing.has(name))
    .map((name) => ({ label: projectDisplayNames.get(name) ?? name, value: name }))
  return [...projectOptions, ...extras]
}, [projectOptions, filters.project, projectDisplayNames])
```

- [ ] **Step 3: Replace `options: projectOptions` with `options: resolvedProjectOptions` in `filterDefinitions`**

In the `filterDefinitions` useMemo, find the project filter entry (it is the first entry in the array):

```typescript
{
  name: 'project',
  label: 'Project',
  type: FilterDefinitionType.Multiselect,
  value: filters.project || [],
  options: projectOptions,       // ← change this line
  config: { ... },
},
```

Change to:

```typescript
  options: resolvedProjectOptions,
```

Then update the `filterDefinitions` dependency array: replace `projectOptions` with `resolvedProjectOptions` (since `resolvedProjectOptions` already depends on `projectOptions`, keeping both is redundant):

```typescript
  [
    filters.project,
    filters.created_by,
    filters.categories,
    resolvedProjectOptions,      // ← was: projectOptions
    isLoadingProjects,
    createdByOptions,
    categoriesOptions,
    getStatusInitialValue,
    activeScope,
  ]
```

- [ ] **Step 4: Run all new tests to confirm GREEN**

```bash
npx vitest run --project integration src/pages/assistants/__tests__/AssistantsListPage.integration.test.tsx -t "Project filter display name"
```

Expected: both tests PASS.

- [ ] **Step 5: Run the full AssistantsListPage integration suite to check for regressions**

```bash
npx vitest run --project integration src/pages/assistants/__tests__/AssistantsListPage.integration.test.tsx
```

Expected: all tests PASS.

- [ ] **Step 6: Commit**

```bash
git add src/pages/assistants/components/AssistantList/AssistantFilters/AssistantFilters.tsx \
        src/pages/assistants/__tests__/AssistantsListPage.integration.test.tsx
git commit -m "EPMCDME-13520: Fix project filter display name for admin users on Assistants page"
```

---

### Task 3: Write failing SkillsListPage integration test

**Test-first: yes — `shows project display name in filter chip on refresh` fails because chip shows `non-roster-proj` instead of `Non Roster Project`**

**Files:**
- Create: `src/pages/skills/__tests__/SkillsListPage.integration.test.tsx`

- [ ] **Step 1: Create the new test file**

```typescript
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

import { screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'

import { projectDisplayNamesStore } from '@/store/projectDisplayNames'
import { mockAPI, renderPage } from '@/test-utils/integration'

describe('SkillsListPage - Integration', () => {
  describe('Project filter display name', () => {
    beforeEach(() => {
      projectDisplayNamesStore.cache = {}
      localStorage.clear()
    })

    it('shows project display name in filter chip on refresh (resolved state)', async () => {
      // Filter key: `test-user-id_filters_skills.project`
      // (FILTERS_PREFIX = 'filters', FILTER_ENTITY.SKILLS = 'skills',
      //  default scope = SKILL_INDEX_SCOPES.PROJECT = 'project')
      localStorage.setItem(
        'test-user-id_filters_skills.project',
        JSON.stringify({ project: ['non-roster-proj'] })
      )

      mockAPI('GET', 'v1/user', {
        user_id: 'test-user-id',
        email: 'test@example.com',
        name: 'Test User',
        username: 'testuser',
        is_admin: true,
        is_maintainer: false,
        user_type: 'INTERNAL',
        applications: [],
        projects: [],
      })

      // v1/skills has no global default — mock it explicitly.
      mockAPI('GET', 'v1/skills', {
        data: [],
        pagination: { page: 0, per_page: 12, pages: 0, total: 0 },
      })

      mockAPI('GET', 'v1/projects/non-roster-proj', {
        name: 'non-roster-proj',
        display_name: 'Non Roster Project',
      })

      renderPage('/skills')

      await waitFor(() => {
        expect(screen.getByText('Non Roster Project')).toBeInTheDocument()
      })
    })
  })
})
```

- [ ] **Step 2: Run the test to confirm RED**

```bash
npx vitest run --project integration src/pages/skills/__tests__/SkillsListPage.integration.test.tsx
```

Expected: FAIL — `Unable to find an element with the text: Non Roster Project`.

---

### Task 4: Fix SkillsFilters — wire `useProjectDisplayNames`

**Test-first: no — test was written in Task 3**

**Files:**
- Modify: `src/pages/skills/components/SkillsFilters.tsx`

- [ ] **Step 1: Add the `useProjectDisplayNames` import**

```typescript
import { useProjectDisplayNames } from '@/hooks/useProjectDisplayNames'
```

- [ ] **Step 2: Add the hook call and `resolvedProjectOptions` useMemo**

Inside `SkillsFiltersComponent`, after the `const [categoryOptions, setCategoryOptions] = useState<FilterOption[]>([])` line:

```typescript
const projectDisplayNames = useProjectDisplayNames(filters.project ?? [])

const resolvedProjectOptions = useMemo(() => {
  const existing = new Set(projectOptions.map((o) => o.value))
  const extras = (filters.project ?? [])
    .filter((name): name is string => !!name && !existing.has(name))
    .map((name) => ({ label: projectDisplayNames.get(name) ?? name, value: name }))
  return [...projectOptions, ...extras]
}, [projectOptions, filters.project, projectDisplayNames])
```

- [ ] **Step 3: Replace `options: projectOptions` with `options: resolvedProjectOptions` in `filterDefinitions`**

In the `filterDefinitions` useMemo, change the project entry:

```typescript
{
  name: 'project',
  label: 'Project',
  type: FilterDefinitionType.Multiselect,
  value: filters.project ?? [],
  options: resolvedProjectOptions,   // ← was: projectOptions
  config: { ... },
},
```

Update the dependency array: replace `projectOptions` with `resolvedProjectOptions`:

```typescript
    [
      filters.project,
      filters.categories,
      filters.visibility,
      filters.created_by,
      resolvedProjectOptions,        // ← was: projectOptions
      createdByOptions,
      categoryOptions,
      loadProjectOptions,
      activeScope,
    ]
```

- [ ] **Step 4: Run the SkillsListPage test to confirm GREEN**

```bash
npx vitest run --project integration src/pages/skills/__tests__/SkillsListPage.integration.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Run SkillsFilters-related unit tests to check for regressions**

```bash
npx vitest run --project unit src/pages/skills/
```

Expected: all PASS.

- [ ] **Step 6: Commit**

```bash
git add src/pages/skills/components/SkillsFilters.tsx \
        src/pages/skills/__tests__/SkillsListPage.integration.test.tsx
git commit -m "EPMCDME-13520: Fix project filter display name for admin users on Skills page"
```

---

### Task 5: Add failing WorkflowsListPage display-name test and update existing fixture

**Test-first: yes — new test `shows project display name in filter chip on refresh` fails because chip shows `non-roster-proj`; fixture update does not produce a RED test (existing test already tests roster-project flow)**

**Files:**
- Modify: `src/pages/workflows/__tests__/WorkflowsListPage.integration.test.tsx`

- [ ] **Step 1: Update the `Project filter applies correctly` test fixture (line ~845)**

Find the `Project filter applies correctly` test. The `mockAPI('GET', 'v1/user', ...)` inside it currently uses `display_name: null` for the projects. Update the three project entries:

```typescript
      mockAPI('GET', 'v1/user', {
        user_id: 'test-user-id',
        email: 'test@example.com',
        name: 'Test User',
        username: 'testuser',
        is_admin: false,
        is_maintainer: false,
        user_type: 'INTERNAL',
        applications: ['Project A', 'Project B', 'Project C'],
        projects: [
          { name: 'Project A', display_name: 'Project A Display', is_project_admin: true },
          { name: 'Project B', display_name: 'Project B Display', is_project_admin: true },
          { name: 'Project C', display_name: 'Project C Display', is_project_admin: true },
        ],
      })
```

Then after the existing `selectMultiSelectOptions` call and before `submitFilterViaSearch`, add an assertion that the chip shows the display name:

```typescript
      await waitFor(() => {
        expect(screen.getByText('Project A Display')).toBeInTheDocument()
      })
```

(Keep the existing assertion that the router is called with `project: ['Project A', 'Project B']` — values are still technical names, labels are display names.)

- [ ] **Step 2: Add the `projectDisplayNamesStore` import at the top of the file**

After existing imports:

```typescript
import { projectDisplayNamesStore } from '@/store/projectDisplayNames'
```

- [ ] **Step 3: Add the display-name-restore test suite**

Inside the outer `describe`, find a suitable location (e.g., after `Project filter applies correctly`) and add:

```typescript
    it('shows project display name in filter chip after refresh with persisted non-roster project', async () => {
      // Filter key for workflows.all scope:
      // `test-user-id_filters_workflows.all`
      projectDisplayNamesStore.cache = {}
      localStorage.setItem(
        'test-user-id_filters_workflows.all',
        JSON.stringify({ project: ['non-roster-proj'] })
      )

      mockAPI('GET', 'v1/user', {
        user_id: 'test-user-id',
        email: 'test@example.com',
        name: 'Test User',
        username: 'testuser',
        is_admin: true,
        is_maintainer: false,
        user_type: 'INTERNAL',
        applications: [],
        projects: [],
      })

      mockAPI('GET', 'v1/workflows', {
        data: [],
        pagination: { page: 0, per_page: 12, pages: 0, total: 0 },
      })

      mockAPI('GET', 'v1/projects/non-roster-proj', {
        name: 'non-roster-proj',
        display_name: 'Non Roster Project',
      })

      renderPage('/workflows/all')

      await waitFor(() => {
        expect(screen.getByText('Non Roster Project')).toBeInTheDocument()
      })
    })
```

- [ ] **Step 4: Run the new restore-path test to confirm RED**

```bash
npx vitest run --project integration src/pages/workflows/__tests__/WorkflowsListPage.integration.test.tsx -t "shows project display name in filter chip after refresh"
```

Expected: FAIL — chip shows `non-roster-proj`, not `Non Roster Project`.

- [ ] **Step 5: Run the updated `Project filter applies correctly` test to check it still passes**

```bash
npx vitest run --project integration src/pages/workflows/__tests__/WorkflowsListPage.integration.test.tsx -t "Project filter applies correctly"
```

Expected: PASS (fixture update is a quality improvement; roster-project flow was already correct).

---

### Task 6: Fix WorkflowsFilters — wire `useProjectDisplayNames`

**Test-first: no — tests were written in Task 5**

**Files:**
- Modify: `src/pages/workflows/components/WorkflowsFilters.tsx`

- [ ] **Step 1: Add the `useProjectDisplayNames` import**

```typescript
import { useProjectDisplayNames } from '@/hooks/useProjectDisplayNames'
```

- [ ] **Step 2: Add the hook call and `resolvedProjectOptions` useMemo**

Inside `WorkflowsFilters`, after the `const [isCreatedByMeChecked, ...]` state line, add:

```typescript
const projectDisplayNames = useProjectDisplayNames(initialFilterValues.project ?? [])

const resolvedProjectOptions = useMemo(() => {
  const existing = new Set(projectOptions.map((o) => o.value))
  const extras = (initialFilterValues.project ?? [])
    .filter((name): name is string => !!name && !existing.has(name))
    .map((name) => ({ label: projectDisplayNames.get(name) ?? name, value: name }))
  return [...projectOptions, ...extras]
}, [projectOptions, initialFilterValues.project, projectDisplayNames])
```

Note: `initialFilterValues` is an IIFE inside the component body — it re-evaluates on every render and returns new array references. The fix is still correct because `ensure()` is guarded by both `inFlight` (dedup during fetch) and a cache read-back (once set, `projectDisplayNames.get(name)` returns the display name and the effect no longer needs to call `ensure()` for that name). The existing `filterDefinitions` useMemo already depends on `initialFilterValues.project`, so the re-render behaviour introduced here is no different from what the component does today.

- [ ] **Step 3: Replace `options: projectOptions` with `options: resolvedProjectOptions` in `filterDefinitions`**

In the `filterDefinitions` useMemo, find the project filter entry (the second entry, after `categories`):

```typescript
{
  name: 'project',
  label: 'Project',
  type: FilterDefinitionType.Multiselect,
  value: initialFilterValues.project || [],
  options: resolvedProjectOptions,   // ← was: projectOptions
  config: {
    maxSelectedLabels: 3,
    filter: true,
    filterPlaceholder: 'Search for projects',
    onFilter: loadProjectOptions,
  },
},
```

Update the dependency array: replace `projectOptions` with `resolvedProjectOptions`. The full array in `WorkflowsFilters` should become:

```typescript
    [
      initialFilterValues.categories,
      initialFilterValues.project,
      initialFilterValues.shared,
      initialFilterValues.created_by,
      resolvedProjectOptions,        // ← was: projectOptions
      createdByOptions,
      categoriesOptions,
      loadProjectOptions,
      scope,
    ]
```

- [ ] **Step 4: Run the WorkflowsListPage tests to confirm new test turns GREEN**

```bash
npx vitest run --project integration src/pages/workflows/__tests__/WorkflowsListPage.integration.test.tsx -t "shows project display name in filter chip after refresh"
```

Expected: PASS.

- [ ] **Step 5: Run the full WorkflowsListPage integration suite to check for regressions**

```bash
npx vitest run --project integration src/pages/workflows/__tests__/WorkflowsListPage.integration.test.tsx
```

Expected: all tests PASS.

- [ ] **Step 6: Run all three filter component unit tests as a final regression sweep**

```bash
npx vitest run --project unit src/hooks/__tests__/useProjectDisplayNames.test.ts
npx vitest run --project unit src/store/__tests__/projectDisplayNames.test.ts
```

Expected: all PASS (no changes to hook or store).

- [ ] **Step 7: Commit**

```bash
git add src/pages/workflows/components/WorkflowsFilters.tsx \
        src/pages/workflows/__tests__/WorkflowsListPage.integration.test.tsx
git commit -m "EPMCDME-13520: Fix project filter display name for admin users on Workflows page"
```
