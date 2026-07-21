# EPMCDME-13480 Pagination Tests: Feature List Pages — Implementation Plan

**Goal:** Add integration test coverage for pagination behavior on Skills tabs (Project/Marketplace/Favorites), Katas (ALL_KATAS list + Leaderboard), and the standalone Favorites page — no production code changes.

**Architecture:** Follow the `renderPage()`/`mockAPI()` integration-test pattern already established for Assistants/Workflows templates and favorites tabs (`AssistantTemplatesPagination.integration.test.tsx`, `WorkflowTemplatesPagination.integration.test.tsx`, and the `Marketplace Pagination`/`Favorites Pagination` blocks added to `AssistantsListPage.integration.test.tsx` on the sibling branch `EPMCDME-13479_pagination-tests-remaining-tabs`). Real react-router + real Valtio stores; only `fetch` is mocked via the shared `mockAPI`/`requestRegistry` test-infra. New test files only, one or more `describe` blocks per feature area, colocated under `__tests__/` next to each page.

**Tech Stack:** Vitest (`integration` project), `@testing-library/react`, `@testing-library/user-event`.

## Global Constraints

- No production code changes — page components (`SkillsListPage.tsx`, `KatasPage.tsx`, `FavoritesPage.tsx`), hooks, stores, and the shared `Pagination`/`Table` components are read-only reference material.
- No changes to `src/test-utils/integration.tsx` or `src/test-utils/_mock-state.ts`.
- New test files only, named `*.integration.test.tsx`, so they are picked up by `npm run test:integration` (vitest `integration` project per `vitest.workspace.ts`).
- All new files use the `renderPage`/`mockAPI` pattern from `src/test-utils/integration.tsx`; no MSW or other mocking libraries.
- Every step is TDD in spirit (write test, run, verify), but since no production code is being added, "RED" for each test file is "the file doesn't exist yet"; "GREEN" is "the test passes against existing, correct production behavior." If a written test fails against real code, treat it as a test-authoring mistake to fix, unless it reveals a genuine product bug — in that case stop and report rather than editing product code.

## Clarification assumptions

No response was received to the Stage-2 clarifying question; proceeding with the recommended default.

The standalone Favorites page (`src/pages/favorites/FavoritesPage.tsx`) and the Katas Leaderboard (`src/pages/katas/components/LeaderboardContent.tsx`) have **no pagination UI/logic in production at all**:
- Favorites page: every fetch (`fetchFavorites`, `fetchFavoriteAssistants`, `fetchFavoriteSkills`, `fetchFavoriteWorkflows`) is called with no page/perPage arguments, so it always defaults to `page=0, per_page=12` (`src/store/favorites.ts:185-262`); no `<Pagination>` component is ever imported or rendered anywhere in `FavoritesPage.tsx`.
- Katas Leaderboard: `katasStore.fetchLeaderboard()` always requests a fixed `limit=100` (`KATA_CONSTRAINTS.LEADERBOARD_LIMIT`); `LeaderboardContent` renders results through `Table` with `embedded={true}` and no `pagination` prop, and `Table` only renders its internal `Pagination` when `pagination && !embedded` (`src/components/Table/Table.tsx:211`) — so it never renders regardless of row count.

Since production changes are out of scope, AC1/2/4/5 (page-2 navigation, per-page change, previous/next disabled) cannot be literally exercised for these two areas. **Task 5 (Leaderboard) and Task 6 (Favorites page) narrow their coverage to a variant of AC3 only:** assert pagination controls never render regardless of item count, and that the fetch call always uses the fixed params. AC1/2/4/5 remain fully in scope, unmodified, for Skills tabs (Tasks 1-3) and Katas ALL_KATAS (Task 4).

Also assumed: "Katas — list and leaderboard" maps to the `ALL_KATAS` category (Task 4) and the `LEADERBOARD` category (Task 5) only. `IN_PROGRESS`/`COMPLETED` categories have `hasPagination={false}` (no pagination UI in production) and are out of scope for this sub-task.

## File Structure

- `src/pages/skills/__tests__/SkillsListPagePagination.integration.test.tsx` — new. One file, three `describe` blocks (Project / Marketplace / Favorites tabs), built incrementally across Tasks 1-3 since all three tabs render through the same `SkillsListPage` component and share fixture builders.
- `src/pages/katas/__tests__/KatasListPagination.integration.test.tsx` — new (Task 4). `ALL_KATAS` category: real pagination + URL sync.
- `src/pages/katas/__tests__/KatasLeaderboardPagination.integration.test.tsx` — new (Task 5). Narrowed coverage per Clarification assumptions.
- `src/pages/favorites/__tests__/FavoritesPagePagination.integration.test.tsx` — new (Task 6). Narrowed coverage per Clarification assumptions; covers all four filter views (`all`/`assistant`/`workflow`/`skill`).

---

## Task 1: Skills — Project tab pagination

**Files:**
- Create: `src/pages/skills/__tests__/SkillsListPagePagination.integration.test.tsx`

**Interfaces:**
- Consumes: `renderPage`, `mockAPI` from `@/test-utils/integration`; `SkillVisibility` from `@/types/entity/skill`.
- Produces: `createSkillFixture(overrides)`, `createSkills(count, namePrefix, visibility?)` fixture builders — reused by Task 2 and Task 3 in the same file.

Test-first: yes — "shows next page of project skills when pagination button is clicked" exercises the `useSkills` hook / `skillsStore.indexSkills` / nested `{data, pagination}` envelope path against pre-existing, unmodified production code. RED comes from the file not existing yet; GREEN comes from correctly mocking the real behavior (no product code changes are made in this task).

- [ ] **Step 1: Write the failing test file**

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
import { describe, it, expect, beforeEach } from 'vitest'

import { renderPage, mockAPI } from '@/test-utils/integration'
import { SkillVisibility } from '@/types/entity/skill'

const createSkillFixture = (overrides: Record<string, unknown> = {}) => ({
  id: 'skill-1',
  name: 'Skill 1',
  description: 'A test skill',
  content: 'Skill content',
  project: 'test-project',
  visibility: SkillVisibility.PROJECT,
  categories: [],
  version: '1.0.0',
  ...overrides,
})

const createSkills = (
  count: number,
  namePrefix: string,
  visibility: SkillVisibility = SkillVisibility.PROJECT
) =>
  Array.from({ length: count }, (_, i) =>
    createSkillFixture({
      id: `${namePrefix.toLowerCase()}-${i + 1}`,
      name: `${namePrefix} ${i + 1}`,
      visibility,
    })
  )

describe('SkillsListPage - Project tab - Pagination', () => {
  const user = userEvent.setup()

  beforeEach(() => {
    mockAPI('GET', 'v1/config', [])
  })

  it('shows next page of project skills when pagination button is clicked', async () => {
    mockAPI('GET', 'v1/skills', {
      data: createSkills(25, 'Project'),
      pagination: { page: 0, per_page: 12, pages: 3, total: 25 },
    })

    renderPage('/skills/project')

    await waitFor(() => {
      expect(screen.getByText('Project 1')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Page 2' })).toBeInTheDocument()
    })

    mockAPI('GET', 'v1/skills', {
      data: createSkills(25, 'Project').slice(12, 24),
      pagination: { page: 1, per_page: 12, pages: 3, total: 25 },
    })

    await user.click(screen.getByRole('button', { name: 'Page 2' }))

    await waitFor(() => {
      expect(screen.getByText('Project 13')).toBeInTheDocument()
      expect(screen.queryByText('Project 1')).not.toBeInTheDocument()
    })
  })

  it('reloads project skills when per-page selection changes', async () => {
    mockAPI('GET', 'v1/skills', {
      data: createSkills(25, 'Project'),
      pagination: { page: 0, per_page: 12, pages: 3, total: 25 },
    })

    renderPage('/skills/project')

    await waitFor(() => {
      expect(screen.getByText('Project 1')).toBeInTheDocument()
    })

    mockAPI('GET', 'v1/skills', {
      data: [createSkillFixture({ id: 'project-perpage', name: 'Project PerPage' })],
      pagination: { page: 0, per_page: 24, pages: 2, total: 25 },
    })

    const perPageSelect = document.getElementById('per-page') as HTMLElement
    fireEvent.click(perPageSelect)
    fireEvent.click(screen.getByLabelText('24 items'))

    await waitFor(() => {
      expect(screen.getByText('Project PerPage')).toBeInTheDocument()
    })

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('per_page=24'),
      expect.anything()
    )
  })

  it('does not show pagination buttons when project skills fit on one page', async () => {
    mockAPI('GET', 'v1/skills', {
      data: createSkills(6, 'Project'),
      pagination: { page: 0, per_page: 12, pages: 1, total: 6 },
    })

    renderPage('/skills/project')

    await waitFor(() => {
      expect(screen.getByText('Project 1')).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Page 2' })).not.toBeInTheDocument()
    })
  })

  it('Previous page button absent on first page for project tab', async () => {
    mockAPI('GET', 'v1/skills', {
      data: createSkills(25, 'Project'),
      pagination: { page: 0, per_page: 12, pages: 3, total: 25 },
    })

    renderPage('/skills/project')

    await waitFor(() => {
      expect(screen.getByText('Project 1')).toBeInTheDocument()
    })

    expect(screen.queryByRole('button', { name: 'Previous page' })).not.toBeInTheDocument()
  })

  it('Next page button absent on last page for project tab', async () => {
    // Project tab's "current page" is local component state (starts at 0), not the
    // API response's pagination.page — so the last page must be reached via a real
    // click, not just mocked on initial load.
    mockAPI('GET', 'v1/skills', {
      data: createSkills(25, 'Project'),
      pagination: { page: 0, per_page: 12, pages: 3, total: 25 },
    })

    renderPage('/skills/project')

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Page 3' })).toBeInTheDocument()
    })

    mockAPI('GET', 'v1/skills', {
      data: createSkills(25, 'Project').slice(24, 25),
      pagination: { page: 2, per_page: 12, pages: 3, total: 25 },
    })

    await user.click(screen.getByRole('button', { name: 'Page 3' }))

    await waitFor(() => {
      expect(screen.getByText('Project 25')).toBeInTheDocument()
    })

    expect(screen.queryByRole('button', { name: 'Next page' })).not.toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run tests to verify they pass**

Run: `npm run test:integration -- SkillsListPagePagination`
Expected: All 5 tests in the `Project tab - Pagination` describe block PASS (they characterize existing, unmodified production behavior).

> **Implementation note (Stage 4):** the initial version of this test mocked `pagination.page: 2` on first render and asserted directly — it failed, because `SkillsListPage`'s `currentPage` (fed to `<Pagination currentPage=...>`) is local `useState` starting at 0, not derived from the API response's `pagination.page`. Fixed by rendering at page 0, then clicking "Page 3" (visible immediately since `totalPages=3 <= span*2+1`) before asserting. The same fix was applied to the equivalent Marketplace and Favorites tab tests below. Katas ALL_KATAS (Task 4) does not need this fix — its `currentPage` is sourced from `katasStore.katasPagination.page`, which the store sets directly from the API response.

- [ ] **Step 3: Commit**

```bash
git add src/pages/skills/__tests__/SkillsListPagePagination.integration.test.tsx
git commit -m "EPMCDME-13480: Add pagination integration tests for Skills Project tab"
```

---

## Task 2: Skills — Marketplace tab pagination

**Files:**
- Modify: `src/pages/skills/__tests__/SkillsListPagePagination.integration.test.tsx` (append a new `describe` block after the Project tab block)

**Interfaces:**
- Consumes: `createSkillFixture`, `createSkills`, `SkillVisibility` from Task 1 (same file, already in scope).
- Produces: nothing new consumed by later tasks.

Test-first: yes — "shows next page of marketplace skills when pagination button is clicked" exercises the `MARKETPLACE` tab's `visibility=PUBLIC` filter path through the same `v1/skills` endpoint and `useSkills` hook as Project, confirming the shared-component-different-tab behavior independently (Marketplace also triggers `skillsStore.updateSkillsWithReactionStatus()`, unlike Project).

- [ ] **Step 1: Append the failing test block**

Insert immediately after the closing `})` of the `'SkillsListPage - Project tab - Pagination'` describe block:

```tsx
describe('SkillsListPage - Marketplace tab - Pagination', () => {
  const user = userEvent.setup()

  beforeEach(() => {
    mockAPI('GET', 'v1/config', [])
    mockAPI('GET', 'v1/user/reactions', { items: [] })
  })

  it('shows next page of marketplace skills when pagination button is clicked', async () => {
    mockAPI('GET', 'v1/skills', {
      data: createSkills(25, 'Marketplace', SkillVisibility.PUBLIC),
      pagination: { page: 0, per_page: 12, pages: 3, total: 25 },
    })

    renderPage('/skills/marketplace')

    await waitFor(() => {
      expect(screen.getByText('Marketplace 1')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Page 2' })).toBeInTheDocument()
    })

    mockAPI('GET', 'v1/skills', {
      data: createSkills(25, 'Marketplace', SkillVisibility.PUBLIC).slice(12, 24),
      pagination: { page: 1, per_page: 12, pages: 3, total: 25 },
    })

    await user.click(screen.getByRole('button', { name: 'Page 2' }))

    await waitFor(() => {
      expect(screen.getByText('Marketplace 13')).toBeInTheDocument()
      expect(screen.queryByText('Marketplace 1')).not.toBeInTheDocument()
    })
  })

  it('reloads marketplace skills when per-page selection changes', async () => {
    mockAPI('GET', 'v1/skills', {
      data: createSkills(25, 'Marketplace', SkillVisibility.PUBLIC),
      pagination: { page: 0, per_page: 12, pages: 3, total: 25 },
    })

    renderPage('/skills/marketplace')

    await waitFor(() => {
      expect(screen.getByText('Marketplace 1')).toBeInTheDocument()
    })

    mockAPI('GET', 'v1/skills', {
      data: [
        createSkillFixture({
          id: 'marketplace-perpage',
          name: 'Marketplace PerPage',
          visibility: SkillVisibility.PUBLIC,
        }),
      ],
      pagination: { page: 0, per_page: 24, pages: 2, total: 25 },
    })

    const perPageSelect = document.getElementById('per-page') as HTMLElement
    fireEvent.click(perPageSelect)
    fireEvent.click(screen.getByLabelText('24 items'))

    await waitFor(() => {
      expect(screen.getByText('Marketplace PerPage')).toBeInTheDocument()
    })

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('per_page=24'),
      expect.anything()
    )
  })

  it('does not show pagination buttons when marketplace skills fit on one page', async () => {
    mockAPI('GET', 'v1/skills', {
      data: createSkills(6, 'Marketplace', SkillVisibility.PUBLIC),
      pagination: { page: 0, per_page: 12, pages: 1, total: 6 },
    })

    renderPage('/skills/marketplace')

    await waitFor(() => {
      expect(screen.getByText('Marketplace 1')).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Page 2' })).not.toBeInTheDocument()
    })
  })

  it('Previous page button absent on first page for marketplace tab', async () => {
    mockAPI('GET', 'v1/skills', {
      data: createSkills(25, 'Marketplace', SkillVisibility.PUBLIC),
      pagination: { page: 0, per_page: 12, pages: 3, total: 25 },
    })

    renderPage('/skills/marketplace')

    await waitFor(() => {
      expect(screen.getByText('Marketplace 1')).toBeInTheDocument()
    })

    expect(screen.queryByRole('button', { name: 'Previous page' })).not.toBeInTheDocument()
  })

  it('Next page button absent on last page for marketplace tab', async () => {
    // "Current page" is local component state (starts at 0) — reach the last page
    // via a real click rather than mocking pagination.page on initial load.
    mockAPI('GET', 'v1/skills', {
      data: createSkills(25, 'Marketplace', SkillVisibility.PUBLIC),
      pagination: { page: 0, per_page: 12, pages: 3, total: 25 },
    })

    renderPage('/skills/marketplace')

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Page 3' })).toBeInTheDocument()
    })

    mockAPI('GET', 'v1/skills', {
      data: createSkills(25, 'Marketplace', SkillVisibility.PUBLIC).slice(24, 25),
      pagination: { page: 2, per_page: 12, pages: 3, total: 25 },
    })

    await user.click(screen.getByRole('button', { name: 'Page 3' }))

    await waitFor(() => {
      expect(screen.getByText('Marketplace 25')).toBeInTheDocument()
    })

    expect(screen.queryByRole('button', { name: 'Next page' })).not.toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run tests to verify they pass**

Run: `npm run test:integration -- SkillsListPagePagination`
Expected: All 10 tests (Project + Marketplace blocks) PASS.

- [ ] **Step 3: Commit**

```bash
git add src/pages/skills/__tests__/SkillsListPagePagination.integration.test.tsx
git commit -m "EPMCDME-13480: Add pagination integration tests for Skills Marketplace tab"
```

---

## Task 3: Skills — Favorites tab pagination

**Files:**
- Modify: `src/pages/skills/__tests__/SkillsListPagePagination.integration.test.tsx` (append a new `describe` block after Marketplace)

**Interfaces:**
- Consumes: `createSkillFixture` from Task 1 (reused as-is for favorite skill items — `favoritesStore.fetchFavoriteSkills` doesn't require `visibility` for rendering).
- Produces: none.

Test-first: yes — this tab uses a structurally different endpoint (flat `{data, page, per_page, pages, total}` envelope, `favoritesStore` instead of `skillsStore`, and requires the `features:favorites` config flag) so it must be tested against its own mocks, not reused from Tasks 1-2.

- [ ] **Step 1: Append the failing test block**

Insert immediately after the closing `})` of the `'SkillsListPage - Marketplace tab - Pagination'` describe block:

```tsx
describe('SkillsListPage - Favorites tab - Pagination', () => {
  const user = userEvent.setup()

  const mockFavoritesFeatureFlag = () =>
    mockAPI('GET', 'v1/config', [{ id: 'features:favorites', settings: { enabled: true } }])

  beforeEach(() => {
    mockAPI('GET', 'v1/user/reactions', { items: [] })
  })

  it('shows next page of favorite skills when pagination button is clicked', async () => {
    mockFavoritesFeatureFlag()
    mockAPI('GET', 'v1/preferences/test-user-id/favorites/skills', {
      data: createSkills(25, 'Favorite'),
      page: 0,
      per_page: 12,
      pages: 3,
      total: 25,
    })

    renderPage('/skills/favorites')

    await waitFor(() => {
      expect(screen.getByText('Favorite 1')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Page 2' })).toBeInTheDocument()
    })

    mockAPI('GET', 'v1/preferences/test-user-id/favorites/skills', {
      data: createSkills(25, 'Favorite').slice(12, 24),
      page: 1,
      per_page: 12,
      pages: 3,
      total: 25,
    })

    await user.click(screen.getByRole('button', { name: 'Page 2' }))

    await waitFor(() => {
      expect(screen.getByText('Favorite 13')).toBeInTheDocument()
      expect(screen.queryByText('Favorite 1')).not.toBeInTheDocument()
    })
  })

  it('reloads favorite skills when per-page selection changes', async () => {
    mockFavoritesFeatureFlag()
    mockAPI('GET', 'v1/preferences/test-user-id/favorites/skills', {
      data: createSkills(25, 'Favorite'),
      page: 0,
      per_page: 12,
      pages: 3,
      total: 25,
    })

    renderPage('/skills/favorites')

    await waitFor(() => {
      expect(screen.getByText('Favorite 1')).toBeInTheDocument()
    })

    mockAPI('GET', 'v1/preferences/test-user-id/favorites/skills', {
      data: [createSkillFixture({ id: 'favorite-perpage', name: 'Favorite PerPage' })],
      page: 0,
      per_page: 24,
      pages: 2,
      total: 25,
    })

    const perPageSelect = document.getElementById('per-page') as HTMLElement
    fireEvent.click(perPageSelect)
    fireEvent.click(screen.getByLabelText('24 items'))

    await waitFor(() => {
      expect(screen.getByText('Favorite PerPage')).toBeInTheDocument()
    })

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('per_page=24'),
      expect.anything()
    )
  })

  it('does not show pagination buttons when favorite skills fit on one page', async () => {
    mockFavoritesFeatureFlag()
    mockAPI('GET', 'v1/preferences/test-user-id/favorites/skills', {
      data: createSkills(6, 'Favorite'),
      page: 0,
      per_page: 12,
      pages: 1,
      total: 6,
    })

    renderPage('/skills/favorites')

    await waitFor(() => {
      expect(screen.getByText('Favorite 1')).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Page 2' })).not.toBeInTheDocument()
    })
  })

  it('Previous page button absent on first page for favorites tab', async () => {
    mockFavoritesFeatureFlag()
    mockAPI('GET', 'v1/preferences/test-user-id/favorites/skills', {
      data: createSkills(25, 'Favorite'),
      page: 0,
      per_page: 12,
      pages: 3,
      total: 25,
    })

    renderPage('/skills/favorites')

    await waitFor(() => {
      expect(screen.getByText('Favorite 1')).toBeInTheDocument()
    })

    expect(screen.queryByRole('button', { name: 'Previous page' })).not.toBeInTheDocument()
  })

  it('Next page button absent on last page for favorites tab', async () => {
    // "Current page" is local component state (starts at 0) — reach the last page
    // via a real click rather than mocking pagination.page on initial load.
    mockFavoritesFeatureFlag()
    mockAPI('GET', 'v1/preferences/test-user-id/favorites/skills', {
      data: createSkills(25, 'Favorite'),
      page: 0,
      per_page: 12,
      pages: 3,
      total: 25,
    })

    renderPage('/skills/favorites')

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Page 3' })).toBeInTheDocument()
    })

    mockAPI('GET', 'v1/preferences/test-user-id/favorites/skills', {
      data: createSkills(25, 'Favorite').slice(24, 25),
      page: 2,
      per_page: 12,
      pages: 3,
      total: 25,
    })

    await user.click(screen.getByRole('button', { name: 'Page 3' }))

    await waitFor(() => {
      expect(screen.getByText('Favorite 25')).toBeInTheDocument()
    })

    expect(screen.queryByRole('button', { name: 'Next page' })).not.toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run tests to verify they pass**

Run: `npm run test:integration -- SkillsListPagePagination`
Expected: All 15 tests (Project + Marketplace + Favorites) PASS.

- [ ] **Step 3: Commit**

```bash
git add src/pages/skills/__tests__/SkillsListPagePagination.integration.test.tsx
git commit -m "EPMCDME-13480: Add pagination integration tests for Skills Favorites tab"
```

---

## Task 4: Katas — ALL_KATAS list pagination (with URL sync)

**Files:**
- Create: `src/pages/katas/__tests__/KatasListPagination.integration.test.tsx`

**Interfaces:**
- Consumes: `renderPage`, `mockAPI` from `@/test-utils/integration`; `mockRouterState` from `@/hooks/__mocks__/useVueRouter`; `KataLevel`, `KataStatus`, `KataProgressStatus` from `@/types/entity/kata`.
- Produces: `createKataFixture`, `createKatas` fixture builders — local to this file (Task 5's Leaderboard file defines its own leaderboard-shaped fixtures since `LeaderboardUser` has a different shape than `AIKataListItem`).

Test-first: yes — "loads the page specified in the URL query param on initial render" exercises the 1-indexed-to-URL-sync path unique to Katas (`useKatasList`'s `getPageFromURL`/`updateURL`); Skills tabs have no equivalent, so this must be verified independently.

- [ ] **Step 1: Write the failing test file**

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
import { describe, it, expect, beforeEach, afterEach } from 'vitest'

import { mockRouterState } from '@/hooks/__mocks__/useVueRouter'
import { renderPage, mockAPI } from '@/test-utils/integration'
import { KataLevel, KataStatus, KataProgressStatus } from '@/types/entity/kata'

const createKataFixture = (overrides: Record<string, unknown> = {}) => ({
  id: 'kata-1',
  title: 'Kata 1',
  description: 'A test kata',
  level: KataLevel.BEGINNER,
  duration_minutes: 30,
  tags: [],
  status: KataStatus.PUBLISHED,
  is_published: true,
  date: '2026-01-01T00:00:00Z',
  unique_likes_count: 0,
  unique_dislikes_count: 0,
  enrollment_count: 0,
  user_progress: {
    id: null,
    user_id: 'test-user-id',
    kata_id: 'kata-1',
    status: KataProgressStatus.NOT_STARTED,
    started_at: null,
    completed_at: null,
    user_reaction: null,
  },
  ...overrides,
})

const createKatas = (count: number) =>
  Array.from({ length: count }, (_, i) =>
    createKataFixture({ id: `kata-${i + 1}`, title: `Kata ${i + 1}` })
  )

describe('KatasPage - ALL_KATAS - Pagination', () => {
  const user = userEvent.setup()

  beforeEach(() => {
    mockRouterState.push.mockClear()
    mockRouterState.replace.mockClear()
    ;(mockRouterState as any).query = {}
    ;(mockRouterState.currentRoute.value as any).query = {}
    mockAPI('GET', 'v1/katas/tags', [])
    mockAPI('GET', 'v1/katas/roles', [])
  })

  afterEach(() => {
    ;(mockRouterState as any).query = {}
    ;(mockRouterState.currentRoute.value as any).query = {}
  })

  it('shows next page of katas when pagination button is clicked and updates the URL', async () => {
    // useKatasList's own DEFAULT_PER_PAGE (12) — not KATA_CONSTRAINTS.DEFAULT_PER_PAGE (20) —
    // is what its updateURL() compares against to decide whether to include per_page in the
    // query string. Using per_page=12 here keeps the URL assertion focused on the `page` param.
    mockAPI('GET', 'v1/katas', {
      data: createKatas(25),
      pagination: { page: 1, per_page: 12, pages: 3, total: 25 },
    })

    renderPage('/katas')

    await waitFor(() => {
      expect(screen.getByText('Kata 1')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Page 2' })).toBeInTheDocument()
    })

    mockAPI('GET', 'v1/katas', {
      data: createKatas(25).slice(12, 24),
      pagination: { page: 2, per_page: 12, pages: 3, total: 25 },
    })

    await user.click(screen.getByRole('button', { name: 'Page 2' }))

    await waitFor(() => {
      expect(screen.getByText('Kata 13')).toBeInTheDocument()
      expect(screen.queryByText('Kata 1')).not.toBeInTheDocument()
      expect(mockRouterState.replace).toHaveBeenCalledWith({ query: { page: '2' } })
    })
  })

  it('reloads katas when per-page selection changes and updates the URL', async () => {
    mockAPI('GET', 'v1/katas', {
      data: createKatas(25),
      pagination: { page: 1, per_page: 20, pages: 2, total: 25 },
    })

    renderPage('/katas')

    await waitFor(() => {
      expect(screen.getByText('Kata 1')).toBeInTheDocument()
    })

    mockAPI('GET', 'v1/katas', {
      data: [createKataFixture({ id: 'kata-perpage', title: 'Kata PerPage' })],
      pagination: { page: 1, per_page: 45, pages: 1, total: 25 },
    })

    const perPageSelect = document.getElementById('per-page') as HTMLElement
    fireEvent.click(perPageSelect)
    fireEvent.click(screen.getByLabelText('45 items'))

    await waitFor(() => {
      expect(screen.getByText('Kata PerPage')).toBeInTheDocument()
      expect(mockRouterState.replace).toHaveBeenCalledWith({ query: { per_page: '45' } })
    })

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('per_page=45'),
      expect.anything()
    )
  })

  it('does not show pagination buttons when katas fit on one page', async () => {
    mockAPI('GET', 'v1/katas', {
      data: createKatas(6),
      pagination: { page: 1, per_page: 20, pages: 1, total: 6 },
    })

    renderPage('/katas')

    await waitFor(() => {
      expect(screen.getByText('Kata 1')).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Page 2' })).not.toBeInTheDocument()
    })
  })

  it('Previous page button absent on first page', async () => {
    mockAPI('GET', 'v1/katas', {
      data: createKatas(25),
      pagination: { page: 1, per_page: 20, pages: 2, total: 25 },
    })

    renderPage('/katas')

    await waitFor(() => {
      expect(screen.getByText('Kata 1')).toBeInTheDocument()
    })

    expect(screen.queryByRole('button', { name: 'Previous page' })).not.toBeInTheDocument()
  })

  it('Next page button absent on last page', async () => {
    mockAPI('GET', 'v1/katas', {
      data: createKatas(25).slice(20, 25),
      pagination: { page: 2, per_page: 20, pages: 2, total: 25 },
    })

    renderPage('/katas')

    await waitFor(() => {
      expect(screen.getByText('Kata 21')).toBeInTheDocument()
    })

    expect(screen.queryByRole('button', { name: 'Next page' })).not.toBeInTheDocument()
  })

  it('loads the page specified in the URL query param on initial render', async () => {
    mockAPI('GET', 'v1/katas', {
      data: createKatas(25).slice(20, 25),
      pagination: { page: 2, per_page: 20, pages: 2, total: 25 },
    })
    ;(mockRouterState as any).query = { page: '2' }
    ;(mockRouterState.currentRoute.value as any).query = { page: '2' }

    renderPage('/katas')

    await waitFor(() => {
      expect(screen.getByText('Kata 21')).toBeInTheDocument()
      expect(screen.queryByText('Kata 1')).not.toBeInTheDocument()
    })
  })
})
```

- [ ] **Step 2: Run tests to verify they pass**

Run: `npm run test:integration -- KatasListPagination`
Expected: All 6 tests PASS.

> **Implementation notes (Stage 4):** two issues surfaced while running this file, both fixed in the test file, not production code:
> 1. `KataFilters` (rendered in `KatasPage`'s sidebar) fetches `v1/katas/tags` and `v1/katas/roles` on mount via `katasStore.fetchKataTags()`/`fetchKataRoles()`; neither has a `globalDefaults` entry, so an unmocked request resolves to `null` and `availableRoles.map(...)` in `KataFilters.tsx:123` throws, crashing the whole page. Fixed by mocking both to `[]` in `beforeEach`.
> 2. The "shows next page…and updates the URL" test initially used `per_page: 20` (matching `KATA_CONSTRAINTS.DEFAULT_PER_PAGE`) and asserted `mockRouterState.replace` was called with only `{ page: '2' }` — it failed, because `useKatasList.ts` has its own local `DEFAULT_PER_PAGE = 12` (distinct from the store's constant) that `updateURL()` compares against to decide whether to add `per_page` to the query string. Since `20 !== 12`, `per_page=20` was included too. Fixed by using `per_page: 12` in this test's fixtures so the assertion isolates the `page` param only; the separate per-page-change test already covers `per_page` appearing in the URL when it genuinely changes.

- [ ] **Step 3: Commit**

```bash
git add src/pages/katas/__tests__/KatasListPagination.integration.test.tsx
git commit -m "EPMCDME-13480: Add pagination integration tests for Katas list"
```

---

## Task 5: Katas — Leaderboard pagination (narrowed, per Clarification assumptions)

**Files:**
- Create: `src/pages/katas/__tests__/KatasLeaderboardPagination.integration.test.tsx`

**Interfaces:**
- Consumes: `renderPage`, `mockAPI` from `@/test-utils/integration`.
- Produces: none.

Test-first: yes — "never renders pagination controls regardless of row count" is the narrowed AC3 variant that replaces AC1/2/4/5 for this area (see Clarification assumptions above). Assertions target the rank badge text (`#1`) rather than `user_name`/`username`, since `LeaderboardContent`'s column key (`user_name`) does not match the `LeaderboardUser` type's actual field (`username`) — a pre-existing production inconsistency that is out of scope to fix here, so tests must not depend on it.

- [ ] **Step 1: Write the failing test file**

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
import { describe, it, expect, beforeEach } from 'vitest'

import { renderPage, mockAPI } from '@/test-utils/integration'

const createLeaderboardFixture = (overrides: Record<string, unknown> = {}) => ({
  user_id: 'user-1',
  username: 'user-1',
  completed_count: 3,
  in_progress_count: 1,
  rank: 1,
  ...overrides,
})

const createLeaderboard = (count: number) =>
  Array.from({ length: count }, (_, i) =>
    createLeaderboardFixture({
      user_id: `user-${i + 1}`,
      username: `user-${i + 1}`,
      rank: i + 1,
    })
  )

describe('KatasPage - Leaderboard - Pagination (narrowed: no pagination UI in production)', () => {
  beforeEach(() => {
    mockAPI('GET', 'v1/config', [])
  })

  it('never renders pagination controls when the leaderboard has many rows', async () => {
    mockAPI('GET', 'v1/katas/leaderboard', createLeaderboard(150))

    renderPage('/katas/leaderboard')

    await waitFor(() => {
      expect(screen.getByText('#1')).toBeInTheDocument()
    })

    expect(screen.queryByRole('button', { name: 'Page 2' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Previous page' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Next page' })).not.toBeInTheDocument()
  })

  it('never renders pagination controls when the leaderboard has few rows', async () => {
    mockAPI('GET', 'v1/katas/leaderboard', createLeaderboard(3))

    renderPage('/katas/leaderboard')

    await waitFor(() => {
      expect(screen.getByText('#1')).toBeInTheDocument()
    })

    expect(screen.queryByRole('button', { name: 'Page 2' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Previous page' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Next page' })).not.toBeInTheDocument()
  })

  it('always requests the leaderboard with the fixed limit of 100', async () => {
    mockAPI('GET', 'v1/katas/leaderboard', createLeaderboard(10))

    renderPage('/katas/leaderboard')

    await waitFor(() => {
      expect(screen.getByText('#1')).toBeInTheDocument()
    })

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('limit=100'),
      expect.anything()
    )
  })
})
```

- [ ] **Step 2: Run tests to verify they pass**

Run: `npm run test:integration -- KatasLeaderboardPagination`
Expected: All 3 tests PASS.

- [ ] **Step 3: Commit**

```bash
git add src/pages/katas/__tests__/KatasLeaderboardPagination.integration.test.tsx
git commit -m "EPMCDME-13480: Add narrowed pagination tests for Katas Leaderboard"
```

---

## Task 6: Favorites standalone page (narrowed, per Clarification assumptions)

**Files:**
- Create: `src/pages/favorites/__tests__/FavoritesPagePagination.integration.test.tsx`

**Interfaces:**
- Consumes: `renderPage`, `mockAPI` from `@/test-utils/integration`.
- Produces: none.

Test-first: yes — one test per filter view (`all`/`assistant`/`workflow`/`skill`), each asserting the narrowed AC3 variant: no pagination controls ever render, and the fetch always uses the fixed `page=0&per_page=12` params, regardless of how many items or pages the mocked backend response claims to have.

- [ ] **Step 1: Write the failing test file**

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
import { describe, it, expect, beforeEach } from 'vitest'

import { renderPage, mockAPI } from '@/test-utils/integration'

const createAssistantFixture = (overrides: Record<string, unknown> = {}) => ({
  id: 'assistant-1',
  name: 'Assistant 1',
  slug: 'assistant-1',
  description: 'Test description',
  is_global: false,
  shared: false,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  system_prompt: 'You are a helpful assistant',
  llm_model_type: 'gpt-4',
  mcp_servers: [],
  system_prompt_history: [],
  guardrail_assignments: [],
  is_liked: false,
  is_disliked: false,
  is_favorited: true,
  is_pinned: false,
  unique_likes_count: 0,
  unique_dislikes_count: 0,
  user_abilities: ['read', 'write'],
  ...overrides,
})

const createSkillFixture = (overrides: Record<string, unknown> = {}) => ({
  id: 'skill-1',
  name: 'Skill 1',
  description: 'A test skill',
  content: 'Skill content',
  project: 'test-project',
  visibility: 'project',
  categories: [],
  version: '1.0.0',
  is_favorited: true,
  ...overrides,
})

const createWorkflowFixture = (overrides: Record<string, unknown> = {}) => ({
  id: 'workflow-1',
  name: 'Workflow 1',
  slug: 'workflow-1',
  description: 'Test workflow description',
  is_global: false,
  shared: false,
  is_favorited: true,
  update_date: '2024-01-01T00:00:00Z',
  yaml_config: 'test: config',
  yaml_config_history: [],
  user_abilities: ['read', 'write', 'delete'],
  unique_users_count: 5,
  ...overrides,
})

const createItems = (
  factory: (overrides: Record<string, unknown>) => Record<string, unknown>,
  count: number,
  namePrefix: string
) =>
  Array.from({ length: count }, (_, i) =>
    factory({ id: `${namePrefix.toLowerCase()}-${i + 1}`, name: `${namePrefix} ${i + 1}` })
  )

describe('FavoritesPage - Pagination (narrowed: no pagination UI in production)', () => {
  beforeEach(() => {
    mockAPI('GET', 'v1/config', [])
  })

  it('never shows pagination controls and always fetches fixed page=0&per_page=12 for the "all" view', async () => {
    mockAPI('GET', 'v1/preferences/test-user-id/favorites/assistants', {
      data: createItems(createAssistantFixture, 25, 'Assistant'),
      page: 0,
      per_page: 12,
      pages: 3,
      total: 25,
    })
    mockAPI('GET', 'v1/preferences/test-user-id/favorites/skills', {
      data: createItems(createSkillFixture, 25, 'Skill'),
      page: 0,
      per_page: 12,
      pages: 3,
      total: 25,
    })
    mockAPI('GET', 'v1/preferences/test-user-id/favorites/workflows', {
      data: createItems(createWorkflowFixture, 25, 'Workflow'),
      page: 0,
      per_page: 12,
      pages: 3,
      total: 25,
    })
    mockAPI('GET', 'v1/user/reactions', { items: [] })

    renderPage('/favorites')

    await waitFor(() => {
      expect(screen.getByText('Assistant 1')).toBeInTheDocument()
    })

    expect(screen.queryByRole('button', { name: 'Page 2' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Previous page' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Next page' })).not.toBeInTheDocument()
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/favorites/assistants?page=0&per_page=12'),
      expect.anything()
    )
  })

  it('never shows pagination controls and always fetches fixed page=0&per_page=12 for the "assistant" view', async () => {
    mockAPI('GET', 'v1/preferences/test-user-id/favorites/assistants', {
      data: createItems(createAssistantFixture, 25, 'Assistant'),
      page: 0,
      per_page: 12,
      pages: 3,
      total: 25,
    })

    renderPage('/favorites/assistants')

    await waitFor(() => {
      expect(screen.getByText('Assistant 1')).toBeInTheDocument()
    })

    expect(screen.queryByRole('button', { name: 'Page 2' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Previous page' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Next page' })).not.toBeInTheDocument()
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/favorites/assistants?page=0&per_page=12'),
      expect.anything()
    )
  })

  it('never shows pagination controls and always fetches fixed page=0&per_page=12 for the "skill" view', async () => {
    mockAPI('GET', 'v1/preferences/test-user-id/favorites/skills', {
      data: createItems(createSkillFixture, 25, 'Skill'),
      page: 0,
      per_page: 12,
      pages: 3,
      total: 25,
    })
    mockAPI('GET', 'v1/user/reactions', { items: [] })

    renderPage('/favorites/skills')

    await waitFor(() => {
      expect(screen.getByText('Skill 1')).toBeInTheDocument()
    })

    expect(screen.queryByRole('button', { name: 'Page 2' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Previous page' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Next page' })).not.toBeInTheDocument()
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/favorites/skills?page=0&per_page=12'),
      expect.anything()
    )
  })

  it('never shows pagination controls and always fetches fixed page=0&per_page=12 for the "workflow" view', async () => {
    mockAPI('GET', 'v1/preferences/test-user-id/favorites/workflows', {
      data: createItems(createWorkflowFixture, 25, 'Workflow'),
      page: 0,
      per_page: 12,
      pages: 3,
      total: 25,
    })

    renderPage('/favorites/workflows')

    await waitFor(() => {
      expect(screen.getByText('Workflow 1')).toBeInTheDocument()
    })

    expect(screen.queryByRole('button', { name: 'Page 2' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Previous page' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Next page' })).not.toBeInTheDocument()
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/favorites/workflows?page=0&per_page=12'),
      expect.anything()
    )
  })
})
```

- [ ] **Step 2: Run tests to verify they pass**

Run: `npm run test:integration -- FavoritesPagePagination`
Expected: All 4 tests PASS.

- [ ] **Step 3: Commit**

```bash
git add src/pages/favorites/__tests__/FavoritesPagePagination.integration.test.tsx
git commit -m "EPMCDME-13480: Add narrowed pagination tests for standalone Favorites page"
```

---

## Final Verification

- [ ] **Run the full integration suite**

Run: `npm run test:integration`
Expected: All new tests pass; no regressions in existing integration tests (Assistants/Workflows templates, favorites tabs, etc.). This satisfies AC6.

- [ ] **Confirm no production files were touched**

Run: `git diff --stat main -- . ':(exclude)docs/superpowers'`
Expected: Only the four new test files listed under File Structure appear (plus this task's own `docs/superpowers/tasks/...` planning artifacts, excluded from the diffstat check above).
