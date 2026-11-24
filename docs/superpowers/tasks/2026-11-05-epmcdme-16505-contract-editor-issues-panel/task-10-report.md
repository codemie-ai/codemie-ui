DONE
commit: e14c376db
paths:
src/pages/workflows/editor/IssueGroups.tsx
src/pages/workflows/editor/IssuesPanel.tsx
src/pages/workflows/editor/WorkflowEditor.tsx
src/pages/workflows/editor/hooks/useWorkflowContext.ts
src/pages/workflows/editor/__tests__/IssueGroups.test.tsx
src/pages/workflows/editor/__tests__/IssuesPanel.test.tsx
test_command: npx vitest run --project unit src/pages/workflows/editor/__tests__/IssueGroups.test.tsx src/pages/workflows/editor/__tests__/IssuesPanel.test.tsx
result: RED seen first (components missing), then 24 passed; src/pages/workflows unit project 95 files / 812 tests pass; typecheck EXIT=0.

Ruling: page key is an optional `outcomeKey` on WorkflowContext, fed by a new optional `outcomeKey` prop on WorkflowEditor. Nothing passes it yet; tasks 13/14 must pass it from WorkflowForm (workflow id on edit, 'new' on new page). Until then the panel shows page issues only (no outcome).
Ruling: the panel list is page issues (context.issues) plus outcome issues whose id is not already present.
Ruling: Unverified is collapsed by default only when other groups exist; if it is the only group it is expanded (matches the Check "UNVERIFIED-only" rule).
Ruling: banner copy: saved "Saved with warnings", created "Workflow created with warnings", not-saved "Changes not saved yet", rejected none. Strict line: "Blocked by the workflow-level strict contract mode". Cap note: "Analysis cap reached, some states were not checked."
Ruling: local class error boundary (the repo's A2uiErrorBoundary is a2ui-specific). Empty state "No issues found" added.
