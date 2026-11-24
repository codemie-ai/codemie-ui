DONE
commit: ab2215e5d
paths:
src/pages/workflows/editor/configPanels/AdvancedConfigTab.tsx
src/pages/workflows/editor/configPanels/__tests__/AdvancedConfigTab.test.tsx
src/pages/workflows/editor/utils/visualEditorFieldRegistry.ts
src/pages/workflows/editor/utils/__tests__/visualEditorFieldRegistry.test.ts
src/pages/workflows/utils/compareWorkflowData.ts
src/pages/workflows/utils/__tests__/compareWorkflowData.test.ts
src/types/workflowEditor/configuration.ts
src/utils/workflowEditor/diffWorkflowGraphSnapshot.ts
src/utils/workflowEditor/__tests__/diffWorkflowGraphs.test.ts
src/utils/workflowEditor/helpers/issues/__tests__/issueValidation.test.ts
test_command: npx vitest run --project unit src/pages/workflows src/utils/workflowEditor (127 files / 1560 tests pass); integration src/pages/workflows 172 pass; npm run typecheck exit 0

gate SR-005a: passed without change
(shouldResolveIssue is generic over hasPathChanged for stateless issues; new tests at validation and require_input_contracts pass on first run, issueValidation.ts untouched.)

Rulings:
- New "Contracts" accordion in AdvancedConfigTab holds the Validation mode select (options "Default (warn)" = '' plus VALIDATION_MODES; same Select pattern as ContractFields) and the "Require input contracts" switch. Issue paths validation / require_input_contracts auto-expand it.
- updateAdvancedConfig keeps the old value of a key absent from the update, so saveData sends both keys always (undefined when unset) via withContractDefaults; the merged config then drops them. Off switch omits require_input_contracts (not written as false). Tests verify clearing strict/true removes both keys.
- NewWorkflowPage itself unchanged; its change detection is compareWorkflowData.hasWorkflowChanges, whose hasConfig now includes validation and require_input_contracts.
- Regression found and fixed: adding 'validation' to ADVANCED_CONFIG_FIELDS made diffWorkflowGraphSnapshot.omitNonSemanticFields strip the per-state validation mode, so a state-level validation edit would not count as modified (test 14 in diffWorkflowGraphs.test.ts went RED). Fixed with a one-line exception for 'validation' there.
