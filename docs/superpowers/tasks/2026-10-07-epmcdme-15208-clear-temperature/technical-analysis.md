# Technical Research

**Task**: marketplace agent temperature optional model parameters persistence litellm bedrock
**Generated**: 2026-10-07
**Research path**: filesystem

---

## 1. Original Context

EPMCDME-15208 — Marketplace bug: cleared temperature value persists and blocks Claude Sonnet 5 agent runs.

Summary: In CodeMie Marketplace, users cannot remove an existing temperature value from an agent configuration. After clearing the Temperature field and saving, the UI indicates deletion but the prior value remains persisted. Requests to claude-sonnet-5 still include temperature; Bedrock returns 400: temperature is deprecated for this model.

Acceptance criteria:
1. Clearing Temperature and saving removes temperature from persisted agent configuration.
2. Reopening shows empty Temperature field.
3. Configuration API does not return stale temperature after removal.
4. Agent execution requests omit temperature when not configured.
5. Marketplace agent with claude-sonnet-5 runs after temperature cleared.
6. Regression tests for set/update/clear optional numeric model params including temperature.
7. Explicit temperature for supported models unchanged.

Affected: Marketplace agent config UI, update/persistence logic, API payload for optional model parameters, Claude Sonnet 5 / Bedrock invocation.

---

## 2. Codebase Findings

### Existing Implementations

- `src/codemie/rest_api/routers/assistant.py` — `PUT /v1/assistants/{assistant_id}` (`update_assistant`, ~836) is the update entry point for all assistants, including marketplace (`is_global`). Marketplace publish/update triggers `_index_marketplace_assistant` for Elasticsearch sync only; config persistence uses the same assistant row and versioning flow. `GET` by id/slug returns the master `Assistant` via `_build_assistant_detail_response` (~285) and `jsonable_encoder(assistant)` (~337).
- `src/codemie/rest_api/models/assistant.py` — `AssistantRequest` (~314) documents partial-update semantics (`temperature: Optional[float] = None`, ~339). `Assistant._should_update_field` (~876) returns `fields_set is None or field in fields_set` (EPMCDME-14150 fix; no longer treats omitted `None` defaults as updates). `_map_assistant_request` (~893) uses `request.model_fields_set` and applies updates via reflection. `Assistant.update_assistant` (~1111) calls `_map_assistant_request`, persists the master row, then optionally creates a new `AssistantConfiguration` version when `has_configuration_changes` is true.
- `src/codemie/service/assistant/assistant_repository.py` — `update` delegates to `assistant.update_assistant`.
- `src/codemie/service/assistant/assistant_version_service.py` — `create_new_version` (~82) snapshots versioned fields with `versioned(name)` (~108): explicit `model_fields_set` fields from the request, omitted fields from the merged assistant master record.
- `src/codemie/service/assistant/assistant_version_compare_service.py` — `has_configuration_changes` (~31) overlays only keys present in `request.model_fields_set` before DeepDiff (~84–87).
- DB: `assistants.temperature` and `assistant_configurations.temperature` are nullable floats (`src/external/alembic/versions/07418664fdcf_create_assistants.py`, `772de5bd70b1_add_versioning_for_assistants.py`).
- `src/codemie/service/assistant_service.py` — Agent build passes `temperature=assistant.temperature` and `top_p=assistant.top_p` into `LangGraphAgent` / `AIToolsAgent` (~602–603).
- `src/codemie/agents/langgraph_agent.py` / `src/codemie/agents/assistant_agent.py` — Forward `temperature` into `get_llm_by_credentials` / `LLMParams`.
- `src/codemie/core/dependecies.py` — `get_llm_by_credentials` (~221) routes to enterprise LiteLLM or `get_llm_by_credentials_raw`. `filter_params` (~320): when `llm_model_details.features.temperature is False`, sets `optional_args['temperature'] = 1` (~322–323). Bedrock direct path `get_bedrock_llm` (~446) passes `temperature=temperature` into `ChatBedrockConverse` even when `None`.
- `src/codemie/enterprise/litellm/llm_factory.py` — `_build_chat_model_base_args` always includes `'temperature': temperature` (~324). `_filter_litellm_params` (~1005): when `features.temperature is False`, sets `filtered['temperature'] = 1` (~1025–1026). `claude-sonnet-5` is registered in `litellm_config.yaml` (~316–324) as a Bedrock deployment.
- `src/codemie/enterprise/litellm/models.py` — `LLMFeatures.temperature` is `True` only when `"temperature" in supported_openai_params` from LiteLLM model metadata (~99).
- `src/codemie/service/provider/provider_header_context.py` — Optional `X-Assistant-Temperature` header omitted when `temperature is None` (~57).
- **No frontend/UI code** in this repository (no `.ts`/`.tsx` matches for `temperature`); Marketplace config UI lives in a separate codebase.

### Architecture and Layers Affected

| Layer | Components |
|---|---|
| REST API | `routers/assistant.py` PUT/GET assistant |
| Domain / mapping | `models/assistant.py` `AssistantRequest`, `_map_assistant_request`, `update_assistant` |
| Service / versioning | `assistant_version_service.py`, `assistant_version_compare_service.py` |
| Persistence | PostgreSQL `assistants`, `assistant_configurations` |
| Agent runtime | `assistant_service.py`, `langgraph_agent.py`, `assistant_agent.py` |
| LLM integration | `core/dependecies.py`, `enterprise/litellm/llm_factory.py`, LiteLLM proxy config |

Marketplace is not a separate persistence model: global assistants use the same assistant APIs and tables; marketplace-specific behavior is `is_global`, category validation on update (~881–882), and background indexing (~896–904).

### Integration Points

- **Client → API**: Partial updates rely on Pydantic `model_fields_set` from the JSON body; clearing requires `temperature` to be present in the payload with a JSON `null` (or equivalent) so the field is in `model_fields_set`.
- **API → DB**: Master `assistants` row updated first; version snapshot on detected config change.
- **API → runtime**: Chat/ask paths load `Assistant` from DB and pass stored `temperature` into LLM factories (no separate marketplace override).
- **LiteLLM / Bedrock**: Production path typically `get_litellm_chat_model` → `LiteLLMChatOpenAI` with params filtered by model feature flags from proxy metadata.

### Patterns and Conventions

- Partial PATCH semantics on PUT: only `model_fields_set` fields update (`AssistantRequest` docstring, `_should_update_field`).
- Explicit `null` clears optional scalars (regression test exists for `description`, not yet for `temperature`/`top_p`) — `tests/codemie/rest_api/models/test_map_assistant_request_helpers.py` `test_explicit_null_clears_field` (~231).
- Versioned config fields include `temperature` and `top_p` (`AssistantConfiguration`, ~1277–1278).
- Unsupported LLM parameters: codebase convention is to **force defaults** (`temperature=1`) when `features.temperature is False`, not to drop the key from the outbound request.

---

## 3. Documentation Findings

### Guides and Architecture Docs

- `.ai-run/guides/integration/llm-providers.md` — LiteLLM as enterprise provider boundary; parameter handling should go through shared factories.
- `.ai-run/guides/api/rest-api-patterns.md` — Routers under `rest_api/routers/`, structured errors.
- `docs/superpowers/tasks/2026-08-25-preserve-omitted-optional-fields/` — Prior art for assistant partial updates, `_map_assistant_request`, and versioning alignment (EPMCDME-14150).
- `docs/workflows/02_configuration_reference.md` — Documents assistant `temperature` as optional workflow/agent setting.

### Architectural Decisions

- EPMCDME-14150: Master assistant record honors `model_fields_set`; versioning services updated to use the same contract (`versioned()` / overlay in `has_configuration_changes`).
- LiteLLM feature detection: temperature support inferred from `supported_openai_params` in proxy model info (`enterprise/litellm/models.py`).

### Derived Conventions

- Optional numeric agent params (`temperature`, `top_p`) are stored as nullable DB floats; unset means `NULL`, not a sentinel.
- Provider observability headers skip null temperature (`ProviderHeaderContext.build`).

---

## 4. Testing Landscape

### Existing Coverage

- `tests/codemie/rest_api/models/test_map_assistant_request_helpers.py` — `_should_update_field`, partial update preserve, explicit null clear for **description**; temperature included in field-set tests but no end-to-end clear assertion on `assistant.temperature`.
- `tests/codemie/rest_api/models/test_map_assistant_request_metadata.py` — Partial update preserves `temperature` when omitted from request (~188).
- `tests/codemie/service/assistant/test_assistant_version_service_critical.py` — `create_new_version` preserves omitted `temperature` from assistant; applies explicit `temperature=0.2`.
- `tests/codemie/service/assistant/test_assistant_version_compare_service.py` — Change detection when `temperature` explicitly changes (~299).
- `tests/codemie/agents/test_langgraph_agent_initialize_llm.py`, `test_assistant_agent/test_initialize_llm.py` — Forward `temperature=None` to `get_llm_by_credentials`.
- `tests/codemie/rest_api/routers/test_assistant_marketplace.py` — Publish/unpublish; no temperature persistence scenarios.
- `tests/enterprise/litellm/test_models.py` — `features.temperature` true/false from `supported_openai_params`; no test that `_filter_litellm_params` omits vs forces `1`.

### Testing Framework and Patterns

- pytest; heavy use of mocks for `AssistantConfiguration` in version services; model-level unit tests construct `AssistantRequest` and call `_map_assistant_request` directly.

### Coverage Gaps

- No API/router integration test: PUT with `temperature: null` then GET asserts null (AC 1–3).
- No regression test clearing `top_p` alongside `temperature` (AC 6).
- No test that LiteLLM/Bedrock invocation **omits** temperature when assistant value is `NULL` and model disallows it (AC 4–5).
- No coverage for client sending empty string or omitting `temperature` while resubmitting other fields (likely UI contract).

---

## 5. Configuration and Environment

### Environment Variables

- LiteLLM proxy: `LITE_LLM_URL`, `LITE_LLM_APP_KEY`, `LLM_PROXY_MODE` (see `llm_factory.get_litellm_chat_model`, setup guides).
- `MODELS_ENV` selects LLM YAML bundles (`.ai-run/guides/integration/llm-providers.md`).

### Configuration Files

- `litellm_config.yaml` — `claude-sonnet-5` Bedrock model entry (~316–324).
- `config/llms/*.yaml` — Static model features for non-proxy paths; several entries set `temperature: false` (e.g. `llm-azure-config.yaml`).

### Feature Flags and Deployment Concerns

- `ENABLE_LANGGRAPH_AITOOLS_AGENT` affects agent class, not temperature storage.
- Marketplace search index (`PLATFORM_MARKETPLACE_DATASOURCE_NAME`) is updated asynchronously on global assistant edit; listing does not replace GET-by-id config source.

---

## 6. Risk Indicators

- **UI not in repo**: Persistence symptoms may be a frontend payload issue (re-sending previous `temperature`, or clearing UI without JSON `null`) while backend partial-update logic already supports explicit clear for other fields.
- **`_filter_litellm_params` / `filter_params`**: When `features.temperature is False`, code sets `temperature=1` rather than removing the parameter — requests may still send temperature after DB clear if LiteLLM metadata marks Sonnet 5 as non-temperature (matches reported Bedrock 400).
- **Speculative**: If the UI sends a full assistant object on save (all fields always present), behavior depends on whether cleared temperature is encoded as `null` vs omitted; omitted preserves old value by design (AC 1 would fail without client fix).
- **Speculative**: `ChatBedrockConverse(temperature=None)` vs omitted kwarg may differ from LiteLLM proxy behavior; two code paths (`get_bedrock_llm` vs LiteLLM factory).
- **Test gap**: AC 6 asks for clear/set/update matrix; only description has explicit-null mapping test today.
- **Version history**: Rollback/pin paths (`AssistantVersionService.apply_version_to_assistant`, sub-assistant version pins) can reintroduce old `temperature` from snapshots if used after clear.

---

## 7. Summary for Complexity Assessment

The backend already implements standard partial-update semantics for assistants (including marketplace globals): `model_fields_set` gates `_map_assistant_request`, and versioning services were aligned in EPMCDME-14150 to snapshot explicit changes only. Temperature and `top_p` are versioned nullable floats on both `assistants` and `assistant_configurations`, and GET detail responses read the master assistant row. The reported bug therefore spans (a) client payload contract for “clear optional numeric field”, (b) possible gaps in proving temperature/`top_p` clear at API and mapping layers, and (c) LLM invocation still injecting temperature when models disallow it.

Execution path complexity is moderate: stored `assistant.temperature` flows through `AssistantService` into `get_llm_by_credentials` and enterprise `_filter_litellm_params`, which currently **overwrites** disallowed temperature with `1` instead of omitting it — a plausible root cause for AC 4–5 even after successful DB nulling. `claude-sonnet-5` is configured for Bedrock via LiteLLM; feature flags come from proxy `supported_openai_params`.

Test coverage is strong for partial-update omit semantics and version snapshot preservation, but weak for explicit clear of `temperature`/`top_p`, router round-trips, and LiteLLM param omission. No Marketplace UI exists in this repository; a full fix may require coordinated frontend and backend changes. Size likely **M**: focused backend changes plus tests, with optional frontend follow-up outside this repo.

---

## 8. External References

None named by the task.
