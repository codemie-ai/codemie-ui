DONE

## Summary

Extended `src/hooks/useToolkitSelection.ts` with two new mutators: `toggleDefaultTool` and
`toggleToolAndSyncDefaults`, per Task 3 of the plan. TDD followed: new tests were added first,
confirmed to fail (new functions missing), then implementation was added, then tests confirmed
to pass.

## Files changed

- `/Users/vladimir_sesum1/codemie-dev/codemie-ui/src/hooks/useToolkitSelection.ts`
  - New props: `deselectedDefaultTools?: string[]`, `onDeselectedDefaultToolsChange?: (next: string[]) => void`.
  - New import: `findExclusivePairTool`, `isDefaultToolName` from `@/utils/defaultDatasourceTools`.
  - New `toggleDefaultTool(toolkit, tool)`: flips `tool.name` in/out of `deselectedDefaultTools`
    (treating an absent list as `[]`). When the toggle re-selects a default tool and
    `findExclusivePairTool` finds a pair tool present in `selectedToolkits` for that toolkit,
    removes the pair tool via `updateSelectedToolkits`.
  - New `toggleToolAndSyncDefaults(toolkit, tool, isSingleSelection)`: calls `toggleSingleTool`
    or `toggleMultiTool` as before, then — only when `tool.name` was not already selected prior
    to the call — checks `findExclusivePairTool`; if the pair's name `isDefaultToolName` and is
    not already in `deselectedDefaultTools`, calls `onDeselectedDefaultToolsChange` with the
    appended name.
  - Both new functions added to the hook's return object.

- `/Users/vladimir_sesum1/codemie-dev/codemie-ui/src/hooks/__tests__/useToolkitSelection.test.ts`
  - Added `describe('toggleDefaultTool', ...)` and `describe('toggleToolAndSyncDefaults', ...)`
    blocks exactly matching the task spec, each with its own local `onToolkitsChange` mock
    (`let onToolkitsChange: Mock` + `beforeEach`) since they sit outside the existing scoped
    describe blocks. No existing test was removed or altered.

## Verification

Command: `npx vitest run --project unit src/hooks/__tests__/useToolkitSelection.test.ts`

- Before implementation (tests added, functions missing): `EXIT=1`, `Tests 4 failed | 31 passed (35)` — failures were `ReferenceError`/`TypeError: ... is not a function` as expected (after fixing a scoping oversight where the new describe blocks initially referenced an out-of-scope `onToolkitsChange`).
- After implementation: `EXIT=0`, `Test Files 1 passed (1)`, `Tests 35 passed (35)`.
- Re-verified again after commit (post pre-commit-hook prettier/eslint/tsc auto-fixes): `EXIT=0`, `Test Files 1 passed (1)`, `Tests 35 passed (35)`.

Full log at: `/Users/vladimir_sesum1/codemie-dev/codemie-ui/docs/superpowers/tasks/2026-10-19-datasource-default-tools-selection-ui/test.local.log`

## Commit

- SHA: `212c83117050d4d0e9543080b3a4427c65b3397b`
- Message: `EPMCDME-15114: Add default-tool toggle and exclusivity sync to useToolkitSelection`
- `git show --stat HEAD` confirms exactly two files changed:
  - `src/hooks/__tests__/useToolkitSelection.test.ts` (95 insertions)
  - `src/hooks/useToolkitSelection.ts` (81 insertions)
- Note: the first commit attempt accidentally duplicated the message body (two `-m` heredocs
  passed by mistake) and was corrected via `git commit --amend --no-edit` run through the normal
  pre-commit hook (license-headers, secrets check, sonar-local all passed). No `--no-verify` was
  used in the final amend.

## Scope adherence

Only the two files listed above were touched. `src/utils/defaultDatasourceTools.ts` and all
component files were left untouched, as instructed.
