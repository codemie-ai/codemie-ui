# EPMCDME-16505 Contract Editor Controls and Issues Panel Implementation Plan

> **For agentic workers:** Steps use checkbox (`- [ ]`) syntax. Execution mode is chosen by the calling flow.

**Goal:** Contract controls, a severity-grouped issues panel with coverage, Check, and saved-with-warnings outcomes in the visual workflow editor (spec.md, AC1-AC31).
**Architecture:** One `contractProtocol` module parses the 16504 contract. One `issueSeverity` table drives every severity display. One valtio `contractOutcomeStore` owns save/Check/restore outcomes across pages. `WorkflowForm` gets an outcome-returning save with `resetBaseline`.
**Tech Stack:** React 18, TS, Valtio, react-hook-form + yup, Vitest + RTL (`unit` / `integration` projects).

## Global Constraints
- No new dependencies. Logic lives in `src/utils/workflowEditor/`; components stay thin.
- Literals: `error_type` `contract_validation`; warning `kind` `contract_validation`; `outcome` `ERROR|WARNING|UNVERIFIED` (unknown means ERROR); modes `warn`, `strict` (no `off`).
- Visual-editor saves, Check and restore validate pass `error_format=json`. YAML-only mode keeps today's request and `API.handleError`.
- Copy: "Workflow saved with N warnings", `Done · ✓ Saved (disabled) · Run anyway`, `node strict`, "not saved yet", "created", "No issues found", "… and N more", "N more warnings not shown", "Contracts not analysed", "Use workflow default", "Default (warn)".
- Run a single test with `npx vitest run --project <unit|integration> <path>`. Prettier and eslint run from a hook, so do not run them yourself.
- Commit after each task, using the repository's convention (`EPMCDME-16505: Capital sentence`).
- Fixtures: the two samples in `grounding.md` (200 save with warnings, 400 rejection).

---

### Task 1: Contract protocol module and issue types
**Files:** Create `src/utils/workflowEditor/helpers/contractProtocol.ts` and its `__tests__/contractProtocol.test.ts`. Modify `src/types/entity/workflow.ts:185-211` and `helpers/backendErrorHandler.ts:37-42` (import `CONTRACT_ERROR_TYPE` into `errorTypes`; map `outcome`/`config_section`/`config_path` through `transformErrorKeys`).
**Produces:**
```ts
export const CONTRACT_ERROR_TYPE = 'contract_validation'
export const CONTRACT_WARNING_KIND = 'contract_validation'
export const VALIDATION_MODES = ['warn', 'strict'] as const
export type IssueOutcome = 'ERROR' | 'WARNING' | 'UNVERIFIED'
export interface ContractCoverage { validated_states: number; total_states: number; uncovered_state_ids: string[]; analysed: boolean; cap_reached: boolean }
export interface ParsedContractOutcome { issues: WorkflowIssue[]; coverage?: ContractCoverage; truncated?: number; otherWarnings: unknown[] }
export function isContractWarning(w: unknown): boolean
export function parseContractOutcome(body: unknown): ParsedContractOutcome // 2xx body or error.details
export function isContractYamlOnly(path: string, nodeType: NodeTypes): boolean // task on non-ASSISTANT; output_schema on TRANSFORM
```
`WorkflowBaseIssue` gains `outcome: IssueOutcome; configSection?; configPath?; meta?: { label?: string; strict_source?: 'workflow' | 'state' }`. Existing non-contract issues default to `outcome: 'ERROR'`.
Test-first: yes. Failing tests: parsing the two fixtures gives the expected issues, coverage, outcome, and `otherWarnings` containing `consumer_slot`; an unknown outcome becomes ERROR; extra coverage keys are dropped and `total_states: 0` is safe; absent coverage, `strict_source` and `warnings_truncated` parse without error; `input_schema.properties.x` collapses to the path `input_schema`; ids are unique; the `backendErrorHandler.test.ts` whitelist case for `contract_validation` passes.

### Task 2: Severity table
**Files:** Create `src/utils/workflowEditor/helpers/issueSeverity.ts` and its test.
**Produces:** `ISSUE_SEVERITY: Record<IssueOutcome, { rank; groupLabel; badgeStatus; borderClass; buttonColor: 'red'|'amber'|'grey'; outline: 'error'|'warning'|null; defaultCollapsed }>` and `worstSeverity(issues, isResolved): IssueOutcome | null`. Amber uses the existing `warning`/`aborted` tokens (`editor/nodes/common.ts:52`, `StatusBadge.tsx:25,64`).
Test-first: yes. Failing tests: rank ERROR > WARNING > UNVERIFIED; `worstSeverity` skips resolved issues and returns null when everything is resolved; UNVERIFIED has no outline and starts collapsed.

### Task 3: Input/Textarea `warning` prop
**Files:** `src/components/form/Input/Input.tsx:52,144`, `Textarea/Textarea.tsx:51,128`, plus their `__tests__`.
Add an optional `warning?: string` prop. It renders the amber border and amber text, and `error` wins when both are set. Existing callers are unchanged. `ExpandableTextarea` passes the prop through.
Test-first: yes. Failing test: a `warning` renders amber text and border classes; with `error` set as well, only red renders.

### Task 4: Validate store method and outcome store
**Files:** `src/store/workflows.ts:359-375` (replace `validateWorkflow` and update `store/__tests__/workflows.validateWorkflow.test.ts`). Create `src/store/contractOutcome.ts` with its test.
**Produces:** `validateWorkflowConfig({ id?, body, signal? })`. With an id it POSTs `v1/workflows/${id}/validate`; without one it POSTs `v1/workflows/validate` with `project` and no history. It always sends `error_format=json` and `skipErrorHandling`.
```ts
type OutcomeContext = 'saved' | 'created' | 'not-saved' | 'rejected'
interface ContractOutcome { key: string; issues: WorkflowIssue[]; coverage?: ContractCoverage; truncated?: number; context: OutcomeContext }
contractOutcomeStore: { outcome: ContractOutcome | null }
applyOutcome(parsed: ParsedContractOutcome, context: OutcomeContext, key: string): void
clearOutcome(key: string): void // clears only if the key matches
nextRequestToken(): number; isTokenCurrent(t: number): boolean // Check and restore only
```
Update the restore caller at `useWorkflowHistoryRestore.ts:83` to the new method.
Test-first: yes. Failing tests: the URL and body for each branch (history is stripped on the id-less one); `clearOutcome('other')` keeps the slot; a superseded token is not current.

### Task 5: Form save contract and baseline (gate SR-005b)
**Files:** `src/hooks/useUnsavedChangesWarning.tsx:122-190`, `src/pages/workflows/components/WorkflowForm.tsx:45,62-72,172-176,211,219-277`, and their tests.
- Add an additive `resetBaseline(values)` to `useUnsavedChanges`.
- `onSubmit` returns `Promise<'navigated'|'stayed'|'error'>`. On `'stayed'`, `save` rebaselines to the sent payload and calls `blockTransition`, including after Save and Run.
- Expose `onDirtyChange(dirty)` and `isSaving`. The ref gains `getSubmitValues()` (after `saveCurrentTab()`; returns null on an invalid panel) for Check.
- `yaml_config_history` comes from the latest workflow prop.
- **Gate SR-005b:** write a test that mounts the form, opens `WorkflowStartExecutionPopup` (`:58-60`, shared `FormIDs.WORKFLOW_FORM`), and asserts that a dirty form still prompts after the popup closes. If it fails, give the popup its own form id.
Test-first: yes. Failing tests: after `'stayed'` with the sent payload, `checkDirty` is false, and an edit made during the request still counts as dirty; Save and Run returning `'stayed'` re-blocks; the popup gate passes.

### Task 6: ContractFields on the five action tabs
**Files:** Create `configPanels/components/ContractFields.tsx`. Modify `configPanels/CommonStateFields.tsx:124,153,321-335`, `configPanels/utils/formUtils.ts:27`, `ToolTab.tsx:271`, `CustomTab.tsx:203`, `SubWorkflowTab.tsx:167`, `TransformTab.tsx`, `AssistantTab.tsx`, and `types/workflowEditor/configuration.ts:194` (`input_schema?`, `validation?`) plus the serialization types.
- `ContractFields` renders input contract, output contract and mode, through `FieldController`.
- `showOutputSchema={false}` is dropped on tool, custom and sub-workflow. Transform renders input and mode only.
- Mode options come from `VALIDATION_MODES`, with "Use workflow default" first. An unset mode omits the key.
- Add the three keys to `getDefaultValues`, the yup schema and `buildCommonStateConfig`.
Test-first: yes. Failing tests: each of the five tabs saves and reloads `input_schema`, `output_schema` (not on transform) and `validation`; an unset mode leaves no `validation` key; conditional, switch and iterator tabs render no `ContractFields` (AC4).

### Task 7: Workflow-level defaults (gate SR-005a)
**Files:** `configPanels/AdvancedConfigTab.tsx:148-207`, `editor/utils/visualEditorFieldRegistry.ts:133-148` (`ADVANCED_CONFIG_FIELDS`), `types/workflowEditor/configuration.ts:282-303`, the new page's `compareWorkflowData` keys, and `utils/workflowEditor/helpers/issues`.
- Add a `validation` dropdown ("Default (warn)" unset, plus the modes) and a `require_input_contracts` switch, written through `updateAdvancedConfig`.
- **Gate SR-005a:** test that `shouldResolveIssue` resolves an issue at the path `validation` or `require_input_contracts` with no `stateId` when that key changes. If it does not, extend it to the advanced-config keys.
Test-first: yes. Failing tests: both keys write and persist (`AdvancedConfigTab.test.tsx`); changing only them counts as a change on the new page; the resolve gate passes.

### Task 8: Contract path registration and YAML fallback
**Files:**
- Modify `CommonStateFields.tsx:106-117` (or `ContractFields.tsx`): register `input_schema` and `validation` for all five types, and add SUB_WORKFLOW to `output_schema`. No error-type restriction on any of them.
- Modify `editor/hooks/useWorkflowFieldIssues.ts:163-209`: `goToField` and `getIssueField` consult `isContractYamlOnly` for contract issues only.
- Test: `editor/utils/__tests__/contractRegistration.test.ts`.
Test-first: yes. Failing test: after importing the editor entry, every Group A path passes `isFieldSupported(path, type, 'contract_validation')`. Every Group B case is unsupported or matches `isContractYamlOnly`, and `goToField` opens YAML at `config_line`. Existing non-contract `task` and `output_schema` navigation is unchanged.

### Task 9: Severity-aware field highlight
**Files:** `useWorkflowFieldIssues.ts:197-209`, `configPanels/components/FieldController.tsx:34-37,135-145`, `ContractFields.tsx`.
`getIssueField` returns the highest-rank unresolved issue (`ISSUE_SEVERITY`). `fieldState` gains `warning` next to `error`, and `FieldController` passes it to the Input/Textarea it wraps. Select controls (mode) ignore `warning`.
Test-first: yes. Failing tests: with an error and a warning on the same path, the error is returned; a WARNING issue gives `fieldState.warning` and no `error`.

### Task 10: Issues panel groups, coverage and context
**Files:** Create `editor/IssueGroups.tsx` (presentational: `{ groups, coverage, truncated, contextNote, strictLine, onGo, isResolved }`) with a test. Modify `editor/IssuesPanel.tsx:22-62` into a container that reads `contractOutcomeStore` (only when the key matches the page) plus page issues, wrapped in an error boundary.
- Groups are Errors, Warnings and Unverified (collapsed), with border and badge from `ISSUE_SEVERITY` and `meta.label` on the card.
- Coverage shows "N of M states validated" plus the uncovered ids, "Contracts not analysed", and a cap note. It is hidden when absent. Show "N more warnings not shown" when truncated.
- The context banner reads saved, created or not saved yet.
- A `strict_source: 'workflow'` issue adds one mode line; `'state'` adds the `node strict` tag.
Test-first: yes. Failing tests: fixture issues land in the right groups with UNVERIFIED collapsed; coverage variants render; strict line and tag appear and are absent when the field is missing; a malformed coverage does not crash.

### Task 11: Issues button, node outlines, re-render fix
**Files:** `editor/EditorActions.tsx:76-86`, `editor/WorkflowEditor.tsx:444-446,549-562`, `editor/nodes/BaseNode.tsx:72`, `IteratorNode.tsx:40`.
- The button shows the unresolved count, coloured by `worstSeverity` (red, amber or grey class map).
- `nodeHasError` becomes a per-node outline map built once per issue list. Contract issues outline their `stateId` without the `isFieldSupported` filter; UNVERIFIED gets no outline. Nodes take `data.outline: 'error'|'warning'|null`.
- `tempIssues` refreshes on issue content, not only length.
Test-first: yes. Failing tests (`EditorActions.test.tsx`, `WorkflowEditor.test.tsx`): the colour and count cases; a Group B contract warning outlines its node amber; an UNVERIFIED one does not.

### Task 12: Check button
**Files:** Create `editor/hooks/useContractCheck.ts` with a test. Modify `EditorActions.tsx` (Check next to Issues) and the edit and new pages (wire `onCheck` through `WorkflowContext`).
- Body comes from `getSubmitValues()`; stop when it is null. The edit page validates with its id; the new page sends `project` without an id.
- While in flight, Check and Save are disabled. An `AbortController` aborts after 30 s, on a new Check, and on unmount.
- Drop the response when its token is stale or the config differs.
- Non-contract warnings go to `notifyAboutWarnings` and are not findings (SR-004).
- Results:
  - findings: `applyOutcome(..., 'not-saved', key)` and open the panel;
  - none, with coverage: a toast with "`validated_states` of `total_states` states validated", and close the panel;
  - none, without coverage: "No issues found";
  - UNVERIFIED-only: a toast and open the panel with that group expanded.
- Failures:
  - a timeout shows an error toast;
  - a network error or 5xx shows `API.handleError`;
  - a whitelisted non-contract 400 goes to the panel through `processBackendError` with "not saved yet";
  - other 400s, 403, 404 and 410 show a toast with the backend message;
  - a self-abort is silent.
Test-first: yes. Failing tests cover each branch above, plus a stale-token drop and the flush stop.

### Task 13: Edit page save outcomes and header toggle
**Files:** `pages/workflows/EditWorkflowPage.tsx:56,71-82,116-149,199,224`, `EditWorkflowHeaderActions.tsx:56-67`, `pages/workflows/__tests__/EditWorkflowPage.integration.test.tsx`.
- Parse the body once.
- Clean or UNVERIFIED-only: today's toast, then navigate, or open the popup on Save and Run.
- WARNING:
  - `applyOutcome(...,'saved',id)`, and keep the issues;
  - a single "Workflow saved with N warnings" toast, N = WARNING count;
  - return `'stayed'`, refresh history with `getWorkflow` (not `fetchWorkflow`), and open the panel;
  - no popup on Save and Run.
- The header shows `Done · ✓ Saved (disabled) · Run anyway` while the form is clean (`onDirtyChange`). Done calls `goBackFromWorkflowEdit` with no dialog. Run anyway opens the popup without saving.
- Rejection: the panel opens with all groups and no banner, and no run starts.
- On mount, consume an outcome with the matching key (including `created`, SR-001: saved state plus a single toast). Otherwise clear it. On unmount or id change, clear only your own key.
- A save response that arrives after unmount or an id change does not navigate or write the store (SR-002).
Test-first: yes. Failing tests: each branch, the toggle back to `Cancel · Save · Save and Run` on edit, Done without the dialog, consuming the created hand-off, and the late response after unmount.

### Task 14: New page save outcomes and Check
**Files:** `pages/workflows/NewWorkflowPage.tsx:62,76,268-331`, `__tests__/NewWorkflowPage.test.tsx`.
- WARNING: `unblockTransition()`, then `applyOutcome(...,'created',createdId)`, then `router.replace({ name: EDIT_WORKFLOW, params: { id } })`.
- After any successful create, Save and Save and Run stay disabled until unmount.
- Clean Save and Run: when the popup closes or the run starts, call unblock, then replace to edit, then block (the `WorkflowStartExecutionPopup.tsx:100-106` precedent).
- Add the "Validation returned no issue details" fallback. Clear the `'new'` key on unmount.
- SR-002: a create that resolves after unmount is accepted server-side but does not navigate or write the store, and the test asserts this.
Test-first: yes. Failing tests: the replace order with the key hand-off; the post-create lock blocks a second create; the clean Save and Run replace on popup close; the late create after unmount.

### Task 15: Restore routes contract warnings to the panel
**Files:** `pages/workflows/hooks/useWorkflowHistoryRestore.ts:55-115` (adjust the path if it differs) and `EditWorkflowPage.versionHistory.test.tsx`.
- Replace the private generation guard (`:58-66`) with the store token.
- On 2xx with contract warnings, `applyOutcome(...,'not-saved',id)` and keep the panel open.
- Other warning kinds still toast through `notifyAboutWarnings`.
Test-first: yes. Failing test: a restore validate with the warning fixture fills the panel with "not saved yet" and does not close it, and `consumer_slot` still toasts.

### Task 16: YAML-only summary toast
**Files:** `src/utils/workflowWarnings.ts` (new `notifyContractSummary(warnings, truncated)`), and the visual-editor-off branches of both pages (`EditWorkflowPage.tsx:139-141`, `NewWorkflowPage.tsx:291-293`).
A 2xx with contract warnings navigates back and shows one toast listing up to `MAX_LISTED_TOOLS` (3) messages, then "… and N more" (N includes `warnings_truncated`). The request and rejection handling are unchanged.
Test-first: yes. Failing tests (`workflowWarnings.test.ts` and page tests): 5 warnings plus `truncated: 2` lists 3 and then "… and 4 more"; a YAML-only rejection still goes through `API.handleError`.

### Task 17: Warning toast partition and integration kinds
**Files:** `src/utils/workflowWarnings.ts:24,52-61,64,82-124`, `utils/__tests__/workflowWarnings.test.ts`.
- `notifyAboutWarnings` partitions out contract entries with `isContractWarning` before the per-kind and `unknown` filters.
- `normalizeWarnings` passes contract entries through untouched.
- The integration toast matches `script_step_owner_integration` and `tool_access_owner_integration`.
- The `consumer_slot` toast and the publish modal's `formatWarning` are unchanged.
Test-first: yes. Failing tests: a mixed `warnings[]` produces no toast for `contract_validation` entries; both integration kinds toast; `consumer_slot` output is unchanged.

---

## Spec coverage notes
- AC1-5: Tasks 6-7. AC6-7, 9, 18-19, 28: Tasks 8, 10. AC8, 20: Tasks 1, 17. AC10-11: Tasks 1, 8. AC12, 24-26: Tasks 4, 12. AC13-17, 21-22: Tasks 5, 13. AC23: Task 14. AC27: Task 11. AC29: Tasks 3, 9. AC30: Task 15. AC31: Task 16.
- Plan notes:
  - The `IssueGroups` split is in Task 10.
  - Options derived from the mode constant are in Task 6.
  - The `shouldResolveIssue` check is the Task 7 gate.
  - New-page change detection is in Task 7.
  - The Button amber/grey class map is in Task 11.
  - The per-node lookup and unique ids are in Tasks 11 and 1.
  - The import-order registration test is in Task 8.
  - The 300-state profiling is a measurement, not a task. It is left to verification.

## Negative constraints
- Non-goals honoured:
  - no backend work, docs or runtime view;
  - no change to the `consumer_slot` toast or `formatWarning` (Task 17 keeps them);
  - no contract or mode controls on conditional, switch or iterator (Task 6 asserts this);
  - no second output control on transform (Task 6);
  - no visual controls for Group B (Task 8);
  - YAML-only rejection is unchanged (Task 16);
  - the old `utils/workflowEditor/backendErrorHandler.ts` and the stale guide are untouched;
  - existing Input/Textarea callers are unchanged (Task 3);
  - the outcome is not persisted (Task 4 uses an in-memory valtio store).
- `output_schema` is not narrowed to `contract_validation` (Task 8). Transform's state-level `output_schema` never opens `config.output_schema` (`isContractYamlOnly`).
- Save responses are never dropped by the token or the config-differs check (Tasks 12-15 apply them to Check and restore only).
- A contract warning is never toasted except the save count and the YAML summary (Tasks 13, 16, 17).
- No Check failure is silent except a self-abort (Task 12).
- No new dependency is used anywhere.
