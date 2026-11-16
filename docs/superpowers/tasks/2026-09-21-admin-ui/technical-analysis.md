# Technical Research

**Task**: model management administration platform scope
**Generated**: 2026-09-17T00:00:00Z
**Research path**: filesystem

---

## 1. Original Context

Create a new story for admin to manage which global models are available for users. Cover the part between Lite LLM (or any other model provider like dial) and Platform scope. Admin needs 3 possible statuses to set: Enable, Disable, Deprecated. Notification points and rules are not in scope for this exact story. UI would be provided later, but mostly reuse the same '/help/models' view. This should be under administration as a new tab 'model management'.

---

## 2. Codebase Findings

### Existing Implementations

Backend (`codemie/src/codemie/...`):

- `codemie/src/codemie/configs/llm_config.py` — defines `LLMModel` (fields: `base_name`, `deployment_name`, `label`, `enabled: bool`, `forbidden_for_web`, `is_premium`, `default_for_categories: list[ModelCategory]`, `switchyard`, `litellm_router`, `cost`, `features`, etc.), `LLMProvider` enum (`azure_openai`, `aws_bedrock`, `google_vertexai`, `anthropic`, `vertex_ai-anthropic_models`), `ModelCategory` enum (`global`, `chat`, `code`, `documentation`, `summarization`, `translation`, `knowledge_base`, `workflow`, `file_analysis`, `reasoning`, `planning`), `ModelType` (`chat`, `embedding`), `LLMRouter`/`LlmRouterOption` (Switchyard virtual routers), `LiteLLMModels` (chat/embedding lists). `enabled` is today a plain boolean — there is no tri-state (enable/disable/deprecated) status field anywhere in this model.
- `codemie/src/codemie/enterprise/litellm/models.py` — `map_litellm_to_llm_model()` maps a raw LiteLLM `/model/info` dict into `LLMModel`; reads `model_info.get("enabled", True)` and `model_info.get("forbidden_for_web", False)` directly off the live LiteLLM catalog response. `get_user_allowed_models()` fetches per-user models from LiteLLM using per-user API keys.
- `codemie/src/codemie/service/llm_service/llm_service.py` (`LLMService` class) — the platform-scope aggregation point. Holds `_default_litellm_models` as an **in-memory cache** populated by `initialize_default_litellm_models()` (called at startup and from the admin reload endpoint). Key methods: `get_allowed_chat_models(user, include_all=False)`, `get_allowed_embedding_models(...)`, `get_allowed_image_generation_models(...)`, `get_allowed_router_options(...)`, `get_default_models_by_category()`. All of these filter on `model.enabled` and (when `include_all=False`) on `forbidden_for_web`. There is no persistence layer (DB table) for platform-level model status — the "source of truth" is the live LiteLLM/DIAL proxy catalog on each reload, not a CodeMie-owned admin-editable record.
- `codemie/src/codemie/rest_api/routers/llm_models.py` — public-facing router, prefix `/v1`, no `Admin` tag: `GET /v1/llm_models` (chat + router options), `GET /v1/llm_models/image_generation`, `GET /v1/categories`, `GET /v1/default_models`, `GET /v1/default_models/{category_id}`, `GET /v1/embeddings_models`. All accept `include_all` query param; only `authenticate` dependency (no project/admin scoping) — this is the endpoint the existing `/help/models` page and the project-settings "Available Models" section both consume.
- `codemie/src/codemie/rest_api/routers/admin.py` — existing admin endpoints, all behind `admin_access_only` / `admin_or_maintainer_or_auditor_access`: `GET /v1/admin/llm/reload` (clears LiteLLM models cache and re-fetches, admin-only, no persisted state change), `POST /v1/admin/llm/retire` and `/v1/admin/llm/retire/bulk` (bulk rewrite of `deprecated_model` → `replacement_model` references across `assistants`, `assistant_configurations`, and `workflows` DB rows — a one-time data migration, not a live status toggle). No endpoint today lets an admin set enable/disable/deprecated on a model and have it persist and be respected by `get_allowed_*` methods.
- `codemie/src/codemie/service/llm_retirement_service.py` (`LLMRetirementResult`, `LLMBulkRetirementItemResult`) — replaces model name references in existing entities; distinct concept from a model "deprecated" status (this rewrites *where the name is used*, it does not gate future selectability).
- `codemie/src/codemie/core/models.py` — `LLMRetirementPair` (validated `deprecated_model` / `replacement_model` pair used by the retirement endpoints above).

Frontend (`codemie-ui/src/...`):

- `src/pages/help/ModelsCatalog/ModelsCatalogPage.tsx` — the `/help/models` view named in the task. Fetches `llmModels` from `appInfoStore` (`getLLMModels()`), renders a filterable/sortable table (search, provider filter, premium-only filter) with columns Model / Provider / Capabilities / Cost per 1M tokens / Default for. Read-only, no status column, no per-row actions.
- `src/pages/settings/AdministrationPage.tsx` — administration landing page. Currently a **card-based** layout (`SettingsLayout` + `AdminToolsCard`), not a tabbed page — there is no existing tab-strip component under Administration to attach a "Model management" tab to; each admin sub-area today is its own route (`/settings/administration/providers`, `/mcps`, `/categories`, `/budgets`, `/users`, `/cost-centers`, `/projects`, `/activity-events`, `/ai-adoption-config`, `/customer-configuration`) reached via `AdminToolsCard`/side navigation, not via in-page tabs.
- `src/pages/settings/administration/ProvidersManagementPage.tsx` — closest structural analog for a new admin list page: `SettingsLayout` + `Table` component with `ColumnDefinition[]`, a Valtio store (`providersStore`) driving `indexProviders()`, row actions component (`ProviderActions`), header action buttons.
- `src/pages/settings/administration/projectsManagement/AvailableModelsSection.tsx` (found only on git branch `origin/EPMCDME-14452_Project-settings-Available-models-UI`, not yet merged) — a **project-scope** "Available Models" picker: fetches `GET /v1/llm_models?include_all=false` and `GET /v1/llm_models/image_generation?include_all=false`, lets a maintainer/admin pick a subset of models to allow for the project, validates at least one chat model remains selected, persists via `projectsStore.updateAllowedModels(projectName, allowedModels, defaultModel)` → `PATCH /v1/projects/{projectName}/allowed-models`. This is the *consumer* side of the gap this new story fills: project scope already has a UI to restrict platform-provided models further, but there is nothing upstream that lets platform admins first curate/gate that same catalog before it reaches projects.
- `src/store/appInfo.ts` — holds `llmModels` and `getLLMModels()`, the store backing `/help/models` and (per the branch above) also reused for project-level model pickers.

### Architecture and Layers Affected

- **Integration/provider layer**: `codemie/src/codemie/enterprise/litellm/` (LiteLLM/DIAL catalog fetch and mapping) — the "Lite LLM (or any other model provider)" side named in the task.
- **Service layer**: `codemie/src/codemie/service/llm_service/llm_service.py` (`LLMService`) — the "Platform scope" aggregation point named in the task; today purely a filter/cache over the live provider catalog, with no admin-editable, persisted status.
- **API/router layer**: `codemie/src/codemie/rest_api/routers/llm_models.py` (public catalog reads) and `codemie/src/codemie/rest_api/routers/admin.py` (existing admin-only LLM actions: reload, retire, retire/bulk) — a new admin-only model-status endpoint would sit alongside the latter.
- **Frontend routing/pages layer**: `codemie-ui/src/router.tsx` administration routes, `codemie-ui/src/pages/settings/AdministrationPage.tsx`, and `codemie-ui/src/pages/settings/administration/` (sibling to `ProvidersManagementPage.tsx`, `MCPManagementPage.tsx`, `CategoriesManagementPage.tsx`).
- **Frontend read-only reference view**: `codemie-ui/src/pages/help/ModelsCatalog/ModelsCatalogPage.tsx` (`/help/models`), named by the task as the view to reuse.

### Integration Points

- LiteLLM/DIAL proxy `/model/info`-style catalog → `map_litellm_to_llm_model()` → `LLMModel` → `LLMService._default_litellm_models` (in-memory) → `get_allowed_*` methods → `/v1/llm_models*` routers → `appInfoStore.getLLMModels()` (UI) → `/help/models` page and (on the unmerged branch) project-settings `AvailableModelsSection`.
- `GET /v1/admin/llm/reload` already triggers `get_active_llm_proxy_provider().reload_models_cache()` + `get_available_models()` + `llm_service.initialize_default_litellm_models(models)` — the existing mechanism by which the platform-scope in-memory cache is refreshed from the provider; any new admin-set status will need to interact with (survive, or drive) this reload path.
- `LLMRetirementService` touches Postgres rows in `assistants`, `assistant_configurations`, `workflows` via SQLModel session (`codemie/src/codemie/service/llm_retirement_service.py`) — separate persistence path from the in-memory model catalog, showing the only existing precedent for a DB-backed, admin-triggered model-name lifecycle action in this codebase.

### Patterns and Conventions

- FastAPI routers use `dependencies=[Depends(admin_access_only)]` (or `admin_or_maintainer_or_auditor_access`) per-route for admin gating (see `admin.py`), and `response_model=BaseResponse` / `BaseResponseWithData` for structured admin responses.
- Backend service methods are filter functions over an immutable-looking `LLMModel` list (`[model for model in models if model.enabled]`), not per-model CRUD — introducing a persisted, admin-settable status is a departure from the current "read from provider, filter" pattern.
- Frontend admin list pages follow: `SettingsLayout` (page chrome) + `Table` (shared table component with `ColumnDefinition[]`) + a dedicated Valtio store with an `index*()` fetch method + a row-actions component (see `ProvidersManagementPage.tsx` / `ProviderActions`).
- Frontend model displays share provider label maps and cost formatting (`PROVIDER_LABELS`, `formatCost`) duplicated between `ModelsCatalogPage.tsx` and the (unmerged) `AvailableModelsSection.tsx` — no shared model-catalog UI component currently factored out.

---

## 3. Documentation Findings

### Guides and Architecture Docs

- `codemie/.ai-run/guides/integration/llm-providers.md` — states: read configured model/service values rather than hardcoding model names; treat LiteLLM proxy behavior as "provider-backed enterprise functionality"; gate LiteLLM-dependent behavior with `is_litellm_enabled`/config; app startup registers LiteLLM providers conditionally (`src/codemie/rest_api/main.py:265`); provider config files live under `config/llms/`, `MODELS_ENV` documented at `README.md:61`.
- `codemie/AGENTS.md` — routes API changes to `.ai-run/guides/api/rest-api-patterns.md` and `.ai-run/guides/api/endpoint-conventions.md`; routes database/model changes to `.ai-run/guides/data/database-patterns.md` and `.ai-run/guides/data/repository-patterns.md` (not read in full here, but named as the P0/P1 guides a build task on this story would need).
- `codemie-ui/AGENTS.md` and `.ai-run/guides/architecture/routing-patterns.md`, `.ai-run/guides/components/component-patterns.md` — named as the guides governing where a new admin route/tab and its component would live; not read in full, but they are the documented entry points for that decision.
- No guide file in either repo discusses a three-state model lifecycle (Enable/Disable/Deprecated) or platform-vs-project model scoping explicitly.

### Architectural Decisions

- No ADR file found for LLM model status/lifecycle. The nearest recorded precedent is the code comment in `llm_config.py` explaining why `LiteLLMRouterConfig.is_router` is a separate object rather than reusing `LLMModel.enabled`, because `enabled` "already means something different (this model's own enabled/disabled state)" — i.e., the codebase already treats `enabled` as a single meaning today, which a new tri-state status would need to reconcile with or replace.
- The unmerged branch `EPMCDME-14452_Project-settings-Available-models-UI` records (via its plan file `docs/superpowers/plans/2026-09-07-epmcdme-14452-available-models-ui.md`) the decision that "Personal projects must never show 'Available Models' section" and that "Backend authorization is defense-in-depth; UI authorization is UX-focused" — relevant precedent for how the project-scope consumer of this story's platform catalog is gated.

### Derived Conventions

- Admin-only backend routes consistently sit in `codemie/src/codemie/rest_api/routers/admin.py` under the `/v1/admin/...` prefix, gated by `admin_access_only`, and log `admin.id`/`admin.name` on every action — any new "set model status" endpoint should follow this file/prefix/logging convention rather than adding a new router module.
- Admin UI sub-pages are one-page-per-concern under `codemie-ui/src/pages/settings/administration/`, registered as their own top-level route in `router.tsx` (e.g. `/settings/administration/providers`), not as an in-page tab of `AdministrationPage.tsx` — the task's request for a new "tab" is a departure from the current landing-page/card pattern and from the flat-route pattern used by every existing admin sub-area.

---

## 4. Testing Landscape

### Existing Coverage

- Backend: `codemie/tests/enterprise/litellm/test_models.py` (covers `map_litellm_to_llm_model` mapping logic), `codemie/tests/enterprise/litellm/test_litellm_dependencies.py`, `test_budget_provider_adapter.py`, `test_budget_helpers.py`, `test_proxy_router.py` (LiteLLM proxy integration), `codemie/tests/codemie/configs/test_llm_config.py` (config-level `LLMModel`/`ModelCategory` behavior). No test file exists yet for `llm_retirement_service.py`'s admin-triggered flows beyond what may be colocated, and no test file exists for a model-status/lifecycle endpoint since none exists.
- Frontend: `src/pages/help/ModelsCatalog/__tests__/ModelsCatalogPage.test.tsx` (covers the `/help/models` view named for reuse), plus consumer-side tests (`LLMSelector.test.tsx`, `ChatConfigLlmSelector.test.tsx`, `ChatPromptLlmSelector.test.tsx`) that assert on model list shape/premium flags in chat/assistant selectors — these would be affected if the shape of `LLMModel`/`/v1/llm_models` responses changes to carry a new status field.
- The project-scope `AvailableModelsSection.test.tsx` and `projects.test.ts` additions (branch-only, unmerged) show the expected test shape for a model-catalog-consuming admin section: mock `api.get`/`api.patch`, assert on request payloads, assert on validation error states.

### Testing Framework and Patterns

- Backend: pytest (`codemie/pytest.ini`, `Makefile` targets per `.ai-run/guides/testing/testing-patterns.md`).
- Frontend: Vitest with React Testing Library, two projects (`unit` and `integration`) per `vitest.workspace.ts`; mocking via `jest.mock`/`vi.mock` of `api.ts` calls, as shown in the unmerged `AvailableModelsSection.test.tsx`.

### Coverage Gaps

- No backend test exists for any endpoint that would persist an admin-set model status, because no such endpoint exists yet.
- No backend test exists asserting that `get_allowed_chat_models`/`get_allowed_embedding_models`/`get_allowed_router_options` respect a persisted "deprecated" or "disabled by admin" status distinct from the live-provider `enabled` flag — because that distinction does not exist in the code today.
- No frontend test exists for an administration "tab" pattern, because `AdministrationPage.tsx` has no tabs today — introducing one has no existing test scaffold to extend.
- No test exercises the interaction between `GET /v1/admin/llm/reload` (which re-fetches from the live provider) and any admin-set persisted status — this interaction is entirely new.

---

## 5. Configuration and Environment

### Environment Variables

- `LLM_PROXY_ENABLED` — gates whether LiteLLM-proxy-sourced models/spend-tracking paths are active (`llm_models.py`, `admin.py`'s spend-collection guard).
- `LITELLM_SPEND_COLLECTOR_ENABLED` — gates the (unrelated but adjacent) admin spend-collection trigger in `admin.py`.
- `LITELLM_PREMIUM_MODELS_ALIASES` (referenced via `is_premium_model`/`is_premium_models_enabled` in `codemie/src/codemie/enterprise/litellm/dependencies.py`, not read in full) — drives the existing `is_premium` boolean on `LLMModel`; a design precedent for how a platform-wide model attribute is currently configured (env/config-driven, not DB-persisted).
- `AZURE_SPEECH_SERVICE_KEY`, `AZURE_SPEECH_REGION` — unrelated, seen only incidentally in `admin.py`.

### Configuration Files

- `codemie/litellm_config.yaml` — root-level LiteLLM proxy config file (not opened in full in this pass; is the likely place model definitions/aliases are declared for local/dev runs).
- `codemie/config/llms/` — referenced by the `llm-providers.md` guide as where provider config YAML lives (directory not enumerated in this pass).
- `codemie-ui/config.js` / `window._env_` — runtime frontend config injection point per `codemie-ui/AGENTS.md`; relevant if a new admin route needs a feature flag.

### Feature Flags and Deployment Concerns

- `useFeatureFlag('features:providersDatasourceImport')` — shows the existing feature-flag hook pattern (`src/hooks/useFeatureFlags`) used to gate an admin UI action; a new "Model management" tab could use the same hook if it needs to be flagged.
- No deployment manifest or Dockerfile reference to model-status/lifecycle found in this pass.

---

## 6. Risk Indicators

- Speculative: The core architectural gap is that `LLMService`'s model catalog is an **in-memory cache refreshed from the live LiteLLM/DIAL provider** (`_default_litellm_models`, populated by `initialize_default_litellm_models()` and refreshed by `GET /v1/admin/llm/reload`), with no CodeMie-owned persistence layer for model status. A three-state admin-settable status (Enable/Disable/Deprecated) that must survive a provider catalog reload will likely need a new persisted store (DB table or similar) keyed by model `base_name`/`deployment_name`, merged with the live catalog on each fetch — this is a new architectural piece, not an extension of an existing one.
- The existing `enabled` boolean on `LLMModel` is sourced from the live provider's `model_info.enabled` field (`map_litellm_to_llm_model`), not from an admin action in CodeMie — reusing this field for "Disable" risks colliding with, or being silently overwritten by, whatever the provider itself reports on the next reload.
- "Deprecated" as a third state has no analog anywhere in the current model lifecycle. The only existing "deprecated" concept (`llm_retirement_service.py`) is a one-time bulk-rewrite of references from one model name to another in existing DB rows — a different operation from "mark this model deprecated so it's flagged/still-usable-but-discouraged going forward." The story will need to define this state's runtime effect (visible-but-flagged vs. hidden-for-new-use vs. blocking) since nothing in the code currently encodes it.
- `AdministrationPage.tsx` has no tab UI at all today — every existing admin sub-area is a separate top-level route reached from a card/side-nav, not an in-page tab. "New tab 'model management'" as literally requested implies either introducing a tab-strip component to `AdministrationPage.tsx` (new pattern) or, more consistently with the rest of the code, adding a new flat route under `/settings/administration/` in the style of `ProvidersManagementPage.tsx` — this is a product/UX decision the spec stage needs to make explicit, since the two options touch different files.
- Reusing `/help/models` "mostly" implies extending `ModelsCatalogPage.tsx` (or a variant of it) with a status column and per-row admin actions, but that page today is read-only and has no row-action slot, no store method for mutation, and is reached from `/help/models`, a non-administration route — wiring an admin-only edit affordance into a page that's otherwise open to all authenticated users needs an explicit access-control design.
- No existing test scaffold covers an admin-editable, persisted model attribute — the nearest test patterns (`test_models.py`, `AvailableModelsSection.test.tsx`) test read-side mapping and project-level selection, not platform-level admin mutation, so test design for this story starts from a narrower base than it might appear.
- Two duplicated definitions of `PROVIDER_LABELS`/cost formatting already exist between `ModelsCatalogPage.tsx` and the unmerged `AvailableModelsSection.tsx` — a third view built by extending/reusing `/help/models` risks a third duplicate unless factored out.

---

## 7. Summary for Complexity Assessment

This story sits at the seam between the provider integration layer (`codemie/src/codemie/enterprise/litellm/`, mapping LiteLLM/DIAL catalog responses into `LLMModel`) and the platform service layer (`LLMService` in `codemie/src/codemie/service/llm_service/llm_service.py`), which today is a pure read-and-filter cache with no CodeMie-owned persistence for model status. Introducing a three-state, admin-settable status (Enable/Disable/Deprecated) that survives the existing `GET /v1/admin/llm/reload` catalog refresh is new backend territory — it is not an extension of an existing status field, since the current `enabled` boolean is sourced from the live provider response, not from an admin action. A new admin-only endpoint (following the `admin.py` / `admin_access_only` convention) and a merge step between persisted status and live catalog data are both required, but neither exists as a pattern to extend today.

On the frontend, "new tab 'model management' under administration" conflicts with the current structure: `AdministrationPage.tsx` is card-based with no tabs, and every existing admin sub-area (`ProvidersManagementPage.tsx`, `MCPManagementPage.tsx`, `CategoriesManagementPage.tsx`) is a flat route, not an in-page tab — the spec stage will need to resolve whether "tab" means a literal tab-strip (new UI pattern) or a new flat admin route (consistent with existing code). Reuse of `/help/models` is likewise only partial: `ModelsCatalogPage.tsx` is read-only, open to all authenticated users, and has no row-action or mutation-store plumbing, so admin edit affordances would need new wiring even where the read-side table is reused.

Test coverage for the read side (provider mapping, catalog display) is solid, but there is zero existing coverage — and no adjacent pattern beyond the still-unmerged project-scope `AvailableModelsSection` — for an admin-mutable, persisted model attribute, or for the interaction between that persisted state and the live-provider reload path. Given the new persistence concept, the new admin endpoint, the unresolved UI-structure question, and the complete absence of a "deprecated" runtime semantics anywhere in the codebase, this is a medium-to-large, multi-layer change whose main risk is under-specification of the "Deprecated" state's actual effect and of what "tab" concretely means, rather than any single technically hard component.

---

## 8. External References

None named by the task.

---

## 9. Slice Scope (this run)

**Parent story**: EPMCDME-15077 — platform model management. The parent scored XL (29/36),
`split-required`, strategy `by-component`. This task dir implements **one slice only**; Sections 1-8
above are the parent-level research and deliberately cover all three slices.

**Slice**: Model management admin UI — `admin-ui`
**Component**: `codemie-ui` · **depends_on**: the backend `status-persistence-api` slice's API contract.

**In scope**: A new administration surface listing all platform models with their status, plus admin
actions to set Enable/Disable/Deprecated, following the `ProvidersManagementPage.tsx` list-page pattern
(`SettingsLayout` + `Table` with `ColumnDefinition[]` + Valtio store with an `index*()` fetch + a row
actions component).

**RESOLVED with product**: this is a **new flat admin route** under `/settings/administration/`,
consistent with `ProvidersManagementPage` / `MCPManagementPage` / `CategoriesManagementPage` — **not** an
in-page tab strip on `AdministrationPage.tsx`. Section 6's open "tab vs flat route" question is closed;
do not re-litigate it at spec stage. The original request's wording "new tab 'model management'" means a
new admin area, not a literal tab component.

**Out of scope**: the backend persistence/API (`status-persistence-api` slice, other repo) and the
read-only `/help/models` status surfacing (`catalog-status-surfacing` slice, sibling branch
`EPMCDME-15077_model-management_FE_catalog`). Notification points and rules are out of scope for the
whole story.

**Layers**: frontend routing/admin pages — `codemie-ui/src/router.tsx`,
`codemie-ui/src/pages/settings/AdministrationPage.tsx` (card/nav entry for the new route),
`codemie-ui/src/pages/settings/administration/` (new page, sibling to `ProvidersManagementPage.tsx`),
plus a new Valtio store under `codemie-ui/src/store/`.

**Contract dependency**: the status enum values, model-identity key, and admin endpoint paths/shapes are
owned by the backend slice. Implement against that agreed contract with `api.get`/`api.patch` mocked in
tests (the pattern the unmerged `AvailableModelsSection.test.tsx` already uses). Live end-to-end
verification requires the backend slice to be merged.

**Sibling-branch coordination**: this branch (`EPMCDME-15077_model-management_FE`) and
`EPMCDME-15077_model-management_FE_catalog` are merged into one before MR creation, so there is a single
FE MR. Both touch model-catalog display code — if this slice factors out shared
`PROVIDER_LABELS`/cost-formatting helpers, coordinate so the two branches do not create conflicting
extractions.

**Slice-level risk indicators** (narrowed from Section 6):
- `AdministrationPage.tsx` is card-based with no tab UI; every admin sub-area is a separate top-level
  route. Resolved above in favour of the existing flat-route pattern.
- Needs a new Valtio store to fetch models and dispatch status mutations to the new admin API — there is
  no existing store doing model mutation (`appInfoStore.getLLMModels()` is read-only).
- Wiring an admin-only edit affordance needs explicit access-control design; `/help/models` is open to
  all authenticated users, so the edit surface belongs on the admin route, not on that page.
