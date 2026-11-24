DONE
commit: d540f0225
paths:
src/utils/workflowEditor/helpers/contractProtocol.ts
src/utils/workflowEditor/helpers/__tests__/contractProtocol.test.ts
src/utils/workflowEditor/helpers/backendErrorHandler.ts
src/utils/workflowEditor/helpers/__tests__/backendErrorHandler.test.ts
src/types/entity/workflow.ts
src/utils/workflowEditor/helpers/issues/__tests__/issueValidation.test.ts
test_command: npx vitest run --project unit src/utils/workflowEditor src/pages/workflows src/types  (125 files, 1514 tests pass; npm run typecheck exit 0)

Ruling: IssueOutcome is defined in src/types/entity/workflow.ts and re-exported from contractProtocol (avoids a types->utils import cycle).
Ruling: transformErrorKeys now defaults outcome to 'ERROR' (so non-contract backend issues satisfy the required field); 3 existing toEqual expectations in backendErrorHandler.test.ts got outcome: 'ERROR'.
Ruling: added WorkflowIssueMeta (label, strict_source); tool/mcp issue metas intersect it; type guards wrapped in !! to stay boolean.
Ruling: the required outcome broke 45 issue literals in issueValidation.test.ts; added outcome: 'ERROR' to each (no production code constructs issues).
Ruling: parsed path = config_path (input_schema.* collapsed to input_schema), falling back to backend path then ''. Issue order: errors then contract warnings; duplicate/missing ids get suffixed so ids are unique.
Concern: processBackendError (contract_validation branch) only whitelists + maps keys, so its issues do not get the input_schema collapse; later tasks that handle rejections should use parseContractOutcome(error.details) for that.
