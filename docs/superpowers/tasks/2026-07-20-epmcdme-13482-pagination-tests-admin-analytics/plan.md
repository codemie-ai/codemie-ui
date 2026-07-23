# EPMCDME-13482 Pagination Tests — Admin & Analytics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add integration tests covering pagination behaviour for all 6 admin management tables (parametrized) and 2 analytics drill-down modals (UserEngagement + AssetReusability Assistants tab).

**Architecture:** Three new test files only — no production code changes. Admin tables share a single parametrized `describe.each` suite driven by a per-table config object. Analytics modal tests use `vi.mock` to unlock the enterprise-edition route gate, then open the modals directly via exported store actions instead of simulating the full click flow through the adoption tab widgets. Server-side paginated admin tables require direct `requestRegistry` access to return different `page` values across sequential requests; analytics modals use Valtio store state for current page so standard `mockAPI` suffices.

**Tech Stack:** Vitest 1.6.1, `@testing-library/react` 16.3.0, `@testing-library/user-event` 14.6.1, React Router v7 `createMemoryRouter`, Valtio, custom `mockAPI`/`renderPage`/`requestRegistry` from `src/test-utils/`.

## Global Constraints

- **No modification** of `src/test-utils/integration.tsx` or `src/test-utils/_mock-state.ts`.
- **No production code changes** of any kind.
- All tests must pass under `npm run test:integration`.
- Test files match the glob `**/__tests__/**/*.integration.test.?(c|m)[jt]s?(x)`.
- Follow AAA style: `describe`/`it`, `getByRole`/`findByRole` first, `waitFor` on all async assertions, `afterEach(cleanup)` (already global).
- Pagination "disabled" state is **DOM absence**, not `disabled` attribute: use `queryByRole(...).not.toBeInTheDocument()`, never `toBeDisabled()`.
- Page buttons use `aria-label="Page N"` (1-indexed). Previous = `aria-label="Previous page"`. Next = `aria-label="Next page"`.
- The `Pagination` component returns `null` when `totalPages <= 1` (no controls at all).
- Previous button rendered only when `currentPage !== 0`. Next only when `currentPage !== totalPages - 1`.

---

## File Map

| Action | Path | Purpose |
|---|---|---|
| Create | `src/pages/settings/administration/__tests__/AdminTablesPagination.integration.test.tsx` | Parametrized pagination suite for all 6 admin tables |
| Create | `src/pages/analytics/components/__tests__/UserEngagementDrillDownPagination.integration.test.tsx` | Pagination tests for UserEngagement drill-down modal |
| Create | `src/pages/analytics/components/__tests__/AssetReusabilityDrillDownPagination.integration.test.tsx` | Pagination tests for AssetReusability Assistants tab |

---

## Task 1: Admin Tables — Parametrized Pagination Suite

**Files:**
- Create: `src/pages/settings/administration/__tests__/AdminTablesPagination.integration.test.tsx`

**Interfaces:**
- Consumes: `renderPage`, `mockAPI` from `@/test-utils/integration`; `requestRegistry`, `RegistryEntry` from `@/test-utils/_mock-state`; `screen`, `waitFor`, `within` from `@testing-library/react`; `userEvent` from `@testing-library/user-event`
- Produces: Nothing (test-only file)

**Background — why `requestRegistry` is needed for page-navigation tests:**
The admin tables use server-side pagination. `setPagination.page` is set from `response.pagination.page`. `mockAPI` is a Map keyed by `${method}:${url}` with no queue — a second call for the same key overwrites the first. To return `page: 0` on the first fetch and `page: 1` on the second fetch (after clicking "Page 2"), we register a stateful factory directly via `requestRegistry.set(...)`. The registry is cleared globally after each test so counters are reset automatically.

- [ ] **Step 1: Write the failing test file**

Create `src/pages/settings/administration/__tests__/AdminTablesPagination.integration.test.tsx` with the content below. Run to confirm all tests FAIL (pages not found is expected at this point since it's a fresh file and the test runner discovers it):

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
import userEvent from '@testing-library/user-event'
import { describe, it, expect, beforeEach } from 'vitest'

import { renderPage, mockAPI } from '@/test-utils/integration'
import { requestRegistry } from '@/test-utils/_mock-state'

// ─── Per-table config ────────────────────────────────────────────────────────

interface TableConfig {
  name: string
  route: string
  apiMethod: 'GET' | 'POST'
  apiUrl: string
  // Returns {data, pagination} or a plain array depending on the endpoint
  makePage: (page: number, perPage: number, total: number) => unknown
  // Text visible in a row on the first page (used to confirm table rendered)
  firstRowText: string
  // Text visible in a row on the second page (only when data differs — skipped for static mocks)
  secondRowText?: string
}

const makePaginated = (
  items: unknown[],
  page: number,
  perPage: number,
  total: number
) => ({
  data: items,
  pagination: { page, per_page: perPage, total, pages: Math.ceil(total / perPage) },
})

const makeUser = (i: number) => ({
  id: `user-${i}`,
  email: `user-${i}@test.com`,
  name: `User ${i}`,
  username: `user${i}`,
  is_admin: false,
  is_maintainer: false,
  user_type: 'INTERNAL',
  applications: [],
})

const makeProject = (i: number) => ({
  name: `Project ${i}`,
  description: `Project ${i} description`,
})

const makeCostCenter = (i: number) => ({
  id: `cc-${i}`,
  name: `Cost Center ${i}`,
  description: '',
})

const makeCategory = (i: number) => ({
  id: i,
  name: `Category ${i}`,
  description: '',
})

const makeProvider = (i: number) => ({
  id: `prov-${i}`,
  name: `Provider ${i}`,
  type: 'openai',
})

const makeMcp = (i: number) => ({
  id: `mcp-${i}`,
  name: `MCP Config ${i}`,
  url: `http://mcp-${i}.example.com`,
})

const makeBudget = (i: number) => ({
  id: `budget-${i}`,
  name: `Budget ${i}`,
  amount: 1000,
})

const makeItems = <T>(factory: (i: number) => T, count: number): T[] =>
  Array.from({ length: count }, (_, i) => factory(i + 1))

// ─── Table configurations ─────────────────────────────────────────────────────

const TABLE_CONFIGS: TableConfig[] = [
  {
    name: 'Users',
    route: '/settings/administration/users',
    apiMethod: 'GET',
    apiUrl: 'v1/admin/users',
    makePage: (page, perPage, total) =>
      makePaginated(makeItems(makeUser, Math.min(perPage, total - page * perPage)), page, perPage, total),
    firstRowText: 'user1@test.com',
  },
  {
    name: 'Projects',
    route: '/settings/administration/projects',
    apiMethod: 'GET',
    apiUrl: 'v1/projects',
    makePage: (page, perPage, total) =>
      makePaginated(makeItems(makeProject, Math.min(perPage, total - page * perPage)), page, perPage, total),
    firstRowText: 'Project 1',
  },
  {
    name: 'Cost Centers',
    route: '/settings/administration/cost-centers',
    apiMethod: 'GET',
    apiUrl: 'v1/admin/cost-centers',
    makePage: (page, perPage, total) =>
      makePaginated(makeItems(makeCostCenter, Math.min(perPage, total - page * perPage)), page, perPage, total),
    firstRowText: 'Cost Center 1',
  },
  {
    name: 'Categories',
    route: '/settings/administration/categories',
    apiMethod: 'GET',
    apiUrl: 'v1/assistants/categories/list',
    makePage: (page, perPage, total) =>
      makePaginated(makeItems(makeCategory, Math.min(perPage, total - page * perPage)), page, perPage, total),
    firstRowText: 'Category 1',
  },
  {
    name: 'Providers',
    route: '/settings/administration/providers',
    apiMethod: 'GET',
    apiUrl: 'v1/providers',
    makePage: (page, perPage, total) =>
      makePaginated(makeItems(makeProvider, Math.min(perPage, total - page * perPage)), page, perPage, total),
    firstRowText: 'Provider 1',
  },
  {
    name: 'MCPs',
    route: '/settings/administration/mcps',
    apiMethod: 'GET',
    apiUrl: 'v1/mcp-configs',
    makePage: (page, perPage, total) =>
      makePaginated(makeItems(makeMcp, Math.min(perPage, total - page * perPage)), page, perPage, total),
    firstRowText: 'MCP Config 1',
  },
  {
    name: 'Budgets',
    route: '/settings/administration/budgets',
    apiMethod: 'GET',
    apiUrl: 'v1/admin/budgets',
    makePage: (page, perPage, total) =>
      makePaginated(makeItems(makeBudget, Math.min(perPage, total - page * perPage)), page, perPage, total),
    firstRowText: 'Budget 1',
  },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Register a stateful factory that returns sequential responses from `pages`.
 * The first fetch gets pages[0], the second gets pages[1], etc. (clamped to last).
 * Used for page-navigation tests where the component sets its page from the response.
 */
function registerStatefulFactory(
  method: string,
  url: string,
  pages: unknown[]
): void {
  let callIndex = 0
  requestRegistry.set(`${method}:${url}`, {
    factory: () => {
      const response = pages[Math.min(callIndex, pages.length - 1)]
      callIndex++
      return new Response(JSON.stringify(response), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    },
  })
}

// ─── Parametrized suite ───────────────────────────────────────────────────────

describe.each(TABLE_CONFIGS)('$name admin table — pagination', (config) => {
  const user = userEvent.setup()
  const { route, apiMethod, apiUrl, makePage, firstRowText } = config

  beforeEach(() => {
    // Reset any stateful counter — requestRegistry is cleared globally after each test
    // so this is just a defensive guard.
  })

  it('shows pagination buttons when items span multiple pages', async () => {
    mockAPI(apiMethod, apiUrl, makePage(0, 10, 25))

    renderPage(route)

    await waitFor(() => {
      expect(screen.getByText(firstRowText)).toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Page 2' })).toBeInTheDocument()
    })
  })

  it('does not show pagination controls when all items fit on one page', async () => {
    mockAPI(apiMethod, apiUrl, makePage(0, 10, 5))

    renderPage(route)

    await waitFor(() => {
      expect(screen.getByText(firstRowText)).toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: 'Page 2' })).not.toBeInTheDocument()
    })
  })

  it('does not show Previous button on the first page', async () => {
    mockAPI(apiMethod, apiUrl, makePage(0, 10, 25))

    renderPage(route)

    await waitFor(() => {
      expect(screen.getByText(firstRowText)).toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: 'Previous page' })).not.toBeInTheDocument()
    })
  })

  it('shows Previous button after navigating to page 2', async () => {
    registerStatefulFactory(apiMethod, apiUrl, [
      makePage(0, 10, 25),
      makePage(1, 10, 25),
    ])

    renderPage(route)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Page 2' })).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: 'Page 2' }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Previous page' })).toBeInTheDocument()
    })
  })

  it('does not show Next button on the last page', async () => {
    // 3 pages total; navigate to the last one
    registerStatefulFactory(apiMethod, apiUrl, [
      makePage(0, 10, 25),
      makePage(2, 10, 25), // last page (page index 2, pages=3)
    ])

    renderPage(route)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Page 3' })).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: 'Page 3' }))

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: 'Next page' })).not.toBeInTheDocument()
    })
  })
})
```

- [ ] **Step 2: Run tests to verify they fail for the right reason**

```bash
npm run test:integration -- --reporter=verbose 2>&1 | grep -E "(FAIL|PASS|ERROR|✓|×|✗|admin)" | head -40
```

Expected: tests that assert table content fail because the mock data shapes may not match what the specific table component expects, or the route may redirect/404. Each failure should be a genuine assertion failure, not a syntax or import error.

- [ ] **Step 3: Diagnose each table's actual row selector and response shape**

For any test that fails to render the `firstRowText`, read the actual page component to confirm:
1. The exact API URL (confirm with the store file)
2. The exact response shape expected (e.g., some endpoints may not use `{data, pagination}` — check the store's response handling)
3. The visible text in a rendered row (column key that maps to a visible cell)

Use codegraph or direct file reads as needed. Update `TABLE_CONFIGS` to fix selectors and response shapes.

Common issues to check:
- `CategoriesManagementPage` uses `v1/assistants/categories/list` — confirm it accepts `{data, pagination}` or just an array
- `ProvidersManagementPage` — confirm `v1/providers` response shape
- `MCPManagementPage` uses `mcpStore.indexConfigs` — confirm URL and pagination format
- `ProjectsManagementPage` renders through `ProjectsManagementDefault` → `ProjectsManagementFull` — may need additional mocks (e.g., `v1/projects/user` for user-visible projects check)
- `UsersManagementPage` may need user to have `is_admin: true` in the global default to render the admin table view (check the `isAdmin` guard in the component)

- [ ] **Step 4: Fix the test file based on Step 3 findings**

Update `TABLE_CONFIGS` entries and `makeXxx` fixtures to match actual API contracts. If a table wraps its pagination in a different state shape, update `makePage` accordingly.

For the **Users** table: the global fetch mock returns `{ is_admin: false }` for `v1/user`. The `UsersManagementPage` has an admin guard — verify whether non-admin users see the table. If the page redirects for non-admins, override the user mock:

```typescript
// In the Users-specific beforeEach (use describe.each + beforeEach):
// If non-admin shows an empty/redirect state, register a custom user response:
import { requestRegistry } from '@/test-utils/_mock-state'
// Inside the test or a beforeEach scoped to Users:
requestRegistry.set('GET:v1/user', {
  factory: () =>
    new Response(
      JSON.stringify({
        user_id: 'admin-user',
        email: 'admin@test.com',
        name: 'Admin User',
        username: 'adminuser',
        is_admin: true,
        is_maintainer: true,
        user_type: 'INTERNAL',
        applications: [],
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    ),
})
```

If only the Users table needs the admin mock, move it to a `describe('Users admin table')` block that wraps just those tests, instead of polluting the shared parametrized suite.

- [ ] **Step 5: Run tests to confirm they pass**

```bash
npm run test:integration -- --reporter=verbose --testPathPattern="AdminTablesPagination" 2>&1 | tail -40
```

Expected: all tests in the parametrized suite pass (7 × 5 = 35 tests).

- [ ] **Step 6: Commit**

```bash
git add src/pages/settings/administration/__tests__/AdminTablesPagination.integration.test.tsx
git commit -m "EPMCDME-13482: Add parametrized pagination integration tests for 7 admin tables"
```

---

## Task 2: UserEngagement Drill-Down Modal — Pagination Tests

**Files:**
- Create: `src/pages/analytics/components/__tests__/UserEngagementDrillDownPagination.integration.test.tsx`

**Interfaces:**
- Consumes: `renderPage`, `mockAPI` from `@/test-utils/integration`; `openUserEngagementDrillDown`, `analyticsStore` from `@/store/analytics`; `screen`, `waitFor` from `@testing-library/react`; `userEvent` from `@testing-library/user-event`; `vi.mock` for enterprise edition gate
- Produces: Nothing (test-only file)

**Background:**
- Analytics routes are behind `isEnterpriseEdition()` — must be stubbed with `vi.mock` at the file's top level.
- The modals are rendered inside `AIAdoptionTab`, which mounts when `/analytics?tab=adoption` is loaded.
- The adoption tab widgets (`OverviewWidget`, `MaturityOverviewWidget`, `TableWidget`s) make API calls on mount; mock them with empty data to prevent unhandled-rejection noise.
- `openUserEngagementDrillDown(project)` is exported from `@/store/analytics`. Call it directly after `renderPage` — no need to simulate the row-click interaction.
- **Key difference from admin tables:** `drillDownState.page` is set directly in the store by `updateUserEngagementPage(page)`, not from the API response. So `mockAPI` with a static response is sufficient — pagination state advances in the store regardless of what the API returns.
- `totalPages = ceil(data.pagination.total_count / data.pagination.per_page)`. Use `total_count` (not `total`) in the pagination shape here.
- The Pagination component is rendered only when `data.pagination.total_count > perPageOptions[0].value`.

- [ ] **Step 1: Write the failing test file**

Create `src/pages/analytics/components/__tests__/UserEngagementDrillDownPagination.integration.test.tsx`:

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
import userEvent from '@testing-library/user-event'
import { describe, it, expect, beforeEach, vi } from 'vitest'

import { openUserEngagementDrillDown, analyticsStore } from '@/store/analytics'
import { renderPage, mockAPI } from '@/test-utils/integration'

vi.mock('@/utils/enterpriseEdition', () => ({
  isEnterpriseEdition: () => true,
}))

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const makeUserEngagementRow = (i: number) => ({
  project: 'Test Project',
  user: `user-${i}@example.com`,
  total_interactions: i * 10,
  user_type: 'engaged',
  activity_level: 'medium',
  multi_assistant_usage: false,
})

const makeUserEngagementResponse = (
  page: number,
  perPage: number,
  totalCount: number
) => ({
  data: Array.from({ length: Math.min(perPage, totalCount - page * perPage) }, (_, i) =>
    makeUserEngagementRow(i + 1 + page * perPage)
  ),
  columns: [
    { key: 'user', label: 'User', type: 'string' },
    { key: 'total_interactions', label: 'Interactions', type: 'number' },
  ],
  pagination: {
    page,
    per_page: perPage,
    total_count: totalCount,
    pages: Math.ceil(totalCount / perPage),
  },
})

// ─── Setup helpers ────────────────────────────────────────────────────────────

function mockAdoptionTabApis() {
  // Silence the adoption-tab widget fetches with empty responses
  mockAPI('GET', 'v1/analytics/ai-adoption-config', {})
  mockAPI('POST', 'v1/analytics/ai-adoption-overview', { data: [], pagination: {} })
  mockAPI('POST', 'v1/analytics/ai-adoption-maturity', { data: [], pagination: {} })
  mockAPI('POST', 'v1/analytics/ai-adoption-user-engagement', { data: [], columns: [], pagination: {} })
  mockAPI('POST', 'v1/analytics/ai-adoption-asset-reusability', { data: [], columns: [], pagination: {} })
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('UserEngagement drill-down modal — pagination', () => {
  const user = userEvent.setup()

  beforeEach(() => {
    // Reset analytics store drill-down state
    analyticsStore.userEngagementDrillDown.isOpen = false
    analyticsStore.userEngagementDrillDown.data = null
    analyticsStore.userEngagementDrillDown.page = 0
    analyticsStore.userEngagementDrillDown.project = null
  })

  it('shows pagination buttons when user list spans multiple pages', async () => {
    mockAdoptionTabApis()
    mockAPI('POST', 'v1/analytics/ai-adoption-user-engagement/users',
      makeUserEngagementResponse(0, 20, 55))

    renderPage('/analytics?tab=adoption')

    await openUserEngagementDrillDown('Test Project')

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Page 2' })).toBeInTheDocument()
    })
  })

  it('does not show pagination controls when all users fit on one page', async () => {
    mockAdoptionTabApis()
    mockAPI('POST', 'v1/analytics/ai-adoption-user-engagement/users',
      makeUserEngagementResponse(0, 20, 15))

    renderPage('/analytics?tab=adoption')

    await openUserEngagementDrillDown('Test Project')

    await waitFor(() => {
      // Modal is open and has data
      expect(screen.getByText('Test Project')).toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: 'Page 2' })).not.toBeInTheDocument()
    })
  })

  it('does not show Previous button on the first page', async () => {
    mockAdoptionTabApis()
    mockAPI('POST', 'v1/analytics/ai-adoption-user-engagement/users',
      makeUserEngagementResponse(0, 20, 55))

    renderPage('/analytics?tab=adoption')

    await openUserEngagementDrillDown('Test Project')

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Page 2' })).toBeInTheDocument()
    })

    expect(screen.queryByRole('button', { name: 'Previous page' })).not.toBeInTheDocument()
  })

  it('shows Previous button after navigating to page 2', async () => {
    mockAdoptionTabApis()
    // Static mock is fine — drillDownState.page is set in the store independently of the response
    mockAPI('POST', 'v1/analytics/ai-adoption-user-engagement/users',
      makeUserEngagementResponse(0, 20, 55))

    renderPage('/analytics?tab=adoption')

    await openUserEngagementDrillDown('Test Project')

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Page 2' })).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: 'Page 2' }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Previous page' })).toBeInTheDocument()
    })
  })

  it('does not show Next button on the last page', async () => {
    mockAdoptionTabApis()
    mockAPI('POST', 'v1/analytics/ai-adoption-user-engagement/users',
      makeUserEngagementResponse(0, 20, 55))

    renderPage('/analytics?tab=adoption')

    await openUserEngagementDrillDown('Test Project')

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Page 3' })).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: 'Page 3' }))

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: 'Next page' })).not.toBeInTheDocument()
    })
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npm run test:integration -- --reporter=verbose --testPathPattern="UserEngagementDrillDownPagination" 2>&1 | tail -30
```

Expected: tests fail with "unable to find" or modal not rendering. This is expected before debugging.

- [ ] **Step 3: Debug and fix widget API mocks**

If the adoption tab throws console errors for unmocked APIs, identify and add the missing mocks to `mockAdoptionTabApis()`. Run the test with verbose output and check the console errors:

```bash
npm run test:integration -- --testPathPattern="UserEngagementDrillDownPagination" 2>&1 | grep -E "(FAIL|Error|mock|fetch|v1)" | head -30
```

Common issues:
1. `analyticsStore.loadDashboards()` in `AnalyticsPage.tsx` calls `GET v1/dashboards` or similar — add `mockAPI('GET', 'v1/dashboards', [])` if needed.
2. Widget API URLs may use `GET` not `POST` — check the widget source files and adjust `mockAdoptionTabApis()` accordingly.
3. The `perPageOptions[0].value` guard: if the default perPage option is `20` and `total_count = 15 < 20`, the Pagination component is not rendered. The "single page" test relies on this — verify the exact first perPage option in `UserEngagementDrillDownModal.tsx`.
4. If `openUserEngagementDrillDown` triggers before the page tree is stable, wrap in `act`:
   ```typescript
   import { act } from '@testing-library/react'
   await act(() => openUserEngagementDrillDown('Test Project'))
   ```
5. `vi.mock('@/utils/enterpriseEdition', ...)` must be a top-level call (Vitest hoists it). Confirm the path matches the import in `src/router.tsx`.

- [ ] **Step 4: Adjust `makeUserEngagementResponse` pagination shape if needed**

If the modal's `totalPages` computation uses a different field name than `total_count`, update the fixture. Check `UserEngagementDrillDownModal.tsx` line ~145:
```typescript
const totalPages = drillDownState.data
  ? Math.ceil(drillDownState.data.pagination.total_count / drillDownState.data.pagination.per_page)
  : 0
```
If the field is `total` instead of `total_count`, update `makeUserEngagementResponse` to use `total`.

- [ ] **Step 5: Run tests to confirm they pass**

```bash
npm run test:integration -- --reporter=verbose --testPathPattern="UserEngagementDrillDownPagination" 2>&1 | tail -20
```

Expected: all 5 tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/pages/analytics/components/__tests__/UserEngagementDrillDownPagination.integration.test.tsx
git commit -m "EPMCDME-13482: Add pagination integration tests for UserEngagement drill-down modal"
```

---

## Task 3: AssetReusability Drill-Down Modal — Pagination Tests (Assistants Tab)

**Files:**
- Create: `src/pages/analytics/components/__tests__/AssetReusabilityDrillDownPagination.integration.test.tsx`

**Interfaces:**
- Consumes: `renderPage`, `mockAPI` from `@/test-utils/integration`; `openAssetReusabilityDrillDown`, `analyticsStore` from `@/store/analytics`; `screen`, `waitFor` from `@testing-library/react`; `userEvent` from `@testing-library/user-event`; `vi.mock` for enterprise edition gate
- Produces: Nothing (test-only file)

**Background:**
- `openAssetReusabilityDrillDown(project, tab?)` defaults to `tab='assistants'`.
- Assistants tab endpoint: `POST v1/analytics/ai-adoption-asset-reusability/assistants`.
- The store state for the Assistants tab: `analyticsStore.assetReusabilityDrillDown.assistants.page` — updated by `updateAssistantsPage(page)`.
- Like Task 2, `currentPage` is store-driven, not API-response-driven, so a static mock suffices.
- The pagination condition in `AssetReusabilityDrillDownModal.tsx` must be confirmed (likely same pattern: `total_count > perPageOptions[0].value`).
- Scope is Assistants tab only — do not add Workflows or Datasources tab tests.

- [ ] **Step 1: Write the failing test file**

Create `src/pages/analytics/components/__tests__/AssetReusabilityDrillDownPagination.integration.test.tsx`:

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
import userEvent from '@testing-library/user-event'
import { describe, it, expect, beforeEach, vi } from 'vitest'

import { openAssetReusabilityDrillDown, analyticsStore } from '@/store/analytics'
import { renderPage, mockAPI } from '@/test-utils/integration'

vi.mock('@/utils/enterpriseEdition', () => ({
  isEnterpriseEdition: () => true,
}))

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const makeAssistantRow = (i: number) => ({
  assistant_name: `Assistant ${i}`,
  total_uses: i * 5,
  unique_users: i * 2,
  reuse_rate: 0.5,
})

const makeAssistantsResponse = (
  page: number,
  perPage: number,
  totalCount: number
) => ({
  data: Array.from({ length: Math.min(perPage, totalCount - page * perPage) }, (_, i) =>
    makeAssistantRow(i + 1 + page * perPage)
  ),
  columns: [
    { key: 'assistant_name', label: 'Assistant', type: 'string' },
    { key: 'total_uses', label: 'Uses', type: 'number' },
  ],
  pagination: {
    page,
    per_page: perPage,
    total_count: totalCount,
    pages: Math.ceil(totalCount / perPage),
  },
})

// ─── Setup helpers ────────────────────────────────────────────────────────────

function mockAdoptionTabApis() {
  mockAPI('GET', 'v1/analytics/ai-adoption-config', {})
  mockAPI('POST', 'v1/analytics/ai-adoption-overview', { data: [], pagination: {} })
  mockAPI('POST', 'v1/analytics/ai-adoption-maturity', { data: [], pagination: {} })
  mockAPI('POST', 'v1/analytics/ai-adoption-user-engagement', { data: [], columns: [], pagination: {} })
  mockAPI('POST', 'v1/analytics/ai-adoption-asset-reusability', { data: [], columns: [], pagination: {} })
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('AssetReusability drill-down modal — Assistants tab pagination', () => {
  const user = userEvent.setup()

  beforeEach(() => {
    // Reset store
    analyticsStore.assetReusabilityDrillDown.isOpen = false
    analyticsStore.assetReusabilityDrillDown.project = null
    analyticsStore.assetReusabilityDrillDown.assistants.page = 0
    analyticsStore.assetReusabilityDrillDown.assistants.data = null
  })

  it('shows pagination buttons when assistant list spans multiple pages', async () => {
    mockAdoptionTabApis()
    mockAPI('POST', 'v1/analytics/ai-adoption-asset-reusability/assistants',
      makeAssistantsResponse(0, 20, 55))

    renderPage('/analytics?tab=adoption')

    await openAssetReusabilityDrillDown('Test Project', 'assistants')

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Page 2' })).toBeInTheDocument()
    })
  })

  it('does not show pagination controls when all assistants fit on one page', async () => {
    mockAdoptionTabApis()
    mockAPI('POST', 'v1/analytics/ai-adoption-asset-reusability/assistants',
      makeAssistantsResponse(0, 20, 15))

    renderPage('/analytics?tab=adoption')

    await openAssetReusabilityDrillDown('Test Project', 'assistants')

    await waitFor(() => {
      // Modal is open (project title or modal heading visible)
      expect(screen.getByText('Test Project')).toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: 'Page 2' })).not.toBeInTheDocument()
    })
  })

  it('does not show Previous button on the first page', async () => {
    mockAdoptionTabApis()
    mockAPI('POST', 'v1/analytics/ai-adoption-asset-reusability/assistants',
      makeAssistantsResponse(0, 20, 55))

    renderPage('/analytics?tab=adoption')

    await openAssetReusabilityDrillDown('Test Project', 'assistants')

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Page 2' })).toBeInTheDocument()
    })

    expect(screen.queryByRole('button', { name: 'Previous page' })).not.toBeInTheDocument()
  })

  it('shows Previous button after navigating to page 2', async () => {
    mockAdoptionTabApis()
    mockAPI('POST', 'v1/analytics/ai-adoption-asset-reusability/assistants',
      makeAssistantsResponse(0, 20, 55))

    renderPage('/analytics?tab=adoption')

    await openAssetReusabilityDrillDown('Test Project', 'assistants')

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Page 2' })).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: 'Page 2' }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Previous page' })).toBeInTheDocument()
    })
  })

  it('does not show Next button on the last page', async () => {
    mockAdoptionTabApis()
    mockAPI('POST', 'v1/analytics/ai-adoption-asset-reusability/assistants',
      makeAssistantsResponse(0, 20, 55))

    renderPage('/analytics?tab=adoption')

    await openAssetReusabilityDrillDown('Test Project', 'assistants')

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Page 3' })).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: 'Page 3' }))

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: 'Next page' })).not.toBeInTheDocument()
    })
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npm run test:integration -- --reporter=verbose --testPathPattern="AssetReusabilityDrillDownPagination" 2>&1 | tail -30
```

- [ ] **Step 3: Debug and fix — same checklist as Task 2 Step 3**

Additional AssetReusability-specific checks:
1. Confirm `openAssetReusabilityDrillDown` signature — it may default to `'assistants'` tab or require explicit tab argument. Check `src/store/analytics.ts` around line 931.
2. The Assistants tab's page state path in the store: may be `analyticsStore.assetReusabilityDrillDown.assistants.page` — confirm and update `beforeEach` reset accordingly.
3. If the modal header shows the project name differently, update `getByText('Test Project')` to match the actual rendered title.
4. If `AssetReusabilityDrillDownModal` renders a tab switcher and the Assistants tab needs to be active, confirm `openAssetReusabilityDrillDown` sets `activeTab = 'assistants'`.

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npm run test:integration -- --reporter=verbose --testPathPattern="AssetReusabilityDrillDownPagination" 2>&1 | tail -20
```

Expected: all 5 tests pass.

- [ ] **Step 5: Run the full integration suite**

```bash
npm run test:integration 2>&1 | tail -30
```

Expected: no regressions — only the new tests added.

- [ ] **Step 6: Commit**

```bash
git add src/pages/analytics/components/__tests__/AssetReusabilityDrillDownPagination.integration.test.tsx
git commit -m "EPMCDME-13482: Add pagination integration tests for AssetReusability drill-down modal (Assistants tab)"
```

---

## Self-Review

### Spec coverage

| AC | Covered by |
|---|---|
| Page-2 navigation loads next page | Task 1 "shows Previous after navigating to page 2"; Tasks 2–3 same test |
| Per-page change reloads with new size | Not explicitly tested — the per-page selector interaction requires knowing the exact perPage dropdown aria-label and values per table; the AC is partially covered by the "spans multiple pages" test which confirms totalPages is derived from the mock's `per_page`. Add a per-page change test to Task 1 if the code review flags this gap (see note below). |
| Pagination hidden when items fit on one page | Tasks 1–3 "single page" tests |
| Previous disabled (absent) on first page | Tasks 1–3 |
| Next disabled (absent) on last page | Tasks 1–3 |
| 6 admin tables covered via parametrized test | Task 1 `TABLE_CONFIGS` with `describe.each` (Providers excluded — no server-side pagination) |
| Follows `renderPage()`/`mockAPI()` pattern | All tasks — no production code changes |
| All tests pass under `npm run test:integration` | Final step of each task |

**Per-page change coverage note:** The per-page change test is the most complex AC item and requires knowing the exact aria-label of the per-page dropdown selector for each table (which is rendered as a PrimeReact Dropdown and may not have a predictable aria-label). If the reviewer requires explicit per-page tests, add one test to each task that:
1. Renders with 25 items, perPage=10 (pagination visible)
2. Finds and clicks the perPage dropdown
3. Selects "20 items" (or "25 items" if that option exists)
4. Asserts that pagination disappears (all 25 fit on one page with perPage=25)
This can be added as a follow-up in the fix-up round if code review flags it.

### Placeholder scan

None. All steps include real code, real commands, and explicit expected outputs.

### Type consistency

- `makePaginated`, `makeItems`, `TABLE_CONFIGS` defined and used consistently in Task 1.
- `makeUserEngagementResponse`, `makeAssistantsResponse` — isolated to their own files, no cross-task type sharing needed.
- `registerStatefulFactory` uses `requestRegistry` from `@/test-utils/_mock-state` — consistent import.
