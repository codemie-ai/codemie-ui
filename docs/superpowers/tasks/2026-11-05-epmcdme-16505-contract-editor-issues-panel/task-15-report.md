DONE
commit: c6a83e4f0
paths:
src/pages/workflows/useWorkflowHistoryRestore.ts
src/pages/workflows/__tests__/EditWorkflowPage.versionHistory.test.tsx
test_command: npx vitest run --project unit src/pages/workflows/__tests__/EditWorkflowPage.versionHistory.test.tsx
results: versionHistory 16/16; unit src/pages/workflows 860/860; integration src/pages/workflows 185/185; typecheck clean.

RED seen first: both new tests failed (openIssuesPanel never called; stale outcome not cleared).

Changes: private generation guard replaced by nextRequestToken/isTokenCurrent (abandoned set now keyed by token). Restore validate 2xx is parsed with parseContractOutcome; contract issues -> applyOutcome(parsed,'not-saved',workflowId) + setIssues + openIssuesPanel (no clear/close); otherWarnings -> notifyAboutWarnings (consumer_slot still toasts); no contract issues -> clearOutcome + previous clear/close.

Ruling: restore start also calls clearOutcome(workflowId) next to setIssues(null), so a stale not-saved outcome does not outlive a new restore. The existing start-of-restore closeIssuesPanel is kept (existing 400 test needs it); "stays open" means nothing closes it after the warnings land (test asserts call order).
Concern: contract-validation 400 rejections on restore still go through applyWorkflowBackendValidationError (outside AC30).
