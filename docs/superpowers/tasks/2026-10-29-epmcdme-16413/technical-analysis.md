# Technical Research

**Task**: assistant unsaved-changes dirty-state navigation-guard
**Generated**: 2026-10-29
**Research path**: filesystem

---

## 1. Original Context

Jira EPMCDME-16413, Bug

Title: Assistant creation: "Unsaved changes" dialog is shown when no changes were made.
Summary: On the Assistant creation page, the "Unsaved changes" dialog appears when the user leaves the page without having entered or changed anything. Expected: user leaves immediately with no dialog because the form has no changes. Actual: dialog shown though no changes made.
Steps: open Assistants page; click Create Assistant; change nothing; try to leave (Back/Cancel or navigate elsewhere).
Affected areas: Assistant creation page (Create Assistant form); form dirty-state / unsaved changes detection; navigation guard / "Unsaved changes" confirmation dialog.
Acceptance criteria:
1. Dialog not shown when leaving creation page without changing any field.
2. Dialog still shown when at least one field changed and user tries to leave.
3. After reverting all edited fields to initial values, dialog not shown (if current form behavior supports this).
4. Saving the assistant does not trigger the dialog.
5. No regression in unsaved-changes behavior on the Assistant edit page.

---

## 2. Codebase Findings

**Affected repository: `C:/Projects/EPAM/codemie-dev/codemie-ui`** (React 18 / TS / Vite / react-hook-form / react-router 7 / Valtio / Vitest). Confirmed: it holds all the unsaved-changes code. The `-10668` copy was not used.

### Existing Implementations
- `src/hooks/useUnsavedChangesWarning.tsx` — `UnsavedChangesProvider` (registry of per-form dirty-check fns) and `useUnsavedChanges({formId,getCurrentValues,comparator})`. The hook snapshots `initialValues` ONCE, in a `useEffect` after the first render in which `getCurrentValues() !== null` (JSON clone, `undefined` replaced by `null`). `checkDirty` = `comparator(initial,current)` or `!isEqual`. Returns `attemptFormClose`, `unblockTransition`, `blockTransition`.
- `src/components/appLevel/UnsavedChangesPopup.tsx` — mounted in `App.tsx` (line ~100). `useBlocker` blocks route changes when `checkHasUnsavedChanges() && !isNavigatingAwayRef.current` and the path, search or hash differs. It also registers a `beforeunload` handler and renders the `ConfirmationModal` "Unsaved Changes".
- `src/pages/assistants/components/AssistantForm/AssistantForm.tsx` — shared create/edit form (`isEditing` prop). `useForm` defaultValues at ~291-322. `prepareFormData` (~328) is used as `getCurrentValues`. `useUnsavedChanges` at ~369 with `comparator: compareFormData`. `handleCancel` (~466) calls `attemptFormClose(onCancel)`. Submit calls `unblockTransition()` (~424), and `blockTransition()` on failure.
- `src/pages/assistants/utils/compareFormData.ts` — assistant comparator. It normalizes icon_url, description, enable_image_generation, hide_tool_outputs, image_generation_model, file_attachment_enabled, toolkits, mcp_servers, llm_model_type (empty becomes the store default model) and enabled_builtin_subagents. If initial `project` is empty it adopts the current one. It does NOT normalize `temperature`, `top_p`, `tools_tokens_size_limit`.
- `src/pages/assistants/NewAssistantPage.tsx` — create page. Template built by `buildTemplate` (`llm_model_type: ''`, `project` possibly `''`, `slug: ''`). Back and Cancel buttons call `goBackAssistants()` (page level, route navigation, so the `useBlocker` path). `EditAssistantPage.tsx` is the edit counterpart; `NewRemoteAssistantPage`/`RemoteAssistantForm` and `ChatConfigAssistantForm` use the same hook.

### Likely root cause candidates (observed in code; not yet reproduced)
1. **undefined vs null mismatch, create only (strongest).** In `prepareFormData`, `toNumberOrNull` returns `undefined` on create (`isEditing` false) for `temperature`, `top_p` and `tools_tokens_size_limit`. The hook's snapshot clone turns those `undefined` values into `null`. `compareFormData` does not normalize them, so lodash `isEqual({t:null},{t:undefined})` is false and the form reports dirty immediately. On edit the same function returns `null`, so there is no mismatch. That matches "create page only". The existing unit test (`utils/__tests__/compareFormData.test.ts` "numeric overrides") only covers null vs null, so it misses this.
2. Late-arriving defaults after the snapshot: `LLMSelector` effect (~246-267) calls `onChange(defaultLlmModel.value)` once models load. The comparator already maps an empty `llm_model_type` to the default, but only if `appInfoStore` is loaded at compare time. Other candidates are the `project` default, `slug` and `shared` (`setValue('shared', false)` when `hasUserSettings`), and toolkit/mcp state set by effects in `ToolsConfiguration.tsx`. None of these were confirmed to differ.

### Architecture and Layers Affected
App-level provider and blocker (hooks and `components/appLevel`), page (`NewAssistantPage`), shared form (`AssistantForm`), pure util (`compareFormData`).

### Integration Points
`react-router` `useBlocker`; the react-hook-form `useForm`; `appInfoStore` (llm models) and `userStore` (project visibility); `FormIDs.ASSISTANT_FORM` in `src/constants/formIds.ts`.

### Patterns and Conventions
The comparator per form is passed to `useUnsavedChanges`. `compareFormData` normalizes null/undefined/default values on both sides symmetrically. DataSource has an analogous `pages/dataSources/utils/compareFormData.ts`.

---

## 3. Documentation Findings

### Guides and Architecture Docs
`codemie-ui/.ai-run/guides/` exists. Relevant: `patterns/form-patterns.md`, `patterns/modal-patterns.md`, `testing/testing-patterns.md` (AGENTS.md routing). I did not read them in depth. AGENTS.md says tests are written only when explicitly requested, and that prettier/eslint run automatically via hook.

### Architectural Decisions
Inline comment in `LLMSelector.tsx` (~246-251) records that its model-reset writes use `shouldDirty: false`. The comparator does not use RHF `formState.isDirty`; dirty state is snapshot vs current values.

### Derived Conventions
Normalize both sides in the comparator, not in the hook.

---

## 4. Testing Landscape

### Existing Coverage
- `src/pages/assistants/utils/__tests__/compareFormData.test.ts` — comparator unit tests (mocks `@/store/appInfo`).
- `src/pages/assistants/__tests__/NewAssistantPage.integration.test.tsx` and `EditAssistantPage.integration.test.tsx` — page integration tests. I did not check whether they cover dirty-state.
- `src/pages/dataSources/components/DataSourceForm/__tests__/DataSourceForm.clone.integration.test.tsx` — a model for a dirty/untouched `attemptFormClose` test (~lines 209-224).
- `src/__tests__/App.test.tsx` references unsaved handling.

### Testing Framework and Patterns
Vitest with React Testing Library; `unit` and `integration` projects (`npm run test:unit`, `test:integration`). `vi.hoisted` plus `vi.mock` for stores.

### Coverage Gaps
No comparator test for `undefined` vs `null` numeric overrides, and no test that a pristine create form is not dirty. `UnsavedChangesPopup` and the hook have no dedicated tests (no matching files found).

---

## 5. Configuration and Environment

### Environment Variables
None relevant.

### Configuration Files
None relevant.

### Feature Flags and Deployment Concerns
`FEATURE_FLAGS.TOOL_PERMISSIONS` affects `tool_permissions` in `prepareFormData`. On create, when the flag is on, `tool_permissions` is built from `tool_call_policy` and `allow_override` defaults (`AUTO_APPROVE`, `false`), and `defaultValues` supplies the same values, so those match. `useRequestHedgingEnabled` and the `skills` flag are other runtime toggles. No deployment concerns.

---

## 6. Risk Indicators

- The `compareFormData` change is shared by Create, Edit and Clone/Template flows, so any normalization must be symmetric to avoid hiding real edits (AC2, AC5).
- If candidate 1 is not the whole cause, residual dirtiness can come from async defaults (LLM model, project, toolkits effects). It needs a runtime check, which I did not do.
- The snapshot is taken once in an effect after first render. Anything that mutates values after that, without a user action, will read as dirty. Fixing it in the hook would affect all forms that use `useUnsavedChanges` (workflows, datasources, remote assistant, chat config).
- The `isNavigatingAwayRef` / `blockTransition` 100 ms timer is racy. AC4 (save then navigate) relies on it; do not change it without testing save.
- Speculative: the fix may need `temperature`, `top_p` and `tools_tokens_size_limit` normalized to `null` in both initial and current inside `compareFormData`, plus a regression test with `undefined` current vs `null` initial.

---

## 7. Summary for Complexity Assessment

The bug sits in the assistants frontend (repo `codemie-ui`) across three small units: the `compareFormData` util, `AssistantForm.prepareFormData`, and the shared `useUnsavedChanges` hook. The blocker popup and page are probably not at fault. The strongest lead is an asymmetric `undefined` (create) vs `null` (snapshot) value for three optional numeric fields that the comparator does not normalize. Edit works because `toNumberOrNull` returns `null` there.

The surface is small, likely 1-2 source files and 1 test file. There is no new pattern, no backend, config or migration. Existing unit tests cover the comparator but not this case. Main risk: other async defaults may also dirty the form, and the comparator is shared with edit/clone, so symmetry and the edit-page regression (AC5) need explicit tests. Root cause is not runtime-verified.

---

## 8. External References

None named by the task.
