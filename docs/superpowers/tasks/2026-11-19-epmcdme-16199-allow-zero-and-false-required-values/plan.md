# EPMCDME-16199: Accept 0 and false as required values Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Required Tool/Custom node arguments set to `0` or `false` stop being reported as missing in the workflow visual editor.

**Architecture:** The four required-value checks (Yup + imperative `validate()` in ToolForm and CustomNodeForm) already call one helper, `isRequiredValueMissing`. Fix that helper in place; add regression tests on both forms and both paths. No new helper, no rename, no change to `DynamicFieldsForm`.

**Tech Stack:** React, TypeScript, Yup, Vitest, Testing Library.

**Spec:** none (requirements from ticket EPMCDME-16199; research in `technical-analysis.md` in this directory).

Commit per task using the repository's existing convention (ticket key EPMCDME-16199).

## Acceptance criteria

- Required integer `0`, float `0` and boolean `false` pass Yup and imperative validation in ToolForm and CustomNodeForm.
- `undefined`, `null`, `''` and `[]` still fail; arrays of only blank strings still fail (EPMCDME-15960).
- Exchange `exchange_read.start = 0` is accepted.
- All four checks keep using the single shared helper.
- Regression tests cover both forms and both validation paths.
- Numeric inputs keep storing numbers; empty numeric input stays `undefined` (no `DynamicFieldsForm` change).

## Global Constraints

- Helper stays at `src/pages/workflows/editor/configPanels/utils/formUtils.ts:41`, name `isRequiredValueMissing(value: unknown): boolean`.
- Existing tests `components/__tests__/ToolForm.schema.test.ts` and `CustomNodeForm.schema.test.ts` must keep passing.
- Apache license header on any new file; Vitest tests in `__tests__` beside the component.

## Review Focus

- `NaN` (partial numeric input such as "-") stays missing.
- Whitespace-only bare string `'  '` keeps today's behaviour (not missing); only list rows are trimmed.
- `CustomNodeForm.validate()` returns `isValid && !yamlHasError.current`; assert on the return value and on the displayed "Field is required" error, not on local `errors` alone.

---

### Task 1: Fix `isRequiredValueMissing`

**Test-first: yes — formUtils test asserting isRequiredValueMissing(0) and (false) return false fails before the fix.**

**Files:**
- Modify: `src/pages/workflows/editor/configPanels/utils/formUtils.ts:41-46`
- Test: `src/pages/workflows/editor/configPanels/utils/__tests__/formUtils.test.ts` (create if absent; otherwise extend)

**Interfaces:**
- Produces: `isRequiredValueMissing(value: unknown): boolean` with unchanged signature.

- [ ] **Step 1: Write failing test.** Table-driven cases. Present (returns `false`): `0`, `0.0`, `-1`, `false`, `true`, `'a'`, `['a']`, `['', 'a']`. Missing (returns `true`): `undefined`, `null`, `''`, `NaN`, `[]`, `['']`, `['  ', null]`.
- [ ] **Step 2: Run** `npx vitest run src/pages/workflows/editor/configPanels/utils/__tests__/formUtils.test.ts`. Expected: `0` and `false` cases FAIL.
- [ ] **Step 3: Implement.** Keep the array branch as is. For non-arrays, return `true` for `null`/`undefined`, `''` and `NaN`; `false` otherwise (so `0` and `false` are present). Update the doc comment to mention numbers and booleans.
- [ ] **Step 4: Re-run the test.** Expected: PASS.

### Task 2: Yup-path regression tests (both forms)

**Test-first: no — characterization tests; Task 1 is already applied, so they pass on first run (confirm they fail if the fix is reverted).**

**Files:**
- Test: `src/pages/workflows/editor/configPanels/components/__tests__/ToolForm.schema.test.ts`
- Test: `src/pages/workflows/editor/configPanels/components/__tests__/CustomNodeForm.schema.test.ts` (verify the actual directory of the existing files and use it)

**Interfaces:**
- Consumes: exported `getValidationSchema(requiredFields: string[])` from each form; follow the existing call shape in those files (`tool_args` for ToolForm, `config` for CustomNodeForm).

- [ ] **Step 1: Add tests in each file** using `getValidationSchema(['start'])`: values `0`, `0.0` and `false` resolve (no `/Required fields/` rejection); `undefined`, `null`, `''` and `[]` reject with `/Required fields: start/`. Include an Exchange case `{ start: 0 }`.
- [ ] **Step 2: Run** both files with `npx vitest run <paths>`. Expected: PASS (Task 1 already applied); existing list-argument tests still PASS.

### Task 3: Imperative `validate()` regression tests (both forms)

**Test-first: no — characterization tests of imperative validate(); they pass on first run once Task 1 is applied (confirm they fail if the fix is reverted).**

**Files:**
- Test: `src/pages/workflows/editor/configPanels/components/__tests__/ToolForm.validate.test.tsx` (create)
- Test: `src/pages/workflows/editor/configPanels/components/__tests__/CustomNodeForm.test.tsx` (extend)

**Interfaces:**
- Consumes: each form's `ref.validate()` (ToolForm result is `isValid && !yamlHasError && no errors`; CustomNodeForm is `isValid && !yamlHasError.current`).

- [ ] **Step 1: ToolForm harness.** Render with a ref, mocking `assistantsStore.getToolSchema` to return an `args_schema` with a required integer `start`, following the mocking style of `ToolArgumentsForm.test.tsx`. Cases: `start: 0` makes `validate()` resolve true with no "Field is required"; `start: undefined` makes it false with "Field is required" shown. Add a required boolean `false` case.
- [ ] **Step 2: CustomNodeForm cases.** Extend the existing render setup in `CustomNodeForm.test.tsx` with a schema having required `start` (int) and a required boolean. `0` and `false` give no "Field is required" text; missing values show it. Assert on the `validate()` return value for the valid case.
- [ ] **Step 3: Run** `npx vitest run` for these two files. Expected: PASS. Then run the existing suites for `DynamicFieldsForm` and `ToolArgumentsForm` once to confirm no regression.
