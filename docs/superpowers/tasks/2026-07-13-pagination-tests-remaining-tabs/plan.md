# Plan — EPMCDME-13479: Pagination tests: Assistants & Workflows remaining tabs

**Sub-task of**: EPMCDME-5727 — Add tests for pagination on all tabs
**Scope**: Integration tests only, characterizing existing pagination behavior. No production code changes.

## Requirements (from ticket + parent)

Add pagination coverage for three tabs that currently only have non-pagination smoke tests:

1. Assistants **Marketplace** tab (`/assistants/marketplace`)
2. Assistants **Favorites** tab (`/assistants/favorites`) — the tab inside the Assistants list page, not the standalone `/favorites/assistants` page
3. Workflows **Favorites** tab (`/workflows/favorites`) — the tab inside the Workflows list page, not the standalone `/favorites/workflows` page

For each tab, assert:
- page-2 navigation loads the next page
- per-page change reloads with the new page size
- pagination controls are hidden when items fit on one page
- Previous button is absent on the first page
- Next button is absent on the last page

Follow the `renderPage()` / `mockAPI()` pattern from `AssistantTemplatesPagination.integration.test.tsx`. Do not touch `src/test-utils/integration.tsx` or `_mock-state.ts`. All tests must pass under `npm run test:integration`.

## Key facts from research (see `technical-analysis.md`)

- **Response envelope differs by tab.** Marketplace/default assistants and all workflows scopes use the nested envelope `{ data, pagination: { page, per_page, pages, total } }`. Both Favorites endpoints (`v1/preferences/{userId}/favorites/assistants|workflows`) return a **flat** envelope `{ data, page, per_page, pages, total }` — no `pagination` wrapper. Fixtures must match the shape for the tab under test.
- **Favorites tabs do not sync pagination to the router.** `useAssistantsList` skips `updateURL` for `isFavoritesScope`; `useFavoriteWorkflows.handleFavoritesPageChange` is pure local `useState` with no router call. Do **not** assert `mockRouterState.push`/`.replace` in the two Favorites tests — that would assert behavior that doesn't happen.
- **Marketplace tab (Assistants) does sync to the router** (same code path as the default/PROJECT tab), consistent with the existing `'changes page when pagination button clicked'` test for the PROJECT tab, which does not assert router calls either — mirror that same level of assertion (fetch + rendered content), no need to add new router assertions since that's not part of this ticket's AC.
- **Pagination "disabled" is DOM absence, not an HTML `disabled` attribute.** `Previous page` button only renders when `currentPage !== 0`; `Next page` only when `currentPage !== totalPages - 1`; the whole `<nav>` (and thus all page buttons) is entirely absent when `totalPages <= 1`. Assertions must use `queryByRole(...).not.toBeInTheDocument()`.
- **Per-page select interaction pattern** (no existing integration-test precedent, but a direct component-test precedent in `src/components/Pagination/__tests__/Pagination.test.tsx`): locate the select via `document.getElementById('per-page')`, `fireEvent.click` it to open the PrimeReact panel (portaled to `document.body`), then `fireEvent.click(screen.getByLabelText('24 items'))` to choose the 24-per-page option. Use `fireEvent`, not `userEvent`, for this interaction — no existing test drives this Dropdown via `userEvent`, and the PrimeReact overlay is known to need the plain `fireEvent` path used in the component test.
- **Favorites feature flag**: both Favorites tabs require `mockAPI('GET', 'v1/config', [{ id: 'features:favorites', settings: { enabled: true } }])` or the tab/data won't render, matching the existing Favorites smoke tests in both files.
- **Workflows test file runs under fake timers** (`vi.useFakeTimers({ shouldAdvanceTime: true })` in `beforeEach`). Any new Workflows-file test that uses `userEvent` must go through the file's local `setupUser()` helper, not a bare `userEvent.setup()`.
- **`v1/user` default mock** already returns `user_id: 'test-user-id'` globally (per existing Favorites smoke tests, which don't remock `v1/user`), so favorites endpoint URLs can be mocked directly at `v1/preferences/test-user-id/favorites/assistants|workflows` without an extra `v1/user` mock, unless a test needs to override it.
- **Existing single-page fixtures for these tabs must not be modified** (would reduce/alter existing coverage) — add new `it` blocks with larger, dedicated fixtures instead.
- Per-page options come from `DEFAULT_PAGINATION_OPTIONS` (`src/constants/index.ts`): `12` (default), `24`, `45`, `90` — labelled `"12 items"`, `"24 items"`, etc. Tests will switch from the default 12 to 24.

## File-by-file task breakdown

### `src/pages/assistants/__tests__/AssistantsListPage.integration.test.tsx`

Add a new `describe('Marketplace Pagination')` block and a new `describe('Favorites Pagination')` block (new top-level describes, alongside the existing `Filters and Pagination` describe which only covers the PROJECT tab). Reuse the file's existing `createAssistantFixture` helper; add a local `createAssistants(count, prefix)` factory for bulk fixtures, mirroring `AssistantTemplatesPagination.integration.test.tsx`'s `createTemplates`.

**Task 1 — Marketplace: page-2 navigation loads the next page**
Test-first: yes — write `it('shows next page of marketplace assistants when pagination button is clicked')` against `mockAPI('GET', 'v1/assistants', { data: createAssistants(25, 'Marketplace'), pagination: { page: 0, per_page: 12, pages: 3, total: 25 } })` on `/assistants/marketplace`; click `Page 2`; remock page-2 data; assert page-2 item visible and page-1 item gone. Run it — it must pass against current app behavior (this is a characterization test, so "RED" means the test is miswritten, not that production code is broken); fix the test until green.

**Task 2 — Marketplace: per-page change reloads with the new size**
Test-first: yes — `it('reloads marketplace assistants when per-page selection changes')`: mock 25-item page-1 response, `document.getElementById('per-page')` → `fireEvent.click` → `fireEvent.click(screen.getByLabelText('24 items'))`; remock the endpoint (before or via chained mock) with a distinct 24-per-page dataset; assert the newly mocked distinct item renders (proving reload) and that a fetch call occurred with `per_page=24` in the URL.

**Task 3 — Marketplace: pagination controls hidden when items fit on one page**
Test-first: yes — `it('does not show pagination buttons when marketplace assistants fit on one page')`: mock `pages: 1, total: 6` (6 assistants); assert `queryByRole('button', { name: 'Page 2' })` absent.

**Task 4 — Marketplace: Previous button absent on first page**
Test-first: yes — `it('Previous page button absent on first page for marketplace')`: mock `page: 0, pages: 3, total: 25`; render `/assistants/marketplace`; assert `queryByRole('button', { name: 'Previous page' })` absent.

**Task 5 — Marketplace: Next button absent on last page**
Test-first: yes — `it('Next page button absent on last page for marketplace')`: mock the initial `v1/assistants` response with `pagination: { page: 2, per_page: 12, pages: 3, total: 25 }` directly (stores trust the response's `page` field verbatim — confirmed via `src/store/assistants.ts`/`favorites.ts`, both do `page: data.page ?? page`; no real navigation or router-query seeding needed, matching the existing Workflows ALL-tab `'Next page button absent on last page'` precedent at line 742); render `/assistants/marketplace`; assert `queryByRole('button', { name: 'Next page' })` absent.

**Task 6 — Favorites: page-2 navigation loads the next page**
Test-first: yes — `it('shows next page of favorite assistants when pagination button is clicked')`: mock `v1/config` with `features:favorites` enabled, and `v1/preferences/test-user-id/favorites/assistants` with the **flat** envelope `{ data: createAssistants(25, 'Favorite'), page: 0, per_page: 12, pages: 3, total: 25 }` on `/assistants/favorites`; click `Page 2`; remock; assert page-2 item visible, page-1 item gone. Do **not** assert `mockRouterState` calls.

**Task 7 — Favorites: per-page change reloads with the new size**
Test-first: yes — same per-page interaction as Task 2, against the flat favorites envelope.

**Task 8 — Favorites: pagination controls hidden when items fit on one page**
Test-first: yes — flat envelope with `pages: 1, total: 6`; assert `Page 2` button absent.

**Task 9 — Favorites: Previous button absent on first page**
Test-first: yes — flat envelope `page: 0, pages: 3, total: 25`; assert `Previous page` absent.

**Task 10 — Favorites: Next button absent on last page**
Test-first: yes — mock the initial `v1/preferences/test-user-id/favorites/assistants` response directly with the flat envelope `{ data, page: 2, per_page: 12, pages: 3, total: 25 }` (same page-field-trusted-verbatim behavior as Task 5, confirmed in `favoritesStore.fetchFavoriteAssistants`); render `/assistants/favorites`; assert `Next page` absent. No real navigation needed — this also sidesteps the local-state-only / no-URL-sync constraint entirely.

### `src/pages/workflows/__tests__/WorkflowsListPage.integration.test.tsx`

Add a new `describe('Favorites Pagination')` block near the existing `describe('Favorites List Loading')` block. Reuse `createWorkflowFixture`; add a local `createWorkflows(count, prefix)` bulk factory. All `it` blocks here use `const user = setupUser()` (fake timers are active file-wide).

**Task 11 — Workflows Favorites: page-2 navigation loads the next page**
Test-first: yes — `it('shows next page of favorite workflows when pagination button is clicked')`: mock `v1/config` favorites flag enabled, `v1/preferences/test-user-id/favorites/workflows` flat envelope `{ data: createWorkflows(25, 'Favorite'), page: 0, per_page: 12, pages: 3, total: 25 }` on `/workflows/favorites`; click `Page 2`; remock; assert page-2 item visible, page-1 item gone.

**Task 12 — Workflows Favorites: per-page change reloads with the new size**
Test-first: yes — same per-page pattern as Task 2/7, scoped to the workflows favorites flat envelope; use `fireEvent` for the Select interaction (fake timers don't affect `fireEvent`).

**Task 13 — Workflows Favorites: pagination controls hidden when items fit on one page**
Test-first: yes — flat envelope `pages: 1, total: 6`; assert `Page 2` absent.

**Task 14 — Workflows Favorites: Previous button absent on first page**
Test-first: yes — flat envelope `page: 0, pages: 3, total: 25`; assert `Previous page` absent.

**Task 15 — Workflows Favorites: Next button absent on last page**
Test-first: yes — **RED found during implementation**: unlike Assistants Favorites and the Workflows ALL/MY/MARKETPLACE scopes, `WorkflowsList.tsx` feeds `currentPage={isFavorites ? favoritesPage : activePagination.page}` — for the Favorites tab `favoritesPage` is `useFavoriteWorkflows`'s local click-driven `useState`, not derived from the fetched response's `page` field. Mocking `page: 2` directly in the initial response left `Next page` still rendered (currentPage stayed 0). Fixed by mocking `pages: 3` initially, clicking `Page 3` for real, remocking the last-page response, then asserting `Next page` absent — same approach as the original plan draft, now confirmed necessary specifically for this tab.

## Out of scope (explicitly, per ticket)

- Workflows Marketplace tab pagination (not listed in this sub-task's scope).
- The standalone `/favorites/assistants` and `/favorites/workflows` pages (`src/pages/favorites/FavoritesPage.tsx`) — no test file exists for them and none should be created here.
- AWS Integration "Load more" cursor pagination (separate sub-task EPMCDME-13483).
- Any production code change to `Pagination.tsx`, `useAssistantsList.tsx`, `useFavoriteWorkflows.ts`, or the stores.
- Modifying `src/test-utils/integration.tsx` or `_mock-state.ts`.

## Validation

- `npm run test:integration -- AssistantsListPage WorkflowsListPage` locally per file while iterating.
- Full `npm run test:integration` before handoff (qa-gates will also run this).
