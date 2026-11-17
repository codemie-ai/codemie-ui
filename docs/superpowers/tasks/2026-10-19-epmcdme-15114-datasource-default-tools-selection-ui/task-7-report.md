DONE

## Summary

Implemented Task 7 (final task of plan): wired `deselected_default_tools` through
`VirtualAssistantForm.tsx` and `AssistantTab.tsx` in the workflow editor.

## Commit

sha: `f6d1c0e7696e2972ca7c626e90c61e05d7fd1fda`
branch: `EPMCDME-15114-show-deselect-default-datasource-tools`
message: `EPMCDME-15114: Wire deselected_default_tools through VirtualAssistantForm and AssistantTab`

## Files changed (exactly these three, per `git show --stat HEAD`)

- `/Users/vladimir_sesum1/codemie-dev/codemie-ui/src/pages/workflows/editor/configPanels/AssistantTab.tsx`
- `/Users/vladimir_sesum1/codemie-dev/codemie-ui/src/pages/workflows/editor/configPanels/components/VirtualAssistantForm.tsx`
- `/Users/vladimir_sesum1/codemie-dev/codemie-ui/src/pages/workflows/editor/configPanels/components/__tests__/VirtualAssistantForm.schema.test.ts`

## Changes made

In `VirtualAssistantForm.tsx`:
1. Added `deselected_default_tools: string[]` to `VirtualAssistantFormValues`.
2. Added `deselected_default_tools: Yup.array().of(Yup.string()).default([])` to `virtualAssistantValidationSchema`.
3. Added `deselected_default_tools: config?.deselected_default_tools ?? []` to `getDefaultValues`.
4. Added `handleDeselectedDefaultToolsChange` callback (mirrors `handleToolkitsChange` pattern).
5. Passed `context={watch('context')}`, `deselectedDefaultTools={watch('deselected_default_tools') ?? []}`, and `onDeselectedDefaultToolsChange={handleDeselectedDefaultToolsChange}` to `<ToolsConfiguration>`.

In `AssistantTab.tsx`:
6. Added `deselected_default_tools: virtualAssistantValues.deselected_default_tools ?? []` to the `finalAssistantConfig` object in the virtual-assistant save branch.

No changes to `useImperativeHandle` were needed — `getValues()` already returns the full form-values object.

## Test-first verification

Added two new tests to `VirtualAssistantForm.schema.test.ts` (using the real `baseValues` fixture already present in the file):
- `defaults deselected_default_tools to [] when omitted`
- `accepts an explicit deselected_default_tools list`

Test command:
```
npx vitest run --project unit src/pages/workflows/editor/configPanels/components/__tests__/VirtualAssistantForm.schema.test.ts
```

Before implementation: EXIT=1, failure `AssertionError: expected undefined to deeply equal []` (field was undefined, confirming the test failed for the right reason). `Tests 1 failed | 3 passed (4)`.

After implementation: EXIT=0.
```
Test Files  1 passed (1)
     Tests  4 passed (4)
```

## Type-check

`npx tsc --noEmit` — EXIT=0, no output (full project, clean end-to-end).

## Pre-commit hook

Ran automatically on commit: prettier, eslint --fix, license-header check (2369 files, 0 missing), gitleaks secrets scan (no leaks found), tsc --noEmit (via lint-staged) — all passed. Sonar-local skipped (no `SONAR_TOKEN` set, expected locally).

No deviations from the plan. Scope respected — only the three listed files were touched; `AssistantForm.tsx`, `ToolsConfiguration.tsx`, `Toolkit.tsx`, `useToolkitSelection.ts`, and `defaultDatasourceTools.ts` were not modified. No push, merge, or PR was performed.
