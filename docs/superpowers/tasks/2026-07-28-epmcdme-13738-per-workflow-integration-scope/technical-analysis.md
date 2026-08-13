# Technical Research

**Task**: EPMCDME-13738 — Per-workflow scope for personal integration settings in the assistant panel
**Feature area**: assistant user mapping, per-user integration settings, workflow execution integration resolution, MCP/toolkit credentials
**Generated**: 2026-07-28
**Research path**: filesystem (codegraph MCP not available in this environment)
**Repos**: `/Users/evgeniikvasiuk/Projects/codemie/codemie` (backend), `/Users/evgeniikvasiuk/Projects/codemie/codemie-ui` (frontend) — both on `feature/EPMCDME-13738-per-workflow-integration-scope`

---

## 1. Original Context

## Summary
Add a workflow-scoped personal integration selection for assistants opened from workflow screens, while keeping the existing assistant-wide selection available through an explicit checkbox.

## Description
Users can select integrations in the assistant panel. Today, a personal selection is stored per user and assistant, so it applies everywhere: chat, assistant page, and all workflows.
This story adds a narrower personal scope: user + assistant + workflow. By default, changes made from a workflow screen apply only to that workflow. If the user chooses "apply to the whole assistant", the selection is saved at assistant scope, but not for the other already saved workflows.
Priority: Workflow-based assistant integration settings > Assistant integration settings.
Both scopes stay personal and must not affect other users.

## Preconditions
- The assistant panel is available on workflow screens (delivered by EPMCDME-13529: executions side-panel + "View Assistant" tab in the workflow editor, embedded AssistantDetails view).
- The assistant supports "Your Integration Settings".
- The user has access to the assistant and selectable integrations.
- Existing assistant-scoped personal mappings continue to work.

## Scenarios of Use
1. A user opens the assistant panel from a workflow. If no workflow-scoped selection exists, dropdowns show the effective assistant-scoped selection.
2. The user saves with the checkbox unticked. The selection applies only to this workflow, assistant, and user.
3. The user saves with the checkbox ticked. The selection is stored at assistant scope, and the workflow-scoped selection for this workflow no longer applies.
4. If the user has no personal selection yet, the checkbox is pre-ticked; the user can untick it to keep the selection workflow-only.
5. Another user runs the same workflow. Their own settings are used.
6. From the assistant page, behavior is unchanged: no checkbox, assistant-scoped save only.
7. In an unsaved workflow editor, there is no workflow to bind to, so no checkbox is shown and the section behaves as assistant-scoped.

## Affected Areas
- Assistant panel on workflow executions and workflow editor screens ("Your Integration Settings" section)
- Personal assistant/user integration mapping storage and migration
- Workflow execution integration resolution
- Workflow cloning behavior
- Integration access validation

## Acceptance Criteria
1. On workflow screens, dropdowns show the integration selection currently effective for the user.
2. If no workflow-scoped selection exists, assistant-scoped selection is inherited.
3. A single checkbox controls whether the whole section is saved at assistant scope instead of workflow scope.
4. With the checkbox unticked, saving affects only the current workflow, assistant, and user.
5. With the checkbox unticked, chat, assistant page, and other workflows are unaffected.
6. With the checkbox ticked, saving updates assistant-scoped selection and disables/removes the current workflow-scoped override for that workflow and assistant.
7. If the user has no personal assistant selection yet, the checkbox is pre-ticked by default.
8. If the user already has a personal assistant selection, the checkbox is unticked by default on workflow screens.
9. Workflow-scoped selections affect only executions started by the user who created them.
10. Other users of the same workflow are resolved against their own settings.
11. Runtime resolution order is: workflow-scoped personal selection -> assistant-scoped personal selection -> author-pinned integration -> base configuration.
12. Workflow-scoped selection for one workflow does not affect the same assistant in another workflow.
13. The assistant page keeps current behavior: no checkbox, assistant-scoped save only.
14. Unsaved workflow editor keeps assistant-scoped behavior and shows no checkbox.
15. Existing personal selections remain assistant-scoped after migration; users do not need to re-select integrations.
16. API clients that do not pass a workflow reference keep current assistant-scoped behavior.
17. Workflow reference in the mapping API is optional.
18. Integration access rules are unchanged; inaccessible integrations cannot be selected.
19. If a workflow-scoped integration becomes unavailable, execution falls back to base configuration without breaking the panel or run.
20. Cloning a workflow does not copy workflow-scoped selections.
21. Assistants without per-user integration selection remain unaffected and show no section or checkbox.
22. If the same assistant is used in multiple nodes of one workflow, all nodes share the same workflow-scoped selection for that user.

## Out of Scope
- Visual indicator for workflow override
- Explicit reset-to-assistant-settings control
- Per-toolkit, mixed-scope, or per-node settings
- Workflow-owner pinning for all users
- Cleanup of selections for deleted workflows

---

## 2. Codebase Findings

### 2.1 Existing Implementations — Backend Storage

**Model** — `src/codemie/rest_api/models/usage/assistant_user_mapping.py`
- `:75` `class AssistantUserMappingSQL(BaseModelWithSQLSupport, AssistantUserMappingBase, table=True)`, `__tablename__ = "assistant_user_mapping"` (`:78`). Alias `AssistantUserMapping = AssistantUserMappingSQL` (`:82`).
- Fields live on `AssistantUserMappingBase` (`:37`). No SQLModel `Relationship`, no FK constraints anywhere — assistants/users are referenced by loose `VARCHAR` string ids.
- Columns: `id` VARCHAR PK uuid4-string (`:40`), `date`/`update_date` inherited from `CommonBaseModel` (`src/codemie/rest_api/models/base.py:35-40`), `assistant_id` VARCHAR NOT NULL indexed (`:41`), `user_id` VARCHAR NOT NULL indexed (`:42`), `tools_config` JSONB `PydanticListType(ToolConfig)` nullable default `[]` (`:43`), `created_at`/`updated_at` NOT NULL (`:44-45`).
- `__table_args__` (`:47-51`): **`UniqueConstraint('assistant_id','user_id', name='uix_assistant_user_mapping')`** plus two single-column indexes. This constraint is the primary storage obstacle.
- `ToolConfig` (`:30`) is flat: `{name: str, integration_id: str}`. `name` is the slot name (e.g. `"Git"`, `"MCP:jira-server"`), `integration_id` empty string = fall back to base config.
- DTOs: `AssistantMappingRequest` (`:85`) has a single field `tools_config: List[Dict[str, str]]` — raw dicts, not `ToolConfig`, so extra keys pass through unvalidated. `AssistantMappingResponse` (`:91`) + `from_db_model` (`:101`) flattens to `{"name","integration_id"}` dicts (`:113-115`) and silently drops any new `ToolConfig` field.
- Registered for autogenerate at `src/external/alembic/env.py:95`.
- Sibling precedent with an identical shape: `src/codemie/rest_api/models/usage/assistant_prompt_variable_mapping.py:37`.

Concrete wire shape (identical for request and response body):
```json
{"tools_config": [{"name": "Git", "integration_id": "b2f1c1a0-...-9de"},
                  {"name": "MCP:jira", "integration_id": ""}]}
```

**Repository** — `src/codemie/repository/assistants/assistant_user_mapping_repository.py`
- ABC `AssistantUserMappingRepository` `:30` with abstract methods at `:37, :52, :66, :79`; impl `SQLAssistantUserMappingRepository` `:92`; alias `AssistantUserMappingRepositoryImpl` `:186`. **Any signature change must be made in both ABC and impl.**
- `create_or_update_mapping(assistant_id, user_id, tools_config)` `:98` — read-then-write, not a DB upsert: `get_mapping` in one session (`:112`), then update or insert in a new session (`:123-133`). Uses `flag_modified(mapping, "tools_config")` (`:123`) because the JSONB list is replaced in place. Race-prone; relies on the unique constraint for hard failure.
- `get_mapping(assistant_id, user_id)` `:139` filters both columns (`:151-153`), `.first()`.
- `get_mappings_by_assistant` `:156`, `get_mappings_by_user` `:170`.
- **No delete method exists** anywhere — "removal" is expressed only by rewriting `tools_config`.

**Service** — `src/codemie/service/assistant/assistant_user_mapping_service.py`
- `create_or_update_mapping(assistant_id, user_id, tools_config: List[Dict[str,str]])` `:36` — per-slot merge semantics: non-empty `integration_id` upserts the slot, empty removes it, absent slots are left untouched (`:58-77`), merging against `repository.get_mapping` (`:70`).
- `get_mapping` `:79`, `get_mappings_by_assistant` `:93`, `get_mappings_by_user` `:106`.
- Module-level singleton `assistant_user_mapping_service` `:121`. **No caching at any layer** — every resolution hits the DB.

**REST API** — `src/codemie/rest_api/routers/assistant_mapping.py` (router prefix `/v1`, no router-level dependencies, `:64`)
- `POST /v1/assistants/{assistant_id}/users/mapping` `:71-77` → `_get_assistant_by_id_or_raise` `:93` → `_validate_mapping_access(request.tools_config, user, assistant.project, marketplace=bool(assistant.is_global))` `:95` → `create_or_update_mapping(assistant_id, user_id=user.id, tools_config)` `:98`.
- `GET /v1/assistants/{assistant_id}/users/mapping` `:115-121` — returns a synthetic empty response (`id=""`, `tools_config=[]`) when no row exists (`:132`) instead of 404.
- `user_id` always comes from the token, never the request. No DELETE endpoint.

**Migrations** — `src/external/alembic/versions/` (147 files)
- Naming: `<revision_id>_<snake_case_slug>.py`. Two coexisting id styles: real alembic hex (`5f9df283d7f9_...`) and hand-written 12-char pseudo-ids spelling a sequence (`s9t0u1v2w3x4`, `i1n2t3e4r5a6`). Recent migrations use the hand-written style.
- **Current head: `i1n2t3e4r5a6`** — `src/external/alembic/versions/i1n2t3e4r5a6_add_interactive_features_to_assistants.py` (single head; parent `s9t0u1v2w3x4`). Wiring at `:17-20`.
- Schema `codemie` comes from `config.DEFAULT_DB_SCHEMA` (`src/codemie/configs/config.py:92`); `env.py:187` sets `search_path` before migrations, and `src/codemie/clients/postgres.py:133,162` sets it on the engine. **Recent migrations therefore do NOT pass `schema=`** — follow that style.
- `env.py:132` `render_item` renders `PydanticType`/`PydanticListType` as `postgresql.JSONB(astext_type=sa.Text())`.
- Add-column example: `i1n2t3e4r5a6_...py:23-30`. Create-table + unique constraint + index example (this very table): `5f9df283d7f9_add_interaction_settings.py:61-77` / `:92-94`. Data migration with `op.get_bind()` + `text(...)`: `s9t0u1v2w3x4_migrate_use_custom_config_field.py:63-80`.
- Repo has explicit merge migrations for past multi-head situations (`f2c3d4e5f6a7_merge_workflow_and_leaderboard_heads.py`).

### 2.2 Where the Mapping Is READ at Runtime

Only two readers exist:
1. `src/codemie/service/settings/settings_handler.py:62` — `AssistantUserMappingSettingsHandler.handle(search_fields, assistant_id=None, **kwargs)` (class `:42`) constructs `AssistantUserMappingRepositoryImpl()` **directly, bypassing the service**, and resolves the first `tools_config` entry whose integration matches the requested `credential_type` (`:69-73`). First in the handler chain (`build_settings_handlers` `:191-204`).
2. `src/codemie/service/assistant_service.py:387` — inside `_apply_marketplace_tool_mappings(assistant, user, request)` (def `:362`). Filters via `_select_gated_tool_configs` (`:417`: global assistant → all entries; other shared assistants → MCP-prefixed entries only), then **merges the result into `request.tools_config`** (`:407-414`). Call sites: `:550` (chat, inside `build_agent` `:497`) and `:819` (workflow, inside `build_agent_for_workflow` `:759`).

`request.tools_config` is the **only channel** through which a personal selection reaches toolkit building. Everything downstream (`toolkit_service.py:918`, `mcp/toolkit_service.py:1022-1064`) consumes it unchanged — which is why the new scope can be resolved at a single point.

**Settings handler chain** (`settings_handler.py`, chain-of-responsibility, `|` operator at `:30`, order at `:191-204`):
1. `:42` `AssistantUserMappingSettingsHandler` — per-user selection. Branches: `:48` no assistant_id → next; `:58` if assistant is_global **and** has its own assistant setting → skip mapping (author wins); `:66` no mapping → next.
2. `:78` `BySettingIDSettingsHandler` → 3. `:90` `GlobalAssistantSettingsHandler` (author-pinned) → 4. `:104` `AssistantSettingsHandler` → 5. `:127` `DefaultSettingsHandler` → 6. `:140` `UserSettingsHandler` → 7. `:154` `GlobalUserSettingsHandler` → 8. `:176` `ProjectSettingsHandler`.
- Entry point `SettingsService.retrieve_setting(search_fields, assistant_id=None, setting_id=None)` at `src/codemie/service/settings/settings.py:1584`, dispatch at `:1595`. `handle(search_fields, **kwargs)` already forwards arbitrary kwargs, so a `WorkflowUserMappingSettingsHandler` prepended at `:192` is a drop-in — but every `retrieve_setting` caller that should be workflow-aware must pass it (`settings.py:748,817,873,892,1090,1276,1301,1468,1543`; `mcp/toolkit_service.py:1427,1461`; `tools/tool_service.py:196`).

### 2.3 Workflow Execution Chain — Where the Workflow Id Lives (key feasibility answer)

Ordered hops from HTTP request to toolkit construction:

| # | Location | Hop | Workflow id |
|---|---|---|---|
| 1 | `src/codemie/rest_api/routers/workflow_executions.py:318` (stream) / `:336` (background) / `:444` (resume) | `WorkflowExecutor.create_executor(workflow_config=..., user=..., execution_id=...)` | **IN SCOPE** |
| 2 | `src/codemie/workflows/workflow.py:110` | `create_executor(...)`; autonomous branch → `SupervisorWorkflowExecutor` `:151` | **IN SCOPE** |
| 3 | `src/codemie/workflows/workflow.py:302` | `__init__` stores `self.workflow_config` (`:318`), `self.user`, `self.execution_id` | **IN SCOPE** |
| 4 | `src/codemie/workflows/workflow.py:814` | `_execute_workflow_stream` — background thread; `set_current_user(self.user)` at `:830`, reset at `:893` | **IN SCOPE** |
| 5 | `src/codemie/workflows/workflow.py:448` → `:480` → `:754` | `initialize_nodes` → `initialize_node` → `init_agent_node`, constructs `AgentNode(workflow_config=self.workflow_config, user=..., execution_id=...)` | **IN SCOPE** |
| 6 | `src/codemie/workflows/nodes/base_node.py:71-102` | `BaseNode.__init__` persists `self.workflow_config` (`:102`) | **IN SCOPE** |
| 7 | `src/codemie/workflows/nodes/agent_node.py:191` | `generate_execution_context` → lazily `init_assistant` at `:203` | **IN SCOPE** |
| 8 | `src/codemie/workflows/nodes/agent_node.py:212` | **`init_assistant`** — already dereferences `self.workflow_config.assistants` (`:226`), `.is_global`/`.created_by.user_id` → `owner_user_id` (`:236-237`), `.project` (`:247`) | **IN SCOPE — `self.workflow_config.id` available, simply never forwarded** |
| 9 | `src/codemie/workflows/utils/utils.py:512` | `initialize_assistant(user_input, user, workflow_assistant, workflow_state, thought_queue, file_names, resume_execution, execution_id, project_name, mcp_server_args_preprocessor, request_headers, trace_context, disable_cache, owner_user_id)` → `build_agent_for_workflow` at `:528` | **DROPPED HERE** |
| 10 | `src/codemie/service/assistant_service.py:759` | `build_agent_for_workflow` builds `AssistantChatRequest` (`:801-812`) with `workflow_execution_id=execution_id` only | NOT IN SCOPE |
| 11 | `src/codemie/service/assistant_service.py:819` | `_apply_marketplace_tool_mappings` → `get_mapping(assistant_id, user_id)` `:387` | **NOT IN SCOPE — this is the exact insertion point** |
| 12 | `src/codemie/service/assistant_service.py:825` → `src/codemie/service/tools/toolkit_service.py:448` | `ToolkitService.get_tools(...)` | NOT IN SCOPE |
| 13 | `src/codemie/service/tools/toolkit_service.py:865` → `:914-927` | `_get_tools` → `MCPToolkitService.get_mcp_server_tools(..., workflow_execution_id=..., marketplace_scope=assistant.is_global)` | NOT IN SCOPE (execution id only) |
| 14 | `src/codemie/service/mcp/toolkit_service.py:904` | `_prepare_server_config` → `_is_explicit_integration_slot` `:1001`, `_build_mcp_server_config` `:1511`, `_apply_server_tools_config` `:1022` | NOT IN SCOPE |

Autonomous path is equivalent: `src/codemie/workflows/supervisor_workflow.py:99` → `src/codemie/workflows/workflow.py:560` `initialize_assistant(assistant, workflow_state=None)` — also **IN SCOPE** via `self.workflow_config`.

**Verdict**: the workflow id survives to hop 8 and is dropped at hop 9. Only three signatures separate hop 8 from the mapping read. Cheapest explicit route (mirrors exactly how `owner_user_id` was threaded for EPMCDME-13337, a proven shape):
1. add `workflow_id: str | None = None` to `workflows/utils/utils.py:512 initialize_assistant`
2. same on `service/assistant_service.py:759 build_agent_for_workflow`
3. same on `service/assistant_service.py:362 _apply_marketplace_tool_mappings`
4. pass `workflow_id=self.workflow_config.id` at `agent_node.py:239` and `workflow.py:561`
The chat path (`build_agent:550`) passes `None`, so AC 16 is satisfied by construction.

**Context-var alternative**: `src/codemie/rest_api/security/user_context.py:34-35` defines `_current_user` / `_current_auth_token` ContextVars (setters `:38,:53`, getters `:77,:91`). The workflow background thread explicitly re-binds at `workflow.py:830` and clears at `:893` because background threads do not inherit contextvars. A `_current_workflow_id` ContextVar set/cleared at those same two lines would be readable at `assistant_service.py:387` **and** deep in the MCP/settings stack (`mcp/toolkit_service.py:1465`, `settings_handler.py:45`) with zero signature changes. Proof the pattern reaches resolution time: `mcp/toolkit_service.py:1919 get_current_user()` inside `_current_user_can_use_integration`. Similar precedent: `src/codemie/core/dependecies.py` (`set_disable_prompt_cache`, used at `assistant_service.py:507,:798`). Recommendation: explicit params for the mapping read; ContextVar only if the scope must also reach `SettingsService.retrieve_setting`.

### 2.4 Author-Pinned Credentials and the Fallback Chain (EPMCDME-13337)

`src/codemie/service/mcp/toolkit_service.py`:
- `:1465` `_resolve_credentials_with_priority(mcp_server, user_id, project_name, ignore_integration_alias=False)`:
  - `:1488` Priority 1 — `mcp_server.integration_alias`
  - `:1498` Priority 2 — `mcp_server.settings` (**author-pinned**), resolved via `_resolve_credentials_by_id(integration_id=settings.id, user_id=settings.user_id)` i.e. under the **author's** user id
  - `:1507` fallback — `{}` → base inline config from `_build_mcp_server_config` `:1511`
- `:1001-1020` `_is_explicit_integration_slot` — returns `False` when `mcp_server.settings is not None` (pinned wins), else `True` for a non-empty `mcp:<name>` slot, suppressing the alias branch so the personal selection lands on a clean base.
- `:1046-1050` `_apply_server_tools_config` — **hard early return when `mcp_server.settings is not None`**: a pinned integration is authoritative and per-user mapping overrides are never applied.
- `:1928-1990` `_apply_tool_config_to_mcp_server` — direct `tool_creds` first (`:1949`), then `integration_id` with a fail-closed access re-check `_current_user_can_use_integration` (`:1963`, def `:1903`) before `_resolve_credentials_by_id` (`:1972`). Failure is a silent skip, not a 403 — this is the mechanism behind AC 19.
- Workflow tool-node analogue: `src/codemie/workflows/nodes/tool_node.py:368-384 _owner_user_id`. Assistant-side owner pinning: `src/codemie/workflows/nodes/agent_node.py:236-237`, consumed at `assistant_service.py:825` → `toolkit_service.py:918`.

**Effective order today per MCP server**: personal selection (via `request.tools_config`) → author `integration_alias` → author-pinned `settings` → base inline config, *except* that pinned `settings` hard-blocks personal overrides at `:1046-1050` and `:1012` and at `settings_handler.py:58`. See Risk R1.

### 2.5 Integration Access Validation

- `src/codemie/service/settings/settings_util.py:25` `user_can_access_setting(setting, user, assistant_project, marketplace=False) -> bool` — pure predicate, fails closed on `None`. PROJECT setting: `marketplace=True` → always allowed; else `setting.project_name == assistant_project and user.has_access_to_application(assistant_project)`. USER setting: `setting.user_id == user.id` only, unaffected by marketplace.
- `src/codemie/rest_api/routers/assistant_mapping.py:35` `_validate_mapping_access(tools_config, user, assistant_project, marketplace=False)` — empty `integration_id` → `continue`; else `search_settings_by_id` (`:54`) then `user_can_access_setting` (`:55`) or raise `ExtendedHTTPException(403, "Integration is not accessible", ...)`. Called only on POST (`:95`), never on GET.
- Runtime defensive re-check: `src/codemie/service/mcp/toolkit_service.py:1902 _current_user_can_use_integration` (called at `:1964`) — resolves the user from context and silently skips the override on failure.
- `marketplace_scope` propagation: `src/codemie/service/tools/toolkit_service.py:927`, `src/codemie/service/mcp/models.py:50`, `src/codemie/service/mcp/toolkit_service.py:197,1062`.
- Marketplace list side (`src/codemie/rest_api/routers/user_settings.py:50,92-119`, `SETTINGS_SCOPE_MARKETPLACE = "marketplace"`): USER settings always own-only; PROJECT settings unrestricted under `scope=marketplace` or admin/maintainer, else restricted to `user.admin_project_names` / `user.project_names`.
- `SettingType` enum: `src/codemie/rest_api/models/settings.py:239` — only `USER` and `PROJECT`.
- **Open decision**: `_validate_mapping_access` takes the *assistant's* project and `marketplace=bool(assistant.is_global)`. For a workflow-scoped save it is undefined whether the gate should key off the assistant's project or the workflow's (`WorkflowConfig.project` / `WorkflowConfig.is_global`, `src/codemie/core/workflow_models/workflow_config.py:86,111`). Nothing wires `WorkflowConfig.is_global` into `user_can_access_setting` today.

### 2.6 Workflow Entity, Cloning, and the Mapping Key

- `src/codemie/core/workflow_models/workflow_config.py:69` `WorkflowConfigBase(CommonBaseModel, Owned)`; table class `:298` `WorkflowConfig`, `__tablename__ = "workflows"`.
- **Identifier: `id`** — `src/codemie/rest_api/models/base.py:37` `Optional[str]` primary key, a **uuid4 rendered as a string** in a VARCHAR column (not int, not native UUID). Generated in `save()` at `base.py:187-189`. **No slug on `WorkflowConfig`** (slug exists only on the non-table `WorkflowConfigTemplate`, `:329`).
- Scope/ownership: `project` indexed (`:86`), `shared` indexed (`:87`), `is_global` (`:111`), `created_by: UserEntity` (`:76`), `updated_by` (`:93`). Predicates `is_owned_by`/`is_managed_by`/`is_shared_with` at `:286-295`. Ability matrix at `src/codemie/core/ability.py:105-109`.
- `WorkflowConfigBase.assistants: List[WorkflowAssistant]` (`:70`) is a JSONB list — a workflow references assistants by embedded config, not by FK. **This is why AC 22 (same assistant in multiple nodes shares one selection) is naturally satisfied** by keying on `(workflow_id, assistant_id, user_id)`.
- No FK constraints point at `workflows.id`; related rows use a plain `workflow_id: str` (`src/codemie/rest_api/models/workflow_marketplace.py:42`, `WorkflowExecution.workflow_id`) — the new column should match that style.
- **There is NO backend clone endpoint.** Exhaustive grep finds only `settings_transfer_service._clone` (`src/codemie/service/settings/settings_transfer_service.py:210`) and in-memory subagent clones (`src/codemie/service/assistant/assistant_engine_builder.py:159`). Clone is a **frontend-composed create**: `GET /v1/workflows/id/{id}` → strip identity → `POST /v1/workflows` (`src/codemie/rest_api/routers/workflow.py:249-255` → `src/codemie/service/workflow_service.py:119`), new uuid at `base.py:189`.
  - **AC 20 is satisfied by construction** as long as the selection is keyed by `workflow_id` outside `CreateWorkflowRequest`. It breaks only if the selection is embedded as a `WorkflowConfig` field, since create does `WorkflowConfig(**request.model_dump())`.
- Workflow endpoints (`src/codemie/rest_api/routers/workflow.py`, all `/v1`): GET `/workflows/id/{workflow_id}` `:224`, POST `/workflows` `:249`, PUT `/workflows/{workflow_id}` `:311`, DELETE `/workflows/{workflow_id}` `:395`. Identifier exposed to the FE is `id`; list DTO `WorkflowConfigListResponse.id` at `workflow_config.py:346`.
- Deletion counterpart to mirror if cleanup is ever added: `src/codemie/service/workflow_service.py:81 delete_workflow` cleans executions and scheduler/webhook integrations by `resource_id`; router removes guardrail assignments (`workflow.py:412`). Story marks cleanup out of scope — orphan rows will accumulate.
- **No existing user+workflow scoped table exists anywhere in the backend.** Closest precedent is the assistant+user mapping itself; also `assistant_project_mapping.py`, `assistant_prompt_variable_mapping.py`, and user-only prefs at `src/codemie/rest_api/routers/user_preferences_router.py`.

### 2.7 Frontend — the "Your Integration Settings" Section

`codemie-ui/src/pages/assistants/components/AssistantDetails/components/UserMapping/`
- `UserMapping.tsx:48` — props (`:35`): `assistant`, `onNewIntegrationRequest`, `onSectionVisibilityChange`. **No workflow prop, no embedded flag.** State `:54-62`. Load `fetchUserMappingSettings` `:84` → `assistantsStore.getUserMapping(assistant.id)` `:86` → `initializeUserMappingSettings` `:87`. Save `handleSaveChanges` `:229` → `saveUserMappingSettings(assistant.id, userMappingSettings)` `:238` → toast `:239` → refetch `:240`. Section wrapper `<DetailsSidebarSection headline="Your Integration Settings">` `:306`; Save/Cancel rendered only when `isDirty` `:330-339`. **This is where the checkbox belongs.**
- `SubAssistantUserMapping.tsx:40` — has its **own independent save handler** `:88` → `saveUserMappingSettings(subAssistant.id, ...)` `:97` and its own Save/Cancel `:173-182`. The checkbox semantics must be decided for sub-assistants too.
- `components/Toolkit.tsx:36`, `components/IntegrationSelector.tsx:47` — stateless. Sentinel `NO_INTEGRATION = '__none__'` at `IntegrationSelector.tsx:33` (module-private, not exported), options at `:85-89`, coercion `:90`, mapped back to `null` in `handleChange` `:93-101`. Final `''` coercion happens in the store.
- `types.ts:20-56` — `UserMappingSetting` (`:45`), `UserMappingSettings` (`:54`).

**Render chain**: `AssistantDetailsMainSections.tsx:84` renders `<UserMapping>`; gate at `:50` — `!!onNewIntegration && !isTemplate && isUserMappingSupported(assistant)` (AC 21). Two mounters:
- Full page: `AssistantDetails.tsx:89`
- Embedded: `AssistantDetailsEmbedded.tsx:46` (props `:23` — only `assistant` + `onNewIntegration?`)

**There is no `embedded` boolean today** — the distinction is by component choice. An earlier 13529 iteration used an `embedded` prop on `AssistantDetails`; it was replaced by the separate `AssistantDetailsEmbedded` component. So nothing currently tells `UserMapping` it is embedded, and a new prop (`workflowId?`) must be threaded through `AssistantDetailsEmbedded` → `AssistantDetailsMainSections` → `UserMapping`.

**Utils** — `codemie-ui/src/utils/assistants.tsx`: `isUserMappingSupported` `:30`, `initializeUserMappingSettings` `:38` (MCP slot key `` `${MCP_SETTINGS_TYPE_LABEL}_${server.name}` ``, `originalName` = `` `MCP:${server.name}` ``, `:69-74`; applies `tools_config` at `:80-82`), `applyUserMapping` `:113`, `getDisplayableToolkits` `:159`, `getScopedMappingIntegrationOptions` `:224`, `hasConfigurableToolkitsOrTools` `:247`.

**Store** — `codemie-ui/src/store/assistants.ts`: decls `:137-138`; `getUserMapping(assistantId)` `:718` → `GET v1/assistants/${assistantId}/users/mapping`, swallows non-ok → `null`; `saveUserMappingSettings(assistantId, userMappingSettings)` `:733`, payload built at `:737` (`{name: setting.originalName, integration_id: setting.settingId || ''}`), `POST` at `:742`. **No caching of the mapping in the store at all** — every mount refetches. The declared parameter type is wrong (`Array<Record<string, any>>` for what is actually an object map).

### 2.8 Frontend — Mount Contexts and Workflow Id Availability

**Executions side-panel (context b) — workflow id IS available.**
- `codemie-ui/src/pages/workflows/WorkflowDetailsPage.tsx:241-248` mounts `<AssistantNodePanel key={selectedNodeId} assistantId={selectedAssistantId} onClose={...} />`.
- `WorkflowDetailsPage.tsx:48` — `const workflowId = route.params.workflowId as string` (from `useVueRouter()` `:46`); always defined on this route. Also `useWorkflowData(workflowId, executionId)` at `:75`.
- `pages/workflows/details/AssistantNodePanel.tsx:25` currently takes only `assistantId` + `onClose`; renders `<AssistantDetailsEmbedded>` at `:94`. Node→assistant resolution `getNodeAssistantId` `:76-85`, `selectedAssistantId` `:113`.
- Threading path: `WorkflowDetailsPage` → `AssistantNodePanel` → `useAssistantForNode` → `AssistantDetailsEmbedded` → `AssistantDetailsMainSections` → `UserMapping`.

**Editor "View Assistant" tab (context c) — DOES NOT EXIST on this branch.**
- `grep -rn "resolveNodeTabs"` returns **0 hits**. It lived at `src/pages/workflows/editor/utils/nodeTabs.ts` and was **deleted** by commit `0cdeefc01` ("EPMCDME-13529: Remove editor-side View Assistant tab, keep executions side-panel only"), which also removed `configPanels/AsUserTab.tsx`, `utils/__tests__/nodeTabs.test.ts`, and `TAB_DATA.AS_USER`. Branch `feature/EPMCDME-13529-view-assistant-workflow` is fully merged into current HEAD, so the removal is in effect.
- What exists instead: `pages/workflows/editor/configPanels/components/AssistantSelector.tsx:162-172` — a "View Assistant" **button** doing `window.open(getAssistantLink(selectedAssistant), '_blank')` (`handleViewAssistant` `:51`), i.e. it navigates to the standalone assistant page (context a), with no workflow context at all.
- Current tab set: `pages/workflows/editor/constants.ts:18-25` = CONFIGURATION / ADVANCED / NODE / EDGE / YAML / ISSUES (no AS_USER). Tabs assembled at `editor/ConfigPanel.tsx:475-505`.
- If the tab is reinstated, the workflow id is reachable indirectly: `editor/WorkflowEditor.tsx:89` `workflow?: any` ← `components/WorkflowForm.tsx:306` `mergedWorkflow` (built `:282`). `useWorkflowContext` (`editor/hooks/useWorkflowContext.ts:31-53`) carries **no** workflow id.

**Unsaved workflow (AC 14)**: `components/WorkflowForm.tsx:76` `workflow = {}` default → `mergedWorkflow.id` is **`undefined`** (absent, not empty string). `isEditing` (`:47`/`:77`) is the existing "is persisted" signal. `NewWorkflowPage.tsx:45` reads `{ id, slug }` from route params — on `workflows/new` **both are undefined**; on the clone route `id` is the *source* workflow and is deliberately nulled at `:80-84` (`setTemplate({ ...data, id: null, name: null })`). The new id only appears post-save as `createdWorkflowId` (`:64`).

**Hook** — `pages/workflows/hooks/useAssistantForNode.tsx:45` `useAssistantForNode(assistantId?: string)`; returns `assistant`, `isLoading`, `isForbidden`, `notFound`, `loadFailed`, `loadAssistant`, `onNewIntegration`, `newIntegrationPopup` (`:26-36`, `:143-152`). **No workflow id** — the docstring at `:42-43` explicitly records that the contract is assistant-scoped only. This is the natural place to add a `workflowId` param.

**Workflow type** — `codemie-ui/src/types/entity/workflow.ts:32` `interface Workflow` with **`id: string`** (`:33`), `slug: string` (`:34`), and an `[key: string]: any` index signature (`:46`). `useWorkflowData.ts:53` confirms `route.params.workflowId === workflow.id`. Caveat: in the editor the workflow is typed `any` (`WorkflowEditor.tsx:89`, `WorkflowForm.tsx:46`), so `id` is not type-checked there.

**Routes** (`codemie-ui/src/router.tsx:342-407`): `workflows/new` `:375`, `workflows/from-template/:slug` `:380`, `workflows/:id/clone` `:385`, `workflows/:id/edit` `:390`, `workflows/:workflowId` `:394` (`VIEW_WORKFLOW`), `workflows/:workflowId/workflow-executions/:executionId` `:399` (`WOKRFLOW_EXECUTIONS`, typo in source). **Param-name inconsistency**: editor/clone use `id`, details/executions use `workflowId`.

### 2.9 Frontend — Integration Options Cache and Clone

- `codemie-ui/src/store/userSettings.ts:29,66` — `isSettingsIndexed` on the valtio `userSettingsStore`, with second dimension `indexedMarketplace` `:30,67` and payload `settings` `:28`. Gate in `indexSettings(marketplace = false)` `:153-181`; short-circuit `:157-159` (`if (isIndexed && sameScope) return`). Flags set only after a successful fetch `:179-180` (deliberate, comment `:161-163`). Reset via `resetIsSettingsIndexed()` `:186-188`, called from `createUserSetting:127` and `updateUserSetting:135` (the EPMCDME-13393 fix) but **NOT from `deleteUserSetting:139-142`**.
- Cache key is effectively the tuple `(isSettingsIndexed, indexedMarketplace)` — a single boolean scope dimension, no project/assistant/workflow axis. Project scoping is applied client-side afterwards in `getScopedMappingIntegrationOptions` (`utils/assistants.tsx:224-247`). Consumer: `UserMapping.tsx:71-82 loadIntegrations`, memoized on `[assistant.project, isMarketplace]`, result in local `useState` `:55`.
- **Second, uncached store**: `codemie-ui/src/store/settings.ts:26-45` hits the same `v1/settings/user/available` with no cache flag, and is the one used by workflow forms (`WorkflowForm.tsx:87,108`, `editor/configPanels/ToolForm.tsx:147,350`, `GeneralConfigTab.tsx:45,49`). Two parallel integration caches with different semantics.
- Re-load after adding an integration: `UserMapping.tsx:270-282 onSettingAddedCallback` — hard `setTimeout(1000)` then `loadIntegrations()` then picks `options[options.length - 1]` (`getLatestSetting:257-268`). `SubAssistantUserMapping.tsx:128-138` has the same callback but **omits the refetch**, relying on the parent's cache reset.
- **FE clone**: no clone API. `router.tsx:383-387` `workflows/:id/clone` → `NewWorkflowPage`; `NewWorkflowPage.tsx:65` `isCloning = !!id`, `:87-121` fetches the source and sets the template with `id: null, name: null` (`:95-99`); submit `:166-200` → `createWorkflow` (`POST v1/workflows`). Triggers at `components/WorkflowActions.tsx:65-66` and `components/WorkflowsList.tsx:201-202`.

### 2.10 API Client

`codemie-ui/src/utils/api.ts` — hand-rolled `fetch` wrapper class `API` (**not axios**), default export `api`; `get:133`, `post:137`, `put:145`, `delete:149` → `makeRequest` `:165`. Base URL `:126` from `window._env_.VITE_API_URL || import.meta.env.VITE_API_URL` (dev `/api`, `.env:1`). Paths are relative and start with `v1/…`. Mapping CRUD lives only in `store/assistants.ts:718` (GET) and `:733` (POST upsert) — **no PUT, no DELETE**.

### 2.11 Patterns and Conventions

Backend (`.ai-run/guides/architecture/layered-architecture.md`, `.ai-run/guides/data/repository-patterns.md`):
- Strict three tiers: `rest_api/routers/` (HTTP), `service/` (orchestration), `repository/` (persistence). Routers must never touch the DB; repositories must never return HTTP objects.
- Routers registered centrally in `src/codemie/rest_api/main.py` (`:629` app, `:658` routers, `:706` feature-gated).
- Cross-cutting exceptions/constants/config in `codemie.core` / `src/codemie/configs/`; no direct env reads.
- Repositories own data access; extend the matching repository rather than doing storage access from a service.
- **Note the existing code violates this**: `assistant_user_mapping_service` talks to the SQLModel via a directly-constructed repository, and `settings_handler.py:62` constructs `AssistantUserMappingRepositoryImpl()` inline, bypassing the service. The guides favour the repository route for anything new.

Frontend (`.ai-run/guides/patterns/state-management.md`, `.ai-run/guides/development/workflow-editor-patterns.md`):
- Component → Store → API; `api.*` in components is forbidden. One store file per domain, single named `proxy<T>` export with an explicit interface.
- Every async store method: `loading = true` / `error = null` / `try-catch-finally`; log as `console.error('Store Error (<method>):', err)`.
- Always `await response.json()` — never `.data`. `??` not `||` for defaults. Components use `useSnapshot`, never mutate `snap.*`.
- Fetches in `useEffect`, not render. Derived values as valtio getters.
- Workflow editor: components render only; all logic in `src/utils/workflowEditor/`. Keep `editorState` (React Flow) separate from `currentWorkflow` (backend format); node components never call the API.

---

## 3. Documentation Findings

### Guides and Architecture Docs
Both repos have `.ai-run/guides/`. Backend: `project.md`, `quality-gates.md`, `architecture/layered-architecture.md`, `data/repository-patterns.md`, `data/database-patterns.md`, `api/endpoint-conventions.md`, `integration/mcp-integration.md`, `development/security-patterns.md`, `testing/testing-patterns.md`, `testing/testing-api-patterns.md`, `testing/testing-service-patterns.md`. Frontend: `patterns/state-management.md`, `development/workflow-editor-patterns.md`, `development/api-integration.md`, `testing/testing-patterns.md`, `testing/qa-strategy.md`, `testing/qa-health.md`, `standards/git-workflow.md`.

### Architectural Decisions
- **EPMCDME-13337** (per-user MCP credentials): pinned author `settings` is authoritative; per-user overrides are use-time only and never persisted (`mcp/toolkit_service.py:1046-1050`, `:1012`, `settings_handler.py:58`). Enforced by tests in `tests/codemie/service/mcp/test_toolkit_service_user_mapping_isolation.py`.
- **EPMCDME-13393** (integration scoping): marketplace vs project-shared candidate sets; `marketplace_scope` threaded from `assistant.is_global` through `toolkit_service.py:927` → `mcp/models.py:50`. FE fix: reset `isSettingsIndexed` on create/update, sentinel value instead of `value: ''`.
- **EPMCDME-13529** (assistant panel on workflow screens): the editor-side "View Assistant" tab was **deliberately removed** in commit `0cdeefc01`; only the executions side-panel shipped. The `embedded` prop approach was replaced by a separate `AssistantDetailsEmbedded` component.
- `useAssistantForNode.tsx:42-43` carries an inline decision note stating the current contract is assistant-scoped only — i.e. today a workflow node's integration choice leaks globally to that assistant. That is precisely the gap this story closes.

### Derived Conventions
- New scope columns follow the existing loose-string style: `VARCHAR`/`AutoString`, no FK, indexed.
- New migration: single revision, `down_revision = "i1n2t3e4r5a6"`, no `schema=` kwarg, hand-written pseudo-id filename.
- New optional API fields go at the top level of the request/response DTO, not inside each `tools_config` entry (which is `List[Dict[str,str]]`).
- Threading new execution context through the workflow chain follows the `owner_user_id` precedent (explicit params, defaults `None`).

---

## 4. Testing Landscape

### Backend Coverage
- `tests/codemie/rest_api/routers/test_assistant_mapping.py:93,130` (POST success/failure, asserts exact kwargs `create_or_update_mapping(assistant_id=, user_id=, tools_config=)`), `:162,175,186,195` (`_validate_mapping_access`: cross-project 403, marketplace relaxation, empty `integration_id` skip, `is_global` → marketplace), `:225,266,301,330` (GET found/not-found/500/`ExtendedHTTPException`).
- `tests/codemie/repository/assistants/test_assistant_user_mapping_repository.py:52,84,114,147,180` — create/update/get/list-by-assistant/list-by-user against a mocked `Session`.
- `tests/codemie/service/assistant/test_assistant_user_mapping_service.py:59,82,96,110,129,143,157,184,211` — slot merge/clear semantics, singleton.
- `tests/codemie/service/settings/test_settings_handler.py:59,65,97,124,144` — `AssistantUserMappingSettingsHandler`; `:165,204,224,296` — other handlers and chain ordering.
- `tests/codemie/service/settings/test_settings_util.py:41-131` — `user_can_access_setting` matrix.
- `tests/codemie/service/mcp/test_toolkit_service_user_mapping_isolation.py:39,57,74,88,105,124,139` — MCP credential isolation: override never persists, pinned server ignores override, other users unaffected, override skipped without access, marketplace propagation.
- `tests/codemie/service/test_assistant_service_methods.py:130,132,150,189` — `_apply_marketplace_tool_mappings` gating.
- Workflow tests: `tests/codemie/workflows/test_workflow_current_user_context.py:82`, `test_agent_node_context.py`, `test_tool_node_context.py` — **none reference the mapping**.

### Backend Framework and Fixtures
- `pytest.ini:1-13` — `testpaths=tests`, `pythonpath=src`, `--import-mode=importlib`, `ENV=local`, dummy `PG_URL`.
- `tests/conftest.py:31` loads `tests/.env.test`; `:34` `mock_database_engine` (session-scoped, autouse) patches `PostgresClient.get_engine` — **no real DB is ever used**.
- `test_assistant_mapping.py:86` `override_dependency` autouse fixture overriding `authenticate`; HTTP via `httpx.AsyncClient(transport=ASGITransport(app=app))` + `@pytest.mark.asyncio`.
- Repository isolation: `patch("...assistant_user_mapping_repository.Session", MagicMock())` + `patch.object(AssistantUserMappingSQL, "get_engine", ...)`.
- MagicMock factory helpers instead of factory libs (`test_settings_util.py:26,34`). 18 package-local conftests.
- **Alembic migrations are never run or tested against a DB.** Only precedent: `tests/codemie/migrations/test_k5l6m7n8o9p0_deprecate_python_repl.py:48+` tests a migration's pure data-transform helper.
- Commands: `make test` (`poetry run pytest tests/`), `make coverage`, `make verify` (ruff + license + gitleaks + test), `make test-harness` (`uvx codemie-test-harness --sanity-api`).

### Frontend Coverage
- `src/store/__tests__/assistants.test.ts:60-80` — `saveUserMappingSettings` pins the exact URL and payload (`integration_id: ''` for unselected slots). Mocking: top-level `vi.mock('@/utils/api')` (`:22-33`) plus mocks of toaster/appInfo/preferences/user (`:35-49`).
- `src/utils/__tests__/assistantsUserMapping.test.ts:23-53` — `initializeUserMappingSettings` (pure, no mocks); `:55-98` — `getScopedMappingIntegrationOptions` project-shared vs marketplace.
- `src/pages/assistants/__tests__/AssistantDetailsPage.integration.test.tsx:1131,1155,1181,1198,1214,1240` — "Your Integration Settings" end-to-end incl. the save POST. Uses `mockAPI(method,url,data)` + `renderPage(path)`, real valtio, stubbed `global.fetch`.
- `src/pages/workflows/details/__tests__/AssistantNodePanel.test.tsx:53-86` — spinner / 403 / 404 / generic error / renders embedded view. **No assertions on mapping, save, or workflow id.**
- `src/pages/assistants/.../UserMapping/components/__tests__/IntegrationSelector.test.tsx:58,68,84` — pins the `NO_INTEGRATION` sentinel contract.
- Commands: `npm test`, `npm run test:unit`, `npm run test:integration`, `npm run test:coverage`, `npm run test-harness` (`uvx codemie-test-harness --sanity-ui`), `npm run check:pre-commit`.

### Frontend Conventions
- `__tests__/` co-located; `*.test.tsx` → unit project, `*.integration.test.tsx` → integration project. `vi.mock()` at module top level only. `afterEach(cleanup)` mandatory in unit tests.
- Integration tests call `mockAPI(...)` **before** `renderPage('/route/path')`; `mockAPI` prefix-matches and stops at `?` not `/`, so the exact sub-path is required. Dynamic responses need `vi.spyOn(global, 'fetch')`.
- Query priority `getByRole > findByRole > getByPlaceholderText > getByLabelText > getByText > getByTestId`; wrap post-action assertions in `waitFor`.
- **No coverage thresholds configured**, but `standards/git-workflow.md:92,104,108` makes the full `npm run test-harness` console log **mandatory in every MR description** — the compliance bot blocks merge without it, and unit tests do not substitute.
- `qa-health.md` lists `src/store/assistants.ts` as a 0%-coverage risky area.

### Coverage Gaps
- **No test asserts the `AssistantUserMappingSQL` shape** beyond the four known fields — a new nullable column would pass silently.
- **Zero alembic DDL/upgrade-downgrade tests**, and the engine is globally mocked, so a broken migration cannot be caught by pytest at all.
- Repository tests never exercise "same assistant+user, different workflow" — no composite-key or NULL-fallback cases.
- Service merge/clear tests are workflow-agnostic — nothing covers "workflow save must not clobber the assistant-scoped row".
- Router tests assert exact call kwargs and will need updating; nothing covers an unknown/unauthorized `workflow_id`, nor authz that the caller may access that workflow.
- `_validate_mapping_access` has no case for assistant-project vs workflow-project.
- `tests/codemie/workflows/**` never touches the mapping — the path from a running node to the per-workflow selection is untested end-to-end.
- `test_settings_handler.py` has no case for both scopes present simultaneously.
- `test_toolkit_service_user_mapping_isolation.py` covers per-user and marketplace isolation but **not per-workflow isolation** (workflow-X override leaking into workflow-Y).
- **No unit test file exists for `UserMapping.tsx` (365 lines) or `SubAssistantUserMapping.tsx` (185 lines)** — the new checkbox has no component-level harness to extend; only indirect coverage via the AssistantDetailsPage integration test.
- No FE load-side test for `getUserMapping`; `initializeUserMappingSettings` has no workflow-scope cases.
- No cross-repo contract test — FE payload shape and BE expected kwargs are asserted independently and can drift.

---

## 5. Configuration and Environment

### Environment Variables
- `PG_URL` and `DEFAULT_DB_SCHEMA` (`src/codemie/configs/config.py:92`, default schema `codemie`) — govern the migration target. `search_path` is set at `src/external/alembic/env.py:187` and `src/codemie/clients/postgres.py:133,162`.
- MCP toolkit cache sizing: `MCP_TOOLKIT_FACTORY_CACHE_SIZE`, `MCP_TOOLKIT_FACTORY_CACHE_TTL` (`src/codemie/service/mcp/toolkit.py:703`).
- Frontend: `VITE_API_URL` (`codemie-ui/src/utils/api.ts:126`, `.env:1` → `/api`), runtime-overridable via `window._env_`.

### Configuration Files
- `src/external/alembic/alembic.ini` (`script_location = %(here)s`, `file_template` commented out at `:12`), `src/external/alembic/env.py`, `script.py.mako`.
- `pytest.ini`, `Makefile` (backend); `vite.config.ts:94-108` (coverage), `vitest.workspace.ts`, `package.json` (frontend).

### Feature Flags and Deployment Concerns
- No feature flag governs the mapping section — visibility is computed from `isUserMappingSupported(assistant)` (`utils/assistants.tsx:30`) and `AssistantDetailsMainSections.tsx:50`.
- Deployment ordering matters: the FE sends an optional `workflow_id` the old BE would ignore, and the new BE must tolerate its absence (AC 16/17) — so BE-first rollout is safe, FE-first is safe only if the field is genuinely optional.
- The alembic migration must be additive and backward-compatible; a single new revision on head `i1n2t3e4r5a6`.

---

## 6. Risk Indicators

**R1 — AC 11 contradicts an existing security invariant (highest-impact finding).** The story's target order puts the personal selection *above* the author-pinned integration. Today the code enforces the opposite: `src/codemie/service/mcp/toolkit_service.py:1046-1050` hard-returns when `mcp_server.settings is not None`, `:1012` `_is_explicit_integration_slot` returns `False` for pinned servers, and `settings_handler.py:58` skips the mapping when a global assistant has its own setting. This is EPMCDME-13337's deliberate "pinned is authoritative" decision, pinned by `tests/codemie/service/mcp/test_toolkit_service_user_mapping_isolation.py:57,74`. Threading a workflow id is mechanical; **flipping pinned-vs-personal precedence is the substantive, security-sensitive change** and touches fail-closed code. Needs an explicit product decision before implementation — or a re-reading of AC 11 as "workflow personal > assistant personal, with the existing pinned rules untouched below them".

**R2 — Unique constraint and NULL semantics.** `UniqueConstraint('assistant_id','user_id', name='uix_assistant_user_mapping')` (`models/usage/assistant_user_mapping.py:47`) must be dropped and recreated. Postgres treats NULLs as distinct, so a naive `UNIQUE(assistant_id, user_id, workflow_id)` with a nullable column **will not prevent duplicate assistant-scoped rows**. Options: (a) `NOT NULL DEFAULT ''` sentinel with a backfill (keeps a plain 3-column constraint working and existing rows assistant-scoped, satisfying AC 15); (b) nullable plus two partial unique indexes (`WHERE workflow_id IS NULL` / `IS NOT NULL`). Alternatively a separate `workflow_user_mapping` table avoids the constraint surgery entirely at the cost of duplicated repo/service/router plumbing.

**R3 — `get_mapping(...).first()` will start returning an arbitrary row.** `assistant_user_mapping_repository.py:139-153` filters only on assistant+user. Once workflow rows exist, **both current readers** (`settings_handler.py:62` and `assistant_service.py:387`) would non-deterministically pick a workflow row and leak a workflow-scoped selection into plain chat and the assistant page — a direct violation of AC 5 and AC 13. Every caller must be updated to request an explicit scope in the same change as the schema.

**R4 — Merge semantics can silently absorb the wrong scope.** `assistant_user_mapping_service.py:58-77` merges the incoming slots against whatever `get_mapping` returns. If a workflow-scoped save merges against the assistant-scoped row, the workflow save would silently copy assistant slots (or vice versa). The merge must be scoped to the same-scope row only.

**R5 — Cross-user credential leakage is the core security risk of the feature.** The runtime override path already has a fail-closed re-check (`mcp/toolkit_service.py:1903 _current_user_can_use_integration`, called at `:1964`), but `_validate_mapping_access` (`routers/assistant_mapping.py:35`) validates only against the *assistant's* project and `marketplace=bool(assistant.is_global)`. For a workflow-scoped save it is undefined whether the gate should use the workflow's `project`/`is_global` (`workflow_config.py:86,111`) instead. Nothing wires `WorkflowConfig.is_global` into `user_can_access_setting` today. Getting this wrong lets a user attach an integration to a workflow context where the assistant's project would not have permitted it.

**R6 — The editor "View Assistant" tab does not exist on this branch.** `resolveNodeTabs` has 0 hits; it and `AsUserTab.tsx` were deleted by commit `0cdeefc01` within EPMCDME-13529. The story's precondition and AC 14 ("unsaved workflow editor keeps assistant-scoped behavior and shows no checkbox") describe a UI surface that is **not currently shipped**. Only the executions side-panel (`WorkflowDetailsPage.tsx:241`, `details/AssistantNodePanel.tsx`) exists, and it is always on a saved workflow. AC 14 is therefore either vacuous or requires reinstating the removed tab — a scope question to resolve before estimating.

**R7 — No prop threads workflow context into the section today.** `UserMapping.tsx:35` has no workflow prop and no embedded flag; `AssistantDetailsEmbedded.tsx:23` passes only `assistant` + `onNewIntegration`; `useAssistantForNode.tsx:45` takes only `assistantId`; `details/AssistantNodePanel.tsx:25` takes only `assistantId` + `onClose`. Four component boundaries must gain an optional `workflowId`. Distinguishing context (a) from (b) currently relies on component identity, not a flag — so AC 13 (assistant page unchanged) is enforced only by "the prop is undefined there".

**R8 — Two save handlers, one checkbox.** `SubAssistantUserMapping.tsx:88-97` saves independently against the sub-assistant id with its own Save/Cancel block (`:173-182`). Whether the workflow-scope checkbox governs sub-assistants, or each sub-assistant gets its own, is unspecified by the ACs and affects both UI and payload design.

**R9 — `isSettingsIndexed` scope cache.** `store/userSettings.ts:29,66,153-181` keys the candidate-integration cache on the tuple `(isSettingsIndexed, indexedMarketplace)` — a single boolean, no project/assistant/workflow axis. Safe **as long as the candidate set stays a function of marketplace scope only**. If the new feature needs a server-side scope (e.g. `?scope=workflow&workflow_id=…`), the boolean must become a composite key or switching between an assistant panel and a workflow panel will silently serve the other scope's set — exactly the EPMCDME-13393 bug class. Also note `resetIsSettingsIndexed()` is **not** called from `deleteUserSetting:139-142` (pre-existing staleness bug), and a **second, uncached** integration store exists at `store/settings.ts:26-45` used by workflow forms — two caches with different semantics in the same feature area.

**R10 — MCP toolkit cache is safe, but verify.** `service/mcp/toolkit.py:703` `TTLCache` keys on a SHA-256 of the **fully resolved** server config (`_generate_cache_key` `:796-826`: command/url, args, env, headers, auth_token, auth_config, bucket_key). A different workflow-scoped integration yields different env/headers and therefore a distinct key automatically — **no workflow dimension needed**. Other caches (`toolkit_service.py:1093-1101` by base_url, `enterprise/litellm/credentials.py:69`, `tools_preprocessing.py:120`) are likewise unaffected. This should be re-verified once precedence changes land, since it is the only credential-bearing cache.

**R11 — Extra DB query per node execution.** There is no cache anywhere on the mapping read path (`settings_handler` and the repository hit the DB on every resolution). Adding a workflow-scope lookup with assistant-scope fallback doubles the queries per assistant node per execution in the worst case. Low severity, but worth a single combined query rather than two round-trips.

**R12 — Migration is untestable with the current harness.** `tests/conftest.py:34` mocks the DB engine globally and no migration DDL test exists, so an incorrect constraint drop/recreate or a failed backfill (AC 15) cannot be caught by `make test`. Verification must be manual against a local Postgres — and note the known local hazard that switching branches desynchronises alembic against the `codemie` schema.

**R13 — Orphan rows accumulate.** `service/workflow_service.py:81 delete_workflow` cleans executions and scheduler/webhook integrations by `resource_id` but would not touch the new rows. The story explicitly puts cleanup out of scope, so this is accepted debt — but the rows are keyed by a workflow id that no longer exists, and a future workflow could not collide (uuid4) so it is safe, just untidy.

**R14 — Clone is FE-composed, which cuts both ways.** There is no backend clone endpoint; `NewWorkflowPage.tsx:87-121` fetches the source and POSTs it as new. AC 20 is satisfied **for free** if the selection lives in its own table/column keyed by `workflow_id`. It is **violated verbatim** if the selection is ever embedded in the workflow payload (`yaml_config` / `WorkflowConfig` field), because `create_workflow` does `WorkflowConfig(**request.model_dump())` (`routers/workflow.py:249-255`) and would copy another user's integration ids.

**R15 — Route param naming inconsistency.** `workflows/:id/edit` and `workflows/:id/clone` use `id`; `workflows/:workflowId` and the executions route use `workflowId` (`router.tsx:375-401`, plus the `WOKRFLOW_EXECUTIONS` typo). Easy source of an undefined workflow id if the wrong param name is read in a new mount context.

**R16 — Response DTO drops unknown fields.** `AssistantMappingResponse.from_db_model` (`models/usage/assistant_user_mapping.py:101,113-115`) flattens `ToolConfig` to `{"name","integration_id"}`. If the scope is ever expressed inside `ToolConfig` rather than at the top level, it will silently vanish from GET responses. Also `AssistantMappingRequest.tools_config: List[Dict[str,str]]` accepts arbitrary keys without validation, so a typo'd field name would be accepted and ignored rather than rejected.

**R17 — Race in `create_or_update_mapping`.** `assistant_user_mapping_repository.py:98-133` is read-then-write across two sessions with no `ON CONFLICT`. Adding a scope dimension multiplies the row count per user and slightly widens the window; concurrent saves from two panels (assistant page + workflow panel) are now plausible where they were not before.

**R18 — Pre-existing sub-assistant refresh asymmetry.** `SubAssistantUserMapping.tsx:128-138` omits the `loadIntegrations()` refetch that `UserMapping.tsx:270-282` performs, depending on the parent's cache reset. Combined with the hard `setTimeout(1000)` and "last option is the new one" heuristic (`getLatestSetting:257-268`), this is fragile ground to build a new save mode on top of.

---

## 7. Summary for Complexity Assessment

**Layers touched and change surface.** This is a genuine full-stack, two-repo, schema-changing story. On the backend it touches all four layers plus a migration: the SQLModel and its unique constraint (`models/usage/assistant_user_mapping.py:37-51`), the repository ABC *and* impl (`assistant_user_mapping_repository.py:30,92` — four method signatures each), the service merge logic (`assistant_user_mapping_service.py:36-77`), the router and both DTOs (`routers/assistant_mapping.py:71,115`; request/response models), the settings handler chain (`settings_handler.py:42-75`), the resolution site (`assistant_service.py:362,387,759,819`), three workflow-plumbing signatures (`workflows/utils/utils.py:512`, plus call sites at `agent_node.py:239` and `workflow.py:561`), and one new alembic revision on head `i1n2t3e4r5a6`. On the frontend it touches four component boundaries that must gain an optional `workflowId` (`details/AssistantNodePanel.tsx:25` → `useAssistantForNode.tsx:45` → `AssistantDetailsEmbedded.tsx:23` → `AssistantDetailsMainSections.tsx:28` → `UserMapping.tsx:35`), the store's load and save functions (`store/assistants.ts:718,733`), the checkbox UI and its default-state logic, and possibly `SubAssistantUserMapping.tsx`. Realistic surface: roughly 12-16 backend files plus one migration, and 6-9 frontend files, before tests. Add 8-12 new/updated test files across both repos.

**Technical novelty.** The plumbing is low-novelty and well-precedented: threading `workflow_id` down the workflow chain mirrors exactly how `owner_user_id` was threaded for EPMCDME-13337, and the workflow id is already in scope at `agent_node.py:212 init_assistant` (which already reads `workflow_config.assistants`, `.is_global`, `.created_by.user_id`, `.project`) and is merely dropped at `workflows/utils/utils.py:512`. Only three signatures separate it from the resolution point, and everything downstream is untouched because the selection travels as `request.tools_config`. What is genuinely novel and risky is (a) the storage decision — the existing `UniqueConstraint('assistant_id','user_id')` must be dropped and recreated, and Postgres NULL-distinctness means a naive nullable column will not enforce uniqueness for assistant-scoped rows; (b) that **no user+workflow-scoped table exists anywhere in the codebase**, so there is no template to copy; and (c) AC 11, which as written inverts EPMCDME-13337's deliberate "author-pinned is authoritative" invariant enforced at `mcp/toolkit_service.py:1046-1050` and pinned by existing isolation tests. That precedence question is a product decision, not an implementation detail, and should be settled before estimating — it is the difference between a mechanical scope addition and a change to security-sensitive fail-closed credential code.

**Test coverage posture and risk factors.** Mixed-to-poor for exactly the areas being changed. The backend mapping stack is reasonably covered at unit level (router, repository, service, settings handler, `user_can_access_setting`, and a dedicated MCP credential-isolation suite), but every one of those tests asserts exact call kwargs and will need updating, and **none** cover a workflow dimension. Critically, the DB engine is globally mocked (`tests/conftest.py:34`) and there are zero alembic DDL tests, so the migration — the riskiest artefact in the story, since it must satisfy AC 15 without breaking existing selections — **cannot be verified by the test suite at all** and requires manual validation against a local Postgres. On the frontend, `UserMapping.tsx` (365 lines) and `SubAssistantUserMapping.tsx` (185 lines) have **no unit test file whatsoever**; the only mapping-save coverage is an integration test on the assistant page, which has no workflow context, and `AssistantNodePanel.test.tsx` covers only loading/error states. Additional complexity drivers for scoring: R3 (both existing readers silently break once multi-row scopes exist — a correctness landmine, not an enhancement), R6 (the editor tab described in the preconditions was deleted within EPMCDME-13529 and does not exist on this branch, making AC 14 either vacuous or extra scope), R5/R9 (undecided project-vs-workflow access gate, and a scope cache with only a boolean dimension), and the MR-compliance requirement that a full `npm run test-harness` log accompany the frontend MR.
