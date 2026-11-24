DONE
commit: 812b92b52
paths:
src/pages/workflows/editor/configPanels/CommonStateFields.tsx
src/pages/workflows/editor/hooks/useWorkflowFieldIssues.ts
src/pages/workflows/editor/utils/__tests__/contractRegistration.test.ts (new)
test_command: npx vitest run --project unit src/pages/workflows/editor/utils/__tests__/contractRegistration.test.ts  (53 tests pass; RED seen first: 17 failures). Whole src/pages/workflows/editor: 38 files, 368 tests pass; npm run typecheck exit 0.

Notes:
- Registered input_schema, validation, output_schema for assistant/tool/custom/sub_workflow/transform in CommonStateFields.tsx (no error-type restriction; output_schema merges with the existing entry, adding SUB_WORKFLOW).
- goToField and getIssueField skip the visual control for contract issues (error_type === CONTRACT_ERROR_TYPE) when isContractYamlOnly(path, state._meta.type); non-contract unchanged (tested). getIssueField now also depends on configStates.
- Test imports the real editor entry (WorkflowEditor) so registerFields side effects run; goToField exercised via renderHook.
Ruling: config.input_key is asserted as YAML fallback for transform/tool only; on custom nodes the existing /^config\./ pattern matches it (custom node config.* is Group A), so it would navigate to the custom config control.
