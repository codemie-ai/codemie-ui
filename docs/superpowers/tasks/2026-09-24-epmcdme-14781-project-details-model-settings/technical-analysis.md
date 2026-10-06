# Technical analysis — EPMCDME-14781

Retroactive record of the codebase research that grounded the plan. Written from the actual
exploration done via direct `Read`/`Grep`/`Bash` investigation of both repos (no `codegraph` MCP
tool was available in this session), not a separate `tech-analyst` subagent pass.

## Repos and branches

| Repo | Branch | Purpose |
|---|---|---|
| `codemie-ui` (`D:\Projects\codemie-ui - Copy`) | `Variant-1-Project-Hub` (MR !1917) | Frontend: Project Details redesign, already had a mocked Models tab. |
| `codemie` (`D:\Projects\codemie - Copy`) | `EPMCDME-14781_project-model-settings` (new) | Backend: no prior work existed for this ticket. |

## What existed before this task

`ProjectModelsSection.tsx` and `ProjectMemberModelOverrideModal.tsx` already existed in MR !1917,
but persisted to `localStorage` (`projectModelConfiguration.ts`) with a code comment calling it
out as a "temporary prototype" with "no project model configuration endpoint... available
locally." Premium classification was a hardcoded 3-name list
(`LOCAL_PREMIUM_MODEL_LABELS`). No automatic-routing toggle existed. No project-scoping of the
`GET /v1/llm_models` list existed — every model picker in the app always showed the full platform
catalog regardless of project.

## Backend research

- **Project entity**: `Application` (`src/codemie/core/models.py`), SQLModel table `applications`,
  primary key is `name`. Existing precedent for adding a project-scoped JSONB column:
  `chargeback_enabled`/`chargeback_attribution` (added via migration
  `f1g2h3i4j5k6_add_chargeback_enabled_to_applications.py`), and `model_settings` follows the same
  shape (`PydanticType` column wrapping a pydantic model, per `ProjectEnrichment`'s own use of the
  same pattern).
- **Model catalog**: `LLMService` (`src/codemie/service/llm_service/llm_service.py`) is the single
  source of the platform's model list (`get_all_llm_model_info()`, live LiteLLM/DIAL catalog or
  static YAML fallback) and router catalog (`get_all_routers()`, `get_allowed_router_options()`).
  `GET /v1/llm_models` (`src/codemie/rest_api/routers/llm_models.py`) already composed
  `get_allowed_chat_models()` + `get_allowed_router_options()`; adding a `project` query param here
  was the natural integration point, not a new endpoint.
- **Routing mechanisms** (`src/codemie/core/router.py`, `router_factory.py`): two concrete
  `Router` implementations exist — `SwitchyardRouter` (candidate models are visible:
  `switchyard.capable_model` / `efficient_model` on the `LLMRouter` config) and `LiteLLMRouter`
  (declared via `LiteLLMRouterConfig.is_router` on an `LLMModel`; its `decide()` always returns
  `None` because the routing happens inside the external LiteLLM process — its candidates are
  therefore invisible to CodeMie). This asymmetry is why the plan treats the two router kinds
  differently (see plan.md).
- **Runtime model resolution**: `AssistantService.build_agent()` (chat path) and
  `_load_and_configure_workflow_assistant()` (workflow path), both in
  `src/codemie/service/assistant_service.py`, are the two places a concrete `llm_model` string is
  finally decided before an agent is constructed. Both were confirmed (by reading, then later by
  a scripted policy smoke test) to be the correct, and only two, injection points for a runtime
  guard — nothing else constructs an agent's LLM client independently.
- **Existing project-scoped settings pattern**: `SettingsService.get_enforce_member_spend_limits`
  / `set_enforce_member_spend_limits` (`src/codemie/service/settings/settings.py`) stores a single
  boolean as an encrypted "integration" row, keyed by alias — considered and rejected as the
  storage mechanism for `model_settings` (wrong shape for a structured, growing settings object;
  a JSONB column on `applications` was more direct and matches the chargeback precedent).
- **Auth patterns**: `project_access_check(user, project_name)`
  (`src/codemie/rest_api/security/authentication.py`) is the standard "may this user touch this
  project" check, used by `create_assistant`/`update_assistant`. The first review round (CR-002)
  found this had been omitted on the new `GET /v1/llm_models?project=` path — the omission was
  found by comparing this new code against that existing, already-established pattern.

## Frontend research

- **Model list consumers**: `appInfoStore.getLLMModels()` (`src/store/appInfo.ts`) is the one
  place `GET /v1/llm_models` is called and mapped to `ModelOption[]`. Six consumer surfaces were
  found via `Grep` for `getLLMModels(` /`llmModels`: `ChatPromptLlmSelector`,
  `ChatConfigLlmSelector` → `LLMSelector`, `LLMSelector` itself (used from
  `AssistantSetupSection`, `ChatConfigImageGeneration`, `CustomNodeForm`,
  `VirtualAssistantForm`), and the two Models-tab components already listed above.
- **Project context propagation**: `AssistantFormContext` (`AssistantForm.tsx`) already carries
  `project` to every field inside an assistant form — `LLMSelector` reading it (rather than
  requiring every call site to pass a `project` prop) matches how `ContextSelector` and other
  fields already consume the same context. For chat, `Conversation` had no `project` field; the
  backend's own `Conversation.project` (set from the initiating assistant, confirmed in
  `conversation_service.py`) was added to the FE type and the `ChatBackend` → `Conversation`
  mapper (`chatHelpers.ts`) to close that gap, rather than inventing a new source of truth.
- **Existing route/tab/permission structure**: `ProjectDetailsPage.tsx` and
  `ProjectDetailsNavigation.tsx` already existed from the prior MR work; the tab-visibility logic
  was audited against `.ai-run/guides` styling/component-pattern rules during the fix-up round
  (route id constants, `cn()` usage, 300-line file guidance).
- **Budgets/spend threshold presentation**: `getStatusColor`
  (`src/pages/analytics/components/widgets/RatioWidget/utils.ts`) was already the shared
  color-by-threshold primitive; three call sites in the Project Details pages had each
  re-implemented the 50/70 threshold wrapper and a null-safe `formatCurrency` around it
  independently — consolidated into `spendPresentation.ts` during the cleanup round.

## Conventions consulted

- `.ai-run/guides/architecture/layered-architecture.md` — service layer owns catalog/service-layer
  lookups, not `core/router.py` (kept `create_router()` and `project_model_settings_service` both
  in the service layer, matching this rule).
- `.ai-run/guides/data/database-patterns.md` — Alembic migration under
  `src/external/alembic/versions/`, verified against a real `alembic heads` single-head check
  before and after adding `m7s8e9t0p1a2_add_model_settings_to_applications.py`.
- `.ai-run/guides/components/component-patterns.md` — 300-line file guidance (flagged as a
  pre-existing violation on `ProjectMembersManager.tsx`, partially addressed by extraction, not
  fully resolved — see code-review-check.json's finding CR-... note and the plan's Non-goals).
- `.ai-run/guides/standards/git-workflow.md` — `EPMCDME-14781: ...` commit prefix used throughout.
