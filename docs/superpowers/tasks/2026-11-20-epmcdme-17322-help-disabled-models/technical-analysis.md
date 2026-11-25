# Technical Research

**Task**: help models catalog disabled
**Generated**: 2026-11-20
**Research path**: filesystem

---

## 1. Original Context

Ticket EPMCDME-17322 (Bug): On the Help page, disabled models are displayed.

Models that are disabled on the Platform Model Management page are still displayed on the Help page. A model disabled at platform level must not be shown to users.

Preconditions: at least one model has the Disabled status on Administration -> Model management; the user has access to the Help page with the models catalog.

Steps: 1. Open Settings -> Administration -> Model management. 2. Set the status of a model to Disable. 3. Open the Help page and go to the models catalog. 4. Look for the disabled model in the list.

Expected: A model disabled at platform level isn't displayed on the Help page. Actual: The disabled model is displayed on the Help page.

Affected: Help page models catalog; Administration -> Model management (platform-level status). Parent EPMCDME-15077 Platform Model Management. Related EPMCDME-17321 (disabled models at project management level).

Acceptance Criteria: 1. A model disabled on the Model Management page isn't displayed on the Help page. 2. When enabled again, it's displayed again. 3. Models that are not disabled are displayed as before.

---

## 2. Codebase Findings

### Existing Implementations

Purpose: list the platform models to users on the Help page.
- `src/router.tsx:918` routes the help models page to `ReadOnlyModelsCatalogPage` (`src/pages/help/ModelsCatalog/ReadOnlyModelsCatalogPage.tsx`). Linked from `HelpPage.tsx` ("Available Models", `help/models`).
- `ReadOnlyModelsCatalogPage` reads `appInfoStore.llmCatalogModels` / `llmCatalogRouters` and calls `getLLMCatalog()` on mount. Its client-side filter (lines 38-46) is search, provider and premium only. There is no status filter. It renders a "Deprecated" badge when `m.status === 'deprecated'` (line 126). Nothing handles `disabled`. `RoutersSection` renders `llmCatalogRouters`, also unfiltered.
- `appInfoStore.getLLMCatalog` (`src/store/appInfo.ts:447-465`) calls `v1/llm_models?include_all=true`. It keeps non-routers with `forbidden_for_web !== true` as models and all routers as routers. It does not look at `status`. `mapLlmModel` and `mapLlmRouter` (lines ~192, 208) set `status: model.status ?? 'enabled'`, so a disabled model reaches the UI with `status: 'disabled'`. Whether the backend returns disabled entries under `include_all` cannot be checked from this repo.
- `ModelStatus = 'enabled' | 'disabled' | 'deprecated'` (`src/types/entity/configuration.ts:22`).

Other places that show the catalog or a status:
- `src/pages/help/ModelsCatalog/ModelsCatalogPage.tsx` (exported through `ModelsCatalog/index.ts`) is a mock admin-style catalog. It uses `getLLMModels()` (`v1/llm_models`) and has a status filter and a status Select. Its handlers only `console.log`. It is not routed (router imports only ReadOnly). It has a local `getModelStatus` that checks `deprecated` first, then `disabled`.
- `getLLMModels` (`appInfo.ts:427`) calls `v1/llm_models` without `include_all`, and does not filter by status client-side.
- `ProjectModelsSection.tsx:87` also calls `getLLMCatalog()`. It builds its platform catalog and checklist from `models` plus `routers`.
- `llmModelsStore.getProjectEnabledModels` (`src/store/llmModels.ts`) filters `m.enabled` client-side for project models. This is the one existing client-side enabled filter.
- Admin: `ModelsManagementPage.tsx`, `store/adminModels.ts` and `types/entity/adminModel.ts` hold the platform status (`AdminModel.status`, `enabled`).

### Decisions Already in the Code
- The catalog deliberately uses `include_all=true`, so it can list CLI-only routers. The comment at `appInfo.ts:451` records this. The reason for `include_all` is hidden models, not disabled ones. The code does not record whether disabled models are meant to be included.
- Status is carried on every option (`status`, default `'enabled'`) and consumed by the UI. Deprecated is surfaced as a badge, not hidden.
- Filtering of web-hidden models happens in the store (`getLLMCatalog`), not in the page.

### Task Statements Checked Against the Code
- "Disabled models are displayed on Help page": holds for the routed page. No code path drops `status === 'disabled'` on `ReadOnlyModelsCatalogPage` or in `getLLMCatalog`.
- "Help page models catalog": two components exist. Only `ReadOnlyModelsCatalogPage` is routed. `ModelsCatalogPage` is unrouted.
- Acceptance criterion 3 ("as before"): deprecated models are shown with a badge today. `ReadOnlyModelsCatalogPage.test.tsx` covers this.
- Related EPMCDME-17321 (project level): unverified from this repo. `ProjectModelsSection` shares `getLLMCatalog`, which makes it a consumer of any change there.
- Whether the backend sends disabled entries under `include_all=true`: unverified (backend outside this repo).

### Consumers of Changed Contracts
- `getLLMCatalog` / `llmCatalogModels` / `llmCatalogRouters`: consumed by `ReadOnlyModelsCatalogPage`, `ProjectModelsSection` (platform catalog used for the project checklist and default-model candidates), and tests `appInfo.test.ts:835`, `ProjectModelsSection.test.tsx`, `ReadOnlyModelsCatalogPage.test.tsx`. A store-level filter would also change what `ProjectModelsSection` receives. A page-level filter would not.
- `RoutersSection` receives `llmCatalogRouters` from the page.

### Architecture and Layers Affected
Store (`src/store/appInfo.ts`) and the Help page component (`src/pages/help/ModelsCatalog/`). The routing layer is untouched.

### Integration Points
Backend `GET v1/llm_models?include_all=true`. Admin status changes go through `store/adminModels.ts` (`v1/admin/llm/status`). Both are only reached from this repo through the API.

### Patterns and Conventions
Valtio `appInfoStore` with `useSnapshot`. Mappers `mapLlmModel` and `mapLlmRouter`. Pages filter with `useMemo`. Guides: `.ai-run/guides/patterns/state-management.md`.

---

## 3. Documentation Findings

### Guides and Architecture Docs
`.ai-run/guides/` exists, per AGENTS.md. Relevant: patterns/state-management.md, development/api-integration.md, testing/testing-patterns.md. I did not read them in detail.

### Architectural Decisions
None found beyond the inline comment at `appInfo.ts:451`.

### Derived Conventions
Status defaults to `'enabled'` when the API omits it (legacy responses).

---

## 4. Testing Landscape

### Existing Coverage
- `src/pages/help/ModelsCatalog/__tests__/ReadOnlyModelsCatalogPage.test.tsx`: mocks the store. Covers deprecated badges, categories, provider labels and cost.
- `src/store/__tests__/appInfo.test.ts:835`: `getLLMCatalog` (include_all URL, hidden-model filtering, CLI-only routers).
- `ProjectModelsSection.test.tsx`, `ModelsCatalogPage.test.tsx`.

### Testing Framework and Patterns
Vitest and Testing Library. The store is mocked with a plain object. API responses use `mockGet` and `okResponse`.

### Coverage Gaps
No test covers `status: 'disabled'` in the help catalog, either in the store or in the page.

---

## 5. Configuration and Environment

### Environment Variables
None relevant.

### Configuration Files
None relevant.

### Feature Flags and Deployment Concerns
None found. `coreOffApiOptions()` is used on the catalog request.

---

## 6. Risk Indicators

- Speculative: the filter location (store vs page) decides whether `ProjectModelsSection` is affected. That component uses `getLLMCatalog` for the project checklist, and the sibling ticket EPMCDME-17321 concerns disabled models at project level.
- Routers: `llmCatalogRouters` carry `status` too and are rendered by `RoutersSection`. The ticket speaks only of "models". Disabled routers are currently unfiltered.
- Unverified backend behaviour: whether `include_all=true` returns disabled entries, or whether a backend change is part of the fix.
- Unrouted `ModelsCatalogPage` also shows disabled models, with a status filter. It is not reachable via the router, so it is probably not the target.
- Existing statement "All models available on this deployment" in the page copy.

---

## 7. Summary for Complexity Assessment

The Help models catalog is `ReadOnlyModelsCatalogPage`. It renders `appInfoStore.llmCatalogModels` and `llmCatalogRouters`, which `getLLMCatalog` fetches from `v1/llm_models?include_all=true`. Nothing drops `status === 'disabled'`, either in the store or in the page, although `status` is already mapped onto each option. The layers involved are the store (`appInfo.ts`) and one page component, with existing tests for both.

Nothing novel is involved. The open questions are where the filter belongs, because `ProjectModelsSection` shares the catalog store, and whether routers should be treated the same way. Test coverage is good for the surrounding behaviour (deprecated badges, catalog fetch). Disabled status is untested. Backend behaviour for `include_all` cannot be verified from this repo.

---

## 8. External References

None named by the task.
