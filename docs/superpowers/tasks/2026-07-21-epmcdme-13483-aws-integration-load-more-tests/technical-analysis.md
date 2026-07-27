# Technical Research

**Task**: aws vendor integration pagination cursor nextToken AwsEntityList
**Generated**: 2026-07-21T00:00:00Z
**Research path**: filesystem

---

## 1. Original Context

Add integration tests for the AWS Integration entity lists in codemie-ui. The AWS lists (Agents, Flows, Knowledge Bases, Guardrails, AgentCore Runtimes) use a cursor/nextToken 'Load more' mechanism instead of page-number pagination. Tests go under src/pages/settings/components/vendor/_tests_/. Key files: src/pages/settings/components/vendor/AwsEntityList.tsx, AwsEntitySettingsTable.tsx, awsVendorStore / src/store/vendor.ts. Must NOT modify shared test infra (src/test-utils/integration.tsx, _mock-state.ts). Acceptance criteria: (1) 'Load more' button shown only while nextToken present, absent when no next page; (2) clicking 'Load more' appends next page items to existing list (not replacing); (3) follows renderPage()/mockAPI() pattern — no production code changes; (4) all tests pass under npm run test:integration.

---

## 2. Codebase Findings

### Existing Implementations

- `src/pages/settings/components/vendor/AwsEntityList.tsx` — renders the entity grid (one `Card` per item); reads `awsVendorStore.vendorEntities` / `vendorEntitiesPagination` via `useSnapshot`; fetches on mount via `getVendorEntities(originType, entityType, settingId)`. "Load more..." button (literal text, with ellipsis) renders only when `!isLoading && vendorEntities.length > 0 && vendorEntitiesPagination.nextToken` is truthy (component lines ~136-142). `onClick` calls `getVendorEntities(originType, entityType, settingId, true)`. Empty state: "No entities found" when `!isLoading && vendorEntities.length === 0`. Loading state: inline `Spinner` while `isLoading && vendorEntities.length === 0`.
- `src/pages/settings/components/vendor/AwsEntitySettingsTable.tsx` — a separate, page-number-paginated table listing AWS integration *settings* per project (uses `vendorSettingsPagination` / `Pagination` component, not cursor-based). Its "Manage" button navigates to `.../:settingId`, which renders `AwsEntityList`. Out of scope for nextToken assertions but shares the page route family.
- `src/store/vendor.ts` (`awsVendorStore`, a `valtio` `proxy`) — `getVendorEntities(originType, entityType, settingId, loadMore?, extraParams?)`:
  - Sets `loading.entities = true`.
  - If `!loadMore`, resets `vendorEntities = []` first (replace semantics).
  - Appends a `next_token` query param only when `loadMore && nextToken` is set.
  - Builds URL: `` v1/vendors/${originType}/${entityType}?setting_id=${settingId}&per_page=${perPage}[&next_token=...] ``.
  - Response shape consumed: `{ data: VendorEntity[], pagination: { next_token: string | null } }`.
  - Merges: `vendorEntities = loadMore ? [...existing, ...data] : data` (append vs replace — this is the exact mechanism acceptance criteria 1 and 2 must assert against).
  - Updates `vendorEntitiesPagination = { perPage, nextToken: pagination?.next_token ?? null }` after every fetch.
  - The same `LoadMorePagination` cursor pattern is reused by `getVendorVersions`, `getVendorAliases`, and `getAgentCoreEndpoints` (sibling "Load more" flows) — establishing this as a repeated, intentional store convention, not a one-off.
- `src/types/common.ts` — `LoadMorePagination { perPage: number; nextToken: string | null }` (cursor-based, used by `vendorEntitiesPagination`) vs `Pagination { page, perPage, totalPages, totalCount }` (client-side page-number state, used by the settings table) vs `PaginationBE { page, per_page, total, pages }` (server shape for page-based endpoints, unrelated to this task).
- `src/types/entity/vendor.ts` — `VendorEntityType` enum: `assistant='assistants'` (Agents), `workflows='workflows'` (Flows), `knowledgebases='knowledgebases'`, `guardrails='guardrails'`, `agentcoreRuntimes='agentcore-runtimes'`, `agentcoreEndpoints`. `VendorOriginType.AWS='aws'`. `VendorEntity { id, name, description, status: 'PREPARED'|'NOT_PREPARED', aiRunId? }`.
- Five thin page wrappers render `AwsEntityList` with different `entityType` props: `src/pages/settings/aws/assistants/AwsAssistantsPage.tsx`, `.../workflows/AwsWorkflowsPage.tsx`, `.../guardrails/AwsGuardrailsPage.tsx`, `.../dataSources/AwsDataSourcesPage.tsx` (+ `AwsDataSourcesList.tsx`), and `.../agentCoreRuntimes/AwsAgentCoreRuntimesListPage.tsx`.
  - **Routing split (important)**: the first four pages read `settingId` from **`useVueRouter().currentRoute.value.params`** — a globally-mocked hook (`src/hooks/useVueRouter.tsx`, auto-mocked in `src/setupTests.tsx` via `vi.mock`). Tests targeting these pages must manually set `mockRouterState.currentRoute.value.params = { settingId: '...' }` before calling `renderPage(...)`.
  - `AwsAgentCoreRuntimesListPage.tsx` differs: it reads `settingId` via the **real** `react-router` `useParams<{settingId}>()`, route `settings/aws/agentcore-runtimes/:settingId`. This page's `settingId` is populated automatically by `renderPage()`'s real memory router — no manual router-state poking needed. This makes it the lowest-friction entry point to start with.
  - Routes are declared in `src/router.tsx` (`awsSettingsRoutes`).

### Architecture and Layers Affected

- **Component layer**: `AwsEntityList.tsx` (grid + Load more button), `AwsEntitySettingsTable.tsx` (page-based settings table, not cursor-based), five thin page wrappers under `src/pages/settings/aws/*`.
- **Store/state layer**: `awsVendorStore` (valtio proxy) in `src/store/vendor.ts` — holds `vendorEntities`, `vendorEntitiesPagination: LoadMorePagination`, `loading.entities`, and the `getVendorEntities` action performing fetch + merge + pagination bookkeeping.
- **API layer**: `src/utils/api` (`api.get`) hitting `v1/vendors/{originType}/{entityType}?setting_id=...&per_page=...&next_token=...`.
- **Routing layer**: `src/router.tsx` (`awsSettingsRoutes`) + `useVueRouter` (globally mocked in tests) / real `react-router` `useParams` (agentcore-runtimes page only).
- **Test infra layer** (read-only for this task): `src/test-utils/integration.tsx` + `src/test-utils/_mock-state.ts` + `src/setupTests.tsx` / `src/setupTests.integration.ts`.

### Integration Points

- `src/pages/settings/aws/*` → `AwsEntityList.tsx` → `awsVendorStore` (`src/store/vendor.ts`) → `src/utils/api` → `v1/vendors/{origin}/{entityType}` REST endpoint.
- `AwsEntitySettingsTable.tsx` → `awsVendorStore.getVendorSettings` (different, page-number `Pagination` shape) — a separate flow, not cursor-based, not in scope.
- New test files → `src/test-utils/integration.tsx` (`renderPage`, `mockAPI`) → `src/test-utils/_mock-state.ts` (`requestRegistry`) → `src/setupTests.tsx` (global `fetch` mock). None of these three files may be modified per task constraints; `requestRegistry` may be *imported* (not modified) if a stateful factory approach is needed.
- No mock-server routes exist for AWS/vendor endpoints (`mock-server/routes.json`, `db.json` checked) — confirms integration tests must exclusively use `mockAPI()`/`renderPage()`.
- No CI workflow files exist in the repo (no `.github/workflows`) — the only validation gate is local `npm run test:integration`.

### Patterns and Conventions

- Valtio `useSnapshot(awsVendorStore)` for reactive reads in components; direct `awsVendorStore.xxx = ...` mutation inside store actions.
- Cursor-pagination shape (`LoadMorePagination { perPage, nextToken }`) and the `loadMore ? [...prev, ...data] : data` merge logic are repeated across four store actions (`getVendorEntities`, `getVendorVersions`, `getVendorAliases`, `getAgentCoreEndpoints`) — a deliberate, reusable convention.
- `describe.each(TABLE_CONFIGS)` pattern from the sibling page-number pagination task (`2026-07-20-epmcdme-13482-pagination-tests-admin-analytics`, reconstructed from its `code-review.diff`) — a `TableConfig` array driving one shared test body across multiple sibling lists. Directly transferable structure for AWS's five entity lists (Agents/Flows/Knowledge Bases/Guardrails/AgentCore Runtimes), with a per-config override field (`nextPageParams` in the prior task, maps to `next_token`-based matching here) for entities whose pagination query-param shape differs.
- Button text is literally `"Load more..."` — tests should use a case-insensitive/partial matcher, e.g. `findByRole('button', { name: /load more/i })`, matching the existing precedent in `AwsAgentCoreRuntimeDetails.test.tsx`.
- Anti-flake pattern from the prior pagination task: before a *negative* assertion (button absent / no more pages), first `await` a positive settle-anchor (e.g. `await screen.findByRole(...)`) — asserting immediately after content appears can pass vacuously mid-remount. This exact bug was caught and fixed in that task's code-review round; apply the same discipline here.
- Only add new fixtures/`it` blocks — never modify existing single-page fixtures, preserving existing coverage (established convention from the prior task).

---

## 3. Documentation Findings

### Guides and Architecture Docs

- `.ai-run/guides/testing/testing-patterns.md` — canonical integration-test conventions (renderPage/mockAPI, query priority, DO/DON'T table, checklist); directly applicable, contains no AWS-specific content.
- `.ai-run/guides/testing/qa-strategy.md` — confirms integration test location/run command/setup (`src/setupTests.tsx`, `npm run test:integration`); no AWS-specific content.
- No guide is specific to vendor integrations or cursor/nextToken pagination — conventions must be derived from the prior pagination task's diffs and from direct source reading (both done in this analysis).

### Architectural Decisions

- No formal ADR files exist in the repo.
- `docs/superpowers/tasks/2026-07-13-pagination-tests-remaining-tabs/plan.md` (Out of scope section) explicitly records: "AWS Integration 'Load more' cursor pagination (separate sub-task EPMCDME-13483)" — confirming this task is the planned, designated follow-up to the page-number pagination test series (parent EPMCDME-5727), not ad hoc work.
- `docs/superpowers/tasks/2026-07-20-epmcdme-13482-pagination-tests-admin-analytics/` retains only `.state.json`, `code-review.diff`, and `code-review-check.diff` (spec/plan already reconciled post-merge) — the diffs are the only surviving artifacts and double as full working examples of the established integration-test pattern.

### Derived Conventions

- Test files use an Apache 2.0 EPAM license header, then `import { screen, fireEvent } from '@testing-library/react'` and `describe/it/expect/beforeEach/afterEach/vi` from vitest.
- Import `renderPage`, `mockAPI` from `@/test-utils/integration`; import `requestRegistry` from `@/test-utils/_mock-state` directly (an import, not a modification) when a dynamic/body-aware factory mock is needed instead of a static `mockAPI` call.
- Response fixtures should follow `{ data: VendorEntity[], pagination: { next_token: string | null } }` to match `getVendorEntities`'s consumption shape.
- `SettingsLayout` is globally mocked in `setupTests.tsx` to a plain div wrapper — no sidebar/nav dependencies to fight when rendering AWS settings pages.
- No feature flags gate the AWS entity list or AgentCore Runtimes feature — `VendorEntityType` is a plain enum with no config/flag guard in the reviewed files, so `vi.mock('@/hooks/useFeatureFlags', ...)` (used elsewhere for flag-gated pages) is not needed here.

---

## 4. Testing Landscape

### Existing Coverage

- `src/pages/settings/components/vendor/__tests__/AwsEntitySettingsTable.test.tsx` — **unit** test (mocks `awsVendorStore` and `useVueRouter` directly); covers the `agentcoreRuntimes` "Manage" button render and `getVendorSettings` call args. Does not use `renderPage`/`mockAPI` and does not touch `AwsEntityList` or cursor/nextToken behavior.
- `src/pages/settings/aws/agentCoreRuntimes/components/__tests__/AwsAgentCoreRuntimeDetails.test.tsx` — **unit** test (mocks `@/store/vendor` entirely) that does assert "Load more" button visibility/click for the AgentCore *endpoints* list (`agentCoreEndpointsPagination.nextToken`). Since the store is fully mocked, it never exercises real fetch/append logic — it only checks `getAgentCoreEndpoints` was called with `loadMore=true`. Useful as an assertion-shape reference only, not as the integration pattern to copy (no real HTTP mocking, no verification that items are appended not replaced).
- `src/pages/assistants/__tests__/AssistantTemplatesPagination.integration.test.tsx` and `src/pages/workflows/__tests__/WorkflowTemplatesPagination.integration.test.tsx` — genuine `renderPage`/`mockAPI` integration tests, but for **page-number** pagination (client-side pagination of a single fetched batch), not cursor/nextToken across two distinct network calls. Good structural template for `renderPage`/`mockAPI`/`waitFor` conventions; not a direct template for the append-across-network-calls assertion.
- `src/pages/skills/__tests__/SkillsListPage.integration.test.tsx` — short integration example showing a minimal `mockAPI` set plus `renderPage`.
- **No file anywhere in the repo currently combines `renderPage`/`mockAPI` with a cursor/`next_token` "Load more" flow.** This is a genuine, confirmed coverage gap — the task is greenfield for this exact combination.

### Testing Framework and Patterns

- Vitest 1.6.1, `@testing-library/react` 16.3.0, `@testing-library/user-event` 14.6.1, `@testing-library/jest-dom` 6.6.3.
- `npm run test:integration` → `vitest run --project integration`.
- `vitest.workspace.ts` defines two projects, `unit` and `integration`. The **integration project's `include` glob is `**/__tests__/**/*.integration.test.?(c|m)[jt]s?(x)`** — only files inside a folder literally named `__tests__` (double underscore) with filenames matching `*.integration.test.tsx` are discovered. `testTimeout: 15000`, custom environment `./vitest-env-integration.ts`, `setupFiles: ['./src/setupTests', './src/setupTests.integration']`.
- `renderPage(path: string): RenderResult` (`src/test-utils/integration.tsx`) mounts the full app via `createMemoryRouter(routes, { initialEntries: [path] })` + `RouterProvider`.
- `mockAPI(method, url, data, paramsOrStatus?)` registers a stub in `requestRegistry` (`src/test-utils/_mock-state.ts`), a `Map<'METHOD:url', {factory, params}>`. **Critical constraint**: the key does NOT include the query string — a second `mockAPI` call for the same method+url **overwrites** the first registration rather than adding an alternate response. `matchRegistry` (in `setupTests.tsx`) strips the query string for path lookup and separately checks `entry.params` (if supplied) against parsed query params via exact-match `every(...)`.
- **Practical implication for acceptance criterion 2 (append behavior)**: to simulate "Load more" returning a second page, call `mockAPI('GET', 'v1/vendors/aws/{entityType}', page1Data)`, render, wait for page-1 items to appear, then re-call `mockAPI('GET', 'v1/vendors/aws/{entityType}', page2Data, { next_token: '<token>' })` (overwriting the registry entry, optionally with a `params` filter for explicitness) **before** clicking "Load more," then assert page-1 and page-2 items are present *simultaneously* — proving append rather than replace. There is no existing precedent in the codebase for this exact two-stage re-registration pattern; it must be newly established, but it is consistent with the current (unmodifiable) semantics of `integration.tsx`/`_mock-state.ts`.
- Alternative/complementary approach: assert on `expect(global.fetch).toHaveBeenCalledWith(...)` with the expected `next_token` param, an established pattern already used in `AssistantDetailsPage.integration.test.tsx` / `AssistantsListPage.integration.test.tsx`.

### Coverage Gaps

- No integration test exists for `AwsEntityList.tsx`'s cursor/nextToken "Load more" show/hide and append behavior — entirely untested at the integration level, for all five entity types (Agents, Flows, Knowledge Bases, Guardrails, AgentCore Runtimes).
- No test verifies the append-not-replace behavior end-to-end through the real store (`awsVendorStore.getVendorEntities`) and real fetch mocking.
- No test covers "Load more" absence when `nextToken` is `null`/absent, for any of the 5 AWS entity types.
- `AwsEntitySettingsTable.tsx` (page-number pagination) also has no AWS-specific integration test, though a transferable template exists (`AssistantTemplatesPagination.integration.test.tsx`) — out of scope per the stated acceptance criteria, which focus on `AwsEntityList`'s cursor mechanism.

---

## 5. Configuration and Environment

### Environment Variables

- `VITE_API_URL` (`src/utils/api.ts:96`) — sets the API base URL in production; irrelevant to integration tests since `global.fetch` is fully stubbed in `setupTests.tsx`.

### Configuration Files

- `vite.config.ts` — base vitest `test` block (jsdom env, setupFiles `./src/setupTests`, istanbul coverage).
- `vitest.workspace.ts` — defines `unit` and `integration` projects; governs test discovery glob and timeouts for `npm run test:integration` (see Testing Framework section above for the exact glob).
- `vitest-env-integration.ts` — custom jsdom environment preserving native `AbortController`/`AbortSignal` so React Router v7 navigation works under jsdom.
- `src/setupTests.tsx` — wires the global `fetch` mock consumed by `mockAPI()`/`requestRegistry`; defines `globalDefaults` (always-mocked endpoints like `v1/config`, `v1/user`, `v1/assistants/categories`) so new AWS tests don't need to mock these; clears `requestRegistry`/`fetchMock` in `afterEach`.
- `src/setupTests.integration.ts` — raises `asyncUtilTimeout` to 15000ms; patches `Request` to strip `signal` (jsdom/undici interop fix). No AWS-specific settings.
- `src/test-utils/_mock-state.ts` — exports `requestRegistry` and a shared `navigate` spy. Must NOT be modified per task constraints; may be imported directly if a stateful factory is needed for the two-stage mock pattern.

### Feature Flags and Deployment Concerns

- No feature flags gate the AWS entity list or AgentCore Runtimes feature.
- No CI workflow files exist in the repo (`.github/workflows` absent) — no CI-imposed constraint (coverage thresholds, sharding) on `test:integration`; it only needs to pass locally.
- Mock-server (`mock-server/routes.json`, `db.json`) has no AWS/vendor routes, confirming exclusive reliance on `mockAPI()`/`renderPage()` as instructed.

---

## 6. Risk Indicators

- **`requestRegistry` key collision on cursor pagination** — the registry is keyed only by `method:url` (query string excluded), so a single `mockAPI()` call cannot natively hold two different responses for the same URL differentiated only by `next_token`. This is the single biggest technical risk for acceptance criterion (2) (append behavior) and has no existing precedent in the codebase to copy from; a new two-stage re-registration pattern (or a stateful factory via direct `requestRegistry` import) must be established from first principles.
- **Directory naming mismatch** — the task instructs tests go under `src/pages/settings/components/vendor/_tests_/` (single underscore both sides), but the actual codebase convention (and the `vitest.workspace.ts` integration project's `include` glob) requires the folder to be named `__tests__` (double underscore). Using `_tests_` literally will cause `npm run test:integration` to silently discover zero tests. This must be confirmed/corrected with the caller before implementation.
- **Router source split across the five entity pages** — four of the five AWS entity list pages (assistants, workflows, guardrails, data-sources) source `settingId` from the globally-mocked `useVueRouter().currentRoute.value.params` and require manually setting `mockRouterState.currentRoute.value.params.settingId` before `renderPage()`; only `agentcore-runtimes` gets `settingId` for free via real `react-router` `useParams`. Tests covering all five entity types must handle this split correctly or risk `settingId` being `undefined` and requests never firing.
- **No existing integration-level precedent for cursor/nextToken "Load more."** The closest analog (`AwsAgentCoreRuntimeDetails.test.tsx`) is a unit test with the store fully mocked — it does not prove real merge behavior. This is genuinely greenfield test-pattern work, not a copy-paste of an existing file.
- **No formal ADR or dedicated guide for vendor/cursor pagination** — conventions were derived from source code and from a sibling task's diff artifacts (spec/plan for that task were already cleaned up post-merge), which increases reliance on this analysis being accurate rather than an authoritative guide.

---

## 7. Summary for Complexity Assessment

This task touches three layers: the component layer (`AwsEntityList.tsx`, read-only reference — no production changes are in scope), the store layer (`awsVendorStore.getVendorEntities` in `src/store/vendor.ts`, read-only reference for understanding append/replace and nextToken semantics), and the test layer, where all actual changes will land — new integration test files under a `vendor/__tests__/` directory (the task's stated `_tests_` naming needs correction against the real `vitest.workspace.ts` discovery glob before any file is written, or the suite will silently execute zero new tests). Given five AWS entity types share one component and one store action, the most efficient implementation shape is a single parametrized test file using a `describe.each`-style config array (mirroring the pattern established in the prior page-number pagination task), covering "Load more" presence/absence and append-not-replace for each of Agents, Flows, Knowledge Bases, Guardrails, and AgentCore Runtimes — likely 1-2 new test files, zero production files.

Technical novelty is moderate-to-high: while the codebase has abundant precedent for page-number `renderPage`/`mockAPI` integration tests, there is zero existing integration-level precedent for cursor/nextToken pagination combined with `mockAPI`. The core obstacle is that `requestRegistry` (in the untouchable `_mock-state.ts`) keys mock responses only by `method:url`, ignoring query strings — so simulating "page 1 then page 2 on the same URL" requires a two-stage re-registration technique that must be invented for this task rather than copied. A secondary complexity source is the router-state split: four of five entity pages need manual `mockRouterState` setup for `settingId` while the fifth (agentcore-runtimes) gets it for free via real `useParams`, meaning the parametrized test harness needs a per-config `setup()` hook to normalize this difference.

Test coverage posture for the exact feature under test is a clean gap — zero integration coverage exists for `AwsEntityList`'s cursor mechanism today, and the one adjacent "Load more" test (`AwsAgentCoreRuntimeDetails.test.tsx`) is a shallow unit test with a fully mocked store, so it provides an assertion-shape reference but no structural template to copy. Risk factors that should weigh into complexity scoring: the mock-registry query-string limitation (novel workaround required, no prior art), the directory-naming discrepancy in the task description versus the actual vitest discovery glob (needs resolution before coding starts), and the need to correctly parametrize across five entity types with two different `settingId`-sourcing mechanisms without touching any production or shared test-infra file.
