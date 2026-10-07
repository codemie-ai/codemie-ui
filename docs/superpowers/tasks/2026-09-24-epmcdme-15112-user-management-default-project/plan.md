# EPMCDME-15112 Default Project in User Management UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let platform administrators and maintainers assign and see a user's default project in User Management — the details projects table, the add-project dialog, and the users list — using EPMCDME-15110's already-live backend endpoints.

**Architecture:** Extend three existing, already-working UI surfaces (users-list Projects-cell badge, details-panel projects table, add-project dialog) plus one type and two new Valtio store methods that mirror the exact existing CRUD pattern. No new files except tests; no new abstractions.

**Tech Stack:** React 18, TypeScript 5, Vite 5, Valtio, Vitest + React Testing Library (unit + integration projects).

**Spec:** `docs/superpowers/tasks/2026-09-24-epmcdme-15112-user-management-default-project/spec.md`

## Global Constraints

- No backend changes — `PUT/DELETE v1/admin/users/{user_id}/projects/{project_name}/default` are already live (EPMCDME-15110), and `is_default` already arrives in every `GET /v1/admin/users` / `GET /v1/admin/users/{id}` response.
- No new "Default project" column in the users list — the marker goes inside the existing Projects cell (`DetailsBadge`'s `icon` slot).
- Tab-visibility gating (`isAdmin || isMaintainer || isAuditor` in `pages/settings/tabs.tsx`) is untouched — AC5's read-only case is the auditor role, covered by disabling (not hiding) the default-toggle control.
- Formatting is automatic (prettier + eslint --fix run via a PostToolUse hook after editing files under `src/`) — do not manually re-run lint/format.

---

### Task 1: Type field and store methods

**Files:**
- Modify: `src/types/entity/user.ts:18-22` (`UserAssignedProject`)
- Modify: `src/store/user.ts:93-103` (`UserStoreType` interface), `src/store/user.ts:562-575` (add new methods after `removeUserProjectAccess`)
- Test: `src/store/__tests__/user.test.ts`

**Interfaces:**
- Produces: `UserAssignedProject.is_default?: boolean`. `userStore.setDefaultProject(userId: string, projectName: string): Promise<void>`. `userStore.clearDefaultProject(userId: string, projectName: string): Promise<void>`.

Test-first: yes — failing test asserting `setDefaultProject` PUTs the correct URL and resolves.

- [ ] **Step 1: Write the failing tests**

Add to `src/store/__tests__/user.test.ts` (new `describe` block, following this file's existing `mockPut`/`mockDelete` pattern from its top-level mocks):

```ts
describe('setDefaultProject', () => {
  it('PUTs the default endpoint and resolves on success', async () => {
    const { userStore } = await import('@/store/user')
    mockPut.mockResolvedValue({ json: async () => ({ success: true }) })

    await userStore.setDefaultProject('user-1', 'proj-a')

    expect(mockPut).toHaveBeenCalledWith(
      'v1/admin/users/user-1/projects/proj-a/default',
      undefined,
      { skipErrorHandling: true }
    )
  })

  it('encodes the project name in the URL', async () => {
    const { userStore } = await import('@/store/user')
    mockPut.mockResolvedValue({ json: async () => ({ success: true }) })

    await userStore.setDefaultProject('user-1', 'proj a/b')

    expect(mockPut).toHaveBeenCalledWith(
      'v1/admin/users/user-1/projects/proj%20a%2Fb/default',
      undefined,
      { skipErrorHandling: true }
    )
  })

  it('rethrows on failure', async () => {
    const { userStore } = await import('@/store/user')
    mockPut.mockRejectedValue(new Error('boom'))

    await expect(userStore.setDefaultProject('user-1', 'proj-a')).rejects.toThrow('boom')
  })
})

describe('clearDefaultProject', () => {
  it('DELETEs the default endpoint and resolves on success', async () => {
    const { userStore } = await import('@/store/user')
    mockDelete.mockResolvedValue({ json: async () => ({ success: true }) })

    await userStore.clearDefaultProject('user-1', 'proj-a')

    expect(mockDelete).toHaveBeenCalledWith('v1/admin/users/user-1/projects/proj-a/default', undefined, {
      skipErrorHandling: true,
    })
  })

  it('rethrows on failure', async () => {
    const { userStore } = await import('@/store/user')
    mockDelete.mockRejectedValue(new Error('boom'))

    await expect(userStore.clearDefaultProject('user-1', 'proj-a')).rejects.toThrow('boom')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run --project unit src/store/__tests__/user.test.ts -t "setDefaultProject|clearDefaultProject"`
Expected: FAIL — `userStore.setDefaultProject is not a function` / `userStore.clearDefaultProject is not a function`.

- [ ] **Step 3: Implement**

In `src/types/entity/user.ts`, modify `UserAssignedProject`:

```ts
export interface UserAssignedProject {
  name: string
  display_name?: string | null
  is_project_admin: boolean
  is_default?: boolean
}
```

In `src/store/user.ts`, add to the `UserStoreType` interface (after `removeUserProjectAccess`, line 103):

```ts
  removeUserProjectAccess: (userId: string, projectName: string) => Promise<void>
  setDefaultProject: (userId: string, projectName: string) => Promise<void>
  clearDefaultProject: (userId: string, projectName: string) => Promise<void>
```

Add the implementations immediately after `removeUserProjectAccess` (after line 575, before `async bulkUpdateUsers`):

```ts
  setDefaultProject(userId, projectName) {
    return api
      .put(`v1/admin/users/${userId}/projects/${encodeURIComponent(projectName)}/default`, undefined, {
        skipErrorHandling: true,
      })
      .then((response) => response.json())
      .then(() => {
        toaster.info('Default project set successfully')
      })
      .catch((error) => {
        toaster.error(error?.parsedError?.message || 'Failed to set default project')
        throw error
      })
  },

  clearDefaultProject(userId, projectName) {
    return api
      .delete(`v1/admin/users/${userId}/projects/${encodeURIComponent(projectName)}/default`, undefined, {
        skipErrorHandling: true,
      })
      .then((response) => response.json())
      .then(() => {
        toaster.info('Default project cleared successfully')
      })
      .catch((error) => {
        toaster.error(error?.parsedError?.message || 'Failed to clear default project')
        throw error
      })
  },
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run --project unit src/store/__tests__/user.test.ts`
Expected: PASS — full file, including the 5 new tests and every pre-existing test in it.

- [ ] **Step 5: Commit**

```bash
git add src/types/entity/user.ts src/store/user.ts src/store/__tests__/user.test.ts
git commit -m "EPMCDME-15112: Add is_default type field and setDefaultProject/clearDefaultProject store methods"
```

---

### Task 2: Widen the projects-management permission gate

**Files:**
- Modify: `src/pages/settings/administration/usersManagement/components/popups/UserDetailsPopup.tsx:324`
- Test: `src/pages/settings/administration/usersManagement/components/popups/__tests__/UserDetailsPopup.projectsGate.test.tsx` (new file)

**Interfaces:**
- Consumes: nothing new. Produces: `UserProjectsTable` now receives `canManageProjects={isAdmin || isMaintainer}` instead of `canManageProjects={isAdmin}`.

Test-first: yes — failing test asserting a maintainer (non-admin) viewer gets `canManageProjects=true`.

- [ ] **Step 1: Write the failing test**

Create `src/pages/settings/administration/usersManagement/components/popups/__tests__/UserDetailsPopup.projectsGate.test.tsx`:

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

import { render, screen, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import { UserListItem } from '@/types/entity/user'

import UserDetailsPopup from '../UserDetailsPopup'

const { mockUserStore } = vi.hoisted(() => ({
  mockUserStore: {
    user: null as any,
    getUserById: vi.fn(),
    getUserBudgets: vi.fn(),
    updateUser: vi.fn(),
    updateUserBudgets: vi.fn(),
  },
}))

vi.mock('@/store/user', () => ({ userStore: mockUserStore }))

vi.mock('valtio', async (importOriginal) => {
  const actual = await importOriginal<typeof import('valtio')>()
  return { ...actual, useSnapshot: (store: any) => store }
})

vi.mock('@/hooks/useFeatureFlags', () => ({
  useBudgetManagementEnabled: () => [true, true],
}))

vi.mock('@/components/Popup', () => ({
  default: ({ visible, children }: any) =>
    visible ? <div data-testid="popup">{children}</div> : null,
}))
vi.mock('@/components/Spinner', () => ({ default: () => <div data-testid="spinner" /> }))
vi.mock('@/components/form/Switch', () => ({ default: () => null }))
vi.mock('@/components/Button', () => ({ default: ({ children }: any) => <button>{children}</button> }))
vi.mock('@/components/Tooltip', () => ({ default: () => null }))
vi.mock('@/components/details/DetailsCopyField', () => ({ default: () => null }))
vi.mock('@/components/details/DetailsProperty', () => ({ default: () => null }))
vi.mock('@/components/form/Select/Select', () => ({ default: () => null }))
vi.mock('@/pages/settings/components/SpendingCard', () => ({ default: () => null }))
vi.mock('@/pages/settings/administration/components/BudgetAssignmentsEditor', () => ({
  default: () => null,
}))
vi.mock('@/pages/settings/administration/usersManagement/components/UserAvatar', () => ({
  default: () => null,
}))

const canManageProjectsSpy = vi.fn()
vi.mock('@/pages/settings/administration/usersManagement/components/UserProjectsTable', () => ({
  default: (props: any) => {
    canManageProjectsSpy(props.canManageProjects)
    return null
  },
}))

const makeUser = (overrides: Partial<UserListItem> = {}): UserListItem => ({
  id: 'target-1',
  name: 'Target User',
  username: 'target',
  email: 'target@example.com',
  is_admin: false,
  is_maintainer: false,
  is_auditor: false,
  is_active: true,
  user_type: 'regular',
  auth_source: 'internal',
  last_login_at: null,
  projects: [],
  picture: null,
  date: null,
  ...overrides,
})

const renderPopup = (userId = 'target-1') =>
  render(<UserDetailsPopup userId={userId} isOpen onClose={vi.fn()} />)

const waitForContent = () =>
  waitFor(() => expect(screen.queryByTestId('spinner')).not.toBeInTheDocument())

describe('UserDetailsPopup — projects management gate (EPMCDME-15112)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUserStore.getUserBudgets.mockResolvedValue([])
  })

  it('canManageProjects is true for an admin viewer', async () => {
    mockUserStore.user = { userId: 'viewer-1', isAdmin: true, isMaintainer: false, isAuditor: false }
    mockUserStore.getUserById.mockResolvedValue(makeUser())

    renderPopup()
    await waitForContent()

    expect(canManageProjectsSpy).toHaveBeenCalledWith(true)
  })

  it('canManageProjects is true for a maintainer (non-admin) viewer', async () => {
    mockUserStore.user = { userId: 'viewer-1', isAdmin: false, isMaintainer: true, isAuditor: false }
    mockUserStore.getUserById.mockResolvedValue(makeUser())

    renderPopup()
    await waitForContent()

    expect(canManageProjectsSpy).toHaveBeenCalledWith(true)
  })

  it('canManageProjects is false for an auditor-only viewer', async () => {
    mockUserStore.user = { userId: 'viewer-1', isAdmin: false, isMaintainer: false, isAuditor: true }
    mockUserStore.getUserById.mockResolvedValue(makeUser())

    renderPopup()
    await waitForContent()

    expect(canManageProjectsSpy).toHaveBeenCalledWith(false)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run --project unit src/pages/settings/administration/usersManagement/components/popups/__tests__/UserDetailsPopup.projectsGate.test.tsx`
Expected: FAIL on "canManageProjects is true for a maintainer (non-admin) viewer" — currently receives `false` (gate is `isAdmin` alone).

- [ ] **Step 3: Implement**

In `src/pages/settings/administration/usersManagement/components/popups/UserDetailsPopup.tsx`, change line 324:

```tsx
            <UserProjectsTable
              user={user}
              onProjectsChange={handleProjectsChange}
              canManageProjects={isAdmin || isMaintainer}
            />
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run --project unit src/pages/settings/administration/usersManagement/components/popups/__tests__/UserDetailsPopup.projectsGate.test.tsx src/pages/settings/administration/usersManagement/components/popups/__tests__/UserDetailsPopup.auditor.test.tsx`
Expected: PASS — both files (the pre-existing auditor test file is unaffected since it stubs `UserProjectsTable` to `() => null` and never inspects its props).

- [ ] **Step 5: Commit**

```bash
git add src/pages/settings/administration/usersManagement/components/popups/UserDetailsPopup.tsx src/pages/settings/administration/usersManagement/components/popups/__tests__/UserDetailsPopup.projectsGate.test.tsx
git commit -m "EPMCDME-15112: Widen projects-management gate to admin-or-maintainer, matching backend"
```

---

### Task 3: Default marker in the users-list Projects cell

**Files:**
- Modify: `src/pages/settings/administration/UsersManagementPage.tsx:16-42` (imports), `:287-306` (`customRenderColumns.projects`)
- Test: `src/pages/settings/administration/__tests__/UsersManagementDefaultProject.integration.test.tsx` (new file)

**Interfaces:**
- Consumes: `UserAssignedProject.is_default` (Task 1).
- Produces: no new symbols — the `projects` cell renderer's `BadgeItem[]` now includes an `icon` on the default project's entry.

Test-first: yes — failing integration test asserting the default project's badge renders a marker icon and non-default ones don't.

- [ ] **Step 1: Write the failing test**

Create `src/pages/settings/administration/__tests__/UsersManagementDefaultProject.integration.test.tsx`:

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

import { screen } from '@testing-library/react'
import { describe, it, expect, beforeEach, vi } from 'vitest'

// eslint-disable-next-line import/order
import { mockAPI, renderPage } from '@/test-utils/integration'
import { appInfoStore } from '@/store/appInfo'

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
  projects: [],
}

const janeUser = {
  id: 'jane-1',
  name: 'Jane Doe',
  username: 'jane',
  email: 'jane@epam.com',
  is_admin: false,
  user_type: 'INTERNAL',
  applications: [],
  projects: [
    { name: 'project-a', is_project_admin: false, is_default: true },
    { name: 'project-b', is_project_admin: false, is_default: false },
  ],
}

const usersResponse = (data: unknown[]) => ({
  data,
  pagination: { page: 0, per_page: 10, total: data.length },
})

describe('UsersManagementPage — default project marker (EPMCDME-15112)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    appInfoStore.configs = [] as never
    appInfoStore.isConfigFetched = true
    mockAPI('GET', 'v1/user', maintainerUser)
    mockAPI('GET', 'v1/admin/users', usersResponse([janeUser]))
  })

  it('renders a marker icon on the default project and not on the non-default one', async () => {
    renderPage('/settings/administration/users')

    await screen.findByText('project-a (user)')

    const defaultBadge = screen.getByText('project-a (user)').closest('a, div')
    const nonDefaultBadge = screen.getByText('project-b (user)').closest('a, div')

    expect(defaultBadge?.querySelector('svg')).not.toBeNull()
    expect(nonDefaultBadge?.querySelector('svg')).toBeNull()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run --project integration src/pages/settings/administration/__tests__/UsersManagementDefaultProject.integration.test.tsx`
Expected: FAIL — `defaultBadge?.querySelector('svg')` is `null` (no icon wired yet).

- [ ] **Step 3: Implement**

In `src/pages/settings/administration/UsersManagementPage.tsx`, add the import near the other icon imports (after line 22, alongside `RefreshSvg`):

```tsx
import StarFilledSvg from '@/assets/icons/star-filled.svg?react'
```

Replace the `projects` renderer (lines 287-294):

```tsx
      projects: (item: UserListItem) => {
        const projectNames: BadgeItem[] = item.projects.map((p) => ({
          value: `${p.name} (${p.is_project_admin ? 'admin' : 'user'})`,
          href: router.resolve({
            name: PROJECTS_MANAGEMENT_DETAIL,
            params: { projectName: p.name },
          }).fullPath,
          icon: p.is_default ? (
            <StarFilledSvg className="w-[14px] h-[14px] text-text-accent" aria-hidden="true" />
          ) : undefined,
        }))
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run --project integration src/pages/settings/administration/__tests__/UsersManagementDefaultProject.integration.test.tsx src/pages/settings/administration/__tests__/UsersManagementSpending.integration.test.tsx`
Expected: PASS — both files (the pre-existing spending test's fixtures have no `is_default` field, which is fine since it's optional and defaults to falsy).

- [ ] **Step 5: Commit**

```bash
git add src/pages/settings/administration/UsersManagementPage.tsx src/pages/settings/administration/__tests__/UsersManagementDefaultProject.integration.test.tsx
git commit -m "EPMCDME-15112: Mark the default project in the users-list Projects cell"
```

---

### Task 4: Default toggle in the user-details projects table

**Files:**
- Modify: `src/pages/settings/administration/usersManagement/components/UserProjectsTable.tsx`
- Test: `src/pages/settings/administration/usersManagement/components/__tests__/UserProjectsTable.test.tsx` (new file)

**Interfaces:**
- Consumes: `UserAssignedProject.is_default` (Task 1), `userStore.setDefaultProject` (Task 1).
- Produces: no new exported symbols — `UserProjectsTable` renders a new "Default" column; internal `handleSetDefault(projectName: string): Promise<void>` callback (not exported, used only within this component and referenced by Task 6).

Test-first: yes — failing test asserting clicking a non-default row's toggle calls `setDefaultProject` and flips both rows' markers.

- [ ] **Step 1: Write the failing tests**

Create `src/pages/settings/administration/usersManagement/components/__tests__/UserProjectsTable.test.tsx`:

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

import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import { UserListItem } from '@/types/entity/user'

import UserProjectsTable from '../UserProjectsTable'

const { mockUserStore } = vi.hoisted(() => ({
  mockUserStore: {
    addUserProjectAccess: vi.fn(),
    updateUserProjectAccess: vi.fn(),
    removeUserProjectAccess: vi.fn(),
    setDefaultProject: vi.fn(),
    clearDefaultProject: vi.fn(),
  },
}))
vi.mock('@/store/user', () => ({ userStore: mockUserStore }))

vi.mock('./popups/AddProjectPopup', () => ({ default: () => null }))

const makeUser = (projects: UserListItem['projects']): UserListItem => ({
  id: 'target-1',
  name: 'Target User',
  username: 'target',
  email: 'target@example.com',
  is_admin: false,
  is_active: true,
  user_type: 'regular',
  auth_source: 'internal',
  last_login_at: null,
  projects,
  picture: null,
  date: null,
})

describe('UserProjectsTable — default project toggle (EPMCDME-15112)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders a default marker on the project that is currently default', () => {
    const user = makeUser([
      { name: 'proj-a', is_project_admin: false, is_default: true },
      { name: 'proj-b', is_project_admin: false, is_default: false },
    ])

    render(<UserProjectsTable user={user} canManageProjects />)

    const rowA = screen.getByText('proj-a').closest('tr')
    const rowB = screen.getByText('proj-b').closest('tr')
    expect(rowA?.querySelector('[data-testid="default-toggle"][aria-pressed="true"]')).not.toBeNull()
    expect(rowB?.querySelector('[data-testid="default-toggle"][aria-pressed="false"]')).not.toBeNull()
  })

  it('clicking a non-default row sets it as default and unsets the previous one', async () => {
    mockUserStore.setDefaultProject.mockResolvedValue(undefined)
    const user = makeUser([
      { name: 'proj-a', is_project_admin: false, is_default: true },
      { name: 'proj-b', is_project_admin: false, is_default: false },
    ])

    render(<UserProjectsTable user={user} canManageProjects />)

    const rowB = screen.getByText('proj-b').closest('tr') as HTMLElement
    fireEvent.click(rowB.querySelector('[data-testid="default-toggle"]') as HTMLElement)

    await waitFor(() => expect(mockUserStore.setDefaultProject).toHaveBeenCalledWith('target-1', 'proj-b'))

    const rowA = screen.getByText('proj-a').closest('tr')
    expect(rowA?.querySelector('[data-testid="default-toggle"][aria-pressed="false"]')).not.toBeNull()
    expect(rowB.querySelector('[data-testid="default-toggle"][aria-pressed="true"]')).not.toBeNull()
  })

  it('rolls back both rows if the API call fails', async () => {
    mockUserStore.setDefaultProject.mockRejectedValue(new Error('boom'))
    const user = makeUser([
      { name: 'proj-a', is_project_admin: false, is_default: true },
      { name: 'proj-b', is_project_admin: false, is_default: false },
    ])

    render(<UserProjectsTable user={user} canManageProjects />)

    const rowB = screen.getByText('proj-b').closest('tr') as HTMLElement
    fireEvent.click(rowB.querySelector('[data-testid="default-toggle"]') as HTMLElement)

    await waitFor(() => expect(mockUserStore.setDefaultProject).toHaveBeenCalled())

    const rowA = screen.getByText('proj-a').closest('tr')
    expect(rowA?.querySelector('[data-testid="default-toggle"][aria-pressed="true"]')).not.toBeNull()
    expect(rowB.querySelector('[data-testid="default-toggle"][aria-pressed="false"]')).not.toBeNull()
  })

  it('disables the toggle when canManageProjects is false', () => {
    const user = makeUser([{ name: 'proj-a', is_project_admin: false, is_default: false }])

    render(<UserProjectsTable user={user} canManageProjects={false} />)

    const toggle = screen.getByTestId('default-toggle')
    expect(toggle).toBeDisabled()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run --project unit src/pages/settings/administration/usersManagement/components/__tests__/UserProjectsTable.test.tsx`
Expected: FAIL — no "Default" column/`data-testid="default-toggle"` exists yet.

- [ ] **Step 3: Implement**

In `src/pages/settings/administration/usersManagement/components/UserProjectsTable.tsx`:

Add a column definition (after `project`, before `admin`, in `columnDefinitions`, line ~45):

```ts
  {
    key: 'default',
    label: 'Default',
    type: DefinitionTypes.Custom,
    headClassNames: 'w-[15%]',
  },
```

Add a `handleSetDefault` callback (after `confirmRemoveProject`, before `handleAddProject` — it must be declared before `handleAddProject` since Task 6 will reference it from inside `handleAddProject`'s dependency array, and a `const` declared later would be a temporal-dead-zone error):

```ts
  const handleSetDefault = useCallback(
    async (projectName: string) => {
      try {
        await setProjects(
          (projects) => projects.map((p) => ({ ...p, is_default: p.name === projectName })),
          () => userStore.setDefaultProject(user.id, projectName)
        )
        toaster.info('Default project updated')
        onProjectsChange?.()
      } catch (error) {
        console.error('Failed to set default project:', error)
      }
    },
    [user.id, setProjects, onProjectsChange]
  )
```

Add a `default` entry to `customRenderColumns` (after `project`, before `admin`):

```tsx
      default: (item: UserAssignedProject) => (
        <button
          type="button"
          data-testid="default-toggle"
          aria-pressed={!!item.is_default}
          disabled={!canManageProjects || !!item.is_default}
          onClick={(e) => {
            e.stopPropagation()
            handleSetDefault(item.name)
          }}
          className="disabled:cursor-default"
        >
          {item.is_default ? (
            <StarFilledSvg className="w-[16px] h-[16px] text-text-accent" aria-hidden="true" />
          ) : (
            <StarOutlineSvg
              className="w-[16px] h-[16px] text-text-quaternary"
              aria-hidden="true"
            />
          )}
        </button>
      ),
```

Add the two icon imports near the top (after the existing `Button`/component imports):

```ts
import StarFilledSvg from '@/assets/icons/star-filled.svg?react'
import StarOutlineSvg from '@/assets/icons/star-outline.svg?react'
```

Add `handleSetDefault` to the `customRenderColumns` `useMemo` dependency array (line 223): `[handleRoleChange, handleRemoveProject, handleSetDefault, canManageProjects]`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run --project unit src/pages/settings/administration/usersManagement/components/__tests__/UserProjectsTable.test.tsx`
Expected: PASS — all 4 tests.

- [ ] **Step 5: Commit**

```bash
git add src/pages/settings/administration/usersManagement/components/UserProjectsTable.tsx src/pages/settings/administration/usersManagement/components/__tests__/UserProjectsTable.test.tsx
git commit -m "EPMCDME-15112: Add default-project toggle to the user details projects table"
```

---

### Task 5: "Set as default" switch in the Add Project dialog

**Files:**
- Modify: `src/pages/settings/administration/usersManagement/components/popups/AddProjectPopup.tsx`
- Test: `src/pages/settings/administration/usersManagement/components/popups/__tests__/AddProjectPopup.test.tsx` (new file)

**Interfaces:**
- Produces: `AddProjectPopup`'s `onAdd` prop widens from `(projectName: string) => void` to `(projectName: string, setAsDefault: boolean) => void`. Task 6 consumes this new second argument.

Test-first: yes — failing test asserting `onAdd` is called with `true` when the switch is checked before submit.

- [ ] **Step 1: Write the failing tests**

Create `src/pages/settings/administration/usersManagement/components/popups/__tests__/AddProjectPopup.test.tsx`:

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

import { fireEvent, render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import AddProjectPopup from '../AddProjectPopup'

vi.mock('@/components/Popup', () => ({
  default: ({ visible, children, onSubmit, submitDisabled }: any) =>
    visible ? (
      <div data-testid="popup">
        {children}
        <button onClick={onSubmit} disabled={submitDisabled}>
          Add
        </button>
      </div>
    ) : null,
}))

vi.mock('@/components/form/Switch', () => ({
  default: ({ id, label, value, onChange, disabled }: any) => (
    <label>
      {label}
      <input
        type="checkbox"
        checked={!!value}
        disabled={!!disabled}
        onChange={(e) => onChange({ target: { checked: e.target.checked } })}
        data-testid={`switch-${id}`}
      />
    </label>
  ),
}))

vi.mock('@/components/ProjectSelector/ProjectSelector', () => ({
  default: ({ value, onChange }: any) => (
    <select
      data-testid="project-selector"
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="">Select</option>
      <option value="proj-a">proj-a</option>
    </select>
  ),
}))

describe('AddProjectPopup — set as default (EPMCDME-15112)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls onAdd with setAsDefault=false when the switch is left off', () => {
    const onAdd = vi.fn()
    render(<AddProjectPopup isOpen onClose={vi.fn()} onAdd={onAdd} />)

    fireEvent.change(screen.getByTestId('project-selector'), { target: { value: 'proj-a' } })
    fireEvent.click(screen.getByText('Add'))

    expect(onAdd).toHaveBeenCalledWith('proj-a', false)
  })

  it('calls onAdd with setAsDefault=true when the switch is turned on', () => {
    const onAdd = vi.fn()
    render(<AddProjectPopup isOpen onClose={vi.fn()} onAdd={onAdd} />)

    fireEvent.change(screen.getByTestId('project-selector'), { target: { value: 'proj-a' } })
    fireEvent.click(screen.getByTestId('switch-add-project-set-default'))
    fireEvent.click(screen.getByText('Add'))

    expect(onAdd).toHaveBeenCalledWith('proj-a', true)
  })

  it('resets the switch after close', () => {
    const onAdd = vi.fn()
    const { rerender } = render(<AddProjectPopup isOpen onClose={vi.fn()} onAdd={onAdd} />)

    fireEvent.click(screen.getByTestId('switch-add-project-set-default'))
    expect(screen.getByTestId('switch-add-project-set-default')).toBeChecked()

    rerender(<AddProjectPopup isOpen={false} onClose={vi.fn()} onAdd={onAdd} />)
    rerender(<AddProjectPopup isOpen onClose={vi.fn()} onAdd={onAdd} />)

    expect(screen.getByTestId('switch-add-project-set-default')).not.toBeChecked()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run --project unit src/pages/settings/administration/usersManagement/components/popups/__tests__/AddProjectPopup.test.tsx`
Expected: FAIL — `onAdd` is currently called with one argument only, and no `switch-add-project-set-default` test id exists.

- [ ] **Step 3: Implement**

In `src/pages/settings/administration/usersManagement/components/popups/AddProjectPopup.tsx`:

```tsx
import { FC, useState } from 'react'

import Popup from '@/components/Popup'
import Switch from '@/components/form/Switch'
import ProjectSelector from '@/components/ProjectSelector/ProjectSelector'

interface AddProjectPopupProps {
  isOpen: boolean
  onClose: () => void
  onAdd: (projectName: string, setAsDefault: boolean) => void
}

const AddProjectPopup: FC<AddProjectPopupProps> = ({ isOpen, onClose, onAdd }) => {
  const [selectedProject, setSelectedProject] = useState<string>('')
  const [setAsDefault, setSetAsDefault] = useState(false)

  const handleSubmit = () => {
    if (selectedProject) {
      onAdd(selectedProject, setAsDefault)
      setSelectedProject('')
      setSetAsDefault(false)
      onClose()
    }
  }

  const handleClose = () => {
    setSelectedProject('')
    setSetAsDefault(false)
    onClose()
  }

  return (
    <Popup
      withBorderBottom={false}
      visible={isOpen}
      header="Add Project"
      className="w-[500px]"
      onHide={handleClose}
      onSubmit={handleSubmit}
      submitText="Add"
      submitDisabled={!selectedProject}
    >
      <div className="px-4 py-2 flex flex-col gap-3">
        <ProjectSelector
          value={selectedProject}
          onChange={(value) => setSelectedProject(value as string)}
          multiple={false}
          fullWidth
        />
        <Switch
          id="add-project-set-default"
          label="Set as default"
          value={setAsDefault}
          onChange={(e) => setSetAsDefault(e.target.checked)}
        />
      </div>
    </Popup>
  )
}

export default AddProjectPopup
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run --project unit src/pages/settings/administration/usersManagement/components/popups/__tests__/AddProjectPopup.test.tsx`
Expected: PASS — all 3 tests.

- [ ] **Step 5: Commit**

```bash
git add src/pages/settings/administration/usersManagement/components/popups/AddProjectPopup.tsx src/pages/settings/administration/usersManagement/components/popups/__tests__/AddProjectPopup.test.tsx
git commit -m "EPMCDME-15112: Add a 'set as default' switch to the Add Project dialog"
```

---

### Task 6: Wire the add-dialog default flag through to the store

**Files:**
- Modify: `src/pages/settings/administration/usersManagement/components/UserProjectsTable.tsx` (`handleAddProject`, `AddProjectPopup` usage)
- Test: `src/pages/settings/administration/usersManagement/components/__tests__/UserProjectsTable.test.tsx` (extend, from Task 4)

**Interfaces:**
- Consumes: `AddProjectPopup`'s widened `onAdd` signature (Task 5), `userStore.setDefaultProject` (Task 1).
- Produces: no new symbols — `handleAddProject` now accepts `setAsDefault: boolean` and chains a `setDefaultProject` call when true.

Test-first: yes — failing test asserting adding a project with the default switch on calls both `addUserProjectAccess` and `setDefaultProject`.

- [ ] **Step 1: Write the failing test**

Add to `src/pages/settings/administration/usersManagement/components/__tests__/UserProjectsTable.test.tsx` (from Task 4), replacing the `vi.mock('./popups/AddProjectPopup', ...)` stub with one that exposes an `onAdd` trigger, and adding a new test:

```tsx
vi.mock('./popups/AddProjectPopup', () => ({
  default: ({ onAdd }: any) => (
    <>
      <button data-testid="trigger-add-default" onClick={() => onAdd('proj-c', true)}>
        trigger add with default
      </button>
      <button data-testid="trigger-add-no-default" onClick={() => onAdd('proj-d', false)}>
        trigger add without default
      </button>
    </>
  ),
}))
```

```tsx
  it('chains setDefaultProject after adding a project with the default switch on', async () => {
    mockUserStore.addUserProjectAccess.mockResolvedValue(undefined)
    mockUserStore.setDefaultProject.mockResolvedValue(undefined)
    const user = makeUser([{ name: 'proj-a', is_project_admin: false, is_default: true }])

    render(<UserProjectsTable user={user} canManageProjects />)

    fireEvent.click(screen.getByTestId('trigger-add-default'))

    await waitFor(() =>
      expect(mockUserStore.addUserProjectAccess).toHaveBeenCalledWith('target-1', 'proj-c', false)
    )
    await waitFor(() =>
      expect(mockUserStore.setDefaultProject).toHaveBeenCalledWith('target-1', 'proj-c')
    )
  })

  it('does not call setDefaultProject when the add dialog default switch is off', async () => {
    mockUserStore.addUserProjectAccess.mockResolvedValue(undefined)
    const user = makeUser([{ name: 'proj-a', is_project_admin: false, is_default: true }])

    render(<UserProjectsTable user={user} canManageProjects />)

    fireEvent.click(screen.getByTestId('trigger-add-no-default'))

    await waitFor(() =>
      expect(mockUserStore.addUserProjectAccess).toHaveBeenCalledWith('target-1', 'proj-d', false)
    )
    expect(mockUserStore.setDefaultProject).not.toHaveBeenCalled()
  })
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run --project unit src/pages/settings/administration/usersManagement/components/__tests__/UserProjectsTable.test.tsx -t "chains setDefaultProject"`
Expected: FAIL — `handleAddProject` does not yet accept or act on a second argument, so `setDefaultProject` is never called.

- [ ] **Step 3: Implement**

In `src/pages/settings/administration/usersManagement/components/UserProjectsTable.tsx`, replace `handleAddProject`:

```ts
  const handleAddProject = useCallback(
    async (projectName: string, setAsDefault: boolean) => {
      if (projects.find((p) => p.name === projectName)) {
        toaster.info('Project is already assigned to this user')
        return
      }

      const newProject: UserAssignedProject = { name: projectName, is_project_admin: false }

      try {
        await setProjects(
          (projects) => [...projects, newProject],
          () => userStore.addUserProjectAccess(user.id, projectName, false)
        )
        toaster.info(`User added to project`)

        if (setAsDefault) {
          await handleSetDefault(projectName)
        }

        onProjectsChange?.()
      } catch (error) {
        console.error('Failed to add project:', error)
      }
    },
    [user.id, projects, setProjects, onProjectsChange, handleSetDefault]
  )
```

`handleSetDefault` is already declared above `handleAddProject` (Task 4 placed it there for exactly this reason), so this reference resolves without a temporal-dead-zone error.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run --project unit src/pages/settings/administration/usersManagement/components/__tests__/UserProjectsTable.test.tsx`
Expected: PASS — full file, all tests from Task 4 and Task 6.

- [ ] **Step 5: Commit**

```bash
git add src/pages/settings/administration/usersManagement/components/UserProjectsTable.tsx src/pages/settings/administration/usersManagement/components/__tests__/UserProjectsTable.test.tsx
git commit -m "EPMCDME-15112: Chain default-project assignment from the Add Project dialog"
```
