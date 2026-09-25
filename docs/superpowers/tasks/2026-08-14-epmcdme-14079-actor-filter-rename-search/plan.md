# EPMCDME-14079 Actor Filter Rename and Search Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the broken "Actor ID" plain-text input on the Activity Events page with a server-search MultiSelect that resolves actor name/email to a UUID before filtering.

**Architecture:** Single-file page change in `ActivityEventsPage.tsx`. Replace `<Input>` with `<MultiSelect singleValue onFilter>`, add `actorOptions`/`actorLoading` state, wire `handleActorSearch` to call `userStore.searchUsers(query, 10)` on filter input, and resolve the selected user's `id` as the `actor_id` sent to `activityEventsStore.listEvents()`. No store, type, or backend changes needed.

**Tech Stack:** React 18, TypeScript 5, Valtio, PrimeReact MultiSelect, Vitest 1.6.1 + React Testing Library

**Spec:** `docs/superpowers/tasks/2026-08-14-epmcdme-14079-actor-filter-rename-search/spec.md`

## Global Constraints

- Frontend-only change — no backend modifications.
- API calls only inside Valtio store methods; never call `api.*` directly from components.
- `userStore.searchUsers(query, 10)` is the only user-lookup method to use; do not add new store methods.
- Label must be exactly `"Actor"`, placeholder exactly `"Filter by actor"`, filterPlaceholder exactly `"Search by name or email"`.
- Options formatted as `` `${user.name} (${user.email})` ``; option value is `user.id` (UUID).
- Error handling: catch any exception from `searchUsers`, set `actorOptions` to `[]`, do NOT call `toaster.error` — silent empty list.
- Commit message format: `EPMCDME-14079: Capital sentence` (Tekton CI enforces this).
- License header required on every new file (copy from an existing file in the same directory).

---

### Task 1: Replace Actor ID Input with server-search MultiSelect

**Test-first: yes — unit test asserting label "Actor" exists and "Actor ID" does not**

**Files:**
- Modify: `src/pages/settings/administration/ActivityEventsPage.tsx`
- Test: `src/pages/settings/administration/__tests__/ActivityEventsPage.test.tsx`

**Interfaces:**
- Consumes: `userStore.searchUsers(query: string, perPage?: number): Promise<UserListItem[]>` from `@/store/user` (already imported in `ActivityEventsPage.tsx`)
- Consumes: `UserListItem.id: string`, `UserListItem.name: string | null`, `UserListItem.email: string` from `@/types/entity/user`
- Consumes: `MultiSelect` from `@/components/form/MultiSelect/MultiSelect` (already imported)
- Produces: `actorId: string | null` — resolved UUID passed as `actor_id` to `activityEventsStore.listEvents()`

---

- [ ] **Step 1: Write the failing unit test**

Open `src/pages/settings/administration/__tests__/ActivityEventsPage.test.tsx`. The file currently only tests pure filter-helper functions. Add a new `describe` block at the bottom that renders the page and asserts the filter label.

The test needs the page to render. The page requires a maintainer user to pass the access guard. Check the integration test's `maintainerUser` fixture and the global fetch mock in `setupTests.tsx` — the `v1/user` global default returns a non-maintainer; we need to override it to a maintainer.

Add this import at the top of the test file (after existing imports):

```tsx
import { screen, waitFor } from '@testing-library/react'
import { vi } from 'vitest'
import { requestRegistry } from '@/test-utils/_mock-state'
import { renderPage } from '@/test-utils/integration'
```

Add this `describe` block at the bottom of `ActivityEventsPage.test.tsx`:

```tsx
describe('ActivityEventsPage — actor filter', () => {
  beforeEach(() => {
    // Override v1/user to return a maintainer so the access guard passes
    requestRegistry.set('GET:v1/user', {
      factory: () =>
        new Response(
          JSON.stringify({
            user_id: 'maintainer-1',
            id: 'maintainer-1',
            email: 'maintainer@test.com',
            name: 'Maintainer User',
            username: 'maintainer',
            is_admin: true,
            is_maintainer: true,
            user_type: 'INTERNAL',
            applications: [],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        ),
    })
    // Stub filter-options endpoint
    requestRegistry.set('GET:v1/admin/activity-events/filter-options', {
      factory: () =>
        new Response(
          JSON.stringify({ domains: [], event_types: [], entity_types: [], mapping: {} }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        ),
    })
    // Stub events list endpoint
    requestRegistry.set('GET:v1/admin/activity-events', {
      factory: () =>
        new Response(
          JSON.stringify({ data: [], pagination: { page: 0, per_page: 50, total: 0 } }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        ),
    })
  })

  it('shows "Actor" label and not "Actor ID"', async () => {
    renderPage('/settings/administration/activity-events')

    await waitFor(() => {
      expect(screen.queryByText('Actor ID')).toBeNull()
      expect(screen.getByText('Actor')).toBeInTheDocument()
    })
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
npx vitest run src/pages/settings/administration/__tests__/ActivityEventsPage.test.tsx --reporter=verbose
```

Expected: FAIL — "Actor ID" is still present in the DOM and "Actor" label alone is not found (or test infrastructure error if imports need adjustment).

- [ ] **Step 3: Update state declarations in `ActivityEventsPage.tsx`**

Open `src/pages/settings/administration/ActivityEventsPage.tsx`. Find the state declarations block (around line 152–161):

```tsx
  const [actorId, setActorId] = useState('')
```

Replace that single line with:

```tsx
  const [actorId, setActorId] = useState<string | null>(null)
  const [actorOptions, setActorOptions] = useState<Array<{ label: string; value: string }>>([])
  const [actorLoading, setActorLoading] = useState(false)
```

- [ ] **Step 4: Update `clearFilters` to reset new state**

Find `clearFilters` (around line 173):

```tsx
    setActorId('')
```

Replace with:

```tsx
    setActorId(null)
    setActorOptions([])
```

- [ ] **Step 5: Add `handleActorSearch` after `clearFilters`**

Find the closing `}, [])` of `clearFilters` and add the search handler immediately after:

```tsx
  const handleActorSearch = useCallback(async (query: string) => {
    setActorId(null)
    if (!query) {
      setActorOptions([])
      return
    }
    setActorLoading(true)
    try {
      const users = await userStore.searchUsers(query, 10)
      setActorOptions(users.map((u) => ({ label: `${u.name} (${u.email})`, value: u.id })))
    } catch {
      setActorOptions([])
    } finally {
      setActorLoading(false)
    }
  }, [])
```

- [ ] **Step 6: Replace the Input JSX with MultiSelect**

Find the actor filter block (around lines 307–314):

```tsx
          <div className="w-52">
            <Input
              label="Actor ID"
              value={actorId}
              onChange={(e) => setActorId(e.target.value)}
              placeholder="Filter by user ID"
            />
          </div>
```

Replace with:

```tsx
          <div className="w-52">
            <MultiSelect
              label="Actor"
              value={actorId ? [actorId] : []}
              options={actorOptions}
              onChange={(e) => setActorId(e.value?.[0] ?? null)}
              onFilter={(e) => handleActorSearch(e.filter)}
              loading={actorLoading}
              placeholder="Filter by actor"
              filterPlaceholder="Search by name or email"
              singleValue
            />
          </div>
```

- [ ] **Step 7: Remove unused `Input` import if no longer used**

Check if `Input` is used elsewhere in `ActivityEventsPage.tsx`. If the `Input` import is the only usage and it is now removed, delete the import line:

```tsx
import Input from '@/components/form/Input/Input'
```

Run a quick search in the file — if `Input` appears elsewhere, leave the import. If not, remove it.

- [ ] **Step 8: Run the unit test to verify it passes**

```bash
npx vitest run src/pages/settings/administration/__tests__/ActivityEventsPage.test.tsx --reporter=verbose
```

Expected: PASS — "Actor ID" text is gone, "Actor" label is present.

- [ ] **Step 9: Run TypeScript type-check to catch type errors**

```bash
npx tsc --noEmit
```

Expected: No errors. If type errors appear, the most likely cause is `e.value?.[0]` — PrimeReact's `MultiSelectChangeEvent.value` is typed as `any`, so this should be fine. Also verify `actorId: string | null` is compatible with `actor_id: actorId || null` in `loadEvents`.

- [ ] **Step 10: Commit**

```bash
git add src/pages/settings/administration/ActivityEventsPage.tsx
git add src/pages/settings/administration/__tests__/ActivityEventsPage.test.tsx
git commit -m "EPMCDME-14079: Replace Actor ID input with server-search MultiSelect"
```

---

### Task 2: Add integration test for actor filter search-and-resolve flow

**Test-first: yes — integration test written before verifying the full flow end-to-end**

**Files:**
- Create: `src/pages/settings/administration/__tests__/ActivityEventsActorFilter.integration.test.tsx`

**Interfaces:**
- Consumes: `mockAPI`, `renderPage` from `@/test-utils/integration`
- Consumes: `requestRegistry` from `@/test-utils/_mock-state`
- Consumes: `screen`, `waitFor` from `@testing-library/react`
- Consumes: `userEvent` from `@testing-library/user-event`
- Consumes: `selectMultiSelectOptions`, `getMultiSelect`, `openMultiSelectDropdown`, `findMultiSelectOption` from `@/test-utils/component-interactions/multi-select`
- Consumes: `useUserManagementEnabled` mock pattern from `AdminTablesPagination.integration.test.tsx`

---

- [ ] **Step 1: Write the failing integration test file**

Create `src/pages/settings/administration/__tests__/ActivityEventsActorFilter.integration.test.tsx` with the full license header (copy from `ActivityEventsPage.test.tsx`) and this content:

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

import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, beforeEach, vi } from 'vitest'

import { requestRegistry } from '@/test-utils/_mock-state'
import { mockAPI, renderPage } from '@/test-utils/integration'
import {
  getMultiSelect,
  openMultiSelectDropdown,
  findMultiSelectOption,
} from '@/test-utils/component-interactions/multi-select'

vi.mock('@/hooks/useFeatureFlags', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/hooks/useFeatureFlags')>()
  return {
    ...actual,
    useMcpEnabled: (): [boolean, boolean] => [true, true],
    useUserManagementEnabled: vi.fn((): [boolean, boolean] => [true, true]),
  }
})

const maintainerUser = {
  user_id: 'maintainer-1',
  id: 'maintainer-1',
  email: 'maintainer@test.com',
  name: 'Maintainer User',
  username: 'maintainer',
  is_admin: true,
  is_maintainer: true,
  user_type: 'INTERNAL',
  applications: [],
}

const emptyEventsResponse = {
  data: [],
  pagination: { page: 0, per_page: 50, total: 0 },
}

const emptyFilterOptions = {
  domains: [],
  event_types: [],
  entity_types: [],
  mapping: {},
}

function setupPage() {
  requestRegistry.set('GET:v1/user', {
    factory: () =>
      new Response(JSON.stringify(maintainerUser), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
  })
  mockAPI('GET', 'v1/admin/activity-events/filter-options', emptyFilterOptions)
  mockAPI('GET', 'v1/admin/activity-events', emptyEventsResponse)
}

describe('ActivityEventsPage — actor filter search', () => {
  beforeEach(() => {
    setupPage()
  })

  it('searches users by name and passes resolved actor_id to events query', async () => {
    const user = userEvent.setup()

    // Mock user search: searching "john" returns one user
    mockAPI('GET', 'v1/admin/users', {
      data: [
        {
          id: 'uuid-actor-1',
          user_id: 'uuid-actor-1',
          name: 'John Doe',
          email: 'john@example.com',
          username: 'johndoe',
          is_admin: false,
          is_maintainer: false,
          user_type: 'INTERNAL',
          applications: [],
          projects: [],
          budget_assignments: [],
        },
      ],
      pagination: { page: 0, per_page: 10, total: 1 },
    }, { search: 'john', per_page: '10' })

    // Mock events call with actor_id resolved
    let actorIdReceived: string | null = null
    requestRegistry.set('GET:v1/admin/activity-events', {
      factory: () => {
        return new Response(JSON.stringify(emptyEventsResponse), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      },
    })

    renderPage('/settings/administration/activity-events')

    // Wait for page to render with "Actor" label
    const actorMultiSelect = await getMultiSelect('Actor')
    expect(actorMultiSelect).toBeInTheDocument()

    // Open the MultiSelect dropdown
    await openMultiSelectDropdown(actorMultiSelect, user)

    // Type "john" into the filter input inside the dropdown panel
    const filterInput = document.querySelector('.p-multiselect-filter') as HTMLInputElement
    expect(filterInput).not.toBeNull()
    await user.type(filterInput, 'john')

    // Wait for the option to appear after the async search resolves
    const option = await findMultiSelectOption('John Doe (john@example.com)')
    expect(option).toBeInTheDocument()

    // Click the option to select it
    await user.click(option)

    // After selection the events endpoint should be called with actor_id=uuid-actor-1
    await waitFor(() => {
      const calls = (global.fetch as ReturnType<typeof vi.fn>).mock.calls
      const activityCall = calls.find((args: unknown[]) => {
        const url = String(args[0] instanceof Request ? args[0].url : args[0])
        return url.includes('v1/admin/activity-events') && url.includes('actor_id=uuid-actor-1')
      })
      expect(activityCall).toBeDefined()
    })
  })

  it('clears actor_id when Clear filters is clicked', async () => {
    const user = userEvent.setup()

    mockAPI('GET', 'v1/admin/users', {
      data: [
        {
          id: 'uuid-actor-2',
          user_id: 'uuid-actor-2',
          name: 'Jane Smith',
          email: 'jane@example.com',
          username: 'janesmith',
          is_admin: false,
          is_maintainer: false,
          user_type: 'INTERNAL',
          applications: [],
          projects: [],
          budget_assignments: [],
        },
      ],
      pagination: { page: 0, per_page: 10, total: 1 },
    }, { search: 'jane', per_page: '10' })

    renderPage('/settings/administration/activity-events')

    const actorMultiSelect = await getMultiSelect('Actor')
    await openMultiSelectDropdown(actorMultiSelect, user)

    const filterInput = document.querySelector('.p-multiselect-filter') as HTMLInputElement
    await user.type(filterInput, 'jane')

    const option = await findMultiSelectOption('Jane Smith (jane@example.com)')
    await user.click(option)

    // "Clear filters" button should now be visible
    const clearButton = await waitFor(() => screen.getByRole('button', { name: /clear filters/i }))
    await user.click(clearButton)

    // After clearing, next events call should not include actor_id
    await waitFor(() => {
      const calls = (global.fetch as ReturnType<typeof vi.fn>).mock.calls
      const lastActivityCall = [...calls]
        .reverse()
        .find((args: unknown[]) => {
          const url = String(args[0] instanceof Request ? args[0].url : args[0])
          return url.includes('v1/admin/activity-events') && !url.includes('/filter-options')
        })
      expect(lastActivityCall).toBeDefined()
      const lastUrl = String(
        lastActivityCall![0] instanceof Request ? lastActivityCall![0].url : lastActivityCall![0]
      )
      expect(lastUrl).not.toContain('actor_id')
    })
  })
})
```

- [ ] **Step 2: Run the integration test to verify it fails (for the right reason)**

```bash
npx vitest run src/pages/settings/administration/__tests__/ActivityEventsActorFilter.integration.test.tsx --reporter=verbose
```

Since Task 1 is already complete, this test should now pass. If it fails, the most likely causes are:
- PrimeReact MultiSelect's filter input uses a different selector than `.p-multiselect-filter` — inspect the DOM output to find the correct selector
- The `onFilter` event fires with `e.filter` containing the typed string — verify by adding a `console.log` to `handleActorSearch` temporarily

- [ ] **Step 3: Run the full test suite for the administration page directory**

```bash
npx vitest run src/pages/settings/administration --reporter=verbose
```

Expected: All existing tests pass plus the two new integration tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/pages/settings/administration/__tests__/ActivityEventsActorFilter.integration.test.tsx
git commit -m "EPMCDME-14079: Add integration tests for actor filter search and clear"
```
