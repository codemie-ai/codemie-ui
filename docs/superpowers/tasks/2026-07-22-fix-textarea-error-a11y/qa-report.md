# QA Gate Report — EPMCDME-8550_fix-textarea-error-a11y

**Branch**: EPMCDME-8550_fix-textarea-error-a11y
**Runner**: npm (guide-first: `.ai-run/guides/quality-gates.md`)
**Started**: 2026-07-23T11:13:00+03:00
**Status**: PASSED

## Gates

| Gate  | Status | Duration | Command | Notes |
|-------|--------|----------|---------|-------|
| lint  | PASS | ~5s | `npm run lint` | Only a pre-existing "React version not specified" config warning; exit 0 |
| typecheck | PASS | ~3s | `npm run typecheck` | Silent, exit 0 |
| unit  | PASS | ~57s | `npm run test:unit` | 307 files / 3687 tests passed. First run (system locale `uk_UA.UTF-8`) showed 4 pre-existing failures in `analyticsFormatters.test.ts`, `ReleaseNotesPage.test.tsx`, `WorkflowExecutionInfoPopup.test.tsx` — none touch files in this diff, all use `toLocaleString(undefined, ...)` (locale-dependent). Re-ran with `LANG=en_US.UTF-8`: all 3687 pass. Confirmed pre-existing/environment, not caused by this change. |
| integration | PASS | ~42s | `npm run test:integration` | 24 files / 381 passed, 1 skipped (unrelated) |
| ui    | SKIPPED | — | (n/a) | No dedicated UI test script configured; changes are unit-tested React components, not full pages |

## Failure detail (if any)

None blocking. Transient locale-dependent failures noted above resolved by normalizing `LANG`/`LC_ALL`; not attributable to this diff (verified: none of the 4 failing test files intersect with the 6 files changed in this PR).

## Drift signal

no
