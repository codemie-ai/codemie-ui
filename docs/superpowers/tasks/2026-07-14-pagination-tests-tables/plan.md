# Pagination tests: Data Sources & Integrations tables Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add integration test coverage for pagination behavior on the Data Sources page, and the User Settings / Project Settings tables under Integrations — three pages sharing `Table.tsx` + `useTableFilters` that currently have zero pagination tests.

**Architecture:** Three new, self-contained `*.integration.test.tsx` files (no shared helper), each following the proven `renderPage()` + `mockAPI()` pattern from `AssistantsListPage.integration.test.tsx`'s "Marketplace Pagination" describe block (commit `f6cdb7a65`, EPMCDME-13479) — remock the endpoint with new data immediately before the action that triggers a refetch (click / per-page change), then `await waitFor(...)` on the new content.

**Tech Stack:** Vitest 1.6.1, @testing-library/react 16.3.0, @testing-library/user-event 14.6.1, jsdom.

## Global Constraints

- No production code changes. Test files only.
- Do not modify `src/test-utils/integration.tsx` or `src/test-utils/_mock-state.ts`.
- Per-page option under test is `20` (from `DECIMAL_PAGINATION_OPTIONS` — `10/20/50/100`), not the `24` used by the prior Assistants/Workflows task's `DEFAULT_PAGINATION_OPTIONS`.
- Use `fireEvent` (not `userEvent`) for the PrimeReact per-page `<Select>` interaction; `userEvent` for page-number button clicks.
- "Disabled" pagination controls = DOM absence: `screen.queryByRole('button', { name: ... }).not.toBeInTheDocument()`.
- No router/URL-sync assertions on any of these three pages.
- Every new test file needs the same Apache-2.0 license header block used throughout `src/` (see any existing file under `src/pages/dataSources/__tests__/`).
- Full validation command: `npm run test:integration`.

---

## Task 1: Data Sources pagination tests

**Files:**
- Create: `src/pages/dataSources/__tests__/DataSourcesPagination.integration.test.tsx`

**Interfaces:**
- Consumes: `renderPage`, `mockAPI` from `@/test-utils/integration` (existing, read-only).
- Produces: nothing consumed by later tasks — this file is self-contained.

Route under test: `/data-sources`. Required mocks for every test in this file: `v1/index/users` → `[]` (fired unconditionally on mount by `DataSourceFilters`; if unmocked, `loadIndexUsers()` calls `.sort()` on `null` and throws). `v1/index` is the paginated list endpoint (nested envelope `{ data, pagination: { page, per_page, pages, total } }`), fetched by `dataSourceStore.getIndexesStatuses()`.

- [ ] **Step 1: Write the full test file**

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

import { fireEvent, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect } from 'vitest'

import { renderPage, mockAPI } from '@/test-utils/integration'

describe('DataSourcesPage - Pagination', () => {
  const mockIndexUsers = () => mockAPI('GET', 'v1/index/users', [])

  const createDataSourceFixture = (overrides = {}) => ({
    id: 'ds-1',
    project_name: 'test-project',
    repo_name: 'DataSource 1',
    index_type: 'confluence',
    created_by: { id: 'user-1', email: 'user1@example.com', name: 'User One', username: 'user1' },
    project_space_visible: true,
    link: null,
    date: '2024-01-01T00:00:00Z',
    update_date: '2024-01-01T00:00:00Z',
    text: '',
    full_name: 'DataSource 1',
    current_state: 0,
    complete_state: 0,
    current__chunks_state: 0,
    error: false,
    completed: true,
    is_fetching: false,
    is_queued: false,
    user_abilities: [],
    jira: { jql: '' },
    xray: { jql: '' },
    ...overrides,
  })

  const createDataSources = (count: number, prefix = 'DataSource') =>
    Array.from({ length: count }, (_, i) =>
      createDataSourceFixture({
        id: `ds-${i + 1}`,
        repo_name: `${prefix} ${i + 1}`,
      })
    )

  it('shows next page of data sources when pagination button is clicked', async () => {
    mockIndexUsers()
    mockAPI('GET', 'v1/index', {
      data: createDataSources(25),
      pagination: { page: 0, per_page: 10, pages: 3, total: 25 },
    })

    renderPage('/data-sources')

    await waitFor(() => {
      expect(screen.getByText('DataSource 1')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Page 2' })).toBeInTheDocument()
    })

    mockAPI('GET', 'v1/index', {
      data: createDataSources(25).slice(10, 20),
      pagination: { page: 1, per_page: 10, pages: 3, total: 25 },
    })

    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Page 2' }))

    await waitFor(() => {
      expect(screen.getByText('DataSource 11')).toBeInTheDocument()
      expect(screen.queryByText('DataSource 1')).not.toBeInTheDocument()
    })
  })

  it('reloads data sources when per-page selection changes', async () => {
    mockIndexUsers()
    mockAPI('GET', 'v1/index', {
      data: createDataSources(25),
      pagination: { page: 0, per_page: 10, pages: 3, total: 25 },
    })

    renderPage('/data-sources')

    await waitFor(() => {
      expect(screen.getByText('DataSource 1')).toBeInTheDocument()
    })

    mockAPI('GET', 'v1/index', {
      data: [createDataSourceFixture({ id: 'ds-perpage', repo_name: 'DataSource PerPage' })],
      pagination: { page: 0, per_page: 20, pages: 2, total: 25 },
    })

    const perPageSelect = document.getElementById('per-page') as HTMLElement
    fireEvent.click(perPageSelect)
    fireEvent.click(screen.getByLabelText('20 items'))

    await waitFor(() => {
      expect(screen.getByText('DataSource PerPage')).toBeInTheDocument()
    })

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('per_page=20'),
      expect.anything()
    )
  })

  it('does not show pagination buttons when data sources fit on one page', async () => {
    mockIndexUsers()
    mockAPI('GET', 'v1/index', {
      data: createDataSources(6),
      pagination: { page: 0, per_page: 10, pages: 1, total: 6 },
    })

    renderPage('/data-sources')

    await waitFor(() => {
      expect(screen.getByText('DataSource 1')).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Page 2' })).not.toBeInTheDocument()
    })
  })

  it('Previous page button absent on first page', async () => {
    mockIndexUsers()
    mockAPI('GET', 'v1/index', {
      data: createDataSources(25),
      pagination: { page: 0, per_page: 10, pages: 3, total: 25 },
    })

    renderPage('/data-sources')

    await waitFor(() => {
      expect(screen.getByText('DataSource 1')).toBeInTheDocument()
    })

    expect(screen.queryByRole('button', { name: 'Previous page' })).not.toBeInTheDocument()
  })

  it('Next page button absent on last page', async () => {
    mockIndexUsers()
    mockAPI('GET', 'v1/index', {
      data: createDataSources(25).slice(20, 25),
      pagination: { page: 2, per_page: 10, pages: 3, total: 25 },
    })

    renderPage('/data-sources')

    await waitFor(() => {
      expect(screen.getByText('DataSource 25')).toBeInTheDocument()
    })

    expect(screen.queryByRole('button', { name: 'Next page' })).not.toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run the file and verify all 5 tests pass**

Run: `npm run test:integration -- DataSourcesPagination`
Expected: `5 passed`. These are characterization tests of already-working production behavior — a failure means the test/mock setup is wrong (e.g. a missed mock causing a thrown error, or a wrong selector), not a production bug. Iterate on the test file until green; do not touch any file under `src/pages/dataSources` other than the new test file, `src/components/Table`, `src/components/Pagination`, `src/store/dataSources.ts`, or `src/hooks/useTableFilters.ts`.

- [ ] **Step 3: Commit**

```bash
git add src/pages/dataSources/__tests__/DataSourcesPagination.integration.test.tsx
git commit -m "EPMCDME-13481: Add pagination integration tests for Data Sources page"
```

---

## Task 2: Integrations — User Settings pagination tests

**Files:**
- Create: `src/pages/integrations/__tests__/UserSettingsPagination.integration.test.tsx`

**Interfaces:**
- Consumes: `renderPage`, `mockAPI` from `@/test-utils/integration` (existing, read-only).
- Produces: nothing consumed by later tasks.

Route under test: `/integrations` — User Settings is the default tab (`IntegrationsPage`'s `integrationType` state initializes to `IntegrationOption.USER`), so no tab-switch step is needed. `v1/settings/user` is the paginated list endpoint (nested envelope), fetched by `userSettingsStore.fetchUserSettings()`. No other endpoint needs mocking: the default `v1/user` global mock (`is_admin: false`) makes `loadProjectOptions()` resolve synchronously via `userStore.getUserProjects()` with no HTTP call.

- [ ] **Step 1: Write the full test file**

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

import { fireEvent, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect } from 'vitest'

import { renderPage, mockAPI } from '@/test-utils/integration'

describe('UserSettings - Pagination', () => {
  const createUserSettingFixture = (overrides = {}) => ({
    user_id: 'test-user-id',
    id: 'setting-1',
    date: '2024-01-01T00:00:00Z',
    alias: 'Setting 1',
    credential_type: 'jira',
    update_date: '2024-01-01T00:00:00Z',
    project_name: 'test-project',
    display_name: null,
    default: false,
    credential_values: [],
    setting_hash: null,
    is_global: false,
    setting_type: 'user',
    ...overrides,
  })

  const createUserSettings = (count: number, prefix = 'Setting') =>
    Array.from({ length: count }, (_, i) =>
      createUserSettingFixture({
        id: `setting-${i + 1}`,
        alias: `${prefix} ${i + 1}`,
      })
    )

  it('shows next page of user settings when pagination button is clicked', async () => {
    mockAPI('GET', 'v1/settings/user', {
      data: createUserSettings(25),
      pagination: { page: 0, per_page: 10, pages: 3, total: 25 },
    })

    renderPage('/integrations')

    await waitFor(() => {
      expect(screen.getByText('Setting 1')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Page 2' })).toBeInTheDocument()
    })

    mockAPI('GET', 'v1/settings/user', {
      data: createUserSettings(25).slice(10, 20),
      pagination: { page: 1, per_page: 10, pages: 3, total: 25 },
    })

    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Page 2' }))

    await waitFor(() => {
      expect(screen.getByText('Setting 11')).toBeInTheDocument()
      expect(screen.queryByText('Setting 1')).not.toBeInTheDocument()
    })
  })

  it('reloads user settings when per-page selection changes', async () => {
    mockAPI('GET', 'v1/settings/user', {
      data: createUserSettings(25),
      pagination: { page: 0, per_page: 10, pages: 3, total: 25 },
    })

    renderPage('/integrations')

    await waitFor(() => {
      expect(screen.getByText('Setting 1')).toBeInTheDocument()
    })

    mockAPI('GET', 'v1/settings/user', {
      data: [createUserSettingFixture({ id: 'setting-perpage', alias: 'Setting PerPage' })],
      pagination: { page: 0, per_page: 20, pages: 2, total: 25 },
    })

    const perPageSelect = document.getElementById('per-page') as HTMLElement
    fireEvent.click(perPageSelect)
    fireEvent.click(screen.getByLabelText('20 items'))

    await waitFor(() => {
      expect(screen.getByText('Setting PerPage')).toBeInTheDocument()
    })

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('per_page=20'),
      expect.anything()
    )
  })

  it('does not show pagination buttons when user settings fit on one page', async () => {
    mockAPI('GET', 'v1/settings/user', {
      data: createUserSettings(6),
      pagination: { page: 0, per_page: 10, pages: 1, total: 6 },
    })

    renderPage('/integrations')

    await waitFor(() => {
      expect(screen.getByText('Setting 1')).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Page 2' })).not.toBeInTheDocument()
    })
  })

  it('Previous page button absent on first page', async () => {
    mockAPI('GET', 'v1/settings/user', {
      data: createUserSettings(25),
      pagination: { page: 0, per_page: 10, pages: 3, total: 25 },
    })

    renderPage('/integrations')

    await waitFor(() => {
      expect(screen.getByText('Setting 1')).toBeInTheDocument()
    })

    expect(screen.queryByRole('button', { name: 'Previous page' })).not.toBeInTheDocument()
  })

  it('Next page button absent on last page', async () => {
    mockAPI('GET', 'v1/settings/user', {
      data: createUserSettings(25).slice(20, 25),
      pagination: { page: 2, per_page: 10, pages: 3, total: 25 },
    })

    renderPage('/integrations')

    await waitFor(() => {
      expect(screen.getByText('Setting 25')).toBeInTheDocument()
    })

    expect(screen.queryByRole('button', { name: 'Next page' })).not.toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run the file and verify all 5 tests pass**

Run: `npm run test:integration -- UserSettingsPagination`
Expected: `5 passed`. Same characterization-test caveat as Task 1 — do not touch `src/pages/integrations` production files, `src/store/userSettings.ts`, `Table.tsx`, or `Pagination.tsx`.

- [ ] **Step 3: Commit**

```bash
git add src/pages/integrations/__tests__/UserSettingsPagination.integration.test.tsx
git commit -m "EPMCDME-13481: Add pagination integration tests for Integrations User Settings"
```

---

## Task 3: Integrations — Project Settings pagination tests

**Files:**
- Create: `src/pages/integrations/__tests__/ProjectSettingsPagination.integration.test.tsx`

**Interfaces:**
- Consumes: `renderPage`, `mockAPI` from `@/test-utils/integration` (existing, read-only).
- Produces: nothing consumed by later tasks.

Route under test: `/integrations`. The Project Settings tab is admin-gated and not the default tab, so every test needs:
1. `v1/user` mocked with `is_admin: true` (default global mock has `is_admin: false`) — read once during `App`'s bootstrap fetch, before `<Outlet />` (and therefore `IntegrationsPage`) mounts, so `IntegrationsPage`'s plain (non-reactive) `userStore.user` read already reflects it on first render.
2. `v1/settings/user` mocked (even though unused) — `UserSettings` is the default-rendered tab and mounts first; an unmocked fetch resolves to `null` and `fetchUserSettings` crashes destructuring `{ data, pagination }` from `null`.
3. `v1/settings/project/users` mocked to `[]` — fired on mount by `ProjectSettings`'s `loadCreatedByOptions`.
4. `v1/settings/project` — the paginated list endpoint under test.
5. A click on the `Project` `SelectButton` option (`role="button"`, `aria-label="Project"` per PrimeReact's `SelectButton` — confirmed in `node_modules/primereact/selectbutton/selectbutton.esm.js`) before any pagination assertion.

No `v1/admin/applications` mock is needed: `userStore.getAdminProjects` returns synchronously (no HTTP call) whenever the search string is shorter than 3 characters, which is always true for the empty-string call `loadProjectOptions()` makes on mount.

- [ ] **Step 1: Write the full test file**

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

import { fireEvent, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect } from 'vitest'

import { renderPage, mockAPI } from '@/test-utils/integration'

describe('ProjectSettings - Pagination', () => {
  const mockAdminSetup = () => {
    mockAPI('GET', 'v1/user', {
      user_id: 'test-user-id',
      email: 'test@example.com',
      name: 'Test User',
      username: 'testuser',
      is_admin: true,
      is_maintainer: false,
      user_type: 'INTERNAL',
      applications: [],
    })
    mockAPI('GET', 'v1/settings/user', {
      data: [],
      pagination: { page: 0, per_page: 10, pages: 0, total: 0 },
    })
    mockAPI('GET', 'v1/settings/project/users', [])
  }

  const switchToProjectTab = async () => {
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Project' })).toBeInTheDocument()
    })
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Project' }))
  }

  const createProjectSettingFixture = (overrides = {}) => ({
    user_id: 'test-user-id',
    id: 'setting-1',
    date: '2024-01-01T00:00:00Z',
    alias: 'Setting 1',
    credential_type: 'jira',
    update_date: '2024-01-01T00:00:00Z',
    project_name: 'test-project',
    display_name: null,
    default: false,
    credential_values: [],
    setting_hash: null,
    is_global: false,
    setting_type: 'project',
    ...overrides,
  })

  const createProjectSettings = (count: number, prefix = 'Setting') =>
    Array.from({ length: count }, (_, i) =>
      createProjectSettingFixture({
        id: `setting-${i + 1}`,
        alias: `${prefix} ${i + 1}`,
      })
    )

  it('shows next page of project settings when pagination button is clicked', async () => {
    mockAdminSetup()
    mockAPI('GET', 'v1/settings/project', {
      data: createProjectSettings(25),
      pagination: { page: 0, per_page: 10, pages: 3, total: 25 },
    })

    renderPage('/integrations')
    await switchToProjectTab()

    await waitFor(() => {
      expect(screen.getByText('Setting 1')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Page 2' })).toBeInTheDocument()
    })

    mockAPI('GET', 'v1/settings/project', {
      data: createProjectSettings(25).slice(10, 20),
      pagination: { page: 1, per_page: 10, pages: 3, total: 25 },
    })

    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Page 2' }))

    await waitFor(() => {
      expect(screen.getByText('Setting 11')).toBeInTheDocument()
      expect(screen.queryByText('Setting 1')).not.toBeInTheDocument()
    })
  })

  it('reloads project settings when per-page selection changes', async () => {
    mockAdminSetup()
    mockAPI('GET', 'v1/settings/project', {
      data: createProjectSettings(25),
      pagination: { page: 0, per_page: 10, pages: 3, total: 25 },
    })

    renderPage('/integrations')
    await switchToProjectTab()

    await waitFor(() => {
      expect(screen.getByText('Setting 1')).toBeInTheDocument()
    })

    mockAPI('GET', 'v1/settings/project', {
      data: [createProjectSettingFixture({ id: 'setting-perpage', alias: 'Setting PerPage' })],
      pagination: { page: 0, per_page: 20, pages: 2, total: 25 },
    })

    const perPageSelect = document.getElementById('per-page') as HTMLElement
    fireEvent.click(perPageSelect)
    fireEvent.click(screen.getByLabelText('20 items'))

    await waitFor(() => {
      expect(screen.getByText('Setting PerPage')).toBeInTheDocument()
    })

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('per_page=20'),
      expect.anything()
    )
  })

  it('does not show pagination buttons when project settings fit on one page', async () => {
    mockAdminSetup()
    mockAPI('GET', 'v1/settings/project', {
      data: createProjectSettings(6),
      pagination: { page: 0, per_page: 10, pages: 1, total: 6 },
    })

    renderPage('/integrations')
    await switchToProjectTab()

    await waitFor(() => {
      expect(screen.getByText('Setting 1')).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Page 2' })).not.toBeInTheDocument()
    })
  })

  it('Previous page button absent on first page', async () => {
    mockAdminSetup()
    mockAPI('GET', 'v1/settings/project', {
      data: createProjectSettings(25),
      pagination: { page: 0, per_page: 10, pages: 3, total: 25 },
    })

    renderPage('/integrations')
    await switchToProjectTab()

    await waitFor(() => {
      expect(screen.getByText('Setting 1')).toBeInTheDocument()
    })

    expect(screen.queryByRole('button', { name: 'Previous page' })).not.toBeInTheDocument()
  })

  it('Next page button absent on last page', async () => {
    mockAdminSetup()
    mockAPI('GET', 'v1/settings/project', {
      data: createProjectSettings(25).slice(20, 25),
      pagination: { page: 2, per_page: 10, pages: 3, total: 25 },
    })

    renderPage('/integrations')
    await switchToProjectTab()

    await waitFor(() => {
      expect(screen.getByText('Setting 25')).toBeInTheDocument()
    })

    expect(screen.queryByRole('button', { name: 'Next page' })).not.toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run the file and verify all 5 tests pass**

Run: `npm run test:integration -- ProjectSettingsPagination`
Expected: `5 passed`. If the `Project` `SelectButton` option is not found, first confirm the `v1/user` mock in `mockAdminSetup` is registered before `renderPage` — `App`'s bootstrap fetch is a one-shot call, so a mock registered after mount will not be picked up. Same characterization-test caveat as Tasks 1–2 — do not touch `src/pages/integrations` production files, `src/store/projectSettings.ts`, `Table.tsx`, `Pagination.tsx`, or `SelectButton.tsx`.

- [ ] **Step 3: Commit**

```bash
git add src/pages/integrations/__tests__/ProjectSettingsPagination.integration.test.tsx
git commit -m "EPMCDME-13481: Add pagination integration tests for Integrations Project Settings"
```

---

## Final validation

- [ ] Run the full integration suite once all three tasks are committed:

```bash
npm run test:integration
```

Expected: all suites pass, including the 15 new tests across the 3 new files (5 each).
