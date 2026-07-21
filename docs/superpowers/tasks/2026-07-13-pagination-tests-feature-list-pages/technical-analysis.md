# Technical Research

**Task**: pagination integration tests skills katas favorites
**Generated**: 2026-07-13T18:54:23Z
**Research path**: filesystem

---

## 1. Original Context

EPMCDME-13480 — Pagination tests: feature list pages (Skills, Katas, Favorites page).

Scope (strictly this sub-task; parent EPMCDME-5727 is context only):
Add new integration tests for feature list pages that use the shared Pagination component with a store and currently have no page-level pagination tests:
- Skills — Project, Marketplace, and Favorites tabs (src/pages/skills)
- Katas — list and leaderboard (src/pages/katas)
- Favorites page — standalone src/pages/favorites/FavoritesPage.tsx and its assistants/skills/workflows sections

Test files go under:
- src/pages/skills/__tests__
- src/pages/katas/__tests__
- src/pages/favorites/__tests__

Do NOT modify shared test infra (src/test-utils/integration.tsx, _mock-state.ts) and do NOT make production code changes.

Follow the established renderPage()/mockAPI() pattern from src/pages/assistants/__tests__/AssistantTemplatesPagination.integration.test.tsx.

Acceptance criteria per area:
1. Page-2 navigation loads the next page.
2. Per-page size change reloads with the new size.
3. Pagination controls are hidden/disabled when items fit on one page.
4. Previous is disabled on the first page.
5. Next is disabled on the last page.
6. All tests pass under npm run test:integration.

Explicitly out of scope: Assistants/Workflows Favorites tabs (separate sub-task), AWS Integration Load more cursor pagination, shared test infra changes, production code changes.

(Note: a completed sibling sub-task EPMCDME-13479 "pagination-tests-remaining-tabs" exists on a separate, unmerged local branch `EPMCDME-13479_pagination-tests-remaining-tabs`, with leftover uncommitted artifacts at `docs/superpowers/tasks/2026-07-13-pagination-tests-remaining-tabs/` on the current branch. It covered Assistants Marketplace/Favorites tabs and Workflows Favorites tab — a different, already-completed sub-task, used here only as a style/pattern precedent.)

---

## 2. Codebase Findings

### Existing Implementations

**Skills** (`src/pages/skills/`):
- `SkillsListPage.tsx` — single page component, all three tabs (`SkillTab.PROJECT`, `SkillTab.MARKETPLACE`, `SkillTab.FAVORITES` from `src/pages/skills/components/SkillsNavigation.tsx`) render through this one component with a `tab` prop.
  - PROJECT/MARKETPLACE: local `useState` for `currentPage`/`currentPerPage` (no URL sync) → `useSkills(activeFilters, currentPage, currentPerPage)` (`src/pages/skills/hooks/useSkills.tsx`) → `skillsStore.indexSkills(filters, page, perPage)` (`src/store/skills.ts:112`) → `GET v1/skills?page=&per_page=&filters=...`. Response shape: `{ data, pagination: { page, per_page, pages, total } }` (nested envelope).
  - FAVORITES tab: separate local state `favoriteSkillsPerPage` → `favoritesStore.fetchFavoriteSkills(activeFilters, currentPage, favoriteSkillsPerPage)` (`src/store/favorites.ts:211`) → `GET v1/preferences/{userId}/favorites/skills?page=&per_page=...`. Response shape: flat `{ data, page, per_page, pages, total }` (NOT nested under `pagination`).
  - `Pagination` rendered conditionally: Favorites tab shows it whenever `favoriteSkills.length` is truthy (component itself still hides when `totalPages <= 1`); Project/Marketplace show it when `skills.length > 0 && pagination.totalPages > 1`.
  - Routes: `/skills`, `/skills/project` → PROJECT; `/skills/marketplace` → MARKETPLACE; `/skills/favorites` → FAVORITES (`src/router.tsx` ~lines 209-229).
  - No `__tests__` integration dir exists yet; only unit tests exist at `src/pages/skills/components/__tests__/SkillCard.test.tsx`, `SkillStatusLabel.test.tsx`, `src/pages/skills/utils/__tests__/*`.

- **Katas** (`src/pages/katas/`):
  - `KatasPage.tsx` — category prop drives `ALL_KATAS` / `IN_PROGRESS` / `COMPLETED` / `LEADERBOARD`.
  - `ALL_KATAS`: `useKatasList` (`src/pages/katas/hooks/useKatasList.ts`) — **1-based** page internally, URL query sync (`page`, `per_page`) via `useVueRoute`/`useVueRouter`, `katasStore.fetchKatas(filters, page=1, perPage=20)` (`src/store/katas.ts:127`) → `GET v1/katas?page=&per_page=&filters=...`. Response shape: `{ data, pagination: { page, per_page, pages, total } }`. **Important**: if `result.data` is falsy, katas/pagination state is not updated at all — fixtures must always include a `data` array. `Pagination` component is fed `currentPage - 1` (0-indexed) with `setPage={(page, perPage) => handlePageChange(page + 1, perPage)}`.
  - `IN_PROGRESS`/`COMPLETED`: fetched via `AIKatasContent` calling `katasStore.fetchKatas(filters)` with no page/perPage args; `hasPagination={false}` — no Pagination UI rendered for these categories regardless of item count.
  - `LEADERBOARD`: `LeaderboardContent.tsx` → `katasStore.fetchLeaderboard()` (`src/store/katas.ts:405`) → `GET v1/katas/leaderboard?limit=100` (fixed `KATA_CONSTRAINTS.LEADERBOARD_LIMIT = 100`, no page param). Rendered via generic `Table` component with `embedded={true}` and **no `pagination` prop passed** — `Table` only renders its internal Pagination when `pagination && !embedded` (`Table.tsx:211`). **The Leaderboard has zero pagination UI** — no Page-2 button, no per-page selector, no prev/next controls, regardless of how many rows are returned.
  - Routes: `/katas` → ALL_KATAS; `/katas/in-progress`, `/katas/completed`, `/katas/leaderboard` (`src/router.tsx` ~lines 298-334).
  - No `__tests__` directory exists at all under `src/pages/katas/`.

- **Favorites standalone page** (`src/pages/favorites/FavoritesPage.tsx`):
  - **Critical finding**: this page has **no pagination code whatsoever**. `grep -rn "Pagination|per_page|perPage" src/pages/favorites/` returns zero matches. Its `useEffect` calls `favoritesStore.fetchFavoriteAssistants(assistantFilters)` / `fetchFavoriteSkills(skillFilters)` / `fetchFavoriteWorkflows(workflowFilters)` / `fetchFavorites(allFilters)` with **no page/perPage arguments at all** — always defaults to `page=0, perPage=12` from the store method signatures. No `<Pagination>` component is ever imported or rendered anywhere in `FavoritesPage.tsx`, for any of its four filter views (`all` / `assistant` / `workflow` / `skill`). There is no client-side slicing/windowing either.
  - Routes: `/favorites` → `filter="all"`; `/favorites/assistants` → `filter="assistant"`; `/favorites/workflows` → `filter="workflow"`; `/favorites/skills` → `filter="skill"` (`src/router.tsx` ~lines 610-631).
  - `favoritesStore` (`src/store/favorites.ts`) maintains three pagination objects (`assistantsPagination`, `skillsPagination`, `workflowsPagination`) that are populated on every fetch but **never consumed** by `FavoritesPage.tsx` — only the Skills page's own Favorites tab (and, out of scope, the Assistants/Workflows list pages' own Favorites tabs) read these.
  - `favoritesStore` declares its own local `FavoritesPagination` interface inline rather than importing the shared `Pagination` type from `src/types/common.ts` — a structural duplicate, not currently causing bugs.
  - No `__tests__` directory exists yet under `src/pages/favorites/`.

### Architecture and Layers Affected

- **Page/UI layer**: `SkillsListPage.tsx`, `KatasPage.tsx` (+ `KatasContent.tsx`, `AIKatasContent.tsx`, `LeaderboardContent.tsx`), `FavoritesPage.tsx` — read-only for this task, no production changes.
- **Shared UI component**: `src/components/Pagination/Pagination.tsx` — read-only reference; also `src/components/Table/Table.tsx` (used by Leaderboard, `embedded` mode suppresses its internal Pagination).
- **Hook layer**: `useSkills` (`src/pages/skills/hooks/useSkills.tsx`), `useKatasList` (`src/pages/katas/hooks/useKatasList.ts`); `src/pages/favorites/hooks/useFavoritesNavigation.ts` has no pagination logic at all.
- **State layer**: Valtio proxy stores — `skillsStore` (`src/store/skills.ts`), `katasStore` (`src/store/katas.ts`), `favoritesStore` (`src/store/favorites.ts`). No Zustand/React Query anywhere in the app; no shared `usePagination` hook or `PaginationStore` exists — each domain reimplements its own local pagination state.
- **API layer**: direct `api.get(...)` calls inside store actions — `v1/skills`, `v1/katas`, `v1/katas/leaderboard`, `v1/preferences/{userId}/favorites/{assistants|skills|workflows}`.
- **Test infra layer** (read-only, must not be modified): `src/test-utils/integration.tsx` (`renderPage`, `mockAPI`, re-exported `navigate`), `src/test-utils/_mock-state.ts` (shared `requestRegistry` Map + `navigate` spy), `src/setupTests.tsx` (global fetch mock + `globalDefaults`, `useVueRouter` mock wiring — not in the explicit "don't touch" list but should not need changes), `src/hooks/__mocks__/useVueRouter.ts` (`mockRouterState`).
- **Router layer**: real `react-router` routes (`src/router.tsx`) rendered via `renderPage()`; Vue-style `useVueRouter`/`useVueRoute` mock used for URL query sync assertions (relevant to Katas ALL_KATAS; not relevant to Skills tabs, which have no URL sync).

### Integration Points

- All three domains share the same `Pagination` component (`src/components/Pagination`) and the same low-level `api` client (`@/utils/api`) — no per-domain service layer.
- Shared pagination types: `src/types/common.ts` exports `Pagination` (frontend-normalized, 0-indexed `page`), `PaginationBE` (raw backend shape), `PaginatedResponse<T>`. `skillsStore`/`katasStore` reuse `Pagination`; `favoritesStore` uses its own structurally-identical but separately-declared type.
- Config flag: Skills Favorites tab visibility in navigation is gated by a `features:favorites` flag read from `GET v1/config`; precedent tests enable it via `mockAPI('GET', 'v1/config', [{ id: 'features:favorites', settings: { enabled: true } }])`. The route itself may still be reachable directly via `renderPage('/skills/favorites')` regardless of the flag (per code-structure research) — needs empirical confirmation when writing the actual test.
- `globalDefaults` in `src/setupTests.tsx` already covers `v1/config` (`[]`), `v1/user`, `v1/preferences/{userId}` (empty favorites arrays), `v1/assistants`, `v1/skills/categories` (`[]`), etc. **No default exists for `v1/katas`, `v1/katas/leaderboard`, `v1/skills`, or any `v1/preferences/{userId}/favorites/*` endpoint** — these must be explicitly mocked per test via `mockAPI`.

### Patterns and Conventions

Primary precedent (on current branch, directly readable): `src/pages/assistants/__tests__/AssistantTemplatesPagination.integration.test.tsx` and `src/pages/workflows/__tests__/WorkflowTemplatesPagination.integration.test.tsx`. Pattern:
- Import `renderPage`, `mockAPI` from `@/test-utils/integration`; `mockRouterState` from `@/hooks/__mocks__/useVueRouter`; `toaster` from `@/utils/toaster`.
- Per test: `mockAPI('GET', 'v1/config', [])` (or with the relevant flag) + `mockAPI('GET', '<resource endpoint>', <fixture>)`, then `renderPage(path)`, then assert via `screen`/`waitFor`/`fireEvent`/`userEvent`.
- Local `createXFixture(overrides)` + `createXs(count, namePrefix?)` fixture builders defined per test file (not shared).
- Selectors: page buttons via `screen.getByRole('button', { name: 'Page 2' })` (1-indexed labels); `screen.queryByRole('button', { name: 'Previous page' })` / `'Next page'` with `.not.toBeInTheDocument()` for disabled-equivalent assertions (these are DOM-absence, not an HTML `disabled` attribute — confirmed in `Pagination.tsx`); per-page dropdown via `document.getElementById('per-page')` + `fireEvent.click`, then `fireEvent.click(screen.getByLabelText('24 items'))`, then assert `global.fetch` called with `expect.stringContaining('per_page=24')`.
- Error-path assertion: `expect(toaster.error).toHaveBeenCalledWith(...)` for a mocked 500 response.
- `mockAPI` re-registration mid-test (to change the next response for a subsequent fetch, e.g. after a page-2 click) is an established, supported pattern.

Secondary style precedent (different, unmerged branch — read via `git show EPMCDME-13479_pagination-tests-remaining-tabs:<path>`, not present as files on this branch): new `describe` blocks appended inside existing `AssistantsListPage.integration.test.tsx` / `WorkflowsListPage.integration.test.tsx` for Marketplace/Favorites tabs. Useful only as a style reference, since Skills tabs are structurally similar to Assistants tabs (one page, multiple tabs, tab-specific state/endpoint).

---

## 3. Documentation Findings

### Guides and Architecture Docs

- `.ai-run/guides/testing/testing-patterns.md` is the authoritative and only directly relevant guide (this is the `codemie-ui` frontend repo; the AGENTS.md guide table is backend-oriented boilerplate and does not fully apply — most of its listed guides concern Python/FastAPI/SQLModel and are not applicable here). It covers: `*.integration.test.tsx` naming/placement under `__tests__/`, `mockAPI` matching rules (prefix vs exact-params matching, last-call-wins, auto-cleared in `afterEach`), the "real Valtio + mocked fetch" model for integration tests, a query-priority table (prefer `getByRole`/`findByRole`), a DO/DON'T table, a "Checklist: New Integration Test," and a Common Pitfalls table.
- `.ai-run/guides/testing/qa-strategy.md` and `qa-health.md` exist but are not needed in depth for a test-only pagination task (per prior sibling task's own analysis, reused here as it still applies).
- No dedicated Pagination-component architecture doc or ADR exists anywhere under `.ai-run/guides/`.

### Architectural Decisions

- No ADRs or `DECISION:`/`NOTE:` markers found in `src/components/Pagination/` or `src/pages/favorites/`. The URL-sync-vs-local-state divergence between pages (e.g. Katas syncs to URL, Skills does not) is an implicit product of independent hook implementations, not a documented decision.

### Derived Conventions

- Page-indexing is inconsistent across domains and must be verified per-hook rather than assumed: Skills Project/Marketplace/Favorites-tab state is 0-indexed locally; Katas ALL_KATAS is 1-indexed internally, converted to 0-indexed only at the `<Pagination>` prop boundary.
- Response envelope shape is inconsistent across endpoints and must be matched exactly per endpoint: `v1/skills` and `v1/katas` return nested `{ data, pagination: {...} }`; `v1/preferences/{userId}/favorites/*` returns a flat `{ data, page, per_page, pages, total }`.
- URL query-param sync is inconsistent: Katas ALL_KATAS syncs `page`/`per_page` to the router query (assert via `mockRouterState.replace`/`.push`); Skills tabs do not sync to the URL at all (do not assert router calls for Skills).

---

## 4. Testing Landscape

### Existing Coverage

- Zero integration test coverage currently exists for Skills, Katas, or Favorites pages — all three `__tests__` directories referenced in the task (`src/pages/skills/__tests__`, `src/pages/katas/__tests__`, `src/pages/favorites/__tests__`) do not yet exist.
- Existing unit tests (not integration, don't cover pagination): `src/pages/skills/components/__tests__/SkillCard.test.tsx`, `SkillStatusLabel.test.tsx`, `src/pages/skills/utils/__tests__/*`.
- Existing pagination integration tests elsewhere in the repo (precedent only): `src/pages/assistants/__tests__/AssistantTemplatesPagination.integration.test.tsx`, `src/pages/workflows/__tests__/WorkflowTemplatesPagination.integration.test.tsx`.

### Testing Framework and Patterns

- Vitest (not Jest), workspace-based config: `vitest.workspace.ts` defines `unit` and `integration` projects, both extending `vite.config.ts`.
  - `unit` project: matches `*.{test,spec}.tsx` excluding `*.integration.test.*`; setup files `['./src/setupTests', './src/setupTests.unit']` (mocks Valtio/`@/utils/api` synchronously).
  - `integration` project: matches `*.integration.test.tsx` only; setup file `['./src/setupTests']` only — real Valtio reactivity, real stores, only the network layer (`fetch`) is mocked.
- `package.json` scripts: `"test": "vitest run --project unit"`, `"test:integration": "vitest run --project integration"`, `"test:coverage": "vitest run --coverage --project unit"` (coverage excludes integration, per the recent commit `7db1b581d`). New test files **must** be named `*.integration.test.tsx` to be picked up by `npm run test:integration`.
- No MSW anywhere in the repo — API mocking is a custom global `fetch` stub (`vi.stubGlobal('fetch', fetchMock)` in `src/setupTests.tsx`) backed by the shared `requestRegistry` (`src/test-utils/_mock-state.ts`), exposed to test authors via `mockAPI`/`renderPage` in `src/test-utils/integration.tsx`.
- `@testing-library/react` + `@testing-library/user-event`, `describe/it/expect/beforeEach/afterEach` from `vitest`.

### Coverage Gaps

- All acceptance-criteria scenarios (page-2 nav, per-page change, hidden/disabled controls, prev/next disabled) are entirely new for Skills (3 tabs), Katas list, and the Favorites-page sections.
- **Structural gap, not just a missing-test gap**: the standalone Favorites page (`FavoritesPage.tsx`) and the Katas Leaderboard have no pagination UI/logic in production code at all (see Section 2 and Section 6) — most of the stated acceptance criteria cannot be literally exercised for these two areas without either narrowing the criteria (e.g., asserting "no pagination controls are ever rendered, and the fetch call never varies its page/limit") or treating this as a spec ambiguity to resolve before planning test cases.

---

## 5. Configuration and Environment

### Environment Variables

- No `process.env`/`import.meta.env` usage found anywhere in `src/pages/skills`, `src/pages/katas`, or `src/pages/favorites` — this domain has no environment-variable dependencies.

### Configuration Files

- `vitest.workspace.ts` and `vite.config.ts` govern test discovery/execution (see Section 4).
- `src/setupTests.tsx` (shared, both projects) — global mocks for `localStorage`, `ResizeObserver`, `IntersectionObserver`, `window.matchMedia`, `file-saver`, `@/hooks/useVueRouter`, `@/utils/toaster`, `react-router`'s `useNavigate`; installs the global `fetch` mock and its `globalDefaults` fallback map; resets `requestRegistry`/`navigate`/`fetch`/`appInfoStore` config cache in `afterEach`.
- `src/setupTests.unit.ts` (unit project only, not loaded for integration tests) — mocks `@/utils/api`, `@/utils/storage`, and `valtio` itself; irrelevant to this task since integration tests skip it.

### Feature Flags and Deployment Concerns

- Single relevant flag: `features:favorites`, read from `GET v1/config`, gates the Favorites navigation entries/tabs (affects Skills Favorites tab reachability in normal app flow; direct `renderPage('/skills/favorites')` navigation in a test may or may not require it explicitly — verify empirically).
- No CI pipeline config exists in this repository (`.github/` contains only PR/issue templates, no `.github/workflows/*`; no `.gitlab-ci.yml`/`Jenkinsfile` found) — `npm run test:integration` currently has no enforced CI gate visible in-repo.

---

## 6. Risk Indicators

- **Standalone Favorites page (`FavoritesPage.tsx`) has no pagination UI or logic whatsoever** — no `<Pagination>` component rendered on any of `/favorites`, `/favorites/assistants`, `/favorites/workflows`, `/favorites/skills`; all fetch calls use hardcoded store defaults (`page=0, perPage=12`) with no page/perPage arguments passed. As literally stated, acceptance criteria 1 (page-2 navigation), 2 (per-page size change), 4 (previous disabled first page), and 5 (next disabled last page) cannot be exercised for this page — only a variant of criterion 3 ("no pagination controls ever render") is meaningful. This is a spec ambiguity that should be surfaced to planning/spec phases before test cases are written, since "add pagination tests" implies pagination behavior exists to test.
- **Katas Leaderboard has no pagination UI at all** — fixed `limit=100`, rendered through `Table` in `embedded` mode with no `pagination` prop, so the internal Pagination never renders regardless of row count. Same caveat as above: criteria 1/2/4/5 are not testable for leaderboard; only an "absence of pagination controls" assertion applies.
- **Katas IN_PROGRESS/COMPLETED categories also have no pagination UI** (`hasPagination={false}`) — the task says "Katas — list and leaderboard," which likely maps to `ALL_KATAS` (the only category with real, clickable pagination) plus `LEADERBOARD` (which has none); this mapping should be confirmed during planning.
- Response envelope shape varies by endpoint and must be matched exactly per fixture: nested `{ data, pagination: {...} }` (v1/skills, v1/katas) vs. flat `{ data, page, per_page, pages, total }` (v1/preferences/{userId}/favorites/*). Getting this wrong silently breaks pagination state updates.
- Page-indexing convention varies by domain (0-indexed for Skills local state; 1-indexed internally for Katas ALL_KATAS, converted at the Pagination component boundary) — tests must not assume a single indexing convention across all three feature areas.
- URL-sync behavior varies by domain: Katas ALL_KATAS syncs page/per_page to the router query; Skills tabs do not sync to the URL at all. Tests must verify this per-page rather than copy router-assertion boilerplate uniformly from the Katas/Assistants-Templates precedent onto Skills tests.
- `katasStore.fetchKatas` silently skips updating pagination state if `result.data` is falsy — fixtures for Katas tests must always include a `data` array, even for edge-case/error scenarios where the intent is to test something else.
- No default `globalDefaults` fetch stub exists for `v1/katas`, `v1/katas/leaderboard`, `v1/skills`, or any `v1/preferences/{userId}/favorites/*` endpoint — every new test must explicitly `mockAPI` these or risk unhandled fetch calls.
- TDD gotcha carried over from the sibling task (precedent, not yet verified for Skills/Katas): some "last page" pagination state is derived from the API response's `page` field directly (safe to seed via envelope), while other hooks derive `currentPage` from local click-driven state (must navigate via a real click before asserting the last-page condition). This must be checked per hook (`useSkills`, `useKatasList`) before writing "Next disabled on last page" tests — do not assume uniform behavior.
- No CI pipeline currently invokes `npm run test:integration` in this repository — acceptance criterion 6 ("all tests pass under npm run test:integration") is a local/manual validation requirement, not CI-enforced.
- `favoritesStore` declares its own local `FavoritesPagination` type instead of the shared `Pagination` type in `src/types/common.ts` — a minor structural inconsistency, not a test blocker, but worth being aware of when reasoning about type shapes during test-writing.
- Zero existing integration test coverage for all three feature areas in scope — this is a fully greenfield addition; no existing bugs/regressions to characterize, only new coverage to add on top of unchanged, already-shipped behavior.

---

## 7. Summary for Complexity Assessment

This task touches four layers purely as read-only reference material — page components (`SkillsListPage.tsx`, `KatasPage.tsx`, `FavoritesPage.tsx` and sub-components), the shared `Pagination` UI component, three independent Valtio stores (`skillsStore`, `katasStore`, `favoritesStore`), and the shared test infrastructure (`renderPage`/`mockAPI`, explicitly not to be modified) — with all actual file changes confined to new `*.integration.test.tsx` files across three new `__tests__` directories (`src/pages/skills/__tests__`, `src/pages/katas/__tests__`, `src/pages/favorites/__tests__`). Expect roughly 4-7 new test files (e.g., one per Skills tab or a combined Skills test file with per-tab `describe` blocks; one for Katas ALL_KATAS list; one for Katas Leaderboard, though its test content will be narrow; one or more for the Favorites page sections). No production code changes are permitted or anticipated.

Technical novelty is low in mechanism — the task follows a well-established, twice-precedented pattern (`AssistantTemplatesPagination.integration.test.tsx`, `WorkflowTemplatesPagination.integration.test.tsx`) plus a third stylistic precedent on an unmerged sibling branch — but moderate in per-domain variation: each of the three feature areas has its own page-indexing convention, response-envelope shape, and URL-sync behavior that must be individually verified against source rather than copy-pasted uniformly. Test coverage posture is currently zero for all three areas — this is greenfield integration-test authoring, not characterization of a poorly-tested existing area with bugs to work around.

The dominant risk factor, and the one most likely to affect complexity and scope, is that two of the five acceptance criteria's premises do not hold for two of the in-scope sub-areas: the standalone Favorites page has no pagination UI/logic at all (fixed page=0/perPage=12, no `<Pagination>` component ever rendered), and the Katas Leaderboard likewise has no pagination UI (fixed `limit=100` via a `Table` in embedded mode). For these two areas, acceptance criteria 1/2/4/5 (page-2 navigation, per-page change, previous/next disabled) cannot be exercised as literally written — only a narrowed version of criterion 3 ("pagination controls never appear") is meaningful. This should be flagged explicitly during spec/plan review before detailed test cases are written, since it changes what "done" means for those two sub-areas without requiring (or permitting, per this task's constraints) any production code change.
