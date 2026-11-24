# Spec: Save-time Contract Editor Controls and Issues Panel (EPMCDME-16505)

## Goal

In the visual workflow editor, authors can declare input and output contracts and a validation mode per node, and set workflow-level defaults. They see contract findings grouped by outcome (ERROR / WARNING / UNVERIFIED) with a coverage summary, and can dry-run (Check) on the edit page and the new-workflow page. A save that succeeds with warnings keeps them on the page instead of toasting and leaving. Requirements are AC1-AC31 of `ticket.md`. The backend facts come from `grounding.md` (verified against `codemie` branch `epmcdme-16504`) and the UI facts from `technical-analysis.md` and `grounding.md`.

## Backend contract (EPMCDME-16504, verified)

- **Flag.** The backend sends contract data only when `WORKFLOW_CONTRACT_LINKING_ENABLED` is on (it is off by default). With the flag off, the response has no contract warnings, no `coverage` and no `warnings_truncated`. The UI treats each of these as optional and hides what is missing.
- **Error type.** `error_type: "contract_validation"`, added to `errorTypes` (`helpers/backendErrorHandler.ts:37-42`).
- **Outcome.** Each entry carries `outcome: "ERROR" | "WARNING" | "UNVERIFIED"` (uppercase), and this is the severity source. Any other value is treated as ERROR (fail closed). Errors appear only in `error.details.errors[]` and have no `kind`. Warning entries carry `kind: "contract_validation"`.
- **Issue entry.** Fields: `id`, `message`, `path` (bare field name or `""`), `state_id`, `config_section` (`states` | `tools` | `custom_nodes`), `config_path`, `config_line` (1-indexed), `outcome`, `details`, `meta.label`.
  - `config_path` is dotted and relative to the item (for example `input_schema.properties.x`, `task`, `tool_args.p`, `next.iter_key`). It is absent for graph-level and `context.*` records.
  - For `tools` the owner is the state's `tool_id`, and for `custom_nodes` it is the state's `custom_node_id`. The UI resolves both from the state.
- **Coverage.** `{ validated_states, total_states, uncovered_state_ids[], analysed, cap_reached }`. The unverified count is the number of `outcome === "UNVERIFIED"` warnings.
- **Save success (2xx).** Create and update return `{ message, data, warnings[], coverage?, warnings_truncated? }`. `warnings[]` mixes `consumer_slot`, `tool_access_owner_integration` and `contract_validation` entries. It holds at most 100 contract entries, and `warnings_truncated: N` appears only when the list was cut.
- **Contract rejection.** HTTP 400 with `error.details = { error_type: "contract_validation", message, errors[], warnings[], coverage?, warnings_truncated? }`. Warnings inside a rejection are contract entries only.
- **Other 400s** (`schema_validation`, `resource_validation`, …) carry no `warnings` and no `coverage`. Their `details` keeps today's shape and can be a string; the existing `processBackendError` path handles them.
- **`error_format=json`.** Visual-editor saves, Check and restore validate always pass it, because without it `details` is a `<br>` string. YAML-only mode keeps today's request without it (see Toasts).
- **Validate endpoints (Check).**
  - New page: `POST /v1/workflows/validate?error_format=json`. The body is `project` (required) plus the create fields (`name`, `description`, `mode`, `yaml_config`, …) and no `yaml_config_history`. Autonomous mode returns 410.
  - Edit page: `POST /v1/workflows/{id}/validate?error_format=json`. It takes the full update body (the same one Save sends, including history) and needs write access.
  - Both persist nothing, return the same 2xx shape or rejection envelope, and also return the `consumer_slot` and tool-access warnings.
  - What each one checks differs:
    - `/validate` covers contract validation only, not the category, guardrail or access checks.
    - `/{id}/validate` also runs the guardrail dry-run, the marketplace validation for global workflows and the write check. It skips only the category check.
- **Restore.** The rollback endpoint returns no contract warnings. `POST /v1/workflows/{id}/validate?error_format=json` (already called by restore at `useWorkflowHistoryRestore.ts:83`) returns the full shape and supplies them.
- **Config keys.**
  - On every state: `input_schema` (a string of JSON text), `output_schema` (string) and `validation` (`warn` | `strict`).
  - At the top level: `validation` (`warn` | `strict`, default `warn`) and `require_input_contracts` (boolean).
  - There is no `off` mode.
- **Dependency on 16504 (not in the backend today).** An optional `meta.strict_source: "workflow" | "state"` on each issue. The backend does not report which strict level caused a rejection, so AC19 depends on this field.

```ts
type IssueOutcome = 'ERROR' | 'WARNING' | 'UNVERIFIED'
interface ContractCoverage { validated_states: number; total_states: number; uncovered_state_ids: string[]; analysed: boolean; cap_reached: boolean }
interface ContractOutcome { key: string /* workflow id, or 'new' */; issues: WorkflowIssue[]; coverage?: ContractCoverage; truncated?: number; context: 'saved' | 'created' | 'not-saved' | 'rejected' }
// WorkflowBaseIssue (types/entity/workflow.ts:185) gains: outcome: IssueOutcome; configSection?; configPath?; meta?: { label?: string; strict_source?: 'workflow' | 'state' }
```

**One protocol module.** `contractProtocol` holds the literals (`CONTRACT_ERROR_TYPE`, `CONTRACT_WARNING_KIND`, `VALIDATION_MODES = ['warn', 'strict']`), plus `isContractWarning`, `parseContractOutcome(body)` and `isContractYamlOnly(path, nodeType)`. `errorTypes`, `workflowWarnings.ts`, the store and every `registerFields` call import from it. The parser:
- maps an unknown outcome to ERROR;
- keeps only the typed coverage fields;
- guards `total_states` 0;
- maps `config_path` to the registry path. For `config_section: states` that is the path itself, with `input_schema.*` collapsed to `input_schema`.

The parser tests use the two recorded samples in `grounding.md` as fixtures.

## Behaviour

### Controls (AC1-5)

**Node fields.** A `ContractFields` component (input contract, output contract, mode) is composed by each action tab.
- Assistant, custom, tool and sub-workflow show all three. This drops `showOutputSchema={false}` at `ToolTab.tsx:271`, `CustomTab.tsx:203` and `SubWorkflowTab.tsx:167`.
- Transform shows input contract and mode. Its output stays `TransformForm`'s existing `config.output_schema`, and the state-level `output_schema` stays hidden as it is today (`TransformTab.tsx:200` passes `showAllFields={false}`).

**Mode dropdown.** Options are "Use workflow default" (the `validation` key is omitted, never saved as `""`), then the values of `VALIDATION_MODES`.

**Save wiring.** The three keys are added to `getDefaultValues`, the Yup schema and `buildCommonStateConfig` (an allow-list, `formUtils.ts:27`).

**Workflow defaults.** `AdvancedConfigTab` gains the workflow-level `validation` dropdown ("Default (warn)", unset by default, plus the modes) and the `require_input_contracts` switch, written through `updateAdvancedConfig`. Both keys join `ADVANCED_CONFIG_FIELDS` and the new page's change detection.

**AC2 scope, confirmed against the code.** "Any node with a state configuration" means the five action types. Conditional, switch and iterator are `MetaNodeTypes` (`types/workflowEditor/base.ts:46-53`) and serialise into the preceding state's `next.*`. Those three get no contract or mode control.

### Registration (AC10-11)

A contract issue navigates to a visual control whenever the backend's `config_path` has a control rendered on that node type. The registry matches an entry with no error-type set for every error type, `contract_validation` included (`visualEditorFieldRegistry.ts:104-108`). So existing entries already cover it, and new entries are added without an error-type restriction.

**Group A — navigates to the control.**

| `config_path` | Node types | Registration |
|---|---|---|
| `input_schema`, `input_schema.*` (collapsed) | all five | new |
| `validation` | all five | new |
| `output_schema` | assistant, custom, tool, sub-workflow | existing (`CommonStateFields.tsx:106-117`) plus SUB_WORKFLOW added |
| `task` | assistant | existing |
| `tool_args.<p>` (states and `tools` sections) | tool | existing `/^tool_args\./` (`ToolForm.tsx:59`, `ToolArgumentsForm.tsx:27`) |
| `config.mappings.N.*` (e.g. `source_path`) | transform | existing `/^config\.mappings\./` (`TransformForm.tsx:43`) |
| `config.*` (`custom_nodes` section) | custom | existing `/^config\./` (`CustomNodeForm.tsx:41`) |
| top-level `validation`, `require_input_contracts` | Advanced tab | `ADVANCED_CONFIG_FIELDS` |

**Group B — falls back to the YAML line** through `config_line`:
- `next.condition.expression`, `next.switch.cases.N.condition` and `next.iter_key`, which belong to the preceding action state and have no control there;
- `config.input_key`;
- `task` on custom, tool, transform and sub-workflow, where the control is hidden;
- the state-level `output_schema` on transform;
- bare `tool_args`, `context.*`, an absent `config_path`, and any other unregistered path.

**Exceptions inside existing entries.** `isContractYamlOnly(path, nodeType)` lists the cases where an existing entry would open a missing or different control: `task` on non-assistant types, and `output_schema` on transform, which would otherwise bind to `TransformForm`'s different `config.output_schema` field. `goToField` and `getIssueField` consult it for contract issues only, so other error types behave as today.

**`output_schema` is not narrowed.** `mergeTypes` (`:41-51`) would turn the exact path contract-only and break the existing entries.

**Test.** The registration test imports the editor entry and asserts every Group A path with `isFieldSupported(path, type, 'contract_validation')`, and every Group B case as YAML fallback (unsupported, or `isContractYamlOnly`).

### Severity, one table (AC27-29)

An `issueSeverity` table holds rank, group label, badge status, border class, button colour, outline and default collapse, plus `worstSeverity(issues, isResolved)`. The panel, the Issues button, `nodeHasError` and the Check toast all read it.

**Issues button.** It counts every unresolved issue. It is red if any error is unresolved, amber if any warning is, otherwise grey (a variant or class map in `EditorActions`).

**Node outlines.** Red for unresolved errors, amber for unresolved warnings, none for UNVERIFIED. A contract issue outlines its `state_id` node even when no control is registered for its path (Group B), which bypasses the `isFieldSupported` filter at `WorkflowEditor.tsx:556` for contract issues. Navigation for those stays YAML. The per-node lookup is built once per issue list.

**Field highlight.** `getIssueField` returns the highest-rank unresolved issue for the path. `FieldController` exposes `fieldState.warning` next to `error`. `Input` and `Textarea` gain an optional `warning?: string` prop that renders amber, and `error` wins when both are set. The contract textareas read `warning`. The mode dropdown stays red-or-neutral.

**Re-render fix.** `WorkflowEditor.tsx:444-446` refreshes `tempIssues` when the issues change, not only when their length changes.

### Issues panel (AC6-7, 9, 18-19, 28)

- **Layout.** A container that reads the outcome store, plus a presentational `IssueGroups` reusable by Story 3, inside an error boundary.
- **Groups.** Errors, Warnings, Unverified, with Unverified collapsed. WARNING cards have an amber border and badge, UNVERIFIED cards a grey one. `meta.label` shows on the card.
- **Coverage.** "N of M states validated" plus the uncovered state ids. It shows "Contracts not analysed" when `analysed` is false and a cap note when `cap_reached` is true. It is hidden when coverage is absent. `warnings_truncated` shows "N more warnings not shown".
- **Context note.** Saved banner, "created" wording, or "not saved yet".
- **Strict (AC19, narrowed).** If any issue has `meta.strict_source: "workflow"`, one line names the workflow-level mode. A card whose issue has `"state"` gets a `node strict` tag. When the field is absent, neither shows and nothing errors. Because the field is set only on issues that strict promoted, the line appears only when strict caused the block. Tests use mocked responses.
- **Go to Issue.** `goToField` keeps its flow and falls back to the YAML line through `config_line`.

### Outcome owner (AC12-13, 23-26, 30)

A small valtio `contractOutcomeStore` outlives the pages. It holds one `outcome` slot, keyed by the workflow id or `'new'`. One `applyOutcome(body, trigger, key)` writes it. The panel shows an outcome only when its key matches the current page's key (the workflow id, or `'new'` on the new page), so issues never show on another workflow.

**Key and ordering.**
- **New page.** Check writes under `'new'`. A create with warnings writes under the **created id**, with context "created", before the replace.
- **Leaving a page.** On unmount, or when the route id changes, a page clears the slot only if the key is its own (`'new'` or its id). The created-id hand-off therefore survives the new page's unmount.
- **Edit page mount.** If the key equals its id, the page consumes the outcome and opens the panel in a post-mount effect. Otherwise it clears the slot.

**Request token, Check and restore only.** A Check or restore-validation response is dropped when its token was superseded or the config differs from the current one. This replaces the private guard at `useWorkflowHistoryRestore.ts:58-66`.

**Save responses are never dropped.** Save is locked from the click until its outcome is known. When a save response arrives after the page unmounted or the route's workflow changed, it is not shown: it does not navigate and does not write the store.

**Store method.** One method, `validateWorkflowConfig({ id?, body })`. With an id it calls `/{id}/validate` (edit page, restore); without one it calls `/validate` with `project` and no history (new page).

### Save contract (AR-2 fix, AC13-16, 21)

- `useUnsavedChanges` gains an additive `resetBaseline(values)`; its other callers are unchanged.
- `WorkflowForm.onSubmit` returns `'navigated' | 'stayed' | 'error'`. `save` rebaselines to the **sent payload** on `'stayed'`, and calls `blockTransition` on every stay-on-page path, including a warned Save and Run.
- The form exposes `onDirtyChange` for the header toggle.
- Save (and Check) are disabled from the click until the outcome is known.
- After a warned save, the page refreshes `yaml_config_history` with `getWorkflow`, not `fetchWorkflow` (that call sets the loading flag and remounts the form).
- Check during planning that the run popup's shared `FormIDs.WORKFLOW_FORM` registration (`WorkflowStartExecutionPopup.tsx:58-60`) does not mask the form's dirty check.

### Save outcomes

**Edit page.** Issues are cleared at save start only for the in-flight state and set from the response.
- **Clean or UNVERIFIED-only:** today's toast, then navigate back. Save and Run opens the popup (AC17, AC22).
- **Any WARNING outcome:**
  - The page stays open with the baseline reset and issues kept.
  - The panel opens with the saved banner and coverage.
  - The success toast is replaced by one "Workflow saved with N warnings" toast, where N is the number of WARNING entries.
  - On a clean form the header reads `Done · ✓ Saved (disabled) · Run anyway`.
  - Done navigates like Save does today, with no unsaved-changes dialog.
  - Run anyway opens the run popup without saving again.
  - Save and Run with a warning does not open the popup.
  - Editing any field restores `Cancel · Save · Save and Run`, and the edited cards turn Resolved. Check during planning that `shouldResolveIssue` resolves the workflow-level paths.
- **Rejection:** the panel opens with every group and no banner, and no run starts.

**New page (AC23).**
- On a WARNING, the page does three steps in order: `unblockTransition()`, write the outcome under the created id (context "created"), then `router.replace({ name: EDIT_WORKFLOW, params: { id } })`. This follows `WorkflowStartExecutionPopup.tsx:100-106`.
- After any successful create the new page stays locked until it unmounts. Save and Save and Run stay disabled from the create until the page leaves, and every branch leaves, so no second create is possible and no dead page is left with Save disabled:
  - Warning: the replace above.
  - Clean Save: navigates back as today.
  - Clean Save and Run: the run popup opens. Closing it, or starting the run, replaces the route with the created workflow's edit page through `unblockTransition()`, `router.replace({ name: EDIT_WORKFLOW, params: { id } })`, `blockTransition()` (the `WorkflowStartExecutionPopup.tsx:100-106` precedent), so the author can keep working.
- On mount, the edit page consumes the outcome keyed to its id and opens the panel in a post-mount effect.
- A reload shows a clean edit page, because the store is not persisted.
- If the load after create fails, the page shows the normal load error and clears the slot.
- Done and Back never return to the new page (`goBackWorkflows.ts:76-94`).
- The new page also gains the edit page's "Validation returned no issue details" fallback.

### Toasts (AC8, 20, 31)

`workflowWarnings.ts`:
- partitions out contract entries before `notifyAboutWarnings` and the `unknown` filter;
- lets `normalizeWarnings` pass them through untouched;
- matches both `script_step_owner_integration` and `tool_access_owner_integration` for the integration toast.

`consumer_slot` toasts are unchanged.

**YAML-only mode** (visual editor off) keeps today's request (no `error_format`) and today's `API.handleError` toast for every rejection. Only a 2xx save with contract warnings changes: it navigates back with one summary toast listing up to 3 warnings, then "… and N more" (counting `warnings_truncated`).

### Check (AC24-26)

- **Button.** In `EditorActions` next to Issues, on both pages. The edit page calls `/{id}/validate`, the new page `/validate`.
- **Body.** It runs `saveCurrentTab()` first and stops on an invalid panel, the same way Save does. It then builds the body with the same function as Save. The edit page sends the full update body, history included. The new page sends the create fields plus `project`, without history.
- **In flight.** A checking state disables Check and Save. An `AbortController` sets a 30 s timeout and aborts on a new Check or on unmount.
- **Results.**
  - With findings: the panel opens with every outcome and coverage. It notes "not saved yet" only when there is something unsaved: always on the new page, and on the edit page when the form holds edits. Otherwise a "saved" note from the last save stays.
  - No findings, with `coverage`: a toast reading "N of M states validated" (`coverage.validated_states` of `coverage.total_states`, never the total alone), and the panel closes.
  - No findings, without `coverage` (contracts not analysed, backend flag off): the toast reads "No issues found" and "Contracts were not analysed", with no count, and the panel closes. With `features:workflowContracts` off, Check and the input contract and validation mode controls are hidden.
  - UNVERIFIED-only findings: the toast says so and the panel opens with that group expanded.
- **Failures.** Every failure shows the author something:
  - client timeout: an error toast saying Check timed out;
  - network error or 5xx: the `API.handleError` toast;
  - a whitelisted non-contract 400 (`schema_validation`, `resource_validation`, …): its errors go to the panel with the same note rule, as `processBackendError` does on save;
  - any other 400, and 403, 404 or 410 (autonomous): the error toast with the backend message.
  - An abort caused by a new Check or by unmount is silent.

### Restore (AC30)

The restore validation (`/{id}/validate`) routes contract warnings to the panel with "not saved yet" and does not close the panel (`useWorkflowHistoryRestore.ts:90-94`). Other kinds still toast.

## Deviations forced by the backend

- AC19: the mode line appears only when strict caused the block, and it needs 16504's new `meta.strict_source`.
- AC2: modes are `warn`/`strict` only.
- AC20: `tool_access_owner_integration` is added to the toast path (the backend's real kind).
- AC12/24: on the new page, the dry-run (`/validate`) covers contract validation only, not the category, guardrail or access checks. The edit page's Check (`/{id}/validate`) skips only the category check.
- AC24: Check uses `/{id}/validate` on the edit page and `/validate` on the new page.
- AC26: Check with no `coverage` toasts "No issues found" without a node count, because contracts were not analysed.
- AC30: uses `/{id}/validate`, not the new endpoint.
- AC9/11: the Group B paths have no visual control and fall back to the YAML line. Their node is still outlined.
- Transform: its output contract stays `config.output_schema` in `TransformForm`.

## Acceptance criteria

AC1-AC31 of `ticket.md`, read with the deviations above. Each is checked by a unit or integration test that follows the existing patterns. New tests:
- the parser, against the `grounding.md` fixtures, with an unknown outcome, absent coverage and absent `strict_source`;
- the severity table and `getIssueField` rank;
- `IssueGroups`;
- the Issues button colour and count;
- node outlines for a Group B contract issue;
- the save-outcome branching on both pages, including `resetBaseline`, the new-to-edit replace with its key hand-off, the post-create lock, and a late save response after unmount;
- Check, covering flush, in-flight state, a stale-token drop, the no-coverage toast and each failure case;
- restore;
- the `Input`/`Textarea` warning prop;
- a save-and-reload of each node type's new keys;
- the registration test (Group A and Group B).

## Non-goals

- The 16504 backend contract itself, including adding `meta.strict_source`, and outcome computation (the linker).
- Documentation, and runtime findings in the execution view.
- Changing the `consumer_slot` toast or the publish modal's `formatWarning`.
- Contract or mode controls on conditional, switch or iterator nodes.
- A second output-contract control on transform.
- Visual controls for the Group B paths.
- Changing YAML-only rejection handling.
- Removing the older `utils/workflowEditor/backendErrorHandler.ts` or refreshing the stale `workflow-editor-patterns.md`.
- Changing `Input`/`Textarea` behaviour for existing callers.
- Persisting the outcome across a reload.

## Decisions

- Check button in the top-right EditorActions over the bottom-left EditorControls — where Check lives — user
- Workflow default mode and mandatory switch in the Advanced tab over the Basic tab — where AC5 settings live — user
- Tool and custom nodes show the output contract too, over keeping it hidden — output contract scope — user
- Check calls `/{id}/validate` on the edit page and `/validate` on the new page, over the id-less endpoint on both pages — Check endpoint (supersedes the earlier choice) — user
- Issues button counts every unresolved issue, red/amber/grey by worst severity, over counting errors and warnings only — button count and colour — user
- Node mode dropdown starts with "Use workflow default" (unset) over prefilling the explicit default — node mode inheritance — user
- AC19 strictness read from 16504's optional `meta.strict_source` over computing it from the YAML — strict tag and mode line source — user, answers AR-1
- Integration toast matches both `script_step_owner_integration` and `tool_access_owner_integration` over the legacy kind only — AC20 kinds — user, answers AR-1
- Request token and config-differs drop apply to Check and restore only, over dropping stale save responses too — save responses are never dropped — user, answers AR-3
- Outcome keyed by workflow id or `'new'` and cleared when its page is left, over one unkeyed slot — no issues on another workflow — user, answers AR-3
- Check with no `coverage` toasts "No issues found" without a count, over a count from config states — AC26 when contracts are not analysed — user
- Contract issues outline their node even without a registered control, over outlining only registered paths — Group B outline — user
- YAML-only mode keeps today's request and `API.handleError` toast for every rejection, over a JSON-envelope error toast — YAML-only rejection — user
- After a clean Save and Run on the new page, closing the run popup replaces the route with the created workflow's edit page, over leaving the author on a locked new page — post-create navigation — user
- "State configuration" nodes are the five action types over also counting conditional/switch/iterator — AC2 scope, confirmed against the code (AR-8)
- An optional `warning` string prop on Input/Textarea over a `severity` enum prop — AC29 interface
- Severity taken from `outcome`, with an unknown value treated as ERROR, over trusting any value — fail-closed parsing
- One valtio outcome store with `applyOutcome` and a request token over page-local state per writer — outcome owner (AR-3)
- An outcome-returning `onSubmit` plus `resetBaseline` over a page-held snapshot and polling — stay-on-page save (AR-2)
- Transform keeps `TransformForm`'s output schema as its output contract over adding the hidden state-level one — transform output control
- Check toast node count from `coverage.total_states` over a count of the config's states — AC26 count source
- "Workflow saved with N warnings" counts WARNING entries over counting WARNING and UNVERIFIED — AC13 count
- New registry entries carry no error-type restriction over restricting them to `contract_validation` — `mergeTypes` would make a shared exact path contract-only
- Contract-only exceptions go in an `isContractYamlOnly` predicate over narrowing the existing `task`/`output_schema` entries — transform state-level `output_schema` must not open `TransformForm`'s `config.output_schema`
