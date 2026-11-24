DONE
commit: 5f0725ff0
paths:
src/store/workflows.ts
src/store/contractOutcome.ts
src/store/__tests__/contractOutcome.test.ts
src/store/__tests__/workflows.validateWorkflow.test.ts
src/pages/workflows/useWorkflowHistoryRestore.ts
src/pages/workflows/__tests__/EditWorkflowPage.versionHistory.test.tsx
test_command: npx vitest run --project unit src/store src/pages/workflows  (159 files, 1380 tests pass; npm run typecheck exit 0)

Ruling: validateWorkflow was removed outright (not kept as a wrapper); the only production caller was useWorkflowHistoryRestore.ts (path is src/pages/workflows/, not hooks/). The restore now calls validateWorkflowConfig({ id, body }) which always sends error_format=json and skipErrorHandling; its behaviour is otherwise unchanged. EditWorkflowPage.versionHistory.test.tsx mocks/assertions updated to the new method and { id, body } shape.
Ruling: id-less branch strips yaml_config_history only (project and every other create field pass through); the caller body is not mutated. The id branch sends the body unchanged.
Ruling: contractOutcome.ts exports named functions (applyOutcome, clearOutcome, nextRequestToken, isTokenCurrent) plus the contractOutcomeStore proxy and types; token is a module-level counter.
Ruling: ValidateWorkflowConfigParams is exported from workflows.ts for callers.
