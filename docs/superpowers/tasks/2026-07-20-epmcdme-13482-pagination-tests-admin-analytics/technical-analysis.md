# Technical Research

**Task**: pagination integration tests administration analytics
**Generated**: 2026-07-20
**Research path**: codegraph

---

## 1. Original Context

Add new integration tests for the remaining shared-Table pages:
- Settings > Administration management tables (all 7): Users, Projects, Cost Centers, Categories, Providers, MCPs, Budgets (src/pages/settings/administration)
- Analytics drill-down modals: Asset Reusability and User Engagement (src/pages/analytics)

The 7 admin tables are near-identical; use a parametrized/loop test to cover them together.

Files (new): under src/pages/settings/administration/**/__tests__ and src/pages/analytics/components/__tests__.

Do not modify shared test infra (src/test-utils/integration.tsx, _mock-state.ts).

Acceptance Criteria:
1. For each table/list above: page-2 navigation loads the next page; per-page change reloads with the new size; pagination controls hidden/disabled when items fit on one page; Previous disabled on first page and Next disabled on last.
2. Admin management tables are covered via a shared parametrized test rather than 7 copies.
3. Follows the renderPage()/mockAPI() pattern; no production code changes.
4. All tests pass under npm run test:integration.

---

## 2. Codebase Findings

### Existing Implementations

**7 admin management pages** — `src/pages/settings/administration/`:
- `UsersManagementPage.tsx` — route `/settings/administration/users`; uses `userStore.getUsers`, local `pagination` state, `Table` + `onPaginationChange`.
- `ProjectsManagementPage.tsx` — route `/settings/administration/projects`; does **not** itself contain pagination logic — it renders `ProjectsManagementDefault.tsx` → `AdminToolsCard`/`ProjectsManagementFull.tsx` (own pagination wiring). Confirm the actual pagination-bearing component before writing the "Projects" test case.
- `CostCentersManagementPage.tsx` — route `/settings/administration/cost-centers`; endpoint `v1/admin/cost-centers` (`COST_CENTERS_BASE_URL`), local `page`/`perPage` state.
- `CategoriesManagementPage.tsx` — route `/settings/administration/categories`; `categoriesStore.indexCategories` → `v1/assistants/categories/list`.
- `ProvidersManagementPage.tsx` — route `/settings/administration/providers`; `v1/providers` (GET/POST/PUT/DELETE). Only a unit test (`ProvidersManagementPage.test.tsx`) exists today; the project's own testing guide names `ProvidersManagementPage.integration.test.tsx` as the expected co-located file — it does not yet exist.
- `MCPManagementPage.tsx` — route `/settings/administration/mcps`; `mcpStore.indexConfigs` → `v1/mcp-configs`.
- `BudgetsManagementPage.tsx` — route `/settings/administration/budgets`; endpoint `v1/admin/budgets`. Check whether `VITE_ENABLE_BUDGET_MANAGEMENT` gates rendering.

**2 analytics drill-down modals** — `src/pages/analytics/components/`:
- `AssetReusabilityDrillDownModal.tsx` — not a routed page; opened via `openAssetReusabilityDrillDown(projectName)` store action, triggered by a row click in `AIAdoptionTab.tsx`. Has **three tabs** (assistants/workflows/datasources), each with independent `page`/`per_page` state in `AssetReusabilityDrillDownState`; endpoints `v1/analytics/ai-adoption-asset-reusability/{assistants,workflows,datasources}`.
- `UserEngagementDrillDownModal.tsx` — opened via `openUserEngagementDrillDown(projectName)`; endpoint `v1/analytics/ai-adoption-user-engagement/users`.

**Shared UI components**:
- `src/components/Table/Table.tsx` — `TableProps.pagination = { page, totalPages, perPage, totalCount? }`, `onPaginationChange`, `perPageOptions`; renders `<Pagination {...paginationProps} />` when `pagination && !embedded`.
- `src/components/Pagination/Pagination.tsx` — `PaginationProps { currentPage, totalPages, setPage, perPage?, perPageOptions? }`. Returns `null` entirely when `totalPages <= 1` (no controls in the DOM at all). Previous button (`aria-label="Previous page"`) only renders when `currentPage !== 0`; Next button (`aria-label="Next page"`) only renders when `currentPage !== totalPages - 1`. Page buttons use `aria-label="Page N"` (1-indexed).

**Stores** (Valtio) backing each table: `src/store/user.ts`, `categories.ts`, `mcp.ts`, `costCenters.ts`, `providers.ts`, `budgets.ts`, `analytics.ts` (projects handled separately via `ProjectsManagementFull.tsx`).

### Architecture and Layers Affected

Route (`src/router.tsx`) → Page component → Store (Valtio proxy, `src/store/*.ts`) → `api` client (`src/utils/api.ts`) → shared `Table`/`Pagination` UI components. Analytics modals are a variant: store-state-driven overlay (not route-driven), triggered by a UI interaction on the Analytics page's AI Adoption tab, layered on top of the same Table/Pagination components.

Layers touched: Page/Route layer (8 admin + analytics pages, none are new files — only new tests), Store layer (read-only, consumed not modified), shared UI component layer (Table/Pagination — consumed, not modified), Test layer (new `__tests__` files only, per explicit task constraint of "no production code changes").

### Integration Points

- `src/router.tsx` — route definitions for all 7 admin pages; analytics routes are conditionally included: `...(isEnterpriseEdition() ? analyticsRoutes : [])`.
- `isEnterpriseEdition()` (`src/utils/enterpriseEdition.ts`) reads `import.meta.env.VITE_IS_ENTERPRISE_EDITION`, which defaults to `'false'` and is not set anywhere in the repo's env/test config. **This means `renderPage('/analytics')` will 404 under the default test environment** — the two analytics modal tests will need to stub `isEnterpriseEdition()` (e.g. `vi.mock('@/utils/enterpriseEdition', () => ({ isEnterpriseEdition: () => true }))`) or an equivalent env override before the route becomes reachable.
- Analytics modals additionally require: navigate to `/analytics` → select AI Adoption tab → mock the underlying summary table API that renders clickable project rows → click a row to trigger `openAssetReusabilityDrillDown`/`openUserEngagementDrillDown` → then assert pagination behavior inside the modal. This is a materially longer setup path than the admin tables' direct `renderPage(route)` pattern.
- `api` client (`src/utils/api.ts`) is the mock interception boundary used by `mockAPI()` — all 9 target surfaces (7 admin + 2 modal endpoints) go through it.

### Patterns and Conventions

- Canonical test pattern lives in `src/test-utils/integration.tsx`: `renderPage(path)` mounts the full app via `createMemoryRouter(routes, {initialEntries:[path]})`; `mockAPI(method, url, data, statusOrParams?)` registers a fetch intercept in the shared `requestRegistry` (`src/test-utils/_mock-state.ts`). Both files are explicitly off-limits for modification per the task.
- Best reference implementation: `src/pages/assistants/__tests__/AssistantTemplatesPagination.integration.test.tsx` (sibling: `src/pages/workflows/__tests__/WorkflowTemplatesPagination.integration.test.tsx`). Covers: page-2 button appears when >1 page, first page shows only first-page items, clicking "Page 2" loads next page, no pagination buttons when everything fits on one page, back-to-page-1 navigation, URL query-param sync, `{data, pagination}` response shape, error toast on failure. This is the template to replicate for both the admin parametrized test and the two modal tests.
- `.ai-run/guides/testing/testing-patterns.md` dictates: AAA-style unit tests, `describe`/`it` integration tests using `getByRole`/`findByRole` first, `waitFor` around all async assertions, `afterEach(cleanup)`. It also names `ProvidersManagementPage.integration.test.tsx` as the expected file for that page — confirming the co-located, per-page (or per-parametrized-suite) naming convention to follow.
- Prior related work: `.ai-run/runs/EPMCDME-13479`, `-13480`, `-13481` ("pagination-tests-remaining-tabs", "feature-list-pages", "tables") indicate this task is a continuation of an ongoing pagination-test-coverage initiative — useful precedent for scope/style, though those covered different feature areas (assistants/workflows lists, not admin/analytics).

---

## 3. Documentation Findings

### Guides and Architecture Docs

- `.ai-run/guides/testing/testing-patterns.md` — directly applicable and frontend-specific (confirmed NOT the backend-oriented guide referenced generically in AGENTS.md; this repo is a React/TS frontend, and this guide is the correct P0 reference for this task).
- `.ai-run/guides/architecture/routing-patterns.md`, `.ai-run/guides/components/component-organization.md`, `.ai-run/guides/patterns/modal-patterns.md` — plausibly relevant to the analytics drill-down modal flow (route gating, modal trigger wiring); not yet read in full — worth a quick check before writing the modal tests.
- `.ai-run/guides/quality-gates.md`, `.ai-run/guides/testing/qa-strategy.md`, `qa-health.md` — present, not yet inspected for integration-test-specific gates.

### Architectural Decisions

- No explicit ADRs found. The `Pagination` component's design choice to omit (not disable) boundary buttons, and to return `null` entirely for single-page result sets, is a recorded behavioral convention evidenced directly in `src/components/Pagination/Pagination.tsx` rather than a written ADR.

### Derived Conventions

- Pagination "disabled" state is expressed as DOM absence, not a `disabled` attribute — tests must use `queryByRole(...).not.toBeInTheDocument()` for edge-page assertions, mirroring `AssistantTemplatesPagination.integration.test.tsx`.
- Each admin table wires pagination slightly differently (some via local `useState`, some via store-held `pagination.page/perPage`) — a parametrized test needs a per-table config object (route, mock URL, item-count fixture factory, unique row-identifying text/selector) rather than assuming byte-identical page components across all 7.

---

## 4. Testing Landscape

### Existing Coverage

- `src/pages/settings/administration/__tests__/` — contains `ProvidersManagementPage.test.tsx` (unit only), `ProjectDetailsPage.test.tsx`, Teams Bot tests, Providers create/edit tests. **No integration or pagination tests exist for any of the 7 target tables.**
- `src/pages/settings/administration/projectsManagement/__tests__/ProjectsManagementFull.test.tsx` — covers resource-counter badge links only, not pagination.
- `src/pages/analytics/components/__tests__/` — `AnalyticsFilters.test.tsx`, `AnalyticsUserFilter.test.tsx`, `InfoNotice.test.tsx` — all unit tests; **no integration tests and no drill-down modal tests exist**.
- `src/pages/analytics/__tests__/AnalyticsPage.test.tsx` — heavy `vi.mock`-based unit test (mocks store, router, child components) — not a usable integration-test template for this task.
- Both target `__tests__` directories already exist (with unrelated unit tests inside); new integration test files should be added alongside existing files, not replacing anything.
- Despite the task's "remaining" framing implying prior shared-Table pages were already covered, no admin/analytics pagination tests exist yet — the closest precedents are `AssistantTemplatesPagination.integration.test.tsx` and `WorkflowTemplatesPagination.integration.test.tsx`, which cover a different feature area (assistants/workflows list pages, not admin/analytics).

### Testing Framework and Patterns

- Vitest 1.6.1 + `@testing-library/react` 16.3.0 + `@testing-library/user-event` 14.6.1.
- Two workspace projects (`unit`, `integration`) defined in `vitest.workspace.ts`.
- `npm run test:integration` runs `vitest run --project integration`, matching `**/__tests__/**/*.integration.test.?(c|m)[jt]s?(x)`, with setup files `./src/setupTests` + `./src/setupTests.integration`, `testTimeout: 15000`.
- No MSW; API mocking is entirely through the project's own `mockAPI`/`requestRegistry` mechanism.
- `vitest-env-integration.ts` — custom jsdom environment working around a React Router v7 `AbortSignal`/`Request` cross-realm bug.
- `src/setupTests.tsx` / `src/setupTests.integration.ts` — global setup; mocks `SettingsLayout` and `useVueRouter`; raises async timeout to 15000ms.

### Coverage Gaps

- All 7 admin tables: zero pagination/integration coverage today.
- Both analytics drill-down modals: zero pagination/integration coverage today, and zero integration coverage of any kind for the modals' open/close/tab-switch flow.
- No integration test currently exercises the enterprise-edition route gate for `/analytics` — the pattern for stubbing `isEnterpriseEdition()` in tests, if it exists elsewhere in the suite, was not confirmed and should be checked before writing the modal tests.

---

## 5. Configuration and Environment

### Environment Variables

- `VITE_IS_ENTERPRISE_EDITION` — read by `src/utils/enterpriseEdition.ts`; gates inclusion of `analyticsRoutes` in `src/router.tsx`. Not set in any `.env` or test config found — defaults to `'false'`, meaning `/analytics` is unreachable via `renderPage()` unless stubbed in the new test file.
- `VITE_ENABLE_BUDGET_MANAGEMENT` — referenced in `UsersManagementPage.tsx`; verify whether it also affects `BudgetsManagementPage.tsx` rendering before assuming budgets table behaves identically to the other 6.

### Configuration Files

- `vitest.workspace.ts` — defines the `unit` and `integration` Vitest projects and their respective test-file globs/setup files.
- `vitest-env-integration.ts` — custom jsdom test environment.
- `src/setupTests.tsx`, `src/setupTests.integration.ts` — global test setup (component mocks, timeout config).

### Feature Flags and Deployment Concerns

- Enterprise-edition gate (`VITE_IS_ENTERPRISE_EDITION`) is the primary deployment-relevant concern for this task — it directly blocks the analytics route in the default test environment and must be handled inside the new test files (not in shared setup, since shared test infra is off-limits per the task).
- `VITE_ENABLE_BUDGET_MANAGEMENT` — secondary flag to verify for the Budgets admin table.

---

## 6. Risk Indicators

- **Analytics route is enterprise-gated and unreachable by default**: `renderPage('/analytics')` will 404 unless `isEnterpriseEdition()` is stubbed to return `true` inside the new analytics test files (shared setup files are off-limits, so this stub must live locally in each modal's test file).
- **Analytics modals are not routed pages** — they are Valtio-store-driven overlays opened via a row click inside `AIAdoptionTab.tsx` on the AI Adoption tab of the Analytics page. Testing pagination requires a longer setup chain (navigate → select tab → mock summary table → click row → open modal → assert pagination) compared to the admin tables' direct route-based `renderPage()` calls.
- **Asset Reusability modal has 3 independent sub-tabs** (assistants/workflows/datasources), each with its own `page`/`per_page` state and endpoint. The task's acceptance criteria do not specify whether all 3 need coverage or one representative tab suffices — this is a scope ambiguity worth flagging to the requester/spec phase.
- **`ProjectsManagementPage.tsx` has no direct pagination logic** — it delegates to `ProjectsManagementDefault.tsx` → `ProjectsManagementFull.tsx`. The parametrized admin-table test cannot assume a uniform "page component = pagination owner" mapping; the Projects case needs its own route/selector confirmation.
- **Pagination "disabled" semantics are DOM-absence, not `disabled` attribute** — the shared `Pagination` component omits Previous/Next buttons at edges and returns `null` entirely for single-page results. Acceptance Criterion 1 ("Previous disabled on first page and Next disabled on last") must be implemented as `queryByRole(...).not.toBeInTheDocument()` assertions, not `toBeDisabled()`. Misreading this could produce tests that fail against actual component behavior.
- **The 7 admin tables are "near-identical" but not byte-identical** in pagination wiring (mix of local `useState` and store-held pagination state, differing endpoints/base URLs). The shared parametrized test (AC2) needs a per-table config object rather than a single hardcoded flow.
- **No existing integration test exists for any of the 9 target surfaces** (7 admin + 2 modals) — this is genuinely new coverage despite the "remaining" framing in the task; only `AssistantTemplatesPagination.integration.test.tsx` / `WorkflowTemplatesPagination.integration.test.tsx` exist as structurally similar precedents in a different feature area.
- **`VITE_ENABLE_BUDGET_MANAGEMENT` flag** — unconfirmed whether it independently gates `BudgetsManagementPage.tsx` rendering; needs verification before assuming budgets behaves like the other 6 tables.
- Guides `.ai-run/guides/architecture/routing-patterns.md`, `component-organization.md`, and `modal-patterns.md` were not read in full during this pass — recommend a follow-up check before finalizing the analytics modal test design, particularly around the enterprise-edition route stubbing convention if one already exists elsewhere in the suite.

---

## 7. Summary for Complexity Assessment

This task touches the test layer only (no production code changes, per explicit constraint) but spans two structurally different integration surfaces: 7 near-identical, directly-routed admin management pages, and 2 store-driven analytics drill-down modals nested inside a gated, tabbed page. Expected file change surface is small in count but non-trivial in design: one new parametrized test file (or a small set of files) covering all 7 admin tables via a shared config-driven loop, plus two standalone integration test files for the analytics modals — likely 3-5 new test files total, none touching `src/test-utils/integration.tsx` or `_mock-state.ts`. All target page/store/component code already exists and is stable; the shared `Table`/`Pagination` components have a clear, well-defined API and disabled-state semantics (DOM absence rather than attribute), directly inferable from source and from the existing `AssistantTemplatesPagination.integration.test.tsx` reference implementation.

Technical novelty is low for the admin-table suite — it follows an established `renderPage()`/`mockAPI()` pattern with a strong existing template to copy, and the main design work is building a correct per-table parametrization config rather than inventing new test infrastructure. Novelty is moderate-to-high for the analytics modals: they require navigating a route currently gated behind an unset enterprise-edition environment flag (requiring a local `vi.mock` stub inside the new test files, since shared setup is off-limits), and require a multi-step interaction chain (tab selection, row click, modal open) before pagination can even be exercised — plus an open scope question about whether all 3 Asset Reusability sub-tabs need coverage.

Test coverage posture for this domain is currently zero across all 9 target surfaces — this is greenfield integration-test coverage, not an extension of partial coverage, despite the task's "remaining" framing (the actual prior "remaining shared-Table pages" precedent set — assistants/workflows list pages — lives in a different feature area). Key risk factors for complexity scoring: the enterprise-edition route gate blocking analytics tests until stubbed; the non-uniform pagination wiring across the 7 admin pages (especially Projects, which delegates through two extra component layers); and the ambiguous sub-tab scope for the Asset Reusability modal, which should be resolved before implementation to avoid rework.
