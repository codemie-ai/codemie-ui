DONE
commit: ab13e7c9b
paths:
src/utils/workflowEditor/helpers/issueSeverity.ts
src/utils/workflowEditor/helpers/__tests__/issueSeverity.test.ts
test_command: npx vitest run --project unit src/utils/workflowEditor/helpers/__tests__/issueSeverity.test.ts
Result: RED seen (module missing), GREEN 8/8, EXIT=0. npm run typecheck EXIT=0.

Exports: ISSUE_SEVERITY (Record<IssueOutcome, IssueSeverityConfig>), IssueSeverityConfig, worstSeverity(issues, isResolved).
Tokens: ERROR badge 'error', border 'border-border-error/50' (matches current IssuesPanel); WARNING badge 'warning', border 'border-aborted-secondary'; UNVERIFIED badge 'not_started', border 'border-border-quaternary'. badgeStatus typed as StatusType from '@/components/StatusBadge'.
Ruling: isResolved signature is (issue: WorkflowIssue) => boolean, matching useWorkflowContext().isIssueResolved. Ranks: ERROR 3, WARNING 2, UNVERIFIED 1.
Concern: WARNING border class 'border-aborted-secondary' is unverified visually; no opacity suffix used.
