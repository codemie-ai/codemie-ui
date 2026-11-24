# Technical Research

**Task**: workflow editor contract validation issues-panel
**Generated**: 2026-11-05
**Research path**: codegraph

---

## 1. Original Context

Verbatim ticket body: `docs/superpowers/tasks/2026-11-05-epmcdme-16505-contract-editor-issues-panel/ticket.md` (EPMCDME-16505, 31 acceptance criteria). The caller's summary, verbatim:

> Jira ticket EPMCDME-16505 "Save-time Contract Editor Controls and Issues Panel (codemie-ui)". Summary: add input-contract controls and a validation mode selector to workflow node editors, a sub-workflow output-contract control, workflow-level defaults, a severity-grouped issues panel with coverage summary (error/warning/unverified), error-type whitelist and field-path-to-visual-control registry, a Check (dry-run) button and dry-run on the new-workflow page, saved-with-warnings save outcomes, Save and Run behavior, restore-from-history and YAML-only handling, and amber warning styling for Input/Textarea. The backend contract (error type string, issue shape, coverage object, validate-before-save endpoint) comes from sibling EPMCDME-16504 and is NOT implemented here — record in the analysis what is already present in the UI repo vs assumed.

---

## 2. Codebase Findings

### Existing Implementations

**P1 — The author declares node contracts and a validation mode in the node editor**
- `CommonStateFields` (`src/pages/workflows/editor/configPanels/CommonStateFields.tsx:229`) is the shared "State Settings" form. It renders `output_schema` as an `ExpandableTextarea` labelled "Output Schema" (`:321-335`), gated by `showOutputSchema` (default `true`, `:231`). Form values are in `CommonNodeFieldValues` (`:124`), defaults in `getDefaultValues` (`:153`), and they are written back by `buildCommonStateConfig` (`configPanels/utils/formUtils.ts:27`).
  - `showOutputSchema={false}` in `ToolTab.tsx:271`, `CustomTab.tsx:203` and `SubWorkflowTab.tsx:167`. Assistant and transform panels show it. `TransformForm.tsx:42,204` also has its own `output_schema` inside the transform `config`, stored as JSON-stringified text (`:71-88`).
  - Callers of `CommonStateFieldsRef` (`:182`): TransformTab, AssistantTab, CustomTab, SubWorkflowTab, ToolTab.
- Type: `CommonStateConfiguration` (`src/types/workflowEditor/configuration.ts:194`) has `output_schema?: string`. `SubWorkflowStateConfiguration` (`:267`) extends it. `ConditionalStateConfiguration` and `SwitchStateConfiguration` (`:224,229`) do not. Serialization type: `utils/workflowEditor/serialization/types.ts:36`.
- Input contract control: **none found** (searched `input_schema`, `input_contract`, `validation_mode`, `contract` across `src`).
- Validation mode selector: **none found** (same searches).

**P2 — The author sets workflow-level defaults**
- `AdvancedConfigTab` (`configPanels/AdvancedConfigTab.tsx:207`) edits summarization, performance, retry policy and sub-workflow settings. It reads `config` first and falls back to `workflow` (`getDefaultValues`, `:148-191`), and applies changes through `editor.updateAdvancedConfig` (`utils/workflowEditor/index.ts:271`). `GeneralConfigTab` holds the basic fields. Tabs: `TAB_DATA.CONFIGURATION` ("Basic") and `TAB_DATA.ADVANCED` (`editor/constants.ts:19-20`).
- `WorkflowConfiguration` (`configuration.ts:282-303`) has no validation-default or mandatory-input-contract field. **None found.**

**P3 — The author sees validation issues and navigates to the field**
- Issue shape: `WorkflowBaseIssue` (`src/types/entity/workflow.ts:185-194`) has `id, message, details, stateId, path, configLine, error_type, status ('resolved'|'dirty')`. Subtypes add tool/MCP `meta` (`:196-211`). It has **no severity and no coverage field**.
- Error-type whitelist: `processBackendError` (`src/utils/workflowEditor/helpers/backendErrorHandler.ts:49`). `errorTypes` (`:37-42`) holds `resource_validation`, `cross_reference_validation`, `schema_validation` and `workflow_schema`. A whitelisted type turns `details.errors[]` into issues, copies `error_type` onto each one and converts snake_case to camelCase (`transformErrorKeys`, `:76`). Any other type becomes one `generalError` string, which is shown as an error toast.
- Separate older helper: `handleWorkflowErrors` (`src/utils/workflowEditor/backendErrorHandler.ts:54`). Codegraph found no external caller of its `ParsedWorkflowErrors` type.
- Field-path registry: `visualEditorFieldRegistry.ts`. It has `registerField(s)` (`:70,88`) keyed by exact path or RegExp, optionally narrowed by node type and error type, plus `isFieldSupported` (`:111`) and `ADVANCED_CONFIG_FIELDS`/`isAdvancedConfigField` (`:133-148`). Registrations are module-level side effects in each panel: `CommonStateFields.tsx:106-117` (incl. `output_schema` for ASSISTANT, CUSTOM, TOOL, TRANSFORM — **not** SUB_WORKFLOW), `AssistantTab.tsx:49-50`, `SubWorkflowTab.tsx:37` (`workflow_id`, `resource_validation` only), `TransformForm.tsx:36`, `ToolForm.tsx:49`, `CustomNodeForm.tsx:41`, `VirtualAssistantForm.tsx:72`, `ToolArgumentsForm.tsx:27`, `ConditionalTab.tsx:38-39`, `SwitchTab.tsx:42`, `IteratorTab.tsx:32`.
- Navigation: `goToField` (`editor/hooks/useWorkflowFieldIssues.ts:163-195`). An issue without `stateId` goes to the advanced tab if the path is advanced, otherwise to YAML. A tool/MCP issue goes to the node tab. A registered path goes to the node tab and selects the state. Anything else goes to the YAML tab, focused through `configLine`. Fields bind through `getIssueField` (`:197`) and `FieldController` (`configPanels/components/FieldController.tsx:43`), which turns an issue into `fieldState.error` of type `'issue'` (`:135-140`), i.e. the same red error as a form error.
- Resolved/dirty tracking: `useWorkflowIssues` (`editor/hooks/useWorkflowIssues.ts:28`) keeps `resolvedIssues` and `dirtyIssues` sets. It auto-resolves issues on config change through `shouldResolveIssue` (`utils/workflowEditor/helpers/issues`).
- Panel: `IssuesPanel` (`editor/IssuesPanel.tsx:22-62`) is a flat list. Each card has a red `Error` badge, or a `Resolved` badge once resolved. No grouping, no coverage, no collapsed group.
- Issues button: `EditorActions.tsx:76-86` shows it when `issues !== null`, always `variant="delete"` (red), with no count.
- Node outline: `nodeHasError` (`WorkflowEditor.tsx:549-562`) sets `data.hasError`. It filters with `isFieldSupported(issue.path, node.type)` and does not pass `error_type`. It is rendered red only in `BaseNode.tsx:72` and `IteratorNode.tsx:40`.
- Amber and grey already exist: `StatusBadge` has a `Warning` status (`components/StatusBadge/StatusBadge.tsx:25,64`, `bg-aborted-primary`). `!border-warning-main` is used for `AUTHENTICATION_REQUIRED` (`editor/nodes/common.ts:52`).

**P4 — The author is told about warnings on save (today: toasts)**
- `notifyAboutWarnings` (`src/utils/workflowWarnings.ts:109`) reads `body.warnings[]` from a 2xx response. It sends one toast per kind: `consumer_slot` (`:82`), `script_step_owner_integration` (`:88`, lists up to `MAX_LISTED_TOOLS = 3` and then "and N more", `:46,90-92`), and **every other kind** through `notifyUnknown` (`:100-103`), which also toasts.
- Callers: `EditWorkflowPage.tsx:130`, `NewWorkflowPage.tsx:280`, `useWorkflowHistoryRestore.ts:90`. `formatWarning` is also used by the publish modal (per the comment at `:106-107`).

**P5 — The author validates without saving (dry-run)**
- `workflowsStore.validateWorkflow(id, values, errorFormat)` (`src/store/workflows.ts:359-375`) calls `POST v1/workflows/${id}/validate` and **needs an id**. Its only caller is restore-from-history (`useWorkflowHistoryRestore.ts:83`). Test: `store/__tests__/workflows.validateWorkflow.test.ts`.
- No Check button and no id-less validate call: **none found**.

**P6 — Save outcomes, Save and Run, new-workflow redirect**
- Edit page: `submit` (`EditWorkflowPage.tsx:116-149`) runs `setIssues(null)` and `clearAllResolvedFields()`, then `updateWorkflow`, the toast "Workflow has been updated successfully!" (`:126`), `notifyAboutWarnings`, and finally either fetch-and-open-run-popup (`:132-134`) or `goBackFromWorkflowEdit` (`:136`). The header buttons are fixed: `EditWorkflowHeaderActions.tsx:56-67` (Cancel / Save / Save and Run).
- New page: `submit` (`NewWorkflowPage.tsx:268-305`) runs `createWorkflow`, the toast "Workflow has been created successfully!", then the run popup with `createdWorkflowId` (`:283`), or `router.push(WORKFLOWS_MY)` for a template, or `goBackWorkflows()`. The buttons are inline (`:321-331`). There is no route replace to the edit page.
- Unsaved-changes guard: `WorkflowForm` `useUnsavedChanges` (`components/WorkflowForm.tsx:172`). `save` unblocks (`:237`), submits, and re-blocks unless running (`:241-243`). `replaceYamlConfig` re-blocks (`:277`). A separate node-panel dialog is `ConfigPanel.tsx:159,321`.
- Restore: `handleRestoreFromHistory` (`useWorkflowHistoryRestore.ts:107`) validates. On 2xx it toasts warnings, clears issues and closes the panel (`:90-94`). On error it goes through `applyWorkflowBackendValidationError` (`EditWorkflowPage.tsx:71-82`).
- YAML-only mode: when `isVisualEditorEnabled(configs)` is false, `errorFormat` is undefined and errors go to `API.handleError` (`EditWorkflowPage.tsx:139-141`, `NewWorkflowPage.tsx:291-293`).

**Other touched code**
- `Input` (`src/components/form/Input/Input.tsx:52`, 90 callers) and `Textarea` (`src/components/form/Textarea/Textarea.tsx:51`, 42 callers incl. `ExpandableTextarea`) have only an `error` string prop. The red styling is at `Input.tsx:144` and `Textarea.tsx:128`. There is no warning prop.
- `EditorControls` (`editor/EditorControls.tsx:42`) is the bottom-left zoom/fit/download bar. `EditorActions` is the top-right toolbar. The ticket's "canvas toolbar" could mean either.

### Decisions Already in the Code
- The error types are a closed list (`backendErrorHandler.ts:37`), and an unlisted type falls back to a toast. Alternative: accept any `details.errors[]`. Reason: none found.
- Panels register themselves at import time with module-level `registerFields` calls. That is the convention for P3 (`CommonStateFields.tsx:106` and the others above). A path is "supported" only if its panel module has been imported.
- `output_schema` is registered for TOOL and CUSTOM (`CommonStateFields.tsx:117`), but those panels hide the field (`ToolTab.tsx:271`, `CustomTab.tsx:203`). The registry and the rendered controls diverge already today.
- An issue reaches a field only as an error (`FieldController.tsx:137-139`). There is no severity channel in `getIssueField` or `fieldState`.
- The backend's snake_case keys are converted on the way in (`transformErrorKeys`). This is the convention a new issue shape would pass through.
- Warnings come from the success body (`body.warnings`), and issues come from the error body (`parsedError.details.errors`). These are two stores in two directions. The ticket puts both into one panel.
- Truncation already has a convention: list up to 3, then "and N more" (`workflowWarnings.ts:46,90-92`).
- Issues are reset at the start of every save (`EditWorkflowPage.tsx:120-121`, `NewWorkflowPage.tsx:272-273`). AC13 "issues kept" runs against this.

### Task Statements Checked Against the Code
- "Node editor has an output contract control on common-panel node types": **holds partly**. Assistant and transform show it (`CommonStateFields.tsx:321`). Tool, custom and sub-workflow hide it (`ToolTab:271`, `CustomTab:203`, `SubWorkflowTab:167`).
- "No input contract control and no validation mode selector": **holds** (none found).
- "Sub-workflow panel has no output contract control": **holds** (`SubWorkflowTab.tsx:167`).
- "Issues panel shows only error or resolved badges, no severity or coverage": **holds** (`IssuesPanel.tsx:40-44`).
- "Warnings appear only as toasts": **holds** (`workflowWarnings.ts:109`).
- "Backend error handler recognises a fixed list of error types": **holds** (`backendErrorHandler.ts:37-42`).
- "Paths need per-node, per-error-type registration": **holds** (`visualEditorFieldRegistry.ts:70-131`).
- "Existing dry-run endpoint needs a saved workflow": **holds** (`store/workflows.ts:365`).
- AC20 "consumer_slot / script_step_owner_integration stay toasts": **keeps** `notifyAboutWarnings` in place (3 callers above). Any contract warning that reaches `body.warnings` with another `kind` would be toasted by `notifyUnknown` (`:118-124`).
- AC27 "Issues button shows the count" and "amber with warnings only": **contradicts current** `EditorActions.tsx:76-86`, which is always red with no count.
- AC30 "restore with contract warnings sends them to the panel": the current restore toasts warnings and closes the panel (`useWorkflowHistoryRestore.ts:90-94`).
- Error type string, issue severity field, coverage object shape, validate-before-save endpoint URL, and where contract warnings travel (success `warnings[]` vs `details.errors[]`): **unverified**. They live in EPMCDME-16504, and nothing in this repo shows them. A sample response or the 16504 API spec would settle them.
- Node strict tag and workflow-level strict line (AC19): **unverified**. No field in the issue type carries the mode.

### Consumers of Changed Contracts
- `WorkflowBaseIssue`/`WorkflowIssue` (`workflow.ts:185-211`): `IssuesPanel`, `useWorkflowIssues`, `useWorkflowFieldIssues`, `FieldController`, `WorkflowEditor` (`nodeHasError`, `tempIssues`), `shouldResolveIssue`, `processBackendError`, `EditWorkflowPage`, `NewWorkflowPage`, `useWorkflowHistoryRestore`, `WorkflowForm` props. All of them assume every issue is an error.
- `processBackendError`: `EditWorkflowPage.tsx:73`, `NewWorkflowPage.tsx:296` and its test `helpers/__tests__/backendErrorHandler.test.ts`. The test includes "case-sensitive error_type" and "missing error_type" cases.
- `notifyAboutWarnings`: the 3 callers listed under P4, plus `utils/__tests__/workflowWarnings.test.ts`.
- `isFieldSupported`: `useWorkflowFieldIssues.ts:185` and `WorkflowEditor.tsx:556` (without error type).
- `Input`/`Textarea` props: 90 and 42 callers. An added optional prop leaves them unchanged.
- `CommonNodeFieldValues`/`buildCommonStateConfig`: 5 tabs (`formUtils.ts`).
- `EditWorkflowHeaderActions` props: only `EditWorkflowPage.tsx:199`.
- `WorkflowFormRef` (`WorkflowForm.tsx:62-72`): Edit page, New page, `useWorkflowHistoryRestore`.

### Architecture and Layers Affected
- Pages: `EditWorkflowPage`, `NewWorkflowPage`, `EditWorkflowHeaderActions`, `useWorkflowHistoryRestore`.
- Editor UI: `WorkflowEditor`, `EditorActions`/`EditorControls`, `IssuesPanel`, `ConfigPanel`, the config panels (`CommonStateFields`, `SubWorkflowTab`, `AdvancedConfigTab`/`GeneralConfigTab`), nodes (`BaseNode`, `IteratorNode`).
- Editor hooks and logic: `useWorkflowIssues`, `useWorkflowFieldIssues`, `visualEditorFieldRegistry`, `utils/workflowEditor/helpers/backendErrorHandler`, `helpers/issues`.
- Store and types: `store/workflows.ts`, `types/entity/workflow.ts`, `types/workflowEditor/configuration.ts`, the serialization types.
- Shared form components: `Input`, `Textarea` (and `ExpandableTextarea`, which passes props through).
- Utils: `utils/workflowWarnings.ts`.

### Integration Points
- Backend: `PUT v1/workflows/{id}`, `POST v1/workflows` (`?error_format=json`, `skipErrorHandling`), and `POST v1/workflows/{id}/validate` (`store/workflows.ts:341-375`). The new id-less validate endpoint comes from 16504.
- `api.ts` error path: `error.parsedError` holds the structured body. `API.handleError` is used in YAML-only mode.
- Runtime flag: `isVisualEditorEnabled(appInfoStore.configs)`.

### Patterns and Conventions
- Config panels are `forwardRef` forms (react-hook-form with a yup resolver) that expose `getValues/validate/isDirty/reset`. Fields go through `FieldController` for issue binding.
- Module-level `registerFields` per panel.
- Valtio `workflowsStore` methods return a raw `Response`, and callers run `.json()`.
- Toasts go through `@/utils/toaster`.

---

## 3. Documentation Findings

### Guides and Architecture Docs
- `.ai-run/guides/development/workflow-editor-patterns.md` is **stale**: it names `NodeTypes/AiNode.tsx`, `Toolbar/` and `editorState` in the store, none of which match the code (`editor/nodes/*`, `EditorActions`, `createworkflowEditor`). Its rule still applies: logic belongs in `src/utils/workflowEditor/` and components stay thin.
- Also relevant: `testing/testing-patterns.md`, `styling/styling-guide.md`, `patterns/form-patterns.md`.

### Architectural Decisions
- Comments only. `workflowWarnings.ts:105-108`: "Advisory only: saving is never blocked. One toast per warning kind." `store/workflows.ts:367-370` explains why `skipErrorHandling` is on. `useWorkflowHistoryRestore.ts:88-89` explains why warnings show even when the YAML diverged.

### Derived Conventions
- See Patterns and Decisions above.

---

## 4. Testing Landscape

### Existing Coverage
- `utils/workflowEditor/helpers/__tests__/backendErrorHandler.test.ts` (whitelist, key transform)
- `editor/utils/__tests__/visualEditorFieldRegistry.test.ts`
- `utils/__tests__/workflowWarnings.test.ts`
- `store/__tests__/workflows.validateWorkflow.test.ts`
- `utils/workflowEditor/helpers/issues/__tests__/issueValidation.test.ts`, `pathUtils.test.ts`
- Pages: `pages/workflows/__tests__/EditWorkflowPage.integration.test.tsx`, `EditWorkflowPage.versionHistory.test.tsx`, `NewWorkflowPage.test.tsx`
- Editor: `editor/__tests__/EditorActions.test.tsx`, `WorkflowEditor.test.tsx`, `ConfigPanel.test.tsx`
- Panels: `configPanels/__tests__/CommonStateFields.test.tsx`, `SubWorkflowTab.test.tsx`, `SubWorkflowTab.save.test.tsx`, `AdvancedConfigTab.test.tsx`, `GeneralConfigTab.test.tsx`, `AssistantTab/ToolTab/CustomTab/TransformTab.test.tsx`
- Nodes: `editor/nodes/__tests__/*` (Assistant, Conditional, Custom, Switch, Tool, SubWorkflow, Iterator…)
- Form components: `components/form/Input/__tests__/Input.test.tsx`, `components/form/Textarea/__tests__/Textarea.test.tsx`, `components/StatusBadge/__tests__/StatusBadge.test.tsx`

### Testing Framework and Patterns
- Vitest with React Testing Library, in two projects (`unit`, `integration`, see `vite.config.ts`). Integration tests are `*.integration.test.tsx`.

### Coverage Gaps
- `IssuesPanel.tsx`: no test found.
- `useWorkflowIssues`, `useWorkflowFieldIssues` (`goToField`): codegraph reports no covering tests.
- `FieldController`: no covering tests.
- `EditWorkflowHeaderActions`: no dedicated test found.

---

## 5. Configuration and Environment

### Environment Variables
- None specific. The visual editor toggle is a runtime config item read through `isVisualEditorEnabled` (`utils/workflows`).

### Configuration Files
- `src/pages/workflows/editor/constants.ts` (`TAB_DATA`), `ERROR_FORMAT_JSON` (`store/workflows.ts:47`).

### Feature Flags and Deployment Concerns
- `isVisualEditorEnabled` selects between the visual and YAML-only paths (AC31). The sub-workflow panel is gated by `useSubWorkflowEnabled` (`AdvancedConfigTab.tsx:222`).

---

## 6. Risk Indicators

- The whole backend contract (error type, severity field, coverage object, endpoint, and whether warnings travel in `warnings[]` or `details.errors[]`) is unverified in this repo (Task Statements).
- `notifyUnknown` (`workflowWarnings.ts:100`) toasts any unrecognised warning kind, which conflicts with AC8 unless contract warnings are kept out of it (Task Statements, AC20).
- Every issue consumer assumes errors only: `FieldController` error mapping, `nodeHasError`, the red Issues button, and the `IssuesPanel` badges (Consumers).
- Issues are reset at the start of each save (`EditWorkflowPage.tsx:120`), and the restore success path closes the panel (`useWorkflowHistoryRestore.ts:92-94`). Both go against AC13 and AC30.
- The registry and the rendered controls already diverge (`output_schema` is registered for tool/custom but hidden there), so registry-based navigation can land on a node tab with no field (Decisions).
- `nodeHasError` calls `isFieldSupported` without an error type, unlike `goToField` (`WorkflowEditor.tsx:556` vs `useWorkflowFieldIssues.ts:185`).
- `Input` (90 callers) and `Textarea` (42 callers) are shared components. Their red styling lives in two different class sets (`Input.tsx:144`, `Textarea.tsx:128`).
- Speculative: the saved-with-warnings state (Done / Saved (disabled) / Run anyway, a baseline reset, no unsaved dialog) touches `useUnsavedChanges` in `WorkflowForm.tsx:172`, whose baseline semantics were not inspected.
- Speculative: AC23 needs a route replace from new to edit, but `NewWorkflowPage` uses only `router.push` and `goBackWorkflows` today.
- `IssuesPanel`, `useWorkflowFieldIssues` and `FieldController` have no tests.
- The guide `workflow-editor-patterns.md` is stale.

---

## 7. Summary for Complexity Assessment

The ticket touches every layer of the workflow editor. It reaches the pages (`EditWorkflowPage`, `NewWorkflowPage`, `EditWorkflowHeaderActions`, `useWorkflowHistoryRestore`), the editor shell and toolbar (`WorkflowEditor`, `EditorActions`), the issue machinery (`IssuesPanel`, `useWorkflowIssues`, `useWorkflowFieldIssues`, `FieldController`, `visualEditorFieldRegistry`, `processBackendError`), the config panels (`CommonStateFields` and five tabs, `SubWorkflowTab`, `AdvancedConfigTab`/`GeneralConfigTab`), node rendering (`BaseNode`, `IteratorNode`), types (`WorkflowBaseIssue`, `CommonStateConfiguration`, `WorkflowConfiguration`), the store (`validateWorkflow`), `workflowWarnings.ts`, and the shared `Input`/`Textarea`. That is roughly 25+ files.

Most of the plumbing already exists and has a clear convention: a closed error-type whitelist, a per-panel field registry, an issue-to-field binding, and a validate endpoint. What is new is severity as a concept. Nothing in the issue type, panel, button, node outline or field binding distinguishes a warning or unverified notice from an error. There is no coverage summary, input contract, validation mode, id-less dry-run, or saved-with-warnings page state. Warnings and issues arrive in opposite directions today: warnings in the success body, which is toasted, and issues in the error body, which goes to the panel.

Tests cover the pure helpers (whitelist, registry, warnings toasts, validate store call) and the pages at integration level. The panel, the field-issue hooks and `FieldController` have no tests. The main risks are the unverified 16504 contract, the save-reset and restore behaviour that the ACs reverse, and the shared form components.

---

## 8. External References

- `docs/superpowers/tasks/2026-11-05-epmcdme-16505-contract-editor-issues-panel/ticket.md`: resolved and read. It is the verbatim task context with 31 ACs, grouped as node editor controls (1-5), issues panel (6-9), registration (10-11), dry-run (12), save outcomes (13-20), Save and Run (21-22), new workflow page (23), Check (24-26), severity display (27-29), and restore/YAML-only (30-31). Literal strings: toast "Workflow saved with N warnings", header `Done · ✓ Saved (disabled) · Run anyway`, card tag `node strict`, "not saved yet" note, "created" wording, "… and N more" (up to three warnings). Out of scope: error type string, issue shape, coverage object, the new endpoint (EPMCDME-16504), outcome computation, docs, runtime findings.
- Jira (https://jiraeu.epam.com/browse/EPMCDME-16505) and the KB UI design page (pageId 2995591113): not resolved, because no network fetch was made. Facts are taken from `ticket.md` only.
