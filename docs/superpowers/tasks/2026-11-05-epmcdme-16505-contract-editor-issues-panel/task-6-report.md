DONE
commit: 8c43ee3c6
paths:
src/pages/workflows/editor/configPanels/components/ContractFields.tsx (new)
src/pages/workflows/editor/configPanels/CommonStateFields.tsx
src/pages/workflows/editor/configPanels/utils/formUtils.ts
src/pages/workflows/editor/configPanels/{AssistantTab,ToolTab,CustomTab,SubWorkflowTab,TransformTab}.tsx
src/types/workflowEditor/configuration.ts
src/utils/workflowEditor/serialization/types.ts
src/utils/workflowEditor/helpers/contractProtocol.ts (added `ValidationMode` type only)
tests: configPanels/__tests__/{AssistantTab,ToolTab,CustomTab,SubWorkflowTab,SubWorkflowTab.save,TransformTab}.test.tsx, MetaTabs.noContract.test.tsx (new), contractTestUtils.tsx (new helper), utils/__tests__/formUtils.contract.test.ts (new)
test_command: npx vitest run --project unit src/pages/workflows/editor/configPanels  (18 files, 102 tests pass); npm run typecheck passes

Rulings / notes:
- ContractFields is rendered by CommonStateFields via new prop `contractFields: 'full' | 'input'` (in a "Contracts" accordion, outside the showAllFields gate so transform can show it). When set, the old plain Output Schema textarea is replaced by the Output contract field. `showOutputSchema` prop kept for back-compat (CommonStateFields default tests unchanged); tool/custom/sub-workflow no longer pass it.
- Labels: "Input contract", "Output contract", "Validation mode"; placeholders "Expected input format (JSON Schema)" / "Expected output format (JSON Schema)" (output placeholder is the old one so assistant tests unchanged). Mode options "Use workflow default" (value ''), "warn", "strict" (labels are the raw VALIDATION_MODES values). PrimeReact does not show the label of an '' option, so the select value is null when unset and `placeholder="Use workflow default"` displays it.
- updateState merges `{...stored, ...data}`, so an unset mode/input contract is emitted as explicit `undefined` (not omitted from the payload) so a cleared value drops the stored one; YAML dump omits undefined keys. Covered by formUtils.contract.test.ts (clear + serialize).
- Existing tests updated: tool/custom/sub-workflow "hides Output Schema" now assert the output contract is shown; SubWorkflowTab.test mock of CommonStateFields keyed on `contractFields`.
- NOT done (left for Task 8): registerFields for input_schema/validation (and SUB_WORKFLOW for output_schema).
- AC4 test (MetaTabs.noContract.test.tsx) renders Conditional/Switch/Iterator tabs and asserts no contract/mode controls.
