# Script step tool access Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans. Steps use checkbox syntax.

**Goal:** Editor for `script_tool_access` on `execute_workspace_script` steps, kind-aware workflow warnings, and row-level "Invalid script tool access" errors.

**Architecture:** Pure functions in `src/utils/workflowEditor/` (options, converter, error parser) and `src/utils/workflowWarnings.ts` (normalizer, formatter, toast); one controlled component under `configPanels/components/`; four-point field plumbing in `ToolForm`/`ToolTab`.

**Tech Stack:** React 18, TS, react-hook-form, valtio, PrimeReact, Tailwind. No new dependencies.

Commit per task using the repository's existing convention (ticket key EPMCDME-15753). No new tests except Task 2. Whole-suite gates and browser checks are owned by the pipeline, not this plan.

---

### Task 1: Types, constant, contract check

**Files:** Modify `src/types/workflowEditor/configuration.ts:~48` (add `script_tool_access?: ScriptToolAccessItem[]` to `ToolConfiguration`); Create `src/utils/workflowEditor/scriptToolAccess.ts`.

Test-first: no — types and a constant only.

- [ ] Create `scriptToolAccess.ts` exporting `SCRIPT_TOOL_NAME = 'execute_workspace_script'` and `ScriptToolAccessItem` (`{name: string; integration_aliases: string[]}`); import the type into `configuration.ts`.
- [ ] Verify against the local backend: (a) GET `v1/workflows/{id}` carries `created_by` (shape: id/name/username?); (b) whether `execute_workspace_script` is in `v1/assistants/tools` and its `settings_config` value. Record outcomes in the Task 5/6 implementation notes (final report), not in a new doc. If `created_by` is absent, Task 6 omits `isCreator` text, per spec.

### Task 2: Kind-aware warnings util

**Files:** Create `src/utils/workflowWarnings.ts`; Modify `src/utils/workflows.ts:265-281` (delete `ConsumerSlotWarning`, `notifyAboutConsumerSlots`), `src/pages/workflows/NewWorkflowPage.tsx:37,279`, `src/pages/workflows/EditWorkflowPage.tsx:39,129`, `src/pages/workflows/useWorkflowHistoryRestore.ts:~82`; Test: move the `notifyAboutConsumerSlots` describe (`src/utils/__tests__/workflows.test.ts:412-432`) to `src/utils/__tests__/workflowWarnings.test.ts`.

Test-first: yes — moved test: `notifyAboutWarnings` toasts one consumer-slot message for `[{tool_name, credential_type}]` (with and without `kind`) and is silent for empty/undefined.

- [ ] Export `WorkflowWarning` union (`consumer_slot`, `script_step_owner_integration` with `step_id, tool_name, integration_aliases, message`, unknown `{kind; message?}`).
- [ ] `normalizeWarnings(raw?: unknown[]): WorkflowWarning[]` — entries without `kind` but with `tool_name` and `credential_type` become `consumer_slot`; drop non-objects.
- [ ] `formatWarning(w): {message, highlight: {stepId?, toolName?}}` — script kind uses backend `message` as-is plus highlight; consumer slot builds `tool (credential_type)`; unknown uses `message` only.
- [ ] `notifyAboutWarnings(body?: {warnings?: unknown[]}, opts?: {prefixSaved?: boolean})` — group by kind, one `toaster.info` per kind, items joined with `; `, never `<br>`. Short form (decision b): script kind lists tool names, first 3 then "and N more" (full messages live in the publish modal); "Saved. " prefix only when `prefixSaved`. Script toast uses a longer duration (check `toaster.info` signature in `src/utils/toaster` for the duration option).
- [ ] Wire: New/Edit pages call with `{prefixSaved: true}`; `useWorkflowHistoryRestore` reads the `validateWorkflow` response JSON (`.catch(() => undefined)`) and calls without prefix.

### Task 3: Publish modal warnings

**Files:** Modify `src/types/entity/workflow.ts:~227` (add `warnings?: unknown[]` to `WorkflowPublishValidationResponse`); `src/pages/workflows/components/PublishWorkflowToMarketplaceModal.tsx`.

Test-first: no — project rule: no new tests.

- [ ] From `validationData`, `normalizeWarnings` + `formatWarning`; render an inline list above the Publish button (message, with `stepId`/`toolName` in bold via Tailwind). Publish stays enabled.

### Task 4: Pure editor functions (test-ready)

**Files:** Modify `src/utils/workflowEditor/scriptToolAccess.ts`.

Test-first: no — keep exports pure and side-effect free for later tests.

- [ ] `getScriptCallableToolOptions(toolkits: AssistantToolkit[])`: returns `{toolName, label, toolkit, settingsConfig}[]`, applying one named `EXCLUDED` list (script tool, MCP/external toolkits, `request_user_input`, supervisor handoff, code-executor/workspace/file-system/command-line/IDE/analytics toolkits); de-duplicated by name. Check toolkit identifiers in `src/types/entity/assistant.ts` and `src/utils/toolkit`.
- [ ] `toScriptToolAccess(value: unknown): ScriptToolAccessItem[]` — spreads items (keeps unknown keys), defaults `integration_aliases` to `[]`.
- [ ] `parseScriptAccessError(details: string, rowNames: string[]): {tool?: string; alias?: string}` — one `PATTERNS` list of regexes for the seven backend shapes; unmatched or unknown name returns `{}` (section level).

### Task 5: ScriptToolAccessEditor component

**Files:** Create `src/pages/workflows/editor/configPanels/components/ScriptToolAccessEditor.tsx`.

Test-first: no — project rule.

- [ ] Props: `value`, `onChange`, `toolOptions`, `settings` (from `settingsStore`), `isGlobal`, `isCreator?`, `error?: string` (issue text), `errorRow?`. Decide at implementation: simple PrimeReact `Dropdown` for tool choice (options minus already-listed names) — avoids `ToolsConfiguration`, which can't be constrained to the option function.
- [ ] Rows: tool name, remove button, alias `MultiSelect` (`src/components/form/MultiSelect/`) with options filtered via `getCredentialType` (`src/utils/settings.ts:204`); hidden when tool `settingsConfig` is false.
- [ ] Empty state "No tools: this script can call no tools", help text from the contract table, "aliases are stored by name" hint.
- [ ] Global note shown only if `isGlobal` and any row has an alias; add the non-creator sentence only when `isCreator === false`.
- [ ] Section error under the editor; row error under the row matching `errorRow`.

### Task 6: ToolForm / ToolTab plumbing

**Files:** Modify `ToolForm.tsx` (`registerFields` at :46, issue summary :359-361, form values, tool-change reset), `ToolTab.tsx` (`ToolTabProps` :38, `toolFields` :121, `finalToolConfig` :177), `ConfigPanel.tsx:~426`.

Test-first: no — project rule; verify manually (no existing tests).

- [ ] Add `script_tool_access` to `ToolFormValues` (+ yup, default `[]`), initialised from the stored config; render the editor iff `toolkits[0].tools[0].name === SCRIPT_TOOL_NAME`; clear value when the tool changes away.
- [ ] Four points: `registerFields` path `script_tool_access`; `getIssueField('script_tool_access')` in the summary; `toolFields` list; `saveData` carries the field for script steps only (empty saved as `[]`), never otherwise.
- [ ] Add `isGlobal` to `ToolTabProps` and forward to `ToolForm`; add `isCreator?: boolean` computed in `ConfigPanel` from the workflow creator (per Task 1 check) vs `userStore.user`.
- [ ] Feed the editor's error props from `getIssueField('script_tool_access')` issue details via `parseScriptAccessError`; confirm that "Invalid script tool access" from `processBackendError` appears in the issues list (`backendErrorHandler.ts`), changing it only if `path`/`state_id` are lost.

---

## Spec coverage and negative-constraint pass

Requirements 1 (Tasks 1,4,5,6), 2 (2,3), 3 (4,6) covered. YAML round-trip relies on item spread (Task 4) and existing serializer; confirm during Task 6 that the serializer passes the key through.

negative-constraints checked: no backend changes or `script_callable` (Task 4 uses a local list); no alias UI on non-script tools (Task 5 renders only for the script tool, Task 6 drops the field otherwise); no extra item keys written (editor edits only `name`/`integration_aliases`); no retained draft (Task 6 clears); no new tests beyond the moved one (Task 2 only); no `<br>` joins and Publish never disabled (Tasks 2,3); no new dependencies.
