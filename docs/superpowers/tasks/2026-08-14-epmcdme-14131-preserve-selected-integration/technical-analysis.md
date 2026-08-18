# Technical Research

**Task**: workflow tool configuration, toolkit integration selector, automatic credentials lookup, assistant form, workflow node config
**Generated**: 2026-08-14
**Research path**: filesystem (codegraph MCP tools were not available in this session)

---

## 1. Original Context

Ticket EPMCDME-14131, Bug, Major, label Frontend, fix version Prod 2.44.0.

### Summary
Automatic lookup is selected after choosing a specific integration for workflow tools

### Description
When a user configures tools in a workflow and selects a specific integration, CodeMie still shows or applies **Automatic lookup** instead of preserving the selected integration. This prevents users from reliably configuring workflow tools with the intended integration and may cause workflows to use an unexpected integration during configuration or execution.

### Preconditions
- User is authenticated in CodeMie.
- User has permission to create or edit workflows.
- Workflow tool configuration is available.
- At least one specific integration is available for the selected workflow tool.
- **Automatic lookup** is available as an integration selection option.

### Steps to Reproduce
1. Open a workflow for creation or editing.
2. Add or open a tool configuration in the workflow.
3. Select a specific integration for the tool.
4. Save or close the tool configuration, if required.
5. Reopen or review the tool integration selection.
6. Observe which integration option is selected.

### Expected Result
The workflow tool keeps the specific integration selected by the user.

### Actual Result
**Automatic lookup** is selected even after the user selected a specific integration for the workflow tool.

### Affected Areas
- Workflow creation and editing
- Workflow tool configuration
- Integration selector
- Automatic lookup selection logic
- Frontend form state persistence

### Acceptance Criteria
- A workflow tool preserves the specific integration selected by the user.
- **Automatic lookup** is selected only when the user explicitly chooses it.
- Reopening the workflow tool configuration shows the previously selected specific integration.
- Saving and reopening the workflow does not replace the selected integration with **Automatic lookup**.
- No regression is introduced for workflow tools that intentionally use **Automatic lookup**.

### Additional context supplied with the task
Story EPMCDME-13738 "Per-workflow scope for personal integration settings in the assistant panel" was squash-merged into `codemie-ui` main on 2026-08-13 as commit `50e8b9325` (the bug was reported 2026-08-14). It introduced a three-state per-slot integration model: author-pinned integration / automatic credentials lookup enabled / automatic credentials lookup disabled ("No integration"), replacing the previous model where an absent pinned integration meant both "lookup enabled" and "nothing selected". A matching backend change landed in the `codemie` repo (commit `559c3e0a6` on main).

Repositories inspected:
- Frontend (primary): `/Users/evgeniikvasiuk/Projects/codemie/codemie-ui`, branch `EPMCDME-14131_preserve-selected-integration`
- Backend: `/Users/evgeniikvasiuk/Projects/codemie/codemie`

---

## 2. Codebase Findings

### 2.1 Branch state

- Current branch `EPMCDME-14131_preserve-selected-integration` is **exactly at `origin/main`** (`2ae3d88c2`). `git log --oneline origin/main..HEAD` returns 0 commits and `git status --porcelain` is empty. No fix work exists yet, committed or uncommitted.
- A run directory for this bug already exists (`.state.json`: `flow: sdlc-task`, `phase: main`), with no spec or plan yet.

### 2.2 Existing Implementations

Author-side toolkit/integration UI (shared by assistants **and** workflows):

- `/Users/evgeniikvasiuk/Projects/codemie/codemie-ui/src/pages/assistants/components/AssistantForm/components/Toolkits/Toolkit.tsx` — renders the per-toolkit and per-tool auto-lookup switch plus the integration dropdown. Derives the mode at `:115-116` and `:118-123`.
- `.../Toolkits/IntegrationSelector.tsx` — wrapper over `AutoCredentialsSwitch` + `IntegrationSelectDropdown`; `isAutoMode = autoMode ?? derivedAutoMode` (`:70`), with the legacy derive-from-`value` effect skipped when the caller owns `autoMode` (`:72-77`).
- `.../Toolkits/IntegrationSelectDropdown.tsx` — `if (isAutoMode) return null` at `:78`, before any value or option handling.
- `.../Toolkits/AutoCredentialsSwitch.tsx` — the "Automatic Credentials Lookup" switch (label is an inline literal at `:25`).
- `.../Toolkits/ToolsConfiguration.tsx` — wires `useToolkitSelection` into render props; also holds a settings re-hydration effect at `:154-181`.
- `.../Toolkits/AvailableToolsSection.tsx` — dispatches render props to `Toolkit` / `PluginToolkit` / a custom renderer, keyed by toolkit type.
- `/Users/evgeniikvasiuk/Projects/codemie/codemie-ui/src/hooks/useToolkitSelection.ts` — the only writer of `auto_credentials_lookup` (`updateToolkitAutoLookup` `:160-177`, `updateToolAutoLookup` `:180-202`); `updateToolkitSetting` `:126-139` and `updateToolSetting` `:141-153` write only `settings`.

Workflow-editor surfaces:

- `/Users/evgeniikvasiuk/Projects/codemie/codemie-ui/src/pages/workflows/editor/configPanels/ToolTab.tsx` — saves a Tool node; `extractToolFromToolkits` (`:66-78`) reduces a whole toolkit to `{ tool, integration_alias }` (`:177-186`).
- `.../configPanels/components/ToolForm.tsx` — RHF form holding `toolkits`; rebuilds them on open from `toolConfig.integration_alias` only (`:305-343`).
- `.../configPanels/components/ToolSelector.tsx` — renders `ToolsConfiguration` in a popup with `singleToolSelection={true}`, staged in local state and committed on Save.
- `.../configPanels/AssistantTab.tsx` — serializes virtual-assistant toolkits to `tools: [{ name, integration_alias: tool.settings?.alias || tk.settings?.alias }]` (`:227-233`).
- `.../configPanels/components/VirtualAssistantForm.tsx` — inline assistant inside a workflow node; same `ToolsConfiguration` (`:389`) and same rehydration (`:255-272`).
- `/Users/evgeniikvasiuk/Projects/codemie/codemie-ui/src/utils/workflows.ts` — `getToolkitsFromConfiguration` (`:29-143`), `normalizeToolkitSettingsForToolForm` (`:226-263`), `notifyAboutConsumerSlots` (`:275-281`, added by `50e8b9325`).
- `/Users/evgeniikvasiuk/Projects/codemie/codemie-ui/src/utils/toolkit.ts` — `extractToolkitSettings` / `applyToolkitSettings` (`:19-38`), alias⇄`Setting` mapping with no auto-lookup awareness.

Consumer-side ("Your Integration Settings") — a separate component tree:

- `/Users/evgeniikvasiuk/Projects/codemie/codemie-ui/src/pages/assistants/components/AssistantDetails/components/UserMapping/**` — its own `IntegrationSelector.tsx` and `Toolkit.tsx`, distinct from the author-side ones.
- `/Users/evgeniikvasiuk/Projects/codemie/codemie-ui/src/store/assistants.ts` — `getUserMapping(assistantId, workflowId?, credentialTypes?)` (`:749-770`), `saveUserMappingSettings(..., scope?)` (`:772-798`).
- `/Users/evgeniikvasiuk/Projects/codemie/codemie-ui/src/utils/assistants.tsx` — consumer slot model (`autoLookup`, `explicitNone`), `collectAutoLookupCredentialTypes` (`:186-194`), `applyAutoResolvedIntegrations` (`:200-218`).
- `/Users/evgeniikvasiuk/Projects/codemie/codemie-ui/src/store/utils/assistants.ts` — `transformAssistantToCreateDTO`; the **only** place `auto_credentials_lookup` is sent to the backend (`:50`, `:57`), on the assistant path.

### 2.3 Requirement 1 — Every surface where a workflow tool's integration is chosen

There are five distinct surfaces. Only the first three are author-side "workflow tool configuration" in the sense of the ticket.

| # | Surface | Entry file | Component chain | Persisted as |
|---|---|---|---|---|
| 1 | **Workflow Tool node** (visual editor, right-hand config panel) | `src/pages/workflows/editor/configPanels/ToolTab.tsx` | `ToolTab` → `ToolForm` → `ToolSelector` (popup, `singleToolSelection`) → `ToolsConfiguration` → `AvailableToolsSection` → `Toolkit` → `IntegrationSelector` → `IntegrationSelectDropdown` | `ToolConfiguration.integration_alias?: string` into workflow YAML. **Alias only — the auto-lookup flag is dropped.** |
| 2 | **Workflow MCP tool node** | same `ToolTab` chain with `showInternalTools={false}`, `showMcpServers={true}` | … → `McpServersSection` → `MCPServerCard` / `MCPServerDetail` → `IntegrationSelector` (no `showAutoCredentials`) | MCP server details in YAML; the auto-lookup switch is not rendered here |
| 3 | **Workflow inline / "virtual" assistant node** | `src/pages/workflows/editor/configPanels/AssistantTab.tsx` | `AssistantTab` → `VirtualAssistantForm` (`:389`) → `ToolsConfiguration` (multi-tool) → `Toolkit` → `IntegrationSelector` | `tools: [{ name, integration_alias }]` (`AssistantTab.tsx:227-233`). **Alias only; the `settings` object and the flag are dropped.** |
| 4 | **Workflow YAML panel** | `src/pages/workflows/editor/configPanels/YamlPanel.tsx` + `src/utils/workflowEditor/serialization` | text editor | `integration_alias` in raw YAML |
| 5 | **"Your Integration Settings" panel** (consumer scope, added by `50e8b9325`) | `src/pages/workflows/details/AssistantNodePanel.tsx` | `WorkflowDetailsPage.tsx:247` → `AssistantNodePanel` (`workflowId` prop) → `AssistantDetailsEmbedded` → `UserMapping` → consumer `IntegrationSelector` | `POST /v1/assistants/{id}/users/mapping` with `{ tools_config, workflow_id, apply_to_assistant }` — a **per-user** row, not the workflow definition |

Baseline for comparison (non-workflow): the Assistant page, `AssistantForm.tsx` → `ToolsConfiguration` → `Toolkit`, which persists via `transformAssistantToCreateDTO` and is the only path that carries `auto_credentials_lookup` end to end.

Surfaces 1 and 3 are where the reported symptom lives. Surface 5 is a different (consumer) concept that happens to use the same words in the UI and is a plausible source of user confusion in the bug report, but it is stored and read through a completely different API.

### 2.4 Requirement 2 — Exact data path of a chosen integration

**Write path — assistant form (the reference implementation, works):**

1. `IntegrationSelectDropdown` `Select.onChange`; option `value = Setting.id` (`IntegrationSelectDropdown.tsx:65,110`)
2. `onChange(selected: Setting)` → `Toolkit.tsx:277 updateToolkitSetting(toolkit, setting)` or `:230 updateToolSetting(toolkit, tool, setting)`
3. `useToolkitSelection.ts:133` → `{ ...tk, settings: setting || undefined }`
4. `AssistantForm.tsx:221` `toolkits` state
5. `store/assistants.ts:733/829` → `transformAssistantToCreateDTO`
6. `store/utils/assistants.ts:50,57` emits **both** `settings` and `auto_credentials_lookup`
7. `POST` / `PUT v1/assistants` — fields `toolkits[].settings`, `toolkits[].auto_credentials_lookup`, `toolkits[].tools[].settings`, `toolkits[].tools[].auto_credentials_lookup`

**Write path — workflow Tool node (surface 1, lossy):**

1. Same dropdown → same `useToolkitSelection` update (produces a `Setting` object on `settings`)
2. `ToolSelector.tsx:214 setStagedToolkits` → `:101 onToolkitsChange(stagedToolkits)` on Save
3. `ToolForm` RHF value `toolkits`
4. `ToolTab.tsx:173 extractToolFromToolkits` → `utils/toolkit.ts:19-38 extractToolkitSettings`, which returns **`alias` only**
5. `ToolTab.tsx:181` writes `integration_alias` into `ToolConfiguration`
6. Workflow YAML → `PUT /v1/workflows/{id}` with `yaml_config`
   → **`auto_credentials_lookup` is dropped at step 4.**

**Write path — workflow virtual assistant (surface 3, lossy):** identical until `AssistantTab.tsx:227-233`, which emits `{ name, integration_alias: tool.settings?.alias || tk.settings?.alias }`. Both the `settings` object and the flag are dropped.

**Write path — consumer panel (surface 5):** `Select` value is `UserSetting.id` or the sentinel `'__none__'` → `UserMapping/components/IntegrationSelector.tsx:94` maps sentinel → `null` → `onUpdate(itemKey, settingId, setting)` → `UserMapping.tsx:278-286` (`changedKeys.add`) → workflow scope filters to `changedKeys` only (`:307-311`) → `store/assistants.ts:780-792` → `{ tools_config: [{ name: originalName, integration_id: settingId || '' }], workflow_id, apply_to_assistant }`.

**Read path — assistant form:** `GET v1/assistants/{id}` → `assistant.toolkits[]` (both `settings` and `auto_credentials_lookup`) → `AssistantForm.tsx:221` → `ToolsConfiguration.tsx:154-181` re-hydrates `settings` objects **by `Setting.id`** → `Toolkit.tsx:197,270` read the value, `:198,281` read the mode.

**Read path — workflow Tool node:** YAML `tools[].integration_alias` → `ToolForm.tsx:311-331` builds `tools=[{ name, integration_alias }]` → `utils/workflows.ts:29-143 getToolkitsFromConfiguration` matches **by `Setting.alias`** (`:88-89`, `:117-118`, `:136`) and assigns `tool.settings` / `toolkit.settings` → `normalizeToolkitSettingsForToolForm` (`:226-263`) → `setValue('toolkits', …)` → `Toolkit.tsx` then reads `auto_credentials_lookup`, **which the workflow config never contained**.

**Read path — consumer panel:** `GET …/users/mapping?workflow_id&credential_types` → `{ tools_config[], auto_resolved[], has_assistant_scope_selection }` → `initializeUserMappingSettings` (`utils/assistants.tsx:48-97`) → `applyUserMapping` (`:133-168`, matched by `originalName`) → `applyAutoResolvedIntegrations` (`:200-218`) → `IntegrationSelector` `selectedValue = settingId ?? NO_INTEGRATION` (`:87`).

### 2.5 Requirement 2 (cont.) — Sentinel values

| Value | Meaning | Defined / read at |
|---|---|---|
| `auto_credentials_lookup === undefined` (absent) | **Automatic lookup ENABLED** | declared `src/types/entity/assistant.ts:224,233`; read `Toolkit.tsx:116,118-123`, `utils/assistants.tsx:109,128` |
| `auto_credentials_lookup === true` | Automatic lookup enabled (identical to absent) | same |
| `auto_credentials_lookup === false` | Lookup disabled — author-pinned integration or "No integration" | same |
| `settings === undefined \| null` (author side) | Nothing pinned; cleared together with the flag | `useToolkitSelection.ts:170,192` |
| `integration_alias === undefined` (workflow YAML) | Nothing pinned | `src/utils/workflowEditor/serialization/types.ts:57`; backend treats a missing alias as auto lookup (`validation/resources.py:379`) |
| `NO_INTEGRATION = '__none__'` | UI-only sentinel for "No integration" | `UserMapping/components/IntegrationSelector.tsx:33` (module-private, not exported, not in `src/constants/`); used `:84,87,88`; mapped back to `null` at `:94` |
| `settingId === null` | No per-user selection in panel state | serialized to `integration_id: ''` at `store/assistants.ts:782` (`setting.settingId \|\| ''`) |
| `integration_id === ''` (wire) | User's explicit "no integration", **remembered** | backend `core/models.py:526` accepts it; `assistant_user_mapping_service.py:88-101` |
| `explicitNone === true` | Panel-state mirror of the above | set `utils/assistants.tsx:167`, honoured `:211` |

Note that there is **no literal string "Automatic lookup"** anywhere in `src/`. The UI label is "Automatic Credentials Lookup" (`AutoCredentialsSwitch.tsx:25`). The ticket's wording maps to the switch being ON.

### 2.6 Root cause (evidence chain)

The regression is the divergence of two halves of the model that `50e8b9325` changed asymmetrically.

**Before `50e8b9325`**, `Toolkit.tsx` computed the mode from the pinned integration:
`const [toolkitAutoMode, setToolkitAutoMode] = useState(!selectedToolkit?.settings)`.
A workflow toolkit hydrated from `integration_alias` therefore had `settings` set, `autoMode` false, and the dropdown showed the pinned value.

**After `50e8b9325`**, `Toolkit.tsx:115-116` reads only the new stored flag:
`const toolkitAutoMode = (selectedToolkit as { auto_credentials_lookup?: boolean })?.auto_credentials_lookup !== false`
— `settings` is no longer consulted at all. `isToolAutoMode` (`:118-123`) is identical for per-tool slots.

The workflow persistence layer never gained the flag: `ToolConfiguration` has only `integration_alias?: string` (`src/types/workflowEditor/configuration.ts:52`), and `extractToolkitSettings` returns only `{ alias, id }`. So on reopen, a workflow toolkit has `settings` populated and `auto_credentials_lookup === undefined`, and `undefined !== false` evaluates to `true`.

`Toolkit.tsx:281` then passes `autoMode={toolkitAutoMode}` as a **caller-owned** prop, which disables `IntegrationSelector`'s fallback derive-from-`value` (`IntegrationSelector.tsx:72-77`). `IntegrationSelectDropdown.tsx:78` — moved to the very top of the component by this same commit — returns `null` before `value` is consulted. Result: the integration is still in `selectedToolkit.settings`, but the dropdown is unmounted and the switch reads ON, i.e. **Automatic lookup**.

A same-session variant exists as well: `ToolSelector` runs with `singleToolSelection`, so `useToolkitSelection.toggleSingleTool` (`:56-80`) rebuilds the entry as `{ ...toolkit /* the available-toolkit definition, without the flag */, tools: [tool], settings }`, discarding any prior "lookup off" decision on re-toggle.

### 2.7 Requirement 3 — Ranked defect candidates

Ordered by likelihood of producing the reported symptom. Each is quoted with `file:line`.

1. **`Toolkit.tsx:115-116`** — falsy/absent flag coerced to "Automatic lookup" (`auto_credentials_lookup !== false`). The workflow config never carries the flag, so a toolkit with a pinned `settings` object evaluates to auto = true. **Primary cause on surfaces 1 and 3.**
2. **`Toolkit.tsx:118-123` (`isToolAutoMode`)** — identical coercion for per-tool slots; `toolValue` (`:197`) is correctly populated from `integration_alias` and then discarded because `isAutoMode` (`:198`) is true.
3. **`IntegrationSelectDropdown.tsx:78`** — `if (isAutoMode) return null` moved to the top by the commit, so the selection is unmounted before `value` is even considered. This is what makes the symptom *visible* rather than merely internal.
4. **`ToolTab.tsx:177-186` and `AssistantTab.tsx:227-233`** — the saved payload omits `auto_credentials_lookup` entirely (`utils/toolkit.ts:19-38` returns only `{ alias, id }`). Even if a user turns the toggle off and picks an integration, the "lookup off" decision is dropped on save. `ToolTab.tsx:66-78` types the input as `toolkits: any[]`, which defeated the type check that would have caught this.
5. **`useToolkitSelection.ts:126-139` and `:141-153`** — `updateToolkitSetting` / `updateToolSetting` write `settings` **without** setting `auto_credentials_lookup: false`. Any path that pins an integration without going through the toggle (workflow hydration, `applyToolRecommendationsToToolkits`, AI-generated toolkits, `MissingIntegrationsModal`) yields `{ settings: X, auto_credentials_lookup: undefined }`, which renders as Automatic lookup.
6. **Legacy assistant data, `store/utils/assistants.ts:50,57`** — `auto_credentials_lookup` is `undefined` for every assistant saved before `50e8b9325` and is stripped by JSON serialization. Such assistants, with a pinned integration, now open showing Automatic lookup. This is the same root cause reaching **beyond** the workflow surfaces named in the ticket.
7. **`ToolsConfiguration.tsx:154-181`** — effect keyed on `[project, settings, onToolkitsChange]` rebuilds every toolkit when the integrations list arrives asynchronously and calls `onToolkitsChange` on every `settings` identity change; in the workflow forms this writes back through `setValue('toolkits', …)` and can race with an in-flight selection.
8. **`IntegrationSelector.tsx:72-77`** — the legacy derive-from-`value` effect still runs for every caller that does **not** pass `autoMode` (`PluginToolkit.tsx:170,205`, `MCPServerCard.tsx:174`, `MCPEnvVarsSection.tsx:87`, `MCPServerDetail.tsx:113`, `MissingIntegrationsModal.tsx:196`, `IntegrationSection.tsx:103`). It resets the mode from `!value` on every `value` change, so a transient empty `value` while options load flips the slot back to auto.
9. **`utils/assistants.tsx:53-70` (`initializeUserMappingSettings`)** — the new `&& !toolkit.settings` / `&& !tool.settings` gate removes the consumer panel row for any slot the author pinned; combined with `getDisplayableToolkits:243-249`, a previously saved per-user selection for that slot stops being shown and, in assistant scope, stops being re-sent.
10. **`UserMapping.tsx:326` + `:335`** — the post-save `fetchUserMappingSettings()` re-adds auto-resolved keys to `changedKeys` (`:123-126`), then `finally { setChangedKeys(new Set()) }` wipes them; in workflow scope the next save omits those slots and they fall back to auto lookup.
11. **`UserMapping.tsx:119-126` (`applyAutoResolvedIntegrations`)** — overwrites `settingId` for any slot without an explicit selection on **every** fetch, including the post-save refetch.
12. **`utils/assistants.tsx:145-155` (`applyUserMapping`)** — the fallback loop keeps the **last** key whose `originalName === toolName`; the same tool name in two toolkits collides and the selection lands on the wrong slot.

Candidates 1–5 explain the ticket as written. Candidates 9–12 belong to the consumer panel and are separate defects of the same story; they are recorded here so the planner can scope them in or out deliberately.

### 2.8 Architecture and Layers Affected

- **Component (author-side, shared)**: `Toolkit.tsx`, `IntegrationSelector.tsx`, `IntegrationSelectDropdown.tsx`, `AutoCredentialsSwitch.tsx`, `AvailableToolsSection.tsx`, `ToolsConfiguration.tsx`, `PluginToolkit.tsx`, MCP cards
- **Component (workflow editor)**: `ToolTab.tsx`, `ToolForm.tsx`, `ToolSelector.tsx`, `AssistantTab.tsx`, `VirtualAssistantForm.tsx`, `AssistantNodePanel.tsx`
- **Component (consumer)**: `AssistantDetails/components/UserMapping/**`
- **Hook**: `useToolkitSelection.ts`, `useWorkflowContext`, `useNewIntegrationPopup`
- **Store (valtio `proxy`)**: `store/assistants.ts`, `store/settings.ts`, `store/workflows.ts`
- **Util**: `utils/toolkit.ts`, `utils/workflows.ts`, `utils/assistants.tsx`, `utils/settings.ts`, `utils/workflowEditor/serialization`
- **Types**: `src/types/entity/assistant.ts`, `src/types/workflowEditor/configuration.ts`
- **API**: `utils/api.ts` fetch wrapper called from the stores (no separate service layer)

A minimal fix touches the Component (author-side) and possibly Util/Types layers. Extending the three-state model to workflows would additionally touch Types, Util (serialization) and the backend.

### 2.9 Key types

- `AssistantToolkit.auto_credentials_lookup?: boolean` — `src/types/entity/assistant.ts:224`; **absent means enabled**
- `AssistantToolkit.settings?: Setting | null` — `:227`; `AssistantToolkit.settings_config: boolean` — `:226`
- `Tool.auto_credentials_lookup?: boolean` — `:233`; `Tool.settings?: Setting | null`, `Tool.settings_config: boolean` — `:236-237`
- `ToolConfiguration.integration_alias?: string` — `src/types/workflowEditor/configuration.ts:52` — **the only integration carrier for a workflow tool node; no auto-lookup field**
- `AssistantTool.name: string`, `AssistantTool.integration_alias?: string` — `configuration.ts:27-30` — same gap
- `SerializedState.integration_alias?: string` — `src/utils/workflowEditor/serialization/types.ts:57`
- `UserMappingSaveScope.workflowId?: string`, `.applyToAssistant?: boolean` — `src/store/assistants.ts`
- `Setting.id`, `Setting.alias`, `Setting.setting_type` — alias is the workflow-YAML join key, id is the assistant join key

### 2.10 Integration Points and backend contract

Backend commit `559c3e0a6` mirrors the story on the **assistant** and **user-mapping** paths only:

- `rest_api/models/assistant.py:155,167` — `auto_credentials_lookup: bool = True` on `ToolDetails` and `ToolKitDetails`
- `core/models.py:526` — `integration_id=""` is now legal and means the user's explicit "no integration"
- `models/usage/assistant_user_mapping.py` — `ASSISTANT_SCOPE = ""` (`:34`), new `workflow_id` column (`:50`), unique key widened to `(assistant_id, user_id, workflow_id)`
- `service/tools/toolkit_service.py:864-866` — `getattr(..., 'auto_credentials_lookup', True)`: a missing attribute defaults to auto lookup
- `service/tools/tool_service.py:71` — `if integration_alias:` … else the toolkit is built with defaults, i.e. auto lookup

Workflow models did **not** get the three-state model:

- `core/workflow_models/workflow_models.py:47` — `WorkflowAssistantTool.integration_alias: Optional[str] = None`, nothing else
- `:99` — `WorkflowTool.integration_alias: Optional[str] = None`
- The workflow author surface is structurally **two-state**: "no integration" is not representable and is indistinguishable from "automatic lookup" on the wire.

Two backend contract traps worth verifying against real traffic before assuming a pure-frontend cause:

1. `PUT /v1/workflows/{id}` accepts **only** `yaml_config` (`UpdateWorkflowRequest`, `workflow_models.py:427` — no `tools`/`assistants` fields), and `GET /v1/workflows/id/{id}` re-runs `parse_execution_config()` over the stored columns (`workflow_service.py:68-76`). Anything the UI sends as a structured `tools` array, or omits from the YAML it regenerates, is silently replaced by `integration_alias: None`, which the UI renders as Automatic lookup.
2. The per-workflow mapping API stores and reads state only when `workflow_id` is present on **both** calls. `routers/assistant_mapping.py:145` (`request.workflow_id or ASSISTANT_SCOPE`) and `:191` mean a save or read with a missing `workflow_id` silently falls back to assistant scope, and the panel then shows the `auto_resolved` value instead of the pin.

The backend never rewrites a supplied `integration_alias` or `integration_id`. Verdict: **mostly frontend**, but not cleanly exonerated — the actual `PUT` body and the mapping `GET` query string should be inspected during reproduction.

### 2.11 Patterns and Conventions

- Caller-owned controlled toggle: `IntegrationSelector` takes `autoMode` + `onAutoModeChange`, falling back to deriving from `value` only when `autoMode === undefined`
- "Absent means enabled" tri-state encoding via `x !== false`, repeated in `Toolkit.tsx` and `utils/assistants.tsx:109,128`
- Single atomic update: the flag and `settings: undefined` are set in one `onToolkitsChange` — comments explicitly warn that two calls revert each other
- Derive UI from form data, never from local state (comment at `Toolkit.tsx:112-114`: the form mounts before the toolkits arrive)
- valtio `proxy` + `useSnapshot` for `settingsStore` / `assistantsStore`
- RHF `useForm` + `Controller` / `FieldController` + `yupResolver`; toolkits held as a form value via `setValue('toolkits', …)`
- `forwardRef` + `useImperativeHandle` (`{ getValues, validate, isDirty, reset }`) on every workflow config tab
- Staged-then-commit modal editing in `ToolSelector` (`stagedToolkits` → `onToolkitsChange` on Save)
- Component registry by toolkit type in `AvailableToolsSection`
- Alias-based persistence for workflows, id-based for assistants

### 2.12 Cross-module dependency direction

- `pages/workflows/editor/configPanels/components/ToolSelector.tsx` → `pages/assistants/.../Toolkits/ToolsConfiguration.tsx`
- `pages/workflows/editor/configPanels/components/VirtualAssistantForm.tsx` → `pages/assistants/.../Toolkits/ToolsConfiguration.tsx`
- `pages/assistants/.../AssistantForm.tsx` → `Toolkits/ToolsConfiguration.tsx`
- `ToolsConfiguration.tsx` → `hooks/useToolkitSelection.ts` (sole non-test consumer)
- `ToolsConfiguration` → `AvailableToolsSection` → `Toolkit` → `IntegrationSelector` → `IntegrationSelectDropdown` → `components/form/Select`
- `Toolkits/Toolkit.tsx` → `pages/workflows/editor/hooks/useWorkflowContext` — **reverse dependency**: an assistant-page component imports workflow editor context
- `ToolTab.tsx` → `utils/toolkit.ts`; `ToolForm.tsx` → `utils/workflows.ts` → `utils/toolkit.ts`
- `pages/workflows/{New,Edit}WorkflowPage.tsx` → `utils/workflows.ts#notifyAboutConsumerSlots` → `store/workflows.ts` → `utils/api.ts`

---

## 3. Documentation Findings

### 3.1 Guides and Architecture Docs

`.ai-run/guides/` exists and is the declared source of truth (`AGENTS.md`: "Check Guides First"; "A guide conflicts with source code → Trust current source"). Rules that constrain this fix:

- `patterns/form-patterns.md` — "Validation Lives in the Schema, Not in Component State": field invariants must not live in component-local state, which "can always be bypassed by `reset()`, `setValue()`, or data loaded from the backend". `||` for defaults is banned in favour of `??` — load-bearing here, since `''` is a meaningful sentinel in this domain. Leaf/field components take explicit `value`/`onChange`/`error`, never `control`.
- `patterns/state-management.md` — "Component → Store → API. Never skip layers." `useSnapshot` for reads; never mutate the snapshot.
- `patterns/custom-hooks.md` — `useToolkitSelection` must keep `useCallback` on returned handlers, complete `useEffect` deps, and one responsibility.
- `components/component-patterns.md` — no `any` (directly relevant: `ToolTab.tsx` uses `toolkits: any[]`); no magic strings, import from `@/constants`; 300-line component limit.
- `development/workflow-editor-patterns.md` — "Keep components thin. Any logic beyond JSX rendering belongs in `src/utils/workflowEditor/`"; keep `editorState` separate from `currentWorkflow`; the serializer/deserializer are the only format-translation points; "Test logic utilities — not the React Flow canvas itself".
- `development/constants-usage.md` — extract a value used in 2+ places; "Export constants from component files" is a DON'T (violated today by `NO_INTEGRATION`).
- `standards/git-workflow.md` — branch `EPMCDME-14131_short-description` off `main`; commit/MR title `EPMCDME-XXXX: Capital sentence` (Tekton regex-enforced, no trailing period); squash merge; never `--no-verify`; MR body must include full `npm run test-harness` output, before/after UI screenshots, and `Closes EPMCDME-14131`.
- License headers (Apache-2.0, EPAM) are mandatory on every source file; `npm run license-headers:check` blocks commits.

### 3.2 Architectural Decisions

The intended model is documented in `/Users/evgeniikvasiuk/Projects/codemie/codemie-ui/docs/superpowers/tasks/2026-07-28-epmcdme-13738-per-workflow-integration-scope/spec.md`, §4.8 "One integration model for every slot":

| Author's decision | Stored as | Resolved at run time | Shown to the user |
|---|---|---|---|
| Pinned integration | the integration on the slot | the author's integration, for everyone | nothing — the slot is not offered |
| Automatic lookup enabled | no integration, flag enabled | the user's own integration of that type | the resolved integration, pre-selected |
| Automatic lookup disabled | no integration, flag disabled | nothing | "No integration" |

Verbatim statements that constrain the fix:

- "Before this change the toggle was not stored at all: it was derived from 'no integration pinned', so 'lookup disabled with nothing pinned' and 'lookup enabled' were the same data … The decision is therefore persisted per slot, defaulting to enabled."
- "**The user's own decision wins**, including an explicit 'No integration'. That choice is remembered rather than treated as 'nothing chosen yet'; otherwise automatic lookup would silently overwrite it on the next load."
- "**A slot deliberately left without an integration keeps its tool.**"
- §7: "the automatic-lookup toggle is read from stored data rather than derived from 'nothing pinned', and switching it writes the flag. Enabling it also clears any pinned integration **in the same update** — two separate updates would each rebuild the toolkit list from the same snapshot, and the second would silently revert the first."
- §4.2 resolution order: workflow-scoped selection → assistant-scoped selection → automatic lookup (if the author left it enabled) → no integration.

Note the tension this fix must resolve: the spec's table asserts that a **pinned** integration and the **flag** are mutually exclusive ("Pinned integration → the integration on the slot"), yet the reader implemented in `Toolkit.tsx:116` treats an absent flag as auto regardless of whether an integration is pinned. Any data whose flag was never written — legacy assistants and every workflow toolkit — falls into the gap.

Adjacent prior art: `docs/superpowers/tasks/2026-07-21-epmcdme-10653-workflow-integration-persist/` ("workflow integration persist"), the earlier story on exactly this persistence path.

The 13738 `qa-report.md` lists as still outstanding: "End-to-end walkthrough in the UI (inheritance on first open, saving with the checkbox off and on, a second user keeping their own selection)" — i.e. the scenario that regressed was never manually verified.

### 3.3 Derived Conventions

Load-bearing explanatory comments (unmarked but they record invariants the fix must not break):

- `src/hooks/useToolkitSelection.ts:156-159` — "Persist the author's automatic-credentials-lookup decision for a whole toolkit. It has to be stored, not derived: 'lookup off with nothing pinned' and 'lookup on' both leave settings empty, and only a stored flag tells them apart."
- `src/hooks/useToolkitSelection.ts:165-166` — "One update, not two: enabling lookup also drops the pinned integration, and doing that through a second call would rebuild the list from the same snapshot and revert this flag."
- `Toolkits/IntegrationSelector.tsx:82-85` — "A caller that persists the decision clears the integration within the same update. Calling onChange as well would rebuild the toolkit list from a stale snapshot and revert the flag that was just stored, which is how a slot ended up saved with lookup off."
- `Toolkits/Toolkit.tsx:112-114` — "Derive the toggles from the form data instead of keeping them in local state: the form mounts before the assistant's toolkits arrive, so a state initialised once would stay on its initial value and a saved 'lookup off' would keep showing as enabled."
- `src/store/utils/assistants.ts:46-47` — "Author's auto-lookup decision has to reach the backend, otherwise 'lookup off with nothing pinned' would be lost on every save and silently become 'lookup on'."
- `src/utils/assistants.tsx:165-166` — "A stored slot with no integration id is the user's explicit 'no integration': the backend keeps it on purpose, so auto lookup must not override that decision."

TODO/HACK markers in the feature area: only `AssistantForm/components/FormSection.tsx:21` ("This component is no longer used … Consider removing"), unrelated. No markers in `useToolkitSelection.ts`, `utils/assistants.tsx`, `utils/workflows.ts`, or the UserMapping tree.

---

## 4. Testing Landscape

### 4.1 Framework and commands

- Vitest `1.6.1` + `@testing-library/react` 16.3.0, `user-event` 14.6.1, `jest-dom` 6.6.3, jsdom 24.1.3, coverage via `@vitest/coverage-istanbul`
- Config: `vitest.workspace.ts` (projects `unit` and `integration`), extending `vite.config.ts`; setup in `src/setupTests.tsx`, `src/setupTests.unit.ts`, `src/setupTests.integration.ts`
- Include globs: unit `**/__tests__/**/*.{test,spec}.?(c|m)[jt]s?(x)` minus `*.integration.test.*`; integration `**/__tests__/**/*.integration.test.*` (timeout 30000)
- Commands: `npm test` · `npm run test:unit` · `npm run test:integration` · `npm run test:coverage` · `npm run lint` · `npm run typecheck` · `npm run check:pre-commit`. Single file: `npm run test:unit -- --reporter=verbose src/path/Foo.test.tsx`
- Quality gates, in order, all must exit 0 before an MR: `lint` → `typecheck` → `test:unit` → `test:integration`

### 4.2 Existing Coverage

- `.../Toolkits/__tests__/IntegrationSelector.test.tsx` — auto-lookup toggle visibility; the `onAutoModeChange` vs `onChange(undefined)` clearing contract
- `.../Toolkits/__tests__/ToolkitAutoLookup.test.tsx` — `Toolkit.tsx`: switch reflects stored `auto_credentials_lookup`, defaults ON when the flag is absent, persists via `updateToolAutoLookup`, reflects a flag arriving after first render
- `.../Toolkits/__tests__/IntegrationSelectDropdown.test.tsx` — auto mode short-circuits the empty-list branch; `disabled` behaviour
- `src/hooks/__tests__/useToolkitSelection.test.ts` (533 lines) — `updateSelectedToolkits`, `toggleSingleTool`, settings propagation
- `src/utils/__tests__/workflows.test.ts` — `getToolkitsFromConfiguration`, `hasUserIntegrationInYamlConfig`, `notifyAboutConsumerSlots`
- `src/utils/__tests__/assistantsUserMapping.test.ts` — `initializeUserMappingSettings`, `collectAutoLookupCredentialTypes`, `applyAutoResolvedIntegrations`, `getDisplayableToolkits`, `getScopedMappingIntegrationOptions`
- `src/store/__tests__/assistants.test.ts`, `src/store/utils/__tests__/assistants.test.ts` (plus a duplicate at `src/store/__tests__/utils/assistants.test.ts`) — `transformAssistantToCreateDTO`
- `src/pages/workflows/editor/__tests__/ConfigPanel.test.tsx` — config panel save/dirty/imperative handle (mocks `../configPanels/ToolTab`)
- `src/pages/workflows/__tests__/EditWorkflowPage.integration.test.tsx` — full page + `mockAPI` template for save/reload flows

Note the trap: `.../AssistantDetails/components/UserMapping/components/__tests__/IntegrationSelector.test.tsx` tests a **different** `IntegrationSelector` (the consumer one).

Existing tests directly encode the buggy behaviour: `ToolkitAutoLookup.test.tsx` asserts the switch "defaults ON when the flag is absent". Changing the derivation will require that assertion to be revisited, and the distinction between "flag absent, nothing pinned" (should stay ON) and "flag absent, integration pinned" (should be OFF) will need to be made explicit.

### 4.3 Patterns

- Colocated `__tests__/` directories; `*.test.tsx` = unit, `*.integration.test.tsx` = integration
- The unit project auto-mocks `@/utils/api`, `@/utils/storage`, and `valtio` (`useSnapshot` returns the raw store) via `setupTests.unit.ts` — no manual valtio reset needed
- Global mocks in `setupTests.tsx`: `SettingsLayout`, `useVueRouter`, `global.fetch`, `navigate`. Do not re-mock these per file
- Integration tests use `import { mockAPI, navigate, renderPage } from '@/test-utils/integration'`; register `mockAPI` in `beforeEach` before `renderPage('/route')`; no msw
- Shared PrimeReact interaction helpers live in `src/test-utils/component-interactions/` (`select.ts`, `multi-select.ts`, …) and should be used to drive the integration dropdown
- Best template to copy: `.../Toolkits/__tests__/ToolkitAutoLookup.test.tsx` — same bug family (stored flag vs derived UI state), and it already demonstrates the `const { rerender } = render(...)` pattern for late-arriving data, which is exactly the "value replaced on reopen" shape
- Hook-level template: `src/hooks/__tests__/useToolkitSelection.test.ts` (`renderHook` + `act`, `makeTool`/`makeToolkit` factories)
- Query priority per guide: `getByRole` > `findByRole` > … > `getByTestId` (last resort); assert user-visible behaviour, not store internals
- Every new test file needs the Apache-2.0 EPAM license header

### 4.4 Coverage Gaps

- `.../Toolkits/ToolsConfiguration.tsx` — **no test**; orchestrates `updateToolSetting` / `updateToolkitSetting` / auto-lookup wiring. Highest-value gap for this bug.
- `.../Toolkits/AutoCredentialsSwitch.tsx` — no test
- `src/pages/workflows/editor/configPanels/ToolTab.tsx` — **no test**; this is where `integration_alias` is extracted and serialized (`extractToolkitSettings`, `extractToolFromToolkits`)
- `.../configPanels/components/ToolForm.tsx`, `ToolSelector.tsx`, `AssistantSelector.tsx`, `ToolArgumentsForm.tsx` — no tests (only `MappingRow.test.tsx` exists in that directory)
- `.../Toolkits/AvailableToolsSection.tsx`, `ExternalToolsSection.tsx`, `McpServersSection.tsx`, `PluginToolkit.tsx`, `ToolkitDetailModal.tsx`, `ToolkitHeader.tsx`, `ToolkitsPanelLayout.tsx` — no tests
- `Toolkit.tsx` — covered only for the auto-lookup path; **no test that a chosen integration survives a save/reopen round trip**
- `useToolkitSelection.ts` — has tests, but no case asserting that an explicitly chosen integration survives a re-render or a save round trip
- No `*.integration.test.tsx` covering the workflow-editor ToolTab save→reopen cycle
- Backend: **no test anywhere asserts that a workflow tool's `integration_alias` survives a create→read or update→read round trip**
- No coverage thresholds are configured (`qa-strategy.md`: "line coverage target: not configured")

---

## 5. Configuration and Environment

No environment variables, feature flags, config files, or deployment manifests govern this behaviour. The three-state model is data-level only.

- **Storage**: `auto_credentials_lookup` lives inside the assistant's `toolkits` JSONB — no schema migration was needed, and the `True` default preserves legacy behaviour (13738 spec, §10).
- **Migration present**: `..._add_workflow_scope_to_assistant_user_mapping.py` adds `workflow_id NOT NULL server_default ''`; existing rows remain assistant-scoped. This is the consumer-panel path, not the workflow-definition path.
- **User-facing copy is inline**, with no i18n layer: "Automatic Credentials Lookup" (`AutoCredentialsSwitch.tsx:25`) and its two hints (`:27-30`); "No integration" (`UserMapping/components/IntegrationSelector.tsx:84`).
- **`NO_INTEGRATION = '__none__'`** is module-private in `UserMapping/components/IntegrationSelector.tsx:33` — not exported and not in `src/constants/`, which violates `constants-usage.md`.
- Local secrets note relevant to reproduction: this repo's `.env` is a tracked template, so a `git reset --hard` would wipe locally configured values.

---

## 6. Risk Indicators

- **Fix-shape decision is not obvious and has cross-repo consequences.** Two mutually exclusive directions exist, and the choice must be made explicitly by the planner:
  (a) *Frontend-only*: make the reader fall back to "pinned integration ⇒ lookup off" when the flag is absent (e.g. `auto_credentials_lookup ?? !settings === false`-style derivation in `Toolkit.tsx:115-123`). This also repairs legacy assistants (candidate 6) at no backend cost, but it re-couples the two signals the 13738 spec deliberately separated, and would weaken "lookup off with nothing pinned".
  (b) *Carry the flag through workflows*: extend `ToolConfiguration` / `AssistantTool` / the YAML serializer and the backend `WorkflowTool` / `WorkflowAssistantTool` models. Correct in principle, but requires a backend change (`workflow_models.py:47,99`), a YAML format change, and back-compat handling for existing workflows. Not achievable inside a Frontend-labelled bug.
- **The workflow surface may not need three states at all.** Backend `tool_service.py:71` builds workflow toolkits with defaults, so "lookup disabled" is not executable for a workflow tool node. Rendering the switch there at all may itself be the defect. This is a product question that should be settled before implementation.
- **Blast radius exceeds the ticket.** Candidate 6 means every pre-13738 assistant with a pinned integration currently renders as Automatic lookup. Fixing surface 1 without addressing this leaves a larger, unreported regression in place; addressing it widens the change beyond the ticket's stated scope.
- **`ToolTab.tsx:66-78` types toolkits as `any[]`**, which is what let the lossy `{ tool, integration_alias }` reduction pass type checking. `component-patterns.md` bans `any`, so tightening this type is likely to surface further breakage.
- **Existing tests encode the buggy behaviour.** `ToolkitAutoLookup.test.tsx` asserts the switch defaults ON when the flag is absent; any fix to the derivation forces that assertion to be rewritten, which is easy to mistake for "the fix broke a test".
- **No test coverage on the exact save→reopen path.** `ToolsConfiguration.tsx`, `ToolTab.tsx`, `ToolForm.tsx`, and `ToolSelector.tsx` have none, and no backend test covers `integration_alias` round-tripping. There is no existing regression net for this bug.
- **Write/read key asymmetry**: workflows persist and hydrate by `Setting.alias`, while `ToolsConfiguration.tsx:157,166-168` re-syncs by `Setting.id`. A rename or a missing alias breaks hydration differently from how it breaks the re-sync.
- **Option list is project-filtered but hydration is not.** `ToolsConfiguration.tsx:114-123` filters by project/`is_global`, while `getToolkitsFromConfiguration` uses `Object.values(settings).flat()` unfiltered — a hydrated value can be absent from the option list and resolve to `undefined` at `IntegrationSelectDropdown.tsx:101`, which reads to the user as "reset to Automatic lookup".
- **Async re-render races.** `ToolsConfiguration.tsx:154-181` fires `onToolkitsChange` on every `settings` identity change; in the workflow forms this writes back through `setValue('toolkits', …)` and can race with an in-flight selection. Reproduction may be timing-dependent, i.e. intermittent.
- **`updateToolkitAutoLookup` is optional in `Toolkit.tsx:40-41` but required in `AvailableToolsSection.tsx:41-42`** — any renderer bypassing `ToolsConfiguration` turns the toggle into a silent no-op.
- **Backend contract traps not yet ruled out.** `PUT /v1/workflows/{id}` accepts only `yaml_config` and `GET` re-parses YAML over the stored columns; and the mapping API silently falls back to assistant scope when `workflow_id` is missing. The actual request payloads should be captured during reproduction before concluding "frontend-only".
- **Reproduction ambiguity.** The ticket says "tools in a workflow" without naming a surface. There are three candidate author-side surfaces plus a consumer panel that uses similar wording. Confirming which one the reporter used is a prerequisite; the fix differs per surface.
- **`50e8b9325` was merged one day before the report and its own QA report flags the exact untested walkthrough** ("saving with the checkbox off and on"). Treat the whole 13738 change as unverified in the UI, not just the one path in this ticket.
- **Process constraints**: MR title regex `EPMCDME-14131: Capital sentence`, MR body must carry full `npm run test-harness` output plus before/after screenshots, license headers mandatory on new files, `--no-verify` forbidden. Note that this repo's local ESLint alias resolver is known to be broken, which historically forced `--no-verify`; that conflicts with `git-workflow.md` and should be resolved rather than worked around.

---

## 7. Summary for Complexity Assessment

**Layers and file surface.** This is a frontend bug whose root cause is a one-line derivation in a shared component, but whose correct scope is a design decision rather than a typo. The minimal fix touches the author-side component layer — `Toolkit.tsx:115-123` (how auto-mode is derived) and possibly `IntegrationSelectDropdown.tsx:78` (whether auto-mode may unmount a populated value) — which is roughly 2 source files plus 2–3 test files. The thorough fix additionally touches the workflow persistence layer: `src/types/workflowEditor/configuration.ts`, `src/utils/toolkit.ts`, `src/utils/workflows.ts`, `ToolTab.tsx`, `AssistantTab.tsx`, and the YAML serializer, which is 8–10 source files in the frontend **and** a matching backend model change in the `codemie` repo (`workflow_models.py`), since `WorkflowTool` / `WorkflowAssistantTool` carry only `integration_alias` and cannot express the third state. The bug is labeled Frontend and targets Prod 2.44.0, so the frontend-only shape is the realistic target; but the planner must consciously accept that it papers over a structurally two-state workflow format rather than fixing it. A third, smaller option — hiding the auto-lookup switch on workflow tool nodes, where the backend cannot honour "lookup disabled" anyway — should be evaluated, because it may be both the smallest and the most semantically correct change.

**Technical novelty.** No new patterns are required; everything needed already exists and is well documented. The 13738 spec (`docs/superpowers/tasks/2026-07-28-epmcdme-13738-per-workflow-integration-scope/spec.md` §4.8) states the intended three-state model explicitly, and the source carries unusually good explanatory comments recording the invariants (single atomic update, derive from form data not local state, the flag must be stored not derived). The difficulty is not in writing code but in not breaking those invariants: the previous story's own review cycle produced nine findings (`code-review-final.json`, verdict `request-changes`) before converging, and the same trap — one change reverting another because both rebuild the toolkit list from the same snapshot — is documented three separate times in comments. There is also a genuine semantic conflict to resolve: the spec treats "pinned integration" and "flag" as alternatives, while the implementation reads only the flag, so all data written before the flag existed (every workflow toolkit and every legacy assistant) falls into an unhandled gap.

**Test posture and risk.** Mixed, leaning weak exactly where it matters. The auto-lookup toggle has focused tests (`ToolkitAutoLookup.test.tsx`, `IntegrationSelector.test.tsx`), and there is a strong, directly reusable template for the "value replaced on reopen" test shape. But the entire workflow save/reopen path is untested: `ToolsConfiguration.tsx`, `ToolTab.tsx`, `ToolForm.tsx` and `ToolSelector.tsx` have no tests at all, and no backend test asserts that `integration_alias` survives a round trip. Worse, an existing test asserts the current buggy default ("switch defaults ON when the flag is absent"), so a correct fix will appear to break the suite. Complexity scoring should account for: an ambiguous reproduction surface (three author-side candidates plus a similarly worded consumer panel), a blast radius that extends beyond the ticket to all pre-13738 assistants, two unruled-out backend contract traps around `PUT /v1/workflows/{id}` and the `workflow_id` scope parameter, and a timing-dependent re-render race in `ToolsConfiguration.tsx:154-181` that may make the defect intermittent. The single highest-value de-risking step before implementation is to reproduce the bug with the network tab open and confirm which surface is affected and what the `PUT` body actually contains.
