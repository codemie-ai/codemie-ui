# Technical Research

**Task**: workflow editor validation required
**Generated**: 2026-11-19
**Research path**: filesystem

---

## 1. Original Context

Ticket EPMCDME-16199 (Bug): Workflow editor rejects 0 and false as missing required values in Tool and Custom nodes.

Required-value validation in the workflow visual editor treats valid falsy values as missing. Required integer and float arguments set to `0` are rejected; required boolean values set to `false` are affected by the same code pattern. Example: Microsoft Exchange `exchange_read.start`: `0` selects newest message and works in YAML, but visual editor reports "Field is required." validate() returns false; Yup reports "Required fields: start."

Affected areas (from ticket, verify against code):
- DynamicFieldsForm.tsx lines 127-131 and 147-149: correctly converts numeric input to numbers; empty input becomes undefined.
- ToolArgumentsForm.tsx lines 67-71: propagates required schema fields.
- ToolForm.tsx lines 100-107 and 189-200: Yup and imperative validation reject zero through `!fieldValue`.
- CustomNodeForm.tsx lines 75-79 and 153-158: same defect in both validation paths.

Proposed fix: shared `isEmptyRequiredValue` helper under src/pages/workflows/editor/utils/. Treat only undefined, null, empty strings, empty arrays as empty; accept 0 and false. Use it in both validation paths in both node forms. Preserve numeric storage in DynamicFieldsForm.

Acceptance Criteria:
1. Required integer zero, float zero, boolean false pass both Yup and imperative validation in Tool and Custom node forms.
2. undefined, null, empty strings, empty arrays still fail required validation.
3. Exchange example accepts Start zero without required-field error and allows validation/saving.
4. All four duplicated required-value checks use the shared helper.
5. Regression tests cover both forms and both validation paths.
6. Numeric inputs continue storing numbers; empty numeric input maps to undefined.

Note: repo CLAUDE.md says write tests only when explicitly asked; the ticket's AC 5 explicitly asks for regression tests.

---

## 2. Codebase Findings

### Existing Implementations

Purpose A: decide whether a required tool/custom-node argument is missing.
- `src/pages/workflows/editor/configPanels/utils/formUtils.ts:41` `isRequiredValueMissing(value)`: arrays are missing when every item is null or a blank string (whitespace trimmed); anything else returns `!value`. This is the defect: `0`, `false` and `NaN` are missing. Added by EPMCDME-15960 (`1003beb32`, list-argument required marker).
- Consumers (all four checks the ticket lists already call this helper, not an inline `!fieldValue`):
  - `ToolForm.tsx:110-112` Yup test `required-fields` (message `Required fields: a, b`, path `tool_args`)
  - `ToolForm.tsx:213` imperative `validate()` (sets `errors[field] = 'Field is required'`; result is `isValid && !yamlHasError && no errors`)
  - `CustomNodeForm.tsx:75-77` Yup test (path `config`)
  - `CustomNodeForm.tsx:152` imperative `validate()` (same message; returns `isValid && !yamlHasError.current`, so the local `errors` do not enter the return value)
- The helper is also imported in the same file by non-validation code (`formUtils` is imported by AssistantTab, CustomTab, SubWorkflowTab, ToolTab, TransformTab), but `isRequiredValueMissing` is used only by the two forms above.
- Other falsy guard on the same path: `ToolForm.tsx:107` `if (!value) return requiredFields.length === 0` tests the whole `tool_args` object, not a field value. `{}`/`undefined` stay falsy-or-truthy by object identity; `0`/`false` field values do not reach it.
- Existing tests: `components/__tests__/ToolForm.schema.test.ts` and `CustomNodeForm.schema.test.ts` call exported `getValidationSchema(['to'])` with `schema.validate(...)` and match `/Required fields/`, covering list args only.

Purpose B: produce the required-field name list.
- `ToolArgumentsForm.tsx:67-71` filters `args_schema` entries on `.required` and calls `onSchemaLoaded(requiredFields)`; no value check here.
- Custom nodes: `CustomNodeForm/useCustomNodeSchema.ts:135-137` `getRequiredFields(config_schema)` -> `schemaRequiredFields` (`:105`, returned `:158`).

Purpose C: store typed values from input.
- `src/components/form/DynamicFieldsForm/DynamicFieldsForm.tsx:129` int: `'' ? undefined : Number.parseInt(v, 10)`; `:148` float: `'' ? undefined : Number.parseFloat(v)`; `required` is passed to inputs at `:134,153,174,187,202,218` (display marker only). Matches AC6 as it stands.

Other touched code: none beyond the above.

### Decisions Already in the Code
- Required check is shared in one helper `configPanels/utils/formUtils.ts`, not `editor/utils/` (the ticket's proposed location; that dir holds only `visualEditorFieldRegistry.ts` and `__tests__/`). No recorded reason.
- Convention: forms export `getValidationSchema(requiredFields)` for direct schema tests; Yup test + imperative `validate()` duplicate the same predicate.
- List rows: blank-string-only arrays count as missing (EPMCDME-15960); an empty array `[]` is missing through `every` on an empty array.

### Task Statements Checked Against the Code
- "ToolForm lines 100-107 / 189-200 reject zero through `!fieldValue`": contradicted in form, holds in effect. No `!fieldValue` exists (only `ToolForm.tsx:107` `!value` on the whole object); rejection comes via `isRequiredValueMissing` -> `!value` (`formUtils.ts:45`). Line numbers have moved.
- "CustomNodeForm 75-79 and 153-158 same defect": holds in effect, same helper.
- "Four duplicated checks": contradicted, they are four calls to one existing helper.
- "New shared helper `isEmptyRequiredValue` under editor/utils/": keeps `isRequiredValueMissing` (consumers above, plus list-blank-row rule from EPMCDME-15960 and its tests) in place; a second helper would duplicate it.
- "Treat only undefined, null, empty strings, empty arrays as empty": differs from current behaviour for arrays of blank strings (`['']`, `['  ','']` are currently missing and tested at `ToolForm.schema.test.ts:28-36`, `CustomNodeForm.schema.test.ts:22`); whitespace-only strings are also missing for list rows but a bare `'  '` string is truthy and passes today.
- "DynamicFieldsForm converts numerics, empty -> undefined": holds (`:129,:148`).
- "ToolArgumentsForm propagates required fields": holds (`:67-71`); it has no value check.
- Exchange `start` schema (`required` + int type) comes from the backend tool schema: unverified, no sample in repo.

### Consumers of Changed Contracts
- `isRequiredValueMissing`: only `ToolForm.tsx:111,213`, `CustomNodeForm.tsx:76,152`. No tests import it directly (grep of test files for `isRequiredValueMissing` found none).
- `getValidationSchema` (ToolForm, CustomNodeForm): used by their own `useState`/`useEffect` (`ToolForm.tsx:158,328`; `CustomNodeForm.tsx:109,188`) and the two schema tests.
- Other required-checks in workflows (`validationErrors`, `Field is required`) exist only in these two forms.

### Architecture and Layers Affected
- Config-panel forms (React + react-hook-form + Yup resolver) and a pure util in `configPanels/utils`.

### Integration Points
- `assistantsStore.getToolSchema` (ToolArgumentsForm), `useCustomNodeSchema` for custom node schema, `DynamicFieldsForm` rendering fields and error display via `errors` prop.

### Patterns and Conventions
- Apache license header on each file; tests with vitest in `__tests__` next to components.

---

## 3. Documentation Findings

### Guides and Architecture Docs
- `.ai-run/guides/` exists (testing/testing-patterns.md, patterns/form-patterns.md, architecture); not read in depth.

### Architectural Decisions
None found for this area.

### Derived Conventions
Schema-level tests call `getValidationSchema(...).validate(...)`.

---

## 4. Testing Landscape

### Existing Coverage
- `ToolForm.schema.test.ts`, `CustomNodeForm.schema.test.ts`: Yup path, list args only.
- `CustomNodeForm.test.tsx`, `ToolArgumentsForm.test.tsx` (aria-required for lists), `DynamicFieldsForm/__tests__/DynamicFieldsForm.test.tsx`.

### Testing Framework and Patterns
- Vitest, Testing Library; schema tests are pure.

### Coverage Gaps
- No tests for zero/false values; no test of imperative `validate()` for either form (`ref.validate()`); no direct test of `isRequiredValueMissing`; no `ToolForm.test.tsx` found.

---

## 5. Configuration and Environment

### Environment Variables
None relevant.

### Configuration Files
None relevant.

### Feature Flags and Deployment Concerns
None found (`useWorkspaceScriptBridgeEnabled` in ToolForm is unrelated).

---

## 6. Risk Indicators

- A helper exists at `configPanels/utils/formUtils.ts:41`; the ticket's premise (inline `!fieldValue`, new helper in `editor/utils/`) does not match the code. See "Task Statements".
- `isRequiredValueMissing` carries list-blank-row semantics from EPMCDME-15960 that the ticket's emptiness rule does not mention; existing tests assert them.
- Speculative: the imperative `validate()` in CustomNodeForm does not include `errors` in its return, so it is not the source of rejection there; an AC1 test on that path would pass or fail independent of the helper.
- Speculative: `NaN` (from `parseFloat` on partial input like `-`) is falsy today; behaviour is unspecified by the ticket.
- No imperative-path test harness exists for either form; ToolForm needs store/schema mocks.

---

## 7. Summary for Complexity Assessment

The change surface is small: one predicate in `configPanels/utils/formUtils.ts:41` consumed at four call sites in `ToolForm.tsx` and `CustomNodeForm.tsx`. The ticket's described duplication and its file location do not match the current tree; the four checks already share `isRequiredValueMissing`, whose `!value` fallback is the cause for `0` and `false`. `DynamicFieldsForm` already stores numbers and maps empty input to `undefined`, and needs no change on the evidence read.

Technical novelty is low (pure function, existing patterns). Test posture: Yup-path schema tests exist for list args and can be extended; imperative `validate()` has no coverage on either form, which AC5 requires. Key risks are the array-blank semantics from the earlier ticket and the mismatch between the ticket's proposed helper and the existing one.

---

## 8. External References

None named by the task. (Exchange `exchange_read.start` backend schema is not in this repository; unverified.)
