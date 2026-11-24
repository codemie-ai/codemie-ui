DONE
commit: 3276ce42a
paths:
src/pages/workflows/editor/hooks/useWorkflowFieldIssues.ts
src/pages/workflows/editor/configPanels/components/FieldController.tsx
src/pages/workflows/editor/configPanels/components/ContractFields.tsx
src/pages/workflows/editor/hooks/__tests__/useWorkflowFieldIssues.severity.test.ts
src/pages/workflows/editor/configPanels/components/__tests__/FieldController.severity.test.tsx
test_command: npx vitest run --project unit src/pages/workflows/editor/hooks/__tests__/useWorkflowFieldIssues.severity.test.ts src/pages/workflows/editor/configPanels/components/__tests__/FieldController.severity.test.tsx
Outcome: RED seen (6 of 7 failed for the expected reasons), GREEN after the change. unit src/pages/workflows 93 files/788 tests pass, integration src/pages/workflows 6 files/172 pass, typecheck clean, pre-commit hook passed.

Ruling: getIssueField picks the highest-rank issue among unresolved/non-dirty matches (ISSUE_SEVERITY rank); when none is unresolved it still returns the first match (ref/focus binding) with no messages. It now returns fieldWarning (WARNING) alongside fieldError (ERROR). Unknown outcome is treated as ERROR.
Ruling: UNVERIFIED yields neither fieldError nor fieldWarning (outline is null in ISSUE_SEVERITY), but the issue is still returned so navigation/focus works.
Ruling: FieldController exposes fieldState.warning; each call site must pass warning={fieldState.warning}. Done for both ContractFields Textareas (input/output contract); the mode Select ignores it.
Concern: other Input/Textarea controls on contract-registered paths (TransformForm output_schema Textarea, CommonStateFields "Output Schema" fallback Textarea) were not in the task file list and do not yet pass warning, so they show no amber highlight. One-line follow-up each if wanted. Also getToolIssue/getMcpIssue are unchanged (no severity logic).
