DONE
commit: 903be1738
paths:
src/pages/workflows/editor/hooks/useContractCheck.ts (new)
src/pages/workflows/editor/hooks/__tests__/useContractCheck.test.ts (new)
src/pages/workflows/editor/EditorActions.tsx
src/pages/workflows/editor/__tests__/EditorActions.test.tsx
src/pages/workflows/editor/hooks/useWorkflowContext.ts
src/pages/workflows/editor/WorkflowEditor.tsx
src/pages/workflows/components/WorkflowForm.tsx
src/pages/workflows/EditWorkflowPage.tsx
src/pages/workflows/EditWorkflowHeaderActions.tsx
src/pages/workflows/NewWorkflowPage.tsx
test_command: npx vitest run --project unit src/pages/workflows/editor/hooks/__tests__/useContractCheck.test.ts src/pages/workflows/editor/__tests__/EditorActions.test.tsx
Results: unit src/pages/workflows 96 files / 848 tests pass; integration src/pages/workflows 6 files / 172 tests pass; typecheck clean.

Rulings:
- Hook `useContractCheck({ formRef, workflowId?, outcomeKey, setIssues? })` returns `{ check, isChecking }`; pages own it and pass `onCheck`/`isChecking`/`outcomeKey` via WorkflowForm -> WorkflowEditor -> WorkflowContext. Panel open/close uses the existing ref methods `openIssuesPanel`/`closeIssuesPanel`.
- Check also calls the page `setIssues` (findings -> issues; clean -> null) so the Issues button and field/node highlighting work for Check results; the IssuesPanel dedupes by id with the stored outcome. Without it the Issues button (shown only when page `issues !== null`) never appears after a Check.
- A contract-type 400 rejection (error_type contract_validation) is treated as findings (parseContractOutcome on the envelope), not as a "non-contract 400".
- "Config differs" = lodash isEqual(captured body, formRef.getFormValues() at response time); stale token or differing config drops the response silently (also on failures).
- "Has coverage" for the count toast requires coverage.analysed !== false; analysed:false gives "No issues found".
- UNVERIFIED-only count = distinct state ids (fallback issue id). The group is already expanded by IssueGroups when it is the only group, so no extra expand mechanism was needed.
- Check is disabled by `isChecking` only (not by an in-flight Save); Save / Save and Run are disabled while checking (edit header prop `isChecking`, new page buttons).

Concerns:
- Issues button visibility still depends on page `issues`; Tasks 13/14 should keep the setIssues/applyOutcome pairing consistent for saves.
