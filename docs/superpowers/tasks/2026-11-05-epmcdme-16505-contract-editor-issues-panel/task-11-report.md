DONE
commit: 454a86abd
paths:
src/pages/workflows/editor/EditorActions.tsx
src/pages/workflows/editor/WorkflowEditor.tsx
src/pages/workflows/editor/nodes/BaseNode.tsx
src/pages/workflows/editor/nodes/IteratorNode.tsx
src/pages/workflows/editor/nodes/common.ts
src/pages/workflows/editor/nodes/{Assistant,Conditional,Custom,SubWorkflow,Switch,Tool,Transform}Node.tsx
src/utils/workflowEditor/helpers/issueSeverity.ts
src/pages/workflows/editor/__tests__/EditorActions.test.tsx
src/pages/workflows/editor/__tests__/WorkflowEditor.test.tsx
src/utils/workflowEditor/helpers/__tests__/issueSeverity.test.ts
test_command: npx vitest run --project unit src/pages/workflows/editor/__tests__/EditorActions.test.tsx src/pages/workflows/editor/__tests__/WorkflowEditor.test.tsx src/utils/workflowEditor/helpers/__tests__/issueSeverity.test.ts
result: RED seen first (8 failures), then GREEN. Whole workflows unit (1656) and integration (172) projects pass; typecheck EXIT=0.

Ruling: nodes take data.outline ('error'|'warning'|null) replacing data.hasError (all 7 node components, BaseNode, IteratorNode, nodes/common.ts). Amber outline reuses outline-aborted-secondary.
Ruling: logic lives in issueSeverity.ts (groupIssuesByState once per issue list, getNodeOutline per node); WorkflowEditor supplies the isFieldSupported/assistant-tool predicate, applied to non-contract issues only.
Ruling: Issues button: removed fixed aria-label so the accessible name includes the count ("Issues 3"); count span hidden at 0; data-severity attribute = red|amber|grey. Red keeps variant delete; amber is secondary plus aborted-token classes; grey is secondary. Everything resolved => grey, no count.
Ruling: tempIssues effect now depends on the issues array identity (parents hold it in useState, so it is stable); isIssueDirty dropped from the old nodeHasError deps.
Ruling: BaseNode outline classes moved into getNodeOutlineClass in nodes/common.ts to satisfy the sonarjs complexity lint in the pre-commit hook.
