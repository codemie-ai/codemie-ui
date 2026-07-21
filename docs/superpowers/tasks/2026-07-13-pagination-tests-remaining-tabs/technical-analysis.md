# Technical Research

**Task**: EPMCDME-13479 — Pagination tests: Assistants & Workflows remaining tabs
**Generated**: 2026-07-13
**Research path**: filesystem (codegraph MCP tool not available in this environment)

---

## 1. Original Context

EPMCDME-13479 — Pagination tests: Assistants & Workflows remaining tabs (sub-task of EPMCDME-5727 "Add tests for pagination on all tabs").

Scope: Add integration tests only, characterizing EXISTING pagination behavior — no production code changes.

Follow the established pattern in: src/pages/assistants/__tests__/AssistantTemplatesPagination.integration.test.tsx (mount real page via renderPage(), mock the list endpoint with mockAPI(), use a fixture larger than one page, assert pagination behavior).

Extend these two files:
- src/pages/assistants/__tests__/AssistantsListPage.integration.test.tsx
- src/pages/workflows/__tests__/WorkflowsListPage.integration.test.tsx

To cover pagination for these tabs (page-number pagination via the shared Pagination/Table component, NOT the AWS "Load more" cursor mechanism which is out of scope):
1. Assistants Marketplace tab
2. Assistants Favorites tab — the Favorites TAB inside the Assistants list page (not the standalone Favorites page elsewhere in the app)
3. Workflows Favorites tab — same caveat, the tab inside the Workflows list page

For each of the 3 tabs, tests must assert:
- page-2 navigation loads the next page
- per-page change reloads with the new page size
- pagination controls are hidden/disabled when items fit on one page
- Previous is disabled on the first page, Next is disabled on the last page

Constraints: Do NOT modify src/test-utils/integration.tsx or _mock-state.ts (shared test infra). Tests must pass under `npm run test:integration`.

---

## 2. Codebase Findings

### Existing Implementations

**Assistants list page**
- `src/pages/assistants/AssistantsListPage.tsx` — hosts the tabbed list page. Tab → scope mapping (around line 53):
  ```tsx
  [AssistantTab.MARKETPLACE]: ASSISTANT_INDEX_SCOPES.MARKETPLACE,
  [AssistantTab.FAVORITES]: ASSISTANT_INDEX_SCOPES.FAVORITES,
  ```
  `isTemplate` / `isFavorites` booleans derived from `currentTabId`. Two `<Pagination>` blocks are rendered: one for non-template tabs guarded by `{!!assistants.length && !isTemplate}` (this block serves PROJECT/default, MARKETPLACE, and FAVORITES tabs alike — line ~212), and one for TEMPLATES guarded by `{isTemplate}` (line ~224, already covered by the reference file).
- `src/pages/assistants/hooks/useAssistantsList.tsx` — pagination/URL-sync logic. **Key behavior difference for Favorites**: `isFavoritesScope = scope === ASSISTANT_INDEX_SCOPES.FAVORITES`. When `isFavoritesScope` is true:
  - Initial page/perPage is NOT read from the URL query string (`if (shouldLoadFromURL && !isFavoritesScope)`).
  - The URL is NOT updated after a page/perPage change (`if (!isFavoritesScope && ...) { updateURL(...) }`).
  This means, unlike the default/Marketplace tabs, the **Favorites tab's pagination state is not synced to the router** — no `mockRouterState.replace` assertions apply to it.
- `src/store/assistants.ts` (`indexAssistants`, referenced by explore agent, lines ~223-277) — backs both default and MARKETPLACE scopes via `GET v1/assistants` returning `{ data, pagination: { page, per_page, pages, total } }` (0-indexed `page`).
- `src/store/favorites.ts` — `fetchFavoriteAssistants` (lines ~185-209) — backs the Favorites tab via `GET v1/preferences/${userId}/favorites/assistants?page=&per_page=...`, response shape is **flat**: `{ data, page, per_page, pages, total }` (NOT nested under a `pagination` key — this differs from the marketplace/default response shape).

**Workflows list page**
- `src/pages/workflows/components/WorkflowsList.tsx` — single `<Pagination>` (line ~310) shared across ALL/MY/MARKETPLACE and FAVORITES scopes:
  ```tsx
  currentPage={isFavorites ? favoritesPage : activePagination.page}
  totalPages={activePagination.totalPages}
  perPage={activePagination.perPage}
  setPage={isFavorites ? handleFavoritesPageChange : setPage}
  ```
  `isFavorites = scope === WORKFLOW_LIST_SCOPE.FAVORITES`. Guard: `{activePagination.totalCount > 0 && ...}` renders the count text, and `Pagination` is rendered regardless but self-hides via `totalPages <= 1`.
- `src/pages/workflows/hooks/useFavoriteWorkflows.ts` — manages Favorites-tab pagination as **local React state** (`favoritesPage`/`favoritesPerPage` via `useState`), calling `favoritesStore.fetchFavoriteWorkflows(filters, page, perPage)` in a `useEffect`. `handleFavoritesPageChange(page, newPerPage?)` just updates local state — **no `router.push`/`router.replace` call at all**. This is a structural difference from the ALL/MY/MARKETPLACE tabs, whose `setPage` (defined inline in `WorkflowsList.tsx`, line ~126) calls `workflowsStore.setWorkflowsPagination(page, perPage)` and (per existing tests) does push router query updates (`page`, `perPage` keys).
- `src/store/favorites.ts` — `fetchFavoriteWorkflows` (lines ~242-262) — `GET v1/preferences/${userId}/favorites/workflows?page=&per_page=...`, response is **flat**: `{ data, page, per_page, pages, total }`, same shape family as assistants favorites.

### Architecture and Layers Affected

- **UI/Page layer**: `AssistantsListPage.tsx`, `WorkflowsList.tsx` (within `WorkflowsListPage.tsx`'s route tree) — tab rendering, `<Pagination>` wiring.
- **Hook layer**: `useAssistantsList.tsx`, `useFavoriteWorkflows.ts` — pagination state, URL sync (or lack thereof for favorites).
- **Store layer (Valtio)**: `src/store/assistants.ts`, `src/store/workflows.ts`, `src/store/favorites.ts` — fetch orchestration and pagination state shape.
- **Shared component**: `src/components/Pagination/Pagination.tsx` — renders page buttons / per-page select; behavior is identical across all tabs (see Section 2.4). No production code in any of these layers should be touched — this task is test-only.

### Integration Points

- Assistants Marketplace/default tabs → `GET v1/assistants` (envelope: `{ data, pagination: {...} }`).
- Assistants Favorites tab → `GET v1/preferences/{userId}/favorites/assistants` (flat: `{ data, page, per_page, pages, total }`); depends on `v1/user` (for `userId`, defaults to `test-user-id` in global setup) and `v1/config` (feature flag `features:favorites` must be enabled, or component may not render the tab/data — existing tests explicitly mock this).
- Workflows ALL/MY/MARKETPLACE tabs → `GET v1/workflows` (envelope: `{ data, pagination: {...} }`).
- Workflows Favorites tab → `GET v1/preferences/{userId}/favorites/workflows` (flat: `{ data, page, per_page, pages, total }`); same `v1/config` feature-flag dependency.
- Router: `src/router.tsx` defines the tab routes used by `renderPage`:
  - `assistants/marketplace` (id `assistants-marketplace`, inferred from tab-scope map; confirm route path string matches `/assistants/marketplace` used in existing tests)
  - `assistants/favorites` (line 204) → `/assistants/favorites`
  - `workflows/favorites` (line 359) → `/workflows/favorites`
  - Distinct standalone routes exist and must NOT be confused with the above: `favorites/assistants` (line 618, id `favorites-assistants`) and `favorites/workflows` (line 623, id `favorites-workflows`) which back the **separate** `FavoritesPage` (`src/pages/favorites/FavoritesPage.tsx`). No test file currently exists for that standalone page — out of scope, do not create one.

### Patterns and Conventions

- Tabs are switched purely by `renderPage('/assistants/<tab-path>')` / `renderPage('/workflows/<tab-path>')` — no test clicks a tab UI element. This is the consistent, exclusive pattern across both existing files.
- `mockAPI('GET', url, data)` without a 4th arg does path-prefix matching (ignores query string), so a single `mockAPI` call is normally enough per test setup; a second `mockAPI` call with new data before a page-2 click updates what the next fetch returns.
- Fixture factories are per-file, counter-based (`createAssistantFixture`/`createWorkflowFixture` with `overrides`), consistent with the reference file's `createTemplateFixture`.
- `Previous`/`Next` "disabled" is actually **conditional absence** from the DOM, not an HTML `disabled` attribute — confirmed in `Pagination.tsx`:
  - `{currentPage !== 0 && <button aria-label="Previous page">...}`
  - `{currentPage !== totalPages - 1 && <button aria-label="Next page">...}`
  - Whole component returns `null` when `totalPages <= 1` (this is the "hidden when one page" behavior).
  - Per-page `<Select>` only renders `{perPage && (...)}`; on change it calls `setPage(0, newPerPage)` (always resets to page 0).
  - Page-number buttons: `aria-label={`Page ${page + 1}`}` (1-indexed label, 0-indexed internal `currentPage`), current page gets `aria-current="page"`.

---

## 3. Documentation Findings

### Guides and Architecture Docs

- `.ai-run/guides/testing/testing-patterns.md` — authoritative testing guide for this frontend repo (Vitest 1.6.1 + RTL, `unit` and `integration` Vitest workspace projects). Key points directly relevant to this task:
  - File naming: `*.integration.test.tsx` runs under the `integration` project; lives in `__tests__/` co-located with source.
  - `mockAPI` matching rules table: omitted 4th arg = prefix match (ignores query string); status number = prefix match + error; params object = exact path + all specified params present.
  - "Last `mockAPI` call for the same key wins. Registry cleared automatically in `afterEach`" — confirms no manual cleanup needed between `mockAPI` calls within a test or between tests.
  - Common pitfall table explicitly warns: `v1/assistants` mock can shadow `v1/assistants/user` sub-paths — use exact sub-paths where relevant (not directly relevant here since favorites endpoints are distinct URLs, but relevant if a test also mocks `v1/assistants/user` type calls).
  - Checklist: `mockAPI(...)` must be called **before** `renderPage(...)`.
- `.ai-run/guides/testing/qa-strategy.md` and `qa-health.md` exist but were not read in depth — not directly needed for this test-only task; `testing-patterns.md` is the P0 guide and sufficient.
- No dedicated guide specifically documents the Favorites feature flag or Pagination component contract; those were derived directly from source (Section 2).

### Architectural Decisions

- No ADR or inline "DECISION:"/"NOTE:" markers found specifically about pagination-vs-URL-sync differences between tabs; this is an implicit product of how `useAssistantsList` and `useFavoriteWorkflows` were implemented (favorites use local state, not URL query params) — this is a code-derived finding, not a documented decision.

### Derived Conventions

- Existing pagination tests (Workflows ALL tab, `describe('Pagination')`, lines 626-754) establish the naming convention for the four required assertion types:
  - `it('navigates to page 2 when page button clicked')`
  - `it('Previous page button navigates correctly')`
  - `it('Next page button navigates correctly')`
  - `it('Previous page button absent on first page')`
  - `it('Next page button absent on last page')`
  These use the phrase "absent" rather than "disabled" — matches the actual DOM behavior (conditional rendering, not a `disabled` attribute) and should be mirrored for the new tests' naming and assertions (`queryByRole(...).not.toBeInTheDocument()` rather than checking a `disabled` prop).
- "Hidden when one page" convention (from `AssistantTemplatesPagination.integration.test.tsx`): mock a fixture count ≤ `per_page` and assert `queryByRole('button', { name: 'Page 2' })).not.toBeInTheDocument()`.
- Per-page-change convention exists precisely in `describe('Scope-Specific Behavior')` of `WorkflowsListPage.integration.test.tsx` (lines ~1514-1575, referenced by explore agent as "per-page selector" test) — read this block directly before writing new tests, as it is the only existing precedent for the "per-page change reloads with new page size" assertion type mentioned in the ticket; neither Assistants file nor the reference Templates file currently has a per-page-select test to copy from verbatim.

---

## 4. Testing Landscape

### Existing Coverage

| Tab | File | Route | Pagination assertions today |
|---|---|---|---|
| Assistants default/PROJECT | `AssistantsListPage.integration.test.tsx` | `/assistants` | Yes — `'changes page when pagination button clicked'` (lines 653-694), single page-2 click + fetch assertion only; no per-page test, no absence/hidden test on this tab specifically |
| Assistants Marketplace | same file | `/assistants/marketplace` | **No** — `'loads and displays marketplace assistants on MARKETPLACE tab'` (line 96) only checks item text + `'5 ASSISTANTS'` count text; fixture has `pages: 1, total: 5` (single page, no pagination buttons possible with current fixture) |
| Assistants Favorites | same file | `/assistants/favorites` | **No** — `'loads and displays favorites when feature flag enabled'` (line 126) only checks favorite item renders; fixture has `pages: 1, total: 3` |
| Assistants Templates | `AssistantTemplatesPagination.integration.test.tsx` | `/assistants/templates` | Yes — full reference pattern (page-2, hidden-on-one-page, URL query sync, error toast) |
| Workflows ALL | `WorkflowsListPage.integration.test.tsx` | `/workflows/all` | Yes — full `describe('Pagination')` block covering all 4 required assertion types plus router push assertions |
| Workflows MY / MARKETPLACE | same file | `/workflows/my`, `/workflows/marketplace` | Covered for initial load only, no pagination-specific tests |
| Workflows Favorites | same file | `/workflows/favorites` | **No** — `describe('Favorites List Loading')` (lines 1819-1880) has 2 tests: loads favorites list (no pagination button assertions), and search-filter-with-debounce test; fixture has `pages: 1, total: 1` |

### Testing Framework and Patterns

- Vitest + React Testing Library, `userEvent.setup()` (Assistants file) or `setupUser()` = `userEvent.setup({ advanceTimers: vi.advanceTimersByTime })` (Workflows file — required because Workflows tests use `vi.useFakeTimers({ shouldAdvanceTime: true })` in `beforeEach` for debounced search filters).
- `renderPage(path)` from `@/test-utils/integration` — mounts full app via `createMemoryRouter`.
- `mockAPI(method, url, data, statusOrParams?)` from same module — registers a fetch intercept keyed by `METHOD:path`.
- `mockRouterState` from `@/hooks/__mocks__/useVueRouter` — used to assert `push`/`replace` calls and to read/set `.query`/`.path` directly in some tests (Workflows Templates block manually sets `mockRouterState.path`).
- Global defaults for `v1/config`, `v1/assistants`, `v1/user`, `v1/preferences/test-user-id`, `v1/user/reactions` are pre-registered in `src/setupTests.tsx` and apply unless overridden per test; default `v1/preferences/test-user-id` includes `favorites: { assistants: [], skills: [], workflows: [] }` but the actual list-fetch mocks (`v1/preferences/test-user-id/favorites/assistants` / `.../workflows`) are NOT in the global defaults and must be explicitly mocked per test (as existing favorites tests already do).

### Coverage Gaps

- No pagination-button-click test exists for Assistants Marketplace tab.
- No pagination-button-click, absence, or per-page test exists for Assistants Favorites tab.
- No pagination-button-click, absence, or per-page test exists for Workflows Favorites tab.
- No test currently exercises a >1-page fixture for any of these three tabs (all three existing tab tests use `pages: 1` fixtures) — new fixtures must be sized for a second page (e.g., `total: 25`/`total: 36` following the reference/ALL-tab pattern with `per_page: 12`).
- No existing test asserts router push/replace behavior — or its absence — for the Favorites tabs specifically; this must be verified fresh since both `useAssistantsList` (Assistants Favorites) and `useFavoriteWorkflows` (Workflows Favorites) skip URL sync entirely.

---

## 5. Configuration and Environment

### Environment Variables

None specific to pagination; not applicable to this test-only task.

### Configuration Files

- `vitest.workspace.ts` — defines `unit` and `integration` Vitest projects; integration project loads only `src/setupTests.tsx` (no `setupTests.unit.ts`, so real Valtio + real fetch stub apply).
- `src/setupTests.tsx` — global fetch mock defaults (see Section 4) and global mocks for `SettingsLayout`, `useVueRouter`.
- `package.json` — `"test:integration": "vitest run --project integration"` (line 12) — the exact command the new/extended tests must pass under, per the ticket constraint.

### Feature Flags and Deployment Concerns

- Favorites feature is gated by a `v1/config` entry: `{ id: 'features:favorites', settings: { enabled: true } }`. Both existing Favorites-tab tests (Assistants line 127, Workflows line 1821) mock this explicitly — new pagination tests for both Favorites tabs must do the same, or the tab/data may not render as expected.
- No other feature flags identified as relevant to Marketplace tab pagination.

---

## 6. Risk Indicators

- **Response envelope mismatch between tabs**: Marketplace/default tabs use `{ data, pagination: { page, per_page, pages, total } }` (nested), while both Favorites endpoints use `{ data, page, per_page, pages, total }` (flat, no `pagination` wrapper). Fixtures for the two Favorites tests must NOT reuse the nested-envelope helper without adaptation, or the pagination state will fail to parse and no page-2 button will render.
- **Favorites tabs do not sync page state to the URL/router** — `useAssistantsList.loadAssistantsList` explicitly skips `updateURL` when `isFavoritesScope`, and `useFavoriteWorkflows.handleFavoritesPageChange` never touches the router at all (pure local `useState`). This means the router-push/replace assertions used in the ALL-tab and Templates reference tests (`expect(mockRouterState.push/replace).toHaveBeenCalledWith(...)`) must be OMITTED or adapted for the two Favorites tests — asserting them would make the tests fail against real behavior.
- **Feature flag dependency for Favorites tabs**: forgetting to mock `v1/config` with `features:favorites` enabled could cause the Favorites tab/data to not render as expected; both new Favorites tests must replicate this from the existing favorites tests.
- **`userId` dependency for Favorites endpoint URLs**: the favorites endpoints are keyed by user id (`v1/preferences/{userId}/favorites/assistants|workflows`). Default global mock uses `test-user-id`; if a test remocks `v1/user` with a different id, the favorites URL mock must match, or `mockAPI` won't intercept the actual outgoing request.
- **Per-page-change test has no verbatim precedent in the target tabs**: the closest existing example is in `WorkflowsListPage.integration.test.tsx`'s `describe('Scope-Specific Behavior')` block (~lines 1514-1575) — read it directly before writing new tests, since it's the only existing exemplar of the per-page-select interaction pattern in this codebase, and it currently only applies to a non-favorites scope.
- **Debounced/fake-timer setup only in the Workflows test file**: `WorkflowsListPage.integration.test.tsx` uses `vi.useFakeTimers({ shouldAdvanceTime: true })` globally in `beforeEach`, requiring `setupUser()` (timer-aware) rather than plain `userEvent.setup()`. New Workflows Favorites pagination tests must use `setupUser()`, not a bare `userEvent.setup()`, to avoid hangs on any interaction that triggers a timer-gated code path (search debounce is present in the same describe area).
- **Marketplace tab existing fixture uses `total: 5, pages: 1`** — a single-page dataset; the new Marketplace pagination test needs an entirely new, larger fixture (e.g. `total: 25`/`36`) to exercise a second page, meaning it cannot simply extend the existing "loads and displays marketplace assistants" test's mock in place without either adding a new `it` block or restructuring the existing one (ticket direction is "extend", implying new `it` blocks alongside the existing ones, not modifying the existing fixture, to avoid removing existing coverage).
- **Standalone Favorites page confusion risk**: a separate `FavoritesPage` exists at routes `/favorites/assistants` and `/favorites/workflows` (`src/pages/favorites/`), which is out of scope per the ticket. There is no existing test file for it. Care must be taken to use `/assistants/favorites` and `/workflows/favorites` (the in-list-page tabs), not `/favorites/assistants` or `/favorites/workflows`.
- **Prefix-matching URL shadowing**: `mockAPI` does prefix matching when no params/status arg is given, so `mockAPI('GET', 'v1/preferences/test-user-id', ...)` could unintentionally shadow the more specific `v1/preferences/test-user-id/favorites/assistants` mock if ever combined carelessly (not currently an issue in existing tests, but a known documented pitfall in `testing-patterns.md`).
- No codegraph-specific risk applies since the codegraph MCP tool was unavailable in this environment (filesystem-only research path used throughout); no indexing-related risk to note beyond that this analysis is based on direct file reads rather than a semantic index, so downstream consumers should treat exact line numbers as approximate/subject to drift if the files change before implementation.

---

## 7. Summary for Complexity Assessment

This is a test-only characterization task touching two integration test files (`AssistantsListPage.integration.test.tsx`, `WorkflowsListPage.integration.test.tsx`) with zero production code changes, following an already-established and well-documented pattern (`AssistantTemplatesPagination.integration.test.tsx` plus the existing `describe('Pagination')` block for the Workflows ALL tab). The task requires adding roughly 3 tabs × 4 assertion types (page-2 nav, per-page change, hidden-on-one-page, prev/next absence) = up to ~12 new `it` blocks split across two files, each following a tight, repeatable template (mockAPI → renderPage → interact → assert). The shared `Pagination` component's behavior (button absence rather than `disabled` attributes, `totalPages <= 1` self-hiding) is fully understood from source and consistent across all target tabs, so there is minimal component-behavior ambiguity.

The primary complexity driver is NOT breadth of code touched but correctness of three subtle, tab-specific behavioral divergences that must be reflected precisely in the new tests: (1) the Favorites endpoints return a flat pagination envelope (`{data, page, per_page, pages, total}`) vs. the nested envelope (`{data, pagination: {...}}`) used by Marketplace/default tabs; (2) both Favorites tabs manage pagination as local component state with no router/URL sync, so the router-push/replace assertion pattern used in existing ALL-tab/Templates tests must be deliberately omitted for Favorites, not copy-pasted; (3) the Workflows test file runs under fake timers globally, requiring the timer-aware `setupUser()` helper rather than a plain `userEvent.setup()` in any new Workflows-file tests.

Test coverage posture for the affected surface is currently gap-heavy but well-scaffolded: all three target tabs already have at least one non-pagination integration test proving the route/tab renders and loads data, and directly analogous pagination test blocks exist elsewhere in the same two files to copy structurally (Workflows ALL tab's `describe('Pagination')` is the closest 1:1 template; `AssistantTemplatesPagination.integration.test.tsx` supplies the fixture-factory and hidden/shown pattern). No existing test asserts per-page-select behavior in either Assistants file, so that portion of the per-page-change assertion type will need to be newly derived from the `Pagination` component's `onChange` → `setPage(0, newPerPage)` contract and the one precedent in `WorkflowsListPage.integration.test.tsx`'s `Scope-Specific Behavior` block, rather than copied verbatim. Overall risk is low-to-moderate: well-bounded scope, no production code risk, but requires careful per-tab fixture/assertion tailoring to avoid false-positive tests that would pass against an incorrect mental model of router-sync behavior.
