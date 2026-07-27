# AWS Integration Load-more Pagination Tests Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add integration tests for the five AWS entity list pages that use cursor/nextToken "Load more" pagination via `AwsEntityList.tsx`.

**Architecture:** A single parametrized test file uses `describe.each(ENTITY_CONFIGS)` to cover all five entity types in one suite. Each config carries its API path, route, and optional `setup`/`teardown` hooks for `useVueRouter` mock state. Three test cases per entity: button visible on non-null `next_token`, button hidden on null `next_token`, page-2 items appended on click with two-stage `requestRegistry` re-registration.

**Tech Stack:** Vitest integration project, `@testing-library/react`, `@testing-library/user-event` v14, valtio store (`awsVendorStore`), `renderPage` / `mockAPI` from `@/test-utils/integration`.

## Global Constraints

- No production-code changes.
- File must live under `src/pages/settings/components/vendor/__tests__/` (double-underscore) so the vitest integration glob `**/__tests__/**/*.integration.test.?(c|m)[jt]s?(x)` discovers it.
- Use normal ESLint-compatible import order: external packages first, then internal (`@/`) imports alphabetically. No `// eslint-disable` workarounds.
- `perPage` is 8 — `awsVendorStore.vendorEntitiesPagination.perPage` defaults to 8 per `src/store/vendor.ts:184`.
- All `mockAPI` calls must include `params` filter `{ setting_id: 'test-setting', per_page: 8 }` to validate the frontend passes correct query parameters.
- `userEvent` interactions: always use `const user = userEvent.setup()` + `await user.click(...)` (v14 async API).
- Store must be reset in `afterEach` to prevent state leaking between parametrized runs.

---

### Task 1: Scaffold the parametrized test file

**Test-first: yes — `it.todo` stubs; expected: vitest discovers 15 todo slots (3 × 5 entities)**

**Files:**
- Create: `src/pages/settings/components/vendor/__tests__/AwsEntityListLoadMorePagination.integration.test.tsx`

**Interfaces:**
- Produces: `ENTITY_CONFIGS` (5 objects), `resetStore()`, `describe.each` suite with three `it.todo` stubs per entity.

- [ ] **Step 1: Write the scaffold file**

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

import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, it } from 'vitest'

import { mockRouterState } from '@/hooks/__mocks__/useVueRouter'
import { awsVendorStore } from '@/store/vendor'
import { mockAPI, renderPage } from '@/test-utils/integration'

const SETTING_ID = 'test-setting'

type EntityConfig = {
  label: string
  apiPath: string
  route: string
  setup?: () => void
  teardown?: () => void
}

const ENTITY_CONFIGS: EntityConfig[] = [
  {
    label: 'assistants',
    apiPath: 'v1/vendors/aws/assistants',
    route: `/settings/aws/assistants/${SETTING_ID}`,
    setup: () => {
      mockRouterState.currentRoute.value.params = { settingId: SETTING_ID }
    },
    teardown: () => {
      mockRouterState.currentRoute.value.params = {}
    },
  },
  {
    label: 'workflows',
    apiPath: 'v1/vendors/aws/workflows',
    route: `/settings/aws/workflows/${SETTING_ID}`,
    setup: () => {
      mockRouterState.currentRoute.value.params = { settingId: SETTING_ID }
    },
    teardown: () => {
      mockRouterState.currentRoute.value.params = {}
    },
  },
  {
    label: 'knowledge-bases',
    apiPath: 'v1/vendors/aws/knowledgebases',
    route: `/settings/aws/data-sources/${SETTING_ID}`,
    setup: () => {
      mockRouterState.currentRoute.value.params = { settingId: SETTING_ID }
    },
    teardown: () => {
      mockRouterState.currentRoute.value.params = {}
    },
  },
  {
    label: 'guardrails',
    apiPath: 'v1/vendors/aws/guardrails',
    route: `/settings/aws/guardrails/${SETTING_ID}`,
    setup: () => {
      mockRouterState.currentRoute.value.params = { settingId: SETTING_ID }
    },
    teardown: () => {
      mockRouterState.currentRoute.value.params = {}
    },
  },
  {
    label: 'agentcore-runtimes',
    apiPath: 'v1/vendors/aws/agentcore-runtimes',
    route: `/settings/aws/agentcore-runtimes/${SETTING_ID}`,
    // no setup/teardown: settingId is picked up from the memory-router URL via useParams
  },
]

function resetStore() {
  awsVendorStore.vendorEntities = []
  awsVendorStore.vendorEntitiesPagination = { nextToken: null, perPage: 8 }
  awsVendorStore.loading.entities = false
}

describe.each(ENTITY_CONFIGS)('AWS $label — Load-more pagination', ({ label, apiPath, route, setup, teardown }) => {
  beforeEach(() => {
    setup?.()
    resetStore()
  })

  afterEach(() => {
    teardown?.()
    resetStore()
  })

  it.todo('shows Load more button when next_token present')
  it.todo('hides Load more button when next_token is null')
  it.todo('appends page 2 items on Load more click')
})
```

- [ ] **Step 2: Run vitest to confirm 15 todos are discovered**

```bash
npm run test:integration -- --reporter=verbose src/pages/settings/components/vendor/__tests__/AwsEntityListLoadMorePagination.integration.test.tsx
```

Expected: 15 `todo` entries printed (3 per entity × 5 entities), exit code 0.

---

### Task 2: Implement T1 — "shows Load more button when next_token present"

**Test-first: yes — replace `it.todo` with real test; expected: 5 new passing tests**

**Files:**
- Modify: `src/pages/settings/components/vendor/__tests__/AwsEntityListLoadMorePagination.integration.test.tsx`

**Interfaces:**
- Consumes: `ENTITY_CONFIGS`, `resetStore`, `beforeEach`/`afterEach` from Task 1.
- Produces: 5 passing T1 tests (one per entity).

- [ ] **Step 1: Replace the first `it.todo` with T1**

Replace:
```tsx
  it.todo('shows Load more button when next_token present')
```

With:
```tsx
  it('shows Load more button when next_token present', async () => {
    const page1Item = {
      id: `entity-p1-${label}`,
      name: `${label} Page-1 Entity`,
      description: 'desc',
      status: 'PREPARED' as const,
    }
    mockAPI(
      'GET',
      apiPath,
      { data: [page1Item], pagination: { next_token: 'token-page2' } },
      { setting_id: SETTING_ID, per_page: 8 },
    )

    renderPage(route)

    await screen.findByText(page1Item.name)
    expect(screen.getByRole('button', { name: /load more/i })).toBeInTheDocument()
  })
```

- [ ] **Step 2: Run T1 tests**

```bash
npm run test:integration -- --reporter=verbose src/pages/settings/components/vendor/__tests__/AwsEntityListLoadMorePagination.integration.test.tsx -t "shows Load more button"
```

Expected: 5 tests passing, 0 failing.

---

### Task 3: Implement T2 — "hides Load more button when next_token is null"

**Test-first: yes — replace `it.todo` with real test; expected: 5 new passing tests**

**Files:**
- Modify: `src/pages/settings/components/vendor/__tests__/AwsEntityListLoadMorePagination.integration.test.tsx`

**Interfaces:**
- Consumes: same setup as Task 2.
- Produces: 5 passing T2 tests (one per entity).

- [ ] **Step 1: Replace the second `it.todo` with T2**

Replace:
```tsx
  it.todo('hides Load more button when next_token is null')
```

With:
```tsx
  it('hides Load more button when next_token is null', async () => {
    const page1Item = {
      id: `entity-p1-${label}`,
      name: `${label} Page-1 Entity`,
      description: 'desc',
      status: 'PREPARED' as const,
    }
    mockAPI(
      'GET',
      apiPath,
      { data: [page1Item], pagination: { next_token: null } },
      { setting_id: SETTING_ID, per_page: 8 },
    )

    renderPage(route)

    await screen.findByText(page1Item.name)
    expect(screen.queryByRole('button', { name: /load more/i })).not.toBeInTheDocument()
  })
```

- [ ] **Step 2: Run T1 + T2 to catch interference between cases**

```bash
npm run test:integration -- --reporter=verbose src/pages/settings/components/vendor/__tests__/AwsEntityListLoadMorePagination.integration.test.tsx -t "(shows Load more|hides Load more)"
```

Expected: 10 tests passing, 0 failing.

---

### Task 4: Implement T3 — "appends page 2 items on Load more click"

**Test-first: yes — replace `it.todo` with real test; expected: 5 new passing tests; then validate and commit**

**Files:**
- Modify: `src/pages/settings/components/vendor/__tests__/AwsEntityListLoadMorePagination.integration.test.tsx`

**Interfaces:**
- Consumes: same setup as prior tasks. Two-stage `requestRegistry` re-registration: register page-1 → render → wait for page-1 anchor → overwrite with page-2 (including `next_token` params filter) → click → assert page-2 present AND page-1 still present AND button gone.
- Produces: 5 passing T3 tests; full 15-test suite green.

- [ ] **Step 1: Replace the third `it.todo` with T3**

Replace:
```tsx
  it.todo('appends page 2 items on Load more click')
```

With:
```tsx
  it('appends page 2 items on Load more click', async () => {
    const page1Item = {
      id: `entity-p1-${label}`,
      name: `${label} Page-1 Entity`,
      description: 'desc',
      status: 'PREPARED' as const,
    }
    const page2Item = {
      id: `entity-p2-${label}`,
      name: `${label} Page-2 Entity`,
      description: 'desc',
      status: 'PREPARED' as const,
    }

    // Stage 1: register page-1 response and render
    mockAPI(
      'GET',
      apiPath,
      { data: [page1Item], pagination: { next_token: 'token-page2' } },
      { setting_id: SETTING_ID, per_page: 8 },
    )
    renderPage(route)

    // Positive settle-anchor: wait for page-1 items
    await screen.findByText(page1Item.name)

    // Stage 2: overwrite registry with page-2 response; params filter includes next_token
    // to verify the frontend forwards the cursor value
    mockAPI(
      'GET',
      apiPath,
      { data: [page2Item], pagination: { next_token: null } },
      { setting_id: SETTING_ID, per_page: 8, next_token: 'token-page2' },
    )

    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: /load more/i }))

    // Positive settle-anchor: wait for page-2 items
    await screen.findByText(page2Item.name)

    // Page-1 items must still be present (append, not replace)
    expect(screen.getByText(page1Item.name)).toBeInTheDocument()

    // "Load more..." button is gone (next_token is null after page 2)
    expect(screen.queryByRole('button', { name: /load more/i })).not.toBeInTheDocument()
  })
```

- [ ] **Step 2: Run the full suite for this file**

```bash
npm run test:integration -- --reporter=verbose src/pages/settings/components/vendor/__tests__/AwsEntityListLoadMorePagination.integration.test.tsx
```

Expected: 15 tests passing (T1 × 5 + T2 × 5 + T3 × 5), 0 failing.

- [ ] **Step 3: Run final validation gates**

```bash
npm run lint
npm run typecheck
npm run test:unit
npm run test:integration
```

Expected: all commands exit with code 0.

- [ ] **Step 4: Commit**

```bash
git add src/pages/settings/components/vendor/__tests__/AwsEntityListLoadMorePagination.integration.test.tsx
git commit -m "EPMCDME-13483: Add integration tests for AWS Load-more cursor pagination"
```
