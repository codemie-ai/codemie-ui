# QA Gate Report — EPMCDME-9922

**Branch**: EPMCDME-9922_preserve_prompt_box
**Runner**: npm
**Started**: 2026-07-13T15:04:00Z
**Status**: PASSED

## Gates

| Gate        | Status  | Duration | Command                    | Notes |
|-------------|---------|----------|----------------------------|-------|
| lint        | PASS    | ~5s      | `npm run lint`             | React version warning only (pre-existing, non-blocking) |
| typecheck   | PASS    | ~15s     | `npm run typecheck`        | Silent, exit 0 |
| unit        | PASS    | ~23s     | `npm run test:unit`        | 259 files, 3382 tests |
| integration | PASS    | ~18s     | `npm run test:integration` | 2 pre-existing failures in navigateBack / AssistantDetailsPage — confirmed present on main before this branch |
| ui          | SKIPPED | —        | (n/a)                      | No browser UI test script configured |

## Failure detail

Integration test failures in `navigateBack.integration.test.ts` (4 tests) and
`AssistantDetailsPage.integration.test.tsx` (1 test) reproduce identically on `main`
with this branch's commits stashed — pre-existing, not introduced by EPMCDME-9922.

Root error: `TypeError: Cannot read properties of null (reading 'nested_assistants')`
in `assistantsStore.getDefaultAssistant()` — unrelated to prompt-draft persistence.

## Drift signal

no
