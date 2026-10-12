# Technical Research

**Task**: workflow editor script step tool integration alias warnings
**Generated**: 2026-10-08
**Research path**: filesystem

---

## 1. Original Context

Jira EPMCDME-15753 (https://jiraeu.epam.com/browse/EPMCDME-15753) — UI part of backend story EPMCDME-15752. The full requirements are the backend hand-off notes at /Users/yanaasadchaya/Projects/epam/codemie/codemie/local/EPMCDME-15752-ui-implementation-notes.md — read that file first and treat it verbatim as the task description. Summary: in the workflow editor, for a tool step whose tool is `execute_workspace_script`, add an editor for new optional field `script_tool_access: [{name, integration_aliases[]}]` (pick tools and per-tool integration aliases from the author's own integrations; empty = "no tools"; no duplicates; only for execute_workspace_script); display new non-blocking `script_step_owner_integration` warning (kind-discriminated, alongside existing consumer_slot warnings) on save/validate/publish preview (WorkflowPublishValidationResponse gets new `warnings`); handle save-time error "Invalid script tool access" (WorkflowValidationErrorDetail with state_id/path/config_line) in validation error list. Acceptance: author picks tools and per-tool aliases from own integrations; empty selection shown as "no tools". Backend is running locally. Repo: /Users/yanaasadchaya/Projects/epam/codemie/codemie-ui. Also find where the assistant tool editor picks `integration_alias` (control to reuse), how workflow tool steps/YAML are edited, existing warnings handling, and the tool catalog source.

---

## 2. Codebase Findings

### Existing Implementations
- `src/pages/workflows/editor/configPanels/ToolTab.tsx` — tool-step config panel. `getToolActorConfig` finds the `ToolConfiguration` in `config.tools` by `state.tool_id`. `saveData()` builds `finalToolConfig` with an explicit field list (id, tool, tool_args, integration_alias, trace, tool_result_json_pointer, resolve_dynamic_values_in_response, input_key, mcp_server). Any unlisted key (e.g. `script_tool_access`) is dropped on panel save. Has a `toolFields` list (tool, tool_args, ..., mcp_server) that expands the accordion when an issue path matches; `script_tool_access` is not in it. Writes via `onConfigChange({state, actors:{tools:[finalToolConfig]}})`. Renders `NewIntegrationPopup` via `useNewIntegrationPopup`.
- `src/pages/workflows/editor/configPanels/components/ToolForm.tsx` — react-hook-form + yup form (`ToolFormValues`: toolkits, mcpServers, tool_args, trace, tool_result_json_pointer, resolve_dynamic_values_in_response, input_key). Exposes `ToolFormRef` (getValues/validate/isDirty/reset). Calls `registerFields([...], NodeTypes.TOOL)` listing editable paths (`tool`, `integration_alias`, `/^tool_args\./`, `/^mcp_server\./` ...) — `script_tool_access` is not registered. Loads catalog via `assistantsStore.getAssistantToolkits()` and settings via `settingsStore.indexSettings()`. Selected tool name is `toolkits[0].tools[0].name` (or `mcpServers[0].tools[0]`). Uses `getIssueField('tool'|'integration_alias'|'mcp_server.description')` from `useWorkflowContext` to show issue text.
- `src/pages/workflows/editor/configPanels/components/ToolSelector.tsx` — single-tool picker; opens a `Popup` containing the assistant `ToolsConfiguration` (`src/pages/assistants/components/AssistantForm/components/Toolkits/ToolsConfiguration.tsx`) with `AssistantFormContext`. Selects exactly one tool (toolkits[0].tools[0]).
- Assistant-side `integration_alias` control: `src/pages/assistants/components/AssistantForm/components/Toolkits/IntegrationSelector.tsx` (props: `value: Setting`, `settingsDefinitions: Setting[]`, `onChange(Setting)`, `onAddSettingClick`, optional auto-credentials switch) wrapping `IntegrationSelectDropdown.tsx` (options from `settingsDefinitions`, single selection by setting id). Single-value only — per-tool multi-alias list (`integration_aliases: string[]`) has no existing control. Alias is extracted from selected setting via `extractToolkitSettings(toolkit, tool)` in `src/utils/toolkit` (returns `{id, alias}`). Related: `Toolkit.tsx`, `ExternalToolsSection.tsx`, `AutoCredentialsSwitch.tsx`, `InlineCredentialsContent` (`src/pages/assistants/components/InlineCredentialsContent/`).
- Types: `src/types/workflowEditor/configuration.ts` — `ToolConfiguration` (line ~48: id, tool, tool_args, integration_alias, trace, tool_result_json_pointer, resolve_dynamic_values_in_response, mcp_server, input_key). No `script_tool_access`. `WorkflowConfiguration.tools?: ToolConfiguration[]`.
- Tool catalog source: `assistantsStore.getAssistantToolkits()` -> `GET v1/assistants/tools` into `assistantsStore.availableToolkits: AssistantToolkit[]` (`src/store/assistants.ts` ~l.500). Also `hedgeableToolkits` (`v1/assistants/hedgeable_tools`), `getToolSchema`, `getPluginTools`, `getMcpTools`. Nothing in `src/` mentions `execute_workspace_script`, `script_tool_access` or `script_callable` (grep clean, also mock-server and docs). The backend notes confirm `script_callable` is not exposed by any REST endpoint.
- User integrations source: `settingsStore` (`src/store/settings`) — `settings`, `indexSettings()`; used in ToolForm and `getToolkitsFromConfiguration`/`normalizeToolkitSettingsForToolForm` in `src/utils/workflows.ts`.
- Warnings handling today: `src/utils/workflows.ts` ~l.265-282 — `ConsumerSlotWarning {tool_name, credential_type}` and `notifyAboutConsumerSlots(body?: {warnings?})` which shows a single `toaster.info("Saved. These tools will use each user's own integration: ...")`. It does not switch on `kind` and would mis-render the new warning (it would list `undefined (undefined)`) if both kinds arrive in the same array. Callers: `src/pages/workflows/NewWorkflowPage.tsx:279` (`notifyAboutConsumerSlots(workflow)` on create response JSON) and `src/pages/workflows/EditWorkflowPage.tsx:129` (`await response?.json()`).
- Validate endpoint: `workflowsStore.validateWorkflow` (`src/store/workflows.ts` ~l.359, `POST v1/workflows/{id}/validate`, returns raw response). Only consumer: `src/pages/workflows/useWorkflowHistoryRestore.ts:82` (`validateRestoredWorkflow`), which ignores the response body (no warnings shown).
- Publish preview: `workflowsStore.validateWorkflowForMarketplace` (`src/store/workflows.ts` ~l.550, `POST v1/workflows/{id}/marketplace/publish/validate`, returns `{data?: WorkflowPublishValidationResponse}`) consumed by `src/pages/workflows/components/PublishWorkflowToMarketplaceModal.tsx` (state `validationData`; renders `InlineCredentialsContent` only when `inline_credentials` non-empty; Publish button `handlePublish`). `WorkflowPublishValidationResponse` (`src/types/entity/workflow.ts` ~l.227) currently only has `inline_credentials?`. No `warnings`.
- Validation errors: `src/utils/workflowEditor/helpers/backendErrorHandler.ts` `processBackendError` — handles `details.error_type` in `resource_validation | cross_reference_validation | schema_validation | workflow_schema`, maps `state_id`->`stateId`, `config_line`->`configLine` via `transformErrorKeys`. Issue types `WorkflowBaseIssue` (id, message, details, stateId, path, configLine, error_type, status) in `src/types/entity/workflow.ts` ~l.173. `EditWorkflowPage.tsx` `applyWorkflowBackendValidationError` -> `setIssues` + `openIssuesPanel`. Resource-validation errors with `state_id`/`path` therefore already flow into the issues list generically; "Invalid script tool access" needs no new transport, but field-level attachment in the tool panel depends on `registerFields` and `getIssueField(path)`.
- Field-path registry: `src/pages/workflows/editor/utils/visualEditorFieldRegistry.ts` (`registerField(s)`, exact paths and RegExp, per node type) with test in `utils/__tests__/visualEditorFieldRegistry.test.ts`. Used to decide whether an issue path is editable in the visual form vs. YAML-only.
- YAML editing: tool args use `src/components/form/YamlEditor/YamlEditor`; whole-workflow YAML in `configPanels/YamlPanel.tsx`; serialization in `src/utils/workflowEditor/serialization/serializer.ts` and `deserializer/` (both reference `integration_alias`/tools).

### Architecture and Layers Affected
- Component layer: workflow editor config panel (`ToolTab`, `ToolForm`, possibly new component under `configPanels/components/`).
- Types: `src/types/workflowEditor/configuration.ts`, `src/types/entity/workflow.ts`.
- Store layer: `src/store/workflows.ts` (validate/publish-validate), `src/store/assistants.ts` (tool catalog), `src/store/settings` (integrations).
- Utils: `src/utils/workflows.ts` (warnings), `src/utils/workflowEditor/helpers/backendErrorHandler.ts` (issues), serializer/deserializer.
- Pages: `NewWorkflowPage`, `EditWorkflowPage`, `PublishWorkflowToMarketplaceModal`, `useWorkflowHistoryRestore`.

### Integration Points
- Backend: `POST/PUT v1/workflows`, `POST v1/workflows/{id}/validate`, `POST v1/workflows/{id}/marketplace/publish/validate`, `GET v1/assistants/tools`, settings API via `settingsStore`.
- All HTTP through `src/utils/api.ts` (`api.get/post/put`, `skipErrorHandling`, `parsedError`).
- `useWorkflowContext` (issues, `getIssueField`, `markIssueDirty`, `activeIssue`) couples panels to the issues panel.

### Patterns and Conventions
- Valtio stores with methods; `useSnapshot` in components; forms via react-hook-form + yup with `forwardRef` + `useImperativeHandle` ref contract (`getValues/validate/isDirty/reset`).
- `FieldController` wrapper for fields; `ConfigAccordion` for sections; `toaster.info/error` for notifications.
- Tool panel save uses explicit field whitelist (see ToolTab).
- Guides: keep logic in `src/utils/workflowEditor/`, components thin (`.ai-run/guides/development/workflow-editor-patterns.md`).

---

## 3. Documentation Findings

### Guides and Architecture Docs
- `.ai-run/guides/development/workflow-editor-patterns.md` — editor architecture (note: its directory layout/store names are partly generic and differ from actual `configPanels/` structure).
- `.ai-run/guides/patterns/form-patterns.md`, `modal-patterns.md`, `components/component-patterns.md`, `development/api-integration.md`, `development/error-handling-patterns.md`, `testing/testing-patterns.md` (tests only when explicitly requested per AGENTS.md).
- `docs/codemie/backend-contracts/` holds a single contract doc (`delete-scheduler-run.md`) — precedent location for recording a backend contract.

### Architectural Decisions
- AGENTS.md: Never add a dependency without asking; no summary/report docs; tests/git only when explicitly asked; ticket key required in branch/commit (current branch `EPMCDME-15753_script-step-tool-access`).
- Comment in `notifyAboutConsumerSlots`: warnings are advisory, saving not blocked.

### Derived Conventions
- Backend snake_case converted to camelCase only for issue objects (`transformErrorKeys`); other API payloads stay snake_case in types (e.g. `integration_alias`, `tool_args`).

---

## 4. Testing Landscape

### Existing Coverage
- `src/utils/__tests__/workflows.test.ts` (covers workflow utils incl. consumer slot code).
- `src/pages/workflows/components/__tests__/PublishWorkflowToMarketplaceModal.test.tsx`.
- `src/utils/workflowEditor/helpers/__tests__/backendErrorHandler.test.ts`.
- `src/pages/workflows/editor/utils/__tests__/visualEditorFieldRegistry.test.ts`.
- `src/pages/workflows/components/__tests__/WorkflowFormFields.test.tsx` (references consumer slot/integration_alias).
- `src/pages/assistants/components/AssistantForm/components/Toolkits/__tests__/` and `InlineCredentialsContent/__tests__`.
- configPanels tests: AdvancedConfigTab, CommonStateFields, GeneralConfigTab, SubWorkflowTab, YamlPanel; components tests: AssistantSelector, MappingRow, VirtualAssistantForm.schema, YamlExpandedModal.

### Testing Framework and Patterns
- Vitest + React Testing Library, projects `unit` and `integration` (vite.config.ts). Run `npm ci` first (AGENTS.md).

### Coverage Gaps
- No tests found for `ToolTab` or `ToolForm` or `ToolSelector`.
- No tests of `EditWorkflowPage`/`NewWorkflowPage` warning notification paths found by filename (only `utils/__tests__/workflows.test.ts`).

---

## 5. Configuration and Environment

### Environment Variables
- None relevant found for this area (runtime config via `window._env_` / `VITE_*`, not touched by this feature).

### Configuration Files
- `vite.config.ts` (test projects), `mock-server/db.json` + `routes.json` (no entries for workflow script access).

### Feature Flags and Deployment Concerns
- `isVisualEditorEnabled(configs)` (`src/utils/workflows.ts`) gates the visual editor and the JSON error format (`ERROR_FORMAT_JSON`) used for structured validation errors; without it the plain error handler (`API.handleError`) is used. `useMcpEnabled` flag controls MCP selection in `ToolSelector`.
- No deployment changes found.

---

## 6. Risk Indicators

- No existing multi-select / per-tool alias-list control: the assistant `IntegrationSelector` is single-value over `Setting[]`. Building a list editor (tool rows, each with multi-alias selection, duplicate prevention) is new UI.
- Speculative: `ToolTab.saveData` whitelist will drop `script_tool_access` unless the field is carried through; `ToolConfiguration` type and `registerFields` also lack it; issues with path `script_tool_access` would otherwise be treated as not visual-editable.
- Tool picker cannot be pre-filtered by script-callability (no REST flag; backend suggests a follow-up). Using `availableToolkits` offers non-callable tools; the save error is the only guard. Needs decision with backend.
- Backend says to hide alias picking for tools needing no credentials and filter by credential type; whether `AssistantToolkit`/catalog data exposes this needs verification at spec time (catalog types in `src/types/entity/assistant.ts` not fully inspected).
- Detection of `execute_workspace_script` currently absent from the codebase; the step is a tool step with `tool: execute_workspace_script`. ToolForm derives the tool name from `toolkits[0].tools[0].name`; whether the script tool appears in `v1/assistants/tools` was not verified (backend running locally could confirm).
- Warnings: `notifyAboutConsumerSlots` is not kind-aware; mixed arrays would render garbage. Validate response is discarded in `useWorkflowHistoryRestore`; publish modal has no warnings UI; the `/validate` for publish is the only source (publish call returns none). Toast-only display is easy to miss for a "runs under your integration for everyone" warning.
- Aliases validated against workflow creator, not the saving user (non-creator editors may see confusing "does not exist for the workflow creator"); alias stored by name.
- Duplicate-name error arrives as pydantic request validation, not in the resource-validation list; error shape/handling path not inspected (processBackendError falls to `generalError` for other types).
- Existing workflows lose all script tool access silently; hint for empty list required by acceptance ("no tools").
- No tests for ToolTab/ToolForm raises regression risk when modifying the save whitelist.

---

## 7. Summary for Complexity Assessment

The change spans types, one new editor component inside the workflow tool-step panel (`ToolTab`/`ToolForm`), the field-path registry, issue handling (largely generic already via `processBackendError`), and warning display on three flows: save (create/update), validate, and the publish preview modal. File surface is roughly 8-12 source files in `src/pages/workflows`, `src/utils`, `src/types`, and `src/store`, with no backend work and no new dependencies expected.

Novelty is moderate: the editor needs a list of tool rows each with a multi-alias selection, which does not exist (the assistant alias control is single-select via `IntegrationSelector`/`IntegrationSelectDropdown` and `settingsStore`). The tool catalog (`v1/assistants/tools` via `assistantsStore.availableToolkits`) has no script-callable flag, so a clean picker depends on an unresolved backend decision. Warning handling must become `kind`-aware, replacing the toast-only, shape-specific `notifyAboutConsumerSlots`, and the publish modal and validate callers need new wiring.

Test posture: the touched utils and the publish modal have tests; `ToolTab`, `ToolForm`, and the save pages do not. Key risks are the ToolTab save whitelist silently dropping the new field, the missing callable/credential metadata for filtering, creator-vs-editor alias validation semantics, and the duplicate-name error arriving through a different (request validation) path.

---

## 8. External References

Resolved: `/Users/yanaasadchaya/Projects/epam/codemie/codemie/local/EPMCDME-15752-ui-implementation-notes.md` (read in full). Not re-read: `docs/superpowers/tasks/2026-10-08-epmcdme-15752/spec.md` and `live-verification.md` in the backend repo (referenced by the notes as fixtures source; not opened).

Key facts (quoted/closely paraphrased):
- Config: on `tools[]` entry with `tool: execute_workspace_script`, new `script_tool_access: [{name: string, integration_aliases: string[]}]`; null/absent/[] = "no tools"; `integration_aliases` defaults `[]`; only `name` + `integration_aliases` keys (no extra keys). Duplicate names rejected (pydantic `Duplicate tool names in script_tool_access: ...`), UI should prevent duplicates. Field refused on any other tool ("script_tool_access is only allowed on 'execute_workspace_script' steps"); do not render editor for other tools.
- Help-text semantics: not listed -> cannot call (`tool_unavailable`); `[]` -> runs under running user's automatic lookup in workflow project, script may not pass alias; one alias -> runs under it; several -> script must pick one; global workflow + alias -> creator's integration for everyone; non-global + alias -> running user's integration of that alias in workflow project.
- Data: tools must be script-callable (no REST flag; options (a) full catalog + rely on save error, (b) backend adds `script_callable` to catalog, recommended). Never callable: script tool itself, MCP tools, `request_user_input`, supervisor handoff tools. Aliases from author's own integrations, reuse assistant editor's `integration_alias` control; alias validated against workflow creator (`created_by`). Tools taking no credentials reject any alias; alias must fit credential type; stored by name (hint worth showing).
- Warnings: `warnings: list[dict]` on `WorkflowSaveResponse` (create/update), `ValidateWorkflowResponse`, and NEW on `WorkflowPublishValidationResponse` (default `[]`). Publish call itself returns none; read from publish validation preview. Existing consumer-slot warnings now also carry `kind: "consumer_slot"`. New: `{kind: "script_step_owner_integration", step_id, tool_name, integration_aliases[], message}`; one per (script step, tool with aliases); only when workflow is/is being made global; advisory. Show `message` as-is, highlight step_id/tool_name, ideally confirm before publish. Unknown kinds rendered via `message`; do not rely on other keys.
- Errors: `WorkflowValidationErrorDetail` `{id, message: "Invalid script tool access", details: "Step '<id>': ...", state_id, path: "script_tool_access", config_line}`. Details texts: `Tool '<name>' does not exist`; `Tool '<name>' cannot be called from a script`; `Tool '<name>' takes no credentials, so integration alias '<alias>' is not allowed`; `Integration alias '<alias>' for tool '<name>' does not exist for the workflow creator`; `Integration alias '<alias>' does not fit the credential type '<type>' of tool '<name>'`; `script_tool_access is only allowed on 'execute_workspace_script' steps`. Match rows via parsing `details` or `state_id`+`path`.
- Assistants (chat and workflow assistant steps) refuse any alias; keep alias UI off assistant tools.
- Pre-change workflows have no map -> script steps call nothing; suggest hint "this script can call no tools". Demo workflows should include `[{ name: <tool>, integration_aliases: [] }]`.
- Acceptance: "the author picks tools and, per tool, aliases from their own integrations; an empty selection is shown as 'no tools'."
