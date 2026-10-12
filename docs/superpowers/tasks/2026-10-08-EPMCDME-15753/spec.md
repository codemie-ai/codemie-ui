# EPMCDME-15753 — Script step tool access editor and warnings

UI for backend story EPMCDME-15752. Contract source: `/Users/yanaasadchaya/Projects/epam/codemie/codemie/local/EPMCDME-15752-ui-implementation-notes.md`. Research: `technical-analysis.md` in this directory.

## Goal

Let a workflow author decide which tools an `execute_workspace_script` step may call and, per tool, which of their own integration aliases it may use. Surface the backend's non-blocking `script_step_owner_integration` warning prominently, and "Invalid script tool access" errors where the author can act on them.

## Requirements

### 1. Script tool access editor
- **Script step detection.** The selected tool lives in form state (`toolkits[0].tools[0].name`, `ToolForm.tsx`); a new step, or one switched to the script tool, has nothing stored. The editor renders iff that name equals the shared constant `SCRIPT_TOOL_NAME = 'execute_workspace_script'` (one constant, used by editor, save and option function). A script step with no stored value starts with an empty list.
- **Switching away.** When the tool changes to anything else, the form value is cleared and `script_tool_access` is dropped from the saved tool config; it is never sent for other tools. Switching away and back therefore resets the list to empty; this is accepted (rare case) and no draft is retained.
- **Component.** A controlled `value/onChange` component under `configPanels/components/`, with one exported `ScriptToolAccessItem` type (`{name: string, integration_aliases: string[]}`) and one pure converter from form values to the stored array. Add the field to `ToolConfiguration` (`src/types/workflowEditor/configuration.ts`). Items are spread, not key-whitelisted, so unknown item keys round-trip through YAML; the editor only edits `name` and `integration_aliases`.
- **Tool options.** One function (`getScriptCallableToolOptions`, in `src/utils/workflowEditor/`) builds options from `assistantsStore.availableToolkits` and applies a named exclusion list: the script tool itself, MCP/external toolkits, `request_user_input`, supervisor handoff tools, and backend-known non-callable families (code-executor, workspace, file-system, command-line, IDE, analytics). Interim decision: the backend owns the `script_callable` flag; when it ships, only this function body changes. The function is reusable by the test-run and script-generator stories. Whether to reuse `ToolsConfiguration` for the choice or use a simple select is evaluated at plan time; it must still yield exactly the options from this function. Duplicates are hidden from the picker.
- **Aliases.** Reuse `src/components/form/MultiSelect/` (already used in several places) for the per-row alias multi-select. Options come from `settingsStore`, restricted to the tool's credential type via `getCredentialType` (`src/utils/settings.ts:204`, also imported by `Toolkits/Toolkit.tsx`). Rows whose tool has `settings_config` false show no alias picker.
- **Empty state and help.** Empty/absent list shows "No tools: this script can call no tools" and help text from the contract table, plus a hint that aliases are stored by name.
- **Global-workflow note.** On global workflows, and only when this step's list contains at least one alias (the backend warns only then; not for empty lists or alias-free entries), an inline persistent note states that listed aliases run under the creator's integration for everyone. For editors who are not the creator it adds that aliases are validated against the creator, so an alias they own may be rejected.
- **Plumbing for the note (plan item).** `ConfigPanel.tsx:426` already passes `isGlobal: Boolean(workflow?.is_global)` to `NodePanel`, but `ToolTabProps` (`ToolTab.tsx:38`) does not declare `isGlobal`; it must be added and forwarded to `ToolForm`. The `Workflow` type (`src/types/entity/workflow.ts:32`) has an index signature but no declared `created_by` (the `created_by` at :25 belongs to history items), so the plan must first verify against a real response that the loaded workflow carries the creator; the current user is available as `userStore.user` (`src/store/user.ts`). Required plumbing: (a) forward `isGlobal` into `ToolTab`/`ToolForm`; (b) pass one extra prop, `isCreator?: boolean`, computed in `ConfigPanel` from the workflow's creator vs `userStore.user`. If the creator is absent from the payload, the non-creator sentence is omitted (never shown wrongly) and the backend's creator-based error covers that case.
- **Four enumeration points** for the new field (all required, none shared): (1) `registerFields` in `ToolForm.tsx` (`script_tool_access` path, node type TOOL); (2) the local `toolFields` const inside the `useEffect` in `ToolTab.tsx` (~:121) that expands the accordion; (3) the `ToolTab.saveData` finalToolConfig whitelist (carry the field for script steps only; empty list saved as `[]`); (4) the `getIssueField(...)` summary in `ToolForm.tsx` (~:359-361) so issues on the path are shown.

### 2. Warnings
- New util file (`src/utils/workflowEditor/` or `src/utils/`) with one exported `WorkflowWarning` union (`consumer_slot`, `script_step_owner_integration`, unknown `{kind, message?}`), and three separated pieces: a **normalizer** (raw `warnings` array to union; entries without `kind` but with `tool_name`/`credential_type` are treated as `consumer_slot`), a **formatter** returning `{message, highlight: {stepId?, toolName?}}` per warning, and a **thin toast** function. Unknown kinds render `message` only; no other keys are relied on.
- **Toast rule:** warnings are grouped by `kind` into one toast per kind, items separated by commas or semicolons; never join with `<br>` (`toaster.prepareText` splits on `<br>` with a limit of 2 and drops the rest). The `script_step_owner_integration` toast keeps a longer duration than other kinds. The "Saved." prefix is used only on create/update; validate and restore paths omit it.
- Wiring: `NewWorkflowPage`, `EditWorkflowPage` (save), and `useWorkflowHistoryRestore` (validate-after-restore now shows warnings). `notifyAboutConsumerSlots` is removed in favour of the new toast function.
- **Publish preview:** add `warnings?` to `WorkflowPublishValidationResponse`. `PublishWorkflowToMarketplaceModal` lists warnings inline above the Publish button using formatter output, highlighting step id and tool name. The inline list is the confirmation (the backend's suggested confirm step); Publish is never disabled.
- Editor highlighting of the affected step/tool is satisfied by the persistent global-workflow note plus formatter highlight data in the modal; no separate canvas decoration.

### 3. Errors
- "Invalid script tool access" arrives through the existing resource-validation path (`processBackendError`) with `state_id` and `path: script_tool_access`, and must appear in the issues list and under the editor.
- One pure error-parser function with its patterns in a single list, matched against current row names, extracts the tool (and alias) from `details`. Patterns cover all seven backend shapes: `Tool '<n>' does not exist`; `Tool '<n>' cannot be called from a script`; `Tool '<n>' takes no credentials, so integration alias '<a>' is not allowed`; `Integration alias '<a>' for tool '<n>' does not exist for the workflow creator`; `Integration alias '<a>' does not fit the credential type '<t>' of tool '<n>'`; `script_tool_access is only allowed on 'execute_workspace_script' steps` (section level by nature); `Duplicate tool names in script_tool_access: <names>`. A non-match or a name not among current rows falls back to section level; that fallback is the contract, row attribution is best-effort.
- Dependency on backend wording is recorded; follow-up (not blocking): ask backend for indexed paths (`script_tool_access.<index>.name`).
- Duplicate-name pydantic error is a request validation error and takes the normal general-error path; the UI prevents duplicates so it should not occur.

## Acceptance criteria
- For an `execute_workspace_script` step the author can add/remove tools and pick zero or more of their own aliases per tool.
- Empty selection displays "no tools"; saving it persists `script_tool_access: []`.
- The same tool cannot be listed twice; excluded tool families are not offered.
- The editor is absent for other tools; switching away drops the field and it is never sent; switching away and back resets the list.
- Save, YAML edit and reopen round-trip the list, including unknown item keys.
- Warnings are grouped into one toast per kind (never `<br>`-joined); the script owner-integration toast lasts longer; it also appears inline in the publish modal. The persistent editor note shows only on global workflows when the step lists at least one alias. Consumer-slot warnings still render; unknown kinds show their message.
- A bad tool or alias on save shows "Invalid script tool access" in the issues list and on the offending row, or at section level when it cannot be attributed.
- All scenarios in the backend notes can be exercised against the local backend.

## Non-goals
- No backend changes and no `script_callable` flag; no precise callable filtering beyond the named exclusion list.
- No alias UI on assistant tools or any non-script tool.
- No call caps, read-only flags, or extra item keys written by the editor.
- No run/trace surfacing of runtime errors (`tool_unavailable`, `bad_arguments`).
- No script-generator or script test-run integration (the option function is merely reusable).
- No migration of existing workflows or templates; no new dependencies.
- No change to creator-based alias validation semantics.
- No retained draft across tool switches.
- No new tests beyond moving/updating the existing `notifyAboutConsumerSlots` test (`src/utils/__tests__/workflows.test.ts` ~:412-432) to the replacement function so no existing test is left failing.

## Risks
- Catalog may not list `execute_workspace_script`; detection is by tool name from form state.
- The exclusion list is hand-maintained and may be stale or over-exclude. Owner: the engineer implementing this story, then the owner of the workflow editor tool step. Review trigger: revisit when the backend exposes `script_callable`; until then the list is reviewed whenever the backend adds or changes script-callable tools.
- Row attribution depends on backend wording.
- Non-creator editors can see "does not exist for the workflow creator" for aliases they own (accepted backend behavior; note shown when the creator is known).
- Creator may not be present in the loaded workflow payload; then the non-creator sentence is omitted.
- `ToolTab`/`ToolForm` have no tests; the four-point field plumbing needs manual verification.
