DONE
commit: e8d74128c
gate SR-005b: failed -> popup given its own form id
paths:
src/constants/formIds.ts
src/hooks/useUnsavedChangesWarning.tsx
src/hooks/__tests__/useUnsavedChangesWarning.test.tsx
src/pages/workflows/components/WorkflowForm.tsx
src/pages/workflows/components/__tests__/WorkflowForm.saveContract.test.tsx
src/pages/workflows/details/popups/WorkflowStartExecutionPopup.tsx
test_command: npx vitest run --project unit src/pages/workflows/components/__tests__/WorkflowForm.saveContract.test.tsx src/hooks/__tests__/useUnsavedChangesWarning.test.tsx
(17 tests pass; src/pages/workflows, src/hooks unit suites and integration "workflow" suites pass; npm run typecheck exit 0)

Gate SR-005b: the test (real useUnsavedChanges + provider, WorkflowForm and WorkflowStartExecutionPopup siblings as on EditWorkflowPage) failed first: after opening and closing the popup the dirty form reported clean, because the popup's useUnsavedChanges (no getCurrentValues, always-false check) re-registered under the shared WORKFLOW_FORM id and replaced the form's check. Fallback applied: new FormIDs.WORKFLOW_START_EXECUTION_POPUP used by the popup; test then passes.

Implemented:
- useUnsavedChanges returns additive resetBaseline(values) (clones) and checkDirty.
- WorkflowForm: onSubmit returns 'navigated'|'stayed'|'error'|void; 'stayed' -> resetBaseline(sent snapshot) + blockTransition (also after Save and Run); 'error' -> blockTransition always; undefined/'navigated' -> legacy (blockTransition unless Save and Run). Throwing onSubmit blocks transition and rethrows.
- Ref gains isSaving and async getSubmitValues() (runs saveCurrentTab, null on invalid panel). Props gain onDirtyChange(dirty) and onSavingChange(isSaving). yaml_config_history comes from the current workflow prop (regression test added).

Rulings:
- Added optional onSavingChange prop (beyond the spec's "isSaving" on the ref) so a page can re-render its header; ref.isSaving is only a snapshot.
- onDirtyChange only fires on changes to the checked values/baseline; in the legacy YAML form (live values in react-hook-form) it effectively fires on baseline changes only. The header toggle targets the visual editor.
- Baseline snapshot uses the dirty-check shape ({yamlConfig, workflowFields}) built from the same newYamlConfig/newWorkflowFields that went into the payload.
- EditWorkflowPage/NewWorkflowPage not changed (their submit returns void, typechecks). 
Concerns: none.
