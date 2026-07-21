# Technical Research

**Task**: pagination integration tests Table dataSources integrations
**Generated**: 2026-07-14
**Research path**: filesystem

---

## 1. Original Context

Jira ticket EPMCDME-13481 — "Pagination tests: product Table lists (Data Sources, Integrations)"

Issue Type: Sub-task, Status: Open

## Description / Scope
Add new integration tests for the pages built on the shared Table component (`Table.tsx` + `useTableFilters`):
- Data Sources page (`src/pages/dataSources`)
- Integrations — User and Project settings tables (`src/pages/integrations`)

Files (new): under `src/pages/dataSources/__tests__` and `src/pages/integrations/__tests__`.

If a reusable "assert a Table paginates" helper is introduced, put it in a NEW file and import it read-only; do not modify shared test infra (`src/test-utils/integration.tsx`, `_mock-state.ts`).

## Acceptance Criteria
1. For each list above:
   - page-2 navigation loads the next page;
   - per-page change reloads with the new size;
   - pagination controls hidden/disabled when items fit on one page;
   - Previous disabled on first page and Next disabled on last.
2. Follows the `renderPage()` / `mockAPI()` pattern; no production code changes.
3. All tests pass under `npm run test:integration`.

## Related prior work
This is a follow-up sub-task to EPMCDME-13479, which added pagination integration tests for the Assistants and Workflows tabs on branch EPMCDME-13479_pagination-tests-remaining-tabs (not yet merged to main). That branch's task directory is docs/superpowers/tasks/2026-07-13-pagination-tests-remaining-tabs/ — look at its spec.md, plan.md, and the actual test files it added (likely under src/pages/assistants/__tests__ and src/pages/workflows/__tests__) as a reference pattern for renderPage()/mockAPI() conventions, shared Table component usage, and any pagination test helper it may have introduced. Also check src/test-utils/integration.tsx and any _mock-state.ts for the existing test infrastructure.

---

## 2. Codebase Findings

### Existing Implementations

**Data Sources**
- `src/pages/dataSources/DataSourcesPage.tsx` — route target under test; uses `useTableFilters({filterKey: FILTER_ENTITY.DATASOURCES, initialPagination: {page:0, perPage: indexStatusesPagination.perPage}})`; renders one `<Table>` with `perPageOptions={DECIMAL_PAGINATION_OPTIONS}`; data comes from `dataSourceStore.indexStatuses`/`indexStatusesPagination`, fetched via `getIndexesStatuses()` inside a `useEffect`. That effect also sets a **5s `REFRESH_TIMEOUT` background re-fetch loop** — a timing hazard for tests that don't await/cleanup carefully.
- `src/pages/dataSources/components/DataSourceFilters.tsx` — sidebar filters; on mount calls `loadIndexUsers()` (`GET v1/index/users`) and `loadProjectOptions()` (via `userStore.getProjects`). These calls fire whenever `DataSourcesPage` mounts and must be accounted for in mocks (or left to global defaults if added).
- `src/store/dataSources.ts` — `getIndexesStatuses()` → `GET v1/index?page=&filters=&per_page=&sort_key=&sort_order=`; response envelope **nested**: `{data, pagination:{page, per_page, pages, total}}`; local `DEFAULT_PER_PAGE = 10`.

**Integrations**
- `src/pages/integrations/IntegrationsPage.tsx` — route target (`/integrations`); hosts `IntegrationsTab`.
- `src/pages/integrations/IntegrationsTab.tsx` — tab switch is **local React state** (`integrationType`), not a route change; `SelectButton` toggles `IntegrationOption.USER` / `IntegrationOption.PROJECT`. Defaults to `USER`. The "Project" `SelectButton` option is only shown if the mocked user is admin (`is_admin: true` or non-empty `applicationsAdmin`) — tests targeting ProjectSettings pagination must mock `v1/user` accordingly and click the SelectButton to switch tabs before asserting pagination.
- `src/pages/integrations/components/UserSettings/UserSettings.tsx` — `useTableFilters({filterKey: FILTER_ENTITY.USER_SETTINGS, initialPagination:{page:0, perPage: userSettingsPagination.perPage}})`; fetch on `[pagination, filters]` change via `userSettingsStore.fetchUserSettings(page, perPage, filters)`; `perPageOptions={DECIMAL_PAGINATION_OPTIONS}`.
- `src/pages/integrations/components/ProjectSettings/ProjectSettings.tsx` — same shape, `FILTER_ENTITY.PROJECT_SETTINGS`, `projectSettingsStore.fetchProjectSettings`.
- `src/store/userSettings.ts` — `fetchUserSettings(page,perPage,filters)` → `GET v1/settings/user?page=&per_page=&filters=`; nested envelope `{data, pagination:{...}}`; `DEFAULT_PER_PAGE = 10`.
- `src/store/projectSettings.ts` — `fetchProjectSettings(page,perPage,filters)` → `GET v1/settings/project?page=&per_page=&filters=`; same nested envelope; `DEFAULT_PER_PAGE = 10`.
- `src/store/user.ts` — `loadIndexUsers` → `GET v1/index/users`; `loadProjectSettingsUsers` → `GET v1/settings/project/users`; `getAdminProjects` → `GET v1/admin/applications` (only if `user.isAdmin`).

**Shared components**
- `src/components/Table/Table.tsx` — memoized; renders `<Pagination>` only when `pagination && !embedded`; passes `perPageOptions`, `pagination.{page,totalPages,perPage,totalCount}`, `onPaginationChange`.
- `src/components/Pagination/Pagination.tsx` — returns `null` entirely when `totalPages <= 1` (no nav rendered at all). Previous/Next buttons (`aria-label="Previous page"` / `"Next page"`) are **conditionally absent from the DOM on first/last page — not rendered-but-`disabled`**. Page buttons carry `aria-label="Page N"` (1-indexed). Per-page `<Select id="per-page">` only renders when `perPage` is truthy; selecting a new value calls `setPage(0, newPerPage)`.
- `src/hooks/useTableFilters.ts` — `useTableFilters({filterKey, initialPagination, ...})` returns `{sort, pagination, filters, onSort, applyFilters, onPaginationUpdate}`.
- `src/constants/index.ts` — `DECIMAL_PAGINATION_OPTIONS = [10, 20, 50, 100]` items — used by DataSources/UserSettings/ProjectSettings. This is **distinct** from `DEFAULT_PAGINATION_OPTIONS` (`12/24/45/90`) used by Assistants/Workflows in the prior task — do not reuse the prior task's "24 items" literal.

**Important behavioral difference from the prior task (EPMCDME-13479)**: neither `useTableFilters.onPaginationUpdate` nor `DataSourcesPage`/`UserSettings`/`ProjectSettings` push pagination state to the router — no URL query-param sync exists for these three pages, unlike some Assistants/Workflows tabs. Tests do not need router-push/URL-sync assertions here.

### Architecture and Layers Affected
- Page/route layer: `DataSourcesPage.tsx`, `IntegrationsPage.tsx` → `IntegrationsTab.tsx` (in-page tab state, not routing).
- Shared UI component layer: `Table.tsx`, `Pagination.tsx`, `Filters.tsx` (test-only consumers, not modified).
- Hook layer: `useTableFilters.ts`, `useProjectOptions.ts`, `useIntegrationTypeOptions.ts`.
- Store (Valtio) layer: `dataSourceStore`, `userSettingsStore`, `projectSettingsStore`.
- HTTP client: `api.get(...)` wrapper used by all three stores; intercepted in tests by the global `fetch` mock (`requestRegistry` / `mockAPI`).
- Test layer (new): `src/pages/dataSources/__tests__/*.integration.test.tsx` (extend existing dir), `src/pages/integrations/__tests__/*.integration.test.tsx` (new dir, does not exist yet).

### Integration Points
- `src/test-utils/integration.tsx` — `renderPage(path)` (mounts real router via `createMemoryRouter`), `mockAPI(method, url, data, paramsOrStatus?)` (exact-pathname match after `v1/` prefix stripping, optional query-param/status narrowing). **Read-only per task constraints.**
- `src/test-utils/_mock-state.ts` — shared `requestRegistry` Map + `navigate` vi.fn singleton. **Read-only per task constraints.**
- `src/setupTests.tsx` — global `fetch` mock with hardcoded `globalDefaults` (`v1/config`, `v1/user`, `v1/user/reactions`, `v1/assistants`, etc.). **No global defaults exist for `v1/index`, `v1/index/users`, `v1/settings/user`, `v1/settings/project`, `v1/settings/project/users`, `v1/admin/applications`** — every new test must mock these explicitly.
- `src/test-utils/component-interactions/select.ts` — exports `selectDropdownOption(identifier, optionLabel, options)`, a reusable helper for driving the PrimeReact dropdown/overlay. None of the existing pagination tests (Assistants/Workflows) actually exercise the per-page dropdown end-to-end via this helper — using it for "per-page change" assertions here would be new usage of an existing utility, not a new pattern.
- Routes: `/data-sources` → `DataSourcesPage`; `/integrations` → `IntegrationsPage` (single route, tab is client state).

### Patterns and Conventions
- `renderPage(path)` + `mockAPI(method, url, data)` + `await waitFor(...)` — standard shape; `mockAPI` calls must precede `renderPage`; last call per key wins.
- Nested pagination envelope `{data, pagination:{page, per_page, pages, total}}` used uniformly by `v1/index`, `v1/settings/user`, `v1/settings/project` — no flat-envelope variant to worry about here (unlike the prior task's Favorites endpoints).
- "Disabled" pagination controls = DOM absence, not the `disabled` attribute: assert via `screen.queryByRole('button', {name: 'Previous page'|'Next page'|'Page N'}).not.toBeInTheDocument()`.
- Per-page change interaction (untested pattern until now): `document.getElementById('per-page')` → open the PrimeReact overlay → select the new option (via `fireEvent.click`, not `userEvent`, per the prior task's established convention for this component) → assert `global.fetch` called with `per_page=<n>` in the URL.
- Per-file bulk fixture factory convention observed in prior pagination tests: `createXFixture(overrides)` + `createXs(count, prefix)`.
- No existing reusable "assert a Table paginates" helper exists anywhere in the repo — this ticket is the first to need one; per its own scope it must live in a new file, imported read-only, without touching `integration.tsx` or `_mock-state.ts`.
- Reference test files (from the unmerged EPMCDME-13479 branch, commit `f6cdb7a65`, not present on the current branch except via `.state.json`):
  - `src/pages/assistants/__tests__/AssistantTemplatesPagination.integration.test.tsx` — dedicated pagination-only file, page-2 click, hidden-when-one-page, URL-sync, nested-envelope, error-toast tests.
  - `src/pages/workflows/__tests__/WorkflowTemplatesPagination.integration.test.tsx` — dedicated pagination-only file, most exhaustive template (buttons shown when >1 page, total count text, first-page-items-only, next-page click, hidden-when-one-page, back-to-page-1, URL query sync, paginated response shape, error toast).
  - `src/pages/assistants/__tests__/AssistantsListPage.integration.test.tsx` and `src/pages/workflows/__tests__/WorkflowsListPage.integration.test.tsx` — embedded `describe('Pagination', …)` / `describe('Favorites Pagination')` blocks added to existing multi-tab list-page files.
- Existing `src/pages/dataSources/__tests__/DataSourceCreatePage.integration.test.tsx` is a same-directory precedent for integration test conventions (imports, mock shape) even though it covers the create flow, not pagination.

---

## 3. Documentation Findings

### Guides and Architecture Docs
- `.ai-run/guides/testing/testing-patterns.md` — P0, directly authoritative: documents the `renderPage()`/`mockAPI()` pattern, `*.integration.test.tsx` naming under `__tests__/`, mocking rules, query priority, DO/DON'T table, common pitfalls.
- `.ai-run/guides/testing/qa-strategy.md` — confirms the Vitest workspace `unit`/`integration` project split and coverage config.
- `.ai-run/guides/testing/qa-health.md` — present, not required beyond `testing-patterns.md` as the P0 guide.
- **Discrepancy**: `AGENTS.md` (and `CLAUDE.md`, which is just `@AGENTS.md`) describes itself as an execution guide for "the CodeMie **backend** repository" and its Guide Imports/Task Classifier tables reference backend-only paths (FastAPI, SQLModel, LangChain, pytest) that do not exist in this repo's `.ai-run/guides/` tree — no `agents/`, `api/`, `data/`, `integration/`, `workflows/` subdirs are present. This is stale boilerplate from a backend template. The actual `.ai-run/guides/testing/testing-patterns.md` content, however, is correctly frontend-flavored (Vitest/RTL) and trustworthy despite the surrounding entrypoint's wrong framing.

### Architectural Decisions
- Prior task (EPMCDME-13479) approach, reconstructed from its `.state.json` and the surviving reference test files: extended two existing multi-tab list-page files rather than creating new ones for the "remaining tabs" scope, using `AssistantTemplatesPagination.integration.test.tsx` as the reference pattern; distinguished nested vs flat response envelopes per endpoint; established "absence, not `disabled`" as the convention for asserting Previous/Next state; used `fireEvent` (not `userEvent`) for the PrimeReact per-page dropdown.
- `spec.md`/`plan.md` for EPMCDME-13479 exist only in that branch's git history (commit `ed243918a`, branch `EPMCDME-13479_pagination-tests-remaining-tabs`), which is **not merged to main** and not present in the current working tree beyond `.state.json`. Direct comparison would require checking out that branch/commit.
- No formal ADR/DECISION markers exist anywhere in the affected source files — behavioral facts (DOM-absence pattern, envelope shape, no URL-sync for these three pages) are implicit and code-derived, not documented.

### Derived Conventions
- Test naming convention observed: `it('navigates to page 2 when page button clicked')`, `it('Previous page button absent on first page')`, `it('Next page button absent on last page')`, `it('does not show pagination buttons when items fit on one page')` — "absent" phrasing, not "disabled".
- `src/pages/integrations/` currently has no `__tests__/` directory at all — must be created for this ticket.

---

## 4. Testing Landscape

### Existing Coverage
- `src/pages/dataSources/__tests__/DataSourceCreatePage.integration.test.tsx` — create-flow only (type selection, validation), no list/pagination coverage.
- `src/pages/dataSources/__tests__/constants.test.ts` — plain unit test, unrelated to pagination.
- `src/pages/dataSources/components/__tests__/*`, `.../DataSourceForm/hooks/__tests__/*` — component/hook-level, unrelated to list pagination.
- `src/pages/integrations/__tests__/` — **directory does not exist**; zero test files anywhere under `src/pages/integrations`.
- `src/components/Pagination/__tests__/Pagination.test.tsx`, `Hint.test.tsx` — unit tests of the shared Pagination component itself, not page-level integration coverage.
- Reference pagination coverage exists only for Assistants/Workflows (from the unmerged EPMCDME-13479 branch): `AssistantTemplatesPagination.integration.test.tsx`, `WorkflowTemplatesPagination.integration.test.tsx`, plus embedded blocks in `AssistantsListPage.integration.test.tsx` / `WorkflowsListPage.integration.test.tsx`.

### Testing Framework and Patterns
- Vitest 1.6.1, @testing-library/react 16.3.0, @testing-library/user-event 14.6.1, jsdom environment.
- `vitest.workspace.ts` defines two projects: `unit` (mocked stores, `**/__tests__/**/*.{test,spec}.*`, excludes `*.integration.test.*`) and `integration` (real Valtio stores + mocked global `fetch`, `**/__tests__/**/*.integration.test.?(c|m)[jt]s?(x)`, setup via `src/setupTests.tsx`). Run via `npm run test:integration` → `vitest run --project integration`.
- `afterEach` in `src/setupTests.tsx` clears `requestRegistry`, the `navigate` mock, `fetchMock`, calls `cleanup()`, and resets `appInfoStore`.
- Assertion style for "reload with new page/filter": re-register `mockAPI` with new fixture data right before the user action, then `await waitFor(...)` on new content and/or assert `global.fetch` called with the expected query string.

### Coverage Gaps
- `src/pages/dataSources/__tests__` — zero pagination tests today.
- `src/pages/integrations/__tests__` — does not exist; fully greenfield for both UserSettings and ProjectSettings tables.
- No generic "assert Table paginates" helper exists in the repo — this ticket introduces the first one.
- No existing pagination test (Assistants/Workflows included) actually drives the per-page `<Select>` end-to-end via `selectDropdownOption` — the "per-page change reloads with new size" AC requires genuinely new interaction code, not a copy-paste of an established pattern.
- No global `fetch` defaults exist for `v1/index`, `v1/index/users`, `v1/settings/user`, `v1/settings/project`, `v1/settings/project/users`, `v1/admin/applications` — every new test must mock these explicitly, increasing per-test setup surface.

---

## 5. Configuration and Environment

### Environment Variables
- No `import.meta.env` / `process.env` usage found under `src/pages/dataSources`, `src/pages/integrations`, or `src/test-utils` — these pages and the test infra don't read env vars directly. No env setup is needed for these new tests.

### Configuration Files
- `vitest.workspace.ts` — new tests must be named `*.integration.test.tsx` under a `__tests__/` directory to be picked up by the `integration` project.
- `package.json` — `test:integration` script (`vitest run --project integration`) is the command ACs require to pass; `test:coverage` runs only the `unit` project and does not include integration tests.
- `vite.config.ts` — shared base config; istanbul coverage excludes `**/__tests__/**` (not relevant to gating these new tests, since coverage runs on `unit` only).
- `src/setupTests.tsx` — shared setup for the `integration` project (global fetch mock, defaults, cleanup hooks).

### Feature Flags and Deployment Concerns
- No feature flags gate pagination behavior in `Table.tsx`, `useTableFilters.ts`, `DataSourcesPage.tsx`, `IntegrationsPage.tsx`, or `IntegrationsTab.tsx`. The only flag found near this area (`features:sharepointCodeMieOAuth` in `DataSourceForm/IndexTypeField/IndexTypeSharePoint.tsx`) gates SharePoint OAuth UI and is unrelated.
- No CI/CD pipeline definitions (`.github/workflows`, `.gitlab-ci.yml`, `Jenkinsfile`) exist in this repo — test execution appears to be local/pre-commit only (`husky` + `check:pre-commit` script). There is no visible automated gate enforcing `npm run test:integration` passes before merge; this is a process risk worth flagging, not something the tests themselves need to address.

---

## 6. Risk Indicators

- `src/pages/integrations/__tests__` does not exist — must be created; fully greenfield for both UserSettings and ProjectSettings, no prior test file to pattern-match line-by-line within that directory.
- No global default `fetch` mocks exist for `v1/index`, `v1/index/users`, `v1/settings/user`, `v1/settings/project`, `v1/settings/project/users`, `v1/admin/applications` — every new test needs explicit mocks for these endpoints, increasing setup boilerplate and risk of flaky/incomplete mocking (e.g. `DataSourceFilters.tsx` calls `loadIndexUsers`/`loadProjectOptions` on mount alongside the main list fetch).
- `DataSourcesPage.tsx` has a background 5s `REFRESH_TIMEOUT` re-fetch loop (`useEffect`) that can re-trigger `mockAPI`-backed fetches during a test if it isn't torn down or awaited carefully — potential source of flaky/act-warning failures.
- ProjectSettings pagination tests require the mocked `v1/user` response to grant admin/`applicationsAdmin` access (to reveal the "Project" `SelectButton` option) plus a UI click to switch tabs before any pagination assertions — extra setup complexity not present in the Assistants/Workflows precedent (which used direct route navigation between tabs).
- The per-page dropdown ("per-page change reloads with new size" AC) is not exercised end-to-end by any existing pagination test in the repo — this is new interaction code, not a copy of an established pattern, even though the underlying `selectDropdownOption` helper already exists in `component-interactions/select.ts`.
- `DECIMAL_PAGINATION_OPTIONS` (`10/20/50/100`) applies to dataSources/integrations, not `DEFAULT_PAGINATION_OPTIONS` (`12/24/45/90`) used by the prior task's Assistants/Workflows tests — reusing prior literals (e.g. "24 items") verbatim would be incorrect for this ticket.
- The prior task's `spec.md`/`plan.md` (EPMCDME-13479) exist only on an unmerged branch's git history, not in the current working tree — cannot be read directly without checking out that branch/commit; only `.state.json` remains in `docs/superpowers/tasks/2026-07-13-pagination-tests-remaining-tabs/`.
- No CI/CD pipeline exists in this repo to gate `npm run test:integration` automatically — AC #3 ("all tests pass under npm run test:integration") currently depends on local/manual verification.
- `AGENTS.md`/`CLAUDE.md` guide entrypoint is stale and backend-flavored (describes FastAPI/pytest conventions that don't apply here), though the actual `.ai-run/guides/testing/testing-patterns.md` content is correct and frontend-flavored — a reader following the entrypoint literally could be misdirected.
- If a shared "assert a Table paginates" helper is introduced (optional per ticket), it must correctly abstract over three different data-fetch/store wiring paths (`dataSourceStore`, `userSettingsStore`, `projectSettingsStore`) and the ProjectSettings tab-switch precondition — a naive extraction risks being either too rigid (breaks on ProjectSettings) or too loose (misses assertions).

---

## 7. Summary for Complexity Assessment

This task touches three page-level components (`DataSourcesPage`, `UserSettings`, `ProjectSettings`) that share the same `Table.tsx` + `useTableFilters` + `Pagination.tsx` infrastructure already exercised by the prior EPMCDME-13479 task for Assistants/Workflows, so the underlying pagination mechanics (DOM-absence convention for disabled controls, nested `{data, pagination}` envelope, `renderPage()`/`mockAPI()` test harness) are well understood and directly reusable. The expected file-change surface is entirely new test files: likely 1–2 files under `src/pages/dataSources/__tests__` (extending an existing directory) and a brand-new `src/pages/integrations/__tests__` directory with 1–2 files covering both UserSettings and ProjectSettings, plus an optional new shared pagination-assertion helper file. No production code changes are required or permitted.

Technical novelty is moderate rather than low: unlike the prior task, these three pages have no router URL-sync for pagination (simpler in one dimension), but the "per-page change" AC requires genuinely new interaction code — no existing pagination test in the repo drives the PrimeReact per-page `<Select>` end-to-end, even though a generic `selectDropdownOption` helper already exists to do so. ProjectSettings additionally requires mocking an admin user and performing a UI tab-switch click before pagination can even be asserted, which is a new setup wrinkle relative to the direct-route-navigation pattern used for Assistants/Workflows tabs.

Test coverage posture is a clean gap rather than a regression risk: `src/pages/dataSources/__tests__` exists but has zero pagination coverage, and `src/pages/integrations/__tests__` does not exist at all. The main risk factors for complexity scoring are (1) the absence of global `fetch` mock defaults for six relevant endpoints, forcing explicit per-test mocking across three page types; (2) a background 5-second refetch timer in `DataSourcesPage` that could introduce test flakiness if not handled; and (3) the admin-gated ProjectSettings tab requiring extra mock/interaction setup before its pagination behavior can be tested at all.
